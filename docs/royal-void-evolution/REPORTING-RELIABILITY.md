# Report submission and dialog reliability

This increment covers the existing comment-report interface in phase 16. Reports retain their existing authenticated insert path and moderation behavior. No table, trigger, notification recipient, security policy, grant or award rule changes are included. No production report is submitted for testing.

## Corrected behavior

- A synchronous pending lock protects submission before React commits the disabled state. Reason and details are disabled while sending; the dialog exposes its busy state and retains keyboard focus.
- Escape, the close button, Cancel and backdrop dismissal use the same close guard. A pending submission stays open. Closing a settled dialog resets its reason, details and feedback consistently.
- Rejected writes preserve the chosen reason and draft, offer an explicit retry, and never show success. Success appears only after the insert succeeds and moves focus to Done. Closing restores focus to the report trigger. Late completions after unmount do not show feedback or update disposed state.
- The dialog is portaled to document.body so review-card backdrop filters and stacking contexts cannot clip it or put other reviews above its controls. Its reason dropdown is layered above the dialog. Theme tokens remain inherited from the document root.
- The unverified promise that the owner reviews reports within 24 hours is replaced with a description of the review form.

The pending lock prevents duplicate submissions from one immediate interaction burst. There is no new backend idempotency mechanism or automatic retry. The normal manual retry remains available after a failed response; this change does not claim exactly-once delivery across network failures.

## Verification record

The first desktop regression run against the old implementation failed because report details stayed editable while the request was held. That log is retained as reports-baseline.log. The first phone run after the pending-state changes also found a real layering defect: review cards intercepted report controls. That run was interrupted after the phone failures; its log remains reports-browser.log and is not reported as passing. Moving the dialog to the document overlay and raising its own dropdown fixed the hit-testing problem. A focused phone/desktop run then passed all four signed-in/signed-out report checks (reports-portal-focused.log).

The next full community/report run passed 14/16. Both WebKit report checks failed to restore focus to the trigger after close: WebKit pointer clicks did not focus that button, so the shared dialog hook remembered another element. The trigger now explicitly receives focus when it opens the report dialog. The focus assertions are retained for the corrected repeat; reports-final-browser.log retains the failed run.

The signed-in fixture is restricted to localhost and intercepts all Supabase traffic with synthetic identity/content. It holds a denied POST, dispatches two immediate submit clicks, checks one request, verifies disabled fields and blocked pending dismissal, then checks preserved details/reason, retry payload, confirmed success, focus, reset and Escape. The public signed-out check opens an existing review's report preview, tests Tab/Shift+Tab focus, sign-in feedback, viewport bounds and focus restoration while asserting zero Supabase writes. It can also run read-only on production. Normal pointer clicks are retained; no force-click bypass is used to hide the layering problem.

Full source/browser validation and production deployment follow this checkpoint. Existing development-only component-tagger hydration warnings remain recorded. Firefox executable launch and real Android/APK device gates remain unresolved. Moderator handling and downstream moderation notifications are outside this user-submission increment.

Final source gates pass: TypeScript, production build, 30 Node tests and lint (zero errors, 12 existing Fast Refresh warnings). All eight final report checks pass across Chrome phone/tablet/desktop and WebKit iPhone (reports-focus-final.log). All eight community mutation/pagination checks passed in the earlier 14/16 run; its two report focus failures remain recorded rather than relabeled as a 16/16 pass. The final change after that run only focuses the report trigger when opening. Phone failed-submit and signed-out preview screenshots were reviewed: actions, details and feedback fit the viewport. Website publication and live preview checks follow.

## Production rollout

Code commit `f27f82a137f57691a6f63065ce5093ac24031930`, tree `9d21a8241ea58102c8e6fff5da867094a406534b`. Automatic Cloudflare build `295593f9-9818-4788-bb42-e5c6a566eeea` succeeded. Deployment `e5102aa2-0c2f-4928-bf71-84ecb2ba951d`, version `fb548db3-5817-4a69-9a8c-7c5a23941b68`, serves 100%.

All eight live report-preview/navigation checks pass across Chrome phone/tablet/desktop and WebKit iPhone in 53.3 seconds. They verify the new copy, normal pointer interaction, sign-in feedback without writes, dialog bounds, keyboard containment, Escape and focus restoration. The signed-in mutation test is excluded from production runs. Fresh live community phone/desktop samples still show eight roots, one reaction aggregate GET, no raw community/voter reads, correct panel bounds and no console/runtime errors. No production report, account, reward or license key was created. Moderator handling remains outside this increment.
