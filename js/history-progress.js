/* ===== TIẾN BỘ (tách từ history.js — phụ thuộc helper chung định nghĩa trong history.js, load SAU history.js) ===== */

/* --- Level 2: Tiến bộ --- */
/* ===== Bộ lọc chung (Tiến bộ) ===== */
let _progressFilter = { range: 'all', setId: '', skill: '' };
let _progressCache = { key: null, data: null };
let _scoreChartToggles = { points: true, avg: true, trend: true };
let _timeChartMode = 'total'; // 'total' | 'perQ'

function _progressFilterHistory(history) {
  const rangeDays = { '7d': 7, '30d': 30, '90d': 90, '6m': 182, '1y': 365 };
  let out = history;
  if (rangeDays[_progressFilter.range]) {
    const cutoff = Date.now() - rangeDays[_progressFilter.range] * 86400000;
    out = out.filter(h => h.date >= cutoff);
  }
  if (_progressFilter.setId) out = out.filter(h => h.setId === _progressFilter.setId);
  if (_progressFilter.skill) {
    out = out.filter(h => {
      const set = getSet(h.setId);
      if (!set) return false;
      return h.answers.some((ans, i) => set.questions[i] && (set.questions[i].skillTags || []).includes(_progressFilter.skill));
    });
  }
  return out;
}

/* Cache theo chữ ký bộ lọc + history — không tính lại nếu bộ lọc chưa đổi */
function getProgressFilteredHistory() {
  const history = getHistory();
  const key = JSON.stringify(_progressFilter) + '|' + history.length + '|' + (history[0] ? history[0].id : '');
  if (_progressCache.key === key) return _progressCache.data;
  const data = _progressFilterHistory(history);
  _progressCache = { key, data };
  return data;
}

function updateProgressFilter() {
  _progressFilter.range = document.getElementById('prog-filter-range').value;
  _progressFilter.setId = document.getElementById('prog-filter-set').value;
  _progressFilter.skill = document.getElementById('prog-filter-skill').value;
  renderProgressCharts();
}

function toggleScoreSeries(key) {
  _scoreChartToggles[key] = !_scoreChartToggles[key];
  renderProgressCharts();
}

function toggleTimeChartMode() {
  _timeChartMode = _timeChartMode === 'total' ? 'perQ' : 'total';
  renderProgressCharts();
}

function renderProgressFilterBarHtml() {
  const sets = getSets();
  const skills = [...new Set(sets.flatMap(s => (s.questions || []).flatMap(q => q.skillTags || [])))];
  return `<div class="hst-filter-bar">
    <select id="prog-filter-range" class="form-control" onchange="updateProgressFilter()">
      <option value="7d">7 ngày</option>
      <option value="30d">30 ngày</option>
      <option value="90d">90 ngày</option>
      <option value="6m">6 tháng</option>
      <option value="1y">1 năm</option>
      <option value="all" selected>Toàn bộ</option>
    </select>
    <select id="prog-filter-set" class="form-control" onchange="updateProgressFilter()">
      <option value="">Tất cả bộ đề</option>
      ${sets.map(s => `<option value="${s.id}">${esc(s.name)}</option>`).join('')}
    </select>
    ${skills.length ? `<select id="prog-filter-skill" class="form-control" onchange="updateProgressFilter()">
      <option value="">Tất cả chủ đề</option>
      ${skills.map(s => `<option value="${esc(s)}">${esc(s)}</option>`).join('')}
    </select>` : ''}
  </div>
  <div class="hst-dev-row"><span>Lọc theo Part / CEFR</span>${devBadge()}</div>`;
}

/* Biểu đồ điểm/accuracy theo thời gian: scatter + đường trung bình + đường xu hướng, hover qua <title> */
function renderTimeSeriesChart(entries, { maWindows = [], warnDeclineWindow = null } = {}) {
  if (entries.length < 2) return '<p style="text-align:center;color:var(--color-text-muted);font-size:13px;padding:20px 0">Chưa đủ dữ liệu</p>';
  const ordered = [...entries].reverse(); // cũ → mới
  const n = ordered.length;
  const scores = ordered.map(h => scorePct(h.score, h.total));
  const W = 320, H = 130, pad = 22;
  const scaleX = i => pad + (n > 1 ? (i / (n - 1)) * (W - pad * 2) : (W - pad * 2) / 2);
  const scaleY = v => pad + ((100 - v) / 100) * (H - pad * 2);
  const grid = [0, 50, 100].map(v => {
    const y = scaleY(v);
    return `<line x1="${pad}" y1="${y}" x2="${W - pad}" y2="${y}" stroke="#E5E7EB" stroke-width="1" stroke-dasharray="4,3"/><text x="${pad - 4}" y="${y + 4}" text-anchor="end" font-size="10" fill="#9CA3AF">${v}</text>`;
  }).join('');

  let trendSvg = '';
  const reg = linearRegressionPredict(scores);
  if (_scoreChartToggles.trend && reg) {
    const xMean = (n - 1) / 2, yMean = scores.reduce((a, b) => a + b, 0) / n;
    const intercept = yMean - reg.slope * xMean;
    const y1 = scaleY(Math.max(0, Math.min(100, intercept)));
    const y2 = scaleY(Math.max(0, Math.min(100, reg.slope * (n - 1) + intercept)));
    trendSvg = `<line x1="${scaleX(0)}" y1="${y1}" x2="${scaleX(n - 1)}" y2="${y2}" stroke="#D97706" stroke-width="2"/>`;
  }

  const maColors = ['#059669', '#2563EB'];
  let avgSvg = '';
  if (_scoreChartToggles.avg) {
    avgSvg = maWindows.map((win, idx) => {
      const avgPts = scores.map((_, i) => {
        const s = Math.max(0, i - win + 1);
        const slice = scores.slice(s, i + 1);
        return slice.reduce((a, b) => a + b, 0) / slice.length;
      });
      const pts = avgPts.map((v, i) => `${scaleX(i)},${scaleY(v)}`).join(' ');
      return `<polyline fill="none" stroke="${maColors[idx % maColors.length]}" stroke-width="2" stroke-dasharray="5,3" points="${pts}"/>`;
    }).join('');
  }

  let pointsSvg = '';
  if (_scoreChartToggles.points) {
    pointsSvg = ordered.map((h, i) => {
      const x = scaleX(i), y = scaleY(scores[i]);
      return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="4" fill="#6366F1" stroke="white" stroke-width="2"><title>${esc(new Date(h.date).toLocaleDateString('vi-VN'))} · ${esc(h.setName)} · Điểm ${scores[i]}% · ${fmtTime(h.timeTaken)}</title></circle>`;
    }).join('');
  }

  let warningHtml = '';
  if (warnDeclineWindow && n >= warnDeclineWindow) {
    const recent = scores.slice(-warnDeclineWindow);
    let declining = true;
    for (let i = 1; i < recent.length; i++) if (recent[i] >= recent[i - 1]) { declining = false; break; }
    if (declining) warningHtml = `<div style="font-size:12px;color:var(--color-danger);margin-top:6px">⚠ Accuracy đã giảm trong ${warnDeclineWindow} phiên gần nhất.</div>`;
  }

  return `<svg viewBox="0 0 ${W} ${H}" style="width:100%;height:${H}px">${grid}${trendSvg}${avgSvg}${pointsSvg}</svg>${warningHtml}`;
}

/* XP theo ngày — bấm vào cột mở popup chi tiết ngày (showDayDetail, dùng chung với Dashboard) */
function renderXpByDayChart(entries, days = 14) {
  const today = new Date();
  const byDay = {};
  entries.forEach(h => { const ds = new Date(h.date).toDateString(); (byDay[ds] = byDay[ds] || []).push(h); });
  const items = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today); d.setDate(d.getDate() - i);
    const ds = d.toDateString();
    const dayEntries = byDay[ds] || [];
    items.push({ l: `${d.getDate()}/${d.getMonth() + 1}`, v: dayEntries.length ? calcXpForEntries(dayEntries) : 0, ds });
  }
  const W = 320, H = 100, padX = 8, padY = 8, lblH = 18;
  const max = Math.max(...items.map(d => d.v), 1);
  const bw = (W - padX * 2) / items.length;
  const bars = items.map((d, i) => {
    const bh = Math.max(d.v > 0 ? 4 : 0, (d.v / max) * (H - padY * 2 - lblH));
    const x = padX + i * bw + bw * 0.1;
    const y = padY + (H - padY * 2 - lblH) - bh;
    const fill = d.v === 0 ? '#E5E7EB' : d.v < 50 ? '#A7F3D0' : d.v < 150 ? '#34D399' : '#059669';
    return `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${(bw * 0.8).toFixed(1)}" height="${bh.toFixed(1)}" rx="3" fill="${fill}" style="cursor:pointer" onclick="showDayDetail('${d.ds}')"><title>${d.l}: ${d.v} XP</title></rect>
      <text x="${(x + bw * 0.4).toFixed(1)}" y="${H - 4}" text-anchor="middle" font-size="9" fill="#9CA3AF">${d.l}</text>`;
  }).join('');
  return `<svg viewBox="0 0 ${W} ${H}" style="width:100%;height:${H}px">${bars}</svg>`;
}

/* Personal Best mở rộng — mỗi kỷ lục có giá trị, ngày đạt, có phải vừa phá kỷ lục không */
function getPersonalBests(history) {
  const latestDate = history[0].date;
  const bestScoreEntry = history.reduce((best, h) => scorePct(h.score, h.total) > scorePct(best.score, best.total) ? h : best);
  const withMinQ = history.filter(h => h.total >= 5);
  const fastestEntry = withMinQ.length ? withMinQ.reduce((a, b) => (a.timeTaken / a.total) < (b.timeTaken / b.total) ? a : b) : null;
  const longestSessionEntry = history.reduce((a, b) => (a.timeTaken || 0) > (b.timeTaken || 0) ? a : b);
  const byDayXp = {};
  history.forEach(h => { const ds = new Date(h.date).toDateString(); (byDayXp[ds] = byDayXp[ds] || []).push(h); });
  let maxDayXp = 0, maxDayXpDate = null;
  Object.entries(byDayXp).forEach(([ds, entries]) => {
    const xp = calcXpForEntries(entries);
    if (xp > maxDayXp) { maxDayXp = xp; maxDayXpDate = new Date(ds).getTime(); }
  });
  let maxConsecutiveCorrect = 0, maxConsecutiveEntry = null;
  history.forEach(h => {
    const set = getSet(h.setId);
    if (!set) return;
    let cur = 0, best = 0;
    h.answers.forEach((ans, i) => {
      const correct = set.questions[i] ? ans === set.questions[i].correct : false;
      cur = correct ? cur + 1 : 0;
      best = Math.max(best, cur);
    });
    if (best > maxConsecutiveCorrect) { maxConsecutiveCorrect = best; maxConsecutiveEntry = h; }
  });

  const items = [
    { label: 'Điểm cao nhất', value: scorePct(bestScoreEntry.score, bestScoreEntry.total) + '%', date: bestScoreEntry.date },
    { label: 'XP nhiều nhất trong ngày', value: maxDayXp + ' XP', date: maxDayXpDate },
    { label: 'Chuỗi học dài nhất', value: getLongestStreakEver(history) + ' ngày', date: null },
    { label: 'Làm bài nhanh nhất', value: fastestEntry ? (fastestEntry.timeTaken / fastestEntry.total).toFixed(1) + 's/câu' : '—', date: fastestEntry ? fastestEntry.date : null },
    { label: 'Thời gian học dài nhất', value: fmtTime(longestSessionEntry.timeTaken || 0), date: longestSessionEntry.date },
    { label: 'Nhiều câu đúng liên tiếp nhất', value: maxConsecutiveCorrect + ' câu', date: maxConsecutiveEntry ? maxConsecutiveEntry.date : null }
  ];
  return items.map(it => ({ ...it, isNew: it.date === latestDate }));
}

function renderPersonalBestHtml(history) {
  return getPersonalBests(history).map(b => `<div class="hst-pbest-row">
    <span class="hst-pbest-label">${esc(b.label)}</span>
    <span class="hst-pbest-val">${b.value}${b.isNew ? ' <span class="hst-dev-badge" style="background:var(--color-success-light);color:var(--color-success)">🆕 Mới</span>' : ''}</span>
    <span class="hst-pbest-date">${b.date ? fmtDateShort(b.date) : '—'}</span>
  </div>`).join('');
}

function progressSpeedStateHtml(reg) {
  if (!reg) return '<span style="color:var(--color-text-muted)">Chưa đủ dữ liệu</span>';
  if (reg.slope > 0.5) return '<span style="color:var(--color-success);font-weight:700">📈 Đang tiến bộ</span>';
  if (reg.slope < -0.5) return '<span style="color:var(--color-danger);font-weight:700">📉 Đang chững lại</span>';
  return '<span style="color:var(--color-warning);font-weight:700">➡️ Ổn định</span>';
}

/* --- Level 2: Tiến bộ --- */
function renderHistoryProgress() {
  const history = getHistory();
  const el = document.getElementById('hst-progress-body');
  if (history.length < 2) {
    el.innerHTML = `<div class="empty-state"><div class="empty-icon">📊</div><h3>Bạn chưa có đủ dữ liệu để phân tích tiến bộ.</h3><button class="btn btn-primary" onclick="navTo('library')">Bắt đầu luyện đề</button></div>`;
    return;
  }
  // Filter bar + container giữ cố định, không innerHTML lại toàn bộ mỗi lần đổi filter (giữ giá trị select)
  if (!document.getElementById('hst-progress-charts')) {
    el.innerHTML = `${renderProgressFilterBarHtml()}<div id="hst-progress-charts"></div>`;
  }
  renderProgressCharts();
}

function renderProgressCharts() {
  const history = getProgressFilteredHistory();
  const container = document.getElementById('hst-progress-charts');
  if (history.length < 2) {
    container.innerHTML = `<p style="text-align:center;padding:20px;color:var(--color-text-muted)">Không đủ dữ liệu trong bộ lọc hiện tại</p>`;
    return;
  }
  const last10 = history.slice(0, 10);
  const scoreData10 = last10.map(h => scorePct(h.score, h.total)).reverse();
  const dayData = getLast7DaysData(history);
  const scoreTrend = calcScoreTrend(history);
  const speedDiff = calcSpeedTrend(history);
  const speedTrendHtml = speedDiff === null ? '—'
    : speedDiff < -2 ? '<span class="hst-trend-up">▲ Nhanh hơn</span>'
    : speedDiff > 2 ? '<span class="hst-trend-down">▼ Chậm hơn</span>'
    : '<span style="color:var(--color-text-muted)">→ Tương đương</span>';
  const setBreakdown = renderSetBreakdownHtml(history);
  const pred = linearRegressionPredict(scoreData10);
  const periodsHtml = ['week', 'month', 'quarter', 'year'].map(unit => {
    const labelMap = { week: 'Tuần này vs trước', month: 'Tháng này vs trước', quarter: 'Quý này vs trước', year: 'Năm nay vs trước' };
    const cmp = compareTimePeriods(history, unit);
    const xpCur = calcXpForEntries(history.filter(h => h.date >= Date.now() - 30 * 86400000)); // ước lượng XP gần đây cho card so sánh
    return `<div class="hst-section-header" style="margin-top:8px"><div class="section-label">${labelMap[unit]}</div></div>
      ${compareRowHtml('Score (Accuracy)', cmp.current.accuracy, cmp.previous.accuracy, v => v + '%')}
      ${compareRowHtml('Số câu', cmp.current.totalQ, cmp.previous.totalQ)}
      ${unit === 'month' ? `<div class="hst-chart-card" style="margin-top:-4px">${svgLineChart(last10.map(h => scorePct(h.score, h.total)).reverse(), { height: 60 })}</div>` : ''}`;
  }).join('');
  const timeData = last10.map((h, i) => ({ l: String(i + 1), v: _timeChartMode === 'total' ? (h.timeTaken || 0) : Math.round((h.timeTaken || 0) / h.total) })).reverse();
  const xpSeries = last10.map(h => calcXpForEntries([h])).reverse();
  const xpReg = linearRegressionPredict(xpSeries);
  const eta = predictLevelETA(history);
  const goalProgress = getGoalProgress(history);
  const insights = generateInsights(history, 5);

  container.innerHTML = `
    <div class="hst-chart-card">
      <div class="hst-chart-title">1. Điểm theo thời gian / Accuracy theo thời gian</div>
      <div class="hst-chart-toggles">
        <label><input type="checkbox" ${_scoreChartToggles.points ? 'checked' : ''} onchange="toggleScoreSeries('points')"> Điểm từng phiên</label>
        <label><input type="checkbox" ${_scoreChartToggles.avg ? 'checked' : ''} onchange="toggleScoreSeries('avg')"> Đường trung bình</label>
        <label><input type="checkbox" ${_scoreChartToggles.trend ? 'checked' : ''} onchange="toggleScoreSeries('trend')"> Đường xu hướng</label>
      </div>
      ${renderTimeSeriesChart(history, { maWindows: [7, 30], warnDeclineWindow: 5 })}
      ${pred ? `<div style="font-size:12px;color:var(--color-text-muted);margin-top:6px">Prediction lần tới ~${pred.predicted}%</div>` : ''}
    </div>

    <div class="hst-chart-card">
      <div class="hst-chart-title">3. Thời gian làm bài</div>
      <div class="hst-chart-toggles"><label><input type="checkbox" ${_timeChartMode === 'perQ' ? 'checked' : ''} onchange="toggleTimeChartMode()"> Xem theo giây/câu (thay vì tổng)</label></div>
      ${svgBarChart(timeData, { color: '#D97706' })}
      <div style="font-size:12px;color:var(--color-text-muted);margin-top:6px">Xu hướng tốc độ: ${speedTrendHtml}</div>
    </div>

    <div class="hst-chart-card">
      <div class="hst-chart-title">4. Số câu đã học (7 ngày qua)</div>
      ${svgBarChart(dayData)}
      <div style="font-size:12px;color:var(--color-text-muted);margin-top:6px">Tổng tích lũy: ${history.reduce((s, h) => s + h.total, 0)} câu</div>
    </div>

    <div class="hst-chart-card">
      <div class="hst-chart-title">5. Tốc độ làm bài</div>
      <div class="hst-metric-val" style="font-size:20px">${(history.reduce((s, h) => s + h.timeTaken, 0) / history.reduce((s, h) => s + h.total, 0)).toFixed(1)}s/câu</div>
      ${speedDiff !== null && speedDiff < -2 && scoreTrend && scoreTrend.diff < 0
        ? `<div style="font-size:12px;color:var(--color-warning);margin-top:4px">⚠ Bạn đang trả lời nhanh hơn nhưng độ chính xác giảm.</div>` : ''}
    </div>

    <div class="hst-chart-card">
      <div class="hst-chart-title">6. XP theo ngày</div>
      ${renderXpByDayChart(history)}
      ${xpReg ? `<div style="font-size:12px;color:var(--color-text-muted);margin-top:6px">XP/phiên gần đây: xu hướng ${xpReg.slope > 0.5 ? 'tăng 📈' : xpReg.slope < -0.5 ? 'giảm 📉' : 'ổn định ➡️'}</div>` : ''}
    </div>

    ${periodsHtml}

    <div class="hst-chart-card">
      <div class="hst-chart-title">11. Personal Best</div>
      ${renderPersonalBestHtml(history)}
    </div>

    <div class="hst-chart-card">
      <div class="hst-chart-title">12. Tốc độ tiến bộ (Regression)</div>
      <div class="hst-metric-val" style="font-size:18px">${progressSpeedStateHtml(pred)}</div>
    </div>

    <div class="hst-chart-card">
      <div class="hst-chart-title">13. Prediction</div>
      <div class="hst-metric-row">
        <div class="hst-metric-card"><div class="hst-metric-title">Điểm / Accuracy dự đoán</div><div class="hst-metric-val">${pred ? pred.predicted + '%' : '—'}</div></div>
        <div class="hst-metric-card"><div class="hst-metric-title">XP dự đoán/phiên tới</div><div class="hst-metric-val">${xpReg ? Math.max(0, Math.round(xpReg.predicted)) : '—'}</div></div>
      </div>
      <div style="font-size:13px;margin-top:8px">Nếu tiếp tục học như hiện tại → Bạn sẽ đạt Level ${eta.level + 1} sau khoảng ${eta.etaDays != null ? eta.etaDays + ' ngày' : '—'}.</div>
      ${goalProgress ? `<div style="font-size:13px;margin-top:4px">Xác suất đạt mục tiêu ${goalProgress.goal}%: ${goalProgress.achieved ? '✅ Đang đạt' : `còn thiếu ${Math.abs(goalProgress.diff)}%`}</div>` : ''}
      <div style="font-size:11px;color:var(--color-text-muted);margin-top:6px">Prediction chỉ mang tính tham khảo.</div>
    </div>

    <div class="hst-section-header"><div class="section-label">14. Xu hướng</div></div>
    <div class="hst-chart-card">
      ${insights.length ? `<div class="hst-insights">${insights.map(i => `<div class="hst-insight-item"><span class="hst-insight-icon">${i.icon}</span>${esc(i.text)}</div>`).join('')}</div>` : '<p style="text-align:center;padding:8px;color:var(--color-text-muted);font-size:13px">Chưa đủ dữ liệu</p>'}
    </div>

    ${setBreakdown ? `<div class="hst-chart-card">
      <div class="hst-chart-title">Kết quả theo bộ đề</div>
      ${setBreakdown}
    </div>` : ''}`;
}
