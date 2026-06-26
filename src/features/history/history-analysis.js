/* ===== PHÂN TÍCH (tách từ history.js — phụ thuộc helper chung định nghĩa trong history.js, load SAU history.js) ===== */

/* --- Level 2: Phân tích --- */
/* ===== Phân tích — bộ lọc + tính toán theo chủ đề/bộ đề ===== */
let _analysisFilter = { range: 'all', setId: '' };
let _skillSort = 'accuracy'; // accuracy | total | trend
let _skillSearch = '';

function _analysisFilterHistory(history) {
  const rangeDays = { '7d': 7, '30d': 30, '90d': 90, '6m': 182, '1y': 365 };
  let out = history;
  if (rangeDays[_analysisFilter.range]) {
    const cutoff = Date.now() - rangeDays[_analysisFilter.range] * 86400000;
    out = out.filter(h => h.date >= cutoff);
  }
  if (_analysisFilter.setId) out = out.filter(h => h.setId === _analysisFilter.setId);
  return out;
}

function updateAnalysisFilter() {
  _analysisFilter.range = document.getElementById('an-filter-range').value;
  _analysisFilter.setId = document.getElementById('an-filter-set').value;
  renderAnalysisBody();
}

function setSkillSort(sort) { _skillSort = sort; renderAnalysisBody(); }
function setSkillSearch(val) { _skillSearch = val; renderAnalysisBody(); }

function renderAnalysisFilterBarHtml() {
  const sets = getSets();
  return `<div class="hst-filter-bar">
    <select id="an-filter-range" class="form-control" onchange="updateAnalysisFilter()">
      <option value="7d">7 ngày</option>
      <option value="30d">30 ngày</option>
      <option value="90d">90 ngày</option>
      <option value="6m">6 tháng</option>
      <option value="1y">1 năm</option>
      <option value="all" selected>Toàn bộ</option>
    </select>
    <select id="an-filter-set" class="form-control" onchange="updateAnalysisFilter()">
      <option value="">Tất cả bộ đề</option>
      ${sets.map(s => `<option value="${s.id}">${esc(s.name)}</option>`).join('')}
    </select>
  </div>
  <div class="hst-dev-row"><span>Lọc theo Part / CEFR / Độ khó</span>${devBadge()}</div>`;
}

/* Thống kê đầy đủ theo chủ đề (skillTags) — accuracy/điểm/thời gian/XP/mức thành thạo.
   Câu thuộc nhiều chủ đề thì cộng vào tất cả chủ đề liên quan (đúng quy tắc xử lý dữ liệu). */
function computeSkillStats(history) {
  const stats = {};
  const qStats = getQuestionStats();
  history.forEach(h => {
    const set = getSet(h.setId);
    if (!set) return;
    h.answers.forEach((ans, i) => {
      const q = set.questions[i];
      if (!q || !q.skillTags || !q.skillTags.length || ans === null) return;
      const isCorrect = ans === q.correct;
      const rt = h.responseTimes ? h.responseTimes[i] : null;
      q.skillTags.forEach(tag => {
        if (!stats[tag]) stats[tag] = { skill: tag, correct: 0, wrong: 0, rtSum: 0, rtCount: 0, qIds: new Set() };
        const s = stats[tag];
        if (isCorrect) s.correct++; else s.wrong++;
        if (rt != null) { s.rtSum += rt; s.rtCount++; }
        s.qIds.add(q.id);
      });
    });
  });
  return Object.values(stats).map(s => {
    const total = s.correct + s.wrong;
    const pLs = [...s.qIds].map(id => (qStats[id] || {}).pL ?? 0.3);
    return {
      skill: s.skill, total, correct: s.correct, wrong: s.wrong,
      accuracy: total ? Math.round(s.correct / total * 100) : 0,
      avgTimeSec: s.rtCount ? Math.round(s.rtSum / s.rtCount / 1000) : null,
      xp: s.correct * XP_PER_CORRECT + s.wrong * XP_PER_WRONG,
      mastery: pLs.length ? Math.round(pLs.reduce((a, b) => a + b, 0) / pLs.length * 100) : 0,
      trend: calcSkillTrend(history, s.skill)
    };
  });
}

/* So sánh accuracy nửa đầu vs nửa sau (theo thời gian) của các lượt làm thuộc 1 chủa đề */
function calcSkillTrend(history, skill) {
  const matches = [];
  history.forEach(h => {
    const set = getSet(h.setId);
    if (!set) return;
    h.answers.forEach((ans, i) => {
      const q = set.questions[i];
      if (q && q.skillTags && q.skillTags.includes(skill) && ans !== null) matches.push({ date: h.date, correct: ans === q.correct });
    });
  });
  if (matches.length < 6) return null;
  matches.sort((a, b) => a.date - b.date);
  const half = Math.floor(matches.length / 2);
  const pct = arr => Math.round(arr.filter(m => m.correct).length / arr.length * 100);
  return pct(matches.slice(half)) - pct(matches.slice(0, half));
}

function generateAnalysisInsights(history, skillStats, setStats) {
  if (history.length < 5) return [];
  const out = [];
  const bySkillAcc = [...skillStats].filter(s => s.total >= 10).sort((a, b) => b.accuracy - a.accuracy);
  if (bySkillAcc.length) out.push({ icon: '💪', text: `"${bySkillAcc[0].skill}" đang là điểm mạnh nhất (${bySkillAcc[0].accuracy}%).` });
  const declining = skillStats.filter(s => s.trend !== null && s.trend <= -8).sort((a, b) => a.trend - b.trend);
  if (declining.length) out.push({ icon: '📉', text: `"${declining[0].skill}" giảm ${Math.abs(declining[0].trend)}%.` });
  const weakest = [...skillStats].filter(s => s.total >= 10).sort((a, b) => a.accuracy - b.accuracy);
  if (weakest.length) out.push({ icon: '⚠️', text: `"${weakest[0].skill}" có Accuracy thấp nhất (${weakest[0].accuracy}%).` });
  const slowest = [...skillStats].filter(s => s.avgTimeSec != null).sort((a, b) => b.avgTimeSec - a.avgTimeSec);
  if (slowest.length) out.push({ icon: '⏱', text: `Bạn mất nhiều thời gian nhất ở "${slowest[0].skill}" (~${slowest[0].avgTimeSec}s/câu).` });
  const improving = skillStats.filter(s => s.trend !== null && s.trend >= 8).sort((a, b) => b.trend - a.trend);
  if (improving.length) out.push({ icon: '🚀', text: `"${improving[0].skill}" là chủ đề tiến bộ nhanh nhất (+${improving[0].trend}%).` });
  if (!out.length && setStats.length) {
    const w = [...setStats].sort((a, b) => a.accuracy - b.accuracy)[0];
    out.push({ icon: '📚', text: `Bạn nên ưu tiên luyện lại "${w.name}" (${w.accuracy}%).` });
  }
  return out.slice(0, 5);
}

function hideAnalysisDetail() { document.getElementById('modal-analysis-detail').classList.remove('active'); }

function showSkillDetail(skill) {
  const history = _analysisFilterHistory(getHistory());
  document.getElementById('analysis-detail-title').textContent = `Chủ đề: ${skill}`;
  const rows = [];
  history.forEach(h => {
    const set = getSet(h.setId);
    if (!set) return;
    h.answers.forEach((ans, i) => {
      const q = set.questions[i];
      if (q && q.skillTags && q.skillTags.includes(skill) && ans !== null)
        rows.push({ q, setName: h.setName, isCorrect: ans === q.correct });
    });
  });
  const body = document.getElementById('analysis-detail-body');
  if (!rows.length) { body.innerHTML = '<p style="text-align:center;padding:16px;color:var(--color-text-muted)">Không có dữ liệu</p>'; }
  else {
    const acc = Math.round(rows.filter(r => r.isCorrect).length / rows.length * 100);
    body.innerHTML = `<div class="hst-metric-row" style="padding:0 0 8px"><div class="hst-metric-card"><div class="hst-metric-title">Accuracy</div><div class="hst-metric-val">${acc}%</div></div><div class="hst-metric-card"><div class="hst-metric-title">Số câu</div><div class="hst-metric-val">${rows.length}</div></div></div>` +
      rows.filter(r => !r.isCorrect).slice(0, 20).map(r => `<div class="hst-mistake-card">
        <div class="hst-mistake-top"><span class="hst-mistake-badge">Sai</span><span class="hst-mistake-set">${esc(r.setName)}</span></div>
        <div class="hst-mistake-q">${esc(r.q.text)}</div>
        <div class="hst-mistake-correct">✅ ${esc(r.q.options[r.q.correct])}</div>
      </div>`).join('');
  }
  document.getElementById('modal-analysis-detail').classList.add('active');
}

function showSetDetail(setId) {
  const set = getSet(setId);
  if (!set) return;
  document.getElementById('analysis-detail-title').textContent = `Bộ đề: ${set.name}`;
  const history = _analysisFilterHistory(getHistory()).filter(h => h.setId === setId);
  const body = document.getElementById('analysis-detail-body');
  body.innerHTML = history.length
    ? history.map(h => `<div class="hst-log-item" onclick="viewHistoryEntry('${h.id}')">
        <div class="history-score-circle ${scoreClass(scorePct(h.score, h.total))}">${scorePct(h.score, h.total)}%</div>
        <div class="hst-log-item-info"><div class="hst-log-item-name">${esc(fmtDate(h.date))}</div><div class="hst-log-item-meta">${h.score}/${h.total} câu đúng · ${fmtTime(h.timeTaken)}</div></div>
      </div>`).join('')
    : '<p style="text-align:center;padding:16px;color:var(--color-text-muted)">Không có dữ liệu</p>';
  document.getElementById('modal-analysis-detail').classList.add('active');
}

function renderHistoryAnalysis() {
  const history = getHistory();
  const el = document.getElementById('hst-analysis-body');
  if (!history.length) {
    el.innerHTML = `<div class="empty-state"><div class="empty-icon">🧩</div><h3>Bạn chưa có đủ dữ liệu để phân tích.</h3><button class="btn btn-primary" onclick="navTo('library')">Bắt đầu luyện đề</button></div>`;
    return;
  }
  if (!document.getElementById('hst-analysis-charts')) {
    el.innerHTML = `${renderAnalysisFilterBarHtml()}<div id="hst-analysis-charts"></div>`;
  }
  renderAnalysisBody();
}

function renderAnalysisBody() {
  const history = _analysisFilterHistory(getHistory());
  const container = document.getElementById('hst-analysis-charts');
  if (history.length < 1) {
    container.innerHTML = `<p style="text-align:center;padding:20px;color:var(--color-text-muted)">Không đủ dữ liệu trong bộ lọc hiện tại</p>`;
    return;
  }

  let skillStats = computeSkillStats(history);
  if (_skillSearch) skillStats = skillStats.filter(s => s.skill.toLowerCase().includes(_skillSearch.toLowerCase()));
  skillStats.sort((a, b) => _skillSort === 'total' ? b.total - a.total : _skillSort === 'trend' ? (b.trend ?? -999) - (a.trend ?? -999) : b.accuracy - a.accuracy);

  const setStats = computeSetStats(history);
  const insights = generateAnalysisInsights(history, computeSkillStats(history), setStats);

  const skillRowsHtml = skillStats.length
    ? skillStats.slice(0, 20).map(s => {
        const tooFew = s.total < 10;
        const color = s.accuracy >= 70 ? 'var(--color-success)' : s.accuracy < 50 ? 'var(--color-danger)' : 'var(--color-warning)';
        return `<div class="hst-skill-row" onclick="showSkillDetail('${esc(s.skill)}')">
          <div class="hst-skill-row-top">
            <span class="hst-skill-name">${esc(s.skill)}</span>
            <span class="hst-skill-acc" style="color:${color}">${s.accuracy}%</span>
          </div>
          <div class="hst-weak-topic-bar" style="width:100%"><div class="hst-weak-topic-fill" style="width:${s.accuracy}%;background:${color}"></div></div>
          ${tooFew ? `<div class="hst-skill-meta" style="color:var(--color-text-muted)">Dữ liệu chưa đủ để đánh giá.</div>`
            : `<div class="hst-skill-meta">${s.total} câu · ${s.correct} đúng · ${s.wrong} sai${s.avgTimeSec != null ? ` · ${s.avgTimeSec}s/câu` : ''} · ${s.xp} XP · Thành thạo ${s.mastery}%${s.trend !== null ? ` · ${trendHtml(s.trend)}` : ''}</div>`}
        </div>`;
      }).join('')
    : '<p style="text-align:center;padding:16px;color:var(--color-text-muted)">Chưa có dữ liệu kỹ năng (câu hỏi cần gắn skillTags)</p>';

  const sortedSets = [...setStats].sort((a, b) => b.sessions - a.sessions);
  const bestSet = setStats.length ? [...setStats].sort((a, b) => b.accuracy - a.accuracy)[0] : null;
  const hardestSet = setStats.length ? [...setStats].sort((a, b) => a.accuracy - b.accuracy)[0] : null;
  const mostPracticedSet = sortedSets[0] || null;

  const setRowsHtml = sortedSets.slice(0, 15).map(s => `
    <div class="hst-set-brow" style="cursor:pointer" onclick="showSetDetail('${s.setId}')">
      <span class="hst-set-name">${esc(s.name)}</span>
      <span class="hst-set-col" style="color:var(--color-text-muted)">${fmtDateShort(s.lastDate)}</span>
      <span class="hst-set-col" style="font-weight:700;color:${s.accuracy >= 70 ? 'var(--color-success)' : 'var(--color-danger)'}">${s.accuracy}%</span>
      <span class="hst-set-col">${s.avg}%</span>
      <span class="hst-set-col">${fmtTime(s.totalTime)}</span>
      <span class="hst-set-col">${s.sessions}</span>
    </div>`).join('');

  container.innerHTML = `
    <div class="hst-chart-card">
      <div class="hst-chart-title">1. Phân tích theo chủ đề</div>
      <div class="hst-chart-toggles">
        <input type="text" class="form-control" placeholder="Tìm chủ đề..." value="${esc(_skillSearch)}" oninput="setSkillSearch(this.value)" style="flex:1">
        <select class="form-control" onchange="setSkillSort(this.value)" style="flex:1">
          <option value="accuracy" ${_skillSort === 'accuracy' ? 'selected' : ''}>Sắp xếp: Accuracy</option>
          <option value="total" ${_skillSort === 'total' ? 'selected' : ''}>Sắp xếp: Số câu</option>
          <option value="trend" ${_skillSort === 'trend' ? 'selected' : ''}>Sắp xếp: Tiến bộ</option>
        </select>
      </div>
      <div class="hst-skill-list">${skillRowsHtml}</div>
    </div>

    <div class="hst-chart-card">
      <div class="hst-chart-title">2. Phân tích theo bộ đề</div>
      ${bestSet ? `<div class="hst-metric-row" style="padding:0 0 8px">
        <div class="hst-metric-card"><div class="hst-metric-title">🏆 Tốt nhất</div><div class="hst-metric-val" style="font-size:14px">${esc(bestSet.name)}</div></div>
        <div class="hst-metric-card"><div class="hst-metric-title">⚠️ Khó nhất</div><div class="hst-metric-val" style="font-size:14px">${esc(hardestSet.name)}</div></div>
        <div class="hst-metric-card"><div class="hst-metric-title">🔁 Luyện nhiều nhất</div><div class="hst-metric-val" style="font-size:14px">${esc(mostPracticedSet.name)}</div></div>
      </div>` : ''}
      <div class="hst-set-brow hst-set-head">
        <span class="hst-set-name">Bộ đề</span><span class="hst-set-col">Gần nhất</span><span class="hst-set-col">Accuracy</span><span class="hst-set-col">Điểm</span><span class="hst-set-col">Thời gian</span><span class="hst-set-col">Lần</span>
      </div>
      ${setRowsHtml}
      ${setStats.length >= 2 ? svgBarChart(sortedSets.slice(0, 8).map(s => ({ l: s.name.slice(0, 4), v: s.accuracy })), { color: '#6366F1' }) : ''}
    </div>

    <div class="hst-chart-card">
      ${devRow('3. Theo Part')}
      ${devRow('4. Theo từ loại')}
      ${devRow('5. Theo ngữ pháp')}
      ${devRow('6. Theo CEFR')}
      ${devRow('7. Theo độ khó')}
      ${devRow('8. Theo loại câu')}
      ${devRow('9. Theo nguồn')}
      <div style="font-size:11px;color:var(--color-text-muted);padding-top:6px">Cần thêm field tag trên câu hỏi mới hiển thị được — đã hỏi và giữ nguyên quyết định bỏ qua phần này.</div>
    </div>

    <div class="hst-section-header"><div class="section-label">AI Insight</div></div>
    <div class="hst-chart-card">
      ${insights.length ? `<div class="hst-insights">${insights.map(i => `<div class="hst-insight-item"><span class="hst-insight-icon">${i.icon}</span>${esc(i.text)}</div>`).join('')}</div>` : '<p style="text-align:center;padding:8px;color:var(--color-text-muted);font-size:13px">Chưa đủ dữ liệu để gợi ý</p>'}
    </div>`;
}
