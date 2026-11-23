import { randomBytes, createHash } from "node:crypto";
import { Telegraf, Markup, type Context } from "telegraf";
import pino from "pino";
import { config } from "./config.js";
import { db } from "./supabase.js";\nimport { createOneTimeLinkToken } from "./security.js";

const log = pino({ level: config.LOG_LEVEL, redact: ["*.token", "*.password", "*.secret", "*.authorization"] });
const bot = new Telegraf(config.BOT_TOKEN);
const textLimit = 4000;

type Lang = "en" | "hi" | "vi";
const messages: Record<Lang, { welcome: string; member: string; choose: string; account: string; unlinked: string; linked: string; link: string; linkCreated: string; help: string; support: string; ticketCreated: string; error: string }> = {
  en: { welcome: "Welcome to VEXTRO BOT.", member: "Join both the required channel and group, then press Verify.", choose: "Choose your language.", account: "Your account", unlinked: "No website account is linked.", linked: "Your website account is linked.", link: "Create a secure one-time website link", linkCreated: "This one-time link expires in 10 minutes. Open it and sign in to your website account:", help: "Commands: /start, /language, /account, /link, /support, /help", support: "Use /support followed by a subject and message.", ticketCreated: "Your support ticket has been created.", error: "Something went wrong. Please try again later." },
  hi: { welcome: "VEXTRO BOT mein aapka swagat hai.", member: "Pehle required channel aur group dono join karein, phir Verify dabayein.", choose: "Apni language chunein.", account: "Aapka account", unlinked: "Koi website account linked nahi hai.", linked: "Aapka website account linked hai.", link: "Secure one-time website link banayein", linkCreated: "Yeh link 10 minute mein expire hoga. Open karke website account mein sign in karein:", help: "Commands: /start, /language, /account, /link, /support, /help", support: "/support ke baad subject aur message likhein.", ticketCreated: "Support ticket ban gaya hai.", error: "Kuch galat hua. Baad mein dobara try karein." },
  vi: { welcome: "Chào mừng bạn đến với VEXTRO BOT.", member: "Hãy tham gia cả kênh và nhóm bắt buộc, sau đó nhấn Verify.", choose: "Chọn ngôn ngữ của bạn.", account: "Tài khoản của bạn", unlinked: "Chưa liên kết tài khoản website.", linked: "Tài khoản website đã được liên kết.", link: "Tạo liên kết website dùng một lần", linkCreated: "Liên kết hết hạn sau 10 phút. Mở liên kết và đăng nhập website:", help: "Lệnh: /start, /language, /account, /link, /support, /help", support: "Dùng /support kèm tiêu đề và nội dung.", ticketCreated: "Đã tạo phiếu hỗ trợ.", error: "Đã xảy ra lỗi. Vui lòng thử lại sau." }
};

async function saveUser(telegramId: number, language?: Lang) {
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
  const from = ctx.from;
  if (!from) return false;
  const statuses = await Promise.all([config.REQUIRED_CHANNEL_ID, config.REQUIRED_GROUP_ID].map(async (chatId) => {
    try {
      const member = await ctx.telegram.getChatMember(chatId, from.id);
      return ["creator", "administrator", "member"].includes(member.status) || (member.status === "restricted" && member.is_member);
    } catch (error) {
      log.warn({ chatId, err: error }, "Membership verification failed");
      return false;
    }
  }));
  return statuses.every(Boolean);
}
async function accountStatus(telegramId: number) {
  const { data, error } = await db.from("bot_account_links").select("linked_at,unlink_eligible_at").eq("telegram_id", telegramId).is("unlinked_at", null).maybeSingle();
  if (error) throw error;
  return data;
}

bot.start(async (ctx) => {
  if (!ctx.from) return;
  try {
    await saveUser(ctx.from.id);
    const lang = await getLanguage(ctx.from.id);
    const ok = await isMember(ctx);
    if (!ok) {
      await ctx.reply(messages[lang].member, Markup.inlineKeyboard([[Markup.button.callback("Verify membership", "membership:verify")]]));
      return;
    }
    await ctx.reply(messages[lang].welcome, Markup.inlineKeyboard([
      [Markup.button.callback("Account", "account:open"), Markup.button.callback("Language", "language:open")],
      [Markup.button.callback("Support", "support:help"), Markup.button.callback("Help", "help:open")]
    ]));
  } catch (error) { log.error({ err: error }, "Start handler failed"); await ctx.reply(messages.en.error); }
});

bot.action("membership:verify", async (ctx) => {
  await ctx.answerCbQuery();
  const lang = ctx.from ? await getLanguage(ctx.from.id) : "en";
  if (await isMember(ctx)) await ctx.editMessageText(messages[lang].welcome, Markup.inlineKeyboard([[Markup.button.callback("Account", "account:open"), Markup.button.callback("Language", "language:open")],[Markup.button.callback("Support", "support:help"),Markup.button.callback("Help","help:open")]]));
  else await ctx.reply(messages[lang].member);
});

bot.command("language", async (ctx) => {\n  await ctx.reply(messages.en.choose, Markup.inlineKeyboard([[Markup.button.callback("English", "language:set:en"), Markup.button.callback("Hindi", "language:set:hi"), Markup.button.callback("Vietnamese", "language:set:vi")]]));\n});\nbot.action("language:open", async (ctx) => {
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
    await ctx.reply(link ? `${messages[lang].linked}\nLinked: ${new Date(link.linked_at).toLocaleString()}\nUnlink eligible: ${new Date(link.unlink_eligible_at).toLocaleString()}` : messages[lang].unlinked, Markup.inlineKeyboard([[Markup.button.callback("Create website link", "account:link")]]));
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
async function createLink(ctx: { reply: (text: string) => Promise<unknown> }, telegramId: number) {
  try {
    const existing = await accountStatus(telegramId);
    if (existing) return ctx.reply("This Telegram account is already linked to a website account.");
    const raw = randomBytes(32).toString("base64url");
    const hash = createHash("sha256").update(raw).digest("hex");
    const { error } = await db.from("bot_link_requests").insert({ token_hash: hash, telegram_id: telegramId });
    if (error) throw error;
    const url = new URL("/telegram/link", config.WEBSITE_URL);
    url.searchParams.set("token", raw);
    return ctx.reply(`${messages.en.linkCreated}\n${url.toString()}`, { disable_web_page_preview: true });
  } catch (error) { log.error({ err: error }, "Link request creation failed"); return ctx.reply(messages.en.error); }
}

bot.command("account", async (ctx) => {
  if (!ctx.from || !(await isMember(ctx))) return ctx.reply(messages.en.member);
  const status = await accountStatus(ctx.from.id);
  await ctx.reply(status ? messages.en.linked : messages.en.unlinked);
});

bot.command("support", async (ctx) => {
  if (!ctx.from || !(await isMember(ctx))) return ctx.reply(messages.en.member);
  const payload = ctx.message.text.replace(/^\/support(?:@\w+)?\s*/i, "").trim();
  const split = payload.indexOf("\n");
  const subject = (split < 0 ? payload : payload.slice(0, split)).trim();
  const body = (split < 0 ? "" : payload.slice(split + 1)).trim();
  if (subject.length < 5 || subject.length > 120 || body.length < 1 || body.length > textLimit) return ctx.reply("Format: /support Subject (minimum 5 characters)\nDescribe your issue in the next line.");
  try {
    const { data: ticket, error: ticketError } = await db.from("bot_support_tickets").insert({ telegram_id: ctx.from.id, category: "other", subject }).select("id").single();
    if (ticketError || !ticket) throw ticketError ?? new Error("Ticket was not created");
    const { error: messageError } = await db.from("bot_support_messages").insert({ ticket_id: ticket.id, sender_type: "user", sender_telegram_id: ctx.from.id, body });
    if (messageError) { await db.from("bot_support_tickets").delete().eq("id", ticket.id); throw messageError; }
    await ctx.reply(`${messages.en.ticketCreated}\nTicket: ${ticket.id}`);
  } catch (error) { log.error({ err: error }, "Support ticket creation failed"); await ctx.reply(messages.en.error); }
});

bot.command("help", async (ctx) => ctx.reply(messages.en.help));
bot.action("help:open", async (ctx) => { await ctx.answerCbQuery(); await ctx.reply(messages.en.help); });
bot.action("support:help", async (ctx) => { await ctx.answerCbQuery(); await ctx.reply(messages.en.support); });

bot.command("admin", async (ctx) => {
  if (!ctx.from || ctx.from.id !== config.OWNER_TELEGRAM_ID) return ctx.reply("Access denied.");
  const { count, error } = await db.from("bot_users").select("*", { count: "exact", head: true });
  if (error) { log.error({ err: error }, "Owner dashboard query failed"); return ctx.reply("Dashboard is temporarily unavailable."); }
  await ctx.reply(`VEXTRO BOT Owner Dashboard\nRegistered users: ${count ?? 0}\n\nOwner authorization is enforced by Telegram ID.`);
});

bot.catch((error, ctx) => { log.error({ err: error, updateId: ctx.update.update_id }, "Telegram update failed"); });
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));

await bot.launch({ dropPendingUpdates: false });
log.info({ botUsername: config.BOT_PUBLIC_USERNAME ?? "not-configured" }, "VEXTRO BOT polling started");
