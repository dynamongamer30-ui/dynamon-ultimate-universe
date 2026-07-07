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