package com.dynamongamer.containerprobe;

import android.app.Service;
import android.content.Intent;
import android.os.IBinder;
import android.os.Process;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicBoolean;
import org.lsposed.hiddenapibypass.HiddenApiBypass;
import top.canyie.pine.Pine;
import top.canyie.pine.PineConfig;

/** Exercises the SDK's early ART operations in our own disposable process, never the game. */
public final class NativeCompatibilityService extends Service {
    private final AtomicBoolean started = new AtomicBoolean();
    private final AtomicBoolean finished = new AtomicBoolean();
    private final ScheduledExecutorService timer = Executors.newSingleThreadScheduledExecutor();
    @Override public IBinder onBind(Intent intent) { return null; }
    @Override public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent == null || !started.compareAndSet(false, true)) return START_NOT_STICKY;
        final long attempt = intent.getLongExtra("attempt", 0);
        StartupDiagnostics.event("Native compatibility test started; attempt=" + attempt);
        timer.schedule(new Runnable() {
            @Override public void run() {
                if (!finished.compareAndSet(false, true)) return;
                CrashEvidence.write("native-probe.result", attempt + " TIMEOUT");
                StartupDiagnostics.event("Native compatibility test timeout; stopping only test process");
                Process.killProcess(Process.myPid());
            }
        }, 8, TimeUnit.SECONDS);
        new Thread(new Runnable() {
            @Override public void run() {
                String status = "PASSED";
                try {
                    PineConfig.debug = true;
                    PineConfig.debuggable = true;
                    StartupDiagnostics.event("Native test: hidden API setup entered");
                    HiddenApiBypass.addHiddenApiExemptions("");
                    StartupDiagnostics.event("Native test: Pine.disableJitInline entered");
                    boolean inline = Pine.disableJitInline();
                    StartupDiagnostics.event("Native test: Pine.disableJitInline returned " + inline);
                    StartupDiagnostics.event("Native test: Pine.disableProfileSaver entered");
                    boolean profile = Pine.disableProfileSaver();
                    StartupDiagnostics.event("Native test: Pine.disableProfileSaver returned " + profile);
                    Pine.setJitCompilationAllowed(false);
                    StartupDiagnostics.event("Native test: ART calls returned; full container compatibility remains unverified");
                } catch (Throwable failure) {
                    status = "FAILED_" + failure.getClass().getSimpleName();
                    StartupDiagnostics.failure("Native compatibility test Java failure", failure);
                }
                if (finished.compareAndSet(false, true)) {
                    CrashEvidence.write("native-probe.result", attempt + " " + status);
                    timer.shutdownNow(); stopSelf();
                }
            }
        }, "native-compatibility-check").start();
        return START_NOT_STICKY;
    }
    @Override public void onDestroy() { timer.shutdownNow(); super.onDestroy(); }
}
