'use strict';

class BootScene extends Phaser.Scene {
  constructor() { super({ key: 'BootScene' }); }

  preload() {
    // Backgrounds — fal.ai recraft v3 digital illustrations (1820×1024)
    this.load.image('hub_chamber',    'assets/images/hub_chamber.webp');
    this.load.image('chamber_l1',     'assets/images/chamber_l1.webp');
    this.load.image('chamber_l2',     'assets/images/chamber_l2.webp');
    this.load.image('chamber_l3',     'assets/images/chamber_l3.webp');
    this.load.image('vault_locked',   'assets/images/vault_locked.webp');
    this.load.image('vault_unlocked', 'assets/images/vault_unlocked.webp');

    // Pod badges — Retro Diffusion pixel art, mapped to BADGE_OPTIONS index
    this.load.image('badge_0', 'assets/images/sprites/badge_scalpel.png');
    this.load.image('badge_1', 'assets/images/sprites/badge_syringe.png');
    this.load.image('badge_2', 'assets/images/sprites/badge_microscope.png');
    this.load.image('badge_3', 'assets/images/sprites/badge_clipboard.png');

    // Evidence cards — referenced by lesson scenes for reward/dossier display
    this.load.image('evidence_premise',         'assets/images/sprites/evidence_premise_card.png');
    this.load.image('evidence_conclusion',      'assets/images/sprites/evidence_conclusion_card.png');
    this.load.image('evidence_valid_seal',      'assets/images/sprites/evidence_valid_seal.png');
    this.load.image('evidence_counterexample',  'assets/images/sprites/evidence_counterexample_card.png');
    this.load.image('evidence_newspaper',       'assets/images/sprites/evidence_newspaper_clipping.png');
    this.load.image('evidence_rebuild',         'assets/images/sprites/evidence_rebuild_card.png');

    // Status stamps — used by lesson scenes for VALID/INVALID/SOUND/UNSOUND/COGENT verdicts
    this.load.image('stamp_valid',   'assets/images/sprites/stamp_valid.png');
    this.load.image('stamp_invalid', 'assets/images/sprites/stamp_invalid.png');
    this.load.image('stamp_sound',   'assets/images/sprites/stamp_sound.png');
    this.load.image('stamp_unsound', 'assets/images/sprites/stamp_unsound.png');
    this.load.image('stamp_cogent',  'assets/images/sprites/stamp_cogent.png');

    // Argument-patient variants — atmospheric illustration per lesson
    this.load.image('argument_patient_l1', 'assets/images/sprites/argument_patient_l1.png');
    this.load.image('argument_patient_l2', 'assets/images/sprites/argument_patient_l2.png');
    this.load.image('argument_patient_l3', 'assets/images/sprites/argument_patient_l3.png');

    // Loader gracefully degrades: missing files emit a warning but don't crash.
    // Generic evidence_card fallback (used by hub.js dossier slots).
    this._makePlaceholders();
  }

  _makePlaceholders() {
    // Real art (badges, evidence, stamps, argument_patients, backgrounds) is
    // loaded above. Only generate the generic 'evidence_card' fallback used
    // by the hub dossier slots — no key collision because nothing else loads
    // that key as an image.
    const g = this.make.graphics({ add: false });

    g.fillStyle(0xE8E3D0);
    g.fillRect(0, 0, 100, 140);
    g.lineStyle(2, 0xC8B68A);
    g.strokeRect(0, 0, 100, 140);
    g.generateTexture('evidence_card', 100, 140);

    g.destroy();
  }

  create() {
    // Fix 3: block file:// execution with a DOM error panel
    if (window.location.protocol === 'file:') {
      const overlay = document.createElement('div');
      overlay.setAttribute('role', 'alertdialog');
      overlay.setAttribute('aria-modal', 'true');
      overlay.setAttribute('aria-label', 'Server required');
      overlay.style.cssText = `
        position: fixed; inset: 0; z-index: 99999;
        background: rgba(10,10,18,0.93);
        display: flex; align-items: center; justify-content: center;
      `;

      const panel = document.createElement('div');
      panel.tabIndex = -1;
      panel.style.cssText = `
        background: #1A1A24;
        border: 2px solid #C8B68A;
        border-radius: 8px;
        padding: 48px 56px;
        max-width: 680px;
        font-family: "Special Elite", monospace;
        color: #E8E3D0;
        text-align: center;
        box-shadow: 0 8px 40px rgba(0,0,0,0.8);
      `;
      panel.innerHTML = `
        <div style="font-size:36px; margin-bottom:16px;">&#9888;</div>
        <h1 style="font-family:'Archivo Black',sans-serif; font-size:22px;
                   color:#C8B68A; letter-spacing:3px; margin:0 0 20px;">
          This game must be served from a web server.
        </h1>
        <p style="font-size:17px; line-height:1.7; margin:0 0 20px;">
          Open a terminal in the <strong>Tribunal game</strong> folder and run:
        </p>
        <code style="display:block; background:#0A0A12; color:#C8B68A;
                     font-family:monospace; font-size:18px; padding:12px 24px;
                     border-radius:4px; margin-bottom:20px; letter-spacing:1px;">
          python -m http.server 8770
        </code>
        <p style="font-size:17px; line-height:1.7; margin:0;">
          Then open <a href="http://localhost:8770/" target="_blank"
            style="color:#C8B68A;">http://localhost:8770/</a> in Chrome.
        </p>
      `;
      overlay.appendChild(panel);
      document.body.appendChild(overlay);
      // Move focus into the panel for keyboard accessibility
      panel.focus();
      return; // Do NOT proceed to scene transition
    }

    // Import from URL hash (cross-device restore)
    const hashState = StateManager.importFromHash();
    const next = hashState ? 'HubScene' : 'PodLoginScene';
    const data = hashState ? { podCode: hashState.podCode, state: hashState } : undefined;
    if (hashState) { StateManager.save(hashState); StateManager.clearHash(); }
    // Defer to next tick so Phaser's scene system has time to clean up
    // BootScene before activating the next one (some preview iframes hang
    // when scene.start fires immediately from within create()).
    this.time.delayedCall(0, () => {
      this.scene.stop('BootScene');
      this.scene.start(next, data);
    });
  }
}
