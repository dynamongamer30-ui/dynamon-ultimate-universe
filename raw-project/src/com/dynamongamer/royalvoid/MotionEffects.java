package com.dynamongamer.royalvoid;

import android.animation.*;
import android.view.*;
import android.view.animation.*;

public final class MotionEffects {
    private final PreferencesStore prefs;
    
    public MotionEffects(PreferencesStore p) {
        prefs = p;
    }
    
    public boolean enabled() {
        return !prefs.bool("reducedMotion", false);
    }
    
    public void enter(View v, int order) {
        v.animate().cancel();
        if (!enabled()) {
            v.setAlpha(1);
            v.setTranslationY(0);
            return;
        }
        v.setAlpha(0);
        v.setTranslationY(RoyalVoidTheme.dp(v.getContext(), 8));
        v.animate().alpha(1).translationY(0).setDuration(220).setStartDelay(Math.min(order * 25, 125)).setInterpolator(new DecelerateInterpolator()).start();
    }
    
    public void panel(View v) {
        v.animate().setListener(null);
        v.animate().cancel();
        v.setCameraDistance(12000 * v.getResources().getDisplayMetrics().density);
        v.setAlpha(enabled() ? 0 : prefs.number("opacity",0.86f));
        v.setPivotX(v.getWidth() * 0.8f);
        v.setPivotY(v.getHeight() * 0.2f);
        v.setScaleX(enabled() ? 0.88F : 1);
        v.setScaleY(enabled() ? 0.88F : 1);
        v.setTranslationY(enabled() ? RoyalVoidTheme.dp(v.getContext(),20) : 0);
        v.setRotationX(enabled() && prefs.bool("depth", true) ? 9 : 0);
        v.setRotationY(enabled() && prefs.bool("depth", true) ? -6 : 0);
        v.animate().alpha(prefs.number("opacity",0.86f)).scaleX(1).scaleY(1).translationY(0).rotationX(0).rotationY(0).setDuration(enabled() ? 380 : 0).setInterpolator(new OvershootInterpolator(0.55f)).start();
    }
    
    public void press(View v, boolean down) {
        v.animate().cancel();
        v.animate().scaleX(down && enabled() ? 0.975F : 1).scaleY(down && enabled() ? 0.975F : 1).setDuration(enabled() ? 110 : 0).start();
    }
    
    public void exit(final View v, final Runnable done) {
        v.animate().cancel();
        v.animate().alpha(0).scaleX(enabled() ? 0.97F : 1).scaleY(enabled() ? 0.97F : 1).setDuration(enabled() ? 150 : 0).setListener(new AnimatorListenerAdapter(){
            
            public void onAnimationEnd(Animator a) {
                v.animate().setListener(null);
                done.run();
            }
        }).start();
    }
}
