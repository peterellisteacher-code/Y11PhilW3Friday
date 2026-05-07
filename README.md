# The Argument Operating Theatre

Phaser 3 web game for SACE Stage 1 Philosophy — Standard Form / Argument Analysis unit.

Designed to run alongside the three lesson decks across the unit, accumulating evidence in pods over multiple sessions, with a final vault unlock at the end of Lesson 3.

---

## Quick start

### Run locally

```bash
cd "Tribunal game"
python -m http.server 8770
```

Then open http://localhost:8770/ in any modern browser (Chrome, Edge, Firefox, Safari).

### Deploy to a school webserver

The whole thing is static HTML + JS + assets. Copy the `Tribunal game/` folder onto any web host that can serve static files. No build step. No backend.

If you want pods to be able to share saves across devices, the URL-hash export feature works on any HTTPS host.

---

## How pods play

1. Open the URL.
2. Type a 4-letter pod code (e.g. `AQUA`, `BOLD`, `CALM`, `FIRE`, `GROW`, `HOPE`).
3. New pods choose a surgical-instrument badge (Scalpel / Syringe / Microscope / Clipboard).
4. The hub shows three lesson doors. Pods can play L1, L2, L3 in any order — no sequential lock, so absent pods can catch up.
5. Each completed lesson reveals one digit + adds 2 evidence cards to the dossier.
6. After all 3 lessons, the vault unlocks. Pods enter their 3 digits to receive the certificate + physical prize bridge.

---

## Teacher master key

Each pod's combination digits are derived from their pod code letters (alphabetical position mod 10):

| Letter | A | B | C | D | E | F | G | H | I | J | K | L | M | N | O | P | Q | R | S | T | U | V | W | X | Y | Z |
|--------|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Digit  | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 0 | 1 | 2 | 3 | 4 | 5 | 6 |

The lesson digit comes from the pod code's letter at that position:
- L1 digit: position 0 (first letter)
- L2 digit: position 1 (second letter)
- L3 digit: position 2 (third letter)
- Position 3 is unused (the 4th letter is just for pod identity).

**Examples:**
- `AQUA` → 1·7·1
- `BOLD` → 2·5·2
- `CALM` → 3·1·2
- `FIRE` → 6·9·8
- `GROW` → 7·8·5
- `HOPE` → 8·5·6

You can compute any pod's digits mentally in seconds. There's also a console helper: `StateManager.teacherMasterDigits('AQUA')` returns `'1-7-1'`.

---

## Catch-up & resilience

- **Browser refresh** — state restores from localStorage automatically.
- **Different computer** — pod presses `E` (or clicks "EXPORT SAVE LINK") on the hub to get a shareable URL. Pasting the URL on another device restores their state.
- **Lost session** — pods can re-type their pod code. Their existing state loads. Anti-cheat: completed lessons can't be re-played for a higher digit.
- **No pod is locked out** — all 3 lesson doors are open from the start. A pod absent for L2 can still attempt it later, or skip ahead to L3 if the class moves on.

---

## Architecture

```
Tribunal game/
├── index.html              ← entry point: Phaser CDN + scene registry + a11y scaffold
├── README.md               ← this file
├── src/
│   ├── core/
│   │   ├── constants.js    ← COLORS, FONTS, LESSONS, GAME_DIM, PREFERS_REDUCED_MOTION
│   │   └── event-bus.js    ← pub/sub + announce() screen-reader helper
│   ├── state.js            ← localStorage + URL-hash export/import, per-pod digit derivation
│   ├── boot.js             ← BootScene — preload assets, hash import
│   ├── pod-login.js        ← PodLoginScene — 4-letter code + badge selection
│   ├── hub.js              ← HubScene — dossier, lesson doors, combination lock
│   ├── l1-scene.js         ← L1Scene — Standard Form Reconstruction (3 cases)
│   ├── l2-scene.js         ← L2Scene — Validity Court (3 questions)
│   ├── l3-scene.js         ← L3Scene — Op-Ed Autopsy (3 questions)
│   └── final-reveal.js     ← FinalRevealScene — vault unlock + certificate
└── assets/
    └── images/
        ├── hub_chamber.webp     ← fal.ai recraft v3 illustrations (1820×1024)
        ├── chamber_l1.webp
        ├── chamber_l2.webp
        ├── chamber_l3.webp
        ├── vault_locked.webp
        ├── vault_unlocked.webp
        └── sprites/             ← Retro Diffusion pixel art
            ├── badge_*.png
            ├── evidence_*.png
            └── stamp_*.png
```

---

## Accessibility

- All interactive elements are real `<button>` / `<input>` DOM elements layered over the Phaser canvas (canvas itself is opaque to screen readers).
- Two `aria-live` regions in `index.html` announce state changes (login, lesson advance, evidence earned, vault unlocked).
- All keyboard shortcuts:
  - **PodLoginScene:** A–Z type pod code, Backspace, Enter to submit, Arrow keys to navigate badge selection
  - **HubScene:** `1` / `2` / `3` to enter lessons, `V` to open vault (if unlocked), `E` to export save URL
  - **Lesson scenes:** Tab/Enter on buttons, plus per-scene number-key shortcuts
- `prefers-reduced-motion` is respected — flashes, shakes, large tweens are gated off.
- Canvas has an `aria-label` describing the play area.

---

## Cost & art pipeline

- **6 backgrounds** generated by fal.ai recraft v3 text-to-image — ~$0.24 total
- **18 sprites** generated by Retro Diffusion (RD_FAST + RD_PRO mix) — ~$0.72 total
- **Combined: ~$0.96** (under the $1.50 ceiling)

To regenerate, see `Tribunal game/assets/images/sprites/manifest.json` for the exact prompts used.

---

## Dev shortcuts

For testing without playing through every question:
- In any L1/L2/L3 scene, press `D` to instantly mark that lesson complete and return to the hub.
- The pod state is namespaced — typing a different pod code creates a fresh save slot.
- To wipe all saves: `localStorage.clear()` in browser console.

---

## Known limitations

- The pod's letter-derived digits mean two pods with similar codes share digits. Not a problem in practice (each pod's full code is unique), but if you want truly random per-pod digits, edit `digitForLesson()` in `state.js`.
- No audio yet — the operating-theatre vibe could use ambient hospital ambience + brass clangs. Future enhancement.
- The exemplar argument shown after vault unlock is hard-coded (a climate-change syllogism). Could be swapped for a topical argument each year.
- No AI-feedback panel was built — would need a CORS proxy or teacher-supplied API key, judged not worth the bloat for a 6-pod class.

---

## Build provenance

Built 2026-05-04 / 2026-05-05 via Claude Code orchestration:
- Phase A/B (architecture + hub + login) by Opus
- Phase C (3 lesson scenes) by 3 parallel Sonnet agents
- Phase D (final reveal) by Sonnet agent
- Phase E (art generation) by fal.ai + Retro Diffusion via pixel-art-orchestrator agent

Total session cost (estimated): ~$5–8 in tokens + ~$1 in image generation.

Source spec: `../HANDOVER - Argument Operating Theatre Game.md`.
