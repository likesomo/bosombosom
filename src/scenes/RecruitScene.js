import { state } from '../state/gameState.js';
import { W, H, T, txt, goTo, enterScene, stageBackground, FONT } from '../ui/common.js';
import { sfx } from '../ui/sfx.js';
import { playFx } from '../ui/fx.js';
import { mascotTexture } from '../ui/crowd.js';

// After the title: Bosombosom gets to pick teammates first (≈7.5 s).
// Candidate cards (crowd.json) fan out → open-call "?" card glows → genre tag roulette → "next teammate?" → credits.
export class RecruitScene extends Phaser.Scene {
  constructor() { super('RecruitScene'); }

  create() {
    enterScene(this, 'Recruit');
    const D = state.data;
    const C = D.crowd || { members: [], groups: {}, genres: [] };
    stageBackground(this, 'arena');
    this.add.rectangle(0, 0, W, H, 0x0d0a1c, 0.78).setOrigin(0, 0).setDepth(-5);
    const title = txt(this, W / 2, 70, T('recruitTitle', '이제 우리가 동료를 뽑을 차례!'), { size: 44, color: '#ffd27a', depth: 20 });
    this.tweens.add({ targets: title, scale: { from: 1.6, to: 1 }, duration: 300, ease: 'Back.easeOut' });
    sfx('fanfare');

    // candidate cards: two groups, one row each
    const groups = Object.values(C.groups || {});
    groups.forEach((g, gi) => {
      const members = C.members.filter((m) => m.groupId === g.id);
      const y = 190 + gi * 150;
      txt(this, 70, y - 76, g.label, { size: 20, color: g.color || '#ffffff', origin: 0, depth: 20 });
      const step = Math.min(105, 860 / Math.max(1, members.length - 1));
      members.forEach((m, i) => {
        const x = 110 + i * step;
        this.card(x, y, m, C.members.indexOf(m), g.color, 150 + (gi * 9 + i) * 45);
      });
    });

    // open call "?" card
    const openX = W - 150; const openY = 265;
    const og = this.add.graphics().setDepth(10);
    og.fillStyle(0x2a2350, 1).fillRoundedRect(openX - 90, openY - 120, 180, 240, 18);
    og.lineStyle(5, 0xffd27a, 1).strokeRoundedRect(openX - 90, openY - 120, 180, 240, 18);
    const q = txt(this, openX, openY - 15, '?', { size: 100, color: '#ffd27a', depth: 11 });
    txt(this, openX, openY + 80, `${T('recruitOpenCall', '일반 모집')} ×${C.openSlots || 0}`, { size: 22, color: '#ffffff', depth: 11 });
    [og, q].forEach((o) => o.setAlpha(0));
    this.tweens.add({ targets: [og, q], alpha: 1, delay: 900, duration: 250, onComplete: () => this.tweens.add({ targets: [og, q], alpha: 0.45, duration: 600, yoyo: true, repeat: -1 }) });

    // genre roulette
    const genres = C.genres?.length ? C.genres : ['?'];
    txt(this, W / 2, 470, T('recruitGenreTitle', '함께 만들 게임은…?'), { size: 28, color: '#ffffff', depth: 20 });
    const box = this.add.graphics().setDepth(19);
    box.fillStyle(0xfff4e6, 1).fillRoundedRect(W / 2 - 170, 500, 340, 70, 16).lineStyle(4, 0xff9a4a, 1).strokeRoundedRect(W / 2 - 170, 500, 340, 70, 16);
    const tag = this.add.text(W / 2, 535, genres[0], { fontFamily: FONT, fontSize: '34px', fontStyle: 'bold', color: '#1c1636' }).setOrigin(0.5).setDepth(20);
    let k = 0; let delay = 70;
    const target = Math.floor(Math.random() * genres.length);
    const spin = () => {
      k += 1;
      tag.setText(genres[k % genres.length]);
      sfx('tick');
      delay *= 1.18;
      if (delay < 380 || k % genres.length !== target) this.time.delayedCall(delay, spin);
      else {
        sfx('select');
        this.tweens.add({ targets: tag, scale: 1.25, duration: 160, yoyo: true });
        playFx(this, 'explosions_firework-burst', W / 2, 520, { scale: 1.4, depth: 21 });
      }
    };
    this.time.delayedCall(1500, spin);

    this.time.delayedCall(4600, () => {
      const last = txt(this, W / 2, 640, T('recruitLast', '다음 동료는 바로 당신?'), { size: 46, color: '#ffe9d6', depth: 30 });
      this.tweens.add({ targets: last, scale: { from: 0.5, to: 1 }, duration: 300, ease: 'Back.easeOut' });
      sfx('fanfare');
    });
    this.time.delayedCall(7500, () => this.next());
    this.input.on('pointerdown', () => this.next());
    this.input.keyboard.on('keydown-ENTER', () => this.next());
  }

  card(x, y, m, index, color, delay) {
    const g = this.add.graphics().setDepth(10);
    const col = Phaser.Display.Color.HexStringToColor(color || '#ffffff').color;
    g.fillStyle(0x1c1636, 0.95).fillRoundedRect(-48, -56, 96, 112, 12).lineStyle(3, col, 1).strokeRoundedRect(-48, -56, 96, 112, 12);
    const img = this.add.image(0, 8, mascotTexture(this, m, index)).setOrigin(0.5, 0.9).setScale(1.05);
    const name = this.add.text(0, 30, m.name, { fontFamily: FONT, fontSize: m.name.length > 4 ? '13px' : '16px', fontStyle: 'bold', color: '#ffffff' }).setOrigin(0.5);
    const c = this.add.container(x, y + 60, [g, img, name]).setDepth(10).setAlpha(0);
    this.tweens.add({ targets: c, y, alpha: 1, delay, duration: 220, ease: 'Back.easeOut' });
    this.tweens.add({ targets: img, y: 2, delay: delay + 300, duration: 300 + (index % 4) * 60, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  }

  next() {
    if (this.__leaving) return;
    goTo(this, 'EndingScene', {}, 400);
  }
}
