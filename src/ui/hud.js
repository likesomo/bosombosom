import { FONT } from './common.js';
import { cooldownRatio } from '../battle/rules.js';
import { textureFor } from './characterView.js';

// Measured inside ui_hp_frame.png (1024x256): bar interior and portrait circle.
const FRAME = { w: 1024, h: 256, barX0: 264, barX1: 959, barY0: 97, barY1: 165, circleX: 135, circleY: 128, circleR: 80 };
const SCALE = 0.43;

class HpBar {
  constructor(scene, fighter, name, color, side) {
    this.scene = scene;
    this.fighter = fighter;
    this.side = side; // 'left' | 'right'
    const fw = FRAME.w * SCALE;
    const x0 = side === 'left' ? 16 : 1280 - 16 - fw;
    const y0 = 8;
    const mirror = side === 'right';
    const lx = (fx) => x0 + (mirror ? FRAME.w - fx : fx) * SCALE;
    this.barLeft = Math.min(lx(FRAME.barX0), lx(FRAME.barX1));
    this.barW = (FRAME.barX1 - FRAME.barX0) * SCALE;
    this.barY = y0 + FRAME.barY0 * SCALE;
    this.barH = (FRAME.barY1 - FRAME.barY0) * SCALE;
    this.lag = 1;

    this.g = scene.add.graphics().setDepth(200).setScrollFactor(0);
    const cx = lx(FRAME.circleX);
    const cy = y0 + FRAME.circleY * SCALE;
    const r = FRAME.circleR * SCALE;
    const bgc = scene.add.circle(cx, cy, r, 0x2a2350).setDepth(199).setScrollFactor(0);
    const portrait = scene.add.image(cx, cy + r * 0.25, textureFor(scene, fighter.def)).setDepth(201).setScrollFactor(0);
    portrait.setScale((r * 2.6) / 512).setFlipX(mirror);
    const maskG = scene.make.graphics({ add: false }).fillCircle(cx, cy, r);
    portrait.setMask(maskG.createGeometryMask());
    this.portrait = portrait;
    void bgc;

    if (scene.textures.exists('ui_hp_frame')) {
      scene.add.image(x0, y0, 'ui_hp_frame').setOrigin(0, 0).setScale(SCALE).setFlipX(mirror).setDepth(202).setScrollFactor(0);
    } else {
      scene.add.rectangle(this.barLeft - 4, this.barY - 4, this.barW + 8, this.barH + 8).setOrigin(0, 0).setStrokeStyle(3, 0xffd27a).setDepth(202).setScrollFactor(0);
    }
    this.color = Phaser.Display.Color.HexStringToColor(color).color;
    const nx = side === 'left' ? this.barLeft + 4 : this.barLeft + this.barW - 4;
    this.label = scene.add.text(nx, this.barY + this.barH + 8, name, {
      fontFamily: FONT, fontSize: '20px', fontStyle: 'bold', color: '#ffffff', stroke: '#1c1636', strokeThickness: 5,
    }).setOrigin(side === 'left' ? 0 : 1, 0).setDepth(203).setScrollFactor(0);
  }

  update(dt) {
    const f = this.fighter;
    const ratio = Phaser.Math.Clamp(f.hp / f.maxHp, 0, 1);
    this.lag = Math.max(ratio, this.lag - dt * 0.6);
    const g = this.g;
    g.clear();
    g.fillStyle(0x140f2a, 1).fillRect(this.barLeft, this.barY, this.barW, this.barH);
    const w = (r) => this.barW * r;
    const xFor = (r) => (this.side === 'left' ? this.barLeft : this.barLeft + this.barW - w(r));
    g.fillStyle(0xffffff, 0.85).fillRect(xFor(this.lag), this.barY, w(this.lag), this.barH);
    const col = ratio < 0.3 ? 0xff4d6d : this.color;
    g.fillStyle(col, 1).fillRect(xFor(ratio), this.barY, w(ratio), this.barH);
    g.fillStyle(0xffffff, 0.25).fillRect(xFor(ratio), this.barY, w(ratio), this.barH * 0.35);
  }
}

class SkillSlot {
  constructor(scene, x, y, keyLabel, name) {
    this.scene = scene;
    this.size = 78;
    const s = this.size;
    this.c = scene.add.container(x, y).setDepth(210).setScrollFactor(0);
    const bg = scene.add.graphics();
    bg.fillStyle(0x1c1636, 0.85).fillRoundedRect(-s / 2, -s / 2, s, s, 12);
    bg.lineStyle(3, 0xffd27a, 1).strokeRoundedRect(-s / 2, -s / 2, s, s, 12);
    this.cd = scene.add.graphics();
    this.name = scene.add.text(0, 4, name, { fontFamily: FONT, fontSize: '15px', fontStyle: 'bold', color: '#fff4e6', align: 'center', wordWrap: { width: s - 8, useAdvancedWrap: true } }).setOrigin(0.5);
    this.key = scene.add.text(-s / 2 + 6, -s / 2 + 2, keyLabel, { fontFamily: FONT, fontSize: '16px', fontStyle: 'bold', color: '#ffd27a', stroke: '#1c1636', strokeThickness: 4 });
    this.c.add([bg, this.name, this.cd, this.key]);
  }

  set(ratio, label, dim = false) {
    const s = this.size;
    this.cd.clear();
    if (ratio > 0) this.cd.fillStyle(0x000000, 0.6).fillRect(-s / 2 + 3, -s / 2 + 3 + (s - 6) * (1 - ratio), s - 6, (s - 6) * ratio);
    if (label !== undefined && this.name.text !== label) this.name.setText(label);
    this.c.setAlpha(dim ? 0.55 : 1);
  }
}

export class Hud {
  constructor(scene, player, enemy, playerName, enemyName, enemyColor, skills) {
    this.scene = scene;
    this.player = player;
    this.skills = skills;
    this.left = new HpBar(scene, player, playerName, '#7fd4ff', 'left');
    this.right = new HpBar(scene, enemy, enemyName, enemyColor, 'right');
    const y = 668;
    this.slots = {
      J: new SkillSlot(scene, 60, y, 'J', skills.basic_attack.name),
      K: new SkillSlot(scene, 146, y, 'K', skills.spike_roll.name),
      L: new SkillSlot(scene, 232, y, 'L', skills.mimic.name),
      SPACE: new SkillSlot(scene, 318, y, 'SPC', skills.guard.name),
    };
  }

  setEnemy(enemy) { this.right.fighter = enemy; }

  update(dt) {
    this.left.update(dt);
    this.right.update(dt);
    const p = this.player;
    const S = this.skills;
    this.slots.J.set(cooldownRatio(p.cooldowns, S.basic_attack));
    this.slots.K.set(cooldownRatio(p.cooldowns, S.spike_roll));
    const mimicSkill = p.mimicId ? S[p.mimicId] : null;
    this.slots.L.set(cooldownRatio(p.cooldowns, S.mimic), mimicSkill ? mimicSkill.name : S.mimic.name, !mimicSkill);
    this.slots.SPACE.set(0, undefined, false);
    this.slots.SPACE.c.setScale(p.guarding ? 1.12 : 1);
  }
}
