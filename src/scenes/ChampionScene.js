import { state } from '../state/gameState.js';
import { W, H, T, txt, goTo, enterScene, stageBackground, setGrey } from '../ui/common.js';
import { sfx } from '../ui/sfx.js';
import { playFx } from '../ui/fx.js';
import { textureFor } from '../ui/characterView.js';
import { Crowd } from '../ui/crowd.js';

// Champion coronation (≈5.5 s): trophy regains its color, the other 7 teams applaud,
// the draft candidates in the stands cheer "역시 챔피언은 보솜보솜!". Click/Enter → next.
export class ChampionScene extends Phaser.Scene {
  constructor() { super('ChampionScene'); }

  create() {
    enterScene(this, 'Champion');
    const D = state.data;
    const st = stageBackground(this, 'arena');
    const floor = Math.min(st.floorY, 610);
    const tx = W / 2; const ty = floor - 40;

    this.crowd = new Crowd(this, D.crowd, { rows: [{ y: 78, x0: 120, x1: 1160 }], scale: 0.85, bubbleY: 118 });

    const glow = playFx(this, 'holy_sunburst', tx, ty - 80, { scale: 3.2, loop: true, depth: 4, alpha: 0 });
    const trophy = this.add.image(tx, ty, 'obj_trophy').setOrigin(0.5, 0.92).setScale(0.26).setDepth(5);
    setGrey(trophy, true);
    const bo = this.add.image(tx - 170, floor + 6, textureFor(this, D.characters.bosomi)).setOrigin(0.5, 0.94).setScale(0.34).setDepth(6);

    // the other teams line up on both sides and applaud
    const others = (D.bracket.quarterfinals || []).flatMap((q) => q.teamIds).filter((id) => !D.teams[id]?.isPlayer);
    others.forEach((id, i) => {
      const def = D.characters[D.teams[id]?.characterId];
      if (!def) return;
      const left = i % 2 === 0;
      const k = Math.floor(i / 2);
      const x = left ? 90 + k * 95 : W - 90 - k * 95;
      const y = floor + 40 + (k % 2) * 18;
      const s = this.add.image(x, H + 160, textureFor(this, def)).setOrigin(0.5, 0.94).setScale(0.2).setFlipX(!left).setDepth(7 + k);
      this.tweens.add({
        targets: s, y, delay: 600 + i * 90, duration: 380, ease: 'Back.easeOut',
        onComplete: () => this.tweens.add({ targets: s, y: y - 14, duration: 220 + (i % 3) * 40, yoyo: true, repeat: -1, ease: 'Quad.easeOut' }),
      });
    });

    this.time.delayedCall(450, () => {
      sfx('fanfare');
      this.cameras.main.flash(300, 255, 245, 200);
      setGrey(trophy, false);
      if (glow) this.tweens.add({ targets: glow, alpha: 0.9, duration: 400 });
      this.tweens.add({ targets: trophy, scale: 0.32, duration: 300, yoyo: true, ease: 'Back.easeOut' });
      playFx(this, 'ui_confetti', W / 2 - 300, 330, { scale: 3.2, depth: 40 });
      playFx(this, 'ui_confetti', W / 2 + 300, 330, { scale: 3.2, depth: 40, flipX: true });
      playFx(this, 'explosions_firework-burst', W / 2, 260, { scale: 2, depth: 39 });
      this.tweens.add({ targets: bo, y: bo.y - 80, duration: 260, yoyo: true, repeat: 3, ease: 'Quad.easeOut' });
      const t = txt(this, W / 2, 200, T('endingChampion', 'CHAMPION!'), { size: 92, color: '#ffd27a', strokeThickness: 12, depth: 50 });
      t.setShadow(0, 6, '#ff9a4a', 0, true, true);
      this.tweens.add({ targets: t, scale: { from: 2, to: 1 }, duration: 400, ease: 'Back.easeOut' });
      txt(this, W / 2, 275, T('endingChampionSub', ''), { size: 28, color: '#ffffff', depth: 50 });
      this.crowd.cheer('big', false);
    });
    // the crowd's big line
    this.time.delayedCall(1700, () => {
      const msg = T('championCrowdLine', '역시 챔피언은 보솜보솜!');
      const line = txt(this, W / 2, 345, msg, { size: 40, color: '#1c1636', stroke: '#fff4e6', strokeThickness: 10, depth: 60 });
      this.tweens.add({ targets: line, scale: { from: 0.4, to: 1 }, duration: 260, ease: 'Back.easeOut' });
      this.crowd.cheer('big', false);
      sfx('select');
    });
    this.time.delayedCall(5500, () => this.next());
    this.input.on('pointerdown', () => this.next());
    this.input.keyboard.on('keydown-ENTER', () => this.next());
  }

  next() {
    if (this.__leaving) return;
    const target = this.scene.manager.keys.RecruitScene ? 'RecruitScene' : 'EndingScene';
    goTo(this, target, {}, 400);
  }
}
