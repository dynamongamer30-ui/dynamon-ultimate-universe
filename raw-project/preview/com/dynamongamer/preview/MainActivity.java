package com.dynamongamer.preview;

import android.app.Activity;
import android.os.Bundle;
import android.graphics.*;
import android.view.View;
import com.dynamongamer.royalvoid.ModEntry;

/**
 * Development-only Activity. The injected component never references this class. 
 */
public final class MainActivity extends Activity {
    
    public void onCreate(Bundle state) {
        super.onCreate(state);
        setContentView(new PreviewBackground());
        ModEntry.preview(this);
    }
    
    protected void onDestroy() {
        ModEntry.detach(this);
        super.onDestroy();
    }
    
    private final class PreviewBackground extends View {
        private final Paint paint = new Paint(Paint.ANTI_ALIAS_FLAG);
        
        PreviewBackground() {
            super(MainActivity.this);
            setContentDescription("Royal Void design preview. No game account is connected.");
        }
        
        protected void onDraw(Canvas c) {
            float w = getWidth();
            float h = getHeight();
            paint.setShader(new LinearGradient(0, 0, w, h, new int[]{-15464156, -16250864, -14610380}, null, Shader.TileMode.CLAMP));
            c.drawRect(0, 0, w, h, paint);
            paint.setShader(null);
            paint.setColor(-13886147);
            paint.setStrokeWidth(1);
            for (int i = 0; i < getWidth(); i += 60) c.drawLine(i, 0, i, h, paint);
            for (int i = 0; i < getHeight(); i += 60) c.drawLine(0, i, w, i, paint);
        }
    }
}
