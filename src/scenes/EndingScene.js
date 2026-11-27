import { state } from '../state/gameState.js';
import { W, H, T, txt, enterScene, stageBackground, FONT, setGrey } from '../ui/common.js';
import { sfx } from '../ui/sfx.js';
import { playFx } from '../ui/fx.js';

// ① 4-day dev log credits ② "next teammate?" empty slot (stays). Champion moment: ChampionScene.
export class EndingScene extends Phaser.Scene {
  constructor() { super('EndingScene'); }

  create() {
    enterScene(this, 'Ending');
    this.stage = 1;
    this.st = stageBackground(this, 'arena');
    this.creditsPhase();          // the champion moment now lives in ChampionScene
    this.input.on('pointerdown', () => this.advance());
    this.input.keyboard.on('keydown-ENTER', () => this.advance());
  }

  advance() {
    if (this.stage === 1) { this.stage = 2; this.phaseTimer?.remove(); this.lastPhase(); }
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
    // our team so far: Bosomi + empty slots for the teammates we are about to pick (beaten rivals are not recruited)
    const empty = T('endingEmptySlots', 3);
    const n = 1 + empty;
    for (let i = 0; i < n; i++) {
      const x = W / 2 + (i - (n - 1) / 2) * 190;
      const g = this.add.graphics().setDepth(201);
      if (i === 0) {
        g.fillStyle(0x1c1636, 1).fillRoundedRect(x - 80, 300, 160, 190, 18).lineStyle(3, 0x4b3f7a).strokeRoundedRect(x - 80, 300, 160, 190, 18);
        this.add.image(x, 470, D.characters.bosomi.image).setOrigin(0.5, 0.94).setScale(0.3).setDepth(202);
        continue;
      }
      g.fillStyle(0x2a2350, 1).fillRoundedRect(x - 80, 300, 160, 190, 18);
      g.lineStyle(5, 0xffd27a, 1).strokeRoundedRect(x - 80, 300, 160, 190, 18);
      const q = txt(this, x, 395, '?', { size: 96, color: '#ffd27a', depth: 202 });
      this.tweens.add({ targets: [g, q], alpha: 0.35, duration: 650, yoyo: true, repeat: -1, ease: 'Sine.easeInOut', delay: i * 200 });
      playFx(this, 'holy_sunburst', x, 395, { scale: 1.8, loop: true, depth: 200, alpha: 0.6 });
    }
    txt(this, W - 30, H - 30, T('endingHint', ''), { size: 18, color: '#6e6596', origin: 1, depth: 202 });
  }
}
