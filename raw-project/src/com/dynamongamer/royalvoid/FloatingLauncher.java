package com.dynamongamer.royalvoid;

import android.content.Context;
import android.view.*;
import android.widget.FrameLayout;

public final class FloatingLauncher extends FrameLayout {
    
    public interface Listener {
        
        void open();
        
        void quickActions();
    }
    private final PreferencesStore prefs;
    private final HapticEngine haptics;
    private final Listener listener;
    private float startX;
    private float startY;
    private float oldX;
    private float oldY;
    private boolean moved;
    private boolean compact;
    
    public FloatingLauncher(Context c, PreferencesStore p, HapticEngine h, Listener l) {
        super(c);
        prefs = p;
        haptics = h;
        listener = l;
        setBackground(new GlassPanelDrawable(RoyalVoidTheme.dp(c, 22), true));
        ArtworkView emblem = new ArtworkView(c);
        emblem.asset("royal_void/images/brand_logo.png");
        FrameLayout.LayoutParams ep = new FrameLayout.LayoutParams(RoyalVoidTheme.dp(c, 44), RoyalVoidTheme.dp(c, 44), Gravity.CENTER);
        addView(emblem, ep);
        setContentDescription("Open Dynamon Gamer. Long press for quick actions.");
        setFocusable(true);
        setClickable(true);
        setOnClickListener(new OnClickListener(){
            
            public void onClick(View v) {
                haptics.tick(v);
                listener.open();
            }
        });
        setOnLongClickListener(new OnLongClickListener(){
            
            public boolean onLongClick(View v) {
                haptics.warning(v);
                listener.quickActions();
                return true;
            }
        });
        setOnTouchListener(new OnTouchListener(){
            
            public boolean onTouch(View v, MotionEvent e) {
                if (e.getAction() == MotionEvent.ACTION_DOWN) {
                    startX = e.getRawX();
                    startY = e.getRawY();
                    oldX = getX();
                    oldY = getY();
                    moved = false;
                    return false;
                }
                if (e.getAction() == MotionEvent.ACTION_MOVE) {
                    float dx = e.getRawX() - startX;
                    float dy = e.getRawY() - startY;
                    if (Math.abs(dx) + Math.abs(dy) > RoyalVoidTheme.dp(getContext(), 8)) moved = true;
                    if (moved) {
                        cancelLongPress();
                        getParent().requestDisallowInterceptTouchEvent(true);
                        setPressed(false);
                        setX(clamp(oldX + dx, 0, parentWidth() - getWidth()));
                        setY(clamp(oldY + dy, 0, parentHeight() - getHeight()));
                        return true;
                    }
                }
                if (e.getAction() == MotionEvent.ACTION_UP && moved) {
                    snap();
                    return true;
                }
                if (e.getAction() == MotionEvent.ACTION_CANCEL) {
                    setPressed(false);
                    snap();
                }
                return false;
            }
        });
    }
    
    private float clamp(float n, float a, float b) {
        return Math.max(a, Math.min(n, Math.max(a, b)));
    }
    
    private int parentWidth() {
        return getParent() instanceof View ? ((View)getParent()).getWidth() : 0;
    }
    
    private int parentHeight() {
        return getParent() instanceof View ? ((View)getParent()).getHeight() : 0;
    }
    
    public void restore() {
        post(new Runnable(){
            
            public void run() {
                float x = prefs.number("launcherX", 1);
                float y = prefs.number("launcherY", 0.18F);
                setX(x * Math.max(0, parentWidth() - getWidth()));
                setY(y * Math.max(0, parentHeight() - getHeight()));
            }
        });
    }
    
    public void compact(boolean value) {
        compact = value;
        FrameLayout.LayoutParams p = (FrameLayout.LayoutParams)getLayoutParams();
        p.width = RoyalVoidTheme.dp(getContext(), value ? 22 : 56);
        p.height = RoyalVoidTheme.dp(getContext(), 56);
        setLayoutParams(p);
        getChildAt(0).setAlpha(value ? 0.4F : 1);
        prefs.set("compactLauncher", value);
        restore();
    }
    
    public boolean compact() {
        return compact;
    }
    
    private void snap() {
        float x = getX() + getWidth() / 2.0F > parentWidth() / 2.0F ? Math.max(0, parentWidth() - getWidth()) : 0;
        animate().x(x).setDuration(prefs.bool("reducedMotion", false) ? 0 : 180).start();
        prefs.set("launcherX", x == 0 ? 0.0F : 1.0F);
        prefs.set("launcherY", getY() / Math.max(1, parentHeight() - getHeight()));
        haptics.tick(this);
    }
}
