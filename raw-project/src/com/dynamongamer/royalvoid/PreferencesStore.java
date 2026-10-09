package com.dynamongamer.royalvoid;

import android.content.Context;
import android.content.SharedPreferences;
import org.json.JSONObject;

public final class PreferencesStore {
    private final SharedPreferences p;
    
    public PreferencesStore(Context c) {
        p = c.getSharedPreferences("dg_royal_void_v1", Context.MODE_PRIVATE);
    }
    
    public boolean bool(String key, boolean fallback) {
        return p.getBoolean(key, fallback);
    }
    
    public int integer(String key, int fallback) {
        return p.getInt(key, fallback);
    }
    
    public float number(String key, float fallback) {
        return p.getFloat(key, fallback);
    }
    
    public String string(String key, String fallback) {
        return p.getString(key, fallback);
    }
    
    public void set(String key, boolean value) {
        p.edit().putBoolean(key, value).apply();
    }
    
    public void set(String key, int value) {
        p.edit().putInt(key, value).apply();
    }
    
    public void set(String key, float value) {
        p.edit().putFloat(key, value).apply();
    }
    
    public void set(String key, String value) {
        p.edit().putString(key, value).apply();
    }
    
    public boolean favorite(String key) {
        return bool("fav." + key, false);
    }
    
    public boolean flipFavorite(String key) {
        boolean v = !favorite(key);
        set("fav." + key, v);
        return v;
    }

    public JSONObject exportValues() {
        JSONObject values = new JSONObject();
        try {
            for (java.util.Map.Entry<String, ?> e : p.getAll().entrySet())
                if (portable(e.getKey())) values.put(e.getKey(), e.getValue());
        } catch (Exception ignored) {}
        return values;
    }

    private boolean portable(String key) {
        return key.startsWith("fav.") || key.equals("haptics") || key.equals("sounds") || key.equals("depth") || key.equals("ambientGlow") || key.equals("reducedMotion") || key.equals("compactLauncher") || key.equals("opacity") || key.equals("soundVolume") || key.equals("panelHeight") || key.equals("launcherX") || key.equals("launcherY") || key.equals("skinPack");
    }

    public void importValues(JSONObject values) {
        if (values == null) return;
        SharedPreferences.Editor edit = p.edit();
        java.util.Iterator<String> keys = values.keys();
        while (keys.hasNext()) {
            String key = keys.next(); Object value = values.opt(key);
            if (!portable(key)) continue;
            if (key.equals("opacity") || key.equals("soundVolume") || key.equals("panelHeight") || key.equals("launcherX") || key.equals("launcherY")) {
                if (!(value instanceof Number)) continue;
                float n = ((Number)value).floatValue();
                if (Float.isNaN(n) || Float.isInfinite(n)) continue;
                float min=key.equals("panelHeight")?0.60f:key.equals("opacity")?0.65f:0;
                float max=key.equals("panelHeight")?0.95f:key.equals("soundVolume")?0.60f:1;
                edit.putFloat(key,Math.max(min,Math.min(max,n)));
            } else if (key.equals("skinPack")) {
                if (value instanceof String && ((String)value).matches("[A-Za-z0-9_-]{1,64}")) edit.putString(key,(String)value);
            } else if (value instanceof Boolean) edit.putBoolean(key,(Boolean)value);
        }
        edit.apply();
    }
}
