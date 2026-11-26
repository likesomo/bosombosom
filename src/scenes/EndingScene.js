import { state } from '../state/gameState.js';
import { W, H, T, txt, enterScene, stageBackground, FONT, setGrey } from '../ui/common.js';
import { sfx } from '../ui/sfx.js';
import { playFx } from '../ui/fx.js';

// ① trophy regains color ② 4-day dev log credits ③ "next teammate?" empty slot (stays).
export class EndingScene extends Phaser.Scene {
  constructor() { super('EndingScene'); }

  create() {
    enterScene(this, 'Ending');
    this.stage = 0;
    this.st = stageBackground(this, 'arena');
    this.layer1 = this.add.container(0, 0);
    this.championPhase();
    this.input.on('pointerdown', () => this.advance());
    this.input.keyboard.on('keydown-ENTER', () => this.advance());
  }

  championPhase() {
    const st = this.st;
    const D = state.data;
    const tx = W / 2; const ty = st.floorY - 38;
    const glow = playFx(this, 'holy_sunburst', tx, ty - 70, { scale: 3.2, loop: true, depth: 4, alpha: 0 });
    const trophy = this.add.image(tx, ty, 'obj_trophy').setOrigin(0.5, 0.92).setScale(0.26).setDepth(5);
    setGrey(trophy, true);
    const bo = this.add.image(tx - 190, st.floorY + 6, 'bosomi').setOrigin(0.5, 0.94).setScale(0.375).setDepth(6);

    this.time.delayedCall(500, () => {
      sfx('fanfare');
      this.cameras.main.flash(300, 255, 245, 200);
      setGrey(trophy, false);
      if (glow) this.tweens.add({ targets: glow, alpha: 0.9, duration: 400 });
      this.tweens.add({ targets: trophy, scale: 0.32, duration: 300, yoyo: true, ease: 'Back.easeOut' });
      playFx(this, 'ui_confetti', W / 2 - 300, 360, { scale: 3.2, depth: 40 });
      playFx(this, 'ui_confetti', W / 2 + 300, 360, { scale: 3.2, depth: 40, flipX: true });
      playFx(this, 'explosions_firework-burst', W / 2, 200, { scale: 2, depth: 39 });
      this.tweens.add({ targets: bo, y: bo.y - 90, duration: 280, yoyo: true, repeat: 3, ease: 'Quad.easeOut' });
      const t = txt(this, W / 2, 140, T('endingChampion', 'CHAMPION!'), { size: 96, color: '#ffd27a', strokeThickness: 12, depth: 50 });
      t.setShadow(0, 6, '#ff9a4a', 0, true, true);
      this.tweens.add({ targets: t, scale: { from: 2, to: 1 }, duration: 400, ease: 'Back.easeOut' });
      txt(this, W / 2, 225, T('endingChampionSub', ''), { size: 30, color: '#ffffff', depth: 50 });
    });

    const cheer = state.cheerers.length ? state.cheerers : D.bracket.matches.map((m) => D.teams[m.opponentTeamId].characterId);
    cheer.forEach((cid, i) => {
      const def = D.characters[cid]; if (!def) return;
      const x = tx + 200 + i * 130;
      const s = this.add.image(x, -150, def.image).setOrigin(0.5, 0.94).setScale(0.3).setFlipX(true).setDepth(6);
      this.tweens.add({ targets: s, y: st.floorY + 6, delay: 900 + i * 220, duration: 450, ease: 'Bounce.easeOut', onComplete: () => {
        this.tweens.add({ targets: s, y: s.y - 30, duration: 300 + i * 40, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      } });
    });
    this.phaseTimer = this.time.delayedCall(5200, () => this.advance());
  }

  advance() {
    if (this.stage === 0) { this.stage = 1; this.phaseTimer?.remove(); this.creditsPhase(); }
    else if (this.stage === 1) { this.stage = 2; this.phaseTimer?.remove(); this.lastPhase(); }
  }

  creditsPhase() {
    sfx('select');
    const shade = this.add.rectangle(0, 0, W, H, 0x0d0a1c, 0).setOrigin(0, 0).setDepth(100);
    this.tweens.add({ targets: shade, fillAlpha: 0.85, duration: 500 });
    const c = this.add.container(0, H + 20).setDepth(101);
    c.add(this.add.text(W / 2, 0, T('endingCreditsTitle', ''), { fontFamily: FONT, fontSize: '44px', fontStyle: 'bold', color: '#ffd27a' }).setOrigin(0.5));
    (T('endingCredits', []) || []).forEach((line, i) => {
      c.add(this.add.text(W / 2, 90 + i * 52, line, { fontFamily: FONT, fontSize: '28px', color: '#ffffff' }).setOrigin(0.5));
    });
    this.tweens.add({ targets: c, y: 120, duration: 2600, ease: 'Cubic.easeOut' });
    this.credits = [shade, c];
    this.phaseTimer = this.time.delayedCall(8500, () => this.advance());
  }

  lastPhase() {
    (this.credits || []).forEach((o) => o.destroy());
    sfx('fanfare');
    this.add.rectangle(0, 0, W, H, 0x0d0a1c, 0.9).setOrigin(0, 0).setDepth(200);
    txt(this, W / 2, 190, T('endingLast', ''), { size: 54, color: '#ffe9d6', depth: 201 });
    const D = state.data;
    const team = [D.characters.bosomi, ...(state.cheerers.length ? state.cheerers : D.bracket.matches.map((m) => D.teams[m.opponentTeamId].characterId)).map((id) => D.characters[id])];
    const n = team.length + 1;
    team.forEach((def, i) => {
      const x = W / 2 + (i - (n - 1) / 2) * 190;
      const g = this.add.graphics().setDepth(201);
      g.fillStyle(0x1c1636, 1).fillRoundedRect(x - 80, 300, 160, 190, 18).lineStyle(3, 0x4b3f7a).strokeRoundedRect(x - 80, 300, 160, 190, 18);
      this.add.image(x, 470, def.image).setOrigin(0.5, 0.94).setScale(def.id === 'bosomi' ? 0.3 : 0.28).setDepth(202);
    });
    const x = W / 2 + (n - 1 - (n - 1) / 2) * 190;
    const slot = this.add.graphics().setDepth(201);
    slot.fillStyle(0x2a2350, 1).fillRoundedRect(x - 80, 300, 160, 190, 18);
    slot.lineStyle(5, 0xffd27a, 1).strokeRoundedRect(x - 80, 300, 160, 190, 18);
    const q = txt(this, x, 395, '?', { size: 96, color: '#ffd27a', depth: 202 });
    this.tweens.add({ targets: [slot, q], alpha: 0.35, duration: 650, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    const sun = playFx(this, 'holy_sunburst', x, 395, { scale: 2.2, loop: true, depth: 200, alpha: 0.7 });
    void sun;
    txt(this, W - 30, H - 30, T('endingHint', ''), { size: 18, color: '#6e6596', origin: 1, depth: 202 });
  }
}
