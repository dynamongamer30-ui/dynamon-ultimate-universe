package com.dpmods;

import android.app.Activity;
import android.app.Dialog;
import android.content.Context;
import android.content.Intent;
import android.graphics.Color;
import android.graphics.Outline;
import android.graphics.drawable.ColorDrawable;
import android.graphics.drawable.GradientDrawable;
import android.net.Uri;
import android.text.InputType;
import android.util.TypedValue;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.view.ViewOutlineProvider;
import android.view.Window;
import android.view.WindowManager;
import android.widget.Button;
import android.widget.EditText;
import android.widget.FrameLayout;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.RelativeLayout;
import android.widget.ScrollView;
import android.widget.TextView;
import android.view.TextureView;
import android.view.animation.Animation;
import android.view.animation.DecelerateInterpolator;
import android.view.animation.TranslateAnimation;
import android.graphics.Point;
import android.graphics.Rect;
import android.os.Build;
import android.util.DisplayMetrics;
import java.io.InputStream;

public class dynamongamerytUserPass {

    // ══════════════════════════════════════════
    //  BRANDING
    // ══════════════════════════════════════════
    public static final String APP_TITLE    = "Dynamon Gamer";
    public static final String APP_SUBTITLE = "Device Verification";

    public static final String API_BASE_URL = "https://your-link-shortener.com/api";
    public static final String API_TOKEN    = "YOUR_API_TOKEN_HERE";

    public static final String FIREBASE_LINKS_URL = new String(android.util.Base64.decode(
            "aHR0cHM6Ly9hZG1pbi1wYW5lbC1kNzYyYi1kZWZhdWx0LXJ0ZGIuZmlyZWJhc2Vpby5jb20vQ29uZmlnLmpzb24=",
            android.util.Base64.DEFAULT));
    public static final String FIREBASE_DB_URL = new String(android.util.Base64.decode(
            "aHR0cHM6Ly9hZG1pbi1wYW5lbC1kNzYyYi1kZWZhdWx0LXJ0ZGIuZmlyZWJhc2Vpby5jb20vVmFsaWRLZXlzLmpzb24=",
            android.util.Base64.DEFAULT));

    // ══════════════════════════════════════════
    //  DEBUG flag — set true to see width toasts
    // ══════════════════════════════════════════
    private static final boolean DEBUG_DIALOG_SIZE = false;

    // ══════════════════════════════════════════
    //  HELPER — true screen width on ALL devices
    //  (handles gesture nav, 3-button nav, OEM
    //   skins, foldables, Android 5-15)
    // ══════════════════════════════════════════
    private static int getTrueScreenWidth(Activity activity) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            // Android 11+: WindowMetrics is the authoritative source
            android.view.WindowMetrics wm =
                    activity.getWindowManager().getCurrentWindowMetrics();
            return wm.getBounds().width();
        }
        // Android 10 and below: getRealMetrics always includes nav bar pixels
        DisplayMetrics dm = new DisplayMetrics();
        activity.getWindowManager().getDefaultDisplay().getRealMetrics(dm);
        return dm.widthPixels;
    }

    // ══════════════════════════════════════════
    //  HELPER — true screen height on ALL devices
    //  Used to cap dialog height on small screens
    // ══════════════════════════════════════════
    private static int getTrueScreenHeight(Activity activity) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            android.view.WindowMetrics wm =
                    activity.getWindowManager().getCurrentWindowMetrics();
            return wm.getBounds().height();
        }
        DisplayMetrics dm = new DisplayMetrics();
        activity.getWindowManager().getDefaultDisplay().getRealMetrics(dm);
        return dm.heightPixels;
    }

    // ══════════════════════════════════════════
    //  HELPER — centred transparent dialog
    //  Bulletproofed for: notches, punch-holes,
    //  gesture nav, OEM skins, Android 5-15
    // ══════════════════════════════════════════
    private static Dialog buildBaseDialog(Activity activity) {
        Dialog dialog = new Dialog(activity);
        dialog.requestWindowFeature(Window.FEATURE_NO_TITLE);
        dialog.setCancelable(false);
        Window win = dialog.getWindow();
        if (win != null) {
            win.setBackgroundDrawable(new ColorDrawable(Color.TRANSPARENT));
            win.setGravity(Gravity.CENTER);
            win.setDimAmount(0.80f);
            // ADJUST_RESIZE keeps the dialog above the keyboard on all devices.
            // ADJUST_PAN was causing the dialog to slide up and clip on some
            // Samsung/Xiaomi OEM devices with tall soft keyboards.
            win.setSoftInputMode(WindowManager.LayoutParams.SOFT_INPUT_ADJUST_RESIZE);

            // Allow the dim layer and dialog to extend into the display cutout
            // area (notch / punch-hole). Without this, on notched devices the
            // dialog window stops at the cutout boundary, leaving a raw strip
            // at the top. SHORT_EDGES is the safest mode — content centering
            // still works and nothing is hidden behind the cutout.
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                WindowManager.LayoutParams lp = win.getAttributes();
                lp.layoutInDisplayCutoutMode =
                        WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES;
                win.setAttributes(lp);
            }

            // Makes the dim layer cover the full screen including the status
            // bar. Without this flag, on transparent-status-bar devices there
            // is a visible undimmed grey strip above the dialog.
            win.addFlags(WindowManager.LayoutParams.FLAG_DRAWS_SYSTEM_BAR_BACKGROUNDS);
            win.clearFlags(WindowManager.LayoutParams.FLAG_TRANSLUCENT_STATUS);

            // NOTE: width is NOT set here on purpose.
            // Theme windowMinWidthMajor/Minor gets reapplied on show() on many
            // OEM skins (Samsung, MIUI, ColorOS) and collapses the dialog to a
            // narrow column. Width is set in safeShow() POST-show() via
            // getTrueScreenWidth(), which is accurate on all devices.
        }
        return dialog;
    }

    // ══════════════════════════════════════════
    //  HELPER — ember card background
    // ══════════════════════════════════════════
    private static GradientDrawable makeCardBg(int cornerDp, Context ctx) {
        GradientDrawable bg = new GradientDrawable(
                GradientDrawable.Orientation.TOP_BOTTOM,
                new int[]{Color.parseColor("#F0100608"), Color.parseColor("#F007030A")});
        bg.setCornerRadius(dp(ctx, cornerDp));
        bg.setStroke(dp(ctx, 1), Color.parseColor("#33F2662E"));
        return bg;
    }

    // ══════════════════════════════════════════
    //  SAFE SHOW
    // ══════════════════════════════════════════
    private static void safeShow(final Dialog dialog, final Activity activity) {
        try {
            if (!activity.isFinishing() && !activity.isDestroyed()) {
                dialog.show();

                // ── Width / height must be applied AFTER show() ──────────────────
                // Reason: many OEM skins (Samsung One UI, MIUI, ColorOS) re-apply
                // the theme's windowMinWidthMajor during show(), overwriting any
                // LayoutParams set before it.  Setting params post-show() wins.
                //
                // We use getTrueScreenWidth() instead of getDisplayMetrics().widthPixels
                // because widthPixels is UNRELIABLE:
                //   • On gesture-nav devices it returns the full screen width ✓
                //   • On 3-button-nav devices it can exclude the nav-bar ✗
                //   • On some Samsung/Xiaomi skins it returns wrong values ✗
                // getRealMetrics / WindowMetrics.getBounds() always returns the
                // physical pixel width regardless of nav bar or system bars.
                final Window win = dialog.getWindow();
                if (win != null) {
                    final int screenW = getTrueScreenWidth(activity);
                    final int screenH = getTrueScreenHeight(activity);

                    // 84 % width — comfortable on phones AND tablets
                    final int targetWidth = (int) (screenW * 0.84f);

                    // Cap height to 90 % of screen — prevents overflow on
                    // small/budget devices (720×1280) and very large content
                    final int maxHeight = (int) (screenH * 0.90f);

                    WindowManager.LayoutParams lp = win.getAttributes();
                    lp.width   = targetWidth;
                    lp.height  = ViewGroup.LayoutParams.WRAP_CONTENT;
                    lp.gravity = Gravity.CENTER;
                    win.setAttributes(lp);

                    // Apply the max-height cap via a post() so the view tree
                    // has been laid out and the DecorView has a real height.
                    win.getDecorView().post(new Runnable() {
                        @Override
                        public void run() {
                            try {
                                // If the laid-out height exceeds our cap, constrain it
                                // and make the content scrollable so nothing is cut off.
                                int actualH = win.getDecorView().getHeight();
                                if (actualH > maxHeight) {
                                    WindowManager.LayoutParams lp2 = win.getAttributes();
                                    lp2.height = maxHeight;
                                    win.setAttributes(lp2);
                                }

                                if (DEBUG_DIALOG_SIZE) {
                                    int actualW = win.getDecorView().getWidth();
                                    ModMediaUtils.showAnimatedToast(activity,
                                            "DBG sw=" + screenW + " tw=" + targetWidth
                                            + " aw=" + actualW
                                            + " sh=" + screenH + " ah=" + actualH);
                                }
                            } catch (Exception ignored) {}
                        }
                    });
                }
            }
        } catch (Exception e) {
            if (DEBUG_DIALOG_SIZE) {
                try {
                    ModMediaUtils.showAnimatedToast(activity, "DBG safeShow error: " + e);
                } catch (Exception ignored2) {}
            }
        }
    }

    // ══════════════════════════════════════════
    //  🚫  BANNED DIALOG
    // ══════════════════════════════════════════
    public static void showBannedDialog(final Activity activity) {
        final Dialog dialog = buildBaseDialog(activity);

        FrameLayout root = new FrameLayout(activity);
        root.setPadding(dp(activity, 10), dp(activity, 16), dp(activity, 10), dp(activity, 16));

        LinearLayout card = new LinearLayout(activity);
        card.setOrientation(LinearLayout.VERTICAL);
        card.setGravity(Gravity.CENTER);
        card.setPadding(dp(activity, 20), dp(activity, 36), dp(activity, 20), dp(activity, 32));

        GradientDrawable cardBg = new GradientDrawable(
                GradientDrawable.Orientation.TOP_BOTTOM,
                new int[]{Color.parseColor("#F0150303"), Color.parseColor("#F007030A")});
        cardBg.setCornerRadius(dp(activity, 24));
        cardBg.setStroke(dp(activity, 1), Color.parseColor("#55EF4444"));
        card.setBackground(cardBg);
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.LOLLIPOP)
            card.setElevation(dp(activity, 16));

        TextView icon = new TextView(activity);
        icon.setText("\u26A0\uFE0F");
        icon.setTextSize(TypedValue.COMPLEX_UNIT_SP, 52);
        icon.setGravity(Gravity.CENTER);
        LinearLayout.LayoutParams iconP = new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        iconP.bottomMargin = dp(activity, 16);
        icon.setLayoutParams(iconP);

        TextView title = new TextView(activity);
        title.setText("DEVICE BANNED");
        title.setTextColor(Color.parseColor("#EF4444"));
        title.setTextSize(TypedValue.COMPLEX_UNIT_SP, 22);
        title.setGravity(Gravity.CENTER);
        ModMediaUtils.applyFont(activity, title, "title.ttf");
        LinearLayout.LayoutParams titleP = new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        titleP.bottomMargin = dp(activity, 10);
        title.setLayoutParams(titleP);

        TextView sub = new TextView(activity);
        sub.setText("Your device has been permanently blacklisted by the administrators for violating the rules.");
        sub.setMaxLines(Integer.MAX_VALUE);
        sub.setEllipsize(null);
        sub.setTextColor(Color.parseColor("#A79E90"));
        sub.setTextSize(TypedValue.COMPLEX_UNIT_SP, 13);
        sub.setGravity(Gravity.CENTER);
        ModMediaUtils.applyFont(activity, sub, "body.ttf");
        LinearLayout.LayoutParams subP = new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        subP.bottomMargin = dp(activity, 28);
        sub.setLayoutParams(subP);

        Button exitBtn = makePrimaryButton(activity, "CLOSE APP", "#EF4444");
        ModMediaUtils.applyTouchRipple(exitBtn, activity);
        exitBtn.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                ModMediaUtils.hapticError(activity);
                ModMediaUtils.playSound(activity, "fail.mp3");
                dialog.dismiss();
                activity.finishAffinity();
                System.exit(0);
            }
        });

        card.addView(icon);
        card.addView(title);
        card.addView(sub);
        card.addView(exitBtn);

        root.addView(card, new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT));

        ModMediaUtils.applyEntranceAnimation(card);
        dialog.setContentView(root);
        safeShow(dialog, activity);
    }

    // ══════════════════════��═══════════════════
    //  ⬆️  UPDATE DIALOG
    // ══════════════════════════════════════════
    public static void showUpdateDialog(final Activity activity,
                                        String titleStr, String subtitleStr,
                                        String whatsNewStr, final String updateUrl,
                                        String btnText) {
        final Dialog dialog = buildBaseDialog(activity);

        FrameLayout root = new FrameLayout(activity);
        root.setPadding(dp(activity, 10), dp(activity, 16), dp(activity, 10), dp(activity, 16));

        LinearLayout card = new LinearLayout(activity);
        card.setOrientation(LinearLayout.VERTICAL);
        card.setGravity(Gravity.CENTER);
        card.setPadding(dp(activity, 18), dp(activity, 24), dp(activity, 18), dp(activity, 22));
        card.setBackground(makeCardBg(24, activity));
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.LOLLIPOP)
            card.setElevation(dp(activity, 16));

        FrameLayout avatarFrame = buildAvatarFrame(activity, 64);
        LinearLayout.LayoutParams avP = new LinearLayout.LayoutParams(
                dp(activity, 64), dp(activity, 64));
        avP.gravity = Gravity.CENTER_HORIZONTAL;
        avP.bottomMargin = dp(activity, 14);
        avatarFrame.setLayoutParams(avP);

        TextView titleTv = new TextView(activity);
        titleTv.setText(titleStr);
        titleTv.setTextColor(Color.parseColor("#F7F4EE"));
        titleTv.setTextSize(TypedValue.COMPLEX_UNIT_SP, 19);
        titleTv.setGravity(Gravity.CENTER);
        ModMediaUtils.applyFont(activity, titleTv, "title.ttf");
        titleTv.setPadding(0, 0, 0, dp(activity, 4));
        LinearLayout.LayoutParams titleP = new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        titleTv.setLayoutParams(titleP);

        TextView subTv = new TextView(activity);
        subTv.setText(subtitleStr);
        subTv.setTextColor(Color.parseColor("#A79E90"));
        subTv.setTextSize(TypedValue.COMPLEX_UNIT_SP, 12);
        subTv.setGravity(Gravity.CENTER);
        ModMediaUtils.applyFont(activity, subTv, "body.ttf");
        subTv.setPadding(0, 0, 0, dp(activity, 14));
        LinearLayout.LayoutParams subP = new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        subTv.setLayoutParams(subP);

        LinearLayout wnBox = new LinearLayout(activity);
        wnBox.setOrientation(LinearLayout.VERTICAL);
        wnBox.setPadding(dp(activity, 12), dp(activity, 12), dp(activity, 12), dp(activity, 14));
        GradientDrawable wnBg = new GradientDrawable();
        wnBg.setColor(Color.parseColor("#14F2662E"));
        wnBg.setCornerRadius(dp(activity, 14));
        wnBg.setStroke(dp(activity, 1), Color.parseColor("#22F2662E"));
        wnBox.setBackground(wnBg);
        LinearLayout.LayoutParams wnP = new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        wnP.bottomMargin = dp(activity, 16);
        wnBox.setLayoutParams(wnP);

        TextView wnHeader = new TextView(activity);
        wnHeader.setText("WHAT'S NEW");
        wnHeader.setTextColor(Color.parseColor("#EAB84C"));
        wnHeader.setTextSize(TypedValue.COMPLEX_UNIT_SP, 10);
        wnHeader.setLetterSpacing(0.08f);
        ModMediaUtils.applyFont(activity, wnHeader, "title.ttf");
        LinearLayout.LayoutParams wnHeaderP = new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        wnHeader.setLayoutParams(wnHeaderP);

        View divider = new View(activity);
        divider.setBackgroundColor(Color.parseColor("#22F2662E"));
        LinearLayout.LayoutParams divP = new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, dp(activity, 1));
        divP.topMargin = dp(activity, 6);
        divP.bottomMargin = dp(activity, 8);
        divider.setLayoutParams(divP);

        TextView wnBody = new TextView(activity);
        wnBody.setText(whatsNewStr);
        wnBody.setTextColor(Color.parseColor("#A79E90"));
        wnBody.setTextSize(TypedValue.COMPLEX_UNIT_SP, 12);
        wnBody.setLineSpacing(TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_DIP, 4,
                activity.getResources().getDisplayMetrics()), 1f);
        ModMediaUtils.applyFont(activity, wnBody, "body.ttf");
        wnBody.setLayoutParams(new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT));

        wnBox.addView(wnHeader);
        wnBox.addView(divider);
        wnBox.addView(wnBody);

        Button updateBtn = makeGradientButton(activity, btnText);
        LinearLayout.LayoutParams updateBtnP = new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, dp(activity, 46));
        updateBtn.setLayoutParams(updateBtnP);
        ModMediaUtils.applyTouchRipple(updateBtn, activity);
        updateBtn.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                ModMediaUtils.hapticMedium(activity);
                if (!updateUrl.isEmpty()) {
                    openUrl(activity, updateUrl);
                } else {
                    ModMediaUtils.showAnimatedToast(activity, "Update link not set!");
                }
            }
        });

        card.addView(avatarFrame);
        card.addView(titleTv);
        card.addView(subTv);
        card.addView(wnBox);
        card.addView(updateBtn);

        root.addView(card, new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT));

        ModMediaUtils.applyEntranceAnimation(card);
        dialog.setContentView(root);
        safeShow(dialog, activity);
    }

    // ══════════════════════════════════════════
    //  🛠️  MAINTENANCE DIALOG
    // ══════════════════════════════════════════
    public static void showMaintenanceDialog(final Activity activity) {
        final Dialog dialog = buildBaseDialog(activity);

        FrameLayout root = new FrameLayout(activity);
        root.setPadding(dp(activity, 10), dp(activity, 16), dp(activity, 10), dp(activity, 16));

        LinearLayout card = new LinearLayout(activity);
        card.setOrientation(LinearLayout.VERTICAL);
        card.setGravity(Gravity.CENTER);
        card.setPadding(dp(activity, 20), dp(activity, 36), dp(activity, 20), dp(activity, 32));

        GradientDrawable cardBg = new GradientDrawable(
                GradientDrawable.Orientation.TOP_BOTTOM,
                new int[]{Color.parseColor("#F0100A00"), Color.parseColor("#F007030A")});
        cardBg.setCornerRadius(dp(activity, 24));
        cardBg.setStroke(dp(activity, 1), Color.parseColor("#55EAB84C"));
        card.setBackground(cardBg);
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.LOLLIPOP)
            card.setElevation(dp(activity, 16));

        TextView icon = new TextView(activity);
        icon.setText("\uD83D\uDEE0\uFE0F");
        icon.setTextSize(TypedValue.COMPLEX_UNIT_SP, 52);
        icon.setGravity(Gravity.CENTER);
        LinearLayout.LayoutParams iconP = new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        iconP.bottomMargin = dp(activity, 16);
        icon.setLayoutParams(iconP);

        TextView title = new TextView(activity);
        title.setText("SYSTEM MAINTENANCE");
        title.setTextColor(Color.parseColor("#EAB84C"));
        title.setTextSize(TypedValue.COMPLEX_UNIT_SP, 20);
        title.setGravity(Gravity.CENTER);
        ModMediaUtils.applyFont(activity, title, "title.ttf");
        LinearLayout.LayoutParams titleP = new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        titleP.bottomMargin = dp(activity, 10);
        title.setLayoutParams(titleP);

        TextView sub = new TextView(activity);
        sub.setText("The servers are currently down for updates or maintenance. Please check our social media and try again later!");
        sub.setTextColor(Color.parseColor("#A79E90"));
        sub.setTextSize(TypedValue.COMPLEX_UNIT_SP, 13);
        sub.setGravity(Gravity.CENTER);
        ModMediaUtils.applyFont(activity, sub, "body.ttf");
        LinearLayout.LayoutParams subP = new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        subP.bottomMargin = dp(activity, 28);
        sub.setLayoutParams(subP);

        Button exitBtn = makePrimaryButton(activity, "CLOSE APP", "#EAB84C");
        ModMediaUtils.applyTouchRipple(exitBtn, activity);
        exitBtn.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                ModMediaUtils.hapticError(activity);
                dialog.dismiss();
                activity.finishAffinity();
                System.exit(0);
            }
        });

        card.addView(icon);
        card.addView(title);
        card.addView(sub);
        card.addView(exitBtn);

        root.addView(card, new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT));

        ModMediaUtils.applyEntranceAnimation(card);
        dialog.setContentView(root);
        safeShow(dialog, activity);
    }

    // ══════════════════════════════════════════
    //  SPLASH
    // ══════════════════════════════════════════
    public static Dialog splashDialog;

    public static void removeSplashScreen(final Activity activity) {
        activity.runOnUiThread(new Runnable() {
            @Override
            public void run() {
                if (splashDialog != null && splashDialog.isShowing()) {
                    splashDialog.dismiss();
                    splashDialog = null;
                }
            }
        });
    }

    public static void showSplashSuccessAndDismiss(final Activity activity) {
        activity.runOnUiThread(new Runnable() {
            @Override
            public void run() {
                if (splashDialog != null && splashDialog.isShowing()) {
                    ProgressBar spinner = splashDialog.findViewById(8883);
                    if (spinner != null) spinner.setVisibility(View.GONE);

                    TextView titleTv = splashDialog.findViewById(8881);
                    if (titleTv != null) {
                        titleTv.setText("Login Successful!");
                        titleTv.setTextColor(Color.parseColor("#22C55E"));
                    }
                    TextView subTv = splashDialog.findViewById(8882);
                    if (subTv != null) subTv.setText("Loading Mods...");

                    ModMediaUtils.playSound(activity, "success.mp3");
                    ModMediaUtils.hapticUnlock(activity);

                    new android.os.Handler(android.os.Looper.getMainLooper()).postDelayed(
                            new Runnable() {
                                @Override
                                public void run() {
                                    removeSplashScreen(activity);
                                    // TODO: Start your main activity here
                                }
                            }, 1500);
                } else {
                    ModMediaUtils.playSound(activity, "success.mp3");
                    ModMediaUtils.hapticUnlock(activity);
                    // TODO: Start your main activity here
                }
            }
        });
    }
    
    // ══════════════════════════════════════════
    //  🌐  MAIN ENTRY
    // ══════════════════════════════════════════
    // ════════ FORCE-HIDE HOST TITLE BAR (all devices, theme-independent) ════════
    public static void hideTitle(final Activity activity) {
        if (activity == null) return;
        try {
            // Hide ActionBar if the resolved theme injected one
            if (activity.getActionBar() != null) activity.getActionBar().hide();
        } catch (Throwable t) {}
        try {
            // Hide legacy window title
            activity.getWindow().requestFeature(android.view.Window.FEATURE_NO_TITLE);
        } catch (Throwable t) {}
        try {
            // Immersive sticky fullscreen kills any leftover title/status strip
            final android.view.View dv = activity.getWindow().getDecorView();
            int flags = android.view.View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                | android.view.View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                | android.view.View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                | android.view.View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                | android.view.View.SYSTEM_UI_FLAG_FULLSCREEN
                | android.view.View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY;
            dv.setSystemUiVisibility(flags);
            // Re-apply if the system restores the bar (OEM quirks)
            dv.setOnSystemUiVisibilityChangeListener(new android.view.View.OnSystemUiVisibilityChangeListener() {
                @Override public void onSystemUiVisibilityChange(int v) {
                    if ((v & android.view.View.SYSTEM_UI_FLAG_FULLSCREEN) == 0) {
                        try { if (activity.getActionBar() != null) activity.getActionBar().hide(); } catch (Throwable t) {}
                    }
                }
            });
        } catch (Throwable t) {}
    }

    public static void DGDialog(final Activity activity) {
        // ===== overlay-permission request removed (key verification kept) =====
        Intent intent = activity.getIntent();
        if (intent != null && intent.getData() != null) {
            Uri data = intent.getData();
            if ("dynamongamer".equals(data.getScheme()) && "verify".equals(data.getHost())) {
                String key = data.getQueryParameter("key");
                if (key != null && key.startsWith("DG-")) {
                    activity.getSharedPreferences("DG_Prefs", Context.MODE_PRIVATE)
                            .edit().putString("saved_key", key).apply();
                }
            }
        }

        activity.runOnUiThread(new Runnable() {
            @Override
            public void run() {
                hideTitle(activity);
                splashDialog = new Dialog(activity,
                        android.R.style.Theme_Black_NoTitleBar_Fullscreen);
                splashDialog.setCancelable(false);
                // ── Edge-to-edge fix for Android 10+ ─────────────────────────
                // Theme_Black_NoTitleBar_Fullscreen on Android 10+ (API 29+) no
                // longer covers the entire screen by default because the OS
                // enforces edge-to-edge behavior. Without these flags the system
                // draws a white/grey bar above the splash on some devices.
                Window splashWin = splashDialog.getWindow();
                if (splashWin != null) {
                    splashWin.addFlags(
                            WindowManager.LayoutParams.FLAG_DRAWS_SYSTEM_BAR_BACKGROUNDS
                            | WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS);
                    splashWin.clearFlags(WindowManager.LayoutParams.FLAG_TRANSLUCENT_STATUS);
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                        WindowManager.LayoutParams splashLp = splashWin.getAttributes();
                        splashLp.layoutInDisplayCutoutMode =
                                WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES;
                        splashWin.setAttributes(splashLp);
                    }
                }

                RelativeLayout rootLayout = new RelativeLayout(activity);
                rootLayout.setLayoutParams(new ViewGroup.LayoutParams(
                        ViewGroup.LayoutParams.MATCH_PARENT,
                        ViewGroup.LayoutParams.MATCH_PARENT));
                rootLayout.setBackgroundColor(Color.parseColor("#07030A"));

                // Subtle ember glow blob top-right
                View glowView = new View(activity);
                int glowSize = dp(activity, 260);
                RelativeLayout.LayoutParams glowP =
                        new RelativeLayout.LayoutParams(glowSize, glowSize);
                glowP.addRule(RelativeLayout.ALIGN_PARENT_RIGHT);
                glowP.addRule(RelativeLayout.ALIGN_PARENT_TOP);
                glowP.rightMargin = -dp(activity, 80);
                glowP.topMargin = -dp(activity, 80);
                GradientDrawable glowBg = new GradientDrawable();
                glowBg.setShape(GradientDrawable.OVAL);
                glowBg.setColor(Color.parseColor("#0DF2662E"));
                glowView.setBackground(glowBg);
                glowView.setLayoutParams(glowP);

                // Centre card
                LinearLayout card = new LinearLayout(activity);
                card.setOrientation(LinearLayout.VERTICAL);
                card.setGravity(Gravity.CENTER_HORIZONTAL);

                RelativeLayout.LayoutParams cardP = new RelativeLayout.LayoutParams(
                        ViewGroup.LayoutParams.WRAP_CONTENT,
                        ViewGroup.LayoutParams.WRAP_CONTENT);
                cardP.addRule(RelativeLayout.CENTER_IN_PARENT);
                card.setLayoutParams(cardP);
                card.setMinimumWidth(dp(activity, 260));

                GradientDrawable cardBg = new GradientDrawable(
                        GradientDrawable.Orientation.TOP_BOTTOM,
                        new int[]{Color.parseColor("#F0100608"),
                                Color.parseColor("#F007030A")});
                cardBg.setCornerRadius(dp(activity, 24));
                cardBg.setStroke(dp(activity, 1), Color.parseColor("#22F2662E"));
                card.setBackground(cardBg);
                card.setPadding(dp(activity, 40), dp(activity, 36),
                        dp(activity, 40), dp(activity, 36));
                if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.LOLLIPOP)
                    card.setElevation(dp(activity, 16));

                ProgressBar spinner = new ProgressBar(activity);
                spinner.setId(8883);
                spinner.getIndeterminateDrawable().setColorFilter(
                        Color.parseColor("#F2662E"),
                        android.graphics.PorterDuff.Mode.SRC_IN);
                LinearLayout.LayoutParams spP = new LinearLayout.LayoutParams(
                        dp(activity, 44), dp(activity, 44));
                spP.gravity = Gravity.CENTER_HORIZONTAL;
                spP.bottomMargin = dp(activity, 20);
                spinner.setLayoutParams(spP);

                TextView loadingText = new TextView(activity);
                loadingText.setId(8881);
                loadingText.setText("Authenticating...");
                loadingText.setTextColor(Color.parseColor("#F7F4EE"));
                loadingText.setTextSize(TypedValue.COMPLEX_UNIT_SP, 18);
                loadingText.setGravity(Gravity.CENTER);
                ModMediaUtils.applyFont(activity, loadingText, "title.ttf");

                TextView subText = new TextView(activity);
                subText.setId(8882);
                subText.setText("Connecting to server");
                subText.setTextColor(Color.parseColor("#A79E90"));
                subText.setTextSize(TypedValue.COMPLEX_UNIT_SP, 12);
                subText.setGravity(Gravity.CENTER);
                subText.setPadding(0, dp(activity, 8), 0, 0);
                ModMediaUtils.applyFont(activity, subText, "body.ttf");

                card.addView(spinner);
                card.addView(loadingText);
                card.addView(subText);

                rootLayout.addView(glowView);
                rootLayout.addView(card);

                ModMediaUtils.applyEntranceAnimation(card);
                splashDialog.setContentView(rootLayout);
                splashDialog.show();

                ModNetworkManager.checkUpdateAndInit(activity, new Runnable() {
                    @Override
                    public void run() {
                        ModNetworkManager.silentKeyCheck(activity, new Runnable() {
                            @Override
                            public void run() {
                                removeSplashScreen(activity);
                                showVerificationDialog(activity);
                            }
                        });
                    }
                });
            }
        });
    }

    // ══════════════════════════════════════════
    //  🔐  VERIFICATION DIALOG
    // ══════════════════════════════════════════
    public static void showVerificationDialog(final Activity activity) {
        final Dialog dialog = buildBaseDialog(activity);

        ScrollView scrollRoot = new ScrollView(activity);
        scrollRoot.setPadding(dp(activity, 20), dp(activity, 16),
                dp(activity, 20), dp(activity, 16));
        scrollRoot.setClipToPadding(false);
        scrollRoot.setVerticalScrollBarEnabled(false);

        final RelativeLayout card = new RelativeLayout(activity);
        card.setBackground(makeCardBg(26, activity));
        card.setPadding(dp(activity, 22), dp(activity, 24),
                dp(activity, 22), dp(activity, 26));
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.LOLLIPOP)
            card.setElevation(dp(activity, 16));

        // IDs
        final int ID_INFO   = View.generateViewId();
        final int ID_AVATAR = View.generateViewId();
        final int ID_TITLE  = View.generateViewId();
        final int ID_SUB    = View.generateViewId();
        final int ID_INPUT  = View.generateViewId();
        final int ID_BTNROW = View.generateViewId();
        final int ID_LOGIN  = View.generateViewId();

        // ── ⓘ Info button ──────────────────────
        final TextView infoBtn = new TextView(activity);
        infoBtn.setId(ID_INFO);
        infoBtn.setText("\u24D8");
        infoBtn.setTextColor(Color.parseColor("#EAB84C"));
        infoBtn.setTextSize(TypedValue.COMPLEX_UNIT_SP, 18);
        infoBtn.setGravity(Gravity.CENTER);
        GradientDrawable infoBg = new GradientDrawable();
        infoBg.setShape(GradientDrawable.OVAL);
        infoBg.setColor(Color.parseColor("#14EAB84C"));
        infoBg.setStroke(dp(activity, 1), Color.parseColor("#33EAB84C"));
        infoBtn.setBackground(infoBg);
        RelativeLayout.LayoutParams infoP =
                new RelativeLayout.LayoutParams(dp(activity, 36), dp(activity, 36));
        infoP.addRule(RelativeLayout.ALIGN_PARENT_LEFT);
        infoP.addRule(RelativeLayout.ALIGN_PARENT_TOP);
        infoBtn.setLayoutParams(infoP);

        // ── Avatar ─────────────────────────────
        FrameLayout avatarFrame = buildAvatarFrame(activity, 86);
        avatarFrame.setId(ID_AVATAR);
        RelativeLayout.LayoutParams avP =
                new RelativeLayout.LayoutParams(dp(activity, 86), dp(activity, 86));
        avP.addRule(RelativeLayout.CENTER_HORIZONTAL);
        avP.topMargin = dp(activity, 8);
        avatarFrame.setLayoutParams(avP);

        // ── Title ──────────────────────────────
        TextView titleTv = new TextView(activity);
        titleTv.setId(ID_TITLE);
        titleTv.setText(APP_TITLE);
        titleTv.setTextColor(Color.parseColor("#F7F4EE"));
        titleTv.setTextSize(TypedValue.COMPLEX_UNIT_SP, 22);
        titleTv.setGravity(Gravity.CENTER);
        ModMediaUtils.applyFont(activity, titleTv, "title.ttf");
        RelativeLayout.LayoutParams titleP = new RelativeLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        titleP.addRule(RelativeLayout.BELOW, ID_AVATAR);
        titleP.addRule(RelativeLayout.CENTER_HORIZONTAL);
        titleP.topMargin = dp(activity, 14);
        titleTv.setLayoutParams(titleP);

        // ── Subtitle ───────────────────────────
        TextView subTv = new TextView(activity);
        subTv.setId(ID_SUB);
        subTv.setText(APP_SUBTITLE);
        subTv.setTextColor(Color.parseColor("#A79E90"));
        subTv.setTextSize(TypedValue.COMPLEX_UNIT_SP, 12);
        subTv.setGravity(Gravity.CENTER);
        ModMediaUtils.applyFont(activity, subTv, "body.ttf");
        RelativeLayout.LayoutParams subP = new RelativeLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        subP.addRule(RelativeLayout.BELOW, ID_TITLE);
        subP.addRule(RelativeLayout.CENTER_HORIZONTAL);
        subP.topMargin = dp(activity, 4);
        subP.bottomMargin = dp(activity, 22);
        subTv.setLayoutParams(subP);

        // ── Key input ──────────────────────────
        final EditText keyInput = new EditText(activity);
        keyInput.setId(ID_INPUT);
        keyInput.setHint("Enter your key  (DG-XXXXX)");
        keyInput.setHintTextColor(Color.parseColor("#55F7F4EE"));
        keyInput.setTextColor(Color.parseColor("#F7F4EE"));
        keyInput.setTextSize(TypedValue.COMPLEX_UNIT_SP, 15);
        keyInput.setPadding(dp(activity, 18), dp(activity, 14),
                dp(activity, 18), dp(activity, 14));
        keyInput.setInputType(InputType.TYPE_CLASS_TEXT
                | InputType.TYPE_TEXT_FLAG_NO_SUGGESTIONS);
        keyInput.setGravity(Gravity.CENTER);
        keyInput.setSingleLine(true);

        GradientDrawable inputBg = new GradientDrawable();
        inputBg.setColor(Color.parseColor("#0EF2662E"));
        inputBg.setStroke(dp(activity, 1), Color.parseColor("#33F2662E"));
        inputBg.setCornerRadius(dp(activity, 14));
        keyInput.setBackground(inputBg);

        keyInput.setOnFocusChangeListener(new View.OnFocusChangeListener() {
            @Override
            public void onFocusChange(View v, boolean hasFocus) {
                GradientDrawable focusBg = new GradientDrawable();
                focusBg.setColor(Color.parseColor(hasFocus ? "#14F2662E" : "#0EF2662E"));
                focusBg.setStroke(dp(activity, hasFocus ? 2 : 1),
                        Color.parseColor(hasFocus ? "#66F2662E" : "#33F2662E"));
                focusBg.setCornerRadius(dp(activity, 14));
                keyInput.setBackground(focusBg);
            }
        });

        String savedKey = activity.getSharedPreferences("DG_Prefs", Context.MODE_PRIVATE)
                .getString("saved_key", "");
        if (!savedKey.isEmpty()) keyInput.setText(savedKey);

        RelativeLayout.LayoutParams inputP = new RelativeLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        inputP.addRule(RelativeLayout.BELOW, ID_SUB);
        inputP.bottomMargin = dp(activity, 14);
        keyInput.setLayoutParams(inputP);

        // ── Get Key / Admin row ────────────────
        LinearLayout btnRow = new LinearLayout(activity);
        btnRow.setId(ID_BTNROW);
        btnRow.setOrientation(LinearLayout.HORIZONTAL);
        btnRow.setWeightSum(2f);
        RelativeLayout.LayoutParams rowP = new RelativeLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        rowP.addRule(RelativeLayout.BELOW, ID_INPUT);
        rowP.bottomMargin = dp(activity, 12);
        btnRow.setLayoutParams(rowP);

        Button getKeyBtn = makeOutlineButton(activity, "Get Key");
        LinearLayout.LayoutParams gkP =
                new LinearLayout.LayoutParams(0, dp(activity, 46), 1f);
        gkP.rightMargin = dp(activity, 6);
        getKeyBtn.setLayoutParams(gkP);

        Button adminBtn = makeOutlineButton(activity, "Admin");
        LinearLayout.LayoutParams adP =
                new LinearLayout.LayoutParams(0, dp(activity, 46), 1f);
        adP.leftMargin = dp(activity, 6);
        adminBtn.setLayoutParams(adP);

        btnRow.addView(getKeyBtn);
        btnRow.addView(adminBtn);

        // ── Login button ───────────────────────
        final Button loginBtn = makeGradientButton(activity, "Login / Verify");
        loginBtn.setId(ID_LOGIN);
        RelativeLayout.LayoutParams loginP = new RelativeLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, dp(activity, 50));
        loginP.addRule(RelativeLayout.BELOW, ID_BTNROW);
        loginP.bottomMargin = dp(activity, 20);
        loginBtn.setLayoutParams(loginP);

        // ── Social row ─────────────────────────
        final int ID_SOCIAL = View.generateViewId();
        LinearLayout socialRow = new LinearLayout(activity);
        socialRow.setId(ID_SOCIAL);
        socialRow.setOrientation(LinearLayout.HORIZONTAL);
        socialRow.setGravity(Gravity.CENTER_HORIZONTAL);
        RelativeLayout.LayoutParams socialP = new RelativeLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        socialP.addRule(RelativeLayout.BELOW, ID_LOGIN);
        socialRow.setLayoutParams(socialP);

        socialRow.addView(makeSocialIcon(activity, "insta.png", "insta", "#E1306C", "I"));
        socialRow.addView(makeSocialIcon(activity, "tele.png",  "tele",  "#0088CC", "T"));
        socialRow.addView(makeSocialIcon(activity, "yt.png",    "yt",    "#FF0000", "Y"));
        socialRow.addView(makeSocialIcon(activity, "wa.png",    "wa",    "#25D366", "W"));

        card.addView(infoBtn);
        card.addView(avatarFrame);
        card.addView(titleTv);
        card.addView(subTv);
        card.addView(keyInput);
        card.addView(btnRow);
        card.addView(loginBtn);
        card.addView(socialRow);

        scrollRoot.addView(card, new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT));

        ModMediaUtils.applyEntranceAnimation(card);
        dialog.setContentView(scrollRoot);
        safeShow(dialog, activity);

        // Touch ripples
        ModMediaUtils.applyTouchRipple(getKeyBtn, activity);
        ModMediaUtils.applyTouchRipple(adminBtn, activity);
        ModMediaUtils.applyTouchRipple(loginBtn, activity);
        ModMediaUtils.applyTouchRipple(infoBtn, activity);

        // Auto-paste from clipboard on window focus
        Window win = dialog.getWindow();
        if (win != null) {
            win.getDecorView().getViewTreeObserver()
                    .addOnWindowFocusChangeListener(
                            new android.view.ViewTreeObserver.OnWindowFocusChangeListener() {
                                @Override
                                public void onWindowFocusChanged(boolean hasFocus) {
                                    if (!hasFocus) return;
                                    try {
                                        android.content.ClipboardManager cb =
                                                (android.content.ClipboardManager)
                                                        activity.getSystemService(
                                                                Context.CLIPBOARD_SERVICE);
                                        if (cb == null || !cb.hasPrimaryClip()) return;
                                        CharSequence txt =
                                                cb.getPrimaryClip().getItemAt(0).getText();
                                        if (txt == null) return;
                                        String clip = txt.toString().trim();
                                        String current = keyInput.getText().toString().trim();
                                        if ((clip.startsWith("DG-") || clip.startsWith("VIP-"))
                                                && clip.length() >= 8
                                                && !clip.equals(current)) {
                                            keyInput.setText(clip);
                                            ModMediaUtils.hapticSuccess(activity);
                                            ModMediaUtils.showAnimatedToast(
                                                    activity, "Key Auto-Pasted!");
                                            cb.setPrimaryClip(
                                                    android.content.ClipData.newPlainText("", ""));
                                            new android.os.Handler(
                                                    android.os.Looper.getMainLooper())
                                                    .postDelayed(new Runnable() {
                                                        @Override
                                                        public void run() {
                                                            loginBtn.performClick();
                                                        }
                                                    }, 500);
                                        }
                                    } catch (Exception ignored) {}
                                }
                            });
        }

        // Emerge tooltip on infoBtn after short delay
        infoBtn.postDelayed(new Runnable() {
            @Override
            public void run() {
                ModMediaUtils.showEmergeToast(activity, card, infoBtn, "Watch Tutorial");
            }
        }, 600);

        infoBtn.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                ModMediaUtils.hapticTick(activity);
                ModNetworkManager.fetchAndOpenLink(activity, "tutorial");
            }
        });

        getKeyBtn.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                ModMediaUtils.hapticMedium(activity);
                ModNetworkManager.generateAndOpenKeyLink(activity);
            }
        });

        adminBtn.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                ModMediaUtils.hapticMedium(activity);
                ModNetworkManager.fetchAndOpenLink(activity, "admin");
            }
        });

        loginBtn.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                String key = keyInput.getText().toString().trim();
                if (key.isEmpty()
                        || (!key.startsWith("DG-") && !key.startsWith("VIP-"))) {
                    ModMediaUtils.hapticError(activity);
                    ModMediaUtils.playSound(activity, "fail.mp3");
                    shakeView(keyInput);
                    ModMediaUtils.showAnimatedToast(
                            activity, "Invalid Format! Key must start with DG-");
                    return;
                }
                activity.getSharedPreferences("DG_Prefs", Context.MODE_PRIVATE)
                        .edit().putString("saved_key", key).apply();
                ModMediaUtils.hapticMedium(activity);
                ModNetworkManager.verifyKey(activity, dialog, key);
            }
        });
    }

    // ══════════════════════════════════════════
    //  UI BUILDERS
    // ══════════════════════════════════════════

    /** Ember gradient primary button */
    private static Button makeGradientButton(Context ctx, String text) {
        Button btn = new Button(ctx);
        btn.setText(text);
        btn.setAllCaps(false);
        // Dark ember-ink text for contrast on the light gold gradient end
        // (matches the web --primary-foreground token).
        btn.setTextColor(Color.parseColor("#241206"));
        btn.setTextSize(TypedValue.COMPLEX_UNIT_SP, 15);
        ModMediaUtils.applyFont(ctx, btn, "title.ttf");
        GradientDrawable bg = new GradientDrawable(
                GradientDrawable.Orientation.LEFT_RIGHT,
                new int[]{Color.parseColor("#F2662E"), Color.parseColor("#EAB84C")});
        bg.setCornerRadius(dp(ctx, 14));
        btn.setBackground(bg);
        return btn;
    }

    /** Ghost outline secondary button */
    private static Button makeOutlineButton(Context ctx, String text) {
        Button btn = new Button(ctx);
        btn.setText(text);
        btn.setAllCaps(false);
        btn.setTextColor(Color.parseColor("#F7F4EE"));
        btn.setTextSize(TypedValue.COMPLEX_UNIT_SP, 13);
        ModMediaUtils.applyFont(ctx, btn, "title.ttf");
        GradientDrawable bg = new GradientDrawable();
        bg.setColor(Color.parseColor("#0EF2662E"));
        bg.setStroke(dp(ctx, 1), Color.parseColor("#44F2662E"));
        bg.setCornerRadius(dp(ctx, 14));
        btn.setBackground(bg);
        return btn;
    }

    /** Solid colour button (close) */
    private static Button makePrimaryButton(Context ctx, String text, String hexColor) {
        Button btn = new Button(ctx);
        btn.setText(text);
        btn.setAllCaps(false);
        btn.setTextColor(Color.parseColor("#F7F4EE"));
        btn.setTextSize(TypedValue.COMPLEX_UNIT_SP, 15);
        ModMediaUtils.applyFont(ctx, btn, "title.ttf");
        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, dp(ctx, 50));
        btn.setLayoutParams(lp);
        GradientDrawable bg = new GradientDrawable();
        bg.setColor(Color.parseColor(hexColor));
        bg.setCornerRadius(dp(ctx, 14));
        btn.setBackground(bg);
        return btn;
    }

    /** Circular avatar frame with profile.mp4 */
    private static FrameLayout buildAvatarFrame(Activity activity, int sizeDp) {
        FrameLayout frame = new FrameLayout(activity);
        GradientDrawable ring = new GradientDrawable();
        ring.setShape(GradientDrawable.OVAL);
        ring.setColor(Color.parseColor("#0EF2662E"));
        ring.setStroke(dp(activity, 2), Color.parseColor("#66F2662E"));
        frame.setBackground(ring);
        int pad = dp(activity, 3);
        frame.setPadding(pad, pad, pad, pad);

        TextureView tv = new TextureView(activity);
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.LOLLIPOP) {
            tv.setOutlineProvider(new ViewOutlineProvider() {
                @Override
                public void getOutline(View view, Outline outline) {
                    outline.setOval(0, 0, view.getWidth(), view.getHeight());
                }
            });
            tv.setClipToOutline(true);
        }
        frame.addView(tv, new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT));
        ModMediaUtils.setupProfileVideo(activity, tv);
        return frame;
    }

    /** Circular social icon */
    private static View makeSocialIcon(final Activity activity,
                                       String assetName, final String typeId,
                                       String fallbackColor, String fallbackLetter) {
        FrameLayout container = new FrameLayout(activity);
        int size = dp(activity, 44);
        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(size, size);
        lp.setMargins(dp(activity, 7), 0, dp(activity, 7), 0);
        container.setLayoutParams(lp);

        try {
            ImageView iv = new ImageView(activity);
            InputStream is = activity.getAssets().open(assetName);
            iv.setImageDrawable(
                    android.graphics.drawable.Drawable.createFromStream(is, null));
            iv.setScaleType(ImageView.ScaleType.FIT_CENTER);
            is.close();
            container.addView(iv, new FrameLayout.LayoutParams(
                    ViewGroup.LayoutParams.MATCH_PARENT,
                    ViewGroup.LayoutParams.MATCH_PARENT));
        } catch (Exception e) {
            TextView tv = new TextView(activity);
            tv.setText(fallbackLetter);
            tv.setTextColor(Color.WHITE);
            tv.setGravity(Gravity.CENTER);
            tv.setTextSize(TypedValue.COMPLEX_UNIT_SP, 17);
            GradientDrawable circle = new GradientDrawable();
            circle.setShape(GradientDrawable.OVAL);
            circle.setColor(Color.parseColor(fallbackColor));
            tv.setBackground(circle);
            container.addView(tv, new FrameLayout.LayoutParams(
                    ViewGroup.LayoutParams.MATCH_PARENT,
                    ViewGroup.LayoutParams.MATCH_PARENT));
        }

        ModMediaUtils.applyTouchRipple(container, activity);
        container.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                ModMediaUtils.hapticTick(activity);
                ModMediaUtils.showAnimatedToast(activity, "Fetching link...");
                ModNetworkManager.fetchAndOpenLink(activity, typeId);
            }
        });
        return container;
    }

    /** Horizontal shake animation for invalid key input */
    private static void shakeView(View view) {
        TranslateAnimation shake = new TranslateAnimation(0, 12, 0, 0);
        shake.setDuration(60);
        shake.setRepeatCount(5);
        shake.setRepeatMode(Animation.REVERSE);
        shake.setInterpolator(new DecelerateInterpolator());
        view.startAnimation(shake);
    }

    // ══════════════════════════════════════════
    //  UTILS
    // ══════════════════════════════════════════
    public static void openUrl(Context ctx, String url) {
        try {
            Intent i = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
            i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            ctx.startActivity(i);
        } catch (Exception ignored) {}
    }

    public static int dp(Context ctx, int dp) {
        return (int) TypedValue.applyDimension(
                TypedValue.COMPLEX_UNIT_DIP, dp,
                ctx.getResources().getDisplayMetrics());
    }

    public static void showVipSuccessDialog(final Activity activity,
                                            final String keyStr,
                                            final String durationMode) {
        final Dialog dialog = buildBaseDialog(activity);

        FrameLayout root = new FrameLayout(activity);
        root.setPadding(dp(activity, 22), dp(activity, 16), dp(activity, 22), dp(activity, 16));

        LinearLayout card = new LinearLayout(activity);
        card.setOrientation(LinearLayout.VERTICAL);
        card.setGravity(android.view.Gravity.CENTER_HORIZONTAL);
        card.setPadding(dp(activity, 28), dp(activity, 32), dp(activity, 28), dp(activity, 28));

        GradientDrawable cardBg = new GradientDrawable(
                GradientDrawable.Orientation.TOP_BOTTOM,
                new int[]{Color.parseColor("#F0120809"), Color.parseColor("#F007030A")});
        cardBg.setCornerRadius(dp(activity, 28));
        cardBg.setStroke(dp(activity, 2), Color.parseColor("#EAB84C"));
        card.setBackground(cardBg);
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.LOLLIPOP)
            card.setElevation(dp(activity, 24));

        android.view.View glowBlob = new android.view.View(activity);
        FrameLayout.LayoutParams blobP = new FrameLayout.LayoutParams(
                dp(activity, 280), dp(activity, 280));
        blobP.gravity = android.view.Gravity.CENTER;
        glowBlob.setLayoutParams(blobP);
        GradientDrawable blobBg = new GradientDrawable();
        blobBg.setShape(GradientDrawable.OVAL);
        blobBg.setColor(Color.parseColor("#18EAB84C"));
        glowBlob.setBackground(blobBg);

        TextView crownTv = new TextView(activity);
        crownTv.setText("\uD83D\uDC51");
        crownTv.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 52);
        crownTv.setGravity(android.view.Gravity.CENTER);
        LinearLayout.LayoutParams crownP = new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        crownP.gravity = android.view.Gravity.CENTER_HORIZONTAL;
        crownP.bottomMargin = dp(activity, 4);
        crownTv.setLayoutParams(crownP);

        android.view.animation.ScaleAnimation pulse = new android.view.animation.ScaleAnimation(
                0.85f, 1.10f, 0.85f, 1.10f,
                android.view.animation.Animation.RELATIVE_TO_SELF, 0.5f,
                android.view.animation.Animation.RELATIVE_TO_SELF, 0.5f);
        pulse.setDuration(700);
        pulse.setRepeatCount(3);
        pulse.setRepeatMode(android.view.animation.Animation.REVERSE);
        pulse.setInterpolator(new android.view.animation.DecelerateInterpolator());
        crownTv.startAnimation(pulse);

        TextView titleTv = new TextView(activity);
        titleTv.setText("VIP ACCESS GRANTED");
        titleTv.setTextColor(Color.parseColor("#EAB84C"));
        titleTv.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 22);
        titleTv.setGravity(android.view.Gravity.CENTER);
        titleTv.setLetterSpacing(0.06f);
        ModMediaUtils.applyFont(activity, titleTv, "title.ttf");
        LinearLayout.LayoutParams titleP = new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        titleP.gravity = android.view.Gravity.CENTER_HORIZONTAL;
        titleP.bottomMargin = dp(activity, 6);
        titleTv.setLayoutParams(titleP);

        TextView subTv = new TextView(activity);
        subTv.setText("Welcome to the exclusive VIP experience");
        subTv.setTextColor(Color.parseColor("#A79E90"));
        subTv.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 13);
        subTv.setGravity(android.view.Gravity.CENTER);
        ModMediaUtils.applyFont(activity, subTv, "body.ttf");
        LinearLayout.LayoutParams subP = new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        subP.bottomMargin = dp(activity, 24);
        subTv.setLayoutParams(subP);

        android.view.View sep = new android.view.View(activity);
        sep.setBackgroundColor(Color.parseColor("#33EAB84C"));
        LinearLayout.LayoutParams sepP = new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, dp(activity, 1));
        sepP.bottomMargin = dp(activity, 20);
        sep.setLayoutParams(sepP);

        LinearLayout pillRow = new LinearLayout(activity);
        pillRow.setOrientation(LinearLayout.HORIZONTAL);
        pillRow.setGravity(android.view.Gravity.CENTER_HORIZONTAL);
        LinearLayout.LayoutParams pillRowP = new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        pillRowP.bottomMargin = dp(activity, 22);
        pillRow.setLayoutParams(pillRowP);
        pillRow.addView(makeVipPill(activity, "\uD83D\uDD11 " + keyStr));
        pillRow.addView(makeVipPill(activity, "\u23F3 " + durationLabel(durationMode)));

        LinearLayout benefitBox = new LinearLayout(activity);
        benefitBox.setOrientation(LinearLayout.VERTICAL);
        benefitBox.setPadding(dp(activity, 16), dp(activity, 14), dp(activity, 16), dp(activity, 14));
        GradientDrawable benefitBg = new GradientDrawable();
        benefitBg.setColor(Color.parseColor("#10EAB84C"));
        benefitBg.setCornerRadius(dp(activity, 16));
        benefitBg.setStroke(dp(activity, 1), Color.parseColor("#22EAB84C"));
        benefitBox.setBackground(benefitBg);
        LinearLayout.LayoutParams benefitP = new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        benefitP.bottomMargin = dp(activity, 24);
        benefitBox.setLayoutParams(benefitP);

        String[] perks = {
            "\u2728  All Dynamons unlocked",
            "\uD83D\uDC8E  Exclusive VIP skins & emotes",
            "\u26A1  Overpowered stats activated",
            "\uD83D\uDEAB  Ads permanently removed",
            "\uD83D\uDC51  Priority VIP support"
        };
        for (String perk : perks) {
            TextView perkTv = new TextView(activity);
            perkTv.setText(perk);
            perkTv.setTextColor(Color.parseColor("#D8D2C6"));
            perkTv.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 13);
            ModMediaUtils.applyFont(activity, perkTv, "body.ttf");
            LinearLayout.LayoutParams pkP = new LinearLayout.LayoutParams(
                    ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
            pkP.bottomMargin = dp(activity, 8);
            perkTv.setLayoutParams(pkP);
            benefitBox.addView(perkTv);
        }

        Button enterBtn = new Button(activity);
        enterBtn.setText("ENTER THE REALM");
        enterBtn.setAllCaps(false);
        enterBtn.setTextColor(Color.parseColor("#07030A"));
        enterBtn.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 16);
        ModMediaUtils.applyFont(activity, enterBtn, "title.ttf");
        GradientDrawable btnBg = new GradientDrawable(
                GradientDrawable.Orientation.LEFT_RIGHT,
                new int[]{Color.parseColor("#EAB84C"), Color.parseColor("#FBBF24")});
        btnBg.setCornerRadius(dp(activity, 16));
        enterBtn.setBackground(btnBg);
        LinearLayout.LayoutParams enterP = new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, dp(activity, 54));
        enterBtn.setLayoutParams(enterP);
        ModMediaUtils.applyTouchRipple(enterBtn, activity);

        enterBtn.setOnClickListener(new android.view.View.OnClickListener() {
            @Override
            public void onClick(android.view.View v) {
                ModMediaUtils.hapticUnlock(activity);
                dialog.dismiss();
                // TODO: Start your main activity here
            }
        });

        card.addView(crownTv);
        card.addView(titleTv);
        card.addView(subTv);
        card.addView(sep);
        card.addView(pillRow);
        card.addView(benefitBox);
        card.addView(enterBtn);

        root.addView(glowBlob);
        root.addView(card, new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT));

        ModMediaUtils.applyEntranceAnimation(card);
        dialog.setContentView(root);
        safeShow(dialog, activity);
    }

    private static android.view.View makeVipPill(android.content.Context ctx, String text) {
        TextView tv = new TextView(ctx);
        tv.setText(text);
        tv.setTextColor(Color.parseColor("#EAB84C"));
        tv.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 11);
        tv.setGravity(android.view.Gravity.CENTER);
        ModMediaUtils.applyFont(ctx, tv, "body.ttf");
        int hPad = (int) android.util.TypedValue.applyDimension(
                android.util.TypedValue.COMPLEX_UNIT_DIP, 12,
                ctx.getResources().getDisplayMetrics());
        int vPad = (int) android.util.TypedValue.applyDimension(
                android.util.TypedValue.COMPLEX_UNIT_DIP, 7,
                ctx.getResources().getDisplayMetrics());
        tv.setPadding(hPad, vPad, hPad, vPad);
        GradientDrawable bg = new GradientDrawable();
        bg.setColor(Color.parseColor("#14EAB84C"));
        bg.setStroke((int) android.util.TypedValue.applyDimension(
                android.util.TypedValue.COMPLEX_UNIT_DIP, 1,
                ctx.getResources().getDisplayMetrics()), Color.parseColor("#44EAB84C"));
        bg.setCornerRadius((int) android.util.TypedValue.applyDimension(
                android.util.TypedValue.COMPLEX_UNIT_DIP, 20,
                ctx.getResources().getDisplayMetrics()));
        tv.setBackground(bg);
        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        lp.setMargins(
                (int) android.util.TypedValue.applyDimension(android.util.TypedValue.COMPLEX_UNIT_DIP, 4, ctx.getResources().getDisplayMetrics()),
                0,
                (int) android.util.TypedValue.applyDimension(android.util.TypedValue.COMPLEX_UNIT_DIP, 4, ctx.getResources().getDisplayMetrics()),
                0);
        tv.setLayoutParams(lp);
        return tv;
    }

    private static String durationLabel(String mode) {
        if (mode == null) return "24 Hours";
        switch (mode.toLowerCase().trim()) {
            case "2h":   return "2 Hours";
            case "1d":   return "24 Hours";
            case "7d":   return "7 Days";
            case "1m":   return "1 Month";
            case "life": return "Lifetime \u267E";
            default:     return mode + " Hours";
        }
    }

}
