import { state, reset } from '../state/gameState.js';
import { W, H, txt, goTo, enterScene } from '../ui/common.js';
import { DATA_FILES, buildData } from '../data/loadData.js';
import { loadFx, createFxAnims } from '../ui/fx.js';
import { initAudio } from '../ui/sfx.js';

const UI_IMAGES = {
  obj_trophy: 'assets/generated/ui/obj_trophy.png',
  ui_hp_frame: 'assets/generated/ui/ui_hp_frame.png',
  bg_bracket: 'assets/generated/backgrounds/bg_bracket.png',
};

export class LogoScene extends Phaser.Scene {
  constructor() { super('LogoScene'); }

  preload() {
    if (state.loaded) return;
    DATA_FILES.forEach((f) => this.load.json(`data_${f}`, `data/${f}.json`));
    this.load.on('loaderror', (file) => console.warn(`[load] failed: ${file.key} (${file.url}) — using fallback`));
  }

  create() {
    reset();
    enterScene(this, 'Logo');
    this.done = false;
    this.clicked = false;
    this.timerDone = false;

    const logo = txt(this, W / 2, H / 2 - 10, '보솜보솜', { size: 96, color: '#ffe9d6', stroke: '#2a2350', strokeThickness: 10 }).setAlpha(0);
    const sub = txt(this, W / 2, H / 2 + 70, 'BOSOMBOSOM', { size: 26, color: '#ffd27a' }).setAlpha(0);
    ['#ffd27a', '#7fd4ff', '#ffb8dc'].forEach((c, i) => {
      const s = this.add.star(W / 2 - 250 + i * 250, H / 2 - 110 + (i % 2) * 30, 4, 6, 18, Phaser.Display.Color.HexStringToColor(c).color).setAlpha(0);
      this.tweens.add({ targets: s, alpha: 1, angle: 90, duration: 500, delay: 200 + i * 120, yoyo: true, hold: 300 });
    });
    this.tweens.add({ targets: [logo, sub], alpha: 1, duration: 500, hold: 500, yoyo: true, onComplete: () => { this.timerDone = true; this.tryNext(); } });
    this.hint = txt(this, W / 2, H - 60, '', { size: 20, color: '#8f86b8' });

    this.input.on('pointerdown', () => this.onClick());
    this.input.keyboard.on('keydown', () => this.onClick());

    if (state.loaded) { this.loadedAll = true; return; }
    this.loadedAll = false;
    this.bar = this.add.rectangle(W / 2 - 200, H - 110, 0, 6, 0xffd27a).setOrigin(0, 0.5);

    const raw = {};
    DATA_FILES.forEach((f) => { raw[f] = this.cache.json.get(`data_${f}`); });
    state.data = buildData(raw);
    this.queueResources();
    this.load.on('progress', (v) => this.bar && this.bar.setSize(400 * v, 6));
    this.load.once('complete', () => this.onLoaded());
    this.load.start();
  }

  queueResources() {
    const D = state.data;
    const imgs = new Set();
    Object.values(D.characters).forEach((c) => [c.image, c.imageFluffy, c.imageArmored].forEach((k) => k && imgs.add(k)));
    imgs.forEach((k) => this.load.image(k, `assets/characters/${k}.png`));
    Object.values(D.stages).forEach((s) => this.load.image(`stage_${s.id}`, s.image));
    Object.entries(UI_IMAGES).forEach(([k, url]) => this.load.image(k, url));
    loadFx(this);
  }

  onLoaded() {
    createFxAnims(this);
    this.makeRamBlock();
    state.loaded = true;
    this.loadedAll = true;
    this.bar?.destroy();
    this.tryNext();
  }

  makeRamBlock() {
    if (this.textures.exists('ram_block')) return;
    const g = this.make.graphics({ add: false });
    g.fillStyle(0x1c1636, 1).fillRect(0, 0, 120, 56);
    g.fillStyle(0x2fa35a, 1).fillRect(3, 3, 114, 40);
    g.fillStyle(0x1b5e37, 1).fillRect(3, 30, 114, 13);
    for (let i = 0; i < 4; i++) g.fillStyle(0x222233, 1).fillRect(10 + i * 27, 9, 20, 16);
    for (let i = 0; i < 18; i++) g.fillStyle(0xf2c230, 1).fillRect(5 + i * 6.2, 44, 4, 10);
    g.generateTexture('ram_block', 120, 56);
    g.destroy();
  }

  onClick() {
    initAudio();
    this.clicked = true;
    this.tryNext();
  }

  tryNext() {
    if (this.done || !this.loadedAll) return;
    if (!(this.timerDone || this.clicked)) return;
    this.done = true;
    goTo(this, 'OpeningBattleScene', {}, 300);
  }
}
