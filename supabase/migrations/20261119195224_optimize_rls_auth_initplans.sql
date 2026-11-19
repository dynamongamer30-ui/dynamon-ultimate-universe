-- Wrap auth helper calls in scalar subqueries so PostgreSQL evaluates them
-- once per statement instead of once per row in RLS predicates.
DO $remediate$
DECLARE
  pol record;
  role_list text;
  using_expr text;
  check_expr text;
  command_name text;
  policy_mode text;
  stmt text;
BEGIN
  FOR pol IN
    SELECT p.oid, p.polname, p.polrelid, p.polcmd, p.polpermissive,
           p.polroles, n.nspname, c.relname,
           pg_get_expr(p.polqual, p.polrelid) AS qual_expr,
           pg_get_expr(p.polwithcheck, p.polrelid) AS check_expr
    FROM pg_policy p
    JOIN pg_class c ON c.oid = p.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND (
        coalesce(pg_get_expr(p.polqual, p.polrelid), '') ~* 'auth\.(uid|jwt)\('
        OR coalesce(pg_get_expr(p.polwithcheck, p.polrelid), '') ~* 'auth\.(uid|jwt)\('
      )
  LOOP
    SELECT string_agg(
      CASE WHEN role_oid = 0 THEN 'PUBLIC'
           ELSE quote_ident(pg_get_userbyid(role_oid)) END,
      ', ' ORDER BY role_oid
    )
    INTO role_list
    FROM unnest(pol.polroles) AS role_oid;

    command_name := CASE pol.polcmd
      WHEN 'r' THEN 'SELECT'
      WHEN 'a' THEN 'INSERT'
      WHEN 'w' THEN 'UPDATE'
      WHEN 'd' THEN 'DELETE'
      ELSE 'ALL'
    END;
    policy_mode := CASE WHEN pol.polpermissive THEN 'PERMISSIVE' ELSE 'RESTRICTIVE' END;

    using_expr := pol.qual_expr;
    check_expr := pol.check_expr;

    IF using_expr IS NOT NULL THEN
      using_expr := replace(replace(using_expr, 'auth.uid()', '(select auth.uid())'),
                            'auth.jwt()', '(select auth.jwt())');
    END IF;
    IF check_expr IS NOT NULL THEN
      check_expr := replace(replace(check_expr, 'auth.uid()', '(select auth.uid())'),
                            'auth.jwt()', '(select auth.jwt())');
    END IF;

    EXECUTE format('DROP POLICY %I ON %I.%I', pol.polname, pol.nspname, pol.relname);

    stmt := format(
      'CREATE POLICY %I ON %I.%I AS %s FOR %s TO %s',
      pol.polname, pol.nspname, pol.relname, policy_mode, command_name, role_list
    );
    IF using_expr IS NOT NULL THEN
      stmt := stmt || format(' USING (%s)', using_expr);
    END IF;
    IF check_expr IS NOT NULL THEN
      stmt := stmt || format(' WITH CHECK (%s)', check_expr);
    END IF;
    EXECUTE stmt;
  END LOOP;
END
$remediate$;
