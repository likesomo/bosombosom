import { createCharacterSprite, textureFor } from '../ui/characterView.js';
import { FONT } from '../ui/common.js';
import { clampToRing } from './rules.js';

const GRAVITY = 2400;      // on the height axis (z) only: drops, launches, KO flights
const BODY = 40;           // fallback body radius in ground px (stages.json arenaDefaults.bodyRadius)

// A character on the top-down arena: (x, y) is the foot position on the floor in screen px,
// z is height above the floor. Knock/move velocities are screen px per second.
export class Fighter {
  constructor(scene, def, { x, y, facing = 1, isPlayer = false, stage, imageKey }) {
    this.scene = scene;
    this.def = def;
    this.isPlayer = isPlayer;
    this.stage = stage;
    this.ring = stage.ring;
    this.K = stage.ring.perspective;
    this.x = x;
    this.y = y ?? stage.ring.cy;
    this.z = 0;
    this.vz = 0;
    this.moveVx = 0;
    this.moveVy = 0;
    this.knockVx = 0;
    this.knockVy = 0;
    this.aim = facing > 0 ? 0 : Math.PI;   // ground-space angle the fighter is aiming at
    this.facing = facing;
    this.maxHp = def.maxHp;
    this.hp = def.maxHp;
    this.minHp = 0;
    this.guarding = false;
    this.state = 'idle';     // idle | dash | launched | ko | busy
    this.dashTimer = 0;
    this.dashSkill = null;
    this.dashHitDone = false;
    this.punchT = 0;         // melee swing pose, applied in render() so it shows on the input frame
    this.punchDur = 0;
    this.punchAmt = 0;
    this.invuln = 0;
    this.stun = 0;
    this.cooldowns = {};
    this.body = stage.ring.bodyRadius || BODY;
    this.baseScale = (def.scale || 0.4) * (stage.ring.unitScale || 1);
    this.jitter = 0;
    this.keepInRing = true;

    const footColor = isPlayer ? 0x4fb4ff : 0xff4d6d;
    const footW = (stage.ring.bodyRadius || BODY) * 2.4;
    this.shadow = scene.add.ellipse(x, this.y, footW * 1.05, footW * 1.05 * this.K * 0.5, 0x000000, 0.32).setDepth(14);
    this.foot = scene.add.ellipse(x, this.y, footW, footW * this.K * 0.5).setStrokeStyle(3, footColor, 0.95).setDepth(15);
    this.sprite = createCharacterSprite(scene, def, x, this.y, imageKey).setScale(this.baseScale).setDepth(30);
    this.sprite.setFlipX(facing < 0);
    this.nameTag = scene.add.text(x, this.y, def.name, {
      fontFamily: FONT, fontSize: '17px', fontStyle: 'bold', color: '#ffffff', stroke: '#1c1636', strokeThickness: 4,
    }).setOrigin(0.5, 1).setDepth(75);
  }

  setTexture(imageKey) {
    this.sprite.setTexture(textureFor(this.scene, this.def, imageKey));
  }

  get onGround() { return this.z <= 0; }
  get spriteHeight() { return 512 * this.baseScale * 0.9; }
  get centerY() { return this.y - this.z - this.spriteHeight * 0.45; }
  get topY() { return this.y - this.z - this.spriteHeight; }

  /** Aim at another fighter (auto-aim). */
  aimAt(other) {
    if (this.state === 'dash' || this.state === 'launched' || this.state === 'ko') return;
    this.aim = Math.atan2((other.y - this.y) / this.K, other.x - this.x);
    if (Math.abs(other.x - this.x) > 4) this.facing = other.x >= this.x ? 1 : -1;
  }

  faceTowards(otherX) { // kept for scripted scenes
    if (this.state === 'dash' || this.state === 'launched' || this.state === 'ko') return;
    this.facing = otherX >= this.x ? 1 : -1;
  }

  /** Move with a ground-space direction (unit or zero vector) at `speed` ground px/s. */
  setMove(dx, dy, speed) {
    this.moveVx = dx * speed;
    this.moveVy = dy * speed * this.K;
  }

  stop() { this.moveVx = 0; this.moveVy = 0; }

  /** Melee swing pose: stretch forward and back over `ms`. */
  punch(ms, amount) {
    this.punchDur = ms / 1000;
    this.punchT = this.punchDur;
    this.punchAmt = amount;
  }

  /** Push along a ground-space unit vector with `power` ground px/s, optional lift (z speed). */
  knock(ux, uy, power, lift = 0) {
    this.knockVx = ux * power;
    this.knockVy = uy * power * this.K;
    if (lift) this.vz = lift;
  }

  startDash(skill, angle, speed, duration) {
    this.state = 'dash';
    this.dashSkill = skill;
    this.dashTimer = duration;
    this.dashHitDone = false;
    this.aim = angle;
    if (Math.abs(Math.cos(angle)) > 0.1) this.facing = Math.cos(angle) >= 0 ? 1 : -1;
    this.knockVx = Math.cos(angle) * speed;
    this.knockVy = Math.sin(angle) * speed * this.K;
  }

  update(dt) {
    if (this.invuln > 0) this.invuln -= dt;
    if (this.stun > 0) this.stun -= dt;
    if (this.punchT > 0) this.punchT = Math.max(0, this.punchT - dt);

    if (this.state === 'dash') {
      this.dashTimer -= dt;
      if (this.dashTimer <= 0) { this.state = 'idle'; this.dashSkill = null; this.knockVx *= 0.15; this.knockVy *= 0.15; }
    }

    const moving = this.state !== 'dash' && this.state !== 'ko' && this.state !== 'launched';
    this.x += ((moving ? this.moveVx : 0) + this.knockVx) * dt;
    this.y += ((moving ? this.moveVy : 0) + this.knockVy) * dt;
    if (this.state !== 'dash' && this.state !== 'ko') {
      const decay = Math.pow(0.02, dt); // fast decay (KO flight keeps its speed)
      this.knockVx *= decay; this.knockVy *= decay;
    }

    if (this.z > 0 || this.vz > 0) {
      this.vz -= GRAVITY * dt;
      this.z += this.vz * dt;
      if (this.z <= 0 && this.state !== 'ko') {
        this.z = 0; this.vz = 0;
        if (this.state === 'launched') this.state = 'idle';
      }
    } else if (this.state === 'launched' && this.stun <= 0) this.state = 'idle';

    if (this.state !== 'ko' && this.keepInRing) {
      // Stay inside the ring: ring-outs only happen through the KO launch.
      const c = clampToRing(this.ring, this.x, this.y, this.body);
      if (c.clamped) { this.x = c.x; this.y = c.y; this.knockVx *= 0.3; this.knockVy *= 0.3; }
    }

    this.render(dt);
  }

  render() {
    const s = this.sprite;
    const jx = this.jitter ? (Math.random() - 0.5) * this.jitter : 0;
    // swing curve 0 → 1 → 0; the first frame already sits near the peak
    const swing = this.punchT > 0 ? Math.sin(Math.PI * (0.35 + 0.65 * (this.punchDur - this.punchT) / this.punchDur)) : 0;
    s.x = this.x + jx + swing * 6 * this.facing;
    s.y = this.y - this.z;
    s.setDepth(30 + (this.y / 720) * 40);
    s.setFlipX(this.facing < 0);
    if (this.state === 'ko') {
      s.rotation += 0.35 * this.facing;
    } else if (this.state === 'dash' && this.isPlayer) {
      s.rotation += 0.55 * this.facing;          // spike roll
      s.setScale(this.baseScale * 0.9);
    } else {
      s.rotation = 0;
      const squash = this.guarding ? 0.82 : 1;
      const stretch = (this.guarding ? 1.08 : 1) * (1 + swing * this.punchAmt);
      s.setScale(this.baseScale * stretch, this.baseScale * squash);
    }
    const onFloor = this.state !== 'ko' || this.z < 40;
    this.shadow.setPosition(this.x, this.y).setVisible(s.visible && onFloor);
    this.shadow.setScale(Math.max(0.35, 1 - this.z / 500));
    this.foot.setPosition(this.x, this.y).setVisible(s.visible && this.state !== 'ko');
    this.nameTag.setPosition(this.x, this.topY - 6).setVisible(s.visible && s.alpha > 0.2 && this.state !== 'ko');
  }

  flash(color = 0xff5a5a, ms = 110) {
    this.sprite.setTintFill(color);
    this.scene.time.delayedCall(ms, () => { if (this.sprite.active) this.restoreTint(); });
  }

  restoreTint() {
    if (this.baseTint) this.sprite.setTint(this.baseTint); else this.sprite.clearTint();
  }

  setBaseTint(color) {
    this.baseTint = color;
    this.restoreTint();
  }

  setVisible(v) {
    this.sprite.setVisible(v);
    this.render();
  }

  destroy() {
    this.sprite.destroy();
    this.shadow.destroy();
    this.foot.destroy();
    this.nameTag.destroy();
  }
}
