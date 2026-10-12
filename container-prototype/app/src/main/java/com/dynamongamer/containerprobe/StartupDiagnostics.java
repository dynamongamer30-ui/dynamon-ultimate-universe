package com.dynamongamer.containerprobe;

import android.app.Activity;
import android.app.Application;
import android.content.Context;
import android.net.Uri;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.os.Process;
import android.os.SystemClock;
import android.view.View;
import android.view.ViewGroup;
import android.webkit.ValueCallback;
import android.webkit.WebView;
import com.fvbox.lib.abs.ApplicationCallback;
import java.io.File;
import java.io.RandomAccessFile;
import java.lang.ref.WeakReference;
import java.nio.channels.FileLock;
import java.nio.charset.StandardCharsets;

/** Local, bounded startup events shared by host/guest processes. No account or save data. */
final class StartupDiagnostics implements ApplicationCallback {
    private static final String GAME = "com.funtomic.dynamons3";
    private static final int LIMIT = 65536;
    private static File events;

    static synchronized void initialize(Context host) {
        // Resolve the host-owned path before the SDK installs guest path redirects.
        events = new File(host.getFilesDir(), "container-startup.events");
        event("Host process attach started");
    }

    static synchronized void event(String message) {
        if (events == null) return;
        String line = "t=" + SystemClock.elapsedRealtime() + "ms pid=" + Process.myPid() + " "
            + message.replace('\n', ' ').replace('\r', ' ') + "\n";
        try (RandomAccessFile file = new RandomAccessFile(events, "rw");
             FileLock lock = file.getChannel().lock()) {
            if (file.length() > LIMIT) file.setLength(0);
            file.seek(file.length());
            file.write(line.getBytes(StandardCharsets.UTF_8));
        } catch (Exception ignored) {
            // Diagnostic failure must never interrupt the guest or change game behavior.
        }
    }

    static synchronized File file(String name) {
        return events == null ? null : new File(events.getParentFile(), name);
    }

    static synchronized String read() {
        if (events == null) return "Local event file is unavailable.\n";
        try (RandomAccessFile file = new RandomAccessFile(events, "rw");
             FileLock lock = file.getChannel().lock()) {
            int size = (int) Math.min(file.length(), LIMIT + 4096);
            byte[] bytes = new byte[size];
            file.seek(Math.max(0, file.length() - size));
            file.readFully(bytes);
            return new String(bytes, StandardCharsets.UTF_8);
        } catch (Exception failure) {
            return "Reading local events failed: " + failure.getClass().getSimpleName() + "\n";
        }
    }

    static void failure(String stage, Throwable failure) {
        event(stage + ": " + failure.getClass().getName());
        for (int i = 0; i < Math.min(16, failure.getStackTrace().length); i++) {
            StackTraceElement frame = failure.getStackTrace()[i];
            event("at " + frame.getClassName() + "." + frame.getMethodName() + ":" + frame.getLineNumber());
        }
        // Exception messages are omitted because they can contain URLs or account data.
        Throwable cause = failure.getCause();
        if (cause != null && cause != failure) event("Cause class: " + cause.getClass().getName());
    }

    static void observeUncaughtFailures() {
        final Thread.UncaughtExceptionHandler previous = Thread.getDefaultUncaughtExceptionHandler();
        Thread.setDefaultUncaughtExceptionHandler(new Thread.UncaughtExceptionHandler() {
            @Override public void uncaughtException(Thread thread, Throwable failure) {
                failure("Uncaught Java failure", failure);
                if (previous != null) previous.uncaughtException(thread, failure);
                else { Process.killProcess(Process.myPid()); System.exit(10); }
            }
        });
    }

    @Override public void beforeCreateApplication(String packageName, String processName, int userId) {
        if (GAME.equals(packageName)) event("SDK beforeCreateApplication: " + processName);
    }

    @Override public void afterCreatedApplication(Application application, String packageName,
                                                   String processName, int userId) {
        if (!GAME.equals(packageName)) return;
        event("SDK afterCreatedApplication: " + application.getClass().getName());
        observeUncaughtFailures();
        application.registerActivityLifecycleCallbacks(new Application.ActivityLifecycleCallbacks() {
            @Override public void onActivityCreated(Activity activity, Bundle state) {
                event("Guest activity created: " + activity.getClass().getName());
            }
            @Override public void onActivityStarted(Activity activity) {
                event("Guest activity started: " + activity.getClass().getName());
            }
            @Override public void onActivityResumed(Activity activity) {
                event("Guest activity resumed: " + activity.getClass().getName());
                inspectOverTime(activity);
            }
            @Override public void onActivityPaused(Activity activity) { event("Guest activity paused"); }
            @Override public void onActivityStopped(Activity activity) { event("Guest activity stopped"); }
            @Override public void onActivitySaveInstanceState(Activity activity, Bundle state) {}
            @Override public void onActivityDestroyed(Activity activity) { event("Guest activity destroyed"); }
        });
        new Handler(Looper.getMainLooper()).post(new Runnable() {
            @Override public void run() { event("Guest main-thread checkpoint after Application callback"); }
        });
    }

    private void inspectOverTime(Activity activity) {
        final WeakReference<Activity> reference = new WeakReference<Activity>(activity);
        Handler handler = new Handler(Looper.getMainLooper());
        for (final int seconds : new int[]{0, 2, 5, 10, 20, 40}) {
            handler.postDelayed(new Runnable() {
                @Override public void run() {
                    Activity current = reference.get();
                    if (current == null || current.isDestroyed() || current.isFinishing()) return;
                    event("Guest main-thread checkpoint: " + seconds + "s after resume");
                    try {
                        WebView web = findWebView(current.getWindow().getDecorView(), 0, new int[]{0});
                        if (web == null) { event("WebView not found in guest activity view tree"); return; }
                        String url = web.getUrl();
                        String scheme = url == null ? "none" : String.valueOf(Uri.parse(url).getScheme());
                        event("WebView present; URL scheme=" + scheme + "; load progress=" + web.getProgress()
                            + "; JavaScript enabled=" + web.getSettings().getJavaScriptEnabled());
                        // Read-only page-state check. Does not replace WebView clients or load another page.
                        web.evaluateJavascript("JSON.stringify({ready:document.readyState,canvas:document.querySelectorAll('canvas').length,renderCanvas:!!document.querySelector('canvas[width]'),lime:typeof window.lime!=='undefined',cordova:typeof window.cordova!=='undefined'})",
                            new ValueCallback<String>() {
                                @Override public void onReceiveValue(String value) {
                                    if (value == null || value.length() > 512) { event("WebView page-state response unavailable"); return; }
                                    event("WebView page-state: " + value);
                                }
                            });
                    } catch (Throwable failure) { failure("WebView inspection failed", failure); }
                }
            }, seconds * 1000L);
        }
    }

    private WebView findWebView(View view, int depth, int[] visited) {
        if (view == null || depth > 24 || ++visited[0] > 512) return null;
        if (view instanceof WebView) return (WebView) view;
        if (view instanceof ViewGroup) {
            ViewGroup group = (ViewGroup) view;
            for (int i = 0; i < group.getChildCount(); i++) {
                WebView match = findWebView(group.getChildAt(i), depth + 1, visited);
                if (match != null) return match;
            }
        }
        return null;
    }
}
