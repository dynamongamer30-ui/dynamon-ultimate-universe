# What is protected, and what is not

Publishing full source to a PUBLIC GitHub branch makes that source downloadable. The user selected this option on 2026-10-09. No encryption or obfuscation makes public source secret.

The new native loader replaces the public JavaScript loader file with Java networking and crypto. It uses the existing ECDSA P-256 public key, verifies raw r||s signatures over ciphertext, requests the AES-256-GCM key only after access approval, checks the GCM tag, then loads the game in the existing WebView. Private signing keys and server service-role keys are never bundled. Plaintext byte/key arrays are wiped when practical, but runtime strings, rendering data and game hooks necessarily remain inspectable in memory.

Moving the loader into Java is packaging/hardening, not stronger encryption: the supplied original loader already used AES-256-GCM and ECDSA-P256. Gradle release builds enable ProGuard name obfuscation; standalone D8 builds do not. ProGuard cannot stop a determined person patching a client or changing displayed branding. Stronger server protection requires authenticated sessions, expiry/revocation on every privileged operation and optional verified app integrity. A client-supplied device UUID is not cryptographic proof of possession.

Community URLs are supplied through server content: signed encrypted payload metadata is preferred; the compatibility public-config fallback is authenticated by HTTPS only, not a separate payload signature. Metadata, feature names, numeric input and artwork displayed on a phone cannot remain exclusively invisible on the server. A modified client can repaint its own interface. Your server can deny its access after verified identity/integrity checks; it cannot prevent someone renaming their local APK.

## Read-only findings

GitHub main's license Worker was inspected. Supabase public table/RLS metadata and only public Links/FeatureLocks/Maintenance configuration were read. The inspected licensing/config tables have RLS with owner-only authenticated policies. No license keys, user device records or backend secret values were downloaded, and no Supabase schema/data was changed.

The inspected Worker /check accepts a claimed fingerprint plus a fresh activation marker; it does not authenticate that caller with a session token. Heartbeats originally check bans but not license expiry. /tamper and mismatched ciphertext could ban a caller-specified fingerprint. First key binding originally uses read then upsert, permitting concurrent device-binding races.

## Packaged server draft (NOT deployed)

backend/license is based on the inspected GitHub Worker, with these scoped changes:

- /check checks current key status, device binding, expiry, future/stale login times, maintenance and global mod/app locks.
- /heartbeat checks current key status/binding/expiry and maintenance, preserving the existing explicitly public Dark Eclipse policy.
- A claimed fingerprint in unauthenticated /tamper or mismatched-hash requests no longer bans a device. Admin bans remain available. /tamper is acknowledged without database writes until authenticated telemetry/rate limiting is implemented.
- First binding uses a conditional PATCH against the exact prior JSONB value, allowing one winner and returning a retry response when the record changed. The actual table's data column was confirmed JSONB. PostgREST integration still requires a staging test; local tests mock the REST layer.
- Optional Website is allowlisted in the public Links response; the actual app_config Links row was not changed.

These are compatibility improvements, NOT a complete security redesign. The fingerprint-spoofing limitation remains. No authenticated-session protocol, Play Integrity verification, signature certificate allowlist or rate-limiting migration has been deployed. Updating those requires your login DEX/source and a staged coordinated client/server rollout.

Do not deploy this draft blindly. Test current paid/free/public build flows, repeat/concurrent activation, expiry, maintenance, admin operations and rollback in a staging Worker. Reuse existing server-side secrets and bindings; do not copy secrets into Java. The draft does not replace your production code or change Supabase policies here.

## Game payload

The prepared dist game is unsigned and unencrypted; it belongs only in the owner's build pipeline. It was rebuilt from the previously supplied game script, not confirmed for the current 1.13.36 APK. Run the patcher against the matching engine first. Use the existing private signing key; changing it invalidates the public key in both loaders. Do not distribute upload JSON bundles with key_b64.

## Backup files

Portable JSON contains user-selected control values and names so it can be restored after reinstall. It is not a credential store and contains no license, session token or private key. Restore prevalidates remote locks and record IDs but cannot promise transactional rollback across all game setters. Temporary battle edits and ownership unlocks are not replayed; automation is restored stopped.
