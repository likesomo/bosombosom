import { FONT } from './common.js';

// Draft candidates in the stands (data/crowd.json). Simple round mascots made from shapes:
// no new character art (CLAUDE.md 7). A member with an "image" key in crowd.json uses that texture instead.
const BODY_COLORS = [0xffb8dc, 0xb8e2ff, 0xc9f2b8, 0xffe3a8, 0xd9c8ff, 0xffc9a8, 0xa8f0e6];

export function mascotTexture(scene, member, index) {
  if (member.image && scene.textures.exists(member.image)) return member.image;
  const key = `crowd_${member.id}`;
  if (scene.textures.exists(key)) return key;
  const g = scene.make.graphics({ x: 0, y: 0, add: false });
  const col = BODY_COLORS[index % BODY_COLORS.length];
  g.fillStyle(0x1c1636, 1).fillEllipse(32, 40, 54, 48);          // outline
  g.fillStyle(col, 1).fillEllipse(32, 39, 48, 42);                // body
  g.fillStyle(0xffffff, 0.55).fillEllipse(24, 30, 14, 9);         // shine
  g.fillStyle(0x1c1636, 1).fillCircle(25, 40, 3.5).fillCircle(39, 40, 3.5); // eyes
  g.fillStyle(0xff7fa8, 0.7).fillCircle(19, 47, 3.5).fillCircle(45, 47, 3.5); // cheeks
  g.lineStyle(2, 0x1c1636, 1).beginPath().arc(32, 46, 4, 0.2, Math.PI - 0.2).strokePath(); // smile
  g.generateTexture(key, 64, 64);
  g.destroy();
  return key;
}

function unknownTexture(scene) {
  const key = 'crowd_unknown';
  if (scene.textures.exists(key)) return key;
  const g = scene.make.graphics({ x: 0, y: 0, add: false });
  g.fillStyle(0x3a3358, 1).fillEllipse(32, 39, 48, 42);
  g.lineStyle(3, 0x6d63a8, 1).strokeEllipse(32, 39, 48, 42);
  g.generateTexture(key, 64, 64);
  g.destroy();
  return key;
}

export class Crowd {
  /**
   * @param {Phaser.Scene} scene
   * @param {object} crowd state.data.crowd
   * @param {object} opts { rows: [{ y, x0, x1 }], unknownSpots: [{x,y}], scale, depth }
   */
  constructor(scene, crowd, opts = {}) {
    this.scene = scene;
    this.data = crowd || { members: [], groups: {}, cheerLines: [] };
    this.people = [];
    const { rows = [{ y: 70, x0: 490, x1: 790 }, { y: 132, x0: 470, x1: 810 }], unknownSpots = [], scale = 0.72, depth = 12 } = opts;
    this.bubbleY = opts.bubbleY ?? Math.max(...rows.map((r) => r.y)) + 36;
    this.activeBubbles = 0;
    const members = this.data.members || [];
    const perRow = Math.ceil(members.length / rows.length) || 1;
    members.forEach((m, i) => {
      const row = rows[Math.floor(i / perRow)] || rows[rows.length - 1];
      const k = i % perRow;
      const n = Math.min(perRow, members.length - Math.floor(i / perRow) * perRow);
      const x = n === 1 ? (row.x0 + row.x1) / 2 : row.x0 + ((row.x1 - row.x0) * k) / (n - 1);
      this.people.push(this.makePerson(m, i, x, row.y, scale, depth));
    });
    unknownSpots.forEach((p) => {
      const img = scene.add.image(p.x, p.y, unknownTexture(scene)).setScale(scale).setDepth(depth).setOrigin(0.5, 0.9);
      const q = scene.add.text(p.x, p.y - 22 * scale - 4, '?', { fontFamily: FONT, fontSize: '20px', fontStyle: 'bold', color: '#a99fd6' }).setOrigin(0.5).setDepth(depth + 1);
      void img; void q;
    });
  }

  makePerson(m, i, x, y, scale, depth) {
    const s = this.scene;
    const group = this.data.groups?.[m.groupId];
    const img = s.add.image(x, y, mascotTexture(s, m, i)).setScale(scale).setDepth(depth).setOrigin(0.5, 0.9);
    const tag = s.add.text(x, y + 6, m.name, {
      fontFamily: FONT, fontSize: '11px', fontStyle: 'bold', color: group?.color || '#ffffff', stroke: '#1c1636', strokeThickness: 3,
    }).setOrigin(0.5, 0).setDepth(depth + 1);
    s.tweens.add({ targets: img, y: y - 3, duration: 380 + (i % 5) * 70, yoyo: true, repeat: -1, ease: 'Sine.easeInOut', delay: (i * 97) % 400 });
    return { m, img, tag, x, y, busy: false };
  }

  /** Jump some (or all) of the crowd. level: 'small' | 'medium' | 'big' */
  cheer(level = 'small', withBubbles = true) {
    const count = level === 'big' ? this.people.length : level === 'medium' ? Math.ceil(this.people.length / 2) : 3;
    const pool = Phaser.Utils.Array.Shuffle(this.people.slice());
    pool.slice(0, count).forEach((p, j) => this.jump(p, level === 'big' ? 3 : 1, j * 40));
    if (withBubbles && level === 'medium') this.bubbles(1);
    if (withBubbles && level === 'big') this.bubbles(3);
  }

  jump(p, times, delay) {
    if (p.busy) return;
    p.busy = true;
    this.scene.tweens.add({
      targets: p.img, y: p.y - 16, duration: 140, yoyo: true, repeat: times - 1, delay, ease: 'Quad.easeOut',
      onComplete: () => { p.busy = false; },
    });
  }

  bubbles(n) {
    const lines = Phaser.Utils.Array.Shuffle((this.data.cheerLines || []).slice());
    const who = Phaser.Utils.Array.Shuffle(this.people.slice());
    for (let i = 0; i < Math.min(n, lines.length, who.length); i++) {
      this.scene.time.delayedCall(i * 260, () => this.say(who[i], lines[i]));
    }
  }

  say(p, msg, ms = 1500) {
    const s = this.scene;
    const slot = this.activeBubbles++;
    const t = s.add.text(p.x, this.bubbleY + slot * 34, msg, { fontFamily: FONT, fontSize: '16px', fontStyle: 'bold', color: '#1c1636' }).setOrigin(0.5, 0).setDepth(330);
    const b = t.getBounds();
    const g = s.add.graphics().setDepth(329);
    g.fillStyle(0xfff4e6, 0.97).fillRoundedRect(b.x - 10, b.y - 6, b.width + 20, b.height + 12, 10);
    if (slot === 0) g.fillTriangle(p.x - 7, b.y - 5, p.x + 7, b.y - 5, p.x, b.y - 16);
    g.lineStyle(2, 0x1c1636, 1).strokeRoundedRect(b.x - 10, b.y - 6, b.width + 20, b.height + 12, 10);
    s.tweens.add({ targets: [t, g], alpha: { from: 0, to: 1 }, duration: 120 });
    s.tweens.add({ targets: [t, g], alpha: 0, delay: ms, duration: 250, onComplete: () => { t.destroy(); g.destroy(); this.activeBubbles = Math.max(0, this.activeBubbles - 1); } });
  }
}
