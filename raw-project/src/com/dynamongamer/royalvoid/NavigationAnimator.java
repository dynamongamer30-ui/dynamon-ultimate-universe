package com.dynamongamer.royalvoid;

import android.view.View;
import android.view.animation.DecelerateInterpolator;

public final class NavigationAnimator {
    
    private NavigationAnimator() {
    }
    
    public static void selected(View v, boolean motion) {
        v.animate().cancel();
        v.setTranslationX(motion ? -RoyalVoidTheme.dp(v.getContext(), 4) : 0);
        v.setAlpha(motion ? 0.6F : 1);
        v.animate().translationX(0).alpha(1).setDuration(motion ? 160 : 0).setInterpolator(new DecelerateInterpolator()).start();
    }
}
