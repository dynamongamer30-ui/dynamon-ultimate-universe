package com.dynamongamer.royalvoid;

import android.content.Context;
import android.graphics.*;
import android.view.View;
import android.animation.ValueAnimator;

public final class ProgressRingView extends View {
    private final Paint p = new Paint(Paint.ANTI_ALIAS_FLAG);
    private float value;
    private ValueAnimator animator;
    
    public ProgressRingView(Context c) {
        super(c);
        setContentDescription("Automation progress");
    }
    
    public void progress(float n, boolean motion) {
        n = Math.max(0, Math.min(100, n));
        if (Math.abs(value - n) < 0.01F) return;
        if (animator != null) animator.cancel();
        if (!motion) {
            value = n;
            invalidate();
            return;
        }
        animator = ValueAnimator.ofFloat(value, n);
        animator.setDuration(350);
        animator.addUpdateListener(new ValueAnimator.AnimatorUpdateListener(){
            
            public void onAnimationUpdate(ValueAnimator a) {
                value = ((Float)a.getAnimatedValue()).floatValue();
                invalidate();
            }
        });
        animator.start();
    }
    
    protected void onDraw(Canvas c) {
        float w = getWidth();
        float h = getHeight();
        float s = Math.min(w, h);
        float pad = s * 0.08F;
        RectF r = new RectF((w - s) / 2 + pad, (h - s) / 2 + pad, (w + s) / 2 - pad, (h + s) / 2 - pad);
        p.setStyle(Paint.Style.STROKE);
        p.setStrokeWidth(s * 0.07F);
        p.setStrokeCap(Paint.Cap.ROUND);
        p.setColor(RoyalVoidTheme.LINE);
        c.drawOval(r, p);
        p.setShader(new LinearGradient(0, 0, w, h, RoyalVoidTheme.LAVENDER, RoyalVoidTheme.PURPLE, Shader.TileMode.CLAMP));
        c.drawArc(r, -90, 3.6F * value, false, p);
        p.setShader(null);
        p.setStyle(Paint.Style.FILL);
        p.setColor(RoyalVoidTheme.TEXT);
        p.setTypeface(FontManager.get(getContext(), "bold"));
        p.setTextSize(s * 0.23F);
        p.setTextAlign(Paint.Align.CENTER);
        c.drawText(Math.round(value) + "%", w / 2, h / 2 - (p.ascent() + p.descent()) / 2, p);
    }
    
    protected void onDetachedFromWindow() {
        if (animator != null) animator.cancel();
        super.onDetachedFromWindow();
    }
}
