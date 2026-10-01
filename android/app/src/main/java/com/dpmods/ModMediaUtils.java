package com.dpmods;

import android.app.Activity;
import android.content.Context;
import android.content.res.AssetFileDescriptor;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.SurfaceTexture;
import android.graphics.drawable.GradientDrawable;
import android.media.MediaPlayer;
import android.os.Handler;
import android.os.Looper;
import android.util.TypedValue;
import android.view.Gravity;
import android.view.MotionEvent;
import android.view.Surface;
import android.view.TextureView;
import android.view.View;
import android.view.ViewGroup;
import android.view.animation.AlphaAnimation;
import android.view.animation.Animation;
import android.view.animation.AnimationSet;
import android.view.animation.AnticipateInterpolator;
import android.view.animation.DecelerateInterpolator;
import android.view.animation.OvershootInterpolator;
import android.view.animation.ScaleAnimation;
import android.view.animation.TranslateAnimation;
import android.widget.FrameLayout;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.RelativeLayout;
import android.widget.TextView;

public class ModMediaUtils {

    // ─────────────────────────────────────────────────────────────
    //  EMBER PALETTE  (mirrors Dynamon Gamer website)
    //   Deep BG  #07030A  |  Accent  #FF4500  |  Gold  #F59E0B
    //   Text     #E8ECFF  |  Muted   #8B92B8  |  Green #22C55E
    // ─────────────────────────────────────────────────────────────

    private static View currentToastView = null;

    // ══════════════════════════════════════════════════════════════
    //  🎥  PROFILE VIDEO LOOPER
    // ══════════════════════════════════════════════════════════════
    public static void setupProfileVideo(final Context context, TextureView textureView) {
        textureView.setSurfaceTextureListener(new TextureView.SurfaceTextureListener() {
            MediaPlayer mediaPlayer;

            @Override
            public void onSurfaceTextureAvailable(SurfaceTexture st, int w, int h) {
                try {
                    mediaPlayer = new MediaPlayer();
                    AssetFileDescriptor afd = context.getAssets().openFd("profile.mp4");
                    mediaPlayer.setDataSource(afd.getFileDescriptor(), afd.getStartOffset(), afd.getLength());
                    afd.close();
                    mediaPlayer.setSurface(new Surface(st));
                    mediaPlayer.setLooping(true);
                    mediaPlayer.setVolume(0f, 0f);
                    mediaPlayer.prepare();
                    mediaPlayer.start();
                } catch (Exception ignored) {}
            }

            @Override public void onSurfaceTextureSizeChanged(SurfaceTexture s, int w, int h) {}
            @Override public void onSurfaceTextureUpdated(SurfaceTexture s) {}

            @Override
            public boolean onSurfaceTextureDestroyed(SurfaceTexture s) {
                if (mediaPlayer != null) {
                    mediaPlayer.stop();
                    mediaPlayer.release();
                    mediaPlayer = null;
                }
                return true;
            }
        });
    }

    // ══════════════════════════════════════════════════════════════
    //  🔤  FONT
    // ══════════════════════════════════════════════════════════════
    public static void applyFont(Context ctx, TextView view, String fontName) {
        try {
            view.setTypeface(Typeface.createFromAsset(ctx.getAssets(), fontName));
        } catch (Exception e) {
            view.setTypeface(Typeface.DEFAULT_BOLD);
        }
    }

    // ══════════════════════════════════════════════════════════════
    //  🔊  SOUND
    // ══════════════════════════════════════════════════════════════
    public static void playSound(Context ctx, String file) {
        try {
            MediaPlayer mp = new MediaPlayer();
            AssetFileDescriptor afd = ctx.getAssets().openFd(file);
            mp.setDataSource(afd.getFileDescriptor(), afd.getStartOffset(), afd.getLength());
            afd.close();
            mp.prepare();
            mp.start();
            mp.setOnCompletionListener(new MediaPlayer.OnCompletionListener() {
                @Override
                public void onCompletion(MediaPlayer mp) {
                    mp.release();
                }
            });
        } catch (Exception ignored) {}
    }

    // ══════════════════════════════════════════════════════════════
    //  📳  HAPTICS  — tiered patterns
    // ══════════════════════════════════════════════════════════════
    public static void vibrateDevice(Context ctx, long[] pattern) {
        try {
            android.os.Vibrator v =
                    (android.os.Vibrator) ctx.getSystemService(Context.VIBRATOR_SERVICE);
            if (v == null || !v.hasVibrator()) return;
            if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
                v.vibrate(android.os.VibrationEffect.createWaveform(pattern, -1));
            } else {
                v.vibrate(pattern, -1);
            }
        } catch (Exception ignored) {}
    }

    /** Soft UI tick — use on any tap */
    public static void hapticTick(Context ctx)    { vibrateDevice(ctx, new long[]{0, 8});               }
    /** Button press feedback */
    public static void hapticMedium(Context ctx)  { vibrateDevice(ctx, new long[]{0, 18});              }
    /** Error / invalid key */
    public static void hapticError(Context ctx)   { vibrateDevice(ctx, new long[]{0, 40, 50, 40});      }
    /** Success / verified */
    public static void hapticSuccess(Context ctx) { vibrateDevice(ctx, new long[]{0, 15, 25, 15});      }
    /** Premium unlock burst */
    public static void hapticUnlock(Context ctx)  { vibrateDevice(ctx, new long[]{0, 20, 40, 20, 40, 60}); }

    // ══════════════════════════════════════════════════════════════
    //  👆  TOUCH RIPPLE  — scale + dim on press, spring on release
    // ══════════════════════════════════════════════════════════════
    public static void applyTouchRipple(final View view, final Context ctx) {
        view.setOnTouchListener(new View.OnTouchListener() {
            @Override
            public boolean onTouch(View v, MotionEvent event) {
                switch (event.getAction()) {
                    case MotionEvent.ACTION_DOWN: {
                        hapticTick(ctx);
                        AnimationSet dn = new AnimationSet(true);
                        dn.setInterpolator(new DecelerateInterpolator(2f));
                        ScaleAnimation sd = new ScaleAnimation(1f, 0.95f, 1f, 0.95f,
                                Animation.RELATIVE_TO_SELF, 0.5f,
                                Animation.RELATIVE_TO_SELF, 0.5f);
                        sd.setDuration(90);
                        AlphaAnimation ad = new AlphaAnimation(1f, 0.82f);
                        ad.setDuration(90);
                        dn.addAnimation(sd);
                        dn.addAnimation(ad);
                        dn.setFillAfter(true);
                        view.startAnimation(dn);
                        break;
                    }
                    case MotionEvent.ACTION_UP:
                    case MotionEvent.ACTION_CANCEL: {
                        AnimationSet up = new AnimationSet(true);
                        up.setInterpolator(new OvershootInterpolator(2.8f));
                        ScaleAnimation su = new ScaleAnimation(0.95f, 1f, 0.95f, 1f,
                                Animation.RELATIVE_TO_SELF, 0.5f,
                                Animation.RELATIVE_TO_SELF, 0.5f);
                        su.setDuration(300);
                        AlphaAnimation au = new AlphaAnimation(0.82f, 1f);
                        au.setDuration(200);
                        up.addAnimation(su);
                        up.addAnimation(au);
                        up.setFillAfter(true);
                        view.startAnimation(up);
                        break;
                    }
                }
                return false; // always pass click through
            }
        });
    }

    // ══════════════════════════════════════════════════════════════
    //  🌊  CARD ENTRANCE  — spring pop from below
    // ══════════════════════════════════════════════════════════════
    public static void applyEntranceAnimation(View view) {
        AnimationSet set = new AnimationSet(true);
        set.setInterpolator(new OvershootInterpolator(1.15f));

        AlphaAnimation alpha = new AlphaAnimation(0f, 1f);
        alpha.setDuration(480);

        ScaleAnimation scale = new ScaleAnimation(0.84f, 1f, 0.84f, 1f,
                Animation.RELATIVE_TO_SELF, 0.5f,
                Animation.RELATIVE_TO_SELF, 0.5f);
        scale.setDuration(480);

        TranslateAnimation slide = new TranslateAnimation(0, 0, 70, 0);
        slide.setDuration(480);

        set.addAnimation(alpha);
        set.addAnimation(scale);
        set.addAnimation(slide);
        view.startAnimation(set);
    }

    // ══════════════════════════════════════════════════════════════
    //  💫  LOADING PULSE
    // ══════════════════════════════════════════════════════════════
    public static void applyPulse(final View view) {
        final boolean[] grow = {true};
        final Handler h = new Handler(Looper.getMainLooper());
        final Runnable[] r = {null};
        r[0] = new Runnable() {
            @Override
            public void run() {
                AlphaAnimation a = new AlphaAnimation(grow[0] ? 0.45f : 1f, grow[0] ? 1f : 0.45f);
                a.setDuration(680);
                a.setFillAfter(true);
                view.startAnimation(a);
                grow[0] = !grow[0];
                h.postDelayed(r[0], 680);
            }
        };
        h.post(r[0]);
        view.setTag(h);
    }

    // ══════════════════════════════════════════════════════════════
    //  🍞  EMERGE TOAST  (pops from anchor button)
    // ══════════════════════════════════════════════════════════════
    public static void showEmergeToast(final Activity activity,
                                       final RelativeLayout parent,
                                       final View anchor,
                                       final String message) {
        activity.runOnUiThread(new Runnable() {
            @Override
            public void run() {
                final TextView tv = new TextView(activity);
                tv.setText(message);
                tv.setTextColor(Color.parseColor("#E8ECFF"));
                tv.setTextSize(TypedValue.COMPLEX_UNIT_SP, 12);
                tv.setGravity(Gravity.CENTER);
                applyFont(activity, tv, "body.ttf");
                tv.setPadding(dp(activity, 16), 0, dp(activity, 16), 0);

                GradientDrawable bg = new GradientDrawable();
                bg.setColor(Color.parseColor("#F0070309"));
                bg.setStroke(dp(activity, 1), Color.parseColor("#55FF4500"));
                bg.setCornerRadius(dp(activity, 20));
                tv.setBackground(bg);

                RelativeLayout.LayoutParams p = new RelativeLayout.LayoutParams(
                        ViewGroup.LayoutParams.WRAP_CONTENT,
                        ViewGroup.LayoutParams.WRAP_CONTENT);
                p.addRule(RelativeLayout.RIGHT_OF, anchor.getId());
                p.addRule(RelativeLayout.ALIGN_TOP, anchor.getId());
                p.addRule(RelativeLayout.ALIGN_BOTTOM, anchor.getId());
                p.leftMargin = dp(activity, 8);
                parent.addView(tv, p);

                AnimationSet in = new AnimationSet(true);
                in.setInterpolator(new OvershootInterpolator(2f));
                TranslateAnimation ti = new TranslateAnimation(-60, 0, 0, 0); ti.setDuration(400);
                ScaleAnimation   si = new ScaleAnimation(0.4f, 1f, 0.4f, 1f,
                        Animation.RELATIVE_TO_SELF, 0f, Animation.RELATIVE_TO_SELF, 0.5f); si.setDuration(400);
                AlphaAnimation   ai = new AlphaAnimation(0f, 1f); ai.setDuration(300);
                in.addAnimation(ti); in.addAnimation(si); in.addAnimation(ai);
                tv.startAnimation(in);

                new Handler(Looper.getMainLooper()).postDelayed(new Runnable() {
                    @Override
                    public void run() {
                        AnimationSet out = new AnimationSet(true);
                        out.setInterpolator(new AnticipateInterpolator(1.8f));
                        TranslateAnimation to2 = new TranslateAnimation(0, -40, 0, 0); to2.setDuration(300);
                        ScaleAnimation   so2 = new ScaleAnimation(1f, 0.4f, 1f, 0.4f,
                                Animation.RELATIVE_TO_SELF, 0f, Animation.RELATIVE_TO_SELF, 0.5f); so2.setDuration(300);
                        AlphaAnimation   ao2 = new AlphaAnimation(1f, 0f); ao2.setDuration(300);
                        out.addAnimation(to2); out.addAnimation(so2); out.addAnimation(ao2);
                        out.setAnimationListener(new Animation.AnimationListener() {
                            @Override public void onAnimationStart(Animation a) {}
                            @Override public void onAnimationRepeat(Animation a) {}
                            @Override public void onAnimationEnd(Animation a) {
                                try { parent.removeView(tv); } catch (Exception ignored) {}
                            }
                        });
                        tv.startAnimation(out);
                    }
                }, 3000);
            }
        });
    }

    // ══════════════════════════════════════════════════════════════
    //  🔥  MAIN ANIMATED TOAST  — ember glow, drop-in / float-out
    // ══════════════════════════════════════════════════════════════
    public static void showAnimatedToast(final Activity activity, final String message) {
        activity.runOnUiThread(new Runnable() {
            @Override
            public void run() {
                final ViewGroup root = (ViewGroup) activity.getWindow().getDecorView();

                // Dismiss previous toast cleanly
                if (currentToastView != null) {
                    currentToastView.clearAnimation();
                    try { root.removeView(currentToastView); } catch (Exception ignored) {}
                    currentToastView = null;
                }

                // Container
                final LinearLayout layout = new LinearLayout(activity);
                layout.setOrientation(LinearLayout.HORIZONTAL);
                layout.setGravity(Gravity.CENTER_VERTICAL);
                layout.setPadding(dp(activity, 14), dp(activity, 10), dp(activity, 18), dp(activity, 10));

                GradientDrawable bg = new GradientDrawable();
                bg.setColor(Color.parseColor("#F2070309"));
                bg.setStroke(dp(activity, 1), Color.parseColor("#55FF4500"));
                bg.setCornerRadius(dp(activity, 30));
                layout.setBackground(bg);

                if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.LOLLIPOP) {
                    layout.setElevation(dp(activity, 10));
                }

                // Icon
                ImageView icon = new ImageView(activity);
                int sz = dp(activity, 26);
                LinearLayout.LayoutParams ip = new LinearLayout.LayoutParams(sz, sz);
                ip.rightMargin = dp(activity, 10);
                icon.setLayoutParams(ip);
                try {
                    java.io.InputStream is = activity.getAssets().open("toast_icon.png");
                    icon.setImageDrawable(
                            android.graphics.drawable.Drawable.createFromStream(is, null));
                    is.close();
                } catch (Exception ignored) {}

                // Message
                TextView text = new TextView(activity);
                text.setText(message);
                text.setTextColor(Color.parseColor("#E8ECFF"));
                text.setTextSize(TypedValue.COMPLEX_UNIT_SP, 13);
                applyFont(activity, text, "dynamon.ttf");

                layout.addView(icon);
                layout.addView(text);

                FrameLayout.LayoutParams lp = new FrameLayout.LayoutParams(
                        ViewGroup.LayoutParams.WRAP_CONTENT,
                        ViewGroup.LayoutParams.WRAP_CONTENT);
                lp.gravity = Gravity.TOP | Gravity.CENTER_HORIZONTAL;
                lp.topMargin = dp(activity, 72);

                currentToastView = layout;
                root.addView(layout, lp);
                layout.bringToFront();
                if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.LOLLIPOP)
                    layout.setTranslationZ(100f);

                // Drop-in with overshoot
                AnimationSet in = new AnimationSet(true);
                in.setInterpolator(new OvershootInterpolator(1.4f));
                TranslateAnimation ti = new TranslateAnimation(0, 0, -160, 0); ti.setDuration(460);
                AlphaAnimation   ai = new AlphaAnimation(0f, 1f); ai.setDuration(320);
                ScaleAnimation   si = new ScaleAnimation(0.8f, 1f, 0.8f, 1f,
                        Animation.RELATIVE_TO_SELF, 0.5f, Animation.RELATIVE_TO_SELF, 0.5f); si.setDuration(460);
                in.addAnimation(ti); in.addAnimation(ai); in.addAnimation(si);
                layout.startAnimation(in);

                // Auto-dismiss after 2.4 s
                new Handler(Looper.getMainLooper()).postDelayed(new Runnable() {
                    @Override
                    public void run() {
                        if (currentToastView != layout) return;
                        AnimationSet out = new AnimationSet(true);
                        out.setInterpolator(new AnticipateInterpolator(1.4f));
                        TranslateAnimation to2 = new TranslateAnimation(0, 0, 0, -160); to2.setDuration(360);
                        AlphaAnimation   ao2 = new AlphaAnimation(1f, 0f); ao2.setDuration(300);
                        ScaleAnimation   so2 = new ScaleAnimation(1f, 0.82f, 1f, 0.82f,
                                Animation.RELATIVE_TO_SELF, 0.5f, Animation.RELATIVE_TO_SELF, 0.5f); so2.setDuration(360);
                        out.addAnimation(to2); out.addAnimation(ao2); out.addAnimation(so2);
                        out.setAnimationListener(new Animation.AnimationListener() {
                            @Override public void onAnimationStart(Animation a) {}
                            @Override public void onAnimationRepeat(Animation a) {}
                            @Override public void onAnimationEnd(Animation a) {
                                try { root.removeView(layout); } catch (Exception ignored) {}
                                if (currentToastView == layout) currentToastView = null;
                            }
                        });
                        layout.startAnimation(out);
                    }
                }, 2400);
            }
        });
    }

    // ══════════════════════════════════════════════════════════════
    //  ✅  SUCCESS TOAST  — green glow variant
    // ══════════════════════════════════════════════════════════════
    public static void showSuccessToast(final Activity activity, final String message) {
        activity.runOnUiThread(new Runnable() {
            @Override
            public void run() {
                final ViewGroup root = (ViewGroup) activity.getWindow().getDecorView();
                if (currentToastView != null) {
                    currentToastView.clearAnimation();
                    try { root.removeView(currentToastView); } catch (Exception ignored) {}
                    currentToastView = null;
                }

                final LinearLayout layout = new LinearLayout(activity);
                layout.setOrientation(LinearLayout.HORIZONTAL);
                layout.setGravity(Gravity.CENTER_VERTICAL);
                layout.setPadding(dp(activity, 14), dp(activity, 10), dp(activity, 18), dp(activity, 10));

                GradientDrawable bg = new GradientDrawable();
                bg.setColor(Color.parseColor("#F2030A05"));
                bg.setStroke(dp(activity, 1), Color.parseColor("#5522C55E"));
                bg.setCornerRadius(dp(activity, 30));
                layout.setBackground(bg);

                if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.LOLLIPOP)
                    layout.setElevation(dp(activity, 10));

                TextView check = new TextView(activity);
                check.setText("✓  ");
                check.setTextColor(Color.parseColor("#22C55E"));
                check.setTextSize(TypedValue.COMPLEX_UNIT_SP, 15);

                TextView text = new TextView(activity);
                text.setText(message);
                text.setTextColor(Color.parseColor("#E8ECFF"));
                text.setTextSize(TypedValue.COMPLEX_UNIT_SP, 13);
                applyFont(activity, text, "dynamon.ttf");

                layout.addView(check);
                layout.addView(text);

                FrameLayout.LayoutParams lp = new FrameLayout.LayoutParams(
                        ViewGroup.LayoutParams.WRAP_CONTENT,
                        ViewGroup.LayoutParams.WRAP_CONTENT);
                lp.gravity = Gravity.TOP | Gravity.CENTER_HORIZONTAL;
                lp.topMargin = dp(activity, 72);

                currentToastView = layout;
                root.addView(layout, lp);
                layout.bringToFront();
                if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.LOLLIPOP)
                    layout.setTranslationZ(100f);

                AnimationSet in = new AnimationSet(true);
                in.setInterpolator(new OvershootInterpolator(1.6f));
                TranslateAnimation ti = new TranslateAnimation(0, 0, -160, 0); ti.setDuration(480);
                AlphaAnimation   ai = new AlphaAnimation(0f, 1f); ai.setDuration(320);
                in.addAnimation(ti); in.addAnimation(ai);
                layout.startAnimation(in);

                new Handler(Looper.getMainLooper()).postDelayed(new Runnable() {
                    @Override
                    public void run() {
                        if (currentToastView != layout) return;
                        AnimationSet out = new AnimationSet(true);
                        out.setInterpolator(new DecelerateInterpolator(2f));
                        TranslateAnimation to2 = new TranslateAnimation(0, 0, 0, -160); to2.setDuration(360);
                        AlphaAnimation ao2 = new AlphaAnimation(1f, 0f); ao2.setDuration(300);
                        out.addAnimation(to2); out.addAnimation(ao2);
                        out.setAnimationListener(new Animation.AnimationListener() {
                            @Override public void onAnimationStart(Animation a) {}
                            @Override public void onAnimationRepeat(Animation a) {}
                            @Override public void onAnimationEnd(Animation a) {
                                try { root.removeView(layout); } catch (Exception ignored) {}
                                if (currentToastView == layout) currentToastView = null;
                            }
                        });
                        layout.startAnimation(out);
                    }
                }, 2400);
            }
        });
    }

    // ══════════════════════════════════════════════════════════════
    //  🔢  DP UTILITY
    // ══════════════════════════════════════════════════════════════
    public static int dp(Context ctx, int dp) {
        return (int) TypedValue.applyDimension(
                TypedValue.COMPLEX_UNIT_DIP, dp, ctx.getResources().getDisplayMetrics());
    }
}
