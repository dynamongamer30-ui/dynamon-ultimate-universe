package com.dynamongamer.containerprobe;
import java.nio.file.*;
import java.util.zip.*;
public class SplitImportCheckTest {
 static String apk(Path root,String name,String payload)throws Exception {
  Path path=root.resolve(name);
  try(ZipOutputStream z=new ZipOutputStream(Files.newOutputStream(path))){
   z.putNextEntry(new ZipEntry("AndroidManifest.xml"));z.write(payload.getBytes("UTF-8"));z.closeEntry();
  }
  return path.toString();
 }
 static void expect(boolean condition,String test){if(!condition)throw new AssertionError(test);}
 public static void main(String[] args)throws Exception {
  Path root=Files.createTempDirectory("split-check-");
  String base=apk(root,"base.apk","base"), a=apk(root,"a.apk","a"), b=apk(root,"b.apk","b");
  String[] names={"a","b"}, paths={a,b};
  expect(SplitImportCheck.check(names,new String[0],names,base,base,paths,paths)==null,"application metadata fallback");
  expect(SplitImportCheck.check(names,names,null,base,base,paths,new String[]{b,a})==null,"path ordering");
  expect(SplitImportCheck.check(names,null,null,base,base,paths,paths)!=null,"missing names");
  expect(SplitImportCheck.check(names,new String[]{"wrong"},names,base,base,paths,paths)!=null,"explicit package mismatch");
  expect(SplitImportCheck.check(names,names,names,base,base,paths,new String[0])!=null,"missing split paths");
  expect(SplitImportCheck.check(names,names,names,base,a,paths,paths)!=null,"different base");
  expect(SplitImportCheck.check(names,names,names,base,base,paths,new String[]{a,a})!=null,"duplicate split");
  String c=apk(root,"c.apk","changed");
  expect(SplitImportCheck.check(names,names,names,base,base,paths,new String[]{a,c})!=null,"changed split");
  expect(SplitImportCheck.check(names,names,names,base,base,paths,new String[]{a,root.resolve("missing").toString()})!=null,"unreadable split");
  Files.write(root.resolve("invalid.apk"),new byte[]{1,2,3});
  expect(SplitImportCheck.check(names,names,names,base,base,paths,new String[]{a,root.resolve("invalid.apk").toString()})!=null,"invalid zip");
  expect(SplitImportCheck.check(null,null,null,base,base,null,null)==null,"standalone apk");
  try(java.util.stream.Stream<Path> f=Files.walk(root)){f.sorted(java.util.Comparator.reverseOrder()).forEach(p->{try{Files.delete(p);}catch(Exception e){throw new RuntimeException(e);}});}
  System.out.println("11 split-import validation checks passed");
 }
}
