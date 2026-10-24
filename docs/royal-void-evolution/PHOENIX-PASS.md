# Phoenix Pass consumption reliability — 24 October 2026

The mod download modal previously used untyped RPC calls without deadlines or account guards. Repeated clicks could overlap redemption calls, and dismissing a pending modal could discard the download response after the server spent the pass. Lookup failures had no explicit retry. Returned links were decrypted without validating their protocol, and clipboard failure was silent.

## Client behavior

The mod page now identifies an open pass modal by account and mod slug. Account/slug changes dismiss it; render-time identity guards and request disposal prevent old lookup results from navigating to Rewards or old redemption results from revealing a download. The existing RPC signatures and server rules are unchanged. Both lookup and redemption use generated types, ten-second abort deadlines and SDK `retry(false)`.

Only an empty lookup array means no available pass. Malformed rows produce an error with **Retry pass lookup**. Valid rows need a nonempty ID and parseable future expiry. Expiry is checked again at confirmation. Lookup retries are read-only and cannot spend a pass.

**Unlock now** has a synchronous submission guard. During redemption the modal ignores Escape, backdrop and close-button dismissal, and tells the user to keep it open until confirmation. The deadline restores dismissal on failure. A success requires an affirmative response, a nonempty link and an explicit encryption flag. Encrypted links still use the existing Cipher helper; the resulting destination must be an absolute HTTP(S) URL without embedded credentials. Unreadable/malformed/unsafe results cannot become download anchors. No download is opened automatically. Clipboard denial exposes an actionable browser-link fallback; late copy feedback is account-guarded. Pass actions and the shared modal close button have at least 44-pixel touch targets.

## Uncertain spending and limits

The repository's `redeem_phoenix_pass` definition marks the chosen pass used and increments downloads before returning its encrypted link. A network timeout, invalid response or failed client decryption can therefore leave a spent pass without a usable link. Browser abort is not server rollback. The UI reports this uncertainty and directs users to Rewards/support instead of offering an automatic spending retry.

An uncertainty flag survives closing/reopening this modal for the same account and mod while the mod-page instance remains mounted. Reopening a flagged modal does not look up/select another pass or send another redemption. A recognized negative server acknowledgment clears the uncertainty flag; a valid usable success also clears it. The current mounted modal still allows only one submission. The flag is held in page memory, not durable storage: navigation, reload, other tabs/devices and other mod pages are outside this safeguard. Server-side receipts/idempotent download recovery remain necessary for durable recovery. This increment does not add refund, receipt or new authorization behavior.

## Validation

All 60 distinct local browser cases are validated across Chrome phone/tablet/desktop and WebKit: fourteen synthetic pass cases and one signed-out public flow per project. The full matrix finished with 52 passing cases and eight strict-selector failures in 6.7 minutes: both recovery tests selected two legitimate Close buttons. Those tests now explicitly select the close icon; all eight corrected cases pass in a focused 1.5-minute repeat. No product change was required for that selector repair, and the other passing cases were not rerun unnecessarily. Both runs remain in `pass-local-final` and `pass-recovery-repeat` under the external audit directory. Coverage includes duplicate calls/pending dismissal, lookup retry/deadline/empty/malformed data, lost/stalled redemption, uncertainty across reopening, late lookup/redemption account responses, encrypted/unsafe links, confirmation-time expiry and clipboard denial.

The 320/1440-pixel layout checks confirm document fit and at least 44-pixel confirmation controls; the narrow fixture screenshot was visually reviewed. TypeScript, production build and all 31 Node tests pass. Lint has zero errors and the same 12 existing Fast Refresh warnings. Generated sitemap output was restored. Public rollout verification follows.

Synthetic sessions, pass IDs, ciphertext, clipboard behavior and RPC responses are confined to localhost fixtures with all Supabase traffic intercepted. Public checks use fresh signed-out contexts. No real pass is spent, and no real download link/key is decrypted, opened, copied or exported for QA. No server function, policy, grant, campaign rule, native source or stored record is changed.

The initial local run passed the early confirmation/retry cases, then was intentionally interrupted to tighten malformed-row validation and expand encryption/expiry coverage. Logs are retained externally. Development component-tagger hydration warnings, Firefox's existing Windows executable launch limitation and unavailable authenticated live browser tooling remain documented limitations. Fixture evidence is not live mutation certification.

Full Phase 19 remains open: Tesla campaign auto-claims, Trainer Rank account state, durable claim/redemption receipts, concurrency/expiry refresh and fresh authorized OAuth/device/mutation checks remain.

## Application and public rollout verified

Application commit `3b0de03b0cde6938754521f80bceaa96774960e2`, tree `0b32bd538220bfb04946efc9b2d3dd16e2294a40`, is on main. Automatic Cloudflare build `904318d0-7ed5-46fe-86fd-9995d933bf0e` succeeded. Deployment `860e8b00-6d25-44f0-8428-0968049d6920`, version `93803231-2610-4691-9363-62d7e05321d9`, serves 100%.

Four fresh live signed-out checks pass in 31.3 seconds across Chrome phone/tablet/desktop and WebKit. Each visits `/mods` and `/mods/fire-phoenix`, confirms visible headings/document fit, and selects **Log in to unlock** to reach `/auth`. There are no runtime exceptions or `my_active_phoenix_pass`/`redeem_phoenix_pass` requests. Logs and screenshots use `pass-live-public` in the external audit directory. No authenticated production pass redemption is claimed. The client reliability increment is delivered; durable receipt recovery and the remaining Phase 19 scope above stay open.
