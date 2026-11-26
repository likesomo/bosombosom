// pixelfx sprite sheets (assets/fx/*.png + .json, Phaser atlas format).
export const FX_KEYS = [
  'explosions_cartoon-pow', 'explosions_firework-burst', 'holy_sunburst',
  'impacts_blunt-hit', 'impacts_crit-hit', 'impacts_ground-slam', 'impacts_heavy-landing', 'impacts_hit-spark',
  'impacts_impact-frame', 'impacts_parry', 'impacts_shield-block',
  'lightning_electrified', 'lightning_thunderclap', 'melee_claw-swipe', 'melee_uppercut',
  'nature_earth-spike', 'nature_leaf-storm', 'nature_thorns',
  'spawn_poof', 'status_confused', 'status_stunned',
  'transitions_glitch-wipe', 'transitions_star-iris',
  'ui_confetti', 'ui_exclamation', 'weather_shooting-stars',
];

export function loadFx(scene) {
  FX_KEYS.forEach((k) => {
    scene.load.atlas(k, `assets/fx/${k}.png`, `assets/fx/${k}.json`);
    scene.load.json(`${k}__meta`, `assets/fx/${k}.json`);
  });
}

const frameNumber = (name) => parseInt(String(name).replace(/^.*?(\d+)$/, '$1'), 10) || 0;

export function createFxAnims(scene) {
  FX_KEYS.forEach((k) => {
    if (!scene.textures.exists(k) || scene.anims.exists(k)) return;
    const names = scene.textures.get(k).getFrameNames().sort((a, b) => frameNumber(a) - frameNumber(b));
    if (!names.length) return;
    const meta = scene.cache.json.get(`${k}__meta`)?.meta?.pixelfx || {};
    scene.anims.create({ key: k, frames: names.map((f) => ({ key: k, frame: f })), frameRate: meta.fps || 30, repeat: 0 });
  });
}

// Plays an effect so that its pivot (from pixelfx meta) sits on (x, y).
export function playFx(scene, key, x, y, opts = {}) {
  const { scale = 2.5, flipX = false, depth = 60, tint = null, loop = false, alpha = 1, speed = 1 } = opts;
  if (!scene.anims.exists(key)) return null;
  const sprite = scene.add.sprite(x, y, key).setScale(scale).setDepth(depth).setAlpha(alpha);
  const metaRoot = scene.cache.json.get(`${key}__meta`);
  const pivot = metaRoot?.meta?.pixelfx?.pivot;
  const f0 = metaRoot?.frames?.[0]?.frame;
  if (pivot && f0) sprite.setOrigin((flipX ? f0.w - pivot[0] : pivot[0]) / f0.w, pivot[1] / f0.h);
  sprite.setFlipX(flipX);
  if (tint !== null) sprite.setTint(tint);
  sprite.play({ key, repeat: loop ? -1 : 0, timeScale: speed });
  if (!loop) sprite.once('animationcomplete', () => sprite.destroy());
  return sprite;
}

// Full-screen transition sheets are 320x180 → scale 4 covers 1280x720.
export function playScreenFx(scene, key, opts = {}) {
  if (!scene.anims.exists(key)) return null;
  const s = scene.add.sprite(0, 0, key).setOrigin(0, 0).setScale(4).setDepth(opts.depth ?? 500).setScrollFactor(0);
  if (opts.tint) s.setTint(opts.tint);
  s.play({ key, timeScale: opts.speed ?? 1 });
  s.once('animationcomplete', () => s.destroy());
  return s;
}

export function floatText(scene, x, y, msg, opts = {}) {
  const { color = '#ffffff', size = 34, stroke = '#1c1636', rise = 70, duration = 800, depth = 80 } = opts;
  const t = scene.add.text(x, y, msg, {
    fontFamily: 'Malgun Gothic, sans-serif', fontSize: `${size}px`, fontStyle: 'bold', color, stroke, strokeThickness: 7,
  }).setOrigin(0.5).setDepth(depth);
  scene.tweens.add({ targets: t, y: y - rise, alpha: { from: 1, to: 0 }, scale: { from: 1.25, to: 1 }, duration, ease: 'Cubic.easeOut', onComplete: () => t.destroy() });
  return t;
}
