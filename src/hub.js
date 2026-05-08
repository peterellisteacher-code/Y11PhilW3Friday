'use strict';

class HubScene extends Phaser.Scene {
  constructor() { super({ key: 'HubScene' }); }

  init(data) {
    this.podCode = data.podCode;
    this.state   = data.state || StateManager.load(data.podCode);
    this.domNodes = [];
    this.eventUnsubs = [];
  }

  create() {
    // Background — placeholder dark chamber until Phase E swaps in fal-ai art
    this.add.image(960, 540, 'hub_chamber').setDisplaySize(GAME_DIM.W, GAME_DIM.H);
    // Atmospheric vignette
    const vg = this.add.graphics();
    vg.fillStyle(0x000000, 0.55);
    vg.fillRect(0, 0, GAME_DIM.W, GAME_DIM.H);

    this._drawHeader();
    this._drawDossierPanel();
    this._drawLessonDoors();
    this._drawCombinationLock();
    this._drawExportButton();
    this._wireKeyboard();

    announce(
      `Operating Theatre hub loaded for pod ${this.podCode}. ` +
      `${this.state.totalEvidence} of 6 evidence cards collected. ` +
      `Press 1, 2, or 3 to enter a lesson, V to open the vault, E to copy your save URL.`
    );

    this.events.once('shutdown', () => this._cleanup());
    this.events.once('destroy',  () => this._cleanup());
  }

  // ── HEADER ─────────────────────────────────────────────────────────────────
  _drawHeader() {
    const g = this.add.graphics();
    g.fillStyle(COLORS.PANEL_DK.num, 0.92);
    g.fillRect(0, 0, GAME_DIM.W, 80);
    g.lineStyle(1, COLORS.BRASS.num, 0.8);
    g.lineBetween(0, 80, GAME_DIM.W, 80);

    // Top-bar elements moved y=40 → y=54 so a 28px-tall title with origin
    // (0, 0.5) clears the canvas top (y=0) by 40px breathing on letterboxed
    // viewports.
    this.add.text(40, 54, 'ARGUMENT OPERATING THEATRE', {
      fontFamily: FONTS.HERO,
      fontSize: '26px',
      color: COLORS.BRASS.str,
      letterSpacing: 3,
    }).setOrigin(0, 0.5);

    const podText = this.add.text(GAME_DIM.W - 20, 54, `POD: ${this.podCode}`, {
      fontFamily: FONTS.HERO,
      fontSize: '22px',
      color: COLORS.PARCH.str,
    }).setOrigin(1, 0.5);
    this.add.image(GAME_DIM.W - 20 - podText.width - 12, 54,
      `badge_${this.state.badge || 0}`).setScale(0.6).setOrigin(1, 0.5);
  }

  // ── DOSSIER PANEL (left) ───────────────────────────────────────────────────
  _drawDossierPanel() {
    const g = this.add.graphics();
    g.fillStyle(COLORS.PANEL.num, 0.92);
    g.fillRoundedRect(30, 100, 380, 940, 6);
    g.lineStyle(1, COLORS.BRASS.num, 0.6);
    g.strokeRoundedRect(30, 100, 380, 940, 6);
    g.lineStyle(1, COLORS.BRASS.num);
    g.lineBetween(30, 155, 410, 155);

    this.add.text(220, 128, 'EVIDENCE DOSSIER', {
      fontFamily: FONTS.HERO,
      ...TYPE.SMALL,
      color: COLORS.BRASS.str,
      letterSpacing: 3,
    }).setOrigin(0.5);

    this.add.text(220, 195, `${this.state.totalEvidence} / 6 cards`, {
      fontFamily: FONTS.BODY,
      fontSize: '22px',
      color: COLORS.PARCH.str,
    }).setOrigin(0.5);

    this._drawEvidenceCards();

    // Lesson completion list
    let y = 680;
    LESSONS.forEach(({ key, label }) => {
      const lp = this.state.lessonProgress[key];
      const done = lp.complete;
      const colour = done ? COLORS.BRASS.str : COLORS.MUTED.str;
      const icon   = done ? '✔' : '○';
      this.add.text(55, y, `${icon}  ${label}`, {
        fontFamily: FONTS.BODY,
        fontSize: '17px',
        color: colour,
      });
      if (done) {
        this.add.text(395, y, `DIGIT: ${lp.digit}`, {
          fontFamily: FONTS.HERO,
          fontSize: '17px',
          color: COLORS.BRASS.str,
        }).setOrigin(1, 0);
      }
      y += 48;
    });
  }

  _drawEvidenceCards() {
    const allEvidence = Object.values(this.state.lessonProgress)
      .flatMap(lp => lp.evidence);
    const cols = 3;
    const cardW = 90, cardH = 120, padX = 55, padY = 240, gapX = 20, gapY = 16;

    for (let i = 0; i < 6; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = padX + col * (cardW + gapX) + cardW / 2;
      const y = padY + row * (cardH + gapY) + cardH / 2;
      const g = this.add.graphics();
      if (i < allEvidence.length) {
        g.fillStyle(COLORS.PARCH.num);
        g.lineStyle(2, COLORS.BRASS.num);
      } else {
        g.fillStyle(COLORS.PANEL.num);
        g.lineStyle(1, COLORS.MUTED_DK.num, 0.6);
      }
      g.fillRoundedRect(x - cardW / 2, y - cardH / 2, cardW, cardH, 4);
      g.strokeRoundedRect(x - cardW / 2, y - cardH / 2, cardW, cardH, 4);

      if (i < allEvidence.length) {
        // Bumped 11px → 14px (still under SMALL floor of 17px because the
        // chip is only 90×120 — these are decorative micro-labels by design,
        // documented in constants.js as one of the explicit exceptions).
        this.add.text(x, y, allEvidence[i].toUpperCase().replace(/-/g, ' '), {
          fontFamily: FONTS.BODY,
          fontSize: '14px',
          color: COLORS.BG_INK.str,
          wordWrap: { width: cardW - 8 },
          align: 'center',
        }).setOrigin(0.5);
      } else {
        this.add.text(x, y, '?', {
          fontFamily: FONTS.HEAD,
          fontSize: '28px',
          color: COLORS.MUTED.str,
        }).setOrigin(0.5);
      }
    }
  }

  // ── LESSON DOORS (centre) ──────────────────────────────────────────────────
  _drawLessonDoors() {
    const doorW = 340, doorH = 500, startX = 500, y = 290, gapX = 60;

    LESSONS.forEach((lesson, i) => {
      const x = startX + i * (doorW + gapX);
      const status = StateManager.lessonStatus(this.state, lesson.key);
      this._drawDoor({ x, y, doorW, doorH, lesson, status, shortcutNum: i + 1 });
    });
  }

  _drawDoor({ x, y, doorW, doorH, lesson, status, shortcutNum }) {
    const cx = x + doorW / 2;
    const isComplete = status === 'complete';
    const accentNum = lesson.accent.num;
    const accentStr = lesson.accent.str;

    const g = this.add.graphics();
    g.fillStyle(COLORS.PANEL.num, 0.96);
    g.fillRoundedRect(x, y, doorW, doorH, 6);
    g.lineStyle(2, accentNum, isComplete ? 1 : 0.85);
    g.strokeRoundedRect(x, y, doorW, doorH, 6);
    g.fillStyle(accentNum);
    g.fillRect(x, y, doorW, 6);

    // Lesson key badge
    const numY = y + 60;
    g.fillStyle(accentNum);
    g.fillCircle(cx, numY, 30);
    this.add.text(cx, numY, lesson.key, {
      fontFamily: FONTS.HERO,
      fontSize: '18px',
      color: COLORS.PARCH.str,
    }).setOrigin(0.5);

    // Label
    this.add.text(cx, y + 120, lesson.label, {
      fontFamily: FONTS.HERO,
      ...TYPE.BODY,
      color: COLORS.PARCH.str,
      letterSpacing: 1,
      wordWrap: { width: doorW - 24 },
      align: 'center',
    }).setOrigin(0.5);

    // Subtitle
    this.add.text(cx, y + 180, lesson.subtitle, {
      fontFamily: FONTS.BODY,
      ...TYPE.SMALL,
      color: COLORS.STEEL.str,
      wordWrap: { width: doorW - 32 },
      align: 'center',
    }).setOrigin(0.5);

    // Status display
    if (isComplete) {
      this.add.text(cx, y + 310, this.state.lessonProgress[lesson.key].digit, {
        fontFamily: FONTS.HERO,
        fontSize: '80px',
        color: COLORS.BRASS.str,
      }).setOrigin(0.5);
      this.add.text(cx, y + 380, 'DIGIT RECOVERED', {
        fontFamily: FONTS.BODY,
        ...TYPE.SMALL,
        color: COLORS.BRASS.str,
        letterSpacing: 2,
      }).setOrigin(0.5);
    } else {
      // Pulsing indicator dot (gated by reduced motion)
      const dot = this.add.circle(cx, y + 310, 14, accentNum, 0.65);
      if (!PREFERS_REDUCED_MOTION) {
        this.tweens.add({
          targets: dot, alpha: { from: 0.4, to: 1 },
          duration: 1200, yoyo: true, repeat: -1,
        });
      }
      this.add.text(cx, y + 350, 'AWAITING ENTRY', {
        fontFamily: FONTS.BODY,
        ...TYPE.SMALL,
        color: COLORS.STEEL.str,
        letterSpacing: 3,
      }).setOrigin(0.5);
    }

    // Action button (DOM, accessible)
    const btnLabel = isComplete ? `REVIEW · ${shortcutNum}` : `ENTER · ${shortcutNum}`;
    const ariaLabel = isComplete
      ? `Review ${lesson.label}. Press ${shortcutNum}.`
      : `Enter ${lesson.label}. Press ${shortcutNum}.`;
    this._addDomButton(x + 30, y + 420, doorW - 60, 56,
      btnLabel, ariaLabel, accentStr,
      () => this._enterLesson(lesson));
  }

  // ── COMBINATION LOCK (bottom) ──────────────────────────────────────────────
  _drawCombinationLock() {
    const g = this.add.graphics();
    g.fillStyle(COLORS.PANEL_DK.num, 0.92);
    g.fillRoundedRect(500, 840, 920, 180, 6);
    g.lineStyle(1, COLORS.BRASS.num, 0.6);
    g.strokeRoundedRect(500, 840, 920, 180, 6);

    this.add.text(960, 868, 'VAULT COMBINATION', {
      fontFamily: FONTS.HERO,
      ...TYPE.SMALL,
      color: COLORS.BRASS.str,
      letterSpacing: 3,
    }).setOrigin(0.5);

    const digits = this.state.codeDigits;
    const dialX = [760, 960, 1160];
    dialX.forEach((dx, i) => {
      const g2 = this.add.graphics();
      g2.lineStyle(2, digits[i] ? COLORS.BRASS.num : COLORS.MUTED.num);
      g2.fillStyle(digits[i] ? COLORS.BG_INK.num : COLORS.PANEL.num);
      g2.fillRoundedRect(dx - 50, 890, 100, 90, 6);
      g2.strokeRoundedRect(dx - 50, 890, 100, 90, 6);
      this.add.text(dx, 935, digits[i] || '—', {
        fontFamily: FONTS.HERO,
        fontSize: '52px',
        color: digits[i] ? COLORS.BRASS.str : COLORS.MUTED.str,
      }).setOrigin(0.5);
      // Lesson tag bumped 12px → 17px (TYPE.SMALL floor)
      this.add.text(dx, 990, ['L1', 'L2', 'L3'][i], {
        fontFamily: FONTS.BODY,
        ...TYPE.SMALL,
        color: digits[i] ? COLORS.PARCH.str : COLORS.MUTED.str,
        letterSpacing: 3,
      }).setOrigin(0.5);
    });

    // Vault unlock button
    if (this.state.vaultUnlocked) {
      this._addDomButton(1450, 880, 260, 60,
        'OPEN VAULT · V',
        'Open the vault — all three digits collected. Press V.',
        COLORS.BRASS.str,
        () => this.scene.start('FinalRevealScene', { podCode: this.podCode, state: this.state }));
    } else {
      const filled = digits.filter(d => d).length;
      this.add.text(1580, 910, `${filled} / 3 DIGITS`, {
        fontFamily: FONTS.HERO,
        ...TYPE.BODY,
        color: COLORS.STEEL.str,
        letterSpacing: 3,
      }).setOrigin(0.5);
      this.add.text(1580, 950, 'Vault sealed', {
        fontFamily: FONTS.BODY,
        ...TYPE.SMALL,
        color: COLORS.MUTED.str,
      }).setOrigin(0.5);
    }
  }

  // ── EXPORT URL BUTTON (bottom-left strip) ──────────────────────────────────
  _drawExportButton() {
    // Was at y=1048 with h=30 — orphaned 2px from canvas edge AND below the
    // dossier panel boundary (y=1040). Moved into the panel footer at y=988
    // with h=44 (meets 44×44 tap-target rule for primary actions).
    // EXPORT button y=964 (was 988): _addDomButton centres at y+h/2 = 986;
    // bottom = 986 + h/2 = 1008 — clears 1020 floor.
    this._addDomButton(50, 964, 340, 44,
      '↗ EXPORT SAVE LINK · E',
      'Copy save URL to clipboard. Press E.',
      COLORS.STEEL.str,
      () => this._exportUrl(),
      14);
  }

  // ── ACTIONS ────────────────────────────────────────────────────────────────
  _enterLesson(lesson) {
    announce(`Entering ${lesson.label}.`);
    this.scene.start(lesson.scene, { podCode: this.podCode, state: this.state });
  }

  _exportUrl() {
    const url = StateManager.exportHash(this.state);
    const fallback = () => window.prompt(
      'Copy this URL — paste it on any computer to restore your pod state:', url);
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(url).then(
        () => { announce('Save URL copied to clipboard.', true); this._toast('SAVE URL COPIED'); },
        fallback
      );
    } else {
      fallback();
    }
  }

  _toast(msg) {
    const el = document.createElement('div');
    el.textContent = msg;
    el.style.cssText = `
      background: ${COLORS.BRASS.str};
      color: ${COLORS.BG_INK.str};
      padding: 14px 28px;
      font-family: ${FONTS.HERO};
      font-size: 18px;
      letter-spacing: 4px;
      border-radius: 4px;
      box-shadow: 0 4px 16px rgba(0,0,0,0.5);
      pointer-events: none;
    `;
    // Toast moved 1010 → 990 so its rendered bottom (~1011) clears the 1020 floor.
    const dom = this.add.dom(960, 990, el);
    this.domNodes.push(dom);
    this.tweens.add({
      targets: dom, alpha: { from: 1, to: 0 },
      delay: 2200, duration: 600,
      onComplete: () => { try { dom.destroy(); } catch {} },
    });
  }

  // ── KEYBOARD SHORTCUTS ─────────────────────────────────────────────────────
  _wireKeyboard() {
    this._keyHandler = (event) => {
      const k = event.key.toLowerCase();
      if (k === '1') this._enterLesson(LESSONS[0]);
      else if (k === '2') this._enterLesson(LESSONS[1]);
      else if (k === '3') this._enterLesson(LESSONS[2]);
      else if (k === 'v') {
        if (this.state.vaultUnlocked) {
          this.scene.start('FinalRevealScene', { podCode: this.podCode, state: this.state });
        } else {
          announce('Vault is sealed — collect all three digits first.', true);
        }
      } else if (k === 'e') {
        this._exportUrl();
      }
    };
    this.input.keyboard.on('keydown', this._keyHandler);
  }

  // ── DOM BUTTON HELPER ──────────────────────────────────────────────────────
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
    btn.addEventListener('focus', hoverIn);
    btn.addEventListener('blur',  hoverOut);
    btn.addEventListener('click', onClick);
    const dom = this.add.dom(x + w/2, y + h/2, btn);
    this.domNodes.push(dom);
    return dom;
  }

  _cleanup() {
    if (this._keyHandler) this.input.keyboard.off('keydown', this._keyHandler);
    this.eventUnsubs.forEach(fn => fn());
    this.eventUnsubs = [];
    this.domNodes.forEach(d => { try { d.destroy(); } catch {} });
    this.domNodes = [];
  }
}
