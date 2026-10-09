import base64, importlib.util
from pathlib import Path
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.hazmat.primitives.asymmetric.utils import encode_dss_signature
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.exceptions import InvalidSignature, InvalidTag

spec=importlib.util.spec_from_file_location('seal',Path(__file__).resolve().parents[1]/'tools/seal_payload.py')
module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
private=ec.generate_private_key(ec.SECP256R1())
payload=b'owner-only protected runtime'
bundle=module.seal(payload,private,'test-build',12345)
def raw(value):return base64.b64decode(value)
def message(b):return ('DG-PAYLOAD-V2\n%s\n%s\n%s\n%s\n%s'%(b['build'],b['ct_sha'],b['iv_b64'],b['issued'],b['min_client'])).encode()
def verify(data, signature):
    s=raw(signature);der=encode_dss_signature(int.from_bytes(s[:32],'big'),int.from_bytes(s[32:],'big'))
    private.public_key().verify(der,data,ec.ECDSA(hashes.SHA256()))
verify(raw(bundle['ct_b64']),bundle['sig_b64']);verify(message(bundle),bundle['meta_sig_b64'])
assert AESGCM(raw(bundle['key_b64'])).decrypt(raw(bundle['iv_b64']),raw(bundle['ct_b64']),None)==payload
for field,value in [('build','other-build'),('ct_sha','0'*64),('iv_b64',module.b64(b'0'*12)),('issued',12346),('min_client',4)]:
    changed=dict(bundle);changed[field]=value
    try:verify(message(changed),bundle['meta_sig_b64']);raise AssertionError('Metadata tamper accepted: '+field)
    except InvalidSignature:pass
damaged=bytearray(raw(bundle['ct_b64']));damaged[-1]^=1
try:AESGCM(raw(bundle['key_b64'])).decrypt(raw(bundle['iv_b64']),bytes(damaged),None);raise AssertionError('Bad GCM tag accepted')
except InvalidTag:pass
print('PASS sealed payload: signatures, decryption, five metadata tamper rejections, GCM tag rejection')
