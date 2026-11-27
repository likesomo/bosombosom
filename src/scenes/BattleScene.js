import { state, isFinalMatch } from '../state/gameState.js';
import { W, H, T, FONT, txt, goTo, enterScene, setGrey } from '../ui/common.js';
import { textureFor } from '../ui/characterView.js';
import { playFx, playScreenFx, floatText } from '../ui/fx.js';
import { sfx } from '../ui/sfx.js';
import { Fighter } from '../battle/fighter.js';
import { EnemyBrain } from '../battle/enemyBrain.js';
import { Hud } from '../ui/hud.js';
import { Crowd } from '../ui/crowd.js';
import { drawArena, showSkillArea, floorCrack } from '../ui/arenaView.js';
import {
  resolveHit, applyDamage, tickCooldowns, isReady, startCooldown, shouldEnterPhase2,
  isKO, nextMimicSkill, knockVector, groundDist, inSkillArea, shouldStagger,
} from '../battle/rules.js';

const MIMIC_TINT = 0xffb8dc;
const SKILL_LABEL_SECONDS = 1.2;
const SHAKE = { ms: 70, intensity: 0.006 };          // only when Bosomi is hit or on a big hit
// cutMs: impact cut with the rival close-up · zoomMs: vignette + zoom · flySpeed: ring-out speed
// flySlow: time scale of the ring-out flight (slow motion) · trailMs: star trail spawn interval
const FINISH = { cutMs: 650, zoomMs: 900, zoom: 1.12, flySpeed: 1350, flySlow: 0.5, trailMs: 60 };

/** "{name}{이/가} ..." / "{name}{을/를} ..." → picks the Korean particle from the last syllable of name. */
export function fillName(template, name) {
  const last = name.charCodeAt(name.length - 1);
  const hasFinal = last >= 0xac00 && last <= 0xd7a3 && (last - 0xac00) % 28 !== 0;
  return template
    .replace(/\{name\}\{이\/가\}/g, name + (hasFinal ? '이' : '가'))
    .replace(/\{name\}\{을\/를\}/g, name + (hasFinal ? '을' : '를'))
    .replace(/\{name\}/g, name);
}

export class BattleScene extends Phaser.Scene {
  constructor(key = 'BattleScene') { super(key); }

  init(data) {
    this.matchIndex = data?.matchIndex ?? state.matchIndex;
    this.introVs = !!data?.vs;           // VS card only when coming from the bracket (not on retry / hotkeys)
    this.isOpening = false;
  }

  create() {
    const D = state.data;
    this.S = D.skills;
    this.active = false;
    this.ended = false;
    this.freezeT = 0;
    this.phase2 = false;
    this.staggered = false;
    this.starShown = false;
    this.dizzyFx = null;
    this.guardAura = null;
    this.controls = { move: true, attack: true, skills: true, guard: true };
    this.keys = this.input.keyboard.addKeys('LEFT,RIGHT,UP,DOWN,A,D,W,S,J,K,L,SPACE');
    this.setupMode();
    this.input.keyboard.on('keydown', (ev) => this.onKeyDown(ev));
  }

  // ---------- match setup ----------
  setupMode() {
    const D = state.data;
    this.match = D.bracket.matches[this.matchIndex];
    this.team = D.teams[this.match.opponentTeamId];
    const enemyDef = D.characters[this.team.characterId];
    this.stage = this.arenaStage(this.match.stageId);
    enterScene(this, `Battle ${this.match.label} vs ${this.team.name} (retry ${state.retryCount})`);
    const R = this.stage.ring;

    const ox = R.startOffsetX ?? 440; const oy = R.startOffsetY ?? 20;
    this.player = new Fighter(this, D.characters.bosomi, { x: R.cx - ox, y: R.cy + oy, facing: 1, isPlayer: true, stage: this.stage });
    this.player.mimicId = null;
    this.enemy = new Fighter(this, enemyDef, { x: R.cx + ox, y: R.cy - oy, facing: -1, stage: this.stage });
    this.brain = new EnemyBrain(this, this.enemy, this.player, this.S);
    this.hud = new Hud(this, this.player, this.enemy, D.characters.bosomi.name, `${this.team.name} · ${enemyDef.name}`, this.team.color, this.S);
    if (this.stage.rain) this.makeRain();
    this.makeCheerers();

    this.playIntro(enemyDef);
  }

  // ---------- battle intro (docs/reference-analysis-2.md 4-2): VS card → send-out → "승부!" ----------
  playIntro(enemyDef) {
    const I = { vsMs: 900, sendOutMs: 500, bannerMs: 900, ...(state.data.battleIntro || {}) };
    [this.player, this.enemy].forEach((f) => f.setVisible(false));
    this.hud.setSlotsDim(true);
    const sendOut = () => {
      sfx('jump');
      [this.player, this.enemy].forEach((f) => this.sendOut(f, I.sendOutMs));
      this.time.delayedCall(I.sendOutMs, () => this.startFight(I.bannerMs));
    };
    if (this.introVs) this.vsCard(enemyDef, I.vsMs, sendOut);
    else this.time.delayedCall(250, sendOut);
  }

  vsCard(enemyDef, ms, onDone) {
    const D = state.data;
    const c = this.add.container(0, 0).setDepth(700).setScrollFactor(0);
    c.add(this.add.rectangle(0, 0, W, H, 0x07060f, 1).setOrigin(0, 0));
    const side = (def, x, flip, name, lineColor) => {
      const img = this.add.image(flip ? W + 200 : -200, 470, textureFor(this, def)).setOrigin(0.5, 0.94).setScale(300 / 512).setFlipX(flip);
      const label = this.add.text(x, 520, name, { fontFamily: FONT, fontSize: '38px', fontStyle: 'bold', color: '#ffffff' }).setOrigin(0.5).setAlpha(0);
      const line = this.add.rectangle(x, 552, 320, 5, lineColor).setAlpha(0);
      c.add([img, label, line]);
      this.tweens.add({ targets: img, x, duration: 150, ease: 'Quad.easeOut' });
      this.tweens.add({ targets: [label, line], alpha: 1, delay: 120, duration: 120 });
    };
    side(D.characters.bosomi, 300, false, D.teams.bosombosom?.name || '보솜보솜', 0x4fb4ff);
    side(enemyDef, 980, true, this.team.name, 0xff4d6d);
    c.add(this.add.text(W / 2, 130, this.match.label, { fontFamily: FONT, fontSize: '34px', fontStyle: 'bold', color: '#ffd27a' }).setOrigin(0.5));
    const vs = this.add.text(W / 2, 330, T('vsLabel', 'VS'), { fontFamily: FONT, fontSize: '110px', fontStyle: 'bold italic', color: '#ffd23f', stroke: '#1c1636', strokeThickness: 10 }).setOrigin(0.5).setScale(1.6).setAlpha(0);
    c.add(vs);
    c.add(this.add.text(W / 2, H - 40, T('clickToSkip', '클릭해서 건너뛰기'), { fontFamily: FONT, fontSize: '18px', color: '#8c86ad' }).setOrigin(0.5));
    this.tweens.add({ targets: vs, scale: 1, alpha: 1, delay: 100, duration: 160, ease: 'Back.easeOut' });
    sfx('fight');
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      this.input.off('pointerdown', finish);
      this.input.keyboard.off('keydown', onKey);
      this.tweens.add({ targets: c, alpha: 0, duration: 150, onComplete: () => c.destroy() });
      onDone();
    };
    const onKey = (ev) => { if (['Enter', 'Space', ' '].includes(ev.key) || ev.code === 'Space') finish(); };
    this.input.on('pointerdown', finish);
    this.input.keyboard.on('keydown', onKey);
    this.time.delayedCall(ms, finish);
  }

  /** White flash at the start spot, then the fighter pops in as a white silhouette and gets its colors back. */
  sendOut(f, ms) {
    const flash = this.add.ellipse(f.x, f.y - 20, 24, 24, 0xffffff, 1).setDepth(90);
    this.tweens.add({ targets: flash, scaleX: 5, scaleY: 5, alpha: 0, duration: ms * 0.6, ease: 'Cubic.easeOut', onComplete: () => flash.destroy() });
    this.time.delayedCall(ms * 0.25, () => {
      f.setVisible(true);
      f.sprite.setTintFill(0xffffff);   // (scale is driven by Fighter.render every frame)
      this.time.delayedCall(ms * 0.55, () => { if (f.sprite.active) f.restoreTint(); });
    });
  }

  startFight(bannerMs) {
    if (this.ended) return;
    this.banner(T('fight', '승부!'), { seconds: bannerMs / 1000, size: 64 });
    sfx('fight');
    this.hud.setSlotsDim(false);
    this.active = true;
  }

  /** Yellow band across the screen with dark text ("승부!", "지금이 기회!", "승리!"). */
  banner(msg, { seconds = 1.2, size = 44, y = H / 2 - 120 } = {}) {
    const c = this.add.container(W / 2, y).setDepth(320).setScrollFactor(0);
    const t = this.add.text(0, 0, msg, { fontFamily: 'Malgun Gothic, sans-serif', fontSize: `${size}px`, fontStyle: 'bold', color: '#1c1636' }).setOrigin(0.5);
    const h = size + 30;
    const bg = this.add.graphics();
    bg.fillStyle(0xffd23f, 0.95).fillRect(-W / 2, -h / 2, W, h);
    bg.fillStyle(0xffffff, 0.9).fillRect(-W / 2, -h / 2, W, 4).fillRect(-W / 2, h / 2 - 4, W, 4);
    c.add([bg, t]);
    c.setScale(1, 0);
    this.tweens.add({ targets: c, scaleY: 1, duration: 120, ease: 'Back.easeOut' });
    if (seconds > 0) this.tweens.add({ targets: c, alpha: 0, delay: seconds * 1000, duration: 220, onComplete: () => c.destroy() });
    return c;
  }

  arenaStage(stageId) {
    const st = state.data.stages[stageId] || state.data.stages.arena;
    return drawArena(this, st);
  }

  makeCheerers() {
    // Draft candidates watch from the stands above the ring (between the HP bars); open slots sit in the corner.
    this.crowd = new Crowd(this, state.data.crowd, {
      rows: [{ y: 58, x0: 466, x1: 814 }, { y: 122, x0: 466, x1: 814 }],
      unknownSpots: [{ x: 1090, y: 676 }, { x: 1140, y: 682 }, { x: 1190, y: 676 }, { x: 1240, y: 682 }],
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
    // ring-out flight plays in slow motion so the flying rival stays readable
    const dt = Math.min(deltaMs / 1000, 0.05) * (this.koTrail ? FINISH.flySlow : 1);
    this.updateRain(dt);
    if (this.freezeT > 0) { this.freezeT -= dt; return; }
    this.updateMode?.(dt);

    const p = this.player;
    const e = this.enemy;
    tickCooldowns(p.cooldowns, dt);
    tickCooldowns(e.cooldowns, dt);

    if (this.active && !this.ended) this.handlePlayerInput(dt);
    else { p.stop(); if (p.guarding) { p.guarding = false; p.setBaseTint(null); } }
    if (this.active && !this.ended && this.brain) this.brain.update(dt);

    p.update(dt);
    e.update(dt);
    this.separate(p, e);
    if (!this.ended) {
      if (p.state !== 'ko') p.aimAt(e);                      // auto-aim at the nearest (only) rival
      if (e.state !== 'ko' && !this.brain?.isTelegraphing) e.aimAt(p);
    }

    this.checkDashHits(p, e);
    this.checkDashHits(e, p);
    if (this.dizzyFx?.active) this.dizzyFx.setPosition(e.x, e.topY - 10);
    this.syncGuardAura(p);
    this.hud?.update(dt);
    this.updateKO();
  }

  /** Bodies don't overlap: push both apart on the floor (dashes pass through). */
  separate(a, b) {
    if (!a || !b || a.state === 'ko' || b.state === 'ko' || a.state === 'dash' || b.state === 'dash') return;
    if (!a.sprite.visible || !b.sprite.visible || a.z > 30 || b.z > 30) return;
    const minD = a.body + b.body;
    const d = groundDist(a.x, a.y, b.x, b.y, a.K);
    if (d >= minD) return;
    const v = knockVector(a.x, a.y, b.x, b.y, a.K);
    const push = (minD - d) / 2;
    a.x -= v.x * push; a.y -= v.y * push * a.K;
    b.x += v.x * push; b.y += v.y * push * b.K;
  }

  // ---------- input ----------
  readInput() {
    const k = this.keys;
    if (state.auto) return this.autopilot();
    return {
      left: k.LEFT.isDown || k.A.isDown,
      right: k.RIGHT.isDown || k.D.isDown,
      up: k.UP.isDown || k.W.isDown,
      down: k.DOWN.isDown || k.S.isDown,
      attack: Phaser.Input.Keyboard.JustDown(k.J),
      roll: Phaser.Input.Keyboard.JustDown(k.K),
      mimic: Phaser.Input.Keyboard.JustDown(k.L),
      guard: k.SPACE.isDown,
    };
  }

  autopilot() {
    const p = this.player; const e = this.enemy;
    const dist = groundDist(p.x, p.y, e.x, e.y, p.K);
    const v = knockVector(p.x, p.y, e.x, e.y, p.K);
    const threat = this.brain?.isTelegraphing || this.scriptThreat || this.pendingDrop;
    const inp = { left: false, right: false, up: false, down: false, attack: false, roll: false, mimic: false, guard: !!threat };
    if (threat) return inp;
    if (dist > 120) { inp.right = v.x > 0.3; inp.left = v.x < -0.3; inp.down = v.y > 0.3; inp.up = v.y < -0.3; }
    if (dist < 320 && isReady(p.cooldowns, 'spike_roll')) inp.roll = true;
    else if (p.mimicId && isReady(p.cooldowns, 'mimic') && dist < 400) inp.mimic = true;
    else if (dist <= this.S.basic_attack.range + e.body) inp.attack = true;
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
    if (p.guarding) { p.stop(); return; }

    let dx = (inp.right ? 1 : 0) - (inp.left ? 1 : 0);
    let dy = (inp.down ? 1 : 0) - (inp.up ? 1 : 0);
    const len = Math.hypot(dx, dy);
    if (len > 0) { dx /= len; dy /= len; }
    p.moveDir = len > 0 ? Math.atan2(dy, dx) : null;
    if (c.move && canAct) p.setMove(dx, dy, p.def.speed);
    else p.stop();

    if (!canAct) return;
    if (c.attack && inp.attack && isReady(p.cooldowns, 'basic_attack')) this.playerAttack();
    else if (c.skills && inp.roll && isReady(p.cooldowns, 'spike_roll')) this.playerRoll();
    else if (c.skills && inp.mimic) this.playerMimic();
  }

  onKeyDown() { /* hook for subclasses */ }

  playerAttack() {
    const p = this.player; const sk = this.S.basic_attack;
    startCooldown(p.cooldowns, sk);
    this.performSkill(p, this.enemy, sk, {});
  }

  playerRoll() {
    const p = this.player; const sk = this.S.spike_roll;
    startCooldown(p.cooldowns, sk);
    // roll where the player is steering; otherwise straight at the rival
    const angle = p.moveDir ?? p.aim;
    this.performSkill(p, this.enemy, sk, { area: { x: p.x, y: p.y, angle } });
  }

  playerMimic() {
    const p = this.player;
    if (!isReady(p.cooldowns, 'mimic')) return;
    if (!p.mimicId) { floatText(this, p.x, p.topY - 30, T('mimicEmpty', ''), { size: 20, color: '#c9c3e6' }); return; }
    const skill = this.S[p.mimicId];
    startCooldown(p.cooldowns, this.S.mimic);
    this.fx('spawn_poof', p.x, p.y, { scale: 2, tint: MIMIC_TINT });
    this.performSkill(p, this.enemy, skill, { mimic: true });
  }

  // ---------- skills ----------
  /** Where a skill lands if `user` fires it at `target` right now. */
  skillArea(user, target, skill) {
    if (skill.shape === 'circle' && skill.at === 'target') return { x: target.x, y: target.y, angle: 0 };
    return { x: user.x, y: user.y, angle: user.aim };
  }

  telegraphFx(user, skill, seconds) {
    sfx('telegraph');
    this.fx('ui_exclamation', user.x, user.topY - 30, { scale: 1.6, depth: 90 });
    user.flash(0xff3b3b, 90);
    this.time.delayedCall(180, () => user.flash(0xff3b3b, 90));
    // skill name label stays up through the wind-up and the hit
    this.hud?.showSkillLabel(user.isPlayer, skill.name, Math.max(SKILL_LABEL_SECONDS, seconds + 0.6), skill.color || '#ff4d6d');
    // Lock the area now and paint it on the floor: the player can walk out of it.
    user.telegraphMarker?.destroy();
    user.pendingArea = null;
    if (skill.type === 'drop') return; // drops paint their own marker on the target
    const target = user === this.enemy ? this.player : this.enemy;
    user.aimAt(target);
    user.pendingArea = this.skillArea(user, target, skill);
    user.telegraphMarker = showSkillArea(this, skill, user.pendingArea, user.K, { kind: 'telegraph', seconds });
  }

  performSkill(user, target, skill, opts) {
    const mimic = !!opts.mimic;
    const area = opts.area || user.pendingArea || this.skillArea(user, target, skill);
    user.pendingArea = null;
    user.telegraphMarker?.destroy(); user.telegraphMarker = null;
    const tint = mimic ? MIMIC_TINT : null;
    const flashCol = user.isPlayer ? (mimic ? MIMIC_TINT : 0xffffff) : 0xff3b3b;   // reference: own area flashes white
    const fwd = { x: Math.cos(area.angle), y: Math.sin(area.angle) };
    if (Math.abs(fwd.x) > 0.1) user.facing = fwd.x >= 0 ? 1 : -1;
    // rivals get their label at the start of the wind-up (telegraphFx)
    if (user.isPlayer) this.hud?.showSkillLabel(true, (mimic ? T('mimicPrefix', '솜 버전 ') : '') + skill.name, SKILL_LABEL_SECONDS, mimic ? '#ff7fbf' : '#4fb4ff');

    switch (skill.type) {
      case 'melee': {
        showSkillArea(this, skill, area, user.K, { kind: 'flash', seconds: 0.25, color: flashCol });
        if (skill.lunge) user.knock(fwd.x, fwd.y, skill.lunge * 3.9);
        user.punch(skill.motionMs ?? 140, skill.motionScale ?? 0.15);
        sfx('whoosh');
        if (inSkillArea(skill, area, target.x, target.y, user.K, target.body)) this.resolve(user, target, skill, opts);
        else if (skill.fx) {
          const r = (skill.range || 100) * 0.6;
          this.fx(skill.fx, area.x + fwd.x * r, area.y + fwd.y * r * user.K - 40, { scale: 2, flipX: fwd.x < 0, tint });
        }
        break;
      }
      case 'dash':
      case 'launcher': {
        const speed = skill.dashSpeed || 900;
        showSkillArea(this, skill, area, user.K, { kind: 'flash', seconds: 0.35, color: flashCol });
        sfx('whoosh');
        user.startDash(skill, area.angle, speed, (skill.length || 300) / speed);
        user.dashOpts = opts;
        if (skill.fx2) { const s = this.fx(skill.fx2, user.x, user.y, { scale: 2.2, loop: true, tint }); if (s) this.time.delayedCall(450, () => s.destroy()); }
        break;
      }
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
    const reach = (sk.width || 100) / 2 + target.body;
    if (groundDist(user.x, user.y, target.x, target.y, user.K) <= reach && target.state !== 'ko') {
      user.dashHitDone = true;
      this.resolve(user, target, sk, user.dashOpts || {});
    }
  }

  spawnDrop(user, target, skill, opts) {
    const mimic = !!opts.mimic;
    const x = target.x; const y = target.y;
    const area = { x, y, angle: 0 };
    const tele = mimic ? 0.6 : skill.telegraph;
    const box = this.add.container(x, y - 190).setDepth(95);
    const bw = 190;
    const bg = this.add.rectangle(0, 0, bw, 22, 0x1c1636).setStrokeStyle(3, 0xffffff);
    const fill = this.add.rectangle(-bw / 2 + 3, 0, (bw - 6) * 0.87, 14, mimic ? MIMIC_TINT : 0x3ddc84).setOrigin(0, 0.5);
    const label = this.add.text(0, -26, mimic ? '솜 BUILDING…' : (skill.telegraphText || ''), { fontFamily: 'Consolas, monospace', fontSize: '20px', fontStyle: 'bold', color: '#ffffff', stroke: '#1c1636', strokeThickness: 5 }).setOrigin(0.5);
    box.add([bg, fill, label]);
    const marker = showSkillArea(this, skill, area, user.K, { kind: 'telegraph', seconds: tele, color: mimic ? MIMIC_TINT : 0xff3b3b });
    this.tweens.add({ targets: fill, width: bw - 6, duration: tele * 1000 });
    this.pendingDrop = !mimic;
    sfx('telegraph');

    this.time.delayedCall(tele * 1000, () => {
      label.setText('100%');
      const block = this.add.image(x, -80, 'ram_block').setDepth(96).setScale(1.2);
      if (mimic) block.setTint(MIMIC_TINT);
      this.tweens.add({
        targets: block, y: y - 30, duration: 230, ease: 'Quad.easeIn',
        onComplete: () => {
          this.pendingDrop = false;
          box.destroy(); marker.destroy();
          sfx('drop');
          this.cameras.main.shake(220, 0.012);
          floorCrack(this, x, y, user.K, skill.radius * 0.8);
          this.fx('impacts_heavy-landing', x, y, { scale: 3, tint: mimic ? MIMIC_TINT : null });
          const hit = inSkillArea(skill, area, target.x, target.y, user.K, target.body) && target.state !== 'ko';
          const result = hit ? this.resolve(user, target, skill, { ...opts, from: area }) : null;
          if (result?.blocked) {
            floatText(this, x, y - 200, skill.guardText || 'BLOCK', { size: 34, color: '#ff4d6d' });
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
    floatText(this, user.x, user.topY - 50, mimic ? '보솜!!' : (skill.shoutText || '!!'), { size: 44, color: mimic ? '#ffb8dc' : (skill.color || '#ffffff') });
    this.cameras.main.shake(260, 0.008);
    const K = user.K;
    for (let i = 0; i < 3; i++) {
      const ring = this.add.ellipse(user.x, user.y, 80, 80 * K).setStrokeStyle(8, color, 0.9).setDepth(13);
      this.tweens.add({ targets: ring, scaleX: skill.radius / 40, scaleY: skill.radius / 40, alpha: 0, delay: i * 110, duration: 520, ease: 'Cubic.easeOut', onComplete: () => ring.destroy() });
    }
    floorCrack(this, user.x, user.y, K, 70);
    this.fx('lightning_thunderclap', user.x, user.y, { scale: 2.6, tint: mimic ? MIMIC_TINT : null });
    if (skill.fx2) this.fx(skill.fx2, user.x + user.facing * 120, user.y, { scale: 2.6, flipX: user.facing < 0, tint: mimic ? MIMIC_TINT : null });
    const where = { x: user.x, y: user.y, angle: 0 };
    if (inSkillArea(skill, where, target.x, target.y, K, target.body)) this.time.delayedCall(120, () => this.resolve(user, target, skill, opts));
  }

  /** Battle-space effect: pixelfx scale multiplied by stages.json arenaDefaults.fxScale (effects shrink with the characters). */
  fx(key, x, y, opts = {}) {
    const k = this.stage?.ring?.fxScale ?? 1;
    return playFx(this, key, x, y, { ...opts, scale: (opts.scale ?? 2.5) * k });
  }

  // ---------- spike guard visuals (skills.json guard.auraImage / burstImage; remove them to fall back to pixel fx) ----------
  syncGuardAura(p) {
    const key = this.S.guard?.auraImage;
    if (!key || !this.textures.exists(key)) return;
    const want = p.guarding && p.state !== 'ko';
    if (want && !this.guardAura) {
      this.guardAura = this.add.image(p.x, p.y, key).setDepth(16).setAlpha(0.95);
      const sc = (this.stage.ring.bodyRadius || 40) * 4.6 / this.guardAura.width;
      this.guardAura.setScale(sc * 0.6);
      this.tweens.add({ targets: this.guardAura, scale: sc, duration: 110, ease: 'Back.easeOut' });
      this.guardAura.baseScale = sc;
    } else if (!want && this.guardAura) {
      const a = this.guardAura; this.guardAura = null;
      this.tweens.add({ targets: a, alpha: 0, scale: a.baseScale * 1.2, duration: 120, onComplete: () => a.destroy() });
    }
    if (this.guardAura) this.guardAura.setPosition(p.x, p.y - 4);
  }

  /** Radial spike burst around a fighter. Returns false when the image is not available. */
  spikeBurst(f, size) {
    const key = this.S.guard?.burstImage;
    if (!key || !this.textures.exists(key)) return false;
    const img = this.add.image(f.x, f.centerY, key).setDepth(88);
    const target = (size * 1024 * (this.stage.ring.fxScale ?? 1)) / img.width;
    img.setScale(target * 0.35).setAngle(Math.random() * 30 - 15);
    this.tweens.add({ targets: img, scale: target, duration: 140, ease: 'Back.easeOut' });
    this.tweens.add({ targets: img, alpha: 0, delay: 180, duration: 220, onComplete: () => img.destroy() });
    return true;
  }

  // ---------- hit resolution ----------
  resolve(attacker, target, skill, opts = {}) {
    if (target.invuln > 0 || target.state === 'ko' || this.ended) return null;
    const r = resolveHit(skill, { guarding: target.guarding, powerScale: opts.mimic ? (this.S.mimic.powerScale ?? 1) : 1, guardSkill: this.S.guard });
    const from = opts.from || attacker;
    const v = knockVector(from.x, from.y, target.x, target.y, target.K);

    if (target.isPlayer && !attacker.isPlayer && !this.isOpening) {
      const before = target.mimicId;
      target.mimicId = nextMimicSkill(target.mimicId, skill);
      if (target.mimicId !== before) floatText(this, target.x - 40, target.topY - 50, `흉내 준비: ${this.S[target.mimicId].name}`, { size: 20, color: '#ffb8dc', duration: 1100 });
    }

    if (r.blocked) {
      sfx('guard');
      if (!this.spikeBurst(target, 0.3)) this.fx(this.S.guard.fx || 'impacts_parry', target.x, target.centerY + 30, { scale: 2.2 });
      this.onGuardBlocked?.(attacker, skill);
    }
    if (r.countered) {
      sfx('counter');
      if (target.isPlayer) this.crowd?.cheer('small');
      this.freezeT = 0.09;
      floatText(this, target.x, target.topY - 40, T('counter', '따끔!'), { size: 46, color: '#ff9a4a' });
      // thorns point back at the attacker (v = attacker → target, so flip when the attacker is on the right)
      if (!this.spikeBurst(target, 0.42)) this.fx(this.S.guard.fxCounter || 'nature_thorns', target.x - v.x * 20, target.y, { scale: 1.8, flipX: v.x > 0 });
      attacker.hp = applyDamage(attacker.hp, r.counterDamage, attacker.minHp);
      const back = knockVector(target.x, target.y, attacker.x, attacker.y, target.K);
      attacker.state = 'launched';
      attacker.knock(back.x, back.y, r.counterKnockback, 380);
      attacker.stun = Math.max(attacker.stun, 0.7);
      attacker.flash(0xffffff, 50);
      this.cameras.main.shake(SHAKE.ms, SHAKE.intensity);   // counter = big hit
      this.fx('status_stunned', attacker.x, attacker.topY - 10, { scale: 1.6 });
      this.damageNumber(attacker, r.counterDamage, '#ff9a4a');
      this.critFx(attacker);
      this.onCounter?.(attacker);
      this.afterHp(attacker);
    }

    if (r.damage > 0) {
      const heavy = r.damage >= 12;
      target.hp = applyDamage(target.hp, r.damage, target.minHp);
      target.invuln = 0.3;
      target.flash(0xffffff, 50);
      if (r.knockback) target.knock(v.x, v.y, r.knockback, r.launch ? r.launch : (heavy ? 260 : 0));
      if (r.launch) target.state = 'launched';
      if (skill.fx) this.fx(skill.fx, target.x, target.centerY + 30, { scale: heavy ? 2.8 : 2.2, flipX: v.x < 0, tint: opts.mimic ? MIMIC_TINT : null });
      if (opts.mimic) { const c = this.fx('status_confused', target.x, target.topY - 10, { scale: 1.6, loop: true }); if (c) this.time.delayedCall(900, () => c.destroy()); floatText(this, target.x + 30, target.topY - 60, '?', { size: 54, color: '#ffffff' }); }
      this.damageNumber(target, r.damage, '#ffffff', heavy);
      if (opts.mimic && attacker.isPlayer) this.critFx(target);
      sfx(heavy ? 'heavy' : 'hit');
      if (heavy && attacker.isPlayer) this.crowd?.cheer('small');
      this.freezeT = heavy ? 0.12 : 0.05;
      if (target.isPlayer || heavy) this.cameras.main.shake(SHAKE.ms, SHAKE.intensity);
      this.onHitLanded?.(attacker, target, skill);
      this.afterHp(target);
    }
    return r;
  }

  /** "급소!": one white frame + big red-outlined word (spike counter and mimic hits only). */
  critFx(f) {
    this.cameras.main.flash(50, 255, 255, 255);
    const t = this.add.text(f.x, f.topY - 50, T('crit', '급소!'), {
      fontFamily: FONT, fontSize: '54px', fontStyle: 'bold', color: '#ffffff', stroke: '#e0213b', strokeThickness: 10,
    }).setOrigin(0.5).setDepth(95);
    this.tweens.add({ targets: t, scale: { from: 1.6, to: 1 }, duration: 160, ease: 'Back.easeOut' });
    this.tweens.add({ targets: t, alpha: 0, y: t.y - 20, delay: 1000, duration: 250, onComplete: () => t.destroy() });
  }

  /** Big white number with a thick outline; barely rises, holds ~1.2 s, then fades. */
  damageNumber(f, amount, color = '#ffffff', big = false) {
    floatText(this, f.x + (Math.random() - 0.5) * 90, f.centerY - 40 - Math.random() * 30, `${amount}`, {
      size: big ? 48 : 40, color, strokeThickness: 6, rise: 14, hold: 1000, duration: 1250, depth: 85,
    });
  }

  afterHp(f) {
    let justPhase2 = false;
    if (f === this.enemy && shouldEnterPhase2(f.hp, f.maxHp, f.def.phase2, this.phase2)) { this.enterPhase2(); justPhase2 = true; }
    if (f === this.enemy && !this.ended && !this.isOpening) {
      const eligible = !justPhase2 && (!f.def.phase2 || this.phase2);
      if (shouldStagger(f.hp, f.maxHp, f.def.staggerAtHpRatio, this.staggered, eligible)) {
        if (f.hp <= 0) f.hp = 1;      // never skip the "now's your chance" beat
        this.startStagger();
      }
    }
    if (isKO(f.hp) && !this.ended) {
      if (f === this.enemy) this.startUltimate(); else this.startDefeat();
    }
  }

  // ---------- stagger ("now's your chance!") ----------
  startStagger() {
    this.staggered = true;
    const e = this.enemy;
    const secs = e.def.staggerSeconds ?? 1.5;
    this.brain?.interrupt();
    e.stun = Math.max(e.stun, secs);
    e.stop();
    sfx('telegraph');
    const msg = fillName(T('staggerText', '{name}{이/가} 비틀거린다! 지금이 기회!'), e.def.name);
    this.banner(msg, { seconds: secs, size: 36, y: 200 });
    const prevJitter = e.jitter;
    e.jitter = Math.max(prevJitter, 5);
    this.crowd?.cheer('medium');
    this.dizzyFx = this.fx('status_stunned', e.x, e.topY - 10, { scale: 1.8, loop: true, depth: 90 });
    this.time.delayedCall(secs * 1000, () => {
      this.dizzyFx?.destroy();
      this.dizzyFx = null;
      if (e.state !== 'ko') e.jitter = prevJitter;
    });
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

  // ---------- ultimate: one team-strength keyword per rival (plays before the finish) ----------
  // cut-in with the keyword (0–0.9 s) → spiked keyword plate charges above Bosomi (0.9–1.5 s)
  // → plate flies along a prism beam and stamps the rival (1.5–1.75 s) → startKO() at 2.1 s
  ultimateKeyword() {
    return T('ultimateKeywords', {})[this.team?.id] || T('ultimateName', '강점 합체');
  }

  startUltimate() {
    if (this.isOpening) { this.startKO(); return; }
    this.ended = true;
    this.freezeT = 99;
    const p = this.player; const e = this.enemy;
    const kw = this.ultimateKeyword();
    this.brain?.interrupt();
    e.telegraphMarker?.destroy();
    this.dizzyFx?.destroy(); this.dizzyFx = null;
    if (p.guarding) { p.guarding = false; p.setBaseTint(null); }
    this.syncGuardAura(p);
    const temp = [];                       // everything here is removed before the finish starts
    const at = (ms, fn) => this.time.delayedCall(ms, fn);

    // dim the world, keep both fighters lit above the dim layer
    const dim = this.add.rectangle(0, 0, W, H, 0x07060f, 1).setOrigin(0, 0).setDepth(380).setScrollFactor(0).setAlpha(0);
    temp.push(dim);
    this.tweens.add({ targets: dim, alpha: 0.72, duration: 160 });
    p.sprite.setDepth(392); e.sprite.setDepth(391);
    const cam = this.cameras.main;        // no zoom here: it would also scale the screen-fixed cut-in band

    // ① cut-in band: Bosomi portrait + "보솜보솜 필살기!" + the keyword, big
    sfx('ultCall');
    const band = this.add.container(0, 150).setDepth(420).setScrollFactor(0);
    const strip = this.add.rectangle(0, 0, W, 170, 0xffd27a).setOrigin(0, 0.5);
    const stripEdge = this.add.rectangle(0, 0, W, 184, 0xff7fbf).setOrigin(0, 0.5);
    const face = this.add.image(-260, 10, textureFor(this, p.def, p.def.imageArmored || p.def.image)).setOrigin(0.5, 0.55).setScale(0.42);
    const call = this.add.text(W / 2 + 60, -52, T('ultimateCall', '보솜보솜 필살기!'), { fontFamily: FONT, fontSize: '34px', fontStyle: 'bold', color: '#1c1636' }).setOrigin(0.5);
    const name = this.add.text(W / 2 + 60, 24, kw, { fontFamily: FONT, fontSize: kw.length > 6 ? '68px' : '80px', fontStyle: 'bold', color: '#ffffff', stroke: '#e0213b', strokeThickness: 12 }).setOrigin(0.5);
    band.add([stripEdge, strip, face, call, name]);
    band.setScale(1, 0);
    temp.push(band);
    this.tweens.add({ targets: band, scaleY: 1, duration: 140, ease: 'Back.easeOut' });
    this.tweens.add({ targets: face, x: 260, duration: 260, ease: 'Cubic.easeOut' });
    this.tweens.add({ targets: name, scale: { from: 1.6, to: 1 }, delay: 80, duration: 200, ease: 'Back.easeOut' });
    at(820, () => this.tweens.add({ targets: band, scaleY: 0, duration: 120, ease: 'Quad.easeIn' }));

    // ② the keyword becomes a spiked plate above Bosomi and charges with prism light
    const plateX = Phaser.Math.Clamp(p.x, 240, W - 240);
    const plateY = Phaser.Math.Clamp(p.topY - 90, 230, H - 160);
    const plate = this.add.container(plateX, plateY).setDepth(400).setScale(0);
    const label = this.add.text(0, 0, kw, { fontFamily: FONT, fontSize: '54px', fontStyle: 'bold', color: '#1c1636' }).setOrigin(0.5);
    const pw = label.width + 70; const ph = 92;
    const spikes = this.add.graphics();
    const n = Math.max(5, Math.round(pw / 46));
    spikes.fillStyle(0xffd27a, 1).lineStyle(4, 0xff7fbf, 1);
    for (let i = 0; i < n; i++) {
      const x = -pw / 2 + (i + 0.5) * (pw / n);
      [[-ph / 2, -1], [ph / 2, 1]].forEach(([y, dir]) => {
        spikes.fillTriangle(x - 16, y, x + 16, y, x, y + dir * 34);
        spikes.strokeTriangle(x - 16, y, x + 16, y, x, y + dir * 34);
      });
    }
    [-1, 1].forEach((side) => {
      spikes.fillTriangle(side * pw / 2, -22, side * pw / 2, 22, side * (pw / 2 + 38), 0);
      spikes.strokeTriangle(side * pw / 2, -22, side * pw / 2, 22, side * (pw / 2 + 38), 0);
    });
    spikes.setScale(0.2);
    const bg = this.add.rectangle(0, 0, pw, ph, 0xfff4e6).setStrokeStyle(7, 0xff7fbf);
    plate.add([spikes, bg, label]);
    temp.push(plate);
    at(900, () => {
      sfx('ultCard');
      this.tweens.add({ targets: plate, scale: 1, duration: 200, ease: 'Back.easeOut' });
      this.tweens.add({ targets: spikes, scale: 1, delay: 120, duration: 180, ease: 'Back.easeOut', onStart: () => sfx('ultCard') });
      const glow = this.fx('holy_sunburst', plateX, plateY, { scale: 2.2, depth: 399 });
      if (glow) temp.push(glow);
      p.flash(0xfff27a, 120);
    });
    at(1250, () => { sfx('ultCard'); this.tweens.add({ targets: plate, scale: 1.12, duration: 110, yoyo: true }); });

    // ③ fire: prism beam toward the rival, the plate rides it and stamps the rival
    at(1500, () => {
      sfx('whoosh');
      const ang = Math.atan2(e.centerY - plateY, e.x - plateX);
      const len = Math.hypot(e.x - plateX, e.centerY - plateY);
      const beam = this.add.container(plateX, plateY).setDepth(396).setRotation(ang).setScale(0, 1);
      const g = this.add.graphics();
      [[0xff7fbf, 46], [0xffd27a, 30], [0xfff4e6, 15]].forEach(([col, half]) => g.fillStyle(col, 1).fillTriangle(0, -half, 0, half, len + 40, 0));
      beam.add(g);
      temp.push(beam);
      this.tweens.add({ targets: beam, scaleX: 1, duration: 220, ease: 'Quad.easeIn' });
      this.tweens.add({ targets: plate, x: e.x, y: e.centerY - 10, angle: e.x >= plateX ? 8 : -8, duration: 220, ease: 'Quad.easeIn' });
    });
    at(1730, () => {
      sfx('ultFire');
      cam.flash(90, 255, 255, 255);
      cam.shake(280, 0.018);
      e.flash(0xffffff, 180);
      this.spikeBurst(e, 0.55);
      this.fx('impacts_crit-hit', e.x, e.centerY, { scale: 3.2, depth: 397 });
      this.tweens.add({ targets: plate, scaleX: 1.3, scaleY: 0.8, duration: 70, yoyo: true });
    });

    // ④ clean up and hand over to the finish sequence
    at(2100, () => {
      temp.forEach((o) => o.destroy());
      p.render(); e.render();
      this.startKO();
    });
  }

  // ---------- KO / defeat ----------
  // Finish: impact cut (0.2 s) → vignette + zoom (0.8 s) → smash-style ring-out → "장외!" + "승리!"
  startKO() {
    this.ended = true;
    const e = this.enemy; const p = this.player;
    const v = knockVector(p.x, p.y, e.x, e.y, e.K);
    this.freezeT = 99;                      // world stands still until the launch
    this.starShown = false;
    this.koDir = v;
    e.state = 'ko';
    e.jitter = 0;
    e.telegraphMarker?.destroy();
    this.dizzyFx?.destroy(); this.dizzyFx = null;
    sfx('finish');
    const cut = this.impactCut(e);

    this.time.delayedCall(FINISH.cutMs, () => {
      cut.destroy();
      const cam = this.cameras.main;
      const vignette = this.addVignette();
      cam.zoomTo(FINISH.zoom, 140, 'Quad.easeOut');
      cam.pan(W / 2 + (e.x - W / 2) * 0.5, H / 2 + (e.centerY - H / 2) * 0.5, 140, 'Quad.easeOut');
      [p, e].forEach((f, i) => {
        for (let k = 0; k < 2; k++) {
          const ring = this.add.ellipse(f.x, f.y, 70, 70 * f.K).setStrokeStyle(6, 0xffffff, 0.95).setDepth(110);
          this.tweens.add({ targets: ring, scaleX: 3.2, scaleY: 3.2, alpha: 0, delay: k * 220 + i * 60, duration: 520, ease: 'Cubic.easeOut', onComplete: () => ring.destroy() });
        }
      });
      if (this.phase2) { setGrey(e.sprite, false); floatText(this, W / 2, 240, T('phase2Clear', ''), { size: 40, color: '#ffffff', duration: 1600 }); }

      this.time.delayedCall(FINISH.zoomMs, () => {
        cam.zoomTo(1, 150, 'Quad.easeOut');
        cam.pan(W / 2, H / 2, 150, 'Quad.easeOut');
        this.removeVignette(vignette);
        sfx('launch');
        this.fx('explosions_cartoon-pow', e.x, e.centerY, { scale: 2.6, depth: 121 });
        // smash-style ring-out: fly off the ring and out of the screen
        e.knockVx = v.x * FINISH.flySpeed;
        e.knockVy = v.y * FINISH.flySpeed * e.K;
        e.vz = 1250;
        e.facing = v.x >= 0 ? -1 : 1;
        e.sprite.setDepth(140);
        this.koTrail = this.time.addEvent({ delay: FINISH.trailMs, loop: true, callback: () => this.koTrailStar(e) });
        this.freezeT = 0;
      });
    });
    this.koSafety = this.time.delayedCall(FINISH.cutMs + FINISH.zoomMs + 1800, () => { if (!this.starShown) this.updateKO(true); });
  }

  /** Small fading star left behind the flying rival. */
  koTrailStar(f) {
    const s = this.add.star(f.x + (Math.random() - 0.5) * 20, f.y - f.z - f.spriteHeight * 0.4, 5, 5, 13, 0xfff27a).setDepth(139).setStrokeStyle(2, 0xffffff);
    this.tweens.add({ targets: s, scale: 0.2, alpha: 0, angle: 120, duration: 420, onComplete: () => s.destroy() });
  }

  /** Full-screen black frame: speed lines, star burst, the rival close-up and "{name} 날려버렸다!". */
  impactCut(f) {
    const x = Phaser.Math.Clamp(f.x, 300, W - 300); const y = Phaser.Math.Clamp(f.centerY, 220, H - 260);
    const c = this.add.container(0, 0).setDepth(600).setScrollFactor(0);
    const g = this.add.graphics();
    g.fillStyle(0x000000, 1).fillRect(0, 0, W, H);
    g.fillStyle(0xffffff, 1);
    const n = 30;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + Math.random() * 0.1;
      const spread = 0.025 + Math.random() * 0.03;
      const r0 = 110 + Math.random() * 90;
      const r1 = 1500;
      g.fillTriangle(
        x + Math.cos(a) * r0, y + Math.sin(a) * r0,
        x + Math.cos(a - spread) * r1, y + Math.sin(a - spread) * r1,
        x + Math.cos(a + spread) * r1, y + Math.sin(a + spread) * r1,
      );
    }
    const star = this.add.star(x, y, 8, 34, 110, 0xfff27a).setStrokeStyle(6, 0xffffff);
    // the rival being sent flying: white silhouette for one beat, then its own colors, tilted away from the hit
    const who = this.add.image(x, y, f.sprite.texture.key)
      .setOrigin(0.5, 0.55).setScale(f.baseScale * 3.8).setFlipX(f.sprite.flipX).setAngle(-14 * f.facing).setTintFill(0xffffff);
    this.time.delayedCall(90, () => { if (who.active) who.clearTint(); });
    this.tweens.add({ targets: who, scale: { from: f.baseScale * 4.5, to: f.baseScale * 3.8 }, duration: 160, ease: 'Back.easeOut' });
    this.tweens.add({ targets: who, x: x + 7, duration: 45, yoyo: true, repeat: Math.floor(FINISH.cutMs / 90) });
    const label = this.add.text(W / 2, H - 120, fillName(T('finishCut', '{name}{을/를} 날려버렸다!'), f.def.name), {
      fontFamily: 'Malgun Gothic, sans-serif', fontSize: '68px', fontStyle: 'bold', color: '#ff3b3b', stroke: '#ffffff', strokeThickness: 10,
    }).setOrigin(0.5);
    this.tweens.add({ targets: label, scale: { from: 1.4, to: 1 }, duration: 180, ease: 'Back.easeOut' });
    c.add([g, star, who, label]);
    return c;
  }

  addVignette() {
    try {
      if (this.cameras.main.postFX) return { fx: this.cameras.main.postFX.addVignette(0.5, 0.5, 0.42, 0.55) };
    } catch (err) { console.warn('[battle] vignette unavailable', err); }
    // canvas fallback: dark frame
    const g = this.add.graphics().setDepth(250).setScrollFactor(0);
    g.lineStyle(140, 0x000000, 0.45).strokeRect(0, 0, W, H);
    return { g };
  }

  removeVignette(v) {
    if (v?.fx) this.cameras.main.postFX.remove(v.fx);
    v?.g?.destroy();
  }

  updateKO(force = false) {
    if (!this.ended || this.enemy.state !== 'ko' || this.starShown) return;
    const e = this.enemy;
    const sy0 = e.y - e.z;
    if (force || e.x < -80 || e.x > W + 80 || sy0 < -120 || sy0 > H + 160) {
      this.starShown = true;
      this.koTrail?.remove(); this.koTrail = null;
      const sx = Phaser.Math.Clamp(e.x, 60, W - 60);
      const sy = Phaser.Math.Clamp(sy0, 60, H - 120);
      const star = this.add.star(sx, sy, 5, 10, 26, 0xfff27a).setDepth(150);
      this.tweens.add({ targets: star, scale: { from: 0.2, to: 2.2 }, angle: 180, alpha: { from: 1, to: 0 }, duration: 700, ease: 'Cubic.easeOut' });
      this.fx('explosions_firework-burst', sx, sy + 40, { scale: 1.6, depth: 149 });
      sfx('ringout');
      this.crowd?.cheer('big');
      txt(this, W / 2, H / 2 - 60, fillName(T('ko', '{name} 장외!'), e.def.name), { size: 72, color: '#fff27a', depth: 300 });
      this.fx('ui_confetti', W / 2, H / 2 + 40, { scale: 3, depth: 290 });
      this.time.delayedCall(450, () => { sfx('victory'); this.banner(T('victory', '승리!'), { seconds: 0, size: 56, y: H / 2 + 70 }); });
      this.time.delayedCall(1700, () => this.finishMatch());
    }
  }

  finishMatch() {
    state.retryCount = 0;
    if (isFinalMatch(this.matchIndex)) {
      // the final rival (noise cleared) celebrates with us in the ending
      if (!state.cheerers.includes(this.team.characterId)) state.cheerers.push(this.team.characterId);
      goTo(this, 'ChampionScene', {}, 400);
    }
    else goTo(this, 'CheerScene', { matchIndex: this.matchIndex, opponentTeamId: this.team.id }, 300);
  }

  startDefeat() {
    this.ended = true;
    const p = this.player;
    sfx('lose');
    this.freezeT = 0.25;
    p.state = 'ko';
    const v = knockVector(this.enemy.x, this.enemy.y, p.x, p.y, p.K);
    p.knockVx = v.x * 400; p.knockVy = v.y * 400 * p.K; p.vz = 700;
    this.time.delayedCall(450, () => {
      txt(this, W / 2, H / 2 - 40, T('retry', '다시 한 번!'), { size: 70, color: '#ffd27a', depth: 300 });
    });
    this.time.delayedCall(1500, () => {
      state.retryCount += 1;
      this.scene.restart({ matchIndex: this.matchIndex });
    });
  }
}
