package com.dynamongamer.containerprobe;

import android.app.ActivityManager;
import android.app.ApplicationExitInfo;
import android.content.Context;
import android.os.Build;
import android.system.Os;
import android.system.OsConstants;
import java.io.BufferedReader;
import java.io.File;
import java.io.FileInputStream;
import java.io.FilterInputStream;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.RandomAccessFile;
import java.nio.channels.FileLock;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.concurrent.TimeUnit;

/** Own-app process exits and filtered crash frames only. Never uploads logs. */
final class CrashEvidence {
    private CrashEvidence() {}

    static long pageSize() {
        try { return Os.sysconf(OsConstants._SC_PAGESIZE); }
        catch (Exception unavailable) { return -1; }
    }

    static String capture(Context context) {
        StringBuilder out = new StringBuilder("Android process exits and crash evidence\n");
        out.append("Memory page size: ").append(pageSize()).append(" bytes\n");
        out.append("Published SDK ELF alignment: 4096 bytes; Android 16 support unverified\n");
        if (Build.VERSION.SDK_INT >= 30) {
            try {
                ActivityManager manager = (ActivityManager) context.getSystemService(Context.ACTIVITY_SERVICE);
                List<ApplicationExitInfo> exits = manager.getHistoricalProcessExitReasons(context.getPackageName(), 0, 24);
                out.append("Own-app historical exits: ").append(exits.size()).append('\n');
                for (ApplicationExitInfo exit : exits) {
                    out.append("pid=").append(exit.getPid()).append(" process=").append(exit.getProcessName())
                       .append(" reason=").append(reason(exit.getReason())).append(" status=").append(exit.getStatus())
                       .append(" timestamp=").append(exit.getTimestamp()).append('\n');
                }
            } catch (Exception failure) { out.append("Exit history unavailable: ").append(failure.getClass().getSimpleName()).append('\n'); }
        }
        captureSdkFiles(context, out);
        if (Build.VERSION.SDK_INT >= 26) {
            Process logcat = null;
            try {
                // logd restricts an ordinary app to its own UID; no READ_LOGS permission requested.
                logcat = new ProcessBuilder("logcat", "-d", "-b", "crash", "-v", "brief", "-t", "80",
                    "AndroidRuntime:E", "libc:F", "DEBUG:E", "*:S").redirectErrorStream(true).start();
                if (!logcat.waitFor(2, TimeUnit.SECONDS)) logcat.destroyForcibly();
                out.append("Own-UID crash buffer (filtered):\n");
                collect(logcat.getInputStream(), out);
            } catch (Exception failure) { out.append("Crash buffer unavailable: ").append(failure.getClass().getSimpleName()).append('\n'); }
            finally { if (logcat != null) logcat.destroy(); }
        }
        String report = out.length() > 32768 ? out.substring(0, 32768) : out.toString();
        write("crash-evidence.txt", report);
        return report;
    }

    static void captureSdkFiles(Context context, StringBuilder out) {
        List<File> files = new ArrayList<File>();
        addFiles(new File(context.getFilesDir(), "tombstones"), files);
        File external = context.getExternalFilesDir("Log");
        if (external != null) addFiles(new File(external, "xCrash"), files);
        files.sort(new Comparator<File>() {
            @Override public int compare(File a, File b) { return Long.compare(b.lastModified(), a.lastModified()); }
        });
        out.append("SDK tombstone files found: ").append(files.size()).append('\n');
        for (int i = 0; i < Math.min(4, files.size()); i++) {
            try (FileInputStream input = new FileInputStream(files.get(i))) {
                out.append("SDK tombstone #").append(i + 1).append(" (filtered):\n");
                collect(input, out);
            } catch (Exception failure) { out.append("Tombstone unavailable: ").append(failure.getClass().getSimpleName()).append('\n'); }
        }
    }

    private static void addFiles(File directory, List<File> files) {
        File[] found = directory.listFiles();
        if (found == null) return;
        for (File file : found) if (file.isFile() && files.size() < 32) files.add(file);
    }

    private static void collect(InputStream input, StringBuilder out) throws Exception {
        InputStream limited = new FilterInputStream(input) {
            private int remaining = 131072;
            @Override public int read() throws java.io.IOException {
                if (remaining <= 0) return -1;
                int value = super.read(); if (value >= 0) remaining--; return value;
            }
            @Override public int read(byte[] bytes, int offset, int length) throws java.io.IOException {
                if (remaining <= 0) return -1;
                int count = in.read(bytes, offset, Math.min(length, remaining));
                if (count > 0) remaining -= count;
                return count;
            }
        };
        BufferedReader reader = new BufferedReader(new InputStreamReader(limited, StandardCharsets.UTF_8));
        int count = 0, total = 0, matches = 0;
        String line;
        while (count++ < 800 && (line = reader.readLine()) != null && total < 131072 && out.length() < 32768) {
            total += line.length();
            String safe = CrashFrameFilter.filter(line);
            if (!safe.isEmpty()) { out.append(safe).append('\n'); matches++; }
        }
        if (matches == 0) out.append("No recognized crash frames available\n");
    }

    static String reason(int value) {
        switch (value) {
            case 1: return "EXIT_SELF";
            case 2: return "SIGNALED";
            case 3: return "LOW_MEMORY";
            case 4: return "JAVA_CRASH";
            case 5: return "NATIVE_CRASH";
            case 6: return "ANR";
            case 7: return "INITIALIZATION_FAILURE";
            case 8: return "PERMISSION_CHANGE";
            case 9: return "EXCESSIVE_RESOURCE_USAGE";
            case 10: return "USER_REQUESTED";
            case 11: return "USER_STOPPED";
            case 12: return "DEPENDENCY_DIED";
            case 13: return "OTHER";
            case 14: return "FREEZER";
            case 15: return "PACKAGE_STATE_CHANGE";
            case 16: return "PACKAGE_UPDATED";
            default: return "CODE_" + value;
        }
    }

    static synchronized void write(String name, String value) {
        File path = StartupDiagnostics.file(name);
        if (path == null) return;
        try (RandomAccessFile file = new RandomAccessFile(path, "rw"); FileLock lock = file.getChannel().lock()) {
            file.setLength(0); file.write(value.getBytes(StandardCharsets.UTF_8));
        } catch (Exception ignored) {}
    }

    static synchronized String read(String name) {
        File path = StartupDiagnostics.file(name);
        if (path == null || !path.isFile()) return "";
        try (RandomAccessFile file = new RandomAccessFile(path, "rw"); FileLock lock = file.getChannel().lock()) {
            byte[] bytes = new byte[(int) Math.min(file.length(), 32768)]; file.readFully(bytes);
            return new String(bytes, StandardCharsets.UTF_8);
        } catch (Exception ignored) { return ""; }
    }
}
