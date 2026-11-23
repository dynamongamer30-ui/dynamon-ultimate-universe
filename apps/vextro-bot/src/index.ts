import { Telegraf, Markup, type Context } from "telegraf";
import pino from "pino";
import { config } from "./config.js";
import { db } from "./supabase.js";
import { createOneTimeLinkToken } from "./security.js";
import { publishPost, startJobWorkers } from "./jobs.js";
import { createBackup, listBackups, restoreBackup, startBackupScheduler, verifyBackup } from "./backup.js";
import { runHealthCheck, startHealthMonitor } from "./health.js";
import { registerGuideAdmin } from "./guides.js";
import { registerUpdateCommands, startUpdateMonitor } from "./updates.js";
import { registerOwnerMenu } from "./admin-menu.js";
import { formatOwnerDateTime, parseOwnerDateTime } from "./time.js";

const recentLogs: string[] = [];
const logStream = { write(chunk: string) {
  recentLogs.push(chunk.trim());
  if (recentLogs.length > 150) recentLogs.shift();
  process.stdout.write(chunk);
} };
const log = pino({ level: config.LOG_LEVEL, redact: ["*.token", "*.password", "*.secret", "*.authorization", "*.BOT_TOKEN", "*.SUPABASE_SERVICE_ROLE_KEY", "*.BACKUP_PASSPHRASE", "*.BACKUP_OFFSITE_TOKEN", "*.DEPLOY_WEBHOOK_SECRET"] }, logStream);
const bot = new Telegraf(config.BOT_TOKEN);
const textLimit = 4000;
const publishingPosts = new Set<string>();
let maintenanceMode = false;
const runtimeMembership = { channelId: config.REQUIRED_CHANNEL_ID, groupId: config.REQUIRED_GROUP_ID };
const moderationActivity = new Map<number, { times: number[]; lastText: string; repeats: number }>();
type Lang = "en" | "hi" | "vi";

const messages: Record<Lang, { welcome: string; member: string; choose: string; unlinked: string; linked: string; linkCreated: string; help: string; support: string; ticketCreated: string; error: string }> = {
  en: { welcome: "Welcome to VEXTRO BOT.", member: "Join both the required channel and group, then press Verify.", choose: "Choose your language.", unlinked: "No website account is linked.", linked: "Your website account is linked.", linkCreated: "This one-time link expires in 10 minutes. Open it and sign in to your website account:", help: "Commands: /start, /language, /account, /link, /membership_status, /guides, /find_guide, /rules, /support [category | ]Subject\nMessage, /my_tickets, /ticket_reply <ticket-id> <message>, /help", support: "Use /support [technical|account|download|billing|other | ]Subject, then put your message on the next line. Use /my_tickets and /ticket_reply <ticket-id> <message> to continue a ticket.", ticketCreated: "Your support ticket has been created.", error: "Something went wrong. Please try again later." },
  hi: { welcome: "VEXTRO BOT mein aapka swagat hai.", member: "Pehle required channel aur group dono join karein, phir Verify dabayein.", choose: "Apni language chunein.", unlinked: "Koi website account linked nahi hai.", linked: "Aapka website account linked hai.", linkCreated: "Yeh link 10 minute mein expire hoga. Open karke website account mein sign in karein:", help: "Commands: /start, /language, /account, /link, /membership_status, /guides, /find_guide, /rules, /support, /my_tickets, /ticket_reply, /help", support: "/support [technical|account|download|billing|other | ]Subject ke baad agali line mein message likhein. /my_tickets aur /ticket_reply se ticket continue karein.", ticketCreated: "Support ticket ban gaya hai.", error: "Kuch galat hua. Baad mein dobara try karein." },
  vi: { welcome: "Chào mừng bạn đến với VEXTRO BOT.", member: "Hãy tham gia cả kênh và nhóm bắt buộc, sau đó nhấn Verify.", choose: "Chọn ngôn ngữ của bạn.", unlinked: "Chưa liên kết tài khoản website.", linked: "Tài khoản website đã được liên kết.", linkCreated: "Liên kết hết hạn sau 10 phút. Mở liên kết và đăng nhập website:", help: "Lệnh: /start, /language, /account, /link, /membership_status, /guides, /rules, /support, /my_tickets, /ticket_reply, /help", support: "Dùng /support kèm danh mục và tiêu đề, nội dung ở dòng tiếp theo. Dùng /my_tickets và /ticket_reply để tiếp tục phiếu hỗ trợ.", ticketCreated: "Đã tạo phiếu hỗ trợ.", error: "Đã xảy ra lỗi. Vui lòng thử lại sau." }
};

const menuLabels: Record<Lang, {account:string;language:string;guides:string;rules:string;support:string;tickets:string;membership:string;help:string;about:string;home:string;verify:string;createLink:string}> = {
  en:{account:"Account",language:"Language",guides:"Guides",rules:"Rules",support:"Support",tickets:"My tickets",membership:"Membership",help:"Help",about:"About",home:"Home",verify:"Verify membership",createLink:"Create website link"},
  hi:{account:"Khata",language:"Bhasha",guides:"Guides",rules:"Niyam",support:"Sahayata",tickets:"Mere tickets",membership:"Sadasyata",help:"Madad",about:"Parichay",home:"Home",verify:"Membership verify karein",createLink:"Website link banayein"},
  vi:{account:"Tài khoản",language:"Ngôn ngữ",guides:"Hướng dẫn",rules:"Quy định",support:"Hỗ trợ",tickets:"Phiếu của tôi",membership:"Thành viên",help:"Trợ giúp",about:"Giới thiệu",home:"Trang chủ",verify:"Xác minh thành viên",createLink:"Tạo liên kết website"}
};
function mainMenu(language: Lang) {
  const t=menuLabels[language];
  return Markup.inlineKeyboard([
    [Markup.button.callback(t.account,"account:open"),Markup.button.callback(t.language,"language:open")],
    [Markup.button.callback(t.guides,"guides:open"),Markup.button.callback(t.rules,"rules:open")],
    [Markup.button.callback(t.support,"support:help"),Markup.button.callback(t.tickets,"tickets:mine")],
    [Markup.button.callback(t.membership,"membership:status"),Markup.button.callback(t.help,"help:open")],
    [Markup.button.callback(t.about,"about:open")]
  ]);
}
function homeMenu(language: Lang) {
  return Markup.inlineKeyboard([[Markup.button.callback(menuLabels[language].home,"menu:home")]]);
}
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
async function getWelcome(language: Lang): Promise<string> {
  try {
    const {data,error}=await db.from("vextro_runtime_settings").select("value").eq("key","welcome_messages").maybeSingle();
    if(error) throw error;
    const values=(data?.value??{}) as Record<string,unknown>;
    const selected=values[language];
    if(typeof selected==="string"&&selected.trim()) return selected.slice(0,1000);
  } catch(error) { log.warn({err:error},"Custom welcome message could not be loaded"); }
  return messages[language].welcome;
}
async function getLanguage(telegramId: number): Promise<Lang> {
  const { data, error } = await db.from("bot_users").select("language").eq("telegram_id", telegramId).maybeSingle();
  if (error) throw error;
  return data?.language === "hi" || data?.language === "vi" ? data.language : "en";
}
async function isMemberId(telegramId: number): Promise<boolean> {
  const results = await Promise.all([runtimeMembership.channelId, runtimeMembership.groupId].map(async (chatId) => {
    try {
      const member = await bot.telegram.getChatMember(chatId, telegramId);
      return ["creator", "administrator", "member"].includes(member.status) || (member.status === "restricted" && member.is_member);
    } catch (error) {
      const code = (error as { response?: { error_code?: number } })?.response?.error_code;
      if (code === 400) return false;
      throw error;
    }
  }));
  return results.every(Boolean);
}
async function isMember(ctx: Context): Promise<boolean> {
  if (!ctx.from) return false;
  if (ownerOnly(ctx)) return true;
  const results = await Promise.all([runtimeMembership.channelId, runtimeMembership.groupId].map(async (chatId) => {
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
      const lang=await getLanguage(telegramId);
      await ctx.reply(messages[lang].linked,homeMenu(lang));
      return;
    }
    const token = createOneTimeLinkToken();
    const { error } = await db.from("bot_link_requests").insert({ token_hash: token.hash, telegram_id: telegramId });
    if (error) throw error;
    const url = new URL("/telegram/link", config.WEBSITE_URL);
    url.searchParams.set("token", token.raw);
    const lang = await getLanguage(telegramId);
    await ctx.reply(messages[lang].linkCreated + "\n" + url.toString(), { link_preview_options: { is_disabled: true }, reply_markup: homeMenu(lang).reply_markup });
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
  if (maintenanceMode && ctx.from && !ownerOnly(ctx)) return ctx.reply("VEXTRO BOT is temporarily in maintenance mode. Please try again later.");
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
      await ctx.reply(messages[lang].member, Markup.inlineKeyboard([[Markup.button.callback(menuLabels[lang].verify, "membership:verify")]]));
      return;
    }
    await ctx.reply(await getWelcome(lang), mainMenu(lang));
  } catch (error) { log.error({ err: error }, "Start handler failed"); await ctx.reply(messages.en.error); }
});

bot.action("membership:verify", async (ctx) => {
  await ctx.answerCbQuery();
  if (!ctx.from) return;
  const lang = await getLanguage(ctx.from.id);
  if (await isMember(ctx)) {
    await ctx.editMessageText(await getWelcome(lang), mainMenu(lang));
  } else await ctx.reply(messages[lang].member);
});

bot.command("language", async (ctx) => {
  await ctx.reply(messages.en.choose, Markup.inlineKeyboard([[Markup.button.callback("English", "language:set:en"), Markup.button.callback("Hindi (Roman)", "language:set:hi"), Markup.button.callback("Vietnamese", "language:set:vi")],[Markup.button.callback(menuLabels[ctx.from?await getLanguage(ctx.from.id):"en"].home,"menu:home")]]));
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
  await ctx.reply(await getWelcome(lang),mainMenu(lang));
});

bot.action("account:open", async (ctx) => {
  await ctx.answerCbQuery();
  if (!ctx.from || !(await isMember(ctx))) return ctx.reply(messages.en.member);
  try {
    const lang = await getLanguage(ctx.from.id);
    const link = await accountStatus(ctx.from.id);
    const detail = link ? `\nLinked: ${new Date(link.linked_at).toLocaleString()}\nUnlink eligible: ${new Date(link.unlink_eligible_at).toLocaleString()}` : "";
    await ctx.reply(link ? messages[lang].linked + detail : messages[lang].unlinked, Markup.inlineKeyboard([[Markup.button.callback(menuLabels[lang].createLink, "account:link")],[Markup.button.callback(menuLabels[lang].home,"menu:home")]]));
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
  let subject = (split < 0 ? payload : payload.slice(0, split)).trim();
  const body = (split < 0 ? "" : payload.slice(split + 1)).trim();
  let category = "other";
  const categoryMatch = subject.match(/^(technical|account|download|billing|other)\s*\|\s*([\s\S]+)$/i);
  if (categoryMatch) { category = categoryMatch[1]!.toLowerCase(); subject = categoryMatch[2]!.trim(); }
  if (subject.length < 5 || subject.length > 120 || body.length < 1 || body.length > textLimit) return ctx.reply("Format: /support [technical|account|download|billing|other | ]Subject (5–120 characters)\nDescribe your issue on the next line (up to 4000 characters).");
  try {
    const { data: ticket, error: ticketError } = await db.from("bot_support_tickets").insert({ telegram_id: ctx.from.id, category, subject }).select("id").single();
    if (ticketError || !ticket) throw ticketError ?? new Error("Ticket was not created");
    const { error: messageError } = await db.from("bot_support_messages").insert({ ticket_id: ticket.id, sender_type: "user", sender_telegram_id: ctx.from.id, body });
    if (messageError) { await db.from("bot_support_tickets").delete().eq("id", ticket.id); throw messageError; }
    await ctx.reply(`${messages.en.ticketCreated}\nTicket: ${ticket.id}`);
    await sendOwnerNotice(`New VEXTRO support ticket\nID: ${ticket.id}\nFrom: ${ctx.from.id}\nSubject: ${subject}\nUse /ticket ${ticket.id} to view and /reply ${ticket.id} message to respond.`);
  } catch (error) { log.error({ err: error }, "Support ticket creation failed"); await ctx.reply(messages.en.error); }
});

bot.command("tickets", async (ctx) => {
  if (!ownerOnly(ctx)) return ctx.reply("Access denied.");
  const page = Math.max(1, Number(ctx.message.text.split(/\s+/)[1]) || 1);
  const { data, error } = await db.from("bot_support_tickets").select("id,telegram_id,subject,status,priority,created_at").neq("status", "closed").order("created_at", { ascending: false }).range((page-1)*20,page*20-1);
  if (error) { log.error({ err: error }, "Ticket list failed"); return ctx.reply("Ticket list unavailable."); }
  if (!data?.length) return ctx.reply(page===1?"No open support tickets.":"No tickets on this page.");
  await ctx.reply("Tickets — page "+page+"\n"+data.map((t) => "[" + t.status + "/" + t.priority + "] " + t.id + "\nUser: " + t.telegram_id + "\n" + t.subject).join("\n\n")+"\nNext: /tickets "+(page+1));
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
bot.command("ticket_priority", async (ctx) => {
  if(!ownerOnly(ctx)) return ctx.reply("Access denied.");
  const m=ctx.message.text.match(/^\/ticket_priority(?:@\w+)?\s+([0-9a-f-]{36})\s+(low|normal|high|urgent)$/i);
  if(!m) return ctx.reply("Usage: /ticket_priority <ticket-uuid> <low|normal|high|urgent>");
  const {data,error}=await db.from("bot_support_tickets").update({priority:m[2]!,updated_at:new Date().toISOString()}).eq("id",m[1]!).select("id").maybeSingle();
  if(error||!data) return ctx.reply("Ticket not found or priority update failed.");
  await writeAudit("ticket.priority",null,m[1]+" => "+m[2]); await ctx.reply("Ticket priority updated.");
});
bot.command("ticket_category", async (ctx) => {
  if(!ownerOnly(ctx)) return ctx.reply("Access denied.");
  const m=ctx.message.text.match(/^\/ticket_category(?:@\w+)?\s+([0-9a-f-]{36})\s+(technical|account|download|billing|other)$/i);
  if(!m) return ctx.reply("Usage: /ticket_category <ticket-uuid> <technical|account|download|billing|other>");
  const {data,error}=await db.from("bot_support_tickets").update({category:m[2]!,updated_at:new Date().toISOString()}).eq("id",m[1]!).select("id").maybeSingle();
  if(error||!data) return ctx.reply("Ticket not found or category update failed.");
  await writeAudit("ticket.category",null,m[1]+" => "+m[2]); await ctx.reply("Ticket category updated.");
});
bot.command("ticket_note", async (ctx) => {
  if(!ownerOnly(ctx)) return ctx.reply("Access denied.");
  const m=ctx.message.text.match(/^\/ticket_note(?:@\w+)?\s+([0-9a-f-]{36})\s+([\s\S]+)$/i);
  if(!m) return ctx.reply("Usage: /ticket_note <ticket-uuid> <private internal note>");
  const {data:ticket,error:ticketError}=await db.from("bot_support_tickets").select("id").eq("id",m[1]!).maybeSingle();
  if(ticketError||!ticket) return ctx.reply("Ticket not found.");
  const {error}=await db.from("bot_support_messages").insert({ticket_id:m[1]!,sender_type:"staff",sender_telegram_id:config.OWNER_TELEGRAM_ID,body:m[2]!.trim().slice(0,4000),internal_note:true});
  if(error) return ctx.reply("Internal note could not be saved.");
  await writeAudit("ticket.internal_note",null,m[1]!); await ctx.reply("Private note saved. It is not sent to the user.");
});
bot.command("ticket_search", async (ctx) => {
  if(!ownerOnly(ctx)) return ctx.reply("Access denied.");
  const term=ctx.message.text.replace(/^\/ticket_search(?:@\w+)?\s*/i,"").trim();
  if(term.length<2||term.length>100) return ctx.reply("Usage: /ticket_search <at least 2 characters>");
  const {data,error}=await db.from("bot_support_tickets").select("id,telegram_id,subject,status,priority").ilike("subject","%"+term.replace(/[%_]/g,"")+"%").order("updated_at",{ascending:false}).limit(20);
  if(error) return ctx.reply("Ticket search unavailable.");
  if(!data?.length) return ctx.reply("No matching tickets.");
  await ctx.reply(data.map(t=>"["+t.status+"/"+t.priority+"] "+t.id+"\nUser: "+t.telegram_id+"\n"+t.subject).join("\n\n"));
});
bot.command("my_tickets", async (ctx) => {
  if(!ctx.from || !(await isMember(ctx))) return ctx.reply(messages.en.member);
  const {data,error}=await db.from("bot_support_tickets").select("id,subject,status,priority,created_at").eq("telegram_id",ctx.from.id).order("created_at",{ascending:false}).limit(10);
  if(error) return ctx.reply(messages.en.error);
  if(!data?.length) return ctx.reply("You have no support tickets yet.");
  await ctx.reply(data.map(t=>"["+t.status+"] "+t.subject+"\nID: "+t.id+"\nPriority: "+t.priority).join("\n\n"));
});
bot.command("ticket_reply", async (ctx) => {
  if(!ctx.from || !(await isMember(ctx))) return ctx.reply(messages.en.member);
  const m=ctx.message.text.match(/^\/ticket_reply(?:@\w+)?\s+([0-9a-f-]{36})\s+([\s\S]+)$/i);
  if(!m) return ctx.reply("Usage: /ticket_reply <ticket-uuid> <message>");
  const {data:ticket,error:ticketError}=await db.from("bot_support_tickets").select("id,status").eq("id",m[1]!).eq("telegram_id",ctx.from.id).maybeSingle();
  if(ticketError||!ticket) return ctx.reply("Ticket not found.");
  if(ticket.status==="closed") return ctx.reply("This ticket is closed. Open a new ticket with /support.");
  const body=m[2]!.trim();
  if(!body||body.length>4000) return ctx.reply("Reply must be 1–4000 characters.");
  const {error}=await db.from("bot_support_messages").insert({ticket_id:ticket.id,sender_type:"user",sender_telegram_id:ctx.from.id,body});
  if(error) return ctx.reply(messages.en.error);
  await db.from("bot_support_tickets").update({status:"open",updated_at:new Date().toISOString()}).eq("id",ticket.id);
  await sendOwnerNotice("User "+ctx.from.id+" replied to ticket "+ticket.id+":\n"+body.slice(0,1200));
  await ctx.reply("Your reply was added to ticket "+ticket.id+".");
});
bot.command("ticket_history", async (ctx) => {
  if(!ownerOnly(ctx)) return ctx.reply("Access denied.");
  const id=ctx.message.text.split(/\s+/)[1];
  if(!id||!/^[0-9a-f-]{36}$/i.test(id)) return ctx.reply("Usage: /ticket_history <ticket-uuid>");
  const {data:ticket,error:ticketError}=await db.from("bot_support_tickets").select("telegram_id,subject,category,status,priority").eq("id",id).maybeSingle();
  if(ticketError||!ticket) return ctx.reply("Ticket not found.");
  const {data,error}=await db.from("bot_support_messages").select("sender_type,sender_telegram_id,body,internal_note,created_at").eq("ticket_id",id).order("created_at",{ascending:true}).limit(100);
  if(error) return ctx.reply("Ticket history unavailable.");
  const history=(data??[]).map(m=>"["+new Date(m.created_at).toLocaleString()+"] "+(m.internal_note?"INTERNAL NOTE":m.sender_type+" "+(m.sender_telegram_id??""))+": "+m.body).join("\n\n");
  await ctx.reply("Ticket "+id+"\n"+ticket.subject+" | "+ticket.category+" | "+ticket.status+" | "+ticket.priority+"\nUser: "+ticket.telegram_id+"\n\n"+(history||"No messages." ).slice(0,3900));
});
bot.command("reopen_ticket", async (ctx) => {
  if (!ownerOnly(ctx)) return ctx.reply("Access denied.");
  const id = ctx.message.text.split(/\s+/)[1];
  if (!id) return ctx.reply("Usage: /reopen_ticket <ticket-uuid>");
  const { data, error } = await db.from("bot_support_tickets").update({ status: "open", updated_at: new Date().toISOString() })
    .eq("id", id).eq("status", "closed").select("telegram_id").maybeSingle();
  if (error || !data) return ctx.reply("Closed ticket not found.");
  await writeAudit("ticket.reopened", Number(data.telegram_id), "Owner reopened ticket " + id);
  try { await bot.telegram.sendMessage(Number(data.telegram_id), "Your support ticket has been reopened. Reply here to continue."); } catch {}
  await ctx.reply("Ticket reopened.");
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
  const page = Math.max(1, Number(ctx.message.text.split(/\s+/)[1]) || 1);
  const { data, error } = await db.from("dgbot_posts").select("id,title,state,updated_at").is("deleted_at", null).neq("state", "removed").order("updated_at", { ascending: false }).range((page-1)*20,page*20-1);
  if (error) { log.error({ err: error }, "Post list failed"); return ctx.reply("Post list unavailable."); }
  if (!data?.length) return ctx.reply(page===1?"No posts yet. Create one with /post_draft Title\\nBody.":"No posts on this page.");
  await ctx.reply("Posts — page "+page+"\n"+data.map((p) => "[" + p.state + "] " + p.id + "\n" + p.title).join("\n\n")+"\nNext: /posts "+(page+1));
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
bot.on("message", async (ctx, next) => {
  if (!ownerOnly(ctx)) return next();
  const message = ctx.message as unknown as {
    photo?: Array<{file_id:string}>;
    video?: {file_id:string};
    document?: {file_id:string};
    animation?: {file_id:string};
  };
  let fileId="",kind="";
  if(message.photo?.length){fileId=message.photo[message.photo.length-1]!.file_id;kind="photo";}
  else if(message.video){fileId=message.video.file_id;kind="video";}
  else if(message.document){fileId=message.document.file_id;kind="document";}
  else if(message.animation){fileId=message.animation.file_id;kind="animation";}
  else return next();
  await ctx.reply("Media received.\nType: "+kind+"\nFile ID:\n"+fileId+"\nUse /post_media <draft-uuid> "+kind+" "+fileId+" [caption].");
});

bot.command("post_media", async (ctx) => {
  if (!ownerOnly(ctx)) return ctx.reply("Access denied.");
  const match = ctx.message.text.match(/^\/post_media(?:@\w+)?\s+([0-9a-f-]{36})\s+(photo|video|document|animation)\s+(\S+)(?:\s+([\s\S]+))?$/i);
  if (!match) return ctx.reply("Usage: /post_media <post-uuid> <photo|video|document|animation> <telegram-file-id> [caption]");
  const [, id, type, fileId, caption = ""] = match;
  if (caption.length > 1024) return ctx.reply("Caption must be 1024 characters or fewer.");
  const { data: existing, error: readError } = await db.from("dgbot_posts").select("media").eq("id", id!).eq("state", "draft").is("deleted_at", null).maybeSingle();
  if (readError || !existing) return ctx.reply("Draft not found.");
  const previous = (existing.media ?? {}) as Record<string, unknown>;
  const { data, error } = await db.from("dgbot_posts").update({ media: { ...previous, type: type!.toLowerCase(), file_id: fileId, caption }, updated_at: new Date().toISOString() })
    .eq("id", id!).eq("state", "draft").is("deleted_at", null).select("id").maybeSingle();
  if (error || !data) return ctx.reply("Draft not found or media could not be saved.");
  await ctx.reply("Media saved to draft.");
});
bot.command("post_format", async (ctx) => {
  if(!ownerOnly(ctx)) return ctx.reply("Access denied.");
  const m=ctx.message.text.match(/^\/post_format(?:@\w+)?\s+([0-9a-f-]{36})\s+(plain|html|markdownv2)$/i);
  if(!m) return ctx.reply("Usage: /post_format <draft-uuid> <plain|html|markdownv2>");
  const {data:existing,error:readError}=await db.from("dgbot_posts").select("media").eq("id",m[1]!).eq("state","draft").is("deleted_at",null).maybeSingle();
  if(readError||!existing) return ctx.reply("Draft not found.");
  const media=(existing.media??{}) as Record<string,unknown>;
  const format=m[2]!.toLowerCase()==="plain"?"plain":m[2]!.toUpperCase()==="HTML"?"HTML":"MarkdownV2";
  const {error}=await db.from("dgbot_posts").update({media:{...media,format},updated_at:new Date().toISOString()}).eq("id",m[1]!).eq("state","draft");
  if(error) return ctx.reply("Message format could not be saved.");
  await ctx.reply("Telegram formatting set to "+format+". Use /post_preview to validate formatting before publishing.");
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
  const caption = "[" + data.state + "] " + data.title + "\n\n" + (data.body || "(No body)");
  const media = data.media as {type?:string;file_id?:string;caption?:string;format?:string}|null;
  const buttons = Array.isArray(data.buttons) ? data.buttons as Array<{text:string;url:string}> : [];
  const parseMode: "HTML" | "MarkdownV2" | undefined = media?.format === "HTML" ? "HTML" : media?.format === "MarkdownV2" ? "MarkdownV2" : undefined;
  const formatOptions = parseMode ? {parse_mode:parseMode} : {};
  const options = {...(buttons.length ? {reply_markup:{inline_keyboard:buttons.map(b=>[{text:b.text,url:b.url}])}} : {}),...formatOptions};
  if(media?.file_id&&media.type==="photo") return ctx.replyWithPhoto(media.file_id,{caption:(media.caption||caption).slice(0,1024),...options});
  if(media?.file_id&&media.type==="video") return ctx.replyWithVideo(media.file_id,{caption:(media.caption||caption).slice(0,1024),...options});
  if(media?.file_id&&media.type==="document") return ctx.replyWithDocument(media.file_id,{caption:(media.caption||caption).slice(0,1024),...options});
  if(media?.file_id&&media.type==="animation") return ctx.replyWithAnimation(media.file_id,{caption:(media.caption||caption).slice(0,1024),...options});
  const buttonLabels=buttons.length?"\n\nButtons: "+buttons.map(b=>b.text+" ("+b.url+")").join(", "):"";
  return ctx.reply((caption+buttonLabels).slice(0,4096),options);
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
    const messageId = await publishPost(bot, channelId, id);
    await ctx.reply("Published to " + channelId + ". Telegram message ID: " + messageId);
  } catch (error) {
    log.error({ err: error, postId: id }, "Post publishing failed");
    await ctx.reply("Publishing did not complete: " + (error instanceof Error ? error.message : "unknown error"));
  } finally { publishingPosts.delete(id); }
});
bot.command("post_reconcile", async (ctx) => {
  if (!ownerOnly(ctx)) return ctx.reply("Access denied.");
  const m = ctx.message.text.match(/^\/post_reconcile(?:@\w+)?\s+([0-9a-f-]{36})\s+(published|draft)(?:\s+(\d+))?$/i);
  if (!m) return ctx.reply("Usage: /post_reconcile <post-uuid> published <telegram-message-id> OR /post_reconcile <post-uuid> draft. Check the channel first; this command changes the publishing lock.");
  const id=m[1]!,state=m[2]!.toLowerCase(),messageId=m[3]?Number(m[3]):null;
  if(state==="published"&&(!messageId||!Number.isSafeInteger(messageId))) return ctx.reply("Provide the Telegram channel message ID after 'published'.");
  if(state==="draft"&&messageId) return ctx.reply("Do not provide a message ID when restoring a draft.");
  const patch=state==="published"
    ? {state:"published",channel_message_id:messageId,updated_at:new Date().toISOString()}
    : {state:"draft",channel_message_id:null,updated_at:new Date().toISOString()};
  const {data,error}=await db.from("dgbot_posts").update(patch).eq("id",id).eq("state","publishing").is("deleted_at",null).select("id").maybeSingle();
  if(error||!data) return ctx.reply("No publishing-locked post found, or reconciliation failed.");
  await writeAudit("post.reconciled",null,id+" -> "+state+(messageId?" message "+messageId:""));
  await ctx.reply(state==="published"?"Post marked as published with Telegram message ID "+messageId+".":"Post returned to draft. It is now safe to publish again after you confirmed no copy exists in the channel.");
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
  const { data, error } = await db.from("vextro_broadcast_jobs").select("body,status,scheduled_at,total_count,format").eq("id", id).maybeSingle();
  if (error || !data) return ctx.reply("Broadcast not found.");
  const parseMode = data.format === "HTML" ? "HTML" : data.format === "MarkdownV2" ? "MarkdownV2" : undefined;
  const scheduled = data.scheduled_at ? formatOwnerDateTime(data.scheduled_at,config.OWNER_TIMEZONE) : "immediately after confirmation";
  await ctx.reply("Preview ["+data.status+"]\nFormat: "+data.format+"\nRecipients: "+data.total_count+"\nScheduled: "+scheduled+"\n\n"+data.body,parseMode?{parse_mode:parseMode}:{});
});
bot.command("broadcast_format", async (ctx) => {
  if(!ownerOnly(ctx)) return ctx.reply("Access denied.");
  const m=ctx.message.text.match(/^\/broadcast_format(?:@\w+)?\s+([0-9a-f-]{36})\s+(plain|html|markdownv2)$/i);
  if(!m) return ctx.reply("Usage: /broadcast_format <uuid> <plain|html|markdownv2>");
  const format=m[2]!.toLowerCase()==="plain"?"plain":m[2]!.toUpperCase()==="HTML"?"HTML":"MarkdownV2";
  const {data,error}=await db.from("vextro_broadcast_jobs").update({format,updated_at:new Date().toISOString()}).eq("id",m[1]!).eq("status","draft").select("id").maybeSingle();
  if(error||!data) return ctx.reply("Only an existing draft can change format.");
  await ctx.reply("Broadcast format set to "+format+". Preview and test it before confirmation.");
});
bot.command("broadcast_edit", async (ctx) => {
  if(!ownerOnly(ctx)) return ctx.reply("Access denied.");
  const m=ctx.message.text.match(/^\/broadcast_edit(?:@\w+)?\s+([0-9a-f-]{36})\s+([\s\S]+)$/i);
  if(!m) return ctx.reply("Usage: /broadcast_edit <broadcast-uuid> <new message>");
  const body=m[2]!.trim();
  if(!body||body.length>4000) return ctx.reply("Broadcast message must be 1–4000 characters.");
  const {data,error}=await db.from("vextro_broadcast_jobs").update({body,updated_at:new Date().toISOString()}).eq("id",m[1]!).eq("status","draft").select("id").maybeSingle();
  if(error||!data) return ctx.reply("Only an existing draft can be edited.");
  await ctx.reply("Broadcast draft updated. Preview it again before confirmation.");
});
bot.command("broadcast_delete", async (ctx) => {
  if(!ownerOnly(ctx)) return ctx.reply("Access denied.");
  const id=ctx.message.text.split(/\s+/)[1];
  if(!id) return ctx.reply("Usage: /broadcast_delete <broadcast-uuid>");
  const {data,error}=await db.from("vextro_broadcast_jobs").delete().eq("id",id).eq("status","draft").select("id").maybeSingle();
  if(error||!data) return ctx.reply("Only an unconfirmed draft can be deleted.");
  await ctx.reply("Broadcast draft deleted.");
});
bot.command("broadcast_schedule", async (ctx) => {
  if (!ownerOnly(ctx)) return ctx.reply("Access denied.");
  const match=ctx.message.text.match(/^\/broadcast_schedule(?:@\w+)?\s+([0-9a-f-]{36})\s+([\s\S]+)$/i);
  if(!match) return ctx.reply("Usage: /broadcast_schedule <uuid> <YYYY-MM-DD HH:mm in Owner timezone>");
  let at: Date;
  try { at=parseOwnerDateTime(match[2]!,config.OWNER_TIMEZONE); }
  catch(error){ return ctx.reply(error instanceof Error?error.message:"Invalid schedule time."); }
  if(at.getTime()<Date.now()+60_000) return ctx.reply("Choose a future time at least one minute from now.");
  const id=match[1]!;
  const {data,error}=await db.from("vextro_broadcast_jobs").update({scheduled_at:at.toISOString(),updated_at:new Date().toISOString()}).eq("id",id).eq("status","draft").select("id").maybeSingle();
  if(error||!data) return ctx.reply("Draft not found or schedule could not be saved.");
  await ctx.reply("Broadcast scheduled for "+formatOwnerDateTime(at,config.OWNER_TIMEZONE)+" ("+at.toISOString()+"). It will not send until you explicitly run /broadcast_confirm "+id+".");
});
bot.command("broadcast_confirm", async (ctx) => {
  if (!ownerOnly(ctx)) return ctx.reply("Access denied.");
  const id = ctx.message.text.split(/\s+/)[1];
  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) return ctx.reply("Usage: /broadcast_confirm <uuid>");
  const { data: job, error } = await db.from("vextro_broadcast_jobs").select("id,status,scheduled_at").eq("id", id).maybeSingle();
  if (error || !job) return ctx.reply("Broadcast not found.");
  if (job.status !== "draft") return ctx.reply(`Broadcast is already ${job.status}.`);
  const recipients: Array<{job_id:string;telegram_id:number}> = [];
  const { data: bans, error: banError } = await db.from("dgbot_bans").select("telegram_id").is("deleted_at", null);
  if (banError) return ctx.reply("Could not verify restricted users; broadcast was not queued.");
  const banned = new Set((bans ?? []).map((row) => Number(row.telegram_id)));
  for (let from=0; ; from+=1000) {
    const { data, error: usersError } = await db.from("bot_users").select("telegram_id").order("telegram_id").range(from, from+999);
    if (usersError) return ctx.reply("Could not load recipient list; broadcast was not queued.");
    const candidates=(data??[]).filter(user=>!banned.has(Number(user.telegram_id)));
    for(let i=0;i<candidates.length;i+=10){
      const batch=candidates.slice(i,i+10);
      const checked=await Promise.all(batch.map(async user=>{
        const userId=Number(user.telegram_id);
        try { return {id:userId,member:await isMemberId(userId),failed:false}; }
        catch { return {id:userId,member:false,failed:true}; }
      }));
      if(checked.some(item=>item.failed)) return ctx.reply("Membership verification failed; broadcast remains a draft and no messages were queued.");
      for(const item of checked) if(item.member) recipients.push({job_id:id,telegram_id:item.id});
    }
    if (!data || data.length < 1000) break;
  }
  if (!recipients.length) return ctx.reply("No registered recipients. Broadcast remains a draft.");
  for (let i=0; i<recipients.length; i+=500) {
    const { error: insertError } = await db.from("vextro_broadcast_recipients").upsert(recipients.slice(i,i+500), { onConflict:"job_id,telegram_id", ignoreDuplicates:true });
    if (insertError) return ctx.reply("Recipient queue preparation failed. No delivery was started; inspect this draft before retrying.");
  }
  const { error: updateError } = await db.from("vextro_broadcast_jobs").update({
    status:"queued", scheduled_at:job.scheduled_at ?? new Date().toISOString(), confirmed_at:new Date().toISOString(), total_count:recipients.length, updated_at:new Date().toISOString()
  }).eq("id",id).eq("status","draft");
  if (updateError) return ctx.reply("Could not activate the queue. No messages have been sent.");
  await writeAudit("broadcast.confirmed", null, `Broadcast ${id} confirmed for ${recipients.length} users`);
  await ctx.reply(`Broadcast confirmed. ${recipients.length} recipients queued. Delivery will begin at ${job.scheduled_at ? formatOwnerDateTime(job.scheduled_at,config.OWNER_TIMEZONE) : "the next worker cycle"}.`);
});
bot.command("broadcasts", async (ctx) => {
  if(!ownerOnly(ctx)) return ctx.reply("Access denied.");
  const {data,error}=await db.from("vextro_broadcast_jobs").select("id,status,total_count,sent_count,failed_count,scheduled_at,created_at").order("created_at",{ascending:false}).limit(20);
  if(error) return ctx.reply("Broadcast history unavailable.");
  if(!data?.length) return ctx.reply("No broadcast jobs.");
  await ctx.reply(data.map(x=>x.id+" | "+x.status+"\n"+(x.sent_count??0)+"/"+x.total_count+" sent, "+(x.failed_count??0)+" failed\n"+(x.scheduled_at?formatOwnerDateTime(x.scheduled_at,config.OWNER_TIMEZONE):"unscheduled")).join("\n\n"));
});
bot.command("broadcast_test", async (ctx) => {
  if(!ownerOnly(ctx)) return ctx.reply("Access denied.");
  const id=ctx.message.text.split(/\s+/)[1];
  if(!id) return ctx.reply("Usage: /broadcast_test <broadcast-uuid>");
  const {data,error}=await db.from("vextro_broadcast_jobs").select("body,format").eq("id",id).maybeSingle();
  if(error||!data) return ctx.reply("Broadcast not found.");
  try { const parseMode=data.format==="HTML"?"HTML":data.format==="MarkdownV2"?"MarkdownV2":undefined; await bot.telegram.sendMessage(config.OWNER_TELEGRAM_ID,"VEXTRO broadcast test\n\n"+data.body,parseMode?{parse_mode:parseMode}:{}); await ctx.reply("Test message delivered to Owner chat only."); }
  catch(sendError) { log.error({err:sendError},"Broadcast test failed"); await ctx.reply("Test delivery failed."); }
});
bot.command("broadcast_retry", async (ctx) => {
  if(!ownerOnly(ctx)) return ctx.reply("Access denied.");
  const id=ctx.message.text.split(/\s+/)[1];
  if(!id) return ctx.reply("Usage: /broadcast_retry <broadcast-uuid>");
  const {data:job,error:jobError}=await db.from("vextro_broadcast_jobs").select("id,status").eq("id",id).maybeSingle();
  if(jobError||!job||!["completed","failed","paused"].includes(job.status)) return ctx.reply("Only completed, failed or paused jobs can be retried.");
  const {error}=await db.from("vextro_broadcast_recipients").update({status:"pending",attempts:0,next_attempt_at:new Date().toISOString(),last_error:null,updated_at:new Date().toISOString()}).eq("job_id",id).eq("status","failed");
  if(error) return ctx.reply("Failed recipients could not be reset.");
  const {error:updateError}=await db.from("vextro_broadcast_jobs").update({status:"running",completed_at:null,updated_at:new Date().toISOString()}).eq("id",id);
  if(updateError) return ctx.reply("Could not restart this queue.");
  await ctx.reply("Failed recipients re-queued. Already delivered recipients will not be sent again.");
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
  await ctx.reply(`Broadcast ${id}\nStatus: ${job.status}\nTotal: ${count??0}\nSent: ${sent??0}\nFailed/retrying: ${failed??0}\nPending: ${pending??0}\nScheduled: ${job.scheduled_at?formatOwnerDateTime(job.scheduled_at,config.OWNER_TIMEZONE):"immediate"}`);
});
bot.command("post_schedule", async (ctx) => {
  if (!ownerOnly(ctx)) return ctx.reply("Access denied.");
  const match=ctx.message.text.match(/^\/post_schedule(?:@\w+)?\s+([0-9a-f-]{36})\s+([\s\S]+)$/i);
  if(!match) return ctx.reply("Usage: /post_schedule <draft-post-uuid> <YYYY-MM-DD HH:mm in Owner timezone>");
  let at: Date;
  try { at=parseOwnerDateTime(match[2]!,config.OWNER_TIMEZONE); }
  catch(error){ return ctx.reply(error instanceof Error?error.message:"Invalid schedule time."); }
  if(at.getTime()<Date.now()+60_000) return ctx.reply("Schedule must be at least one minute in the future.");
  const {data:post,error:postError}=await db.from("dgbot_posts").select("id,state").eq("id",match[1]!).is("deleted_at",null).maybeSingle();
  if(postError||!post||post.state!=="draft") return ctx.reply("Only an existing draft post can be scheduled.");
  const {data,error}=await db.from("vextro_scheduled_posts").insert({post_id:post.id,scheduled_at:at.toISOString(),created_by:ctx.from.id}).select("id").single();
  if(error||!data) return ctx.reply("Could not schedule this post.");
  await ctx.reply("Post scheduled for "+formatOwnerDateTime(at,config.OWNER_TIMEZONE)+" ("+at.toISOString()+"). Schedule ID: "+data.id);
});
bot.command("post_schedules", async (ctx) => {
  if(!ownerOnly(ctx)) return ctx.reply("Access denied.");
  const {data,error}=await db.from("vextro_scheduled_posts").select("id,post_id,scheduled_at,status,last_error").order("scheduled_at",{ascending:true}).limit(20);
  if(error) return ctx.reply("Schedule list unavailable.");
  if(!data?.length) return ctx.reply("No scheduled posts.");
  await ctx.reply(data.map(x=>`${x.id} | ${x.status}\nPost: ${x.post_id}\n${formatOwnerDateTime(x.scheduled_at,config.OWNER_TIMEZONE)}${x.last_error?"\n"+x.last_error:""}`).join("\n\n"));
});
bot.command("post_schedule_retry", async (ctx) => {
  if(!ownerOnly(ctx)) return ctx.reply("Access denied.");
  const id=ctx.message.text.split(/\s+/)[1];
  if(!id) return ctx.reply("Usage: /post_schedule_retry <schedule-uuid>");
  const {data: schedule,error: scheduleError}=await db.from("vextro_scheduled_posts").select("post_id").eq("id",id).eq("status","failed").maybeSingle();
  if(scheduleError||!schedule) return ctx.reply("Failed schedule not found.");
  const {data: post,error: postError}=await db.from("dgbot_posts").select("state").eq("id",schedule.post_id).maybeSingle();
  if(postError||!post) return ctx.reply("Scheduled post not found.");
  if(post.state!=="draft") return ctx.reply("This post is not a safe draft to retry. Current post state: "+post.state+". Check the channel and use /post_reconcile "+schedule.post_id+" published <message-id> or /post_reconcile "+schedule.post_id+" draft first.");
  const {data,error}=await db.from("vextro_scheduled_posts").update({status:"scheduled",scheduled_at:new Date().toISOString(),last_error:null,updated_at:new Date().toISOString()})
    .eq("id",id).eq("status","failed").select("id").maybeSingle();
  if(error||!data) return ctx.reply("Schedule retry could not be queued.");
  await ctx.reply("Failed schedule queued for retry. Post is confirmed in draft state.");
});

bot.command("post_schedule_cancel", async (ctx) => {
  if(!ownerOnly(ctx)) return ctx.reply("Access denied.");
  const id=ctx.message.text.split(/\s+/)[1];
  if(!id) return ctx.reply("Usage: /post_schedule_cancel <schedule-uuid>");
  const {data,error}=await db.from("vextro_scheduled_posts").update({status:"cancelled",updated_at:new Date().toISOString()}).eq("id",id).eq("status","scheduled").select("id").maybeSingle();
  if(error||!data) return ctx.reply("Pending schedule not found.");
  await ctx.reply("Scheduled post cancelled.");
});

bot.command("find_guide", async (ctx) => {
  if(!ctx.from||!(await isMember(ctx))) return ctx.reply(messages.en.member);
  const phrase=ctx.message.text.replace(/^\/find_guide(?:@\w+)?\s*/i,"").trim();
  const safe=phrase.replace(/[^a-z0-9 -]/gi," ").replace(/\s+/g," ").trim();
  if(safe.length<2||safe.length>120) return ctx.reply("Usage: /find_guide <2–120 character question>");
  const lang=await getLanguage(ctx.from.id), locale=lang==="hi"?"hi-Latn":lang;
  const {data:keywords,error}=await db.from("dgbot_guide_keywords").select("guide_id,term,confidence")
    .in("language",[locale,"en"]).ilike("term","%"+safe+"%").is("deleted_at",null).order("confidence",{ascending:false}).limit(10);
  if(error) return ctx.reply(messages.en.error);
  for(const keyword of keywords??[]){
    const {data:guide}=await db.from("dgbot_guides").select("id,title").eq("id",keyword.guide_id).eq("published",true).is("deleted_at",null).maybeSingle();
    if(guide){
      const title=guide.title as Record<string,string>;
      return ctx.reply("I found a guide: "+(title[locale]??title.en??guide.id)+"\nOpen it with /guide_"+guide.id);
    }
  }
  await db.from("dgbot_review_queue").insert({phrase:safe.slice(0,120),candidate_guide_id:null,confidence:0,status:"pending"});
  await ctx.reply("I could not find a published guide for that question. Your suggestion has been sent to the Owner for review.");
});
bot.command("guides", async (ctx) => {
  if (!ctx.from || !(await isMember(ctx))) return ctx.reply(messages.en.member);
  const lang = await getLanguage(ctx.from.id);
  const { data: websiteGuides, error: websiteError } = await db.from("bot_guides").select("id,title").eq("published", true).eq("deleted", false).order("updated_at", { ascending: false }).limit(20);
  const { data: authoredGuides, error: authoredError } = await db.from("dgbot_guides").select("id,title").eq("published", true).is("deleted_at", null).order("updated_at", { ascending: false }).limit(20);
  if (websiteError || authoredError) { log.error({ websiteError, authoredError }, "Guide query failed"); return ctx.reply(messages.en.error); }
  const locale = lang === "hi" ? "hi-Latn" : lang;
  const rows = [
    ...(websiteGuides ?? []).map(g => ({ id: g.id, title: String(g.title) })),
    ...(authoredGuides ?? []).map(g => ({ id: g.id, title: String((g.title as Record<string,string>)[locale] ?? (g.title as Record<string,string>).en ?? g.id) }))
  ];
  if (!rows.length) return ctx.reply("No published guides are available yet.");
  await ctx.reply("Published guides:\n" + rows.map(g => "• " + g.title + " (/guide_" + g.id + ")").join("\n"));
});
bot.action("guides:open", async (ctx) => { await ctx.answerCbQuery(); const lang=ctx.from?await getLanguage(ctx.from.id):"en"; await ctx.reply("Use /guides to browse published guides or /find_guide <question> to search.",homeMenu(lang)); });
bot.hears(/^\/guide_([a-z0-9][a-z0-9_-]{0,30})$/, async (ctx) => {
  if (!ctx.from || !(await isMember(ctx))) return ctx.reply(messages.en.member);
  const id = ctx.match[1]!;
  const lang = await getLanguage(ctx.from.id);
  const { data: websiteGuide } = await db.from("bot_guides").select("title,data").eq("id", id).eq("published", true).eq("deleted", false).maybeSingle();
  if (websiteGuide) {
    const value = websiteGuide.data as Record<string, unknown>;
    const body = typeof value.content === "string" ? value.content : typeof value.body === "string" ? value.body : typeof value.description === "string" ? value.description : JSON.stringify(value, null, 2);
    return ctx.reply(String(websiteGuide.title) + "\n\n" + body.slice(0, textLimit));
  }
  const { data, error } = await db.from("dgbot_guides").select("title,steps,media,buttons").eq("id", id).eq("published", true).is("deleted_at", null).maybeSingle();
  if (error || !data) return ctx.reply("Guide not found.");
  const locale = lang === "hi" ? "hi-Latn" : lang;
  const title = data.title as Record<string,string>;
  const steps = data.steps as Record<string,unknown>;
  const raw = steps[locale] ?? steps.en ?? [];
  const body = Array.isArray(raw) ? raw.map((x,i) => String(i+1) + ". " + String(x)).join("\n") : String(raw);
  const media = data.media as {type?:string;file_id?:string;caption?:string}|null;
  const buttons = Array.isArray(data.buttons) ? data.buttons as Array<{text:string;url:string}> : [];
  const markup = buttons.length ? {reply_markup:{inline_keyboard:buttons.map(b => [{text:b.text,url:b.url}])}} : {};
  const heading = title[locale] ?? title.en ?? id;
  const caption = ((media?.caption ? media.caption + "\n\n" : "") + heading + "\n\n" + body).slice(0,1024);
  if (media?.file_id && media.type === "photo") return ctx.replyWithPhoto(media.file_id,{caption,...markup});
  if (media?.file_id && media.type === "video") return ctx.replyWithVideo(media.file_id,{caption,...markup});
  if (media?.file_id && media.type === "document") return ctx.replyWithDocument(media.file_id,{caption,...markup});
  if (media?.file_id && media.type === "animation") return ctx.replyWithAnimation(media.file_id,{caption,...markup});
  return ctx.reply(heading + "\n\n" + body.slice(0,textLimit), markup);
});

bot.on("left_chat_member", async (ctx) => {
  if(String(ctx.chat.id)!==runtimeMembership.groupId) return;
  const departed=ctx.message.left_chat_member;
  if(departed.is_bot) return;
  moderationActivity.delete(departed.id);
  await db.from("dgbot_user_state").delete().eq("telegram_id",departed.id);
  await writeAudit("membership.left_group",departed.id,"Member left the required group; transient state cleared");
});
bot.command("membership_status", async (ctx) => {
  if(!ctx.from) return;
  const results=await Promise.all([runtimeMembership.channelId,runtimeMembership.groupId].map(async chatId=>{
    try{
      const member=await ctx.telegram.getChatMember(chatId,ctx.from!.id);
      return ["creator","administrator","member"].includes(member.status)||(member.status==="restricted"&&member.is_member);
    }catch{return false;}
  }));
  await ctx.reply("Required channel: "+(results[0]?"joined":"not joined")+"\nRequired group: "+(results[1]?"joined":"not joined")+"\nOverall: "+(results.every(Boolean)?"verified":"verification required"));
});
bot.command("membership_set_channel", async (ctx) => {
  if(!ownerOnly(ctx)) return ctx.reply("Access denied.");
  const value=ctx.message.text.replace(/^\/membership_set_channel(?:@\w+)?\s*/i,"").trim();
  if(!value||value.length>100||!/^(@[A-Za-z0-9_]{5,32}|-?\d+)$/.test(value)) return ctx.reply("Usage: /membership_set_channel <@channelusername or numeric chat ID>");
  const {data,error}=await db.from("vextro_runtime_settings").select("value").eq("key","membership_config").maybeSingle();
  if(error) return ctx.reply("Membership settings could not be loaded.");
  const current=(data?.value??{}) as Record<string,unknown>;
  const next={...current,channelId:value};
  const {error:saveError}=await db.from("vextro_runtime_settings").upsert({key:"membership_config",value:next,updated_by:ctx.from.id,updated_at:new Date().toISOString()},{onConflict:"key"});
  if(saveError) return ctx.reply("Channel setting could not be saved.");
  runtimeMembership.channelId=value;
  await writeAudit("settings.membership_channel",null,"Required channel changed");
  await ctx.reply("Required channel updated to "+value+".");
});
bot.command("membership_set_group", async (ctx) => {
  if(!ownerOnly(ctx)) return ctx.reply("Access denied.");
  const value=ctx.message.text.replace(/^\/membership_set_group(?:@\w+)?\s*/i,"").trim();
  if(!/^-?\d+$/.test(value)) return ctx.reply("Usage: /membership_set_group <numeric Telegram group chat ID>");
  const {data,error}=await db.from("vextro_runtime_settings").select("value").eq("key","membership_config").maybeSingle();
  if(error) return ctx.reply("Membership settings could not be loaded.");
  const current=(data?.value??{}) as Record<string,unknown>;
  const next={...current,groupId:value};
  const {error:saveError}=await db.from("vextro_runtime_settings").upsert({key:"membership_config",value:next,updated_by:ctx.from.id,updated_at:new Date().toISOString()},{onConflict:"key"});
  if(saveError) return ctx.reply("Group setting could not be saved.");
  runtimeMembership.groupId=value;
  await writeAudit("settings.membership_group",null,"Required group changed");
  await ctx.reply("Required group updated to "+value+".");
});
bot.command("membership_reset", async (ctx) => {
  if(!ownerOnly(ctx)) return ctx.reply("Access denied.");
  const which=ctx.message.text.split(/\s+/)[1];
  if(which!=="channel"&&which!=="group") return ctx.reply("Usage: /membership_reset <channel|group>");
  const {data,error}=await db.from("vextro_runtime_settings").select("value").eq("key","membership_config").maybeSingle();
  if(error) return ctx.reply("Membership settings could not be loaded.");
  const current=(data?.value??{}) as Record<string,unknown>;
  if(which==="channel"){delete current.channelId;runtimeMembership.channelId=config.REQUIRED_CHANNEL_ID;}
  else{delete current.groupId;runtimeMembership.groupId=config.REQUIRED_GROUP_ID;}
  const {error:saveError}=await db.from("vextro_runtime_settings").upsert({key:"membership_config",value:current,updated_by:ctx.from.id,updated_at:new Date().toISOString()},{onConflict:"key"});
  if(saveError) return ctx.reply("Membership setting could not be reset.");
  await ctx.reply("Required "+which+" restored from environment configuration.");
});
bot.command("membership_check", async (ctx) => {
  if(!ownerOnly(ctx)) return ctx.reply("Access denied.");
  const id=Number(ctx.message.text.split(/\s+/)[1]);
  if(!Number.isSafeInteger(id)||id<1) return ctx.reply("Usage: /membership_check <telegram-id>");
  const results=await Promise.all([runtimeMembership.channelId,runtimeMembership.groupId].map(async chatId=>{
    try{const member=await ctx.telegram.getChatMember(chatId,id);return member.status+(member.status==="restricted"?(member.is_member?" (member)":" (not member)"):"");}
    catch(error){return "unavailable: "+(error instanceof Error?error.message:"unknown");}
  }));
  await ctx.reply("Membership for "+id+"\nChannel: "+results[0]+"\nGroup: "+results[1]);
});
bot.command("rules", async (ctx) => {
  if(!ctx.from||!(await isMember(ctx))) return ctx.reply(messages.en.member);
  const lang=await getLanguage(ctx.from.id), locale=lang==="hi"?"hi-Latn":lang;
  const {data,error}=await db.from("dgbot_guides").select("title,steps").eq("category","rules").eq("published",true).is("deleted_at",null).order("updated_at",{ascending:false}).limit(5);
  if(error) return ctx.reply(messages.en.error);
  if(!data?.length) return ctx.reply("Group rules have not been published yet.");
  const output=data.map(g=>{
    const title=g.title as Record<string,string>, steps=g.steps as Record<string,unknown>;
    const value=steps[locale]??steps.en??[];
    const body=Array.isArray(value)?value.map((x,i)=>(i+1)+". "+String(x)).join("\n"):String(value);
    return (title[locale]??title.en??"Rules")+"\n"+body;
  }).join("\n\n");
  await ctx.reply(output.slice(0,textLimit));
});
bot.on("new_chat_members", async (ctx) => {
  if(String(ctx.chat.id)!==runtimeMembership.groupId) return;
  const names=ctx.message.new_chat_members.filter(m=>!m.is_bot).map(m=>m.first_name).slice(0,10);
  if(!names.length) return;
  await ctx.reply("Welcome "+names.join(", ")+"! Please read /rules and start a private chat with the bot using /start to verify membership and access support.");
});
bot.action("membership:status", async (ctx) => {
  await ctx.answerCbQuery();
  if(!ctx.from) return;
  const lang=await getLanguage(ctx.from.id);
  const results=await Promise.all([runtimeMembership.channelId,runtimeMembership.groupId].map(async chatId=>{
    try{const member=await ctx.telegram.getChatMember(chatId,ctx.from!.id);return ["creator","administrator","member"].includes(member.status)||(member.status==="restricted"&&member.is_member);}
    catch{return false;}
  }));
  const lang=await getLanguage(ctx.from.id);
  await ctx.reply("Channel: "+(results[0]?"joined":"not joined")+"\nGroup: "+(results[1]?"joined":"not joined")+"\nOverall: "+(results.every(Boolean)?"verified":"verification required"),
    Markup.inlineKeyboard([[Markup.button.callback("Verify again","membership:verify")],[Markup.button.callback(menuLabels[lang].home,"menu:home")]]));
});
bot.action("tickets:mine", async (ctx) => {
  await ctx.answerCbQuery();
  if(!ctx.from||!(await isMember(ctx))) return ctx.reply(messages.en.member);
  const {data,error}=await db.from("bot_support_tickets").select("id,subject,status,priority").eq("telegram_id",ctx.from.id).order("created_at",{ascending:false}).limit(10);
  if(error) return ctx.reply(messages.en.error);
  return ctx.reply(data?.length?data.map(t=>"["+t.status+"] "+t.subject+"\n"+t.id+" | "+t.priority).join("\n\n"):"You have no support tickets yet.",homeMenu(await getLanguage(ctx.from.id)));
});
bot.action("rules:open", async (ctx) => { await ctx.answerCbQuery(); const lang=ctx.from?await getLanguage(ctx.from.id):"en"; await ctx.reply("Use /rules to read the published group rules.",homeMenu(lang)); });
bot.action("about:open", async (ctx) => { await ctx.answerCbQuery(); const lang=ctx.from?await getLanguage(ctx.from.id):"en"; await ctx.reply("VEXTRO BOT\nA Telegram companion for account linking, guides and support.\nLanguages: English, Hindi (Roman), Vietnamese.\nUse /help for commands and /support to contact the Owner.",homeMenu(lang)); });
bot.action("menu:home", async (ctx) => {
  await ctx.answerCbQuery();
  const lang=ctx.from?await getLanguage(ctx.from.id):"en";
  await ctx.reply(await getWelcome(lang),mainMenu(lang));
});
bot.command("about", async (ctx) => ctx.reply("VEXTRO BOT\nTelegram account linking, multilingual guides, group membership verification and support.\nLanguages: English, Hindi (Roman), Vietnamese."));
bot.command("help", async (ctx) => ctx.reply(messages.en.help));
bot.action("help:open", async (ctx) => { await ctx.answerCbQuery(); const lang=ctx.from?await getLanguage(ctx.from.id):"en"; await ctx.reply(messages[lang].help,homeMenu(lang)); });
bot.action("support:help", async (ctx) => { await ctx.answerCbQuery(); const lang=ctx.from?await getLanguage(ctx.from.id):"en"; await ctx.reply(messages[lang].support,homeMenu(lang)); });

bot.command("users", async (ctx) => {
  if (!ownerOnly(ctx)) return ctx.reply("Access denied.");
  const page = Math.max(1, Number(ctx.message.text.split(/\s+/)[1]) || 1);
  const { data, error } = await db.from("bot_users").select("telegram_id,language,created_at,updated_at").order("updated_at", { ascending: false }).range((page-1)*20,page*20-1);
  if (error) return ctx.reply("User list unavailable.");
  if (!data?.length) return ctx.reply(page===1?"No registered users.":"No users on this page.");
  await ctx.reply("Users — page "+page+"\n"+data.map((user) => user.telegram_id + " | " + user.language + " | " + new Date(user.updated_at).toLocaleDateString()).join("\n")+"\nNext: /users "+(page+1));
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

bot.command("welcome_set", async (ctx) => {
  if(!ownerOnly(ctx)) return ctx.reply("Access denied.");
  const m=ctx.message.text.match(/^\/welcome_set(?:@\w+)?\s+(en|hi|vi)\s+([\s\S]+)$/i);
  if(!m) return ctx.reply("Usage: /welcome_set <en|hi|vi> <welcome text, max 1000 characters>");
  const value=m[2]!.trim();
  if(!value||value.length>1000) return ctx.reply("Welcome text must be 1–1000 characters.");
  const {data}=await db.from("vextro_runtime_settings").select("value").eq("key","welcome_messages").maybeSingle();
  const current=(data?.value??{}) as Record<string,unknown>;
  const updated={...current,[m[1]!]:value};
  const {error}=await db.from("vextro_runtime_settings").upsert({key:"welcome_messages",value:updated,updated_by:ctx.from.id,updated_at:new Date().toISOString()},{onConflict:"key"});
  if(error) return ctx.reply("Welcome text could not be saved.");
  await writeAudit("settings.welcome_updated",null,"Welcome text updated for "+m[1]);
  await ctx.reply("Welcome message saved for "+m[1]+".");
});
bot.command("welcome_preview", async (ctx) => {
  if(!ownerOnly(ctx)) return ctx.reply("Access denied.");
  const lang=(ctx.message.text.split(/\s+/)[1]??"en") as Lang;
  if(!["en","hi","vi"].includes(lang)) return ctx.reply("Usage: /welcome_preview <en|hi|vi>");
  await ctx.reply(await getWelcome(lang));
});
bot.command("welcome_reset", async (ctx) => {
  if(!ownerOnly(ctx)) return ctx.reply("Access denied.");
  const lang=ctx.message.text.split(/\s+/)[1] as Lang;
  if(!["en","hi","vi"].includes(lang)) return ctx.reply("Usage: /welcome_reset <en|hi|vi>");
  const {data}=await db.from("vextro_runtime_settings").select("value").eq("key","welcome_messages").maybeSingle();
  const current=(data?.value??{}) as Record<string,unknown>;
  delete current[lang];
  const {error}=await db.from("vextro_runtime_settings").upsert({key:"welcome_messages",value:current,updated_by:ctx.from.id,updated_at:new Date().toISOString()},{onConflict:"key"});
  if(error) return ctx.reply("Welcome message reset failed.");
  await ctx.reply("Default welcome restored for "+lang+".");
});
bot.command("language_stats", async (ctx) => {
  if(!ownerOnly(ctx)) return ctx.reply("Access denied.");
  const [{count:en},{count:hi},{count:vi}]=await Promise.all([
    db.from("bot_users").select("*",{count:"exact",head:true}).eq("language","en"),
    db.from("bot_users").select("*",{count:"exact",head:true}).eq("language","hi"),
    db.from("bot_users").select("*",{count:"exact",head:true}).eq("language","vi")
  ]);
  await ctx.reply("Language distribution\nEnglish: "+(en??0)+"\nHindi (Roman): "+(hi??0)+"\nVietnamese: "+(vi??0));
});
bot.command("user_language", async (ctx) => {
  if(!ownerOnly(ctx)) return ctx.reply("Access denied.");
  const m=ctx.message.text.match(/^\/user_language(?:@\w+)?\s+(\d+)\s+(en|hi|vi)$/i);
  if(!m) return ctx.reply("Usage: /user_language <telegram-id> <en|hi|vi>");
  const id=Number(m[1]);
  const {data,error}=await db.from("bot_users").update({language:m[2],updated_at:new Date().toISOString()}).eq("telegram_id",id).select("telegram_id").maybeSingle();
  if(error||!data) return ctx.reply("Registered user not found or language update failed.");
  await writeAudit("user.language_changed",id,"Owner set language to "+m[2]);
  await ctx.reply("Language updated for "+id+".");
});
bot.command("bot_status", async (ctx) => {
  if(!ownerOnly(ctx)) return ctx.reply("Access denied.");
  const memory=process.memoryUsage();
  await ctx.reply("VEXTRO BOT runtime status\nUptime: "+Math.floor(process.uptime()/60)+" minutes\nNode: "+process.version+
    "\nMemory RSS: "+Math.round(memory.rss/1024/1024)+" MB\nPublishing: "+(config.PUBLISH_CHANNEL_ID?"configured":"disabled")+
    "\nEncrypted backups: "+(config.BACKUP_PASSPHRASE?"configured":"not configured")+
    "\nMaintenance: "+(maintenanceMode?"ON":"OFF"));
});
bot.command("settings", async (ctx) => {
  if (!ownerOnly(ctx)) return ctx.reply("Access denied.");
  await ctx.reply(
    "VEXTRO BOT settings\nOwner-only administration: enabled\nRequired channel: " + runtimeMembership.channelId +
    "\nRequired group: " + runtimeMembership.groupId +
    "\nPublish channel: " + (config.PUBLISH_CHANNEL_ID ?? "not configured") +
    "\nWebsite: " + config.WEBSITE_URL +
    "\nOwner timezone: " + config.OWNER_TIMEZONE +
    "\nBackup interval: " + config.BACKUP_INTERVAL_HOURS + " hours" +
    "\nBackup retention: " + config.BACKUP_RETENTION_DAYS + " days" +
    "\nBackup passphrase: " + (config.BACKUP_PASSPHRASE ? "configured" : "not configured") +
    "\nOffsite endpoint: " + (config.BACKUP_OFFSITE_URL && config.BACKUP_OFFSITE_TOKEN ? "configured" : "not configured") +
    "\nRelease repository: " + config.GITHUB_REPOSITORY +
    "\nDeployment webhook: " + (config.DEPLOY_WEBHOOK_URL ? "configured" : "not configured") +
    "\nNo secrets are displayed."
  );
});

bot.command("logs", async (ctx) => {
  if(!ownerOnly(ctx)) return ctx.reply("Access denied.");
  if(!recentLogs.length) return ctx.reply("No runtime log entries are buffered yet. Full process logs remain available in the hosting console.");
  const rows=recentLogs.slice(-15).map(line=>{
    try{
      const item=JSON.parse(line) as Record<string,unknown>;
      return new Date(Number(item.time??Date.now())).toISOString()+" ["+item.level+"] "+String(item.msg??"")+
        (item.err?"\n"+JSON.stringify(item.err):"");
    }catch{return line;}
  });
  await ctx.reply(rows.join("\n\n").slice(-3900));
});
bot.command("log_search", async (ctx) => {
  if(!ownerOnly(ctx)) return ctx.reply("Access denied.");
  const term=ctx.message.text.replace(/^\/log_search(?:@\w+)?\s*/i,"").trim().toLowerCase();
  if(term.length<2||term.length>80) return ctx.reply("Usage: /log_search <2–80 character term>");
  const matches=recentLogs.filter(line=>line.toLowerCase().includes(term)).slice(-15);
  await ctx.reply(matches.length?matches.join("\n").slice(-3900):"No buffered log entries matched.");
});
bot.command("audit_search", async (ctx) => {
  if(!ownerOnly(ctx)) return ctx.reply("Access denied.");
  const term=ctx.message.text.replace(/^\/audit_search(?:@\w+)?\s*/i,"").trim();
  const safeTerm=term.replace(/[^a-z0-9 _.-]/gi,"");
  if(safeTerm.length<2||safeTerm.length>60) return ctx.reply("Usage: /audit_search <action or reason>");
  const {data,error}=await db.from("dgbot_audit_log").select("action,actor_id,target_id,reason,created_at").or("action.ilike.%"+safeTerm+"%,reason.ilike.%"+safeTerm+"%").order("created_at",{ascending:false}).limit(20);
  if(error) return ctx.reply("Audit search unavailable.");
  await ctx.reply(data?.length?data.map(x=>x.action+" | target "+(x.target_id??"—")+"\n"+x.reason+"\n"+new Date(x.created_at).toLocaleString()).join("\n\n"):"No matching audit events.");
});
bot.command("moderation_stats", async (ctx) => {
  if(!ownerOnly(ctx)) return ctx.reply("Access denied.");
  const [{count:warnings},{count:restricted},{count:rules}]=await Promise.all([
    db.from("vextro_moderation_events").select("*",{count:"exact",head:true}).eq("event_type","warning").gte("created_at",new Date(Date.now()-24*3600_000).toISOString()),
    db.from("vextro_moderation_events").select("*",{count:"exact",head:true}).eq("event_type","restricted").gte("created_at",new Date(Date.now()-24*3600_000).toISOString()),
    db.from("dgbot_moderation_rules").select("*",{count:"exact",head:true}).is("deleted_at",null)
  ]);
  await ctx.reply("Moderation last 24 hours\nWarnings/deletions: "+(warnings??0)+"\nRestrictions: "+(restricted??0)+"\nActive rules: "+(rules??0));
});
bot.command("analytics", async (ctx) => {
  if (!ownerOnly(ctx)) return ctx.reply("Access denied.");
  const since = new Date(Date.now() - 24 * 3600_000).toISOString();
  const [users, links, tickets, posts, backups, broadcastJobs, sent, failed, scheduled, warnings] = await Promise.all([
    db.from("bot_users").select("*", { count: "exact", head: true }),
    db.from("bot_account_links").select("*", { count: "exact", head: true }).is("unlinked_at", null),
    db.from("bot_support_tickets").select("*", { count: "exact", head: true }).neq("status", "closed"),
    db.from("dgbot_posts").select("*", { count: "exact", head: true }).eq("state", "published").is("deleted_at", null),
    db.from("vextro_backup_artifacts").select("*", { count: "exact", head: true }).not("verified_at", "is", null),
    db.from("vextro_broadcast_jobs").select("*", { count: "exact", head: true }),
    db.from("vextro_broadcast_recipients").select("*", { count: "exact", head: true }).eq("status", "sent"),
    db.from("vextro_broadcast_recipients").select("*", { count: "exact", head: true }).eq("status", "failed"),
    db.from("vextro_scheduled_posts").select("*", { count: "exact", head: true }).eq("status", "scheduled"),
    db.from("vextro_moderation_events").select("*", { count: "exact", head: true }).eq("event_type", "warning").gte("created_at", since)
  ]);
  const errors = [users.error, links.error, tickets.error, posts.error, backups.error, broadcastJobs.error, sent.error, failed.error, scheduled.error, warnings.error].filter(Boolean);
  if (errors.length) { log.error({ errors }, "Analytics query failed"); return ctx.reply("Analytics are temporarily unavailable."); }
  await ctx.reply("VEXTRO BOT Analytics\nRegistered users: " + (users.count ?? 0) +
    "\nLinked accounts: " + (links.count ?? 0) + "\nOpen support tickets: " + (tickets.count ?? 0) +
    "\nPublished channel posts: " + (posts.count ?? 0) + "\nVerified encrypted backups: " + (backups.count ?? 0) +
    "\nBroadcast jobs: " + (broadcastJobs.count ?? 0) + "\nBroadcast messages sent: " + (sent.count ?? 0) +
    "\nBroadcast deliveries failed: " + (failed.count ?? 0) + "\nScheduled posts pending: " + (scheduled.count ?? 0) +
    "\nModeration warnings last 24h: " + (warnings.count ?? 0));
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
  const id=ctx.message.text.split(/\s+/)[1];
  if(!id) return ctx.reply("Usage: /backup_verify <backup-uuid>");
  const result=await verifyBackup(id);
  await ctx.reply(result.valid?`Backup ${id} integrity and decryption verified.`:`Verification failed: ${result.error}`);
});
bot.command("backup_restore_confirm", async (ctx) => {
  if(!ownerOnly(ctx)) return ctx.reply("Access denied.");
  const id=ctx.message.text.split(/\s+/)[1];
  if(!id) return ctx.reply("Usage: /backup_restore_confirm <backup-uuid>");
  try {
    await ctx.reply("Restore started. A fresh safety backup will be created first. Website-owned guides and account-link records will be preserved.");
    const report=await restoreBackup(id,ctx.from.id);
    await writeAudit("backup.restored",null,"Restored backup "+id+"; rows: "+JSON.stringify(report.restored).slice(0,140)+"; skipped: "+report.skipped.join(","));
    await ctx.reply("Restore completed. Row counts by table:\n"+Object.entries(report.restored).map(([name,count])=>name+": "+count).join("\n")+
      "\nProtected website-owned tables skipped:\n"+(report.skipped.join(", ")||"none"));
  } catch(error) {
    log.error({err:error,backupId:id},"Backup restore failed");
    await ctx.reply("Restore failed: "+(error instanceof Error?error.message:"unknown error"));
  }
});
bot.command("backup_status", async (ctx) => {
  if (!ownerOnly(ctx)) return ctx.reply("Access denied.");
  try {
    const [artifacts, legacy] = await Promise.all([
      listBackups(),
      db.from("dgbot_backup_runs").select("*", { count: "exact", head: true }).eq("status", "failed")
    ]);
    if (legacy.error) throw legacy.error;
    const latest = artifacts[0];
    await ctx.reply("Encrypted application backup status\nLatest verified artifact: " +
      (latest ? new Date(latest.created_at).toLocaleString() + " | " + latest.bytes + " bytes | " + (latest.verified_at ? "verified" : "not verified") : "none") +
      "\nOffsite copy: " + (latest?.offsite_verified_at ? "verified" : latest?.offsite_error ? "failed: " + latest.offsite_error : config.BACKUP_OFFSITE_URL ? "not verified" : "not configured") +
      "\nAvailable artifacts: " + artifacts.length + "\nLegacy backup failures recorded: " + (legacy.count ?? 0) +
      "\nAutomatic encrypted backup runs every " + config.BACKUP_INTERVAL_HOURS + " hours when BACKUP_PASSPHRASE is configured.");
  } catch (error) {
    log.error({err:error},"Backup status failed");
    await ctx.reply("Backup status unavailable: " + (error instanceof Error ? error.message : "unknown error"));
  }
});
bot.command("backup_runs", async (ctx) => {
  if (!ownerOnly(ctx)) return ctx.reply("Access denied.");
  try {
    const [artifacts, legacy] = await Promise.all([
      listBackups(),
      db.from("dgbot_backup_runs").select("id,status,trigger,started_at,error_code").order("created_at",{ascending:false}).limit(5)
    ]);
    if (legacy.error) throw legacy.error;
    const current = artifacts.map(x => x.id + " | encrypted | " + x.bytes + " bytes\n" + new Date(x.created_at).toLocaleString() + " | " + (x.verified_at ? "verified" : "unverified"));
    const previous = (legacy.data ?? []).map(x => "Legacy #" + x.id + " | " + x.status + "/" + x.trigger + "\n" + new Date(x.started_at).toLocaleString() + " | " + (x.error_code ?? "no error"));
    const rows = [...current, ...previous].slice(0,15);
    await ctx.reply(rows.length ? rows.join("\n\n") : "No backup history.");
  } catch (error) {
    log.error({err:error},"Backup history failed");
    await ctx.reply("Backup history unavailable.");
  }
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
  return ctx.reply("Moderation rule added: #" + data.id + ". Text messages in the required group are checked automatically; media captions are checked separately.");
});
bot.command("moderation_edit", async (ctx) => {
  if(!ownerOnly(ctx)) return ctx.reply("Access denied.");
  const m=ctx.message.text.match(/^\/moderation_edit(?:@\w+)?\s+(\d+)\s+(blocked_host|blocked_phrase)\s+([\s\S]+)$/i);
  if(!m) return ctx.reply("Usage: /moderation_edit <rule-id> <blocked_host|blocked_phrase> <new value>");
  const id=Number(m[1]),kind=m[2]!.toLowerCase(),value=m[3]!.trim();
  if(!Number.isSafeInteger(id)||id<1||!value||value.length>200) return ctx.reply("Invalid rule ID or value.");
  if(kind==="blocked_host"&&!/^[a-z0-9.-]{1,253}$/i.test(value)) return ctx.reply("Blocked host must be a hostname without URL or path.");
  const {data,error}=await db.from("dgbot_moderation_rules").update({kind,value}).eq("id",id).is("deleted_at",null).select("id").maybeSingle();
  if(error||!data) return ctx.reply("Active moderation rule not found or update failed.");
  await writeAudit("moderation.rule_updated",null,"Rule #"+id+" updated");
  await ctx.reply("Moderation rule #"+id+" updated.");
});
bot.command("allow_hosts", async (ctx) => {
  if(!ownerOnly(ctx)) return ctx.reply("Access denied.");
  const {data,error}=await db.from("dgbot_allowlist").select("id,host,include_subdomains,account").is("deleted_at",null).order("created_at",{ascending:false}).limit(50);
  if(error) return ctx.reply("Allowlist unavailable.");
  await ctx.reply(data?.length?data.map(x=>"#"+x.id+" "+x.host+(x.include_subdomains?" (+ subdomains)":"")+(x.account?" | "+x.account:"")).join("\n"):"No allowed hosts.");
});
bot.command("allow_host", async (ctx) => {
  if(!ownerOnly(ctx)) return ctx.reply("Access denied.");
  const m=ctx.message.text.match(/^\/allow_host(?:@\w+)?\s+([a-z0-9.-]{1,253})(?:\s+(subdomains))?$/i);
  if(!m||m[1]!.includes("..")||m[1]!.startsWith(".")||m[1]!.endsWith(".")) return ctx.reply("Usage: /allow_host <hostname> [subdomains]");
  const {data,error}=await db.from("dgbot_allowlist").insert({host:m[1]!.toLowerCase(),include_subdomains:Boolean(m[2])}).select("id").single();
  if(error||!data) return ctx.reply("Could not add allowed host.");
  await writeAudit("moderation.allow_host",null,m[1]!); await ctx.reply("Allowed host added: #"+data.id);
});
bot.command("edit_allow_host", async (ctx) => {
  if(!ownerOnly(ctx)) return ctx.reply("Access denied.");
  const m=ctx.message.text.match(/^\/edit_allow_host(?:@\w+)?\s+(\d+)\s+([a-z0-9.-]{1,253})(?:\s+(subdomains))?$/i);
  if(!m||m[2]!.includes("..")||m[2]!.startsWith(".")||m[2]!.endsWith(".")) return ctx.reply("Usage: /edit_allow_host <id> <hostname> [subdomains]");
  const id=Number(m[1]); if(!Number.isSafeInteger(id)||id<1) return ctx.reply("Invalid allowlist ID.");
  const {data,error}=await db.from("dgbot_allowlist").update({host:m[2]!.toLowerCase(),include_subdomains:Boolean(m[3])}).eq("id",id).is("deleted_at",null).select("id").maybeSingle();
  if(error||!data) return ctx.reply("Active allowed host not found or update failed.");
  await writeAudit("moderation.allow_host_updated",null,String(id));
  await ctx.reply("Allowed host #"+id+" updated.");
});
bot.command("remove_allow_host", async (ctx) => {
  if(!ownerOnly(ctx)) return ctx.reply("Access denied.");
  const id=Number(ctx.message.text.split(/\s+/)[1]);
  if(!Number.isSafeInteger(id)||id<1) return ctx.reply("Usage: /remove_allow_host <id>");
  const {data,error}=await db.from("dgbot_allowlist").update({deleted_at:new Date().toISOString()}).eq("id",id).is("deleted_at",null).select("id").maybeSingle();
  if(error||!data) return ctx.reply("Active allowed host not found.");
  await writeAudit("moderation.allow_host_removed",null,String(id)); await ctx.reply("Allowed host removed.");
});
bot.command("group_ban", async (ctx) => {
  if(!ownerOnly(ctx)) return ctx.reply("Access denied.");
  const m=ctx.message.text.match(/^\/group_ban(?:@\w+)?\s+(\d+)\s+([\s\S]+)$/i);
  if(!m) return ctx.reply("Usage: /group_ban <telegram-id> <reason>");
  const id=Number(m[1]); if(!Number.isSafeInteger(id)||id<1||id===config.OWNER_TELEGRAM_ID) return ctx.reply("Invalid target.");
  try{await ctx.telegram.banChatMember(runtimeMembership.groupId,id);await writeAudit("moderation.group_ban",id,m[2]!.slice(0,200));await ctx.reply("User banned from required group.");}
  catch(error){log.error({err:error,targetId:id},"Group ban failed");await ctx.reply("Group ban failed. Verify bot admin permissions.");}
});
bot.command("group_unban", async (ctx) => {
  if(!ownerOnly(ctx)) return ctx.reply("Access denied.");
  const id=Number(ctx.message.text.split(/\s+/)[1]);
  if(!Number.isSafeInteger(id)||id<1) return ctx.reply("Usage: /group_unban <telegram-id>");
  try{await ctx.telegram.unbanChatMember(runtimeMembership.groupId,id,{only_if_banned:true});await writeAudit("moderation.group_unban",id,"Owner lifted group ban");await ctx.reply("User unbanned from required group.");}
  catch(error){log.error({err:error,targetId:id},"Group unban failed");await ctx.reply("Group unban failed. Verify bot admin permissions.");}
});
bot.command("mute_user", async (ctx) => {
  if(!ownerOnly(ctx)) return ctx.reply("Access denied.");
  const m=ctx.message.text.match(/^\/mute_user(?:@\w+)?\s+(\d+)\s+(\d{1,4})\s+([\s\S]+)$/i);
  if(!m) return ctx.reply("Usage: /mute_user <telegram-id> <minutes 1-1440> <reason>");
  const id=Number(m[1]),minutes=Number(m[2]);
  if(!Number.isSafeInteger(id)||id<1||id===config.OWNER_TELEGRAM_ID||minutes<1||minutes>1440) return ctx.reply("Invalid target or mute duration.");
  try{await ctx.telegram.callApi("restrictChatMember",{chat_id:runtimeMembership.groupId,user_id:id,permissions:{can_send_messages:false},until_date:Math.floor(Date.now()/1000)+minutes*60});
    await writeAudit("moderation.mute",id,m[3]!.slice(0,200));await ctx.reply("User muted for "+minutes+" minutes.");}
  catch(error){log.error({err:error,targetId:id},"Group mute failed");await ctx.reply("Mute failed. Verify bot admin permissions.");}
});
bot.command("unmute_user", async (ctx) => {
  if(!ownerOnly(ctx)) return ctx.reply("Access denied.");
  const id=Number(ctx.message.text.split(/\s+/)[1]);
  if(!Number.isSafeInteger(id)||id<1) return ctx.reply("Usage: /unmute_user <telegram-id>");
  try {
    await ctx.telegram.callApi("restrictChatMember",{chat_id:runtimeMembership.groupId,user_id:id,permissions:{
      can_send_messages:true,can_send_audios:true,can_send_documents:true,can_send_photos:true,can_send_videos:true,
      can_send_video_notes:true,can_send_voice_notes:true,can_send_polls:true,can_send_other_messages:true,
      can_add_web_page_previews:true,can_invite_users:true
    }});
    await db.from("vextro_moderation_events").insert({telegram_id:id,chat_id:Number(runtimeMembership.groupId),event_type:"released",reason:"Owner manually unmuted user"});
    await writeAudit("moderation.unmute",id,"Owner manually unmuted user");
    await ctx.reply("User unmuted in the required group.");
  } catch(error) { log.error({err:error,targetId:id},"Group unmute failed"); await ctx.reply("Unmute failed. Verify bot admin permissions."); }
});
bot.command("warn_user", async (ctx) => {
  if(!ownerOnly(ctx)) return ctx.reply("Access denied.");
  const m=ctx.message.text.match(/^\/warn_user(?:@\w+)?\s+(\d+)\s+([\s\S]+)$/i);
  if(!m) return ctx.reply("Usage: /warn_user <telegram-id> <reason>");
  const id=Number(m[1]);
  if(!Number.isSafeInteger(id)||id<1||id===config.OWNER_TELEGRAM_ID) return ctx.reply("Invalid target.");
  const {error}=await db.from("vextro_moderation_events").insert({telegram_id:id,chat_id:Number(runtimeMembership.groupId),event_type:"warning",reason:m[2]!.slice(0,200)});
  if(error) return ctx.reply("Warning could not be recorded.");
  await writeAudit("moderation.manual_warning",id,m[2]!.slice(0,200));
  try { await bot.telegram.sendMessage(id,"You received a moderation warning in the VEXTRO group: "+m[2]!.slice(0,500)); } catch {}
  await ctx.reply("Moderation warning recorded.");
});
bot.command("moderation_remove", async (ctx) => {
  if (!ownerOnly(ctx)) return ctx.reply("Access denied.");
  const id = Number(ctx.message.text.split(/\s+/)[1]);
  if (!Number.isSafeInteger(id) || id < 1) return ctx.reply("Usage: /moderation_remove <rule-id>");
  const { data, error } = await db.from("dgbot_moderation_rules").update({ deleted_at: new Date().toISOString() }).eq("id", id).is("deleted_at", null).select("id").maybeSingle();
  if (error || !data) return ctx.reply("Active rule not found.");
  await ctx.reply("Moderation rule #" + id + " removed.");
});

bot.command("health", async (ctx) => {
  if (!ownerOnly(ctx)) return ctx.reply("Access denied.");
  const report=await runHealthCheck(bot);
  await ctx.reply("Health check at "+report.checkedAt+"\n"+report.detail.join("\n"));
});
bot.command("maintenance_on", async (ctx) => {
  if(!ownerOnly(ctx)) return ctx.reply("Access denied.");
  const {error}=await db.from("vextro_runtime_settings").upsert({key:"maintenance",value:{enabled:true},updated_by:ctx.from.id,updated_at:new Date().toISOString()},{onConflict:"key"});
  if(error) return ctx.reply("Could not persist maintenance mode.");
  maintenanceMode=true; await writeAudit("maintenance.enabled",null,"Owner enabled maintenance mode");
  await ctx.reply("Maintenance mode enabled. Users are temporarily blocked; Owner access remains available.");
});
bot.command("maintenance_off", async (ctx) => {
  if(!ownerOnly(ctx)) return ctx.reply("Access denied.");
  const {error}=await db.from("vextro_runtime_settings").upsert({key:"maintenance",value:{enabled:false},updated_by:ctx.from.id,updated_at:new Date().toISOString()},{onConflict:"key"});
  if(error) return ctx.reply("Could not persist maintenance mode.");
  maintenanceMode=false; await writeAudit("maintenance.disabled",null,"Owner disabled maintenance mode");
  await ctx.reply("Maintenance mode disabled.");
});
bot.command("maintenance_status", async (ctx) => {
  if(!ownerOnly(ctx)) return ctx.reply("Access denied.");
  await ctx.reply("Maintenance mode: "+(maintenanceMode?"ON":"OFF"));
});
bot.command("admin_help", async (ctx) => {
  if(!ownerOnly(ctx)) return ctx.reply("Access denied.");
  const sections = [
    "USERS\n/users <page> | /user <id> | /ban_user <id> | /unban_user <id> | /user_language <id> <en|hi|vi> | /language_stats",
    "SUPPORT\n/tickets <page> | /ticket <uuid> | /ticket_history <uuid> | /reply <uuid> <message> | /ticket_priority <uuid> <priority> | /ticket_category <uuid> <category> | /ticket_note <uuid> <note> | /ticket_search <term> | /reopen_ticket <uuid> | /close_ticket <uuid>",
    "CONTENT\n/posts <page> | /post_draft <title> | /post_edit <uuid> <title+body> | /post_media <uuid> <type> <file-id> | /post_format <uuid> <plain|html|markdownv2> | /post_buttons <uuid> <label|url lines> | /post_preview <uuid> | /post_publish <uuid> | /post_reconcile <uuid> published <message-id> OR draft | /post_schedule <uuid> <ISO time> | /post_schedules | /post_schedule_cancel <uuid> | /post_schedule_retry <uuid>",
    "GUIDES\n/guide_list | /guide_create <id> <category> <title> | /guide_edit <id> <language> <title|steps> | /guide_preview <id> [language] | /guide_media <id> <type> <file-id> | /guide_buttons <id> <label|url> | /guide_publish <id> | /guide_unpublish <id> | /guide_delete <id> | /guide_keyword <id> <language> <term> | /guide_review | /guide_review_approve | /guide_review_reject | /welcome_set | /welcome_preview | /welcome_reset",
    "BROADCASTS\n/broadcasts | /broadcast_draft | /broadcast_edit | /broadcast_format | /broadcast_delete | /broadcast_preview | /broadcast_test | /broadcast_schedule | /broadcast_confirm | /broadcast_pause | /broadcast_resume | /broadcast_cancel | /broadcast_retry | /broadcast_status",
    "MODERATION\n/moderation_rules | /moderation_add | /moderation_edit | /moderation_remove | /allow_hosts | /allow_host | /edit_allow_host | /remove_allow_host | /warn_user | /mute_user | /unmute_user | /group_ban | /group_unban | /moderation_stats",
    "OPERATIONS\n/admin_menu | /analytics | /bot_status | /settings | /logs | /log_search | /audit_recent | /audit_search | /health | /membership_check | /membership_set_channel | /membership_set_group | /membership_reset | /maintenance_on | /maintenance_off | /maintenance_status | /backup_create | /backup_list | /backup_verify | /backup_restore_confirm | /backup_status | /backup_runs | /update_check | /update_approve | /update_install | /update_rollback | /update_status"
  ];
  for(const section of sections) await ctx.reply(section);
});
bot.command("admin", async (ctx) => {
  if (!ownerOnly(ctx)) return ctx.reply("Access denied.");
  const [{ count: users, error: userError }, { count: openTickets, error: ticketError }] = await Promise.all([
    db.from("bot_users").select("*", { count: "exact", head: true }),
    db.from("bot_support_tickets").select("*", { count: "exact", head: true }).neq("status", "closed")
  ]);
  if (userError || ticketError) { log.error({ userError, ticketError }, "Owner dashboard query failed"); return ctx.reply("Dashboard is temporarily unavailable."); }
  await ctx.reply("VEXTRO BOT Owner Dashboard\nRegistered users: " + (users ?? 0) + "\nOpen tickets: " + (openTickets ?? 0) + "\n\nUse /admin_help for the complete command reference or /admin_menu for the control center.");
});

// Text replies are routed only to the sender's most recent active ticket; commands are never intercepted.

bot.on("text", async (ctx, next) => {
  if (ctx.chat.type === "private" || String(ctx.chat.id) !== runtimeMembership.groupId || !ctx.from || ctx.from.is_bot || ownerOnly(ctx)) return next();
  try {
    const { data: rules, error } = await db.from("dgbot_moderation_rules").select("kind,value").is("deleted_at", null).limit(250);
    if (error) throw error;
    const body = ctx.message.text.toLocaleLowerCase();
    const hosts = [...ctx.message.text.matchAll(/https?:\/\/[^\s<>()]+/gi)].map((m) => {
      try { return new URL(m[0]).hostname.toLowerCase().replace(/^www\./, ""); } catch { return ""; }
    }).filter(Boolean);
    const { data: allowlist, error: allowError } = await db.from("dgbot_allowlist").select("host,include_subdomains").is("deleted_at", null).limit(500);
    if (allowError) throw allowError;
    const isAllowedHost = (host: string) => (allowlist ?? []).some(item => {
      const allowed = String(item.host).toLowerCase();
      return host === allowed || (item.include_subdomains && host.endsWith("." + allowed));
    });
    const matched = (rules ?? []).find((rule) => {
      const value = String(rule.value).toLocaleLowerCase();
      return rule.kind === "blocked_phrase" ? body.includes(value)
        : rule.kind === "blocked_host" ? hosts.some((host) => (host === value || host.endsWith("." + value)) && !isAllowedHost(host)) : false;
    });
    const now=Date.now();
    const activity=moderationActivity.get(ctx.from.id) ?? {times:[],lastText:"",repeats:0};
    activity.times=activity.times.filter(t=>now-t<10_000);
    activity.times.push(now);
    if(body===activity.lastText) activity.repeats+=1; else {activity.lastText=body;activity.repeats=1;}
    moderationActivity.set(ctx.from.id,activity);
    while (moderationActivity.size > 5000) {
      const oldest = moderationActivity.keys().next().value;
      if (oldest === undefined) break;
      moderationActivity.delete(oldest);
    }
    const flood=activity.times.length>5 || activity.repeats>=3;
    if (!matched && !flood) return next();
    const reason=matched?String(matched.kind)+": "+String(matched.value).slice(0,150):"rate_limit_or_repeated_message";
    try { await ctx.deleteMessage(); } catch (deleteError) { log.warn({ err: deleteError }, "Moderation delete failed"); }
    await db.from("vextro_moderation_events").insert({telegram_id:ctx.from.id,chat_id:ctx.chat.id,event_type:"warning",reason});
    const {count:priorWarnings}=await db.from("vextro_moderation_events").select("*",{count:"exact",head:true})
      .eq("telegram_id",ctx.from.id).eq("chat_id",ctx.chat.id).eq("event_type","warning")
      .gte("created_at",new Date(now-24*3600_000).toISOString());
    if((priorWarnings??0)>=3){
      try {
        await ctx.telegram.callApi("restrictChatMember",{chat_id:ctx.chat.id,user_id:ctx.from.id,permissions:{can_send_messages:false},until_date:Math.floor(now/1000)+3600});
        await db.from("vextro_moderation_events").insert({telegram_id:ctx.from.id,chat_id:ctx.chat.id,event_type:"restricted",reason:"three moderation warnings within 24 hours"});
        try{await ctx.reply("You have been restricted for one hour after repeated moderation violations.");}catch{}
      } catch(restrictError) { log.warn({err:restrictError,userId:ctx.from.id},"Automatic restriction failed; verify bot admin permissions"); }
    } else {
      try { await ctx.reply(matched?"Your message was removed because it matched a group moderation rule.":"Please slow down. Repeated or rapid messages are not allowed."); } catch {}
    }
    await writeAudit("moderation.message_removed", ctx.from.id, reason);
  } catch (error) {
    log.error({ err: error }, "Group moderation check failed; message was not removed");
    return next();
  }
});

bot.on("message", async (ctx, next) => {
  if (String(ctx.chat.id) !== config.REQUIRED_GROUP_ID || !ctx.from || ctx.from.is_bot || ownerOnly(ctx)) return next();
  const message = ctx.message as unknown as { caption?: string };
  const caption = (message.caption ?? "").trim();
  if (!caption) return next();
  try {
    const [{data:rules,error:ruleError},{data:allowlist,error:allowError}]=await Promise.all([
      db.from("dgbot_moderation_rules").select("kind,value").is("deleted_at",null).limit(250),
      db.from("dgbot_allowlist").select("host,include_subdomains").is("deleted_at",null).limit(500)
    ]);
    if(ruleError||allowError) throw ruleError??allowError;
    const body=caption.toLocaleLowerCase();
    const hosts=[...caption.matchAll(/https?:\/\/[^\s<>()]+/gi)].map(m=>{try{return new URL(m[0]).hostname.toLowerCase().replace(/^www\./,"");}catch{return "";}}).filter(Boolean);
    const allowed=(host:string)=>(allowlist??[]).some(item=>host===String(item.host).toLowerCase()||(item.include_subdomains&&host.endsWith("."+String(item.host).toLowerCase())));
    const matched=(rules??[]).find(rule=>{
      const value=String(rule.value).toLocaleLowerCase();
      return rule.kind==="blocked_phrase"?body.includes(value):rule.kind==="blocked_host"?hosts.some(host=>(host===value||host.endsWith("."+value))&&!allowed(host)):false;
    });
    if(!matched) return next();
    const reason=String(matched.kind)+": "+String(matched.value).slice(0,150);
    try{await ctx.deleteMessage();}catch(deleteError){log.warn({err:deleteError},"Media caption moderation delete failed");}
    const {error}=await db.from("vextro_moderation_events").insert({telegram_id:ctx.from.id,chat_id:ctx.chat.id,event_type:"warning",reason});
    if(error) log.error({err:error},"Media caption moderation event failed");
    await writeAudit("moderation.media_caption_removed",ctx.from.id,reason);
    try{await ctx.reply("This media caption was removed because it matched a group moderation rule.");}catch{}
  }catch(error){log.error({err:error},"Media caption moderation check failed; media was not removed");return next();}
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
    await ctx.reply("Added to support ticket " + ticket.id + ".");
    await sendOwnerNotice("New message on ticket " + ticket.id + " from " + ctx.from.id + ":\n" + body.slice(0,1500) + "\nView: /ticket " + ticket.id);
  } catch (error) { log.error({ err: error }, "Support follow-up failed"); await ctx.reply(messages.en.error); }
});

bot.catch((error, ctx) => { log.error({ err: error, updateId: ctx.update.update_id }, "Telegram update failed"); });
process.on("unhandledRejection", (reason) => {
  log.fatal({ err: reason }, "Unhandled promise rejection; restarting bot process");
  void sendOwnerNotice("VEXTRO BOT encountered an unhandled error and is restarting. Check host logs after restart.").finally(() => process.exit(1));
});
process.on("uncaughtException", (error) => {
  log.fatal({ err: error }, "Uncaught exception; restarting bot process");
  void sendOwnerNotice("VEXTRO BOT encountered a fatal exception and is restarting. Check host logs after restart.").finally(() => process.exit(1));
});
registerGuideAdmin(bot, ownerOnly, writeAudit);
registerUpdateCommands(bot, ownerOnly, config.OWNER_TELEGRAM_ID);
registerOwnerMenu(bot, ownerOnly);
const stopWorkers = startJobWorkers(bot, config.PUBLISH_CHANNEL_ID, config.OWNER_TELEGRAM_ID);
const stopBackups = config.BACKUP_PASSPHRASE ? startBackupScheduler(config.OWNER_TELEGRAM_ID, config.BACKUP_INTERVAL_HOURS, (message) => bot.telegram.sendMessage(config.OWNER_TELEGRAM_ID, message)) : () => {};
const stopHealth = startHealthMonitor(bot, config.OWNER_TELEGRAM_ID, 5);
const stopUpdates = startUpdateMonitor(bot, config.OWNER_TELEGRAM_ID, config.UPDATE_CHECK_INTERVAL_HOURS);
try { const {data}=await db.from("vextro_runtime_settings").select("value").eq("key","maintenance").maybeSingle(); maintenanceMode=(data?.value as {enabled?:boolean}|null)?.enabled===true; const {data:membership}=await db.from("vextro_runtime_settings").select("value").eq("key","membership_config").maybeSingle(); const settings=(membership?.value??{}) as {channelId?:string;groupId?:string}; if(settings.channelId) runtimeMembership.channelId=settings.channelId; if(settings.groupId&&/^-?\\d+$/.test(settings.groupId)) runtimeMembership.groupId=settings.groupId; } catch(error) { log.error({err:error},"Maintenance setting could not be loaded; defaulting to normal mode"); }
process.once("SIGINT", () => { stopWorkers(); stopBackups(); stopHealth(); stopUpdates(); bot.stop("SIGINT"); });
process.once("SIGTERM", () => { stopWorkers(); stopBackups(); stopHealth(); stopUpdates(); bot.stop("SIGTERM"); });
await bot.launch({ dropPendingUpdates: false });
log.info({ botUsername: config.BOT_PUBLIC_USERNAME ?? "not-configured" }, "VEXTRO BOT polling started");
