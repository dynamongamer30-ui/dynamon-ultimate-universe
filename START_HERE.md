# Royal Void 0.3 — client and owner build

The client ZIP contains Java source and runtime assets only. No Markdown, JSON, Python, tests, server files or private keys are inside it. Documentation stays on GitHub.

## Release status

The updated Java and server code passed local syntax, control behavior, encryption/tamper and free-tier tests. No Android SDK/R8 toolchain is available in this workspace, so there is no compiled DEX from this session. Android type checking, R8 build and phone testing are still required.

The Cloudflare connection can read `dg` but rejected updating it with `No access to the specified resource`. Production code and Supabase were not changed. Keep the current working APK until the owner completes the server/payload rollout.

The original private signing key and the game engine matching your current APK are not available here. Do not use the earlier prepared game engine as a replacement for the current version. The new client deliberately refuses the older payload format.

## Owner-side server rollout

1. Back up the current `dg` Worker and encrypted payload. Keep the existing KV/R2 bindings and secret bindings.
2. Deploy the prepared loader-only server update with a Cloudflare connection authorized to update `dg`. Its `/check` returns launch-time locks and enforces license expiry, binding, maintenance, status and bans. `/heartbeat` is a compatibility no-op, with zero database or KV operations. `/tamper` cannot ban a caller-provided device ID.
3. Run `prepare_payload.py` against the original JavaScript engine matching the APK. It validates all patch matches and rejects overlaps. Feature catalogue, cosmetic records, branding and adapter live in this server payload.
4. Run `seal_payload.py` with the EXISTING private signing key, expected public key, build ID and prepared payload. The tool refuses a mismatched signing key. Upload its output using the existing admin upload flow. This owner upload bundle contains the AES key; keep it private and outside GitHub/APK.
5. Test access/expiry/maintenance, payload signature and game boot before distributing the new DEX.

The server source/payload preparation files remain owner-side and are not in the client ZIP.

## Build DEX

Use AIDE to compile all `src/com/dynamongamer/royalvoid/*.java` against SDK 28 or newer. Java syntax remains compatible with Java 7. For a release with obfuscation, use the repository build scripts or GitHub Actions. A direct AIDE debug build does not guarantee obfuscation.

GitHub Actions: open **Actions → Build Royal Void DEX**. A successful build uploads `Royal-Void-DEX-And-Assets`, containing `royal-void-dex-package.zip`. That inner ZIP contains only DEX and required images/fonts/sounds. The obfuscation map remains a private build intermediate and is excluded.

Local/Termux build with JDK and Android tools:

```sh
export ANDROID_JAR=/path/to/android.jar
export R8_JAR=/path/to/build-tools/35.0.0/lib/d8.jar
export DG_SOURCE_LEVEL=8
bash tools/build_dex_release.sh
```

No source ZIP is a ready DEX. Never rename a `.java`, `.jar` or ZIP to `.dex`.

## Inject after the server rollout

1. Back up the working game APK.
2. Replace only the previous Royal Void DEX. Preserve every original game DEX and avoid duplicate Royal Void classes. Rename generated DEX files to unused sequential `classesN.dex` names as needed.
3. Copy `assets/royal_void/` into the APK's top-level `assets/`. Keep existing `assets/www/` game libraries, images, data and Cordova files. Store WAV files uncompressed.
4. Inside the EXISTING `deviceready` callback in `assets/www/index.html`, replace the loader startup block with:

```js
window.__DG_NATIVE_BOOT_READY = true;
```

Keep `getSize()` and all required libraries. Remove only the unused `loader.js` reference/file. Do not start `dynamons_world.min.js` or call `lime.embed()` from HTML; the Java loader boots the signed download. Keep the local game file until its other references have been checked.

5. Use exactly ONE Royal Void hook immediately after the game's WebView assignment:

```smali
iput-object p1, p0, Lcom/funtomic/dynamons3/MainActivity;->z:Landroid/webkit/WebView;
invoke-static {p0, p1}, Lcom/dynamongamer/royalvoid/ModEntry;->attachWithLoader(Landroid/app/Activity;Landroid/webkit/WebView;)V
```

6. Preserve the game manifest, existing login DEX and verification intent filter. Rebuild, sign and test on your phone.

## Free-tier behavior and protection limits

The new loader uses one `/payload` and one `/check` request per launch. It sends no gameplay heartbeat or recurring configuration fetch. The menu refreshes local WebView state only. Skin pack downloads, explicit retries, the existing login process and website traffic are separate.

At 200 users and one launch each, that is approximately 400 loader Worker requests/day, rather than 9,600 ten-minute heartbeats plus 192,000 thirty-second config polls over eight hours. Actual usage depends on launches/retries and the old clients still in circulation. The old installed payload continues its existing polling until those users upgrade.

Revocations and lock changes take effect on the next launch. The payload uses AES-256-GCM and ECDSA-P256; the additional signed envelope covers build, ciphertext hash, IV, timestamp and required client version. The DEX has the public verification key, never the private key. Source code, displayed values and decrypted runtime code cannot be made unextractable on a user's phone. A device UUID still is not a cryptographic identity; the existing login protocol must be upgraded separately for proof of possession.

The repository is public. Prior source ZIPs remain in history. Do not publish private signing keys, AES upload bundles, Supabase service keys or new owner-only payloads.
