import { state } from '../state/gameState.js';
import { W, H, T, txt, goTo, enterScene, stageBackground, FONT } from '../ui/common.js';
import { sfx } from '../ui/sfx.js';
import { playFx } from '../ui/fx.js';
import { Crowd } from '../ui/crowd.js';

// After a win (quarter/semi): friendly greeting with the beaten rival → the draft candidates in the stands cheer.
// (The beaten rival no longer joins a cheer squad: CLAUDE.md 3절, 2026-11-27.)
export class CheerScene extends Phaser.Scene {
  constructor() { super('CheerScene'); }

  init(data) { this.mi = data.matchIndex ?? state.matchIndex; this.teamId = data.opponentTeamId; }

  create() {
    const D = state.data;
    const match = D.bracket.matches[this.mi];
    const team = D.teams[this.teamId || match.opponentTeamId];
    const def = D.characters[team.characterId];
    enterScene(this, `Cheer ${team.name}`);
    const st = stageBackground(this, match.stageId);
    this.add.rectangle(0, 0, W, H, 0x0d0a1c, 0.5).setOrigin(0, 0).setDepth(-5);

    // stands: draft candidates across the top
    this.crowd = new Crowd(this, D.crowd, {
      rows: [{ y: 92, x0: 250, x1: 1030 }, { y: 162, x0: 250, x1: 1030 }],
      scale: 0.9,
      bubbleY: 205,
    });
    const title = txt(this, W / 2, 664, T('cheerTitle', '좋은 승부였어!'), { size: 46, color: '#ffd27a', depth: 20 }).setAlpha(0);

    const floor = Math.min(st.floorY, 600);
    const bo = this.add.image(-120, floor, 'bosomi').setOrigin(0.5, 0.94).setScale(0.32).setDepth(10);
    const r = this.add.image(W + 120, floor, def.image).setOrigin(0.5, 0.94).setScale(def.scale * 0.85).setFlipX(true).setDepth(10);

    this.tweens.add({ targets: bo, x: 500, duration: 450, ease: 'Quad.easeOut' });
    this.tweens.add({
      targets: r, x: 780, duration: 450, ease: 'Quad.easeOut',
      onComplete: () => {
        // handshake bump
        this.tweens.add({ targets: bo, x: 560, duration: 140, yoyo: true, ease: 'Quad.easeOut' });
        this.tweens.add({
          targets: r, x: 720, duration: 140, yoyo: true, ease: 'Quad.easeOut',
          onYoyo: () => {
            sfx('select');
            playFx(this, 'holy_sunburst', 640, floor - 110, { scale: 1.4, depth: 12 });
            this.tweens.add({ targets: title, alpha: 1, duration: 200 });
            this.bubble(780, floor - 215, T('cheerLines', {})[team.id] || '좋은 승부였어!');
          },
        });
      },
    });
    this.time.delayedCall(1300, () => {
      sfx('fanfare');
      this.crowd.cheer('big');
      playFx(this, 'ui_confetti', W / 2, 150, { scale: 3, depth: 30 });
    });
    this.time.delayedCall(3600, () => this.next());

    this.input.on('pointerdown', () => this.next());
    this.input.keyboard.on('keydown-ENTER', () => this.next());
  }

  bubble(x, y, msg) {
    const t = this.add.text(x, y, msg, { fontFamily: FONT, fontSize: '24px', fontStyle: 'bold', color: '#1c1636', align: 'center', wordWrap: { width: 380, useAdvancedWrap: true } }).setOrigin(0.5).setDepth(31);
    const b = t.getBounds();
    const g = this.add.graphics().setDepth(30);
    g.fillStyle(0xfff4e6, 1).fillRoundedRect(b.x - 18, b.y - 12, b.width + 36, b.height + 24, 16);
    g.fillTriangle(x - 12, b.bottom + 11, x + 12, b.bottom + 11, x, b.bottom + 34);
    g.lineStyle(3, 0x1c1636, 1).strokeRoundedRect(b.x - 18, b.y - 12, b.width + 36, b.height + 24, 16);
    this.tweens.add({ targets: [t, g], scale: { from: 0.6, to: 1 }, duration: 220, ease: 'Back.easeOut' });
  }

  next() {
    if (this.__leaving) return;
    const D = state.data;
    // remember beaten rivals (they come back to celebrate in the ending)
    const cid = D.teams[this.teamId || D.bracket.matches[this.mi].opponentTeamId].characterId;
    if (!state.cheerers.includes(cid)) state.cheerers.push(cid);
    state.matchIndex = this.mi + 1;
    goTo(this, 'BracketScene', {}, 300);
  }
}
