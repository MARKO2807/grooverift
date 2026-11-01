# Design tokens v0.1

_Step 3.4, approved by the owner on 2026-11-01 (D-038 to D-041). Source of truth: [`design/tokens/tokens.json`](../../design/tokens/tokens.json)._

## 1. Files

| File | Purpose |
|---|---|
| `design/tokens/tokens.json` | Source of truth. DTCG-style groups with `$value`, `$type`, `$description`; aliases as `{path}`. |
| `design/tokens/tokens.css` | **Generated.** 134 CSS custom properties (`--gr-*`) on `:root`, plus a `prefers-reduced-motion` block. Do not edit by hand. |
| `design/tokens/build.mjs` | Builds `tokens.css` (and the decision-sketch `options.css` while `options.json` exists). |
| `design/tokens/contrast-pairs.json` | Every allowed foreground/background pair with its WCAG minimum. |
| `design/tokens/contrast-check.mjs` | Contrast check over all pairs. Exit code 1 on any failure. |
| `design/tokens/contrast-report.md` | **Generated** and recorded output of the last check. |
| `design/tokens/lib.mjs` | Shared helpers (flatten, alias resolution, CSS conversion, WCAG luminance). |
| `design/tokens/options.json` | The TQ1–TQ4 alternatives shown to the owner. Kept only to regenerate the decision sketch; not for product use. |
| `design/fonts/` | Self-hosted Sora and Inter with OFL licenses and provenance ([README](../../design/fonts/README.md)). |
| `design/prototypes/tokens/` | Clickable decision sketch with every option side by side and live contrast readouts. |

All scripts are zero-dependency Node (tested on Node 22.12):

```sh
node design/tokens/build.mjs
node design/tokens/contrast-check.mjs --all-options --report design/tokens/contrast-report.md
```

**Format note.** Values use the widely supported DTCG draft syntax: hex strings for colors, and strings such as `"16px"`, `"1rem"` and `"200ms"` for dimensions and durations. The DTCG 2025.10 stable format uses object values. Whether to migrate, and whether to adopt a build library (for example Style Dictionary), is decided with the Phase 4 library choices. Until then the in-repo script is enough.

Usage in pages: link `design/fonts/fonts.css`, then `design/tokens/tokens.css`, and use only `--gr-*` variables.

## 2. Owner decisions (step 3.4)

| ID | Question | Decision | Rejected alternatives |
|---|---|---|---|
| D-038 | TQ1 primary action | **Solid Coral fill, Void Black text** | Amber fill (merged with the Amber Daily Drop card); Coral→Amber gradient (against 15.2, wears out fast) |
| D-039 | TQ2 neutral surfaces | **Cool, tinted toward Void Black** | Pure grey (muddy against Void); warm (clashes with the Void canvas) |
| D-040 | TQ3 error and warning | **Reuse Coral and Amber**, always with icon + text + border | Separate #FF7A59 / #F5A524 (too close to the brand; read as new brand colors) |
| D-041 | TQ4 shape | **Medium**: 10 / 12 / 20 px, pill chips | Soft (generic); sharp (chips and buttons look alike) |

## 3. Color roles

Brand primitives (`color.ember.*`) are CONFIRMED and never change without owner approval. Hover and pressed shades are lighter or darker versions of Coral and Amber, not new brand colors. Components use **semantic tokens only**, never primitives or raw hex.

| Token | Value | Use |
|---|---|---|
| `color.bg.canvas` | #0B0D12 (Void) | Page background |
| `color.bg.surface` | #12151C | Cards, lists, bars |
| `color.bg.raised` | #191D26 | Sheets, dialogs, menus, inputs |
| `color.bg.high` | #222733 | Hover/pressed on surfaces |
| `color.border.subtle` | #2A2F3B | **Decorative dividers only**; fails 3:1 by design |
| `color.border.strong` | #737A8C | Component boundaries: inputs, outline buttons, unselected chips (≥ 3:1) |
| `color.text.primary` | #F1F3F7 | Text |
| `color.text.secondary` | #A9AFBC | Meta, helper text, placeholders, inactive nav |
| `color.text.disabled` | #4F5564 | Disabled controls only (exempt from 1.4.3); never for information |
| `color.text.link` | Amber | Links |
| `color.text.accent` | Coral | Active nav label and indicator, brand emphasis |
| `color.text.on-accent` | Void | Anything on Coral, Amber or the gradient (R-09) |
| `color.action.primary` | Coral (hover #FF7081, pressed #E94B5E) | **One** primary action per view |
| `color.action.secondary` | `bg.raised` + `border.strong` | Secondary buttons |
| `color.selected.bg` / `.border` | #382029 / Coral | Selected chips and toggles, **always with a check icon** |
| `color.highlight.bg` / `.border` / `.text` | #2A2724 / Amber / Amber | Daily Drop and discovery moments |
| `color.focus.ring` / `.gap` | Amber / Void | Two-tone focus indicator |
| `color.state.danger` / `-bg` | Coral / #2E1D25 | Errors, destructive actions |
| `color.state.warning` / `-bg` | Amber / #2A2724 | Warnings, visibility notices |
| `color.state.success` / `-bg` | #5ED39A / #1B2C2B | Success, used sparingly, always with an icon |
| `color.state.info` | `text.secondary` | Info is neutral; no extra hue |
| `gradient.brand` | Coral → Amber, 90° | Brand moments and Music DNA identity art only; never on ordinary buttons, cards or borders |

Tints (`color.tint.*`) are pre-mixed opaque colors, so their contrast can be computed. Alpha colors are used only for the scrim and the overlay shadow.

### Rules
1. **Never color alone** (WCAG 1.4.1): selected = check icon + thicker border; errors = icon + text + 2 px border; warnings and success = icon + text.
2. **Destructive buttons** use `state.danger-bg`, a Coral border, Coral text and an icon. They are never filled Coral, so they cannot be mistaken for the primary action (D-040).
3. Text on Coral/Amber/gradient fills is always `text.on-accent` (Void Black).
4. Never put Coral text on Amber, or Amber text on Coral (2.04:1).
5. A color pair not listed in `contrast-pairs.json` may not be used. To use a new pair, add it there and rerun the check.

## 4. Typography

Sora for headings, Inter for everything else (Master Prompt 15.3). Sizes are in `rem`, and the root is left at the browser default (16 px), so text follows the user's browser setting (WCAG 1.4.4).

| Token | Font | Weight | Size | Line height | Use |
|---|---|---|---|---|---|
| `type.display` | Sora | 700 | 36 | 1.2 | Onboarding and brand moments only |
| `type.title-1` | Sora | 600 | 30 | 1.2 | Screen hero titles |
| `type.title-2` | Sora | 600 | 24 | 1.2 | Daily Drop question, screen titles |
| `type.title-3` | Sora | 600 | 20 | 1.35 | Section and dialog titles |
| `type.body` | Inter | 400 | 16 | 1.5 | Body text and **inputs** (16 px prevents iOS zoom) |
| `type.body-sm` | Inter | 400 | 14 | 1.5 | Answers in lists, meta |
| `type.label` | Inter | 600 | 14 | 1.35 | Buttons, chips, tabs |
| `type.caption` | Inter | 500 | 13 | 1.35 | Timestamps, nav labels. **13 px is the minimum.** |
| `type.eyebrow` | Inter | 600 | 13, uppercase, 0.06em | 1.35 | Section labels such as "DAILY DROP" |

CSS: `font: var(--gr-type-title-2); letter-spacing: var(--gr-type-title-2-letter-spacing);`. Sora headings get −0.01em tracking. No other tracking or text effects (15.3).

## 5. Space, size, shape

- **Space:** 4 px grid in rem: `space.half` 2, `1` 4, `2` 8, `3` 12, `4` 16, `5` 20, `6` 24, `8` 32, `10` 40, `12` 48, `16` 64.
- **Targets:** `size.target.min` **44 px** for all primary controls, nav items and icon buttons; `size.target.dense` 24 px is the floor (WCAG 2.5.8) for dense inline controls such as reactions. Target sizes are in px so they never shrink below 44 when a user lowers the font size.
- **Icons:** 16 / 20 / 24 px. **Reading column:** `size.content-max` 40 rem.
- **Radius (D-041):** control 10, card 12, sheet 20, chip and full = pill.
- **Borders:** hairline 1 px; thick 2 px for selected and invalid states.

## 6. Focus
Two-tone ring: a 2 px Void Black gap, then a 2 px Amber ring (4 px total), drawn with `box-shadow` so it follows the radius:

```css
:focus-visible {
  outline: none;
  box-shadow: 0 0 0 var(--gr-focus-gap) var(--gr-color-focus-gap),
              0 0 0 calc(var(--gr-focus-gap) + var(--gr-focus-width)) var(--gr-color-focus-ring);
}
```

The Void gap keeps the ring visible on Coral and Amber fills, and the Amber ring is ≥ 9.9:1 on every surface. In Windows high-contrast mode (`forced-colors: active`), components must fall back to a real `outline`, because box-shadows are removed. This is specified per component in step 3.6.

## 7. Elevation, motion, layout
- **Elevation:** on surfaces it comes from the `bg` steps plus `border.subtle`, never from shadows. `shadow.overlay` (0 8 32, 50% black) is used only for dialogs, sheets, menus and toasts.
- **Motion:** `duration.fast` 120 ms (hover, press, toggles), `base` 200 ms (sheets, dialogs, toasts), `slow` 320 ms (page and onboarding steps). Easing: `standard` (0.2, 0, 0, 1), `enter` (0, 0, 0, 1), `exit` (0.3, 0, 1, 1). Under `prefers-reduced-motion: reduce`, **all durations become 0 ms** (generated). Components replace slides and scales with opacity. Brand motifs never flash (2.3.1).
- **Breakpoints (min-width):** `medium` 600 px (collapsed rail replaces the bottom bar), `expanded` 1024 px (rail with labels), `wide` 1280 px (optional context column, IA 3.2). CSS variables cannot be used inside `@media`, so these values are mirrored there.
- **Z-index:** base 0, sticky 100, nav 200, overlay 300, toast 400.

## 8. Contrast verification
`contrast-check.mjs` expands `contrast-pairs.json` into **87 pairs**: text pairs need ≥ 4.5:1 (1.4.3), and component, indicator and focus pairs need ≥ 3:1 (1.4.11). Gradients are sampled at 11 points in sRGB, and the worst sample counts.

Recorded run (2026-11-01), full table in [`contrast-report.md`](../../design/tokens/contrast-report.md):
- Base tokens: **87/87 pass**. The tightest pair is `border.strong` on `bg.high`: 3.48 (min 3). Step 3.5 added two pairs: `gradient.brand` as an identity indicator on `bg.canvas` (6.35) and `bg.surface` (5.97), used by the onboarding progress and the Music DNA pulse in direction C (D-042).
- All 18 TQ1 × TQ2 × TQ3 combinations also pass (kept for the record).
- Negative test: setting `text.on-accent` to white makes 7 pairs fail (white on Coral 3.06, on Amber 1.50), matching the brand README §2 measurements. The script exits 1.

The check is rerun in step 3.9 and, from Phase 4, in CI.

## 9. Not in v0.1
- **Light theme: CONFIRMED as a member setting, dark default (D-045).** Designed in step 3.4b. The token structure (semantic roles over primitives) allows the light set without renaming. Coral and Amber need light-background text variants, because Coral on white is 3.06 and Amber on white is 1.50.
- Component tokens (button padding, avatar sizes and so on): step 3.6.
- Data-visualization colors: not needed in the alpha. Music DNA proportions must reflect what the member actually selected (brand README §4).
- Cyrillic, Greek and Vietnamese font subsets ([fonts README](../../design/fonts/README.md)).
