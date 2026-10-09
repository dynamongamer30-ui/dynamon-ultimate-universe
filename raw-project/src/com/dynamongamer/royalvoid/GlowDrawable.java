package com.dynamongamer.royalvoid;

import android.graphics.*;
import android.graphics.drawable.Drawable;

public final class GlowDrawable extends Drawable {
    private final Paint p = new Paint(Paint.ANTI_ALIAS_FLAG);
    private int alpha = 255;
    
    public void draw(Canvas c) {
        Rect b = getBounds();
        float r = Math.max(1, Math.max(b.width(), b.height()) / 2.0F);
        p.setShader(new RadialGradient(b.centerX(), b.centerY(), r, new int[]{-2140459815, 541335939, 4465027}, null, Shader.TileMode.CLAMP));
        p.setAlpha(alpha);
        c.drawRect(b, p);
        p.setShader(null);
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
