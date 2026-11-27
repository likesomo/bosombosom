// Headless Chrome playtest (dev tool, not loaded by the game).
// Usage: node tools/playtest.mjs "<url e.g. http://192.168.55.9:8123/?start=1&auto=1>" <outDir> <maxSeconds> [stopOnConsoleRegex]
// Prints [flow] logs, errors, and battle milestones; saves screenshots + console.log into outDir.
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const [url, outDir, maxSecArg, stopRe, keysArg] = process.argv.slice(2);
// keysArg: "2.5:Digit1,9:KeyR" = press that key code at that many seconds after navigation
const keyPlan = (keysArg || '').split(',').filter(Boolean).map((p) => { const [t, code] = p.split(':'); return { t: Number(t), code, done: false }; });
const maxSec = Number(maxSecArg || 60);
mkdirSync(outDir, { recursive: true });
const port = 9300 + Math.floor(Math.random() * 500);
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [
  '--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${join(outDir, 'chrome-profile')}`,
  '--window-size=1280,720', '--autoplay-policy=no-user-gesture-required', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', 'about:blank',
], { stdio: 'ignore' });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let ws; let id = 0; const pending = new Map();
const logs = [];
function send(method, params = {}) {
  const i = ++id; ws.send(JSON.stringify({ id: i, method, params }));
  return new Promise((res) => pending.set(i, res));
}
async function shot(name) {
  const r = await send('Page.captureScreenshot', { format: 'jpeg', quality: 70 });
  if (r.result?.data) writeFileSync(join(outDir, `${name}.jpg`), Buffer.from(r.result.data, 'base64'));
}
async function evaluate(expr) {
  const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true });
  return r.result?.result?.value;
}

let target;
for (let i = 0; i < 150 && !target; i++) {
  await sleep(200);
  try { const list = await (await fetch(`http://127.0.0.1:${port}/json`)).json(); target = list.find((t) => t.type === 'page'); } catch { /* not up yet */ }
}
ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener('open', r));
const t0 = Date.now();
const el = () => ((Date.now() - t0) / 1000).toFixed(1);
let stopped = false;
ws.addEventListener('message', (m) => {
  const msg = JSON.parse(m.data);
  if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id); return; }
  if (msg.method === 'Runtime.consoleAPICalled') {
    const text = msg.params.args.map((a) => a.value ?? a.description ?? '').join(' ');
    logs.push(`[${el()}] ${msg.params.type}: ${text}`);
    if (stopRe && new RegExp(stopRe).test(text)) stopped = true;
  }
  if (msg.method === 'Runtime.exceptionThrown') logs.push(`[${el()}] EXCEPTION: ${JSON.stringify(msg.params.exceptionDetails).slice(0, 600)}`);
});
await send('Runtime.enable');
await send('Page.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 720, deviceScaleFactor: 1, mobile: false });
await send('Page.navigate', { url });

// Event-driven screenshots from battle scene state.
const seen = new Set();
const probe = `(() => { const g = window.__game; if (!g) return null; const s = g.scene.getScene('BattleScene');
  if (!s || !s.sys.isActive()) { const b = g.scene.getScene('BracketScene'); return { scene: g.scene.getScenes(true).map(x=>x.scene.key).join(','), bready: !!(b && b.sys.isActive() && b.ready), bmi: b && b.mi }; }
  const lbl = s.hud && (s.hud.left.skillLabel || s.hud.right.skillLabel);
  const cdTxt = s.hud && s.hud.slots.K.cdText.text;
  return { scene: 'BattleScene', m: s.matchIndex, active: s.active, staggered: !!s.staggered, ended: !!s.ended, freeze: s.freezeT, star: !!s.starShown,
    guard: !!s.guardAura, zoom: s.cameras.main.zoom, label: !!lbl, cd: cdTxt, ehp: s.enemy && s.enemy.hp, php: s.player && s.player.hp }; })()`;
let last = '';
while (!stopped && Date.now() - t0 < maxSec * 1000) {
  for (const k of keyPlan) {
    if (!k.done && (Date.now() - t0) / 1000 >= k.t) {
      k.done = true;
      const key = k.code.replace(/^Key|^Digit/, '').toLowerCase();
      const vk = k.code.startsWith('Digit') ? 48 + Number(key) : key.toUpperCase().charCodeAt(0);
      await send('Input.dispatchKeyEvent', { type: 'keyDown', code: k.code, key, windowsVirtualKeyCode: vk });
      await send('Input.dispatchKeyEvent', { type: 'keyUp', code: k.code, key, windowsVirtualKeyCode: vk });
      logs.push(`[${el()}] KEY ${k.code}`);
    }
  }
  const st = await evaluate(probe);
  if (st) {
    const key = JSON.stringify({ s: st.scene, m: st.m });
    if (key !== last) { logs.push(`[${el()}] probe scene ${key}`); last = key; await shot(`${el()}_scene_${st.scene}_${st.m ?? ''}`);
      if (st.scene === 'BattleScene') { await sleep(700); await shot(`${el()}_m${st.m}_intro_a`); await sleep(900); await shot(`${el()}_m${st.m}_intro_b`); }
      else if (st.scene && !/Logo|Bracket/.test(st.scene)) { await sleep(1600); await shot(`${el()}_${st.scene}_mid`); } }
    if (/Intro|Champion|Recruit/.test(st.scene || '') && Date.now() - (globalThis.__lastSeq || 0) > 2200) { globalThis.__lastSeq = Date.now(); await shot(`${el()}_${st.scene}_seq`); }
    if (st.bready && !seen.has('bracket'+st.bmi)) { seen.add('bracket'+st.bmi); await shot(`${el()}_bracket_ready_${st.bmi}`); }
    if (st.scene === 'BattleScene') {
      const tag = (n) => `${st.m}_${n}`;
      if (st.label && st.cd && !seen.has(tag('labelcd'))) { seen.add(tag('labelcd')); await shot(`${el()}_m${st.m}_label_cd`); }
      if (st.guard && !seen.has(tag('guard'))) { seen.add(tag('guard')); await sleep(250); await shot(`${el()}_m${st.m}_guard`); }
      if (st.staggered && !seen.has(tag('stagger'))) { seen.add(tag('stagger')); logs.push(`[${el()}] STAGGER m${st.m} ehp=${st.ehp}`); await shot(`${el()}_m${st.m}_stagger`); }
      if (st.ended && st.freeze > 50 && st.zoom === 1 && !seen.has(tag('cut'))) { seen.add(tag('cut')); logs.push(`[${el()}] KO start m${st.m}`); await shot(`${el()}_m${st.m}_cut`); }
      if (st.ended && st.zoom > 1.05 && !seen.has(tag('zoom'))) { seen.add(tag('zoom')); logs.push(`[${el()}] zoom m${st.m}`); await shot(`${el()}_m${st.m}_zoom`); }
      if (st.star && !seen.has(tag('star'))) { seen.add(tag('star')); logs.push(`[${el()}] STAR m${st.m}`); await sleep(500); await shot(`${el()}_m${st.m}_star`); }
    }
  }
  await sleep(40);
}
await shot(`${el()}_final`);
writeFileSync(join(outDir, 'console.log'), logs.join('\n'));
console.log(logs.filter((l) => /error|EXCEPTION|warn|\[flow\]|STAGGER|KO start|zoom|STAR|probe|\[data\]/i.test(l)).join('\n'));
ws.close();
chrome.kill();
process.exit(0);
