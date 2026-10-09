package com.dynamongamer.royalvoid;

import android.content.Context;
import android.graphics.*;
import android.graphics.drawable.Drawable;

public final class GlassPanelDrawable extends Drawable {
    private final Paint p = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final Context context;
    private final float radius;
    private final boolean strong;
    private int alpha = 255;
    public GlassPanelDrawable(Context c, float radius, boolean strong) {
        context=c;this.radius=radius;this.strong=strong;
    }
    public void draw(Canvas c) {
        ThemeManager.Palette palette=ThemeManager.colors(context);
        RectF r=new RectF(getBounds());r.inset(1,1);
        p.setShader(new LinearGradient(r.left,r.top,r.right,r.bottom,
            new int[]{ThemeManager.alpha(strong?palette.PANEL:palette.CARD,strong?207:153),
                ThemeManager.alpha(strong?palette.VOID:palette.PANEL,strong?189:119)},null,Shader.TileMode.CLAMP));
        p.setAlpha(alpha);p.setStyle(Paint.Style.FILL);c.drawRoundRect(r,radius,radius,p);
        p.setShader(null);p.setColor(palette.LINE);p.setAlpha(Math.round(alpha*.45f));
        p.setStrokeWidth(1);p.setStyle(Paint.Style.STROKE);c.drawRoundRect(r,radius,radius,p);
        p.setStyle(Paint.Style.FILL);
    }
    public void setAlpha(int a){alpha=a;invalidateSelf();}
    public void setColorFilter(ColorFilter f){p.setColorFilter(f);}
    public int getOpacity(){return PixelFormat.TRANSLUCENT;}
}
