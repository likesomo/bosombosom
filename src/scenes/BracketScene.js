import { state } from '../state/gameState.js';
import { W, H, T, txt, enterScene, FONT, stripeWipe } from '../ui/common.js';
import { sfx } from '../ui/sfx.js';
import { playFx } from '../ui/fx.js';

// 8-team tournament, drawn as a classic bracket: left half = quarterfinals #0,#1 (#0 is ours),
// right half = #2,#3, the final in the middle. Other teams' results come from bracket.json.
const CARD = { w: 236, h: 62 };
const ROWS = [214, 292, 434, 512];                    // card rows (two per quarterfinal)
const QF_MID = [(ROWS[0] + ROWS[1]) / 2, (ROWS[2] + ROWS[3]) / 2];
const SF_MID = (QF_MID[0] + QF_MID[1]) / 2;
const X = { card: 40 + CARD.w / 2, edge: 40 + CARD.w, qf: 322, sf: 402, fin: 490 }; // left side; right is mirrored
const FINAL = { x: W / 2, y: SF_MID, w: 300, h: 120 };
const COLOR = { neutral: 0x6d63a8, win: 0xffd27a, current: 0xff9a4a };
const STEP_MS = 420;

const mx = (x, side) => (side === 'left' ? x : W - x);

export class BracketScene extends Phaser.Scene {
  constructor() { super('BracketScene'); }

  create() {
    const D = state.data;
    this.B = D.bracket;
    this.mi = state.matchIndex;
    this.match = this.B.matches[this.mi];
    enterScene(this, `Bracket ${this.match?.label}`);
    if (this.textures.exists('bg_bracket')) this.add.image(0, 0, 'bg_bracket').setOrigin(0, 0).setDisplaySize(W, H);
    else this.add.rectangle(0, 0, W, H, 0x1c1636).setOrigin(0, 0);
    txt(this, W / 2, 128, T('bracketTitle', ''), { size: 34, color: '#ffd27a' });

    this.buildLayout();
    this.lines = this.add.graphics().setDepth(2);
    this.paths = {};          // key → { pts, style, t }
    this.structure = false;   // neutral bracket lines visible (after the draw)

    // round headers
    ['left', 'right'].forEach((side) => {
      txt(this, mx(X.qf, side), ROWS[0] - 44, this.B.matches[0]?.label || '8강', { size: 16, color: '#a99fd6', depth: 3 });
      txt(this, mx(X.sf, side), ROWS[0] - 44, this.B.matches[1]?.label || '4강', { size: 16, color: '#a99fd6', depth: 3 });
    });
    this.finalNode = this.makeFinalNode();
    this.panel = this.makeCurrentPanel();

    this.ready = false;
    this.hint = txt(this, W / 2, H - 46, '', { size: 22, color: '#ffffff', depth: 20 });

    // Results already settled before this visit are shown at once; the round just finished animates.
    const instantRounds = Math.max(0, this.mi - 1);
    for (let r = 0; r < instantRounds; r++) this.applyRound(r);
    const first = this.mi === 0 && !state.drawDone;
    if (first) this.roulette();
    else {
      this.structure = true;
      this.redraw();
      this.revisit();
    }

    this.input.on('pointerdown', () => this.enter());
    this.input.keyboard.on('keydown-ENTER', () => this.enter());
    this.input.keyboard.on('keydown-SPACE', () => this.enter());
  }

  // ---------- layout ----------
  buildLayout() {
    const qf = this.B.quarterfinals || [];
    this.cards = {};
    this.slot = {};
    qf.forEach((q, k) => {
      const side = k < 2 ? 'left' : 'right';
      q.teamIds.forEach((id, j) => {
        const row = ROWS[(k % 2) * 2 + j];
        this.slot[id] = { side, row, k };
        this.cards[id] = this.teamCard(mx(X.card, side), row, id, side);
      });
    });
  }

  teamPath(id) {
    const s = this.slot[id];
    return [[mx(X.edge, s.side), s.row], [mx(X.qf, s.side), s.row], [mx(X.qf, s.side), QF_MID[s.k % 2]]];
  }

  qfPath(k) {
    const side = k < 2 ? 'left' : 'right';
    const y = QF_MID[k % 2];
    return [[mx(X.qf, side), y], [mx(X.sf, side), y], [mx(X.sf, side), SF_MID]];
  }

  sfPath(side) {
    return [[mx(X.sf, side), SF_MID], [mx(X.fin, side), SF_MID]];
  }

  allStructurePaths() {
    const out = [];
    Object.keys(this.slot).forEach((id) => out.push(this.teamPath(id)));
    [0, 1, 2, 3].forEach((k) => out.push(this.qfPath(k)));
    out.push(this.sfPath('left'), this.sfPath('right'));
    return out;
  }

  teamCard(x, y, teamId, side) {
    const D = state.data;
    const t = D.teams[teamId];
    const c = this.add.container(x, y).setDepth(5);
    const isUs = !!t.isPlayer;
    const { w, h } = CARD;
    const bg = this.add.graphics();
    const col = Phaser.Display.Color.HexStringToColor(t.color).color;
    bg.fillStyle(0x140f2a, 0.92).fillRoundedRect(-w / 2, -h / 2, w, h, 10);
    bg.lineStyle(isUs ? 4 : 2, isUs ? 0xffd27a : 0x4b3f7a, 1).strokeRoundedRect(-w / 2, -h / 2, w, h, 10);
    bg.fillStyle(col, 1).fillRect(side === 'left' ? -w / 2 : w / 2 - 6, -h / 2, 6, h);
    const def = D.characters[t.characterId];
    const px = side === 'left' ? -w / 2 + 36 : w / 2 - 36;
    const face = this.add.image(px, h / 2 - 4, this.textures.exists(def?.image) ? def.image : '__WHITE').setOrigin(0.5, 0.94).setScale(0.11).setFlipX(side === 'right');
    const tx = side === 'left' ? -w / 2 + 72 : w / 2 - 72;
    const org = side === 'left' ? 0 : 1;
    const name = this.add.text(tx, -10, t.name, { fontFamily: FONT, fontSize: t.name.length > 6 ? '15px' : '20px', fontStyle: 'bold', color: isUs ? '#ffd27a' : '#ffffff' }).setOrigin(org, 0.5);
    const subText = [t.captain, t.seed].filter(Boolean).join(' · ');
    const sub = this.add.text(tx, 15, subText, { fontFamily: FONT, fontSize: '13px', color: '#a99fd6' }).setOrigin(org, 0.5);
    c.add([bg, face, name, sub]);
    c.side = side;
    c.face = face;
    return c;
  }

  makeFinalNode() {
    const c = this.add.container(FINAL.x, FINAL.y).setDepth(6);
    const g = this.add.graphics();
    g.fillStyle(0x140f2a, 0.95).fillRoundedRect(-FINAL.w / 2, -FINAL.h / 2, FINAL.w, FINAL.h, 14);
    g.lineStyle(3, 0xffd27a, 1).strokeRoundedRect(-FINAL.w / 2, -FINAL.h / 2, FINAL.w, FINAL.h, 14);
    const label = this.add.text(0, -34, this.B.matches[2]?.label || '결승', { fontFamily: FONT, fontSize: '22px', fontStyle: 'bold', color: '#ffd27a' }).setOrigin(0.5);
    const vs = this.add.text(0, 14, '?  VS  ?', { fontFamily: FONT, fontSize: '22px', fontStyle: 'bold', color: '#ffffff', align: 'center' }).setOrigin(0.5);
    c.add([g, label, vs]);
    c.vs = vs;
    return c;
  }

  makeCurrentPanel() {
    const c = this.add.container(W / 2, 600).setDepth(8);
    const g = this.add.graphics();
    g.fillStyle(0x3a2f6e, 0.95).fillRoundedRect(-280, -34, 560, 68, 14);
    g.lineStyle(4, COLOR.current, 1).strokeRoundedRect(-280, -34, 560, 68, 14);
    const t = this.add.text(0, 0, '', { fontFamily: FONT, fontSize: '26px', fontStyle: 'bold', color: '#ffffff' }).setOrigin(0.5);
    c.add([g, t]);
    c.text = t;
    c.setSize(560, 68).setInteractive({ useHandCursor: true });
    this.panel = c;
    this.setPanel(false);
    return c;
  }

  setPanel(known) {
    const opp = known ? state.data.teams[this.match.opponentTeamId].name : '?';
    this.panel.text.setText(`${this.match.label}   보솜보솜  VS  ${opp}`);
  }

  // ---------- drawing ----------
  setPath(key, pts, style, t = 1) { this.paths[key] = { pts, style, t }; }

  redraw() {
    const g = this.lines;
    g.clear();
    if (this.structure) {
      g.lineStyle(3, COLOR.neutral, 1);
      this.allStructurePaths().forEach((pts) => this.strokePartial(g, pts, 1));
    }
    Object.values(this.paths).forEach((p) => {
      g.lineStyle(p.style === 'win' ? 6 : 4, COLOR[p.style] ?? COLOR.win, 1);
      this.strokePartial(g, p.pts, p.t);
    });
  }

  strokePartial(g, pts, t) {
    const segs = [];
    let total = 0;
    for (let i = 1; i < pts.length; i++) { const l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); segs.push(l); total += l; }
    let left = total * t;
    for (let i = 1; i < pts.length && left > 0; i++) {
      const [x1, y1] = pts[i - 1]; const [x2, y2] = pts[i];
      const f = Math.min(1, left / segs[i - 1]);
      g.lineBetween(x1, y1, x1 + (x2 - x1) * f, y1 + (y2 - y1) * f);
      left -= segs[i - 1];
    }
  }

  /** Grow a winner path (gold) and settle the match: loser card dims, winner card pops. */
  animateWin(key, pts, winnerId, loserId, onDone) {
    this.setPath(key, pts, 'win', 0);
    const st = { t: 0 };
    sfx('tick');
    this.tweens.add({
      targets: st, t: 1, duration: STEP_MS * 0.8, ease: 'Cubic.easeOut',
      onUpdate: () => { this.paths[key].t = st.t; this.redraw(); },
      onComplete: () => {
        this.markLoser(loserId);
        const wc = this.cards[winnerId];
        if (wc) this.tweens.add({ targets: wc, scale: 1.08, duration: 110, yoyo: true });
        onDone?.();
      },
    });
  }

  markLoser(id) {
    const c = this.cards[id];
    if (!c || c.__out) return;
    c.__out = true;
    c.setAlpha(0.45);
  }

  // ---------- rounds ----------
  /** Steps of round r: [{ key, pts, winnerId, loserId }] in display order (ours first). */
  roundSteps(r) {
    const qf = this.B.quarterfinals;
    if (r === 0) {
      return qf.map((q, k) => {
        const w = q.winnerId;
        const l = q.teamIds.find((id) => id !== w);
        return { key: `qf${k}`, pts: [...this.teamPath(w), ...this.qfPath(k).slice(1)], winnerId: w, loserId: l };
      });
    }
    if (r === 1) {
      const rightWinner = this.B.matches[2].opponentTeamId;
      const rightLoser = [qf[2].winnerId, qf[3].winnerId].find((id) => id !== rightWinner);
      return [
        { key: 'sfL', pts: this.sfPath('left'), winnerId: 'bosombosom', loserId: qf[1].winnerId },
        { key: 'sfR', pts: this.sfPath('right'), winnerId: rightWinner, loserId: rightLoser },
      ];
    }
    return [];
  }

  applyRound(r) {
    this.roundSteps(r).forEach((s) => { this.setPath(s.key, s.pts, 'win'); this.markLoser(s.loserId); });
    if (r === 1) this.showFinalists();
  }

  showFinalists() {
    const D = state.data;
    this.finalNode.vs.setText(`보솜보솜  VS  ${D.teams[this.B.matches[2].opponentTeamId].name}`);
  }

  playRound(r, onDone) {
    const steps = this.roundSteps(r);
    const next = (i) => {
      if (i >= steps.length) {
        if (r === 1) { this.showFinalists(); this.tweens.add({ targets: this.finalNode, scale: 1.08, duration: 140, yoyo: true }); }
        onDone?.();
        return;
      }
      const s = steps[i];
      this.animateWin(s.key, s.pts, s.winnerId, s.loserId, () => this.time.delayedCall(80, () => next(i + 1)));
    };
    next(0);
  }

  // ---------- visits ----------
  roulette() {
    const ids = this.B.rouletteTeamIds?.length ? this.B.rouletteTeamIds : Object.keys(this.cards).filter((id) => id !== 'bosombosom');
    const targetId = this.match.opponentTeamId;
    this.hint.setText(T('bracketDraw', ''));
    let k = 0;
    let delay = 60;
    const hi = this.add.graphics().setDepth(7);
    const spin = () => {
      const id = ids[k % ids.length];
      const card = this.cards[id];
      if (card) hi.clear().lineStyle(5, COLOR.current, 1).strokeRoundedRect(card.x - CARD.w / 2 - 5, card.y - CARD.h / 2 - 5, CARD.w + 10, CARD.h + 10, 12);
      sfx('tick');
      k += 1;
      delay *= 1.13;
      if (delay < 320 || id !== targetId) this.time.delayedCall(delay, spin);
      else this.landOn(targetId, hi);
    };
    spin();
  }

  landOn(teamId, hi) {
    sfx('fight');
    const card = this.cards[teamId];
    this.cameras.main.shake(160, 0.006);
    if (card) {
      playFx(this, 'explosions_firework-burst', card.x, card.y + 24, { scale: 1.2, depth: 30 });
      this.tweens.add({ targets: card, scale: 1.1, duration: 200, yoyo: true, repeat: 2 });
    }
    this.setPanel(true);
    this.time.delayedCall(500, () => { hi.destroy(); this.revealStructure(() => this.setReady()); });
  }

  /** Bracket lines grow in once the draw is settled. */
  revealStructure(onDone) {
    const st = { t: 0 };
    sfx('select');
    const g = this.lines;
    this.tweens.add({
      targets: st, t: 1, duration: 500, ease: 'Cubic.easeOut',
      onUpdate: () => {
        g.clear();
        g.lineStyle(3, COLOR.neutral, 1);
        this.allStructurePaths().forEach((pts) => this.strokePartial(g, pts, st.t));
      },
      onComplete: () => { this.structure = true; this.redraw(); onDone?.(); },
    });
  }

  revisit() {
    const isFinal = this.mi === this.B.matches.length - 1;
    this.setPanel(true);
    const afterRound = () => {
      const card = this.cards[this.match.opponentTeamId];
      if (isFinal && card) {
        // foreshadow the noise possession
        sfx('glitch');
        card.list.forEach((o) => o.setTint && o.setTint(0x8f8fa3));
        this.tweens.add({ targets: card, x: card.x + 6, duration: 40, yoyo: true, repeat: 8, onComplete: () => card.list.forEach((o) => o.clearTint && o.clearTint()) });
        this.time.delayedCall(700, () => this.setReady());
      } else this.setReady();
    };
    if (this.mi >= 1) this.time.delayedCall(350, () => this.playRound(this.mi - 1, afterRound));
    else this.time.delayedCall(300, afterRound);
  }

  setReady() {
    state.drawDone = true;
    this.ready = true;
    this.hint.setText(T('bracketEnter', ''));
    this.tweens.add({ targets: this.hint, alpha: 0.4, duration: 500, yoyo: true, repeat: -1 });
    this.tweens.add({ targets: this.panel, scale: 1.05, duration: 420, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    [this.cards.bosombosom, this.cards[this.match.opponentTeamId]].forEach((c) => {
      if (!c) return;
      const ring = this.add.graphics().setDepth(4);
      ring.lineStyle(4, COLOR.current, 1).strokeRoundedRect(c.x - CARD.w / 2 - 5, c.y - CARD.h / 2 - 5, CARD.w + 10, CARD.h + 10, 12);
      this.tweens.add({ targets: ring, alpha: 0.3, duration: 420, yoyo: true, repeat: -1 });
    });
    if (state.auto) this.time.delayedCall(500, () => this.enter());
  }

  enter() {
    if (!this.ready || this.__leaving) return;
    sfx('fight');
    this.__leaving = true;
    const ms = state.data.battleIntro?.wipeMs ?? 350;
    stripeWipe(this, ms, () => {
      try { this.scene.start('BattleScene', { matchIndex: this.mi, vs: true }); } catch (e) { console.error('[scene] start failed', e); }
    });
  }
}
