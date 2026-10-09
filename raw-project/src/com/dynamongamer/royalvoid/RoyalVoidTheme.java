package com.dynamongamer.royalvoid;

import android.content.Context;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.widget.TextView;

public final class RoyalVoidTheme {
    public static ThemeManager.Palette colors(Context c) { return ThemeManager.colors(c); }

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
