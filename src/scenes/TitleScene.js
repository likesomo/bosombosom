import { state, saveSettings } from '../state/gameState.js';
import { W, H, T, txt, goTo, enterScene, stageBackground, FONT, setGrey } from '../ui/common.js';
import { sfx, setVolume, initAudio } from '../ui/sfx.js';
import { playFx } from '../ui/fx.js';

export class TitleScene extends Phaser.Scene {
  constructor() { super('TitleScene'); }

  create() {
    enterScene(this, 'Title');
    const st = stageBackground(this, 'arena');
    this.add.rectangle(0, 0, W, H, 0x0d0a1c, 0.35).setOrigin(0, 0).setDepth(-5);

    const trophy = this.add.image(W / 2, st.floorY - 38, 'obj_trophy').setOrigin(0.5, 0.92).setScale(0.22).setDepth(5);
    setGrey(trophy, true);
    this.tweens.add({ targets: trophy, y: trophy.y - 6, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    const bo = this.add.image(W / 2 - 230, st.floorY + 6, 'bosomi').setOrigin(0.5, 0.94).setScale(0.375).setDepth(6);
    this.tweens.add({ targets: bo, scaleY: 0.36, duration: 500, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    const title = txt(this, W / 2, 150, T('gameTitle', '보솜보솜 챔피언십'), { size: 84, color: '#ffe9d6', stroke: '#2a2350', strokeThickness: 12, depth: 20 });
    title.setShadow(0, 6, '#ff9a4a', 0, true, true);
    txt(this, W / 2, 232, T('gameSubtitle', ''), { size: 28, color: '#ffd27a', depth: 20 });

    this.items = [
      this.menuItem(W / 2 + 250, 420, T('menuStart', '시작하기'), () => this.start()),
      this.menuItem(W / 2 + 250, 500, T('menuSettings', '설정'), () => this.openSettings()),
    ];
    this.sel = 0;
    this.refresh();

    this.input.keyboard.on('keydown-UP', () => this.move(-1));
    this.input.keyboard.on('keydown-DOWN', () => this.move(1));
    this.input.keyboard.on('keydown-ENTER', () => { if (!this.panel) this.items[this.sel].action(); });
    this.input.keyboard.on('keydown-SPACE', () => { if (!this.panel) this.items[this.sel].action(); });
    if (state.auto) this.time.delayedCall(1200, () => this.start());
  }

  menuItem(x, y, label, action) {
    const t = txt(this, x, y, label, { size: 40, color: '#ffffff', depth: 20 }).setInteractive({ useHandCursor: true });
    t.on('pointerover', () => { this.sel = this.items.findIndex((i) => i.t === t); this.refresh(); });
    t.on('pointerdown', () => { initAudio(); action(); });
    return { t, action };
  }

  move(d) {
    if (this.panel) return;
    this.sel = (this.sel + d + this.items.length) % this.items.length;
    sfx('select');
    this.refresh();
  }

  refresh() {
    this.items.forEach((it, i) => {
      const on = i === this.sel;
      it.t.setColor(on ? '#ff9a4a' : '#ffffff').setScale(on ? 1.12 : 1);
      it.t.setText((on ? '▶ ' : '') + it.t.text.replace(/^▶ /, ''));
    });
  }

  start() {
    if (this.panel || this.__leaving) return;
    sfx('fight');
    playFx(this, 'ui_confetti', W / 2, 520, { scale: 3 });
    state.matchIndex = 0;
    goTo(this, 'IntroScene', {}, 350);
  }

  openSettings() {
    if (this.panel) return;
    sfx('select');
    const c = this.add.container(W / 2, H / 2).setDepth(100);
    const bg = this.add.rectangle(0, 0, 560, 300, 0x1c1636, 0.96).setStrokeStyle(4, 0xffd27a);
    const title = this.add.text(0, -110, T('menuSettings', '설정'), { fontFamily: FONT, fontSize: '34px', fontStyle: 'bold', color: '#ffd27a' }).setOrigin(0.5);
    const label = this.add.text(-220, -30, T('settingsVolume', '사운드 크기'), { fontFamily: FONT, fontSize: '24px', color: '#ffffff' }).setOrigin(0, 0.5);
    const track = this.add.rectangle(-220, 30, 360, 10, 0x4b3f7a).setOrigin(0, 0.5);
    const knob = this.add.circle(-220 + 360 * state.settings.volume, 30, 18, 0xff9a4a).setInteractive({ draggable: true, useHandCursor: true });
    const val = this.add.text(170, 30, `${Math.round(state.settings.volume * 100)}`, { fontFamily: FONT, fontSize: '24px', color: '#ffffff' }).setOrigin(0, 0.5);
    knob.on('drag', (pointer, dragX) => {
      const x = Phaser.Math.Clamp(dragX, -220, 140);
      knob.x = x;
      state.settings.volume = (x + 220) / 360;
      val.setText(`${Math.round(state.settings.volume * 100)}`);
      setVolume(state.settings.volume);
    });
    knob.on('dragend', () => { saveSettings(); sfx('select'); });
    const close = this.add.text(0, 110, T('settingsClose', '닫기'), { fontFamily: FONT, fontSize: '30px', fontStyle: 'bold', color: '#ffffff', backgroundColor: '#ff9a4a', padding: { x: 24, y: 6 } }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    close.on('pointerdown', () => this.closeSettings());
    c.add([bg, title, label, track, knob, val, close]);
    this.panel = c;
    this.escKey = this.input.keyboard.once('keydown-ESC', () => this.closeSettings());
  }

  closeSettings() {
    if (!this.panel) return;
    saveSettings();
    this.panel.destroy();
    this.panel = null;
  }
}
