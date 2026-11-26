import { state, logFlow } from '../state/gameState.js';

export const W = 1280;
export const H = 720;
export const FONT = 'Malgun Gothic, Apple SD Gothic Neo, sans-serif';

export function txt(scene, x, y, msg, opts = {}) {
  const { size = 28, color = '#ffffff', stroke = '#1c1636', strokeThickness = 6, align = 'center', origin = 0.5, bold = true, depth = 10, wrap = 0 } = opts;
  const style = { fontFamily: FONT, fontSize: `${size}px`, color, stroke, strokeThickness, align, fontStyle: bold ? 'bold' : 'normal' };
  if (wrap) style.wordWrap = { width: wrap, useAdvancedWrap: true };
  return scene.add.text(x, y, msg, style).setOrigin(origin).setDepth(depth);
}

export function T(key, fallback = '') {
  const v = state.data?.texts?.[key];
  return v === undefined ? fallback : v;
}

// Safe scene change with a short fade. Falls back to a hard start if anything goes wrong.
export function goTo(scene, key, data = {}, fadeMs = 250) {
  if (scene.__leaving) return;
  scene.__leaving = true;
  try {
    scene.cameras.main.fadeOut(fadeMs, 13, 10, 28);
    scene.time.delayedCall(fadeMs + 10, () => {
      try { scene.scene.start(key, data); } catch (e) { console.error('[scene] start failed', key, e); }
    });
  } catch (e) {
    console.error('[scene] fade failed, hard switch', e);
    scene.scene.start(key, data);
  }
}

export function enterScene(scene, label) {
  scene.__leaving = false;
  scene.cameras.main.fadeIn(250, 13, 10, 28);
  logFlow(label);
}

export function stageBackground(scene, stageId) {
  const st = state.data.stages[stageId] || state.data.stages.arena;
  const key = `stage_${st.id}`;
  if (scene.textures.exists(key)) {
    scene.add.image(0, 0, key).setOrigin(0, 0).setDisplaySize(W, H).setDepth(-10);
  } else {
    const g = scene.add.graphics().setDepth(-10);
    g.fillGradientStyle(0x2a2350, 0x2a2350, 0x1c1636, 0x1c1636, 1);
    g.fillRect(0, 0, W, H);
    g.fillStyle(0x4b3f7a, 1).fillRect(st.platformLeft, st.floorY, st.platformRight - st.platformLeft, 40);
  }
  return st;
}

// Greyscale on/off (WebGL color matrix; tint fallback on canvas).
export function setGrey(img, on) {
  if (img.preFX) {
    if (on && !img.__grey) { img.__grey = img.preFX.addColorMatrix(); img.__grey.grayscale(1); img.__grey.brightness(0.85, true); }
    if (!on && img.__grey) { img.preFX.remove(img.__grey); img.__grey = null; }
  } else if (on) img.setTint(0x8a8a99); else img.clearTint();
  return img;
}

export function keyBadge(scene, x, y, label, opts = {}) {
  const { w = Math.max(64, label.length * 22 + 28), h = 56, depth = 90 } = opts;
  const c = scene.add.container(x, y).setDepth(depth);
  const g = scene.add.graphics();
  g.fillStyle(0x1c1636, 0.9).fillRoundedRect(-w / 2, -h / 2 + 6, w, h, 10);
  g.fillStyle(0xfff4e6, 1).fillRoundedRect(-w / 2, -h / 2, w, h, 10);
  g.lineStyle(3, 0x1c1636, 1).strokeRoundedRect(-w / 2, -h / 2, w, h, 10);
  c.add(g);
  c.add(scene.add.text(0, 0, label, { fontFamily: FONT, fontSize: '28px', fontStyle: 'bold', color: '#1c1636' }).setOrigin(0.5));
  return c;
}
