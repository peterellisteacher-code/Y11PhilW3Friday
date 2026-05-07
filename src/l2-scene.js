'use strict';

// ── L2Scene — Validity Court ──────────────────────────────────────────────────
// Four questions:
//   Q1: Valid/Invalid verdict on dog/banana (correct: VALID)
//   Q2: Valid/Invalid verdict on dog/mammal reversed (correct: INVALID)
//   Q3: Drag-drop counter-example for affirming-the-consequent (card A correct)
//   Q4: Strong/Weak verdict on peanut inductive argument (correct: STRONG)
// ─────────────────────────────────────────────────────────────────────────────

class L2Scene extends Phaser.Scene {
  constructor() { super({ key: 'L2Scene' }); }

  // ── LIFECYCLE ───────────────────────────────────────────────────────────────

  init(data) {
    this.podCode  = data.podCode;
    this.state    = data.state;
    this.domNodes = [];
    this._keyHandler = null;

    // Q3 drag state
    this._selectedCard = null;  // index 0/1/2 or null
    this._cardSprites  = [];
    this._dropZone     = null;
    this._dragging     = null;  // { sprite, startX, startY }

    // Focus trap state
    this._focusTrapHandler = null;
    this._lastFocus        = null;
  }

  create() {
    // Safety: ensure init() properties exist even if scene was force-started
    if (!this.domNodes) this.domNodes = [];
    if (!this._cardSprites) this._cardSprites = [];
    if (!this.podCode) this.podCode = 'TEST';
    if (!this.state) this.state = StateManager.create('TEST', 0);

    this._q = 0;  // 0-based question index (0, 1, 2, 3)
    this._answers = [null, null, null, null];  // track right/wrong per Q

    // Background
    this.add.image(GAME_DIM.W / 2, GAME_DIM.H / 2, 'chamber_l2').setDisplaySize(GAME_DIM.W, GAME_DIM.H);

    // Dark overlay for contrast
    const ov = this.add.graphics();
    ov.fillStyle(0x000000, 0.52);
    ov.fillRect(0, 0, GAME_DIM.W, GAME_DIM.H);

    this._buildTopBar();
    this._buildArgumentPanel();
    this._buildInteractive();

    this._wireKeyboard();
    this.events.once('shutdown', () => this._cleanup());
    this.events.once('destroy',  () => this._cleanup());

    announce(
      'Validity Court. Question 1 of 4. Judge whether the argument is VALID or INVALID.',
      true
    );
  }

  // ── TOP BAR ─────────────────────────────────────────────────────────────────

  _buildTopBar() {
    const g = this.add.graphics();
    g.fillStyle(COLORS.PANEL_DK.num, 0.95);
    g.fillRect(0, 0, GAME_DIM.W, 80);
    g.lineStyle(1, COLORS.L2_ACCENT.num, 0.9);
    g.lineBetween(0, 80, GAME_DIM.W, 80);

    // Back button
    this._addDomButton(
      20, 12, 220, 56,
      '← BACK TO HUB',
      'Back to hub. Press Escape.',
      COLORS.BRASS.str,
      () => this.scene.start('HubScene', { podCode: this.podCode, state: this.state }),
      14
    );

    // Title
    this.add.text(GAME_DIM.W / 2, 40, 'VALIDITY COURT · Verdicts & Counter-Examples', {
      fontFamily: FONTS.HERO,
      fontSize: '28px',
      color: COLORS.L2_ACCENT.str,
      letterSpacing: 3,
    }).setOrigin(0.5);

    // Q counter (updated dynamically)
    this._qCounterText = this.add.text(GAME_DIM.W - 40, 40, 'Q 1 / 4', {
      fontFamily: FONTS.HERO,
      fontSize: '22px',
      color: COLORS.PARCH.str,
    }).setOrigin(1, 0.5);
  }

  _updateQCounter() {
    this._qCounterText.setText(`Q ${this._q + 1} / 4`);
  }

  // ── ARGUMENT PANEL ───────────────────────────────────────────────────────────

  _buildArgumentPanel() {
    // Panel background
    const g = this.add.graphics();
    g.fillStyle(COLORS.PANEL.num, 0.90);
    g.fillRoundedRect(160, 100, GAME_DIM.W - 320, 400, 8);
    g.lineStyle(2, COLORS.L2_ACCENT.num, 0.7);
    g.strokeRoundedRect(160, 100, GAME_DIM.W - 320, 400, 8);
    // Accent bar
    g.fillStyle(COLORS.L2_ACCENT.num, 1);
    g.fillRect(160, 100, GAME_DIM.W - 320, 6);

    // "EXHIBIT" stamp label
    this.add.text(200, 128, 'COURT EXHIBIT', {
      fontFamily: FONTS.HERO,
      fontSize: '14px',
      color: COLORS.L2_ACCENT.str,
      letterSpacing: 4,
    });

    // Argument lines — updated per question
    const lineStyle = { fontFamily: FONTS.BODY, fontSize: '30px', color: COLORS.PARCH.str };
    this._p1Text = this.add.text(GAME_DIM.W / 2, 190, '', { ...lineStyle }).setOrigin(0.5);
    this._p2Text = this.add.text(GAME_DIM.W / 2, 260, '', { ...lineStyle }).setOrigin(0.5);
    // Divider line before conclusion
    this._divider = this.add.graphics();
    this._cText   = this.add.text(GAME_DIM.W / 2, 370, '', { ...lineStyle }).setOrigin(0.5);

    // Per-question task instruction (e.g. "Is this argument VALID or INVALID?",
    // or for Q3: the long INVALID-find-counter-example sentence). This is the
    // single most important line on screen during a question — sized and
    // coloured to draw the eye, with wordWrap for long Q3 prompts.
    this._promptText = this.add.text(GAME_DIM.W / 2, 440, '', {
      fontFamily: FONTS.HERO,
      fontSize: '28px',
      color: COLORS.PARCH.str,
      letterSpacing: 2,
      wordWrap: { width: GAME_DIM.W - 240 },
      align: 'center',
    }).setOrigin(0.5);

    this._populateArgument();
  }

  _populateArgument() {
    const args = [
      {
        p1: 'P1: Every dog is a banana',
        p2: 'P2: I have a dog',
        c:  'C:  My dog is a banana',
        prompt: 'Is this argument VALID or INVALID?',
      },
      {
        p1: 'P1: Every dog is a mammal',
        p2: 'P2: I have a mammal',
        c:  'C:  My mammal is a dog',
        prompt: 'Is this argument VALID or INVALID?',
      },
      {
        p1: 'P1: If it is raining, the streets are wet.',
        p2: 'P2: The streets are wet.',
        c:  'C:  Therefore, it is raining.',
        prompt: 'This argument is INVALID. Drag the COURT EXHIBIT — the counter-example — into the evidence slot.',
      },
      {
        p1: 'P1: Every time I eat peanuts, I get a headache.',
        p2: 'P2: I ate peanuts an hour ago.',
        c:  '∴ C: Therefore, I will probably get a headache soon.',
        prompt: 'This is an INDUCTIVE argument (the conclusion is probable, not certain). Judge its STRENGTH.',
      },
    ];
    const a = args[this._q];
    this._p1Text.setText(a.p1);
    this._p2Text.setText(a.p2);

    // Draw divider before conclusion
    this._divider.clear();
    this._divider.lineStyle(1, COLORS.BRASS.num, 0.6);
    this._divider.lineBetween(260, 325, GAME_DIM.W - 260, 325);

    this._cText.setText(a.c);
    this._promptText.setText(a.prompt);
    this._updateQCounter();
  }

  // ── INTERACTIVE LAYER ────────────────────────────────────────────────────────

  _buildInteractive() {
    // Container for Q-specific interactive elements (buttons, reveal, cards)
    this._interactiveGroup = this.add.container(0, 0);
    this._revealGroup      = this.add.container(0, 0);

    if (this._q === 0 || this._q === 1) {
      this._buildVerdictButtons();
    } else if (this._q === 2) {
      this._showQ3Briefing(() => this._buildDragDrop());
    } else {
      this._buildStrengthButtons();
    }
  }

  _destroyInteractive() {
    // Destroy DOM buttons
    this._verdictDoms = (this._verdictDoms || []).filter(d => {
      try { d.destroy(); } catch {} return false;
    });
    this.domNodes = this.domNodes.filter(d => {
      // Keep back button (first one added in _buildTopBar), remove rest
      return false;
    });
    // Clear containers
    this._interactiveGroup.removeAll(true);
    this._revealGroup.removeAll(true);
    // Clear card sprites
    this._cardSprites.forEach(s => { try { s.destroy(); } catch {} });
    this._cardSprites = [];
    if (this._dropZone) { try { this._dropZone.destroy(); } catch {} this._dropZone = null; }
    if (this._dropLabel) { try { this._dropLabel.destroy(); } catch {} this._dropLabel = null; }
    if (this._placeBtn) { try { this._placeBtn.destroy(); } catch {} this._placeBtn = null; }
  }

  // ── Q1 / Q2: VERDICT BUTTONS ─────────────────────────────────────────────────

  _buildVerdictButtons() {
    this._verdictDoms = [];

    const accent = COLORS.L2_ACCENT.str;
    const steel  = COLORS.STEEL.str;

    // VALID button (left)
    const vDom = this._addDomButton(
      260, 520, 580, 100,
      'VALID',
      'Click to judge this argument as VALID.',
      accent,
      () => this._handleVerdict('VALID'),
      46
    );
    this._verdictDoms.push(vDom);

    // INVALID button (right)
    const ivDom = this._addDomButton(
      1080, 520, 580, 100,
      'INVALID',
      'Click to judge this argument as INVALID.',
      steel,
      () => this._handleVerdict('INVALID'),
      46
    );
    this._verdictDoms.push(ivDom);
  }

  _handleVerdict(verdict) {
    const correctAnswers = ['VALID', 'INVALID'];
    const correct = verdict === correctAnswers[this._q];

    this._answers[this._q] = correct;
    this._showVerdictReveal(correct, verdict);
  }

  _showVerdictReveal(correct, verdict) {
    // Disable verdict buttons
    this._verdictDoms.forEach(d => {
      const el = d.node;
      el.disabled = true;
      el.style.opacity = '0.4';
      el.style.cursor  = 'default';
    });

    const reveals = [
      "The conclusion logically follows from the premises: it is impossible for it to be false if the premises are true. Validity is about the logical relationship — even if the premises are absurd, the form is valid. (This argument is NOT sound, because P1 is false — but soundness and validity are different.)",
      "The conclusion can be false even though the premises are true. Plenty of mammals are not dogs (cats, cows, whales). 'Every dog is a mammal' does not mean 'every mammal is a dog' — that's a logical reversal.",
    ];

    // Diagnostic wrong-answer feedback per question
    const wrongFeedback = [
      // Q1: chose INVALID for dog/banana
      "Re-check — VALIDITY is about logical FORM, not whether the premises are TRUE. Even though 'every dog is a banana' is false, IF it were true, the conclusion would have to follow. That's the definition of valid. (Soundness — which checks if premises are also true — is a different question.)",
      // Q2: chose VALID for dog/mammal-reversed
      "Re-check — find a counterexample. 'Every dog is a mammal' does NOT mean 'every mammal is a dog'. Plenty of mammals (cats, cows, whales) are not dogs. So even with true premises, the conclusion can be false. That makes it INVALID.",
    ];

    const revealText = correct ? reveals[this._q] : wrongFeedback[this._q];
    const resultColor = correct ? COLORS.BRASS.str : COLORS.L2_ACCENT.str;
    const resultLabel = correct ? '✔ CORRECT' : '✗ INCORRECT';

    // Reveal panel
    const panelG = this.add.graphics();
    panelG.fillStyle(correct ? COLORS.PANEL.num : 0x200808, 0.96);
    panelG.fillRoundedRect(160, 650, GAME_DIM.W - 320, 320, 8);
    panelG.lineStyle(2, correct ? COLORS.BRASS.num : COLORS.L2_ACCENT.num);
    panelG.strokeRoundedRect(160, 650, GAME_DIM.W - 320, 320, 8);
    this._revealGroup.add(panelG);

    const resultLbl = this.add.text(GAME_DIM.W / 2, 690, resultLabel, {
      fontFamily: FONTS.HERO,
      fontSize: '32px',
      color: resultColor,
      letterSpacing: 4,
    }).setOrigin(0.5);
    this._revealGroup.add(resultLbl);

    const revealTxt = this.add.text(GAME_DIM.W / 2, 760, revealText, {
      fontFamily: FONTS.BODY,
      fontSize: '22px',
      color: COLORS.PARCH.str,
      wordWrap: { width: GAME_DIM.W - 400 },
      align: 'center',
    }).setOrigin(0.5, 0);
    this._revealGroup.add(revealTxt);

    // Slide up reveal if motion OK
    if (!PREFERS_REDUCED_MOTION) {
      this._revealGroup.setAlpha(0);
      this.tweens.add({ targets: this._revealGroup, alpha: 1, duration: 350 });
    }

    // Flash screen tint for feedback
    if (!PREFERS_REDUCED_MOTION) {
      this.cameras.main.flash(300, 0, correct ? 80 : 0, correct ? 0 : 80);
    }

    const verdictStr = correct
      ? `Correct — the argument is ${verdict}.`
      : `Not quite. The argument is ${verdict === 'VALID' ? 'INVALID' : 'VALID'}.`;
    announce(verdictStr + ' ' + revealText, true);

    // "NEXT" button — always proceed after explicit NEXT
    const nextDom = this._addDomButton(
      GAME_DIM.W / 2 - 160, 940, 320, 60,
      correct ? 'NEXT QUESTION →' : 'NEXT →',
      correct ? 'Proceed to next question.' : 'Proceed to next question.',
      correct ? COLORS.BRASS.str : COLORS.L2_ACCENT.str,
      () => this._advanceQuestion()
    );
    this._verdictDoms.push(nextDom);

    // Focus trap on the reveal panel DOM area
    this._trapFocus(nextDom.node);
  }

  _advanceQuestion() {
    this._releaseFocusTrap();
    this._q++;

    // Wipe the dynamic DOM buttons added during verdict phase (all except back btn)
    this._verdictDoms.forEach(d => { try { d.destroy(); } catch {} });
    this._verdictDoms = [];

    this._revealGroup.removeAll(true);
    this._revealGroup.setAlpha(1);

    this._populateArgument();

    if (this._q === 0 || this._q === 1) {
      this._buildVerdictButtons();
    } else if (this._q === 2) {
      this._showQ3Briefing(() => this._buildDragDrop());
    } else {
      this._buildStrengthButtons();
    }

    const announcements = [
      'Question 1 of 4. Judge whether this argument is VALID or INVALID.',
      'Question 2 of 4. Judge whether this argument is VALID or INVALID.',
      'Question 3 of 4. Drag the counter-example card into the evidence slot to defeat this argument.',
      'Question 4 of 4. This is an inductive argument. Judge whether it is STRONG or WEAK.',
    ];
    announce(announcements[this._q] || '', true);
  }

  // ── Q3: BRIEFING (counter-example concept) ──────────────────────────────────
  /**
   * 2-panel DOM overlay shown before Q3's drag-drop. Teaches what a
   * counter-example IS (panel 1) and walks through one worked example (panel 2)
   * before the student is asked to spot one. Mirrors the L1 briefing pattern.
   */
  _showQ3Briefing(onDone) {
    let phase = 0;
    const panels = [
      {
        title: 'What a counter-example does',
        bodyHTML: `
          <p style="margin: 0 0 20px;">
            An argument is <strong>INVALID</strong> when its premises can be
            true <em>while its conclusion is false</em>.
          </p>
          <p style="margin: 0 0 20px;">
            A <strong style="color: ${COLORS.L2_ACCENT.str};">counter-example</strong>
            is a single concrete case that shows that combination &mdash;
            premises true, conclusion false &mdash; actually happens.
          </p>
          <p style="margin: 0;">
            One counter-example is enough to defeat an invalid argument.
          </p>`,
        btn: 'NEXT &rarr;',
      },
      {
        title: 'Worked example',
        bodyHTML: `
          <p style="margin: 0 0 18px;"><em>Argument:</em></p>
          <p style="margin: 0 0 18px; padding-left: 20px; border-left: 3px solid ${COLORS.MUTED.str};">
            P1: All philosophers are bald.<br>
            P2: Socrates is bald.<br>
            &there4; C: Socrates is a philosopher.
          </p>
          <p style="margin: 0 0 18px;"><em>Counter-example:</em></p>
          <p style="margin: 0 0 18px; padding-left: 20px; border-left: 3px solid ${COLORS.L2_ACCENT.str};">
            <strong>Bruce Willis is bald and not a philosopher.</strong>
          </p>
          <p style="margin: 0;">
            Both premises of the original argument can be true at the same time
            as Bruce Willis exists. The conclusion fails. That's enough to defeat the argument.
          </p>`,
        btn: 'BEGIN Q3 &rarr;',
      },
    ];

    const overlay = document.createElement('div');
    overlay.className = 'q3-briefing-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-labelledby', 'q3-briefing-title');
    overlay.style.cssText = `
      position: fixed; inset: 0; background: rgba(0,0,0,0.87);
      display: flex; align-items: center; justify-content: center;
      z-index: 1000; padding: 40px;
    `;
    document.body.appendChild(overlay);

    const render = () => {
      const p = panels[phase];
      overlay.innerHTML = `
        <div style="
          position: relative;
          background: ${COLORS.PANEL.str};
          color: ${COLORS.PARCH.str};
          padding: 60px 64px 48px;
          max-width: 860px;
          width: 100%;
          border: 4px solid ${COLORS.L2_ACCENT.str};
          border-radius: 8px;
          font-family: ${FONTS.HEAD};
        ">
          <div style="
            position: absolute; top: 18px; right: 24px;
            font-family: ${FONTS.HERO}; font-size: 16px;
            color: ${COLORS.L2_ACCENT.str}; letter-spacing: 2px;
          ">Phase ${phase + 1} of ${panels.length}</div>
          <h2 id="q3-briefing-title" style="
            font-family: ${FONTS.HERO};
            font-size: 36px;
            color: ${COLORS.L2_ACCENT.str};
            letter-spacing: 2px;
            margin: 0 0 28px;
          ">${p.title}</h2>
          <div style="font-size: 22px; line-height: 1.65; margin-bottom: 40px;">
            ${p.bodyHTML}
          </div>
          <div style="text-align: right;">
            <button class="q3-briefing-next" type="button" style="
              background: transparent;
              color: ${COLORS.L2_ACCENT.str};
              border: 2px solid ${COLORS.L2_ACCENT.str};
              border-radius: 4px;
              font-family: ${FONTS.HERO};
              font-size: 26px;
              letter-spacing: 4px;
              padding: 18px 56px;
              cursor: pointer;
              transition: background 0.15s ease, color 0.15s ease;
              outline-offset: 3px;
            ">${p.btn}</button>
          </div>
        </div>
      `;
      const btn = overlay.querySelector('.q3-briefing-next');
      const hoverIn  = () => { btn.style.background = COLORS.L2_ACCENT.str; btn.style.color = COLORS.BG_INK.str; };
      const hoverOut = () => { btn.style.background = 'transparent';        btn.style.color = COLORS.L2_ACCENT.str; };
      btn.addEventListener('mouseenter', hoverIn);
      btn.addEventListener('mouseleave', hoverOut);
      btn.addEventListener('focus',  hoverIn);
      btn.addEventListener('blur',   hoverOut);
      btn.addEventListener('click', () => {
        phase += 1;
        if (phase >= panels.length) {
          overlay.remove();
          onDone && onDone();
        } else {
          render();
        }
      });
      btn.focus();
      announce(p.title + '. ' + overlay.querySelector('div > div').innerText, true);
    };
    render();
    // Track for cleanup if scene tears down mid-briefing
    if (!this._briefingOverlays) this._briefingOverlays = [];
    this._briefingOverlays.push(overlay);
  }

  // ── Q3: DRAG-DROP COUNTER-EXAMPLE ────────────────────────────────────────────

  _buildDragDrop() {
    const W = GAME_DIM.W;

    // Drop zone
    const dzX = W / 2 - 200, dzY = 510, dzW = 400, dzH = 160;
    const dzG = this.add.graphics();
    dzG.lineStyle(3, COLORS.L2_ACCENT.num, 0.9);
    dzG.strokeRoundedRect(dzX, dzY, dzW, dzH, 8);
    dzG.fillStyle(COLORS.PANEL_DK.num, 0.7);
    dzG.fillRoundedRect(dzX, dzY, dzW, dzH, 8);
    this._dropZone = dzG;

    this._dropLabel = this.add.text(W / 2, dzY + dzH / 2 - 18, 'COURT EXHIBIT', {
      fontFamily: FONTS.HERO,
      fontSize: '18px',
      color: COLORS.L2_ACCENT.str,
      letterSpacing: 4,
    }).setOrigin(0.5);

    this._dropSubLabel = this.add.text(W / 2, dzY + dzH / 2 + 16, 'drag counter-example here', {
      fontFamily: FONTS.BODY,
      fontSize: '17px',
      color: COLORS.MUTED.str,
    }).setOrigin(0.5);

    this._dropZoneBounds = { x: dzX, y: dzY, w: dzW, h: dzH };

    // The three candidate cards
    const cards = [
      {
        label: 'A',
        text: 'A street-cleaner just sprayed the road. The streets are wet. It is not raining.',
        correct: true,
      },
      {
        label: 'B',
        text: 'It is raining and the streets are wet.',
        correct: false,
      },
      {
        label: 'C',
        text: 'It is sunny outside.',
        correct: false,
      },
    ];

    const cardW = 360, cardH = 180, gap = 60;
    const totalW = cards.length * cardW + (cards.length - 1) * gap;
    const startX = (W - totalW) / 2;
    const cardY  = 740;

    this._cardSprites = [];
    this._selectedCard = null;

    cards.forEach((card, i) => {
      const cx = startX + i * (cardW + gap);
      const cardCenterX = cx + cardW / 2;
      const cardCenterY = cardY + cardH / 2;

      // Graphics is positioned at object-origin (0,0) but its content is drawn at
      // absolute coords (cx, cardY). Setting g.x = dx therefore translates correctly.
      const g = this.add.graphics();
      g.fillStyle(COLORS.PANEL.num, 0.95);
      g.fillRoundedRect(cx, cardY, cardW, cardH, 6);
      g.lineStyle(2, COLORS.BRASS.num, 0.7);
      g.strokeRoundedRect(cx, cardY, cardW, cardH, 6);

      // Text/Zone objects are positioned at ABSOLUTE coords. Setting their .x
      // OVERWRITES position (does not translate). We must track each one's
      // original position and reset to origX + dx for translation. This was
      // the source of the "card flies off-canvas on drop" bug — the original
      // drag handler did `cardText.x = dx`, which moved the text to absolute
      // position dx (off-canvas top when dy was negative).
      const badgeOrigX = cx + 20, badgeOrigY = cardY + 16;
      const badge = this.add.text(badgeOrigX, badgeOrigY, card.label, {
        fontFamily: FONTS.HERO,
        fontSize: '24px',
        color: COLORS.L2_ACCENT.str,
      });

      const cardTextOrigX = cardCenterX, cardTextOrigY = cardCenterY + 10;
      const cardText = this.add.text(cardTextOrigX, cardTextOrigY, card.text, {
        fontFamily: FONTS.BODY,
        fontSize: '17px',
        color: COLORS.PARCH.str,
        wordWrap: { width: cardW - 32 },
        align: 'center',
      }).setOrigin(0.5);

      // Invisible interactive zone over the card
      const zone = this.add.zone(cardCenterX, cardCenterY, cardW, cardH)
        .setInteractive({ draggable: true });

      let offsetX = 0, offsetY = 0;

      zone.on('dragstart', (pointer) => {
        offsetX = pointer.x - cardCenterX;
        offsetY = pointer.y - cardCenterY;
        g.setDepth(10); badge.setDepth(10); cardText.setDepth(10);
        zone.setDepth(10);
        this._dragging = { g, badge, cardText, origX: cardCenterX, origY: cardCenterY };
      });

      zone.on('drag', (pointer) => {
        const dx = (pointer.x - offsetX) - cardCenterX;
        const dy = (pointer.y - offsetY) - cardCenterY;
        // Graphics: translate via .x/.y (object origin starts at 0,0)
        g.x = dx; g.y = dy;
        // Text/Zone: original-absolute + delta (overwrites their own position)
        badge.x    = badgeOrigX    + dx;  badge.y    = badgeOrigY    + dy;
        cardText.x = cardTextOrigX + dx;  cardText.y = cardTextOrigY + dy;
        zone.x     = cardCenterX   + dx;  zone.y     = cardCenterY   + dy;
      });

      zone.on('dragend', () => {
        // zone.x is now absolute (set by drag handler to cardCenterX + dx)
        const dz = this._dropZoneBounds;
        const inside = zone.x > dz.x && zone.x < dz.x + dz.w &&
                       zone.y > dz.y && zone.y < dz.y + dz.h;
        if (inside) {
          this._handleCardDrop(i, card.correct, g, badge, cardText, zone);
        } else {
          this._snapCardToOrigin(g, badge, cardText, zone, badgeOrigX, badgeOrigY,
                                 cardTextOrigX, cardTextOrigY, cardCenterX, cardCenterY);
        }
        this._dragging = null;
      });

      this._cardSprites.push({ g, badge, cardText, zone, data: card, cx, cardY,
                               _originalX: cardCenterX, _originalY: cardCenterY,
                               _badgeOrigX: badgeOrigX, _badgeOrigY: badgeOrigY,
                               _cardTextOrigX: cardTextOrigX, _cardTextOrigY: cardTextOrigY });
    });

    // Keyboard fallback — number keys 1/2/3 select, then PLACE EXHIBIT confirms
    this._buildKeyboardFallback();
  }

  _buildKeyboardFallback() {
    const W = GAME_DIM.W;
    // "PLACE EXHIBIT" button (disabled until a card is selected via keyboard)
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = 'PLACE EXHIBIT · ENTER';
    btn.setAttribute('aria-label', 'Place selected card into the evidence slot. Press Enter.');
    btn.disabled = true;
    btn.style.cssText = `
      width: 380px; height: 60px;
      background: transparent;
      color: ${COLORS.MUTED.str};
      border: 2px solid ${COLORS.MUTED.str};
      border-radius: 4px;
      font-family: ${FONTS.HERO};
      font-size: 20px;
      letter-spacing: 4px;
      cursor: not-allowed;
      transition: background 0.15s ease, color 0.15s ease;
      padding: 0;
      outline-offset: 3px;
    `;
    btn.addEventListener('click', () => {
      if (this._selectedCard !== null) {
        const card = this._cardSprites[this._selectedCard];
        this._handleCardDrop(
          this._selectedCard,
          card.data.correct,
          card.g, card.badge, card.cardText, card.zone
        );
      }
    });
    this._placeBtn = btn;
    const dom = this.add.dom(W / 2, 960, btn);
    this.domNodes.push(dom);

    this.add.text(W / 2, 1010, 'Keyboard: 1/2/3 to select a card, then ENTER to place it', {
      fontFamily: FONTS.BODY,
      fontSize: '15px',
      color: COLORS.MUTED.str,
    }).setOrigin(0.5);
  }

  _selectCard(idx) {
    if (idx < 0 || idx >= this._cardSprites.length) return;
    this._selectedCard = idx;

    // Visual highlight
    this._cardSprites.forEach((c, i) => {
      c.g.clear();
      const isSelected = i === idx;
      c.g.fillStyle(isSelected ? COLORS.PANEL_DK.num : COLORS.PANEL.num, 0.95);
      c.g.fillRoundedRect(c.cx, c.cardY, 360, 180, 6);
      c.g.lineStyle(isSelected ? 3 : 2, isSelected ? COLORS.L2_ACCENT.num : COLORS.BRASS.num, isSelected ? 1 : 0.7);
      c.g.strokeRoundedRect(c.cx, c.cardY, 360, 180, 6);
    });

    // Enable place button
    if (this._placeBtn) {
      this._placeBtn.disabled = false;
      this._placeBtn.style.cursor = 'pointer';
      this._placeBtn.style.color = COLORS.L2_ACCENT.str;
      this._placeBtn.style.borderColor = COLORS.L2_ACCENT.str;
    }

    const labels = ['A', 'B', 'C'];
    announce(`Card ${labels[idx]} selected. Press Enter to place it.`, true);
  }

  _handleCardDrop(idx, correct, g, badge, cardText, zone) {
    // Disable all card interactions
    this._cardSprites.forEach(c => c.zone.disableInteractive());

    if (correct) {
      this._showDropSuccess(g, badge, cardText, zone);
    } else {
      this._showDropFailure(g, badge, cardText, zone, idx);
    }
  }

  _snapCardToOrigin(g, badge, cardText, zone,
                    badgeOrigX, badgeOrigY,
                    cardTextOrigX, cardTextOrigY,
                    zoneOrigX, zoneOrigY, onComplete) {
    if (!PREFERS_REDUCED_MOTION) {
      const t = (target, x, y) => this.tweens.add({
        targets: target, x, y, duration: 300, ease: 'Power2',
      });
      t(g, 0, 0);
      t(badge,    badgeOrigX,    badgeOrigY);
      t(cardText, cardTextOrigX, cardTextOrigY);
      const last = t(zone, zoneOrigX, zoneOrigY);
      if (onComplete) last.once('complete', onComplete);
    } else {
      g.x = 0; g.y = 0;
      badge.x    = badgeOrigX;    badge.y    = badgeOrigY;
      cardText.x = cardTextOrigX; cardText.y = cardTextOrigY;
      zone.x     = zoneOrigX;     zone.y     = zoneOrigY;
      if (onComplete) onComplete();
    }
  }

  _showDropSuccess(g, badge, cardText, zone) {
    const dz = this._dropZoneBounds;
    const targetX = dz.x + dz.w / 2 - (zone.x + (g.x + zone.input?.hitArea?.x || 0));

    // Snap the card into the drop zone visually
    if (!PREFERS_REDUCED_MOTION) {
      this.cameras.main.flash(400, 0, 60, 0);
    }

    // Success reveal panel
    const panelG = this.add.graphics();
    panelG.fillStyle(COLORS.PANEL.num, 0.96);
    panelG.fillRoundedRect(160, 650, GAME_DIM.W - 320, 260, 8);
    panelG.lineStyle(2, COLORS.BRASS.num);
    panelG.strokeRoundedRect(160, 650, GAME_DIM.W - 320, 260, 8);

    this.add.text(GAME_DIM.W / 2, 688, '✔ EXHIBIT ACCEPTED', {
      fontFamily: FONTS.HERO,
      fontSize: '30px',
      color: COLORS.BRASS.str,
      letterSpacing: 4,
    }).setOrigin(0.5);

    this.add.text(
      GAME_DIM.W / 2, 750,
      'A street-cleaner — exactly. A counter-example shows premises true, conclusion false. That\'s how you defeat invalid reasoning in court.',
      {
        fontFamily: FONTS.BODY,
        fontSize: '22px',
        color: COLORS.PARCH.str,
        wordWrap: { width: GAME_DIM.W - 400 },
        align: 'center',
      }
    ).setOrigin(0.5, 0);

    announce(
      'Correct. A street-cleaner — exactly. A counter-example shows premises true, conclusion false. That\'s how you defeat invalid reasoning in court.',
      true
    );

    // "NEXT QUESTION" → advances to Q4
    const nextDom = this._addDomButton(
      GAME_DIM.W / 2 - 220, 870, 440, 68,
      'NEXT QUESTION →',
      'Proceed to question 4.',
      COLORS.BRASS.str,
      () => this._advanceQuestion(),
      26
    );

    // Focus trap on the next button
    this._trapFocus(nextDom.node);
  }

  _showDropFailure(g, badge, cardText, zone, idx) {
    // Reset selected card immediately so keyboard button goes grey
    this._selectedCard = null;

    if (this._placeBtn) {
      this._placeBtn.disabled = true;
      this._placeBtn.style.cursor = 'not-allowed';
      this._placeBtn.style.color = COLORS.MUTED.str;
      this._placeBtn.style.borderColor = COLORS.MUTED.str;
    }

    // Tween card back to its original pool position. Different objects need
    // different rest-positions (graphics: 0,0; text/zone: their absolute
    // origins) — see _buildDragDrop for why.
    const c = this._cardSprites[idx];
    this._snapCardToOrigin(
      g, badge, cardText, zone,
      c._badgeOrigX, c._badgeOrigY,
      c._cardTextOrigX, c._cardTextOrigY,
      c._originalX, c._originalY,
      () => this._cardSprites.forEach(s => s.zone.setInteractive({ draggable: true }))
    );

    // Diagnostic feedback per wrong card
    const wrongMessages = {
      1: "Card B confirms the argument's structure — it doesn't break it. A counter-example needs to show the premises true AND the conclusion false.",
      2: "Card C is irrelevant — it doesn't address whether wet streets always mean rain. A counter-example must engage the argument's logic directly.",
    };
    const msgText = wrongMessages[idx] ||
      'Try again — find the case where both premises are true but the conclusion fails.';

    // Fix 4d: error message with its own independent 4-second timer (decoupled from tween)
    const msg = this.add.text(GAME_DIM.W / 2, 680, msgText, {
      fontFamily: FONTS.BODY,
      fontSize: '22px',
      color: COLORS.L2_ACCENT.str,
      wordWrap: { width: GAME_DIM.W - 400 },
      align: 'center',
    }).setOrigin(0.5);

    announce('Incorrect. ' + msgText, true);

    if (!PREFERS_REDUCED_MOTION) {
      this.cameras.main.flash(300, 80, 0, 0);
      this.tweens.add({
        targets: msg, alpha: { from: 1, to: 0 },
        delay: 3400, duration: 600,
        onComplete: () => { try { msg.destroy(); } catch {} },
      });
    } else {
      this.time.delayedCall(4000, () => { try { msg.destroy(); } catch {} });
    }
  }

  // ── Q4: STRENGTH BUTTONS ─────────────────────────────────────────────────────

  _buildStrengthButtons() {
    this._verdictDoms = [];

    const accent = COLORS.L2_ACCENT.str;
    const steel  = COLORS.STEEL.str;

    // STRONG button (left)
    const sDom = this._addDomButton(
      260, 520, 580, 100,
      'STRONG',
      'Click to judge this inductive argument as STRONG.',
      accent,
      () => this._handleStrength('STRONG'),
      46
    );
    this._verdictDoms.push(sDom);

    // WEAK button (right)
    const wDom = this._addDomButton(
      1080, 520, 580, 100,
      'WEAK',
      'Click to judge this inductive argument as WEAK.',
      steel,
      () => this._handleStrength('WEAK'),
      46
    );
    this._verdictDoms.push(wDom);
  }

  _handleStrength(choice) {
    const correct = choice === 'STRONG';
    this._answers[this._q] = correct;

    // Disable strength buttons
    this._verdictDoms.forEach(d => {
      const el = d.node;
      el.disabled = true;
      el.style.opacity = '0.4';
      el.style.cursor  = 'default';
    });

    const correctReveal =
      "STRONG — the evidence is sufficient (repeated personal observation), relevant (peanuts → headaches each time), and free of obvious fallacies. A pattern observed reliably in your own experience is good inductive evidence. (Note: STRONGER if you'd ruled out other variables — e.g. it wasn't the dust on the peanuts, the time of day, etc. But this is a reasonable everyday inductive argument.)";

    const wrongReveal =
      "Re-read slide 27 — strength is about evidence quality. Personal repeated observation IS evidence. The argument would only be WEAK if the premises were unrelated (e.g. 'I ate peanuts; therefore the moon is cheese') or based on a single anecdote. Here we have a pattern.";

    const revealText  = correct ? correctReveal : wrongReveal;
    const resultColor = correct ? COLORS.BRASS.str : COLORS.L2_ACCENT.str;
    const resultLabel = correct ? '✔ CORRECT — STRONG' : '✗ INCORRECT';

    // Reveal panel
    const panelG = this.add.graphics();
    panelG.fillStyle(correct ? COLORS.PANEL.num : 0x200808, 0.96);
    panelG.fillRoundedRect(160, 620, GAME_DIM.W - 320, 360, 8);
    panelG.lineStyle(2, correct ? COLORS.BRASS.num : COLORS.L2_ACCENT.num);
    panelG.strokeRoundedRect(160, 620, GAME_DIM.W - 320, 360, 8);
    this._revealGroup.add(panelG);

    const resultLbl = this.add.text(GAME_DIM.W / 2, 658, resultLabel, {
      fontFamily: FONTS.HERO,
      fontSize: '32px',
      color: resultColor,
      letterSpacing: 4,
    }).setOrigin(0.5);
    this._revealGroup.add(resultLbl);

    const revealTxt = this.add.text(GAME_DIM.W / 2, 720, revealText, {
      fontFamily: FONTS.BODY,
      fontSize: '21px',
      color: COLORS.PARCH.str,
      wordWrap: { width: GAME_DIM.W - 380 },
      align: 'center',
    }).setOrigin(0.5, 0);
    this._revealGroup.add(revealTxt);

    // Animate reveal
    if (!PREFERS_REDUCED_MOTION) {
      this._revealGroup.setAlpha(0);
      this.tweens.add({ targets: this._revealGroup, alpha: 1, duration: 350 });
      this.cameras.main.flash(300, 0, correct ? 80 : 0, correct ? 0 : 80);
    }

    announce((correct ? 'Correct. ' : 'Not quite. ') + revealText, true);

    // "COLLECT VERDICT" → completes the lesson
    const collectDom = this._addDomButton(
      GAME_DIM.W / 2 - 220, 920, 440, 68,
      correct ? 'COLLECT VERDICT →' : 'NOTED — COLLECT VERDICT →',
      'All questions answered. Return to hub with your lesson complete.',
      correct ? COLORS.BRASS.str : COLORS.L2_ACCENT.str,
      () => {
        this._releaseFocusTrap();
        this._completeLesson();
      },
      correct ? 26 : 20
    );
    this._verdictDoms.push(collectDom);

    // Focus trap on the collect button
    this._trapFocus(collectDom.node);
  }

  // ── COMPLETION ───────────────────────────────────────────────────────────────

  _completeLesson() {
    StateManager.completeLesson(this.state, 'L2', ['valid-seal', 'counterex-card']);
    announce('Lesson 2 complete. Returning to hub.', true);
    this.scene.start('HubScene', { podCode: this.podCode, state: this.state });
  }

  // ── FOCUS TRAP ───────────────────────────────────────────────────────────────

  /**
   * Trap keyboard Tab focus to the given button element (and any siblings
   * inside the same reveal panel). Captures current focus for later restoration.
   * @param {HTMLElement} primaryEl  The first (often only) focusable in the panel.
   */
  _trapFocus(primaryEl) {
    // Release any existing trap first
    this._releaseFocusTrap();

    this._lastFocus = document.activeElement;

    // Small delay so the button is fully painted before we focus it
    this.time.delayedCall(80, () => {
      if (primaryEl && !primaryEl.disabled) {
        primaryEl.focus();
      }
    });

    // Collect all focusable elements we own inside the reveal panel.
    // We keep it simple: just primaryEl for now, but the handler cycles any that exist.
    const getFocusables = () => {
      // All enabled buttons in the document that are descendants of our reveal groups
      // or are our own verdictDoms nodes — we identify them by being in this._verdictDoms
      const candidates = (this._verdictDoms || [])
        .map(d => d.node)
        .filter(n => n && !n.disabled && n.tabIndex !== -1);
      return candidates.length ? candidates : [primaryEl];
    };

    this._focusTrapHandler = (e) => {
      if (e.key !== 'Tab') return;
      e.preventDefault();

      const focusables = getFocusables();
      if (!focusables.length) return;

      const currentIdx = focusables.indexOf(document.activeElement);
      let nextIdx;
      if (e.shiftKey) {
        nextIdx = currentIdx <= 0 ? focusables.length - 1 : currentIdx - 1;
      } else {
        nextIdx = currentIdx >= focusables.length - 1 ? 0 : currentIdx + 1;
      }
      focusables[nextIdx].focus();
    };

    document.addEventListener('keydown', this._focusTrapHandler);
  }

  /**
   * Release the focus trap and restore focus to the element that had it before.
   */
  _releaseFocusTrap() {
    if (this._focusTrapHandler) {
      document.removeEventListener('keydown', this._focusTrapHandler);
      this._focusTrapHandler = null;
    }
    if (this._lastFocus && typeof this._lastFocus.focus === 'function') {
      try { this._lastFocus.focus(); } catch {}
      this._lastFocus = null;
    }
  }

  // ── KEYBOARD ─────────────────────────────────────────────────────────────────

  _wireKeyboard() {
    this._keyHandler = (e) => {
      const k = e.key;

      // DEV shortcut
      if (k === 'd' || k === 'D') {
        this._releaseFocusTrap();
        this._completeLesson();
        return;
      }

      // Back to hub
      if (k === 'Escape') {
        this._releaseFocusTrap();
        this.scene.start('HubScene', { podCode: this.podCode, state: this.state });
        return;
      }

      // Q1 / Q2 keyboard shortcuts
      if (this._q === 0 || this._q === 1) {
        if (k === 'v' || k === 'V') this._handleVerdict('VALID');
        else if (k === 'i' || k === 'I') this._handleVerdict('INVALID');
        return;
      }

      // Q3 keyboard fallback
      if (this._q === 2) {
        if (k === '1') this._selectCard(0);
        else if (k === '2') this._selectCard(1);
        else if (k === '3') this._selectCard(2);
        else if (k === 'Enter' && this._selectedCard !== null) {
          const card = this._cardSprites[this._selectedCard];
          this._handleCardDrop(
            this._selectedCard,
            card.data.correct,
            card.g, card.badge, card.cardText, card.zone
          );
        }
        return;
      }

      // Q4 keyboard shortcuts
      if (this._q === 3) {
        if (k === 's' || k === 'S') this._handleStrength('STRONG');
        else if (k === 'w' || k === 'W') this._handleStrength('WEAK');
      }
    };
    this.input.keyboard.on('keydown', this._keyHandler);
  }

  // ── DOM BUTTON HELPER (mirrors hub.js) ───────────────────────────────────────

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
    btn.addEventListener('focus',      hoverIn);
    btn.addEventListener('blur',       hoverOut);
    btn.addEventListener('click',      onClick);
    const dom = this.add.dom(x + w / 2, y + h / 2, btn);
    this.domNodes.push(dom);
    return dom;
  }

  // ── CLEANUP ──────────────────────────────────────────────────────────────────

  _cleanup() {
    this._releaseFocusTrap();
    if (this._keyHandler) {
      this.input.keyboard.off('keydown', this._keyHandler);
      this._keyHandler = null;
    }
    this.domNodes.forEach(d => { try { d.destroy(); } catch {} });
    this.domNodes = [];
    // Briefing overlays (e.g. Q3 counter-example briefing) — body-attached, not via add.dom
    if (this._briefingOverlays) {
      this._briefingOverlays.forEach(o => { try { o.remove(); } catch {} });
      this._briefingOverlays = [];
    }
    this._cardSprites.forEach(c => {
      try { c.zone.disableInteractive(); } catch {}
    });
    this._cardSprites = [];
  }
}
