# Phase 3 closing review (step 3.9)

_2026-11-05, session 21. Closes the open accessibility items of steps 3.5 to 3.8 and records the checks that Phase 3 acceptance rests on (roadmap: "owner approves the IA, prototypes and tokens; the accessibility contrast checks pass"). Decision page for the owner: `design/prototypes/pulse/review39.html` (D-085)._

## 1. Method

1. **Every check rerun** on the refined prototype `design/prototypes/pulse/` and the tokens. Each of these is a zero-dependency Node script driving headless Chrome (§2).
2. **An independent review** by a subagent working read-only, against WCAG 2.2 AA. It had no access to the main session's conclusions and was asked to look where the scripts are weak: the WCAG 2.2 additions (2.4.11, 2.5.7, 2.5.8, 3.2.6, 3.3.7, 3.3.8), status messages and timing, error suggestion, label in name, reflow, text spacing, non-text contrast, and UX dead ends. It ran its own CDP probes:
   - reflow and target size at 320×640
   - the 1.4.12 text-spacing override
   - real Tab walks with overlap and ring-clipping detection at 360×740, 1366×800 and 180×370 (200 % zoom)
   - label in name, endless animations
   - screenshots
3. **The main session verified every finding** (screenshots and code) before acting.
4. **Its own extra check of D-073:** it measured heading and body sizes at 100 %, at 200 % browser zoom (viewport halved, device pixel ratio 2) and at a 200 % browser text size, on all screens.
5. **Owner decisions** where a finding touched an earlier decision (D-085).

## 2. Results (after the fixes)

All suites exit 0. The screen list `design/prototypes/tools/screens.mjs` now has 128 screens: 123 plus the five option screens of D-085.

| Check | Result |
|---|---|
| `design/tokens/contrast-check.mjs` | 89 pairs, 0 failing; tightest margin ×1.08 of the minimum |
| `pulse-smoke.mjs` | 155/155. The previous 146, plus seven step 3.9 runs (focus after mute and Undo, the toast that waits while focused, the verified bubble, the capped list option, the pause option, a spaced code with Enter, the reset address) and two D-086 page runs. Older runs were updated to the new decisions: the empty-address reset, the settings list as a flex column, the display name (three words, as typed), the four "Kako radi" cards and the wall. |
| `smoke.mjs` (`directions/`) | 3/3 |
| `zoom-check.mjs` | 128/128 at a 200 % text size (360×740); 128/128 at 100 % at 320×568; 128/128 at 100 % at 1366×800 |
| `a11y-check.mjs` | 128/128 at 360×740, 800×800, 1366×800 and 1920×1080, each with and without forced colours, all with the Tab walk |
| Page zoom 200 % (session script) | Every text element reaches 200 % on every screen, after fix 11 below; before it, the invite and "Kako radi" reached 161–187 % on short windows |

The exact commands are in §6.

## 3. Findings and what was done

Severity as the reviewer graded it; **all items verified** by the main session.

| # | Finding (WCAG) | Severity | Done |
|---|---|---|---|
| 1 | Desktop settings list: the open row's Coral bar replaced the focus ring, so focus and "open" looked the same (2.4.7) | Major | Fixed: both show; forced colours use a double `CanvasText` outline on the focused open row |
| 2 | Rows in rounded settings groups: `overflow: hidden` cut the outside ring to one line between two rows (2.4.7) | Major | Fixed: inset ring; same for the photo-strip remove buttons |
| 3 | After mute, focus jumped to an off-screen `h1`; the 5 s Undo was out of keyboard reach and closing it dropped focus to the body (2.4.3, 2.2.1) | Major | Fixed: focus on the collapsed line, Undo returns it to the answer, the toast never closes while focused or hovered, Back returns focus to the opener (components §3.2, §4.9) |
| 4 | 2 s toasts were the only home of some explanations and errors (4.1.3, 2.2.1) | Major | Fixed: the verified mark opens a bubble that stays (D-086); unavailable choice with its reason; the artist limit is also read out; the disabled "ukloni" points at its reason. The three-word name limit keeps its help line (D-085) |
| 5 | The hard visitor wall is a 5 s time limit (2.2.1, level A) and hides the legal and DSA links | Major | **Owner: no wall (D-085)** |
| 6 | Motion before sign-in cannot be stopped in the page (2.2.2, level A) | Minor/Major | **Owner: system setting only, risk accepted (D-085)**; the pause button and the 5 s rest stay as prototype options |
| 7 | "N novih odgovora" appeared without an announcement (4.1.3) | Minor | Fixed: `#sr-live` |
| 8 | Photo crop promised a finger drag only (2.5.7, 2.1.1) | Minor | Specified: arrow buttons and arrow keys (components §6a); help text updated |
| 9 | A pasted "123 456" was cut to "123 45" (3.3.8) | Minor | Fixed |
| 10 | Enter did nothing in credential fields; spec says Enter submits | Minor | Emulated in the prototype; Phase 4 uses real `<form>`s (components §4.2) |
| 11 | Browser zoom 200 %: the invite and "Kako radi" shrank text on short windows (1.4.4) | Minor | Fixed: the "fits one screen" rules run only on phone screens in portrait. **Found by the main session**, not the reviewer |
| 12 | The address typed at sign-in was not carried to the reset (3.3.7); a malformed address got "Upiši adresu" (3.3.3) | Minor | Fixed |
| 13 | The page `h1` in the top bar cut with an ellipsis under text spacing (1.4.12) | Minor | Fixed: it wraps |
| 14 | Desktop settings list: the status pill overlapped the first group heading; the "Smanji pokrete" icon was offset | Minor | Fixed |
| 15 | Same-name buttons in lists ("Odblokiraj", "Poništi", "Prikaži") | Note | Fixed: the name or the muted item is part of the accessible name |
| 16 | The day strip's name did not start with the visible "danas" (2.5.3) | Note | Fixed |
| 17 | The countdown's screen-reader sentence went stale, nothing at zero | Note | Fixed: it follows the clock (not a live region); "Stiže svakog trena." at zero |
| 18 | Display name: automatic capitals and the three-word limit change real names | Note (inclusion) | **Owner: three words, as typed (D-085)** |
| 19 | Going private silently changed the lists setting and did not restore it | Note | Fixed: the option is disabled with its reason, and the earlier choice comes back |
| 20 | The settings password change had no "Prikaži" | Note | Fixed |

**Checked and fine (reviewer):**
- No sideways scrolling at 320 px.
- Targets meet 2.5.8; only inline sentence links are smaller, and they are exempt.
- No focused control fully hidden by a sticky bar (2.4.11) at 360, 1366 and 180×370.
- Token contrast spot checks agree with the script.
- Label in name holds everywhere except the day strip (fixed).
- Swipe is an extra path only.
- Authentication: autocomplete everywhere, no CAPTCHA, paste allowed.
- Form errors set `aria-invalid` and `aria-describedby` and move focus.
- The countdown digits are `aria-hidden` with one sentence for screen readers.
- The wordmark flicker stays below the three-flashes threshold.
- Reduced motion is honoured by every animation.

## 4. The open items from steps 3.5 to 3.8

- **Large-text headings (D-073): confirmed compliant.**
  - WCAG 1.4.4 asks that text *can* be resized to 200 %. Browser zoom is a sufficient technique (G142).
  - With zoom every text element, headings included, now reaches 200 % on all 128 screens (after fix 11).
  - With the separate text-size setting, body text reaches 200 % and headings grow by a step, as decided. That goes beyond the criterion and is not required by it.
  - Risk 7 in STATUS is closed.
- **Visitor sign-in wall (D-076): replaced by "no wall" (D-085).** Risk 8 in STATUS is closed. Counsel item C.9 keeps only the onboarding visibility question.
- **First-Drop countdown (D-078):** reduced motion shows minutes only, once a minute. There is no live region, so Narrator does not read the ticks. The sentence for screen readers is now current. The 2.2.2 mechanism is the "Smanji pokrete" setting (signed in) or the system setting.
- **Hidden radios in forced colours (session 19 lesson):** `a11y-check` checks the visible box that carries the ring (since 3.6); clean at all four widths.
- **Owner's ten-minute Narrator listen** (`accessibility-pass.md` §3): still the owner's, whenever convenient. Anything that sounds wrong becomes a Phase 4 item.
- **Real screen readers** (VoiceOver, TalkBack, NVDA) are tested on the built app in Phase 5 (roadmap: WCAG 2.2 AA audit of alpha screens).

## 5. Accepted risks and Phase 4 notes

- **WCAG 2.2.2 before sign-in** (D-085): accepted by the owner. If an auditor disagrees, the pause button (`?smo=b`) is designed and ready.
- **Owner changes made in the same session (D-086):** the lead Daily Drop card on "Kako radi" with its drawn tile (the rift and bolt every 3 s, stops with reduced motion), the reminder default 12:00, the verified bubble.
- **Phase 4 must keep these:**
  - real `<form>` elements for credentials
  - the focus rules of components §3.2
  - toasts that wait while focused
  - no information that lives only in a toast
  - the crop's non-drag controls
  - one polite live region for unrequested changes
  - inset focus rings inside clipped groups
  - no viewport-height rules that shrink text
- The prototype keeps the rejected options as URL switches (`?wall=soft|hard`, `?smo=b|c`, `?nm=a|b`), as every earlier round did.

## 6. How to rerun

```
node design/tokens/contrast-check.mjs
node design/prototypes/tools/pulse-smoke.mjs          # ONLY=<text> runs matching runs only
node design/prototypes/tools/smoke.mjs
node design/prototypes/tools/zoom-check.mjs            # 200 % text at 360x740
node design/prototypes/tools/zoom-check.mjs --scale=1 --w=320 --h=568
node design/prototypes/tools/zoom-check.mjs --scale=1 --w=1366 --h=800
node design/prototypes/tools/a11y-check.mjs [--fc] --w=360|800|1366|1920 --h=740|800|800|1080
```

Two runs can go side by side with `PORT=<n>` (new in 3.9; each script otherwise uses its own fixed port).
