// Pure battle rules. No Phaser here: damage, guard/counter, cooldowns, phase and KO decisions.

export const CONTACT_TYPES = ['melee', 'dash', 'launcher'];

/**
 * Resolve one hit.
 * @param {object} skill   skill data (power, knockback, type, guard* scales)
 * @param {object} ctx     { guarding, powerScale=1, guardSkill }
 * @returns {{damage:number, knockback:number, blocked:boolean, countered:boolean, counterDamage:number, counterKnockback:number, launch:number}}
 */
export function resolveHit(skill, ctx = {}) {
  const powerScale = ctx.powerScale ?? 1;
  const base = Math.round((skill.power || 0) * powerScale);
  const kb = skill.knockback || 0;
  const out = { damage: base, knockback: kb, blocked: false, countered: false, counterDamage: 0, counterKnockback: 0, launch: skill.launch || 0 };
  if (!ctx.guarding) return out;

  const g = ctx.guardSkill || {};
  if (CONTACT_TYPES.includes(skill.type)) {
    // Spike guard: contact attacks bounce off and hurt the attacker ("따끔!").
    return { ...out, damage: 0, knockback: 0, launch: 0, blocked: true, countered: true,
      counterDamage: g.counterPower || 0, counterKnockback: g.counterKnockback || 0 };
  }
  if (skill.type === 'drop') {
    return { ...out, damage: 0, knockback: 0, blocked: true };
  }
  if (skill.type === 'shockwave') {
    return { ...out, blocked: true,
      damage: Math.round(base * (skill.guardDamageScale ?? 0.3)),
      knockback: kb * (skill.guardKnockbackScale ?? 0.3) };
  }
  return { ...out, damage: 0, knockback: 0, blocked: true };
}

export function applyDamage(hp, damage, minHp = 0) {
  return Math.max(minHp, hp - Math.max(0, damage));
}

export function tickCooldowns(cooldowns, dt) {
  for (const k of Object.keys(cooldowns)) cooldowns[k] = Math.max(0, cooldowns[k] - dt);
  return cooldowns;
}

export function isReady(cooldowns, id) {
  return !cooldowns[id] || cooldowns[id] <= 0;
}

export function startCooldown(cooldowns, skill, scale = 1) {
  cooldowns[skill.id] = (skill.cooldown || 0) * scale;
}

export function cooldownRatio(cooldowns, skill) {
  if (!skill || !skill.cooldown) return 0;
  return Math.min(1, (cooldowns[skill.id] || 0) / skill.cooldown);
}

export function shouldEnterPhase2(hp, maxHp, phase2, alreadyInPhase2) {
  return !!phase2 && !alreadyInPhase2 && hp > 0 && hp / maxHp <= (phase2.atHpRatio ?? 0.5);
}

/**
 * Stagger ("now's your chance!") fires once when the rival's HP falls to `atHpRatio` or below.
 * `eligible` is false while it must wait (e.g. the final rival before phase 2).
 * A hit that would skip straight past the threshold to 0 still staggers: the caller keeps 1 HP.
 */
export function shouldStagger(hp, maxHp, atHpRatio, alreadyStaggered, eligible = true) {
  if (!(atHpRatio > 0) || alreadyStaggered || !eligible || !(maxHp > 0)) return false;
  return hp / maxHp <= atHpRatio;
}

export function isKO(hp) { return hp <= 0; }

// ---------- top-down arena geometry ----------
// Positions are screen px. The floor is seen at an angle, so one screen px on the y axis
// covers 1/K ground px (K = ring.perspective). All ranges in skills.json are ground px.

/** Ground-space offset from a to b. */
export function groundDelta(ax, ay, bx, by, K = 1) {
  return { dx: bx - ax, dy: (by - ay) / K };
}

export function groundDist(ax, ay, bx, by, K = 1) {
  const d = groundDelta(ax, ay, bx, by, K);
  return Math.hypot(d.dx, d.dy);
}

/** Ground-space angle (radians) from a toward b. */
export function aimAngle(ax, ay, bx, by, K = 1) {
  const d = groundDelta(ax, ay, bx, by, K);
  return Math.atan2(d.dy, d.dx);
}

/** Unit vector in ground space from a toward b (defaults to +x when overlapping). */
export function knockVector(ax, ay, bx, by, K = 1) {
  const d = groundDelta(ax, ay, bx, by, K);
  const len = Math.hypot(d.dx, d.dy);
  return len < 1e-3 ? { x: bx >= ax ? 1 : -1, y: 0 } : { x: d.dx / len, y: d.dy / len };
}

function angleDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return Math.abs(d);
}

/** Circle area centered at (cx, cy). pad = target body radius. */
export function inCircle(cx, cy, radius, px, py, K = 1, pad = 0) {
  return groundDist(cx, cy, px, py, K) <= radius + pad;
}

/** Cone from origin facing `angle` (radians), total opening `angleDeg`. */
export function inCone(ox, oy, angle, range, angleDeg, px, py, K = 1, pad = 0) {
  const dist = groundDist(ox, oy, px, py, K);
  if (dist > range + pad) return false;
  if (dist <= pad) return true;
  const half = (angleDeg * Math.PI) / 360 + Math.asin(Math.min(1, pad / dist));
  return angleDiff(aimAngle(ox, oy, px, py, K), angle) <= half;
}

/** Straight band from origin along `angle`, `length` long and `width` wide. */
export function inLine(ox, oy, angle, length, width, px, py, K = 1, pad = 0) {
  const d = groundDelta(ox, oy, px, py, K);
  const ux = Math.cos(angle); const uy = Math.sin(angle);
  const along = d.dx * ux + d.dy * uy;
  const across = Math.abs(-d.dx * uy + d.dy * ux);
  return along >= -pad && along <= length + pad && across <= width / 2 + pad;
}

/** Hit test for a skill area. area = { shape, x, y, angle } (origin/center in screen px). */
export function inSkillArea(skill, area, px, py, K = 1, pad = 0) {
  switch (skill.shape) {
    case 'cone': return inCone(area.x, area.y, area.angle, skill.range, skill.angle, px, py, K, pad);
    case 'circle': return inCircle(area.x, area.y, skill.radius, px, py, K, pad);
    case 'line':
    case 'dash': return inLine(area.x, area.y, area.angle, skill.length, skill.width, px, py, K, pad);
    default: return false;
  }
}

/** How far a skill reaches from its user (ground px), for AI and autopilot decisions. */
export function skillReach(skill) {
  switch (skill.shape) {
    case 'cone': return skill.range || 0;
    case 'circle': return skill.at === 'target' ? Infinity : (skill.radius || 0);
    case 'line':
    case 'dash': return skill.length || 0;
    default: return 0;
  }
}

/** 0 at ring center, 1 on the ring edge (elliptical ring in screen px). */
export function ringRatio(ring, x, y) {
  return Math.hypot((x - ring.cx) / ring.rx, (y - ring.cy) / ring.ry);
}

/** Pull a point back inside the ring, keeping `margin` ground px from the edge. */
export function clampToRing(ring, x, y, margin = 0) {
  const rx = Math.max(1, ring.rx - margin);
  const ry = Math.max(1, ring.ry - margin * ring.perspective);
  const r = Math.hypot((x - ring.cx) / rx, (y - ring.cy) / ry);
  if (r <= 1) return { x, y, clamped: false };
  return { x: ring.cx + (x - ring.cx) / r, y: ring.cy + (y - ring.cy) / r, clamped: true };
}

/** Mimic: the last rival skill that hit or was guarded becomes the mimic skill (never basic attacks). */
export function nextMimicSkill(currentId, incomingSkill) {
  if (!incomingSkill || incomingSkill.id === 'enemy_jab') return currentId;
  return incomingSkill.id;
}
