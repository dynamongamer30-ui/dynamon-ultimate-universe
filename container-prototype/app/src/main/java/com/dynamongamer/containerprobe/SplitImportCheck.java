package com.dynamongamer.containerprobe;

import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;
import java.security.MessageDigest;
import java.util.Arrays;
import java.util.HashSet;
import java.util.Set;
import java.util.zip.ZipFile;

/** Accepts real split APKs, never fabricated package metadata. Runs off the UI thread. */
final class SplitImportCheck {
    private SplitImportCheck() {}

    static String check(String[] expectedNames, String[] packageNames, String[] applicationNames,
                        String originalBase, String guestBase, String[] originalPaths, String[] guestPaths) {
        String[] expected = nonNull(expectedNames);
        String[] actual = nonNull(packageNames);
        if (actual.length == 0) actual = nonNull(applicationNames);
        if (!namesEqual(expected, actual)) return "split names differ; expected " + Arrays.toString(expected)
            + ", PackageInfo " + Arrays.toString(packageNames) + ", ApplicationInfo " + Arrays.toString(applicationNames);
        String[] originals = nonNull(originalPaths);
        String[] guests = nonNull(guestPaths);
        if (originals.length != expected.length || guests.length != originals.length)
            return "split path count differs; original " + originals.length + ", container " + guests.length;
        try {
            if (!sameApk(originalBase, guestBase)) return "container base APK differs from installed original";
            // Compare sets of content hashes: path/name ordering can differ between package APIs.
            Set<String> sourceHashes = new HashSet<String>();
            Set<String> guestHashes = new HashSet<String>();
            for (String path : originals) sourceHashes.add(apkHash(path));
            for (String path : guests) guestHashes.add(apkHash(path));
            if (sourceHashes.size() != originals.length || guestHashes.size() != guests.length)
                return "duplicate split APK contents";
            if (!sourceHashes.equals(guestHashes)) return "container split APK bytes differ from installed originals";
            return null;
        } catch (Exception unavailable) {
            return "APK validation failed: " + unavailable.getClass().getSimpleName() + ": " + unavailable.getMessage();
        }
    }

    private static String[] nonNull(String[] values) { return values == null ? new String[0] : values; }
    private static boolean namesEqual(String[] first, String[] second) {
        Set<String> a = new HashSet<String>(Arrays.asList(first));
        Set<String> b = new HashSet<String>(Arrays.asList(second));
        return !a.contains(null) && !b.contains(null) && a.size() == first.length
            && b.size() == second.length && a.equals(b);
    }
    private static boolean sameApk(String first, String second) throws Exception {
        return apkHash(first).equals(apkHash(second));
    }
    private static String apkHash(String path) throws Exception {
        if (path == null) throw new IOException("missing APK path");
        File file = new File(path);
        if (!file.isFile() || !file.canRead()) throw new IOException("unreadable APK: " + path);
        try (ZipFile zip = new ZipFile(file)) {
            if (zip.getEntry("AndroidManifest.xml") == null) throw new IOException("APK manifest missing: " + path);
        }
        MessageDigest digest = MessageDigest.getInstance("SHA-256");
        byte[] buffer = new byte[65536];
        try (FileInputStream input = new FileInputStream(file)) {
            int count;
            while ((count = input.read(buffer)) != -1) digest.update(buffer, 0, count);
        }
        StringBuilder value = new StringBuilder();
        for (byte b : digest.digest()) value.append(String.format(java.util.Locale.ROOT, "%02x", b & 255));
        return value.toString();
    }
}
