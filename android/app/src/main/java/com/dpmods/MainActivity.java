package com.dpmods;

import android.app.Activity;
import android.os.Bundle;

public class MainActivity extends Activity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // This triggers your login/link dialog
        dynamongamerytUserPass.hideTitle(this);
        dynamongamerytUserPass.DGDialog(this);
    }

    // Required method to fix the AIDE compilation error
    @Override
    public void onPointerCaptureChanged(boolean hasCapture) {
    }
}