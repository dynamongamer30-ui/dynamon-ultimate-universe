import type { Telegraf } from "telegraf";
import type { Context } from "telegraf";
import { db } from "./supabase.js";

type PostMedia = { type?: string; file_id?: string; caption?: string; format?: string } | null;
type PostButton = { text: string; url: string };

export async function publishPost(bot: Telegraf<Context>, channelId: string, postId: string) {
  const { data, error } = await db.from("dgbot_posts")
    .select("title,body,state,channel_message_id,media,buttons")
    .eq("id", postId).is("deleted_at", null).maybeSingle();
  if (error || !data) throw error ?? new Error("Post not found");
  if (data.state === "published" && data.channel_message_id) return Number(data.channel_message_id);
  if (data.state !== "draft") {
    if (data.state === "publishing") throw new Error("Post is in publishing state with an uncertain Telegram delivery result. Use /post_reconcile after checking the channel; do not retry automatically.");
    throw new Error("Only draft posts can be published");
  }
  const { data: lease, error: leaseError } = await db.from("dgbot_posts").update({
    state: "publishing", updated_at: new Date().toISOString()
  }).eq("id", postId).eq("state", "draft").select("id").maybeSingle();
  if (leaseError || !lease) throw leaseError ?? new Error("Another worker already claimed this post");
  const caption = data.body ? data.title + "\n\n" + data.body : data.title;
  const media = data.media as PostMedia;
  const buttons = Array.isArray(data.buttons) ? data.buttons as PostButton[] : [];
  const reply_markup = buttons.length ? { inline_keyboard: buttons.map((b) => [{ text: b.text, url: b.url }]) } : undefined;
  const parseMode: "HTML" | "MarkdownV2" | undefined = media?.format === "HTML" ? "HTML" : media?.format === "MarkdownV2" ? "MarkdownV2" : undefined;
  const formatOptions = parseMode ? { parse_mode: parseMode } : {};
  const options = { ...(reply_markup ? { reply_markup } : {}), ...formatOptions };
  let message;
  try {
    if (media?.file_id && media.type === "photo") message = await bot.telegram.sendPhoto(channelId, media.file_id, { caption: media.caption || caption, ...options });
    else if (media?.file_id && media.type === "video") message = await bot.telegram.sendVideo(channelId, media.file_id, { caption: media.caption || caption, ...options });
    else if (media?.file_id && media.type === "document") message = await bot.telegram.sendDocument(channelId, media.file_id, { caption: media.caption || caption, ...options });
    else if (media?.file_id && media.type === "animation") message = await bot.telegram.sendAnimation(channelId, media.file_id, { caption: media.caption || caption, ...options });
    else message = await bot.telegram.sendMessage(channelId, caption, options);
  } catch (sendError) {
    const errorCode = Number((sendError as { response?: { error_code?: number } })?.response?.error_code ?? 0);
    if (errorCode) {
      await db.from("dgbot_posts").update({ state: "draft", updated_at: new Date().toISOString() }).eq("id", postId).eq("state", "publishing");
      throw sendError;
    }
    throw new Error("Telegram delivery outcome is uncertain; post remains locked in publishing state to prevent duplicates. Check the channel, then use /post_reconcile. " + (sendError instanceof Error ? sendError.message : "Network error"));
  }
  const { error: updateError } = await db.from("dgbot_posts").update({
    state: "published", channel_message_id: message.message_id, updated_at: new Date().toISOString()
  }).eq("id", postId).eq("state", "publishing");
  if (updateError) throw new Error("Telegram accepted message " + message.message_id + ", but post state update failed: " + updateError.message + ". Post remains locked; use /post_reconcile " + postId + " published " + message.message_id + ".");
  return message.message_id;
}

export function startJobWorkers(bot: Telegraf<Context>, channelId?: string, ownerId?: number) {
  let stopped = false;
  const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
  const broadcastLoop = async () => {
    while (!stopped) {
      try {
        await db.from("vextro_broadcast_recipients").update({
          status: "uncertain",
          next_attempt_at: null,
          last_error: "Worker lease expired after a send attempt. Delivery outcome is unknown; Owner reconciliation is required to prevent duplicate messages.",
          updated_at: new Date().toISOString()
        }).eq("status", "sending").lt("updated_at", new Date(Date.now() - 10 * 60_000).toISOString());
        const { data: jobs, error: jobsError } = await db.from("vextro_broadcast_jobs")
          .select("id").eq("status", "queued").lte("scheduled_at", new Date().toISOString()).limit(10);
        if (jobsError) throw jobsError;
        for (const job of jobs ?? []) {
          await db.from("vextro_broadcast_jobs").update({ status: "running", updated_at: new Date().toISOString() })
            .eq("id", job.id).eq("status", "queued");
        }
        const { data: claimed, error } = await db.rpc("vextro_claim_broadcast_recipients", { p_limit: 20 });
        if (error) throw error;
        for (const recipient of claimed ?? []) {
          const { data: parentJob } = await db.from("vextro_broadcast_jobs").select("status").eq("id", recipient.job_id).maybeSingle();
          if (!parentJob || parentJob.status !== "running") {
            const cancelled = parentJob?.status === "cancelled";
            await db.from("vextro_broadcast_recipients").update({
              status: cancelled ? "failed" : "pending",
              attempts: cancelled ? 5 : recipient.attempts,
              last_error: cancelled ? "Cancelled by Owner" : null,
              next_attempt_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }).eq("id", recipient.id);
            continue;
          }
          let deliveryAttempted=false;
          try {
            const { data: job, error: jobError } = await db.from("vextro_broadcast_jobs")
              .select("body,format,media,buttons,translations").eq("id", recipient.job_id).single();
            if (jobError || !job?.body) throw jobError ?? new Error("Broadcast body missing");
            const {data:user,error:userError}=await db.from("bot_users").select("language").eq("telegram_id",recipient.telegram_id).maybeSingle();
            if(userError) throw userError;
            const translations=(job.translations??{}) as Record<string,string>;
            const body=translations[user?.language??"en"]??String(job.body);
            const parseMode = (job.format === "HTML" ? "HTML" : job.format === "MarkdownV2" ? "MarkdownV2" : undefined) as "HTML" | "MarkdownV2" | undefined;
            const media=job.media as {type?:string;file_id?:string}|null;
            const buttons=Array.isArray(job.buttons)?job.buttons as Array<{text:string;url:string}>:[];
            const reply_markup=buttons.length?{inline_keyboard:buttons.map(button=>[{text:button.text,url:button.url}])}:undefined;
            const options={...(parseMode?{parse_mode:parseMode}:{}),...(reply_markup?{reply_markup}:{})};
            if(media?.file_id){
              if(body.length>1024) throw new Error("Broadcast media caption exceeds Telegram's 1024-character limit");
              const mediaOptions={caption:body,...options};
              if(media.type==="photo"){deliveryAttempted=true;await bot.telegram.sendPhoto(Number(recipient.telegram_id),media.file_id,mediaOptions);}
              else if(media.type==="video"){deliveryAttempted=true;await bot.telegram.sendVideo(Number(recipient.telegram_id),media.file_id,mediaOptions);}
              else if(media.type==="document"){deliveryAttempted=true;await bot.telegram.sendDocument(Number(recipient.telegram_id),media.file_id,mediaOptions);}
              else if(media.type==="animation"){deliveryAttempted=true;await bot.telegram.sendAnimation(Number(recipient.telegram_id),media.file_id,mediaOptions);}
              else throw new Error("Unsupported broadcast media type");
            }else{
              deliveryAttempted=true;
              await bot.telegram.sendMessage(Number(recipient.telegram_id),body,options);
            }
            await db.from("vextro_broadcast_recipients").update({ status: "sent", sent_at: new Date().toISOString(), last_error: null, updated_at: new Date().toISOString() }).eq("id", recipient.id);
          } catch (sendError) {
            const message = sendError instanceof Error ? sendError.message.slice(0, 500) : "Telegram delivery failed";
            const apiCode = Number((sendError as { response?: { error_code?: number } })?.response?.error_code ?? 0);
            const retryAfter = Number((sendError as { response?: { parameters?: { retry_after?: number } } })?.response?.parameters?.retry_after ?? 0);
            const uncertain = deliveryAttempted && (!apiCode || apiCode >= 500);
            const delay = retryAfter > 0 ? retryAfter + 2 : Math.min(3600, 30 * (2 ** Math.max(0, Number(recipient.attempts) - 1)));
            await db.from("vextro_broadcast_recipients").update({
              status: uncertain ? "uncertain" : "failed",
              last_error: uncertain ? "Delivery outcome unknown: " + message + ". Owner must reconcile before retrying." : message,
              next_attempt_at: uncertain ? null : new Date(Date.now() + delay * 1000).toISOString(),
              updated_at: new Date().toISOString()
            }).eq("id", recipient.id);
          }
          await sleep(40);
        }
        const { data: active, error: activeError } = await db.from("vextro_broadcast_jobs").select("id")
          .in("status", ["running"]).limit(50);
        if (activeError) throw activeError;
        for (const job of active ?? []) {
          const [{count:pending},{count:sending},{count:retryableFailed},{count:sent},{count:failed},{count:uncertain}] = await Promise.all([
            db.from("vextro_broadcast_recipients").select("*",{count:"exact",head:true}).eq("job_id",job.id).eq("status","pending"),
            db.from("vextro_broadcast_recipients").select("*",{count:"exact",head:true}).eq("job_id",job.id).eq("status","sending"),
            db.from("vextro_broadcast_recipients").select("*",{count:"exact",head:true}).eq("job_id",job.id).eq("status","failed").lt("attempts",5),
            db.from("vextro_broadcast_recipients").select("*",{count:"exact",head:true}).eq("job_id",job.id).eq("status","sent"),
            db.from("vextro_broadcast_recipients").select("*",{count:"exact",head:true}).eq("job_id",job.id).eq("status","failed"),
            db.from("vextro_broadcast_recipients").select("*",{count:"exact",head:true}).eq("job_id",job.id).eq("status","uncertain")
          ]);
          if(!(pending||sending||retryableFailed)){
            const finalStatus=(failed??0)+(uncertain??0)>0?"failed":"completed";
            const { data: completed } = await db.from("vextro_broadcast_jobs").update({
              status:finalStatus,sent_count:sent??0,failed_count:(failed??0)+(uncertain??0),
              completed_at:new Date().toISOString(),updated_at:new Date().toISOString()
            }).eq("id",job.id).eq("status","running").select("id").maybeSingle();
            if(completed&&ownerId){
              try{
                const note=uncertain
                  ? "Broadcast requires manual delivery reconciliation. Uncertain recipients: "+uncertain+". Use /broadcast_reconcile "+job.id+" <telegram-user-id> sent|retry after checking each chat."
                  : "Broadcast "+(finalStatus==="completed"?"completed":"finished with failures")+": "+job.id+"\nSent: "+(sent??0)+"\nFailed: "+(failed??0);
                await bot.telegram.sendMessage(ownerId,note);
              }catch{}
            }
          }
        }
      } catch (error) {
        console.error("VEXTRO broadcast worker iteration failed", error);
      }
      await sleep(1500);
    }
  };
  const scheduleLoop = async () => {
    while (!stopped) {
      try {
        if (channelId) {
          const { data: due, error } = await db.from("vextro_scheduled_posts").select("id,post_id,attempts")
            .eq("status", "scheduled").lte("scheduled_at", new Date().toISOString()).order("scheduled_at").limit(5);
          if (error) throw error;
          for (const item of due ?? []) {
            const { data: claimed } = await db.from("vextro_scheduled_posts").update({
              status: "publishing", attempts: Number(item.attempts ?? 0) + 1, updated_at: new Date().toISOString()
            }).eq("id", item.id).eq("status", "scheduled").select("id").maybeSingle();
            if (!claimed) continue;
            try {
              await publishPost(bot, channelId, item.post_id);
              await db.from("vextro_scheduled_posts").update({ status: "published", published_at: new Date().toISOString(), updated_at: new Date().toISOString(), last_error: null }).eq("id", item.id);
              if (ownerId) { try { await bot.telegram.sendMessage(ownerId, "Scheduled channel post published. Schedule: " + item.id + "\nPost: " + item.post_id); } catch {} }
            } catch (publishError) {
              const reason = publishError instanceof Error ? publishError.message.slice(0, 500) : "Publish failed";
              await db.from("vextro_scheduled_posts").update({ status: "failed", last_error: reason, updated_at: new Date().toISOString() }).eq("id", item.id);
              if (ownerId) { try { await bot.telegram.sendMessage(ownerId, "Scheduled post failed. Schedule: " + item.id + "\nReason: " + reason + "\nUse /post_schedule_retry " + item.id + " after fixing the issue."); } catch {} }
            }
          }
          await db.from("vextro_scheduled_posts").update({ status: "scheduled", last_error: "Recovered stale worker lease", updated_at: new Date().toISOString() })
            .eq("status", "publishing").lt("updated_at", new Date(Date.now() - 10 * 60_000).toISOString());
        }
      } catch (error) {
        console.error("VEXTRO scheduler iteration failed", error);
      }
      await sleep(10_000);
    }
  };
  void broadcastLoop();
  void scheduleLoop();
  return () => { stopped = true; };
}
