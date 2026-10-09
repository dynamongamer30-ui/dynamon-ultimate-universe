package com.dynamongamer.royalvoid;

import android.os.Handler;
import android.os.Looper;
import android.webkit.WebView;
import android.webkit.ValueCallback;
import org.json.JSONObject;
import java.lang.ref.WeakReference;
import java.util.ArrayList;

public final class GameBridge implements GameConnection {
    private final WeakReference<WebView> web;
    private final Handler handler = new Handler(Looper.getMainLooper());
    private boolean closed;
    private boolean installed;
    private final ArrayList<Pending> pending = new ArrayList<Pending>();
    
    public GameBridge(WebView w) {
        web = new WeakReference<WebView>(w);
    }
    
    public boolean preview() {
        return false;
    }
    
    private final class Pending implements Runnable {
        private Callback callback;
        private boolean done;
        
        Pending(Callback cb) {
            callback = cb;
        }
        
        void finish(JSONObject value) {
            if (done) return;
            done = true;
            handler.removeCallbacks(this);
            pending.remove(this);
            Callback c = callback;
            callback = null;
            if (!closed) c.result(value);
        }
        
        public void run() {
            finish(error("Game response timed out. The action may have completed; refresh before retrying."));
        }
    }
    
    private void evaluate(final String code, final Callback callback) {
        handler.post(new Runnable(){
            
            public void run() {
                if (closed) return;
                WebView w = web.get();
                if (w == null) {
                    callback.result(error("Game WebView is unavailable"));
                    return;
                }
                final Pending p = new Pending(callback);
                pending.add(p);
                handler.postDelayed(p, 6000);
                try {
                    w.evaluateJavascript(code, new ValueCallback<String>(){
                        
                        public void onReceiveValue(String value) {
                            try {
                                p.finish(new JSONObject(value));
                            } catch (Exception e) {
                                p.finish(error("Game bridge is not ready"));
                            }
                        }
                    });
                } catch (RuntimeException e) {
                    p.finish(error("Unable to reach the game WebView"));
                }
            }
        });
    }
    
    public void snapshot(final Callback cb) {
        String prefix = installed ? "" : GameScripts.bootstrap() + ";";
        evaluate(prefix + "window.__DG_NATIVE?window.__DG_NATIVE.snapshot():({ok:false,ready:false,bridgeMissing:true,error:\'Server game bridge missing. The signed Royal Void payload must be uploaded and loaded.\'})", new Callback(){
            
            public void result(JSONObject value) {
                installed = !value.optBoolean("bridgeMissing") && value.optBoolean("ready");
                cb.result(value);
            }
        });
    }
    
    public void command(String name, JSONObject args, Callback cb) {
        evaluate("(function(){if(!window.__DG_NATIVE)return {ok:false,error:\'Game is not ready\'};return window.__DG_NATIVE.command(" + JSONObject.quote(name) + "," + args.toString() + ");})()", cb);
    }
    
    public void close() {
        closed = true;
        handler.removeCallbacksAndMessages(null);
        pending.clear();
        WebView w = web.get();
        if (w != null) try {
            w.evaluateJavascript("(function(){if(window.__DG_NATIVE)window.__DG_NATIVE.command(\'stopAll\',{});if(window.__DG_NATIVE_LOCK_TIMER)clearInterval(window.__DG_NATIVE_LOCK_TIMER);window.__DG_NATIVE_LOCK_TIMER=null;delete window.__DG_NATIVE;var s=document.getElementById(\'dg_native_hide\');if(s&&s.parentNode)s.parentNode.removeChild(s);})()", null);
        } catch (RuntimeException ignored) {
        }
        web.clear();
    }
    
    public static JSONObject error(String message) {
        JSONObject o = new JSONObject();
        try {
            o.put("ok", false);
            o.put("ready", false);
            o.put("error", message);
        } catch (Exception ignored) {
        }
        return o;
    }
}
