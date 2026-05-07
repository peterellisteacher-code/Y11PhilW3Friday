# The Argument Operating Theatre — Teacher Guide

A 3-lesson companion game for the SACE Stage 1 Philosophy unit on Standard Form / Argument Analysis. Pods of students play across L1/L2/L3, earning a digit per lesson, then enter their three-digit master combination at the vault.

---

## Overview

| | |
|---|---|
| **Subject** | SACE Stage 1 Philosophy |
| **Unit** | Standard Form / Argument Analysis |
| **Leads to** | Folio Task 2 — Standard Form Test |
| **Format** | Browser-based Phaser 3 game (no install) |
| **Time per lesson** | ~10 minutes at the end of class |
| **Group size** | 2–4 students per pod (8 pods recommended) |
| **Devices** | One laptop or desktop per pod, Chrome preferred |

The game frames each lesson's content as a "patient" in an operating-theatre — students reconstruct, evaluate, or autopsy arguments. Each chamber yields one digit. When the class has played all three lessons, pods take their pod card to the vault scene and enter their three-digit master combination.

---

## Setup

The game is a static site — no install or build step.

1. Open a terminal in the `Tribunal game/` folder.
2. Run:
   ```
   python -m http.server 8770
   ```
3. On each pod's device, open Chrome and navigate to:
   ```
   http://localhost:8770/
   ```
   (Or substitute your machine's IP if pods are on separate devices.)

If a student opens the file directly via double-click (`file://` protocol), the game shows a clear instruction screen telling them to use the http.server. Images do not load over `file://`.

---

## Pod codes — assignment

Each pod gets a pre-assigned 4-letter code on a printable pod card. Students do **not** invent their own. The first three letters of the code determine the pod's master combination via **letter-position-mod-10** (A=1, B=2, ..., I=9, J=0, K=1, ..., Z=6).

### Suggested 8 codes

| Pod | Master combo | L1 | L2 | L3 |
|-----|--------------|----|----|----|
| AQUA | 1-7-1 | A=1 | Q=17→7 | U=21→1 |
| BOLD | 2-5-2 | B=2 | O=15→5 | L=12→2 |
| CALM | 3-1-2 | C=3 | A=1 | L=12→2 |
| FIRE | 6-9-8 | F=6 | I=9 | R=18→8 |
| GROW | 7-8-5 | G=7 | R=18→8 | O=15→5 |
| HOPE | 8-5-6 | H=8 | O=15→5 | P=16→6 |
| IRIS | 9-8-9 | I=9 | R=18→8 | I=9 |
| JADE | 0-1-4 | J=10→0 | A=1 | D=4 |

All eight codes have **distinct first letters** (so each pod's L1 digit is unique). L2 and L3 digits may collide across pods — that's fine because each pod's combination is computed from their own code.

### Adding more codes

Pick a 4-letter word and avoid duplicating an existing pod's first letter (so L1 digit announcements are unambiguous). The fourth letter is unused — only positions 0, 1, 2 contribute digits.

### Mental computation cheat-sheet

```
Position 1–9 → A=1, B=2, …, I=9
Position 10  → J=0
Position 11+ → K=1, L=2, M=3, N=4, O=5, P=6, Q=7, R=8, S=9
Position 20+ → T=0, U=1, V=2, W=3, X=4, Y=5, Z=6
```

To compute any pod's combo, look at letters 1, 2, 3 and read their digits off the table above.

### Printable pod cards

Until a designed PDF lands, hand-write the codes on index cards:

```
┌──────────────────────────┐
│   POD: AQUA              │
│                          │
│   Open the game and      │
│   enter A · Q · U · A    │
│                          │
│   Choose your role:      │
│   • SCALPEL (analysis)   │
│   • SYRINGE (insertion)  │
│   • MICROSCOPE (review)  │
│   • CLIPBOARD (record)   │
└──────────────────────────┘
```

---

## Classroom flow

The game runs **alongside** the unit, not in place of it. Each lesson teaches the concept first; the game consolidates in the last 10 minutes.

| Day | Concept taught | Game activity | Earned |
|-----|----------------|---------------|--------|
| **L1** | Premises, conclusions, validity, deductive vs inductive | Briefing A → Case A (hot dogs, deductive) → Case B (cereal, inductive) → Briefing C → Case C (AI tools, unstated premise) | L1 digit |
| **L2** | Validity / soundness / strength judgement, counter-examples | Validity Court 4Q | L2 digit |
| **L3** | Op-ed analysis, soundness, Socratic critique | Op-Ed Autopsy 4Q | L3 digit |

L1 takes ~15 minutes (it's bigger because it's the foundational scene). L2 and L3 are ~10 each. Time-cap each session — pods that don't finish today can pick up next lesson; progress saves automatically.

### Catch-up policy

All three lesson doors are open from the start in the Hub. A pod that misses L1 can play L1 in lesson 2's downtime. The vault unlocks once all three digits are earned, in any order.

---

## Vault and certificate

When a pod has earned all three digits, the vault scene appears in the Hub. The pod's master combination is displayed (so they can verify against their own card if you want a public reveal moment). Entering the combination unlocks:

1. The vault animation
2. A **Certificate of Argument Analysis** with the pod's name and chosen role badges
3. An **exemplar** — a worked standard-form argument they can take into the test

### Physical prize bridge (optional)

If you want a physical reward: print each pod's certificate from the in-game printable view, attach a small prize (chocolate, sticker pack, "Philosopher of the Week" certificate). The certificate names the pod members if they enter their names on the role-badge screen.

---

## Troubleshooting

### "The page is blank" or images don't load

The game is being opened directly as a file (`file://` URL). Run `python -m http.server 8770` from the `Tribunal game/` folder and open `http://localhost:8770/` instead. The game now detects this and shows an instruction screen.

### "The pod's progress disappeared"

Progress is saved per browser/device under `localStorage`. If a student switches devices, progress doesn't follow. Solutions:
- Use the **export / import** button (top-right of Hub) — it generates a URL-hash that the pod can paste into their new device's browser.
- Or have the pod redo from the Hub (all doors are open from start).

### "The screen looks weird / cached"

The game uses cache-busters (`?v=8` on every script). When you ship a new version, bump the number in `index.html`. If a pod still sees a stale version, hard-refresh (Ctrl+Shift+R / Cmd+Shift+R).

### "I want to wipe a pod's progress mid-class"

Open the browser console (F12) on their device and run:
```js
localStorage.clear()
```
Then refresh. The pod re-enters their code and starts fresh.

### "A pod is stuck on a question"

Press **D** during any L1/L2/L3 scene to instant-complete (dev shortcut). Use sparingly — it skips the learning. The intent is for pedagogical recovery if a bug or confusion stalls progress.

---

## Accessibility notes

The game has been built to WCAG 2.2 AA on the audit recipes from `/accessible-web-composition`.

### Keyboard shortcuts

| Key | Effect |
|-----|--------|
| **Tab / Shift+Tab** | Move focus between buttons |
| **Enter / Space** | Activate focused button |
| **Esc** | Return to Hub from any lesson; close confirmation dialogs first if open |
| **A–Z, Backspace, Enter** | Type pod code on the login screen |
| **D** (in lesson scenes) | Dev shortcut to instant-complete (skip the learning) |
| **1–9** (Case A/B in L1) | Select card N |
| **M / N / C** (Case A in L1) | Drop selected card into Major / Minor / Conclusion slot |

### Screen reader support

Two ARIA live regions sit above the canvas: a polite region (for hints, scores, phase transitions) and an assertive region (for errors, validity verdicts, vault unlocks). Phase transitions and validation outcomes announce automatically.

### Reduced motion

The game respects `prefers-reduced-motion: reduce`. When set, the patient sprite holds frame 0 (no breathing/twitch/bounce loop), tweens shorten or skip, and screen-shake is disabled.

### Visual contrast

All text-on-bg pairs meet 4.5:1. Drop-zone borders, card borders, and verdict colours meet 3:1 non-text contrast. The L3 chamber background gets a dim overlay to keep prose legible against its busier illustration.

---

## What changed in v8 (2026-05)

- **L1 mechanic rewrite** — cases now allow building either side of the argument with cards covering both positions. Case A (hot dogs, deductive) and Case B (cereal, inductive 4-premise) are new. Case C (AI tools, unstated premise) keeps its argument but cards are now visually identical (the [UNSTATED] tell has been removed).
- **Two new briefing scenes** — Briefing A (3 panels) before Case A teaches premise/major/minor/conclusion structure; Briefing C (3 panels) before Case C teaches the unstated-premise concept using real-world warning-sign photos.
- **L2 Q3 soft-lock fix** — wrong drops on the counter-example task now glide back to the card pool.
- **L3 readability fix** — dim overlay added so text is legible against the chamber-3 background.
- **Pod-login overlap fix** — the badge-selection phase no longer renders behind leftover text from the code-entry phase.
- **Login hint added** — "Your 4-letter code comes from your pod card. Ask Mr Ellis if you don't have one."
- **file:// detection** — opening the game directly now shows a helpful "run python -m http.server" instruction instead of silently failing.
- **Esc bindings** — Esc returns to Hub from L1, L2, L3, and FinalReveal scenes.
- **Animated patient sprite (L1)** — the patient on the operating table now breathes via a 4-frame sprite-sheet animation. Falls back to the static image if the animation file is missing.
- **Scalpel badge fixed** — the role-selection scalpel is no longer a pair of scissors.

---

## Open questions for you

1. **Anti-soup premise #10** ("Soup is typically eaten as a meal; cereal is eaten as a snack…") was a fresh draft — confirm or replace. Other options:
   - "Soup is associated with sit-down meals; cereal is associated with quick weekday breakfasts."
   - "Most restaurants serve soup as a dish in itself; cereal is rarely sold this way."
2. **Patient sprites in L2 and L3** — the chamber backgrounds already include atmospheric patient illustrations, and the standalone `argument_patient_l[23].png` files were preloaded but never displayed. Animations are now generated for all three, but only L1's is currently wired into the scene. Want them shown (and animated) in L2 and L3 too? If so, where on the canvas — centred above the cards, or to one side?
3. **Vault door animation** — currently an image-swap (locked → unlocked). The handover asked whether to also animate this at SNES quality. My recommendation: leave as-is. The vault is a one-time reveal; an animated vault-opening adds production cost without adding pedagogical value.

---

## File map

```
Tribunal game/
├── index.html              ← scene registry, cache-buster, ARIA scaffold
├── README.md               ← developer-facing notes
├── TEACHER-GUIDE.md        ← (this file)
├── src/
│   ├── core/
│   │   ├── constants.js    ← COLORS, FONTS, GAME_DIM, LESSONS
│   │   └── event-bus.js    ← pub/sub + screen-reader announce()
│   ├── state.js            ← StateManager (localStorage + URL-hash export)
│   ├── boot.js             ← preload + file:// guard
│   ├── pod-login.js        ← code entry + badge selection
│   ├── hub.js              ← dossier panel + 3 lesson doors + vault
│   ├── l1-scene.js         ← briefings + Case A + Case B + Case C
│   ├── l2-scene.js         ← Validity Court (4 questions)
│   ├── l3-scene.js         ← Op-Ed Autopsy (4 questions)
│   └── final-reveal.js     ← vault + certificate + exemplar
└── assets/images/
    ├── chamber_*.webp      ← chamber backgrounds (1820×1024)
    ├── briefing/           ← real warning-sign photos for Briefing C
    │   ├── sign_crocodile.jpg
    │   ├── sign_wet_floor.jpg
    │   ├── sign_no_smoking.jpg
    │   └── attributions.json
    └── sprites/
        ├── badge_*.png     ← role-selection badges
        ├── argument_patient_*.png   ← static patient illustrations
        ├── patient_*_anim.png        ← animated sprite-sheets
        ├── evidence_*.png  ← evidence cards
        ├── stamp_*.png     ← validity / soundness stamps
        └── manifest*.json  ← asset metadata
```

---

*Built 2026-05 for SACE Stage 1 Philosophy. Questions or bug reports: edit this file or speak to the project owner.*
