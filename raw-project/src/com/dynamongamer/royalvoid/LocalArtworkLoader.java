package com.dynamongamer.royalvoid;

import android.content.Context;
import android.graphics.*;
import android.os.*;
import java.io.*;
import java.util.concurrent.*;

/** Bounded decoding of the game's own item artwork, outside the UI thread. */
public final class LocalArtworkLoader {
    private final Context context;
    private final ExecutorService worker = Executors.newSingleThreadExecutor();
    private final Handler ui = new Handler(Looper.getMainLooper());
    private volatile boolean closed;
    public LocalArtworkLoader(Context c) { context = c.getApplicationContext(); }
    public void load(final String path, final ArtworkView target) {
        if (closed || path == null || !path.matches("images/[A-Za-z0-9_./-]+\\.png") || path.contains("..")) return;
        target.setTag(path);
        worker.execute(new Runnable() { public void run() {
            Bitmap bitmap = null;
            try {
                InputStream in = context.getAssets().open("www/" + path);
                BitmapFactory.Options bounds = new BitmapFactory.Options(); bounds.inJustDecodeBounds = true;
                try { BitmapFactory.decodeStream(in,null,bounds); } finally { in.close(); }
                if (bounds.outWidth < 1 || bounds.outHeight < 1 || bounds.outWidth > 8192 || bounds.outHeight > 8192) return;
                BitmapFactory.Options opt = new BitmapFactory.Options(); opt.inSampleSize = 1;
                while (bounds.outWidth/opt.inSampleSize > 192 || bounds.outHeight/opt.inSampleSize > 192) opt.inSampleSize *= 2;
                in = context.getAssets().open("www/" + path);
                try { bitmap = BitmapFactory.decodeStream(in,null,opt); } finally { in.close(); }
            } catch (Exception ignored) {}
            final Bitmap decoded = bitmap;
            ui.post(new Runnable() { public void run() {
                if (!closed && path.equals(target.getTag()) && decoded != null) target.setImageBitmap(decoded);
            }});
        }});
    }
    public void close() { closed = true; worker.shutdownNow(); ui.removeCallbacksAndMessages(null); }
}
