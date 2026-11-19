-- Preserve an audit trail and remove owner flags created by the vulnerable
-- JWT-email promotion trigger. Existing explicit owner policies designate the
-- canonical owner account; the canonical owner profile remains unchanged.
CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon, authenticated;

CREATE TABLE IF NOT EXISTS private.owner_flag_remediation_audit (
  user_id uuid PRIMARY KEY,
  prior_is_owner boolean NOT NULL,
  prior_updated_at timestamptz,
  remediated_at timestamptz NOT NULL DEFAULT now(),
  reason text NOT NULL
);

INSERT INTO private.owner_flag_remediation_audit
  (user_id, prior_is_owner, prior_updated_at, reason)
SELECT p.id, p.is_owner, p.updated_at,
       'Removed owner flag from non-canonical account after owner self-promotion vulnerability'
FROM public.profiles p
JOIN auth.users u ON u.id = p.id
WHERE p.is_owner IS TRUE
  AND lower(u.email) <> lower('yugvadecha30@gmail.com')
ON CONFLICT (user_id) DO NOTHING;

UPDATE public.profiles p
SET is_owner = false
FROM auth.users u
WHERE u.id = p.id
  AND p.is_owner IS TRUE
  AND lower(u.email) <> lower('yugvadecha30@gmail.com');
