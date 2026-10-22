# Source and asset inventory

Generated from the audited main checkout. Database row data is excluded.

## Routes

| Source | URL | Rendering |
| --- | --- | --- |
| about.tsx | /about | SSR default |
| achievements.tsx | /achievements | Client route |
| admin-control.tsx | /admin-control | Client route |
| admin-keys.tsx | /admin-keys | Client route |
| admin-loader.tsx | /admin-loader | Client route |
| admin-notifications.tsx | /admin-notifications | Client route |
| admin.tsx | /admin | Client route |
| auth.tsx | /auth | Client route |
| claim.tesla.tsx | /claim/tesla | Client route |
| claim.tsx | /claim | Client route |
| contact.tsx | /contact | SSR default |
| disclaimer.tsx | /disclaimer | SSR default |
| favorites.tsx | /favorites | Client route |
| generator.tsx | /generator | Client route |
| index.tsx | / | SSR default |
| mods.$slug.tsx | /mods/$slug | SSR default |
| mods.index.tsx | /mods/ | SSR default |
| mods.tsx | /mods | SSR default |
| notifications.tsx | /notifications | Client route |
| privacy.tsx | /privacy | SSR default |
| profile.tsx | /profile | Client route |
| rewards.tsx | /rewards | SSR default |
| unlock.tsx | /unlock | Client route |

`/mods/` is the index of `/mods`; `/mods/$slug` expands to eight catalog slugs, four currently visible through owner overrides. Parent `/claim` renders `/claim/tesla`. Root error/not-found handling is in __root.tsx. URLs remain unchanged.

## Components

- src/components/AnnouncementBanner.tsx
- src/components/AuroraCursor.tsx
- src/components/AvatarPicker.tsx
- src/components/BackHome.tsx
- src/components/ChangelogTimeline.tsx
- src/components/CommentsPanel.tsx
- src/components/DailyCheckIn.tsx
- src/components/DexControls.tsx
- src/components/DexThemes.tsx
- src/components/ElementalReactions.tsx
- src/components/FavoriteButton.tsx
- src/components/FeedbackPreferences.tsx
- src/components/Footer.tsx
- src/components/ForYouRail.tsx
- src/components/Header.tsx
- src/components/HeroWebGL.tsx
- src/components/LevelBadge.tsx
- src/components/LikeButton.tsx
- src/components/ModCard.tsx
- src/components/NotificationBell.tsx
- src/components/NotificationBody.tsx
- src/components/NotificationClaim.tsx
- src/components/NotificationOptIn.tsx
- src/components/OwnerBadge.tsx
- src/components/OwnerGate.tsx
- src/components/OwnerReturnRedirect.tsx
- src/components/PageShell.tsx
- src/components/PWAInstall.tsx
- src/components/ReportDialog.tsx
- src/components/Skeleton.tsx
- src/components/SocialStrip.tsx
- src/components/StreakBadge.tsx
- src/components/ThemedSelect.tsx
- src/components/ui/alert-dialog.tsx
- src/components/ui/button.tsx
- src/components/ui/input.tsx
- src/components/ui/select.tsx
- src/components/ui/tabs.tsx
- src/components/ui/textarea.tsx

## Artwork

| Asset | Dimensions | Bytes | Format | Usage / provenance |
| --- | --- | --- | --- | --- |
| src/assets/hero.webp | 960×640 | 20074 | webp | Existing project art; hero |
| src/assets/mods/dark.webp | 640×640 | 96436 | webp | Existing project art; element mod cards |
| src/assets/mods/diamond.webp | 640×640 | 121430 | webp | Existing project art; element mod cards |
| src/assets/mods/earth.webp | 640×640 | 105440 | webp | Existing project art; element mod cards |
| src/assets/mods/fire.webp | 640×640 | 107656 | webp | Existing project art; element mod cards |
| src/assets/mods/gold.webp | 640×640 | 121636 | webp | Existing project art; element mod cards |
| src/assets/mods/spirit.webp | 640×640 | 118638 | webp | Existing project art; element mod cards |
| src/assets/mods/thunder.webp | 640×640 | 111886 | webp | Existing project art; element mod cards |
| src/assets/mods/water.webp | 640×640 | 138746 | webp | Existing project art; element mod cards |

Existing public fonts are tracked in ASSET_LICENSES.md; ownership/provenance remains unconfirmed there. No new art or font downloads. No Dynamons directory found under the accessible user home in the startup search; existing repository art is the usable fallback. APK resource folders adjacent to this checkout are read-only and are not deployment assets.

## Supabase access map

| Domain | Tables / views | Access pattern |
| --- | --- | --- |
| Identity | profiles, public_profiles | PKCE auth; public projected profile view; own edits and owner flags governed by database |
| Community | comments, comment_likes, comment_reactions, mod_likes, mod_ratings, reports | User interactions; moderation owner-only |
| Preferences | notification_prefs, user_preferences, favorites, mod_subscribers | Own preferences and saved/subscribed builds |
| Progression | achievements, user_achievements, user_xp, user_streaks, trainer_levels, user_trainer_progress, user_engagement_events | Read displays and RPC awards; security findings require separate remediation |
| Settings | site_settings, mod_overrides | Public read, owner writes |
| Notifications | notifications, notification_reads, broadcasts | Owner broadcasts; users manage own reads |
| Claims | claim_campaigns, claim_campaign_claims, phoenix_passes, phoenix_pass_winners, vip_giveaway_winners | Server eligibility and claim rules |
| License/gates | valid_keys, app_config, access_tokens, gate_tokens, generation_logs, rate_limits, worker_init_rate, secure_sessions, banned_devices, activated_users | Worker service access and owner-only administration; preserve wire units |
| Legacy/access | access_keys, access_key_logs, user_unlocks, device_presence, device_xp_once | Existing compatibility records; no new presence polling |
| Administration | user_roles, moderation_log, admin_logs, suspicious_activity, honeypot_log, avatar_pool | Existing roles, owner controls and records |

Full live public schema is represented in src/integrations/supabase/types.ts. RLS is enabled on all 49 public tables reported by MCP. rv_v2 is a separate protected schema; its five no-client-policy tables remain inaccessible to ordinary roles through RLS. Function execution grants must be reviewed independently of table RLS.
