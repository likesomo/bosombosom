import { W, H } from './common.js';

const hex = (s, fb) => (s ? Phaser.Display.Color.HexStringToColor(s).color : fb);

/**
 * Top-down arena: floor texture (or the stage art + flat floor as fallback), darkened
 * out-of-ring area, ring edge and a center emblem. Returns the stage (with .ring).
 */
export function drawArena(scene, st) {
  const ring = st.ring;
  const K = ring.perspective;
  const floorKey = `floor_${st.id}`;
  const floorColor = hex(st.floorColor, 0x4b3f7a);
  const ringColor = hex(st.ringColor, 0xffd27a);

  if (scene.textures.exists(floorKey)) {
    scene.add.image(0, 0, floorKey).setOrigin(0, 0).setDisplaySize(W, H).setDepth(-10);
  } else {
    if (scene.textures.exists(`stage_${st.id}`)) {
      scene.add.image(0, 0, `stage_${st.id}`).setOrigin(0, 0).setDisplaySize(W, H).setDepth(-11).setAlpha(0.55);
    } else {
      scene.add.rectangle(0, 0, W, H, 0x1c1636).setOrigin(0, 0).setDepth(-11);
    }
    const g = scene.add.graphics().setDepth(-10);
    g.fillStyle(floorColor, 1).fillEllipse(ring.cx, ring.cy, ring.rx * 2 + 60, ring.ry * 2 + 60 * K);
    // flat tile lines, squashed by the camera angle
    g.lineStyle(2, 0xffffff, 0.07);
    for (let x = ring.cx - ring.rx; x <= ring.cx + ring.rx; x += 80) g.lineBetween(x, ring.cy - ring.ry - 20, x, ring.cy + ring.ry + 20);
    for (let y = ring.cy - ring.ry; y <= ring.cy + ring.ry; y += 80 * K) g.lineBetween(ring.cx - ring.rx - 20, y, ring.cx + ring.rx + 20, y);
    const m = scene.make.graphics({ add: false }).fillEllipse(ring.cx, ring.cy, ring.rx * 2 + 60, ring.ry * 2 + 60 * K);
    g.setMask(m.createGeometryMask());
  }

  // Outside the ring is the "ring-out" zone: darker.
  const out = scene.add.graphics().setDepth(-6);
  out.fillStyle(0x0d0a1c, 0.5).fillRect(0, 0, W, H);
  const hole = scene.make.graphics({ add: false }).fillEllipse(ring.cx, ring.cy, ring.rx * 2, ring.ry * 2);
  const mask = hole.createGeometryMask(); mask.setInvertAlpha(true);
  out.setMask(mask);

  const g = scene.add.graphics().setDepth(-5);
  g.lineStyle(14, 0x1c1636, 0.55).strokeEllipse(ring.cx, ring.cy + 6, ring.rx * 2, ring.ry * 2);
  g.lineStyle(8, ringColor, 0.95).strokeEllipse(ring.cx, ring.cy, ring.rx * 2, ring.ry * 2);
  g.lineStyle(3, 0xffffff, 0.35).strokeEllipse(ring.cx, ring.cy, ring.rx * 2 - 34, ring.ry * 2 - 34 * K);
  // center emblem: star in a ring (team trophy motif, not a ball)
  g.lineStyle(4, ringColor, 0.35).strokeEllipse(ring.cx, ring.cy, 220, 220 * K);
  const pts = [];
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (Math.PI / 5) * i;
    const r = i % 2 === 0 ? 80 : 34;
    pts.push({ x: ring.cx + Math.cos(a) * r, y: ring.cy + Math.sin(a) * r * K });
  }
  g.fillStyle(ringColor, 0.16).fillPoints(pts, true);
  g.lineStyle(3, ringColor, 0.35).strokePoints(pts, true);
  return st;
}

// ---------- skill range markers on the floor ----------

/** Screen-space outline points for a skill area. progress 0..1 grows the area from its origin. */
export function areaPoints(skill, area, K, progress = 1) {
  const pts = [];
  const P = (u, v) => pts.push({ x: area.x + u, y: area.y + v * K });
  const a = area.angle || 0;
  const ca = Math.cos(a); const sa = Math.sin(a);
  if (skill.shape === 'cone') {
    const r = skill.range * progress;
    const half = (skill.angle * Math.PI) / 360;
    P(0, 0);
    for (let i = 0; i <= 16; i++) { const t = a - half + (2 * half * i) / 16; P(Math.cos(t) * r, Math.sin(t) * r); }
  } else if (skill.shape === 'circle') {
    const r = skill.radius * progress;
    for (let i = 0; i < 32; i++) { const t = (Math.PI * 2 * i) / 32; P(Math.cos(t) * r, Math.sin(t) * r); }
  } else {
    const L = skill.length * progress; const w = skill.width / 2;
    P(-sa * w, ca * w); P(ca * L - sa * w, sa * L + ca * w); P(ca * L + sa * w, sa * L - ca * w); P(sa * w, -ca * w);
  }
  return pts;
}

/**
 * Draw a floor marker. kind 'telegraph' (red, inner fill grows over `seconds`) or
 * 'flash' (player color, fades out quickly). Returns { destroy() }.
 */
export function showSkillArea(scene, skill, area, K, { kind = 'telegraph', seconds = 0.5, color } = {}) {
  const col = color ?? (kind === 'telegraph' ? 0xff3b3b : 0x4fb4ff);
  const g = scene.add.graphics().setDepth(12);
  const full = areaPoints(skill, area, K, 1);
  const st = { p: kind === 'telegraph' ? 0 : 1 };
  const draw = () => {
    g.clear();
    g.fillStyle(col, kind === 'telegraph' ? 0.16 : 0.22).fillPoints(full, true);
    g.lineStyle(4, col, 0.9).strokePoints(full, true);
    if (kind === 'telegraph' && st.p > 0) g.fillStyle(col, 0.32).fillPoints(areaPoints(skill, area, K, st.p), true);
  };
  draw();
  let tw;
  if (kind === 'telegraph') {
    tw = scene.tweens.add({ targets: st, p: 1, duration: Math.max(50, seconds * 1000), onUpdate: draw });
  } else {
    tw = scene.tweens.add({ targets: g, alpha: 0, delay: 120, duration: Math.max(120, seconds * 1000), onComplete: () => g.destroy() });
  }
  return { destroy: () => { tw?.stop(); if (g.active) g.destroy(); } };
}

/** A crack decal that stays on the floor for a while (drops, shockwaves). */
export function floorCrack(scene, x, y, K, size = 90) {
  const g = scene.add.graphics().setDepth(11);
  g.fillStyle(0x000000, 0.28).fillEllipse(x, y, size * 1.6, size * 1.6 * K);
  g.lineStyle(4, 0x1c1636, 0.6);
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI * 2 * i) / 6 + Math.random() * 0.5;
    let px = x; let py = y;
    for (let s = 1; s <= 3; s++) {
      const r = (size * s) / 3;
      const nx = x + Math.cos(a + (Math.random() - 0.5) * 0.5) * r;
      const ny = y + Math.sin(a + (Math.random() - 0.5) * 0.5) * r * K;
      g.lineBetween(px, py, nx, ny); px = nx; py = ny;
    }
  }
  scene.tweens.add({ targets: g, alpha: 0, delay: 6000, duration: 1500, onComplete: () => g.destroy() });
  return g;
}
