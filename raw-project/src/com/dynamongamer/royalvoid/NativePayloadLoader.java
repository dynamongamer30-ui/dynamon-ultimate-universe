package com.dynamongamer.royalvoid;

import android.os.*;
import android.util.Base64;
import android.webkit.*;
import org.json.*;
import java.io.*;
import java.net.*;
import java.util.Arrays;
import java.util.concurrent.*;

/** Opt-in replacement for assets/www/loader.js; never run both loaders together.
 * The loader performs one access check per launch. It deliberately does not
 * send heartbeats or presence writes during play: the free-tier server must
 * support a large daily audience without turning gameplay into a write stream.
 */
public final class NativePayloadLoader {
    public interface Listener { void status(String message,boolean error); }
    private static final String SERVER="https://dg.dynamongamer30.workers.dev";
    private static final String PUBLIC_KEY="MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEBvmVi6bDPa9eUOBNsYKr+IQ3JW3rQPQpeWxhi/fTTuLIn8jtG3vDb1G2y9286BKW1GKs2zksU9Grw6eFMHF7Aw==";
    private final Handler ui=new Handler(Looper.getMainLooper());
    private final ExecutorService worker=Executors.newSingleThreadExecutor();
    private final WebView web;
    private final Listener listener;
    private volatile boolean closed;
    private volatile boolean busy,loaded;
    private String fingerprint,build;
    private JSONObject launchLocks=new JSONObject();
    private JSONObject launchBrand;
    private long started;
    private int generation;
    public NativePayloadLoader(WebView w,Listener l){web=w;listener=l;}
    public void start(){
        if(closed||busy||loaded)return; busy=true;started=SystemClock.elapsedRealtime();generation++; waitForDevice(generation);
    }
    private void tell(final String message,final boolean error){ui.post(new Runnable(){public void run(){if(!closed)listener.status(message,error);}});}
    private void fail(String message){busy=false;tell(message,true);}
    private boolean localGamePage(){
        String value=web.getUrl();if(value==null)return false;
        try{URI page=new URI(value);String scheme=page.getScheme(),host=page.getHost(),path=page.getPath();
            if("file".equals(scheme))return "/android_asset/www/index.html".equals(path)&&(host==null||host.length()==0);
            return "https".equals(scheme)&&"localhost".equals(host)&&page.getUserInfo()==null&&page.getPort()==-1&&"/index.html".equals(path);
        }catch(Exception e){return false;}
    }
    private void waitForDevice(final int token){
        if(closed||token!=generation)return;
        if(!localGamePage()){fail("Open the local game page before loading");return;}
        if(SystemClock.elapsedRealtime()-started>45000){fail("Finish login, then choose Retry game loading in launcher shortcuts");return;}
        web.evaluateJavascript("(function(){return {ready:window.__DG_NATIVE_BOOT_READY===true,loaded:!!window.lime,fp:window.device&&window.device.uuid?String(window.device.uuid):null};})()",new ValueCallback<String>(){public void onReceiveValue(String value){
            if(closed||token!=generation)return;
            try{
                JSONObject result=new JSONObject(value);
                if(result.optBoolean("loaded")){fail("Another loader already loaded the game. Do not enable both loaders.");return;}
                String fp=result.optString("fp","");
                if(result.optBoolean("ready") && !fp.isEmpty() && !fp.equals("null") && fp.length()<=200){fingerprint=fp;tell("Verifying your game access…",false);download(token);return;}
            }catch(Exception ignored){}
            ui.postDelayed(new Runnable(){public void run(){waitForDevice(token);}},500);
        }});
    }
    private JSONObject request(String path,JSONObject body,int limit) throws Exception {
        if(closed)throw new IOException("Loader closed");
        HttpURLConnection connection=(HttpURLConnection)new URL(SERVER+path).openConnection();
        connection.setConnectTimeout(15000);connection.setReadTimeout(20000);connection.setInstanceFollowRedirects(false);
        connection.setRequestProperty("Cache-Control","no-store");
        connection.setRequestProperty("Accept","application/json");
        try{
            if(body!=null){connection.setRequestMethod("POST");connection.setDoOutput(true);connection.setRequestProperty("Content-Type","application/json");
                byte[] bytes=body.toString().getBytes("UTF-8");connection.setFixedLengthStreamingMode(bytes.length);
                OutputStream out=connection.getOutputStream();try{out.write(bytes);}finally{out.close();}}
            if(connection.getResponseCode()!=200)throw new IOException("Server unavailable ("+connection.getResponseCode()+")");
            String type=connection.getContentType();if(type==null||!type.toLowerCase(java.util.Locale.US).startsWith("application/json"))throw new IOException("Unexpected server response");
            InputStream in=connection.getInputStream();ByteArrayOutputStream out=new ByteArrayOutputStream();byte[] buffer=new byte[8192];int n;
            try{while((n=in.read(buffer))!=-1){if(closed)throw new IOException("Loader closed");if(out.size()+n>limit)throw new IOException("Server response exceeds limit");out.write(buffer,0,n);}}finally{in.close();}
            return new JSONObject(new String(out.toByteArray(),"UTF-8"));
        }finally{connection.disconnect();}
    }
    private void download(final int token){worker.execute(new Runnable(){public void run(){
        byte[] key=null,plaintext=null;
        try{
            JSONObject payload=request("/payload",null,11000000);
            final String id=payload.getString("build");if(!id.matches("[A-Za-z0-9._-]{1,128}"))throw new IOException("Invalid build identifier");
            byte[] ciphertext=Base64.decode(payload.getString("ct_b64"),Base64.DEFAULT);
            String digest=PayloadCrypto.hash(ciphertext);
            if(!digest.equals(payload.getString("ct_sha")))throw new IOException("Payload hash mismatch");
            long issued=payload.getLong("issued");int client=payload.getInt("min_client");
            if(payload.optInt("protocol")!=2||client!=3||issued<=0||issued>System.currentTimeMillis()/1000+300)throw new IOException("Unsupported server payload");
            String envelope="DG-PAYLOAD-V2\n"+id+"\n"+digest+"\n"+payload.getString("iv_b64")+"\n"+issued+"\n"+client;
            if(!PayloadCrypto.verify(Base64.decode(PUBLIC_KEY,Base64.DEFAULT),envelope.getBytes("UTF-8"),Base64.decode(payload.getString("meta_sig_b64"),Base64.DEFAULT)))throw new IOException("Payload metadata signature mismatch");
            if(!PayloadCrypto.verify(Base64.decode(PUBLIC_KEY,Base64.DEFAULT),ciphertext,Base64.decode(payload.getString("sig_b64"),Base64.DEFAULT)))throw new IOException("Payload signature mismatch");
            JSONObject check=new JSONObject();check.put("fp",fingerprint);check.put("build",id);check.put("ctsha",digest);
            JSONObject access=request("/check",check,65536);
            if(access.optBoolean("banned")||access.optBoolean("blocked"))throw new IOException(access.optBoolean("blocked")?"Please finish login, then retry game loading":"Game access denied");
            if(!access.has("key"))throw new IOException("Server did not release the payload key");
            JSONObject locks=access.optJSONObject("featureLocks");
            if(locks==null)throw new IOException("Server loader update required");
            launchLocks=locks;
            launchBrand=access.optJSONObject("brand");
            if(launchLocks.optBoolean("app")||launchLocks.optBoolean("mods"))throw new IOException("Game access is currently unavailable");
            key=Base64.decode(access.getString("key"),Base64.DEFAULT);
            plaintext=PayloadCrypto.decrypt(key,Base64.decode(payload.getString("iv_b64"),Base64.DEFAULT),ciphertext);
            final String code=new String(plaintext,"UTF-8");
            ui.post(new Runnable(){public void run(){if(closed||token!=generation)return;build=id;inject(code,0,token);}});
        }catch(Exception e){fail(e.getMessage()==null?"Unable to load the game":e.getMessage());}
        finally{if(key!=null)Arrays.fill(key,(byte)0);if(plaintext!=null)Arrays.fill(plaintext,(byte)0);}
    }});}
    private void inject(final String code,final int offset,final int token){
        if(closed||token!=generation)return;
        if(offset==0){web.evaluateJavascript("window.__DG_NATIVE_SOURCE=[];true",new ValueCallback<String>(){public void onReceiveValue(String v){append(code,0,token);}});return;}
        append(code,offset,token);
    }
    private void append(final String code,final int offset,final int token){
        if(closed||token!=generation)return;
        if(!localGamePage()){fail("Game page changed during loading");return;}
        if(offset>=code.length()){boot(token);return;}
        final int end=Math.min(code.length(),offset+24000);
        web.evaluateJavascript("window.__DG_NATIVE_SOURCE.push("+JSONObject.quote(code.substring(offset,end))+");true",new ValueCallback<String>(){public void onReceiveValue(String value){
            if(!"true".equals(value)){fail("Game page changed during loading; restart the app");return;}append(code,end,token);
        }});
    }
    private void boot(final int token){
        if(closed||token!=generation)return;
        if(!localGamePage()){fail("Game page changed during loading");return;}
        web.evaluateJavascript("(function(){try{window.__DG_SERVER="+JSONObject.quote(SERVER)+";window.__DG_LOCKS="+launchLocks.toString()+";window.__DG_BOOT_LOCKS_READY=true;var code=window.__DG_NATIVE_SOURCE.join('');delete window.__DG_NATIVE_SOURCE;(0,eval)(code);"+(launchBrand==null?"":"window.__DG_BRAND="+launchBrand.toString()+";")+"if(!window.lime)throw Error('Missing game engine');if(!window.__DG_MENU_CONFIG||!window.__DG_NATIVE)throw Error('Server payload must be upgraded for Royal Void 0.3');var s=window.getSize();window.lime.embed('dynamons_world','content',s.width*2,s.height*2,{background:'000000'});return {ok:true};}catch(e){return {ok:false,error:String(e.message||e)};}})()",new ValueCallback<String>(){public void onReceiveValue(String value){
            if(closed||token!=generation)return;
            try{JSONObject r=new JSONObject(value);if(!r.optBoolean("ok"))throw new IOException(r.optString("error","Game boot failed"));
                busy=false;loaded=true;tell("Game loaded · open the floating menu",false);
            }catch(Exception e){fail(e.getMessage()==null?"Game boot failed":e.getMessage());}
        }});
    }
    public void close(){closed=true;generation++;ui.removeCallbacksAndMessages(null);worker.shutdownNow();}
}
