package com.dynamongamer.royalvoid;

import android.app.Activity;
import android.app.Application;
import android.os.Bundle;
import android.webkit.WebView;
import java.util.WeakHashMap;

/**
 * Invoke attach after the host WebView is created, on the Android UI thread. 
 */
public final class ModEntry {
    private static final WeakHashMap<Activity, ModController> INSTANCES = new WeakHashMap<Activity, ModController>();
    private static boolean lifecycleInstalled;
    
    private ModEntry() {
    }
    
    public static void attach(final Activity activity) {
        activity.runOnUiThread(new Runnable(){
            
            public void run() {
                if (INSTANCES.containsKey(activity)) return;
                installLifecycle(activity.getApplication());
                final android.os.Handler h = new android.os.Handler();
                h.post(new Runnable(){
                    int tries;
                    
                    public void run() {
                        if (activity.isFinishing() || activity.isDestroyed() || INSTANCES.containsKey(activity)) return;
                        WebView w = WebViewFinder.find(activity);
                        if (w != null) {
                            attach(activity, w);
                            return;
                        }
                        if (++tries < 60) h.postDelayed(this, 500);
                    }
                });
            }
        });
    }
    
    public static void attach(final Activity activity, final WebView webView) {
        activity.runOnUiThread(new Runnable(){
            
            public void run() {
                if (INSTANCES.containsKey(activity) || activity.isFinishing()) return;
                installLifecycle(activity.getApplication());
                ModController c = new ModController(activity, new GameBridge(webView));
                INSTANCES.put(activity, c);
                c.start();
            }
        });
    }
    
    /** Replacement hook only after removing loader.js from the HTML boot path. */
    public static void attachWithLoader(final Activity activity, final WebView webView) {
        attach(activity, webView);
        activity.runOnUiThread(new Runnable(){ public void run(){
            ModController c=INSTANCES.get(activity);
            if(c!=null) c.startNativeLoader(webView);
        }});
    }

    public static void preview(final Activity activity) {
        activity.runOnUiThread(new Runnable(){
            
            public void run() {
                if (INSTANCES.containsKey(activity)) return;
                installLifecycle(activity.getApplication());
                ModController c = new ModController(activity, new PreviewConnection());
                INSTANCES.put(activity, c);
                c.start();
                c.show();
            }
        });
    }
    
    public static void detach(Activity activity) {
        ModController c = INSTANCES.remove(activity);
        if (c != null) c.close();
    }
    
    public static void show(Activity activity) {
        ModController c = INSTANCES.get(activity);
        if (c != null) c.show();
    }
    
    private static void installLifecycle(Application app) {
        if (lifecycleInstalled) return;
        lifecycleInstalled = true;
        app.registerActivityLifecycleCallbacks(new Application.ActivityLifecycleCallbacks(){
            
            public void onActivityCreated(Activity a, Bundle b) {
            }
            
            public void onActivityStarted(Activity a) {
            }
            
            public void onActivityResumed(Activity a) {
                ModController c = INSTANCES.get(a);
                if (c != null) c.resume();
            }
            
            public void onActivityPaused(Activity a) {
                ModController c = INSTANCES.get(a);
                if (c != null) c.pause();
            }
            
            public void onActivityStopped(Activity a) {
            }
            
            public void onActivitySaveInstanceState(Activity a, Bundle b) {
            }
            
            public void onActivityDestroyed(Activity a) {
                detach(a);
            }
        });
    }
}
