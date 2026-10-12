package com.dynamongamer.containerprobe;

import android.app.Application;
import android.content.Context;
import com.fvbox.lib.FCore;
import android.os.Build;
import com.tencent.mmkv.MMKV;
import java.io.File;

/** Initializes the published SDK without changing any game identity or auth settings. */
public final class ProbeApplication extends Application {
    static volatile String initialization = "Not initialized";
    static volatile boolean ready;

    @Override protected void attachBaseContext(Context base) {
        super.attachBaseContext(base);
        StartupDiagnostics.initialize(base);
        StartupDiagnostics.observeUncaughtFailures();
        String process = Build.VERSION.SDK_INT >= 28 ? Application.getProcessName() : "";
        StartupDiagnostics.event("Process role: " + process + "; page bytes=" + CrashEvidence.pageSize());
        if (process.equals(base.getPackageName() + ":nativecheck")) {
            StartupDiagnostics.event("Dedicated native test process; container SDK is not initialized here");
            return;
        }
        try {
            if (process.equals(base.getPackageName())) {
                // MMKV is the SDK's documented dependency; use its exact root and public SDK settings.
                String path = new File(base.getFilesDir(), "mmkv").getAbsolutePath();
                MMKV.initialize(base, path);
                FCore.get().setAutoPreloadApplication(false);
                FCore.get().setAutoPreloadApplicationCount(0);
                FCore.get().setPreloadProcessCount(0);
                FCore.get().enableOptRule(false);
                StartupDiagnostics.event("Before SDK init: application and process preloads=0; optimization rules off");
                // Preserve crash evidence before the SDK's host initialization rotates its log files.
                CrashEvidence.capture(base);
            }
            FCore.get().setApplicationCallback(new StartupDiagnostics());
            StartupDiagnostics.event("SDK init entered");
            FCore.get().init(this);
            StartupDiagnostics.event("SDK init returned; client=" + FCore.isClient());
            if (process.equals(base.getPackageName())) {
                FCore.get().setAllowSystemInteraction(true);
                FCore.get().setAutoPreloadApplication(false);
                FCore.get().setAutoPreloadApplicationCount(0);
                FCore.get().setPreloadProcessCount(0);
                FCore.get().enableOptRule(false);
                FCore.get().setEnableLauncherView(false);
                FCore.get().setBackToHome(true);
                StartupDiagnostics.event("Host SDK settings applied: no preloads/optimization/splash launcher");
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
