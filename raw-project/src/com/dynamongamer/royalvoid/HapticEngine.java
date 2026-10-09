package com.dynamongamer.royalvoid;

import android.view.HapticFeedbackConstants;
import android.view.View;

public final class HapticEngine {
    private final PreferencesStore prefs;
    
    public HapticEngine(PreferencesStore p) {
        prefs = p;
    }
    
    public void tick(View v) {
        if (prefs.bool("haptics", true)) v.performHapticFeedback(HapticFeedbackConstants.VIRTUAL_KEY);
    }
    
    public void success(View v) {
        if (prefs.bool("haptics", true)) v.performHapticFeedback(HapticFeedbackConstants.KEYBOARD_TAP);
    }
    
    public void warning(View v) {
        if (prefs.bool("haptics", true)) v.performHapticFeedback(HapticFeedbackConstants.LONG_PRESS);
    }
}
