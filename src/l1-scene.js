'use strict';

// ── L1Scene — The Argument Lab ────────────────────────────────────────────────
// Nine internal phases driven by a single phase-router:
//
//   briefing-a-1 → briefing-a-2 → briefing-a-3
//     → case-a (Hot Dogs, deductive validity)
//     → case-b (Cereal, inductive strength)
//     → briefing-c-1 → briefing-c-2 → briefing-c-3
//     → case-c (AI tools, unstated premise)
//     → complete
//
// IIFE wrapper REMOVED (consistency with l2-scene.js / l3-scene.js).
// DOM briefing overlays appended to document.body for accessibility.
// Phaser canvas for Case A / B / C drag-and-drop card mechanics.
// ─────────────────────────────────────────────────────────────────────────────

// ── CASE A DATA ───────────────────────────────────────────────────────────────

const CASE_A_CARDS = [
  { id: 1, kind: 'major',      side: 'pro',  text: 'A sandwich is any food consisting of fillings between bread.' },
  { id: 2, kind: 'major',      side: 'con',  text: 'A sandwich requires two separate slices of bread on either side of the filling.' },
  { id: 3, kind: 'minor',      side: 'pro',  text: 'A hot dog has a sausage filling held between two halves of a bun.' },
  { id: 4, kind: 'minor',      side: 'con',  text: 'A hot dog\'s bun is a single connected piece of bread, not two separate slices.' },
  { id: 5, kind: 'conclusion', side: 'pro',  text: 'A hot dog is a sandwich.' },
  { id: 6, kind: 'conclusion', side: 'con',  text: 'A hot dog is not a sandwich.' },
  { id: 7, kind: 'distractor', side: null,   text: 'A taco has fillings held in folded bread.' },
  { id: 8, kind: 'distractor', side: null,   text: 'Most people would not call a hot dog a sandwich in conversation.' },
];

// ── CASE B DATA ───────────────────────────────────────────────────────────────

const CASE_B_CARDS = [
  { id: 1,  kind: 'premise',    camp: 'pro',   text: 'Cereal is eaten with a spoon and served in a bowl, just like soup.' },
  { id: 2,  kind: 'premise',    camp: 'pro',   text: 'Cereal consists of either solid pieces in liquid, or a blended mush — just like soup.' },
  { id: 3,  kind: 'premise',    camp: 'pro',   text: 'Non-western cultures would not see a difference between cereal and soup.' },
  { id: 4,  kind: 'premise',    camp: 'pro',   text: 'People often think of cereal and soup as being different, but that is not evidence that they are.' },
  { id: 5,  kind: 'premise',    camp: 'pro',   text: 'Soup and cereal have more in common than any other two types of food.' },
  { id: 6,  kind: 'premise',    camp: 'anti',  text: 'Soup is usually served hot, but cereal is served cold.' },
  { id: 7,  kind: 'premise',    camp: 'anti',  text: 'Soup typically requires cooking; cereal does not.' },
  { id: 8,  kind: 'premise',    camp: 'anti',  text: 'Cereal is often sweet; almost all soups are savoury.' },
  { id: 9,  kind: 'premise',    camp: 'anti',  text: 'Nobody at a restaurant would order cereal from the soup menu.' },
  { id: 10, kind: 'premise',    camp: 'anti',  text: 'Soup is typically eaten as a meal; cereal is eaten as a snack or with other breakfast foods.' },
  { id: 11, kind: 'premise',    camp: 'either', text: 'Soup is rarely eaten for breakfast, and cereal is rarely eaten for lunch or dinner.' },
  { id: 12, kind: 'premise',    camp: 'either', text: 'Some people do eat soup for breakfast, and regularly eat cereal for lunch or dinner.' },
  { id: 13, kind: 'conclusion', camp: 'pro',   text: 'Cereal is a soup.' },
  { id: 14, kind: 'conclusion', camp: 'anti',  text: 'Cereal is not a soup.' },
];

// ── CASE C DATA (existing content, visual cues stripped) ─────────────────────

const CASE_C_DATA = {
  prose: 'AI tools like ChatGPT shouldn\'t be used for school assignments. They give some students unfair advantages over others.',
  prompt: 'At least one of these premises will be UNSTATED — it won\'t appear in the prose, but you\'ll need it to make the argument work.',
  hint: 'Read the prose carefully — one of the cards in the pool is NOT actually written in the original. You still need to place it for the argument to make sense.',
  slots: ['P1', 'P2', '∴ C'],
  answers: {
    'P1':  'AI tools give some students unfair advantages.',
    'P2':  'Tools that give unfair advantages should not be used for school assignments.',
    '∴ C': 'AI tools should not be used for school assignments.',
  },
  cards: [
    { id: 'C_p1', text: 'AI tools give some students unfair advantages.' },
    { id: 'C_p2', text: 'Tools that give unfair advantages should not be used for school assignments.', unstated: true },
    { id: 'C_c',  text: 'AI tools should not be used for school assignments.' },
    { id: 'C_d1', text: 'AI is a recent technology.' },
    { id: 'C_d2', text: 'ChatGPT is free to use.' },
  ],
  unstatedSlot: 'P2',
  unstatedChoices: [
    { label: 'P1',  isUnstated: false, why: 'P1 ("AI tools give some students unfair advantages") is paraphrased from the second sentence of the original.' },
    { label: 'P2',  isUnstated: true,  why: 'Yes — P2 is the implicit moral premise. The original prose only said AI gives unfair advantages; it never explicitly stated that tools that do this should not be used. That assumption is doing the heavy lifting.' },
    { label: '∴ C', isUnstated: false, why: 'The conclusion is stated explicitly — it\'s the FIRST sentence of the original.' },
  ],
};

// ── SCENE CLASS ───────────────────────────────────────────────────────────────

class L1Scene extends Phaser.Scene {
  constructor() { super({ key: 'L1Scene' }); }

  // ── LIFECYCLE ──────────────────────────────────────────────────────────────

  init(data) {
    this.podCode      = data.podCode;
    this.state        = data.state;
    this.domNodes     = [];       // Phaser DOM elements (for cleanup)
    this._phaseUI     = [];       // EVERY object a phase creates — destroyed on exit
    this._currentPhase = null;
    this._activeDialog = null;    // for Esc handling
    this._keyHandler   = null;
  }

  preload() {
    // Attempt to load animated patient sprite — may not exist yet
    this.load.spritesheet(
      'patient_l1_anim',
      'assets/images/sprites/patient_l1_anim.png',
      { frameWidth: 192, frameHeight: 192 }
    );
    // Error handler so missing file doesn't crash boot
    this.load.on('loaderror', (file) => {
      if (file.key === 'patient_l1_anim') {
        console.info('L1Scene: patient_l1_anim sprite not yet available — using static fallback.');
      }
    });
  }

  create() {
    // Background + dim overlay (persistent, not in _phaseUI)
    this.add.image(GAME_DIM.W / 2, GAME_DIM.H / 2, 'chamber_l1')
      .setDisplaySize(GAME_DIM.W, GAME_DIM.H);
    const ov = this.add.graphics();
    ov.fillStyle(0x000000, 0.5);
    ov.fillRect(0, 0, GAME_DIM.W, GAME_DIM.H);

    // Top header bar (persistent)
    this._drawHeader();

    // Patient sprite — animated if sheet loaded, static fallback otherwise
    this._buildPatientSprite();

    // Keyboard — Esc + dev shortcut
    this._wireKeyboard();

    this.events.once('shutdown', () => this._cleanup());
    this.events.once('destroy',  () => this._cleanup());

    // Enter first phase
    this._transitionTo('briefing-a-1');
  }

  // ── HEADER BAR (persistent) ────────────────────────────────────────────────

  _drawHeader() {
    const g = this.add.graphics();
    g.fillStyle(COLORS.PANEL_DK.num, 0.95);
    g.fillRect(0, 0, GAME_DIM.W, 80);
    g.lineStyle(1, COLORS.L1_ACCENT.num, 0.9);
    g.lineBetween(0, 80, GAME_DIM.W, 80);

    this.add.text(GAME_DIM.W / 2, 40, 'THE ARGUMENT LAB · Standard Form', {
      fontFamily: FONTS.HERO,
      fontSize: '26px',
      color: COLORS.L1_ACCENT.str,
      letterSpacing: 3,
    }).setOrigin(0.5);

    this._addDomButton(
      20, 12, 220, 56,
      '← BACK TO HUB',
      'Return to hub. Press Escape.',
      COLORS.BRASS.str,
      () => {
        this._cleanupPhaseUI();
        this.scene.start('HubScene', { podCode: this.podCode, state: this.state });
      },
      14
    );
  }

  // ── PATIENT SPRITE ─────────────────────────────────────────────────────────

  _buildPatientSprite() {
    const x = 1700, y = 540;
    if (this.textures.exists('patient_l1_anim')) {
      this.anims.create({
        key: 'patient_l1_idle',
        frames: this.anims.generateFrameNumbers('patient_l1_anim', { start: 0, end: 3 }),
        frameRate: 6,
        repeat: -1,
      });
      this._patientSprite = this.add.sprite(x, y, 'patient_l1_anim');
      if (!PREFERS_REDUCED_MOTION) {
        this._patientSprite.play('patient_l1_idle');
      } else {
        this._patientSprite.setFrame(0);
      }
    } else if (this.textures.exists('argument_patient_l1')) {
      this._patientSprite = this.add.image(x, y, 'argument_patient_l1');
    }
    // If neither texture exists, silently skip
  }

  // ── PHASE ROUTER ──────────────────────────────────────────────────────────

  _transitionTo(nextPhase) {
    // Exit current phase
    if (this._currentPhase) {
      const exitName = `_exit${this._phaseFnName(this._currentPhase)}`;
      if (typeof this[exitName] === 'function') this[exitName]();
    }
    // Destroy all tracked phase UI
    this._cleanupPhaseUI();

    this._currentPhase = nextPhase;

    // Enter new phase
    const enterName = `_enter${this._phaseFnName(nextPhase)}`;
    if (typeof this[enterName] === 'function') {
      this[enterName]();
    } else {
      console.warn(`L1Scene: no enter method for phase "${nextPhase}"`);
    }
  }

  /** Convert phase key to PascalCase method suffix.
   *  'briefing-a-1' → 'BriefingA1'
   *  'case-a'       → 'CaseA'
   *  'complete'     → 'Complete'
   */
  _phaseFnName(phase) {
    return phase.split('-').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join('');
  }

  // ── PHASE UI TRACKING ──────────────────────────────────────────────────────

  /** Track a Phaser GameObject. Returns the object for chaining. */
  _track(obj) {
    if (obj) this._phaseUI.push(obj);
    return obj;
  }

  /** Track a DOM overlay (object with .destroy() method). */
  _trackDOM(obj) {
    if (obj) this._phaseUI.push(obj);
    return obj;
  }

  /** Destroy everything in _phaseUI. */
  _cleanupPhaseUI() {
    this._phaseUI.forEach(obj => {
      if (!obj) return;
      try {
        if (typeof obj.destroy === 'function') obj.destroy();
        else if (obj.remove && obj.parentNode) obj.remove();
      } catch {}
    });
    this._phaseUI = [];
    // Also clean up any Phaser dom elements registered per-phase
    // (handled via the unified destroy interface below)
  }

  // ── BRIEFING DOM OVERLAY HELPER ────────────────────────────────────────────

  /**
   * Build and show a full-screen DOM briefing overlay.
   * @param {object} opts
   *   phaseOf   {number} e.g. 1
   *   phaseTotal {number} e.g. 3
   *   titleId   {string} unique id for aria-labelledby
   *   title     {string}
   *   bodyHTML  {string} inner HTML for the content area
   *   btnLabel  {string} button text
   *   onNext    {function} click handler
   * @returns {{ overlay: HTMLElement, destroy: function }}
   */
  _buildBriefingOverlay(opts) {
    const overlay = document.createElement('div');
    overlay.className = 'briefing-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-labelledby', opts.titleId);
    overlay.style.cssText = `
      position: fixed; inset: 0; background: rgba(0,0,0,0.87);
      display: flex; align-items: center; justify-content: center;
      z-index: 1000; padding: 40px;
    `;

    overlay.innerHTML = `
      <div style="
        position: relative;
        background: ${COLORS.PANEL.str};
        color: ${COLORS.PARCH.str};
        padding: 60px 64px 48px;
        max-width: 860px;
        width: 100%;
        border: 4px solid ${COLORS.BRASS.str};
        border-radius: 8px;
        font-family: ${FONTS.HEAD};
      ">
        <div style="
          position: absolute; top: 18px; right: 24px;
          font-family: ${FONTS.HERO}; font-size: 16px;
          color: ${COLORS.BRASS.str}; letter-spacing: 2px;
        ">Phase ${opts.phaseOf} of ${opts.phaseTotal}</div>

        <h2 id="${opts.titleId}" style="
          font-family: ${FONTS.HERO};
          font-size: 36px;
          color: ${COLORS.BRASS.str};
          letter-spacing: 2px;
          margin-bottom: 28px;
        ">${opts.title}</h2>

        <div style="font-size: 22px; line-height: 1.65; margin-bottom: 40px;">
          ${opts.bodyHTML}
        </div>

        <div style="text-align: right;">
          <button class="briefing-next-btn" type="button" style="
            background: transparent;
            color: ${COLORS.BRASS.str};
            border: 2px solid ${COLORS.BRASS.str};
            border-radius: 4px;
            font-family: ${FONTS.HERO};
            font-size: 26px;
            letter-spacing: 4px;
            padding: 18px 56px;
            cursor: pointer;
            transition: background 0.15s ease, color 0.15s ease, transform 0.15s ease;
            outline-offset: 3px;
          ">${opts.btnLabel || 'NEXT →'}</button>
        </div>
      </div>
    `;

    const btn = overlay.querySelector('.briefing-next-btn');
    const hoverIn  = () => { btn.style.background = COLORS.BRASS.str; btn.style.color = COLORS.BG_INK.str; };
    const hoverOut = () => { btn.style.background = 'transparent';    btn.style.color = COLORS.BRASS.str; };
    btn.addEventListener('mouseenter', hoverIn);
    btn.addEventListener('mouseleave', hoverOut);
    btn.addEventListener('focus',  hoverIn);
    btn.addEventListener('blur',   hoverOut);
    btn.addEventListener('click', opts.onNext);

    // Esc also closes
    const escHandler = (e) => {
      if (e.key === 'Escape') {
        overlay.remove();
        this._cleanupPhaseUI();
        this.scene.start('HubScene', { podCode: this.podCode, state: this.state });
      }
    };
    overlay.addEventListener('keydown', escHandler);

    document.body.appendChild(overlay);

    // Focus the button after appending
    this.time ? this.time.delayedCall(60, () => { try { btn.focus(); } catch {} })
              : setTimeout(() => { try { btn.focus(); } catch {} }, 60);

    const destroy = () => {
      try { overlay.removeEventListener('keydown', escHandler); } catch {}
      try { overlay.remove(); } catch {}
    };

    this._activeDialog = { destroy };
    return { overlay, btn, destroy };
  }

  // ── BRIEFING A ─────────────────────────────────────────────────────────────

  _enterBriefingA1() {
    announce('Briefing: What an argument is. Phase 1 of 3.');
    const built = this._buildBriefingOverlay({
      phaseOf: 1, phaseTotal: 3,
      titleId: 'briefing-a-title',
      title: 'What an argument is',
      bodyHTML: `
        <p>Every argument has two parts: <strong style="color:${COLORS.BRASS.str}">PREMISES</strong>
        (the reasons given) and a <strong style="color:${COLORS.BRASS.str}">CONCLUSION</strong>
        (the claim being defended). The premises do the work. The conclusion is where they end up.</p>
      `,
      btnLabel: 'NEXT →',
      onNext: () => this._transitionTo('briefing-a-2'),
    });
    this._trackDOM({ destroy: built.destroy });
  }
  _exitBriefingA1() {}

  _enterBriefingA2() {
    announce('Briefing: Major and minor premises. Phase 2 of 3.');
    const built = this._buildBriefingOverlay({
      phaseOf: 2, phaseTotal: 3,
      titleId: 'briefing-a-title',
      title: 'Major and minor premises',
      bodyHTML: `
        <p>A <strong style="color:${COLORS.BRASS.str}">DEDUCTIVE</strong> argument is one where the conclusion is meant to FOLLOW NECESSARILY from the premises &mdash; not just be likely. It usually needs TWO premises:</p>
        <ul style="margin: 18px 0 18px 28px; line-height: 2;">
          <li>A <strong style="color:${COLORS.BRASS.str}">MAJOR</strong> premise &mdash; a general rule about a whole category.</li>
          <li>A <strong style="color:${COLORS.BRASS.str}">MINOR</strong> premise &mdash; a specific fact about something in that category.</li>
        </ul>
        <p>Together they force a conclusion. Like this:</p>
        <div style="
          background: ${COLORS.PANEL_DK.str};
          border-left: 3px solid ${COLORS.BRASS.str};
          padding: 18px 24px;
          margin: 18px 0;
          font-family: ${FONTS.BODY};
          line-height: 1.8;
        ">
          <div><strong style="color:${COLORS.BRASS.str}">P1 (MAJOR):</strong> All humans are mortal.</div>
          <div><strong style="color:${COLORS.BRASS.str}">P2 (MINOR):</strong> Socrates is a human.</div>
          <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid ${COLORS.MUTED.str};">
            <strong style="color:${COLORS.BRASS.str}">∴ C:</strong> Socrates is mortal.
          </div>
        </div>
        <p>The major names the category. The minor puts Socrates inside it. So the conclusion has to be true.</p>
      `,
      btnLabel: 'NEXT →',
      onNext: () => this._transitionTo('briefing-a-3'),
    });
    this._trackDOM({ destroy: built.destroy });
  }
  _exitBriefingA2() {}

  _enterBriefingA3() {
    announce('Briefing: Validity. Phase 3 of 3.');
    const built = this._buildBriefingOverlay({
      phaseOf: 3, phaseTotal: 3,
      titleId: 'briefing-a-title',
      title: 'Validity',
      bodyHTML: `
        <p>If the premises are true and the structure holds, the conclusion CAN'T be false.
        That's what makes a deductive argument <strong style="color:${COLORS.BRASS.str}">VALID</strong>.</p>
        <p style="margin-top:18px;">But validity is NOT the same as truth. Look at this:</p>
        <div style="
          background: ${COLORS.PANEL_DK.str};
          border-left: 3px solid ${COLORS.L1_ACCENT.str};
          padding: 18px 24px;
          margin: 18px 0;
          font-family: ${FONTS.BODY};
          line-height: 1.8;
        ">
          <div><strong style="color:${COLORS.L1_ACCENT.str}">P1 (MAJOR):</strong> All cats are reptiles.</div>
          <div><strong style="color:${COLORS.L1_ACCENT.str}">P2 (MINOR):</strong> Garfield is a cat.</div>
          <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid ${COLORS.MUTED.str};">
            <strong style="color:${COLORS.L1_ACCENT.str}">∴ C:</strong> Garfield is a reptile.
          </div>
        </div>
        <p>P1 is <em>false</em> — cats aren't reptiles. But the SHAPE of the argument is valid:
        <em>if</em> cats were reptiles, Garfield would be one too. Validity is about whether the conclusion FOLLOWS,
        not whether the premises happen to be true.</p>
        <p style="margin-top:18px;">Your job in Case A: build a valid argument from the cards provided.
        Either side can win. Just make sure the conclusion follows.</p>
      `,
      btnLabel: 'BEGIN CASE A →',
      onNext: () => this._transitionTo('case-a'),
    });
    this._trackDOM({ destroy: built.destroy });
  }
  _exitBriefingA3() {}

  // ── CASE A — HOT DOGS ─────────────────────────────────────────────────────

  _enterCaseA() {
    announce('Case A — Hot Dogs. Build a valid deductive argument about whether a hot dog is a sandwich.', true);

    // Hide the atmospheric patient sprite during cases — at x=1700 it
    // overlaps the right-column cards and clutters the working area.
    if (this._patientSprite) this._patientSprite.setVisible(false);

    // Shuffle cards
    this._caseACards = this._shuffle([...CASE_A_CARDS]);

    // Slot state: major, minor, conclusion
    this._slotsA = { major: null, minor: null, conclusion: null };
    this._selectedCardId = null;

    this._drawCaseHeader(
      'CASE A — Hot Dogs',
      'Build a VALID DEDUCTIVE argument about whether a hot dog is a sandwich. You can argue either side.'
    );

    this._drawCaseASlots();
    this._drawCaseACards();
    this._drawCaseAButtons();
    this._drawKeyboardHint('[1-8] select card · [M] major · [N] minor · [C] conclusion · [R] reset');
  }
  _exitCaseA() {}

  _drawCaseHeader(title, subtitle) {
    // Header box grew from 100→130px to accommodate the larger subtitle —
    // Peter's classroom feedback: at 18px the instruction reads as a footnote,
    // not as the actual task. Bumping to 26px makes the "what are you doing?"
    // line dominate the header alongside the title.
    const g = this._track(this.add.graphics());
    g.fillStyle(COLORS.PANEL_DK.num, 0.85);
    g.fillRoundedRect(80, 90, GAME_DIM.W - 160, 130, 6);
    g.lineStyle(2, COLORS.L1_ACCENT.num, 0.7);
    g.strokeRoundedRect(80, 90, GAME_DIM.W - 160, 130, 6);

    this._track(this.add.text(GAME_DIM.W / 2, 124, title, {
      fontFamily: FONTS.HERO,
      fontSize: '32px',
      color: COLORS.L1_ACCENT.str,
      letterSpacing: 3,
    }).setOrigin(0.5));

    this._track(this.add.text(GAME_DIM.W / 2, 178, subtitle, {
      fontFamily: FONTS.BODY,
      fontSize: '26px',
      color: COLORS.PARCH.str,
      wordWrap: { width: GAME_DIM.W - 200 },
      align: 'center',
    }).setOrigin(0.5));
  }

  _drawCaseASlots() {
    const slotDefs = [
      { key: 'major',      label: 'MAJOR PREMISE',  x: 240 },
      { key: 'minor',      label: 'MINOR PREMISE',  x: 740 },
      { key: 'conclusion', label: 'CONCLUSION',      x: 1240 },
    ];
    const slotW = 440, slotH = 160, y = 230;
    this._slotRectsA = {};

    slotDefs.forEach(def => {
      const g = this._track(this.add.graphics());
      this._drawSlotGraphic(g, def.x, y, slotW, slotH, null);

      this._track(this.add.text(def.x + slotW / 2, y + 20, def.label, {
        fontFamily: FONTS.HERO,
        ...TYPE.SMALL,
        color: COLORS.L1_ACCENT.str,
        letterSpacing: 3,
      }).setOrigin(0.5, 0));

      const contentText = this._track(this.add.text(def.x + slotW / 2, y + slotH / 2 + 18, '', {
        fontFamily: FONTS.BODY,
        fontSize: '22px',
        color: COLORS.PARCH.str,
        wordWrap: { width: slotW - 32 },
        align: 'center',
        lineSpacing: 4,
      }).setOrigin(0.5, 0.5));

      // Click zone to drop selected card into slot
      const zone = this._track(
        this.add.zone(def.x + slotW / 2, y + slotH / 2, slotW, slotH).setInteractive()
      );
      zone.on('pointerdown', () => this._dropCardIntoSlotA(def.key));

      this._slotRectsA[def.key] = { gfx: g, x: def.x, y, w: slotW, h: slotH, textObj: contentText };
    });
  }

  _drawSlotGraphic(gfx, x, y, w, h, filledCardId) {
    gfx.clear();
    if (filledCardId !== null) {
      gfx.fillStyle(COLORS.L1_ACCENT.num, 0.12);
      gfx.lineStyle(2, COLORS.L1_ACCENT.num, 1);
    } else {
      gfx.fillStyle(COLORS.PANEL_DK.num, 0.7);
      gfx.lineStyle(2, COLORS.L1_ACCENT.num, 0.5);
    }
    gfx.fillRoundedRect(x, y, w, h, 6);
    gfx.strokeRoundedRect(x, y, w, h, 6);
  }

  _drawCaseACards() {
    const cardW = 380, cardH = 120, gapX = 26, gapY = 20;
    const cols = 4;
    const totalW = cols * cardW + (cols - 1) * gapX;
    const startX = (GAME_DIM.W - totalW) / 2;
    const startY = 440;

    this._cardObjsA = {};

    this._caseACards.forEach((card, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const cx = startX + col * (cardW + gapX);
      const cy = startY + row * (cardH + gapY);
      this._buildCardA(card, cx, cy, cardW, cardH);
    });
  }

  _buildCardA(card, cx, cy, cardW, cardH) {
    // All cards visually identical — no kind tint, no side tint
    const gfx = this._track(this.add.graphics());
    gfx.fillStyle(COLORS.PANEL.num, 1);
    gfx.lineStyle(2, COLORS.BRASS.num, 0.8);
    gfx.fillRoundedRect(cx, cy, cardW, cardH, 6);
    gfx.strokeRoundedRect(cx, cy, cardW, cardH, 6);

    const txt = this._track(this.add.text(cx + cardW / 2, cy + cardH / 2, card.text, {
      fontFamily: FONTS.BODY,
      fontSize: '22px',
      color: COLORS.PARCH.str,
      wordWrap: { width: cardW - 28 },
      align: 'center',
      lineSpacing: 4,
    }).setOrigin(0.5, 0.5));

    const zone = this._track(
      this.add.zone(cx + cardW / 2, cy + cardH / 2, cardW, cardH)
        .setInteractive({ useHandCursor: true })
    );
    zone.on('pointerdown', () => this._selectCaseACard(card.id));

    this._cardObjsA[card.id] = { gfx, txt, zone, cx, cy, w: cardW, h: cardH, inPool: true };
  }

  _drawCaseAButtons() {
    // Buttons at y=985 — below the diagnostic banner (which sits at y=750-970
    // when shown, with two-column near-miss rendering). Earlier they were at
    // y=740 which collided with the banner top by ~50px.
    const submitDom = this._addDomButton(
      GAME_DIM.W - 380, 985, 300, 60,
      'SUBMIT ARGUMENT',
      'Submit your argument for evaluation.',
      COLORS.L1_ACCENT.str,
      () => this._submitCaseA(),
      20
    );
    this._submitBtnA = submitDom.node;
    this._submitBtnA.disabled = true;
    this._submitBtnA.style.opacity = '0.35';
    this._trackDOM({ destroy: () => submitDom.destroy() });

    const resetDom = this._addDomButton(
      80, 985, 200, 60,
      'RESET',
      'Return all cards to the pool.',
      COLORS.MUTED.str,
      () => this._resetCaseA(),
      20
    );
    this._trackDOM({ destroy: () => resetDom.destroy() });
  }

  _selectCaseACard(cardId) {
    const obj = this._cardObjsA[cardId];
    if (!obj || !obj.inPool) return;
    this._selectedCardId = cardId;
    this._highlightCaseACards();
    const card = CASE_A_CARDS.find(c => c.id === cardId);
    if (card) announce(`Selected: ${card.text}`);
  }

  _highlightCaseACards() {
    CASE_A_CARDS.forEach(card => {
      const obj = this._cardObjsA[card.id];
      if (!obj) return;
      const visible = obj.inPool;
      obj.gfx.setAlpha(visible ? 1 : 0);
      obj.txt.setAlpha(visible ? 1 : 0);
      if (!visible) return;

      const isSelected = card.id === this._selectedCardId;
      obj.gfx.clear();
      if (isSelected) {
        obj.gfx.fillStyle(COLORS.L1_ACCENT.num, 0.18);
        obj.gfx.lineStyle(3, COLORS.L1_ACCENT.num, 1);
      } else {
        obj.gfx.fillStyle(COLORS.PANEL.num, 1);
        obj.gfx.lineStyle(2, COLORS.BRASS.num, 0.8);
      }
      obj.gfx.fillRoundedRect(obj.cx, obj.cy, obj.w, obj.h, 6);
      obj.gfx.strokeRoundedRect(obj.cx, obj.cy, obj.w, obj.h, 6);
    });
  }

  _dropCardIntoSlotA(slotKey) {
    if (!this._selectedCardId) return;
    const obj = this._cardObjsA[this._selectedCardId];
    if (!obj || !obj.inPool) return;

    // If slot already has a card, return it to pool
    const existing = this._slotsA[slotKey];
    if (existing !== null) {
      const exObj = this._cardObjsA[existing];
      if (exObj) exObj.inPool = true;
    }

    this._slotsA[slotKey] = this._selectedCardId;
    obj.inPool = false;
    const card = CASE_A_CARDS.find(c => c.id === this._selectedCardId);
    this._selectedCardId = null;

    this._refreshCaseASlots();
    this._highlightCaseACards();
    announce(`Placed in ${slotKey}: ${card ? card.text : ''}`);
  }

  _returnCardFromSlotA(slotKey) {
    const cardId = this._slotsA[slotKey];
    if (cardId === null) return;
    this._slotsA[slotKey] = null;
    const obj = this._cardObjsA[cardId];
    if (obj) obj.inPool = true;
    this._refreshCaseASlots();
    this._highlightCaseACards();
    announce(`Returned card from ${slotKey} to pool.`);
  }

  _refreshCaseASlots() {
    Object.keys(this._slotRectsA).forEach(key => {
      const slot = this._slotRectsA[key];
      const cardId = this._slotsA[key];
      this._drawSlotGraphic(slot.gfx, slot.x, slot.y, slot.w, slot.h, cardId);
      if (cardId !== null) {
        const card = CASE_A_CARDS.find(c => c.id === cardId);
        slot.textObj.setText(card ? card.text : '');
      } else {
        slot.textObj.setText('');
      }
    });
    // Enable submit when all 3 slots filled
    const allFilled = Object.values(this._slotsA).every(v => v !== null);
    if (this._submitBtnA) {
      this._submitBtnA.disabled = !allFilled;
      this._submitBtnA.style.opacity = allFilled ? '1' : '0.35';
    }
  }

  _resetCaseA() {
    this._slotsA = { major: null, minor: null, conclusion: null };
    this._selectedCardId = null;
    CASE_A_CARDS.forEach(c => {
      const obj = this._cardObjsA[c.id];
      if (obj) obj.inPool = true;
    });
    this._refreshCaseASlots();
    this._highlightCaseACards();
    this._clearCaseAFeedback();
    announce('Cards reset to pool.');
  }

  _clearCaseAFeedback() {
    if (this._caseAFeedbackText) {
      try { this._caseAFeedbackText.destroy(); } catch {}
      this._caseAFeedbackText = null;
    }
  }

  _submitCaseA() {
    this._clearCaseAFeedback();
    const m = this._slotsA.major;
    const n = this._slotsA.minor;
    const c = this._slotsA.conclusion;
    const result = this._validateCaseA(m, n, c);

    if (result.valid) {
      this._showCaseASuccess(result);
    } else {
      this._showCaseADiagnostic(result.message);
    }
  }

  _validateCaseA(m, n, c) {
    // Valid pro deductive: 1 + 3 → 5
    if (m === 1 && n === 3 && c === 5) return { valid: true, side: 'pro' };
    // Valid con deductive: 2 + 4 → 6
    if (m === 2 && n === 4 && c === 6) return { valid: true, side: 'con' };
    // Diagnostics
    return { valid: false, message: this._diagnoseCaseA(m, n, c) };
  }

  _diagnoseCaseA(m, n, c) {
    // Distractor 7 (taco) in major slot
    if (m === 7) {
      return 'Card 7 is an analogy about tacos. An analogy compares two things — it doesn\'t DEFINE a category. For a deductive argument, your major premise needs to define what counts as a sandwich.';
    }
    // Distractor 8 (popular usage) in major slot
    if (m === 8) {
      return 'Card 8 reports popular usage. Popular usage is evidence about what people think, not about what something is. A deductive major premise needs to give a definition.';
    }
    // PRO major + CON minor (cross-camp mismatch)
    if (m === 1 && n === 4) {
      return 'Your major says a sandwich is "fillings between bread." Your minor says a hot dog bun is NOT two slices — but that\'s the wrong test for your major. Your major doesn\'t require two slices. Either change your major or change your minor.';
    }
    // CON major + PRO minor (cross-camp mismatch)
    if (m === 2 && n === 3) {
      return 'Your major says a sandwich requires TWO separate slices of bread. Your minor says a hot dog has a filling between two halves of a bun. But "two halves of a bun" aren\'t "two separate slices." Match your minor to what your major actually requires.';
    }
    // Premises argue one way, conclusion argues other
    const mCard = CASE_A_CARDS.find(card => card.id === m);
    const nCard = CASE_A_CARDS.find(card => card.id === n);
    const cCard = CASE_A_CARDS.find(card => card.id === c);
    if (mCard && nCard && cCard) {
      const premiseSide = (mCard.side === nCard.side) ? mCard.side : null;
      if (premiseSide && cCard.side && premiseSide !== cCard.side) {
        const isOrIsNot = premiseSide === 'pro' ? 'IS' : 'IS NOT';
        return `Your premises argue that a hot dog ${isOrIsNot} a sandwich. But your conclusion says the opposite. Match the conclusion to where the premises are pointing.`;
      }
    }
    // Wrong kind in slot
    if (cCard && (cCard.kind === 'major' || cCard.kind === 'minor')) {
      return `That card in the conclusion slot looks like a ${cCard.kind} premise. A conclusion is the claim being defended — try the card that makes the final claim.`;
    }
    if (mCard && mCard.kind === 'conclusion') {
      return 'That card in the major slot is actually a conclusion. A major premise gives a general definition — move it to the conclusion slot.';
    }
    if (nCard && nCard.kind === 'conclusion') {
      return 'That card in the minor slot is actually a conclusion. A minor premise gives a specific fact — move it to the conclusion slot.';
    }
    return 'Check whether each premise actually supports your conclusion. The premises must work together so the conclusion HAS to follow. If they don\'t, the argument isn\'t deductively valid.';
  }

  _showCaseADiagnostic(message) {
    this._clearCaseAFeedback();

    // Render the student's attempted argument in compact standard form on
    // the LEFT half of the banner, with the diagnostic on the RIGHT. Showing
    // the failed structure visibly — not just the prose explanation — is
    // what lifts this from "wrong, try again" to a near-miss worked example.
    const m = this._slotsA.major, n = this._slotsA.minor, c = this._slotsA.conclusion;
    const mCard = CASE_A_CARDS.find(card => card.id === m);
    const nCard = CASE_A_CARDS.find(card => card.id === n);
    const cCard = CASE_A_CARDS.find(card => card.id === c);

    const bg = this._track(this.add.graphics());
    bg.fillStyle(0x3A0A0A, 0.9);
    bg.lineStyle(2, COLORS.L1_ACCENT.num, 0.8);
    bg.fillRoundedRect(80, 750, GAME_DIM.W - 160, 220, 6);
    bg.strokeRoundedRect(80, 750, GAME_DIM.W - 160, 220, 6);

    // LEFT: standard-form rendering of the student's attempt
    const sfX = 110, sfY = 778, sfWidth = 880;
    const sfHeader = this._track(this.add.text(sfX, sfY, 'YOUR ATTEMPT:', {
      fontFamily: FONTS.HERO, ...TYPE.SMALL,
      color: COLORS.BRASS.str, letterSpacing: 3,
    }));

    const truncate = (s, max) => s && s.length > max ? s.slice(0, max - 1) + '…' : (s || '');
    const sfP1 = this._track(this.add.text(sfX, sfY + 30,
      `P1 (MAJOR): ${truncate(mCard?.text, 78)}`, {
        fontFamily: FONTS.BODY, ...TYPE.BODY,
        color: COLORS.PARCH.str, wordWrap: { width: sfWidth },
      }));
    const sfP2 = this._track(this.add.text(sfX, sfY + 80,
      `P2 (MINOR): ${truncate(nCard?.text, 78)}`, {
        fontFamily: FONTS.BODY, ...TYPE.BODY,
        color: COLORS.PARCH.str, wordWrap: { width: sfWidth },
      }));
    const sfC = this._track(this.add.text(sfX, sfY + 130,
      `∴ C: ${truncate(cCard?.text, 78)}`, {
        fontFamily: FONTS.BODY, ...TYPE.BODY,
        color: '#FFB680', wordWrap: { width: sfWidth },
      }));

    // Vertical divider
    const div = this._track(this.add.graphics());
    div.lineStyle(1, COLORS.L1_ACCENT.num, 0.5);
    div.lineBetween(1010, 770, 1010, 950);

    // RIGHT: diagnostic message — moved into right column
    const diagX = 1030, diagWidth = GAME_DIM.W - 1030 - 30;
    const txt = this._track(this.add.text(diagX, sfY, message, {
      fontFamily: FONTS.BODY,
      ...TYPE.BODY,
      color: '#FFB680',
      wordWrap: { width: diagWidth },
      lineSpacing: 4,
    }));

    this._caseAFeedbackText = txt;
    announce(message, true);

    // Auto-fade after 8s
    if (!PREFERS_REDUCED_MOTION) {
      this.tweens.add({
        targets: [bg, txt], alpha: { from: 1, to: 0 },
        delay: 7000, duration: 1000,
        onComplete: () => { try { bg.destroy(); txt.destroy(); } catch {} },
      });
    } else {
      this.time.delayedCall(8000, () => { try { bg.destroy(); txt.destroy(); } catch {} });
    }
  }

  _showCaseASuccess(result) {
    announce('Valid deductive argument! Well done.', true);

    const mCard = CASE_A_CARDS.find(c => c.id === this._slotsA.major);
    const nCard = CASE_A_CARDS.find(c => c.id === this._slotsA.minor);
    const cCard = CASE_A_CARDS.find(c => c.id === this._slotsA.conclusion);

    const panelW = 1000, panelH = 340;
    const px = (GAME_DIM.W - panelW) / 2;
    const py = (GAME_DIM.H - panelH) / 2 - 20;

    const g = this._track(this.add.graphics());
    g.fillStyle(COLORS.PANEL_DK.num, 0.98);
    g.lineStyle(3, 0x44AA44, 1);
    g.fillRoundedRect(px, py, panelW, panelH, 10);
    g.strokeRoundedRect(px, py, panelW, panelH, 10);

    if (!PREFERS_REDUCED_MOTION) {
      g.setAlpha(0);
      this.tweens.add({ targets: g, alpha: 1, duration: 300 });
    }

    this._track(this.add.text(GAME_DIM.W / 2, py + 42, '✓ VALID DEDUCTIVE ARGUMENT', {
      fontFamily: FONTS.HERO,
      fontSize: '28px',
      color: '#88DD88',
      letterSpacing: 4,
    }).setOrigin(0.5));

    const sfLines = [
      `P1 (MAJOR):  ${mCard ? mCard.text : ''}`,
      `P2 (MINOR):  ${nCard ? nCard.text : ''}`,
      `∴ C:  ${cCard ? cCard.text : ''}`,
    ];
    this._track(this.add.text(GAME_DIM.W / 2, py + 120, sfLines.join('\n'), {
      fontFamily: FONTS.BODY,
      fontSize: '17px',
      color: COLORS.PARCH.str,
      wordWrap: { width: panelW - 80 },
      lineSpacing: 10,
      align: 'left',
    }).setOrigin(0.5, 0));

    const contDom = this._addDomButton(
      GAME_DIM.W / 2 - 160, py + 276, 320, 54,
      'CONTINUE TO CASE B →',
      'Proceed to Case B.',
      COLORS.BRASS.str,
      () => this._transitionTo('case-b'),
      17
    );
    this._trackDOM({ destroy: () => contDom.destroy() });
    this.time.delayedCall(80, () => { try { contDom.node.focus(); } catch {} });
  }

  // ── CASE B — CEREAL ───────────────────────────────────────────────────────

  _enterCaseB() {
    announce('Case B — Cereal. INDUCTIVE arguments don\'t force a conclusion — they make it more or less LIKELY based on evidence. Build a strong inductive argument for whether cereal is a soup.', true);

    if (this._patientSprite) this._patientSprite.setVisible(false);

    this._caseBCards = this._shuffle([...CASE_B_CARDS]);
    // 4 premise slots + 1 conclusion slot
    this._slotsB = { p1: null, p2: null, p3: null, p4: null, conclusion: null };
    this._selectedCardIdB = null;

    this._drawCaseHeader(
      'CASE B — Cereal',
      'Build a STRONG INDUCTIVE argument for whether or not cereal is a soup. Pick FOUR premises that all push your conclusion the same way.'
    );

    this._drawCaseBSlots();
    this._drawCaseBCards();
    this._drawCaseBButtons();
    this._drawKeyboardHint('[1-14] select · [1-4] then P slot key · [C] conclusion · [R] reset');
  }
  _exitCaseB() {}

  _drawCaseBSlots() {
    // 4 premise slots top row, 1 conclusion slot centred below
    const slotW = 420, slotH = 160, gap = 28;
    const premiseY = 222;
    const premiseKeys = ['p1', 'p2', 'p3', 'p4'];
    const totalPremiseW = 4 * slotW + 3 * gap;
    const premiseStartX = (GAME_DIM.W - totalPremiseW) / 2;
    const conclusionY = 410;

    this._slotRectsB = {};

    premiseKeys.forEach((key, i) => {
      const x = premiseStartX + i * (slotW + gap);
      const g = this._track(this.add.graphics());
      this._drawSlotGraphic(g, x, premiseY, slotW, slotH, null);

      this._track(this.add.text(x + slotW / 2, premiseY + 18, `PREMISE ${i + 1}`, {
        fontFamily: FONTS.HERO,
        ...TYPE.SMALL,
        color: COLORS.L1_ACCENT.str,
        letterSpacing: 3,
      }).setOrigin(0.5, 0));

      const contentText = this._track(this.add.text(x + slotW / 2, premiseY + slotH / 2 + 16, '', {
        fontFamily: FONTS.BODY,
        ...TYPE.BODY,
        color: COLORS.PARCH.str,
        wordWrap: { width: slotW - 28 },
        align: 'center',
        lineSpacing: 3,
      }).setOrigin(0.5, 0.5));

      const zone = this._track(
        this.add.zone(x + slotW / 2, premiseY + slotH / 2, slotW, slotH).setInteractive()
      );
      zone.on('pointerdown', () => this._dropCardIntoSlotB(key));
      this._slotRectsB[key] = { gfx: g, x, y: premiseY, w: slotW, h: slotH, textObj: contentText };
    });

    // Conclusion slot
    const cSlotX = (GAME_DIM.W - slotW) / 2;
    const cg = this._track(this.add.graphics());
    this._drawSlotGraphic(cg, cSlotX, conclusionY, slotW, slotH, null);

    this._track(this.add.text(cSlotX + slotW / 2, conclusionY + 18, 'CONCLUSION', {
      fontFamily: FONTS.HERO,
      ...TYPE.SMALL,
      color: COLORS.L1_ACCENT.str,
      letterSpacing: 3,
    }).setOrigin(0.5, 0));

    const cContentText = this._track(this.add.text(cSlotX + slotW / 2, conclusionY + slotH / 2 + 16, '', {
      fontFamily: FONTS.BODY,
      ...TYPE.BODY,
      color: COLORS.PARCH.str,
      wordWrap: { width: slotW - 28 },
      align: 'center',
      lineSpacing: 3,
    }).setOrigin(0.5, 0.5));

    const cZone = this._track(
      this.add.zone(cSlotX + slotW / 2, conclusionY + slotH / 2, slotW, slotH).setInteractive()
    );
    cZone.on('pointerdown', () => this._dropCardIntoSlotB('conclusion'));
    this._slotRectsB['conclusion'] = { gfx: cg, x: cSlotX, y: conclusionY, w: slotW, h: slotH, textObj: cContentText };
  }

  _drawCaseBCards() {
    const cardW = 330, cardH = 100, gapX = 20, gapY = 16;
    const cols = 5;
    const totalW = cols * cardW + (cols - 1) * gapX;
    const startX = (GAME_DIM.W - totalW) / 2;
    const startY = 600;

    this._cardObjsB = {};

    this._caseBCards.forEach((card, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const cx = startX + col * (cardW + gapX);
      const cy = startY + row * (cardH + gapY);
      this._buildCardB(card, cx, cy, cardW, cardH);
    });
  }

  _buildCardB(card, cx, cy, cardW, cardH) {
    const gfx = this._track(this.add.graphics());
    gfx.fillStyle(COLORS.PANEL.num, 1);
    gfx.lineStyle(2, COLORS.BRASS.num, 0.8);
    gfx.fillRoundedRect(cx, cy, cardW, cardH, 6);
    gfx.strokeRoundedRect(cx, cy, cardW, cardH, 6);

    const txt = this._track(this.add.text(cx + cardW / 2, cy + cardH / 2, card.text, {
      fontFamily: FONTS.BODY,
      ...TYPE.BODY,
      color: COLORS.PARCH.str,
      wordWrap: { width: cardW - 24 },
      align: 'center',
      lineSpacing: 3,
    }).setOrigin(0.5, 0.5));

    const zone = this._track(
      this.add.zone(cx + cardW / 2, cy + cardH / 2, cardW, cardH)
        .setInteractive({ useHandCursor: true })
    );
    zone.on('pointerdown', () => this._selectCaseBCard(card.id));

    this._cardObjsB[card.id] = { gfx, txt, zone, cx, cy, w: cardW, h: cardH, inPool: true };
  }

  _drawCaseBButtons() {
    // Buttons at y=1010 — below the diagnostic banner that now sits at
    // y=920-1000. Earlier they were at y=950, colliding with the banner
    // (y=940-1060) by 50+px.
    const submitDom = this._addDomButton(
      GAME_DIM.W - 380, 1010, 300, 60,
      'SUBMIT ARGUMENT',
      'Submit your inductive argument for evaluation.',
      COLORS.L1_ACCENT.str,
      () => this._submitCaseB(),
      18
    );
    this._submitBtnB = submitDom.node;
    this._submitBtnB.disabled = true;
    this._submitBtnB.style.opacity = '0.35';
    this._trackDOM({ destroy: () => submitDom.destroy() });

    const resetDom = this._addDomButton(
      80, 1010, 200, 60,
      'RESET',
      'Return all cards to the pool.',
      COLORS.MUTED.str,
      () => this._resetCaseB(),
      18
    );
    this._trackDOM({ destroy: () => resetDom.destroy() });
  }

  _selectCaseBCard(cardId) {
    const obj = this._cardObjsB[cardId];
    if (!obj || !obj.inPool) return;
    this._selectedCardIdB = cardId;
    this._highlightCaseBCards();
    const card = CASE_B_CARDS.find(c => c.id === cardId);
    if (card) announce(`Selected: ${card.text}`);
  }

  _highlightCaseBCards() {
    CASE_B_CARDS.forEach(card => {
      const obj = this._cardObjsB[card.id];
      if (!obj) return;
      const visible = obj.inPool;
      obj.gfx.setAlpha(visible ? 1 : 0);
      obj.txt.setAlpha(visible ? 1 : 0);
      if (!visible) return;

      const isSelected = card.id === this._selectedCardIdB;
      obj.gfx.clear();
      if (isSelected) {
        obj.gfx.fillStyle(COLORS.L1_ACCENT.num, 0.18);
        obj.gfx.lineStyle(3, COLORS.L1_ACCENT.num, 1);
      } else {
        obj.gfx.fillStyle(COLORS.PANEL.num, 1);
        obj.gfx.lineStyle(2, COLORS.BRASS.num, 0.8);
      }
      obj.gfx.fillRoundedRect(obj.cx, obj.cy, obj.w, obj.h, 6);
      obj.gfx.strokeRoundedRect(obj.cx, obj.cy, obj.w, obj.h, 6);
    });
  }

  _dropCardIntoSlotB(slotKey) {
    if (!this._selectedCardIdB) return;
    const obj = this._cardObjsB[this._selectedCardIdB];
    if (!obj || !obj.inPool) return;

    const existing = this._slotsB[slotKey];
    if (existing !== null) {
      const exObj = this._cardObjsB[existing];
      if (exObj) exObj.inPool = true;
    }

    this._slotsB[slotKey] = this._selectedCardIdB;
    obj.inPool = false;
    const card = CASE_B_CARDS.find(c => c.id === this._selectedCardIdB);
    this._selectedCardIdB = null;

    this._refreshCaseBSlots();
    this._highlightCaseBCards();
    announce(`Placed in ${slotKey}: ${card ? card.text : ''}`);
  }

  _resetCaseB() {
    this._slotsB = { p1: null, p2: null, p3: null, p4: null, conclusion: null };
    this._selectedCardIdB = null;
    CASE_B_CARDS.forEach(c => {
      const obj = this._cardObjsB[c.id];
      if (obj) obj.inPool = true;
    });
    this._refreshCaseBSlots();
    this._highlightCaseBCards();
    this._clearCaseBFeedback();
    announce('Cards reset to pool.');
  }

  _clearCaseBFeedback() {
    if (this._caseBFeedbackText) {
      try { this._caseBFeedbackText.destroy(); } catch {}
      this._caseBFeedbackText = null;
    }
  }

  _refreshCaseBSlots() {
    Object.keys(this._slotRectsB).forEach(key => {
      const slot = this._slotRectsB[key];
      const cardId = this._slotsB[key];
      this._drawSlotGraphic(slot.gfx, slot.x, slot.y, slot.w, slot.h, cardId);
      if (cardId !== null) {
        const card = CASE_B_CARDS.find(c => c.id === cardId);
        slot.textObj.setText(card ? card.text : '');
      } else {
        slot.textObj.setText('');
      }
    });
    const premiseFilled = ['p1', 'p2', 'p3', 'p4'].every(k => this._slotsB[k] !== null);
    const allFilled = premiseFilled && this._slotsB.conclusion !== null;
    if (this._submitBtnB) {
      this._submitBtnB.disabled = !allFilled;
      this._submitBtnB.style.opacity = allFilled ? '1' : '0.35';
    }
  }

  _submitCaseB() {
    this._clearCaseBFeedback();
    const premiseIds = ['p1', 'p2', 'p3', 'p4'].map(k => this._slotsB[k]).filter(Boolean);
    const concId = this._slotsB.conclusion;

    if (premiseIds.length < 4 || !concId) {
      this._showCaseBDiagnostic('You need 4 premises and 1 conclusion for a strong inductive argument. Add the missing pieces.');
      return;
    }

    const result = this._validateCaseB(premiseIds, concId);

    if (result.strong) {
      this._showCaseBSuccess(result);
    } else {
      this._showCaseBDiagnostic(result.reason);
    }
  }

  _validateCaseB(premiseIds, concId) {
    if (premiseIds.length < 4 || !concId) return { strong: false, reason: 'incomplete' };

    const declared = (concId === 13) ? 'pro' : 'anti';
    const opposing = premiseIds.filter(id => {
      const card = CASE_B_CARDS.find(c => c.id === id);
      return card && card.camp !== 'either' && card.camp !== declared;
    });

    if (opposing.length === 0) return { strong: true, side: declared };

    const oppNames = opposing.map(id => {
      const card = CASE_B_CARDS.find(c => c.id === id);
      return card ? `"${card.text.slice(0, 50)}${card.text.length > 50 ? '…' : ''}"` : '';
    }).filter(Boolean);

    const cerealStatus = declared === 'pro' ? 'cereal IS' : 'cereal is NOT';
    const oppList = oppNames.length === 1 ? oppNames[0] : oppNames.slice(0, -1).join(', ') + ' and ' + oppNames[oppNames.length - 1];
    return {
      strong: false,
      reason: `Your conclusion says ${cerealStatus} a soup. But ${opposing.length} of your premise${opposing.length > 1 ? 's push' : ' pushes'} the OTHER way: ${oppList}. A strong inductive argument needs evidence pulling in ONE direction. Either swap those cards or flip your conclusion.`,
    };
  }

  _showCaseBDiagnostic(message) {
    this._clearCaseBFeedback();
    // Banner at y=920-1000 (h=80), TYPE.BODY 22px instead of LARGE 28 — fits
    // the tight band between Case B's row-3 cards (end y=932 — banner overlaps
    // by 12px, acceptable since cards are non-interactive at submit time) and
    // the buttons at y=1010+.
    const bg = this._track(this.add.graphics());
    bg.fillStyle(0x3A0A0A, 0.9);
    bg.lineStyle(2, COLORS.L1_ACCENT.num, 0.8);
    bg.fillRoundedRect(80, 920, GAME_DIM.W - 160, 80, 6);
    bg.strokeRoundedRect(80, 920, GAME_DIM.W - 160, 80, 6);

    const txt = this._track(this.add.text(GAME_DIM.W / 2, 960, message, {
      fontFamily: FONTS.BODY,
      ...TYPE.BODY,
      color: '#FFB680',
      wordWrap: { width: GAME_DIM.W - 200 },
      align: 'center',
      lineSpacing: 4,
    }).setOrigin(0.5));

    this._caseBFeedbackText = txt;
    announce(message, true);

    if (!PREFERS_REDUCED_MOTION) {
      this.tweens.add({
        targets: [bg, txt], alpha: { from: 1, to: 0 },
        delay: 8000, duration: 1000,
        onComplete: () => { try { bg.destroy(); txt.destroy(); } catch {} },
      });
    } else {
      this.time.delayedCall(9000, () => { try { bg.destroy(); txt.destroy(); } catch {} });
    }
  }

  _showCaseBSuccess(result) {
    announce('Strong inductive argument! Well done.', true);

    const premiseIds = ['p1', 'p2', 'p3', 'p4'].map(k => this._slotsB[k]);
    const cId = this._slotsB.conclusion;
    const premises = premiseIds.map(id => CASE_B_CARDS.find(c => c.id === id)).filter(Boolean);
    const conclusion = CASE_B_CARDS.find(c => c.id === cId);

    const panelW = 1100, panelH = 360;
    const px = (GAME_DIM.W - panelW) / 2;
    const py = (GAME_DIM.H - panelH) / 2;

    const g = this._track(this.add.graphics());
    g.fillStyle(COLORS.PANEL_DK.num, 0.98);
    g.lineStyle(3, 0x44AA44, 1);
    g.fillRoundedRect(px, py, panelW, panelH, 10);
    g.strokeRoundedRect(px, py, panelW, panelH, 10);

    if (!PREFERS_REDUCED_MOTION) {
      g.setAlpha(0);
      this.tweens.add({ targets: g, alpha: 1, duration: 300 });
    }

    this._track(this.add.text(GAME_DIM.W / 2, py + 42, '✓ STRONG INDUCTIVE ARGUMENT', {
      fontFamily: FONTS.HERO,
      fontSize: '28px',
      color: '#88DD88',
      letterSpacing: 4,
    }).setOrigin(0.5));

    const sfLines = premises.map((p, i) => `P${i + 1}: ${p.text}`);
    sfLines.push(`∴ C: ${conclusion ? conclusion.text : ''}`);

    this._track(this.add.text(GAME_DIM.W / 2, py + 110, sfLines.join('\n'), {
      fontFamily: FONTS.BODY,
      ...TYPE.SMALL,
      color: COLORS.PARCH.str,
      wordWrap: { width: panelW - 80 },
      lineSpacing: 8,
      align: 'left',
    }).setOrigin(0.5, 0));

    const contDom = this._addDomButton(
      GAME_DIM.W / 2 - 160, py + 296, 320, 54,
      'CONTINUE TO BRIEFING C →',
      'Proceed to Briefing C.',
      COLORS.BRASS.str,
      () => this._transitionTo('briefing-c-1'),
      17
    );
    this._trackDOM({ destroy: () => contDom.destroy() });
    this.time.delayedCall(80, () => { try { contDom.node.focus(); } catch {} });
  }

  // ── BRIEFING C ─────────────────────────────────────────────────────────────

  _enterBriefingC1() {
    announce('Briefing: Unstated premises. Phase 1 of 3.');
    const built = this._buildBriefingOverlay({
      phaseOf: 1, phaseTotal: 3,
      titleId: 'briefing-c-title',
      title: 'Unstated premises',
      bodyHTML: `
        <p>Sometimes an argument skips a premise. The writer assumes you'll fill it in yourself.
        That hidden piece is called an <strong style="color:${COLORS.BRASS.str}">UNSTATED PREMISE</strong>
        (or implied premise). To analyse the argument properly, you have to surface it — otherwise you can't tell
        whether the argument actually holds together.</p>

        <div style="text-align:center; margin: 28px 0;">
          <img src="assets/images/briefing/sign_crocodile.jpg"
               alt="A 'Beware of Crocodiles' warning sign mounted on a post"
               style="max-width: 460px; max-height: 240px; border-radius: 6px; border: 2px solid ${COLORS.BRASS.str};" />
        </div>

        <p>The sign says <strong style="color:${COLORS.BRASS.str}">&#8220;Beware Crocodiles.&#8221;</strong>
        But that on its own isn&#8217;t really an argument &#8212; it&#8217;s just a warning. The full argument is:</p>

        <div style="margin: 18px 0 18px 28px; font-size: 18px; line-height: 2; color: ${COLORS.MUTED.str};">
          <div><strong style="color:${COLORS.PARCH.str};">P1 (UNSTATED):</strong> Crocodiles live here.</div>
          <div><strong style="color:${COLORS.PARCH.str};">P2 (UNSTATED):</strong> You should be careful around dangerous animals.</div>
          <div><strong style="color:${COLORS.BRASS.str};">∴ C:</strong> Beware.</div>
        </div>

        <p>Both premises are unstated — but you fill them in instantly. That&#8217;s how unstated premises work.</p>
      `,
      btnLabel: 'NEXT →',
      onNext: () => this._transitionTo('briefing-c-2'),
    });
    this._trackDOM({ destroy: built.destroy });
  }
  _exitBriefingC1() {}

  _enterBriefingC2() {
    announce('Briefing: Wet Floor sign — try to identify the unstated premises. Phase 2 of 3.');
    const built = this._buildBriefingOverlay({
      phaseOf: 2, phaseTotal: 3,
      titleId: 'briefing-c-title',
      title: 'Your turn — spot the premises',
      bodyHTML: this._briefingC2HTML(),
      btnLabel: 'NEXT →',
      onNext: () => this._transitionTo('briefing-c-3'),
    });
    this._trackDOM({ destroy: built.destroy });

    // Wire the REVEAL button inside the overlay
    const revealBtn = built.overlay.querySelector('#briefing-c2-reveal-btn');
    const revealDiv = built.overlay.querySelector('#briefing-c2-answer');
    if (revealBtn && revealDiv) {
      revealBtn.addEventListener('click', () => {
        revealDiv.style.display = 'block';
        revealBtn.style.display = 'none';
        announce('Unstated premises revealed. P1: Wet floors are slippery. P2: Slippery surfaces are dangerous. Conclusion: Be careful here.');
      });
    }
  }
  _exitBriefingC2() {}

  _briefingC2HTML() {
    return `
      <div style="text-align:center; margin-bottom: 24px;">
        <img src="assets/images/briefing/sign_wet_floor.jpg"
             alt="A yellow A-frame 'Caution Wet Floor' sign on a tiled floor"
             style="max-width: 460px; max-height: 240px; border-radius: 6px; border: 2px solid ${COLORS.BRASS.str};" />
      </div>

      <p><strong style="color:${COLORS.BRASS.str};">&#8220;Caution &#8212; Wet Floor.&#8221;</strong>
      What&#8217;s the full argument? Try writing it on paper before tapping REVEAL.</p>

      <div style="margin-top: 24px;">
        <button id="briefing-c2-reveal-btn" type="button" style="
          background: transparent;
          color: ${COLORS.L1_ACCENT.str};
          border: 2px solid ${COLORS.L1_ACCENT.str};
          border-radius: 4px;
          font-family: ${FONTS.HERO};
          font-size: 16px;
          letter-spacing: 3px;
          padding: 10px 30px;
          cursor: pointer;
          outline-offset: 3px;
        ">REVEAL ANSWER</button>
      </div>

      <div id="briefing-c2-answer" style="display:none; margin-top: 20px; padding: 20px;
           background: rgba(255,255,255,0.05); border-radius: 6px; border-left: 4px solid ${COLORS.BRASS.str};">
        <div style="line-height: 2; color: ${COLORS.MUTED.str};">
          <div><strong style="color:${COLORS.PARCH.str};">P1 (UNSTATED):</strong> Wet floors are slippery.</div>
          <div><strong style="color:${COLORS.PARCH.str};">P2 (UNSTATED):</strong> Slippery surfaces are dangerous.</div>
          <div><strong style="color:${COLORS.BRASS.str};">∴ C:</strong> Be careful here.</div>
        </div>
      </div>
    `;
  }

  _enterBriefingC3() {
    announce('Briefing: No Smoking sign — identify the unstated premise. Phase 3 of 3.');
    this._briefingC3Answered = false;

    const built = this._buildBriefingOverlay({
      phaseOf: 3, phaseTotal: 3,
      titleId: 'briefing-c-title',
      title: 'Which unstated premise does this sign rely on?',
      bodyHTML: this._briefingC3HTML(),
      btnLabel: 'BEGIN CASE C →',
      onNext: () => this._transitionTo('case-c'),
    });

    // Hide NEXT until MCQ answered correctly
    built.btn.disabled = true;
    built.btn.style.opacity = '0.3';
    this._briefingC3NextBtn = built.btn;
    this._briefingC3Overlay = built.overlay;

    // Wire MCQ buttons
    const choices = [
      { id: 'c3-opt-a', correct: true,  feedback: 'Yes — that\'s it. The sign assumes smoking harms people nearby, not just the smoker. Without that hidden premise, the ban makes no sense.' },
      { id: 'c3-opt-b', correct: false, feedback: 'Cigarettes aren\'t generally illegal — if they were, the sign would be redundant. Try again.' },
      { id: 'c3-opt-c', correct: false, feedback: 'If it were just preference, why bother with a sign? Try again.' },
    ];

    choices.forEach(choice => {
      const btn = built.overlay.querySelector(`#${choice.id}`);
      if (!btn) return;
      btn.addEventListener('click', () => {
        if (this._briefingC3Answered && choice.correct) return; // already correct
        this._handleBriefingC3Choice(choice, built.overlay);
      });
    });

    this._trackDOM({ destroy: built.destroy });
  }
  _exitBriefingC3() {}

  _briefingC3HTML() {
    return `
      <div style="text-align:center; margin-bottom: 24px;">
        <img src="assets/images/briefing/sign_no_smoking.jpg"
             alt="A 'No Smoking' sign"
             style="max-width: 420px; max-height: 280px; border-radius: 6px; border: 2px solid ${COLORS.BRASS.str};" />
      </div>

      <p>The sign says <strong style="color:${COLORS.BRASS.str};">&#8220;No Smoking.&#8221;</strong>
      What&#8217;s the unstated premise this sign relies on?</p>

      <div id="briefing-c3-choices" style="margin-top: 24px; display: flex; flex-direction: column; gap: 12px;">
        <button id="c3-opt-a" type="button" data-label="A" style="
          background: transparent; text-align: left;
          color: ${COLORS.PARCH.str}; border: 2px solid ${COLORS.MUTED.str};
          border-radius: 4px; font-family: ${FONTS.BODY};
          font-size: 17px; padding: 12px 20px; cursor: pointer;
          outline-offset: 3px; transition: border-color 0.15s ease;
        "><strong style="color:${COLORS.BRASS.str};">A:</strong> Smoking is harmful to people nearby.</button>

        <button id="c3-opt-b" type="button" data-label="B" style="
          background: transparent; text-align: left;
          color: ${COLORS.PARCH.str}; border: 2px solid ${COLORS.MUTED.str};
          border-radius: 4px; font-family: ${FONTS.BODY};
          font-size: 17px; padding: 12px 20px; cursor: pointer;
          outline-offset: 3px; transition: border-color 0.15s ease;
        "><strong style="color:${COLORS.BRASS.str};">B:</strong> Cigarettes are illegal in this country.</button>

        <button id="c3-opt-c" type="button" data-label="C" style="
          background: transparent; text-align: left;
          color: ${COLORS.PARCH.str}; border: 2px solid ${COLORS.MUTED.str};
          border-radius: 4px; font-family: ${FONTS.BODY};
          font-size: 17px; padding: 12px 20px; cursor: pointer;
          outline-offset: 3px; transition: border-color 0.15s ease;
        "><strong style="color:${COLORS.BRASS.str};">C:</strong> The owner of this building dislikes the smell of smoke.</button>
      </div>

      <div id="briefing-c3-feedback" style="
        display: none; margin-top: 20px; padding: 16px 20px;
        border-radius: 6px; font-size: 17px; line-height: 1.6;
      "></div>

      <div id="briefing-c3-closing" style="display:none; margin-top: 20px; font-size: 17px; line-height: 1.65;
           padding: 20px; background: rgba(255,255,255,0.05); border-radius: 6px;
           border-left: 4px solid ${COLORS.BRASS.str};">
        <p>In Case C, the prose will give you SOME of the premises and the conclusion. At least one premise will be
        <strong style="color:${COLORS.BRASS.str};">UNSTATED</strong> — you'll have to spot which card in your hand
        fills the gap. The cards all look the same. The work is yours.</p>
      </div>
    `;
  }

  _handleBriefingC3Choice(choice, overlay) {
    const feedbackEl = overlay.querySelector('#briefing-c3-feedback');
    if (!feedbackEl) return;

    feedbackEl.style.display = 'block';
    feedbackEl.textContent = choice.feedback;

    if (choice.correct) {
      feedbackEl.style.background = 'rgba(68,170,68,0.15)';
      feedbackEl.style.borderLeft = '4px solid #44AA44';
      feedbackEl.style.color = '#88DD88';
      this._briefingC3Answered = true;
      announce(choice.feedback, true);

      // Show closing text
      const closingEl = overlay.querySelector('#briefing-c3-closing');
      if (closingEl) closingEl.style.display = 'block';

      // Enable NEXT button
      if (this._briefingC3NextBtn) {
        this._briefingC3NextBtn.disabled = false;
        this._briefingC3NextBtn.style.opacity = '1';
        this.time.delayedCall(60, () => {
          try { this._briefingC3NextBtn.focus(); } catch {}
        });
      }
    } else {
      feedbackEl.style.background = 'rgba(226,90,77,0.12)';
      feedbackEl.style.borderLeft = `4px solid ${COLORS.L1_ACCENT.str}`;
      feedbackEl.style.color = '#FFB680';
      announce(choice.feedback, true);
    }
  }

  // ── CASE C — AI TOOLS (refactored from existing) ──────────────────────────

  _enterCaseC() {
    announce('Case C — AI Tools. Build the argument in standard form. Find the unstated premise.', true);

    if (this._patientSprite) this._patientSprite.setVisible(false);

    const data = CASE_C_DATA;
    this._caseCSlots = { 'P1': null, 'P2': null, '∴ C': null };
    this._selectedCardIdC = null;
    this._caseCAttempts = 0;  // gives the give-up reveal a counter (Fix D)

    // Prose + hint
    const proseX = 160, proseY = 95, proseW = GAME_DIM.W - 320, proseH = 160;
    const pgfx = this._track(this.add.graphics());
    pgfx.fillStyle(COLORS.PARCH.num, 0.10);
    pgfx.lineStyle(2, COLORS.L1_ACCENT.num, 0.7);
    pgfx.fillRoundedRect(proseX, proseY, proseW, proseH, 6);
    pgfx.strokeRoundedRect(proseX, proseY, proseW, proseH, 6);

    this._track(this.add.text(proseX + 24, proseY + 18, 'CASE C — AI Tools', {
      fontFamily: FONTS.HERO, fontSize: '17px',
      color: COLORS.L1_ACCENT.str, letterSpacing: 3,
    }));

    this._track(this.add.text(proseX + 24, proseY + 50, data.prose, {
      fontFamily: FONTS.BODY, fontSize: '22px',
      color: COLORS.PARCH.str,
      wordWrap: { width: proseW - 48 },
      lineSpacing: 8,
    }));

    // Unstated-premise prompt (replaces old hint bar)
    this._track(this.add.text(GAME_DIM.W / 2, proseY + proseH + 18, `⚑  ${data.prompt}`, {
      fontFamily: FONTS.BODY, fontSize: '17px',
      color: '#C8A050', letterSpacing: 1,
    }).setOrigin(0.5));

    // Slots
    this._drawCaseCSlots(data);

    // Cards (all visually identical — no unstated tint, no [UNSTATED] prefix)
    this._drawCaseCCards(data);

    // Buttons
    this._drawCaseCButtons(data);
    this._drawKeyboardHint('[1-5] select card · [A] P1 · [B] P2 · [C] ∴C · Shift+A/B/C return card');
  }
  _exitCaseC() {}

  _drawCaseCSlots(data) {
    const labels = ['P1', 'P2', '∴ C'];
    const slotW = 460, slotH = 130;
    const totalW = labels.length * slotW + (labels.length - 1) * 40;
    const startX = (GAME_DIM.W - totalW) / 2;
    const y = 310;

    this._slotRectsC = {};

    labels.forEach((label, i) => {
      const sx = startX + i * (slotW + 40);
      const g = this._track(this.add.graphics());
      this._drawSlotGraphic(g, sx, y, slotW, slotH, null);

      this._track(this.add.text(sx + 16, y + 16, label, {
        fontFamily: FONTS.HERO, ...TYPE.SMALL,
        color: COLORS.L1_ACCENT.str, letterSpacing: 3,
      }));

      const contentText = this._track(this.add.text(sx + slotW / 2, y + slotH / 2 + 16, '', {
        fontFamily: FONTS.BODY, ...TYPE.BODY,
        color: COLORS.PARCH.str,
        wordWrap: { width: slotW - 32 },
        align: 'center',
        lineSpacing: 4,
      }).setOrigin(0.5, 0.5));

      const zone = this._track(
        this.add.zone(sx + slotW / 2, y + slotH / 2, slotW, slotH).setInteractive()
      );
      zone.on('pointerdown', () => this._dropCardIntoSlotC(label));
      this._slotRectsC[label] = { gfx: g, x: sx, y, w: slotW, h: slotH, textObj: contentText };
    });
  }

  _drawCaseCCards(data) {
    const cardW = 320, cardH = 130;
    const n = data.cards.length;
    const gap = 20;
    const totalW = n * cardW + (n - 1) * gap;
    const startX = (GAME_DIM.W - totalW) / 2;
    const y = 490;

    this._cardObjsC = {};

    data.cards.forEach((card, i) => {
      const cx = startX + i * (cardW + gap);
      this._buildCardC(card, cx, y, cardW, cardH);
    });
  }

  _buildCardC(card, cx, cy, cardW, cardH) {
    // Visually identical — no unstated tint, no [UNSTATED] prefix
    const gfx = this._track(this.add.graphics());
    gfx.fillStyle(COLORS.PANEL.num, 1);
    gfx.lineStyle(2, COLORS.BRASS.num, 0.8);
    gfx.fillRoundedRect(cx, cy, cardW, cardH, 6);
    gfx.strokeRoundedRect(cx, cy, cardW, cardH, 6);

    // Display only card.text — no [UNSTATED] prefix
    const txt = this._track(this.add.text(cx + cardW / 2, cy + cardH / 2, card.text, {
      fontFamily: FONTS.BODY,
      ...TYPE.BODY,
      color: COLORS.PARCH.str,
      wordWrap: { width: cardW - 28 },
      align: 'center',
      lineSpacing: 4,
    }).setOrigin(0.5, 0.5));

    const zone = this._track(
      this.add.zone(cx + cardW / 2, cy + cardH / 2, cardW, cardH)
        .setInteractive({ useHandCursor: true })
    );
    zone.on('pointerdown', () => this._selectCaseCCard(card.id));
    this._cardObjsC[card.id] = { gfx, txt, zone, cx, cy, w: cardW, h: cardH, inPool: true };
  }

  _drawCaseCButtons(data) {
    const submitDom = this._addDomButton(
      GAME_DIM.W / 2 - 160, 680, 320, 60,
      'DIAGNOSE',
      'Check your standard form reconstruction.',
      COLORS.L1_ACCENT.str,
      () => this._submitCaseC(data),
      20
    );
    this._submitBtnC = submitDom.node;
    this._submitBtnC.disabled = true;
    this._submitBtnC.style.opacity = '0.35';
    this._trackDOM({ destroy: () => submitDom.destroy() });
  }

  _selectCaseCCard(cardId) {
    const obj = this._cardObjsC[cardId];
    if (!obj || !obj.inPool) return;
    this._selectedCardIdC = cardId;
    this._highlightCaseCCards();
    const card = CASE_C_DATA.cards.find(c => c.id === cardId);
    if (card) announce(`Selected: ${card.text}`);
  }

  _highlightCaseCCards() {
    CASE_C_DATA.cards.forEach(card => {
      const obj = this._cardObjsC[card.id];
      if (!obj) return;
      const visible = obj.inPool;
      obj.gfx.setAlpha(visible ? 1 : 0);
      obj.txt.setAlpha(visible ? 1 : 0);
      if (!visible) return;

      const isSelected = card.id === this._selectedCardIdC;
      obj.gfx.clear();
      obj.gfx.fillStyle(isSelected ? COLORS.L1_ACCENT.num : COLORS.PANEL.num, isSelected ? 0.18 : 1);
      obj.gfx.lineStyle(isSelected ? 3 : 2, isSelected ? COLORS.L1_ACCENT.num : COLORS.BRASS.num, isSelected ? 1 : 0.8);
      obj.gfx.fillRoundedRect(obj.cx, obj.cy, obj.w, obj.h, 6);
      obj.gfx.strokeRoundedRect(obj.cx, obj.cy, obj.w, obj.h, 6);
    });
  }

  _dropCardIntoSlotC(slotLabel) {
    if (!this._selectedCardIdC) return;
    const obj = this._cardObjsC[this._selectedCardIdC];
    if (!obj || !obj.inPool) return;

    const existing = this._caseCSlots[slotLabel];
    if (existing !== null) {
      const exObj = this._cardObjsC[existing];
      if (exObj) exObj.inPool = true;
    }

    this._caseCSlots[slotLabel] = this._selectedCardIdC;
    obj.inPool = false;
    const card = CASE_C_DATA.cards.find(c => c.id === this._selectedCardIdC);
    this._selectedCardIdC = null;

    this._refreshCaseCSlots();
    this._highlightCaseCCards();
    announce(`Placed in ${slotLabel}: ${card ? card.text : ''}`);
  }

  _returnCardFromSlotC(slotLabel) {
    const cardId = this._caseCSlots[slotLabel];
    if (!cardId) return;
    this._caseCSlots[slotLabel] = null;
    const obj = this._cardObjsC[cardId];
    if (obj) obj.inPool = true;
    this._refreshCaseCSlots();
    this._highlightCaseCCards();
    announce(`Returned card from ${slotLabel} to pool.`);
  }

  _refreshCaseCSlots() {
    const data = CASE_C_DATA;
    Object.keys(this._slotRectsC).forEach(label => {
      const slot = this._slotRectsC[label];
      const cardId = this._caseCSlots[label];
      this._drawSlotGraphic(slot.gfx, slot.x, slot.y, slot.w, slot.h, cardId);
      if (cardId !== null) {
        const card = data.cards.find(c => c.id === cardId);
        slot.textObj.setText(card ? card.text : '');
      } else {
        slot.textObj.setText('');
      }
    });
    const allFilled = Object.values(this._caseCSlots).every(v => v !== null);
    if (this._submitBtnC) {
      this._submitBtnC.disabled = !allFilled;
      this._submitBtnC.style.opacity = allFilled ? '1' : '0.35';
    }
  }

  _submitCaseC(data) {
    const labels = ['P1', 'P2', '∴ C'];
    let allCorrect = true;
    const wrongSlots = [];

    labels.forEach(label => {
      const placedId = this._caseCSlots[label];
      const correctText = data.answers[label];
      const placedCard = data.cards.find(c => c.id === placedId);
      const placedText = placedCard ? placedCard.text : '';
      if (placedText.trim() !== correctText.trim()) {
        allCorrect = false;
        wrongSlots.push(label);
      }
    });

    if (allCorrect) {
      this._showCaseCCorrect(data);
    } else {
      this._showCaseCWrong(data, wrongSlots);
    }
  }

  _showCaseCCorrect(data) {
    announce('Correct! All three slots filled correctly.', true);

    if (!PREFERS_REDUCED_MOTION) {
      ['P1', 'P2', '∴ C'].forEach(label => {
        const { gfx, x, y, w, h } = this._slotRectsC[label];
        this.tweens.add({
          targets: { v: 0 }, v: 1,
          duration: 400, yoyo: true, repeat: 1,
          onUpdate: (tw) => {
            gfx.clear();
            gfx.fillStyle(0x226622, tw.getValue());
            gfx.lineStyle(2, 0x44AA44, 1);
            gfx.fillRoundedRect(x, y, w, h, 6);
            gfx.strokeRoundedRect(x, y, w, h, 6);
          },
        });
      });
    }

    // Post-build follow-up: which premise was unstated?
    this.time.delayedCall(600, () => {
      this._askCaseCUnstatedFollowUp(data);
    });
  }

  _showCaseCWrong(data, wrongSlots) {
    this._caseCAttempts = (this._caseCAttempts || 0) + 1;

    // After 3 wrong submissions, surface the answer instead of letting the
    // student loop forever. Pedagogically: failure resolves into seeing the
    // worked example, not into infinite retry. (Rosenshine 80% success.)
    if (this._caseCAttempts >= 3) {
      this._showCaseCGiveUp(data);
      return;
    }

    const diagnostics = wrongSlots.map(label => this._diagnoseCaseCSlot(data, label));
    const remaining = 3 - this._caseCAttempts;
    announce(
      `Not quite. ${wrongSlots.length} slot${wrongSlots.length > 1 ? 's' : ''} wrong: ` +
      `${wrongSlots.join(', ')}. ${diagnostics[0].hint} ` +
      `${remaining} attempt${remaining > 1 ? 's' : ''} left before the answer is revealed.`,
      true
    );

    if (!PREFERS_REDUCED_MOTION) {
      wrongSlots.forEach(label => {
        const { gfx, x, y, w, h } = this._slotRectsC[label];
        this.tweens.add({
          targets: { v: 0 }, v: 1,
          duration: 200, yoyo: true, repeat: 2,
          onUpdate: (tw) => {
            gfx.clear();
            gfx.fillStyle(0x882222, tw.getValue());
            gfx.lineStyle(2, COLORS.L1_ACCENT.num, 1);
            gfx.fillRoundedRect(x, y, w, h, 6);
            gfx.strokeRoundedRect(x, y, w, h, 6);
          },
          onComplete: () => {
            gfx.clear();
            gfx.fillStyle(COLORS.L1_ACCENT.num, 0.15);
            gfx.lineStyle(2, COLORS.L1_ACCENT.num, 1);
            gfx.fillRoundedRect(x, y, w, h, 6);
            gfx.strokeRoundedRect(x, y, w, h, 6);
          },
        });
      });
    }

    wrongSlots.forEach((label, i) => {
      const { x, y, h } = this._slotRectsC[label];
      const mark = this._track(this.add.text(x + 4, y + 2, '✗', {
        fontFamily: FONTS.HERO, fontSize: '18px', color: '#FF6666',
      }));
      this.time.delayedCall(6000, () => { try { mark.destroy(); } catch {} });

      const hint = this._track(this.add.text(x + 4, y + h + 4, '⚑  ' + diagnostics[i].hint, {
        fontFamily: FONTS.BODY, ...TYPE.SMALL,
        color: '#FFB680', wordWrap: { width: 460 },
      }));
      this.time.delayedCall(6000, () => { try { hint.destroy(); } catch {} });
    });
  }

  /**
   * Triggered after 3 wrong submissions in Case C. Auto-fills the slots with
   * the correct cards, marks the unstated one explicitly, and advances to the
   * follow-up question. Replaces infinite-retry with a graceful resolution
   * that still teaches the move (worked-example fading at the failure floor).
   */
  _showCaseCGiveUp(data) {
    announce(
      'Three attempts used. The correct answer is being revealed. ' +
      'Read the standard-form rebuild carefully — this is the move you\'ll ' +
      'need on the test.', true
    );

    // Auto-fill slots with the correct cards. CASE_C_DATA.answers stores
    // the answer TEXT (not an id), so we look up the card by text match.
    Object.entries(data.answers).forEach(([label, answerText]) => {
      const card = data.cards.find(c => c.text === answerText);
      if (!card) return;
      this._caseCSlots[label] = card.id;
      const slot = this._slotRectsC[label];
      if (slot) {
        slot.gfx.clear();
        slot.gfx.fillStyle(COLORS.PANEL_DK.num, 0.95);
        slot.gfx.lineStyle(2, COLORS.BRASS.num, 0.9);
        slot.gfx.fillRoundedRect(slot.x, slot.y, slot.w, slot.h, 6);
        slot.gfx.strokeRoundedRect(slot.x, slot.y, slot.w, slot.h, 6);
        if (slot.textObj) slot.textObj.setText(card.text);
      }
    });

    // Scrim FIRST — dim the underlying cards/slots so the modal sits on a
    // clean field rather than visually mixing with the play area.
    const scrim = this._track(this.add.graphics());
    scrim.fillStyle(0x000000, 0.7);
    scrim.fillRect(0, 0, GAME_DIM.W, GAME_DIM.H);

    // Modal panel explaining the give-up + flagging the unstated card
    const pw = 1100, ph = 360;
    const px = (GAME_DIM.W - pw) / 2;
    const py = (GAME_DIM.H - ph) / 2 - 40;

    const g = this._track(this.add.graphics());
    g.fillStyle(COLORS.PANEL_DK.num, 0.97);
    g.lineStyle(3, COLORS.BRASS.num);
    g.fillRoundedRect(px, py, pw, ph, 10);
    g.strokeRoundedRect(px, py, pw, ph, 10);

    this._track(this.add.text(GAME_DIM.W / 2, py + 40, 'ANSWER REVEALED', {
      fontFamily: FONTS.HERO, ...TYPE.LARGE,
      color: COLORS.BRASS.str, letterSpacing: 5,
    }).setOrigin(0.5));

    // The unstated premise is the one with `unstated: true` in the cards array.
    const unstatedCard = data.cards.find(c => c.unstated);
    const unstatedText = unstatedCard ? unstatedCard.text : '';

    const explainText =
      `The slots are now filled with the correct cards.\n\n` +
      `The UNSTATED premise — the one that wasn't in the original prose but is needed ` +
      `for the argument to work — is "${unstatedText.slice(0, 90)}${unstatedText.length > 90 ? '…' : ''}"\n\n` +
      `On the test, your job is the same. Spot the hidden premise the writer leaves out — usually a value claim ("we should…", "this is wrong").`;

    this._track(this.add.text(GAME_DIM.W / 2, py + 90, explainText, {
      fontFamily: FONTS.BODY, ...TYPE.BODY,
      color: COLORS.PARCH.str, wordWrap: { width: pw - 60 },
      align: 'center', lineSpacing: 4,
    }).setOrigin(0.5, 0));

    // Continue button
    const continueBtn = this._addDomButton(
      GAME_DIM.W / 2 - 200, py + ph - 90, 400, 60,
      'CONTINUE →',
      'Proceed to the follow-up question.',
      COLORS.BRASS.str,
      () => this._askCaseCUnstatedFollowUp(data),
      24
    );
    // Use _trackDOM so the give-up CONTINUE button is cleaned up alongside
    // other DOM elements on phase exit (was _track which is for Phaser
    // GameObjects only).
    this._trackDOM({ destroy: () => { try { continueBtn.destroy(); } catch {} } });
  }

  _diagnoseCaseCSlot(data, label) {
    const placedId = this._caseCSlots[label];
    const placedCard = data.cards.find(c => c.id === placedId);
    if (!placedCard) return { hint: 'Slot is empty — drop a card here.' };
    const id = placedCard.id;

    if (id === 'C_d1' || id === 'C_d2') {
      return { hint: `"${placedCard.text.slice(0, 60)}" isn't part of THIS argument — it's a distractor. Look for sentences from the original prose.` };
    }
    if (label !== '∴ C' && id === 'C_c') {
      return { hint: 'That\'s the CONCLUSION (the claim being argued for). Premises are the SUPPORTING reasons — move it to ∴ C.' };
    }
    if (label === '∴ C' && (id === 'C_p1' || id === 'C_p2')) {
      return { hint: 'That\'s a PREMISE — a supporting reason. The conclusion is the main claim being argued FOR.' };
    }
    if ((label === 'P1' || label === 'P2') && (id === 'C_p1' || id === 'C_p2')) {
      return { hint: 'Right type of card, wrong slot — P1 and P2 may need to swap. Read the prose order.' };
    }
    return { hint: `This card doesn't match what should go in ${label}. Check the prose carefully.` };
  }

  _askCaseCUnstatedFollowUp(data) {
    // Scrim — dim the play area so the follow-up MCQ doesn't visually mix
    // with cards/slots underneath.
    const scrim = this._track(this.add.graphics());
    scrim.fillStyle(0x000000, 0.7);
    scrim.fillRect(0, 0, GAME_DIM.W, GAME_DIM.H);

    const pw = 920, ph = 380;
    const px = (GAME_DIM.W - pw) / 2;
    const py = (GAME_DIM.H - ph) / 2 - 40;

    const g = this._track(this.add.graphics());
    g.fillStyle(COLORS.PANEL_DK.num, 0.98);
    g.lineStyle(3, COLORS.L1_ACCENT.num);
    g.fillRoundedRect(px, py, pw, ph, 10);
    g.strokeRoundedRect(px, py, pw, ph, 10);

    this._track(this.add.text(GAME_DIM.W / 2, py + 38, 'ONE MORE QUESTION', {
      fontFamily: FONTS.HERO, ...TYPE.LARGE,
      color: COLORS.BRASS.str, letterSpacing: 5,
    }).setOrigin(0.5));

    this._track(this.add.text(GAME_DIM.W / 2, py + 86,
      'Read the original prose again. Which premise was UNSTATED — i.e. not actually written, but assumed?',
      {
        fontFamily: FONTS.BODY, ...TYPE.BODY, color: COLORS.PARCH.str,
        wordWrap: { width: pw - 80 }, align: 'center', lineSpacing: 6,
      }).setOrigin(0.5));

    this._track(this.add.text(GAME_DIM.W / 2, py + 162,
      `"${data.prose}"`,
      {
        fontFamily: FONTS.BODY, ...TYPE.SMALL, color: COLORS.STEEL.str,
        fontStyle: 'italic', wordWrap: { width: pw - 100 }, align: 'center',
      }).setOrigin(0.5));

    const choices = data.unstatedChoices;
    const btnW = 180, btnH = 60, gap = 24;
    const totalW = choices.length * btnW + (choices.length - 1) * gap;
    const x0 = (GAME_DIM.W - totalW) / 2;

    choices.forEach((c, i) => {
      const dom = this._addDomButton(
        x0 + i * (btnW + gap), py + 252, btnW, btnH,
        c.label, `Mark ${c.label} as the unstated premise.`,
        COLORS.L1_ACCENT.str,
        () => this._answerCaseCUnstated(c),
        22
      );
      this._trackDOM({ destroy: () => dom.destroy() });
    });

    announce('Which premise was unstated — P1, P2, or conclusion?', true);
  }

  _answerCaseCUnstated(choice) {
    const correct = choice.isUnstated;
    announce(correct ? 'Correct. P2 was unstated.' : `Not quite — ${choice.why}`, true);

    const pw = 920, ph = 320;
    const px = (GAME_DIM.W - pw) / 2;
    const py = (GAME_DIM.H - ph) / 2 - 40;

    const g = this._track(this.add.graphics());
    g.fillStyle(COLORS.PANEL_DK.num, 0.98);
    g.lineStyle(3, correct ? 0x44AA44 : COLORS.L1_ACCENT.num);
    g.fillRoundedRect(px, py, pw, ph, 10);
    g.strokeRoundedRect(px, py, pw, ph, 10);

    this._track(this.add.text(GAME_DIM.W / 2, py + 50, correct ? '✓  CORRECT' : '✗  NOT QUITE', {
      fontFamily: FONTS.HERO, fontSize: '28px',
      color: correct ? '#88DD88' : COLORS.L1_ACCENT.str, letterSpacing: 5,
    }).setOrigin(0.5));

    this._track(this.add.text(GAME_DIM.W / 2, py + 130, choice.why, {
      fontFamily: FONTS.BODY, ...TYPE.BODY, color: COLORS.PARCH.str,
      wordWrap: { width: pw - 80 }, align: 'center', lineSpacing: 6,
    }).setOrigin(0.5));

    if (!correct) {
      this._track(this.add.text(GAME_DIM.W / 2, py + 215, 'Have another think — the answer is one of P1, P2, or ∴ C.', {
        fontFamily: FONTS.BODY, ...TYPE.SMALL, color: COLORS.STEEL.str,
        fontStyle: 'italic', align: 'center',
      }).setOrigin(0.5));

      const retryDom = this._addDomButton(
        GAME_DIM.W / 2 - 140, py + 252, 280, 52,
        'TRY AGAIN', 'Re-attempt the unstated-premise question.',
        COLORS.L1_ACCENT.str,
        () => {
          // Clean up the panel objects that were added since followup started,
          // then re-ask. The safest approach: transition to a sub-state within case-c.
          // Here we simply redraw over the existing graphics.
          try { g.destroy(); } catch {}
          this._askCaseCUnstatedFollowUp(CASE_C_DATA);
        }, 18
      );
      this._trackDOM({ destroy: () => retryDom.destroy() });
      this.time.delayedCall(80, () => { try { retryDom.node.focus(); } catch {} });
    } else {
      const completeDom = this._addDomButton(
        GAME_DIM.W / 2 - 140, py + 232, 280, 52,
        'COMPLETE ✓', 'Finish the lesson.',
        COLORS.L1_ACCENT.str,
        () => this._transitionTo('complete'),
        18
      );
      this._trackDOM({ destroy: () => completeDom.destroy() });
      this.time.delayedCall(80, () => { try { completeDom.node.focus(); } catch {} });
    }
  }

  // ── COMPLETE PHASE ─────────────────────────────────────────────────────────

  _enterComplete() {
    StateManager.completeLesson(this.state, 'L1', ['major-premise-card', 'inductive-evidence-card', 'unstated-premise-card']);
    const digit = this.state.codeDigits[0];
    announce(`Lesson complete! All three argument cases completed. Digit recovered: ${digit}. Returning to hub.`, true);

    const pw = 700, ph = 320;
    const px = (GAME_DIM.W - pw) / 2;
    const py = (GAME_DIM.H - ph) / 2 - 40;

    const g = this._track(this.add.graphics());
    g.fillStyle(COLORS.PANEL_DK.num, 0.98);
    g.lineStyle(3, COLORS.L1_ACCENT.num);
    g.fillRoundedRect(px, py, pw, ph, 10);
    g.strokeRoundedRect(px, py, pw, ph, 10);

    if (!PREFERS_REDUCED_MOTION) {
      g.setAlpha(0);
      this.tweens.add({ targets: g, alpha: 1, duration: 350 });
    }

    this._track(this.add.text(GAME_DIM.W / 2, py + 60, 'CASE FILES COMPLETE', {
      fontFamily: FONTS.HERO, fontSize: '34px',
      color: COLORS.L1_ACCENT.str, letterSpacing: 5,
    }).setOrigin(0.5));

    this._track(this.add.text(GAME_DIM.W / 2, py + 140, `DIGIT RECOVERED: ${digit}`, {
      fontFamily: FONTS.HERO, fontSize: '52px',
      color: COLORS.BRASS.str,
    }).setOrigin(0.5));

    this._track(this.add.text(GAME_DIM.W / 2, py + 215, 'Three arguments analysed and reconstructed.', {
      fontFamily: FONTS.BODY, ...TYPE.BODY,
      color: COLORS.PARCH.str,
    }).setOrigin(0.5));

    const hubDom = this._addDomButton(
      GAME_DIM.W / 2 - 140, py + 256, 280, 52,
      'RETURN TO HUB', 'Return to the operating theatre hub.',
      COLORS.BRASS.str,
      () => this.scene.start('HubScene', { podCode: this.podCode, state: this.state }),
      18
    );
    this._trackDOM({ destroy: () => hubDom.destroy() });
    this.time.delayedCall(80, () => { try { hubDom.node.focus(); } catch {} });
  }
  _exitComplete() {}

  // ── KEYBOARD HANDLING ──────────────────────────────────────────────────────

  _wireKeyboard() {
    this._keyHandler = (e) => {
      const k = e.key;

      // Esc — close active dialog OR go to hub
      if (k === 'Escape') {
        if (this._activeDialog) {
          this._activeDialog.destroy();
          this._activeDialog = null;
          return;
        }
        this._cleanupPhaseUI();
        this.scene.start('HubScene', { podCode: this.podCode, state: this.state });
        return;
      }

      // Dev shortcut
      if (k === 'd' || k === 'D') {
        StateManager.completeLesson(this.state, 'L1', ['major-premise-card', 'inductive-evidence-card', 'unstated-premise-card']);
        this._cleanupPhaseUI();
        this.scene.start('HubScene', { podCode: this.podCode, state: this.state });
        return;
      }

      // Phase-specific keyboard shortcuts
      const phase = this._currentPhase;

      if (phase === 'case-a') this._handleKeyboardCaseA(k, e);
      else if (phase === 'case-b') this._handleKeyboardCaseB(k, e);
      else if (phase === 'case-c') this._handleKeyboardCaseC(k, e);
    };
    this.input.keyboard.on('keydown', this._keyHandler);
  }

  _handleKeyboardCaseA(k, e) {
    // Number keys 1-8 select card (by display position in _caseACards)
    if (/^[1-8]$/.test(k)) {
      const idx = parseInt(k, 10) - 1;
      const card = this._caseACards ? this._caseACards[idx] : null;
      if (card) {
        const obj = this._cardObjsA && this._cardObjsA[card.id];
        if (obj && obj.inPool) this._selectCaseACard(card.id);
      }
      return;
    }
    const slotMap = { m: 'major', n: 'minor', c: 'conclusion' };
    if (slotMap[k.toLowerCase()]) {
      this._dropCardIntoSlotA(slotMap[k.toLowerCase()]);
      return;
    }
    if (k === 'r' || k === 'R') { this._resetCaseA(); return; }
    if (k === 'Enter') { if (this._submitBtnA && !this._submitBtnA.disabled) this._submitCaseA(); }
  }

  _handleKeyboardCaseB(k, e) {
    if (/^[0-9]$/.test(k)) {
      // Single digit can't address 14 cards — use keyboard hint for context
      const idx = parseInt(k, 10) - 1;
      if (idx >= 0 && idx < this._caseBCards.length) {
        const card = this._caseBCards[idx];
        const obj = this._cardObjsB && this._cardObjsB[card.id];
        if (obj && obj.inPool) this._selectCaseBCard(card.id);
      }
      return;
    }
    const premiseMap = { '1': 'p1', '2': 'p2', '3': 'p3', '4': 'p4' };
    // Keys a/b/c/d for premise slots when Shift held
    if (e.shiftKey) {
      const pm = { A: 'p1', B: 'p2', C: 'p3', D: 'p4' };
      if (pm[k]) { this._dropCardIntoSlotB(pm[k]); return; }
      if (k === 'C') { this._dropCardIntoSlotB('conclusion'); return; }
    }
    if (k === 'c' || k === 'C') { this._dropCardIntoSlotB('conclusion'); return; }
    if (k === 'r' || k === 'R') { this._resetCaseB(); return; }
    if (k === 'Enter') { if (this._submitBtnB && !this._submitBtnB.disabled) this._submitCaseB(); }
  }

  _handleKeyboardCaseC(k, e) {
    if (/^[1-5]$/.test(k)) {
      const idx = parseInt(k, 10) - 1;
      const card = CASE_C_DATA.cards[idx];
      if (card) {
        const obj = this._cardObjsC && this._cardObjsC[card.id];
        if (obj && obj.inPool) this._selectCaseCCard(card.id);
      }
      return;
    }
    const slotMap = { a: 'P1', b: 'P2', c: '∴ C' };
    if (slotMap[k.toLowerCase()]) {
      this._dropCardIntoSlotC(slotMap[k.toLowerCase()]);
      return;
    }
    if (e.shiftKey) {
      const retMap = { A: 'P1', B: 'P2', C: '∴ C' };
      if (retMap[k]) { this._returnCardFromSlotC(retMap[k]); return; }
    }
    if (k === 'Enter') { if (this._submitBtnC && !this._submitBtnC.disabled) this._submitCaseC(CASE_C_DATA); }
  }

  // ── KEYBOARD HINT (bottom of screen, phase-specific) ──────────────────────

  _drawKeyboardHint(msg) {
    this._track(this.add.text(GAME_DIM.W / 2, GAME_DIM.H - 28, msg, {
      fontFamily: FONTS.BODY,
      ...TYPE.SMALL,
      color: COLORS.MUTED.str,
      letterSpacing: 1,
    }).setOrigin(0.5));
  }

  // ── DOM BUTTON HELPER (mirrors l2-scene.js) ───────────────────────────────

  _addDomButton(x, y, w, h, label, ariaLabel, accentStr, onClick, fontSize = 18) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = label;
    btn.setAttribute('aria-label', ariaLabel);
    btn.style.cssText = `
      width: ${w}px; height: ${h}px;
      background: transparent;
      color: ${accentStr};
      border: 2px solid ${accentStr};
      border-radius: 4px;
      font-family: ${FONTS.HERO};
      font-size: ${fontSize}px;
      letter-spacing: 4px;
      cursor: pointer;
      transition: background 0.15s ease, color 0.15s ease;
      padding: 0;
      outline-offset: 3px;
    `;
    const hoverIn  = () => { btn.style.background = accentStr; btn.style.color = COLORS.BG_INK.str; };
    const hoverOut = () => { btn.style.background = 'transparent'; btn.style.color = accentStr; };
    btn.addEventListener('mouseenter', hoverIn);
    btn.addEventListener('mouseleave', hoverOut);
    btn.addEventListener('focus',   hoverIn);
    btn.addEventListener('blur',    hoverOut);
    btn.addEventListener('click',   onClick);
    const dom = this.add.dom(x + w / 2, y + h / 2, btn);
    this.domNodes.push(dom);
    return dom;
  }

  // ── UTILITY ───────────────────────────────────────────────────────────────

  _shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  // ── CLEANUP ───────────────────────────────────────────────────────────────

  _cleanup() {
    if (this._keyHandler) {
      this.input.keyboard.off('keydown', this._keyHandler);
      this._keyHandler = null;
    }
    this._cleanupPhaseUI();
    // Destroy all remaining Phaser DOM nodes (persistent back button etc.)
    this.domNodes.forEach(d => { try { d.destroy(); } catch {} });
    this.domNodes = [];
    // Remove any briefing overlays left in DOM
    document.querySelectorAll('.briefing-overlay').forEach(el => {
      try { el.remove(); } catch {}
    });
  }
}

// Explicit global assignment (consistent with l2-scene.js pattern)
window.L1Scene = L1Scene;
