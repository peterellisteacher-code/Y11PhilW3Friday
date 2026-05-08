'use strict';

// FinalRevealScene — Vault unlock ceremony + certificate + exemplar argument
// Phase 1: Dial entry  →  Phase 2: Door-open animation  →  Phase 3: Certificate
//
// Receives { podCode, state } via init(data).
// Follows hub.js conventions: _addDomButton, _cleanup, reduced-motion guards,
// announce() for all screen-reader updates.

class FinalRevealScene extends Phaser.Scene {
  constructor() { super({ key: 'FinalRevealScene' }); }

  // ─── LIFECYCLE ───────────────────────────────────────────────────────────────

  init(data) {
    this.podCode    = data.podCode;
    this.state      = data.state || StateManager.load(data.podCode);
    this.domNodes   = [];
    this._printStyle = null;   // injected <style> tag for @media print
    this._keyHandler = null;
  }

  create() {
    // Stop any other scenes that were running (hub launches us while L2/L3 may still be active)
    this.scene.manager.getScenes(true).forEach(sc => {
      if (sc !== this) {
        try { this.scene.stop(sc.scene.key); } catch {}
      }
    });

    // Dark background always present
    this.add.rectangle(GAME_DIM.W / 2, GAME_DIM.H / 2, GAME_DIM.W, GAME_DIM.H, COLORS.BG_INK.num);

    if (!this.state || !this.state.vaultUnlocked) {
      this._drawNotReady();
    } else {
      this._drawPhase1();
    }

    // Fix 6: Esc returns to Hub
    this._wireKeyboard();

    this.events.once('shutdown', () => this._cleanup());
    this.events.once('destroy',  () => this._cleanup());
  }

  _wireKeyboard() {
    this._keyHandler = (event) => {
      if (event.key === 'Escape') {
        this.scene.start('HubScene', { podCode: this.podCode, state: this.state });
      }
    };
    this.input.keyboard.on('keydown', this._keyHandler);
  }

  // ─── EDGE CASE — VAULT NOT READY ────────────────────────────────────────────

  _drawNotReady() {
    const s = this.state;
    const digits   = s ? s.codeDigits : [null, null, null];
    const haveCount = digits.filter(d => d !== null).length;

    this.add.text(GAME_DIM.W / 2, 200, 'VAULT NOT YET READY', {
      fontFamily: FONTS.HERO,
      fontSize: '56px',
      color: COLORS.STEEL.str,
      letterSpacing: 4,
    }).setOrigin(0.5);

    this.add.text(GAME_DIM.W / 2, 300, `You have ${haveCount} of 3 digits`, {
      fontFamily: FONTS.BODY,
      fontSize: '30px',
      color: COLORS.PARCH.str,
    }).setOrigin(0.5);

    const instructions = [
      'Complete L1 — The Argument Lab      → earn Digit 1',
      'Complete L2 — Validity Court        → earn Digit 2',
      'Complete L3 — Operating Theatre     → earn Digit 3',
    ];
    LESSONS.forEach(({ key }, i) => {
      const done  = s && s.lessonProgress[key].complete;
      const icon  = done ? '✔' : '○';
      const col   = done ? COLORS.BRASS.str : COLORS.STEEL.str;
      this.add.text(GAME_DIM.W / 2, 420 + i * 64, `${icon}  ${instructions[i]}`, {
        fontFamily: FONTS.BODY,
        ...TYPE.BODY,
        color: col,
      }).setOrigin(0.5);
    });

    this.add.text(GAME_DIM.W / 2, 660, 'Return here once all three are collected to open the vault.', {
      fontFamily: FONTS.BODY,
      ...TYPE.BODY,
      color: COLORS.MUTED.str,
    }).setOrigin(0.5);

    this._addDomButton(
      GAME_DIM.W / 2 - 140, 760, 280, 56,
      '← BACK TO HUB', 'Return to the hub', COLORS.STEEL.str,
      () => this.scene.start('HubScene', { podCode: this.podCode, state: this.state })
    );

    announce(`Vault not ready. ${haveCount} of 3 digits collected.`);
  }

  // ─── PHASE 1 — LOCKED VAULT + DIAL ENTRY ────────────────────────────────────

  _drawPhase1() {
    // Vault door image (centred, upper area)
    const vaultImg = this.textures.exists('vault_locked')
      ? this.add.image(GAME_DIM.W / 2, 320, 'vault_locked').setDisplaySize(480, 480)
      : null;

    if (!vaultImg) {
      // Fallback graphic when texture not yet loaded
      const g = this.add.graphics();
      g.fillStyle(COLORS.PANEL.num);
      g.lineStyle(4, COLORS.BRASS.num, 0.9);
      g.fillRoundedRect(GAME_DIM.W / 2 - 220, 80, 440, 440, 12);
      g.strokeRoundedRect(GAME_DIM.W / 2 - 220, 80, 440, 440, 12);
      // Dial ring
      g.lineStyle(6, COLORS.BRASS.num, 0.7);
      g.strokeCircle(GAME_DIM.W / 2, 300, 130);
      this.add.text(GAME_DIM.W / 2, 300, '🔒', { fontSize: '80px' }).setOrigin(0.5);
    }

    this.add.text(GAME_DIM.W / 2, 590, 'ENTER YOUR VAULT COMBINATION', {
      fontFamily: FONTS.HERO,
      ...TYPE.LARGE,
      color: COLORS.BRASS.str,
      letterSpacing: 4,
    }).setOrigin(0.5);

    this.add.text(GAME_DIM.W / 2, 640, 'Each digit was earned during a lesson. Type them now.', {
      fontFamily: FONTS.BODY,
      ...TYPE.BODY,
      color: COLORS.PARCH.str,
    }).setOrigin(0.5);

    // 3 digit input boxes
    this._dialDomNode = this._buildDialPanel();

    announce('Enter your three vault digits and press OPEN VAULT.', true);
  }

  _buildDialPanel() {
    const podCode = this.podCode;
    const state   = this.state;
    const scene   = this;

    const wrapper = document.createElement('div');
    wrapper.style.cssText = `
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 20px;
      padding: 32px 48px;
      background: ${COLORS.PANEL_DK.str};
      border: 2px solid ${COLORS.BRASS.str};
      border-radius: 8px;
      width: 560px;
    `;

    // Row of 3 inputs
    const inputRow = document.createElement('div');
    inputRow.style.cssText = `display: flex; gap: 24px; align-items: center;`;

    const inputs = [];
    ['L1', 'L2', 'L3'].forEach((lKey, i) => {
      const col = document.createElement('div');
      col.style.cssText = `display: flex; flex-direction: column; align-items: center; gap: 8px;`;

      const label = document.createElement('label');
      label.htmlFor   = `vault-digit-${i}`;
      label.textContent = lKey;
      label.style.cssText = `
        font-family: ${FONTS.BODY};
        font-size: 16px;
        color: ${COLORS.PARCH.str};
        letter-spacing: 3px;
      `;

      const inp = document.createElement('input');
      inp.type       = 'text';
      inp.id         = `vault-digit-${i}`;
      inp.maxLength  = 1;
      inp.inputMode  = 'numeric';
      inp.pattern    = '[0-9]';
      inp.setAttribute('aria-label', `${lKey} digit — enter 0 through 9`);
      inp.style.cssText = `
        width: 90px; height: 90px;
        background: ${COLORS.BG_INK.str};
        color: ${COLORS.BRASS.str};
        border: 2px solid ${COLORS.BRASS.str};
        border-radius: 6px;
        font-family: ${FONTS.HERO};
        font-size: 52px;
        text-align: center;
        outline-offset: 3px;
      `;
      // Auto-advance to next on valid digit entry
      inp.addEventListener('input', () => {
        const v = inp.value.replace(/[^0-9]/g, '');
        inp.value = v.slice(-1);
        if (inp.value && i < 2) inputs[i + 1].focus();
        feedbackEl.textContent = '';
        feedbackEl.style.color = COLORS.PARCH.str;
      });

      inputs.push(inp);
      col.appendChild(label);
      col.appendChild(inp);
      inputRow.appendChild(col);
    });

    // Feedback line
    const feedbackEl = document.createElement('div');
    feedbackEl.setAttribute('aria-live', 'assertive');
    feedbackEl.style.cssText = `
      font-family: ${FONTS.BODY};
      font-size: 18px;
      min-height: 28px;
      color: ${COLORS.PARCH.str};
      text-align: center;
    `;

    // OPEN VAULT button
    const openBtn = document.createElement('button');
    openBtn.type        = 'button';
    openBtn.textContent = 'OPEN VAULT';
    openBtn.setAttribute('aria-label', 'Submit the three digits and open the vault');
    openBtn.style.cssText = `
      width: 260px; height: 56px;
      background: transparent;
      color: ${COLORS.BRASS.str};
      border: 2px solid ${COLORS.BRASS.str};
      border-radius: 4px;
      font-family: ${FONTS.HERO};
      font-size: 20px;
      letter-spacing: 4px;
      cursor: pointer;
      transition: background 0.15s ease, color 0.15s ease;
    `;
    openBtn.addEventListener('mouseenter', () => {
      openBtn.style.background = COLORS.BRASS.str;
      openBtn.style.color = COLORS.BG_INK.str;
    });
    openBtn.addEventListener('mouseleave', () => {
      openBtn.style.background = 'transparent';
      openBtn.style.color = COLORS.BRASS.str;
    });

    let hintShown = false;
    // HINT button
    const hintBtn = document.createElement('button');
    hintBtn.type        = 'button';
    hintBtn.textContent = 'HINT?';
    hintBtn.setAttribute('aria-label', 'Reveal the correct combination if you are stuck');
    hintBtn.style.cssText = `
      background: transparent;
      color: ${COLORS.STEEL.str};
      border: 1px solid ${COLORS.STEEL.str};
      border-radius: 4px;
      font-family: ${FONTS.BODY};
      font-size: 14px;
      letter-spacing: 2px;
      cursor: pointer;
      padding: 6px 16px;
    `;
    hintBtn.addEventListener('click', () => {
      if (!hintShown) {
        hintShown = true;
        const code = state.codeDigits.join('-');
        feedbackEl.textContent = `Your code: ${code}`;
        feedbackEl.style.color = COLORS.PARCH.str;
        announce(`Hint: your combination is ${code}.`);
        // Pre-fill inputs
        state.codeDigits.forEach((d, i) => { inputs[i].value = d || ''; });
      }
    });

    openBtn.addEventListener('click', () => {
      const entered = inputs.map(i => i.value.trim());
      const correct = state.codeDigits;
      if (entered[0] === correct[0] && entered[1] === correct[1] && entered[2] === correct[2]) {
        wrapper.style.pointerEvents = 'none';
        openBtn.disabled = true;
        announce('Correct! Vault opening…', true);
        scene._startPhase2(scene._dialDomRef, scene._vaultImgRef);
      } else {
        feedbackEl.textContent = 'Wrong combination — try again.';
        feedbackEl.style.color = '#FF6666';
        announce('Wrong combination — try again.', true);
        // Brief red flash on inputs
        if (!PREFERS_REDUCED_MOTION) {
          inputs.forEach(inp => {
            inp.style.borderColor = '#FF6666';
            setTimeout(() => { inp.style.borderColor = COLORS.BRASS.str; }, 600);
          });
        }
        inputs[0].focus();
      }
    });

    // Allow Enter key from any input
    wrapper.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') openBtn.click();
    });

    wrapper.appendChild(inputRow);
    wrapper.appendChild(feedbackEl);
    wrapper.appendChild(openBtn);
    wrapper.appendChild(hintBtn);

    // Back-to-hub
    const backBtn = document.createElement('button');
    backBtn.type        = 'button';
    backBtn.textContent = '← BACK TO HUB';
    backBtn.setAttribute('aria-label', 'Return to the hub');
    backBtn.style.cssText = `
      background: transparent;
      color: ${COLORS.STEEL.str};
      border: none;
      font-family: ${FONTS.BODY};
      font-size: 15px;
      letter-spacing: 2px;
      cursor: pointer;
      margin-top: 8px;
    `;
    backBtn.addEventListener('click', () => {
      scene.scene.start('HubScene', { podCode: scene.podCode, state: scene.state });
    });
    wrapper.appendChild(backBtn);

    // Dial moved cy=800 → cy=870 so its top edge (~685) clears the sub-label
    // line at y=640. Was overlapping by ~25px before.
    const dialDom = this.add.dom(GAME_DIM.W / 2, 870, wrapper);
    this.domNodes.push(dialDom);

    // Keep a reference for phase 2
    const vaultImgRef = this.textures.exists('vault_locked')
      ? this.children.list.find(c => c.type === 'Image' && c.texture && c.texture.key === 'vault_locked')
      : null;

    // Return both so _buildDialPanel can hand off
    this._dialDomRef  = dialDom;
    this._vaultImgRef = vaultImgRef;
    return dialDom;
  }

  // ─── PHASE 2 — DOOR OPENS ────────────────────────────────────────────────────

  _startPhase2(dialDom, vaultImgArg) {
    const vaultImgRef = vaultImgArg || this._vaultImgRef;
    const usedDial    = dialDom    || this._dialDomRef;

    // Slide dial panel down off-screen
    if (!PREFERS_REDUCED_MOTION) {
      this.tweens.add({
        targets: usedDial,
        y: GAME_DIM.H + 200,
        duration: 500,
        ease: 'Cubic.easeIn',
        onComplete: () => { try { usedDial.destroy(); } catch {} },
      });
    } else {
      try { usedDial.destroy(); } catch {}
    }

    // Vault locked fades/slides out
    if (vaultImgRef && !PREFERS_REDUCED_MOTION) {
      this.tweens.add({
        targets: vaultImgRef,
        x: vaultImgRef.x - 800,
        alpha: 0,
        duration: 700,
        ease: 'Cubic.easeIn',
      });
    } else if (vaultImgRef) {
      vaultImgRef.setVisible(false);
    }

    // Vault unlocked fades in
    let unlockImg = null;
    if (this.textures.exists('vault_unlocked')) {
      unlockImg = this.add.image(GAME_DIM.W / 2 + 800, 320, 'vault_unlocked')
        .setDisplaySize(480, 480)
        .setAlpha(0);
      if (!PREFERS_REDUCED_MOTION) {
        this.tweens.add({
          targets: unlockImg,
          x: GAME_DIM.W / 2,
          alpha: 1,
          duration: 800,
          delay: 400,
          ease: 'Cubic.easeOut',
        });
      } else {
        unlockImg.setPosition(GAME_DIM.W / 2, 320).setAlpha(1);
      }
    }

    // Gold flash overlay
    if (!PREFERS_REDUCED_MOTION) {
      const flash = this.add.rectangle(GAME_DIM.W / 2, GAME_DIM.H / 2, GAME_DIM.W, GAME_DIM.H, 0xC8B68A, 0);
      this.tweens.add({
        targets: flash,
        alpha: { from: 0, to: 0.4 },
        duration: 200,
        delay: 600,
        yoyo: true,
      });
    }

    // Advance to phase 3 after animation
    this.time.delayedCall(PREFERS_REDUCED_MOTION ? 200 : 1500, () => {
      // Clear remaining canvas children (only leave bg)
      this.children.list.slice().forEach(c => {
        if (c.type !== 'Rectangle' || c.width !== GAME_DIM.W) {
          try { c.destroy(); } catch {}
        }
      });
      this.domNodes = [];
      this._drawPhase3();
    });
  }

  // ─── PHASE 3 — CERTIFICATE + EXEMPLAR ───────────────────────────────────────

  _drawPhase3() {
    // Evict any other scenes that may be running in parallel (L2, L3, Hub)
    this.scene.manager.getScenes(true).forEach(sc => {
      if (sc !== this) {
        try { this.scene.stop(sc.scene.key); } catch {}
      }
    });

    const s           = this.state;
    const badgeDef    = BADGE_OPTIONS[s.badge] || BADGE_OPTIONS[0];
    const digits      = s.codeDigits.join('-');
    const dateStr     = new Date().toLocaleDateString('en-AU', {
      year: 'numeric', month: 'long', day: 'numeric'
    });

    // Phase 3 dark background
    this.add.rectangle(GAME_DIM.W / 2, GAME_DIM.H / 2, GAME_DIM.W, GAME_DIM.H, COLORS.BG_INK.num);

    // Vault unlocked image — top-left watermark
    if (this.textures.exists('vault_unlocked')) {
      this.add.image(160, 200, 'vault_unlocked')
        .setDisplaySize(280, 280)
        .setAlpha(0.25);
    }

    // ── HEADER STRIP ────────────────────────────────────────────────────────
    const hg = this.add.graphics();
    hg.fillStyle(COLORS.PANEL_DK.num, 0.95);
    hg.fillRect(0, 0, GAME_DIM.W, 90);
    hg.lineStyle(1, COLORS.BRASS.num, 0.7);
    hg.lineBetween(0, 90, GAME_DIM.W, 90);

    if (this.textures.exists(`badge_${s.badge}`)) {
      this.add.image(80, 45, `badge_${s.badge}`).setScale(0.7);
    }
    this.add.text(160, 45, `POD ${this.podCode} HAS UNLOCKED THE VAULT`, {
      fontFamily: FONTS.HERO,
      ...TYPE.HUGE,
      color: COLORS.BRASS.str,
      letterSpacing: 3,
    }).setOrigin(0, 0.5);

    this.add.text(GAME_DIM.W - 40, 45,
      `Stage 1 Philosophy · Folio Task 2 ready`, {
      fontFamily: FONTS.BODY,
      ...TYPE.SMALL,
      color: COLORS.PARCH.str,
    }).setOrigin(1, 0.5);

    // ── CERTIFICATE PANEL ───────────────────────────────────────────────────
    this._buildCertificatePanel({ s, badgeDef, digits, dateStr });

    // ── EXEMPLAR PANEL ──────────────────────────────────────────────────────
    this._buildExemplarPanel();

    // ── PRIZE NOTE ──────────────────────────────────────────────────────────
    this._buildPrizeNote();

    // ── BACK TO HUB ─────────────────────────────────────────────────────────
    this._addDomButton(
      40, GAME_DIM.H - 76, 240, 52,
      '← BACK TO HUB', 'Return to the hub', COLORS.STEEL.str,
      () => this.scene.start('HubScene', { podCode: this.podCode, state: this.state })
    );

    announce(`Vault open! Certificate ready for pod ${this.podCode}.`, true);

    // Inject print stylesheet
    this._injectPrintStyle();
  }

  _buildCertificatePanel({ s, badgeDef, digits, dateStr }) {
    // Certificate occupies top-right quadrant
    // Cert shrunk from H=480 to H=440 so the PRINT button at CERT_Y+CERT_H+12
    // (= y=562 now, was y=602) doesn't crash into the exemplar panel at y=614.
    const CERT_X = 460, CERT_Y = 110, CERT_W = 860, CERT_H = 440;

    const certEl = document.createElement('div');
    certEl.id = 'vault-certificate';
    certEl.style.cssText = `
      width: ${CERT_W}px;
      background: ${COLORS.PARCH.str};
      border: 3px solid ${COLORS.BRASS.str};
      border-radius: 4px;
      padding: 36px 44px 28px 44px;
      font-family: ${FONTS.HEAD};
      color: ${COLORS.BG_INK.str};
      box-shadow: 0 8px 40px rgba(0,0,0,0.7);
      box-sizing: border-box;
    `;

    certEl.innerHTML = `
      <div style="text-align:center; margin-bottom: 20px;">
        <div style="font-family:${FONTS.HERO}; font-size:13px; letter-spacing:6px;
                    color:${COLORS.STEEL_INK.str}; margin-bottom:6px;">
          ARGUMENT OPERATING THEATRE
        </div>
        <div style="font-family:${FONTS.HEAD}; font-size:34px; font-weight:700;
                    color:${COLORS.BG_INK.str}; line-height:1.1;">
          Certificate of Surgical Completion
        </div>
        <div style="height:2px; background:${COLORS.BRASS.str}; margin:14px 0;"></div>
      </div>

      <table style="width:100%; border-collapse:collapse; font-size:18px; line-height:2;">
        <tr>
          <td style="width:40%; color:${COLORS.STEEL_INK.str}; font-family:${FONTS.BODY};
                     font-size:14px; letter-spacing:2px; padding-right:12px;">
            AWARDED TO:
          </td>
          <td style="border-bottom:1px solid ${COLORS.STEEL_INK.str}; min-width:200px;">
            &nbsp;
          </td>
        </tr>
        <tr>
          <td style="color:${COLORS.STEEL_INK.str}; font-family:${FONTS.BODY};
                     font-size:14px; letter-spacing:2px;">POD CODE:</td>
          <td style="font-family:${FONTS.HERO}; font-weight:700;
                     color:${COLORS.BG_INK.str}; font-size:20px;">
            ${s.podCode}
          </td>
        </tr>
        <tr>
          <td style="color:${COLORS.STEEL_INK.str}; font-family:${FONTS.BODY};
                     font-size:14px; letter-spacing:2px;">BADGE:</td>
          <td style="font-family:${FONTS.HEAD}; font-size:19px;">
            ${badgeDef.label}
          </td>
        </tr>
        <tr>
          <td style="color:${COLORS.STEEL_INK.str}; font-family:${FONTS.BODY};
                     font-size:14px; letter-spacing:2px;">EVIDENCE COLLECTED:</td>
          <td style="font-family:${FONTS.HEAD}; font-size:19px;">
            6 of 6 specimens
          </td>
        </tr>
        <tr>
          <td style="color:${COLORS.STEEL_INK.str}; font-family:${FONTS.BODY};
                     font-size:14px; letter-spacing:2px;">MASTER COMBINATION:</td>
          <td style="font-family:${FONTS.HERO}; font-weight:700;
                     font-size:22px; letter-spacing:6px; color:${COLORS.BG_INK.str};">
            ${digits}
          </td>
        </tr>
        <tr>
          <td style="color:${COLORS.STEEL_INK.str}; font-family:${FONTS.BODY};
                     font-size:14px; letter-spacing:2px;">DATE COMPLETED:</td>
          <td style="font-family:${FONTS.HEAD}; font-size:19px;">${dateStr}</td>
        </tr>
      </table>

      <div style="margin-top:20px; border-top:1px solid ${COLORS.STEEL_INK.str};
                  padding-top:14px; font-family:${FONTS.HEAD}; font-size:17px;
                  color:${COLORS.STEEL_INK.str};">
        Signed: &nbsp;&nbsp;___________________________
        &nbsp;&nbsp;&nbsp;(M. Ellis, Examiner of Arguments)
      </div>
    `;

    const certDom = this.add.dom(CERT_X + CERT_W / 2, CERT_Y + CERT_H / 2, certEl);
    this.domNodes.push(certDom);

    // PRINT button
    this._addDomButton(
      CERT_X + CERT_W / 2 - 90, CERT_Y + CERT_H + 12, 180, 48,
      'PRINT CERTIFICATE', 'Print the certificate',
      COLORS.BRASS.str,
      () => this._printCertificate()
    );
  }

  _buildExemplarPanel() {
    // Panel y=620 → 624 (clears PRINT button at y=562+48 = 610). Body font
    // bumped 15px → 18px (was below the 17px floor).
    const PANEL_X = 40, PANEL_Y = 624, PANEL_W = 1180, PANEL_H = 400;

    const exEl = document.createElement('div');
    exEl.style.cssText = `
      width: ${PANEL_W}px;
      background: ${COLORS.PANEL.str};
      border: 1px solid ${COLORS.MUTED.str};
      border-radius: 4px;
      padding: 24px 32px;
      font-family: ${FONTS.BODY};
      color: ${COLORS.PARCH.str};
      font-size: 18px;
      line-height: 1.6;
      box-sizing: border-box;
    `;

    exEl.innerHTML = `
      <div style="font-family:${FONTS.HERO}; font-size:17px; letter-spacing:3px;
                  color:${COLORS.BRASS.str}; margin-bottom:16px;">
        AN ARGUMENT WORTH THE WORK
      </div>

      <div style="margin-bottom:12px;">
        <strong style="color:${COLORS.PARCH.str};">An argument worthy of standard form:</strong>
      </div>

      <div style="margin-bottom:16px; padding-left:16px;
                  border-left:3px solid ${COLORS.BRASS.str};">
        P1. Climate change is causing measurable harm to ecosystems and human communities.<br>
        P2. Reducing greenhouse gas emissions is the only known way to slow climate change.<br>
        P3. Wealthy nations have the technological and economic capacity to lead emissions reduction.<br>
        <span style="font-family:${FONTS.HEAD}; font-size:17px;">
          ∴ C. Wealthy nations have a moral obligation to lead the global emissions-reduction effort.
        </span>
      </div>

      <div style="margin-bottom:12px;">
        <strong>Type:</strong> Deductive (with implicit unstated premise:
        &ldquo;Those with capacity to prevent harm have a moral obligation to do so&rdquo;)
      </div>

      <div style="margin-bottom:8px;">
        <strong>Why this argument is good:</strong>
      </div>
      <div style="margin-bottom:12px; padding-left:16px;">
        1. Each premise is testable — you can argue with the evidence, not the structure.<br>
        2. The conclusion follows logically once the unstated moral premise is surfaced.<br>
        3. Even those who disagree with the conclusion must engage with the argument&rsquo;s
           bones, not just its mood.
      </div>

      <div>
        <strong>What you&rsquo;ve practised:</strong> identifying premises (L1),
        judging validity (L2), assessing soundness (L3).
        These three moves — find the premises, judge the form, test the truth — work on any argument you'll meet in school or out of it.
      </div>
    `;

    const exDom = this.add.dom(PANEL_X + PANEL_W / 2, PANEL_Y + PANEL_H / 2, exEl);
    this.domNodes.push(exDom);
  }

  _buildPrizeNote() {
    const prizeEl = document.createElement('div');
    prizeEl.style.cssText = `
      width: 340px;
      background: ${COLORS.PARCH.str};
      border: 2px dashed ${COLORS.BRASS.str};
      border-radius: 4px;
      padding: 20px 24px;
      font-family: ${FONTS.HEAD};
      color: ${COLORS.BG_INK.str};
      font-size: 19px;
      line-height: 1.5;
      text-align: center;
      transform: rotate(-2deg);
    `;
    prizeEl.innerHTML =
      `&#127873; Your prize is waiting —<br>see Mr Ellis to collect it.`;

    const prizeDom = this.add.dom(1700, 810, prizeEl);
    this.domNodes.push(prizeDom);
  }

  // ─── PRINT SUPPORT ──────────────────────────────────────────────────────────

  _injectPrintStyle() {
    const style = document.createElement('style');
    style.id = 'vault-print-style';
    style.textContent = `
      @media print {
        body > *:not(#game-container) { display: none !important; }
        #game-container canvas { display: none !important; }
        #game-container > div[style*="phaser"] { display: none !important; }
        #vault-certificate {
          display: block !important;
          position: static !important;
          width: 90vw !important;
          margin: 40px auto !important;
          box-shadow: none !important;
          border-color: #333 !important;
        }
        /* Hide all DOM nodes except certificate */
        #game-container button { display: none !important; }
        #game-container input  { display: none !important; }
      }
    `;
    document.head.appendChild(style);
    this._printStyle = style;
  }

  _printCertificate() {
    // Temporarily hide all game dom nodes except certificate
    const certEl = document.getElementById('vault-certificate');
    const allDom = Array.from(document.querySelectorAll(
      '#game-container button, #game-container input, #game-container div:not(#vault-certificate)'
    ));

    // Store original visibility
    const prevVis = allDom.map(el => el.style.visibility);
    allDom.forEach(el => {
      if (!el.contains(certEl) && el !== certEl) {
        el.style.visibility = 'hidden';
      }
    });

    window.print();

    // Restore
    allDom.forEach((el, i) => { el.style.visibility = prevVis[i]; });
    announce('Print dialog opened.', true);
  }

  // ─── DOM BUTTON HELPER (mirrors hub.js pattern exactly) ─────────────────────

  _addDomButton(x, y, w, h, label, ariaLabel, accentStr, onClick, fontSize = 16) {
    const btn = document.createElement('button');
    btn.type        = 'button';
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

  // ─── CLEANUP ─────────────────────────────────────────────────────────────────

  _cleanup() {
    if (this._keyHandler) {
      this.input.keyboard.off('keydown', this._keyHandler);
      this._keyHandler = null;
    }
    this.domNodes.forEach(d => { try { d.destroy(); } catch {} });
    this.domNodes = [];
    if (this._printStyle && this._printStyle.parentNode) {
      this._printStyle.parentNode.removeChild(this._printStyle);
      this._printStyle = null;
    }
  }
}
