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
  if (values.length < 2) return '<p style="text-align:center;color:var(--color-text-muted);font-size:13px;padding:20px 0">Chưa đủ dữ liệu</p>';
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
  if (diff === null) return '<span style="color:var(--color-text-muted)">—</span>';
  if (diff > 0) return `<span class="hst-trend-up">▲ +${diff}${unit}</span>`;
  if (diff < 0) return `<span class="hst-trend-down">▼ ${diff}${unit}</span>`;
  return '<span style="color:var(--color-text-muted)">→ Không đổi</span>';
}

/* ===== XP & LEVEL (Dashboard > Hồ sơ học tập) =====
   Level chỉ phụ thuộc XP, không phụ thuộc thời gian. Công thức XP và mốc level
   có thể đổi sau — đây là baseline ban đầu theo yêu cầu. */
const XP_PER_CORRECT = 10, XP_PER_WRONG = 2, XP_PER_SESSION = 50, XP_PER_STREAK_DAY = 20;

function calcXpForEntries(entries) {
  const correct = entries.reduce((s, h) => s + h.score, 0);
  const wrong = entries.reduce((s, h) => s + (h.total - h.score), 0);
  const days = new Set(entries.map(h => new Date(h.date).toDateString())).size;
  return correct * XP_PER_CORRECT + wrong * XP_PER_WRONG + entries.length * XP_PER_SESSION + days * XP_PER_STREAK_DAY;
}

/* Level 1 = 0 XP, Level 2 = 100 XP, mỗi level sau tăng dần +50 so với mức tăng trước */
function xpThresholdForLevel(level) {
  if (level <= 1) return 0;
  if (level === 2) return 100;
  let xp = 100, inc = 100;
  for (let l = 3; l <= level; l++) { inc += 50; xp += inc; }
  return xp;
}

const XP_TIER_NAMES = [
  { maxLevel: 2,        name: 'Người mới',        icon: '🌱' },
  { maxLevel: 5,        name: 'Học viên',         icon: '📘' },
  { maxLevel: 9,        name: 'Người chăm chỉ',   icon: '💪' },
  { maxLevel: 14,       name: 'Người luyện tập',  icon: '⚡' },
  { maxLevel: 20,       name: 'Chuyên gia',       icon: '🏆' },
  { maxLevel: Infinity, name: 'Bậc thầy',         icon: '🌟' }
];

function getXpLevelInfo(history) {
  const totalXP = calcXpForEntries(history);
  let level = 1;
  while (xpThresholdForLevel(level + 1) <= totalXP) level++;
  const curThreshold = xpThresholdForLevel(level);
  const nextThreshold = xpThresholdForLevel(level + 1);
  const xpIntoLevel = totalXP - curThreshold;
  const xpNeeded = nextThreshold - curThreshold;
  const tier = XP_TIER_NAMES.find(t => level <= t.maxLevel);
  return {
    level, name: tier.name, icon: tier.icon, totalXP,
    xpIntoLevel, xpNeeded, toNext: nextThreshold - totalXP,
    progress: xpNeeded ? Math.round(xpIntoLevel / xpNeeded * 100) : 100
  };
}

/* Hành trình học — Chapter do user tự nhóm bộ đề (quản lý ở Cài đặt > Quản lý Chapter, js/library.js) */
function renderJourneyMapHtml() {
  const chapters = getChapters();
  if (!chapters.length) {
    return `<p style="text-align:center;padding:8px;color:var(--color-text-muted);font-size:13px">Chưa có Chapter nào. <a class="link-btn" onclick="navTo('settings');showChapterManager()">Tạo ngay</a></p>`;
  }
  let prevMastered = true;
  return chapters.map(ch => {
    const prog = getChapterProgress(ch);
    const locked = !prevMastered;
    prevMastered = prog.mastered;
    return `<div class="journey-chapter${locked ? ' locked' : ''}${prog.mastered ? ' done' : ''}">
      <div class="journey-chapter-icon">${locked ? '🔒' : esc(ch.icon || '📘')}</div>
      <div class="journey-chapter-info">
        <div class="journey-chapter-name">${esc(ch.name)}</div>
        <div class="hst-level-bar-wrap"><div class="hst-level-bar-fill" style="width:${prog.pct}%;background:${prog.mastered ? 'var(--color-success)' : 'var(--color-brand)'}"></div></div>
        <div class="journey-chapter-sub">${prog.done}/${prog.total} bộ đề đạt ≥80%</div>
      </div>
    </div>`;
  }).join('');
}

/* Nhiệm vụ hàng ngày — tính thẳng từ quiz_history theo ngày, không cần lưu state riêng */
const DAILY_QUEST_TARGET = 20;
function getDailyQuestProgress(history) {
  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
  const current = history
    .filter(h => h.date >= todayStart.getTime())
    .reduce((s, h) => s + h.total, 0);
  return { current, target: DAILY_QUEST_TARGET, done: current >= DAILY_QUEST_TARGET };
}

/* Popup ăn mừng khi lên Level — gọi từ quiz.js ngay sau addHistoryEntry() nếu level tăng */
let _levelUpTimer = null;
function showLevelUpCelebration(xpInfo) {
  document.getElementById('level-up-icon').textContent = xpInfo.icon;
  document.getElementById('level-up-title').textContent = `Lên Level ${xpInfo.level}!`;
  document.getElementById('level-up-sub').textContent = xpInfo.name;
  document.getElementById('level-up-overlay').classList.add('active');
  playSound('levelup');
  clearTimeout(_levelUpTimer);
  _levelUpTimer = setTimeout(hideLevelUp, 3000);
}
function hideLevelUp() {
  document.getElementById('level-up-overlay').classList.remove('active');
}

/* ETA lên level tiếp theo — dùng chung cho tab Dự đoán và Tiến bộ > Prediction */
function predictLevelETA(history) {
  const xpInfo = getXpLevelInfo(history);
  const recentEntries = history.slice(0, 10);
  if (!recentEntries.length) return { ...xpInfo, etaDays: null, xpPerDay: 0 };
  const recentDays = Math.max(1, Math.round((Date.now() - recentEntries[recentEntries.length - 1].date) / 86400000));
  const xpPerDay = calcXpForEntries(recentEntries) / recentDays;
  const etaDays = xpPerDay > 0 ? Math.ceil(xpInfo.toNext / xpPerDay) : null;
  return { ...xpInfo, etaDays, xpPerDay };
}

/* Tiến độ so với mục tiêu accuracy cá nhân (quiz_stats_goal) — dùng chung Dự đoán + Tiến bộ */
function getGoalProgress(history) {
  const goal = getStatsGoal();
  if (!goal.accuracy) return null;
  const avg = Math.round(history.slice(0, 10).reduce((s, h) => s + scorePct(h.score, h.total), 0) / Math.min(10, history.length));
  return { goal: goal.accuracy, avg, diff: avg - goal.accuracy, achieved: avg >= goal.accuracy };
}

/* AI Insight (Dashboard) — tối đa 3 dòng, mỗi dòng 1 ý, lấy thẳng từ dữ liệu thật */
function generateInsights(history, max = 3) {
  if (history.length < 3) return [];
  const out = [];

  const streak = calcStreak();
  if (streak >= 2) out.push({ icon: '🔥', text: `Bạn đang có chuỗi học ${streak} ngày.` });

  const trend = calcScoreTrend(history);
  if (trend) {
    if (trend.diff >= 5)      out.push({ icon: '📈', text: `Điểm trung bình tăng ${trend.diff}% so với trước (${trend.pAvg}% → ${trend.rAvg}%).` });
    else if (trend.diff <= -5) out.push({ icon: '📉', text: `Điểm trung bình giảm ${Math.abs(trend.diff)}% gần đây.` });
  }

  const xpInfo = getXpLevelInfo(history);
  if (xpInfo.toNext > 0) out.push({ icon: '🎯', text: `Chỉ cần thêm ${xpInfo.toNext} XP để lên Level ${xpInfo.level + 1}.` });

  const hourStats = {};
  history.forEach(h => {
    const hr = new Date(h.date).getHours();
    if (!hourStats[hr]) hourStats[hr] = { c: 0, t: 0 };
    hourStats[hr].c += h.score; hourStats[hr].t += h.total;
  });
  const hourEntries = Object.entries(hourStats).filter(([, v]) => v.t >= 5)
    .map(([h, v]) => ({ h: +h, acc: Math.round(v.c / v.t * 100) })).sort((a, b) => b.acc - a.acc);
  if (hourEntries.length) out.push({ icon: '🧠', text: `Bạn thường học hiệu quả nhất lúc ${hourEntries[0].h}:00.` });

  const topics = computeSetStats(history).filter(s => s.total >= 5);
  if (topics.length) {
    const worst = [...topics].sort((a, b) => a.accuracy - b.accuracy)[0];
    if (worst.accuracy < 60) out.push({ icon: '⚠️', text: `Accuracy của "${worst.name}" đang ở mức ${worst.accuracy}%.` });
  }

  const sp = calcSpeedTrend(history);
  if (sp !== null && sp < -4) out.push({ icon: '🚀', text: `Tốc độ làm bài nhanh hơn ~${Math.abs(Math.round(sp))}s/câu.` });

  const wd = { we: { c: 0, t: 0 }, wk: { c: 0, t: 0 } };
  history.forEach(h => {
    const day = new Date(h.date).getDay();
    const bucket = (day === 0 || day === 6) ? wd.we : wd.wk;
    bucket.c += h.total; bucket.t++;
  });
  if (wd.we.t >= 2 && wd.wk.t >= 2 && (wd.we.c / wd.we.t) > (wd.wk.c / wd.wk.t) * 1.3)
    out.push({ icon: '📅', text: `Bạn học nhiều hơn vào cuối tuần.` });

  return out.slice(0, max);
}

/* "Cần cải thiện" (Dashboard) — tối đa 3 mục, mỗi mục có icon/nội dung/giá trị */
function generateImprovementItems(history) {
  const out = [];
  const topics = computeSetStats(history).filter(s => s.total >= 5);
  if (topics.length) {
    const worst = [...topics].sort((a, b) => a.accuracy - b.accuracy)[0];
    if (worst.accuracy < 70) out.push({ text: `Accuracy "${esc(worst.name)}" chỉ còn`, value: worst.accuracy + '%' });
  }
  const unresolved = getFixStatus(history).unresolved.length;
  if (unresolved > 0) out.push({ text: 'Có câu sai chưa luyện lại', value: unresolved + ' câu' });
  const skillLog = getSkillLog();
  let stalest = null;
  Object.entries(skillLog).forEach(([skill, days]) => {
    const dates = Object.keys(days);
    if (!dates.length) return;
    const lastDate = dates.sort().slice(-1)[0];
    const daysSince = Math.round((Date.now() - new Date(lastDate).getTime()) / 86400000);
    if (daysSince >= 3 && (!stalest || daysSince > stalest.daysSince)) stalest = { skill, daysSince };
  });
  if (stalest) out.push({ text: `Chưa ôn chủ đề "${esc(stalest.skill)}"`, value: `${stalest.daysSince} ngày` });
  return out.slice(0, 3);
}

function getLongestStreakEver(history) {
  const days = [...new Set(history.map(h => new Date(h.date).toDateString()))]
    .map(d => new Date(d).getTime()).sort((a, b) => a - b);
  let longest = 0, cur = 0, prev = null;
  days.forEach(d => {
    cur = (prev !== null && d - prev === 86400000) ? cur + 1 : 1;
    longest = Math.max(longest, cur);
    prev = d;
  });
  return longest;
}

/* Thành tích (Dashboard) — badge khoá/mở theo điều kiện tính từ quiz_history thật */
function getAchievementBadges(history) {
  const totalQ = history.reduce((s, h) => s + h.total, 0);
  const distinctSets = new Set(history.map(h => h.setId)).size;
  const longestStreak = getLongestStreakEver(history);
  const has100pct = history.some(h => scorePct(h.score, h.total) === 100);
  const setCounts = {};
  history.forEach(h => { setCounts[h.setId] = (setCounts[h.setId] || 0) + 1; });
  const maxSetCount = Object.values(setCounts).reduce((m, c) => Math.max(m, c), 0);
  const nightOwl  = history.some(h => { const hr = new Date(h.date).getHours(); return hr >= 23 || hr < 5; });
  const earlyBird = history.some(h => { const hr = new Date(h.date).getHours(); return hr >= 5 && hr < 7; });
  return [
    { icon: '🥉', name: '100 câu đầu tiên', unlocked: totalQ >= 100, cond: 'Làm tổng cộng 100 câu hỏi' },
    { icon: '🥈', name: '1000 câu', unlocked: totalQ >= 1000, cond: 'Làm tổng cộng 1000 câu hỏi' },
    { icon: '🔥', name: 'Streak 7 ngày', unlocked: longestStreak >= 7, cond: 'Học liên tục 7 ngày' },
    { icon: '💯', name: 'Điểm 100%', unlocked: has100pct, cond: 'Đạt 100% trong 1 lần làm bài' },
    { icon: '✅', name: 'Không sai câu nào', unlocked: has100pct, cond: 'Hoàn thành 1 bộ đề không sai câu nào' },
    { icon: '📚', name: '10 bộ đề hoàn thành', unlocked: distinctSets >= 10, cond: 'Hoàn thành 10 bộ đề khác nhau' },
    { icon: '🎯', name: 'Chuyên một đề', unlocked: maxSetCount >= 10, cond: 'Luyện cùng 1 bộ đề 10 lần' },
    { icon: '🦉', name: 'Cú đêm', unlocked: nightOwl, cond: 'Học sau 23h hoặc trước 5h sáng' },
    { icon: '🌅', name: 'Chim sớm', unlocked: earlyBird, cond: 'Học trong khoảng 5h-7h sáng' }
  ];
}

function showBadgeCondition(name, cond) {
  toast(`${name}: ${cond}`, '');
}

/* Popup chi tiết 1 ngày khi bấm vào ô heatmap */
function showDayDetail(dateStr) {
  const history = getHistory().filter(h => new Date(h.date).toDateString() === dateStr);
  document.getElementById('day-detail-title').textContent = new Date(dateStr).toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'numeric', year: 'numeric' });
  const body = document.getElementById('day-detail-body');
  if (!history.length) {
    body.innerHTML = `<p style="text-align:center;padding:16px;color:var(--color-text-muted)">Không học ngày này</p>`;
  } else {
    const totalQ = history.reduce((s, h) => s + h.total, 0);
    const avg = Math.round(history.reduce((s, h) => s + scorePct(h.score, h.total), 0) / history.length);
    const totalTime = history.reduce((s, h) => s + (h.timeTaken || 0), 0);
    const xp = calcXpForEntries(history);
    body.innerHTML = `<div class="hst-stats-grid" style="padding:0">
      <div class="hst-stat-card"><div class="hst-stat-val">${history.length}</div><div class="hst-stat-lbl">Số phiên</div></div>
      <div class="hst-stat-card"><div class="hst-stat-val">${totalQ}</div><div class="hst-stat-lbl">Số câu</div></div>
      <div class="hst-stat-card hst-stat-accent"><div class="hst-stat-val">${avg}%</div><div class="hst-stat-lbl">Điểm TB</div></div>
      <div class="hst-stat-card"><div class="hst-stat-val">${fmtStudyTime(totalTime)}</div><div class="hst-stat-lbl">Thời gian học</div></div>
      <div class="hst-stat-card hst-stat-green" style="grid-column:1/-1"><div class="hst-stat-val">+${xp} XP</div><div class="hst-stat-lbl">XP kiếm được</div></div>
    </div>`;
  }
  document.getElementById('modal-day-detail').classList.add('active');
}

function hideDayDetail() {
  document.getElementById('modal-day-detail').classList.remove('active');
}

function renderCalHeatmapHtml(history, days = 30) {
  const today = new Date();
  const cells = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const ds = d.toDateString();
    const cnt = history.filter(h => new Date(h.date).toDateString() === ds).length;
    const lv = cnt === 0 ? 0 : cnt === 1 ? 1 : cnt <= 3 ? 2 : 3;
    cells.push(`<div class="cal-cell cal-lv${lv}${i === 0 ? ' cal-today' : ''}" title="${d.toLocaleDateString('vi-VN',{day:'numeric',month:'numeric'})}: ${cnt} lần làm" onclick="event.stopPropagation();showDayDetail('${ds}')"></div>`);
  }
  const gridClass = days > 30 ? 'cal-grid cal-grid-year' : 'cal-grid';
  return `<div class="${gridClass}">${cells.join('')}</div>
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
    if (!sm[h.setId]) sm[h.setId] = { setId: h.setId, name: h.setName, correct: 0, wrong: 0, scores: [], lastDate: 0, totalTime: 0 };
    const s = sm[h.setId];
    s.name = h.setName; // luôn lấy tên mới nhất nếu set bị đổi tên
    s.correct += h.score;
    s.wrong += h.total - h.score;
    s.scores.push(scorePct(h.score, h.total));
    s.totalTime += h.timeTaken || 0;
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
      lastDate: s.lastDate,
      totalTime: s.totalTime
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
        : '<span style="color:var(--color-text-muted)">→</span>';
      const c = s.avg >= 80 ? 'var(--color-success)' : s.avg >= 60 ? 'var(--color-warning)' : 'var(--color-danger)';
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
      <span class="hst-set-col" style="color:var(--color-text-muted)">${r.n}</span>
      <span class="hst-set-col" style="color:${r.c};font-weight:700">${r.avg}%</span>
      <span class="hst-set-col" style="color:var(--color-success)">${r.best}%</span>
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
    ? `<div class="hst-quick-chip" style="background:var(--color-warning)">🔥 ${streak} ngày</div>
       <div class="hst-quick-chip" style="background:var(--color-success)">⏱ ${fmtStudyTime(totalTime)}</div>
       <div class="hst-quick-chip" style="background:var(--color-brand)">${history.length} lần làm</div>`
    : '';

  const memBuckets = getMemoryBuckets();

  document.getElementById('hst-nav-grid').innerHTML = `
    <div class="hst-nav-card" onclick="showHistorySection('overview')">
      <div class="hst-nav-card-icon">📈</div>
      <div class="hst-nav-card-title">Dashboard</div>
      <div class="hst-nav-card-sub">${history.length} lần làm bài</div>
    </div>
    <div class="hst-nav-card" onclick="showHistorySection('progress')">
      <div class="hst-nav-card-icon">📊</div>
      <div class="hst-nav-card-title">Tiến bộ</div>
      <div class="hst-nav-card-sub">TB ${avg}%</div>
    </div>
    <div class="hst-nav-card" onclick="showHistorySection('analysis')">
      <div class="hst-nav-card-icon">🧩</div>
      <div class="hst-nav-card-title">Phân tích</div>
      <div class="hst-nav-card-sub">Theo đề & chủ đề</div>
    </div>
    <div class="hst-nav-card" onclick="showHistorySection('mistakes')">
      <div class="hst-nav-card-icon">❌</div>
      <div class="hst-nav-card-title">Lỗi sai</div>
      <div class="hst-nav-card-sub">${totalWrong} câu sai tổng</div>
    </div>
    <div class="hst-nav-card" onclick="showHistorySection('memory')">
      <div class="hst-nav-card-icon">🧠</div>
      <div class="hst-nav-card-title">Ghi nhớ</div>
      <div class="hst-nav-card-sub">${memBuckets.retentionRate}% đã thuộc</div>
    </div>
    <div class="hst-nav-card" onclick="showHistorySection('performance')">
      <div class="hst-nav-card-icon">⚙️</div>
      <div class="hst-nav-card-title">Hiệu suất</div>
      <div class="hst-nav-card-sub">Tốc độ, tập trung...</div>
    </div>
    <div class="hst-nav-card" onclick="showHistorySection('behavior')">
      <div class="hst-nav-card-icon">🕐</div>
      <div class="hst-nav-card-title">Hành vi học</div>
      <div class="hst-nav-card-sub">Giờ, ngày học nhiều nhất</div>
    </div>
    <div class="hst-nav-card" onclick="showHistorySection('log')">
      <div class="hst-nav-card-icon">📋</div>
      <div class="hst-nav-card-title">Lịch sử</div>
      <div class="hst-nav-card-sub">Gần nhất: ${lastDate}</div>
    </div>
    <div class="hst-nav-card" onclick="showHistorySection('compare')">
      <div class="hst-nav-card-icon">🔀</div>
      <div class="hst-nav-card-title">So sánh</div>
      <div class="hst-nav-card-sub">Hôm nay/tuần/tháng</div>
    </div>
    <div class="hst-nav-card" onclick="showHistorySection('predict')">
      <div class="hst-nav-card-icon">🔮</div>
      <div class="hst-nav-card-title">Dự đoán</div>
      <div class="hst-nav-card-sub">Điểm & ETA lên cấp</div>
    </div>
    <div class="hst-nav-card" onclick="showHistorySection('report')">
      <div class="hst-nav-card-icon">🧾</div>
      <div class="hst-nav-card-title">Báo cáo</div>
      <div class="hst-nav-card-sub">Ngày/tuần/tháng/năm</div>
    </div>
    <div class="hst-nav-card" onclick="showHistorySection('settings')">
      <div class="hst-nav-card-icon">⚙️</div>
      <div class="hst-nav-card-title">Cài đặt thống kê</div>
      <div class="hst-nav-card-sub">Mục tiêu, dữ liệu</div>
    </div>`;
}

const HST_SECTIONS = ['overview', 'progress', 'analysis', 'mistakes', 'memory', 'performance', 'behavior', 'log', 'compare', 'predict', 'report', 'settings'];

function showHistoryHome() {
  HST_SECTIONS.forEach(n => document.getElementById('hst-' + n).classList.remove('active'));
}

function showHistorySection(name) {
  HST_SECTIONS.forEach(n => document.getElementById('hst-' + n).classList.remove('active'));
  document.getElementById('hst-' + name).classList.add('active');
  if (name === 'overview') renderHistoryOverview();
  else if (name === 'progress') renderHistoryProgress();
  else if (name === 'analysis') renderHistoryAnalysis();
  else if (name === 'mistakes') renderHistoryMistakes();
  else if (name === 'memory') renderHistoryMemory();
  else if (name === 'performance') renderHistoryPerformance();
  else if (name === 'behavior') renderHistoryBehavior();
  else if (name === 'log') renderHistoryLog();
  else if (name === 'compare') renderHistoryCompare();
  else if (name === 'predict') renderHistoryPredict();
  else if (name === 'report') renderHistoryReport();
  else if (name === 'settings') renderHistorySettings();
}

/* --- Level 2: Dashboard / Hồ sơ học tập --- */
function renderHistoryOverview() {
  const history = getHistory();
  const el = document.getElementById('hst-overview-body');
  if (!history.length) {
    el.innerHTML = `<div class="empty-state"><div class="empty-icon">📈</div><h3>Bạn chưa có dữ liệu học tập.</h3><button class="btn btn-primary" onclick="navTo('library')">Bắt đầu luyện đề</button></div>`;
    return;
  }
  const xp = getXpLevelInfo(history);
  const insights = generateInsights(history);
  const improvements = generateImprovementItems(history);
  const badges = getAchievementBadges(history);
  const quest = getDailyQuestProgress(history);
  const todayKey = new Date().toDateString();
  if (quest.done && sessionStorage.getItem('quiz_quest_celebrated') !== todayKey) {
    sessionStorage.setItem('quiz_quest_celebrated', todayKey);
    toast('🎉 Hoàn thành nhiệm vụ hôm nay!', 'success');
  }

  const insightsHtml = insights.length
    ? `<div class="hst-insights">${insights.map(i => `<div class="hst-insight-item"><span class="hst-insight-icon">${i.icon}</span>${esc(i.text)}</div>`).join('')}</div>`
    : `<p style="text-align:center;padding:8px;color:var(--color-text-muted);font-size:13px">Chưa đủ dữ liệu để gợi ý</p>`;

  const improvementsHtml = improvements.length
    ? improvements.map(i => `<div class="hst-dev-row" style="border-color:var(--color-danger-light)"><span>⚠ ${i.text}</span><span style="color:var(--color-danger);font-weight:700">${esc(i.value)}</span></div>`).join('')
    : `<p style="text-align:center;padding:8px;color:var(--color-text-muted);font-size:13px">Không có điểm cần cải thiện nổi bật 🎉</p>`;

  const badgesHtml = badges.map(b => `
    <div class="hst-badge${b.unlocked ? ' hst-badge-unlocked' : ''}" onclick="showBadgeCondition('${esc(b.name)}','${esc(b.cond)}')">
      <div class="hst-badge-icon">${b.unlocked ? b.icon : '🔒'}</div>
      <div class="hst-badge-name">${esc(b.name)}</div>
    </div>`).join('');

  el.innerHTML = `
    <div class="hst-level-card">
      <div class="hst-level-icon">${xp.icon}</div>
      <div class="hst-level-info">
        <div class="hst-level-name">Level ${xp.level} - ${esc(xp.name)}</div>
        <div class="hst-level-bar-wrap"><div class="hst-level-bar-fill" style="width:${xp.progress}%;background:var(--color-brand)"></div></div>
        <div class="hst-level-next">${xp.xpIntoLevel} / ${xp.xpNeeded} XP · còn ${xp.toNext} XP để lên Level ${xp.level + 1}</div>
        <div class="hst-level-sub">Đã làm ${history.reduce((s, h) => s + h.total, 0).toLocaleString('vi-VN')} câu</div>
      </div>
    </div>

    <div class="hst-section-header"><div class="section-label">Hành trình học</div></div>
    <div class="hst-chart-card">${renderJourneyMapHtml()}</div>

    <div class="hst-section-header"><div class="section-label">Nhiệm vụ hôm nay</div></div>
    <div class="hst-chart-card">
      <div class="hst-quest-row">
        <span>${quest.done ? '✅' : '🎯'} Làm ${quest.target} câu hôm nay</span>
        <span class="hst-quest-count">${Math.min(quest.current, quest.target)}/${quest.target}</span>
      </div>
      <div class="hst-level-bar-wrap"><div class="hst-level-bar-fill" style="width:${Math.min(100, Math.round(quest.current / quest.target * 100))}%;background:${quest.done ? 'var(--color-success)' : 'var(--color-brand)'}"></div></div>
    </div>

    <div class="hst-section-header"><div class="section-label">AI Insight</div></div>
    <div class="hst-chart-card">${insightsHtml}</div>

    <div class="hst-section-header"><div class="section-label">Cần cải thiện</div></div>
    <div class="hst-chart-card">${improvementsHtml}</div>

    <div class="hst-section-header"><div class="section-label">Hoạt động 30 ngày</div></div>
    <div class="hst-chart-card" onclick="showHistorySection('log')" style="cursor:pointer">
      ${renderCalHeatmapHtml(history, 30)}
    </div>

    <div class="hst-section-header"><div class="section-label">Chỉ số nhanh</div></div>
    <div class="hst-chart-card">${renderQuickMetricsHtml(history)}</div>

    <div class="hst-section-header"><div class="section-label">Thành tích</div></div>
    <div class="hst-chart-card">
      <div class="hst-badges-grid">${badgesHtml}</div>
    </div>`;
}


/* --- Level 2: Lỗi sai --- */
const RECENT_MISTAKES_WINDOW = 10; // số lượt gần nhất quét câu sai — PHẢI khớp với retryAllWrongQuestions()

function renderHistoryMistakes() {
  const history = getHistory();
  const el = document.getElementById('hst-mistakes-body');
  if (!history.length) {
    el.innerHTML = `<div class="empty-state"><div class="empty-icon">🎉</div><h3>Không có lỗi sai</h3><p>Chưa có dữ liệu lịch sử</p></div>`;
    return;
  }

  const recentWrongs = [];
  for (const entry of history.slice(0, RECENT_MISTAKES_WINDOW)) {
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
    .map(s => ({ setId: s.setId, n: s.name, wrong: s.wrong, total: s.total, rate: s.wrongRate }));

  const wrongHtml = recentWrongs.length
    ? recentWrongs.map(({ q, setName }) => `
        <div class="hst-mistake-card">
          <div class="hst-mistake-top"><span class="hst-mistake-badge">Sai</span><span class="hst-mistake-set">${esc(setName)}</span></div>
          <div class="hst-mistake-q">${esc(q.text)}</div>
          <div class="hst-mistake-correct">✅ ${esc(q.options[q.correct])}</div>
        </div>`).join('')
    : '<p style="text-align:center;padding:20px;color:var(--color-text-muted)">Không có câu sai gần đây 🎉</p>';

  const topicsHtml = weakTopics.length
    ? weakTopics.map(t => `
        <div class="hst-weak-topic">
          <div class="hst-weak-topic-name">${esc(t.n)}</div>
          <div class="hst-weak-topic-bar"><div class="hst-weak-topic-fill" style="width:${Math.round(t.rate * 100)}%"></div></div>
          <div class="hst-weak-topic-pct">${Math.round(t.rate * 100)}% sai</div>
          <button class="btn-icon" title="Luyện tập đề này" onclick="startPractice('${t.setId}')">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>
          </button>
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
             <div class="hst-weak-topic-bar"><div class="hst-weak-topic-fill" style="width:${100 - s.accuracy}%;background:var(--color-warning)"></div></div>
             <div class="hst-weak-topic-pct" style="color:var(--color-warning)">${s.accuracy}% đúng</div>
           </div>`).join('')}
       </div>` : '';

  const retryBtnHtml = recentWrongs.length
    ? `<div style="padding:16px 0 8px"><button class="btn btn-danger btn-full" onclick="retryAllWrongQuestions()">🔁 Luyện tập câu sai gần đây</button></div>`
    : '';

  // Sai liên tiếp
  const streaks = getConsecutiveWrongStreaks(history).slice(0, 5);
  const streaksHtml = streaks.length
    ? streaks.map(({ q, setName, streak }) => `
        <div class="hst-mistake-card">
          <div class="hst-mistake-top"><span class="hst-mistake-badge hst-hotspot-badge">Sai ${streak} lần liên tiếp</span><span class="hst-mistake-set">${esc(setName)}</span></div>
          <div class="hst-mistake-q">${esc(q.text)}</div>
          <div class="hst-mistake-correct">✅ ${esc(q.options[q.correct])}</div>
        </div>`).join('')
    : '';

  // Chưa sửa được vs đã sửa thành công
  const fixStatus = getFixStatus(history);
  const fixSummaryHtml = (fixStatus.fixed.length || fixStatus.unresolved.length)
    ? `<div class="hst-metric-row">
        <div class="hst-metric-card"><div class="hst-metric-title">❌ Chưa sửa được</div><div class="hst-metric-val">${fixStatus.unresolved.length} câu</div></div>
        <div class="hst-metric-card"><div class="hst-metric-title">✅ Đã sửa thành công</div><div class="hst-metric-val">${fixStatus.fixed.length} câu</div></div>
      </div>` : '';

  // Top đáp án nhầm / bẫy
  const confused = getTopConfusedAnswers(5);
  const letters = ['A', 'B', 'C', 'D'];
  const confusedHtml = confused.length
    ? confused.map(({ q, setName, selIdx, correctIdx, count }) => `
        <div class="hst-mistake-card">
          <div class="hst-mistake-top"><span class="hst-mistake-badge hst-hotspot-badge">Nhầm ${count}×</span><span class="hst-mistake-set">${esc(setName)}</span></div>
          <div class="hst-mistake-q">${esc(q.text)}</div>
          <div class="hst-mistake-correct">Chọn ${letters[selIdx]} (${esc(q.options[selIdx] || '?')}) thay vì ${letters[correctIdx]} (${esc(q.options[correctIdx] || '?')})</div>
        </div>`).join('')
    : '';

  el.innerHTML = `
    ${retryBtnHtml}
    ${hotspotsHtml ? `<div class="hst-section-header"><div class="section-label">🔥 Câu hay sai nhất (Top 100 quét trong lịch sử)</div></div>${hotspotsHtml}` : ''}
    ${streaksHtml ? `<div class="hst-section-header" style="margin-top:4px"><div class="section-label">Sai liên tiếp</div></div>${streaksHtml}` : ''}
    ${fixSummaryHtml}
    ${confusedHtml ? `<div class="hst-section-header" style="margin-top:4px"><div class="section-label">Top đáp án nhầm / bẫy</div></div>${confusedHtml}` : ''}
    <div class="hst-section-header" style="margin-top:4px"><div class="section-label">Câu sai gần đây</div></div>
    ${wrongHtml}
    ${topicsHtml ? `<div class="hst-section-header" style="margin-top:4px"><div class="section-label">Đề yếu nhất</div></div><div class="hst-weak-topics-list">${topicsHtml}</div>` : ''}
    ${skillsHtml}
    <div class="hst-chart-card" style="margin-top:8px">
      ${devRow('Sai theo Part')}
      ${devRow('Sai theo từ loại')}
      ${devRow('Sai theo ngữ pháp')}
      ${devRow('Sai theo CEFR')}
      ${devRow('Top từ hay sai')}
    </div>`;
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
  // Giữ search bar cố định (không innerHTML lại) để input không mất focus khi gõ
  if (!document.getElementById('hst-log-list')) {
    el.innerHTML = `
      <div class="hst-log-search-bar">
        <input type="text" class="form-control" id="hst-log-search-input" placeholder="Tìm theo tên bộ đề..." oninput="filterHistoryLog()">
        <select class="form-control" id="hst-log-mode-filter" onchange="filterHistoryLog()">
          <option value="">Tất cả</option>
          <option value="exam">Thi</option>
          <option value="practice">Luyện tập</option>
        </select>
      </div>
      <div id="hst-log-list"></div>
      <div class="hst-chart-card">
        ${devRow('Calendar (xem theo tháng)')}
        ${devRow('Replay')}
        ${devRow('Ghi chú')}
      </div>`;
  }
  filterHistoryLog();
}

function filterHistoryLog() {
  const history = getHistory();
  const qVal = (document.getElementById('hst-log-search-input')?.value || '').trim().toLowerCase();
  const modeVal = document.getElementById('hst-log-mode-filter')?.value || '';
  const filtered = history.filter(h =>
    (!modeVal || h.mode === modeVal) &&
    (!qVal || h.setName.toLowerCase().includes(qVal)));
  const list = document.getElementById('hst-log-list');
  if (!filtered.length) {
    list.innerHTML = `<p style="text-align:center;padding:20px;color:var(--color-text-muted)">Không tìm thấy kết quả</p>`;
    return;
  }

  const today = new Date().toDateString();
  const yesterday = new Date(Date.now() - 86400000).toDateString();
  const groups = {};
  filtered.forEach(h => {
    const dayStr = new Date(h.date).toDateString();
    const label = dayStr === today ? 'Hôm nay'
      : dayStr === yesterday ? 'Hôm qua'
      : new Date(h.date).toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'numeric' });
    if (!groups[label]) groups[label] = [];
    groups[label].push(h);
  });

  list.innerHTML = Object.entries(groups).map(([label, entries]) => {
    const items = entries.map(h => {
      const pct = scorePct(h.score, h.total);
      return `<div class="hst-log-item" onclick="viewHistoryEntry('${h.id}')">
        <div class="history-score-circle ${scoreClass(pct)}">${pct}%</div>
        <div class="hst-log-item-info">
          <div class="hst-log-item-name">${esc(h.setName)}</div>
          <div class="hst-log-item-meta">${h.score}/${h.total} câu đúng · ${fmtTime(h.timeTaken)}${h.mode === 'practice' ? ' · Luyện tập' : ''}</div>
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

/* ===== HELPER CHUNG (dùng cho các tab Phân tích/Ghi nhớ/Hiệu suất/Hành vi/So sánh/Dự đoán) ===== */

/* Mục chưa có data/chức năng — hiện rõ trong UI thay vì ẩn đi, để giữ đúng cây mục lục */
function devBadge() { return '<span class="hst-dev-badge">🚧 Đang phát triển</span>'; }
function devRow(label) {
  return `<div class="hst-dev-row"><span>${esc(label)}</span>${devBadge()}</div>`;
}

function calcStdDev(values) {
  if (!values.length) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

function median(values) {
  if (!values.length) return 0;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

/* Hồi quy tuyến tính đơn giản trên dãy giá trị theo thứ tự thời gian (cũ→mới), dự đoán điểm kế tiếp */
function linearRegressionPredict(values) {
  const n = values.length;
  if (n < 3) return null;
  const xMean = (n - 1) / 2;
  const yMean = values.reduce((a, b) => a + b, 0) / n;
  let num = 0, den = 0;
  for (let i = 0; i < n; i++) { num += (i - xMean) * (values[i] - yMean); den += (i - xMean) ** 2; }
  const slope = den ? num / den : 0;
  const intercept = yMean - slope * xMean;
  return { slope, predicted: Math.max(0, Math.min(100, Math.round(slope * n + intercept))) };
}

function _periodKey(ts, unit) {
  const d = new Date(ts);
  if (unit === 'day')     return d.toDateString();
  if (unit === 'week')    return getISOWeek(d);
  if (unit === 'month')   return `${d.getFullYear()}-${d.getMonth()}`;
  if (unit === 'quarter') return `${d.getFullYear()}-Q${Math.floor(d.getMonth() / 3)}`;
  return `${d.getFullYear()}`; // 'year'
}

function _aggregatePeriod(entries) {
  const totalQ = entries.reduce((s, h) => s + h.total, 0);
  const correct = entries.reduce((s, h) => s + h.score, 0);
  return {
    sessions: entries.length,
    totalQ, correct,
    accuracy: totalQ ? Math.round(correct / totalQ * 100) : 0,
    totalTime: entries.reduce((s, h) => s + (h.timeTaken || 0), 0)
  };
}

/* So sánh kỳ hiện tại vs kỳ liền trước theo đơn vị 'day'|'week'|'month'|'quarter'|'year' */
function compareTimePeriods(history, unit) {
  const now = new Date();
  const curKey = _periodKey(now.getTime(), unit);
  const prevDate = new Date(now);
  if (unit === 'day') prevDate.setDate(prevDate.getDate() - 1);
  else if (unit === 'week') prevDate.setDate(prevDate.getDate() - 7);
  else if (unit === 'month') prevDate.setMonth(prevDate.getMonth() - 1);
  else if (unit === 'quarter') prevDate.setMonth(prevDate.getMonth() - 3);
  else prevDate.setFullYear(prevDate.getFullYear() - 1);
  const prevKey = _periodKey(prevDate.getTime(), unit);
  return {
    current:  _aggregatePeriod(history.filter(h => _periodKey(h.date, unit) === curKey)),
    previous: _aggregatePeriod(history.filter(h => _periodKey(h.date, unit) === prevKey))
  };
}

function compareRowHtml(label, cur, prev, fmt = v => v) {
  const diff = cur - prev;
  const diffHtml = diff > 0 ? `<span class="hst-trend-up">▲ +${fmt(diff)}</span>`
    : diff < 0 ? `<span class="hst-trend-down">▼ ${fmt(diff)}</span>`
    : '<span style="color:var(--color-text-muted)">→ Không đổi</span>';
  return `<div class="hst-metric-row" style="padding:0.5rem var(--space-4)">
    <div class="hst-metric-card"><div class="hst-metric-title">${esc(label)}</div>
      <div class="hst-metric-val">${fmt(cur)} <span style="font-size:11px;color:var(--color-text-muted);font-weight:400">(trước: ${fmt(prev)})</span></div>
      <div style="margin-top:4px">${diffHtml}</div>
    </div>
  </div>`;
}

/* Dựng lịch sử trả lời theo từng câu hỏi (cũ→mới) — dùng cho sai liên tiếp / đã sửa-chưa sửa */
function _buildQuestionAttemptHistory(history) {
  const byQ = {};
  [...history].reverse().forEach(h => {
    const set = getSet(h.setId);
    if (!set) return;
    h.answers.forEach((ans, i) => {
      const q = set.questions[i];
      if (!q || ans === null) return;
      if (!byQ[q.id]) byQ[q.id] = { q, setName: h.setName, list: [] };
      byQ[q.id].list.push(ans === q.correct);
    });
  });
  return Object.values(byQ);
}

function getConsecutiveWrongStreaks(history) {
  return _buildQuestionAttemptHistory(history)
    .map(({ q, setName, list }) => {
      let streak = 0;
      for (let i = list.length - 1; i >= 0; i--) { if (!list[i]) streak++; else break; }
      return { q, setName, streak };
    })
    .filter(s => s.streak >= 2)
    .sort((a, b) => b.streak - a.streak);
}

function getFixStatus(history) {
  const fixed = [], unresolved = [];
  _buildQuestionAttemptHistory(history).forEach(({ q, setName, list }) => {
    if (!list.some(c => !c)) return; // chưa từng sai
    if (list[list.length - 1]) fixed.push({ q, setName });
    else unresolved.push({ q, setName });
  });
  return { fixed, unresolved };
}

/* Đáp án hay bị nhầm nhất, đọc từ quiz_q_stats (BKT) — optionPattern key "selIdx->correctIdx" */
function getTopConfusedAnswers(limit = 10) {
  const stats = getQuestionStats();
  const qMap = {};
  getSets().forEach(set => set.questions.forEach(q => { qMap[q.id] = { q, setName: set.name }; }));
  const rows = [];
  Object.entries(stats).forEach(([qid, s]) => {
    const info = qMap[qid];
    if (!info || !s.optionPattern) return;
    Object.entries(s.optionPattern).forEach(([pattern, count]) => {
      const [selIdx, correctIdx] = pattern.split('->').map(Number);
      rows.push({ q: info.q, setName: info.setName, selIdx, correctIdx, count });
    });
  });
  return rows.sort((a, b) => b.count - a.count).slice(0, limit);
}

/* Bucket "ghi nhớ" theo pL (xác suất đã thuộc) từ BKT — KHÔNG phải theo "từ", mà theo câu hỏi */
function getMemoryBuckets() {
  const stats = getQuestionStats();
  const reviewed = Object.values(stats);
  const totalQAll = getSets().reduce((s, set) => s + (set.questions ? set.questions.length : 0), 0);
  const buckets = { mastered: 0, learning: 0, atRisk: 0 };
  reviewed.forEach(s => {
    const pL = s.pL ?? 0.3;
    if (pL >= 0.85) buckets.mastered++;
    else if (pL < 0.55 && s.reviewCount >= 3) buckets.atRisk++;
    else buckets.learning++;
  });
  const newCount = Math.max(0, totalQAll - reviewed.length);
  const total = totalQAll || reviewed.length;
  return {
    ...buckets,
    new: newCount,
    total,
    retentionRate: total ? Math.round(buckets.mastered / total * 100) : 0
  };
}

function countDistinctQuestionsReviewed(history, sinceTs) {
  const seen = new Set();
  history.filter(h => h.date >= sinceTs).forEach(h => {
    const set = getSet(h.setId);
    if (!set) return;
    h.answers.forEach((ans, i) => { if (ans !== null && set.questions[i]) seen.add(set.questions[i].id); });
  });
  return seen.size;
}

/* Tính chung các chỉ số dùng ở cả Dashboard (Chỉ số nhanh) và tab Hiệu suất — tránh lặp code */
function computeCoreMetrics(history) {
  const totalQ = history.reduce((s, h) => s + h.total, 0);
  const totalCorrect = history.reduce((s, h) => s + h.score, 0);
  const totalTime = history.reduce((s, h) => s + (h.timeTaken || 0), 0);
  const scores = history.map(h => scorePct(h.score, h.total));
  const withActive = history.filter(h => h.activeTimeSec != null && h.timeTaken);
  const allRt = history.flatMap(h => (h.responseTimes || []).filter(t => t != null));
  return {
    totalQ, totalCorrect, totalTime,
    accuracy: totalQ ? Math.round(totalCorrect / totalQ * 100) : 0,
    avgScore: scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0,
    bestScore: scores.length ? Math.max(...scores) : 0,
    worstScore: scores.length ? Math.min(...scores) : 0,
    timePerQ: totalQ ? totalTime / totalQ : 0,
    velocity: totalTime ? Math.round(totalQ / (totalTime / 3600)) : 0,
    efficiency: totalTime ? Math.round(totalCorrect / (totalTime / 60) * 10) / 10 : 0,
    consistency: Math.max(0, Math.round(100 - calcStdDev(scores))),
    focusScore: withActive.length
      ? Math.round(withActive.reduce((s, h) => s + Math.min(1, h.activeTimeSec / h.timeTaken), 0) / withActive.length * 100)
      : null,
    avgThinking: allRt.length ? Math.round(median(allRt) / 1000) : null,
    retentionRate: getMemoryBuckets().retentionRate
  };
}

function renderQuickMetricsHtml(history) {
  const m = computeCoreMetrics(history);
  const scoreTrend = calcScoreTrend(history);
  const speedTrend = calcSpeedTrend(history);
  const sorted = [...history].sort((a, b) => a.date - b.date);
  const trendArrow = diff => diff == null ? '' : diff > 0 ? '<span class="hst-trend-up">▲</span>' : diff < 0 ? '<span class="hst-trend-down">▼</span>' : '';
  const items = [
    { l: 'Lần làm bài', v: history.length },
    { l: 'Tổng câu', v: m.totalQ },
    { l: 'Câu đúng', v: m.totalCorrect },
    { l: 'Accuracy', v: m.accuracy + '%', trend: trendArrow(scoreTrend ? scoreTrend.diff : null), nav: 'performance' },
    { l: 'Điểm trung bình', v: m.avgScore + '%', nav: 'progress' },
    { l: 'Điểm cao nhất', v: m.bestScore + '%' },
    { l: 'Điểm thấp nhất', v: m.worstScore + '%' },
    { l: 'Chuỗi ngày học', v: calcStreak(), nav: 'behavior' },
    { l: 'Tổng thời gian', v: fmtStudyTime(m.totalTime) },
    { l: 'Tốc độ trung bình', v: m.timePerQ.toFixed(1) + 's/câu', trend: trendArrow(speedTrend != null ? -speedTrend : null), nav: 'performance' },
    { l: 'Ngày học gần nhất', v: fmtDateShort(history[0].date), nav: 'log' },
    { l: 'Ngày bắt đầu học', v: fmtDateShort(sorted[0].date), nav: 'log' }
  ];
  return `<div class="hst-quickmetrics-grid">${items.map(i =>
    `<div class="hst-quickmetric"${i.nav ? ` style="cursor:pointer" onclick="showHistorySection('${i.nav}')"` : ''}><div class="hst-quickmetric-val">${i.v} ${i.trend || ''}</div><div class="hst-quickmetric-lbl">${i.l}</div></div>`
  ).join('')}</div>`;
}


/* --- Level 2: Ghi nhớ --- */
function renderHistoryMemory() {
  const history = getHistory();
  const el = document.getElementById('hst-memory-body');
  const b = getMemoryBuckets();
  if (!b.total) {
    el.innerHTML = `<div class="empty-state"><div class="empty-icon">🧠</div><h3>Chưa có dữ liệu</h3><p>Luyện tập (chế độ Luyện tập) để theo dõi mức ghi nhớ</p></div>`;
    return;
  }
  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
  const weekStart = Date.now() - 6 * 86400000;
  const reviewedToday = countDistinctQuestionsReviewed(history, todayStart.getTime());
  const reviewedWeek = countDistinctQuestionsReviewed(history, weekStart);

  el.innerHTML = `
    <div class="hst-stats-grid">
      <div class="hst-stat-card" style="grid-column:1/-1"><div class="hst-stat-val">${b.retentionRate}%</div><div class="hst-stat-lbl">Retention Rate</div></div>
      <div class="hst-stat-card"><div class="hst-stat-val">${b.new}</div><div class="hst-stat-lbl">Từ mới (câu chưa học)</div></div>
      <div class="hst-stat-card hst-stat-accent"><div class="hst-stat-val">${b.learning}</div><div class="hst-stat-lbl">Đang học</div></div>
      <div class="hst-stat-card hst-stat-green"><div class="hst-stat-val">${b.mastered}</div><div class="hst-stat-lbl">Thành thạo</div></div>
      <div class="hst-stat-card hst-stat-orange"><div class="hst-stat-val">${b.atRisk}</div><div class="hst-stat-lbl">Sắp quên</div></div>
      <div class="hst-stat-card"><div class="hst-stat-val">${reviewedToday}</div><div class="hst-stat-lbl">Ôn hôm nay</div></div>
      <div class="hst-stat-card"><div class="hst-stat-val">${reviewedWeek}</div><div class="hst-stat-lbl">Ôn tuần này</div></div>
      <div class="hst-stat-card hst-stat-green"><div class="hst-stat-val">${b.mastered}</div><div class="hst-stat-lbl">Mastered Words</div></div>
    </div>
    <div class="hst-chart-card">
      ${devRow('Forgetting Curve')}
      ${devRow('Stability')}
      ${devRow('Đã quên')}
      ${devRow('AI dự đoán sẽ quên')}
    </div>
    ${b.atRisk > 0 ? `<div style="padding:0 var(--space-4) var(--space-4)"><button class="btn btn-outline btn-full" onclick="retryAllWrongQuestions()">🔁 Ôn câu sắp quên</button></div>` : ''}`;
}

/* --- Level 2: Hiệu suất --- */
function renderHistoryPerformance() {
  const history = getHistory();
  const el = document.getElementById('hst-performance-body');
  if (!history.length) {
    el.innerHTML = `<div class="empty-state"><div class="empty-icon">⚙️</div><h3>Chưa có dữ liệu</h3><p>Làm bài thi để xem hiệu suất</p></div>`;
    return;
  }
  const m = computeCoreMetrics(history);
  const withMinQ = history.filter(h => h.total >= 5);
  const fastest = withMinQ.length ? withMinQ.reduce((a, b) => (a.timeTaken / a.total) < (b.timeTaken / b.total) ? a : b) : null;
  const slowest = withMinQ.length ? withMinQ.reduce((a, b) => (a.timeTaken / a.total) > (b.timeTaken / b.total) ? a : b) : null;
  const speedTrend = calcSpeedTrend(history);
  const peak = [...history].sort((a, b) => scorePct(b.score, b.total) - scorePct(a.score, a.total))[0];

  el.innerHTML = `
    <div class="hst-stats-grid">
      <div class="hst-stat-card hst-stat-accent"><div class="hst-stat-val">${m.accuracy}%</div><div class="hst-stat-lbl">Accuracy</div></div>
      <div class="hst-stat-card"><div class="hst-stat-val">${m.timePerQ.toFixed(1)}s</div><div class="hst-stat-lbl">Time / Question</div></div>
      <div class="hst-stat-card"><div class="hst-stat-val">${m.velocity}</div><div class="hst-stat-lbl">Learning Velocity (câu/h)</div></div>
      <div class="hst-stat-card"><div class="hst-stat-val">${m.efficiency}</div><div class="hst-stat-lbl">Efficiency Score (câu đúng/phút)</div></div>
      <div class="hst-stat-card hst-stat-green"><div class="hst-stat-val">${m.consistency}%</div><div class="hst-stat-lbl">Consistency Score</div></div>
      <div class="hst-stat-card hst-stat-orange"><div class="hst-stat-val">${m.focusScore !== null ? m.focusScore + '%' : '—'}</div><div class="hst-stat-lbl">Focus Score</div></div>
      <div class="hst-stat-card"><div class="hst-stat-val">${m.avgThinking !== null ? m.avgThinking + 's' : '—'}</div><div class="hst-stat-lbl">Average Thinking Time</div></div>
      <div class="hst-stat-card"><div class="hst-stat-val">${trendHtml(speedTrend !== null ? -Math.round(speedTrend) : null, 's/câu')}</div><div class="hst-stat-lbl">Speed (xu hướng)</div></div>
      <div class="hst-stat-card" style="grid-column:1/-1"><div class="hst-stat-val" style="font-size:16px">${esc(peak.setName)} · ${scorePct(peak.score, peak.total)}%</div><div class="hst-stat-lbl">Peak Performance</div></div>
    </div>
    ${devRow('Precision')}
    ${devRow('Recall')}
    ${devRow('Confidence Score')}
    ${devRow('Fatigue Score')}
    ${devRow('Average Review Time')}
    ${fastest ? `<div class="hst-chart-card">
      <div class="hst-chart-title">Fastest Session / Slowest Session (≥5 câu)</div>
      <div class="hst-metric-row">
        <div class="hst-metric-card"><div class="hst-metric-title">⚡ Nhanh nhất</div><div class="hst-metric-val">${esc(fastest.setName)}</div><div style="font-size:11px;color:var(--color-text-muted)">${(fastest.timeTaken / fastest.total).toFixed(1)}s/câu</div></div>
        <div class="hst-metric-card"><div class="hst-metric-title">🐢 Chậm nhất</div><div class="hst-metric-val">${esc(slowest.setName)}</div><div style="font-size:11px;color:var(--color-text-muted)">${(slowest.timeTaken / slowest.total).toFixed(1)}s/câu</div></div>
      </div>
    </div>` : ''}`;
}

/* --- Level 2: Hành vi học --- */
function renderHistoryBehavior() {
  const history = getHistory();
  const el = document.getElementById('hst-behavior-body');
  if (history.length < 3) {
    el.innerHTML = `<div class="empty-state"><div class="empty-icon">🕐</div><h3>Cần thêm dữ liệu</h3><p>Làm ít nhất 3 lần để xem hành vi học</p></div>`;
    return;
  }
  const hourCount = {}, weekdayCount = {};
  const weekdays = ['CN', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
  history.forEach(h => {
    const d = new Date(h.date);
    hourCount[d.getHours()] = (hourCount[d.getHours()] || 0) + 1;
    weekdayCount[d.getDay()] = (weekdayCount[d.getDay()] || 0) + 1;
  });
  const topHour = Object.entries(hourCount).sort((a, b) => b[1] - a[1])[0];
  const topWeekday = Object.entries(weekdayCount).sort((a, b) => b[1] - a[1])[0];
  const avgSessionLen = Math.round(history.reduce((s, h) => s + (h.timeTaken || 0), 0) / history.length);
  const sorted = [...history].sort((a, b) => a.date - b.date);
  const gaps = [];
  for (let i = 1; i < sorted.length; i++) gaps.push(sorted[i].date - sorted[i - 1].date);
  const avgGapH = gaps.length ? Math.round(gaps.reduce((a, b) => a + b, 0) / gaps.length / 3600000) : 0;
  const spanDays = Math.max(1, Math.round((Date.now() - sorted[0].date) / 86400000));
  const freqPerWeek = Math.round(history.length / (spanDays / 7) * 10) / 10;
  const streak = calcStreak();
  const focusScore = computeCoreMetrics(history).focusScore;
  const bestEntry = [...history].sort((a, b) => scorePct(b.score, b.total) - scorePct(a.score, a.total))[0];
  const worstEntry = [...history].sort((a, b) => scorePct(a.score, a.total) - scorePct(b.score, b.total))[0];

  el.innerHTML = `
    <div class="hst-stats-grid">
      <div class="hst-stat-card hst-stat-accent"><div class="hst-stat-val">${topHour[0]}h</div><div class="hst-stat-lbl">Giờ học nhiều nhất</div></div>
      <div class="hst-stat-card hst-stat-accent"><div class="hst-stat-val">${weekdays[topWeekday[0]]}</div><div class="hst-stat-lbl">Ngày học nhiều nhất</div></div>
      <div class="hst-stat-card"><div class="hst-stat-val">${fmtTime(avgSessionLen)}</div><div class="hst-stat-lbl">Thời gian học TB</div></div>
      <div class="hst-stat-card"><div class="hst-stat-val">${fmtTime(avgSessionLen)}</div><div class="hst-stat-lbl">Độ dài phiên học</div></div>
      <div class="hst-stat-card hst-stat-orange"><div class="hst-stat-val">${streak}</div><div class="hst-stat-lbl">Chuỗi học 🔥</div></div>
      <div class="hst-stat-card"><div class="hst-stat-val">${freqPerWeek}</div><div class="hst-stat-lbl">Tần suất luyện / tuần</div></div>
      <div class="hst-stat-card"><div class="hst-stat-val">${avgGapH}h</div><div class="hst-stat-lbl">Khoảng nghỉ TB</div></div>
      <div class="hst-stat-card"><div class="hst-stat-val">${focusScore !== null ? focusScore + '%' : '—'}</div><div class="hst-stat-lbl">Thời gian tập trung</div></div>
      <div class="hst-stat-card hst-stat-green"><div class="hst-stat-val">${new Date(bestEntry.date).getHours()}h</div><div class="hst-stat-lbl">Thời điểm điểm cao nhất</div></div>
      <div class="hst-stat-card"><div class="hst-stat-val">${new Date(worstEntry.date).getHours()}h</div><div class="hst-stat-lbl">Thời điểm điểm thấp nhất</div></div>
    </div>
    <div class="hst-chart-card">
      ${devRow('Bỏ học')}
      ${devRow('Quay lại học')}
    </div>`;
}

/* --- Level 2: So sánh --- */
function renderHistoryCompare() {
  const history = getHistory();
  const el = document.getElementById('hst-compare-body');
  if (history.length < 2) {
    el.innerHTML = `<div class="empty-state"><div class="empty-icon">🔀</div><h3>Cần thêm dữ liệu</h3><p>Làm ít nhất 2 lần để so sánh</p></div>`;
    return;
  }
  const day = compareTimePeriods(history, 'day');
  const week = compareTimePeriods(history, 'week');
  const month = compareTimePeriods(history, 'month');
  const year = compareTimePeriods(history, 'year');
  const best = [...history].sort((a, b) => scorePct(b.score, b.total) - scorePct(a.score, a.total))[0];
  const latest = history[0];
  const timePerQ = p => p.totalQ ? Math.round(p.totalTime / p.totalQ * 10) / 10 : 0;

  el.innerHTML = `
    <div class="hst-section-header"><div class="section-label">Hôm nay vs Hôm qua</div></div>
    ${compareRowHtml('Accuracy', day.current.accuracy, day.previous.accuracy, v => v + '%')}
    ${compareRowHtml('Số câu', day.current.totalQ, day.previous.totalQ)}
    <div class="hst-section-header" style="margin-top:8px"><div class="section-label">Tuần này vs Tuần trước</div></div>
    ${compareRowHtml('Accuracy', week.current.accuracy, week.previous.accuracy, v => v + '%')}
    ${compareRowHtml('Số phiên', week.current.sessions, week.previous.sessions)}
    <div class="hst-section-header" style="margin-top:8px"><div class="section-label">Tháng này vs Tháng trước</div></div>
    ${compareRowHtml('Accuracy', month.current.accuracy, month.previous.accuracy, v => v + '%')}
    ${compareRowHtml('Số phiên', month.current.sessions, month.previous.sessions)}
    <div class="hst-section-header" style="margin-top:8px"><div class="section-label">Năm nay vs Năm trước</div></div>
    ${compareRowHtml('Accuracy', year.current.accuracy, year.previous.accuracy, v => v + '%')}
    <div class="hst-section-header" style="margin-top:8px"><div class="section-label">Phiên gần nhất vs Phiên tốt nhất</div></div>
    ${compareRowHtml('Điểm (Progress)', scorePct(latest.score, latest.total), scorePct(best.score, best.total), v => v + '%')}
    <div class="hst-section-header" style="margin-top:8px"><div class="section-label">Speed / Time (tuần này vs trước)</div></div>
    ${compareRowHtml('Time (s/câu)', timePerQ(week.current), timePerQ(week.previous))}
    <div class="hst-chart-card">${devRow('Chủ đề A vs Chủ đề B')}</div>`;
}

/* --- Level 2: Dự đoán --- */
function renderHistoryPredict() {
  const history = getHistory();
  const el = document.getElementById('hst-predict-body');
  if (history.length < 3) {
    el.innerHTML = `<div class="empty-state"><div class="empty-icon">🔮</div><h3>Cần thêm dữ liệu</h3><p>Làm ít nhất 3 lần để dự đoán</p></div>`;
    return;
  }
  const ordered = [...history].reverse().map(h => scorePct(h.score, h.total));
  const pred = linearRegressionPredict(ordered.slice(-10));
  const eta = predictLevelETA(history);
  const goalProgress = getGoalProgress(history);
  const goalHtml = goalProgress
    ? `<div class="hst-chart-card">
        <div class="hst-chart-title">Xác suất đạt mục tiêu (${goalProgress.goal}% accuracy)</div>
        <div class="hst-metric-val" style="font-size:18px">${goalProgress.achieved ? '✅ Đang đạt' : `Còn thiếu ${Math.abs(goalProgress.diff)}%`}</div>
      </div>`
    : '';

  el.innerHTML = `
    <div class="hst-chart-card">
      <div class="hst-chart-title">Điểm kỳ vọng lần làm bài tiếp theo</div>
      <div class="hst-metric-val" style="font-size:28px;color:var(--color-brand)">${pred ? pred.predicted + '%' : '—'}</div>
      <div style="font-size:12px;color:var(--color-text-muted);margin-top:4px">Dựa trên hồi quy tuyến tính ${Math.min(10, ordered.length)} lần gần nhất</div>
    </div>
    ${goalHtml}
    <div class="hst-chart-card">
      <div class="hst-chart-title">ETA hoàn thành / Dự đoán level / Dự đoán số ngày</div>
      <div class="hst-metric-val" style="font-size:18px">Level ${eta.level + 1} sau khoảng ${eta.etaDays != null ? eta.etaDays + ' ngày' : '—'}</div>
      <div style="font-size:12px;color:var(--color-text-muted);margin-top:4px">Còn ${eta.toNext} XP, tốc độ gần đây ~${eta.xpPerDay.toFixed(0)} XP/ngày</div>
    </div>
    <div class="hst-chart-card">
      ${devRow('Dự đoán tỷ lệ quên')}
      ${devRow('AI Forecast')}
    </div>`;
}

/* --- Level 2: Báo cáo --- */
function renderHistoryReport() {
  const el = document.getElementById('hst-report-body');
  const history = getHistory();
  if (!history.length) {
    el.innerHTML = `<div class="empty-state"><div class="empty-icon">🧾</div><h3>Chưa có dữ liệu</h3><p>Làm bài thi để xuất báo cáo</p></div>`;
    return;
  }
  const reportJson = _buildExportJson(history, getSets(), getQuestionStats(), getSkillLog(), getTopicLog());
  const reportTxt = _buildReportTxt(reportJson);

  el.innerHTML = `
    <div class="hst-chart-card">
      <button class="btn btn-primary btn-full" style="margin-bottom:8px" onclick="analyzeStudyReport()">🤖 Phân tích AI</button>
      <button class="btn btn-outline btn-full" style="margin-bottom:8px" onclick="exportPersonalizationData()">📤 Xuất báo cáo học tập (.txt)</button>
      <button class="btn btn-outline btn-full" style="margin-bottom:8px" onclick="shareHistoryReport()">📲 Chia sẻ</button>
      <button class="btn btn-outline btn-full" onclick="window.print()">🖨️ In</button>
    </div>
    <div class="hst-chart-card">
      <div class="hst-chart-title">Xem nhanh báo cáo</div>
      <div style="white-space:pre-wrap;font-size:12px;line-height:1.5;max-height:50vh;overflow-y:auto;font-family:monospace">${esc(reportTxt)}</div>
    </div>
    <div class="hst-chart-card">
      ${devRow('Báo cáo ngày')}
      ${devRow('Báo cáo tuần')}
      ${devRow('Báo cáo tháng')}
      ${devRow('Báo cáo năm')}
      ${devRow('PDF')}
      ${devRow('Excel')}
    </div>`;
}

async function shareHistoryReport() {
  const history = getHistory();
  const avg = Math.round(history.reduce((s, h) => s + scorePct(h.score, h.total), 0) / history.length);
  const text = `Kết quả học tập: ${history.length} lần làm bài, điểm TB ${avg}%, chuỗi học ${calcStreak()} ngày 🔥`;
  if (navigator.share) {
    try { await navigator.share({ title: 'Báo cáo học tập', text }); } catch {}
  } else {
    toast('Thiết bị không hỗ trợ Chia sẻ — dùng nút Xuất báo cáo thay thế', '');
  }
}

/* --- Level 2: Cài đặt thống kê --- */
function renderHistorySettings() {
  const el = document.getElementById('hst-settings-body');
  const goal = getStatsGoal();
  el.innerHTML = `
    <div class="hst-chart-card">
      <div class="hst-chart-title">Mục tiêu Accuracy cá nhân</div>
      <div class="form-group">
        <input type="number" id="hst-goal-input" class="form-control" min="0" max="100" placeholder="VD: 80" value="${goal.accuracy || ''}">
        <div class="form-hint">Dùng để tính "Xác suất đạt mục tiêu" trong tab Dự đoán</div>
      </div>
      <button class="btn btn-primary btn-full" onclick="saveHistoryGoal()">Lưu mục tiêu</button>
    </div>
    <div class="hst-chart-card">
      ${devRow('Chỉ số hiển thị')}
      ${devRow('Màu biểu đồ')}
      ${devRow('Đồng bộ')}
      ${devRow('Sao lưu')}
    </div>
    <div class="hst-chart-card">
      <div class="hst-chart-title">Dữ liệu thống kê</div>
      <button class="btn btn-outline btn-full" onclick="navTo('settings')">⚙️ Nhập dữ liệu & Reset thống kê</button>
    </div>`;
}

function saveHistoryGoal() {
  const val = parseInt(document.getElementById('hst-goal-input').value);
  saveStatsGoal({ accuracy: val > 0 && val <= 100 ? val : null });
  toast('Đã lưu mục tiêu', 'success');
}
