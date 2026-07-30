import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type AuthCtx = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
};

const Ctx = createContext<AuthCtx>({ user: null, session: null, loading: true, signOut: async () => {} });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Only update state when the actual user changes. Ignore the noisy
    // TOKEN_REFRESHED / focus re-check events that fire on every tab focus,
    // which otherwise remount the whole app (and bounce admin tabs).
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      if (event === "TOKEN_REFRESHED" || event === "INITIAL_SESSION") {
        // keep the session token fresh but don't churn identity/loading
        setSession((prev) => (prev?.user?.id === s?.user?.id ? (s ?? prev) : (s ?? null)));
        return;
      }
      setSession((prev) => {
        const next = s ?? null;
        if (prev?.user?.id === next?.user?.id) return prev; // same user -> no remount
        return next;
      });
      setLoading(false);
    });

    (async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        // Validate token against the current Supabase project. If the token was
        // issued by a different project (stale after backend migration), it
        // will 403 with bad_jwt — sign the user out so they can re-auth cleanly.
        const { error } = await supabase.auth.getUser();
        if (error) {
          await supabase.auth.signOut();
          setSession(null);
          setLoading(false);
          return;
        }
      }
      setSession(data.session);
      setLoading(false);
    })();

    return () => sub.subscription.unsubscribe();
  }, []);

  // Mark the user active on real visits, not just fresh logins. Supabase's
  // last_sign_in_at only updates on an actual login event — a returning
  // user whose session is still valid (the normal case) never re-triggers
  // it, so it can't be used alone to tell "still visiting" from "gone for
  // good". Throttled to once per browser session so it's cheap.
  useEffect(() => {
    const uid = session?.user?.id;
    if (!uid) return;
    const key = `__dg_touched_${uid}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch { /* private mode etc — still safe to touch */ }
    (supabase as unknown as { rpc: (fn: string) => { then: (a: () => void, b: () => void) => void } })
      .rpc("touch_last_active").then(() => {}, () => {});
  }, [session?.user?.id]);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <Ctx.Provider value={{ user: session?.user ?? null, session, loading, signOut }}>
      {children}
    </Ctx.Provider>
  );
}

export const useAuth = () => useContext(Ctx);