// Native Supabase OAuth wrapper.
// Previously this used @lovable.dev/cloud-auth-js, which only works on Lovable's
// platform. It now calls Supabase Auth directly so Google sign-in works anywhere.
//
// Setup required in your Supabase dashboard (Authentication -> Providers -> Google):
//   1. Enable the Google provider and paste your Google OAuth Client ID + Secret.
//   2. In Google Cloud Console, add this Authorized redirect URI:
//        https://<your-project-ref>.supabase.co/auth/v1/callback
//   3. In Supabase (Authentication -> URL Configuration), add your app's URL(s)
//      to "Redirect URLs" (e.g. http://localhost:3000/auth and your production /auth).
import { supabase } from "../supabase/client";
import type { Provider } from "@supabase/supabase-js";

type SignInOptions = {
  redirect_uri?: string;
  extraParams?: Record<string, string>;
};

export const lovable = {
  auth: {
    signInWithOAuth: async (
      provider: "google" | "apple" | "microsoft" | "lovable",
      opts?: SignInOptions,
    ) => {
      // Map legacy provider names to Supabase provider names.
      const supaProvider = (provider === "microsoft" ? "azure" : provider) as Provider;

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: supaProvider,
        options: {
          redirectTo: opts?.redirect_uri ?? window.location.origin + "/auth",
          queryParams: opts?.extraParams,
        },
      });

      if (error) {
        return { error, redirected: false as const };
      }

      // Supabase automatically navigates the browser to `data.url`.
      return { redirected: true as const, data };
    },
  },
};
