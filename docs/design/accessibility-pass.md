# Accessibility pass of the refined prototype (step 3.5, session 18)

_2026-11-04. Closes the last two items of the step 3.5 list in `prototype-directions.md` §6: the screen reader pass and the Windows high-contrast check. The full accessibility review of the design (WCAG 2.2 AA, every known risk) is step 3.9; this pass checks the prototype as built._

## 1. What was checked and how

Narrator reads what Chrome exposes in its accessibility tree, so the pass reads that tree over the DevTools protocol and walks every screen with real Tab key presses. The tool is `design/prototypes/tools/a11y-check.mjs` (Node 22, headless Chrome, no dependencies, offline); the screen list is shared with `zoom-check.mjs` in `tools/screens.mjs` (123 screens: onboarding, the signed-in app, every settings sub-screen, the key states, rounds 12a to 12d).

For each screen, at 360×740 (phone), 800×800 (collapsed rail), 1366×800 (rail with labels, two columns) and 1920×1080 (Full HD):

| Area | Checks |
|---|---|
| Structure | `lang` on `<html>`; exactly one `main` and one visible `h1`; no skipped heading levels in reading order; every visible `nav` has a label and no two share one; unique ids; `aria-labelledby`, `aria-describedby`, `aria-controls` and `aria-owns` point at ids that exist; no `tabindex` above 0; nothing focusable under `aria-hidden`; every field has a label; only known ARIA roles; an open dialog has `aria-modal`, the shell behind it is `inert` and focus is inside it |
| Names (the accessibility tree) | every focusable or interactive node (button, link, field, checkbox, radio, switch, tab, menu item, slider, option) has a non-empty accessible name; every image, dialog, heading, figure, progress bar and region has a name; no name is only symbols |
| Keyboard | the skip link is the first tab stop; every tab stop is visible, matches `:focus-visible` and shows a ring (the element's own box-shadow or outline, the underline on a heading, or the ring on the card that carries a radio); while a sheet or dialog is open, focus starts inside it and Tab never leaves it; the tab order follows the reading order (a jump back up the page is a finding; a new column to the right is not) |
| Forced colours (`--fc`) | Windows high contrast emulated (`forced-colors: active`, dark scheme): the page switches to system colours; no visible text matches its background; the current tab or rail item differs from its siblings; a switch shows its knob and its on state; SVG shapes with a hard-coded colour are listed. With `--shots`, a screenshot per screen for a look |

The forced-colour screenshots (the top and, where the page scrolls, the bottom of every screen, at 360 px and at 1366 px) were reviewed by eye as contact sheets. Reduced motion is emulated throughout so the walk is deterministic.

## 2. Findings and what was done

Everything below is fixed in `pulse/`; the checks now pass on all 123 screens at every width listed above, with and without forced colours.

| # | Finding | Fix |
|---|---|---|
| 1 | The account step's password field pointed `aria-describedby` at `pw-need`, which only exists once the member has typed (the rule line). A screen reader sees a dangling reference. | `pwDesc()` adds the id only while the line is rendered (three callers: account, reset, password change). |
| 2 | Four `figure` elements with no name: the Spirala on Done, on the own profile (hero and the profile b/legacy layouts) and on other members' profiles. Narrator says only "figure". | `aria-labelledby` the section heading ("Music DNA", "Tvoj Music DNA"); the hero, which has no heading above it, gets `aria-label="Music DNA"`. The sr-only genre list stays as the content. |
| 3 | The in-shell "Nešto je pošlo po zlu" block (SYS-02 a and c) added a second `h1` on screens whose top bar already carries the page's `h1` (Hub, Activity, lists). | `failBody(bare, h)`: an `h2` when the shell keeps a top-bar `h1`, otherwise `h1`. |
| 4 | **Forced colours: the current tab (tab bar) and the current rail item looked exactly like the others.** The mark is a bar and a colour in Ember Coral; forced colours turn the colour into Canvas, so the mark vanished. The existing forced-colour rule was earlier in the file than the desktop rules and lost the cascade. | A forced-colours block at the end of `style.css`: the current item and its bar take `Highlight`. |
| 5 | **Forced colours: every switch looked the same, on or off, and the knob was invisible** (the knob and the on state are Ember colours). | The knob is `ButtonText`, the border `ButtonText`; on: knob and border `Highlight`. The knob still moves. |
| 6 | Forced colours: the open row in the desktop settings list had a `Highlight` outline, but the rounded group clips it, so it did not show. | The outline is inset (`outline-offset: -2px`) and the row text is `Highlight`. |
| 7 | Forced colours: loading skeletons became solid `GrayText` bars (bright green in the Windows "High contrast black" theme). Correct but loud. | Skeleton lines are `Canvas` with a `GrayText` hairline. |

Noted, not changed:
- In the "High contrast black" theme, disabled buttons are green (`GrayText`) and the `summary` disclosures ("Usporedi sve razlike", "Što šaljemo uz poruku") are yellow (`LinkText`). These are the system's colours and are expected.
- The Spirala, the invite current and the dock orbit keep their own colours (`forced-color-adjust: none`), as images do. The sr-only genre list is the text alternative.
- Selected sort chips, day chips and the follows tabs rely on a thicker border in forced colours. Visible; the tick inside selected genre chips is clearer. A candidate for 3.6 (component spec: every selected state gets a shape, not only a colour or weight).
- The native checkbox and the crop slider take the system `Highlight`.

## 3. Narrator pass by the owner (manual, about ten minutes)

The tool checks what Narrator receives, not how it sounds. The owner can confirm the reading in Windows Narrator (Win + Ctrl + Enter) on `design/prototypes/pulse/index.html` in Chrome or Edge. What to listen for:

1. **Invite → account:** `?at=account`. Tab from the top: "Preskoči na sadržaj, link", then the back button, then the fields. Narrator should read "E-pošta, uređivanje" with the help line "Pozivnica je vezana uz ovu adresu", and for the password the rule line only after typing. Press Enter on the skip link: focus lands on the page content.
2. **Genres:** `?at=dna`. Each genre is a toggle button ("Pop, button, not pressed"); picking one says "pressed". The counter line ("x od 10") is a polite live region, read after a short pause.
3. **Visibility cards:** `?at=visibility`. Arrow keys move between "Javno" and "Privatno" radio buttons; the summary of what each means is read as the description.
4. **Home:** `?flow=drop&at=home`. Heading navigation (H) goes "Početna" (h1, visually hidden) → "Daily Drop" → the question → "Od ljudi koje pratiš" → "Prethodni Daily Dropovi". The tab bar is "Glavna navigacija" with "Početna, current page".
5. **Compose sheet:** on the question page press "Napiši svoj odgovor". Narrator announces the dialog "Tvoj odgovor"; Tab cycles inside it only; Escape closes it and focus returns to the dock.
6. **Settings → Notifications:** each row is "Komentari na moje odgovore, switch, on/off" with its description. The time field is a combo box.
7. **Report sheet:** on an answer menu, "Prijavi". The three steps read as a dialog with a step counter; the chosen category is read on step 2.
8. **Toasts:** mute someone from a profile menu. The toast ("Utišano …, Poništi") is a status region: read without stealing focus.
9. **Desktop (1366 px or wider):** the rail is "Glavna navigacija" with the same four items plus "Postavke" and "Pomoć"; on a settings sub-screen the list on the left is a second navigation "Postavke" with the open row "current page".

If any step sounds wrong, note the screen and the exact words; it goes into 3.9.

## 4. For step 3.9 (the accessibility review of the design)

_Done in session 21: each item below is answered in [`phase-3-review.md`](phase-3-review.md) §4 (D-085)._

- The countdown with seconds before the first Drop (D-078): the reduced-motion variant updates once a minute; confirm the live-region behaviour so Narrator does not read every second.
- The visitor sign-in wall (D-076): an undismissable dialog after five seconds; a screen reader user hears it mid-reading. Recorded as risk 8 in STATUS.
- Large text: headings grow by a step, not to 200 % (D-073, owner accepted).
- Selected states that rely on border weight in forced colours (sort chips, day chips, follows tabs): give them a shape in the 3.6 component spec.
- Copy: "Dodirni spiralu" is aria-hidden; the sr-only alternative lists genres and artists. Keep that pairing in 3.8.
- The real screen readers on the alpha stack (VoiceOver on iOS, TalkBack on Android, NVDA) are tested on the built app, not the prototype.

## 5. How to run

```
node design/prototypes/tools/a11y-check.mjs                       # 360×740, structure, names, keyboard
node design/prototypes/tools/a11y-check.mjs --w=1366 --h=800      # desktop
node design/prototypes/tools/a11y-check.mjs --fc --no-keys --w=1366 --h=800 --shots=<dir outside the repo>
node design/prototypes/tools/a11y-check.mjs "flow=drop&at=home"   # one screen
```

Exit code 1 on any finding. Do not run it at the same time as `pulse-smoke.mjs` or `zoom-check.mjs`; the suites share headless Chrome and the second one hangs.

## 6. Follow-up in step 3.6 (session 19)

The forced-colour runs above used `--no-keys`, so the Tab walk never ran with forced colours on. Step 3.6 found by hand that the visually hidden radios (the sort row, choice cards, the visibility rows) lost their focus ring there: the ring is a `box-shadow` on the visible box, which forced colours remove, and the 1 px input's own outline cannot be seen. Fixed in `pulse/style.css` (a `CanvasText` outline on the visible part, `components.md` §6). `a11y-check.mjs` now ignores the own ring of a 1 px or transparent input and looks for it on the visible box (`.choice`, `.vis-opt`, `.vrow`, the `.sort` pill), so `--fc` with the Tab walk (no `--no-keys`) catches this kind of loss.
