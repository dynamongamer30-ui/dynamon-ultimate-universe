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
    public static Feature[] ALL = new Feature[0];
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
        ALL=features.toArray(new Feature[features.size()]);revision=next;return true;
    }
}
