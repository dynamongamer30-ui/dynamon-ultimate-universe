package com.dynamongamer.royalvoid;

import android.app.*;
import android.content.*;
import android.net.Uri;
import android.os.Bundle;
import java.io.*;
import org.json.*;

/** Storage Access Framework document picker. No storage permission or host result hook. */
public final class PortableProfile extends Fragment {
    public interface Listener { void done(JSONObject value, String error); }
    private static final int EXPORT = 8301, IMPORT = 8302;
    private static final int LIMIT = 1024 * 1024;
    private JSONObject document;
    private Listener listener;
    private boolean exporting, launched;
    public PortableProfile() {}
    public static void open(Activity a, JSONObject doc, boolean write, Listener cb) {
        if (a.isFinishing() || a.getFragmentManager().findFragmentByTag("dg.portable.profile") != null) {
            cb.done(null,"A file operation is already open"); return;
        }
        PortableProfile f = new PortableProfile(); f.document=doc; f.exporting=write; f.listener=cb;
        a.getFragmentManager().beginTransaction().add(f,"dg.portable.profile").commit();
    }
    public void onCreate(Bundle b) { super.onCreate(b); setRetainInstance(true); }
    public void onResume() {
        super.onResume(); if (launched) return; launched=true;
        if (listener == null) { finish(null,"File operation interrupted; try again"); return; }
        Intent i = new Intent(exporting ? Intent.ACTION_CREATE_DOCUMENT : Intent.ACTION_OPEN_DOCUMENT);
        i.addCategory(Intent.CATEGORY_OPENABLE); i.setType(exporting ? "application/json" : "*/*");
        if (exporting) i.putExtra(Intent.EXTRA_TITLE,"Dynamon-Gamer-Controls.json");
        try { startActivityForResult(i,exporting?EXPORT:IMPORT); }
        catch (ActivityNotFoundException e) { finish(null,"No document picker available"); }
    }
    public void onActivityResult(int request,int result,Intent data) {
        super.onActivityResult(request,result,data);
        if (request!=EXPORT && request!=IMPORT) return;
        if (result!=Activity.RESULT_OK || data==null || data.getData()==null) { finish(null,null); return; }
        try {
            Uri uri=data.getData();
            if (request==EXPORT) {
                byte[] bytes=document.toString(2).getBytes("UTF-8");
                if (bytes.length>LIMIT) throw new IOException("Profile is too large");
                OutputStream out=getActivity().getContentResolver().openOutputStream(uri,"wt");
                if(out==null) throw new IOException("Cannot write this file");
                try { out.write(bytes); } finally { out.close(); }
                finish(document,null);
            } else {
                InputStream in=getActivity().getContentResolver().openInputStream(uri);
                if(in==null) throw new IOException("Cannot read this file");
                ByteArrayOutputStream out=new ByteArrayOutputStream(); byte[] buf=new byte[4096]; int n;
                try { while((n=in.read(buf))!=-1) { if(out.size()+n>LIMIT) throw new IOException("Profile exceeds 1 MB"); out.write(buf,0,n); }} finally { in.close(); }
                JSONObject value=new JSONObject(new String(out.toByteArray(),"UTF-8"));
                if (!"dg-royal-void-profile".equals(value.optString("format")) || value.optInt("schema")!=1 || value.optJSONObject("controls")==null)
                    throw new IOException("This is not a supported Royal Void profile");
                finish(value,null);
            }
        } catch (Exception e) { finish(null,e.getMessage()==null?"File operation failed":e.getMessage()); }
    }
    private void finish(JSONObject value,String error) {
        Listener cb=listener; listener=null;
        if (isAdded()) getFragmentManager().beginTransaction().remove(this).commitAllowingStateLoss();
        if (cb!=null) cb.done(value,error);
    }
}
