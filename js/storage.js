/* ===== STORAGE ===== */
function getQuestionStats() {
  try { return JSON.parse(localStorage.getItem('quiz_q_stats') || '{}'); } catch { return {}; }
}
function saveQuestionStats(stats) { localStorage.setItem('quiz_q_stats', JSON.stringify(stats)); }
function trackQuestionResult(questionId, isCorrect, selectedIdx, correctIdx) {
  const stats = getQuestionStats();
  if (!stats[questionId]) stats[questionId] = { firstSeen: new Date().toISOString().slice(0, 10), reviewCount: 0, correct: 0, wrong: 0, optionPattern: {} };
  stats[questionId].reviewCount++;
  if (isCorrect) stats[questionId].correct++;
  else {
    stats[questionId].wrong++;
    const key = `${selectedIdx}->${correctIdx}`;
    stats[questionId].optionPattern[key] = (stats[questionId].optionPattern[key] || 0) + 1;
  }
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
