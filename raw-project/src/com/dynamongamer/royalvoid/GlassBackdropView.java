package com.dynamongamer.royalvoid;

import android.app.Activity;
import android.content.Context;
import android.graphics.*;
import android.os.*;
import android.view.*;
import java.util.concurrent.*;

/** One frozen, downsampled game background per opening; no per-frame screenshot loop. */
public final class GlassBackdropView extends View {
    private final Paint paint=new Paint(Paint.ANTI_ALIAS_FLAG|Paint.FILTER_BITMAP_FLAG);
    private final Handler ui=new Handler(Looper.getMainLooper());
    private final ExecutorService worker=Executors.newSingleThreadExecutor();
    private Bitmap image;
    private volatile boolean closed;
    private int generation;
    private int screenWidth,screenHeight;
    private int originX,originY;
    public GlassBackdropView(Context c){super(c);setImportantForAccessibility(IMPORTANT_FOR_ACCESSIBILITY_NO);}
    public void capture(final Activity a,final Runnable done){
        final int token=++generation;
        if(Build.VERSION.SDK_INT<26 || closed){done.run();return;}
        final View decor=a.getWindow().getDecorView();screenWidth=decor.getWidth();screenHeight=decor.getHeight();
        if(screenWidth<1 || screenHeight<1){done.run();return;}
        final Bitmap small=Bitmap.createBitmap(Math.max(1,screenWidth/8),Math.max(1,screenHeight/8),Bitmap.Config.ARGB_8888);
        try{PixelCopy.request(a.getWindow(),small,new PixelCopy.OnPixelCopyFinishedListener(){public void onPixelCopyFinished(int result){
            if(closed || token!=generation){small.recycle();return;}
            if(result!=PixelCopy.SUCCESS){small.recycle();done.run();return;}
            worker.execute(new Runnable(){public void run(){blur(small);
                ui.post(new Runnable(){public void run(){if(closed||token!=generation){small.recycle();return;}
                    Bitmap old=image;image=small;if(old!=null)old.recycle();invalidate();done.run();
                }});
            }});
        }},ui);}catch(Exception e){small.recycle();done.run();}
    }
    private static void blur(Bitmap b){
        int w=b.getWidth(),h=b.getHeight();int[] in=new int[w*h],out=new int[w*h];b.getPixels(in,0,w,0,0,w,h);
        for(int pass=0;pass<3;pass++){
            for(int y=0;y<h;y++)for(int x=0;x<w;x++){
                int red=0,green=0,blue=0,n=0;
                for(int k=-2;k<=2;k++){int xx=Math.max(0,Math.min(w-1,x+k));int c=in[y*w+xx];red+=(c>>16)&255;green+=(c>>8)&255;blue+=c&255;n++;}
                out[y*w+x]=0xff000000|(red/n)<<16|(green/n)<<8|(blue/n);
            }
            int[] swap=in;in=out;out=swap;
            for(int y=0;y<h;y++)for(int x=0;x<w;x++){
                int red=0,green=0,blue=0,n=0;
                for(int k=-2;k<=2;k++){int yy=Math.max(0,Math.min(h-1,y+k));int c=in[yy*w+x];red+=(c>>16)&255;green+=(c>>8)&255;blue+=c&255;n++;}
                out[y*w+x]=0xff000000|(red/n)<<16|(green/n)<<8|(blue/n);
            }
            swap=in;in=out;out=swap;
        }
        b.setPixels(in,0,w,0,0,w,h);
    }
    protected void onDraw(Canvas c){
        if(image==null||image.isRecycled())return;
        int[] pos=new int[2];getLocationOnScreen(pos);originX=pos[0];originY=pos[1];
        Path clip=new Path();clip.addRoundRect(new RectF(0,0,getWidth(),getHeight()),RoyalVoidTheme.dp(getContext(),26),RoyalVoidTheme.dp(getContext(),26),Path.Direction.CW);
        c.save();c.clipPath(clip);paint.setAlpha(255);
        c.drawBitmap(image,null,new RectF(-originX,-originY,screenWidth-originX,screenHeight-originY),paint);c.restore();
    }
    public void cancel(){generation++;}
    public void close(){closed=true;generation++;worker.shutdownNow();ui.removeCallbacksAndMessages(null);if(image!=null){image.recycle();image=null;}}
}
