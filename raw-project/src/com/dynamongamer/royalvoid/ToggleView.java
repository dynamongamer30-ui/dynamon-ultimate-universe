package com.dynamongamer.royalvoid;

import android.content.Context;
import android.graphics.*;
import android.view.View;
import android.view.accessibility.AccessibilityNodeInfo;
import android.animation.ValueAnimator;

public final class ToggleView extends View {
    private final Paint p = new Paint(Paint.ANTI_ALIAS_FLAG);
    private boolean checked;
    private boolean locked;
    private float position;
    private ValueAnimator anim;
    
    public ToggleView(Context c) {
        super(c);
        setFocusable(true);
        setClickable(true);
        setMinimumHeight(RoyalVoidTheme.dp(c, 48));
    }
    
    public boolean checked() {
        return checked;
    }
    
    public void state(boolean value, boolean lock, boolean motion) {
        locked = lock;
        if (value == checked) {
            invalidate();
            return;
        }
        checked = value;
        if (anim != null) anim.cancel();
        if (!motion) {
            position = value ? 1 : 0;
            invalidate();
            return;
        }
        anim = ValueAnimator.ofFloat(position, value ? 1 : 0);
        anim.setDuration(160);
        anim.addUpdateListener(new ValueAnimator.AnimatorUpdateListener(){
            
            public void onAnimationUpdate(ValueAnimator a) {
                position = ((Float)a.getAnimatedValue()).floatValue();
                invalidate();
            }
        });
        anim.start();
    }
    
    protected void onDraw(Canvas c) {
        super.onDraw(c);
        float d = getResources().getDisplayMetrics().density;
        float w = 44 * d;
        float h = 26 * d;
        float x = (getWidth() - w) / 2;
        float y = (getHeight() - h) / 2;
        p.setColor(locked ? RoyalVoidTheme.LINE : blend(-12898232, RoyalVoidTheme.PURPLE, position));
        c.drawRoundRect(new RectF(x, y, x + w, y + h), h / 2, h / 2, p);
        p.setColor(locked ? RoyalVoidTheme.MUTED : RoyalVoidTheme.TEXT);
        c.drawCircle(x + h / 2 + position * (w - h), y + h / 2, 9 * d, p);
    }
    
    private int blend(int a, int b, float v) {
        return Color.rgb((int)(Color.red(a) + (Color.red(b) - Color.red(a)) * v), (int)(Color.green(a) + (Color.green(b) - Color.green(a)) * v), (int)(Color.blue(a) + (Color.blue(b) - Color.blue(a)) * v));
    }
    
    public void onInitializeAccessibilityNodeInfo(AccessibilityNodeInfo n) {
        super.onInitializeAccessibilityNodeInfo(n);
        n.setClassName("android.widget.Switch");
        n.setCheckable(true);
        n.setChecked(checked);
    }
    
    protected void onDetachedFromWindow() {
        if (anim != null) anim.cancel();
        super.onDetachedFromWindow();
    }
}
