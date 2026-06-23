/* ===== HISTORY ===== */

function calcStreak() {
  const history = getHistory();
  if (!history.length) return 0;
  const daySet = new Set(history.map(h => new Date(h.date).toDateString()));
  let streak = 0;
  for (let i = 0; i < 365; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    if (daySet.has(d.toDateString())) streak++;
    else if (i > 0) break;
  }
  return streak;
}

function svgLineChart(values, { color = '#6366F1', height = 110 } = {}) {
  if (values.length < 2) return '<p style="text-align:center;color:var(--text-muted);font-size:13px;padding:20px 0">Chưa đủ dữ liệu</p>';
  const W = 320, H = height, pad = 20;
  const scaleX = i => pad + (i / (values.length - 1)) * (W - pad * 2);
  const scaleY = v => pad + ((100 - v) / 100) * (H - pad * 2);
  const pts = values.map((v, i) => `${scaleX(i)},${scaleY(v)}`).join(' ');
  const area = `M${scaleX(0)},${H - pad} ` + values.map((v, i) => `L${scaleX(i)},${scaleY(v)}`).join(' ') + ` L${scaleX(values.length - 1)},${H - pad} Z`;
  const grids = [0, 50, 100].map(v => {
    const y = scaleY(v);
    return `<line x1="${pad}" y1="${y}" x2="${W - pad}" y2="${y}" stroke="#E5E7EB" stroke-width="1" stroke-dasharray="4,3"/>
      <text x="${pad - 4}" y="${y + 4}" text-anchor="end" font-size="10" fill="#9CA3AF">${v}</text>`;
  }).join('');
  const dots = values.map((v, i) => `<circle cx="${scaleX(i)}" cy="${scaleY(v)}" r="4" fill="${color}" stroke="white" stroke-width="2"/>`).join('');
  return `<svg viewBox="0 0 ${W} ${H}" style="width:100%;height:${H}px">
    ${grids}
    <path d="${area}" fill="${color}" fill-opacity="0.1"/>
    <polyline fill="none" stroke="${color}" stroke-width="2.5" points="${pts}"/>
    ${dots}
  </svg>`;
}

function svgBarChart(items, { color = '#059669', height = 100 } = {}) {
  if (!items.length) return '';
  const W = 320, H = height, padX = 8, padY = 8, lblH = 18;
  const max = Math.max(...items.map(d => d.v), 1);
  const bw = (W - padX * 2) / items.length;
  const bars = items.map((d, i) => {
    const bh = Math.max(d.v > 0 ? 4 : 0, (d.v / max) * (H - padY * 2 - lblH));
    const x = padX + i * bw + bw * 0.1;
    const y = padY + (H - padY * 2 - lblH) - bh;
    return `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${(bw * 0.8).toFixed(1)}" height="${bh.toFixed(1)}" rx="3" fill="${d.v > 0 ? color : '#E5E7EB'}"/>
      <text x="${(x + bw * 0.4).toFixed(1)}" y="${H - 4}" text-anchor="middle" font-size="10" fill="#9CA3AF">${d.l}</text>`;
  }).join('');
  return `<svg viewBox="0 0 ${W} ${H}" style="width:100%;height:${H}px">${bars}</svg>`;
}

function getLast7DaysData(history) {
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dayStr = d.toDateString();
    const lbl = d.toLocaleDateString('vi-VN', { weekday: 'short' }).replace('.', '');
    const count = history.filter(h => new Date(h.date).toDateString() === dayStr).reduce((s, h) => s + h.total, 0);
    days.push({ l: lbl, v: count });
  }
  return days;
}

function calcScoreTrend(history) {
  if (history.length < 4) return null;
  const half = Math.min(5, Math.floor(history.length / 2));
  const recent = history.slice(0, half).map(h => scorePct(h.score, h.total));
  const prev = history.slice(half, half * 2).map(h => scorePct(h.score, h.total));
  const rAvg = Math.round(recent.reduce((s, v) => s + v, 0) / recent.length);
  const pAvg = Math.round(prev.reduce((s, v) => s + v, 0) / prev.length);
  return { diff: rAvg - pAvg, rAvg, pAvg };
}

function calcSpeedTrend(history) {
  if (history.length < 4) return null;
  const half = Math.min(5, Math.floor(history.length / 2));
  const recent = history.slice(0, half).map(h => h.total > 0 ? h.timeTaken / h.total : 0);
  const prev = history.slice(half, half * 2).map(h => h.total > 0 ? h.timeTaken / h.total : 0);
  const rAvg = recent.reduce((s, v) => s + v, 0) / recent.length;
  const pAvg = prev.reduce((s, v) => s + v, 0) / prev.length;
  return rAvg - pAvg;
}

function trendHtml(diff, unit = '%') {
  if (diff === null) return '<span style="color:var(--text-muted)">—</span>';
  if (diff > 0) return `<span class="hst-trend-up">▲ +${diff}${unit}</span>`;
  if (diff < 0) return `<span class="hst-trend-down">▼ ${diff}${unit}</span>`;
  return '<span style="color:var(--text-muted)">→ Không đổi</span>';
}

function getLevelInfo(totalQ) {
  const levels = [
    { name: 'Mới bắt đầu', min: 0,    max: 49,       icon: '🌱', color: '#9CA3AF' },
    { name: 'Học viên',    min: 50,   max: 199,      icon: '📚', color: '#6366F1' },
    { name: 'Thành thạo',  min: 200,  max: 499,      icon: '⚡', color: '#059669' },
    { name: 'Chuyên gia',  min: 500,  max: 999,      icon: '🏆', color: '#D97706' },
    { name: 'Bậc thầy',   min: 1000, max: Infinity,  icon: '🌟', color: '#DC2626' }
  ];
  const idx = levels.findIndex(l => totalQ <= l.max);
  const level = idx >= 0 ? levels[idx] : levels[4];
  const next = idx >= 0 && idx < levels.length - 1 ? levels[idx + 1] : null;
  const progress = level.max === Infinity ? 100
    : Math.round((totalQ - level.min) / (level.max - level.min + 1) * 100);
  return { ...level, progress, next, toNext: next ? next.min - totalQ : 0 };
}

function generateInsights(history) {
  if (history.length < 3) return [];
  const out = [];

  const trend = calcScoreTrend(history);
  if (trend) {
    if (trend.diff >= 5)      out.push({ icon: '📈', text: `Điểm TB tăng ${trend.diff}% so với trước (${trend.pAvg}% → ${trend.rAvg}%)` });
    else if (trend.diff <= -5) out.push({ icon: '📉', text: `Điểm TB giảm ${Math.abs(trend.diff)}% gần đây — hãy ôn lại đề yếu` });
    else                       out.push({ icon: '📊', text: `Điểm ổn định ở mức ${trend.rAvg}% — tiếp tục duy trì!` });
  }

  const pm = {};
  history.forEach(h => {
    const hr = new Date(h.date).getHours();
    const p = hr < 6 ? 'khuya' : hr < 12 ? 'sáng' : hr < 18 ? 'chiều' : 'tối';
    if (!pm[p]) pm[p] = { c: 0, t: 0 };
    pm[p].c += h.score; pm[p].t += h.total;
  });
  const periods = Object.entries(pm).filter(([, v]) => v.t >= 5)
    .map(([p, v]) => ({ p, acc: Math.round(v.c / v.t * 100) })).sort((a, b) => b.acc - a.acc);
  if (periods.length >= 2 && periods[0].acc - periods[periods.length - 1].acc >= 10)
    out.push({ icon: '⏰', text: `Làm bài tốt nhất vào buổi ${periods[0].p} (TB ${periods[0].acc}%)` });

  const topics = computeSetStats(history).filter(s => s.total >= 5);
  if (topics.length) {
    const best  = [...topics].sort((a, b) => b.accuracy - a.accuracy)[0];
    const worst = [...topics].sort((a, b) => a.accuracy - b.accuracy)[0];
    if (best.accuracy >= 80) out.push({ icon: '💪', text: `Đề mạnh nhất: "${best.name}" (${best.accuracy}%)` });
    if (worst.accuracy < 60 && worst.setId !== best.setId) out.push({ icon: '⚠️', text: `Cần cải thiện: "${worst.name}" (${worst.accuracy}%)` });
  }

  const sp = calcSpeedTrend(history);
  if (sp !== null && sp < -4) out.push({ icon: '🚀', text: `Tốc độ làm bài nhanh hơn ~${Math.abs(Math.round(sp))}s/câu` });

  const days = new Set(history.map(h => new Date(h.date).toDateString())).size;
  const span = Math.max(1, Math.round((Date.now() - new Date(history[history.length - 1].date)) / 86400000));
  const cons = Math.round(days / span * 100);
  if (cons >= 60 && history.length >= 7) out.push({ icon: '🔥', text: `Học đều đặn ${cons}% số ngày — rất ổn định!` });

  return out.slice(0, 3);
}

function renderCal30Html(history) {
  const today = new Date();
  const cells = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const ds = d.toDateString();
    const cnt = history.filter(h => new Date(h.date).toDateString() === ds).length;
    const lv = cnt === 0 ? 0 : cnt === 1 ? 1 : cnt <= 3 ? 2 : 3;
    cells.push(`<div class="cal-cell cal-lv${lv}${i === 0 ? ' cal-today' : ''}" title="${d.toLocaleDateString('vi-VN',{day:'numeric',month:'numeric'})}: ${cnt} lần làm"></div>`);
  }
  return `<div class="cal-grid">${cells.join('')}</div>
    <div class="cal-legend">
      <span>Không</span>
      <div class="cal-cell cal-lv1" style="width:12px;height:12px;flex-shrink:0"></div>
      <div class="cal-cell cal-lv2" style="width:12px;height:12px;flex-shrink:0"></div>
      <div class="cal-cell cal-lv3" style="width:12px;height:12px;flex-shrink:0"></div>
      <span>Nhiều</span>
    </div>`;
}

/* Thống kê theo từng bộ đề, group theo setId (KHÔNG theo tên — set trùng tên không bị tính chung).
   Dùng chung cho Tổng quan (insights), Tiến bộ (set breakdown) và Lỗi sai (đề yếu nhất) để số liệu nhất quán. */
function computeSetStats(history) {
  const sm = {};
  [...history].reverse().forEach(h => {
    if (!sm[h.setId]) sm[h.setId] = { setId: h.setId, name: h.setName, correct: 0, wrong: 0, scores: [], lastDate: 0 };
    const s = sm[h.setId];
    s.name = h.setName; // luôn lấy tên mới nhất nếu set bị đổi tên
    s.correct += h.score;
    s.wrong += h.total - h.score;
    s.scores.push(scorePct(h.score, h.total));
    if (h.date > s.lastDate) s.lastDate = h.date;
  });
  return Object.values(sm).map(s => {
    const total = s.correct + s.wrong;
    const sessions = s.scores.length;
    return {
      setId: s.setId, name: s.name,
      correct: s.correct, wrong: s.wrong, total, sessions,
      accuracy: total ? Math.round(s.correct / total * 100) : 0,
      wrongRate: total ? s.wrong / total : 0,
      avg: Math.round(s.scores.reduce((a, b) => a + b, 0) / sessions),
      best: Math.max(...s.scores),
      trendDiff: sessions >= 3 ? s.scores[sessions - 1] - s.scores[0] : null,
      lastDate: s.lastDate
    };
  });
}

function renderSetBreakdownHtml(history) {
  const rows = computeSetStats(history)
    .sort((a, b) => b.sessions - a.sessions).slice(0, 10)
    .map(s => {
      const tEl = s.trendDiff === null ? '—'
        : s.trendDiff > 0 ? `<span class="hst-trend-up">▲ +${s.trendDiff}%</span>`
        : s.trendDiff < 0 ? `<span class="hst-trend-down">▼ ${s.trendDiff}%</span>`
        : '<span style="color:var(--text-muted)">→</span>';
      const c = s.avg >= 80 ? 'var(--green)' : s.avg >= 60 ? 'var(--orange)' : 'var(--red)';
      return { name: s.name, avg: s.avg, best: s.best, n: s.sessions, tEl, c };
    });

  if (!rows.length) return '';
  return `<div class="hst-set-breakdown">
    <div class="hst-set-brow hst-set-head">
      <span class="hst-set-name">Bộ đề</span>
      <span class="hst-set-col">Lần</span>
      <span class="hst-set-col">TB</span>
      <span class="hst-set-col">Cao</span>
      <span class="hst-set-col">Trend</span>
    </div>
    ${rows.map(r => `<div class="hst-set-brow">
      <span class="hst-set-name">${esc(r.name)}</span>
      <span class="hst-set-col" style="color:var(--text-muted)">${r.n}</span>
      <span class="hst-set-col" style="color:${r.c};font-weight:700">${r.avg}%</span>
      <span class="hst-set-col" style="color:var(--green)">${r.best}%</span>
      <span class="hst-set-col">${r.tEl}</span>
    </div>`).join('')}
  </div>`;
}

/* --- Level 1 --- */
function renderHistory() {
  showHistoryHome(); // đóng sub-section nếu đang mở
  const history = getHistory();
  const streak = calcStreak();
  const totalTime = history.reduce((s, h) => s + (h.timeTaken || 0), 0);
  const avg = history.length ? Math.round(history.reduce((s, h) => s + scorePct(h.score, h.total), 0) / history.length) : 0;
  const totalWrong = history.reduce((s, h) => s + (h.total - h.score), 0);
  const lastDate = history.length ? fmtDateShort(history[0].date) : 'Chưa có';

  const strip = document.getElementById('hst-quick-strip');
  strip.innerHTML = streak > 0
    ? `<div class="hst-quick-chip" style="background:var(--orange)">🔥 ${streak} ngày</div>
       <div class="hst-quick-chip" style="background:var(--green)">⏱ ${fmtStudyTime(totalTime)}</div>
       <div class="hst-quick-chip" style="background:var(--purple)">${history.length} lần làm</div>`
    : '';

  document.getElementById('hst-nav-grid').innerHTML = `
    <div class="hst-nav-card" onclick="showHistorySection('overview')">
      <div class="hst-nav-card-icon">📈</div>
      <div class="hst-nav-card-title">Tổng quan</div>
      <div class="hst-nav-card-sub">${history.length} lần làm bài</div>
    </div>
    <div class="hst-nav-card" onclick="showHistorySection('progress')">
      <div class="hst-nav-card-icon">📊</div>
      <div class="hst-nav-card-title">Tiến bộ</div>
      <div class="hst-nav-card-sub">TB ${avg}%</div>
    </div>
    <div class="hst-nav-card" onclick="showHistorySection('mistakes')">
      <div class="hst-nav-card-icon">❌</div>
      <div class="hst-nav-card-title">Lỗi sai</div>
      <div class="hst-nav-card-sub">${totalWrong} câu sai tổng</div>
    </div>
    <div class="hst-nav-card" onclick="showHistorySection('log')">
      <div class="hst-nav-card-icon">📋</div>
      <div class="hst-nav-card-title">Lịch sử</div>
      <div class="hst-nav-card-sub">Gần nhất: ${lastDate}</div>
    </div>`;
}

function showHistoryHome() {
  ['overview', 'progress', 'mistakes', 'log'].forEach(n =>
    document.getElementById('hst-' + n).classList.remove('active'));
}

function showHistorySection(name) {
  ['overview', 'progress', 'mistakes', 'log'].forEach(n =>
    document.getElementById('hst-' + n).classList.remove('active'));
  document.getElementById('hst-' + name).classList.add('active');
  if (name === 'overview') renderHistoryOverview();
  else if (name === 'progress') renderHistoryProgress();
  else if (name === 'mistakes') renderHistoryMistakes();
  else if (name === 'log') renderHistoryLog();
}

/* --- Level 2: Tổng quan --- */
function renderHistoryOverview() {
  const history = getHistory();
  const el = document.getElementById('hst-overview-body');
  if (!history.length) {
    el.innerHTML = `<div class="empty-state"><div class="empty-icon">📈</div><h3>Chưa có dữ liệu</h3><p>Làm bài thi để xem thống kê</p></div>`;
    return;
  }
  const totalQ       = history.reduce((s, h) => s + h.total, 0);
  const totalCorrect = history.reduce((s, h) => s + h.score, 0);
  const avg          = Math.round(totalCorrect / totalQ * 100);
  const best         = Math.max(...history.map(h => scorePct(h.score, h.total)));
  const totalSeconds = history.reduce((s, h) => s + (h.timeTaken || 0), 0);
  const streak       = calcStreak();
  const level        = getLevelInfo(totalQ);
  const insights     = generateInsights(history);

  const levelBarHtml = level.next
    ? `<div class="hst-level-bar-wrap"><div class="hst-level-bar-fill" style="width:${level.progress}%;background:${level.color}"></div></div>
       <div class="hst-level-next">→ ${esc(level.next.name)} sau ${level.toNext} câu nữa</div>`
    : `<div class="hst-level-bar-wrap"><div class="hst-level-bar-fill" style="width:100%;background:${level.color}"></div></div>
       <div class="hst-level-next">Đã đạt cấp độ tối đa 🎉</div>`;

  const insightsHtml = insights.length
    ? `<div class="hst-insights">${insights.map(i => `<div class="hst-insight-item"><span class="hst-insight-icon">${i.icon}</span>${esc(i.text)}</div>`).join('')}</div>`
    : '';

  el.innerHTML = `
    <div class="hst-level-card" style="border-color:${level.color}">
      <div class="hst-level-icon">${level.icon}</div>
      <div class="hst-level-info">
        <div class="hst-level-name">${esc(level.name)}</div>
        <div class="hst-level-sub">${totalQ} câu đã làm</div>
        ${levelBarHtml}
      </div>
    </div>
    ${insightsHtml}
    <div class="hst-chart-card">
      <div class="hst-chart-title">Hoạt động 30 ngày qua</div>
      ${renderCal30Html(history)}
    </div>
    <div class="hst-stats-grid">
      <div class="hst-stat-card"><div class="hst-stat-val">${history.length}</div><div class="hst-stat-lbl">Lần làm bài</div></div>
      <div class="hst-stat-card"><div class="hst-stat-val">${totalQ}</div><div class="hst-stat-lbl">Câu đã làm</div></div>
      <div class="hst-stat-card"><div class="hst-stat-val">${totalCorrect}</div><div class="hst-stat-lbl">Câu đúng</div></div>
      <div class="hst-stat-card hst-stat-accent"><div class="hst-stat-val">${avg}%</div><div class="hst-stat-lbl">Điểm TB</div></div>
      <div class="hst-stat-card hst-stat-green"><div class="hst-stat-val">${best}%</div><div class="hst-stat-lbl">Cao nhất</div></div>
      <div class="hst-stat-card hst-stat-orange"><div class="hst-stat-val">${streak}</div><div class="hst-stat-lbl">Ngày liên tiếp 🔥</div></div>
      <div class="hst-stat-card" style="grid-column:1/-1">
        <div class="hst-stat-val" style="font-size:20px">${fmtStudyTime(totalSeconds)}</div>
        <div class="hst-stat-lbl">Tổng thời gian học</div>
      </div>
    </div>`;
}

/* --- Level 2: Tiến bộ --- */
function renderHistoryProgress() {
  const history = getHistory();
  const el = document.getElementById('hst-progress-body');
  if (history.length < 2) {
    el.innerHTML = `<div class="empty-state"><div class="empty-icon">📊</div><h3>Cần thêm dữ liệu</h3><p>Làm ít nhất 2 lần để xem biểu đồ tiến bộ</p></div>`;
    return;
  }
  const last10 = history.slice(0, 10).reverse();
  const scoreData = last10.map(h => scorePct(h.score, h.total));
  const dayData = getLast7DaysData(history);
  const scoreTrend = calcScoreTrend(history);
  const speedDiff = calcSpeedTrend(history);
  const speedTrendHtml = speedDiff === null ? '—'
    : speedDiff < -2 ? '<span class="hst-trend-up">▲ Nhanh hơn</span>'
    : speedDiff > 2 ? '<span class="hst-trend-down">▼ Chậm hơn</span>'
    : '<span style="color:var(--text-muted)">→ Tương đương</span>';

  const setBreakdown = renderSetBreakdownHtml(history);
  el.innerHTML = `
    <div class="hst-chart-card">
      <div class="hst-chart-title">Điểm ${last10.length} lần gần nhất</div>
      ${svgLineChart(scoreData)}
    </div>
    <div class="hst-chart-card">
      <div class="hst-chart-title">Câu làm 7 ngày qua</div>
      ${svgBarChart(dayData)}
    </div>
    <div class="hst-metric-row">
      <div class="hst-metric-card">
        <div class="hst-metric-title">Điểm TB gần đây</div>
        <div class="hst-metric-val">${trendHtml(scoreTrend ? scoreTrend.diff : null)}</div>
        ${scoreTrend ? `<div style="font-size:11px;color:var(--text-muted);margin-top:4px">${scoreTrend.rAvg}% vs ${scoreTrend.pAvg}% trước</div>` : ''}
      </div>
      <div class="hst-metric-card">
        <div class="hst-metric-title">Tốc độ làm bài</div>
        <div class="hst-metric-val">${speedTrendHtml}</div>
      </div>
    </div>
    ${setBreakdown ? `<div class="hst-chart-card">
      <div class="hst-chart-title">Kết quả theo bộ đề</div>
      ${setBreakdown}
    </div>` : ''}`;
}

/* --- Level 2: Lỗi sai --- */
function renderHistoryMistakes() {
  const history = getHistory();
  const el = document.getElementById('hst-mistakes-body');
  if (!history.length) {
    el.innerHTML = `<div class="empty-state"><div class="empty-icon">🎉</div><h3>Không có lỗi sai</h3><p>Chưa có dữ liệu lịch sử</p></div>`;
    return;
  }

  const recentWrongs = [];
  for (const entry of history.slice(0, 5)) {
    const set = getSet(entry.setId);
    if (!set) continue;
    for (let i = 0; i < entry.answers.length; i++) {
      const q = set.questions[i];
      if (q && entry.answers[i] !== null && entry.answers[i] !== q.correct) {
        recentWrongs.push({ q, setName: entry.setName });
        if (recentWrongs.length >= 8) break;
      }
    }
    if (recentWrongs.length >= 8) break;
  }

  const weakTopics = computeSetStats(history)
    .filter(s => s.wrong > 0)
    .sort((a, b) => b.wrongRate - a.wrongRate)
    .slice(0, 5)
    .map(s => ({ n: s.name, wrong: s.wrong, total: s.total, rate: s.wrongRate }));

  const wrongHtml = recentWrongs.length
    ? recentWrongs.map(({ q, setName }) => `
        <div class="hst-mistake-card">
          <div class="hst-mistake-top"><span class="hst-mistake-badge">Sai</span><span class="hst-mistake-set">${esc(setName)}</span></div>
          <div class="hst-mistake-q">${esc(q.text)}</div>
          <div class="hst-mistake-correct">✅ ${esc(q.options[q.correct])}</div>
        </div>`).join('')
    : '<p style="text-align:center;padding:20px;color:var(--text-muted)">Không có câu sai gần đây 🎉</p>';

  const topicsHtml = weakTopics.length
    ? weakTopics.map(t => `
        <div class="hst-weak-topic">
          <div class="hst-weak-topic-name">${esc(t.n)}</div>
          <div class="hst-weak-topic-bar"><div class="hst-weak-topic-fill" style="width:${Math.round(t.rate * 100)}%"></div></div>
          <div class="hst-weak-topic-pct">${Math.round(t.rate * 100)}% sai</div>
        </div>`).join('')
    : '';

  // Hotspot: câu sai 3+ lần
  const wqMap = {};
  history.forEach(h => {
    const set = getSet(h.setId);
    if (!set) return;
    h.answers.forEach((ans, i) => {
      const q = set.questions[i];
      if (!q || ans === null || ans === q.correct) return;
      const key = h.setId + ':' + (q.id || i);
      if (!wqMap[key]) wqMap[key] = { q, setName: h.setName, count: 0 };
      wqMap[key].count++;
    });
  });
  const hotspots = Object.values(wqMap).filter(w => w.count >= 3)
    .sort((a, b) => b.count - a.count).slice(0, 5);
  const hotspotsHtml = hotspots.length
    ? hotspots.map(({ q, setName, count }) => `
        <div class="hst-mistake-card">
          <div class="hst-mistake-top"><span class="hst-mistake-badge hst-hotspot-badge">Sai ${count}×</span><span class="hst-mistake-set">${esc(setName)}</span></div>
          <div class="hst-mistake-q">${esc(q.text)}</div>
          <div class="hst-mistake-correct">✅ ${esc(q.options[q.correct])}</div>
        </div>`).join('')
    : '';

  // Skill tag analysis
  const skills = computeWeakSkills(history, getSets());
  const skillsHtml = skills.length >= 2
    ? `<div class="hst-section-header" style="margin-top:4px"><div class="section-label">Kỹ năng yếu nhất</div></div>
       <div class="hst-weak-topics-list">
         ${skills.slice(0, 5).map(s => `
           <div class="hst-weak-topic">
             <div class="hst-weak-topic-name">${esc(s.skill)}</div>
             <div class="hst-weak-topic-bar"><div class="hst-weak-topic-fill" style="width:${100 - s.accuracy}%;background:var(--orange)"></div></div>
             <div class="hst-weak-topic-pct" style="color:var(--orange)">${s.accuracy}% đúng</div>
           </div>`).join('')}
       </div>` : '';

  const retryBtnHtml = recentWrongs.length
    ? `<div style="padding:16px 0 8px"><button class="btn btn-danger btn-full" onclick="retryAllWrongQuestions()">🔁 Luyện tập câu sai gần đây</button></div>`
    : '';

  el.innerHTML = `
    ${retryBtnHtml}
    ${hotspotsHtml ? `<div class="hst-section-header"><div class="section-label">🔥 Câu hay sai nhất</div></div>${hotspotsHtml}` : ''}
    <div class="hst-section-header" style="margin-top:4px"><div class="section-label">Câu sai gần đây</div></div>
    ${wrongHtml}
    ${topicsHtml ? `<div class="hst-section-header" style="margin-top:4px"><div class="section-label">Đề yếu nhất</div></div><div class="hst-weak-topics-list">${topicsHtml}</div>` : ''}
    ${skillsHtml}`;
}

function retryAllWrongQuestions() {
  const history = getHistory();
  const seen = new Set();
  const questions = [];
  for (const entry of history.slice(0, 10)) {
    const set = getSet(entry.setId);
    if (!set) continue;
    for (let i = 0; i < entry.answers.length; i++) {
      const q = set.questions[i];
      if (q && !seen.has(q.id) && entry.answers[i] !== null && entry.answers[i] !== q.correct) {
        seen.add(q.id);
        questions.push(q);
        if (questions.length >= 20) break;
      }
    }
    if (questions.length >= 20) break;
  }
  if (!questions.length) { toast('Không có câu sai để luyện lại', ''); return; }
  startPractice({ id: 'retry-wrong', name: 'Luyện lại câu sai', questions });
}

/* --- Level 2: Lịch sử --- */
function renderHistoryLog() {
  const history = getHistory();
  const el = document.getElementById('hst-log-body');
  if (!history.length) {
    el.innerHTML = `<div class="empty-state"><div class="empty-icon">📋</div><h3>Chưa có lịch sử</h3><p>Làm bài thi để xem lịch sử</p></div>`;
    return;
  }
  const today = new Date().toDateString();
  const yesterday = new Date(Date.now() - 86400000).toDateString();
  const groups = {};
  history.forEach(h => {
    const dayStr = new Date(h.date).toDateString();
    const label = dayStr === today ? 'Hôm nay'
      : dayStr === yesterday ? 'Hôm qua'
      : new Date(h.date).toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'numeric' });
    if (!groups[label]) groups[label] = [];
    groups[label].push(h);
  });

  el.innerHTML = Object.entries(groups).map(([label, entries]) => {
    const items = entries.map(h => {
      const pct = scorePct(h.score, h.total);
      return `<div class="hst-log-item" onclick="viewHistoryEntry('${h.id}')">
        <div class="history-score-circle ${scoreClass(pct)}">${pct}%</div>
        <div class="hst-log-item-info">
          <div class="hst-log-item-name">${esc(h.setName)}</div>
          <div class="hst-log-item-meta">${h.score}/${h.total} câu đúng · ${fmtTime(h.timeTaken)}</div>
        </div>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="16" height="16"><polyline points="9 18 15 12 9 6"/></svg>
      </div>`;
    }).join('');
    return `<div class="hst-log-group">
      <div class="hst-log-date">${label}</div>
      ${items}
    </div>`;
  }).join('');
}

function viewHistoryEntry(id) {
  const entry = getHistory().find(h => h.id === id);
  if (!entry) return;
  const set = getSet(entry.setId);
  if (!set) { toast('Bộ đề đã bị xoá', 'error'); return; }
  renderResult(entry, set);
  showScreen('screen-result');
  showResultDetail();
}

function computeWeakSkills(history, sets) {
  const skillStats = {};
  history.forEach(entry => {
    const set = sets.find(s => s.id === entry.setId);
    if (!set) return;
    entry.answers.forEach((ans, i) => {
      const q = set.questions[i];
      if (!q || !q.skillTags || !q.skillTags.length) return;
      const isCorrect = ans === q.correct;
      q.skillTags.forEach(tag => {
        if (!skillStats[tag]) skillStats[tag] = { correct: 0, total: 0 };
        skillStats[tag].total++;
        if (isCorrect) skillStats[tag].correct++;
      });
    });
  });
  return Object.entries(skillStats)
    .map(([skill, s]) => ({ skill, accuracy: Math.round(s.correct / s.total * 100), total: s.total }))
    .filter(s => s.total >= 2)
    .sort((a, b) => a.accuracy - b.accuracy);
}
