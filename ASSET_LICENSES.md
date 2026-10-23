# Asset and font license record

This file records visual assets used by Dynamon Universe. New assets or fonts must be added here before they are committed.

| File or family                    | Source / origin                                                                                                                | License                         | Attribution                                                                                             | Usage                               | Notes                                                                    |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | ------------------------------- | ------------------------------------------------------------------------------------------------------- | ----------------------------------- | ------------------------------------------------------------------------ |
| `public/fonts/general-sans/*`     | Existing repository asset; provenance to be confirmed by owner                                                                 | **Owner confirmation required** | Add attribution if required by the source                                                               | Archived source assets              | Preserved unchanged in source; excluded from generated deployment output |
| `public/fonts/aeonik-pro/*`       | Existing repository asset; provenance to be confirmed by owner                                                                 | **Owner confirmation required** | Add attribution if required by the source                                                               | Archived source assets              | Preserved unchanged in source; excluded from generated deployment output |
| `public/fonts/manrope/*`          | Fontsource variable Manrope 5.3.0; [upstream license](https://raw.githubusercontent.com/google/fonts/main/ofl/manrope/OFL.txt) | SIL Open Font License 1.1       | Copyright 2019 The Manrope Project Authors (Fontsource package notice); full notice in adjacent OFL.txt | Body and UI, weights 200–800        | Unmodified Latin variable WOFF2, 24,836 bytes; added 2026-10-23          |
| `public/fonts/sora/*`             | Fontsource variable Sora 5.3.0; [upstream license](https://raw.githubusercontent.com/google/fonts/main/ofl/sora/OFL.txt)       | SIL Open Font License 1.1       | Copyright 2019 The Sora Project Authors; full notice in adjacent OFL.txt                                | Display typography, weights 100–800 | Unmodified Latin variable WOFF2, 33,652 bytes; added 2026-10-23          |
| `public/dynamon-gamer-avatar.png` | Existing repository asset                                                                                                      | Existing project asset          | Not applicable unless source requires it                                                                | Brand/avatar fallback               | Preserved; no replacement added                                          |
| `src/assets/hero.webp`            | Existing repository asset                                                                                                      | Existing project asset          | Not applicable unless source requires it                                                                | Homepage/hero media                 | Preserved; no replacement added                                          |
| `src/assets/mods/*.webp`          | Existing repository assets                                                                                                     | Existing project assets         | Not applicable unless source requires it                                                                | Mod artwork                         | Preserved; no replacement added                                          |

## Required fields for future additions

- File name and path
- Source URL or original creator
- License type
- Attribution requirement
- Modification notes
- Usage location
- Date added
- Measured file size and format

**Owner action required:** confirm the licensing/provenance of the existing `General Sans` and `Aeonik Pro` files before public redistribution or adding more font weights.

The replacement fonts are self-hosted with their license notices. No font CDN or runtime third-party request is added. Their Latin subset falls back to the system stack for other characters. Font filenames contain the first 12 SHA-256 characters for cache-safe replacement. Full SHA-256 values:

- Manrope: `a30ddcd349703aff7464c34bef3fffdff405ee50c113440d7c8693c02d210972`
- Sora: `fa26406eeda9a3c6ec3d9ea8813c3045d6dc755e30c716d5c094e8ef43be5a7f`

Fallback metric overrides were derived locally from these font files and Windows Arial metrics. Arial is referenced only with `local()` and is not copied or redistributed. The four legacy source files total 93,192 bytes; deployment exclusions must not delete or overwrite those source files.

## Phase 7 feedback layer

Phase 7 uses browser Web Audio oscillator/buffer synthesis and the Web Vibration API only. No third-party audio files, downloaded music, CDN assets, or audio packages were added; therefore no new audio license or attribution is required.
