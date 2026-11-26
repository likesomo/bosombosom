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

export function isKO(hp) { return hp <= 0; }

/** Melee reach check: target in front within range, roughly same height. */
export function inReach(ax, ay, facing, tx, ty, range, backTolerance = 30, heightTolerance = 140) {
  const dx = (tx - ax) * facing;
  return dx >= -backTolerance && dx <= range && Math.abs(ty - ay) <= heightTolerance;
}

export function knockDirection(fromX, toX) {
  return toX >= fromX ? 1 : -1;
}

/** Mimic: the last rival skill that hit or was guarded becomes the mimic skill (never basic attacks). */
export function nextMimicSkill(currentId, incomingSkill) {
  if (!incomingSkill || incomingSkill.id === 'enemy_jab') return currentId;
  return incomingSkill.id;
}
