import { state } from '../state/gameState.js';
import { W, T, goTo, enterScene, keyBadge, setGrey } from '../ui/common.js';
import { playFx, playScreenFx, floatText } from '../ui/fx.js';
import { sfx } from '../ui/sfx.js';
import { Fighter } from '../battle/fighter.js';
import { BattleScene } from './BattleScene.js';

// Scripted first battle: trophy loses its color → fluffy Bosomi lands → transforms → guard tutorial → enemy flees.
export class OpeningBattleScene extends BattleScene {
  constructor() { super('OpeningBattleScene'); }

  init() { this.isOpening = true; this.matchIndex = 0; }

  setupMode() {
    const D = state.data;
    this.stage = this.arenaStage('arena');
    enterScene(this, 'Opening');
    this.step = 'intro';
    this.controls = { move: false, attack: false, skills: false, guard: false };
    const R = this.stage.ring;

    const podiumTop = R.cy - 140; // trophy stands on the far side of the ring
    this.trophy = this.add.image(W / 2, podiumTop, 'obj_trophy').setOrigin(0.5, 0.92).setScale(0.2).setDepth(28);
    this.tweens.add({ targets: this.trophy, y: podiumTop - 6, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.trophyGlow = playFx(this, 'holy_sunburst', W / 2, podiumTop - 60, { scale: 2.2, loop: true, depth: 16, alpha: 0.8 });

    this.player = new Fighter(this, D.characters.bosomi, { x: 400, y: R.cy + 40, facing: 1, isPlayer: true, stage: this.stage, imageKey: D.characters.bosomi.imageFluffy });
    this.player.mimicId = null;
    this.player.minHp = 1;
    this.player.z = 700;
    this.player.setVisible(false);

    const maskedDef = D.characters[D.teams.masked?.characterId || 'rival_masked_phase1'];
    this.enemy = new Fighter(this, maskedDef, { x: 980, y: R.cy + 10, facing: -1, stage: this.stage });
    this.enemy.minHp = 1;
    this.enemy.sprite.setAlpha(0);
    this.brain = null;
    this.hitsLanded = 0;

    this.seq([
      [400, () => { this.enemy.sprite.setAlpha(1); this.enemy.jitter = 5; sfx('glitch'); playFx(this, 'spawn_poof', this.enemy.x, this.enemy.y, { scale: 2.4, tint: 0x8f8fa3 }); }],
      [900, () => { this.enemy.jitter = 0; this.tweens.add({ targets: this.enemy, x: W / 2 + 120, duration: 350, ease: 'Quad.easeIn' }); }],
      [450, () => this.stealTrophyColor()],
      [1300, () => this.dropBosomi()],
      [1200, () => this.clawBosomi()],
      [1100, () => this.transform()],
      [1400, () => this.startGuardTutorial()],
    ]);
  }

  // run [delayMs, fn] steps one after another
  seq(steps) {
    let t = 0;
    steps.forEach(([d, fn]) => { t += d; this.time.delayedCall(t, () => { if (!this.__leaving) fn(); }); });
  }

  stealTrophyColor() {
    const x = this.trophy.x;
    sfx('glitch');
    playFx(this, 'melee_claw-swipe', x - 10, this.trophy.y - 30, { scale: 2.4, flipX: true, tint: 0xbbbbcc });
    this.cameras.main.shake(300, 0.01);
    setGrey(this.trophy, true);
    if (this.trophyGlow) this.trophyGlow.destroy();
    playScreenFx(this, 'transitions_glitch-wipe', { speed: 2.2, tint: 0xaaaaaa });
  }

  dropBosomi() {
    const p = this.player;
    p.sprite.setVisible(true);
    p.x = 400; p.z = 650; p.vz = 0; p.state = 'idle';
    sfx('whoosh');
    this.active = true; // physics + render, controls still off
    this.time.delayedCall(720, () => { playFx(this, 'spawn_poof', p.x, p.y, { scale: 2.6 }); sfx('heavy'); this.cameras.main.shake(160, 0.008); });
  }

  clawBosomi() {
    const e = this.enemy; const p = this.player;
    this.tweens.add({ targets: e, x: p.x + 150, y: p.y, duration: 260, ease: 'Quad.easeIn', onComplete: () => {
      playFx(this, 'melee_claw-swipe', p.x + 20, p.y - 40, { scale: 2.4, flipX: true, tint: 0xbbbbcc });
      p.flash(0xffffff, 80);
      setGrey(p.sprite, true); // fur turns grey noise
      p.knock(-1, 0, 520, 220);
      sfx('hit');
      this.cameras.main.shake(160, 0.008);
      this.tweens.add({ targets: e, x: p.x + 330, duration: 400, delay: 150 });
    } });
  }

  transform() {
    const p = this.player;
    playFx(this, 'ui_exclamation', p.x + 10, p.topY - 10, { scale: 2 });
    sfx('telegraph');
    this.time.delayedCall(650, () => {
      p.setTexture(state.data.characters.bosomi.image);
      setGrey(p.sprite, false);
      this.cameras.main.flash(160, 255, 240, 220);
      this.cameras.main.shake(220, 0.012);
      playFx(this, 'explosions_firework-burst', p.x, p.y - 20, { scale: 2.2 });
      playFx(this, 'nature_thorns', p.x - 60, p.y, { scale: 1.6 });
      sfx('fanfare');
      this.tweens.add({ targets: p.sprite, scaleY: { from: p.baseScale * 1.3, to: p.baseScale }, duration: 260, ease: 'Back.easeOut' });
    });
  }

  startGuardTutorial() {
    this.step = 'guard';
    this.controls = { move: true, attack: false, skills: false, guard: true };
    this.badge = keyBadge(this, W / 2, 170, 'SPACE', { w: 190 });
    this.tweens.add({ targets: this.badge, scale: 1.15, duration: 280, yoyo: true, repeat: -1 });
    this.guardPromptAt = this.time.now;
    this.enemySwing();
  }

  enemySwing() {
    if (this.step !== 'guard' || this.__leaving) return;
    const e = this.enemy; const p = this.player; const sk = this.S.color_steal || this.S.enemy_jab;
    this.tweens.add({ targets: e, x: p.x + 140, y: p.y, duration: 300, ease: 'Quad.easeOut', onComplete: () => {
      e.aimAt(p);
      this.scriptThreat = true;
      this.telegraphFx(e, sk, sk.telegraph);
      this.time.delayedCall(sk.telegraph * 1000, () => {
        if (this.step !== 'guard') return;
        if (this.time.now - this.guardPromptAt > 3000) this.forceGuard = true; // auto-guard safety net
        this.performSkill(e, p, sk, {});
        this.scriptThreat = false;
        this.time.delayedCall(50, () => { this.forceGuard = false; });
        if (this.step === 'guard') this.time.delayedCall(900, () => this.enemySwing());
      });
    } });
  }

  onCounter(attacker) {
    if (this.step !== 'guard' || attacker !== this.enemy) return;
    this.step = 'attack';
    this.badge?.destroy();
    this.time.delayedCall(700, () => {
      this.controls = { move: true, attack: true, skills: false, guard: true };
      this.badge = keyBadge(this, W / 2, 170, 'J', { w: 90 });
      this.tweens.add({ targets: this.badge, scale: 1.15, duration: 280, yoyo: true, repeat: -1 });
      this.time.delayedCall(5000, () => this.flee());
    });
  }

  onHitLanded(attacker, target) {
    if (this.step === 'attack' && attacker === this.player && target === this.enemy) {
      this.hitsLanded += 1;
      if (this.hitsLanded >= 3) this.flee();
    }
  }

  flee() {
    if (this.step === 'flee') return;
    this.step = 'flee';
    this.controls = { move: false, attack: false, skills: false, guard: false };
    this.badge?.destroy();
    const e = this.enemy;
    e.jitter = 8;
    sfx('glitch');
    floatText(this, e.x, e.topY - 40, T('openingFlee', '지지직…'), { size: 34, color: '#c9c3e6', duration: 1200 });
    playScreenFx(this, 'transitions_glitch-wipe', { speed: 1.4, tint: 0xaaaaaa });
    this.time.delayedCall(700, () => {
      this.tweens.add({ targets: e.sprite, alpha: 0, duration: 400 });
      e.state = 'busy';
      const shard = this.add.rectangle(e.x, e.centerY, 22, 22, 0x8f8fa3).setDepth(100).setStrokeStyle(3, 0x1c1636);
      this.tweens.add({ targets: shard, x: W + 60, y: -60, angle: 720, duration: 900, ease: 'Quad.easeIn' });
    });
    this.time.delayedCall(2100, () => goTo(this, 'TitleScene', {}, 500));
  }

  updateMode() {
    const p = this.player;
    if (!p.sprite.visible) { p.z = 650; p.vz = 0; }
  }

  // opening never ends in KO/defeat
  startKO() {}
  startDefeat() {}
}
