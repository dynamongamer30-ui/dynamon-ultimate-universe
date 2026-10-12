package com.dynamongamer.containerprobe;

import android.app.Application;
import android.content.Context;
import com.fvbox.lib.FCore;

/** Initializes the published SDK without changing any game identity or auth settings. */
public final class ProbeApplication extends Application {
    static volatile String initialization = "Not initialized";
    static volatile boolean ready;

    @Override protected void attachBaseContext(Context base) {
        super.attachBaseContext(base);
        StartupDiagnostics.initialize(base);
        StartupDiagnostics.observeUncaughtFailures();
        try {
            FCore.get().setApplicationCallback(new StartupDiagnostics());
            StartupDiagnostics.event("SDK init entered");
            FCore.get().init(this);
            StartupDiagnostics.event("SDK init returned; client=" + FCore.isClient());
            if (!FCore.isClient()) {
                FCore.get().setAllowSystemInteraction(true);
                FCore.get().setAutoPreloadApplication(false);
            }
            initialization = "SDK initialized; game startup and Google login unverified";
            ready = true;
        } catch (Throwable failure) {
            StartupDiagnostics.failure("SDK initialization failed", failure);
            initialization = "SDK initialization failed: " + failure.getClass().getSimpleName()
                + ": " + String.valueOf(failure.getMessage());
            ready = false;
        }
    }
}
