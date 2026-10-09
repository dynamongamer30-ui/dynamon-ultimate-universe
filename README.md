# Royal Void 0.3 client

[Download Java and runtime assets only](./Royal-Void-0.3.0-Java-And-Assets.zip)

[Read the installation and release status guide](./START_HERE.md).

Source ZIP contains 32 Java files and 7 runtime assets. Documentation, build tools and tests are outside it. No compiled DEX has been produced in this session. The new client requires the updated signed server payload; keep the working APK until the owner rollout is completed. Cloudflare deployment was rejected for missing resource access. Existing signing key and matching game engine are required.

Release build scripts require R8 obfuscation and produce only DEX/assets. GitHub Actions builds the injection ZIP when enabled. No recurring heartbeat or config polling in the new client.
