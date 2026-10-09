package com.dynamongamer.royalvoid;

import android.content.Context;
import android.graphics.*;
import android.widget.ImageView;

/**
 * Fits artwork without stretching, and clips to a rounded frame. 
 */
public final class ArtworkView extends ImageView {
    private final Path clip = new Path();
    private Integer surfaceColor;
    public void setSurfaceColor(int color){surfaceColor=Integer.valueOf(color);invalidate();}
    private final Paint paint = new Paint(Paint.ANTI_ALIAS_FLAG);
    
    public ArtworkView(Context c) {
        super(c);
        setScaleType(ScaleType.FIT_CENTER);
        setAdjustViewBounds(true);
        setImportantForAccessibility(IMPORTANT_FOR_ACCESSIBILITY_NO);
    }
    
    public void asset(String path) {
        Bitmap bitmap=decodeAsset(path);
        if(bitmap==null&&path.startsWith("royal_void/images/themes/"))bitmap=decodeAsset("royal_void/images/brand_logo.png");
        setImageBitmap(bitmap);
    }
    private Bitmap decodeAsset(String path) {
        try {
            java.io.InputStream in=getContext().getAssets().open(path);
            try {return BitmapFactory.decodeStream(in);} finally {in.close();}
        } catch(Exception ignored){return null;}
    }

    protected void onDraw(Canvas canvas) {
        float radius = RoyalVoidTheme.dp(getContext(), 12);
        RectF bounds = new RectF(0, 0, getWidth(), getHeight());
        clip.reset();
        clip.addRoundRect(bounds, radius, radius, Path.Direction.CW);
        canvas.save();
        canvas.clipPath(clip);
        paint.setColor(surfaceColor==null?ThemeManager.colors(getContext()).CARD:surfaceColor.intValue());
        canvas.drawRect(bounds, paint);
        super.onDraw(canvas);
        canvas.restore();
    }
}
