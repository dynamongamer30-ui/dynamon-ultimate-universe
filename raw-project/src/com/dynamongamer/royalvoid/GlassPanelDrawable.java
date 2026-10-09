package com.dynamongamer.royalvoid;

import android.graphics.*;
import android.graphics.drawable.Drawable;

public final class GlassPanelDrawable extends Drawable {
    private final Paint p = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final float radius;
    private final boolean strong;
    private int alpha = 255;
    
    public GlassPanelDrawable(float radius, boolean strong) {
        this.radius = radius;
        this.strong = strong;
    }
    
    public void draw(Canvas c) {
        RectF r = new RectF(getBounds());
        r.inset(1, 1);
        p.setShader(new LinearGradient(r.left, r.top, r.right, r.bottom, strong ? new int[]{0xCF100D1B, 0xBD090A12} : new int[]{0x99191525, 0x77101019}, null, Shader.TileMode.CLAMP));
        p.setAlpha(alpha);
        p.setStyle(Paint.Style.FILL);
        c.drawRoundRect(r, radius, radius, p);
        p.setShader(null);
        p.setColor(0x557C6A9C);
        p.setAlpha(alpha);
        p.setStrokeWidth(1);
        p.setStyle(Paint.Style.STROKE);
        c.drawRoundRect(r, radius, radius, p);
        p.setStyle(Paint.Style.FILL);
    }
    
    public void setAlpha(int a) {
        alpha = a;
        invalidateSelf();
    }
    
    public void setColorFilter(ColorFilter f) {
        p.setColorFilter(f);
    }
    
    public int getOpacity() {
        return PixelFormat.TRANSLUCENT;
    }
}
