# Third-party SDK provenance

This project includes the unchanged binary SpaceCore-SDK.aar from:
https://github.com/FSpaceCore/SpaceCore/releases/download/v3/SpaceCore-SDK.aar

Published release:
https://github.com/FSpaceCore/SpaceCore/releases/tag/v3

SDK documentation/use statement:
https://github.com/FSpaceCore/SpaceCore/blob/main/README.md

The inspected upstream README states:
> The SpaceCore SDK is a free product that is NOT open-source, and you are free to use it without notifying the author. It can also be used for commercial purposes.

It also states that customization requires contacting the author. No contact was sent and no SDK binary modifications were made. The SDK remains its author's software; this project does not claim ownership, source availability, Apache licensing of that SDK, or independently verified Android 16 compatibility. The Apache license mentioned for NewBlackbox concerns that separate inspected source candidate, not SpaceCore.

Artifact size: 6,362,069 bytes.
SHA-256: 00f3f0ef341235b3a301df42af1e82ccb0e14fc0bde257d4ac1f0fe5c8f57f46

The other dependencies are declared in app/build.gradle and obtained from their public Maven repositories. Their upstream notices/license resources are retained as packaged by the normal Gradle build. SDK resources/native code are included without altering its classes or native binaries; the host manifest narrows requested Android permissions.
