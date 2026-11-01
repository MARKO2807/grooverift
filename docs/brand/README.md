# GrooveRift brand baseline and asset provenance

Status: **CONFIRMED** brand identity (Master Prompt §15). Layouts, the component system and motion remain **OPEN** and require design review.

## 1. Confirmed identity

| Element | Value | Notes |
|---|---|---|
| Name | GrooveRift | Confirmed. Do not reopen naming. |
| Primary tagline | *Where musical worlds collide.* | |
| Supporting line | *Discover music. Cross boundaries. Find your people.* | |
| Primary Coral | `#FF586B` | Energy, intensity |
| Secondary Amber | `#FFCB69` | Warmth, discovery |
| Void Black | `#0B0D12` | Main background (dark-first UI) |
| Headings / display | **Sora** | Key headings, editorial and onboarding moments |
| Body / UI | **Inter** | Navigation, labels, forms, content |
| Wordmark | "06 — Rift emphasis" | "groove" in white or near-white, "rift" in Coral, lowercase allowed |
| Symbol | Rift Pulse / Void Pulse | Electric portal with a central audio waveform, Coral→Amber |

Neutral surfaces and text colors, elevation levels, state colors and any light theme are design-system work. They must not introduce a competing brand palette.

Step 3.4 defined these as design tokens without adding brand colors: see [`docs/design/tokens.md`](../design/tokens.md) (D-038 to D-041).

## 2. Measured contrast (WCAG 2.x relative luminance)

Computed 2026-11-01 with a deterministic script (sRGB relative luminance formula).

| Foreground on background | Ratio | AA normal text (4.5) | AA large text / UI (3.0) |
|---|---|---|---|
| Coral on Void | 6.35 | ✅ | ✅ |
| Amber on Void | 12.96 | ✅ | ✅ |
| White on Void | 19.43 | ✅ | ✅ |
| **White on Coral** | **3.06** | ❌ | ✅ (large text only) |
| **White on Amber** | **1.50** | ❌ | ❌ |
| Void on Coral | 6.35 | ✅ | ✅ |
| Void on Amber | 12.96 | ✅ | ✅ |
| Coral on Amber | 2.04 | ❌ | ❌ |

**Implication (RECOMMENDED):** text and icons on Coral or Amber fills, including Coral→Amber gradients, should use Void Black (or a near-black), not white. Never put Coral text on Amber. The mockup's "Continue" button already uses dark text, which is consistent with this.

## 3. Source assets (originals; never overwrite)

Supplied by the owner on 2026-11-01. The originals also remain untouched outside version control in the project root (`/GrooveRift_Claude_Master_Prompt.txt`, `/GrooveRift Mockup.jpg`, `/Logo/`).

| Tracked file | Original filename | Format (verified) | Size | SHA-256 |
|---|---|---|---|---|
| `source/grooverift-symbol-original.png` | `Logo/Logo png.png` | PNG, 4844×3468, 32-bit ARGB, real transparency (corner alpha = 0) | 7.4 MB | `d0532e9c0405c2d6a14fea7520d3788210d280ab9d852129f1d8f2dec37d3a1d` |
| `source/grooverift-symbol-original.webp` | `Logo/Logo webp.webp` | WebP (VP8X container, embedded ICC profile); lossless or lossy **not verified** | 1.9 MB | `e73984f9116a408a65cf188033cbd1f317c2fa7e1784f7a8a619e376213c99db` |
| `source/grooverift-reference-mockup-v1.jpg` | `GrooveRift Mockup.jpg` | JPEG concept poster (onboarding + Music DNA) | 0.46 MB | `d23f1eee7e5140bfb2beac390f65f717af2096572ed77a9f100f2273317d9e28` |

The Master Prompt copy `docs/product/master-prompt.txt` has SHA-256 `906801e4e7681ccd15b0a947bd54a45efff420ae3325e452735a96fca4fda8e1` (byte-identical to the original).

### Known asset gaps and issues
1. **No vector (SVG/AI/PDF) version of the symbol.** Only raster files exist.
2. **No standalone wordmark file.** The "groove**rift**" wordmark exists only inside the mockup raster, which is not production quality.
3. **Background-removal artifacts in the PNG.** Greenish-yellow fringe pixels and a jagged glow edge are visible near the inner right contour, beside the waveform. They need cleanup for large-format use.
4. **Glow and lightning detail are designed for dark backgrounds.** They will not survive at favicon or notification-icon sizes (16–48 px). Android notification badges also require a **monochrome silhouette**.

### Permissions (owner, 2026-11-01)
The owner allows converting and modifying the logo files as needed. Working policy (see D-006 in `docs/decisions/DECISIONS.md`):
- **Allowed without further approval:** format conversion, resizing, compression, transparent-edge and fringe cleanup that does not change the silhouette, export of size variants.
- **Requires owner review before use:** vectorization (SVG), any reduced-detail small-size icon, a monochrome badge, a light-background variant and any wordmark recreation, because these affect how the mark looks.
- Derivatives will live in `docs/brand/derived/` (or the app's public assets folder once it exists), each listed here with the source file and processing steps.

## 4. Reference mockup: how to use it

The mockup is an **inspirational visual baseline, not a spec** (Master Prompt §15.5). It conflicts with confirmed rules in these places, which must **not** be implemented as shown:

| Mockup element | Conflict | Direction |
|---|---|---|
| Play button and "0:00 / 0:30" waveform player | No native playback or audio previews (§2, §18) | Use external listening links. A waveform may appear only as identity art, never as a fake player. |
| "68% Hip-Hop / 21% / 11%" genre mix | Risks false precision (§4) | Explain the Music DNA in human terms. Any proportions must reflect what the member actually selected and be clearly labeled. |
| "You're a 92% match with users who…" | Fake statistic; no falsely precise scores (§4) | Show human-readable reasons for each match. |
| Real artist photos (Travis Scott, Billie Eilish, Daft Punk, Kendrick Lamar) | Likeness and image rights (§11, §15.5) | Use only artwork the chosen metadata provider licenses; use placeholders in design work. |
| Bottom nav: Home / DNA / Discover / You | Missing Community Hub, messages and notifications; feed is the homepage (§6, §15.8) | Derive navigation from information architecture (IA) work in Phase 3. |
| Poster decoration (lightning frames, large glowing symbols) | Anti-slop rules (§15.6) | Reserve for marketing and select brand moments only. |

Useful as a reference: overall dark atmosphere, the Coral/Amber accent restraint on chips and buttons, the Sora/Inter hierarchy, the density of the genre-chip onboarding and the progress indicator in onboarding.
