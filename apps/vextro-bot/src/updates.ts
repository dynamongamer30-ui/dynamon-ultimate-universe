import type { Telegraf, Context } from "telegraf";
import { db } from "./supabase.js";
import { config } from "./config.js";
import { createBackup } from "./backup.js";
import { runHealthCheck } from "./health.js";

type Release = { tag_name: string; html_url: string; name?: string; published_at?: string; body?: string };
export async function checkLatestRelease(): Promise<Release | null> {
  const response = await fetch("https://api.github.com/repos/" + config.GITHUB_REPOSITORY + "/releases/latest", {
    headers: { Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" },
    signal: AbortSignal.timeout(10_000)
  });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error("GitHub release check failed with HTTP " + response.status);
  return await response.json() as Release;
}
export async function approveRelease(tag: string, url: string, ownerId: number) {
  const { error } = await db.from("vextro_update_approvals").upsert({
    tag, release_url: url, approved_by: ownerId, approved_at: new Date().toISOString(), status: "approved", updated_at: new Date().toISOString()
  }, { onConflict: "tag" });
  if (error) throw error;
}
export async function requestDeployment(bot: Telegraf<Context>, tag: string, ownerId: number) {
  if (!config.DEPLOY_WEBHOOK_URL || !config.DEPLOY_WEBHOOK_SECRET) throw new Error("Configure DEPLOY_WEBHOOK_URL and DEPLOY_WEBHOOK_SECRET for the hosting provider before installing updates");
  const { data: approval, error } = await db.from("vextro_update_approvals").select("tag,status").eq("tag", tag).maybeSingle();
  if (error || !approval || approval.status !== "approved") throw new Error("This release has not been explicitly approved by the Owner");
  if (!config.BACKUP_PASSPHRASE) throw new Error("Encrypted safety backup is required; configure BACKUP_PASSPHRASE first");
  const health = await runHealthCheck(bot);
  if (health.database !== "ok" || health.telegram !== "ok") throw new Error("Pre-update health check failed: " + health.detail.join("; "));
  const backup = await createBackup(ownerId);
  const response = await fetch(config.DEPLOY_WEBHOOK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer " + config.DEPLOY_WEBHOOK_SECRET },
    body: JSON.stringify({ action: "deploy", repository: config.GITHUB_REPOSITORY, release_tag: tag, safety_backup_id: backup.id }),
    signal: AbortSignal.timeout(15_000)
  });
  if (!response.ok) throw new Error("Hosting deployment webhook rejected request with HTTP " + response.status);
  await db.from("vextro_update_approvals").update({ status: "deploy_requested", updated_at: new Date().toISOString() }).eq("tag", tag);
  return { backupId: backup.id };
}
export async function requestRollback(bot: Telegraf<Context>, tag: string, ownerId: number) {
  if (!config.DEPLOY_WEBHOOK_URL || !config.DEPLOY_WEBHOOK_SECRET) throw new Error("Configure the hosting rollback webhook first");
  const { data: approval, error } = await db.from("vextro_update_approvals").select("tag,status").eq("tag", tag).maybeSingle();
  if (error || !approval || approval.status !== "deploy_requested") throw new Error("Only a previously deployed approved release can be rolled back");
  if (!config.BACKUP_PASSPHRASE) throw new Error("Encrypted safety backup is required before rollback");
  const health = await runHealthCheck(bot);
  const backup = await createBackup(ownerId);
  const response = await fetch(config.DEPLOY_WEBHOOK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer " + config.DEPLOY_WEBHOOK_SECRET },
    body: JSON.stringify({ action: "rollback", repository: config.GITHUB_REPOSITORY, release_tag: tag, health_before_rollback: health, safety_backup_id: backup.id }),
    signal: AbortSignal.timeout(15_000)
  });
  if (!response.ok) throw new Error("Hosting rollback webhook rejected request with HTTP " + response.status);
  await db.from("vextro_update_approvals").update({ status: "rollback_requested", updated_at: new Date().toISOString() }).eq("tag", tag);
  return { backupId: backup.id };
}
export function registerUpdateCommands(bot: Telegraf<Context>, ownerOnly: (ctx: Context) => boolean, ownerId: number) {
  bot.command("update_check", async (ctx) => {
    if (!ownerOnly(ctx)) return ctx.reply("Access denied.");
    try {
      const release = await checkLatestRelease();
      if (!release) return ctx.reply("No GitHub release is published yet.");
      await ctx.reply("Latest release: " + release.tag_name + "\n" + (release.name ?? "") + "\n" + release.html_url + "\nPublished: " + (release.published_at ?? "unknown") + "\n\nReview it, then explicitly approve with /update_approve " + release.tag_name);
    } catch (error) { await ctx.reply("Update check failed: " + (error instanceof Error ? error.message : "unknown error")); }
  });
  bot.command("update_approve", async (ctx) => {
    if (!ownerOnly(ctx)) return ctx.reply("Access denied.");
    const tag = ctx.message.text.split(/\s+/)[1];
    if (!tag || tag.length > 100) return ctx.reply("Usage: /update_approve <release-tag>");
    try {
      const release = await checkLatestRelease();
      if (!release || release.tag_name !== tag) return ctx.reply("That tag is not the latest verified release.");
      await approveRelease(tag, release.html_url, ownerId);
      await ctx.reply("Release " + tag + " approved. Installation still requires the configured hosting deploy webhook. Run /update_install " + tag + " when ready.");
    } catch (error) { await ctx.reply("Approval failed: " + (error instanceof Error ? error.message : "unknown error")); }
  });
  bot.command("update_install", async (ctx) => {
    if (!ownerOnly(ctx)) return ctx.reply("Access denied.");
    const tag = ctx.message.text.split(/\s+/)[1];
    if (!tag) return ctx.reply("Usage: /update_install <approved-release-tag>");
    try {
      const result = await requestDeployment(bot, tag, ownerId);
      await ctx.reply("Deployment request accepted by the hosting webhook. Safety backup: " + result.backupId + ". Hosting health checks and rollback must be confirmed by the deployment provider.");
    } catch (error) { await ctx.reply("Update was not installed: " + (error instanceof Error ? error.message : "unknown error")); }
  });
  bot.command("update_rollback", async (ctx) => {
    if (!ownerOnly(ctx)) return ctx.reply("Access denied.");
    const tag = ctx.message.text.split(/\s+/)[1];
    if (!tag) return ctx.reply("Usage: /update_rollback <previously-deployed-release-tag>");
    try {
      const result = await requestRollback(bot, tag, ownerId);
      await ctx.reply("Rollback request accepted by hosting webhook. Safety backup: " + result.backupId + ". Verify the application health in the host panel.");
    } catch (error) { await ctx.reply("Rollback was not requested: " + (error instanceof Error ? error.message : "unknown error")); }
  });
  bot.command("update_status", async (ctx) => {
    if (!ownerOnly(ctx)) return ctx.reply("Access denied.");
    const { data, error } = await db.from("vextro_update_approvals").select("tag,status,release_url,approved_at,updated_at").order("updated_at", { ascending: false }).limit(10);
    if (error) return ctx.reply("Update history unavailable.");
    if (!data?.length) return ctx.reply("No releases approved.");
    await ctx.reply(data.map(x => x.tag + " | " + x.status + "\n" + x.release_url + "\n" + new Date(x.updated_at).toLocaleString()).join("\n\n"));
  });
}
export function startUpdateMonitor(bot: Telegraf<Context>, ownerId: number, intervalHours = 6) {
  let stopped = false;
  let lastTag = "";
  const check = async () => {
    if (stopped) return;
    try {
      const release = await checkLatestRelease();
      if (release && release.tag_name !== lastTag) {
        lastTag = release.tag_name;
        const { data } = await db.from("vextro_update_approvals").select("tag").eq("tag", release.tag_name).maybeSingle();
        if (!data) await bot.telegram.sendMessage(ownerId, "VEXTRO BOT update available: " + release.tag_name + "\n" + release.html_url + "\nReview and approve with /update_approve " + release.tag_name);
      }
    } catch (error) { console.error("VEXTRO update monitor failed", error); }
  };
  void check();
  const timer = setInterval(() => void check(), Math.max(1, intervalHours) * 3600_000);
  return () => { stopped = true; clearInterval(timer); };
}
