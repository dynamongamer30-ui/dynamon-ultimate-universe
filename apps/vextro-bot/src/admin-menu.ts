import { Markup, type Context, type Telegraf } from "telegraf";
import { db } from "./supabase.js";
import { config } from "./config.js";
import { listBackups } from "./backup.js";
import { runHealthCheck } from "./health.js";
import { checkLatestRelease } from "./updates.js";

export const ownerMenuText = "*Dynamon Assistant — Owner Dashboard*\nChoose a module:";
export const ownerMenuKeyboard = Markup.inlineKeyboard([
  [Markup.button.callback("Users ›", "owner:users"), Markup.button.callback("Tickets ›", "owner:tickets")],
  [Markup.button.callback("Broadcasts ›", "owner:broadcasts"), Markup.button.callback("Posts ›", "owner:posts")],
  [Markup.button.callback("Guides ›", "owner:guides"), Markup.button.callback("Moderation ›", "owner:moderation")],
  [Markup.button.callback("Membership ›", "owner:membership"), Markup.button.callback("Schedules ›", "owner:schedules")],
  [Markup.button.callback("Analytics ›", "owner:analytics"), Markup.button.callback("Security & Audit ›", "owner:security")],
  [Markup.button.callback("Backups ›", "owner:backups"), Markup.button.callback("Settings ›", "owner:settings")],
  [Markup.button.callback("Health ›", "owner:health"), Markup.button.callback("Logs ›", "owner:logs")],
  [Markup.button.callback("Maintenance ›", "owner:maintenance"), Markup.button.callback("Updates ›", "owner:updates")]
]);

export function registerOwnerMenu(bot: Telegraf<Context>, ownerOnly: (ctx: Context) => boolean) {
  const menu = ownerMenuKeyboard;
  bot.command("admin_menu", async (ctx) => {
    if (!ownerOnly(ctx)) return ctx.reply("Access denied.");
    await ctx.reply(ownerMenuText, { parse_mode: "MarkdownV2", ...menu });
  });
  bot.action("owner:home", async (ctx) => {
    if (!ownerOnly(ctx)) return ctx.answerCbQuery("Access denied.");
    await ctx.answerCbQuery();
    await ctx.reply(ownerMenuText, { parse_mode: "MarkdownV2", ...menu });
  });
  bot.action(/^owner:(users|tickets|broadcasts|posts|guides|moderation|membership|schedules|analytics|security|backups|settings|health|logs|maintenance|updates)$/, async (ctx) => {
    if (!ownerOnly(ctx)) return ctx.answerCbQuery("Access denied.");
    await ctx.answerCbQuery();
    const page = ctx.match[1]!;
    try {
      if (page === "users") {
        const { data, error } = await db.from("bot_users").select("telegram_id,language,last_seen_at").order("last_seen_at", { ascending: false }).limit(15);
        if (error) throw error;
        return ctx.reply(data?.length ? data.map(x => x.telegram_id + " | " + x.language + " | " + (x.last_seen_at ? new Date(x.last_seen_at).toLocaleDateString() : "never seen")).join("\n") : "No registered users.\nUse /users <page> for more.");
      }
      if (page === "tickets") {
        const { data, error } = await db.from("bot_support_tickets").select("id,telegram_id,subject,status,priority").neq("status", "closed").order("updated_at", { ascending: false }).limit(15);
        if (error) throw error;
        return ctx.reply(data?.length ? data.map(x => "#" + x.id + " " + x.subject + " [" + x.status + "/" + x.priority + "] from " + x.telegram_id).join("\n") : "No open tickets.");
      }
      return ctx.reply("Use /admin_help for the full command reference for this module.");
    } catch (error) {
      return ctx.reply("That module is temporarily unavailable. Check host logs.");
    }
  });
}
