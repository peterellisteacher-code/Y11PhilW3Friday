'use strict';

const BADGE_OPTIONS = [
  { key: 'scalpel',    label: 'Scalpel',    color: 0xB23A2D },
  { key: 'syringe',    label: 'Syringe',    color: 0x1A4A4A },
  { key: 'microscope', label: 'Microscope', color: 0xC8B68A },
  { key: 'clipboard',  label: 'Clipboard',  color: 0x7A8B8E },
];

// Per-pod digits derived from the pod code letters. Cheap and
// teacher-checkable: letter position in alphabet (A=1...Z=26) mod 10,
// taken from positions 0/1/2 of the pod code for L1/L2/L3.
//   AQUA → A=1 Q=17 U=21 → 1·7·1
//   BOLD → B=2 O=15 L=12 → 2·5·2
// Teacher computes the master code mentally; sharing the digits between
// pods doesn't help because every pod's code is different.
function digitForLesson(podCode, lesson) {
  const idx = { L1: 0, L2: 1, L3: 2 }[lesson];
  const ch = podCode.charAt(idx).toUpperCase();
  const pos = ch.charCodeAt(0) - 64; // A=1
  return String(pos % 10);
}

const StateManager = {
  _key(podCode) { return `argument_theatre_${podCode}_state`; },

  load(podCode) {
    try {
      const raw = localStorage.getItem(this._key(podCode));
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  },

  create(podCode, badgeIndex = 0) {
    return {
      podCode,
      badge: badgeIndex,
      createdAt: new Date().toISOString(),
      lessonProgress: {
        L1: { complete: false, digit: null, evidence: [] },
        L2: { complete: false, digit: null, evidence: [] },
        L3: { complete: false, digit: null, evidence: [] },
      },
      totalEvidence: 0,
      codeDigits: [null, null, null],
      vaultUnlocked: false,
      lastSaved: new Date().toISOString(),
    };
  },

  save(state) {
    state.lastSaved = new Date().toISOString();
    try {
      localStorage.setItem(this._key(state.podCode), JSON.stringify(state));
    } catch (e) { console.warn('State save failed:', e); }
  },

  completeLesson(state, lesson, evidenceCards) {
    const progress = state.lessonProgress[lesson];
    if (progress.complete) return; // anti-cheat: no re-grading
    const digit = digitForLesson(state.podCode, lesson);
    progress.complete = true;
    progress.digit = digit;
    progress.evidence = evidenceCards;
    const lessonIndex = { L1: 0, L2: 1, L3: 2 }[lesson];
    state.codeDigits[lessonIndex] = digit;
    state.totalEvidence = Object.values(state.lessonProgress)
      .reduce((sum, lp) => sum + lp.evidence.length, 0);
    state.vaultUnlocked = state.codeDigits.every(d => d !== null);
    this.save(state);
    if (window.EventBus) {
      EventBus.emit('lesson:complete', { lesson, digit, podCode: state.podCode });
      if (state.vaultUnlocked) EventBus.emit('vault:unlocked', { podCode: state.podCode });
    }
  },

  exportHash(state) {
    const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(state))));
    return `${window.location.origin}${window.location.pathname}#${encoded}`;
  },

  importFromHash() {
    const hash = window.location.hash.slice(1);
    if (!hash) return null;
    try { return JSON.parse(decodeURIComponent(escape(atob(hash)))); }
    catch { return null; }
  },

  clearHash() {
    history.replaceState(null, '', window.location.pathname + window.location.search);
  },

  // All three lessons are reachable from the start. Catch-up policy:
  // an absent pod can attempt any lesson at any time. Status is just
  // "complete" or "active" — no locking.
  lessonStatus(state, lesson) {
    return state.lessonProgress[lesson].complete ? 'complete' : 'active';
  },

  // Teacher reference: returns full code for a pod (debugging only).
  teacherMasterDigits(podCode) {
    return ['L1','L2','L3'].map(l => digitForLesson(podCode, l)).join('-');
  },
};
