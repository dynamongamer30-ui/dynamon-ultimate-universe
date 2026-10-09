package com.dynamongamer.royalvoid;

import org.json.*;

public final class PreviewConnection implements GameConnection {
    private final JSONObject flags = new JSONObject();
    private int coins = 125000;
    private int dust = 8200;
    private int party = 3;
    private double speed = 1;
    private boolean closed;
    private boolean worldPaused;
    private boolean grindPaused;
    
    public boolean preview() {
        return true;
    }
    
    public void snapshot(Callback cb) {
        if (closed) return;
        JSONObject s = new JSONObject();
        try {
            s.put("ok", true);
            s.put("ready", true);
            s.put("preview", true);
            s.put("coins", coins);
            s.put("dust", dust);
            s.put("speed", speed);
            s.put("party", party);
            s.put("flags", flags);
            s.put("locks", new JSONObject());
            JSONObject aw = new JSONObject();
            aw.put("on", flags.optBoolean("autoWorld"));
            aw.put("paused", worldPaused);
            aw.put("pct", 68);
            aw.put("map", "volcano");
            aw.put("bosses", 12);
            aw.put("quests", 8);
            aw.put("elapsed", 272000);
            aw.put("left", 6);
            s.put("world", aw);
            JSONObject grind = new JSONObject();
            grind.put("on", flags.optBoolean("autoGrind"));
            grind.put("paused", grindPaused);
            s.put("grind", grind);
        } catch (Exception ignored) {
        }
        cb.result(s);
    }
    
    public void command(String name, JSONObject a, Callback cb) {
        if (closed) return;
        JSONObject r = new JSONObject();
        try {
            r.put("ok", true);
            r.put("preview", true);
            r.put("message", "Preview updated; no game data changed");
            if(name.equals("exportControls")) {
                JSONObject c=new JSONObject(); c.put("flags",flags);c.put("speed",speed);c.put("coins",coins);c.put("dust",dust);c.put("party",party);c.put("items",new JSONArray());c.put("skin",new JSONObject());r.put("controls",c);
            } else if(name.equals("restoreControls")) {
                JSONObject c=a.getJSONObject("controls"),f=c.getJSONObject("flags");java.util.Iterator<String> keys=f.keys();while(keys.hasNext()){String k=keys.next();flags.put(k,f.optBoolean(k));}
                flags.put("autoWorld",false);flags.put("autoGrind",false);speed=c.getDouble("speed");coins=c.getInt("coins");dust=c.getInt("dust");party=c.getInt("party");
            } else if (name.equals("flag")) flags.put(a.getString("key"), a.getBoolean("value")); else if (name.equals("coins")) coins = a.getInt("value"); else if (name.equals("dust")) dust = a.getInt("value"); else if (name.equals("speed")) speed = a.getDouble("value"); else if (name.equals("party")) party = a.getInt("value"); else if (name.equals("pause")) {
                if (a.optString("kind").equals("world")) worldPaused = a.optBoolean("value"); else grindPaused = a.optBoolean("value");
            } else if (name.equals("stopAll")) {
                flags.put("autoWorld", false);
                flags.put("autoGrind", false);
                worldPaused = false;
                grindPaused = false;
            } else if (name.equals("items")) {
                JSONArray items = new JSONArray();
                String[] ids = {"health_spray", "discatch", "level_up_snack", "inferno_armor"};
                for (int i = 0; i < ids.length; i++) {
                    JSONObject x = new JSONObject();
                    x.put("id", ids[i]);
                    x.put("title", ids[i].replace('_', ' '));
                    x.put("amount", 99);
                    items.put(x);
                }
                r.put("items", items);
            } else if (name.equals("scan")) {
                JSONArray ms = new JSONArray();
                String[] ns = {"Volcarnyx", "Drakonyx", "Blazeleon"};
                for (int i = 0; i < 3; i++) {
                    JSONObject x = new JSONObject();
                    x.put("index", i);
                    x.put("name", ns[i]);
                    x.put("side", i == 2 ? "Enemy" : "Your team");
                    x.put("hp", 850);
                    x.put("max", 1000);
                    x.put("atk", 320);
                    x.put("def", 280);
                    x.put("aim", 95);
                    ms.put(x);
                }
                r.put("mons", ms);
                r.put("token", "preview");
            }
        } catch (Exception e) {
            r = GameBridge.error("Invalid preview input");
        }
        cb.result(r);
    }
    
    public void close() {
        closed = true;
    }
}
