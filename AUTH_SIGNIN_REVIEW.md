# Google sign-in and Arena leaderboard review — 11 October 2026

This is a static review of the owner's extracted modded APK files, not a reproduced phone login or server test. No APK source, mod runtime, signing setup or live service was changed.

## Supplied evidence

The owner supplied Android binary XML and four valid DEX files: classes.dex (DEX 037), classes2.dex, classes3.dex and classes4.dex. The manifest decodes to package com.funtomic.dynamons, versionName 1.13.37 and versionCode 11337. The current split-index-1 index.html was supplied as chat text. The previously supplied game JavaScript (SHA-256 b6f5470f21360435bc98c868bad208d79ab03493d045598a8f3924b099f818eb) and the latest prepared runtime were reviewed alongside it. This does not prove the phone's current JavaScript/payload bytes equal those reviewed copies.

The APK's complete archive, signing block/certificate, resources.arsc, current Cordova plugin registration files, device login logs and original same-version APK were not supplied. classes5/classes6 dialog code was excluded at the owner's request. No APK signing fingerprint can be recovered from these four DEX files or the manifest.

## Verified sign-in path

The in-game SIGN IN action calls GoogleGamesProxy.auth(false), then window.plugins.playGamesServices.auth({silent:false}). The native class com.berriart.cordova.plugins.PlayGamesServices initializes GoogleSignInOptions.DEFAULT_SIGN_IN with Games.SCOPE_GAMES and Games.SCOPE_GAMES_SNAPSHOTS. The interactive branch gets GoogleSignInClient.getSignInIntent(), registers the Cordova activity-result callback, and opens request 9001. The silent branch uses silentSignIn(). These findings identify Google Play Games sign-in and cloud saves, rather than a direct Firebase Google credential exchange at that button.

PlayGamesServices.onActivityResult invokes GoogleSignIn.getSignedInAccountFromIntent(intent) and tests Task.isSuccessful(). On success it calls the helper's success path. On failure it obtains the exception and accesses ApiException Status message/code, but those underlying values are not forwarded as the detailed Cordova failure; helper h40.c(0) reduces the outcome to SIGN IN FAILED BY ERROR. Cancellation and missing callback contexts have separate generic handling. A visible account chooser or Google overlay therefore is not evidence that this task completed successfully. The DEX contains both success/error strings because it includes both branches; their presence is not a recorded device error.

The subsequent showPlayer action calls Games.getPlayersClient(...).getCurrentPlayer(). JavaScript sets signedIn=true after the auth callback, but the player query is separate: its failure clears lastPlayerInfo, so the account panel can show ACCOUNT NOT FOUND even after the auth callback succeeded. The settings sign-in handler proceeds toward cloud-load handling after a failed player query rather than displaying that player's underlying API failure as a specific login diagnosis. Thus initial sign-in success, player-profile retrieval and cloud-save retrieval must be checked separately.

The supplied patched MainActivity contains DGDialog(Activity) and ModEntry.attachWithLoader(Activity,WebView). It does not define its own onActivityResult override. The supplied CordovaActivity superclass has onActivityResult and delegates to the Cordova callback router after invoking its Android superclass. The native PlayGamesServices callback method is present. There is no evidence here that the host simply deleted activity-result forwarding; this does not prove the callback is delivered correctly in the running app.

## Signing certificate: strong possibility, not confirmed

The owner uses MT Manager to rebuild/sign the modified APK. A different APK signer from the official registered certificate commonly prevents Google Play Games authorization. Android app identity involves package name and signing certificate, while Play Games also needs the correct linked game configuration. The manifest retains the expected package and Games APP_ID metadata, but APP_ID is a compiled resource reference @0x7f110020 whose value cannot be resolved without resources.arsc. Neither the actual signer nor the publisher's OAuth/Play Games registration is available in the extracted material. A certificate/configuration rejection is therefore a leading hypothesis, not a proven device result.

Several permission names in the supplied manifest have an unusual package prefix, for example com.funtomic.dynamons_com.google.android.providers.gsf.permission.READ_GSERVICES and com.funtomic.dynamons_com.google.android.gms.permission.AD_ID. This is a concrete manifest anomaly that should be compared with the original, but these names do not establish the sign-in failure and must not be described as its confirmed cause. INTERNET and the expected MainActivity/Google sign-in components are present.

Changing index.html, setting signedIn=true, showing an account name or forcing a success callback does not create an authorized Google Play Games session. Changing an embedded app/client ID cannot independently authorize an unregistered APK certificate. Correct registration requires the legitimate publisher's Google configuration or an APK signed with their registered key; the owner's private payload signing key and MT Manager's APK signer are separate concepts.

## Leaderboard is a separate path

The reviewed game engine initializes Firebase auth separately using onAuthStateChanged and signInAnonymously; window.userUid receives that Firebase UID. Its MultiplayerRankingEvent instance instead takes GameState.getD3ID(), a generated/persisted 16-character game ID, as its player record ID. The Arena ranking code updates ranking/event/.../scores/players/... through Firebase database operations and emits arena_event_set_score_success/failed. Google Play Games identity is used for account profile/cloud saves; the reviewed Arena ranking write is not gated directly by GoogleGamesProxy.signedIn.

This corrects the earlier tentative implication that a failed Google sign-in necessarily explains absent Arena leaderboard credit. Anonymous Firebase auth, game ID, season/ranking writes, database rule/server acceptance, and client score presentation need their own evidence. The live game backend's access rules and actual failed write responses were not available; no leaderboard restriction or anti-cheat verdict is inferred from the files alone.

## Reviewed mod and index boundaries

The current prepared Royal Void runtime contains no GoogleGamesProxy, playGamesServices, signedIn, signIn, firebase.auth or userUid references, and the template's replacement edits do not contain sign-in/Firebase-auth modifications. This provides no direct evidence that the prepared speed/menu changes intentionally override Google sign-in. It does not clear all possible lifecycle interactions or prove which payload is active on the phone. The supplied index loads Cordova and Firebase libraries and boots the original/patched engine; it does not itself provide the Google Play Games JavaScript plugin implementation or registration. Those are supplied by Cordova assets/config.

## Minimum next evidence

1. A screenshot of the installed mod APK's signing-certificate SHA-1 (and SHA-256 if shown) in MT Manager. The original same-version APK's certificate screenshot is useful for comparison. Do not send private keys.
2. resources.arsc from the mod APK, to resolve APP_ID and application resource configuration; assets/www/cordova_plugins.js and res/xml/config.xml to verify actual plugin registration. These are smaller than the entire APK. The Play Games plugin JavaScript named by cordova_plugins.js may then be needed.
3. If available, a phone log captured during one sign-in, including GoogleSignIn/GoogleSignInCommon/GoogleApiManager/GameHelper/CordovaPlayGamesService and ApiException messages. Tokens, email addresses and account identifiers should be removed before sharing. An observed status 10/DEVELOPER_ERROR would support configuration/certificate failure, but that code was not observed in this review.

No further DEX files are requested for this stage. Static review supports narrowing the failure but cannot confirm the installed certificate, actual Google rejection, or leaderboard write result without this evidence. The authoritative guide and existing complete package are refreshed with these findings; gameplay code, source-only ZIP and live services remain unchanged by this diagnostic task.
