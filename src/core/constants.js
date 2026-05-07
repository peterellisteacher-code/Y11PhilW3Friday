'use strict';

// ── PALETTE — Operating Theatre core ─────────────────────────────────────────
// Use HEX_NUM (0xRRGGBB) for Phaser fills/strokes.
// Use HEX_STR ('#RRGGBB') for HTML/CSS overlays.
const COLORS = {
  BG_INK:    { num: 0x1A1A24, str: '#1A1A24' },
  BRASS:     { num: 0xC8B68A, str: '#C8B68A' },
  PARCH:     { num: 0xE8E3D0, str: '#E8E3D0' },
  STEEL:     { num: 0x7A8B8E, str: '#7A8B8E' },        // 4.5:1 on BG_INK ✓ (small text)
  STEEL_INK: { num: 0x5A6A6E, str: '#5A6A6E' },        // 4.6:1 on PARCH ✓ — for printed certificate labels
  TEAL:      { num: 0x1A4A4A, str: '#1A4A4A' },
  WHITE:     { num: 0xFFFFFF, str: '#FFFFFF' },
  PANEL:     { num: 0x0E0E1A, str: '#0E0E1A' },
  PANEL_DK:  { num: 0x0A0A12, str: '#0A0A12' },
  MUTED:     { num: 0x8888AA, str: '#8888AA' },        // lifted from #444455 (1.81:1) → 4.6:1 ✓
  MUTED_DK:  { num: 0x333344, str: '#333344' },        // decorative borders only — not used for text

  // Per-lesson accents — lifted to clear 4.5:1 on BG_INK for button text legibility
  L1_ACCENT: { num: 0xE25A4D, str: '#E25A4D' },  // forensic vermillion (was #B23A2D, 2.91:1; now 4.6:1)
  L2_ACCENT: { num: 0xE84545, str: '#E84545' },  // punk blood       (was #C81D1D, 3.00:1; now 4.5:1)
  L3_ACCENT: { num: 0xed7a7a, str: '#ed7a7a' },  // pastel coral     (already 6.30:1 ✓)
};

// Font-family values use SINGLE quotes around each name so they can be
// embedded inside double-quoted HTML style attributes without terminating
// the attribute. (Embedding `"Crimson Pro"` inside `style="font-family: …"`
// truncates the attribute at the inner double quote, wiping every following
// declaration. Phaser accepts either quote style in fontFamily strings.)
const FONTS = {
  HEAD: "'Crimson Pro', Georgia, serif",
  BODY: "'Special Elite', monospace",
  HERO: "'Archivo Black', sans-serif",
};

const LESSONS = [
  { key: 'L1', scene: 'L1Scene', label: 'THE ARGUMENT LAB',  subtitle: 'Standard Form Reconstruction', accent: COLORS.L1_ACCENT },
  { key: 'L2', scene: 'L2Scene', label: 'VALIDITY COURT',     subtitle: 'Verdicts & Counter-Examples',  accent: COLORS.L2_ACCENT },
  { key: 'L3', scene: 'L3Scene', label: 'OPERATING THEATRE',  subtitle: 'Op-Ed Autopsy',                accent: COLORS.L3_ACCENT },
];

const GAME_DIM = { W: 1920, H: 1080 };

// Reduced motion check — read once at boot. Used to gate shakes, flashes,
// large tweens, particles, parallax.
const PREFERS_REDUCED_MOTION =
  window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
