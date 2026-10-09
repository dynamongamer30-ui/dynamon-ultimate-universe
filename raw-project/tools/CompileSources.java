import javax.tools.*;
import java.util.*;
public class CompileSources {
 public static void main(String[] args) {
  JavaCompiler c=ToolProvider.getSystemJavaCompiler();
  if(c==null)throw new IllegalStateException("JDK compiler unavailable");
  List<String> options=new ArrayList<>(List.of("-encoding","UTF-8","-source","8","-target","8","-d",args[0]));
  options.addAll(Arrays.asList(args).subList(1,args.length));
  if(c.run(null,null,null,options.toArray(new String[0]))!=0)System.exit(1);
 }
}
