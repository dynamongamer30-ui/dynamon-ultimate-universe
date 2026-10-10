package com.dynamongamer.royalvoid;

import org.json.JSONArray;
import org.json.JSONObject;
import java.util.ArrayList;
import java.util.HashSet;

/** Reads the catalogue delivered inside the signed server payload. */
public final class FeatureRegistry {
    private FeatureRegistry() {}
    public static final class Feature {
        public final String key, title, description, category, icon;
        Feature(String k,String t,String d,String c,String i) {
            key=k;title=t;description=d;category=c;icon=i;
        }
    }
    public static Feature[] ALL = new Feature[]{
        new Feature("god","God mode","Protect your active team from damage","Battle","shield"),
        new Feature("oneHit","One-hit damage","Defeat the active enemy quickly","Battle","bolt"),
        new Feature("crit","Critical hits","Force impressive ability hits","Battle","star"),
        new Feature("statusImmune","Status immunity","Protect against sickness and hypnosis","Battle","shield"),
        new Feature("noCD","No cooldowns","Keep ability cards ready","Battle","bolt"),
        new Feature("alwaysCatch","Always catch","Force the catch-success argument","Battle","star"),
        new Feature("botMatch","Bot matchmaking","Route new arena matches to bots","Arena","team"),
        new Feature("winTrophy","Win bot matches","Use the correct win result for bot Arena; real-player results stay authoritative","Arena","star"),
        new Feature("noTrophyLoss","No trophy loss","Prevent bot-match trophy deductions without changing a loss into a win","Arena","shield"),
        new Feature("fullheal","Full-heal potions","Allow Arena heal spray and full healing while enabled; reopen inventory after switching","Advanced","shield"),
        new Feature("pvpcd","Faster arena items","Use the patched PvP item cooldown","Advanced","bolt"),
        new Feature("itemtimer","No item wait","Skip patched item-use timers","Advanced","bolt"),
        new Feature("turnreset","Refill items each turn","Reset the per-turn item counter","Advanced","items"),
        new Feature("items5","Five items per turn","Raise the patched item-use limit","Advanced","items"),
        new Feature("nicklen","Longer nicknames","Use the patched nickname length","Advanced","settings"),
        new Feature("nickval","Name validation","Use the patched name-length validation","Advanced","settings"),
        new Feature("statcap","Stat cap override","Use the original patched stat ceiling","Advanced","shield"),
        new Feature("shopfix","Shop compatibility","Always enabled; cannot be turned off","Advanced","items"),
        new Feature("maxdef","Defense cap override","Use the patched defense ceiling","Advanced","shield")
    };
    private static String revision="";
    public static synchronized boolean load(JSONObject config) {
        if(config==null || config.optInt("schema")!=1)return false;
        JSONArray rows=config.optJSONArray("features");
        if(rows==null || rows.length()>128)return false;
        String next=rows.toString();if(next.equals(revision))return false;
        ArrayList<Feature> features=new ArrayList<Feature>();HashSet<String> keys=new HashSet<String>();
        for(int n=0;n<rows.length();n++){
            JSONObject row=rows.optJSONObject(n);if(row==null)return false;
            String k=row.optString("key"),t=row.optString("title"),d=row.optString("description"),c=row.optString("category"),i=row.optString("icon");
            if(!k.matches("[A-Za-z][A-Za-z0-9_]{0,63}") || !keys.add(k) || t.length()==0 || t.length()>100 || d.length()>300 || c.length()==0 || c.length()>40 || !i.matches("[A-Za-z]{1,24}"))return false;
            features.add(new Feature(k,t,d,c,i));
        }
        // Retain discoverable built-in controls absent from a smaller signed catalogue.
        for(Feature fallback: ALL)if(!keys.contains(fallback.key))features.add(fallback);
        ALL=features.toArray(new Feature[features.size()]);revision=next;return true;
    }
}
