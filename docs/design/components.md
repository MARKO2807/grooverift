# Core components spec

_Step 3.6, session 19 (2026-11-04). Scope confirmed by the owner at the start of the session ("Odobravam sve"). Specimen: [`design/prototypes/components.html`](../../design/prototypes/components.html) (section numbers match §4). Reference implementation: `design/prototypes/pulse/style.css` on the `--gr-*` tokens._

This spec turns the refined prototype (direction C "Pulse", step 3.5) into a component contract for Phase 4. It describes what already exists and has been reviewed by the owner. It adds the missing states, the component tokens, and the keyboard, screen reader and forced-colour behaviour for each component. It adds no new features. Where it changed the prototype, §6 lists the change.

Labels: **CONFIRMED** = an owner decision (D-number). **RECOMMENDED** = a proposal still open to the owner. The owner reviewed the specimen and approved the spec as a whole (D-082, "Sve štima"); the Phosphor mapping in §7 stays RECOMMENDED until the icon package is installed in Phase 4. **OPEN** / **DEFERRED** as elsewhere.

## 1. Files

| File | Role |
|---|---|
| `docs/design/components.md` | This spec (English). |
| `design/prototypes/components.html` | Specimen for the owner and for Phase 4: every component in every state, on the real CSS. "Zadano" cells are live; hover, pressed and focus are shown with specimen-only classes (`sp-hover`, `sp-active`, `sp-focus`) that copy the real rules. It also embeds three live overlays from the app in phone frames. |
| `design/tokens/tokens.json` → `tokens.css` | Component tokens added (§5), plus `color.state.danger-bg-hover`, `opacity.disabled` and `breakpoint.full`. 180 variables. |
| `design/tokens/contrast-pairs.json` | Two pairs added for the danger hover (89 pairs, all pass). |
| `design/prototypes/pulse/style.css`, `app.js` | Now use the component tokens; the §6 fixes. |

## 2. Principles (apply to every component)

1. **Semantic tokens only.** Components use `--gr-color-*` semantic roles and the component tokens in §5, never raw hex or brand primitives (`ember.*`). Raw colours remain only in motif art (current, orbit, Spirala, generated tiles), which is decorative (tokens.md §3).
2. **One primary action per view** (tokens.md §3). The CTA pill is a brand-screen variant of it, not a second primary.
3. **Never colour alone** (WCAG 1.4.1). Every selected, chosen, current or invalid state has a **shape** as well as a colour: a tick, a bar, a thicker border, an icon plus words. The rule of thumb: **one of many** (tabs, rail, segments, days) is marked with a short **bar**, **many of many** (toggle chips) with a **tick**, a **choice card** with a filled circle and a tick. New in 3.6: the segmented radio row and the day strip get their bar (§6).
4. **Targets are px, at least 44 × 44** for primary controls, nav items and icon buttons; small buttons (36 px) only under a fine pointer; 24 px is the floor for dense inline controls (WCAG 2.5.8). px keeps targets from shrinking when the member lowers the browser font.
5. **Text in rem**, so it follows the browser setting (1.4.4). Above about 130 % text on a phone the large-text block (`@media (max-width: 17.5em)`) stacks pairs and lets headings grow by a step (D-073).
6. **Motion only through motion tokens**, and everything stops under `prefers-reduced-motion` or the in-app "Smanji pokrete" (`html[data-motion="reduced"]`, D-049). Reduced motion replaces slides and scales with nothing or with opacity. Brand motifs never flash (2.3.1).
7. **Forced colours** (Windows high contrast) are a supported mode, not an afterthought. Box-shadow focus rings and tints disappear there, so each component names its fallback. The forced-colour block is the last block of the stylesheet (session 18 finding).
8. **Every list and page has four states**: content, empty, loading, error (plus offline where data can be stale). §4.11.
9. **Native elements first.** `button`, `input`, `select`, `textarea`, `fieldset`/`legend`, radios and checkboxes; ARIA only where HTML has no element (`role="switch"`, `aria-pressed`, `role="dialog"`/`alertdialog`, live regions).

## 3. State model and global keyboard rules

### 3.1 States

| State | How it shows | Tokens |
|---|---|---|
| Default | — | per component |
| Hover (pointer) | One step lighter surface or a stronger border; never the only signal of anything | `bg.high`, `action.primary-hover`, `border.strong` |
| Focus (keyboard) | Two-tone ring: 2 px Void gap, 2 px Amber ring, `box-shadow`, follows the radius. Headings that take focus after navigation get an Amber underline instead. Cards that carry a radio show the ring on the card. | `focus.ring`, `focus.gap`, `focus.width`, `focus.gap` |
| Pressed | One step darker (primary), the surface step below (secondary) | `action.primary-pressed`, `bg.surface` |
| Disabled (`disabled`) | `opacity.disabled` (0.45), `cursor: not-allowed`, no hover or press; removed from the Tab order. Use sparingly: prefer to explain why something cannot be done. | `opacity.disabled` |
| Unavailable but explained (`aria-disabled="true"`) | Looks disabled, **stays focusable**, and says why (e.g. "Već 10 žanrova", "Već dodano"). Used for chips at the limit, added results, busy buttons. | `opacity.disabled` |
| Selected / chosen / current | Tint plus a shape: tick (toggle chips, choice cards), bar (tabs, rail, segments, day strip), thick border | `selected.bg`, `selected.border`, `text.accent`, `border-width.thick` |
| Invalid | 2 px Coral border, an error line with an icon and a sentence that suggests a fix, `aria-invalid`, `aria-describedby` | `state.danger`, `field.border-invalid` |
| Loading | Content-shaped skeletons (no spinner), `aria-busy`, a visually hidden "Učitavam…" status; a busy button changes its label ("Objavljujem…") and takes `aria-disabled` | `bg.high`, `opacity.disabled` |
| Large text (≤ 17.5em viewport) | Rows stack, buttons go full width, labels wrap; bars and spacing stop growing | (tokens fixed in px inside the block) |
| Reduced motion | No animation; durations 0 ms (generated); motifs leave a still frame | `motion.duration.*` |
| Forced colours | System colours. Focus = 2 px `CanvasText` outline, offset 2 px. Selected / current = `Highlight` plus the shape. Disabled = `GrayText`. | — |

### 3.2 Keyboard and focus, everywhere

- **Order follows the reading order.** No positive `tabindex`. `tabindex="-1"` only on headings and messages that receive programmatic focus.
- **Skip link** ("Preskoči na sadržaj") is the first stop on every page; it is visible only on focus.
- **Navigation moves focus to the new page's `h1`** (with `preventScroll`). Back restores the scroll position and focuses the `h1`.
- **Errors on submit**: focus goes to the first invalid field or the error summary; the error is also announced (`role="alert"`).
- **Overlays** (§4.8): focus moves in, Tab cycles inside, the page behind is `inert`, Escape closes, focus returns to the opener.
- **Status messages** use live regions and never steal focus (4.1.3): toasts, counters ("4 od 10"), availability checks, the offline bar.
- **Focus not obscured (2.4.11), new in 3.6:** `html { scroll-padding }` keeps a focused control clear of the sticky top bar (56 px, 64 px from 1024 px) and of the tab bar and dock at the bottom (9 rem on the phone, 6 rem from 600 px).
- **Swipe** between tabs is an extra path only (2.5.1); every destination has a button.

## 4. Components

Each entry: use, variants, tokens by state, keyboard, screen reader, forced colours, motion and large text where it matters. Class names refer to `pulse/style.css`.

### 4.1 Buttons (`.btn`)

**Use.** Actions. Links that look like buttons are not used; navigation that looks like a link is `.link`.

| Variant | Class | Default | Hover | Pressed | Focus | Disabled |
|---|---|---|---|---|---|---|
| Primary | `.btn-primary` | `action.primary` fill, `text.on-accent` | `action.primary-hover` | `action.primary-pressed` | ring | `opacity.disabled`, fill unchanged |
| Secondary | `.btn-secondary` | `action.secondary` (`bg.raised`), `border.strong`, `text.primary` | `bg.high` | `bg.surface` | ring | `opacity.disabled` |
| Destructive | `.btn-danger` + icon | `state.danger-bg`, Coral border and text | `state.danger-bg-hover` (4.88:1) | same as hover | ring | `opacity.disabled` |
| Small | `.btn-sm` | `button.height-sm` 36 px, `button.padding-x-sm` | | | | 44 px under `pointer: coarse` |
| CTA pill | `.btn-cta` | `button.height-cta` 52 px, `button.radius-cta`, primary colours | as primary | as primary | ring | — |
| Invite ring | `.btn-invite` | CTA plus a soft Coral ring every 3.2 s while the member has not answered (D-064) | | | | stops with reduced motion |
| Icon button | `.iconbtn` | 44 × 44, no border, `text.primary` | `bg.high` | — | ring | — |
| Text and link buttons | `.link`, `.add-ref`, `.toast-btn`, `.comments-btn` | `text.link` (Amber) underlined for links; Amber label for inline add actions | `bg.high` behind the text buttons | — | ring | — |

Sizes: `button.height` 44, padding `button.padding-x` 16, gap 8, radius `button.radius` (10). Label `type.label`.

- **Keyboard:** Tab, Enter or Space. `disabled` leaves the Tab order; `aria-disabled` stays and does nothing on activation.
- **Screen reader:** the visible label is the name (2.5.3). Icon buttons need `aria-label` naming the object ("Više opcija: odgovor korisnika Petra"). Busy: label changes to the action in progress ("Objavljujem…"), `aria-disabled="true"`; the result is announced by a toast or an inline status.
- **Forced colours:** the system draws `ButtonText` borders (the 1 px transparent border on `.btn` becomes visible). Disabled: `GrayText` text and border.
- **Large text:** footer rows and dialog action rows stack; each button full width.
- **Don't:** two primaries in one view; a Coral-filled destructive button; an icon-only button without a name; gradients on buttons (tokens.md §3).

### 4.2 Fields (`.field`, `.input`, `.textarea`, `.select`)

**Anatomy.** Label (`.label`, always visible, above) → help (`.help`, optional, linked with `aria-describedby`) → control → status line or error (`.status-line`, `.field-err`, `.pw-need`).

| State | Look | Tokens |
|---|---|---|
| Default | `bg.raised` fill, 1 px `border.strong` (3:1), 16 px text, placeholder `text.secondary` | `field.height` 44, `field.padding-x` 12, `field.radius` 10, `field.border` |
| Focus | ring around the control | focus tokens |
| Invalid | 2 px Coral border; error line under the field with an icon and a sentence that suggests a fix | `field.border-invalid`, `state.danger` |
| Read-only | `bg.canvas`, `text.secondary` | — |
| Disabled | `opacity.disabled`; avoid, explain instead | `opacity.disabled` |
| Valid / available | green status line with a tick ("Slobodno je."), polite live region | `state.success` |

Variants: prefix (`.has-prefix`: "@" or a search icon, decorative), trailing button (`.has-after` + `.input-btn`: "Prikaži" / "Sakrij" password, `aria-pressed`, `aria-controls`), textarea (`field.textarea-min` 6 rem, grows), native select, the TOTP field (`.tfa-field`), the compact time field (`.rem-time`), the live-edge comment field (`.live-field`, motif, stops with reduced motion).

- **Keyboard:** native. Enter submits the form; textareas take Enter as a newline.
- **Screen reader:** `label for`, help and error in `aria-describedby` (the id only while the line is rendered, session 18 fix 1). Password rules are read as one line; when every rule is met a hidden status says so. `autocomplete` on email, username, new-password, current-password, one-time-code (1.3.5); paste always allowed (3.3.8).
- **Forced colours:** system field colours; the error stays readable through its icon and text.
- **Large text:** the "Prikaži" button moves under the password field so the field keeps its width.
- **Don't:** placeholder as label; errors only in colour; clearing what the member typed after an error.

### 4.3 Chips

Three kinds that look related and behave differently.

| Kind | Element | Selection | Default | Selected |
|---|---|---|---|---|
| Toggle chip (`.chip`) | `button aria-pressed` | many | transparent, 1 px `border.strong`, `chip.height` 40 (44 coarse), pill | `selected.bg`, 2 px `selected.border`, **tick** (`.ck`) |
| Genre chip (`.chip-genre`, D-062) | same | many, 2 to 10 | as toggle chip; hover border mixes toward the genre colour | the genre's own colour as border and 15 % fill, tick in that colour |
| "+ Još žanrova" (`.chip-more`) | button | — | dashed `highlight.border`, Amber text | — |
| Segmented row (`.sort`) | `fieldset` + native radios | exactly one | `chip.segment-height` 36 (40 coarse), `text.secondary` | `selected.bg`, 2 px `selected.border`, `text.primary`, **a 14 × 2 px bar under the label (new in 3.6)**; the bar takes no width, so the three sort options still fit one row at 320 px (D-047) |
| Day strip (`.day`) | `button aria-pressed` in a `role="group"` | one | `bg.surface`, subtle border | `selected.bg`, 2 px border, **bar under the number (new in 3.6)** |
| Tags (`.tags li`, `.rel-chip`, `.status-pill`, `.alpha-tag`) | text | none | border and text; meaning in words | — |

- **At the limit** (10 genres): the other chips take `aria-disabled="true"`, stay focusable, and a polite live line says why.
- **Keyboard:** toggle chips: Tab to each, Space or Enter. Segmented row: one Tab stop on the checked radio, arrows move the choice (native). Day strip: Tab to each day.
- **Screen reader:** "Hrvatski, toggle button, pressed"; "Za tebe, radio button, checked, 1 of 3"; days have the full date in `aria-label` (and ", danas" for today).
- **Forced colours:** selected chips, segments and days take a `Highlight` border; ticks and bars are `Highlight` (new in 3.6).
- **Large text:** the segmented row wraps instead of scrolling; the day strip goes to four columns.
- **Don't:** a chip that navigates; colour as the only selected signal; more chips than a choice needs (Master Prompt "excessive chips/badges").

### 4.4 Choice cards, switch, checkbox

**Choice card** (`.choice` in a `fieldset.choices`): a large radio for decisions that matter (age, visibility, report category, delete reason). Native radio hidden but in the DOM and the Tab order. Default: `bg.canvas`, 1 px `border.strong`, `radius.card`, empty circle mark. Checked: `selected.bg`, 2 px `selected.border`, the mark filled `action.primary` with a Void tick. Focus: the ring on the whole card (`:has(input:focus-visible)`). Compact variant (`.choices-compact`) and centred variant (`.choices-center`). **Neutral choices (D-030):** nothing pre-selected, equal weight, no "recommended" label. The visibility card (`.vis`, `.vrow`) is a specialised choice card (D-046, D-060).

**Switch** (`button.switch role="switch" aria-checked`): for settings that apply at once. `switch.width` 52 × `switch.height` 32 (56 × 36 coarse), knob `switch.knob` 20. Off: `bg.canvas`, 2 px `border.strong`, knob `text.secondary`, left. On: `action.primary` fill and border, knob `text.on-accent`, right. Motion: the knob slides in `duration.base`; none under reduced motion. Disabled: `opacity.disabled` and a reason in the row. In a settings row the name comes from the row title (`aria-labelledby`) and the description from the row (`aria-describedby`).

**Checkbox:** native, 22 px, `accent-color` Coral. Used for the 18+ attestation inside a bordered label (`.age-check`), the notification table, and "Also report" in the block dialog.

- **Keyboard:** choice cards: Tab into the group, arrows choose. Switch: Space (and Enter). Checkbox: Space.
- **Screen reader:** the `legend` is the question; each card's description is part of its label. "Smanji pokrete, switch, off".
- **Forced colours:** switch border and knob `ButtonText`, on = `Highlight` (session 18); checked choice card: `Highlight` border, mark `Highlight` with `HighlightText` tick (new in 3.6).

### 4.5 Cards and rows

Elevation comes from the surface step and a hairline, never from a shadow (tokens.md §7).

| Card | Element | Notes |
|---|---|---|
| Answer (`.ans`, in `.ans-list`) | `article aria-labelledby` its author heading | `bg.surface`, radius 18, padding 16 (20 / 24 on desktop). Head: avatar, name as heading (`h3` in lists), handle, time ("uređeno"), "Više opcija" icon button. Text 17 px / 1.55, clamped to 4 lines with "Pročitaj više" (`aria-expanded`, `aria-controls`). Then catalog cards, the reaction, comments. |
| Own answer (`.mine-wrap`) | same | 2 px gradient frame (motif, D-042 brand moment), "Tvoj odgovor" eyebrow, Edit and Delete as small buttons; the reaction count is not a button. |
| Muted answer (`.ans-muted`) | collapsed row with "Prikaži" | dashed border (D-075) |
| Catalog card without artwork (`.ref`) | `button` | 56 px row on `bg.raised`, subtle border (hover `border.strong`); a generated tile (initial on a Coral/Amber field, `catalog.js tile()`), title, "type, artist", chevron. No playback; opens the release page with external links (Master Prompt 15.4, D-017). |
| Search result (`.result`) | `button` | 56 px; artist tile or Commons photo with credit line; "+" or a tick when added (`aria-disabled`). Skeleton rows while loading. |
| Answer peek (`.peek`) | `button` | Home: avatar, name, two-line clamp; hover `bg.raised`. |
| Programme card (`.prog-card`), Daily Drop card (`.dd-card`), facts (`.facts-grid`) | static | `bg.surface`, `radius.sheet` or `radius.card`. |
| Settings group (`.set-list` of `.set-row`) | `ul` of buttons or rows | `bg.surface` group, hairlines between rows, 56 px rows: icon tile, title and description, chevron or switch. Danger row: Coral title and icon. Desktop: current row in the settings nav gets `bg.raised` and an inset Coral bar (`aria-current="page"`). |

- **Keyboard:** a card that goes somewhere is one button (one Tab stop). Inside an answer card the order is: author name (opens the profile), "Više opcija", "Pročitaj više", catalog cards, reaction, comments.
- **Screen reader:** the author name is the answer's heading, so H moves from answer to answer. Times are `<time>`. Member text keeps its `lang` when known.
- **Forced colours:** borders become `CanvasText`; the own-answer gradient frame disappears and the "Tvoj odgovor" label carries the meaning.
- **Large text:** the answer head stacks (name, then time), catalog cards drop the chevron, long words wrap (`overflow-wrap: anywhere` on names, handles and text).

### 4.6 Avatar and its fallback (`.avatar`)

- **Sizes:** `avatar.xxs` 22, `xs` 26, `sm` 32, `md` 40 (default), `lg` 72, `xl` 96. Ring `avatar.ring` 2 px (3 px from lg, 1.5 px at xs and xxs) with a 2 px canvas gap inside it.
- **Ring:** a conic gradient of the member's genre colours (`GR_DNA.ring`, D-052). No genres: neutral `border.strong`.
- **Fallback (no photo):** the first letter of the display name, Inter semibold, on `bg.high`. Photos are optional and sit inside the same ring (PROF-08, D-078).
- **Stack** (`.stack`): at most three, overlapped 7 px, always next to a count in text.
- **Artists:** the round `.art` tile; a free-licence Commons photo with credit, otherwise a generated initial tile (D-046, D-017).
- **Screen reader:** decorative (`aria-hidden`); the name is always next to it. **Forced colours:** the ring keeps its colours only where it is an image; the letter stays readable on the system background.

### 4.7 Navigation

| Part | Spec |
|---|---|
| Top bar (`header.topbar`) | Sticky, `bar.top` 56 px (64 px from 1024 px), `bg.canvas`, hairline below. Left: back (icon button, "Natrag") when there is history. Middle: the wordmark on Home and brand screens, otherwise the title (`type.title-3`; the page's `h1` when the screen has no other). Right: actions, the offline chip, "Alfa", the language button on signed-out screens. From 1024 px Home has no top bar (the rail names it). |
| Tab bar (`nav.tabbar`, phone) | Four destinations in fixed order (D-031): Početna, Hub, Aktivnost, Profil. Item height `bar.tab` 60, icon 24 + caption label. Current: `aria-current="page"`, `text.accent`, a 2 px bar at the top. Glass background over content (D-063), solid where blur is unsupported or colours are forced. Large text: only the current tab shows its label; the others keep theirs in the accessibility tree (D-073). |
| Rail (`nav.rail`, 600 px+) | Same four destinations in the same order, then Postavke and Pomoć and the "Alfa" mark in the footer. `bar.rail-collapsed` 80 px (icon over caption) from 600 px; with labels, `bar.rail` 15 rem (clamp 12–22vw) from 1024 px; `bar.rail-full` 16 rem from 1600 px. Current: `text.accent` and a 2 px bar on the left. Hover `bg.high`. Only one of rail and tab bar is displayed, so a screen reader hears one main navigation. |
| Settings nav (`nav.set-nav`, 1280 px+) | The settings list beside the detail; the open row has `aria-current="page"`. |
| Skip link (`.skip`) | First Tab stop; hidden until focused. |
| Onboarding progress (`.pulse-progress`) | Nine short bars on the brand gradient; the current one taller. The step is also in text ("3 od 9", linked to the `h1` with `aria-describedby`). |

- **Keyboard:** each destination is a button; Enter navigates and focus lands on the new `h1`. On desktop the rail comes before the content in the Tab order; the skip link jumps past it.
- **Forced colours:** current tab and rail item in `Highlight`, text and bar (session 18 fix 4).

### 4.8 Sheets, dialogs and menus

| Kind | Role | Use | Phone | 600 px+ |
|---|---|---|---|---|
| Sheet (`.sheet`) | `dialog`, `aria-modal`, `aria-labelledby` its title | Tasks: compose an answer, report, pick, photo, comments | From the bottom, `radius.sheet` top corners, max 90vh, `overlay.sheet-max` 30 rem | Centred over the content area (right of the rail), all corners rounded, hairline edge, `overlay.sheet-max` (compose: `overlay.sheet-compose-max` 36 rem) |
| Menu (sheet with `.menu`) | `dialog` | "Više opcija" on an answer, profile actions | rows `.menu-item` 52 px, icon + label | centred |
| Decision dialog (`.dialog`) | `alertdialog`, `aria-describedby` the consequences | Block, mute, delete, sign out, 18+ | centred, `overlay.dialog-max` 26 rem, padding `overlay.padding` 20 | same, offset by the rail |

All: `bg.raised`, `shadow.overlay` (the only shadows in the system), scrim `bg.scrim`. Fields inside a sheet sit on `bg.surface` so they stand out from the sheet.

- **Opening:** focus goes to the first field (compose), the first menu item (menus), the checked option (pickers), or, in decision dialogs, the first option (the "Also report" checkbox, the 18+ choice) and otherwise the safe button ("Odustani" comes first in the DOM, the destructive action last).
- **While open:** the shell is `inert`; Tab and Shift+Tab cycle inside; nothing behind is reachable by keyboard or screen reader.
- **Closing:** Escape or the scrim closes sheets, menus and dialogs, except the 18+ step, the notification-permission explainer and the hard sign-in wall (D-076), which need an answer. Closing the composer keeps a new answer's text as a draft (the dock shows it); closing an edit discards the edit. Focus returns to the opener.
- **Motion:** sheets rise in `duration.base` with `easing.enter` (phone) or fade and rise 12 px (desktop); none under reduced motion.
- **Large text:** dialog actions wrap and fill the width.
- **Forced colours:** the sheet edge and the scrim are kept by the system border; no information depends on the shadow.
- **Don't:** a dialog for information that could be inline; nested dialogs; a destructive action as the default focus.

### 4.9 Toast (`#toast`, `.toast-in`)

- One at a time, above the bottom bar (above the dock and the rail offset on desktop), `bg.raised`, `border.strong`, `radius.card`, `shadow.overlay`.
- **Time:** `toast.duration` 2 s without an action, `toast.duration-action` 5 s with one (D-078, 2.2.1). These are reading times, not motion, so reduced motion does not shorten them.
- **Action:** one text button (`.toast-btn`, "Poništi"). The action is always also possible elsewhere (unmute in the profile or settings), so a missed toast loses nothing.
- **Screen reader:** the container is `role="status" aria-live="polite"`; the toast never takes focus.
- **2.4.11:** the toast is `pointer-events: none` except its button and sits above the dock, so it never covers the focused control for longer than its time.

### 4.10 Inline notices

Always icon + text + border; the colour only repeats the meaning (tokens.md rule 1).

| Kind | Class | Tokens | Role |
|---|---|---|---|
| Info | `.info`, `.info-stack` | `bg.surface`, `border.subtle`, icon `text.secondary` | none (static) |
| Warning, visibility notice | `.notice`, `.cat-err` | `state.warning-bg`, `state.warning` border and icon | `status` when it appears after an action |
| Error | `.post-err`, `.field-err` | `state.danger-bg`, `state.danger` | `alert` |
| Success | `.status-line.ok`, `.req-done`, `.set-status` | `state.success` with a tick | in a polite live region |
| Highlight (Daily Drop, "first Drop", "waiting") | `.dd-wait`, `.dd-late`, `.install`, `.sub-copy` | `highlight.bg`, `highlight.border`, `highlight.text` | `status` where it replaces content |
| Audience lines | `.aud-line`, `.pf-vis`, `.vrow-same` | `text.secondary` with an eye or lock icon | none; next to the thing it describes |

**Visibility notices** say who will see something before the member acts (Music DNA editor, profile, private-profile line, D-021 answers stay visible to members). They are never only a lock icon.

### 4.11 Empty, loading, error and offline states

| State | Pattern | Notes |
|---|---|---|
| Empty | `.empty-b`: Phosphor icon (Amber), a short title, one sentence, at most one action | No illustrations, no fake content. |
| Loading | `.skel` skeletons shaped like the content, inside `aria-busy="true"` with a hidden "Učitavam…" status | No spinners. Skeletons breathe slowly (opacity 0.5 to 1 over 2.4 s, round 10 option b); under reduced motion they are still. Forced colours: `Canvas` with a `GrayText` hairline (session 18). |
| Error (part of a page) | `.load-err`: warning notice, "X se nije učitalo. Ostatak stranice radi." and "Pokušaj ponovno" | `role="alert"`. |
| Error (whole page) | SYS-02 in the shell or bare (D-078): "Nešto je pošlo po zlu", retry and the way to help, no technical details | `h2` when the top bar already holds the `h1` (session 18 fix 3). |
| Offline | `.net-bar` under the top bar ("Nisi na mreži. Prikazujemo spremljeno u 09:41."), or the chip in the top bar; writing actions say they will wait | `role="status"`. |
| Paused feature | SYS-04: the content stays readable, the dock says what waits | — |

### 4.12 Reaction (`.react-like`, D-056)

One reaction, icon only (the audio wave) and the count, 44 px wide, 36 px tall (44 coarse), pill, 1 px `border.strong`, `text.secondary`. Pressed: `selected.border` edge, the wave in the Ember gradient (motif) and 2.2 px, the count `text.accent`; on press the wave beats once and the count rolls (360 ms, none under reduced motion). On the member's own answer the count is shown as `role="img"` with a dashed border, not a button.

- **Screen reader:** `aria-pressed`; name "Sviđa mi se, 12 reakcija" (", ti" when pressed). The group is "Reakcije".
- **Forced colours:** pressed wave and border `Highlight`.

### 4.13 Dock (`.dock`, D-043)

On the question page, above the tab bar (phone) or at the foot of the column (desktop, owner, session 17). The field is a **button** that opens the compose sheet (`.dock-field`, `bar.dock-field` 48 px, pill, `bg.raised`, `border.strong`); with a saved draft its text is `text.primary`. A small charge circles it while the member has not answered (`canvas.orbit`, motif, still under reduced motion, keeps its colours in forced colours). Answered: a line with a tick, "Tvoj odgovor je objavljen."; restricted or paused: a lock or pause line in `highlight.text`.

- **Keyboard:** one Tab stop; Enter opens the sheet; focus returns here when the sheet closes.

### 4.14 Spirala frame (`.dna-card`, `.pf-c-hero`)

The Music DNA picture (D-048, D-052) is a decorative canvas (`aria-hidden`); the `figure` is named by its heading or caption (session 18 fix 2), and a visually hidden list names the genres and artists. Frame: `radius.card` 12, 1 px `border.strong`, `bg.surface` with a faint Coral radial glow, `--dna-frame-shadow` (an inset light top edge and a soft drop). Widths: member card 36 rem max, profile hero 48 rem max (desktop, D-080). Edit: a real small secondary button in the hero's corner ("Uredi Music DNA", 44 px). The helix stays alive and stops with reduced motion; it keeps its colours in forced colours, like an image.

## 5. Component tokens (new in 3.6)

Added to `design/tokens/tokens.json` as a layer above the base tokens. Values equal what the prototype already used, so nothing moved; the prototype now reads them. Generated names: `--gr-<group>-<name>`.

| Group | Tokens |
|---|---|
| `opacity` | `disabled` 0.45 (replaces 0.3, 0.35, 0.45, 0.55 and 0.6 used before) |
| `button` | `height` 44 (= `size.target.min`), `height-sm` 36, `height-cta` 52, `padding-x` 16, `padding-x-sm` 12, `padding-x-cta` 32, `gap` 8, `radius` 10, `radius-cta` pill |
| `field` | `height` 44, `padding-x` 12, `textarea-min` 6 rem, `radius` 10, `border` 1, `border-invalid` 2 |
| `chip` | `height` 40, `padding-x` 12, `segment-height` 36, `radius` pill |
| `avatar` | `xxs` 22, `xs` 26, `sm` 32, `md` 40, `lg` 72, `xl` 96, `ring` 2 |
| `switch` | `width` 52, `height` 32, `knob` 20 |
| `bar` | `top` 56, `top-expanded` 64, `tab` 60, `rail-collapsed` 80, `rail` 15 rem, `rail-full` 16 rem, `dock-field` 48 |
| `list` | `row` 56 |
| `overlay` | `sheet-max` 30 rem, `sheet-compose-max` 36 rem, `dialog-max` 26 rem, `padding` 20 |
| `toast` | `duration` 2000 ms, `duration-action` 5000 ms (not affected by reduced motion) |
| `color.state` | `danger-bg-hover` (= `tint.coral-16`); Coral on it 4.88:1, pair added |
| `breakpoint` | `full` 1600 px (documents the session 17 Full HD step) |

Coarse-pointer sizes (44 px chips and small buttons, 40 px segments, 56 × 36 switch) are media-query values, documented on each token.

## 6. Changes made to the prototype in 3.6

1. **Component tokens** wired into `style.css` (buttons, fields, chips, segments, switch, avatars, bars, rail widths, sheet and dialog widths). Same values.
2. **Selected shapes (tokens.md rule 1, session 18 note):** the segmented radio row (sort, Activity filter, follower list tabs) shows a short bar under the checked label, and the chosen day in the Hub's day strip a bar under the number. CSS only. A tick was tried first and rejected: it widened the row so the sort options no longer fit one row at 320 and 360 px (D-047; caught by `pulse-smoke.mjs`).
3. **Forced colours:** selected chips, segments, days, reactions and choice cards use `Highlight` for the border, the tick or bar, and the choice mark; disabled buttons `GrayText`.
4. **Missing states:** `.btn-secondary:active`, `.btn-danger:hover/:active` (new `state.danger-bg-hover`), disabled primary and secondary keep their fill (no hover on disabled), `aria-disabled` buttons look disabled, disabled inputs and switches.
5. **One disabled opacity** (`opacity.disabled`) across buttons, chips, results, the DNA editor's move buttons, read-only settings groups.
6. **Reaction uses semantic tokens** (`selected.border`, `text.accent`) instead of the `ember.coral` primitive.
7. **Forced-colour focus on hidden radios:** the segmented row, choice cards and the visibility rows showed their focus only as a box-shadow ring, which forced colours remove, while the radio itself is a 1 px invisible box. The visible part now takes a 2 px `CanvasText` outline. (Session 18 ran the forced-colour pass without the Tab walk, so it did not catch this.)
8. **Focus not obscured (2.4.11):** `scroll-padding` on `html` for the sticky top bar and the bottom bars.

## 7. Icons (OQ-23, CONFIRMED D-057: Phosphor, light weight)

- Sizes `size.icon.sm` 16, `md` 20, `lg` 24; `currentColor`; always `aria-hidden` with the name in text or `aria-label`.
- The prototype mixes 33 Phosphor light icons (`picons.js`) with 29 provisional stroke icons drawn for the sketches (`icons.js`). In Phase 4 the product uses Phosphor only (install needs owner approval, CLAUDE.md). RECOMMENDED mapping for the provisional set:

| Prototype | Phosphor (light) | Prototype | Phosphor (light) |
|---|---|---|---|
| back | `caret-left` | search | `magnifying-glass` |
| check | `check` | alert | `warning-circle` |
| home | `house` | info | `info` |
| hub | `chat-centered-text` | edit | `pencil-simple` |
| bell | `bell` | trash | `trash` |
| user | `user` | comment | `chat-circle` |
| users | `users` | share | `export` |
| globe | `globe-hemisphere-east` | external | `arrow-square-out` |
| lock | `lock-simple` | arrow | `arrow-right` |
| more | `dots-three` | chevron | `caret-right` |
| x | `x` | clock | `clock` |
| plus | `plus` | send | `paper-plane-right` |
| mutual | `arrows-left-right` | offline | `wifi-slash` |
| userplus | `user-plus` | userminus | `user-minus` |
| pulse | `pulse` | | |

- **Not Phosphor, by design:** the reaction wave (D-056), the wordmark bolt (D-058), the Rift Pulse symbol and all motif art.

## 8. Verification (session 19)

- `node design/tokens/build.mjs`: 180 variables, 3 reduced-motion overrides.
- `node design/tokens/contrast-check.mjs --all-options --report design/tokens/contrast-report.md`: base 89/89 pass; all 19 scenarios pass.
- Prototype suites after the changes (2026-11-04): `pulse-smoke.mjs` 146/146, `smoke.mjs` 3/3, `zoom-check.mjs` 123/123 at 200 %, `a11y-check.mjs` 123/123 at 360×740 and 1366×800, and with `--fc` at 360×740 (with the Tab walk) and 1366×800 (`--no-keys`). All exit 0.
- The specimen was checked in headless Chrome (screenshots at 1366 px, forced colours emulated) and has no console errors.

## 9. Open and deferred

- **For 3.8 (copy):** the busy-button labels ("Objavljujem…", "Spremam…"), the at-limit reasons for chips, the empty-state sentences as one set.
- **For 3.9:** an independent review of this spec against WCAG 2.2 AA; the Narrator script in `accessibility-pass.md` §3 now also covers the segment ticks.
- **Phase 4 (DEFERRED):** the component library itself (framework components from this contract), the icon package install (approval), automated accessibility checks in CI, the DTCG 2025.10 format question (tokens.md §1).
- **Not in this spec:** DMs, playlists, media and other beta waves; their components are specified when those waves are designed.
