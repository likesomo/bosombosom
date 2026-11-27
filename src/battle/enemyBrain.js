import { isReady, startCooldown, groundDist, knockVector, skillReach } from './rules.js';

// Rival AI on the top-down arena: approach (with a little strafing) → jab,
// or lock a floor marker and fire the signature skill when ready.
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
    this.strafeSeed = Math.random() * 10;
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

  /** Cancel a skill being wound up (stagger). The rival stands still while `enemy.stun` lasts. */
  interrupt() {
    const e = this.enemy;
    e.telegraphMarker?.destroy();
    e.telegraphMarker = null;
    e.pendingArea = null;
    this.pending = null;
    this.state = 'recover';
    this.timer = 0.3;
    e.stop();
  }

  get jabReach() { return skillReach(this.jab) + this.player.body - 12; }

  pickSignature(dist) {
    const ready = this.pool.filter((s) => isReady(this.enemy.cooldowns, s.id) && this.fits(s, dist));
    return ready.length ? ready[Math.floor(Math.random() * ready.length)] : null;
  }

  fits(skill, dist) {
    const reach = skillReach(skill);
    if (reach === Infinity) return true;                         // placed on the target
    if (skill.shape === 'circle') return dist < reach * 0.85;     // around self
    if (skill.shape === 'dash') return dist < reach * 0.9 && dist > 90;
    return dist < reach + this.player.body;
  }

  update(dt) {
    const e = this.enemy;
    const p = this.player;
    if (!this.enabled || e.state === 'ko' || e.state === 'launched' || e.state === 'dash') { if (e.state !== 'dash') e.stop(); return; }
    if (e.stun > 0) { e.stop(); return; }
    const dist = groundDist(e.x, e.y, p.x, p.y, e.K);

    if (this.state === 'think') {
      this.timer -= dt;
      const sig = this.timer <= 0 ? this.pickSignature(dist) : null;
      if (sig) { this.beginTelegraph(sig); return; }
      if (dist > this.jabReach - 10) {
        // walk toward the player, drifting sideways a bit so it reads as a 2D fight
        const v = knockVector(e.x, e.y, p.x, p.y, e.K);
        const t = this.scene.time.now / 1000 + this.strafeSeed;
        const side = Math.sin(t * 1.3) * 0.45;
        let mx = v.x - v.y * side; let my = v.y + v.x * side;
        const len = Math.hypot(mx, my) || 1; mx /= len; my /= len;
        e.setMove(mx, my, e.def.speed * this.speedScale);
      } else {
        e.stop();
        if (this.timer <= 0 && isReady(e.cooldowns, this.jab.id)) this.beginTelegraph(this.jab);
      }
    } else if (this.state === 'telegraph') {
      e.stop();
      this.timer -= dt;
      if (this.timer <= 0) {
        const skill = this.pending;
        startCooldown(e.cooldowns, skill, skill === this.jab ? 1 : this.cooldownScale);
        this.scene.performSkill(e, p, skill, {});
        this.state = 'recover';
        this.timer = skill === this.jab ? 0.4 : 0.6;
      }
    } else if (this.state === 'recover') {
      e.stop();
      this.timer -= dt;
      if (this.timer <= 0) { this.state = 'think'; this.timer = 0.25 + Math.random() * 0.35; }
    }
  }

  beginTelegraph(skill) {
    this.state = 'telegraph';
    this.pending = skill;
    const base = skill.type === 'drop' ? 0.35 : (skill.telegraph || 0.3);
    this.timer = base * this.telegraphScale;
    this.enemy.stop();
    this.enemy.aimAt(this.player);
    this.scene.telegraphFx(this.enemy, skill, this.timer);
  }
}
