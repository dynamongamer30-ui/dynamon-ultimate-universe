# Website design foundation

Direction: mineral black and collectible game artwork. Purpose: make build discovery, release comparison and account progress easy to read. Tone: refined gaming. Recognition anchor: authentic elemental artwork against quiet black surfaces, warm metallic Royal Black controls and a compact editorial release hierarchy. Frontend-design feasibility assessment: impact 4, fit 5, feasibility 5, performance 5, consistency risk 4; score 15.

Retain existing display/body fonts while their provenance remains recorded; add no new font files. Use existing spacing rhythm, fluid headings, restrained gradients and CSS perspective. Prioritize legibility, focus and touch targets. Avoid perpetual new background animation. Preserve reduced-motion behavior.

Website-only IDs: royal-black, dark, fire, thunder, water, earth, diamond, gold, spirit. Each palette supplies background, card, elevated surface, primary/secondary text, accent and accent end. Derive consistent border, input, popover, header/footer, focus, disabled, success/warning/error, shadows, scrim and interactive states from those foundations. Element labels retain their elemental meaning when the selected website palette changes.

Persistence: browser preference in localStorage, validated against enabled website IDs. Reuse the existing site-settings read for global configuration under `website_appearance`; add no theme-switch request. Owner changes must use an explicit save and compare the original JSON snapshot before replacement. New settings use insert/unique-key conflict protection. Preview is temporary, reset returns to built-ins, and invalid or unreadable palettes must fall back safely. Native DexThemes schema stays unchanged.

Validation: unit tests for config sanitization and contrast; browser tests for all nine themes, reload persistence, local switching without backend writes, keyboard interaction and narrow widths. Production owner-save testing requires an authorized session. All-route appearance and full contrast certification remain separate gates.
