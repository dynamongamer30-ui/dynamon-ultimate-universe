import com.dynamongamer.royalvoid.PayloadCrypto;
import java.security.*;
import java.security.spec.ECGenParameterSpec;
import java.math.BigInteger;
import java.util.Arrays;
import javax.crypto.*;
import javax.crypto.spec.*;
public class PayloadCryptoTest {
 public static void main(String[] args)throws Exception{
  KeyPairGenerator gen=KeyPairGenerator.getInstance("EC");gen.initialize(new ECGenParameterSpec("secp256r1"));KeyPair pair=gen.generateKeyPair();
  byte[] data="Signed game payload".getBytes("UTF-8"),key=new byte[32],iv=new byte[12];new SecureRandom().nextBytes(key);new SecureRandom().nextBytes(iv);
  Cipher c=Cipher.getInstance("AES/GCM/NoPadding");c.init(Cipher.ENCRYPT_MODE,new SecretKeySpec(key,"AES"),new GCMParameterSpec(128,iv));byte[] encrypted=c.doFinal(data);
  for(int i=0;i<64;i++){
   Signature s=Signature.getInstance("SHA256withECDSA");s.initSign(pair.getPrivate());s.update(encrypted);byte[] der=s.sign(),raw=new byte[64];int n=2;
   if(der[n++]!=2)throw new AssertionError();int len=der[n++]&255;byte[] r=Arrays.copyOfRange(der,n,n+len);n+=len;
   if(der[n++]!=2)throw new AssertionError();len=der[n++]&255;byte[] t=Arrays.copyOfRange(der,n,n+len);
   for(int j=0;j<32;j++){int at=r.length-32+j;raw[j]=at<0?0:r[at];at=t.length-32+j;raw[32+j]=at<0?0:t[at];}
   if(!PayloadCrypto.verify(pair.getPublic().getEncoded(),encrypted,raw))throw new AssertionError("Raw ECDSA conversion failed");
   encrypted[0]^=1;if(PayloadCrypto.verify(pair.getPublic().getEncoded(),encrypted,raw))throw new AssertionError("Tampered ciphertext accepted");encrypted[0]^=1;
  }
  if(!Arrays.equals(data,PayloadCrypto.decrypt(key,iv,encrypted)))throw new AssertionError("Decrypt mismatch");
  encrypted[encrypted.length-1]^=1;try{PayloadCrypto.decrypt(key,iv,encrypted);throw new AssertionError("Bad GCM tag accepted");}catch(GeneralSecurityException expected){}
  if(!PayloadCrypto.hash("abc".getBytes("UTF-8")).equals("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"))throw new AssertionError("Hash mismatch");
  System.out.println("PASS payload crypto: 64 raw ECDSA signatures, tamper rejection, AES-GCM round trip/tag rejection, SHA-256");
 }
}
