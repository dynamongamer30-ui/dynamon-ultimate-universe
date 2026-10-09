// Pure policy helpers: no credentials, database access, or request state.
function licenseReason(activation, keyData, fingerprint, now) {
  if (!activation || !keyData) return 'no-login';
  const key = String(activation.key || activation.Key || '');
  if (!key || String(keyData.device || '') !== fingerprint) return 'device_mismatch';
  if (String(keyData.status || 'active').toLowerCase() !== 'active') return 'suspended';
  let last = Number(activation.lastLogin || 0);
  if (last > 0 && last < 1e12) last *= 1000;
  if (!Number.isFinite(last) || last > now + 60000 || now - last > 1800000 || last <= 0) return 'no-login';
  const expiry = Number(keyData.expiry || 0);
  if (!Number.isFinite(expiry) || expiry < 0) return 'invalid_license';
  if (expiry > 0 && expiry * 1000 <= now) return 'expired';
  return '';
}
function maintenance(config, locks) {
  return config === true || !!(locks && (locks.app === true || locks.mods === true));
}

/* Royal Void 0.3 compatible DG Worker.
 * Replace the existing dg Worker module, preserving its bindings and secrets.
 * DG: KV fallback; DG_R2: encrypted payload and gated key storage.
 * ADMIN_KEY, SUPABASE_URL, SUPABASE_SERVICE_KEY: existing secrets.
 * /heartbeat is a compatibility no-op: no storage reads or writes.
 * /tamper does not ban devices based on unauthenticated reports.
 * Existing verification and public-config routes remain compatible.
 * Deploying this file does not generate or upload a signed game payload.
 */
const LOGIN_GRACE = 1800;
// Generated OTA bundles can contain several megabytes of Base64 ciphertext.
// Keep this comfortably above the current build size while still rejecting
// unreasonable requests before writing to KV.
const MAX_PAYLOAD_B64_CHARS = 10_000_000;

// Ban lookups are cached per Worker instance for 60 seconds to save Supabase calls.
const BAN_CACHE_MS = 60 * 1000;
const BAN_CACHE = new Map();
async function safeR2Get(bucket, key) {
  try { return bucket ? await bucket.get(key) : null; } catch (_) { return null; }
}

// VIP keys are prefixed "VIP-" or "DGVIP-" (case-insensitive).
function isVipKey(key) {
  return /^(dg)?vip[-_]/i.test(String(key || ""));
}

// A key is "lifetime" when its duration is 0, blank, or explicitly lifetime.
function isLifetimeDuration(mode) {
  const m = String(mode == null ? "" : mode)
    .trim()
    .toLowerCase();
  return m === "" || m === "0" || m === "lifetime" || m === "life" || m === "permanent" || m === "unlimited";
}

// Accepts numbers (interpreted as HOURS, matching the admin panel's
// durationHours) or strings like "24", "24h", "7d", "60m", "lifetime".
function parseDurationToSeconds(mode) {
  if (isLifetimeDuration(mode)) return 0;
  const s = String(mode).trim().toLowerCase();
  const m = s.match(/^(\d+(?:\.\d+)?)\s*([smhdw]?)$/);
  if (!m) return 0;
  const n = parseFloat(m[1]);
  switch (m[2]) {
    case "s": return Math.floor(n);
    case "m": return Math.floor(n * 60);
    case "d": return Math.floor(n * 86400);
    case "w": return Math.floor(n * 604800);
    case "h": return Math.floor(n * 3600);
    default: return Math.floor(n * 3600); // bare number = hours
  }
}

const APPROVED_PUBLIC_HOSTS = new Set([
  "dynamongamer.space",
  "www.dynamongamer.space",
  "generator.dynamongamer30.workers.dev",
  "youtube.com",
  "www.youtube.com",
  "youtu.be",
  "t.me",
  "telegram.me",
  "whatsapp.com",
  "www.whatsapp.com",
  "instagram.com",
  "www.instagram.com",
  "mega.nz",
  "www.mega.nz",
]);

function safePublicUrl(value) {
  try {
    const url = new URL(String(value || "").trim());
    return url.protocol === "https:" && APPROVED_PUBLIC_HOSTS.has(url.hostname.toLowerCase())
      ? url.toString()
      : "";
  } catch (error) {
    return "";
  }
}

function text(value, fallback, limit) {
  const result = String(value == null ? fallback : value).trim();
  return result.slice(0, limit || 400);
}
function isBoundedString(value, max) {
  return typeof value === "string" && value.length > 0 && value.length <= max;
}
function isBuildId(value) {
  return isBoundedString(value, 128) && /^[A-Za-z0-9._-]+$/.test(value);
}

// Branding is fetched once on successful launch, not polled during play.
function dexBrandConfig(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const name = text(value.name, "Dynamon Gamer", 80);
  const links = Array.isArray(value.links) ? value.links.slice(0, 12).flatMap(link => {
    if (!link || typeof link !== "object") return [];
    const url = safePublicUrl(link.url);
    return url ? [{title: text(link.title, "Open link", 60), url, icon: /^[a-z]{1,20}$/.test(link.icon || "") ? link.icon : "globe"}] : [];
  }) : [];
  return {name: name || "Dynamon Gamer", edition: text(value.edition, "Royal Void", 60), links};
}

const DEX_THEME_IDS = ["dark","fire","thunder","water","earth","diamond","gold","spirit"];
const DEX_THEME_COLORS = ["background","panel","card","primary","deep","highlight","text","muted","border","input","success","error"];
function dexThemeConfig(value) {
  if (!value || typeof value !== "object" || Array.isArray(value) || value.schema !== 1) return null;
  const enabledThemes = Array.isArray(value.enabledThemes)
    ? [...new Set(value.enabledThemes.filter(id => DEX_THEME_IDS.includes(id)))] : [...DEX_THEME_IDS];
  if (!enabledThemes.length) enabledThemes.push("dark");
  const defaultTheme = enabledThemes.includes(value.defaultTheme) ? value.defaultTheme : enabledThemes[0];
  const palettes = {};
  for (const id of DEX_THEME_IDS) {
    const source=value.palettes && value.palettes[id];
    if (!source || typeof source !== "object" || Array.isArray(source)) continue;
    const colors={};
    for (const key of DEX_THEME_COLORS) if (typeof source[key] === "string" && /^#[0-9a-f]{6}$/i.test(source[key])) colors[key]=source[key].toUpperCase();
    if (Object.keys(colors).length) palettes[id]=colors;
  }
  return {schema:1,defaultTheme,enabledThemes,palettes};
}

function publicAppConfig(config) {
  const cfg = config && typeof config === "object" ? config : {};
  const update = cfg.Update && typeof cfg.Update === "object" ? cfg.Update : {};
  const links = cfg.Links && typeof cfg.Links === "object" ? cfg.Links : {};
  const tutorial = cfg.Tutorial && typeof cfg.Tutorial === "object" ? cfg.Tutorial : {};
  const rawFeatureLocks = cfg.FeatureLocks && typeof cfg.FeatureLocks === "object" ? cfg.FeatureLocks : {};
  const featureLocks = {};
  for (const [key, value] of Object.entries(rawFeatureLocks)) {
    if (/^[A-Za-z][A-Za-z0-9_-]{0,63}$/.test(key) && typeof value === "boolean") {
      featureLocks[key] = value;
    }
  }
  const tutorialId = text(tutorial.videoId, "", 64);
  const tutorialUrl = safePublicUrl(cfg.TutorialUrl)
    || (tutorialId ? safePublicUrl("https://youtu.be/" + encodeURIComponent(tutorialId)) : "");
  const updateUrl = safePublicUrl(update.UpdateUrl);

  return {
    AppVersion: Number.isFinite(Number(cfg.AppVersion)) ? Number(cfg.AppVersion) : 0,
    Maintenance: Boolean(cfg.Maintenance),
    TutorialUrl: tutorialUrl,
    FeatureLocks: featureLocks,
    Update: {
      Enabled: Boolean(update.Enabled) && Boolean(updateUrl),
      VersionCode: Number.isFinite(Number(update.VersionCode)) ? Number(update.VersionCode) : 0,
      VersionName: text(update.VersionName, "", 40),
      Title: text(update.Title, "Update Available", 120),
      Subtitle: text(update.Subtitle, "A new version is available.", 180),
      WhatsNew: text(update.WhatsNew, "Bug fixes and improvements.", 1000),
      BtnText: text(update.BtnText, "UPDATE", 40),
      UpdateUrl: updateUrl,
    },
    Links: {
      Info: safePublicUrl(links.Info),
      Admin: safePublicUrl(links.Admin),
      Youtube: safePublicUrl(links.Youtube),
      Telegram: safePublicUrl(links.Telegram),
      Whatsapp: safePublicUrl(links.Whatsapp),
      Instagram: safePublicUrl(links.Instagram),
    },
  };
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    const path = url.pathname;
    const cors = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type,X-Admin",
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "DENY",
      "Referrer-Policy": "strict-origin-when-cross-origin",
      "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=()",
      "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
    };
    if (req.method === "OPTIONS") return new Response(null, { headers: cors });

    const json = (o, s) =>
      new Response(JSON.stringify(o), {
        status: s || 200,
        headers: { "Content-Type": "application/json", "Cache-Control": "no-store", ...cors },
      });
    const body = async () => {
      try {
        return await req.json();
      } catch (e) {
        return {};
      }
    };

    const KV = env.DG;
    const DG_R2 = env.DG_R2;

    // Supabase REST shim (replaces Firebase). Set SUPABASE_URL + SUPABASE_SERVICE_KEY.
    const SB_URL = (env.SUPABASE_URL || "").replace(/\/+$/, "");
    const SB_MAP = {
      BannedDevices: "banned_devices",
      ActivatedUsers: "activated_users",
      SuspiciousActivity: "suspicious_activity",
      ValidKeys: "valid_keys",
      // Legacy table mapping retained; no presence polling or writes.
      Presence: "device_presence",
      // PhoenixPass XP "once per device per build" flag.
      XpOnce: "device_xp_once",
      // The web Control panel stores each Config child (Maintenance, Update,
      // Links, ...) as its own row in `app_config`. Reading the whole node
      // (no id) returns { Maintenance: <val>, Update: {...}, Links: {...} },
      // which is exactly the merged Config object the Android app expects.
      Config: "app_config",
    };
    const sbParse = (p) => {
      const s = String(p).split("/").filter(Boolean);
      return { t: SB_MAP[s[0]] || s[0].toLowerCase(), id: s.slice(1).join("__") };
    };
    const sbHead = (extra) =>
      Object.assign(
        {
          apikey: env.SUPABASE_SERVICE_KEY,
          Authorization: "Bearer " + env.SUPABASE_SERVICE_KEY,
          "Content-Type": "application/json",
        },
        extra || {},
      );
    const isAdmin = async () => {
      const value=req.headers.get("X-Admin");
      if(typeof env.ADMIN_KEY!=="string" || !env.ADMIN_KEY || !value || value.length>512)return false;
      const encoder=new TextEncoder();
      const [a,b]=await Promise.all([crypto.subtle.digest("SHA-256",encoder.encode(value)),crypto.subtle.digest("SHA-256",encoder.encode(env.ADMIN_KEY))]);
      return crypto.subtle.timingSafeEqual(a,b);
    };

    const fbGet = async (p) => {
      try {
        const q = sbParse(p);
        if (!q.id) {
          const r = await fetch(SB_URL + "/rest/v1/" + q.t + "?select=id,data", {
            headers: sbHead(),
          });
          if (!r.ok) return null;
          const rows = await r.json();
          if (!rows.length) return null;
          const o = {};
          for (const x of rows) o[x.id] = x.data;
          return o;
        }
        const r = await fetch(
          SB_URL + "/rest/v1/" + q.t + "?id=eq." + encodeURIComponent(q.id) + "&select=data",
          { headers: sbHead() },
        );
        if (!r.ok) return null;
        const rows = await r.json();
        return rows.length ? rows[0].data : null;
      } catch (e) {
        return null;
      }
    };
    const dexAppearance = async () => {
      try {
        const response=await fetch(SB_URL+"/rest/v1/app_config?id=in.(DexBranding,DexThemes)&select=id,data",{headers:sbHead()});
        if (!response.ok) return {brand:null,themes:null};
        const rows=await response.json();
        if (!Array.isArray(rows)) return {brand:null,themes:null};
        const brandRow=rows.find(row=>row.id==="DexBranding");
        const themeRow=rows.find(row=>row.id==="DexThemes");
        return {brand:dexBrandConfig(brandRow&&brandRow.data),themes:dexThemeConfig(themeRow&&themeRow.data)};
      } catch (_) {return {brand:null,themes:null};}
    };
    const fbPut = async (p, val) => {
      try {
        const q = sbParse(p);
        const id = q.id || crypto.randomUUID();
        return await fetch(SB_URL + "/rest/v1/" + q.t, {
          method: "POST",
          headers: sbHead({ Prefer: "resolution=merge-duplicates,return=minimal" }),
          body: JSON.stringify({ id: id, data: val }),
        });
      } catch (e) {
        return null;
      }
    };
    const fbDel = async (p) => {
      try {
        const q = sbParse(p);
        return await fetch(SB_URL + "/rest/v1/" + q.t + "?id=eq." + encodeURIComponent(q.id), {
          method: "DELETE",
          headers: sbHead(),
        });
      } catch (e) {
        return null;
      }
    };
    const banDevice = async (fp, reason) => {
      const nowMs = Date.now();
      const nowSec = Math.floor(nowMs / 1000);
      // `time` (unix seconds) matches the web admin Devices tab reader; keep
      // `at`/`reason`/`by` for backward compatibility with older readers.
      await fbPut("BannedDevices/" + fp, {
        reason: reason,
        time: nowSec,
        at: nowMs,
        by: "loader-tripwire",
      });
      await fbPut("SuspiciousActivity/" + fp + "_" + nowMs, {
        device: fp,
        reason: reason,
        time: nowSec,
        at: nowMs,
      });
      BAN_CACHE.delete(fp);
    };
    const isBanned = async (fp) => {
      const hit = BAN_CACHE.get(fp);
      if (hit && Date.now() - hit.t < BAN_CACHE_MS) return hit.v;
      const b = await fbGet("BannedDevices/" + fp);
      const v = b ? (typeof b === "string" ? b : b.reason || "banned") : null;
      if (BAN_CACHE.size > 5000) BAN_CACHE.clear();
      BAN_CACHE.set(fp, { v: v, t: Date.now() });
      return v;
    };

    try {
      // ---------- loader: fetch encrypted payload (public, no secret here) ----------
      if (path === "/payload" && req.method === "GET") {
        const requestedBuild = url.searchParams.get("build");
        if (requestedBuild && !isBuildId(requestedBuild)) return json({ error: "no payload" }, 404);
        const currentObject = await safeR2Get(DG_R2, "current_build");
        const build = requestedBuild || (currentObject ? await currentObject.text() : await KV.get("current_build"));
        if (!isBuildId(build)) return json({ error: "no build" }, 404);
        const payloadObject = await safeR2Get(DG_R2, "ct:" + build);
        const ct = payloadObject ? await payloadObject.json() : await KV.get("ct:" + build, "json");
        if (!ct) return json({ error: "no payload" }, 404);
        return json({
          build: build,
          ct_b64: ct.ct_b64,
          iv_b64: ct.iv_b64,
          sig_b64: ct.sig_b64,
          ct_sha: ct.ct_sha,
          protocol: ct.protocol, issued: ct.issued, min_client: ct.min_client, meta_sig_b64: ct.meta_sig_b64,
        });
      }

      // ---------- loader: gated key check + login tripwire ----------
      if (path === "/check" && req.method === "POST") {
        const d = await body();
        const fp = d.fp,
          build = d.build,
          ctsha = d.ctsha;
        if (!isBoundedString(fp, 200) || !isBuildId(build) || (ctsha != null && ctsha !== "" && !isBoundedString(ctsha, 128)))
          return json({ banned: true, reason: "bad request" });

        const ban = await isBanned(fp);
        if (ban) return json({ banned: true, reason: ban });

        // PhoenixPass is valid only for the explicitly published Dark Eclipse
        // build. The upload route retires this policy when a new build lands.
        const darkEclipsePolicy = await fbGet("Config/DarkEclipsePolicy");
        const phoenixPass = !!(
          darkEclipsePolicy &&
          darkEclipsePolicy.enabled === true &&
          darkEclipsePolicy.build === build
        );
        let xpAvailable = false;
        if (phoenixPass && darkEclipsePolicy.xpOnce === true) {
          const xpId = "XpOnce/" + build + ":" + fp;
          // Supabase first; fall back to the old KV flag so devices that already
          // claimed XP before this change cannot claim it a second time.
          const xpUsed = (await fbGet(xpId)) || (await KV.get("xp:" + build + ":" + fp));
          xpAvailable = !xpUsed;
          if (!xpUsed) await fbPut(xpId, { at: Date.now() });
        }

        // Require a recent successful login; missing markers block without banning.
        const au = await fbGet("ActivatedUsers/" + fp);
        let last = au && au.lastLogin ? Number(au.lastLogin) : 0;
        if (last > 0 && last < 1e12) last = last * 1000; // seconds -> ms
        const fresh = last > 0 && last <= Date.now() + 60000 && Date.now() - last <= LOGIN_GRACE * 1000;
        if (!phoenixPass && (!au || !fresh)) {
          // Block the mod but do NOT ban — user just needs to log in properly.
          return json({ blocked: true, reason: "no-login" });
        }

        const maintenanceMode = await fbGet("Config/Maintenance");
        const featureLocks = await fbGet("Config/FeatureLocks");
        if (maintenance(maintenanceMode, featureLocks)) return json({ blocked: true, reason: "maintenance" });
        if (!phoenixPass) {
          const license = au && await fbGet("ValidKeys/" + String(au.key || au.Key || ""));
          const reason = licenseReason(au, license, fp, Date.now());
          if (reason) return json({ blocked: true, reason });
        }
        const keyObject = await safeR2Get(DG_R2, "key:" + build);
        const kf = keyObject ? await keyObject.json() : await KV.get("key:" + build, "json");
        if (!kf) return json({ banned: true, reason: "unknown build" });

        if (ctsha && kf.ct_sha && ctsha !== kf.ct_sha) {
          return json({ blocked: true, reason: "integrity" });
        }

        
        const appearance = await dexAppearance();
        return json({ key: kf.key_b64, phoenixPass: phoenixPass, xpAvailable: xpAvailable, featureLocks: featureLocks || {}, ...appearance });
      }

      // ---------- legacy heartbeat: no storage work ----------
      if (path === "/heartbeat" && req.method === "POST") return json({ ok: true, stateless: true });

      // ---------- tamper compatibility: never auto-ban an untrusted report ----------
      if (path === "/tamper" && req.method === "POST") {
        const d = await body();
        if (!isBoundedString(d.fp, 200) || (d.kind != null && !isBoundedString(d.kind, 64)))
          return json({ ok: false, error: "bad_request" }, 400);
        return json({ ok: true, recorded: false });
      }

      // ---------- app: read allowlisted public config ----------
      // Configuration storage also contains internal and third-party operational
      // values. Never return the raw Config object to an unauthenticated client.
      if (path === "/config" && req.method === "GET") {
        const cfg = (await fbGet("Config")) || {};
        return json(publicAppConfig(cfg));
      }

      // ---------- app: existing verify + activate route ----------
      // The Android gate no longer touches the database directly. It POSTs the
      // key + device fingerprint here; ALL trust decisions happen server-side.
      if (path === "/verify-key" && req.method === "POST") {
        const d = await body();
        const key = String(d.key || "").trim();
        const fp = String(d.fp || "").trim();
        if (!key || !fp) return json({ ok: false, error: "bad_request" });

        // Banned device -> hard stop.
        const ban = await isBanned(fp);
        if (ban) return json({ ok: false, error: "banned", reason: ban });

        const kd = await fbGet("ValidKeys/" + key);
        if (!kd || typeof kd !== "object") return json({ ok: false, error: "invalid_key" });

        const status = String(kd.status || "active").toLowerCase();
        if (status !== "active") return json({ ok: false, error: "suspended" });

        const nowSec = Math.floor(Date.now() / 1000);
        const durationMode = kd.durationHours != null ? String(kd.durationHours) : String(kd.duration || "24");
        const lifetime = isLifetimeDuration(durationMode);
        const boundDevice = kd.device == null ? "" : String(kd.device);
        const vip = isVipKey(key);

        // First use: bind this device + start the timer.
        if (boundDevice === "" || boundDevice === "null") {
          const durSec = parseDurationToSeconds(durationMode);
          const expiry = lifetime || durSec <= 0 ? 0 : nowSec + durSec;

          const merged = Object.assign({}, kd, {
            device: fp,
            expiry: expiry,
            activated: true,
            activatedAt: nowSec,
          });
          await fbPut("ValidKeys/" + key, merged);

          await fbPut("ActivatedUsers/" + fp, {
            Key: key,
            key: key,
            expiry: expiry,
            lastLogin: Date.now(),
            ExpiryReadable: expiry > 0 ? new Date(expiry * 1000).toISOString() : "Lifetime",
          });

          return json({ ok: true, vip: vip, durationMode: durationMode, expiry: expiry, lifetime: lifetime });
        }

        // Returning device: must match + not be expired.
        if (boundDevice === fp) {
          const expiry = Number(kd.expiry || 0);
          if (lifetime || expiry === 0 || expiry > nowSec) {
            // refresh the tripwire marker
            const au = (await fbGet("ActivatedUsers/" + fp)) || {};
            au.lastLogin = Date.now();
            au.Key = key;
            au.key = key;
            await fbPut("ActivatedUsers/" + fp, au);
            return json({ ok: true, vip: vip, durationMode: durationMode, expiry: expiry, lifetime: lifetime });
          }
          return json({ ok: false, error: "expired" });
        }

        // Bound to a different device.
        return json({ ok: false, error: "device_mismatch" });
      }

      // ---------- admin: upload encrypted payload ----------
      if (path === "/admin/upload-payload" && req.method === "POST") {
        if (!(await isAdmin())) return json({ error: "forbidden" }, 403);
        const d = await body();
        if (!isBuildId(d.build) || !isBoundedString(d.ct_b64, MAX_PAYLOAD_B64_CHARS) || !isBoundedString(d.key_b64, MAX_PAYLOAD_B64_CHARS))
          return json({ error: "need build, ct_b64, key_b64" }, 400);
        const ctValue = JSON.stringify({
          ct_b64: d.ct_b64,
          iv_b64: d.iv_b64 || "",
          sig_b64: d.sig_b64 || "",
          ct_sha: d.ct_sha || "",
          protocol: d.protocol, issued: d.issued, min_client: d.min_client, meta_sig_b64: d.meta_sig_b64,
        });
        const keyValue = JSON.stringify({ key_b64: d.key_b64, ct_sha: d.ct_sha || "" });
        const byteLength = (value) => new TextEncoder().encode(value).byteLength;
        try {
          await DG_R2.put("ct:" + d.build, ctValue, { httpMetadata: { contentType: "application/json" } });
        } catch (e) {
          return json({ error: "payload_storage_failed", operation: "ciphertext", bytes: byteLength(ctValue), message: String(e && e.message ? e.message : e).slice(0, 200) }, 413);
        }
        try {
          await DG_R2.put("key:" + d.build, keyValue, { httpMetadata: { contentType: "application/json" } });
        } catch (e) {
          return json({ error: "payload_storage_failed", operation: "key", bytes: byteLength(keyValue), message: String(e && e.message ? e.message : e).slice(0, 200) }, 413);
        }
        try {
          await DG_R2.put("current_build", d.build, { httpMetadata: { contentType: "text/plain; charset=utf-8" } });
        } catch (e) {
          return json({ error: "payload_storage_failed", operation: "current_build", bytes: byteLength(d.build), message: String(e && e.message ? e.message : e).slice(0, 200) }, 500);
        }
        // Publishing any new payload ends the one-build Dark Eclipse policy.
        const darkEclipsePolicy = await fbGet("Config/DarkEclipsePolicy");
        if (darkEclipsePolicy && darkEclipsePolicy.enabled === true) {
          await fbPut("Config/DarkEclipsePolicy", {
            ...darkEclipsePolicy,
            enabled: false,
            disabledAt: Date.now(),
            disabledByBuild: d.build,
          });
        }
        return json({ ok: true, build: d.build, current: true });
      }

      // ---------- admin: ban / unban ----------
      if (path === "/admin/ban" && req.method === "POST") {
        if (!(await isAdmin())) return json({ error: "forbidden" }, 403);
        const d = await body();
        if (!isBoundedString(d.fp, 200)) return json({ error: "need fp" }, 400);
        await banDevice(d.fp, isBoundedString(d.reason, 200) ? d.reason : "admin ban");
        return json({ ok: true, banned: d.fp });
      }
      if (path === "/admin/unban" && req.method === "POST") {
        if (!(await isAdmin())) return json({ error: "forbidden" }, 403);
        const d = await body();
        if (!isBoundedString(d.fp, 200)) return json({ error: "need fp" }, 400);
        await fbDel("BannedDevices/" + d.fp);
        BAN_CACHE.delete(d.fp);
        return json({ ok: true, unbanned: d.fp });
      }

      // ---------- admin: list active devices + current build ----------
      if (path === "/admin/list" && req.method === "GET") {
        if (!(await isAdmin())) return json({ error: "forbidden" }, 403);
        const currentObject = await safeR2Get(DG_R2, "current_build");
        const current = currentObject ? await currentObject.text() : await KV.get("current_build");
        return json({ current_build: current, active: [], presence_disabled: true });
      }

      return json({ error: "not found" }, 404);
    } catch (e) {
      return json({ error: "server" }, 500);
    }
  },
};
