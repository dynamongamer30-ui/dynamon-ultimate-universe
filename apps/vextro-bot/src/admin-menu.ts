import { Markup, type Context, type Telegraf } from "telegraf";
import { db } from "./supabase.js";
import { config } from "./config.js";
import { listBackups } from "./backup.js";
import { runHealthCheck } from "./health.js";
import { checkLatestRelease } from "./updates.js";
import { formatOwnerDateTime } from "./time.js";

// Plain-text headers (not MarkdownV2 bold) on purpose: these sections interpolate
// dynamic data from many tables (ticket subjects, audit reasons, guide titles...)
// and MarkdownV2 would reject the whole message on a single unescaped special
// character in any of it. Keeping these sections plain avoids that failure mode
// entirely while still giving a clean, consistent header/divider typography.
const homeKeyboard = Markup.inlineKeyboard([[Markup.button.callback("× Dashboard", "owner:home")]]);
function sectionHeader(title: string): string { return title + "\n─────────────\n"; }
function ok(label: string): string { return "✓ " + label; }
function warn(label: string): string { return "! " + label; }

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
        const body = data?.length ? data.map(x => x.telegram_id + " | " + x.language + " | " + (x.last_seen_at ? formatOwnerDateTime(x.last_seen_at, config.OWNER_TIMEZONE) : "never seen")).join("\n") : "No registered users.\nUse /users <page> for more.";
        return ctx.reply(sectionHeader("Users") + body, homeKeyboard);
      }
      if (page === "tickets") {
        const { data, error } = await db.from("bot_support_tickets").select("id,telegram_id,subject,status,priority").neq("status", "closed").order("updated_at", { ascending: false }).limit(15);
        if (error) throw error;
        const body = data?.length ? data.map(x => "[" + x.status + "/" + x.priority + "] " + x.id + "\n" + x.telegram_id + " | " + x.subject).join("\n\n") : "No open tickets.\nUse /tickets <page> for more.";
        return ctx.reply(sectionHeader("Tickets") + body, homeKeyboard);
      }
      if (page === "broadcasts") {
        const { data, error } = await db.from("vextro_broadcast_jobs").select("id,status,total_count,sent_count,failed_count").order("created_at", { ascending: false }).limit(15);
        if (error) throw error;
        const body = data?.length ? data.map(x => x.id + " | " + x.status + " | " + x.sent_count + "/" + x.total_count + " sent | " + x.failed_count + " failed").join("\n") : "No broadcasts.\nUse /broadcast_draft to create one.";
        return ctx.reply(sectionHeader("Broadcasts") + body, homeKeyboard);
      }
      if (page === "posts") {
        const { data, error } = await db.from("dgbot_posts").select("id,title,state").is("deleted_at", null).order("updated_at", { ascending: false }).limit(15);
        if (error) throw error;
        const body = data?.length ? data.map(x => "[" + x.state + "] " + x.id + "\n" + x.title).join("\n\n") : "No posts.\nUse /post_draft to create one.";
        return ctx.reply(sectionHeader("Posts") + body, homeKeyboard);
      }
      if (page === "guides") {
        const { data, error } = await db.from("dgbot_guides").select("id,category,title,published").is("deleted_at", null).order("updated_at", { ascending: false }).limit(15);
        if (error) throw error;
        const body = data?.length ? data.map(x => "[" + x.category + "] " + x.id + " | " + (x.published ? ok("published") : warn("draft")) + "\n" + String((x.title as Record<string, string>).en ?? x.id)).join("\n\n") : "No guides.\nUse /guide_create to add one.";
        return ctx.reply(sectionHeader("Guides") + body, homeKeyboard);
      }
      if (page === "moderation") {
        const [{data:rules,error:ruleError},{data:hosts,error:hostError}] = await Promise.all([
          db.from("dgbot_moderation_rules").select("id,kind,value").is("deleted_at",null).order("created_at",{ascending:false}).limit(12),
          db.from("dgbot_allowlist").select("id,host").is("deleted_at",null).order("created_at",{ascending:false}).limit(12)
        ]);
        if(ruleError||hostError) throw ruleError??hostError;
        return ctx.reply(sectionHeader("Moderation")+"Rules\n"+((rules??[]).map(x=>"#"+x.id+" ["+x.kind+"] "+x.value).join("\n")||"No active rules.")+
          "\n\nAllowed hosts\n"+((hosts??[]).map(x=>"#"+x.id+" "+x.host).join("\n")||"No allowed hosts.")+
          "\n\nCommands: /moderation_add, /moderation_edit, /moderation_remove, /allow_host, /edit_allow_host, /remove_allow_host, /warn_user, /mute_user, /unmute_user, /group_ban, /group_unban", homeKeyboard);
      }
      if (page === "membership") {
        const {data,error}=await db.from("vextro_runtime_settings").select("value").eq("key","membership_config").maybeSingle();
        if(error) throw error;
        const values=(data?.value??{}) as {channelId?:string;groupId?:string};
        return ctx.reply(sectionHeader("Membership requirements")+"Channel: "+(values.channelId??config.REQUIRED_CHANNEL_ID)+
          "\nGroup: "+(values.groupId??config.REQUIRED_GROUP_ID)+
          "\n\nCommands: /membership_status, /membership_check <telegram-id>, /membership_diagnose, /membership_set_channel, /membership_set_group, /membership_reset", homeKeyboard);
      }
      if (page === "schedules") {
        const {data,error}=await db.from("vextro_scheduled_posts").select("id,post_id,scheduled_at,status,last_error").in("status",["scheduled","publishing","failed"]).order("scheduled_at",{ascending:true}).limit(15);
        if(error) throw error;
        const body = data?.length?data.map(x=>"["+x.status+"] "+x.id+"\nPost: "+x.post_id+"\n"+formatOwnerDateTime(x.scheduled_at,config.OWNER_TIMEZONE)+(x.last_error?"\n"+warn(x.last_error):"")).join("\n\n"):"No pending or failed scheduled posts.\nUse /post_schedules for full history.";
        return ctx.reply(sectionHeader("Schedules") + body, homeKeyboard);
      }
      if (page === "analytics") {
        const [{ count: users }, { count: activeUsers }, { count: links }, { count: tickets }, { count: posts }, {count:sent},{count:failed}] = await Promise.all([
          db.from("bot_users").select("*", { count: "exact", head: true }),
          db.from("bot_users").select("*", { count: "exact", head: true }).gte("last_seen_at", new Date(Date.now()-24*3600_000).toISOString()),
          db.from("bot_account_links").select("*", { count: "exact", head: true }).is("unlinked_at", null),
          db.from("bot_support_tickets").select("*", { count: "exact", head: true }).neq("status", "closed"),
          db.from("dgbot_posts").select("*", { count: "exact", head: true }).eq("state", "published").is("deleted_at", null),
          db.from("vextro_broadcast_recipients").select("*",{count:"exact",head:true}).eq("status","sent"),
          db.from("vextro_broadcast_recipients").select("*",{count:"exact",head:true}).eq("status","failed")
        ]);
        return ctx.reply(sectionHeader("Analytics")+"Users: " + (users ?? 0) + "\nActive users (24h): "+(activeUsers??0)+"\nLinked accounts: " + (links ?? 0) + "\nOpen tickets: " + (tickets ?? 0) + "\nPublished posts: " + (posts ?? 0) + "\nBroadcast sent: "+(sent??0)+"\nBroadcast failed: "+(failed??0), homeKeyboard);
      }
      if (page === "security") {
        const [{data:events,error:eventError},{count:bans,error:banError}] = await Promise.all([
          db.from("dgbot_audit_log").select("action,target_id,reason,created_at").order("created_at",{ascending:false}).limit(10),
          db.from("dgbot_bans").select("*",{count:"exact",head:true}).is("deleted_at",null)
        ]);
        if(eventError||banError) throw eventError??banError;
        return ctx.reply(sectionHeader("Security & audit")+"Active bot restrictions: "+(bans??0)+"\n\nRecent audit events\n"+((events??[]).map(x=>x.action+" | "+(x.target_id??"—")+" | "+formatOwnerDateTime(x.created_at,config.OWNER_TIMEZONE)+"\n"+x.reason).join("\n\n")||"No audit events."), homeKeyboard);
      }
      if (page === "backups") {
        const items = await listBackups();
        const body = items.length ? items.map(x => x.id + " | " + x.bytes + " bytes | " + formatOwnerDateTime(x.created_at,config.OWNER_TIMEZONE) + " | " + (x.verified_at ? ok("verified") : warn("unverified")) + " | offsite " + (x.offsite_verified_at ? ok("verified") : x.offsite_error ? warn("failed") : "not configured")).join("\n") : "No backups recorded.";
        return ctx.reply(sectionHeader("Backups") + body, homeKeyboard);
      }
      if (page === "settings") {
        return ctx.reply(sectionHeader("Runtime settings")+"Owner timezone: "+config.OWNER_TIMEZONE+
          "\nBackup interval: "+config.BACKUP_INTERVAL_HOURS+" hours"+
          "\nBackup retention: "+config.BACKUP_RETENTION_DAYS+" days"+
          "\nBackup encryption: "+(config.BACKUP_PASSPHRASE?ok("configured"):warn("not configured"))+
          "\nOffsite backup: "+(config.BACKUP_OFFSITE_URL&&config.BACKUP_OFFSITE_TOKEN?ok("configured"):warn("not configured"))+
          "\nPublishing: "+(config.PUBLISH_CHANNEL_ID?ok("enabled"):warn("not configured"))+
          "\nDeployment webhook: "+(config.DEPLOY_WEBHOOK_URL?ok("configured"):warn("not configured"))+
          "\n\nCommands: /settings, /welcome_set, /membership_set_channel, /membership_set_group, /maintenance_status", homeKeyboard);
      }
      if (page === "health") {
        const report = await runHealthCheck(bot);
        return ctx.reply(sectionHeader("Health")+(report.database==="ok"?ok("database"):warn("database"))+" | "+(report.telegram==="ok"?ok("Telegram"):warn("Telegram"))+"\nChecked: "+formatOwnerDateTime(report.checkedAt,config.OWNER_TIMEZONE)+"\n"+report.detail.join("\n"), homeKeyboard);
      }
      if (page === "logs") return ctx.reply(sectionHeader("Logs")+"Use /logs to view recent runtime logs and /log_search <term> to filter the current log buffer. Full process logs remain in your hosting console.", homeKeyboard);
      if (page === "updates") {
        const release = await checkLatestRelease();
        return ctx.reply(sectionHeader("Updates")+(release ? "Latest release: " + release.tag_name + "\n" + release.html_url + "\nUse /update_check, /update_approve and /update_install." : "No published release found."), homeKeyboard);
      }
      const { data } = await db.from("vextro_runtime_settings").select("value").eq("key", "maintenance").maybeSingle();
      const enabled = (data?.value as { enabled?: boolean } | null)?.enabled === true;
      return ctx.reply(sectionHeader("Maintenance")+(enabled ? warn("ON") : ok("OFF"))+"\n/maintenance_on or /maintenance_off", homeKeyboard);
    } catch (error) {
      return ctx.reply(sectionHeader("Dashboard section unavailable")+(error instanceof Error ? error.message : "unknown error"), homeKeyboard);
    }
  });
}
