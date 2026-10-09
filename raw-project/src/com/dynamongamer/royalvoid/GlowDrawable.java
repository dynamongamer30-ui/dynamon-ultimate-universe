package com.dynamongamer.royalvoid;

import android.content.Context;
import android.graphics.*;
import android.graphics.drawable.Drawable;

public final class GlowDrawable extends Drawable {
    private final Paint p=new Paint(Paint.ANTI_ALIAS_FLAG);
    private final Context context;
    private int alpha=255;
    public GlowDrawable(Context c){context=c;}
    public void draw(Canvas c){
        Rect b=getBounds();float r=Math.max(1,Math.max(b.width(),b.height())/2f);
        int color=ThemeManager.colors(context).PURPLE;
        p.setShader(new RadialGradient(b.centerX(),b.centerY(),r,new int[]{ThemeManager.alpha(color,110),ThemeManager.alpha(color,30),ThemeManager.alpha(color,0)},null,Shader.TileMode.CLAMP));
        p.setAlpha(alpha);c.drawRect(b,p);p.setShader(null);
    }
    public void setAlpha(int a){alpha=a;invalidateSelf();}
    public void setColorFilter(ColorFilter f){p.setColorFilter(f);}
    public int getOpacity(){return PixelFormat.TRANSLUCENT;}
}
