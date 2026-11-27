// Builds lookup maps from the raw JSON files and reports broken data clearly in the console.
export const DATA_FILES = ['characters', 'skills', 'teams', 'bracket', 'stages', 'texts', 'crowd'];

function indexById(list, fileName, errors) {
  const map = {};
  (list || []).forEach((item, i) => {
    if (!item || !item.id) { errors.push(`${fileName}.json: item #${i} has no "id"`); return; }
    if (map[item.id]) errors.push(`${fileName}.json: duplicate id "${item.id}"`);
    map[item.id] = item;
  });
  return map;
}

function requireFields(map, fileName, fields, errors) {
  Object.values(map).forEach((item) => {
    fields.forEach((f) => {
      if (item[f] === undefined || item[f] === null || item[f] === '') errors.push(`${fileName}.json: "${item.id}" is missing "${f}"`);
    });
  });
}

export function buildData(raw) {
  const errors = [];
  const characters = indexById(raw.characters?.characters, 'characters', errors);
  const skills = indexById(raw.skills?.skills, 'skills', errors);
  const teams = indexById(raw.teams?.teams, 'teams', errors);
  const stages = indexById(raw.stages?.stages, 'stages', errors);
  const bracket = raw.bracket || { matches: [], quarterfinals: [], rouletteTeamIds: [] };
  const texts = raw.texts || {};

  requireFields(characters, 'characters', ['name', 'teamId', 'image', 'maxHp', 'speed', 'scale'], errors);
  requireFields(skills, 'skills', ['name', 'type'], errors);
  requireFields(teams, 'teams', ['name', 'characterId', 'color'], errors);
  requireFields(stages, 'stages', ['image', 'floorY', 'platformLeft', 'platformRight'], errors);
  // Top-down arena ring: per-stage values override stages.json "arenaDefaults".
  const ARENA_FALLBACK = { cx: 640, cy: 446, rx: 610, ry: 258, perspective: 0.62, unitScale: 0.36, bodyRadius: 26, startOffsetX: 440, startOffsetY: 20, fxScale: 0.6 };
  const arenaDefaults = { ...ARENA_FALLBACK, ...(raw.stages?.arenaDefaults || {}) };
  Object.values(stages).forEach((st) => {
    st.ring = { ...arenaDefaults, ...(st.ring || {}) };
    if (typeof st.ring.startOffsetY !== 'number') { errors.push(`stages.json: "${st.id}" ring.startOffsetY must be a number`); st.ring.startOffsetY = ARENA_FALLBACK.startOffsetY; }
    ['cx', 'cy', 'rx', 'ry', 'perspective', 'unitScale', 'bodyRadius', 'startOffsetX', 'fxScale'].forEach((k) => {
      if (typeof st.ring[k] !== 'number' || !(st.ring[k] > 0)) { errors.push(`stages.json: "${st.id}" ring.${k} must be a positive number`); st.ring[k] = ARENA_FALLBACK[k]; }
    });
  });
  const SHAPES = ['cone', 'circle', 'line', 'dash'];
  Object.values(skills).forEach((sk) => {
    if (['mimic', 'guard'].includes(sk.type)) return;
    if (!SHAPES.includes(sk.shape)) errors.push(`skills.json: "${sk.id}" shape must be one of ${SHAPES.join('/')} (got "${sk.shape}")`);
    if (sk.shape === 'cone' && !(sk.range > 0 && sk.angle > 0)) errors.push(`skills.json: "${sk.id}" cone needs "range" and "angle"`);
    if (sk.shape === 'circle' && !(sk.radius > 0)) errors.push(`skills.json: "${sk.id}" circle needs "radius"`);
    if ((sk.shape === 'line' || sk.shape === 'dash') && !(sk.length > 0 && sk.width > 0)) errors.push(`skills.json: "${sk.id}" ${sk.shape} needs "length" and "width"`);
  });

  Object.values(characters).forEach((c) => {
    if (c.teamId && !teams[c.teamId]) errors.push(`characters.json: "${c.id}" teamId "${c.teamId}" not found in teams.json`);
    if (c.signatureSkillId && !skills[c.signatureSkillId]) errors.push(`characters.json: "${c.id}" signatureSkillId "${c.signatureSkillId}" not found in skills.json`);
    (c.phase2?.extraSkillIds || []).forEach((s) => { if (!skills[s]) errors.push(`characters.json: "${c.id}" phase2 skill "${s}" not found`); });
  });
  Object.values(teams).forEach((t) => {
    if (t.characterId && !characters[t.characterId]) errors.push(`teams.json: "${t.id}" characterId "${t.characterId}" not found in characters.json`);
  });
  (bracket.matches || []).forEach((m, i) => {
    if (!teams[m.opponentTeamId]) errors.push(`bracket.json: match #${i} opponentTeamId "${m.opponentTeamId}" not found`);
    if (!stages[m.stageId]) errors.push(`bracket.json: match #${i} stageId "${m.stageId}" not found`);
  });
  (bracket.rouletteTeamIds || []).forEach((id) => {
    if (!teams[id]) errors.push(`bracket.json: roulette team "${id}" not found in teams.json`);
  });
  // 8-team tournament: qf1+qf2 = left half (qf1 is ours), qf3+qf4 = right half.
  const qf = bracket.quarterfinals || [];
  if (qf.length !== 4) errors.push(`bracket.json: "quarterfinals" needs exactly 4 matches (got ${qf.length})`);
  const seen = new Set();
  qf.forEach((q, i) => {
    const ids = q.teamIds || [];
    if (ids.length !== 2) errors.push(`bracket.json: quarterfinal #${i} needs 2 teamIds`);
    ids.forEach((id) => {
      if (!teams[id]) errors.push(`bracket.json: quarterfinal #${i} team "${id}" not found in teams.json`);
      if (seen.has(id)) errors.push(`bracket.json: team "${id}" appears in two quarterfinals`);
      seen.add(id);
    });
    if (!ids.includes(q.winnerId)) errors.push(`bracket.json: quarterfinal #${i} winnerId "${q.winnerId}" must be one of its teamIds`);
  });
  if (qf.length === 4 && (bracket.matches || []).length === 3) {
    const [m0, m1, m2] = bracket.matches;
    if (qf[0].winnerId !== 'bosombosom' || !qf[0].teamIds?.includes('bosombosom')) errors.push('bracket.json: quarterfinal #0 must contain and be won by "bosombosom"');
    if (!qf[0].teamIds?.includes(m0.opponentTeamId)) errors.push(`bracket.json: match #0 opponent "${m0.opponentTeamId}" must be bosombosom's quarterfinal opponent`);
    if (m1.opponentTeamId !== qf[1].winnerId) errors.push(`bracket.json: match #1 opponent "${m1.opponentTeamId}" must be the winner of quarterfinal #1 ("${qf[1].winnerId}")`);
    if (![qf[2].winnerId, qf[3].winnerId].includes(m2.opponentTeamId)) errors.push(`bracket.json: match #2 opponent "${m2.opponentTeamId}" must be a winner of quarterfinal #2 or #3`);
  }
  ['basic_attack', 'spike_roll', 'mimic', 'guard', 'enemy_jab'].forEach((id) => {
    if (!skills[id]) errors.push(`skills.json: required skill "${id}" is missing`);
  });
  if (!characters.bosomi) errors.push('characters.json: player character "bosomi" is missing');
  if (!stages.arena) errors.push('stages.json: "arena" stage is missing (used by opening/title/ending)');

  if (errors.length) {
    console.error(`[data] ${errors.length} problem(s) found in data/*.json:\n - ` + errors.join('\n - '));
  } else {
    console.log('[data] all data files OK');
  }
  // Draft candidates in the stands (crowd.json).
  const crowdRaw = raw.crowd || {};
  const crowdGroups = indexById(crowdRaw.groups, 'crowd', errors);
  const crowdMembers = indexById(crowdRaw.members, 'crowd', errors);
  Object.values(crowdMembers).forEach((m) => {
    if (!m.name) errors.push(`crowd.json: member "${m.id}" is missing "name"`);
    if (!crowdGroups[m.groupId]) errors.push(`crowd.json: member "${m.id}" groupId "${m.groupId}" not found in groups`);
  });
  const crowd = {
    groups: crowdGroups,
    members: Object.values(crowdMembers),
    openSlots: crowdRaw.openSlots ?? 0,
    cheerLines: Array.isArray(crowdRaw.cheerLines) && crowdRaw.cheerLines.length ? crowdRaw.cheerLines : ['보솜보솜 멋지다!'],
    genres: Array.isArray(crowdRaw.genres) ? crowdRaw.genres : [],
  };
  const battleIntro = raw.stages?.battleIntro || {};
  ['vsMs', 'sendOutMs', 'bannerMs', 'wipeMs'].forEach((k) => {
    if (battleIntro[k] !== undefined && !(typeof battleIntro[k] === 'number' && battleIntro[k] >= 0)) errors.push(`stages.json: battleIntro.${k} must be a number of ms (>= 0)`);
  });
  return { characters, skills, teams, stages, bracket, texts, battleIntro, crowd, errors };
}

export function text(key, fallback = '') {
  return (window.__bbTexts && window.__bbTexts[key] !== undefined) ? window.__bbTexts[key] : fallback;
}
