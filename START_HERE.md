# Start here: current Royal Void / Thunder files

Read [MOD_SYSTEM_GUIDE.md](MOD_SYSTEM_GUIDE.md), the authoritative detailed guide. [raw-project/MOD_SYSTEM_GUIDE.md](raw-project/MOD_SYSTEM_GUIDE.md) points to the same guide rather than maintaining a conflicting copy.

## Current repair package

[Royal-Void-Unlock-Party-Fixes.zip](Royal-Void-Unlock-Party-Fixes.zip) preserves the complete source folder and contains 39 files including the current guide, supplied build files and corrected dual-client updater. [FIXES_README.md](FIXES_README.md) explains payload-first publication and the classes7 build/install steps. Do not use the reviewed old website upload form for the dual-client JSON; use the corrected updater's --upload command. No production publication or new DEX build has been performed here.

The updater requires the original game file from the current APK, SHA-256 044e46362e4a286ea279be3762c02d1934afdc682f539cb68dd194e74ec4b9cb. The earlier uploaded engine differs and is deliberately rejected before upload.

[Royal-Void-Supplied-SRC.zip](Royal-Void-Supplied-SRC.zip) contains only all 33 Java source files under src/. Browse them in [raw-project/src](raw-project/src). Verify archives using [SHA256SUMS.txt](SHA256SUMS.txt).

## Standing task completion rules

After every mod task, update the guide, complete changed files, links/archives/checksums and clean superseded downloads, following [AGENTS.md](AGENTS.md) and [DELIVERY_RULES.md](DELIVERY_RULES.md). Main remains unchanged unless the owner authorizes it. This is the assistant's post-task workflow, not a background sync daemon.

Older versioned ZIPs and the workflow that rebuilt an old ZIP have been removed. Historical raw-project integration/server/tool files are reference only unless explicitly synchronized against the active system. Do not deploy them as though they were the live Worker. The canonical new repair updater is raw-project/tools/update_payload_once.py.
