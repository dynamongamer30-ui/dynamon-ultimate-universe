package com.dynamongamer.royalvoid;

import android.app.Activity;
import android.view.View;
import android.view.ViewGroup;
import android.webkit.WebView;
import java.util.ArrayList;

public final class WebViewFinder {
    
    private WebViewFinder() {
    }
    
    public static WebView find(Activity a) {
        ArrayList<WebView> all = new ArrayList<WebView>();
        walk(a.getWindow().getDecorView(), all);
        return all.size() == 1 ? all.get(0) : null;
    }
    
    private static void walk(View v, ArrayList<WebView> out) {
        if (v instanceof WebView) {
            out.add((WebView)v);
            return;
        }
        if (v instanceof ViewGroup) {
            ViewGroup g = (ViewGroup)v;
            for (int i = 0; i < g.getChildCount(); i++) walk(g.getChildAt(i), out);
        }
    }
}
