import { state, reset, presetForMatch, loadSettings, logFlow } from './state/gameState.js';
import { LogoScene } from './scenes/LogoScene.js';
import { OpeningBattleScene } from './scenes/OpeningBattleScene.js';
import { TitleScene } from './scenes/TitleScene.js';
import { BracketScene } from './scenes/BracketScene.js';
import { BattleScene } from './scenes/BattleScene.js';
import { CheerScene } from './scenes/CheerScene.js';
import { EndingScene } from './scenes/EndingScene.js';
import { initAudio } from './ui/sfx.js';

state.bootTime = performance.now();
const params = new URLSearchParams(window.location.search);
state.auto = params.get('auto') === '1';
loadSettings();

window.addEventListener('error', (e) => console.error('[error]', e.message, e.filename, e.lineno));
window.addEventListener('unhandledrejection', (e) => console.error('[error] promise', e.reason));

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: 1280,
  height: 720,
  backgroundColor: '#0d0a1c',
  pixelArt: true,
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: [LogoScene, OpeningBattleScene, TitleScene, BracketScene, BattleScene, CheerScene, EndingScene],
});

// Demo hotkeys (R, 1~3, 0) handled in one place for every scene.
function jumpTo(key, data) {
  const mgr = game.scene;
  mgr.getScenes(true).forEach((s) => mgr.stop(s.scene.key));
  mgr.start(key, data);
}

export function bindDemoHotkeys() {
  window.addEventListener('keydown', (ev) => {
    if (!state.loaded || ev.repeat) return;
    initAudio();
    const matches = state.data.bracket.matches.length;
    if (ev.code === 'KeyR') {
      logFlow('hotkey R');
      reset();
      jumpTo('LogoScene');
      return;
    }
    const m = /^(Digit|Numpad)(\d)$/.exec(ev.code);
    if (!m) return;
    const n = Number(m[2]);
    if (n === 0) { logFlow('hotkey 0'); presetForMatch(matches); jumpTo('EndingScene'); return; }
    if (n >= 1 && n <= matches) { logFlow(`hotkey ${n}`); presetForMatch(n - 1); jumpTo('BattleScene', { matchIndex: n - 1 }); }
  });
}
bindDemoHotkeys();

// ?start=1..3 or 0 jumps straight there after loading (for testing / rehearsal).
const start = params.get('start');
if (start !== null) {
  const wait = setInterval(() => {
    if (!state.loaded) return;
    clearInterval(wait);
    const n = Number(start);
    const matches = state.data.bracket.matches.length;
    if (n === 0) { presetForMatch(matches); jumpTo('EndingScene'); } else { presetForMatch(n - 1); jumpTo('BattleScene', { matchIndex: n - 1 }); }
  }, 100);
}

window.__game = game;
