package com.dynamongamer.royalvoid;

import android.content.Context;
import android.graphics.Color;
import org.json.JSONArray;
import org.json.JSONObject;
import java.util.ArrayList;
import java.util.WeakHashMap;

/** Local theme selection; optional owner configuration is delivered once with /check. */
public final class ThemeManager {
    public static final String[] IDS = {"dark", "fire", "thunder", "water", "earth", "diamond", "gold", "spirit"};
    private static final String[] LABELS = {"Dark / Royal Void", "Fire", "Thunder", "Water", "Earth", "Diamond", "Gold", "Spirit"};
    private static final int[] PRIMARY = {0xFF7C3AED,0xFFF97316,0xFF38BDF8,0xFF22D3EE,0xFF84CC16,0xFFE0E7FF,0xFFFDE047,0xFFE9D5FF};
    private static final int[] DEEP = {0xFF4A168F,0xFF7F1D1D,0xFF1E3A8A,0xFF0E5364,0xFF354513,0xFF35445C,0xFF694008,0xFF312E81};
    private static final int[] HIGHLIGHT = {0xFFCBB5FF,0xFFFFBA88,0xFFA1DBFF,0xFF9AEEF7,0xFFD2EE99,0xFFEEF1FF,0xFFFFE99A,0xFFF1DFFF};
    private static final WeakHashMap<Context, Session> SESSIONS = new WeakHashMap<Context, Session>();
    private ThemeManager() {}

    public static final class Palette {
        public final String id, label;
        public final int VOID, PANEL, CARD, PURPLE, DEEP, LAVENDER, TEXT, MUTED, LINE, GREEN, RED, INPUT, TRACK, BUTTON;
        Palette(int index, JSONObject overrides) {
            id=IDS[index];label=LABELS[index];
            int accent=color(overrides,"primary",PRIMARY[index]);
            VOID=color(overrides,"background",mix(0xFF08090F,accent,.045f));
            PANEL=color(overrides,"panel",mix(0xFF0B0C14,accent,.085f));
            CARD=color(overrides,"card",mix(0xFF11131C,accent,.10f));
            PURPLE=accent; DEEP=color(overrides,"deep",ThemeManager.DEEP[index]);
            LAVENDER=color(overrides,"highlight",HIGHLIGHT[index]);
            TEXT=color(overrides,"text",0xFFF5F4FB);
            MUTED=color(overrides,"muted",mix(0xFFBBC0CD,HIGHLIGHT[index],.12f));
            LINE=color(overrides,"border",mix(0xFF30333E,accent,.16f));
            GREEN=color(overrides,"success",0xFF72DBC0);RED=color(overrides,"error",0xFFFF8B98);
            INPUT=color(overrides,"input",mix(VOID,CARD,.65f));
            TRACK=mix(CARD,LINE,.65f);BUTTON=alpha(PANEL,40);
        }
        boolean readable() {
            return contrast(TEXT,PANEL)>=4.5 && contrast(TEXT,CARD)>=4.5 && contrast(TEXT,VOID)>=4.5
                && contrast(TEXT,INPUT)>=4.5 && contrast(TEXT,DEEP)>=4.5 && contrast(MUTED,CARD)>=3
                && contrast(MUTED,PANEL)>=3 && contrast(LAVENDER,CARD)>=3 && contrast(LAVENDER,PANEL)>=3;
        }
    }
    private static final class Session {
        String selected, defaultId="dark", revision="";
        String[] enabled=IDS.clone();
        Palette[] palettes=new Palette[IDS.length];
        Session(Context c) {
            for(int i=0;i<IDS.length;i++)palettes[i]=new Palette(i,null);
            selected=new PreferencesStore(c).string("theme","dark");
            if(!valid(selected))selected="dark";
        }
    }
    private static synchronized Session session(Context c) {
        Context app=c.getApplicationContext();if(app==null)app=c;
        Session s=SESSIONS.get(app);if(s==null){s=new Session(app);SESSIONS.put(app,s);}return s;
    }
    public static boolean valid(String id) { return index(id)>=0; }
    private static int index(String id) {for(int i=0;i<IDS.length;i++)if(IDS[i].equals(id))return i;return -1;}
    public static Palette colors(Context c) {Session s=session(c);return s.palettes[index(s.selected)];}
    public static String current(Context c) {return session(c).selected;}
    public static Palette preview(Context c,String id) {int i=index(id);return session(c).palettes[i<0?0:i];}
    public static String[] enabled(Context c) {return session(c).enabled.clone();}
    public static boolean available(Context c,String id) {for(String v:session(c).enabled)if(v.equals(id))return true;return false;}
    public static boolean select(Context c,String id) {
        if(!valid(id)||!available(c,id))return false;
        session(c).selected=id;new PreferencesStore(c).set("theme",id);return true;
    }
    public static void restore(Context c) {
        Session s=session(c);String id=new PreferencesStore(c).string("theme",s.defaultId);
        s.selected=valid(id)&&available(c,id)?id:s.defaultId;
    }
    public static boolean configure(Context c,JSONObject config) {
        if(config==null||config.optInt("schema")!=1)return false;
        Session s=session(c);String revision=config.toString();if(revision.equals(s.revision))return false;
        JSONArray list=config.optJSONArray("enabledThemes");ArrayList<String> ids=new ArrayList<String>();
        if(list!=null)for(int i=0;i<Math.min(list.length(),32);i++){String id=list.optString(i);if(valid(id)&&!ids.contains(id))ids.add(id);}
        if(list==null)for(String id:IDS)ids.add(id);
        if(ids.isEmpty())ids.add("dark");
        s.enabled=ids.toArray(new String[ids.size()]);String defaultId=config.optString("defaultTheme","dark");
        s.defaultId=ids.contains(defaultId)?defaultId:s.enabled[0];
        JSONObject overrides=config.optJSONObject("palettes");
        for(int i=0;i<IDS.length;i++){
            Palette candidate=new Palette(i,overrides==null?null:overrides.optJSONObject(IDS[i]));
            s.palettes[i]=candidate.readable()?candidate:new Palette(i,null);
        }
        s.revision=revision;restore(c);return true;
    }
    public static String logoPath(Context c,String id) {
        String path="royal_void/images/themes/"+(valid(id)?id:"dark")+".png";
        try{java.io.InputStream in=c.getAssets().open(path);in.close();return path;}
        catch(Exception ignored){return "royal_void/images/brand_logo.png";}
    }
    public static String logoPath(Context c) {return logoPath(c,current(c));}
    private static int color(JSONObject config,String key,int fallback) {
        String value=config==null?"":config.optString(key,"");
        if(!value.matches("#[0-9A-Fa-f]{6}"))return fallback;
        return Color.parseColor(value);
    }
    public static int alpha(int color,int opacity) {return (Math.max(0,Math.min(255,opacity))<<24)|(color&0xFFFFFF);}
    public static int mix(int a,int b,float ratio) {return Color.rgb(Math.round(Color.red(a)*(1-ratio)+Color.red(b)*ratio),Math.round(Color.green(a)*(1-ratio)+Color.green(b)*ratio),Math.round(Color.blue(a)*(1-ratio)+Color.blue(b)*ratio));}
    private static double linear(int component) {double v=component/255.0;return v<=.04045?v/12.92:Math.pow((v+.055)/1.055,2.4);}
    private static double luminance(int c) {return .2126*linear(Color.red(c))+.7152*linear(Color.green(c))+.0722*linear(Color.blue(c));}
    private static double contrast(int a,int b) {double x=luminance(a),y=luminance(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);}
}
