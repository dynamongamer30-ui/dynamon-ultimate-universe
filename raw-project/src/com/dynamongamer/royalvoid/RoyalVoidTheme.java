package com.dynamongamer.royalvoid;

import android.content.Context;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.widget.TextView;

public final class RoyalVoidTheme {
    public static final int VOID = -16317425;
    public static final int PANEL = -15726305;
    public static final int CARD = -15265755;
    public static final int PURPLE = -9357080;
    public static final int DEEP = -12447075;
    public static final int LAVENDER = -3429889;
    public static final int TEXT = -658692;
    public static final int MUTED = -4937531;
    public static final int LINE = -13293757;
    public static final int GREEN = -9249360;
    public static final int RED = -29534;
    
    private RoyalVoidTheme() {
    }
    
    public static int dp(Context c, float v) {
        return (int)(v * c.getResources().getDisplayMetrics().density + 0.5F);
    }
    
    public static GradientDrawable shape(int color, int stroke, float radius) {
        GradientDrawable d = new GradientDrawable();
        d.setColor(color);
        d.setCornerRadius(radius);
        if (stroke != 0) d.setStroke(1, stroke);
        return d;
    }
    
    public static TextView text(Context c, String value, int sp, int color, boolean bold) {
        TextView t = new TextView(c);
        t.setText(value);
        t.setTextSize(sp);
        t.setTextColor(color);
        t.setTypeface(FontManager.get(c, bold ? "bold" : "regular"));
        t.setIncludeFontPadding(false);
        return t;
    }
}
