import { state } from '../state/gameState.js';
import { W, H, T, txt, goTo, enterScene, FONT } from '../ui/common.js';
import { sfx } from '../ui/sfx.js';
import { playFx } from '../ui/fx.js';

const NODE_Y = [540, 400, 262]; // 8강, 4강, 결승 (bottom → top)

export class BracketScene extends Phaser.Scene {
  constructor() { super('BracketScene'); }

  create() {
    const D = state.data;
    this.mi = state.matchIndex;
    this.match = D.bracket.matches[this.mi];
    enterScene(this, `Bracket ${this.match?.label}`);
    if (this.textures.exists('bg_bracket')) this.add.image(0, 0, 'bg_bracket').setOrigin(0, 0).setDisplaySize(W, H);
    else this.add.rectangle(0, 0, W, H, 0x1c1636).setOrigin(0, 0);
    txt(this, W / 2, 128, T('bracketTitle', ''), { size: 34, color: '#ffd27a' });

    this.cards = {};
    D.bracket.leftTeamIds.forEach((id, i) => { this.cards[id] = this.teamCard(190, 210 + i * 98, id, 'left'); });
    D.bracket.rightTeamIds.forEach((id, i) => { this.cards[id] = this.teamCard(W - 190, 210 + i * 98, id, 'right'); });

    this.lines = this.add.graphics().setDepth(2);
    this.nodes = D.bracket.matches.map((m, i) => this.matchNode(W / 2, NODE_Y[i] ?? 540 - i * 140, m, i));
    this.drawLines();

    this.ready = false;
    this.hint = txt(this, W / 2, H - 52, '', { size: 24, color: '#ffffff' });
    const first = this.mi === 0 && !state.drawDone;
    if (first) this.roulette(); else this.revisit();

    this.input.on('pointerdown', () => this.enter());
    this.input.keyboard.on('keydown-ENTER', () => this.enter());
    this.input.keyboard.on('keydown-SPACE', () => this.enter());
  }

  teamCard(x, y, teamId, side) {
    const D = state.data;
    const t = D.teams[teamId];
    const c = this.add.container(x, y).setDepth(5);
    const isUs = !!t.isPlayer;
    const bg = this.add.graphics();
    const col = Phaser.Display.Color.HexStringToColor(t.color).color;
    bg.fillStyle(0x140f2a, 0.92).fillRoundedRect(-150, -38, 300, 76, 12);
    bg.lineStyle(isUs ? 4 : 2, isUs ? 0xffd27a : 0x4b3f7a, 1).strokeRoundedRect(-150, -38, 300, 76, 12);
    bg.fillStyle(col, 1).fillRect(side === 'left' ? -150 : 144, -38, 6, 76);
    const def = D.characters[t.characterId];
    const px = side === 'left' ? -105 : 105;
    const face = this.add.image(px, 30, this.textures.exists(def?.image) ? def.image : '__WHITE').setOrigin(0.5, 0.94).setScale(0.14).setFlipX(side === 'right');
    const name = this.add.text(side === 'left' ? -60 : 60, -12, t.name, { fontFamily: FONT, fontSize: t.name.length > 6 ? '17px' : '22px', fontStyle: 'bold', color: isUs ? '#ffd27a' : '#ffffff' }).setOrigin(side === 'left' ? 0 : 1, 0.5);
    const sub = this.add.text(side === 'left' ? -60 : 60, 16, `${t.captain} · ${t.seed}`, { fontFamily: FONT, fontSize: '15px', color: '#a99fd6' }).setOrigin(side === 'left' ? 0 : 1, 0.5);
    c.add([bg, face, name, sub]);
    if (state.cheerers.includes(t.characterId)) {
      const tag = this.add.text(side === 'left' ? 140 : -140, -30, '응원단', { fontFamily: FONT, fontSize: '14px', fontStyle: 'bold', color: '#1c1636', backgroundColor: '#ffb8dc', padding: { x: 6, y: 2 } }).setOrigin(side === 'left' ? 1 : 0, 0);
      c.add(tag);
      face.setTint(0xb8b0d8);
    }
    c.side = side;
    return c;
  }

  matchNode(x, y, m, i) {
    const D = state.data;
    const t = D.teams[m.opponentTeamId];
    const c = this.add.container(x, y).setDepth(6);
    const done = i < this.mi;
    const current = i === this.mi;
    const g = this.add.graphics();
    g.fillStyle(current ? 0x3a2f6e : 0x140f2a, 0.95).fillRoundedRect(-170, -40, 340, 80, 14);
    g.lineStyle(current ? 4 : 2, current ? 0xff9a4a : 0x4b3f7a, 1).strokeRoundedRect(-170, -40, 340, 80, 14);
    const label = this.add.text(0, -22, m.label, { fontFamily: FONT, fontSize: '20px', fontStyle: 'bold', color: '#ffd27a' }).setOrigin(0.5);
    const vs = this.add.text(0, 12, `보솜보솜  VS  ${i <= this.mi ? t.name : '?'}`, { fontFamily: FONT, fontSize: '22px', fontStyle: 'bold', color: '#ffffff' }).setOrigin(0.5);
    c.add([g, label, vs]);
    if (done) {
      const win = this.add.text(150, -34, 'WIN', { fontFamily: FONT, fontSize: '22px', fontStyle: 'bold', color: '#1c1636', backgroundColor: '#ffd27a', padding: { x: 8, y: 2 } }).setOrigin(0.5).setAngle(12);
      c.add(win);
    }
    if (current) {
      this.tweens.add({ targets: c, scale: 1.06, duration: 420, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      c.setSize(340, 80).setInteractive({ useHandCursor: true });
    }
    c.vsText = vs;
    return c;
  }

  drawLines() {
    const g = this.lines;
    g.clear();
    const us = this.cards.bosombosom;
    const n0 = this.nodes[0];
    g.lineStyle(4, 0xffd27a, 0.9);
    g.lineBetween(us.x + 150, us.y, n0.x - 170, n0.y);
    for (let i = 0; i < this.nodes.length - 1; i++) {
      const done = i < this.mi;
      g.lineStyle(done ? 6 : 3, done ? 0xffd27a : 0x4b3f7a, 1);
      g.lineBetween(this.nodes[i].x, this.nodes[i].y - 40, this.nodes[i + 1].x, this.nodes[i + 1].y + 40);
    }
    const last = this.nodes[this.nodes.length - 1];
    g.lineStyle(3, 0x4b3f7a, 1).lineBetween(last.x, last.y - 40, last.x, 165);
  }

  roulette() {
    const D = state.data;
    const ids = D.bracket.rouletteTeamIds;
    const targetId = this.match.opponentTeamId;
    this.hint.setText(T('bracketDraw', ''));
    let k = 0;
    let delay = 60;
    const hi = this.add.graphics().setDepth(7);
    const spin = () => {
      const id = ids[k % ids.length];
      const card = this.cards[id];
      hi.clear().lineStyle(6, 0xff9a4a, 1).strokeRoundedRect(card.x - 156, card.y - 44, 312, 88, 14);
      sfx('tick');
      k += 1;
      delay *= 1.13;
      if (delay < 320 || id !== targetId) this.time.delayedCall(delay, spin);
      else this.landOn(targetId, hi);
    };
    spin();
  }

  landOn(teamId, hi) {
    sfx('fight');
    const card = this.cards[teamId];
    this.cameras.main.shake(160, 0.006);
    playFx(this, 'explosions_firework-burst', card.x, card.y + 30, { scale: 1.4, depth: 30 });
    this.tweens.add({ targets: card, scale: 1.12, duration: 200, yoyo: true, repeat: 2 });
    this.nodes[this.mi].vsText.setText(`보솜보솜  VS  ${state.data.teams[teamId].name}`);
    this.time.delayedCall(700, () => { hi.destroy(); this.setReady(); });
  }

  revisit() {
    const isFinal = this.mi === state.data.bracket.matches.length - 1;
    const card = this.cards[this.match.opponentTeamId];
    sfx('select');
    if (this.mi > 0) playFx(this, 'ui_confetti', this.nodes[this.mi - 1].x, this.nodes[this.mi - 1].y, { scale: 2, depth: 30 });
    if (isFinal && card) {
      // foreshadow the noise possession
      this.time.delayedCall(400, () => {
        sfx('glitch');
        card.list.forEach((o) => o.setTint && o.setTint(0x8f8fa3));
        this.tweens.add({ targets: card, x: card.x + 6, duration: 40, yoyo: true, repeat: 8, onComplete: () => card.list.forEach((o) => o.clearTint && o.clearTint()) });
      });
      this.time.delayedCall(1400, () => this.setReady());
    } else this.time.delayedCall(700, () => this.setReady());
  }

  setReady() {
    state.drawDone = true;
    this.ready = true;
    this.hint.setText(T('bracketEnter', ''));
    this.tweens.add({ targets: this.hint, alpha: 0.4, duration: 500, yoyo: true, repeat: -1 });
    if (state.auto) this.time.delayedCall(500, () => this.enter());
  }

  enter() {
    if (!this.ready || this.__leaving) return;
    sfx('fight');
    goTo(this, 'BattleScene', { matchIndex: this.mi }, 300);
  }
}
