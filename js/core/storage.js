/* ===== STORAGE ===== */
function getQuestionStats() {
  try { return JSON.parse(localStorage.getItem('quiz_q_stats') || '{}'); } catch { return {}; }
}
function saveQuestionStats(stats) { localStorage.setItem('quiz_q_stats', JSON.stringify(stats)); }
/* BKT params: PG=guess(1/4), PS=slip, PT=transit */
function _bktUpdate(pL, isCorrect, rtMs) {
  const PG = 0.25, PS = 0.08, PT = 0.09;
  const pLGiven = isCorrect
    ? (pL * (1 - PS)) / (pL * (1 - PS) + (1 - pL) * PG)
    : (pL * PS)       / (pL * PS       + (1 - pL) * (1 - PG));
  let pLNew = pLGiven + (1 - pLGiven) * PT;
  if (rtMs != null) {
    const delta = pLNew - pL;
    const fast = rtMs < 8000, slow = rtMs > 25000;
    // fast+correct=confident→+35%, fast+wrong=misconception→drop 30% more, slow+correct=uncertain→-30%
    const factor = fast ? (isCorrect ? 1.35 : 1.3) : (slow && isCorrect ? 0.7 : 1.0);
    pLNew = pL + delta * factor;
  }
  return Math.max(0, Math.min(1, pLNew));
}

function trackQuestionResult(questionId, isCorrect, selectedIdx, correctIdx, rtMs) {
  const stats = getQuestionStats();
  if (!stats[questionId]) stats[questionId] = {
    firstSeen: new Date().toISOString().slice(0, 10),
    reviewCount: 0, correct: 0, wrong: 0, optionPattern: {}, pL: 0.3
  };
  const s = stats[questionId];
  s.reviewCount++;
  if (isCorrect) s.correct++;
  else {
    s.wrong++;
    const key = `${selectedIdx}->${correctIdx}`;
    s.optionPattern[key] = (s.optionPattern[key] || 0) + 1;
  }
  s.pL = _bktUpdate(s.pL ?? 0.3, isCorrect, rtMs ?? null);
  saveQuestionStats(stats);
}

function getSets() {
  try { return JSON.parse(localStorage.getItem('quiz_sets') || '[]'); } catch { return []; }
}
function saveSets(sets) {
  localStorage.setItem('quiz_sets', JSON.stringify(sets));
}
function getHistory() {
  try { return JSON.parse(localStorage.getItem('quiz_history') || '[]'); } catch { return []; }
}
function saveHistory(history) {
  localStorage.setItem('quiz_history', JSON.stringify(history));
}
function getSet(id) {
  return getSets().find(s => s.id === id) || null;
}
function saveSet(set) {
  const sets = getSets();
  const idx = sets.findIndex(s => s.id === set.id);
  if (idx >= 0) sets[idx] = set; else sets.unshift(set);
  saveSets(sets);
}
function deleteSet(id) {
  saveSets(getSets().filter(s => s.id !== id));
  saveHistory(getHistory().filter(h => h.setId !== id));
}
function addHistoryEntry(entry) {
  const history = getHistory();
  history.unshift(entry);
  if (history.length > 500) history.splice(500);
  saveHistory(history);
}
function getBestScore(setId) {
  const entries = getHistory().filter(h => h.setId === setId);
  if (!entries.length) return null;
  return entries.reduce((best, h) => {
    const pct = scorePct(h.score, h.total);
    return pct > best ? pct : best;
  }, 0);
}

/* ===== SKILL / TOPIC DAILY LOG ===== */
function getSkillLog() { try { return JSON.parse(localStorage.getItem('quiz_skill_log')||'{}'); } catch{return{};} }
function getTopicLog() { try { return JSON.parse(localStorage.getItem('quiz_topic_log')||'{}'); } catch{return{};} }
function _appendDayLog(storageKey, name, date, c, w) {
  if (!name || (!c && !w)) return;
  try {
    const log = JSON.parse(localStorage.getItem(storageKey)||'{}');
    if (!log[name]) log[name] = {};
    if (!log[name][date]) log[name][date] = {c:0,w:0};
    log[name][date].c += c;
    log[name][date].w += w;
    // Giữ tối đa 90 ngày gần nhất
    const days = Object.keys(log[name]).sort();
    if (days.length > 90) days.slice(0, days.length-90).forEach(d => delete log[name][d]);
    localStorage.setItem(storageKey, JSON.stringify(log));
  } catch(e){}
}
function appendSkillLog(skill, date, c, w) { _appendDayLog('quiz_skill_log', skill, date, c, w); }
function appendTopicLog(topic, date, c, w)  { _appendDayLog('quiz_topic_log', topic, date, c, w); }

/* ===== AI CONFIG (API key, model, tỷ giá) ===== */
function getAiConfig() {
  try { return JSON.parse(localStorage.getItem('quiz_ai_config') || '{}'); } catch { return {}; }
}
function saveAiConfig(cfg) {
  localStorage.setItem('quiz_ai_config', JSON.stringify(cfg));
}

/* ===== AI USAGE LOG (token, chi phí mỗi lượt gọi API) ===== */
function getAiUsageLog() {
  try { return JSON.parse(localStorage.getItem('quiz_ai_usage_log') || '[]'); } catch { return []; }
}
function logAiUsage(entry) {
  const log = getAiUsageLog();
  log.unshift(entry);
  if (log.length > 500) log.splice(500);
  localStorage.setItem('quiz_ai_usage_log', JSON.stringify(log));
}
function clearAiUsageLog() {
  localStorage.removeItem('quiz_ai_usage_log');
}
