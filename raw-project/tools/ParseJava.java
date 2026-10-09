import javax.tools.*;
import com.sun.source.util.JavacTask;
import com.sun.source.tree.*;
import com.sun.source.util.TreeScanner;
import java.nio.file.*;
import java.util.*;
public class ParseJava {
 public static void main(String[] args) throws Exception {
  List<java.io.File> files=new ArrayList<>();try(var walk=Files.walk(Path.of(args[0]))){walk.filter(p->p.toString().endsWith(".java")).forEach(p->files.add(p.toFile()));}
  JavaCompiler compiler=ToolProvider.getSystemJavaCompiler();DiagnosticCollector<JavaFileObject> dc=new DiagnosticCollector<>();
  var fm=compiler.getStandardFileManager(dc,null,null);JavacTask task=(JavacTask)compiler.getTask(null,fm,dc,List.of("-proc:none"),null,fm.getJavaFileObjectsFromFiles(files));
  final int[] modern={0};for(CompilationUnitTree t:task.parse())new TreeScanner<Void,Void>() {
   public Void visitLambdaExpression(LambdaExpressionTree n,Void v){modern[0]++;return super.visitLambdaExpression(n,v);}
   public Void visitMemberReference(MemberReferenceTree n,Void v){modern[0]++;return super.visitMemberReference(n,v);}
  }.scan(t,null);
  int errors=0;for(var d:dc.getDiagnostics())if(d.getKind()==Diagnostic.Kind.ERROR){System.out.println(d);errors++;}
  System.out.println(files.size()+" Java files parsed; syntax errors="+errors+"; Java 8+ lambda/method-reference nodes="+modern[0]);
  if(errors+modern[0]>0)System.exit(1);
 }
}
