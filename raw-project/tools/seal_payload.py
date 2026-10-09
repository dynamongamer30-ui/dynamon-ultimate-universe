#!/usr/bin/env python3
"""Owner-side payload sealing. Never bundle this tool or its output key in an APK."""
import argparse, base64, hashlib, json, os, re, time
from pathlib import Path
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.hazmat.primitives.asymmetric.utils import decode_dss_signature
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

def b64(value): return base64.b64encode(value).decode('ascii')
def signature(private, value):
    r, s = decode_dss_signature(private.sign(value, ec.ECDSA(hashes.SHA256())))
    return b64(r.to_bytes(32, 'big') + s.to_bytes(32, 'big'))

def seal(payload, private, build, issued=None):
    if not re.fullmatch(r'[A-Za-z0-9._-]{1,128}', build): raise ValueError('Invalid build ID')
    if not isinstance(private, ec.EllipticCurvePrivateKey) or not isinstance(private.curve, ec.SECP256R1): raise ValueError('Signing key must be ECDSA P-256')
    key, iv = os.urandom(32), os.urandom(12)
    ciphertext = AESGCM(key).encrypt(iv, payload, None)
    digest = hashlib.sha256(ciphertext).hexdigest()
    issued = int(time.time()) if issued is None else issued
    message = ('DG-PAYLOAD-V2\n%s\n%s\n%s\n%s\n3' % (build, digest, b64(iv), issued)).encode('utf-8')
    return dict(build=build, ct_b64=b64(ciphertext), iv_b64=b64(iv), ct_sha=digest,
                sig_b64=signature(private, ciphertext), meta_sig_b64=signature(private, message),
                issued=issued, min_client=3, protocol=2, key_b64=b64(key))

if __name__ == '__main__':
    p=argparse.ArgumentParser(); p.add_argument('--payload',type=Path,required=True); p.add_argument('--private-key',type=Path,required=True)
    p.add_argument('--build',required=True); p.add_argument('--out',type=Path,required=True); p.add_argument('--expected-public-key',required=True)
    a=p.parse_args()
    private=serialization.load_pem_private_key(a.private_key.read_bytes(),password=None)
    public=private.public_key().public_bytes(serialization.Encoding.DER,serialization.PublicFormat.SubjectPublicKeyInfo)
    if b64(public)!=a.expected_public_key: raise SystemExit('Signing key does not match the public key pinned in DEX; no output written')
    source=a.payload.read_bytes()
    if b'window.__DG_MENU_CONFIG=' not in source or b'window.__DG_INSTALL_NATIVE=' not in source: raise SystemExit('Prepare the matching Royal Void 0.3 payload first')
    result=seal(source,private,a.build)
    a.out.parent.mkdir(parents=True,exist_ok=True)
    with os.fdopen(os.open(a.out,os.O_WRONLY|os.O_CREAT|os.O_TRUNC,0o600),'w') as f: json.dump(result,f)
    os.chmod(a.out,0o600)
    print('Sealed owner upload bundle. Contains AES key: keep private; never add to GitHub or APK.')
