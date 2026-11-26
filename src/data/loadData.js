// Builds lookup maps from the raw JSON files and reports broken data clearly in the console.
export const DATA_FILES = ['characters', 'skills', 'teams', 'bracket', 'stages', 'texts'];

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
  const bracket = raw.bracket || { matches: [], leftTeamIds: [], rightTeamIds: [], rouletteTeamIds: [] };
  const texts = raw.texts || {};

  requireFields(characters, 'characters', ['name', 'teamId', 'image', 'maxHp', 'speed', 'scale'], errors);
  requireFields(skills, 'skills', ['name', 'type'], errors);
  requireFields(teams, 'teams', ['name', 'characterId', 'color'], errors);
  requireFields(stages, 'stages', ['image', 'floorY', 'platformLeft', 'platformRight'], errors);

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
  [...(bracket.leftTeamIds || []), ...(bracket.rightTeamIds || []), ...(bracket.rouletteTeamIds || [])].forEach((id) => {
    if (!teams[id]) errors.push(`bracket.json: team "${id}" not found in teams.json`);
  });
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
  return { characters, skills, teams, stages, bracket, texts, errors };
}

export function text(key, fallback = '') {
  return (window.__bbTexts && window.__bbTexts[key] !== undefined) ? window.__bbTexts[key] : fallback;
}
