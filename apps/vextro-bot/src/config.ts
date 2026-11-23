import "dotenv/config";
import { z } from "zod";

const schema = z.object({
  BOT_TOKEN: z.string().min(20),
  OWNER_TELEGRAM_ID: z.coerce.number().int().positive().safe(),
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(30),
  WEBSITE_URL: z.string().url(),
  REQUIRED_CHANNEL_ID: z.string().min(1),
  REQUIRED_GROUP_ID: z.string().min(1),
  BOT_PUBLIC_USERNAME: z.string().regex(/^[A-Za-z0-9_]{5,32}$/).optional(),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]).default("info")
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  const missing = parsed.error.issues.map((issue) => issue.path.join(".")).join(", ");
  throw new Error(`Invalid VEXTRO BOT configuration: ${missing}`);
}
export const config = parsed.data;
