package com.dynamongamer.royalvoid;

import android.content.Context;
import android.graphics.*;
import android.view.View;

public final class IconView extends View {
    private final Paint p = new Paint(Paint.ANTI_ALIAS_FLAG);
    private String name;
    private int color;
    
    public IconView(Context c, String name, int color) {
        super(c);
        this.name = name;
        this.color = color;
        setImportantForAccessibility(IMPORTANT_FOR_ACCESSIBILITY_NO);
    }
    
    public void color(int c) {
        color = c;
        invalidate();
    }
    
    protected void onDraw(Canvas c) {
        super.onDraw(c);
        c.save();
        float size = Math.min(getWidth(), getHeight());
        c.translate((getWidth() - size) / 2.0F, (getHeight() - size) / 2.0F);
        c.scale(size / 24.0F, size / 24.0F);
        p.setColor(color);
        p.setStyle(Paint.Style.STROKE);
        p.setStrokeWidth(1.6F);
        p.setStrokeCap(Paint.Cap.ROUND);
        p.setStrokeJoin(Paint.Join.ROUND);
        Path q = new Path();
        if ("close".equals(name)) {
            line(c, 6, 6, 18, 18);
            line(c, 18, 6, 6, 18);
        } else if ("menu".equals(name)) {
            line(c, 4, 6, 20, 6);
            line(c, 4, 12, 20, 12);
            line(c, 4, 18, 20, 18);
        } else if ("search".equals(name)) {
            c.drawCircle(10, 10, 6, p);
            line(c, 15, 15, 21, 21);
        } else if ("shield".equals(name) || "battle".equals(name)) {
            q.moveTo(12, 3);
            q.lineTo(20, 6);
            q.lineTo(19, 14);
            q.quadTo(16, 20, 12, 22);
            q.quadTo(8, 20, 5, 14);
            q.lineTo(4, 6);
            q.close();
            c.drawPath(q, p);
        } else if ("bolt".equals(name) || "automation".equals(name)) {
            q.moveTo(14, 2);
            q.lineTo(5, 14);
            q.lineTo(11, 14);
            q.lineTo(10, 22);
            q.lineTo(20, 9);
            q.lineTo(13, 9);
            q.close();
            c.drawPath(q, p);
        } else if ("home".equals(name)) {
            q.moveTo(3, 11);
            q.lineTo(12, 3);
            q.lineTo(21, 11);
            q.moveTo(6, 9);
            q.lineTo(6, 21);
            q.lineTo(18, 21);
            q.lineTo(18, 9);
            c.drawPath(q, p);
        } else if ("star".equals(name)) {
            for (int i = 0; i < 10; i++) {
                double a = -Math.PI / 2 + i * Math.PI / 5;
                float r = i % 2 == 0 ? 9 : 4;
                float x = 12 + (float)Math.cos(a) * r;
                float y = 12 + (float)Math.sin(a) * r;
                if (i == 0) q.moveTo(x, y); else q.lineTo(x, y);
            }
            q.close();
            c.drawPath(q, p);
        } else if ("coin".equals(name) || "currency".equals(name)) {
            c.drawCircle(12, 12, 9, p);
            c.drawCircle(12, 12, 6, p);
            line(c, 12, 8, 12, 16);
        } else if ("items".equals(name)) {
            c.drawRoundRect(new RectF(5, 7, 19, 21), 3, 3, p);
            c.drawArc(new RectF(8, 2, 16, 12), 180, 180, false, p);
            line(c, 5, 13, 19, 13);
        } else if ("unlock".equals(name)) {
            c.drawRoundRect(new RectF(4, 11, 20, 21), 3, 3, p);
            c.drawArc(new RectF(8, 2, 17, 16), 180, 160, false, p);
            line(c, 12, 15, 12, 18);
        } else if ("team".equals(name)) {
            c.drawCircle(9, 7, 3, p);
            c.drawArc(new RectF(2, 12, 16, 25), 180, 180, false, p);
            c.drawArc(new RectF(14, 3, 21, 10), -90, 180, false, p);
            c.drawArc(new RectF(14, 12, 23, 25), -90, 90, false, p);
        } else if ("settings".equals(name)) {
            for (int i = 0; i < 3; i++) {
                float y = 6 + i * 6;
                line(c, 3, y, 21, y);
                p.setStyle(Paint.Style.FILL);
                c.drawCircle(i == 1 ? 15 : 8, y, 2.5F, p);
                p.setStyle(Paint.Style.STROKE);
            }
        } else if ("play".equals(name)) {
            c.drawRoundRect(new RectF(2, 5, 22, 19), 4, 4, p);
            q.moveTo(10, 9);
            q.lineTo(16, 12);
            q.lineTo(10, 15);
            q.close();
            c.drawPath(q, p);
        } else if ("skins".equals(name)) {
            q.moveTo(8,3);q.lineTo(3,7);q.lineTo(6,11);q.lineTo(8,9);q.lineTo(8,21);q.lineTo(18,21);q.lineTo(18,9);q.lineTo(20,11);q.lineTo(23,7);q.lineTo(18,3);q.quadTo(13,9,8,3);c.drawPath(q,p);
        } else if ("camera".equals(name)) {
            c.drawRoundRect(new RectF(3, 3, 21, 21), 5, 5, p);
            c.drawCircle(12, 12, 4, p);
            c.drawCircle(17, 7, 0.7F, p);
        } else if ("send".equals(name)) {
            q.moveTo(2, 10);
            q.lineTo(22, 3);
            q.lineTo(17, 22);
            q.lineTo(11, 14);
            q.close();
            c.drawPath(q, p);
            line(c, 11, 14, 22, 3);
        } else if ("chat".equals(name)) {
            q.moveTo(6, 20);
            q.lineTo(3, 22);
            q.lineTo(4, 17);
            c.drawPath(q, p);
            c.drawArc(new RectF(3, 3, 21, 21), 120, 330, false, p);
            line(c, 8, 10, 16, 10);
            line(c, 8, 14, 13, 14);
        } else if ("globe".equals(name)) {
            c.drawCircle(12, 12, 9, p);
            c.drawOval(new RectF(8, 3, 16, 21), p);
            line(c, 3, 12, 21, 12);
        } else if ("back".equals(name)) {
            line(c, 15, 5, 8, 12);
            line(c, 8, 12, 15, 19);
        } else if ("check".equals(name)) {
            line(c, 5, 12, 10, 17);
            line(c, 10, 17, 20, 6);
        } else if ("stop".equals(name)) {
            c.drawRoundRect(new RectF(6, 6, 18, 18), 2, 2, p);
        } else if ("pause".equals(name)) {
            line(c, 8, 5, 8, 19);
            line(c, 16, 5, 16, 19);
        } else {
            c.drawArc(new RectF(3, 3, 21, 21), 25, 275, false, p);
            q.moveTo(12, 4);
            q.lineTo(14.5F, 9.5F);
            q.lineTo(20, 12);
            q.lineTo(14.5F, 14.5F);
            q.lineTo(12, 20);
            q.lineTo(9.5F, 14.5F);
            q.lineTo(4, 12);
            q.lineTo(9.5F, 9.5F);
            q.close();
            c.drawPath(q, p);
            c.drawCircle(20, 4, 1, p);
        }
        c.restore();
    }
    
    private void line(Canvas c, float a, float b, float d, float e) {
        c.drawLine(a, b, d, e, p);
    }
}
