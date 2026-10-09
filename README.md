# Royal Void 0.3

[Download compiled DEX and runtime assets](./Royal-Void-0.3.0-DEX-And-Assets.zip)

[Download Java and runtime assets only](./Royal-Void-0.3.0-Java-And-Assets.zip)

[Simple guide and rollout status](./START_HERE.md)

GitHub Actions successfully compiled against Android SDK 35 and ran R8 obfuscation. The compiled injection ZIP contains only DEX and runtime assets. The source ZIP contains only Java and runtime assets. Documentation/build tools stay outside both.

The new client requires the updated signed server payload. Keep the working APK until the owner rollout is complete. Cloudflare rejected deployment for missing resource access; the existing private signing key and matching game engine are required. No live Cloudflare/Supabase changes were applied.

The new client makes one payload download and one gated check per launch. No recurring heartbeat, presence writes or configuration polling during gameplay. Phone testing is still required.
