# SPEC verdict — SECONDARY-SURFACES-001 (code 07600536)

PASS.

Diff vs card intent:
- .empty: dashed 1px -> 1px solid --line-strong, keeps radius/surface fill, + box-shadow var(--shadow). Solid card treatment. OK.
- .progress-zero: 2px dashed var(--line) -> 1px solid var(--line), + surface fill + shadow; comment updated dashed->solid. OK.
- My Words form: all four <input> (mine-surface, mine-reading, mine-gloss, mine-source) gain type="text" (id before type, attribute order preserved). OK.
- .btn:disabled: 0.45 opacity -> opacity 1, ink-soft -> ink-faint, line -> line-strong, sunk fill kept, not-allowed kept. OK.
- Progress-feel contract (progress-feel.test.tsx): only the .progress-zero pin flipped from dashed to solid-card pin (adds not.toContain("dashed") + box-shadow assertion). No other assertions touched. OK.
- In-scope additions explicitly planned and filed in notes/ROADMAP acceptance: .field > label 0.85rem top margin (first-of-type flush) and input[type="text"] focus halo (3px accent-soft, outline-offset 0). Documented in state/notes/SECONDARY-SURFACES-001.md. OK.

No out-of-scope additions; no omissions. tsc clean modulo one pre-existing untracked serve-pairing.test.tsx (not part of this lane). Touched contracts green: progress-feel, mywords-feel, settings-feel, mobile-audit, rtl-direction = 60/60.
