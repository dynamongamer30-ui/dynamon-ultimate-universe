package com.dynamongamer.containerprobe;

import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/** Extracts crash identifiers without echoing arbitrary exception messages or log payloads. */
final class CrashFrameFilter {
    private static final Pattern EXCEPTION = Pattern.compile("(?:[A-Za-z_$][A-Za-z0-9_$]*\\.)+[A-Za-z0-9_$]*(?:Exception|Error)\\b");
    private static final Pattern FRAME = Pattern.compile("\\bat\\s+([A-Za-z0-9_.$]+)\\(");
    private static final Pattern SIGNAL = Pattern.compile("\\bsignal\\s+(\\d+)\\s+\\(([A-Z0-9]+)\\)");
    private static final Pattern NATIVE = Pattern.compile("(#\\d+)\\s+pc\\s+([A-Fa-f0-9]+)\\s+\\S*[/!]([A-Za-z0-9_.+-]+\\.so)");
    private static final Pattern PERMISSION = Pattern.compile("android\\.permission\\.[A-Z_]+");
    private static final Pattern LIBRARY = Pattern.compile("\\blib[A-Za-z0-9_.+-]+\\.so\\b");
    static String filter(String line) {
        List<String> parts = new ArrayList<String>();
        add(EXCEPTION, line, parts, "Exception: ");
        Matcher frame = FRAME.matcher(line); if (frame.find()) parts.add("at " + frame.group(1));
        Matcher signal = SIGNAL.matcher(line); if (signal.find()) parts.add("signal " + signal.group(1) + " (" + signal.group(2) + ")");
        Matcher nativeFrame = NATIVE.matcher(line);
        if (nativeFrame.find()) parts.add(nativeFrame.group(1) + " pc " + nativeFrame.group(2) + " " + nativeFrame.group(3));
        add(PERMISSION, line, parts, "Permission: ");
        if (line.contains("dlopen failed") || line.contains("cannot locate symbol")) {
            parts.add("Native linker failure"); add(LIBRARY, line, parts, "Library: ");
        }
        return String.join("; ", parts);
    }
    private static void add(Pattern pattern, String line, List<String> parts, String prefix) {
        Matcher matcher = pattern.matcher(line);
        for (int i = 0; i < 4 && matcher.find(); i++) parts.add(prefix + matcher.group());
    }
}
