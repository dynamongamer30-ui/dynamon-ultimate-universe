package com.dynamongamer.royalvoid;

import android.view.View;
import android.view.ViewGroup;
import android.view.ViewTreeObserver;
import android.widget.ScrollView;
import java.util.WeakHashMap;

/**
 * Reveals cards only when they first enter the viewport. 
 */
public final class ScrollMotion implements ViewTreeObserver.OnScrollChangedListener {
    private final ScrollView scroll;
    private final ViewGroup content;
    private final MotionEffects motion;
    private final WeakHashMap<View, Boolean> shown = new WeakHashMap<View, Boolean>();
    private boolean closed;
    
    public ScrollMotion(ScrollView s, ViewGroup c, MotionEffects m) {
        scroll = s;
        content = c;
        motion = m;
        s.getViewTreeObserver().addOnScrollChangedListener(this);
    }
    
    public void reset() {
        shown.clear();
        scroll.post(new Runnable(){
            
            public void run() {
                onScrollChanged();
            }
        });
    }
    
    public void onScrollChanged() {
        if (closed || !scroll.isShown()) return;
        int top = scroll.getScrollY();
        int bottom = top + scroll.getHeight();
        int order = 0;
        for (int i = 0; i < content.getChildCount(); i++) {
            View v = content.getChildAt(i);
            if (v.getBottom() > top && v.getTop() < bottom && !shown.containsKey(v)) {
                shown.put(v, true);
                motion.enter(v, order++);
            }
        }
    }
    
    public void close() {
        closed = true;
        if (scroll.getViewTreeObserver().isAlive()) scroll.getViewTreeObserver().removeOnScrollChangedListener(this);
        shown.clear();
    }
}
