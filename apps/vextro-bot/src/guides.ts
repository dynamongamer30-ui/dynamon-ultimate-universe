import type { Context, Telegraf } from "telegraf";
import { Markup } from "telegraf";
import { db } from "./supabase.js";
import { captureFormattedInput } from "./formatting.js";

type OwnerCheck = (ctx: Context) => boolean;
type Audit = (action: string, target: number | null, reason: string) => Promise<void>;

// Tap-to-edit flow: owner taps "Title" / "Body" on a guide, bot asks for the new
// text, owner sends it using Telegram's own formatting bar (bold/italic/etc.),
// the bot captures the exact formatting via entitiesToMarkdownV2 and stores it.
// Replaces the old /guide_edit <id> <locale> <title> | <steps> command for
// anyone who wants the tap-driven flow; the slash command still works too.
interface PendingGuideEdit {
  guideId: string;
  locale: "en" | "hi-Latn" | "vi";
  field: "title" | "step";
  expiresAt: number;
}
const pendingGuideEdits = new Map<number, PendingGuideEdit>();
const EDIT_TIMEOUT_MS = 5 * 60 * 1000;

function guideEditKeyboard(guideId: string, locale: string) {
  return Markup.inlineKeyboard([
    [Markup.button.callback("Title ›", `guide:set:title:${guideId}:${locale}`)],
    [Markup.button.callback("Add step ›", `guide:set:step:${guideId}:${locale}`)],
    [Markup.button.callback("Preview ›", `guide:preview:${guideId}:${locale}`)],
    [Markup.button.callback("× Cancel", "guide:edit:cancel")]
  ]);
}

export function registerGuideEditorFlow(bot: Telegraf<Context>, ownerOnly: OwnerCheck, writeAudit: Audit) {
  // Entry point: /guide_editor <id> [locale] opens the tap-driven editor for a guide.
  bot.command("guide_editor", async (ctx) => {
    if (!ownerOnly(ctx)) return ctx.reply("Access denied.");
    const m = ctx.message.text.match(/^\/guide_editor(?:@\w+)?\s+([a-z0-9_-]{1,31})(?:\s+(en|hi-Latn|vi))?$/i);
    if (!m) return ctx.reply("Usage: /guide_editor <id> [en|hi-Latn|vi]");
    const locale = (m[2] ?? "en") as "en" | "hi-Latn" | "vi";
    const { data, error } = await db.from("dgbot_guides").select("id").eq("id", m[1]!).is("deleted_at", null).maybeSingle();
    if (error || !data) return ctx.reply("Guide not found.");
    await ctx.reply(
      "Editing guide *" + m[1] + "* — locale `" + locale + "`\nUse Telegram's own bold/italic/etc\\. formatting when you send text; it is saved exactly as you send it\\.",
      { parse_mode: "MarkdownV2", ...guideEditKeyboard(m[1]!, locale) }
    );
  });

  bot.action(/^guide:set:(title|step):([a-z0-9_-]{1,31}):(en|hi-Latn|vi)$/, async (ctx) => {
    await ctx.answerCbQuery();
    if (!ownerOnly(ctx) || !ctx.from) return ctx.reply("Access denied.");
    const [, field, guideId, locale] = ctx.match as unknown as [string, "title" | "step", string, "en" | "hi-Latn" | "vi"];
    pendingGuideEdits.set(ctx.from.id, { guideId, locale, field, expiresAt: Date.now() + EDIT_TIMEOUT_MS });
    await ctx.reply(
      field === "title"
        ? "Send the new title now. Format it with Telegram's formatting bar (bold/italic/etc.) — it will be saved exactly as sent."
        : "Send the next step now. Formatting is preserved exactly as you send it."
    );
  });

  bot.action("guide:edit:cancel", async (ctx) => {
    await ctx.answerCbQuery("Cancelled");
    if (ctx.from) pendingGuideEdits.delete(ctx.from.id);
  });

  bot.action(/^guide:preview:([a-z0-9_-]{1,31}):(en|hi-Latn|vi)$/, async (ctx) => {
    await ctx.answerCbQuery();
    if (!ownerOnly(ctx)) return;
    const [, guideId, locale] = ctx.match as unknown as [string, string, "en" | "hi-Latn" | "vi"];
    await sendGuidePreview(ctx, guideId, locale);
  });

  // Intercepts the owner's next text message ONLY when a tap-to-edit is pending;
  // otherwise calls next() so every other handler keeps working unchanged.
  bot.on("text", async (ctx, next) => {
    if (!ctx.from) return next();
    const pending = pendingGuideEdits.get(ctx.from.id);
    if (!pending) return next();
    if (Date.now() > pending.expiresAt) {
      pendingGuideEdits.delete(ctx.from.id);
      await ctx.reply("That edit expired after 5 minutes. Open /guide_editor again to retry.");
      return;
    }
    if (!ownerOnly(ctx)) return next();
    const captured = captureFormattedInput(ctx);
    if (!captured) return next();
    pendingGuideEdits.delete(ctx.from.id);

    const { data, error } = await db.from("dgbot_guides").select("title,steps").eq("id", pending.guideId).is("deleted_at", null).maybeSingle();
    if (error || !data) return ctx.reply("Guide not found — it may have been deleted mid-edit.");

    if (pending.field === "title") {
      const titles = { ...(data.title as Record<string, string>), [pending.locale]: captured.markdown };
      const { error: updateError } = await db.from("dgbot_guides").update({ title: titles, title_format: "MarkdownV2", updated_at: new Date().toISOString() }).eq("id", pending.guideId);
      if (updateError) return ctx.reply("Save failed. Nothing was changed.");
      await writeAudit("guide.title_edited", null, pending.guideId + ":" + pending.locale);
    } else {
      const steps = { ...(data.steps as Record<string, unknown>) };
      const existing = Array.isArray(steps[pending.locale]) ? (steps[pending.locale] as string[]) : [];
      steps[pending.locale] = [...existing, captured.markdown];
      const { error: updateError } = await db.from("dgbot_guides").update({ steps, steps_format: "MarkdownV2", updated_at: new Date().toISOString() }).eq("id", pending.guideId);
      if (updateError) return ctx.reply("Save failed. Nothing was changed.");
      await writeAudit("guide.step_added", null, pending.guideId + ":" + pending.locale);
    }

    await ctx.reply("✓ Saved — formatting preserved exactly as sent.", guideEditKeyboard(pending.guideId, pending.locale));
  });
}

async function sendGuidePreview(ctx: Context, guideId: string, locale: "en" | "hi-Latn" | "vi") {
  const { data, error } = await db.from("dgbot_guides").select("title,steps,title_format").eq("id", guideId).is("deleted_at", null).maybeSingle();
  if (error || !data) return ctx.reply("Guide not found.");
  const title = (data.title as Record<string, string>)[locale] ?? (data.title as Record<string, string>).en ?? guideId;
  const steps = (data.steps as Record<string, unknown>)[locale] as unknown;
  const body = Array.isArray(steps) ? steps.map((s, i) => (i + 1) + ". " + String(s)).join("\n") : "";
  const isMarkdown = data.title_format === "MarkdownV2";
  await ctx.reply(
    (title + (body ? "\n\n" + body : "")).slice(0, 4000),
    isMarkdown ? { parse_mode: "MarkdownV2" } : {}
  );
}

export function registerGuideAdmin(bot: Telegraf<Context>, ownerOnly: OwnerCheck, writeAudit: Audit) {
  bot.command("guide_list", async (ctx) => {
    if (!ownerOnly(ctx)) return ctx.reply("Access denied.");
    const {data,error}=await db.from("dgbot_guides").select("id,category,title,published,updated_at").is("deleted_at",null).order("updated_at",{ascending:false}).limit(50);
    if(error) return ctx.reply("Guide list unavailable.");
    if(!data?.length) return ctx.reply("No guides exist yet.");
    await ctx.reply(data.map(g=>"["+ (g.published?"published":"draft") +"] "+g.id+" | "+g.category+"\n"+String((g.title as Record<string,string>).en??g.id)).join("\n\n"));
  });
  bot.command("guide_preview", async (ctx) => {
    if (!ownerOnly(ctx)) return ctx.reply("Access denied.");
    const m=ctx.message.text.match(/^\/guide_preview(?:@\w+)?\s+([a-z0-9_-]{1,31})(?:\s+(en|hi-Latn|vi))?$/i);
    if(!m) return ctx.reply("Usage: /guide_preview <id> [en|hi-Latn|vi]");
    const locale=(m[2]??"en") as "en"|"hi-Latn"|"vi";
    const {data,error}=await db.from("dgbot_guides").select("title,steps,media,buttons,published").eq("id",m[1]!).is("deleted_at",null).maybeSingle();
    if(error||!data) return ctx.reply("Guide not found.");
    const title=data.title as Record<string,string>,steps=data.steps as Record<string,unknown>;
    const raw=steps[locale]??steps.en??[];
    const body=Array.isArray(raw)?raw.map((x,i)=>(i+1)+". "+String(x)).join("\n"):String(raw);
    const heading=title[locale]??title.en??m[1]!;
    const media=data.media as {type?:string;file_id?:string;caption?:string}|null;
    const buttons=Array.isArray(data.buttons)?data.buttons as Array<{text:string;url:string}>:[];
    const markup=buttons.length?{reply_markup:{inline_keyboard:buttons.map(b=>[{text:b.text,url:b.url}])}}:{};
    const caption=((media?.caption?media.caption+"\n\n":"")+heading+"\n\n"+body).slice(0,1024);
    await ctx.reply("Preview ("+(data.published?"published":"draft")+")");
    if(media?.file_id&&media.type==="photo") return ctx.replyWithPhoto(media.file_id,{caption,...markup});
    if(media?.file_id&&media.type==="video") return ctx.replyWithVideo(media.file_id,{caption,...markup});
    if(media?.file_id&&media.type==="document") return ctx.replyWithDocument(media.file_id,{caption,...markup});
    if(media?.file_id&&media.type==="animation") return ctx.replyWithAnimation(media.file_id,{caption,...markup});
    return ctx.reply((heading+"\n\n"+body).slice(0,4000),markup);
  });
  bot.command("guide_unpublish", async (ctx) => {
    if (!ownerOnly(ctx)) return ctx.reply("Access denied.");
    const id=ctx.message.text.split(/\s+/)[1];
    if(!id) return ctx.reply("Usage: /guide_unpublish <id>");
    const {data,error}=await db.from("dgbot_guides").update({published:false,updated_at:new Date().toISOString()}).eq("id",id).is("deleted_at",null).select("id").maybeSingle();
    if(error||!data) return ctx.reply("Guide not found or could not be unpublished.");
    await writeAudit("guide.unpublished",null,id);
    await ctx.reply("Guide "+id+" is now unpublished.");
  });
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
