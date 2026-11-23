import type { Telegraf, Context } from "telegraf";
import { db } from "./supabase.js";

export type HealthReport = { checkedAt: string; database: "ok" | "failed"; telegram: "ok" | "failed"; detail: string[] };
export async function runHealthCheck(bot: Telegraf<Context>): Promise<HealthReport> {
  const detail: string[] = [];
  let database: HealthReport["database"] = "ok";
  let telegram: HealthReport["telegram"] = "ok";
  try {
    const { error } = await db.from("bot_users").select("telegram_id", { head: true, count: "exact" }).limit(1);
    if (error) throw error;
    detail.push("Supabase connectivity: OK");
  } catch (error) {
    database = "failed";
    detail.push("Supabase connectivity: " + (error instanceof Error ? error.message : "failed"));
  }
  try {
    const me = await bot.telegram.getMe();
    detail.push("Telegram API: OK (" + me.username + ")");
  } catch (error) {
    telegram = "failed";
    detail.push("Telegram API: " + (error instanceof Error ? error.message : "failed"));
  }
  return { checkedAt: new Date().toISOString(), database, telegram, detail };
}
export function startHealthMonitor(bot: Telegraf<Context>, ownerId: number, intervalMinutes = 5) {
  let stopped = false;
  let previousFailure = "";
  const run = async () => {
    if (stopped) return;
    const report = await runHealthCheck(bot);
    const failure = report.database === "failed" || report.telegram === "failed" ? report.detail.join("\n") : "";
    if (failure && failure !== previousFailure) {
      previousFailure = failure;
      try { await bot.telegram.sendMessage(ownerId, "VEXTRO BOT health alert\n" + failure); } catch {}
    } else if (!failure && previousFailure) {
      previousFailure = "";
      try { await bot.telegram.sendMessage(ownerId, "VEXTRO BOT health recovered.\n" + report.detail.join("\n")); } catch {}
    }
  };
  void run();
  const timer = setInterval(() => void run(), Math.max(1, intervalMinutes) * 60_000);
  return () => { stopped = true; clearInterval(timer); };
}
