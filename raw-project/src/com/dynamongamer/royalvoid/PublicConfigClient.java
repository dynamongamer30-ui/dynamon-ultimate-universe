package com.dynamongamer.royalvoid;

import android.os.*;
import java.io.*;
import java.net.*;
import org.json.*;

/** HTTPS public links fallback for legacy payloads. Contains no social URLs or secret keys. */
public final class PublicConfigClient {
    public interface Callback { void result(JSONObject brand); }
    private volatile boolean closed;
    private final Handler ui=new Handler(Looper.getMainLooper());
    public void load(final Callback callback){new Thread(new Runnable(){public void run(){
        HttpURLConnection c=null;
        try{
            c=(HttpURLConnection)new URL("https://dg.dynamongamer30.workers.dev/config").openConnection();
            c.setConnectTimeout(10000);c.setReadTimeout(10000);c.setInstanceFollowRedirects(false);c.setRequestProperty("Cache-Control","no-store");
            if(c.getResponseCode()!=200)return;
            InputStream in=c.getInputStream();ByteArrayOutputStream out=new ByteArrayOutputStream();byte[] buf=new byte[4096];int n;
            try{while((n=in.read(buf))!=-1){if(closed||out.size()+n>65536)return;out.write(buf,0,n);}}finally{in.close();}
            JSONObject links=new JSONObject(new String(out.toByteArray(),"UTF-8")).optJSONObject("Links");if(links==null)return;
            JSONArray list=new JSONArray();String[][] fields={{"Youtube","YouTube","play"},{"Whatsapp","WhatsApp","chat"},{"Instagram","Instagram","camera"},{"Telegram","Telegram","send"},{"Website","Website","globe"}};
            for(String[] field:fields){String url=links.optString(field[0]);if(!url.startsWith("https://"))continue;
                JSONObject link=new JSONObject();link.put("title",field[1]);link.put("url",url);link.put("icon",field[2]);list.put(link);}
            final JSONObject brand=new JSONObject();brand.put("name",BrandConfig.NAME);brand.put("links",list);brand.put("source","https-public-config");
            ui.post(new Runnable(){public void run(){if(!closed)callback.result(brand);}});
        }catch(Exception ignored){}finally{if(c!=null)c.disconnect();}
    }},"dg-public-config").start();}
    public void close(){closed=true;ui.removeCallbacksAndMessages(null);}
}
