import { createCharacterSprite, textureFor } from '../ui/characterView.js';

const GRAVITY = 2400;

// A character on the stage: simple custom physics + its sprite view.
export class Fighter {
  constructor(scene, def, { x, facing = 1, isPlayer = false, stage, imageKey }) {
    this.scene = scene;
    this.def = def;
    this.isPlayer = isPlayer;
    this.stage = stage;
    this.x = x;
    this.y = stage.floorY;
    this.vy = 0;
    this.moveVx = 0;
    this.knockVx = 0;
    this.facing = facing;
    this.maxHp = def.maxHp;
    this.hp = def.maxHp;
    this.minHp = 0;
    this.onGround = true;
    this.guarding = false;
    this.state = 'idle';     // idle | dash | launched | ko | busy
    this.dashTimer = 0;
    this.dashSkill = null;
    this.dashHitDone = false;
    this.invuln = 0;
    this.stun = 0;
    this.cooldowns = {};
    this.baseScale = def.scale || 0.4;
    this.speedScale = 1;
    this.jitter = 0;

    this.shadow = scene.add.ellipse(x, this.y + 4, 120 * this.baseScale * 2.2, 22, 0x000000, 0.35).setDepth(19);
    this.sprite = createCharacterSprite(scene, def, x, this.y, imageKey).setDepth(20);
    this.sprite.setFlipX(facing < 0);
  }

  setTexture(imageKey) {
    this.sprite.setTexture(textureFor(this.scene, this.def, imageKey));
  }

  get onPlatform() {
    return this.x >= this.stage.platformLeft && this.x <= this.stage.platformRight;
  }

  get centerY() { return this.y - 512 * this.baseScale * 0.42; }

  faceTowards(otherX) {
    if (this.state === 'dash' || this.state === 'launched' || this.state === 'ko') return;
    this.facing = otherX >= this.x ? 1 : -1;
  }

  jump(power) {
    if (!this.onGround || this.guarding) return false;
    this.vy = -power;
    this.onGround = false;
    return true;
  }

  knock(vx, vy = 0) {
    this.knockVx = vx;
    if (vy) { this.vy = vy; this.onGround = false; }
  }

  startDash(skill, speed, duration) {
    this.state = 'dash';
    this.dashSkill = skill;
    this.dashTimer = duration;
    this.dashHitDone = false;
    this.knockVx = this.facing * speed;
  }

  update(dt) {
    if (this.invuln > 0) this.invuln -= dt;
    if (this.stun > 0) this.stun -= dt;

    if (this.state === 'dash') {
      this.dashTimer -= dt;
      if (this.dashTimer <= 0) { this.state = 'idle'; this.dashSkill = null; this.knockVx *= 0.2; }
    }

    const vx = (this.state === 'dash' ? 0 : this.moveVx) + this.knockVx;
    this.x += vx * dt;
    if (this.state !== 'dash' && this.state !== 'ko') this.knockVx *= Math.pow(0.02, dt); // fast decay (KO flight keeps its speed)

    this.vy += GRAVITY * dt;
    this.y += this.vy * dt;

    if (this.state !== 'ko') {
      // Stay on the platform: ring-outs only happen through the KO launch.
      const margin = 40;
      this.x = Phaser.Math.Clamp(this.x, this.stage.platformLeft + margin, this.stage.platformRight - margin);
      if (this.y >= this.stage.floorY) {
        this.y = this.stage.floorY; this.vy = 0; this.onGround = true;
        if (this.state === 'launched') this.state = 'idle';
      } else this.onGround = false;
    }

    this.render(dt);
  }

  render() {
    const s = this.sprite;
    const jx = this.jitter ? (Math.random() - 0.5) * this.jitter : 0;
    s.x = this.x + jx;
    s.y = this.y;
    s.setFlipX(this.facing < 0);
    if (this.state === 'ko') {
      s.rotation += 0.35 * this.facing;
    } else if (this.state === 'dash' && this.isPlayer) {
      s.rotation += 0.55 * this.facing;          // spike roll
      s.setScale(this.baseScale * 0.9);
    } else {
      s.rotation = 0;
      const squash = this.guarding ? 0.82 : 1;
      const stretch = this.guarding ? 1.08 : 1;
      s.setScale(this.baseScale * stretch, this.baseScale * squash);
    }
    this.shadow.x = this.x;
    this.shadow.y = this.stage.floorY + 4;
    const h = Math.max(0, this.stage.floorY - this.y);
    this.shadow.setVisible(this.onPlatform && this.state !== 'ko');
    this.shadow.setScale(Math.max(0.3, 1 - h / 400));
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

  destroy() {
    this.sprite.destroy();
    this.shadow.destroy();
  }
}
