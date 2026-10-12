package com.dynamongamer.containerprobe;
public class CrashFrameFilterTest {
 static void expect(boolean value,String message){if(!value)throw new AssertionError(message);}
 public static void main(String[] args){
  String secret="private-account@example.com secret-token-value";
  String a=CrashFrameFilter.filter("java.lang.SecurityException: permission android.permission.WAKE_LOCK " + secret);
  expect(a.contains("java.lang.SecurityException") && a.contains("android.permission.WAKE_LOCK"),"security crash identifiers");
  expect(!a.contains(secret) && !a.contains("example.com"),"exception payload omitted");
  expect(CrashFrameFilter.filter("Fatal signal 11 (SIGSEGV), code 1").contains("SIGSEGV"),"native signal");
  expect(CrashFrameFilter.filter("#00 pc 000abc /data/app/pkg/lib/arm64/libpine.so (function+16)").contains("libpine.so"),"native library frame");
  expect(CrashFrameFilter.filter("at com.fvbox.lib.FCore.init(FCore.java:1) " + secret).equals("at com.fvbox.lib.FCore.init"),"java frame filtered");
  expect(CrashFrameFilter.filter("dlopen failed: library \"libmissing.so\" not found "+secret).contains("libmissing.so"),"linker error");
  expect(CrashFrameFilter.filter("Google login token="+secret).isEmpty(),"ordinary log omitted");
  expect(CrashFrameFilter.filter("java.lang.Error: "+secret).equals("Exception: java.lang.Error"),"base Error class");
  System.out.println("8 crash-frame filtering checks passed");
 }
}
