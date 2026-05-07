'use strict';

// ── L3Scene — Operating Theatre / Op-Ed Autopsy ──────────────────────────────
class L3Scene extends Phaser.Scene {
  constructor() { super({ key: 'L3Scene' }); }

  // ── LIFECYCLE ───────────────────────────────────────────────────────────────

  init(data) {
    this.podCode   = data.podCode;
    this.state     = data.state;
    this.domNodes  = [];
    this._keyHandler = null;
    this._currentQ = 1;           // 1 | 2 | 3 | 4
    this._q1Answered = false;
    this._q2Answered = false;
    this._q3Answered = false;
    this._q4Answered = false;
    // DOM references for Q1 / Q4 checkboxes
    this._checkboxDoms = [];
    // Reveal panel dom container
    this._revealDom = null;
    // Active question area containers (for destroy on advance)
    this._qAreaDoms = [];
    this._revealVisible = false;
    // Focus trap state
    this._lastFocus = null;
    this._revealKeyHandler = null;
  }

  create() {
    // Background
    this.add.image(GAME_DIM.W / 2, GAME_DIM.H / 2, 'chamber_l3').setDisplaySize(GAME_DIM.W, GAME_DIM.H);

    // Fix 5: dim overlay — slightly stronger than L2 (0.55) because chamber_l3 is busier
    this.add.graphics().fillStyle(0x000000, 0.55).fillRect(0, 0, GAME_DIM.W, GAME_DIM.H).setDepth(1);

    this._drawTopBar();
    this._drawArticlePanel();
    this._drawQCounter();
    this._showQuestion(1);
    this._wireKeyboard();

    announce(
      'Operating Theatre — Op-Ed Autopsy. 4 questions. Question 1 of 4: identify the premises. ' +
      'Six statements shown; tick all that are premises, then click SUBMIT.'
    );

    this.events.once('shutdown', () => this._cleanup());
    this.events.once('destroy',  () => this._cleanup());
  }

  // ── TOP BAR ─────────────────────────────────────────────────────────────────

  _drawTopBar() {
    const g = this.add.graphics();
    g.fillStyle(COLORS.PANEL_DK.num, 0.94);
    g.fillRect(0, 0, GAME_DIM.W, 80);
    g.lineStyle(1, COLORS.L3_ACCENT.num, 0.7);
    g.lineBetween(0, 80, GAME_DIM.W, 80);

    // Back button (DOM — a11y)
    const backBtn = document.createElement('button');
    backBtn.type = 'button';
    backBtn.textContent = '← BACK TO HUB';
    backBtn.setAttribute('aria-label', 'Return to the hub');
    backBtn.style.cssText = `
      background: transparent;
      color: ${COLORS.BRASS.str};
      border: 1px solid ${COLORS.BRASS.str};
      border-radius: 6px;
      font-family: ${FONTS.HERO};
      font-size: 15px;
      letter-spacing: 3px;
      cursor: pointer;
      padding: 6px 18px;
      outline-offset: 3px;
    `;
    backBtn.addEventListener('mouseenter', () => {
      backBtn.style.background = COLORS.BRASS.str;
      backBtn.style.color = COLORS.BG_INK.str;
    });
    backBtn.addEventListener('mouseleave', () => {
      backBtn.style.background = 'transparent';
      backBtn.style.color = COLORS.BRASS.str;
    });
    backBtn.addEventListener('click', () =>
      this.scene.start('HubScene', { podCode: this.podCode, state: this.state }));
    const backDom = this.add.dom(120, 40, backBtn);
    this.domNodes.push(backDom);

    // Title
    this.add.text(GAME_DIM.W / 2, 40, 'OPERATING THEATRE  ·  Op-Ed Autopsy', {
      fontFamily: FONTS.HERO,
      fontSize: '24px',
      color: COLORS.L3_ACCENT.str,
      letterSpacing: 4,
    }).setOrigin(0.5);
  }

  _drawQCounter() {
    // Rendered as Phaser text — updated each question advance
    this._qCounterText = this.add.text(GAME_DIM.W - 40, 40, 'Q 1 / 4', {
      fontFamily: FONTS.HERO,
      fontSize: '22px',
      color: COLORS.PARCH.str,
    }).setOrigin(1, 0.5).setDepth(10);
  }

  _updateQCounter(q) {
    if (this._qCounterText) this._qCounterText.setText(`Q ${q} / 4`);
  }

  // ── ARTICLE PANEL (always visible) ─────────────────────────────────────────

  _drawArticlePanel() {
    // Clipping-style box
    const panelX = 60, panelY = 96, panelW = GAME_DIM.W - 120, panelH = 178;
    const g = this.add.graphics();
    g.fillStyle(COLORS.PARCH.num, 0.07);
    g.fillRoundedRect(panelX, panelY, panelW, panelH, 8);
    g.lineStyle(1, COLORS.L3_ACCENT.num, 0.5);
    g.strokeRoundedRect(panelX, panelY, panelW, panelH, 8);
    // Clipping top-border accent
    g.fillStyle(COLORS.L3_ACCENT.num, 0.8);
    g.fillRect(panelX, panelY, panelW, 4);

    this.add.text(panelX + 24, panelY + 18, '"The Benefits of a Plant-Based Diet"  (Healthline)', {
      fontFamily: FONTS.BODY,
      ...TYPE.BODY,
      color: COLORS.L3_ACCENT.str,
    });

    const bodyText =
      'The article argues that a plant-based diet has numerous health benefits, including lower risk of chronic diseases,\n' +
      'improved heart health, and better weight management. Plant-based diets are generally higher in nutrients and lower\n' +
      'in harmful substances. Chronic diseases are linked to poor diet and lifestyle choices.';

    this.add.text(panelX + 24, panelY + 52, bodyText, {
      fontFamily: FONTS.BODY,
      fontSize: '17px',
      color: COLORS.PARCH.str,
      lineSpacing: 6,
    });
  }

  // ── QUESTION ROUTING ────────────────────────────────────────────────────────

  _showQuestion(n) {
    this._currentQ = n;
    this._updateQCounter(n);
    if (n === 1) this._buildQ1();
    else if (n === 2) this._buildQ2();
    else if (n === 3) this._buildQ3();
    else if (n === 4) this._buildQ4();
  }

  _clearQArea() {
    this._qAreaDoms.forEach(d => { try { d.destroy(); } catch {} });
    this._qAreaDoms = [];
    this._checkboxDoms = [];
    this._revealVisible = false;
    this._dismissReveal();
  }

  // ── QUESTION 1 — Multi-select premises ─────────────────────────────────────

  _buildQ1() {
    this._clearQArea();

    const qY = 295;

    const prompt = this.add.text(GAME_DIM.W / 2, qY,
      'Which of these statements are PREMISES of the argument?  (Tick all that apply)', {
        fontFamily: FONTS.BODY,
        fontSize: '28px',
        color: COLORS.PARCH.str,
        wordWrap: { width: GAME_DIM.W - 240 },
        align: 'center',
      }).setOrigin(0.5);
    this._qAreaDoms.push({ destroy: () => prompt.destroy() });

    // Distractors are intentionally tricky: every statement here either appears
    // in the article prose OR sounds like it could. Pods must distinguish
    // between sentences that are PART OF THE STANDARD-FORM ARGUMENT (premises
    // P1-P3 from slide 7) and sentences that appear in the prose but support
    // the argument from the side (background context) or ARE the conclusion.
    // Order is shuffled so pattern-matching opening words doesn't work.
    const statements = [
      { text: 'A plant-based diet is associated with a lower risk of chronic diseases.', correct: true,
        why: 'This is Premise 1 in the standard-form rebuild (slide 7).' },
      { text: 'Plant-based diets are generally higher in nutrients and lower in harmful substances.', correct: false,
        why: 'In the article prose, but it is background context — not a numbered premise of THIS argument. It would support a different argument about nutrient density.' },
      { text: 'A plant-based diet is associated with improved heart health.', correct: true,
        why: 'This is Premise 2 in the standard-form rebuild.' },
      { text: 'Plant-based diets have significant health benefits.', correct: false,
        why: 'This is the CONCLUSION, not a premise. Conclusions are what premises support.' },
      { text: 'A plant-based diet is associated with better weight management.', correct: true,
        why: 'This is Premise 3 in the standard-form rebuild.' },
      { text: 'Chronic diseases are linked to poor diet and lifestyle choices.', correct: false,
        why: 'In the article prose, but background — it explains WHY the premises matter, not the argument itself.' },
    ];

    const listEl = document.createElement('div');
    listEl.setAttribute('role', 'group');
    listEl.setAttribute('aria-label', 'Select all premises');
    listEl.style.cssText = `
      display: flex; flex-direction: column; gap: 14px;
      width: 860px;
    `;

    const checks = [];
    statements.forEach((stmt, i) => {
      const label = document.createElement('label');
      label.style.cssText = `
        display: flex; align-items: flex-start; gap: 14px;
        font-family: ${FONTS.BODY};
        font-size: 18px;
        color: ${COLORS.PARCH.str};
        cursor: pointer;
        line-height: 1.45;
        padding: 10px 14px;
        border: 1px solid ${COLORS.MUTED.str};
        border-radius: 10px;
        background: rgba(14,14,26,0.6);
        transition: border-color 0.15s;
      `;
      const chk = document.createElement('input');
      chk.type = 'checkbox';
      chk.id = `q1_stmt_${i}`;
      chk.style.cssText = `
        width: 22px; height: 22px; flex-shrink: 0; margin-top: 2px;
        accent-color: ${COLORS.L3_ACCENT.str};
        cursor: pointer;
      `;
      chk.addEventListener('change', () => {
        label.style.borderColor = chk.checked ? COLORS.L3_ACCENT.str : COLORS.MUTED.str;
      });
      const span = document.createElement('span');
      span.textContent = stmt.text;

      label.htmlFor = chk.id;
      label.appendChild(chk);
      label.appendChild(span);
      listEl.appendChild(label);
      // Surface stmt text + why so _submitQ1 can render per-statement diagnostics
      // (the `why` data was previously defined but unused in feedback).
      checks.push({ el: chk, correct: stmt.correct, text: stmt.text, why: stmt.why });
    });

    const listDom = this.add.dom(GAME_DIM.W / 2, qY + 220, listEl);
    this.domNodes.push(listDom);
    this._qAreaDoms.push(listDom);
    this._checkboxDoms = checks;

    // SUBMIT button
    const submitDom = this._addActionButton(
      GAME_DIM.W / 2, 810, 260, 60, 'SUBMIT', 'Submit your premise selections',
      () => this._submitQ1()
    );
    this._qAreaDoms.push(submitDom);
  }

  _submitQ1() {
    const checks = this._checkboxDoms;
    const allCorrect = checks.every(c => c.el.checked === c.correct);

    if (allCorrect) {
      this._q1Answered = true;
      // Capture the student's selected premises so Q2 can show THEIR picks
      // arranged in standard form, not a hardcoded rebuild handed to them.
      // Pedagogically: the move "you identified these premises — now judge
      // the structure they form" is closer to the Folio Task 2 process.
      this._q1StudentPremises = checks
        .filter(c => c.el.checked && c.correct)
        .map(c => c.text);
      announce('Correct! All three premises identified.', true);
      this._showReveal(
        'CORRECT — 3 premises identified.',
        'You picked the three statements that appear as numbered premises in the standard-form rebuild ' +
        '(slide 7). The other three are traps:\n\n' +
        '  • "Plant-based diets are generally higher in nutrients…" is in the article prose but is ' +
        'background context, not a numbered premise.\n' +
        '  • "Plant-based diets have significant health benefits" IS the argument — it\'s the conclusion ' +
        'the premises support.\n' +
        '  • "Chronic diseases are linked to poor diet…" is in the prose but explains WHY the premises ' +
        'matter, not the argument itself.\n\n' +
        'Spotting the difference between "in the article" and "in the standard-form argument" is the ' +
        'core skill of op-ed analysis.',
        () => this._advanceToQ(2)
      );
    } else {
      announce('Not quite — diagnostic feedback shown.', true);
      if (!PREFERS_REDUCED_MOTION) this._flashRed();

      // Diagnostic feedback — name each wrong tick AND each missed premise,
      // surfacing the per-statement `why` so the diagnostic actually teaches
      // (was generic "see the article" before, despite the why-data existing).
      const wrongTicks  = checks.filter(c =>  c.el.checked && !c.correct);
      const missedTicks = checks.filter(c => !c.el.checked &&  c.correct);
      const lines = [];
      if (wrongTicks.length) {
        lines.push('You ticked statements that AREN\'T premises of this argument:');
        wrongTicks.forEach(c => {
          lines.push(`  ✗ "${c.text}"`);
          lines.push(`     ${c.why}`);
        });
      }
      if (missedTicks.length) {
        if (wrongTicks.length) lines.push('');
        lines.push(`You missed ${missedTicks.length} premise${missedTicks.length > 1 ? 's' : ''} that ARE in the standard-form rebuild:`);
        missedTicks.forEach(c => {
          lines.push(`  ⊘ "${c.text}"`);
          lines.push(`     ${c.why}`);
        });
      }
      lines.push('\nA premise is a numbered claim that supports the conclusion. ' +
                 'The conclusion itself ("Plant-based diets have significant health benefits") is NOT a premise.');
      this._showReveal('Not quite — try again.', lines.join('\n'), null, true);
    }
  }

  // ── QUESTION 2 — VALID / INVALID ────────────────────────────────────────────

  _buildQ2() {
    this._clearQArea();
    const qY = 295;

    const prompt = this.add.text(GAME_DIM.W / 2, qY,
      'Is this argument VALID or INVALID?', {
        fontFamily: FONTS.BODY,
        fontSize: '28px',
        color: COLORS.PARCH.str,
        align: 'center',
      }).setOrigin(0.5);
    this._qAreaDoms.push({ destroy: () => prompt.destroy() });

    // Standard-form rebuild panel — built from the student's OWN Q1 picks
    // when available (the cheap version of "make construction visible").
    // Falls back to canonical premises if Q1 wasn't completed (e.g. dev jump).
    const studentPicks = this._q1StudentPremises || [
      'A plant-based diet is associated with a lower risk of chronic diseases.',
      'A plant-based diet is associated with improved heart health.',
      'A plant-based diet is associated with better weight management.',
    ];
    const rebuildLines = [
      `P1: ${studentPicks[0] || ''}`,
      `P2: ${studentPicks[1] || ''}`,
      `P3: ${studentPicks[2] || ''}`,
      '∴ C:  Plant-based diets have significant health benefits.',
    ];

    // Lead-in text that frames the rebuild as the student's own work
    if (this._q1StudentPremises) {
      const leadIn = this.add.text(GAME_DIM.W / 2, qY + 32,
        'These are YOUR three premises from Q1, arranged in standard form. Now judge the structure.', {
          fontFamily: FONTS.BODY,
          ...TYPE.SMALL,
          color: COLORS.BRASS.str,
          align: 'center',
          wordWrap: { width: 1100 },
        }).setOrigin(0.5);
      this._qAreaDoms.push({ destroy: () => leadIn.destroy() });
    }
    const panelX = GAME_DIM.W / 2 - 500;
    const panelY = qY + 50;
    const g = this.add.graphics();
    g.fillStyle(COLORS.PANEL.num, 0.85);
    g.fillRoundedRect(panelX, panelY, 1000, 210, 10);
    g.lineStyle(1, COLORS.L3_ACCENT.num, 0.4);
    g.strokeRoundedRect(panelX, panelY, 1000, 210, 10);
    this._qAreaDoms.push({ destroy: () => g.destroy() });

    rebuildLines.forEach((line, i) => {
      const isConclusion = i === 3;
      const t = this.add.text(panelX + 28, panelY + 22 + i * 46, line, {
        fontFamily: FONTS.BODY,
        ...TYPE.BODY,
        color: isConclusion ? COLORS.L3_ACCENT.str : COLORS.PARCH.str,
      });
      this._qAreaDoms.push({ destroy: () => t.destroy() });
    });

    // VALID / INVALID buttons side by side
    const btnY = 600;
    const validDom = this._addActionButton(GAME_DIM.W / 2 - 160, btnY, 280, 70, 'VALID',
      'Mark argument as valid', () => this._answerQ2(true));
    const invalidDom = this._addActionButton(GAME_DIM.W / 2 + 160, btnY, 280, 70, 'INVALID',
      'Mark argument as invalid', () => this._answerQ2(false));
    this._qAreaDoms.push(validDom, invalidDom);
  }

  _answerQ2(choseValid) {
    const correct = choseValid; // correct answer is VALID
    this._q2Answered = true;

    if (correct) {
      announce('Correct — VALID.', true);
      this._showReveal(
        'VALID — correct.',
        'VALID — the conclusion is a reasonable summary of the three premise-claims. ' +
        '(Note: it\'s an inductive-style generalisation. If the premises are true, the conclusion ' +
        'is well-supported, though some philosophers would say strictly-deductive validity is a higher bar.)',
        () => this._advanceToQ(3)
      );
    } else {
      if (!PREFERS_REDUCED_MOTION) this._flashRed();
      announce('Not quite — the correct answer is VALID.', true);
      this._showReveal(
        'INVALID — not quite.',
        'VALID — the conclusion is a reasonable summary of the three premise-claims. ' +
        'The conclusion follows reasonably from the premises if you accept "significant health benefits" ' +
        'as a synthesis of the three areas. Try again.',
        null,
        true
      );
    }
  }

  // ── QUESTION 3 — SOUND / UNSOUND ────────────────────────────────────────────

  _buildQ3() {
    this._clearQArea();
    const qY = 295;

    const prompt = this.add.text(GAME_DIM.W / 2, qY,
      'Is this argument SOUND or UNSOUND?', {
        fontFamily: FONTS.BODY,
        fontSize: '28px',
        color: COLORS.PARCH.str,
        align: 'center',
      }).setOrigin(0.5);
    this._qAreaDoms.push({ destroy: () => prompt.destroy() });

    // Same standard-form rebuild panel
    const rebuildLines = [
      'P1: A plant-based diet is associated with a lower risk of chronic diseases.',
      'P2: A plant-based diet is associated with improved heart health.',
      'P3: A plant-based diet is associated with better weight management.',
      '∴ C:  Plant-based diets have significant health benefits.',
    ];
    const panelX = GAME_DIM.W / 2 - 500;
    const panelY = qY + 50;
    const g = this.add.graphics();
    g.fillStyle(COLORS.PANEL.num, 0.85);
    g.fillRoundedRect(panelX, panelY, 1000, 210, 10);
    g.lineStyle(1, COLORS.L3_ACCENT.num, 0.4);
    g.strokeRoundedRect(panelX, panelY, 1000, 210, 10);
    this._qAreaDoms.push({ destroy: () => g.destroy() });

    rebuildLines.forEach((line, i) => {
      const isConclusion = i === 3;
      const t = this.add.text(panelX + 28, panelY + 22 + i * 46, line, {
        fontFamily: FONTS.BODY,
        ...TYPE.BODY,
        color: isConclusion ? COLORS.L3_ACCENT.str : COLORS.PARCH.str,
      });
      this._qAreaDoms.push({ destroy: () => t.destroy() });
    });

    const btnY = 600;
    const soundDom = this._addActionButton(GAME_DIM.W / 2 - 160, btnY, 280, 70, 'SOUND',
      'Mark argument as sound', () => this._answerQ3(true));
    const unsoundDom = this._addActionButton(GAME_DIM.W / 2 + 160, btnY, 280, 70, 'UNSOUND',
      'Mark argument as unsound', () => this._answerQ3(false));
    this._qAreaDoms.push(soundDom, unsoundDom);
  }

  _answerQ3(choseSound) {
    const correct = choseSound; // correct answer is SOUND

    if (correct) {
      announce('Correct — SOUND. Moving to question 4.', true);
      this._showReveal(
        'SOUND — correct.',
        'SOUND means: VALID + true premises. The premises here align with established nutritional ' +
        'science (the article cites peer-reviewed studies), and the reasoning is valid — so the argument ' +
        'is sound.\n\n' +
        'Why this question is harder than VALID/INVALID: soundness depends on the WORLD, not just the ' +
        'argument\'s shape. You have to ask "are the premises actually true?" That move — interrogating ' +
        'whether claimed evidence holds up — is exactly what Q4 will ask you to do next.',
        () => this._advanceToQ(4)
      );
    } else {
      if (!PREFERS_REDUCED_MOTION) this._flashRed();
      announce('Not quite — the correct answer is SOUND.', true);
      this._showReveal(
        'UNSOUND — not quite.',
        'SOUND — the premises are well-supported by nutritional science, and since the reasoning is also ' +
        'valid, the argument is sound. An argument is UNSOUND only if a premise is false or the reasoning ' +
        'is invalid. Try again.',
        null,
        true
      );
    }
  }

  // ── QUESTION 4 — Socratic Method (multi-select) ─────────────────────────────

  _buildQ4() {
    this._clearQArea();

    const qY = 295;

    const prompt = this.add.text(GAME_DIM.W / 2, qY,
      'Which of these would be GOOD Socratic challenges to this article?  (Tick all that apply)', {
        fontFamily: FONTS.BODY,
        fontSize: '28px',
        color: COLORS.PARCH.str,
        align: 'center',
        wordWrap: { width: GAME_DIM.W - 240 },
      }).setOrigin(0.5);
    this._qAreaDoms.push({ destroy: () => prompt.destroy() });

    const subPrompt = this.add.text(GAME_DIM.W / 2, qY + 40,
      'A good Socratic challenge engages the argument\'s logic, evidence, or assumptions — not the author\'s character or your personal preferences.', {
        fontFamily: FONTS.BODY,
        ...TYPE.SMALL,
        color: COLORS.MUTED.str,
        align: 'center',
        wordWrap: { width: 1000 },
      }).setOrigin(0.5);
    this._qAreaDoms.push({ destroy: () => subPrompt.destroy() });

    // Statements: 4 correct (1,2,3,5) and 2 incorrect (4,6)
    const statements = [
      {
        text: '"What does the author mean by \'plant-based\'? Does it include eggs? Dairy?"',
        correct: true,
        why: 'Clarifying the meaning of key terms before evaluating an argument is a core Socratic move (slide 8).',
      },
      {
        text: '"Are the studies cited peer-reviewed and recent?"',
        correct: true,
        why: 'Challenging the evidence quality of the premises is legitimate philosophical scrutiny (slide 9).',
      },
      {
        text: '"What if someone has a medical condition that requires animal protein?"',
        correct: true,
        why: 'Testing a generalisation against counter-examples and edge cases (slide 12) is solid Socratic method.',
      },
      {
        text: '"The author is probably a vegan, so we shouldn\'t trust them."',
        correct: false,
        why: 'This is an ad hominem — it attacks the author\'s character, not the argument itself.',
      },
      {
        text: '"Could this article be biased by health-industry funding?"',
        correct: true,
        why: 'Surfacing potential biases and hidden assumptions (slide 11) is a legitimate Socratic challenge.',
      },
      {
        text: '"I just don\'t like vegetables, so the article is wrong."',
        correct: false,
        why: 'Personal preference is not philosophical engagement — it doesn\'t evaluate the argument at all.',
      },
    ];

    const listEl = document.createElement('div');
    listEl.setAttribute('role', 'group');
    listEl.setAttribute('aria-label', 'Select all good Socratic challenges');
    listEl.style.cssText = `
      display: flex; flex-direction: column; gap: 12px;
      width: 900px;
    `;

    const checks = [];
    statements.forEach((stmt, i) => {
      const label = document.createElement('label');
      label.style.cssText = `
        display: flex; align-items: flex-start; gap: 14px;
        font-family: ${FONTS.BODY};
        font-size: 17px;
        color: ${COLORS.PARCH.str};
        cursor: pointer;
        line-height: 1.4;
        padding: 10px 14px;
        border: 1px solid ${COLORS.MUTED.str};
        border-radius: 10px;
        background: rgba(14,14,26,0.6);
        transition: border-color 0.15s;
      `;
      const chk = document.createElement('input');
      chk.type = 'checkbox';
      chk.id = `q4_stmt_${i}`;
      chk.style.cssText = `
        width: 22px; height: 22px; flex-shrink: 0; margin-top: 2px;
        accent-color: ${COLORS.L3_ACCENT.str};
        cursor: pointer;
      `;
      chk.addEventListener('change', () => {
        label.style.borderColor = chk.checked ? COLORS.L3_ACCENT.str : COLORS.MUTED.str;
      });
      const span = document.createElement('span');
      span.textContent = stmt.text;

      label.htmlFor = chk.id;
      label.appendChild(chk);
      label.appendChild(span);
      listEl.appendChild(label);
      checks.push({ el: chk, correct: stmt.correct, why: stmt.why, text: stmt.text });
    });

    const listDom = this.add.dom(GAME_DIM.W / 2, qY + 200, listEl);
    this.domNodes.push(listDom);
    this._qAreaDoms.push(listDom);
    this._checkboxDoms = checks;

    // SUBMIT button
    const submitDom = this._addActionButton(
      GAME_DIM.W / 2, 800, 260, 60, 'SUBMIT', 'Submit your Socratic challenge selections',
      () => this._submitQ4()
    );
    this._qAreaDoms.push(submitDom);
  }

  _submitQ4() {
    const checks = this._checkboxDoms;
    const allCorrect = checks.every(c => c.el.checked === c.correct);

    if (allCorrect) {
      this._q4Answered = true;
      announce('Correct — 4 good Socratic challenges identified. Lesson complete!', true);
      this._showReveal(
        'CORRECT — 4 good Socratic challenges identified.',
        'Statements 4 and 6 are NOT philosophical engagement:\n' +
        '  • Statement 4 is ad hominem — it attacks the author\'s identity, not the argument.\n' +
        '  • Statement 6 is personal preference — it doesn\'t evaluate the argument at all.\n\n' +
        'Socratic Method engages the argument\'s terms (Stmt 1), evidence (Stmt 2), scope and counter-examples ' +
        '(Stmt 3), and hidden assumptions or biases (Stmt 5). All four are legitimate philosophical challenges.',
        () => this._complete()
      );
    } else {
      announce('Not quite — diagnostic feedback shown.', true);
      if (!PREFERS_REDUCED_MOTION) this._flashRed();

      const wrongTicks  = checks.filter(c =>  c.el.checked && !c.correct);
      const missedTicks = checks.filter(c => !c.el.checked &&  c.correct);
      const lines = [];

      if (wrongTicks.length) {
        lines.push('You ticked statements that are NOT good Socratic challenges:');
        wrongTicks.forEach(c => {
          const idx = checks.indexOf(c) + 1;
          lines.push(`  ✗ Statement ${idx} — ${c.why}`);
        });
      }
      if (missedTicks.length) {
        if (wrongTicks.length) lines.push('');
        lines.push('You missed ' + missedTicks.length + ' valid Socratic challenge' +
          (missedTicks.length > 1 ? 's' : '') + ':');
        missedTicks.forEach(c => {
          const idx = checks.indexOf(c) + 1;
          lines.push(`  ✓ Statement ${idx} — ${c.why}`);
        });
      }
      lines.push('\nRemember: Socratic Method challenges terms, evidence, scope, or assumptions — not the person speaking.');
      this._showReveal('Not quite — try again.', lines.join('\n'), null, true);
    }
  }

  // ── ADVANCE ─────────────────────────────────────────────────────────────────

  _advanceToQ(n) {
    this._showQuestion(n);
    announce(`Question ${n} of 4.`, false);
  }

  _complete() {
    StateManager.completeLesson(this.state, 'L3', ['newspaper-clipping', 'rebuild-card']);
    announce('Lesson 3 complete! Returning to hub with your digit.', true);
    this.time.delayedCall(1800, () =>
      this.scene.start('HubScene', { podCode: this.podCode, state: this.state }));
  }

  // ── REVEAL PANEL ─────────────────────────────────────────────────────────────

  /**
   * @param {string} heading   - short verdict line
   * @param {string} body      - explanation text
   * @param {Function|null} onNext  - null = show retry (wrong answer path)
   * @param {boolean} isRetry
   */
  _showReveal(heading, body, onNext, isRetry = false) {
    if (this._revealDom) { try { this._revealDom.destroy(); } catch {} this._revealDom = null; }

    const panel = document.createElement('div');
    panel.style.cssText = `
      width: 1100px;
      background: rgba(14,14,26,0.97);
      border: 2px solid ${isRetry ? '#C81D1D' : COLORS.L3_ACCENT.str};
      border-radius: 12px;
      padding: 28px 36px 24px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.7);
      display: flex;
      flex-direction: column;
      gap: 12px;
    `;

    const hEl = document.createElement('div');
    hEl.textContent = heading;
    hEl.style.cssText = `
      font-family: ${FONTS.HERO};
      font-size: 22px;
      color: ${isRetry ? '#C81D1D' : COLORS.L3_ACCENT.str};
      letter-spacing: 2px;
    `;
    panel.appendChild(hEl);

    const bEl = document.createElement('div');
    bEl.style.cssText = `
      font-family: ${FONTS.BODY};
      font-size: 17px;
      color: ${COLORS.PARCH.str};
      line-height: 1.6;
      white-space: pre-wrap;
    `;
    bEl.textContent = body;
    panel.appendChild(bEl);

    if (onNext) {
      // Correct path — NEXT button
      const nextBtn = document.createElement('button');
      nextBtn.type = 'button';
      nextBtn.textContent = this._currentQ === 4
        ? 'COMPLETE LESSON →'
        : 'NEXT QUESTION →';
      nextBtn.style.cssText = `
        align-self: flex-end;
        background: transparent;
        color: ${COLORS.L3_ACCENT.str};
        border: 2px solid ${COLORS.L3_ACCENT.str};
        border-radius: 12px;
        font-family: ${FONTS.HERO};
        font-size: 18px;
        letter-spacing: 4px;
        cursor: pointer;
        padding: 10px 32px;
        outline-offset: 3px;
        margin-top: 8px;
      `;
      nextBtn.addEventListener('mouseenter', () => {
        nextBtn.style.background = COLORS.L3_ACCENT.str;
        nextBtn.style.color = COLORS.BG_INK.str;
      });
      nextBtn.addEventListener('mouseleave', () => {
        nextBtn.style.background = 'transparent';
        nextBtn.style.color = COLORS.L3_ACCENT.str;
      });
      nextBtn.addEventListener('click', () => {
        this._dismissReveal();
        onNext();
      });
      panel.appendChild(nextBtn);
    } else {
      // Retry path — RETRY button
      const retryBtn = document.createElement('button');
      retryBtn.type = 'button';
      retryBtn.textContent = 'TRY AGAIN';
      retryBtn.style.cssText = `
        align-self: flex-end;
        background: transparent;
        color: ${COLORS.BRASS.str};
        border: 2px solid ${COLORS.BRASS.str};
        border-radius: 12px;
        font-family: ${FONTS.HERO};
        font-size: 18px;
        letter-spacing: 4px;
        cursor: pointer;
        padding: 10px 32px;
        outline-offset: 3px;
        margin-top: 8px;
      `;
      retryBtn.addEventListener('mouseenter', () => {
        retryBtn.style.background = COLORS.BRASS.str;
        retryBtn.style.color = COLORS.BG_INK.str;
      });
      retryBtn.addEventListener('mouseleave', () => {
        retryBtn.style.background = 'transparent';
        retryBtn.style.color = COLORS.BRASS.str;
      });
      retryBtn.addEventListener('click', () => {
        this._dismissReveal();
        // Rebuild the current question (clears area, re-creates it)
        this._showQuestion(this._currentQ);
      });
      panel.appendChild(retryBtn);
    }

    // Position below the question area — y=870 centres in lower half
    const dom = this.add.dom(GAME_DIM.W / 2, 900, panel);
    this.domNodes.push(dom);
    this._revealDom = dom;
    this._revealVisible = true;

    // ── Focus trap ────────────────────────────────────────────────────────────
    // Remove any prior trap handler
    if (this._revealKeyHandler) {
      document.removeEventListener('keydown', this._revealKeyHandler, true);
      this._revealKeyHandler = null;
    }
    // Capture the element that had focus before this panel opened
    this._lastFocus = document.activeElement;

    // After one microtask the DOM node is attached — move focus into the panel
    Promise.resolve().then(() => {
      const focusable = panel.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length) focusable[focusable.length - 1].focus();
    });

    this._revealKeyHandler = (e) => {
      if (e.key !== 'Tab') return;
      const focusable = Array.from(panel.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )).filter(el => !el.disabled);
      if (!focusable.length) { e.preventDefault(); return; }
      const first = focusable[0];
      const last  = focusable[focusable.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); last.focus(); }
      } else {
        if (document.activeElement === last)  { e.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener('keydown', this._revealKeyHandler, true);
  }

  _dismissReveal() {
    if (this._revealKeyHandler) {
      document.removeEventListener('keydown', this._revealKeyHandler, true);
      this._revealKeyHandler = null;
    }
    if (this._lastFocus && typeof this._lastFocus.focus === 'function') {
      try { this._lastFocus.focus(); } catch {}
      this._lastFocus = null;
    }
    if (this._revealDom) { try { this._revealDom.destroy(); } catch {} this._revealDom = null; }
  }

  // ── HELPERS ─────────────────────────────────────────────────────────────────

  _addActionButton(cx, cy, w, h, label, ariaLabel, onClick) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = label;
    btn.setAttribute('aria-label', ariaLabel);
    btn.style.cssText = `
      width: ${w}px; height: ${h}px;
      background: transparent;
      color: ${COLORS.L3_ACCENT.str};
      border: 2px solid ${COLORS.L3_ACCENT.str};
      border-radius: 12px;
      font-family: ${FONTS.HERO};
      font-size: 22px;
      letter-spacing: 4px;
      cursor: pointer;
      padding: 0;
      outline-offset: 3px;
      transition: background 0.15s ease, color 0.15s ease;
    `;
    btn.addEventListener('mouseenter', () => {
      btn.style.background = COLORS.L3_ACCENT.str;
      btn.style.color = COLORS.BG_INK.str;
    });
    btn.addEventListener('mouseleave', () => {
      btn.style.background = 'transparent';
      btn.style.color = COLORS.L3_ACCENT.str;
    });
    btn.addEventListener('click', onClick);
    const dom = this.add.dom(cx, cy, btn);
    this.domNodes.push(dom);
    return dom;
  }

  _flashRed() {
    const flash = this.add.graphics();
    flash.fillStyle(0xC81D1D, 0.25);
    flash.fillRect(0, 0, GAME_DIM.W, GAME_DIM.H);
    this.tweens.add({
      targets: flash,
      alpha: { from: 1, to: 0 },
      duration: 500,
      onComplete: () => flash.destroy(),
    });
  }

  // ── KEYBOARD ────────────────────────────────────────────────────────────────

  _wireKeyboard() {
    this._keyHandler = (event) => {
      const k = event.key;
      const kl = k.toLowerCase();
      if (kl === 'd') {
        // DEV shortcut: skip to completion
        StateManager.completeLesson(this.state, 'L3', ['newspaper-clipping', 'rebuild-card']);
        this.scene.start('HubScene', { podCode: this.podCode, state: this.state });
        return;
      }
      // Fix 6: Esc returns to Hub (matches L2 pattern)
      if (k === 'Escape') {
        this.scene.start('HubScene', { podCode: this.podCode, state: this.state });
        return;
      }
    };
    this.input.keyboard.on('keydown', this._keyHandler);
  }

  // ── CLEANUP ─────────────────────────────────────────────────────────────────

  _cleanup() {
    if (this._keyHandler) {
      this.input.keyboard.off('keydown', this._keyHandler);
      this._keyHandler = null;
    }
    if (this._revealKeyHandler) {
      document.removeEventListener('keydown', this._revealKeyHandler, true);
      this._revealKeyHandler = null;
    }
    this.domNodes.forEach(d => { try { d.destroy(); } catch {} });
    this.domNodes = [];
    this._qAreaDoms = [];
    this._checkboxDoms = [];
    this._revealDom = null;
    this._lastFocus = null;
  }
}
