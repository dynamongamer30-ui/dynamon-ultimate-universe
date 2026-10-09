# Keep only the public smali attachment entrypoints stable; obfuscate implementation classes.
-keep class com.dynamongamer.royalvoid.ModEntry {
    public static void attach(android.app.Activity);
    public static void attach(android.app.Activity, android.webkit.WebView);
    public static void attachWithLoader(android.app.Activity, android.webkit.WebView);
    public static void detach(android.app.Activity);
}
# Android restores this fragment by its class name across configuration changes.
-keep class com.dynamongamer.royalvoid.PortableProfile { *; }
-keepclassmembers class * extends android.app.Fragment { public void onActivityResult(int,int,android.content.Intent); }
# No -dontwarn / -ignorewarnings: a missing Android API should fail the build.
