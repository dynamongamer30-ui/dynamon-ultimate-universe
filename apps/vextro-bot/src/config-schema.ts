import { z } from "zod";

const optionalString = <T extends z.ZodTypeAny>(value: T) => z.preprocess(
  (input) => input === "" || input === null ? undefined : input,
  value.optional()
);

const schema = z.object({
  BOT_TOKEN: z.string().min(20),
  OWNER_TELEGRAM_ID: z.coerce.number().int().positive().safe(),
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(30),
  WEBSITE_URL: z.string().url(),
  REQUIRED_CHANNEL_ID: z.string().min(1),
  REQUIRED_GROUP_ID: z.string().regex(/^-?\d+$/, "Numeric Telegram group chat ID required"),
  REQUIRED_CHANNEL_URL: optionalString(z.string().url().refine((value) => new URL(value).protocol === "https:", "HTTPS required")),
  REQUIRED_GROUP_URL: optionalString(z.string().url().refine((value) => new URL(value).protocol === "https:", "HTTPS required")),
  PUBLISH_CHANNEL_ID: optionalString(z.string().min(1)),
  BOT_PUBLIC_USERNAME: optionalString(z.string().regex(/^[A-Za-z0-9_]{5,32}$/)),
  BACKUP_PASSPHRASE: optionalString(z.string().min(16)),
  BACKUP_BUCKET: z.string().min(1).default("vextro-backups"),
  BACKUP_OFFSITE_URL: optionalString(z.string().url().refine((value) => new URL(value).protocol === "https:", "HTTPS required")),
  BACKUP_OFFSITE_TOKEN: optionalString(z.string().min(16)),
  BACKUP_INTERVAL_HOURS: z.coerce.number().int().min(1).max(720).default(24),
  BACKUP_RETENTION_DAYS: z.coerce.number().int().min(1).max(365).default(30),
  GITHUB_REPOSITORY: z.string().default("dynamongamer30-ui/dynamon-ultimate-universe"),
  DEPLOY_WEBHOOK_URL: optionalString(z.string().url().refine((value) => new URL(value).protocol === "https:", "HTTPS required")),
  DEPLOY_WEBHOOK_SECRET: optionalString(z.string().min(16)),
  UPDATE_CHECK_INTERVAL_HOURS: z.coerce.number().int().min(1).max(72).default(6),
  OWNER_TIMEZONE: z.string().default("Asia/Kolkata").refine((value) => { try { new Intl.DateTimeFormat("en-US", { timeZone: value }); return true; } catch { return false; } }, "Valid IANA timezone required"),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]).default("info")
}).superRefine((value, ctx) => {
  if (Boolean(value.BACKUP_OFFSITE_URL) !== Boolean(value.BACKUP_OFFSITE_TOKEN)) {
    ctx.addIssue({ code: "custom", path: ["BACKUP_OFFSITE_TOKEN"], message: "BACKUP_OFFSITE_URL and BACKUP_OFFSITE_TOKEN must be configured together" });
  }
  if (Boolean(value.DEPLOY_WEBHOOK_URL) !== Boolean(value.DEPLOY_WEBHOOK_SECRET)) {
    ctx.addIssue({ code: "custom", path: ["DEPLOY_WEBHOOK_SECRET"], message: "DEPLOY_WEBHOOK_URL and DEPLOY_WEBHOOK_SECRET must be configured together" });
  }
  if ((value.BACKUP_OFFSITE_URL || value.DEPLOY_WEBHOOK_URL) && !value.BACKUP_PASSPHRASE) {
    ctx.addIssue({ code: "custom", path: ["BACKUP_PASSPHRASE"], message: "Encrypted safety backups are required for offsite backup and deployment workflows" });
  }
});

export type VextroConfig = z.infer<typeof schema>;
export function parseConfig(input: Record<string, unknown>): VextroConfig {
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    const missing = parsed.error.issues.map((issue) => issue.path.join(".")).join(", ");
    throw new Error("Invalid VEXTRO BOT configuration: " + missing);
  }
  return parsed.data;
}
