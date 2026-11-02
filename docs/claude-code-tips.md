# Claude Code tips for the owner

_Checked against the official Claude Code docs on 2026-11-02 (session 11). Settings may change with new versions._

## Shorter output in the terminal
There is no setting that limits edit diffs to a set number of lines. These come closest:

| What | How | Effect |
|---|---|---|
| Fullscreen renderer | `/tui fullscreen` (back: `/tui default`) | Tool results are collapsed. Click one to open it, click again to close it. |
| Focus view | `/focus` (run again to turn off; fullscreen only) | Only your last message, one line per tool call with the edit counts (for example "+3 −1"), and the final answer. Persists across sessions. |
| Verbose output | `/config` → "Verbose output" | Off: truncated summaries. On: full tool output. |
| Full transcript | `Ctrl+O` (again to close) | Every tool call in full, with times. In the classic renderer `Ctrl+E` shows all inside it. |
| All changes so far | `/diff` | Changed files with added and removed lines; open one to see its diff. |

- Windows: if fullscreen leaves stale text on screen, set `CLAUDE_CODE_ALT_SCREEN_FULL_REPAINT=1` before starting Claude Code.
- To ask Anthropic for "first 5 lines, then expand", use `/feedback`.

Sources: [settings](https://code.claude.com/docs/en/settings-reference), [fullscreen](https://code.claude.com/docs/en/fullscreen), [interactive mode](https://code.claude.com/docs/en/interactive-mode), [keybindings](https://code.claude.com/docs/en/keybindings).
