/* ============================================================
 *  DG LICENSE WORKER v2 (Cloudflare Workers + KV + Supabase)
 *
 *  Loader endpoints:
 *    GET  /payload?build=ID   -> { build, ct_b64, iv_b64, sig_b64, ct_sha }  (public ciphertext)
 *    POST /check  {fp, build, ctsha} -> { key } | { banned, reason }         (gated AES key)
 *    POST /heartbeat {fp, build}     -> { ok } | { banned }
 *    POST /tamper {fp, kind}         -> auto-ban -> { ok }
 *
 *  Admin (header  X-Admin: ADMIN_KEY) - called from the web Loader page:
 *    POST /admin/upload-payload {build, ct_b64, iv_b64, sig_b64, key_b64, ct_sha}
 *    POST /admin/ban   {fp, reason}
 *    POST /admin/unban {fp}
 *    GET  /admin/list
 *
 *  Cloudflare bindings:
 *    KV namespace : DG
 *    Secret       : ADMIN_KEY             (long random; typed once on the Loader page)
 *    Secret       : SUPABASE_URL          (https://<project>.supabase.co)
 *    Secret       : SUPABASE_SERVICE_KEY  (service-role key - SERVER-SIDE ONLY)
 *
 *  TRIPWIRE: the Android gate writes ActivatedUsers/{fp}.lastLogin = <ts> on
 *  every successful key verify. If the loader runs but that marker is missing
 *  or stale, the gate was removed/bypassed -> block injection + ban.
 * ============================================================ */

const LOGIN_GRACE = 1800; // secs: how fresh ActivatedUsers/<fp>.lastLogin must be
const HEARTBEAT_GRACE = 120; // secs

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

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    const path = url.pathname;
    const cors = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type,X-Admin",
    };
    if (req.method === "OPTIONS") return new Response(null, { headers: cors });

    const json = (o, s) =>
      new Response(JSON.stringify(o), {
        status: s || 200,
        headers: { "Content-Type": "application/json", ...cors },
      });
    const body = async () => {
      try {
        return await req.json();
      } catch (e) {
        return {};
      }
    };

    const KV = env.DG;

    // Supabase REST shim (replaces Firebase). Set SUPABASE_URL + SUPABASE_SERVICE_KEY.
    const SB_URL = (env.SUPABASE_URL || "").replace(/\/+$/, "");
    const SB_MAP = {
      BannedDevices: "banned_devices",
      ActivatedUsers: "activated_users",
      SuspiciousActivity: "suspicious_activity",
      ValidKeys: "valid_keys",
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
    const isAdmin = () => req.headers.get("X-Admin") === env.ADMIN_KEY;

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
    const fbPut = async (p, val) => {
      try {
        const q = sbParse(p);
        const id = q.id || Date.now() + "_" + Math.random().toString(36).slice(2, 8);
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
    };
    const isBanned = async (fp) => {
      const b = await fbGet("BannedDevices/" + fp);
      return b ? (typeof b === "string" ? b : b.reason || "banned") : null;
    };

    try {
      // ---------- loader: fetch encrypted payload (public, no secret here) ----------
      if (path === "/payload" && req.method === "GET") {
        const build = url.searchParams.get("build") || (await KV.get("current_build"));
        if (!build) return json({ error: "no build" }, 404);
        const ct = await KV.get("ct:" + build, "json");
        if (!ct) return json({ error: "no payload" }, 404);
        return json({
          build: build,
          ct_b64: ct.ct_b64,
          iv_b64: ct.iv_b64,
          sig_b64: ct.sig_b64,
          ct_sha: ct.ct_sha,
        });
      }

      // ---------- loader: gated key check + login tripwire ----------
      if (path === "/check" && req.method === "POST") {
        const d = await body();
        const fp = d.fp,
          build = d.build,
          ctsha = d.ctsha;
        if (!fp || !build) return json({ banned: true, reason: "bad request" });

        const ban = await isBanned(fp);
        if (ban) return json({ banned: true, reason: ban });

        // TRIPWIRE: gate must have written a fresh login marker this session.
        const au = await fbGet("ActivatedUsers/" + fp);
        let last = au && au.lastLogin ? Number(au.lastLogin) : 0;
        if (last > 0 && last < 1e12) last = last * 1000; // seconds -> ms
        const fresh = last > 0 && Date.now() - last <= LOGIN_GRACE * 1000;
        if (!au || !fresh) {
          await banDevice(fp, "gate-removed");
          return json({ banned: true, reason: "no-login" });
        }

        const kf = await KV.get("key:" + build, "json");
        if (!kf) return json({ banned: true, reason: "unknown build" });

        if (ctsha && kf.ct_sha && ctsha !== kf.ct_sha) {
          await banDevice(fp, "ciphertext-mismatch");
          return json({ banned: true, reason: "integrity" });
        }

        await KV.put("dev:" + fp, JSON.stringify({ build: build, last: Date.now() }), {
          expirationTtl: 86400,
        });
        return json({ key: kf.key_b64 });
      }

      // ---------- loader: heartbeat (mid-session revoke) ----------
      if (path === "/heartbeat" && req.method === "POST") {
        const d = await body();
        if (!d.fp) return json({ ok: true });
        const ban = await isBanned(d.fp);
        if (ban) return json({ banned: true, reason: ban });
        await KV.put("dev:" + d.fp, JSON.stringify({ build: d.build, last: Date.now() }), {
          expirationTtl: 86400,
        });
        return json({ ok: true });
      }

      // ---------- loader: tamper report (auto-ban) ----------
      if (path === "/tamper" && req.method === "POST") {
        const d = await body();
        if (d.fp) await banDevice(d.fp, "tamper:" + (d.kind || "?"));
        return json({ ok: true });
      }

      // ---------- app: read public config (maintenance/update/etc.) ----------
      // Returns the merged Config object (each app_config row = one Config child),
      // exactly like the old Firebase /Config.json read the app relied on.
      if (path === "/config" && req.method === "GET") {
        const cfg = (await fbGet("Config")) || {};
        return json(cfg);
      }

      // ---------- app: verify + activate a key (server-side, atomic bind) ----------
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
        if (!isAdmin()) return json({ error: "forbidden" }, 403);
        const d = await body();
        if (!d.build || !d.ct_b64 || !d.key_b64)
          return json({ error: "need build, ct_b64, key_b64" }, 400);
        await KV.put(
          "ct:" + d.build,
          JSON.stringify({
            ct_b64: d.ct_b64,
            iv_b64: d.iv_b64 || "",
            sig_b64: d.sig_b64 || "",
            ct_sha: d.ct_sha || "",
          }),
        );
        await KV.put(
          "key:" + d.build,
          JSON.stringify({ key_b64: d.key_b64, ct_sha: d.ct_sha || "" }),
        );
        await KV.put("current_build", d.build);
        return json({ ok: true, build: d.build, current: true });
      }

      // ---------- admin: ban / unban ----------
      if (path === "/admin/ban" && req.method === "POST") {
        if (!isAdmin()) return json({ error: "forbidden" }, 403);
        const d = await body();
        if (!d.fp) return json({ error: "need fp" }, 400);
        await banDevice(d.fp, d.reason || "admin ban");
        return json({ ok: true, banned: d.fp });
      }
      if (path === "/admin/unban" && req.method === "POST") {
        if (!isAdmin()) return json({ error: "forbidden" }, 403);
        const d = await body();
        if (!d.fp) return json({ error: "need fp" }, 400);
        await fbDel("BannedDevices/" + d.fp);
        return json({ ok: true, unbanned: d.fp });
      }

      // ---------- admin: list active devices + current build ----------
      if (path === "/admin/list" && req.method === "GET") {
        if (!isAdmin()) return json({ error: "forbidden" }, 403);
        const devs = await KV.list({ prefix: "dev:" });
        const now = Date.now();
        const active = [];
        for (const k of devs.keys) {
          const vv = await KV.get(k.name, "json");
          if (vv && now - vv.last < HEARTBEAT_GRACE * 1000)
            active.push({ fp: k.name.slice(4), build: vv.build, last: vv.last });
        }
        const current = await KV.get("current_build");
        return json({ current_build: current, active: active });
      }

      return json({ error: "not found" }, 404);
    } catch (e) {
      return json({ error: "server", detail: String(e) }, 500);
    }
  },
};
