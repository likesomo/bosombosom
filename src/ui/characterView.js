// One place that decides image vs. placeholder shape for a character (REQ-011).
const ROLE_SHAPE = { tank: 'roundRect', support: 'hex', attack: 'triangle' };

function fallbackKey(scene, def) {
  const key = `fallback_${def.id}`;
  if (scene.textures.exists(key)) return key;
  const color = Phaser.Display.Color.HexStringToColor(def.color || '#cccccc').color;
  const g = scene.make.graphics({ x: 0, y: 0, add: false });
  g.fillStyle(color, 1);
  g.lineStyle(10, 0x1c1636, 1);
  const shape = ROLE_SHAPE[def.role] || 'roundRect';
  if (shape === 'triangle') { g.fillTriangle(256, 90, 450, 480, 62, 480); g.strokeTriangle(256, 90, 450, 480, 62, 480); }
  else if (shape === 'hex') {
    const pts = []; for (let i = 0; i < 6; i++) { const a = Math.PI / 3 * i; pts.push({ x: 256 + 200 * Math.cos(a), y: 300 + 180 * Math.sin(a) }); }
    g.fillPoints(pts, true); g.strokePoints(pts, true);
  } else { g.fillRoundedRect(76, 140, 360, 340, 60); g.strokeRoundedRect(76, 140, 360, 340, 60); }
  g.fillStyle(0x1c1636, 1).fillCircle(330, 260, 16).fillCircle(390, 260, 16); // eyes face right
  g.generateTexture(key, 512, 512);
  g.destroy();
  return key;
}

export function textureFor(scene, def, imageKey) {
  const key = imageKey || def.image;
  return scene.textures.exists(key) ? key : fallbackKey(scene, def);
}

// Sprite anchored at the feet (bottom center). Art faces right.
export function createCharacterSprite(scene, def, x, y, imageKey) {
  return scene.add.sprite(x, y, textureFor(scene, def, imageKey)).setOrigin(0.5, 0.94).setScale(def.scale || 0.4);
}
