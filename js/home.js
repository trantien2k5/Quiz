/* ===== HOME SCREEN ===== */
function renderHome() {
  const sets = getSets();
  const recentSets = sets.slice().reverse().slice(0, 3);
  const recentSetsEl = document.getElementById('home-recent-sets');
  if (!recentSets.length) {
    recentSetsEl.innerHTML = `<div class="home-empty">Chưa có bộ đề nào. <button class="link-btn" onclick="navTo('library')">Tạo với AI →</button></div>`;
  } else {
    recentSetsEl.innerHTML = recentSets.map(set => {
      const qCount = set.questions ? set.questions.length : 0;
      const best = getBestScore(set.id);
      return `<div class="recent-set-item">
        <div class="recent-set-icon">📝</div>
        <div class="recent-set-info">
          <div class="recent-set-name">${esc(set.name)}</div>
          <div class="recent-set-meta">${qCount} câu${best !== null ? ` · 🏆 ${best}%` : ''}</div>
        </div>
        <div class="recent-set-btns">
          <button class="btn btn-primary btn-sm" onclick="startPractice('${set.id}')" ${qCount === 0 ? 'disabled' : ''}>🎯</button>
          <button class="btn btn-secondary btn-sm" onclick="showQuizSettings('${set.id}')" ${qCount === 0 ? 'disabled' : ''}>📝</button>
        </div>
      </div>`;
    }).join('');
  }

  const history = getHistory().slice(0, 3);
  const recentHistoryEl = document.getElementById('home-recent-history');
  if (!history.length) {
    recentHistoryEl.innerHTML = `<div class="home-empty">Chưa có lịch sử làm bài.</div>`;
  } else {
    recentHistoryEl.innerHTML = history.map(h => {
      const pct = scorePct(h.score, h.total);
      return `<div class="recent-history-item">
        <div class="history-score-circle ${scoreClass(pct)}">${pct}%</div>
        <div class="recent-history-info">
          <div class="recent-history-name">${esc(h.setName)}</div>
          <div class="recent-history-date">${fmtDate(h.date)}</div>
        </div>
      </div>`;
    }).join('');
  }
}
