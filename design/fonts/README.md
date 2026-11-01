# Fonts: provenance and license (D-028)

Sora (headings and display) and Inter (UI and body) are self-hosted. Nothing is loaded from a font CDN at runtime. In Phase 4 these files move into the app's public assets.

## Source
Downloaded on 2026-11-01 from the Google Fonts distribution:
- **Font files:** the Google Fonts CSS API (`fonts.googleapis.com/css2`, Chrome user agent). It serves pre-subset WOFF2 files from `fonts.gstatic.com`. The `unicode-range` values in `fonts.css` are copied from that response.
- **License files:** the `ofl/sora/OFL.txt` and `ofl/inter/OFL.txt` files in the `google/fonts` GitHub repository.

| File | Upstream | Axes | Subset | SHA-256 |
|---|---|---|---|---|
| `sora/sora-latin.woff2` | `fonts.gstatic.com/s/sora/v17/…` | wght 100–800 | latin | `fa26406eeda9a3c6ec3d9ea8813c3045d6dc755e30c716d5c094e8ef43be5a7f` |
| `sora/sora-latin-ext.woff2` | `fonts.gstatic.com/s/sora/v17/…` | wght 100–800 | latin-ext | `c163c536f68befd99a83d4f17e8b88030e7f54229688a45c44f70c7149db7385` |
| `inter/inter-latin.woff2` | `fonts.gstatic.com/s/inter/v20/…` | opsz 14–32, wght 100–900 | latin | `2c295d99e26dcf357d4d01bcf270fd6924b600c9a13dd8c363ef114f4c6976fa` |
| `inter/inter-latin-ext.woff2` | `fonts.gstatic.com/s/inter/v20/…` | opsz 14–32, wght 100–900 | latin-ext | `5e6d4fe9d9f4bff8b2a2469d25ab19576bb85331e22c6ed51398e16f95d56a9c` |
| `inter/inter-italic-latin.woff2` | `fonts.gstatic.com/s/inter/v20/…` | opsz 14–32, wght 100–900, italic | latin | `c58f9d530baa7e96355f444502eca739d5eefa0f328f3d635b73648373214629` |
| `inter/inter-italic-latin-ext.woff2` | `fonts.gstatic.com/s/inter/v20/…` | opsz 14–32, wght 100–900, italic | latin-ext | `cd92c8740f77f482bcd39e831fa7b1445589e9203cc9edb39fd49435d8976257` |
| `sora/OFL.txt` | `google/fonts` `ofl/sora/OFL.txt` | | | `ba0b9729c9428ba79a0459ab8ec575791b51509dbec213e383d0316d37fec299` |
| `inter/OFL.txt` | `google/fonts` `ofl/inter/OFL.txt` | | | `5b9321a4298cfeb6b34354164a1c3afc3db114569984c502b9b35d988fd58c57` |

## Copyright and license
- Sora: Copyright 2019 The Sora Project Authors (https://github.com/sora-xor/sora-font). SIL Open Font License 1.1.
- Inter: Copyright 2020 The Inter Project Authors (https://github.com/rsms/inter). SIL Open Font License 1.1.

The OFL allows bundling and redistribution with software as long as the license file travels with the fonts and the fonts are not sold on their own. Keep each `OFL.txt` next to its font files.

## Subsets
- `latin` and `latin-ext` together cover Croatian (č, ć, đ, š, ž) and English. `latin-ext` loads only when a page uses one of its characters.
- Cyrillic, Greek and Vietnamese subsets are not included. Member content in those scripts falls back to system fonts. Revisit this if usage shows a need.

## Usage
Link `design/fonts/fonts.css` before the token CSS. Font stacks are defined in the tokens (`font.family.*`).
