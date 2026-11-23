import type { Context, Telegraf } from "telegraf";
import { db } from "./supabase.js";

type OwnerCheck = (ctx: Context) => boolean;
type Audit = (action: string, target: number | null, reason: string) => Promise<void>;

export function registerGuideAdmin(bot: Telegraf<Context>, ownerOnly: OwnerCheck, writeAudit: Audit) {
  bot.command("guide_create", async (ctx) => {
    if (!ownerOnly(ctx)) return ctx.reply("Access denied.");
    const m = ctx.message.text.match(/^\/guide_create(?:@\w+)?\s+([a-z0-9][a-z0-9_-]{0,30})\s+([a-z0-9_-]{1,64})\s+([\s\S]+)$/i);
    if (!m) return ctx.reply("Usage: /guide_create <id> <category> <English title>");
    const { error } = await db.from("dgbot_guides").insert({
      id: m[1]!.toLowerCase(), category: m[2]!.toLowerCase(), link: "/guides/" + m[1]!.toLowerCase(),
      title: { en: m[3]!.trim() }, steps: { en: [] }, published: false, buttons: []
    });
    if (error) return ctx.reply("Could not create guide. Check that the ID is unique and valid.");
    await ctx.reply("Guide draft created: " + m[1] + ". Add localized content with /guide_edit.");
  });
  bot.command("guide_edit", async (ctx) => {
    if (!ownerOnly(ctx)) return ctx.reply("Access denied.");
    const m = ctx.message.text.match(/^\/guide_edit(?:@\w+)?\s+([a-z0-9_-]{1,31})\s+(en|hi-Latn|vi)\s+([\s\S]+)$/i);
    if (!m) return ctx.reply("Usage: /guide_edit <id> <en|hi-Latn|vi> <title> | <step 1> | <step 2>");
    const parts = m[3]!.split("|").map((x) => x.trim());
    const title = parts.shift() ?? "";
    if (!title || title.length > 120 || parts.some((x) => x.length > 500)) return ctx.reply("Title max 120 characters; each step max 500.");
    const { data, error } = await db.from("dgbot_guides").select("title,steps").eq("id", m[1]!).is("deleted_at", null).maybeSingle();
    if (error || !data) return ctx.reply("Guide not found.");
    const titles = { ...(data.title as Record<string, string>), [m[2]!]: title };
    const steps = { ...(data.steps as Record<string, unknown>), [m[2]!]: parts };
    const { error: updateError } = await db.from("dgbot_guides").update({ title: titles, steps, updated_at: new Date().toISOString() }).eq("id", m[1]!);
    if (updateError) return ctx.reply("Guide update failed.");
    await ctx.reply("Guide " + m[1] + " updated for " + m[2] + ".");
  });
  bot.command("guide_media", async (ctx) => {
    if (!ownerOnly(ctx)) return ctx.reply("Access denied.");
    const m = ctx.message.text.match(/^\/guide_media(?:@\w+)?\s+([a-z0-9_-]{1,31})\s+(photo|video|document|animation)\s+(\S+)(?:\s+([\s\S]+))?$/i);
    if (!m) return ctx.reply("Usage: /guide_media <id> <photo|video|document|animation> <telegram-file-id> [caption]");
    const { data, error } = await db.from("dgbot_guides").update({
      media: { type: m[2], file_id: m[3], caption: m[4] ?? "" }, updated_at: new Date().toISOString()
    }).eq("id", m[1]!).is("deleted_at", null).select("id").maybeSingle();
    if (error || !data) return ctx.reply("Guide not found or media update failed.");
    await ctx.reply("Guide media saved.");
  });
  bot.command("guide_buttons", async (ctx) => {
    if (!ownerOnly(ctx)) return ctx.reply("Access denied.");
    const m = ctx.message.text.match(/^\/guide_buttons(?:@\w+)?\s+([a-z0-9_-]{1,31})\s+([\s\S]+)$/i);
    if (!m) return ctx.reply("Usage: /guide_buttons <id> Label|https://url (one per line, max 8)");
    const buttons: Array<{ text: string; url: string }> = [];
    for (const line of m[2]!.split("\n").map((x) => x.trim()).filter(Boolean)) {
      const at = line.indexOf("|");
      if (at < 1) return ctx.reply("Use Label|https://url");
      const label = line.slice(0, at).trim();
      let url: URL;
      try { url = new URL(line.slice(at + 1).trim()); } catch { return ctx.reply("Invalid HTTPS URL."); }
      if (!label || label.length > 40 || url.protocol !== "https:") return ctx.reply("Labels max 40 characters; HTTPS links only.");
      buttons.push({ text: label, url: url.toString() });
    }
    if (buttons.length > 8) return ctx.reply("Maximum 8 buttons.");
    const { data, error } = await db.from("dgbot_guides").update({ buttons, updated_at: new Date().toISOString() })
      .eq("id", m[1]!).is("deleted_at", null).select("id").maybeSingle();
    if (error || !data) return ctx.reply("Guide not found or button update failed.");
    await ctx.reply("Guide buttons saved.");
  });
  bot.command("guide_publish", async (ctx) => {
    if (!ownerOnly(ctx)) return ctx.reply("Access denied.");
    const id = ctx.message.text.split(/\s+/)[1];
    if (!id) return ctx.reply("Usage: /guide_publish <id>");
    const { data, error } = await db.from("dgbot_guides").update({ published: true, updated_at: new Date().toISOString() })
      .eq("id", id).is("deleted_at", null).select("id").maybeSingle();
    if (error || !data) return ctx.reply("Guide not found or publish failed.");
    await writeAudit("guide.published", null, id);
    await ctx.reply("Guide " + id + " published.");
  });
  bot.command("guide_delete", async (ctx) => {
    if (!ownerOnly(ctx)) return ctx.reply("Access denied.");
    const id = ctx.message.text.split(/\s+/)[1];
    if (!id) return ctx.reply("Usage: /guide_delete <id>");
    const { data, error } = await db.from("dgbot_guides").update({
      published: false, deleted_at: new Date().toISOString(), updated_at: new Date().toISOString()
    }).eq("id", id).is("deleted_at", null).select("id").maybeSingle();
    if (error || !data) return ctx.reply("Guide not found.");
    await writeAudit("guide.deleted", null, id);
    await ctx.reply("Guide archived.");
  });
  bot.command("guide_keyword", async (ctx) => {
    if (!ownerOnly(ctx)) return ctx.reply("Access denied.");
    const m = ctx.message.text.match(/^\/guide_keyword(?:@\w+)?\s+([a-z0-9_-]{1,31})\s+(en|hi-Latn|vi)\s+([\s\S]+)$/i);
    if (!m) return ctx.reply("Usage: /guide_keyword <id> <en|hi-Latn|vi> <keyword>");
    const { error } = await db.from("dgbot_guide_keywords").insert({ guide_id: m[1]!, language: m[2]!, term: m[3]!.trim(), source: "owner", confidence: 1 });
    if (error) return ctx.reply("Could not save guide keyword.");
    await ctx.reply("Guide keyword saved.");
  });
  bot.command("guide_review", async (ctx) => {
    if (!ownerOnly(ctx)) return ctx.reply("Access denied.");
    const { data, error } = await db.from("dgbot_review_queue").select("id,phrase,candidate_guide_id,confidence")
      .eq("status", "pending").is("deleted_at", null).order("created_at").limit(20);
    if (error) return ctx.reply("Review queue unavailable.");
    if (!data?.length) return ctx.reply("No guide suggestions awaiting review.");
    await ctx.reply(data.map((x) => "#" + x.id + " " + x.phrase + " (confidence " + x.confidence + ") candidate " +
      (x.candidate_guide_id ?? "none") + "\nApprove: /guide_review_approve " + x.id + " <guide-id> | Reject: /guide_review_reject " + x.id).join("\n\n"));
  });
  bot.command("guide_review_approve", async (ctx) => {
    if (!ownerOnly(ctx)) return ctx.reply("Access denied.");
    const m = ctx.message.text.match(/^\/guide_review_approve(?:@\w+)?\s+(\d+)\s+([a-z0-9_-]{1,31})$/i);
    if (!m) return ctx.reply("Usage: /guide_review_approve <queue-id> <guide-id>");
    const { data: guide, error: guideError } = await db.from("dgbot_guides").select("id").eq("id", m[2]!).is("deleted_at", null).maybeSingle();
    if (guideError || !guide) return ctx.reply("Guide not found.");
    const { data, error } = await db.from("dgbot_review_queue").update({
      status: "approved", candidate_guide_id: m[2], reviewed_at: new Date().toISOString()
    }).eq("id", Number(m[1])).eq("status", "pending").select("phrase").maybeSingle();
    if (error || !data) return ctx.reply("Suggestion not found or already reviewed.");
    await db.from("dgbot_guide_keywords").insert({ guide_id: m[2], language: "en", term: data.phrase, source: "review", confidence: 1 });
    await ctx.reply("Suggestion approved and added as a guide keyword.");
  });
  bot.command("guide_review_reject", async (ctx) => {
    if (!ownerOnly(ctx)) return ctx.reply("Access denied.");
    const id = Number(ctx.message.text.split(/\s+/)[1]);
    if (!Number.isSafeInteger(id) || id < 1) return ctx.reply("Usage: /guide_review_reject <queue-id>");
    const { data, error } = await db.from("dgbot_review_queue").update({ status: "rejected", reviewed_at: new Date().toISOString() })
      .eq("id", id).eq("status", "pending").select("id").maybeSingle();
    if (error || !data) return ctx.reply("Pending suggestion not found.");
    await ctx.reply("Suggestion rejected.");
  });
}
