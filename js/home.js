/* ===== HOME SCREEN ===== */
function renderHome() {
  const streak = calcStreak();
  const streakEl = document.getElementById('home-streak');
  if (streakEl) streakEl.textContent = streak > 0 ? `🔥 ${streak} ngày liên tiếp — tiếp tục phát huy!` : '👋 Bắt đầu học ngay hôm nay!';

  const sets = getSets();
  const history = getHistory();
  const avgPct = history.length ? Math.round(history.reduce((s, h) => s + scorePct(h.score, h.total), 0) / history.length) : 0;
  const statsEl = document.getElementById('home-stats');
  if (statsEl) statsEl.innerHTML = `
    <div class="stat-box"><div class="stat-val">${sets.length}</div><div class="stat-lbl">Bộ đề</div></div>
    <div class="stat-box"><div class="stat-val">${history.length}</div><div class="stat-lbl">Lượt làm bài</div></div>
    <div class="stat-box"><div class="stat-val">${avgPct}%</div><div class="stat-lbl">Điểm TB</div></div>`;

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

  const recentHistory = history.slice(0, 3);
  const recentHistoryEl = document.getElementById('home-recent-history');
  if (!recentHistory.length) {
    recentHistoryEl.innerHTML = `<div class="home-empty">Chưa có lịch sử làm bài.</div>`;
  } else {
    recentHistoryEl.innerHTML = recentHistory.map(h => {
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
