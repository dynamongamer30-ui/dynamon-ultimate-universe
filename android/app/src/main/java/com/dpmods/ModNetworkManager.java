package com.dpmods;

import android.app.Activity;
import android.app.Dialog;
import android.content.Context;
import org.json.JSONObject;
import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;

/**
 * ModNetworkManager (Workers-only edition)
 *
 * The app NO LONGER talks to any database directly. Every call goes through the
 * DG License Worker, which owns all trust decisions (key validation, device
 * binding, ban checks, config) and talks to Supabase server-side. This is the
 * "App -> Workers only" architecture: the app never holds DB credentials and
 * cannot be used to read or tamper with the backend.
 *
 * Endpoints used:
 *   GET  {WORKER}/config                       -> merged Config object
 *   POST {WORKER}/verify-key   {key, fp}       -> {ok, vip, durationMode, expiry, lifetime} | {ok:false, error}
 *   POST {WORKER}/heartbeat    {fp, build}     -> {ok} | {banned, reason}
 */
public class ModNetworkManager {

    // ══════════════════════════════════════════════════════════════
    //  CONFIG — point this at your deployed DG License Worker.
    //  Must match the web app's VITE_LICENSE_WORKER_URL.
    // ══════════════════════════════════════════════════════════════
    private static final String WORKER = "https://dg.dynamongamer30.workers.dev";

    private static final int TIMEOUT_MS = 15000;
    private static boolean isCheckerRunning = false;

    // ══════════════════════════════════════════════════════════════
    //  DURATION HELPERS (kept for compatibility; server is source of truth)
    // ══════════════════════════════════════════════════════════════
    static long parseDurationToSeconds(String mode) {
        if (mode == null) return 24 * 3600L;
        switch (mode.toLowerCase().trim()) {
            case "2h":   return 2L  * 3600;
            case "1d":   return 24L * 3600;
            case "7d":   return 7L  * 86400;
            case "1m":   return 30L * 86400;
            case "life": return 0L;
            default:
                try   { return Long.parseLong(mode) * 3600L; }
                catch (Exception e) { return 24L * 3600; }
        }
    }

    static boolean isLifetimeDuration(String mode) {
        if (mode == null) return false;
        String m = mode.trim().toLowerCase();
        return m.equals("life") || m.equals("lifetime") || m.equals("0") || m.isEmpty();
    }

    static boolean isVipKey(String key) {
        if (key == null) return false;
        String k = key.toUpperCase();
        return k.startsWith("VIP-") || k.startsWith("DGVIP-");
    }

    // ══════════════════════════════════════════════════════════════
    //  HTTP HELPERS (Java 7)
    // ══════════════════════════════════════════════════════════════
    private static String httpGet(String urlStr) throws Exception {
        HttpURLConnection c = (HttpURLConnection) new URL(urlStr).openConnection();
        c.setRequestMethod("GET");
        c.setConnectTimeout(TIMEOUT_MS);
        c.setReadTimeout(TIMEOUT_MS);
        try {
            BufferedReader in = new BufferedReader(new InputStreamReader(c.getInputStream()));
            StringBuilder sb = new StringBuilder();
            String line;
            while ((line = in.readLine()) != null) sb.append(line);
            in.close();
            return sb.toString();
        } finally {
            c.disconnect();
        }
    }

    private static JSONObject httpPostJson(String urlStr, JSONObject payload) throws Exception {
        HttpURLConnection c = (HttpURLConnection) new URL(urlStr).openConnection();
        c.setRequestMethod("POST");
        c.setRequestProperty("Content-Type", "application/json");
        c.setConnectTimeout(TIMEOUT_MS);
        c.setReadTimeout(TIMEOUT_MS);
        c.setDoOutput(true);
        c.setDoInput(true);
        try {
            OutputStream os = c.getOutputStream();
            os.write(payload.toString().getBytes("UTF-8"));
            os.flush();
            os.close();

            BufferedReader in;
            try {
                in = new BufferedReader(new InputStreamReader(c.getInputStream()));
            } catch (Exception e) {
                if (c.getErrorStream() == null) throw e;
                in = new BufferedReader(new InputStreamReader(c.getErrorStream()));
            }
            StringBuilder sb = new StringBuilder();
            String line;
            while ((line = in.readLine()) != null) sb.append(line);
            in.close();
            String body = sb.toString();
            if (body.isEmpty()) return new JSONObject();
            return new JSONObject(body);
        } finally {
            c.disconnect();
        }
    }

    private static String deviceId(Activity activity) {
        return android.provider.Settings.Secure.getString(
                activity.getContentResolver(),
                android.provider.Settings.Secure.ANDROID_ID);
    }

    // ══════════════════════════════════════════════════════════════
    //  GLOBAL INIT — runs on every app open
    //  Order: Maintenance → Update → (caller continues with key check)
    // ══════════════════════════════════════════════════════════════
    public static void checkUpdateAndInit(final Activity activity, final Runnable onContinue) {
        new Thread(new Runnable() {
            @Override
            public void run() {
                try {
                    String resp = httpGet(WORKER + "/config");
                    if (resp != null && !resp.isEmpty() && !resp.equals("null")) {
                        JSONObject config = new JSONObject(resp);

                        // ── Maintenance check ──────────────────────
                        boolean maintenance = config.optBoolean("Maintenance", false);
                        if (maintenance) {
                            activity.runOnUiThread(new Runnable() {
                                @Override public void run() {
                                    dynamongamerytUserPass.removeSplashScreen(activity);
                                    dynamongamerytUserPass.showMaintenanceDialog(activity);
                                }
                            });
                            return; // STOP
                        }

                        // ── Update check ───────────────────────────
                        JSONObject updateData = config.optJSONObject("Update");
                        if (updateData != null) {
                            boolean isEnabled = updateData.optBoolean("Enabled", false);
                            int targetVersionCode = updateData.optInt("VersionCode", 0);
                            int currentVersionCode = 0;
                            try {
                                currentVersionCode = activity.getPackageManager()
                                        .getPackageInfo(activity.getPackageName(), 0).versionCode;
                            } catch (Exception e) {}

                            if (isEnabled && currentVersionCode < targetVersionCode) {
                                final String title    = updateData.optString("Title",    "Update Available");
                                final String sub      = updateData.optString("Subtitle", "New Version");
                                final String whatsNew = updateData.optString("WhatsNew", "Bug fixes and improvements.");
                                final String url      = updateData.optString("UpdateUrl", "");
                                final String btnText  = updateData.optString("BtnText",  "UPDATE");
                                activity.runOnUiThread(new Runnable() {
                                    @Override public void run() {
                                        dynamongamerytUserPass.removeSplashScreen(activity);
                                        dynamongamerytUserPass.showUpdateDialog(
                                                activity, title, sub, whatsNew, url, btnText);
                                    }
                                });
                                return; // STOP
                            }
                        }
                    }
                } catch (Exception e) {}

                activity.runOnUiThread(onContinue);
            }
        }).start();
    }

    // ══════════════════════════════════════════════════════════════
    //  SILENT AUTO-LOGIN
    //  Delegates to the Worker; server checks ban + key + device.
    // ══════════════════════════════════════════════════════════════
    public static void silentKeyCheck(final Activity activity, final Runnable onFail) {
        android.content.SharedPreferences prefs =
                activity.getSharedPreferences("DG_Prefs", Context.MODE_PRIVATE);
        String tempKey = prefs.getString("saved_key", "");

        // Prefer a freshly-copied key from the clipboard.
        try {
            android.content.ClipboardManager clipboard =
                    (android.content.ClipboardManager) activity.getSystemService(Context.CLIPBOARD_SERVICE);
            if (clipboard != null && clipboard.hasPrimaryClip()) {
                CharSequence text = clipboard.getPrimaryClip().getItemAt(0).getText();
                if (text != null) {
                    String clipText = text.toString().trim();
                    if ((clipText.startsWith("DG-") || clipText.startsWith("VIP-"))
                            && clipText.length() >= 8 && !clipText.equals(tempKey)) {
                        tempKey = clipText;
                        prefs.edit().putString("saved_key", tempKey).apply();
                        clipboard.setPrimaryClip(android.content.ClipData.newPlainText("", ""));
                    }
                }
            }
        } catch (Exception e) {}

        final String savedKey = tempKey;
        if (savedKey.isEmpty()) { activity.runOnUiThread(onFail); return; }

        new Thread(new Runnable() {
            @Override
            public void run() {
                try {
                    JSONObject req = new JSONObject();
                    req.put("key", savedKey);
                    req.put("fp", deviceId(activity));
                    JSONObject res = httpPostJson(WORKER + "/verify-key", req);

                    if (res.optBoolean("ok", false)) {
                        dynamongamerytUserPass.showSplashSuccessAndDismiss(activity);
                        if (!isCheckerRunning) startExpiryChecker(activity, savedKey);
                    } else {
                        String err = res.optString("error", "");
                        if ("banned".equals(err)) {
                            activity.runOnUiThread(new Runnable() {
                                @Override public void run() {
                                    dynamongamerytUserPass.removeSplashScreen(activity);
                                    dynamongamerytUserPass.showBannedDialog(activity);
                                }
                            });
                        } else {
                            activity.runOnUiThread(onFail);
                        }
                    }
                } catch (Exception e) { activity.runOnUiThread(onFail); }
            }
        }).start();
    }

    // ══════════════════════════════════════════════════════════════
    //  FETCH LINKS (reads Config.Links via the Worker)
    // ══════════════════════════════════════════════════════════════
    public static void fetchAndOpenLink(final Activity activity, final String platformId) {
        new Thread(new Runnable() {
            @Override
            public void run() {
                try {
                    String resp = httpGet(WORKER + "/config");
                    JSONObject config = new JSONObject(resp);
                    JSONObject links  = config.optJSONObject("Links");
                    String resolvedUrl = "";

                    if (platformId.equals("tutorial")) {
                        resolvedUrl = config.optString("TutorialUrl", "");
                    } else if (links != null) {
                        switch (platformId) {
                            case "insta": resolvedUrl = links.optString("Instagram", ""); break;
                            case "tele":  resolvedUrl = links.optString("Telegram",  ""); break;
                            case "yt":    resolvedUrl = links.optString("Youtube",   ""); break;
                            case "wa":    resolvedUrl = links.optString("Whatsapp",  ""); break;
                            case "admin": resolvedUrl = links.optString("Admin",     ""); break;
                            case "info":  resolvedUrl = links.optString("Info",      ""); break;
                        }
                    }

                    final String finalUrl = resolvedUrl;
                    activity.runOnUiThread(new Runnable() {
                        @Override public void run() {
                            if (finalUrl.isEmpty()) ModMediaUtils.showAnimatedToast(activity, "Link not set!");
                            else dynamongamerytUserPass.openUrl(activity, finalUrl);
                        }
                    });
                } catch (Exception e) {
                    activity.runOnUiThread(new Runnable() {
                        @Override public void run() { ModMediaUtils.showAnimatedToast(activity, "Network Error!"); }
                    });
                }
            }
        }).start();
    }

    // ══════════════════════════════════════════════════════════════
    //  GENERATE KEY LINK
    //  The Worker owns the shortener call + DestBase logic.
    // ══════════════════════════════════════════════════════════════
    public static void generateAndOpenKeyLink(final Activity activity) {
        ModMediaUtils.showAnimatedToast(activity, "Fetching Link...");
        dynamongamerytUserPass.openUrl(activity, "https://generator.dynamongamer30.workers.dev/start");
    }

    // ══════════════════════════════════════════════════════════════
    //  VERIFY KEY  (manual entry)
    //  Order: Maintenance/Update → Worker verify (ban+bind+expiry)
    // ══════════════════════════════════════════════════════════════
    public static void verifyKey(final Activity activity, final Dialog dialog, final String enteredKey) {
        ModMediaUtils.showAnimatedToast(activity, "Verifying...");

        new Thread(new Runnable() {
            @Override
            public void run() {
                try {
                    // ── 0. Config gate (Maintenance + Update) ──────
                    try {
                        String resp = httpGet(WORKER + "/config");
                        if (resp != null && !resp.isEmpty() && !resp.equals("null")) {
                            JSONObject config = new JSONObject(resp);

                            if (config.optBoolean("Maintenance", false)) {
                                activity.runOnUiThread(new Runnable() {
                                    @Override public void run() {
                                        dialog.dismiss();
                                        dynamongamerytUserPass.showMaintenanceDialog(activity);
                                    }
                                });
                                return;
                            }

                            JSONObject updateData = config.optJSONObject("Update");
                            if (updateData != null) {
                                boolean isEnabled = updateData.optBoolean("Enabled", false);
                                int targetVersionCode = updateData.optInt("VersionCode", 0);
                                int currentVersionCode = 0;
                                try {
                                    currentVersionCode = activity.getPackageManager()
                                            .getPackageInfo(activity.getPackageName(), 0).versionCode;
                                } catch (Exception e) {}
                                if (isEnabled && currentVersionCode < targetVersionCode) {
                                    final String title    = updateData.optString("Title",    "Update Available");
                                    final String sub      = updateData.optString("Subtitle", "New Version");
                                    final String whatsNew = updateData.optString("WhatsNew", "Bug fixes and improvements.");
                                    final String url      = updateData.optString("UpdateUrl", "");
                                    final String btnText  = updateData.optString("BtnText",  "UPDATE");
                                    activity.runOnUiThread(new Runnable() {
                                        @Override public void run() {
                                            dialog.dismiss();
                                            dynamongamerytUserPass.showUpdateDialog(
                                                    activity, title, sub, whatsNew, url, btnText);
                                        }
                                    });
                                    return;
                                }
                            }
                        }
                    } catch (Exception ignored) {}

                    // ── 1. Verify + activate via Worker ────────────
                    JSONObject req = new JSONObject();
                    req.put("key", enteredKey);
                    req.put("fp", deviceId(activity));
                    JSONObject res = httpPostJson(WORKER + "/verify-key", req);

                    if (res.optBoolean("ok", false)) {
                        final boolean isVip = res.optBoolean("vip", isVipKey(enteredKey));
                        final String durationMode = res.optString("durationMode", "24");
                        // persist for silent auto-login next launch
                        activity.getSharedPreferences("DG_Prefs", Context.MODE_PRIVATE)
                                .edit().putString("saved_key", enteredKey).apply();
                        successLogin(activity, dialog, enteredKey, isVip, durationMode);
                        return;
                    }

                    final String err = res.optString("error", "");
                    if ("banned".equals(err)) {
                        activity.runOnUiThread(new Runnable() {
                            @Override public void run() {
                                dialog.dismiss();
                                dynamongamerytUserPass.showBannedDialog(activity);
                            }
                        });
                        return;
                    }

                    final String msg = mapVerifyError(err);
                    activity.runOnUiThread(new Runnable() {
                        @Override public void run() {
                            ModMediaUtils.hapticError(activity);
                            ModMediaUtils.playSound(activity, "fail.mp3");
                            ModMediaUtils.showAnimatedToast(activity, msg);
                        }
                    });

                } catch (Exception e) {
                    activity.runOnUiThread(new Runnable() {
                        @Override public void run() {
                            ModMediaUtils.showAnimatedToast(activity, "Network Error!");
                        }
                    });
                }
            }
        }).start();
    }

    private static String mapVerifyError(String err) {
        if ("invalid_key".equals(err))     return "Invalid Key!";
        if ("suspended".equals(err))       return "Key is suspended!";
        if ("expired".equals(err))         return "Key Expired!";
        if ("device_mismatch".equals(err)) return "Key bound to another device!";
        if ("bad_request".equals(err))     return "Invalid request!";
        return "Verification failed!";
    }

    // ══════════════════════════════════════════════════════════════
    //  SUCCESS LOGIN
    // ══════════════════════════════════════════════════════════════
    private static void successLogin(final Activity activity, final Dialog dialog,
                                     final String enteredKey,
                                     final boolean isVip,
                                     final String durationMode) {
        activity.runOnUiThread(new Runnable() {
            @Override
            public void run() {
                ModMediaUtils.hapticUnlock(activity);
                ModMediaUtils.playSound(activity, "success.mp3");
                dialog.dismiss();
                if (isVip) {
                    dynamongamerytUserPass.showVipSuccessDialog(activity, enteredKey, durationMode);
                } else {
                    // ModMenu removed
                    // TODO: Start your main activity here
                }
            }
        });
        if (!isCheckerRunning) startExpiryChecker(activity, enteredKey);
    }

    // ══════════════════════════════════════════════════════════════
    //  EXPIRY / REVOKE / BAN CHECKER  (background, every 30s)
    //  Re-verifies through the Worker, which also refreshes the login
    //  tripwire. If the gate stops calling, the Worker auto-bans.
    // ══════════════════════════════════════════════════════════════
    private static void startExpiryChecker(final Activity activity, final String key) {
        isCheckerRunning = true;
        new Thread(new Runnable() {
            @Override
            public void run() {
                while (isCheckerRunning) {
                    try {
                        Thread.sleep(30000);

                        JSONObject req = new JSONObject();
                        req.put("key", key);
                        req.put("fp", deviceId(activity));
                        JSONObject res = httpPostJson(WORKER + "/verify-key", req);

                        if (res.optBoolean("ok", false)) continue; // still valid

                        final String err = res.optString("error", "");
                        isCheckerRunning = false;
                        if ("banned".equals(err)) {
                            activity.runOnUiThread(new Runnable() {
                                @Override public void run() {
                                    dynamongamerytUserPass.showBannedDialog(activity);
                                }
                            });
                        } else {
                            final String msg = "invalid_key".equals(err)
                                    ? "Key Revoked by Admin!" : "Session Expired!";
                            activity.runOnUiThread(new Runnable() {
                                @Override public void run() {
                                    ModMediaUtils.showAnimatedToast(activity, msg);
                                    dynamongamerytUserPass.showVerificationDialog(activity);
                                }
                            });
                        }
                        break;
                    } catch (Exception e) {}
                }
            }
        }).start();
    }
}
