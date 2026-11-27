// Single source of progress state shared by all scenes.
export const state = {
  matchIndex: 0,
  cheerers: [],          // character ids of rivals beaten so far (they celebrate in the ending)
  drawDone: false,
  retryCount: 0,
  settings: { volume: 0.7 },
  loaded: false,          // true after LogoScene finished loading every resource
  data: null,             // validated game data (see src/data/loadData.js)
  auto: false,            // ?auto=1 autopilot for headless verification
  bootTime: 0,
};

export function reset() {
  state.matchIndex = 0;
  state.cheerers = [];
  state.drawDone = false;
  state.retryCount = 0;
}

export function loadSettings() {
  try {
    const raw = window.localStorage.getItem('bosombosom.settings');
    if (raw) Object.assign(state.settings, JSON.parse(raw));
  } catch (e) { /* storage unavailable: keep defaults */ }
}

export function saveSettings() {
  try { window.localStorage.setItem('bosombosom.settings', JSON.stringify(state.settings)); } catch (e) { /* ignore */ }
}

export function isFinalMatch(index) {
  return index === state.data.bracket.matches.length - 1;
}

export function opponentCharacterId(matchIndex) {
  const D = state.data;
  const m = D.bracket.matches[matchIndex];
  return D.teams[m.opponentTeamId].characterId;
}

// Preset used by demo hotkeys: everything before matchIndex counts as won.
export function presetForMatch(matchIndex) {
  state.matchIndex = matchIndex;
  state.cheerers = [];
  const n = Math.min(matchIndex, state.data.bracket.matches.length);
  for (let i = 0; i < n; i++) state.cheerers.push(opponentCharacterId(i));
  state.drawDone = true;
  state.retryCount = 0;
}

export function logFlow(label) {
  const t = ((performance.now() - state.bootTime) / 1000).toFixed(1);
  console.log(`[flow] ${label} t=${t}s`);
}
