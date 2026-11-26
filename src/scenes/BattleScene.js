import { state, isFinalMatch } from '../state/gameState.js';
import { W, H, T, txt, goTo, enterScene, stageBackground, setGrey } from '../ui/common.js';
import { playFx, playScreenFx, floatText } from '../ui/fx.js';
import { sfx } from '../ui/sfx.js';
import { Fighter } from '../battle/fighter.js';
import { EnemyBrain } from '../battle/enemyBrain.js';
import { Hud } from '../ui/hud.js';
import {
  resolveHit, applyDamage, tickCooldowns, isReady, startCooldown, shouldEnterPhase2,
  isKO, inReach, knockDirection, nextMimicSkill,
} from '../battle/rules.js';

const MIMIC_TINT = 0xffb8dc;

export class BattleScene extends Phaser.Scene {
  constructor(key = 'BattleScene') { super(key); }

  init(data) {
    this.matchIndex = data?.matchIndex ?? state.matchIndex;
    this.isOpening = false;
  }

  create() {
    const D = state.data;
    this.S = D.skills;
    this.active = false;
    this.ended = false;
    this.freezeT = 0;
    this.phase2 = false;
    this.controls = { move: true, attack: true, skills: true, guard: true };
    this.keys = this.input.keyboard.addKeys('LEFT,RIGHT,UP,A,D,W,J,K,L,SPACE');
    this.setupMode();
    this.input.keyboard.on('keydown', (ev) => this.onKeyDown(ev));
  }

  // ---------- match setup ----------
  setupMode() {
    const D = state.data;
    this.match = D.bracket.matches[this.matchIndex];
    this.team = D.teams[this.match.opponentTeamId];
    const enemyDef = D.characters[this.team.characterId];
    this.stage = stageBackground(this, this.match.stageId);
    enterScene(this, `Battle ${this.match.label} vs ${this.team.name} (retry ${state.retryCount})`);

    this.player = new Fighter(this, D.characters.bosomi, { x: 430, facing: 1, isPlayer: true, stage: this.stage });
    this.player.mimicId = null;
    this.enemy = new Fighter(this, enemyDef, { x: 870, facing: -1, stage: this.stage });
    this.brain = new EnemyBrain(this, this.enemy, this.player, this.S);
    this.hud = new Hud(this, this.player, this.enemy, D.characters.bosomi.name, `${this.team.name} · ${enemyDef.name}`, this.team.color, this.S);
    if (this.stage.rain) this.makeRain();
    this.makeCheerers();

    // match banner + countdown
    const banner = txt(this, W / 2, 150, `${this.match.label}  VS ${this.team.name}`, { size: 40, color: '#ffd27a', depth: 300 });
    const ready = txt(this, W / 2, H / 2 - 40, T('ready', 'READY'), { size: 76, depth: 300 });
    sfx('tick');
    this.time.delayedCall(800, () => {
      ready.setText(T('fight', 'FIGHT!')).setColor('#ff9a4a');
      sfx('fight');
      this.cameras.main.shake(150, 0.006);
      this.active = true;
    });
    this.time.delayedCall(1300, () => { ready.destroy(); this.tweens.add({ targets: banner, alpha: 0, duration: 400, onComplete: () => banner.destroy() }); });
  }

  makeCheerers() {
    const D = state.data;
    this.cheerSprites = state.cheerers.map((cid, i) => {
      const def = D.characters[cid];
      if (!def) return null;
      const x = i % 2 === 0 ? 70 + i * 40 : W - 70 - i * 40;
      const s = this.add.image(x, H - 8, def.image).setOrigin(0.5, 1).setScale(0.2).setDepth(15).setFlipX(x > W / 2);
      this.tweens.add({ targets: s, y: H - 26, duration: 260 + i * 40, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      return s;
    });
  }

  makeRain() {
    this.rainG = this.add.graphics().setDepth(70);
    this.drops = Array.from({ length: 90 }, () => ({ x: Math.random() * W, y: Math.random() * H, v: 900 + Math.random() * 500 }));
  }

  updateRain(dt) {
    if (!this.rainG) return;
    const g = this.rainG;
    g.clear();
    g.lineStyle(2, 0x9fe8ff, 0.45);
    this.drops.forEach((d) => {
      d.y += d.v * dt; d.x -= d.v * 0.18 * dt;
      if (d.y > H) { d.y = -20; d.x = Math.random() * (W + 200); }
      g.lineBetween(d.x, d.y, d.x + 5, d.y + 22);
    });
  }

  // ---------- main loop ----------
  update(time, deltaMs) {
    const dt = Math.min(deltaMs / 1000, 0.05);
    this.updateRain(dt);
    if (this.freezeT > 0) { this.freezeT -= dt; return; }
    this.updateMode?.(dt);

    const p = this.player;
    const e = this.enemy;
    tickCooldowns(p.cooldowns, dt);
    tickCooldowns(e.cooldowns, dt);

    if (this.active && !this.ended) this.handlePlayerInput(dt);
    else { p.moveVx = 0; if (p.guarding) { p.guarding = false; p.setBaseTint(null); } }
    if (this.active && !this.ended && this.brain) this.brain.update(dt);

    p.update(dt);
    e.update(dt);
    if (!this.ended && p.state !== 'ko') p.faceTowards(e.x);

    this.checkDashHits(p, e);
    this.checkDashHits(e, p);
    this.hud?.update(dt);
    this.updateKO();
  }

  // ---------- input ----------
  readInput() {
    const k = this.keys;
    if (state.auto) return this.autopilot();
    return {
      left: k.LEFT.isDown || k.A.isDown,
      right: k.RIGHT.isDown || k.D.isDown,
      jump: Phaser.Input.Keyboard.JustDown(k.UP) || Phaser.Input.Keyboard.JustDown(k.W),
      attack: Phaser.Input.Keyboard.JustDown(k.J),
      roll: Phaser.Input.Keyboard.JustDown(k.K),
      mimic: Phaser.Input.Keyboard.JustDown(k.L),
      guard: k.SPACE.isDown,
    };
  }

  autopilot() {
    const p = this.player; const e = this.enemy;
    const dist = Math.abs(e.x - p.x);
    const dir = e.x > p.x ? 1 : -1;
    const threat = this.brain?.isTelegraphing || this.scriptThreat || this.pendingDrop;
    const inp = { left: false, right: false, jump: false, attack: false, roll: false, mimic: false, guard: !!threat };
    if (threat) return inp;
    if (dist > 120) { inp.right = dir > 0; inp.left = dir < 0; }
    if (dist < 300 && isReady(p.cooldowns, 'spike_roll')) inp.roll = true;
    else if (p.mimicId && isReady(p.cooldowns, 'mimic') && dist < 500) inp.mimic = true;
    else if (dist <= 130) inp.attack = true;
    return inp;
  }

  handlePlayerInput() {
    const p = this.player;
    const inp = this.readInput();
    const c = this.controls;
    const canAct = p.state === 'idle' && p.stun <= 0;

    const wantGuard = (c.guard && inp.guard && p.onGround && canAct) || this.forceGuard;
    const wasGuarding = p.guarding;
    p.guarding = !!wantGuard;
    if (p.guarding && !wasGuarding) { sfx('select'); p.setBaseTint(0xffd6e8); }
    if (!p.guarding && wasGuarding) p.setBaseTint(null);
    if (p.guarding) { p.moveVx = 0; return; }

    if (c.move && canAct) {
      const dir = (inp.right ? 1 : 0) - (inp.left ? 1 : 0);
      p.moveVx = dir * p.def.speed;
      if (inp.jump && p.jump(p.def.jumpPower)) sfx('jump');
    } else p.moveVx = 0;

    if (!canAct) return;
    if (c.attack && inp.attack && isReady(p.cooldowns, 'basic_attack')) this.playerAttack();
    else if (c.skills && inp.roll && isReady(p.cooldowns, 'spike_roll')) this.playerRoll();
    else if (c.skills && inp.mimic) this.playerMimic();
  }

  onKeyDown() { /* hook for subclasses */ }

  playerAttack() {
    const p = this.player; const e = this.enemy; const sk = this.S.basic_attack;
    startCooldown(p.cooldowns, sk);
    p.knockVx = p.facing * 260;
    this.tweens.add({ targets: p.sprite, scaleX: p.baseScale * 1.15, duration: 60, yoyo: true });
    sfx('whoosh');
    if (inReach(p.x, p.y, p.facing, e.x, e.y, sk.range)) this.resolve(p, e, sk, {});
  }

  playerRoll() {
    const p = this.player; const sk = this.S.spike_roll;
    startCooldown(p.cooldowns, sk);
    sfx('whoosh');
    p.startDash(sk, sk.dashSpeed, sk.duration);
    p.dashOpts = {};
  }

  playerMimic() {
    const p = this.player;
    if (!isReady(p.cooldowns, 'mimic')) return;
    if (!p.mimicId) { floatText(this, p.x, p.centerY - 80, T('mimicEmpty', ''), { size: 20, color: '#c9c3e6' }); return; }
    const skill = this.S[p.mimicId];
    startCooldown(p.cooldowns, this.S.mimic);
    floatText(this, p.x, p.centerY - 110, T('mimicPrefix', '솜 버전 ') + skill.name, { size: 24, color: '#ffb8dc' });
    playFx(this, 'spawn_poof', p.x, p.y, { scale: 2, tint: MIMIC_TINT });
    this.performSkill(p, this.enemy, skill, { mimic: true });
  }

  // ---------- skills ----------
  telegraphFx(user, skill, seconds) {
    sfx('telegraph');
    playFx(this, 'ui_exclamation', user.x, user.centerY - 90, { scale: 1.6, depth: 90 });
    user.flash(0xff3b3b, 90);
    this.time.delayedCall(180, () => user.flash(0xff3b3b, 90));
    if (skill.id !== 'enemy_jab') {
      floatText(this, user.x, user.centerY - 150, skill.name, { size: 26, color: skill.color || '#ffd27a', duration: Math.max(700, seconds * 1000), rise: 30 });
    }
  }

  performSkill(user, target, skill, opts) {
    const mimic = !!opts.mimic;
    switch (skill.type) {
      case 'melee': {
        user.knockVx = user.facing * 300;
        this.tweens.add({ targets: user.sprite, scaleX: user.baseScale * 1.15, duration: 70, yoyo: true });
        sfx('whoosh');
        if (inReach(user.x, user.y, user.facing, target.x, target.y, skill.range)) this.resolve(user, target, skill, opts);
        else if (skill.fx) playFx(this, skill.fx, user.x + user.facing * 80, user.y - 50, { scale: 2, flipX: user.facing < 0, tint: mimic ? MIMIC_TINT : null });
        break;
      }
      case 'dash':
      case 'launcher':
        sfx('whoosh');
        user.startDash(skill, skill.dashSpeed || 800, skill.duration || 0.35);
        user.dashOpts = opts;
        if (skill.fx2) { const s = playFx(this, skill.fx2, user.x, user.y, { scale: 2.2, loop: true, tint: mimic ? MIMIC_TINT : null }); if (s) this.time.delayedCall(450, () => s.destroy()); }
        break;
      case 'drop':
        this.spawnDrop(user, target, skill, opts);
        break;
      case 'shockwave':
        this.shockwave(user, target, skill, opts);
        break;
      default:
        console.warn('[battle] unknown skill type', skill.type);
    }
  }

  checkDashHits(user, target) {
    if (user.state !== 'dash' || user.dashHitDone || !user.dashSkill) return;
    const sk = user.dashSkill;
    if (Math.abs(target.x - user.x) <= sk.range * 0.75 && Math.abs(target.y - user.y) < 160 && target.state !== 'ko') {
      user.dashHitDone = true;
      this.resolve(user, target, sk, user.dashOpts || {});
    }
  }

  spawnDrop(user, target, skill, opts) {
    const mimic = !!opts.mimic;
    const x = target.x;
    const tele = mimic ? 0.6 : skill.telegraph;
    const gy = this.stage.floorY - 330;
    const box = this.add.container(x, gy).setDepth(95);
    const bw = 190;
    const bg = this.add.rectangle(0, 0, bw, 22, 0x1c1636).setStrokeStyle(3, 0xffffff);
    const fill = this.add.rectangle(-bw / 2 + 3, 0, (bw - 6) * 0.87, 14, mimic ? MIMIC_TINT : 0x3ddc84).setOrigin(0, 0.5);
    const label = this.add.text(0, -26, mimic ? '솜 BUILDING…' : (skill.telegraphText || ''), { fontFamily: 'Consolas, monospace', fontSize: '20px', fontStyle: 'bold', color: '#ffffff', stroke: '#1c1636', strokeThickness: 5 }).setOrigin(0.5);
    box.add([bg, fill, label]);
    const marker = this.add.ellipse(x, this.stage.floorY + 2, skill.range * 2, 26, 0xff3b3b, 0.35).setDepth(18);
    this.tweens.add({ targets: marker, alpha: 0.75, duration: 180, yoyo: true, repeat: -1 });
    this.tweens.add({ targets: fill, width: bw - 6, duration: tele * 1000 });
    this.pendingDrop = !mimic;
    sfx('telegraph');

    this.time.delayedCall(tele * 1000, () => {
      label.setText('100%');
      const block = this.add.image(x, -80, 'ram_block').setDepth(96).setScale(1.4);
      if (mimic) block.setTint(MIMIC_TINT);
      this.tweens.add({
        targets: block, y: this.stage.floorY - 34, duration: 230, ease: 'Quad.easeIn',
        onComplete: () => {
          this.pendingDrop = false;
          box.destroy(); marker.destroy();
          sfx('drop');
          this.cameras.main.shake(220, 0.012);
          playFx(this, 'impacts_heavy-landing', x, this.stage.floorY, { scale: 3, tint: mimic ? MIMIC_TINT : null });
          const hit = Math.abs(target.x - x) <= skill.range && target.state !== 'ko';
          const result = hit ? this.resolve(user, target, skill, opts) : null;
          if (result?.blocked) {
            floatText(this, x, this.stage.floorY - 200, skill.guardText || 'BLOCK', { size: 34, color: '#ff4d6d' });
            this.tweens.add({ targets: block, x: x + (x > user.x ? 260 : -260), y: -100, angle: 540, duration: 650, ease: 'Quad.easeOut', onComplete: () => block.destroy() });
          } else {
            this.tweens.add({ targets: block, alpha: 0, delay: 350, duration: 300, onComplete: () => block.destroy() });
          }
        },
      });
    });
  }

  shockwave(user, target, skill, opts) {
    const mimic = !!opts.mimic;
    const color = mimic ? MIMIC_TINT : Phaser.Display.Color.HexStringToColor(skill.color || '#7ee36b').color;
    sfx('shout');
    floatText(this, user.x, user.centerY - 120, mimic ? '보솜!!' : (skill.shoutText || '!!'), { size: 44, color: mimic ? '#ffb8dc' : (skill.color || '#ffffff') });
    this.cameras.main.shake(260, 0.008);
    for (let i = 0; i < 3; i++) {
      const ring = this.add.circle(user.x, user.centerY, 40, color, 0).setStrokeStyle(8, color, 0.9).setDepth(85);
      this.tweens.add({ targets: ring, radius: skill.range, alpha: 0, delay: i * 110, duration: 520, ease: 'Cubic.easeOut', onComplete: () => ring.destroy() });
    }
    playFx(this, 'lightning_thunderclap', user.x, user.y, { scale: 2.6, tint: mimic ? MIMIC_TINT : null });
    if (skill.fx2) playFx(this, skill.fx2, user.x + user.facing * 120, user.y, { scale: 2.6, flipX: user.facing < 0, tint: mimic ? MIMIC_TINT : null });
    if (Math.abs(target.x - user.x) <= skill.range) this.time.delayedCall(120, () => this.resolve(user, target, skill, opts));
  }

  // ---------- hit resolution ----------
  resolve(attacker, target, skill, opts = {}) {
    if (target.invuln > 0 || target.state === 'ko' || this.ended) return null;
    const r = resolveHit(skill, { guarding: target.guarding, powerScale: opts.mimic ? (this.S.mimic.powerScale ?? 1) : 1, guardSkill: this.S.guard });
    const dir = knockDirection(attacker.x, target.x);

    if (target.isPlayer && !attacker.isPlayer && !this.isOpening) {
      const before = target.mimicId;
      target.mimicId = nextMimicSkill(target.mimicId, skill);
      if (target.mimicId !== before) floatText(this, target.x - 40, target.centerY - 140, `흉내 준비: ${this.S[target.mimicId].name}`, { size: 20, color: '#ffb8dc', duration: 1100 });
    }

    if (r.blocked) {
      sfx('guard');
      playFx(this, this.S.guard.fx || 'impacts_parry', target.x, target.centerY + 30, { scale: 2.2 });
      this.onGuardBlocked?.(attacker, skill);
    }
    if (r.countered) {
      sfx('counter');
      this.freezeT = 0.09;
      floatText(this, target.x, target.centerY - 120, T('counter', '따끔!'), { size: 46, color: '#ff9a4a' });
      playFx(this, this.S.guard.fxCounter || 'nature_thorns', target.x - dir * 20, target.y, { scale: 1.8, flipX: dir < 0 });
      attacker.hp = applyDamage(attacker.hp, r.counterDamage, attacker.minHp);
      attacker.state = attacker.state === 'dash' ? 'idle' : attacker.state;
      attacker.knock(-dir * r.counterKnockback, -380);
      attacker.state = 'launched';
      attacker.stun = 0.7;
      attacker.flash(0xffffff, 120);
      playFx(this, 'status_stunned', attacker.x, attacker.centerY - 70, { scale: 1.6 });
      this.damageNumber(attacker, r.counterDamage, '#ff9a4a');
      this.onCounter?.(attacker);
      this.afterHp(attacker);
    }

    if (r.damage > 0) {
      const heavy = r.damage >= 12;
      target.hp = applyDamage(target.hp, r.damage, target.minHp);
      target.invuln = 0.3;
      target.flash(0xff5a5a, 110);
      if (r.knockback) target.knock(dir * r.knockback, r.launch ? -r.launch : (heavy ? -260 : 0));
      if (r.launch) target.state = 'launched';
      if (skill.fx) playFx(this, skill.fx, target.x, target.centerY + 30, { scale: heavy ? 2.8 : 2.2, flipX: dir < 0, tint: opts.mimic ? MIMIC_TINT : null });
      if (opts.mimic) { const c = playFx(this, 'status_confused', target.x, target.centerY - 70, { scale: 1.6, loop: true }); if (c) this.time.delayedCall(900, () => c.destroy()); floatText(this, target.x + 30, target.centerY - 150, '?', { size: 54, color: '#ffffff' }); }
      this.damageNumber(target, r.damage, heavy ? '#ffd27a' : '#ffffff');
      sfx(heavy ? 'heavy' : 'hit');
      this.freezeT = heavy ? 0.12 : 0.05;
      this.cameras.main.shake(heavy ? 220 : 90, heavy ? 0.012 : 0.005);
      this.onHitLanded?.(attacker, target, skill);
      this.afterHp(target);
    }
    return r;
  }

  damageNumber(f, amount, color) {
    floatText(this, f.x + (Math.random() - 0.5) * 40, f.centerY - 40, `${amount}`, { size: 36, color });
  }

  afterHp(f) {
    if (f === this.enemy && shouldEnterPhase2(f.hp, f.maxHp, f.def.phase2, this.phase2)) this.enterPhase2();
    if (isKO(f.hp) && !this.ended) {
      if (f === this.enemy) this.startKO(); else this.startDefeat();
    }
  }

  // ---------- phase 2 (final) ----------
  enterPhase2() {
    this.phase2 = true;
    const e = this.enemy;
    this.freezeT = 0.6;
    sfx('glitch');
    this.cameras.main.shake(500, 0.014);
    playScreenFx(this, 'transitions_glitch-wipe', { speed: 1.6 });
    setGrey(e.sprite, true);
    e.jitter = 6;
    floatText(this, W / 2, 220, T('phase2', '노이즈에 씌었다…!'), { size: 44, color: '#c9c3e6', duration: 1600, rise: 20 });
    this.brain?.enterPhase2(e.def.phase2);
  }

  // ---------- KO / defeat ----------
  startKO() {
    this.ended = true;
    const e = this.enemy; const p = this.player;
    const dir = knockDirection(p.x, e.x);
    this.freezeT = 0.28;
    sfx('ko');
    this.cameras.main.flash(140, 255, 255, 255);
    this.cameras.main.shake(450, 0.02);
    playFx(this, 'impacts_impact-frame', e.x, e.centerY, { scale: 3, depth: 120 });
    playFx(this, 'explosions_cartoon-pow', e.x, e.centerY, { scale: 2.6, depth: 121 });
    if (this.phase2) { setGrey(e.sprite, false); e.jitter = 0; floatText(this, W / 2, 240, T('phase2Clear', ''), { size: 40, color: '#ffffff', duration: 1600 }); }
    e.state = 'ko';
    e.knockVx = dir * 1900;
    e.vy = -1250;
    e.facing = -dir;
    this.koDir = dir;
    this.starShown = false;
    this.koSafety = this.time.delayedCall(2500, () => { if (!this.starShown) this.updateKO(true); });
  }

  updateKO(force = false) {
    if (!this.ended || this.enemy.state !== 'ko' || this.starShown) return;
    const e = this.enemy;
    if (force || e.x < -80 || e.x > W + 80 || e.y < -120 || e.y > H + 200) {
      this.starShown = true;
      const sx = Phaser.Math.Clamp(e.x, 60, W - 60);
      const sy = Phaser.Math.Clamp(e.y, 60, 300);
      const star = this.add.star(sx, sy, 5, 10, 26, 0xfff27a).setDepth(150);
      this.tweens.add({ targets: star, scale: { from: 0.2, to: 2.2 }, angle: 180, alpha: { from: 1, to: 0 }, duration: 700, ease: 'Cubic.easeOut' });
      playFx(this, 'explosions_firework-burst', sx, sy + 40, { scale: 1.6, depth: 149 });
      sfx('fanfare');
      txt(this, W / 2, H / 2 - 60, T('ko', '별이 됐다!'), { size: 72, color: '#fff27a', depth: 300 });
      playFx(this, 'ui_confetti', W / 2, H / 2 + 40, { scale: 3, depth: 290 });
      this.time.delayedCall(1700, () => this.finishMatch());
    }
  }

  finishMatch() {
    state.retryCount = 0;
    if (isFinalMatch(this.matchIndex)) {
      // the final rival (noise cleared) celebrates with us in the ending
      if (!state.cheerers.includes(this.team.characterId)) state.cheerers.push(this.team.characterId);
      goTo(this, 'EndingScene', {}, 400);
    }
    else goTo(this, 'CheerScene', { matchIndex: this.matchIndex, opponentTeamId: this.team.id }, 300);
  }

  startDefeat() {
    this.ended = true;
    const p = this.player;
    sfx('lose');
    this.freezeT = 0.25;
    p.state = 'ko';
    p.knockVx = -p.facing * 400; p.vy = -700;
    this.time.delayedCall(450, () => {
      txt(this, W / 2, H / 2 - 40, T('retry', '다시 한 번!'), { size: 70, color: '#ffd27a', depth: 300 });
    });
    this.time.delayedCall(1500, () => {
      state.retryCount += 1;
      this.scene.restart({ matchIndex: this.matchIndex });
    });
  }
}
