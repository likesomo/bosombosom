import { state } from '../state/gameState.js';
import { W, H, T, txt, goTo, enterScene, stageBackground, FONT, setGrey } from '../ui/common.js';
import { sfx } from '../ui/sfx.js';
import { playFx, playScreenFx } from '../ui/fx.js';
import { textureFor } from '../ui/characterView.js';
import { Crowd } from '../ui/crowd.js';

// Short hook story before the bracket (≈9 s, click/Enter = next panel, Esc/S = skip all).
// Panel text lives in texts.json "intro"; each panel id picks one visual below.
const PANEL_MS = 2300;

export class IntroScene extends Phaser.Scene {
  constructor() { super('IntroScene'); }

  create() {
    enterScene(this, 'Intro');
    stageBackground(this, 'arena');
    this.add.rectangle(0, 0, W, H, 0x0d0a1c, 0.6).setOrigin(0, 0).setDepth(-5);
    this.panels = T('intro', []) || [];
    this.layer = null;
    this.index = -1;
    this.skipHint = txt(this, W - 20, H - 24, T('introSkip', '클릭: 다음 · Esc: 건너뛰기'), { size: 16, color: '#8c86ad', origin: 1, depth: 50 });
    this.input.on('pointerdown', () => this.nextPanel());
    this.input.keyboard.on('keydown-ENTER', () => this.nextPanel());
    this.input.keyboard.on('keydown-SPACE', () => this.nextPanel());
    this.input.keyboard.on('keydown-ESC', () => this.finish());
    this.input.keyboard.on('keydown-S', () => this.finish());
    if (!this.panels.length) { this.finish(); return; }
    this.nextPanel();
  }

  nextPanel() {
    if (this.__leaving) return;
    this.timer?.remove();
    this.index += 1;
    if (this.index >= this.panels.length) { this.finish(); return; }
    const old = this.layer;
    if (old) this.tweens.add({ targets: old, alpha: 0, duration: 150, onComplete: () => old.destroy() });
    const p = this.panels[this.index];
    this.layer = this.add.container(0, 0).setDepth(10);
    this.layer.setAlpha(0);
    this.tweens.add({ targets: this.layer, alpha: 1, duration: 180 });
    (this[`panel_${p.id}`] || this.panel_text).call(this, this.layer);
    (p.lines || []).forEach((line, i) => {
      const t = txt(this, W / 2, 520 + i * 52, line, { size: i === (p.lines.length - 1) ? 40 : 32, color: i === (p.lines.length - 1) ? '#ffd27a' : '#ffffff', depth: 20 });
      t.setAlpha(0);
      this.layer.add(t);
      this.tweens.add({ targets: t, alpha: 1, y: t.y - 8, delay: 120 + i * 260, duration: 220 });
    });
    this.timer = this.time.delayedCall(p.ms || PANEL_MS, () => this.nextPanel());
  }

  finish() {
    if (this.__leaving) return;
    this.timer?.remove();
    goTo(this, 'BracketScene', {}, 300);
  }

  panel_text() {}

  // ① eight team captains gather
  panel_study(layer) {
    const D = state.data;
    const ids = (D.bracket.quarterfinals || []).flatMap((q) => q.teamIds);
    ids.forEach((id, i) => {
      const t = D.teams[id];
      const def = t && D.characters[t.characterId];
      if (!def) return;
      const x = 160 + i * 137;
      const img = this.add.image(x, 400, textureFor(this, def)).setOrigin(0.5, 0.94).setScale(130 / 512).setFlipX(i >= 4).setAlpha(0);
      const name = this.add.text(x, 412, t.name, { fontFamily: FONT, fontSize: t.name.length > 6 ? '12px' : '15px', fontStyle: 'bold', color: t.isPlayer ? '#ffd27a' : '#ffffff', stroke: '#1c1636', strokeThickness: 4 }).setOrigin(0.5, 0).setAlpha(0);
      layer.add([img, name]);
      this.tweens.add({ targets: [img, name], alpha: 1, delay: i * 70, duration: 160 });
      this.tweens.add({ targets: img, y: 384, delay: i * 70, duration: 160, yoyo: true, ease: 'Quad.easeOut' });
    });
    sfx('select');
  }

  // ② the prize: trophy + first-pick right; draft candidates watch from the stands
  panel_prize(layer) {
    const trophy = this.add.image(W / 2, 400, 'obj_trophy').setOrigin(0.5, 0.92).setScale(0.22);
    const glow = playFx(this, 'holy_sunburst', W / 2, 330, { scale: 2.4, loop: true, depth: 9, alpha: 0.8 });
    layer.add(trophy);
    if (glow) { layer.add(glow); }
    this.tweens.add({ targets: trophy, scale: 0.25, duration: 300, yoyo: true, ease: 'Back.easeOut' });
    const crowdLayer = this.add.container(0, 0);
    layer.add(crowdLayer);
    const crowd = new Crowd(this, state.data.crowd, { rows: [{ y: 90, x0: 220, x1: 1060 }, { y: 160, x0: 220, x1: 1060 }], scale: 0.85, depth: 11 });
    crowd.people.forEach((p) => crowdLayer.add([p.img, p.tag]));
    this.time.delayedCall(500, () => crowd.cheer('medium'));
    sfx('fanfare');
  }

  // ③ noise steals the trophy's color
  panel_noise(layer) {
    const trophy = this.add.image(W / 2, 400, 'obj_trophy').setOrigin(0.5, 0.92).setScale(0.22);
    layer.add(trophy);
    this.time.delayedCall(350, () => {
      sfx('glitch');
      playScreenFx(this, 'transitions_glitch-wipe', { speed: 2.2, tint: 0xaaaaaa, depth: 15 });
      setGrey(trophy, true);
      this.tweens.add({ targets: trophy, x: W / 2 + 8, duration: 40, yoyo: true, repeat: 8 });
      this.cameras.main.shake(260, 0.01);
    });
  }

  // ④ Bosomi steps up
  panel_go(layer) {
    const def = state.data.characters.bosomi;
    const bo = this.add.image(W / 2, 470, textureFor(this, def)).setOrigin(0.5, 0.94).setScale(0.1);
    layer.add(bo);
    this.tweens.add({ targets: bo, scale: 0.5, duration: 320, ease: 'Back.easeOut' });
    // thorns grow from the pivot toward +x (flipX: toward -x): start at the body edges on the floor line and grow outward, behind Bosomi
    [[-110, true], [110, false]].forEach(([dx, flipX]) => {
      const th = playFx(this, 'nature_thorns', W / 2 + dx, 470, { scale: 2, flipX });
      if (th) layer.addAt(th, 0);
    });
    this.cameras.main.flash(160, 255, 240, 220);
    sfx('fight');
  }
}
