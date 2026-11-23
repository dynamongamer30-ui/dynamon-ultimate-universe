import { Telegraf, Markup, type Context } from "telegraf";
import pino from "pino";
import { config } from "./config.js";
import { db } from "./supabase.js";
import { createOneTimeLinkToken } from "./security.js";

const log = pino({ level: config.LOG_LEVEL, redact: ["*.token", "*.password", "*.secret", "*.authorization"] });
const bot = new Telegraf(config.BOT_TOKEN);
const textLimit = 4000;
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
  const payload = language ? { telegram_id: telegramId, language, updated_at: new Date().toISOString() } : { telegram_id: telegramId, updated_at: new Date().toISOString() };
  const { error } = await db.from("bot_users").upsert(payload, { onConflict: "telegram_id" });
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
    await ctx.reply(`${messages.en.linkCreated}\n${url.toString()}`, { disable_web_page_preview: true });
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
  const lang = ctx.match[1] as Lang;
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
  const [, id, body] = match;
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
  const id = ctx.match[1];
  const { data, error } = await db.from("bot_guides").select("title,data").eq("id", id).eq("published", true).eq("deleted", false).maybeSingle();
  if (error || !data) return ctx.reply("Guide not found.");
  const value = data.data as Record<string, unknown>;
  const body = typeof value.content === "string" ? value.content : typeof value.body === "string" ? value.body : typeof value.description === "string" ? value.description : JSON.stringify(value, null, 2);
  await ctx.reply(`${data.title}\n\n${body.slice(0, textLimit)}`);
});

bot.command("help", async (ctx) => ctx.reply(messages.en.help));
bot.action("help:open", async (ctx) => { await ctx.answerCbQuery(); await ctx.reply(messages.en.help); });
bot.action("support:help", async (ctx) => { await ctx.answerCbQuery(); await ctx.reply(messages.en.support); });

bot.command("admin", async (ctx) => {
  if (!ownerOnly(ctx)) return ctx.reply("Access denied.");
  const [{ count: users, error: userError }, { count: openTickets, error: ticketError }] = await Promise.all([
    db.from("bot_users").select("*", { count: "exact", head: true }),
    db.from("bot_support_tickets").select("*", { count: "exact", head: true }).neq("status", "closed")
  ]);
  if (userError || ticketError) { log.error({ userError, ticketError }, "Owner dashboard query failed"); return ctx.reply("Dashboard is temporarily unavailable."); }
  await ctx.reply(`VEXTRO BOT Owner Dashboard\nRegistered users: ${users ?? 0}\nOpen tickets: ${openTickets ?? 0}\n\nOwner authorization is enforced by Telegram ID.`);
});

// Text replies are routed only to the sender's most recent active ticket; commands are never intercepted.
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
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
await bot.launch({ dropPendingUpdates: false });
log.info({ botUsername: config.BOT_PUBLIC_USERNAME ?? "not-configured" }, "VEXTRO BOT polling started");
