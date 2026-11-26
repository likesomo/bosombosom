import { state } from '../state/gameState.js';
import { W, H, T, txt, goTo, enterScene, stageBackground, FONT } from '../ui/common.js';
import { sfx } from '../ui/sfx.js';
import { playFx } from '../ui/fx.js';

// The beaten rival gets up and joins the cheer squad (replaces v1 recruit).
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
    this.add.rectangle(0, 0, W, H, 0x0d0a1c, 0.45).setOrigin(0, 0).setDepth(-5);
    txt(this, W / 2, 90, T('cheerTitle', '응원단 합류!'), { size: 54, color: '#ffb8dc', depth: 20 });

    // cheer slots (filled ones + the new one)
    const total = D.bracket.matches.length - 1;
    const slots = [];
    for (let i = 0; i < Math.max(total, 1); i++) {
      const x = W / 2 + (i - (total - 1) / 2) * 140;
      const g = this.add.graphics().setDepth(5);
      g.fillStyle(0x140f2a, 0.85).fillRoundedRect(x - 55, 140, 110, 110, 16);
      g.lineStyle(3, 0xffb8dc, 0.9).strokeRoundedRect(x - 55, 140, 110, 110, 16);
      slots.push({ x, y: 240 });
      const cid = state.cheerers[i];
      if (cid && D.characters[cid]) this.add.image(x, 240, D.characters[cid].image).setOrigin(0.5, 0.94).setScale(0.19).setDepth(6);
    }
    const slot = slots[Math.min(state.cheerers.length, slots.length - 1)];

    this.add.image(380, st.floorY, 'bosomi').setOrigin(0.5, 0.94).setScale(0.375).setDepth(10);
    const r = this.add.image(W + 120, st.floorY, def.image).setOrigin(0.5, 0.94).setScale(def.scale).setFlipX(true).setDepth(10);

    this.tweens.add({ targets: r, x: 820, duration: 700, ease: 'Quad.easeOut', onComplete: () => {
      sfx('select');
      this.bubble(820, st.floorY - 270, T('cheerLines', {})[team.id] || '응원할게!');
      this.time.delayedCall(1500, () => {
        sfx('jump');
        this.tweens.add({ targets: r, x: slot.x, y: slot.y, scale: 0.19, duration: 600, ease: 'Back.easeIn', onComplete: () => {
          sfx('fanfare');
          playFx(this, 'explosions_firework-burst', slot.x, slot.y - 20, { scale: 1.4, depth: 30 });
          this.time.delayedCall(800, () => this.next());
        } });
      });
    } });

    this.input.on('pointerdown', () => this.next());
    this.input.keyboard.on('keydown-ENTER', () => this.next());
  }

  bubble(x, y, msg) {
    const t = this.add.text(x, y, msg, { fontFamily: FONT, fontSize: '26px', fontStyle: 'bold', color: '#1c1636', align: 'center', wordWrap: { width: 380, useAdvancedWrap: true } }).setOrigin(0.5).setDepth(31);
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
    const cid = D.teams[this.teamId || D.bracket.matches[this.mi].opponentTeamId].characterId;
    if (!state.cheerers.includes(cid)) state.cheerers.push(cid);
    state.matchIndex = this.mi + 1;
    goTo(this, 'BracketScene', {}, 300);
  }
}
