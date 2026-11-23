import { createClient } from "@supabase/supabase-js";
import { config } from "./config.js";

export const db = createClient(config.SUPABASE_URL, config.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  global: { headers: { "X-Application-Name": "vextro-bot" } }
});
