import { isReady, startCooldown } from './rules.js';

// Rival AI: approach → jab, or telegraph and fire the signature skill when ready.
export class EnemyBrain {
  constructor(scene, enemy, player, skills) {
    this.scene = scene;
    this.enemy = enemy;
    this.player = player;
    this.skills = skills;
    this.pool = enemy.def.signatureSkillId ? [skills[enemy.def.signatureSkillId]] : [];
    this.jab = skills.enemy_jab;
    this.state = 'think';
    this.timer = 1.0;
    this.pending = null;
    this.speedScale = 1;
    this.cooldownScale = 1;
    this.telegraphScale = 1;
    this.enabled = true;
    // first signature comes quickly so the audience sees it
    this.pool.forEach((s) => { enemy.cooldowns[s.id] = 1.6; });
  }

  enterPhase2(phase2) {
    this.speedScale = phase2.speedScale || 1.3;
    this.cooldownScale = phase2.cooldownScale || 0.6;
    this.telegraphScale = 0.8;
    (phase2.extraSkillIds || []).forEach((id) => {
      const s = this.skills[id];
      if (s && !this.pool.includes(s)) { this.pool.push(s); this.enemy.cooldowns[id] = 1.2 + this.pool.length * 0.8; }
    });
  }

  get isTelegraphing() { return this.state === 'telegraph'; }

  pickSignature(dist) {
    const ready = this.pool.filter((s) => isReady(this.enemy.cooldowns, s.id) && this.fits(s, dist));
    return ready.length ? ready[Math.floor(Math.random() * ready.length)] : null;
  }

  fits(skill, dist) {
    if (skill.type === 'drop') return true;
    if (skill.type === 'shockwave') return dist < skill.range * 0.8;
    if (skill.type === 'launcher') return dist < 460;
    return dist < (skill.range || 120) + 10;
  }

  update(dt) {
    const e = this.enemy;
    const p = this.player;
    if (!this.enabled || e.state === 'ko' || e.state === 'launched' || e.state === 'dash') { if (e.state !== 'dash') e.moveVx = 0; return; }
    if (e.stun > 0) { e.moveVx = 0; return; }
    const dist = Math.abs(p.x - e.x);

    if (this.state === 'think') {
      e.faceTowards(p.x);
      this.timer -= dt;
      const sig = this.timer <= 0 ? this.pickSignature(dist) : null;
      if (sig) { this.beginTelegraph(sig); return; }
      if (dist > 115) {
        e.moveVx = e.facing * e.def.speed * this.speedScale;
      } else {
        e.moveVx = 0;
        if (this.timer <= 0 && isReady(e.cooldowns, this.jab.id)) this.beginTelegraph(this.jab);
      }
    } else if (this.state === 'telegraph') {
      e.moveVx = 0;
      this.timer -= dt;
      if (this.timer <= 0) {
        const skill = this.pending;
        startCooldown(e.cooldowns, skill, skill === this.jab ? 1 : this.cooldownScale);
        e.faceTowards(p.x);
        this.scene.performSkill(e, p, skill, {});
        this.state = 'recover';
        this.timer = skill === this.jab ? 0.35 : 0.6;
      }
    } else if (this.state === 'recover') {
      e.moveVx = 0;
      this.timer -= dt;
      if (this.timer <= 0) { this.state = 'think'; this.timer = 0.25 + Math.random() * 0.35; }
    }
  }

  beginTelegraph(skill) {
    this.state = 'telegraph';
    this.pending = skill;
    const base = skill.type === 'drop' ? 0.35 : (skill.telegraph || 0.3);
    this.timer = base * this.telegraphScale;
    this.enemy.moveVx = 0;
    this.scene.telegraphFx(this.enemy, skill, this.timer);
  }
}
