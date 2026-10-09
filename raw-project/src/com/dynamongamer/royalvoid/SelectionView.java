package com.dynamongamer.royalvoid;

import android.content.Context;
import android.graphics.*;
import android.view.View;

/** Theme-owned selection marker; never inherits the host application's checkbox tint. */
public final class SelectionView extends View {
    private final Paint paint = new Paint(Paint.ANTI_ALIAS_FLAG);
    private boolean selected;
    public SelectionView(Context c) { super(c); setImportantForAccessibility(IMPORTANT_FOR_ACCESSIBILITY_NO); }
    public void selected(boolean value) { selected = value; invalidate(); }
    protected void onDraw(Canvas c) {
        float d = getResources().getDisplayMetrics().density;
        float x = getWidth()/2f, y = getHeight()/2f, r = 10*d;
        paint.setStyle(Paint.Style.FILL);
        paint.setColor(selected ? ThemeManager.alpha(ThemeManager.colors(getContext()).DEEP,102) : ThemeManager.alpha(ThemeManager.colors(getContext()).PANEL,34));
        c.drawRoundRect(new RectF(x-r,y-r,x+r,y+r),5*d,5*d,paint);
        paint.setStyle(Paint.Style.STROKE); paint.setStrokeWidth(1.4f*d);
        paint.setColor(selected ? RoyalVoidTheme.colors(getContext()).LAVENDER : RoyalVoidTheme.colors(getContext()).MUTED);
        c.drawRoundRect(new RectF(x-r,y-r,x+r,y+r),5*d,5*d,paint);
        if (selected) {
            paint.setStrokeCap(Paint.Cap.ROUND);
            Path p = new Path(); p.moveTo(x-5*d,y); p.lineTo(x-1*d,y+4*d); p.lineTo(x+6*d,y-4*d);
            c.drawPath(p,paint);
        }
    }
}
