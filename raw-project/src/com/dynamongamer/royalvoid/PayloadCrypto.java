package com.dynamongamer.royalvoid;

import java.math.BigInteger;
import java.security.*;
import java.security.spec.X509EncodedKeySpec;
import javax.crypto.Cipher;
import javax.crypto.spec.*;

/** Implements the supplied Python builder's ECDSA-P256 and AES-256-GCM formats. */
public final class PayloadCrypto {
    private PayloadCrypto() {}
    public static boolean verify(byte[] publicKey, byte[] ciphertext, byte[] rawSignature) throws Exception {
        if (rawSignature.length != 64) return false;
        byte[] r = new BigInteger(1, slice(rawSignature,0,32)).toByteArray();
        byte[] s = new BigInteger(1, slice(rawSignature,32,32)).toByteArray();
        byte[] der = new byte[6+r.length+s.length]; int n=0;
        der[n++]=0x30; der[n++]=(byte)(4+r.length+s.length); der[n++]=2; der[n++]=(byte)r.length;
        System.arraycopy(r,0,der,n,r.length); n+=r.length; der[n++]=2; der[n++]=(byte)s.length;
        System.arraycopy(s,0,der,n,s.length);
        PublicKey key=KeyFactory.getInstance("EC").generatePublic(new X509EncodedKeySpec(publicKey));
        Signature verifier=Signature.getInstance("SHA256withECDSA"); verifier.initVerify(key); verifier.update(ciphertext);
        return verifier.verify(der);
    }
    private static byte[] slice(byte[] source,int start,int size) {
        byte[] result=new byte[size]; System.arraycopy(source,start,result,0,size); return result;
    }
    public static String hash(byte[] bytes) throws Exception {
        byte[] digest=MessageDigest.getInstance("SHA-256").digest(bytes); StringBuilder out=new StringBuilder();
        for(byte b:digest) out.append(String.format(java.util.Locale.US,"%02x",b&255)); return out.toString();
    }
    public static byte[] decrypt(byte[] key,byte[] iv,byte[] ciphertext) throws Exception {
        if(key.length!=32 || iv.length!=12 || ciphertext.length<16) throw new GeneralSecurityException("Invalid encrypted payload");
        Cipher cipher=Cipher.getInstance("AES/GCM/NoPadding");
        cipher.init(Cipher.DECRYPT_MODE,new SecretKeySpec(key,"AES"),new GCMParameterSpec(128,iv));
        return cipher.doFinal(ciphertext);
    }
}
