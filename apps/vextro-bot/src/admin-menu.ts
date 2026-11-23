import { Markup, type Context, type Telegraf } from "telegraf";
import { db } from "./supabase.js";
import { listBackups } from "./backup.js";
import { runHealthCheck } from "./health.js";
import { checkLatestRelease } from "./updates.js";

export function registerOwnerMenu(bot: Telegraf<Context>, ownerOnly: (ctx: Context) => boolean) {
  const menu = Markup.inlineKeyboard([
    [Markup.button.callback("Users", "owner:users"), Markup.button.callback("Tickets", "owner:tickets")],
    [Markup.button.callback("Broadcasts", "owner:broadcasts"), Markup.button.callback("Posts", "owner:posts")],
    [Markup.button.callback("Guides", "owner:guides"), Markup.button.callback("Analytics", "owner:analytics")],
    [Markup.button.callback("Backups", "owner:backups"), Markup.button.callback("Health", "owner:health")],
    [Markup.button.callback("Updates", "owner:updates"), Markup.button.callback("Maintenance", "owner:maintenance")]
  ]);
  bot.command("admin_menu", async (ctx) => {
    if (!ownerOnly(ctx)) return ctx.reply("Access denied.");
    await ctx.reply("VEXTRO BOT Owner Control Center\nChoose a module:", menu);
  });
  bot.action("owner:home", async (ctx) => {
    if (!ownerOnly(ctx)) return ctx.answerCbQuery("Access denied.");
    await ctx.answerCbQuery();
    await ctx.reply("VEXTRO BOT Owner Control Center\nChoose a module:", menu);
  });
  bot.action(/^owner:(users|tickets|broadcasts|posts|guides|analytics|backups|health|updates|maintenance)$/, async (ctx) => {
    if (!ownerOnly(ctx)) return ctx.answerCbQuery("Access denied.");
    await ctx.answerCbQuery();
    const page = ctx.match[1]!;
    try {
      if (page === "users") {
        const { data, error } = await db.from("bot_users").select("telegram_id,language,updated_at").order("updated_at", { ascending: false }).limit(15);
        if (error) throw error;
        return ctx.reply(data?.length ? data.map(x => x.telegram_id + " | " + x.language).join("\n") : "No registered users.");
      }
      if (page === "tickets") {
        const { data, error } = await db.from("bot_support_tickets").select("id,telegram_id,subject,status,priority").neq("status", "closed").order("updated_at", { ascending: false }).limit(15);
        if (error) throw error;
        return ctx.reply(data?.length ? data.map(x => "[" + x.status + "/" + x.priority + "] " + x.id + "\n" + x.telegram_id + " | " + x.subject).join("\n\n") : "No open tickets.");
      }
      if (page === "broadcasts") {
        const { data, error } = await db.from("vextro_broadcast_jobs").select("id,status,total_count,sent_count,failed_count").order("created_at", { ascending: false }).limit(15);
        if (error) throw error;
        return ctx.reply(data?.length ? data.map(x => x.id + " | " + x.status + " | " + x.sent_count + "/" + x.total_count).join("\n") : "No broadcasts.");
      }
      if (page === "posts") {
        const { data, error } = await db.from("dgbot_posts").select("id,title,state").is("deleted_at", null).order("updated_at", { ascending: false }).limit(15);
        if (error) throw error;
        return ctx.reply(data?.length ? data.map(x => "[" + x.state + "] " + x.id + "\n" + x.title).join("\n\n") : "No posts.");
      }
      if (page === "guides") {
        const { data, error } = await db.from("dgbot_guides").select("id,category,title,published").is("deleted_at", null).order("updated_at", { ascending: false }).limit(15);
        if (error) throw error;
        return ctx.reply(data?.length ? data.map(x => "[" + x.category + "] " + x.id + " | " + (x.published ? "published" : "draft") + "\n" + String((x.title as Record<string, string>).en ?? x.id)).join("\n\n") : "No guides.");
      }
      if (page === "analytics") {
        const [{ count: users }, { count: links }, { count: tickets }, { count: posts }] = await Promise.all([
          db.from("bot_users").select("*", { count: "exact", head: true }),
          db.from("bot_account_links").select("*", { count: "exact", head: true }).is("unlinked_at", null),
          db.from("bot_support_tickets").select("*", { count: "exact", head: true }).neq("status", "closed"),
          db.from("dgbot_posts").select("*", { count: "exact", head: true }).eq("state", "published").is("deleted_at", null)
        ]);
        return ctx.reply("Analytics\nUsers: " + (users ?? 0) + "\nLinked accounts: " + (links ?? 0) + "\nOpen tickets: " + (tickets ?? 0) + "\nPublished posts: " + (posts ?? 0));
      }
      if (page === "backups") {
        const items = await listBackups();
        return ctx.reply(items.length ? items.map(x => x.id + " | " + x.bytes + " bytes | " + (x.verified_at ? "verified" : "unverified")).join("\n") : "No backups recorded.");
      }
      if (page === "health") {
        const report = await runHealthCheck(bot);
        return ctx.reply(report.detail.join("\n"));
      }
      if (page === "updates") {
        const release = await checkLatestRelease();
        return ctx.reply(release ? "Latest release: " + release.tag_name + "\n" + release.html_url : "No published release found.");
      }
      const { data } = await db.from("vextro_runtime_settings").select("value").eq("key", "maintenance").maybeSingle();
      const enabled = (data?.value as { enabled?: boolean } | null)?.enabled === true;
      return ctx.reply("Maintenance mode: " + (enabled ? "ON" : "OFF") + "\n/maintenance_on or /maintenance_off");
    } catch (error) {
      return ctx.reply("Dashboard section unavailable: " + (error instanceof Error ? error.message : "unknown error"));
    }
  });
}
