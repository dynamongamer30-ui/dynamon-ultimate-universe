package com.dynamongamer.royalvoid;

import android.content.Context;
import android.media.AudioManager;
import android.media.SoundPool;
import android.content.res.AssetFileDescriptor;
import java.util.HashSet;

public final class SoundEngine {
    private final PreferencesStore prefs;
    private SoundPool pool;
    private int click;
    private int success;
    private int warning;
    private final HashSet<Integer> ready = new HashSet<Integer>();
    private final Context context;
    
    public SoundEngine(Context c, PreferencesStore p) {
        context = c.getApplicationContext();
        prefs = p;
    }
    
    private void init() {
        if (pool != null) return;
        pool = new SoundPool(3, AudioManager.STREAM_MUSIC, 0);
        pool.setOnLoadCompleteListener(new SoundPool.OnLoadCompleteListener(){
            
            public void onLoadComplete(SoundPool s, int id, int status) {
                if (status == 0) ready.add(id);
            }
        });
        click = load("select");
        success = load("success");
        warning = load("warning");
    }
    
    private int load(String name) {
        try {
            AssetFileDescriptor f = context.getAssets().openFd("royal_void/sounds/" + name + ".wav");
            try {
                return pool.load(f, 1);
            } finally {
                f.close();
            }
        } catch (Exception e) {
            return 0;
        }
    }
    
    public void prepare() {
        if (prefs.bool("sounds", true)) init();
    }
    
    public void play(boolean ok) {
        playId(ok ? 1 : 0);
    }
    
    public void warn() {
        playId(2);
    }
    
    private void playId(int type) {
        if (!prefs.bool("sounds", true)) return;
        try {
            init();
            AudioManager a = (AudioManager)context.getSystemService(Context.AUDIO_SERVICE);
            if (a.getRingerMode() != AudioManager.RINGER_MODE_NORMAL) return;
            int id = type == 1 ? success : type == 2 ? warning : click;
            if (ready.contains(id)) pool.play(id, prefs.number("soundVolume",0.22f), prefs.number("soundVolume",0.22f), 1, 0, 1);
        } catch (RuntimeException ignored) {
        }
    }
    
    public void close() {
        if (pool != null) {
            pool.release();
            pool = null;
            ready.clear();
        }
    }
}
