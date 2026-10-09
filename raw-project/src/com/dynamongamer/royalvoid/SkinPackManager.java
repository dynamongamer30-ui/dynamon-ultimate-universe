package com.dynamongamer.royalvoid;

import android.os.Handler;
import android.os.Looper;
import java.net.*;
import java.io.*;
import java.util.concurrent.*;
import org.json.JSONObject;

public final class SkinPackManager {
    
    public interface Callback {
        
        void result(JSONObject manifest, String error);
    }
    public static final String BASE = "https://dfxcpxzylyycrirtnkof.supabase.co/storage/v1/object/public/skin-packs/";
    private final ExecutorService worker = Executors.newSingleThreadExecutor();
    private final Handler main = new Handler(Looper.getMainLooper());
    private volatile boolean closed;
    
    public void load(final String pack, final Callback cb) {
        if (!pack.matches("[A-Za-z0-9_-]{1,64}")) {
            cb.result(null, "Use letters, numbers, underscores or hyphens");
            return;
        }
        worker.execute(new Runnable(){
            
            public void run() {
                JSONObject data = null;
                String error = null;
                HttpURLConnection c = null;
                try {
                    c = (HttpURLConnection)new URL(BASE + pack + "/manifest.json").openConnection();
                    c.setConnectTimeout(8000);
                    c.setReadTimeout(8000);
                    c.setInstanceFollowRedirects(false);
                    if (c.getResponseCode() != 200) throw new IOException("Pack unavailable (HTTP " + c.getResponseCode() + ")");
                    InputStream in = c.getInputStream();
                    ByteArrayOutputStream out = new ByteArrayOutputStream();
                    try {
                        byte[] b = new byte[4096];
                        int n;
                        while ((n = in.read(b)) != -1) {
                            if (out.size() + n > 512000) throw new IOException("Manifest is too large");
                            out.write(b, 0, n);
                        }
                    } finally {
                        in.close();
                    }
                    data = new JSONObject(new String(out.toByteArray(), "UTF-8"));
                } catch (Exception e) {
                    error = e.getMessage() == null ? "Unable to load this skin manifest" : e.getMessage();
                } finally {
                    if (c != null) c.disconnect();
                }
                final JSONObject value = data;
                final String problem = error;
                main.post(new Runnable(){
                    
                    public void run() {
                        if (!closed) cb.result(value, problem);
                    }
                });
            }
        });
    }
    
    public void loadIcon(final String pack, final String id, ArtworkView target) {
        if (closed || !pack.matches("[A-Za-z0-9_-]{1,64}") || !id.matches("[a-z0-9_]{1,80}")) return;
        final java.lang.ref.WeakReference<ArtworkView> ref = new java.lang.ref.WeakReference<ArtworkView>(target);
        worker.execute(new Runnable(){
            
            public void run() {
                if (closed) return;
                HttpURLConnection c = null;
                android.graphics.Bitmap bitmap = null;
                try {
                    c = (HttpURLConnection)new URL(BASE + pack + "/" + id + "/icon.png").openConnection();
                    c.setConnectTimeout(4000);
                    c.setReadTimeout(4000);
                    c.setInstanceFollowRedirects(false);
                    if (c.getResponseCode() != 200) return;
                    InputStream in = c.getInputStream();
                    ByteArrayOutputStream out = new ByteArrayOutputStream();
                    try {
                        byte[] b = new byte[4096];
                        int n;
                        while ((n = in.read(b)) != -1) {
                            if (out.size() + n > 1048576) return;
                            out.write(b, 0, n);
                        }
                    } finally {
                        in.close();
                    }
                    byte[] data = out.toByteArray();
                    android.graphics.BitmapFactory.Options opts = new android.graphics.BitmapFactory.Options();
                    opts.inJustDecodeBounds = true;
                    android.graphics.BitmapFactory.decodeByteArray(data, 0, data.length, opts);
                    if (opts.outWidth < 1 || opts.outHeight < 1 || opts.outWidth > 8192 || opts.outHeight > 8192) return;
                    opts.inSampleSize = 1;
                    while (Math.max(opts.outWidth, opts.outHeight) / opts.inSampleSize > 192) opts.inSampleSize *= 2;
                    opts.inJustDecodeBounds = false;
                    bitmap = android.graphics.BitmapFactory.decodeByteArray(data, 0, data.length, opts);
                } catch (Exception ignored) {
                } finally {
                    if (c != null) c.disconnect();
                }
                final android.graphics.Bitmap image = bitmap;
                main.post(new Runnable(){
                    
                    public void run() {
                        ArtworkView v = ref.get();
                        if (!closed && v != null && image != null) v.setImageBitmap(image);
                    }
                });
            }
        });
    }
    
    public void close() {
        closed = true;
        worker.shutdownNow();
        main.removeCallbacksAndMessages(null);
    }
}
