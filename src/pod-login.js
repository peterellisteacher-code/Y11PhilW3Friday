'use strict';

class PodLoginScene extends Phaser.Scene {
  constructor() { super({ key: 'PodLoginScene' }); }

  create() {
    this.codeLetters = [];
    this.phase = 'code';     // 'code' | 'badge'
    this.badgeFocus = 0;     // currently focused badge index in 'badge' phase
    this.domNodes = [];

    this._drawBackground();
    this._drawLoginPanel();
    this._drawLetterSlots();
    this._drawHint('Type your 4-letter pod code, then press Enter');
    this._drawPodSelection();

    this._keyHandler = (event) => this._onKey(event);
    this.input.keyboard.on('keydown', this._keyHandler);

    announce(
      'Pod login. Type your 4-letter pod code using the keyboard, then press Enter to proceed.'
    );

    this.events.once('shutdown', () => this._cleanup());
    this.events.once('destroy',  () => this._cleanup());
  }

  // ── BACKGROUND ─────────────────────────────────────────────────────────────
  _drawBackground() {
    this.add.rectangle(960, 540, GAME_DIM.W, GAME_DIM.H, COLORS.BG_INK.num);
    // Subtle surgical-light glow from above centre
    const glow = this.add.graphics();
    glow.fillGradientStyle(0x3A3A50, 0x3A3A50, COLORS.BG_INK.num, COLORS.BG_INK.num, 0.4);
    glow.fillRect(400, 0, 1120, 400);
  }

  // ── LOGIN PANEL ────────────────────────────────────────────────────────────
  _drawLoginPanel() {
    this._loginTexts = [];

    // Panel is taller (840px) than the original 720 to fit the pod-selection
    // section (4 pod-code boxes + group rules) below the letter slots.
    const g = this.add.graphics();
    g.fillStyle(0x12121A);
    g.fillRoundedRect(560, 180, 800, 840, 8);
    g.lineStyle(2, COLORS.BRASS.num);
    g.strokeRoundedRect(560, 180, 800, 840, 8);
    g.fillStyle(COLORS.BRASS.num);
    g.fillRect(560, 180, 800, 6);
    this._loginTexts.push(g);

    const t1 = this.add.text(960, 260, 'ARGUMENT OPERATING THEATRE', {
      fontFamily: FONTS.HERO,
      ...TYPE.LARGE,
      color: COLORS.BRASS.str,
      letterSpacing: 4,
    }).setOrigin(0.5);
    this._loginTexts.push(t1);

    const t2 = this.add.text(960, 310, 'Patient Intake — Pod Identification', {
      fontFamily: FONTS.BODY,
      ...TYPE.BODY,
      color: COLORS.STEEL.str,
    }).setOrigin(0.5);
    this._loginTexts.push(t2);

    const sep = this.add.graphics();
    sep.lineStyle(1, COLORS.BRASS.num, 0.5);
    sep.lineBetween(600, 345, 1360, 345);
    this._loginTexts.push(sep);

    const t3 = this.add.text(960, 390, 'POD CODE', {
      fontFamily: FONTS.HEAD,
      fontSize: '32px',
      color: COLORS.PARCH.str,
      letterSpacing: 8,
    }).setOrigin(0.5);
    this._loginTexts.push(t3);

    // (No "ask Mr Ellis" hint — the 4 pod codes are displayed on-screen
    // via _drawPodSelection() and students negotiate amongst themselves.)
  }

  // ── POD SELECTION (4 codes + group rules) ─────────────────────────────────
  /**
   * Renders the 4 pod-code boxes + group-formation rules below the letter
   * slots. Boxes are clickable: click fills the code letters and highlights
   * all 4 slots, then student presses Enter to proceed. Tracked in
   * `_loginTexts` so teardown to badge phase removes them cleanly.
   */
  _drawPodSelection() {
    const codes = ['AQUA', 'BOLD', 'CALM', 'FIRE'];
    const boxW = 130, boxH = 80, gap = 30;
    const totalW = codes.length * boxW + (codes.length - 1) * gap;
    const startX = (GAME_DIM.W - totalW) / 2;
    const boxY = 790;

    // Separator above the pod-selection area
    const sep = this.add.graphics();
    sep.lineStyle(1, COLORS.BRASS.num, 0.35);
    sep.lineBetween(620, 705, 1300, 705);
    this._loginTexts.push(sep);

    // Heading — demoted to BODY (22px) to remove competing focal point
    // alongside POD CODE 32px and AQUA/BOLD/CALM/FIRE boxes 32px.
    const heading = this.add.text(960, 745,
      'CHOOSE A POD — negotiate with your group', {
        fontFamily: FONTS.HERO,
        ...TYPE.BODY,
        color: COLORS.BRASS.str,
        letterSpacing: 2,
      }).setOrigin(0.5);
    this._loginTexts.push(heading);

    // 4 pod-code boxes — DOM <button>s so they get keyboard focus + Tab
    // order natively (the layout audit's biggest accessibility gap was
    // that the previous Phaser-zone version had no keyboard parity).
    // Each button also styles itself via :focus-visible so a Tab user
    // can SEE which pod they're about to select.
    codes.forEach((code, i) => {
      const x = startX + i * (boxW + gap);

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = code;
      btn.setAttribute('aria-label', `Choose pod ${code}`);
      btn.style.cssText = `
        width: ${boxW}px; height: ${boxH}px;
        background: #12121A;
        color: ${COLORS.PARCH.str};
        border: 2px solid ${COLORS.BRASS.str};
        border-radius: 6px;
        font-family: ${FONTS.HERO};
        font-size: 32px;
        letter-spacing: 4px;
        cursor: pointer;
        outline-offset: 4px;
        transition: background 0.15s, border-color 0.15s;
      `;
      const setHover = (hovered) => {
        btn.style.background  = hovered ? '#1A1A30' : '#12121A';
        btn.style.borderColor = hovered ? COLORS.PARCH.str : COLORS.BRASS.str;
      };
      btn.addEventListener('mouseenter', () => setHover(true));
      btn.addEventListener('mouseleave', () => setHover(false));
      btn.addEventListener('focus',      () => setHover(true));
      btn.addEventListener('blur',       () => setHover(false));
      btn.addEventListener('click',      () => this._selectPodCode(code));

      const dom = this.add.dom(x + boxW / 2, boxY + boxH / 2, btn);
      this.domNodes.push(dom);
      this._loginTexts.push(dom);
    });

    // Group-formation rules
    const rulesPrimary = this.add.text(960, 920,
      'Four pods · Two people per pod', {
        fontFamily: FONTS.BODY,
        ...TYPE.BODY,
        color: COLORS.PARCH.str,
      }).setOrigin(0.5);
    this._loginTexts.push(rulesPrimary);

    const rulesSecondary = this.add.text(960, 965,
      'If there\'s an odd number, one person works alone or with the teacher', {
        fontFamily: FONTS.BODY,
        ...TYPE.SMALL,
        color: COLORS.MUTED.str,
      }).setOrigin(0.5);
    this._loginTexts.push(rulesSecondary);
  }

  /** Click-to-select on a pod-code box: fill the letters and highlight
   *  every slot. Student presses Enter to proceed (matching the keyboard
   *  flow), so the existing _onCodeKey handler stays in charge. */
  _selectPodCode(code) {
    this.codeLetters = code.split('');
    this._updateDisplay();
    for (let i = 0; i < 4; i++) this._highlightSlot(i, true);
    this._drawHint('Press Enter to proceed');
    announce(
      `Pod ${code} selected. Press Enter to enter the operating theatre, ` +
      `or click another pod to change your selection.`, true
    );
  }

  // ── LETTER SLOTS ───────────────────────────────────────────────────────────
  _drawLetterSlots() {
    this.slotTexts = [];
    this.slotBoxes = [];
    const startX = 700, y = 460, slotW = 110, gap = 30;

    for (let i = 0; i < 4; i++) {
      const x = startX + i * (slotW + gap);
      const g = this.add.graphics();
      g.lineStyle(2, COLORS.BRASS.num, 0.6);
      g.fillStyle(0x0D0D16);
      g.fillRoundedRect(x, y, slotW, 120, 4);
      g.strokeRoundedRect(x, y, slotW, 120, 4);
      this.slotBoxes.push(g);

      const t = this.add.text(x + slotW / 2, y + 60, '', {
        fontFamily: FONTS.HERO,
        fontSize: '64px',
        color: COLORS.PARCH.str,
      }).setOrigin(0.5);
      this.slotTexts.push(t);
    }

    // Animated cursor for active slot
    this.cursor = this.add.graphics();
    this._updateCursor();
    if (!PREFERS_REDUCED_MOTION) {
      this._cursorTimer = this.time.addEvent({
        delay: 600, loop: true,
        callback: () => { this.cursor.visible = !this.cursor.visible; },
      });
    }
  }

  _drawHint(msg) {
    if (this.hintText) this.hintText.destroy();
    this.hintText = this.add.text(960, 640, msg, {
      fontFamily: FONTS.BODY,
      ...TYPE.BODY,
      color: COLORS.STEEL.str,
    }).setOrigin(0.5);
  }

  _updateDisplay() {
    for (let i = 0; i < 4; i++) {
      this.slotTexts[i].setText(this.codeLetters[i] || '');
    }
    this._updateCursor();
  }

  _updateCursor() {
    if (!this.cursor) return;
    this.cursor.clear();
    const idx = Math.min(this.codeLetters.length, 3);
    const startX = 700, slotW = 110, gap = 30;
    const x = startX + idx * (slotW + gap) + 8;
    const y = 560;
    this.cursor.lineStyle(3, COLORS.BRASS.num);
    this.cursor.lineBetween(x, y, x + slotW - 16, y);
  }

  _highlightSlot(idx, active) {
    const g = this.slotBoxes[idx];
    g.clear();
    g.lineStyle(2, active ? COLORS.BRASS.num : COLORS.MUTED_DK.num, active ? 1 : 0.4);
    g.fillStyle(active ? 0x1A1A30 : 0x0D0D16);
    const startX = 700, gap = 30, slotW = 110;
    const x = startX + idx * (slotW + gap);
    g.fillRoundedRect(x, 460, slotW, 120, 4);
    g.strokeRoundedRect(x, 460, slotW, 120, 4);
  }

  // ── KEYBOARD ───────────────────────────────────────────────────────────────
  _onKey(event) {
    if (this.phase === 'code') return this._onCodeKey(event);
    if (this.phase === 'badge') return this._onBadgeKey(event);
  }

  _onCodeKey(event) {
    const key = event.key.toUpperCase();
    if (/^[A-Z]$/.test(key) && this.codeLetters.length < 4) {
      this.codeLetters.push(key);
      this._updateDisplay();
      this._highlightSlot(this.codeLetters.length - 1, true);
      announce(`${key}. ${this.codeLetters.length} of 4 letters entered.`);
      if (this.codeLetters.length === 4) this._drawHint('Press Enter to proceed');
    } else if (key === 'BACKSPACE' && this.codeLetters.length > 0) {
      const removed = this.codeLetters.length - 1;
      this._highlightSlot(removed, false);
      this.codeLetters.pop();
      this._updateDisplay();
      this._drawHint('Type your 4-letter pod code, then press Enter');
      announce(`Deleted. ${this.codeLetters.length} of 4 letters entered.`);
    } else if (key === 'ENTER') {
      if (this.codeLetters.length === 4) {
        this._submitCode();
      } else {
        this._drawHint('⚠  Enter all 4 letters first');
        announce('Please enter all four letters first.', true);
        if (!PREFERS_REDUCED_MOTION) this.cameras.main.shake(200, 0.005);
      }
    }
  }

  _onBadgeKey(event) {
    const k = event.key;
    const last = BADGE_OPTIONS.length - 1;
    if (k === 'ArrowRight' || k === 'Tab') {
      event.preventDefault && event.preventDefault();
      this._setBadgeFocus(this.badgeFocus >= last ? 0 : this.badgeFocus + 1);
    } else if (k === 'ArrowLeft') {
      this._setBadgeFocus(this.badgeFocus <= 0 ? last : this.badgeFocus - 1);
    } else if (k === 'Enter' || k === ' ') {
      this._chooseBadge(this.badgeFocus);
    } else if (/^[1-4]$/.test(k)) {
      const i = parseInt(k, 10) - 1;
      if (i <= last) this._chooseBadge(i);
    }
  }

  // ── SUBMIT / BADGE FLOW ────────────────────────────────────────────────────
  _submitCode() {
    const podCode = this.codeLetters.join('');
    const existing = StateManager.load(podCode);
    if (existing) {
      announce(`Pod ${podCode} recognised. Loading saved state.`, true);
      this._flashThen(() => {
        this.scene.start('HubScene', { podCode, state: existing });
      }, COLORS.TEAL.str);
    } else {
      this.phase = 'badge';
      this._showBadgeSelection(podCode);
    }
  }

  _showBadgeSelection(podCode) {
    this.pendingPodCode = podCode;
    announce(
      `New pod ${podCode}. Choose a surgical role using arrow keys then press Enter, ` +
      `or click a badge.`, true
    );

    // Tear down login-panel visuals (Fix 1)
    if (this._loginTexts) {
      this._loginTexts.forEach(t => t.destroy());
      this._loginTexts = null;
    }

    // Tear down code-entry visuals
    this.slotTexts.forEach(t => t.destroy());
    this.slotBoxes.forEach(g => g.destroy());
    if (this.cursor) this.cursor.destroy();
    if (this._cursorTimer) this._cursorTimer.remove();
    if (this.hintText) this.hintText.destroy();

    this.add.text(960, 390, 'CHOOSE YOUR SURGICAL ROLE', {
      fontFamily: FONTS.HEAD,
      fontSize: '32px',
      color: COLORS.PARCH.str,
      letterSpacing: 8,
    }).setOrigin(0.5);

    const startX = 640, y = 500, spacing = 220;
    this.badgeImages = [];
    this.badgeFocusRings = [];

    BADGE_OPTIONS.forEach((opt, i) => {
      const x = startX + i * spacing;

      // Focus ring (drawn behind badge)
      const ring = this.add.graphics();
      this.badgeFocusRings.push(ring);

      // Badge sprite
      const badge = this.add.image(x, y, `badge_${i}`).setScale(1.5);
      this.badgeImages.push(badge);

      // Label
      this.add.text(x, y + 80, opt.label, {
        fontFamily: FONTS.BODY,
        ...TYPE.BODY,
        color: COLORS.BRASS.str,
      }).setOrigin(0.5);

      // Number hint
      this.add.text(x, y + 110, `[${i + 1}]`, {
        fontFamily: FONTS.BODY,
        ...TYPE.SMALL,
        color: COLORS.STEEL.str,
      }).setOrigin(0.5);

      badge.setInteractive({ useHandCursor: true });
      badge.on('pointerover', () => this._setBadgeFocus(i));
      badge.on('pointerdown', () => this._chooseBadge(i));
    });

    this._setBadgeFocus(0);

    this.add.text(960, 680, 'Arrow keys + Enter, or click your instrument', {
      fontFamily: FONTS.BODY,
      ...TYPE.BODY,
      color: COLORS.STEEL.str,
    }).setOrigin(0.5);
  }

  _setBadgeFocus(i) {
    this.badgeFocus = i;
    const startX = 640, y = 500, spacing = 220;
    this.badgeFocusRings.forEach((ring, idx) => {
      ring.clear();
      if (idx === i) {
        ring.lineStyle(3, COLORS.BRASS.num, 1);
        ring.strokeCircle(startX + idx * spacing, y, 70);
      }
    });
    this.badgeImages.forEach((b, idx) => b.setScale(idx === i ? 1.65 : 1.5));
    announce(BADGE_OPTIONS[i].label);
  }

  _chooseBadge(i) {
    const podCode = this.pendingPodCode;
    const state = StateManager.create(podCode, i);
    StateManager.save(state);
    announce(`Selected ${BADGE_OPTIONS[i].label}. Entering hub.`, true);
    this._flashThen(() => {
      this.scene.start('HubScene', { podCode, state });
    }, COLORS.BRASS.str);
  }

  // ── EFFECTS ────────────────────────────────────────────────────────────────
  _flashThen(callback, hexColor) {
    if (PREFERS_REDUCED_MOTION) {
      callback();
      return;
    }
    const colorNum = Phaser.Display.Color.HexStringToColor(hexColor.replace('#', '')).color;
    const flash = this.add.rectangle(960, 540, GAME_DIM.W, GAME_DIM.H, colorNum, 0);
    this.tweens.add({
      targets: flash, alpha: 0.4, duration: 120, yoyo: true,
      onComplete: callback,
    });
  }

  // ── CLEANUP ────────────────────────────────────────────────────────────────
  _cleanup() {
    if (this._keyHandler) this.input.keyboard.off('keydown', this._keyHandler);
    if (this._cursorTimer) this._cursorTimer.remove();
    this.domNodes.forEach(d => { try { d.destroy(); } catch {} });
    this.domNodes = [];
  }
}
