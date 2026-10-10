package com.dynamongamer.royalvoid;

import android.os.*;
import android.util.Base64;
import android.webkit.*;
import org.json.*;
import java.io.*;
import java.net.*;
import java.util.Arrays;
import java.util.concurrent.*;

/** Loads encrypted mod patches after the existing native key dialog authorizes access.
 * The normal local game never depends on this loader or the remote server.
 * No login UI, heartbeats, continuous remote polling, or plaintext disk cache.
 */
public final class NativePayloadLoader {
    public interface Listener { void status(String message,boolean error); void appearance(JSONObject config); }
    private static final String SERVER="https://dg.dynamongamer30.workers.dev";
    private static final String PUBLIC_KEY="MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEBvmVi6bDPa9eUOBNsYKr+IQ3JW3rQPQpeWxhi/fTTuLIn8jtG3vDb1G2y9286BKW1GKs2zksU9Grw6eFMHF7Aw==";
    private final Handler ui=new Handler(Looper.getMainLooper());
    private final ExecutorService worker=Executors.newSingleThreadExecutor();
    private final WebView web;
    private final Listener listener;
    private volatile boolean closed,busy,loaded;
    private volatile int generation;
    private String fingerprint,baseUrl;
    private volatile boolean protectedPage;
    private long started;
    private JSONObject launchLocks,launchBrand,launchThemes;
    private interface Result { void accept(String value); }
    public NativePayloadLoader(WebView w,Listener l){web=w;listener=l;}
    public void start(){
        if(closed||busy||loaded)return;
        busy=true;started=SystemClock.elapsedRealtime();final int token=++generation;
        tell("Opening normal game; preparing protected mod…",false);
        ui.postDelayed(new Runnable(){public void run(){if(active(token))fail(token,"Mod startup timed out. The normal game remains available.");}},180000);
        waitForPage(token,false,null);
    }
    private boolean active(int token){return !closed&&busy&&token==generation;}
    private void tell(final String message,final boolean error){ui.post(new Runnable(){public void run(){if(!closed)listener.status(message,error);}});}
    private void fail(int token,String message){
        if(!active(token))return;
        busy=false;generation++;
        final boolean restore=protectedPage;protectedPage=false;
        ui.post(new Runnable(){public void run(){if(!closed&&restore&&baseUrl!=null)web.loadUrl(baseUrl);}});
        tell(message+" Long-press the mod logo to retry.",true);
    }
    private boolean localGamePage(){
        String value=web.getUrl();if(value==null)return false;
        try{URI page=new URI(value);String scheme=page.getScheme(),host=page.getHost(),path=page.getPath();
            if("file".equals(scheme))return "/android_asset/www/index.html".equals(path)&&(host==null||host.length()==0);
            return "https".equals(scheme)&&"localhost".equals(host)&&page.getUserInfo()==null&&page.getPort()==-1&&"/index.html".equals(path);
        }catch(Exception e){return false;}
    }
    private void evaluate(final String script,final int token,final Result result){
        if(!active(token))return;
        if(!localGamePage()){fail(token,"Game page changed during mod startup");return;}
        final boolean[] done={false};
        final Runnable timeout=new Runnable(){public void run(){if(!done[0]&&active(token)){done[0]=true;fail(token,"The game page stopped responding");}}};
        ui.postDelayed(timeout,10000);
        try{web.evaluateJavascript(script,new ValueCallback<String>(){public void onReceiveValue(String value){
            if(done[0])return;done[0]=true;ui.removeCallbacks(timeout);if(active(token))result.accept(value);
        }});}catch(Exception e){done[0]=true;ui.removeCallbacks(timeout);fail(token,"Unable to communicate with the game page");}
    }
    private void waitForPage(final int token,final boolean protectedWait,final String bundle){
        if(!active(token))return;
        if(SystemClock.elapsedRealtime()-started>150000){fail(token,"Game page readiness timed out");return;}
        if(!localGamePage()){
            String url=web.getUrl();
            if(url==null||"about:blank".equals(url)){
                ui.postDelayed(new Runnable(){public void run(){waitForPage(token,protectedWait,bundle);}},250);return;
            }
            fail(token,"Open the local game page before starting the mod");return;
        }
        evaluate("(function(){return {ready:window.__DG_SPLIT_INDEX_READY===true,protectedMode:window.__DG_PROTECTED_MODE===true,fp:window.device&&window.device.uuid?String(window.device.uuid):null};})()",token,new Result(){public void accept(String value){
            try{
                JSONObject state=new JSONObject(value);
                if(state.optBoolean("ready")&&state.optBoolean("protectedMode")==protectedWait){
                    if(protectedWait){inject(bundle,0,token);return;}
                    baseUrl=web.getUrl().split("[?#]",2)[0];
                    fingerprint=state.optString("fp","");
                    if(fingerprint.length()==0||"null".equals(fingerprint))fingerprint=android.provider.Settings.Secure.getString(web.getContext().getContentResolver(),android.provider.Settings.Secure.ANDROID_ID);
                    if(fingerprint==null||fingerprint.length()==0||fingerprint.length()>200){fail(token,"Device identifier is unavailable; the normal game can still open");return;}
                    fetch(token);return;
                }
            }catch(Exception ignored){}
            ui.postDelayed(new Runnable(){public void run(){waitForPage(token,protectedWait,bundle);}},250);
        }});
    }
    private JSONObject request(String path,JSONObject body,int limit) throws Exception {
        if(closed)throw new IOException("Loader closed");
        HttpURLConnection connection=(HttpURLConnection)new URL(SERVER+path).openConnection();
        connection.setConnectTimeout(15000);connection.setReadTimeout(20000);connection.setInstanceFollowRedirects(false);
        connection.setRequestProperty("Cache-Control","no-store");
        connection.setRequestProperty("Accept","application/json");
        connection.setRequestProperty("User-Agent","Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36");
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
    private void fetch(final int token){worker.execute(new Runnable(){public void run(){
        try{
            final JSONObject payload=request("/payload?client=4",null,2000000);
            String id=payload.getString("build");if(!id.matches("[A-Za-z0-9._-]{1,128}"))throw new IOException("Invalid build identifier");
            byte[] ciphertext=Base64.decode(payload.getString("ct_b64"),Base64.DEFAULT);
            String digest=PayloadCrypto.hash(ciphertext);
            if(!digest.equals(payload.getString("ct_sha")))throw new IOException("Payload hash mismatch");
            long issued=payload.getLong("issued");int client=payload.getInt("min_client");
            if(payload.optInt("protocol")!=2||client!=4||issued<=0||issued>System.currentTimeMillis()/1000+300)throw new IOException("Upload the new split mod payload before using this DEX");
            String envelope="DG-PAYLOAD-V2\n"+id+"\n"+digest+"\n"+payload.getString("iv_b64")+"\n"+issued+"\n"+client;
            if(!PayloadCrypto.verify(Base64.decode(PUBLIC_KEY,Base64.DEFAULT),envelope.getBytes("UTF-8"),Base64.decode(payload.getString("meta_sig_b64"),Base64.DEFAULT)))throw new IOException("Payload metadata signature mismatch");
            if(!PayloadCrypto.verify(Base64.decode(PUBLIC_KEY,Base64.DEFAULT),ciphertext,Base64.decode(payload.getString("sig_b64"),Base64.DEFAULT)))throw new IOException("Payload signature mismatch");
            if(active(token))authorize(payload,token,0);
        }catch(Exception e){fail(token,message(e));}
    }});}
    private static String message(Exception e){return e.getMessage()==null?"Unable to prepare protected mod":e.getMessage();}
    private void authorize(final JSONObject payload,final int token,final int attempt){
        if(!active(token))return;
        byte[] key=null,plaintext=null;
        try{
            JSONObject check=new JSONObject();check.put("fp",fingerprint);check.put("build",payload.getString("build"));check.put("ctsha",payload.getString("ct_sha"));
            JSONObject access=request("/check",check,65536);
            if(access.optBoolean("banned")||access.optBoolean("blocked")){
                String reason=access.optString("reason","denied");
                if("no-login".equals(reason)&&attempt<5){
                    tell("Normal game is available. Waiting for your existing key dialog…",false);
                    final int delay=new int[]{3000,7000,10000,15000,20000}[attempt];
                    ui.postDelayed(new Runnable(){public void run(){if(active(token))worker.execute(new Runnable(){public void run(){authorize(payload,token,attempt+1);}});}},delay);
                    return;
                }
                throw new IOException("no-login".equals(reason)?"Complete your existing key dialog to enable the mod":"Mod access denied ("+reason+")");
            }
            launchLocks=access.optJSONObject("featureLocks");
            if(launchLocks==null||!access.has("key"))throw new IOException("Server loader update required");
            if(launchLocks.optBoolean("app")||launchLocks.optBoolean("mods"))throw new IOException("Mod is disabled by the owner");
            launchBrand=access.optJSONObject("brand");launchThemes=access.optJSONObject("themes");
            key=Base64.decode(access.getString("key"),Base64.DEFAULT);
            plaintext=PayloadCrypto.decrypt(key,Base64.decode(payload.getString("iv_b64"),Base64.DEFAULT),Base64.decode(payload.getString("ct_b64"),Base64.DEFAULT));
            JSONObject bundle=new JSONObject(new String(plaintext,"UTF-8"));
            if(!"DG-MOD-SPLIT-1".equals(bundle.optString("format")))throw new IOException("Wrong mod payload format");
            InputStream original=web.getContext().getAssets().open("www/dynamons_world.min.js");
            ByteArrayOutputStream originalBytes=new ByteArrayOutputStream();byte[] buffer=new byte[8192];int n;
            try{while((n=original.read(buffer))!=-1){if(!active(token))return;if(originalBytes.size()+n>10000000)throw new IOException("Original game exceeds size limit");originalBytes.write(buffer,0,n);}}finally{original.close();}
            if(!PayloadCrypto.hash(originalBytes.toByteArray()).equals(bundle.getString("original_sha256")))throw new IOException("APK original game differs from the file used to build the mod payload");
            final String content=bundle.toString();
            ui.post(new Runnable(){public void run(){
                if(!active(token))return;
                protectedPage=true;listener.appearance(launchThemes);
                tell("Key accepted. Restarting game once with protected features…",false);
                web.loadUrl(baseUrl+"?dg-protected="+token);
                waitForPage(token,true,content);
            }});
        }catch(Exception e){fail(token,message(e));}
        finally{if(key!=null)Arrays.fill(key,(byte)0);if(plaintext!=null)Arrays.fill(plaintext,(byte)0);}
    }
    private void inject(final String code,final int offset,final int token){
        if(!active(token))return;
        if(!localGamePage()){fail(token,"Game page changed during mod loading");return;}
        if(offset==0){evaluate("window.__DG_NATIVE_SOURCE=[];true",token,new Result(){public void accept(String v){if(!"true".equals(v)){fail(token,"Unable to initialize mod transfer");return;}append(code,0,token);}});return;}
        append(code,offset,token);
    }
    private void append(final String code,final int offset,final int token){
        if(!active(token))return;
        if(offset>=code.length()){boot(token);return;}
        final int end=Math.min(code.length(),offset+24000);
        evaluate("window.__DG_NATIVE_SOURCE.push("+JSONObject.quote(code.substring(offset,end))+");true",token,new Result(){public void accept(String value){
            if(!"true".equals(value)){fail(token,"Mod transfer failed");return;}append(code,end,token);
        }});
    }
    private void boot(final int token){
        evaluate("(function(){try{var bundle=JSON.parse(window.__DG_NATIVE_SOURCE.join(''));delete window.__DG_NATIVE_SOURCE;window.__DG_START_PROTECTED(bundle,"+launchLocks.toString()+","+(launchBrand==null?"null":launchBrand.toString())+","+JSONObject.quote(SERVER)+");return {ok:true};}catch(e){return {ok:false,error:String(e.message||e)};}})()",token,new Result(){public void accept(String value){
            try{JSONObject state=new JSONObject(value);if(!state.optBoolean("ok"))throw new IOException(state.optString("error","Mod boot failed"));waitForBoot(token,SystemClock.elapsedRealtime());}
            catch(Exception e){fail(token,message(e));}
        }});
    }
    private void waitForBoot(final int token,final long since){
        if(!active(token))return;
        if(!localGamePage()){fail(token,"Game page changed during mod startup");return;}
        if(SystemClock.elapsedRealtime()-since>85000){fail(token,"Protected game startup timed out");return;}
        evaluate("window.__DG_SPLIT_BOOT||{}",token,new Result(){public void accept(String value){
            try{JSONObject state=new JSONObject(value);
                if(state.has("ok")){
                    if(!state.optBoolean("ok")){fail(token,state.optString("error","Protected game failed"));return;}
                    busy=false;loaded=true;protectedPage=false;generation++;tell("Protected game initialized · open the floating menu",false);return;
                }
            }catch(Exception ignored){}
            ui.postDelayed(new Runnable(){public void run(){waitForBoot(token,since);}},500);
        }});
    }
    public void close(){closed=true;generation++;ui.removeCallbacksAndMessages(null);worker.shutdownNow();}
}
