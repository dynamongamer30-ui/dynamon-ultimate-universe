import { Telegraf, Markup, type Context } from "telegraf";
import pino from "pino";
import { config } from "./config.js";
import { db } from "./supabase.js";
import { createOneTimeLinkToken } from "./security.js";
import { publishPost, startJobWorkers } from "./jobs.js";
import { createBackup, listBackups, restoreBackup, startBackupScheduler, verifyBackup } from "./backup.js";

const log = pino({ level: config.LOG_LEVEL, redact: ["*.token", "*.password", "*.secret", "*.authorization"] });
const bot = new Telegraf(config.BOT_TOKEN);
const textLimit = 4000;
const publishingPosts = new Set<string>();
type Lang = "en" | "hi" | "vi";

const messages: Record<Lang, { welcome: string; member: string; choose: string; unlinked: string; linked: string; linkCreated: string; help: string; support: string; ticketCreated: string; error: string }> = {
  en: { welcome: "Welcome to VEXTRO BOT.", member: "Join both the required channel and group, then press Verify.", choose: "Choose your language.", unlinked: "No website account is linked.", linked: "Your website account is linked.", linkCreated: "This one-time link expires in 10 minutes. Open it and sign in to your website account:", help: "Commands: /start, /language, /account, /link, /support Subject\nMessage, /guides, /help", support: "Use /support followed by a subject, then put your message on the next line. Reply to this bot to continue your latest open ticket.", ticketCreated: "Your support ticket has been created.", error: "Something went wrong. Please try again later." },
  hi: { welcome: "VEXTRO BOT mein aapka swagat hai.", member: "Pehle required channel aur group dono join karein, phir Verify dabayein.", choose: "Apni language chunein.", unlinked: "Koi website account linked nahi hai.", linked: "Aapka website account linked hai.", linkCreated: "Yeh link 10 minute mein expire hoga. Open karke website account mein sign in karein:", help: "Commands: /start, /language, /account, /link, /support, /guides, /help", support: "/support ke baad subject aur agali line mein message likhein. Latest open ticket ke liye bot ko reply karein.", ticketCreated: "Support ticket ban gaya hai.", error: "Kuch galat hua. Baad mein dobara try karein." },
  vi: { welcome: "Chào mừng bạn đến với VEXTRO BOT.", member: "Hãy tham gia cả kênh và nhóm bắt buộc, sau đó nhấn Verify.", choose: "Chọn ngôn ngữ của bạn.", unlinked: "Chưa liên kết tài khoản website.", linked: "Tài khoản website đã được liên kết.", linkCreated: "Liên kết hết hạn sau 10 phút. Mở liên kết và đăng nhập website:", help: "Lệnh: /start, /language, /account, /link, /guides, /help", support: "Dùng /support kèm tiêu đề và nội dung ở dòng tiếp theo.", ticketCreated: "Đã tạo phiếu hỗ trợ.", error: "Đã xảy ra lỗi. Vui lòng thử lại sau." }
};

function ownerOnly(ctx: Context): boolean {
  return ctx.from?.id === config.OWNER_TELEGRAM_ID;
}
async function saveUser(telegramId: number, language?: Lang): Promise<void> {
  let selectedLanguage = language;
  if (!selectedLanguage) {
    const existing = await db.from("bot_users").select("language").eq("telegram_id", telegramId).maybeSingle();
    if (existing.error) throw existing.error;
    selectedLanguage = existing.data?.language === "hi" || existing.data?.language === "vi" ? existing.data.language : "en";
  }
  const { error } = await db.from("bot_users").upsert({ telegram_id: telegramId, language: selectedLanguage, updated_at: new Date().toISOString() }, { onConflict: "telegram_id" });
  if (error) throw error;
}
async function getLanguage(telegramId: number): Promise<Lang> {
  const { data, error } = await db.from("bot_users").select("language").eq("telegram_id", telegramId).maybeSingle();
  if (error) throw error;
  return data?.language === "hi" || data?.language === "vi" ? data.language : "en";
}
async function isMember(ctx: Context): Promise<boolean> {
  if (!ctx.from) return false;
  const results = await Promise.all([config.REQUIRED_CHANNEL_ID, config.REQUIRED_GROUP_ID].map(async (chatId) => {
    try {
      const member = await ctx.telegram.getChatMember(chatId, ctx.from!.id);
      return ["creator", "administrator", "member"].includes(member.status) || (member.status === "restricted" && member.is_member);
    } catch (error) {
      log.warn({ chatId, err: error }, "Membership verification failed");
      return false;
    }
  }));
  return results.every(Boolean);
}
async function isBanned(telegramId: number): Promise<{ reason: string } | null> {
  const { data, error } = await db.from("dgbot_bans").select("reason").eq("telegram_id", telegramId).is("deleted_at", null).maybeSingle();
  if (error) throw error;
  return data;
}
async function writeAudit(action: string, targetId: number | null, reason: string): Promise<void> {
  const { error } = await db.from("dgbot_audit_log").insert({ action, actor_id: config.OWNER_TELEGRAM_ID, target_id: targetId, reason: reason.slice(0, 200) });
  if (error) log.error({ err: error, action, targetId }, "Owner audit event could not be saved");
}
async function accountStatus(telegramId: number) {
  const { data, error } = await db.from("bot_account_links").select("linked_at,unlink_eligible_at").eq("telegram_id", telegramId).is("unlinked_at", null).maybeSingle();
  if (error) throw error;
  return data;
}
async function createLink(ctx: Context, telegramId: number): Promise<void> {
  try {
    if (await accountStatus(telegramId)) {
      await ctx.reply("This Telegram account is already linked to a website account.");
      return;
    }
    const token = createOneTimeLinkToken();
    const { error } = await db.from("bot_link_requests").insert({ token_hash: token.hash, telegram_id: telegramId });
    if (error) throw error;
    const url = new URL("/telegram/link", config.WEBSITE_URL);
    url.searchParams.set("token", token.raw);
    await ctx.reply(`${messages.en.linkCreated}\n${url.toString()}`, { link_preview_options: { is_disabled: true } });
  } catch (error) {
    log.error({ err: error }, "Link request creation failed");
    await ctx.reply(messages.en.error);
  }
}
async function latestOpenTicket(telegramId: number) {
  const { data, error } = await db.from("bot_support_tickets").select("id,subject,status").eq("telegram_id", telegramId).in("status", ["open", "pending"]).order("updated_at", { ascending: false }).limit(1).maybeSingle();
  if (error) throw error;
  return data;
}
async function sendOwnerNotice(text: string): Promise<void> {
  try { await bot.telegram.sendMessage(config.OWNER_TELEGRAM_ID, text); }
  catch (error) { log.error({ err: error }, "Owner notification delivery failed"); }
}

bot.use(async (ctx, next) => {
  if (!ctx.from || ownerOnly(ctx)) return next();
  try {
    const ban = await isBanned(ctx.from.id);
    if (ban) return ctx.reply("This Telegram account is restricted. Contact the VEXTRO BOT Owner for a review.");
    return next();
  } catch (error) {
    log.error({ err: error, telegramId: ctx.from.id }, "Access restriction check failed");
    return ctx.reply("Access verification is temporarily unavailable. Please try again later.");
  }
});

bot.start(async (ctx) => {
  if (!ctx.from) return;
  try {
    await saveUser(ctx.from.id);
    const lang = await getLanguage(ctx.from.id);
    if (!(await isMember(ctx))) {
      await ctx.reply(messages[lang].member, Markup.inlineKeyboard([[Markup.button.callback("Verify membership", "membership:verify")]]));
      return;
    }
    await ctx.reply(messages[lang].welcome, Markup.inlineKeyboard([
      [Markup.button.callback("Account", "account:open"), Markup.button.callback("Language", "language:open")],
      [Markup.button.callback("Guides", "guides:open"), Markup.button.callback("Support", "support:help")],
      [Markup.button.callback("Help", "help:open")]
    ]));
  } catch (error) { log.error({ err: error }, "Start handler failed"); await ctx.reply(messages.en.error); }
});

bot.action("membership:verify", async (ctx) => {
  await ctx.answerCbQuery();
  if (!ctx.from) return;
  const lang = await getLanguage(ctx.from.id);
  if (await isMember(ctx)) {
    await ctx.editMessageText(messages[lang].welcome, Markup.inlineKeyboard([[Markup.button.callback("Account", "account:open"), Markup.button.callback("Guides", "guides:open")],[Markup.button.callback("Support", "support:help"),Markup.button.callback("Help","help:open")]]));
  } else await ctx.reply(messages[lang].member);
});

bot.command("language", async (ctx) => {
  await ctx.reply(messages.en.choose, Markup.inlineKeyboard([[Markup.button.callback("English", "language:set:en"), Markup.button.callback("Hindi", "language:set:hi"), Markup.button.callback("Vietnamese", "language:set:vi")]]));
});
bot.action("language:open", async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.reply(messages.en.choose, Markup.inlineKeyboard([[Markup.button.callback("English", "language:set:en"), Markup.button.callback("Hindi", "language:set:hi"), Markup.button.callback("Vietnamese", "language:set:vi")]]));
});
bot.action(/^language:set:(en|hi|vi)$/, async (ctx) => {
  if (!ctx.from) return;
  const lang = ctx.match[1]! as Lang;
  await saveUser(ctx.from.id, lang);
  await ctx.answerCbQuery("Language saved");
  await ctx.reply(messages[lang].welcome);
});

bot.action("account:open", async (ctx) => {
  await ctx.answerCbQuery();
  if (!ctx.from || !(await isMember(ctx))) return ctx.reply(messages.en.member);
  try {
    const lang = await getLanguage(ctx.from.id);
    const link = await accountStatus(ctx.from.id);
    const detail = link ? `\nLinked: ${new Date(link.linked_at).toLocaleString()}\nUnlink eligible: ${new Date(link.unlink_eligible_at).toLocaleString()}` : "";
    await ctx.reply(link ? messages[lang].linked + detail : messages[lang].unlinked, Markup.inlineKeyboard([[Markup.button.callback("Create website link", "account:link")]]));
  } catch (error) { log.error({ err: error }, "Account status failed"); await ctx.reply(messages.en.error); }
});
bot.action("account:link", async (ctx) => {
  await ctx.answerCbQuery();
  if (!ctx.from || !(await isMember(ctx))) return ctx.reply(messages.en.member);
  await createLink(ctx, ctx.from.id);
});
bot.command("link", async (ctx) => {
  if (!ctx.from || !(await isMember(ctx))) return ctx.reply(messages.en.member);
  await createLink(ctx, ctx.from.id);
});
bot.command("account", async (ctx) => {
  if (!ctx.from || !(await isMember(ctx))) return ctx.reply(messages.en.member);
  try { const status = await accountStatus(ctx.from.id); await ctx.reply(status ? messages.en.linked : messages.en.unlinked); }
  catch (error) { log.error({ err: error }, "Account command failed"); await ctx.reply(messages.en.error); }
});

bot.command("support", async (ctx) => {
  if (!ctx.from || !(await isMember(ctx))) return ctx.reply(messages.en.member);
  const payload = ctx.message.text.replace(/^\/support(?:@\w+)?\s*/i, "").trim();
  const split = payload.indexOf("\n");
  const subject = (split < 0 ? payload : payload.slice(0, split)).trim();
  const body = (split < 0 ? "" : payload.slice(split + 1)).trim();
  if (subject.length < 5 || subject.length > 120 || body.length < 1 || body.length > textLimit) return ctx.reply("Format: /support Subject (5–120 characters)\nDescribe your issue on the next line (up to 4000 characters).");
  try {
    const { data: ticket, error: ticketError } = await db.from("bot_support_tickets").insert({ telegram_id: ctx.from.id, category: "other", subject }).select("id").single();
    if (ticketError || !ticket) throw ticketError ?? new Error("Ticket was not created");
    const { error: messageError } = await db.from("bot_support_messages").insert({ ticket_id: ticket.id, sender_type: "user", sender_telegram_id: ctx.from.id, body });
    if (messageError) { await db.from("bot_support_tickets").delete().eq("id", ticket.id); throw messageError; }
    await ctx.reply(`${messages.en.ticketCreated}\nTicket: ${ticket.id}`);
    await sendOwnerNotice(`New VEXTRO support ticket\nID: ${ticket.id}\nFrom: ${ctx.from.id}\nSubject: ${subject}\nUse /ticket ${ticket.id} to view and /reply ${ticket.id} message to respond.`);
  } catch (error) { log.error({ err: error }, "Support ticket creation failed"); await ctx.reply(messages.en.error); }
});

bot.command("tickets", async (ctx) => {
  if (!ownerOnly(ctx)) return ctx.reply("Access denied.");
  const { data, error } = await db.from("bot_support_tickets").select("id,telegram_id,subject,status,priority,created_at").neq("status", "closed").order("created_at", { ascending: false }).limit(20);
  if (error) { log.error({ err: error }, "Ticket list failed"); return ctx.reply("Ticket list unavailable."); }
  if (!data?.length) return ctx.reply("No open support tickets.");
  await ctx.reply(data.map((t) => `[${t.status}/${t.priority}] ${t.id}\nUser: ${t.telegram_id}\n${t.subject}`).join("\n\n"));
});
bot.command("ticket", async (ctx) => {
  if (!ownerOnly(ctx)) return ctx.reply("Access denied.");
  const id = ctx.message.text.split(/\s+/)[1];
  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) return ctx.reply("Usage: /ticket <ticket-uuid>");
  const { data: ticket, error } = await db.from("bot_support_tickets").select("id,telegram_id,subject,status,priority,created_at").eq("id", id).maybeSingle();
  if (error || !ticket) return ctx.reply("Ticket not found.");
  const { data: rows, error: messageError } = await db.from("bot_support_messages").select("sender_type,body,created_at,internal_note").eq("ticket_id", id).order("created_at", { ascending: true }).limit(30);
  if (messageError) return ctx.reply("Ticket messages unavailable.");
  const history = (rows ?? []).filter((m) => !m.internal_note).map((m) => `${m.sender_type} [${new Date(m.created_at).toLocaleString()}]: ${m.body}`).join("\n\n");
  await ctx.reply(`Ticket ${ticket.id} | ${ticket.status} | ${ticket.priority}\nUser: ${ticket.telegram_id}\nSubject: ${ticket.subject}\n\n${history || "No messages"}\n\nReply: /reply ${ticket.id} your message\nClose: /close_ticket ${ticket.id}`);
});
bot.command("reply", async (ctx) => {
  if (!ownerOnly(ctx)) return ctx.reply("Access denied.");
  const match = ctx.message.text.match(/^\/reply(?:@\w+)?\s+([0-9a-f-]{36})\s+([\s\S]+)$/i);
  if (!match) return ctx.reply("Usage: /reply <ticket-uuid> <message>");
  const id = match[1]!;
  const body = match[2]!;
  if (body.trim().length < 1 || body.length > textLimit) return ctx.reply("Reply must be 1–4000 characters.");
  const { data: ticket, error } = await db.from("bot_support_tickets").select("telegram_id,status").eq("id", id).maybeSingle();
  if (error || !ticket) return ctx.reply("Ticket not found.");
  if (ticket.status === "closed") return ctx.reply("This ticket is closed.");
  const { error: insertError } = await db.from("bot_support_messages").insert({ ticket_id: id, sender_type: "staff", sender_telegram_id: config.OWNER_TELEGRAM_ID, body: body.trim() });
  if (insertError) { log.error({ err: insertError }, "Owner reply persistence failed"); return ctx.reply("Could not save the reply."); }
  const { error: updateError } = await db.from("bot_support_tickets").update({ status: "pending", updated_at: new Date().toISOString() }).eq("id", id);
  if (updateError) log.error({ err: updateError }, "Ticket status update failed");
  try { await bot.telegram.sendMessage(Number(ticket.telegram_id), `Support replied to ticket ${id}:\n\n${body.trim()}`); await ctx.reply("Reply saved and delivered."); }
  catch (error) { log.error({ err: error, ticketId: id }, "Support reply delivery failed"); await ctx.reply("Reply saved, but Telegram delivery failed. Check the user's chat and retry safely."); }
});
bot.command("close_ticket", async (ctx) => {
  if (!ownerOnly(ctx)) return ctx.reply("Access denied.");
  const id = ctx.message.text.split(/\s+/)[1];
  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) return ctx.reply("Usage: /close_ticket <ticket-uuid>");
  const { data: ticket, error } = await db.from("bot_support_tickets").update({ status: "closed", updated_at: new Date().toISOString() }).eq("id", id).select("telegram_id").maybeSingle();
  if (error || !ticket) return ctx.reply("Ticket not found or could not be closed.");
  try { await bot.telegram.sendMessage(Number(ticket.telegram_id), `Your support ticket ${id} has been closed. You can open a new ticket anytime with /support.`); } catch (sendError) { log.warn({ err: sendError, ticketId: id }, "Ticket close notification failed"); }
  await ctx.reply("Ticket closed.");
});

bot.command("posts", async (ctx) => {
  if (!ownerOnly(ctx)) return ctx.reply("Access denied.");
  const { data, error } = await db.from("dgbot_posts").select("id,title,state,updated_at").is("deleted_at", null).neq("state", "removed").order("updated_at", { ascending: false }).limit(20);
  if (error) { log.error({ err: error }, "Post list failed"); return ctx.reply("Post list unavailable."); }
  if (!data?.length) return ctx.reply("No posts yet. Create one with /post_draft Title\nBody.");
  await ctx.reply(data.map((p) => `[${p.state}] ${p.id}\n${p.title}`).join("\n\n"));
});
bot.command("post_draft", async (ctx) => {
  if (!ownerOnly(ctx)) return ctx.reply("Access denied.");
  const payload = ctx.message.text.replace(/^\/post_draft(?:@\w+)?\s*/i, "").trim();
  const split = payload.indexOf("\n");
  const title = (split < 0 ? payload : payload.slice(0, split)).trim();
  const body = (split < 0 ? "" : payload.slice(split + 1)).trim();
  if (title.length < 1 || title.length > 120 || body.length > 4096 || title.length + body.length + (body ? 2 : 0) > 4096) return ctx.reply("Usage: /post_draft Title\nBody. Title: 1–120 characters; total post: up to 4096 characters.");
  const { data, error } = await db.from("dgbot_posts").insert({ title, body, state: "draft" }).select("id").single();
  if (error || !data) { log.error({ err: error }, "Post draft creation failed"); return ctx.reply("Could not create the draft."); }
  await ctx.reply(`Draft created: ${data.id}\nPreview: /post_preview ${data.id}\nEdit: /post_edit ${data.id} Title\nBody`);
});
bot.command("post_media", async (ctx) => {
  if (!ownerOnly(ctx)) return ctx.reply("Access denied.");
  const match = ctx.message.text.match(/^\/post_media(?:@\w+)?\s+([0-9a-f-]{36})\s+(photo|video|document|animation)\s+(\S+)(?:\s+([\s\S]+))?$/i);
  if (!match) return ctx.reply("Usage: /post_media <post-uuid> <photo|video|document|animation> <telegram-file-id> [caption]");
  const [, id, type, fileId, caption = ""] = match;
  if (caption.length > 1024) return ctx.reply("Caption must be 1024 characters or fewer.");
  const { data, error } = await db.from("dgbot_posts").update({ media: { type: type!.toLowerCase(), file_id: fileId, caption }, updated_at: new Date().toISOString() })
    .eq("id", id!).eq("state", "draft").is("deleted_at", null).select("id").maybeSingle();
  if (error || !data) return ctx.reply("Draft not found or media could not be saved.");
  await ctx.reply("Media saved to draft.");
});
bot.command("post_buttons", async (ctx) => {
  if (!ownerOnly(ctx)) return ctx.reply("Access denied.");
  const match = ctx.message.text.match(/^\/post_buttons(?:@\w+)?\s+([0-9a-f-]{36})\s+([\s\S]+)$/i);
  if (!match) return ctx.reply("Usage: /post_buttons <post-uuid> then one Label|https://url per line (maximum 8).");
  const id = match[1]!;
  const lines = match[2]!.split("\n").map((line) => line.trim()).filter(Boolean);
  if (lines.length > 8) return ctx.reply("Maximum 8 buttons are supported.");
  const buttons: Array<{ text: string; url: string }> = [];
  for (const line of lines) {
    const split = line.indexOf("|");
    if (split < 1) return ctx.reply("Each line must use Label|https://url");
    const label = line.slice(0, split).trim();
    let url: URL;
    try { url = new URL(line.slice(split + 1).trim()); } catch { return ctx.reply("Every button needs a valid HTTPS URL."); }
    if (!label || label.length > 40 || url.protocol !== "https:") return ctx.reply("Button labels must be 1–40 characters and URLs must use HTTPS.");
    buttons.push({ text: label, url: url.toString() });
  }
  const { data, error } = await db.from("dgbot_posts").update({ buttons, updated_at: new Date().toISOString() })
    .eq("id", id).eq("state", "draft").is("deleted_at", null).select("id").maybeSingle();
  if (error || !data) return ctx.reply("Draft not found or buttons could not be saved.");
  await ctx.reply("Buttons saved to draft.");
});
bot.command("post_preview", async (ctx) => {
  if (!ownerOnly(ctx)) return ctx.reply("Access denied.");
  const id = ctx.message.text.split(/\s+/)[1];
  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) return ctx.reply("Usage: /post_preview <post-uuid>");
  const { data, error } = await db.from("dgbot_posts").select("title,body,state,media,buttons").eq("id", id).is("deleted_at", null).maybeSingle();
  if (error || !data) return ctx.reply("Post not found.");
  await ctx.reply(`[${data.state}] ${data.title}\n\n${data.body || "(No body)"}`.slice(0, 4096));
});
bot.command("post_edit", async (ctx) => {
  if (!ownerOnly(ctx)) return ctx.reply("Access denied.");
  const match = ctx.message.text.match(/^\/post_edit(?:@\w+)?\s+([0-9a-f-]{36})\s+([\s\S]+)$/i);
  if (!match) return ctx.reply("Usage: /post_edit <post-uuid> Title\nBody");
  const id = match[1]!;
  const payload = match[2]!;
  const split = payload.indexOf("\n");
  const title = (split < 0 ? payload : payload.slice(0, split)).trim();
  const body = (split < 0 ? "" : payload.slice(split + 1)).trim();
  if (title.length < 1 || title.length > 120 || body.length > 4096 || title.length + body.length + (body ? 2 : 0) > 4096) return ctx.reply("Title must be 1–120 characters and the full post must fit Telegram's 4096-character limit.");
  const { data, error } = await db.from("dgbot_posts").update({ title, body, updated_at: new Date().toISOString() }).eq("id", id).eq("state", "draft").is("deleted_at", null).select("id").maybeSingle();
  if (error || !data) return ctx.reply("Draft not found or no longer editable.");
  await ctx.reply(`Draft updated: ${id}`);
});
bot.command("post_publish", async (ctx) => {
  if (!ownerOnly(ctx)) return ctx.reply("Access denied.");
  const channelId = config.PUBLISH_CHANNEL_ID;
  if (!channelId) return ctx.reply("Publishing is disabled. Set PUBLISH_CHANNEL_ID in the host environment first.");
  const id = ctx.message.text.split(/\s+/)[1];
  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) return ctx.reply("Usage: /post_publish <post-uuid>");
  if (publishingPosts.has(id)) return ctx.reply("This post is already being published.");
  publishingPosts.add(id);
  try {
    const { data, error } = await db.from("dgbot_posts").select("title,body,state,channel_message_id,media,buttons").eq("id", id).is("deleted_at", null).maybeSingle();
    if (error || !data) return ctx.reply("Post not found.");
    if (data.state === "published" && data.channel_message_id) return ctx.reply(`Already published. Telegram message ID: ${data.channel_message_id}`);
    if (data.state !== "draft") return ctx.reply("Only draft posts can be published.");
    const caption = data.body ? `${data.title}\n\n${data.body}` : data.title;
    const media = data.media as { type?: string; file_id?: string; caption?: string } | null;
    const buttons = Array.isArray(data.buttons) ? data.buttons as Array<{ text: string; url: string }> : [];
    const reply_markup = buttons.length ? { inline_keyboard: buttons.map((button) => [{ text: button.text, url: button.url }]) } : undefined;
    const mediaOptions = reply_markup ? { reply_markup } : {};
    let message;
    if (media?.file_id && media.type === "photo") message = await bot.telegram.sendPhoto(channelId, media.file_id, { caption: media.caption || caption, ...mediaOptions });
    else if (media?.file_id && media.type === "video") message = await bot.telegram.sendVideo(channelId, media.file_id, { caption: media.caption || caption, ...mediaOptions });
    else if (media?.file_id && media.type === "document") message = await bot.telegram.sendDocument(channelId, media.file_id, { caption: media.caption || caption, ...mediaOptions });
    else if (media?.file_id && media.type === "animation") message = await bot.telegram.sendAnimation(channelId, media.file_id, { caption: media.caption || caption, ...mediaOptions });
    else message = await bot.telegram.sendMessage(channelId, caption, reply_markup ? { reply_markup } : {});
    const { error: updateError } = await db.from("dgbot_posts").update({ state: "published", channel_message_id: message.message_id, updated_at: new Date().toISOString() }).eq("id", id).eq("state", "draft");
    if (updateError) {
      log.error({ err: updateError, postId: id, telegramMessageId: message.message_id }, "Published post could not be recorded");
      return ctx.reply(`Telegram accepted the post (message ${message.message_id}), but the database update failed. Do not retry until you verify the channel to avoid duplicate posting.`);
    }
    await ctx.reply(`Published to ${channelId}. Telegram message ID: ${message.message_id}`);
  } catch (error) {
    log.error({ err: error, postId: id }, "Post publishing failed");
    await ctx.reply("Publishing failed. Check channel permissions and try again.");
  } finally { publishingPosts.delete(id); }
});
bot.command("post_remove", async (ctx) => {
  if (!ownerOnly(ctx)) return ctx.reply("Access denied.");
  const id = ctx.message.text.split(/\s+/)[1];
  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) return ctx.reply("Usage: /post_remove <post-uuid>");
  const { data, error } = await db.from("dgbot_posts").select("state,channel_message_id").eq("id", id).is("deleted_at", null).maybeSingle();
  if (error || !data) return ctx.reply("Post not found.");
  if (data.state === "published") {
    const channelId = config.PUBLISH_CHANNEL_ID;
    if (!channelId || !data.channel_message_id) return ctx.reply("Cannot remove the Telegram post: publishing channel or message ID is missing.");
    try { await bot.telegram.deleteMessage(channelId, Number(data.channel_message_id)); }
    catch (sendError) { log.error({ err: sendError, postId: id }, "Published Telegram post removal failed"); return ctx.reply("Telegram could not remove the published post. Database state was not changed."); }
  }
  const { error: updateError } = await db.from("dgbot_posts").update({ state: "removed", deleted_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", id);
  if (updateError) { log.error({ err: updateError, postId: id }, "Post removal persistence failed"); return ctx.reply("Post was removed from Telegram if published, but the database update failed. Verify before retrying."); }
  await ctx.reply("Post marked as removed.");
});

bot.command("broadcast_draft", async (ctx) => {
  if (!ownerOnly(ctx)) return ctx.reply("Access denied.");
  const body = ctx.message.text.replace(/^\/broadcast_draft(?:@\w+)?\s*/i, "").trim();
  if (!body || body.length > 4000) return ctx.reply("Usage: /broadcast_draft your message (1–4000 characters).");
  const { data, error } = await db.from("vextro_broadcast_jobs").insert({ created_by: ctx.from.id, body, status: "draft" }).select("id").single();
  if (error || !data) return ctx.reply("Could not create broadcast draft.");
  await ctx.reply(`Broadcast draft ${data.id}\nPreview: /broadcast_preview ${data.id}\nOptional schedule: /broadcast_schedule ${data.id} 2026-12-01T18:00:00+05:30\nConfirm delivery: /broadcast_confirm ${data.id}`);
});
bot.command("broadcast_preview", async (ctx) => {
  if (!ownerOnly(ctx)) return ctx.reply("Access denied.");
  const id = ctx.message.text.split(/\s+/)[1];
  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) return ctx.reply("Usage: /broadcast_preview <uuid>");
  const { data, error } = await db.from("vextro_broadcast_jobs").select("body,status,scheduled_at,total_count").eq("id", id).maybeSingle();
  if (error || !data) return ctx.reply("Broadcast not found.");
  await ctx.reply(`Preview [${data.status}]\nRecipients: ${data.total_count}\nScheduled: ${data.scheduled_at ? new Date(data.scheduled_at).toLocaleString() : "immediately after confirmation"}\n\n${data.body}`);
});
bot.command("broadcast_schedule", async (ctx) => {
  if (!ownerOnly(ctx)) return ctx.reply("Access denied.");
  const match = ctx.message.text.match(/^\/broadcast_schedule(?:@\w+)?\s+([0-9a-f-]{36})\s+(\S+)$/i);
  if (!match) return ctx.reply("Usage: /broadcast_schedule <uuid> <ISO-8601-with-timezone>");
  const id = match[1]!, at = new Date(match[2]!);
  if (!Number.isFinite(at.getTime()) || at.getTime() < Date.now() + 60_000) return ctx.reply("Choose a valid future time at least one minute from now, including timezone offset.");
  const { data, error } = await db.from("vextro_broadcast_jobs").update({ scheduled_at: at.toISOString(), updated_at: new Date().toISOString() }).eq("id", id).eq("status", "draft").select("id").maybeSingle();
  if (error || !data) return ctx.reply("Draft not found or schedule could not be saved.");
  await ctx.reply(`Scheduled for ${at.toISOString()}. It will not send until you explicitly run /broadcast_confirm ${id}.`);
});
bot.command("broadcast_confirm", async (ctx) => {
  if (!ownerOnly(ctx)) return ctx.reply("Access denied.");
  const id = ctx.message.text.split(/\s+/)[1];
  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) return ctx.reply("Usage: /broadcast_confirm <uuid>");
  const { data: job, error } = await db.from("vextro_broadcast_jobs").select("id,status,scheduled_at").eq("id", id).maybeSingle();
  if (error || !job) return ctx.reply("Broadcast not found.");
  if (job.status !== "draft") return ctx.reply(`Broadcast is already ${job.status}.`);
  const recipients: Array<{job_id:string;telegram_id:number}> = [];
  for (let from=0; ; from+=1000) {
    const { data, error: usersError } = await db.from("bot_users").select("telegram_id").order("telegram_id").range(from, from+999);
    if (usersError) return ctx.reply("Could not load recipient list; broadcast was not queued.");
    for (const user of data ?? []) recipients.push({ job_id:id, telegram_id:Number(user.telegram_id) });
    if (!data || data.length < 1000) break;
  }
  if (!recipients.length) return ctx.reply("No registered recipients. Broadcast remains a draft.");
  for (let i=0; i<recipients.length; i+=500) {
    const { error: insertError } = await db.from("vextro_broadcast_recipients").upsert(recipients.slice(i,i+500), { onConflict:"job_id,telegram_id", ignoreDuplicates:true });
    if (insertError) return ctx.reply("Recipient queue preparation failed. No delivery was started; inspect this draft before retrying.");
  }
  const { error: updateError } = await db.from("vextro_broadcast_jobs").update({
    status:"queued", confirmed_at:new Date().toISOString(), total_count:recipients.length, updated_at:new Date().toISOString()
  }).eq("id",id).eq("status","draft");
  if (updateError) return ctx.reply("Could not activate the queue. No messages have been sent.");
  await writeAudit("broadcast.confirmed", null, `Broadcast ${id} confirmed for ${recipients.length} users`);
  await ctx.reply(`Broadcast confirmed. ${recipients.length} recipients queued. Delivery will begin at ${job.scheduled_at ? new Date(job.scheduled_at).toLocaleString() : "the next worker cycle"}.`);
});
bot.command("broadcast_pause", async (ctx) => {
  if (!ownerOnly(ctx)) return ctx.reply("Access denied.");
  const id=ctx.message.text.split(/\s+/)[1];
  if (!id) return ctx.reply("Usage: /broadcast_pause <uuid>");
  const { data,error }=await db.from("vextro_broadcast_jobs").update({status:"paused",updated_at:new Date().toISOString()}).eq("id",id).in("status",["queued","running"]).select("id").maybeSingle();
  if(error||!data) return ctx.reply("Active broadcast not found.");
  await ctx.reply("Broadcast paused. In-flight Telegram sends may finish.");
});
bot.command("broadcast_resume", async (ctx) => {
  if (!ownerOnly(ctx)) return ctx.reply("Access denied.");
  const id=ctx.message.text.split(/\s+/)[1];
  if (!id) return ctx.reply("Usage: /broadcast_resume <uuid>");
  const { data,error }=await db.from("vextro_broadcast_jobs").update({status:"running",updated_at:new Date().toISOString()}).eq("id",id).eq("status","paused").select("id").maybeSingle();
  if(error||!data) return ctx.reply("Paused broadcast not found.");
  await ctx.reply("Broadcast resumed.");
});
bot.command("broadcast_cancel", async (ctx) => {
  if (!ownerOnly(ctx)) return ctx.reply("Access denied.");
  const id=ctx.message.text.split(/\s+/)[1];
  if (!id) return ctx.reply("Usage: /broadcast_cancel <uuid>");
  const { data,error }=await db.from("vextro_broadcast_jobs").update({status:"cancelled",updated_at:new Date().toISOString()}).eq("id",id).in("status",["draft","queued","running","paused"]).select("id").maybeSingle();
  if(error||!data) return ctx.reply("Cancellable broadcast not found.");
  await ctx.reply("Broadcast cancelled. Messages already delivered cannot be recalled.");
});
bot.command("broadcast_status", async (ctx) => {
  if (!ownerOnly(ctx)) return ctx.reply("Access denied.");
  const id=ctx.message.text.split(/\s+/)[1];
  if (!id) return ctx.reply("Usage: /broadcast_status <uuid>");
  const [{data:job,error},{data:counts,count,error:countError}]=await Promise.all([
    db.from("vextro_broadcast_jobs").select("status,total_count,scheduled_at,created_at").eq("id",id).maybeSingle(),
    db.from("vextro_broadcast_recipients").select("status",{count:"exact"}).eq("job_id",id)
  ]);
  if(error||countError||!job) return ctx.reply("Broadcast status unavailable.");
  const [{count:sent},{count:failed},{count:pending}]=await Promise.all([
    db.from("vextro_broadcast_recipients").select("*",{count:"exact",head:true}).eq("job_id",id).eq("status","sent"),
    db.from("vextro_broadcast_recipients").select("*",{count:"exact",head:true}).eq("job_id",id).eq("status","failed"),
    db.from("vextro_broadcast_recipients").select("*",{count:"exact",head:true}).eq("job_id",id).in("status",["pending","sending"])
  ]);
  await ctx.reply(`Broadcast ${id}\nStatus: ${job.status}\nTotal: ${count??0}\nSent: ${sent??0}\nFailed/retrying: ${failed??0}\nPending: ${pending??0}\nScheduled: ${job.scheduled_at?new Date(job.scheduled_at).toLocaleString():"immediate"}`);
});
bot.command("post_schedule", async (ctx) => {
  if (!ownerOnly(ctx)) return ctx.reply("Access denied.");
  const match=ctx.message.text.match(/^\/post_schedule(?:@\w+)?\s+([0-9a-f-]{36})\s+(\S+)$/i);
  if(!match) return ctx.reply("Usage: /post_schedule <draft-post-uuid> <ISO-8601-with-timezone>");
  const at=new Date(match[2]!);
  if(!Number.isFinite(at.getTime())||at.getTime()<Date.now()+60_000) return ctx.reply("Schedule must be at least one minute in the future and include timezone.");
  const {data:post,error:postError}=await db.from("dgbot_posts").select("id,state").eq("id",match[1]!).is("deleted_at",null).maybeSingle();
  if(postError||!post||post.state!=="draft") return ctx.reply("Only an existing draft post can be scheduled.");
  const {data,error}=await db.from("vextro_scheduled_posts").insert({post_id:post.id,scheduled_at:at.toISOString(),created_by:ctx.from.id}).select("id").single();
  if(error||!data) return ctx.reply("Could not schedule this post.");
  await ctx.reply(`Post scheduled: ${data.id}\nTime: ${at.toISOString()}`);
});
bot.command("post_schedules", async (ctx) => {
  if(!ownerOnly(ctx)) return ctx.reply("Access denied.");
  const {data,error}=await db.from("vextro_scheduled_posts").select("id,post_id,scheduled_at,status,last_error").order("scheduled_at",{ascending:true}).limit(20);
  if(error) return ctx.reply("Schedule list unavailable.");
  if(!data?.length) return ctx.reply("No scheduled posts.");
  await ctx.reply(data.map(x=>`${x.id} | ${x.status}\nPost: ${x.post_id}\n${new Date(x.scheduled_at).toLocaleString()}${x.last_error?"\n"+x.last_error:""}`).join("\n\n"));
});
bot.command("post_schedule_cancel", async (ctx) => {
  if(!ownerOnly(ctx)) return ctx.reply("Access denied.");
  const id=ctx.message.text.split(/\s+/)[1];
  if(!id) return ctx.reply("Usage: /post_schedule_cancel <schedule-uuid>");
  const {data,error}=await db.from("vextro_scheduled_posts").update({status:"cancelled",updated_at:new Date().toISOString()}).eq("id",id).eq("status","scheduled").select("id").maybeSingle();
  if(error||!data) return ctx.reply("Pending schedule not found.");
  await ctx.reply("Scheduled post cancelled.");
});

bot.command("guides", async (ctx) => {
  if (!ctx.from || !(await isMember(ctx))) return ctx.reply(messages.en.member);
  const { data, error } = await db.from("bot_guides").select("id,title,data").eq("published", true).eq("deleted", false).order("updated_at", { ascending: false }).limit(20);
  if (error) { log.error({ err: error }, "Guide query failed"); return ctx.reply(messages.en.error); }
  if (!data?.length) return ctx.reply("No published guides are available yet.");
  await ctx.reply("Published guides:\n" + data.map((g) => `• ${g.title} (/guide_${g.id})`).join("\n"));
});
bot.action("guides:open", async (ctx) => { await ctx.answerCbQuery(); await ctx.reply("Use /guides to browse published guides."); });
bot.hears(/^\/guide_([a-z0-9][a-z0-9-]{1,39})$/, async (ctx) => {
  if (!ctx.from || !(await isMember(ctx))) return ctx.reply(messages.en.member);
  const id = ctx.match[1]!;
  const { data, error } = await db.from("bot_guides").select("title,data").eq("id", id).eq("published", true).eq("deleted", false).maybeSingle();
  if (error || !data) return ctx.reply("Guide not found.");
  const value = data.data as Record<string, unknown>;
  const body = typeof value.content === "string" ? value.content : typeof value.body === "string" ? value.body : typeof value.description === "string" ? value.description : JSON.stringify(value, null, 2);
  await ctx.reply(`${data.title}\n\n${body.slice(0, textLimit)}`);
});

bot.command("help", async (ctx) => ctx.reply(messages.en.help));
bot.action("help:open", async (ctx) => { await ctx.answerCbQuery(); await ctx.reply(messages.en.help); });
bot.action("support:help", async (ctx) => { await ctx.answerCbQuery(); await ctx.reply(messages.en.support); });

bot.command("users", async (ctx) => {
  if (!ownerOnly(ctx)) return ctx.reply("Access denied.");
  const { data, error } = await db.from("bot_users").select("telegram_id,language,created_at,updated_at").order("updated_at", { ascending: false }).limit(20);
  if (error) return ctx.reply("User list unavailable.");
  if (!data?.length) return ctx.reply("No registered users.");
  await ctx.reply(data.map((user) => `${user.telegram_id} | ${user.language} | ${new Date(user.updated_at).toLocaleDateString()}`).join("\n"));
});
bot.command("user", async (ctx) => {
  if (!ownerOnly(ctx)) return ctx.reply("Access denied.");
  const id = Number(ctx.message.text.split(/\s+/)[1]);
  if (!Number.isSafeInteger(id) || id < 1) return ctx.reply("Usage: /user <telegram-id>");
  const [user, link, tickets, ban] = await Promise.all([
    db.from("bot_users").select("telegram_id,language,created_at,updated_at").eq("telegram_id", id).maybeSingle(),
    db.from("bot_account_links").select("linked_at,unlink_eligible_at").eq("telegram_id", id).is("unlinked_at", null).maybeSingle(),
    db.from("bot_support_tickets").select("*", { count: "exact", head: true }).eq("telegram_id", id),
    db.from("dgbot_bans").select("reason").eq("telegram_id", id).is("deleted_at", null).maybeSingle()
  ]);
  if (user.error || link.error || tickets.error || ban.error) return ctx.reply("User profile could not be loaded.");
  if (!user.data) return ctx.reply("User is not registered.");
  await ctx.reply(`User profile\nTelegram ID: ${id}\nLanguage: ${user.data.language}\nRegistered: ${new Date(user.data.created_at).toLocaleString()}\nLast active: ${new Date(user.data.updated_at).toLocaleString()}\nWebsite linked: ${link.data ? "yes" : "no"}\nSupport tickets: ${tickets.count ?? 0}\nRestricted: ${ban.data ? "yes — " + (ban.data.reason || "no reason") : "no"}`);
});
bot.command("ban_user", async (ctx) => {
  if (!ownerOnly(ctx)) return ctx.reply("Access denied.");
  const match = ctx.message.text.match(/^\/ban_user(?:@\w+)?\s+(\d+)\s+([\s\S]+)$/i);
  if (!match) return ctx.reply("Usage: /ban_user <telegram-id> <reason>");
  const id = Number(match[1]!);
  const reason = match[2]!.trim();
  if (!Number.isSafeInteger(id) || id < 1 || id === config.OWNER_TELEGRAM_ID) return ctx.reply("Invalid target Telegram ID.");
  if (!reason || reason.length > 200) return ctx.reply("Reason must be 1–200 characters.");
  const { error } = await db.from("dgbot_bans").upsert({ telegram_id: id, reason, created_at: new Date().toISOString(), deleted_at: null }, { onConflict: "telegram_id" });
  if (error) { log.error({ err: error, targetId: id }, "User restriction failed"); return ctx.reply("Could not restrict this user."); }
  await writeAudit("user.ban", id, reason);
  await ctx.reply(`User ${id} is now restricted. The restriction is reversible with /unban_user ${id}.`);
});
bot.command("unban_user", async (ctx) => {
  if (!ownerOnly(ctx)) return ctx.reply("Access denied.");
  const id = Number(ctx.message.text.split(/\s+/)[1]);
  if (!Number.isSafeInteger(id) || id < 1) return ctx.reply("Usage: /unban_user <telegram-id>");
  const { data, error } = await db.from("dgbot_bans").update({ deleted_at: new Date().toISOString() }).eq("telegram_id", id).is("deleted_at", null).select("telegram_id").maybeSingle();
  if (error || !data) return ctx.reply("No active restriction was found for that user.");
  await writeAudit("user.unban", id, "Owner lifted user restriction");
  await ctx.reply(`User ${id} restriction lifted.`);
});

bot.command("analytics", async (ctx) => {
  if (!ownerOnly(ctx)) return ctx.reply("Access denied.");
  const [users, links, tickets, posts, backups] = await Promise.all([
    db.from("bot_users").select("*", { count: "exact", head: true }),
    db.from("bot_account_links").select("*", { count: "exact", head: true }).is("unlinked_at", null),
    db.from("bot_support_tickets").select("*", { count: "exact", head: true }).neq("status", "closed"),
    db.from("dgbot_posts").select("*", { count: "exact", head: true }).eq("state", "published").is("deleted_at", null),
    db.from("dgbot_backup_runs").select("*", { count: "exact", head: true }).eq("status", "failed")
  ]);
  const errors = [users.error, links.error, tickets.error, posts.error, backups.error].filter(Boolean);
  if (errors.length) { log.error({ errors }, "Analytics query failed"); return ctx.reply("Analytics are temporarily unavailable."); }
  await ctx.reply(`VEXTRO BOT Analytics\nRegistered users: ${users.count ?? 0}\nLinked accounts: ${links.count ?? 0}\nOpen support tickets: ${tickets.count ?? 0}\nPublished channel posts: ${posts.count ?? 0}\nRecorded backup failures: ${backups.count ?? 0}`);
});
bot.command("backup_create", async (ctx) => {
  if(!ownerOnly(ctx)) return ctx.reply("Access denied.");
  try {
    const backup=await createBackup(ctx.from.id);
    await writeAudit("backup.created",null,`Encrypted backup ${backup.id} verified`);
    await ctx.reply(`Backup created and verified.\nID: ${backup.id}\nBytes: ${backup.bytes}\nCreated: ${new Date(backup.created_at).toLocaleString()}`);
  } catch(error) {
    log.error({err:error},"Manual backup failed");
    await ctx.reply(`Backup failed: ${error instanceof Error?error.message:"unknown error"}`);
  }
});
bot.command("backup_list", async (ctx) => {
  if(!ownerOnly(ctx)) return ctx.reply("Access denied.");
  try {
    const items=await listBackups();
    if(!items.length) return ctx.reply("No encrypted backups found.");
    await ctx.reply(items.map(x=>`${x.id}\n${new Date(x.created_at).toLocaleString()} | ${x.bytes} bytes | ${x.verified_at?"verified":"not verified"}`).join("\n\n"));
  } catch(error) { log.error({err:error},"Backup list failed"); await ctx.reply("Backup list unavailable."); }
});
bot.command("backup_verify", async (ctx) => {
  if(!ownerOnly(ctx)) return ctx.reply("Access denied.");
  const id=ctx.message.text.split(/\\s+/)[1];
  if(!id) return ctx.reply("Usage: /backup_verify <backup-uuid>");
  const result=await verifyBackup(id);
  await ctx.reply(result.valid?`Backup ${id} integrity and decryption verified.`:`Verification failed: ${result.error}`);
});
bot.command("backup_restore_confirm", async (ctx) => {
  if(!ownerOnly(ctx)) return ctx.reply("Access denied.");
  const id=ctx.message.text.split(/\\s+/)[1];
  if(!id) return ctx.reply("Usage: /backup_restore_confirm <backup-uuid>");
  try {
    await ctx.reply("Restore started. A fresh safety backup will be created first. Existing rows are upserted; unrelated newer rows are not deleted.");
    const restored=await restoreBackup(id,ctx.from.id);
    await writeAudit("backup.restored",null,`Restored backup ${id}; rows: ${JSON.stringify(restored).slice(0,140)}`);
    await ctx.reply("Restore completed. Row counts by table:\n"+Object.entries(restored).map(([name,count])=>`${name}: ${count}`).join("\n"));
  } catch(error) {
    log.error({err:error,backupId:id},"Backup restore failed");
    await ctx.reply(`Restore failed: ${error instanceof Error?error.message:"unknown error"}`);
  }
});
bot.command("backup_status", async (ctx) => {
  if (!ownerOnly(ctx)) return ctx.reply("Access denied.");
  const [{ count: failed, error: countError }, { data: latest, error: latestError }] = await Promise.all([
    db.from("dgbot_backup_runs").select("*", { count: "exact", head: true }).eq("status", "failed"),
    db.from("dgbot_backup_runs").select("status,trigger,started_at,finished_at,parts,bytes,error_code").order("created_at", { ascending: false }).limit(1).maybeSingle()
  ]);
  if (countError || latestError) return ctx.reply("Backup status unavailable.");
  if (!latest) return ctx.reply("No backup run records exist.");
  await ctx.reply(`Backup status\nLatest: ${latest.status} (${latest.trigger})\nStarted: ${new Date(latest.started_at).toLocaleString()}\nFinished: ${latest.finished_at ? new Date(latest.finished_at).toLocaleString() : "not finished"}\nParts: ${latest.parts ?? "—"}\nBytes: ${latest.bytes ?? "—"}\nError: ${latest.error_code ?? "none"}\nRecorded failures: ${failed ?? 0}\n\nThis command is read-only. It does not start or repair backups.`);
});
bot.command("backup_runs", async (ctx) => {
  if (!ownerOnly(ctx)) return ctx.reply("Access denied.");
  const { data, error } = await db.from("dgbot_backup_runs").select("id,status,trigger,started_at,finished_at,parts,bytes,error_code").order("created_at", { ascending: false }).limit(10);
  if (error) return ctx.reply("Backup history unavailable.");
  if (!data?.length) return ctx.reply("No backup history.");
  await ctx.reply(data.map((run) => `#${run.id} ${run.status}/${run.trigger}\n${new Date(run.started_at).toLocaleString()} | ${run.error_code ?? "no error"}`).join("\n\n"));
});
bot.command("audit_recent", async (ctx) => {
  if (!ownerOnly(ctx)) return ctx.reply("Access denied.");
  const { data, error } = await db.from("dgbot_audit_log").select("action,actor_id,target_id,reason,created_at").order("created_at", { ascending: false }).limit(10);
  if (error) return ctx.reply("Audit history unavailable.");
  if (!data?.length) return ctx.reply("No audit events recorded.");
  await ctx.reply(data.map((event) => `${event.action} | actor ${event.actor_id} | ${event.reason}\n${new Date(event.created_at).toLocaleString()}`).join("\n\n"));
});
bot.command("moderation_rules", async (ctx) => {
  if (!ownerOnly(ctx)) return ctx.reply("Access denied.");
  const { data, error } = await db.from("dgbot_moderation_rules").select("id,kind,value,created_at").is("deleted_at", null).order("created_at", { ascending: false }).limit(30);
  if (error) return ctx.reply("Moderation rules unavailable.");
  if (!data?.length) return ctx.reply("No active moderation rules.");
  await ctx.reply(data.map((rule) => `#${rule.id} [${rule.kind}] ${rule.value}`).join("\n"));
});
bot.command("moderation_add", async (ctx) => {
  if (!ownerOnly(ctx)) return ctx.reply("Access denied.");
  const match = ctx.message.text.match(/^\/moderation_add(?:@\w+)?\s+(blocked_host|blocked_phrase)\s+([\s\S]+)$/i);
  if (!match) return ctx.reply("Usage: /moderation_add blocked_host|blocked_phrase value");
  const kind = match[1]!;
  const value = match[2]!.trim();
  if (!value || value.length > 200) return ctx.reply("Rule value must be 1–200 characters.");
  if (kind === "blocked_host" && !/^[a-z0-9.-]{1,253}$/i.test(value)) return ctx.reply("Blocked host must be a hostname, without a URL or path.");
  const { data, error } = await db.from("dgbot_moderation_rules").insert({ kind, value }).select("id").single();
  if (error || !data) { log.error({ err: error }, "Moderation rule creation failed"); return ctx.reply("Could not add the rule."); }
  await ctx.reply(`Moderation rule added: #${data.id}. Note: rule enforcement in incoming group messages is not enabled in this runtime yet.`);
});
bot.command("moderation_remove", async (ctx) => {
  if (!ownerOnly(ctx)) return ctx.reply("Access denied.");
  const id = Number(ctx.message.text.split(/\s+/)[1]);
  if (!Number.isSafeInteger(id) || id < 1) return ctx.reply("Usage: /moderation_remove <rule-id>");
  const { data, error } = await db.from("dgbot_moderation_rules").update({ deleted_at: new Date().toISOString() }).eq("id", id).is("deleted_at", null).select("id").maybeSingle();
  if (error || !data) return ctx.reply("Active rule not found.");
  await ctx.reply(`Moderation rule #${id} removed.`);
});

bot.command("admin", async (ctx) => {
  if (!ownerOnly(ctx)) return ctx.reply("Access denied.");
  const [{ count: users, error: userError }, { count: openTickets, error: ticketError }] = await Promise.all([
    db.from("bot_users").select("*", { count: "exact", head: true }),
    db.from("bot_support_tickets").select("*", { count: "exact", head: true }).neq("status", "closed")
  ]);
  if (userError || ticketError) { log.error({ userError, ticketError }, "Owner dashboard query failed"); return ctx.reply("Dashboard is temporarily unavailable."); }
  await ctx.reply(`VEXTRO BOT Owner Dashboard\nRegistered users: ${users ?? 0}\nOpen tickets: ${openTickets ?? 0}\n\nCommands: /users, /user, /ban_user, /unban_user, /tickets, /ticket, /reply, /close_ticket, /posts, /post_draft, /post_media, /post_buttons, /post_preview, /post_edit, /post_publish, /post_remove, /broadcast_draft, /broadcast_preview, /broadcast_schedule, /broadcast_confirm, /broadcast_pause, /broadcast_resume, /broadcast_cancel, /broadcast_status, /post_schedule, /post_schedules, /post_schedule_cancel, /analytics, /backup_create, /backup_list, /backup_verify, /backup_restore_confirm, /backup_status, /backup_runs, /audit_recent, /moderation_rules, /moderation_add, /moderation_remove.`);
});

// Text replies are routed only to the sender's most recent active ticket; commands are never intercepted.

bot.on("text", async (ctx, next) => {
  if (ctx.chat.type === "private" || String(ctx.chat.id) !== config.REQUIRED_GROUP_ID || !ctx.from || ownerOnly(ctx)) return next();
  try {
    const { data: rules, error } = await db.from("dgbot_moderation_rules").select("kind,value").is("deleted_at", null).limit(250);
    if (error) throw error;
    const body = ctx.message.text.toLocaleLowerCase();
    const hosts = [...ctx.message.text.matchAll(/https?:\/\/[^\s<>()]+/gi)].map((m) => {
      try { return new URL(m[0]).hostname.toLowerCase().replace(/^www\./, ""); } catch { return ""; }
    }).filter(Boolean);
    const matched = (rules ?? []).find((rule) => {
      const value = String(rule.value).toLocaleLowerCase();
      return rule.kind === "blocked_phrase" ? body.includes(value)
        : rule.kind === "blocked_host" ? hosts.some((host) => host === value || host.endsWith("." + value)) : false;
    });
    if (!matched) return next();
    try { await ctx.deleteMessage(); } catch (deleteError) { log.warn({ err: deleteError }, "Moderation delete failed"); }
    try { await ctx.reply("Your message was removed because it matched a group moderation rule."); } catch {}
    await writeAudit("moderation.message_removed", ctx.from.id, String(matched.kind) + ": " + String(matched.value).slice(0, 150));
  } catch (error) {
    log.error({ err: error }, "Group moderation check failed; message was not removed");
    return next();
  }
});

bot.on("text", async (ctx, next) => {
  if (ctx.message.text.startsWith("/")) return next();
  if (!ctx.from || ownerOnly(ctx)) return;
  try {
    if (!(await isMember(ctx))) return;
    const ticket = await latestOpenTicket(ctx.from.id);
    if (!ticket) return;
    const body = ctx.message.text.trim();
    if (!body || body.length > textLimit) return ctx.reply("Your reply must be 1–4000 characters.");
    const { error } = await db.from("bot_support_messages").insert({ ticket_id: ticket.id, sender_type: "user", sender_telegram_id: ctx.from.id, body });
    if (error) throw error;
    await db.from("bot_support_tickets").update({ status: "open", updated_at: new Date().toISOString() }).eq("id", ticket.id);
    await ctx.reply(`Added to support ticket ${ticket.id}.`);
    await sendOwnerNotice(`New message on ticket ${ticket.id} from ${ctx.from.id}:\n${body.slice(0, 1500)}\nView: /ticket ${ticket.id}`);
  } catch (error) { log.error({ err: error }, "Support follow-up failed"); await ctx.reply(messages.en.error); }
});

bot.catch((error, ctx) => { log.error({ err: error, updateId: ctx.update.update_id }, "Telegram update failed"); });
const stopWorkers = startJobWorkers(bot, config.PUBLISH_CHANNEL_ID);
const stopBackups = config.BACKUP_PASSPHRASE ? startBackupScheduler(config.OWNER_TELEGRAM_ID, config.BACKUP_INTERVAL_HOURS) : () => {};
process.once("SIGINT", () => { stopWorkers(); stopBackups(); });
process.once("SIGTERM", () => { stopWorkers(); stopBackups(); });
await bot.launch({ dropPendingUpdates: false });
log.info({ botUsername: config.BOT_PUBLIC_USERNAME ?? "not-configured" }, "VEXTRO BOT polling started");
