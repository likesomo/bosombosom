import { state, reset } from '../state/gameState.js';
import { W, H, txt, goTo, enterScene } from '../ui/common.js';
import { DATA_FILES, buildData } from '../data/loadData.js';
import { loadFx, createFxAnims } from '../ui/fx.js';
import { initAudio } from '../ui/sfx.js';

const UI_IMAGES = {
  fx_guard_burst: 'assets/generated/fx/guard_spike_burst.png',
  fx_guard_aura: 'assets/generated/fx/guard_aura.png',
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

    // No intro: this scene only loads resources, then goes straight to the title (start button).
    this.timerDone = true;
    txt(this, W / 2, H - 140, '로딩 중…', { size: 22, color: '#8f86b8' });
    this.hint = txt(this, W / 2, H - 60, '', { size: 20, color: '#8f86b8' });

    this.input.on('pointerdown', () => this.onClick());
    this.input.keyboard.on('keydown', () => this.onClick());

    if (state.loaded) { this.loadedAll = true; this.time.delayedCall(0, () => this.tryNext()); return; }
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
    Object.values(D.stages).forEach((s) => {
      this.load.image(`stage_${s.id}`, s.image);
      if (s.floor) this.load.image(`floor_${s.id}`, s.floor);
    });
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
    this.done = true;
    goTo(this, 'TitleScene', {}, 200);
  }
}
