/* ===== LIBRARY SCREEN ===== */
function buildSetCard(set) {
  const qCount = set.questions ? set.questions.length : 0;
  const best = getBestScore(set.id);
  const bestBadge = best !== null ? `<span class="badge badge-green">🏆 ${best}%</span>` : `<span class="badge badge-gray">Chưa làm</span>`;
  const timeBadge = set.timeLimit ? `<span class="badge badge-orange">⏱ ${set.timeLimit} phút</span>` : '';
  const borderColor = best === null ? '#E5E7EB' : best >= 80 ? '#059669' : best >= 60 ? '#6366F1' : '#D97706';
  return `<div class="set-card" style="border-left: 4px solid ${borderColor}">
    <div class="set-card-top">
      <div class="set-card-icon">📋</div>
      <div class="set-card-info">
        <div class="set-card-name">${esc(set.name)}</div>
        <div class="set-card-desc">${esc(set.description || 'Không có mô tả')}</div>
      </div>
    </div>
    <div class="set-card-meta">
      <span class="badge badge-purple">${qCount} câu</span>
      ${bestBadge}
      ${timeBadge}
    </div>
    <div class="set-card-actions">
      <button class="btn btn-primary btn-sm" onclick="startPractice('${set.id}')" ${qCount === 0 ? 'disabled' : ''}>🎯 Luyện tập</button>
      <button class="btn btn-secondary btn-sm" onclick="showQuizSettings('${set.id}')" ${qCount === 0 ? 'disabled' : ''}>📝 Thi thử</button>
      <button class="btn btn-secondary btn-sm" onclick="openEditor('${set.id}')">✏️ Sửa</button>
      <button class="btn btn-outline btn-sm" onclick="showAICreate('${set.id}')">✨ Thêm câu</button>
      <button class="btn btn-danger btn-sm" onclick="confirmDeleteSet('${set.id}', '${esc(set.name)}')">🗑 Xóa</button>
      <button class="btn btn-outline btn-sm" onclick="exportSet('${set.id}')">↓ Xuất</button>
    </div>
  </div>`;
}

function renderLibrary() {
  const lastId = localStorage.getItem('quiz_last_set');
  const all    = getSets();
  const sets   = lastId
    ? [...all.filter(s => s.id === lastId), ...all.filter(s => s.id !== lastId)]
    : all;
  const container = document.getElementById('library-set-list');
  if (!sets.length) {
    container.innerHTML = `<div class="empty-state">
      <div class="empty-icon">📚</div>
      <h3>Chưa có bộ đề nào</h3>
      <p>Dùng AI tạo đề hoặc nhấn "Tạo mới" bên trên</p>
    </div>`;
    return;
  }
  container.innerHTML = sets.map(set => buildSetCard(set)).join('');
}

function confirmDeleteSet(id, name) {
  confirm('Xóa bộ đề', `Bạn có chắc muốn xóa bộ đề "${name}"? Lịch sử làm bài cũng sẽ bị xóa.`, () => {
    deleteSet(id);
    renderLibrary();
    toast('Đã xóa bộ đề', 'error');
  });
}

function exportPersonalizationData() {
  const history = getHistory();
  if (!history.length) { toast('Chưa có dữ liệu để xuất', 'error'); return; }

  const totalQ       = history.reduce((s, h) => s + h.total, 0);
  const totalCorrect = history.reduce((s, h) => s + h.score, 0);
  const totalTime    = history.reduce((s, h) => s + (h.timeTaken || 0), 0);
  const daySet       = new Set(history.map(h => new Date(h.date).toDateString()));

  /* topic stats */
  const topicMap = {};
  history.forEach(h => {
    if (!topicMap[h.setName]) topicMap[h.setName] = { correct: 0, wrong: 0, sessions: 0, totalTime: 0 };
    topicMap[h.setName].correct   += h.score;
    topicMap[h.setName].wrong     += h.total - h.score;
    topicMap[h.setName].sessions  ++;
    topicMap[h.setName].totalTime += h.timeTaken || 0;
  });
  const topicStats = {};
  Object.entries(topicMap).forEach(([n, s]) => {
    topicStats[n] = {
      correct: s.correct, wrong: s.wrong,
      accuracy: Math.round(s.correct / (s.correct + s.wrong) * 100),
      sessions: s.sessions,
      avgTimeSec: Math.round(s.totalTime / s.sessions)
    };
  });
  const topWeakTopics = Object.entries(topicStats)
    .filter(([, s]) => s.wrong > 0)
    .sort((a, b) => a[1].accuracy - b[1].accuracy)
    .slice(0, 5).map(([topic, s]) => ({ topic, accuracy: s.accuracy, sessions: s.sessions }));

  /* weak questions (wrong ≥ 2 times) */
  const wqMap = {};
  history.forEach(h => {
    const set = getSet(h.setId);
    if (!set) return;
    h.answers.forEach((ans, i) => {
      const q = set.questions[i];
      if (!q || ans === null || ans === q.correct) return;
      const key = h.setId + ':' + (q.id || i);
      if (!wqMap[key]) wqMap[key] = { question: q.text, correctAnswer: q.options[q.correct], topic: h.setName, count: 0, lastDate: h.date };
      wqMap[key].count++;
      if (h.date > wqMap[key].lastDate) wqMap[key].lastDate = h.date;
    });
  });
  const weakQuestions = Object.values(wqMap)
    .filter(w => w.count >= 2)
    .sort((a, b) => b.count - a.count)
    .slice(0, 20)
    .map(w => ({ question: w.question, correctAnswer: w.correctAnswer, topic: w.topic, wrongCount: w.count,
      lastWrong: new Date(w.lastDate).toLocaleDateString('vi-VN') }));

  /* weekly breakdown */
  const weekMap = {};
  history.forEach(h => {
    const wk = getISOWeek(h.date);
    if (!weekMap[wk]) weekMap[wk] = { sessions: 0, correct: 0, total: 0, topics: new Set() };
    weekMap[wk].sessions++; weekMap[wk].correct += h.score; weekMap[wk].total += h.total;
    weekMap[wk].topics.add(h.setName);
  });
  const weeklyBreakdown = Object.entries(weekMap)
    .sort(([a], [b]) => b.localeCompare(a)).slice(0, 8)
    .map(([week, s]) => ({ week, sessions: s.sessions, questions: s.total,
      accuracy: Math.round(s.correct / s.total * 100), topics: [...s.topics] }));

  /* practice vs exam stats */
  const examHistory     = history.filter(h => h.mode === 'exam' || !h.mode);
  const practiceHistory = history.filter(h => h.mode === 'practice');
  const examStats = examHistory.length ? {
    sessions: examHistory.length,
    avgAccuracy: Math.round(examHistory.reduce((s, h) => s + scorePct(h.score, h.total), 0) / examHistory.length),
    best: Math.max(...examHistory.map(h => scorePct(h.score, h.total)))
  } : null;
  const masteredInPractice = practiceHistory.reduce((s, h) => s + h.score, 0);
  const practiceStats = practiceHistory.length ? {
    sessions: practiceHistory.length,
    totalMastered: masteredInPractice
  } : null;

  /* weak skills */
  const sets = getSets();
  const weakSkillsAll = computeWeakSkills(history, sets);
  const weakSkills = weakSkillsAll.filter(s => s.accuracy < 70);
  const goodSkills = weakSkillsAll.filter(s => s.accuracy >= 70).reverse();

  const data = {
    exportDate: new Date().toISOString().slice(0, 10),
    overview: {
      totalSessions: history.length,
      totalQuestions: totalQ,
      totalCorrect,
      accuracy: Math.round(totalCorrect / totalQ * 100),
      avgTimePerSession: fmtTime(Math.round(totalTime / history.length)),
      studyDays: daySet.size,
      currentStreak: calcStreak()
    },
    examStats,
    practiceStats,
    weeklyBreakdown,
    topicStats,
    topWeakTopics,
    weakSkills,
    goodSkills,
    weakQuestions,
    questionStats: getQuestionStats(),
    recentSessions: history.slice(0, 30).map(h => ({
      date: new Date(h.date).toLocaleDateString('vi-VN'),
      topic: h.setName,
      score: h.score, total: h.total,
      accuracy: scorePct(h.score, h.total),
      duration: fmtTime(h.timeTaken),
      mode: h.mode || 'exam'
    }))
  };

  const txt = _buildReportTxt(data);
  const blob = new Blob(['﻿' + txt], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `quiz-report-${data.exportDate}.txt`;
  a.click();
  URL.revokeObjectURL(url);
  toast('Đã xuất báo cáo học tập', 'success');
}

function _buildReportTxt(d) {
  const o = d.overview;
  const bar = pct => '█'.repeat(Math.round(pct / 10)) + '░'.repeat(10 - Math.round(pct / 10));
  let t = `╔══════════════════════════════════════╗
║   BÁO CÁO HỌC TẬP CÁ NHÂN HOÁ      ║
╚══════════════════════════════════════╝
Xuất ngày : ${d.exportDate}
Mục đích  : Gửi AI/chuyên gia đánh giá và đề xuất lộ trình học

▌TỔNG QUAN
  Buổi học     : ${o.totalSessions}
  Câu đã làm   : ${o.totalQuestions}
  Câu đúng     : ${o.totalCorrect} (${o.accuracy}%)
  TB mỗi buổi  : ${o.avgTimePerSession}
  Ngày có học  : ${o.studyDays} ngày
  Chuỗi hiện tại: ${o.currentStreak} ngày\n`;

  if (d.examStats) {
    t += `\n=== THI THỬ ===\n  Số lần thi   : ${d.examStats.sessions} | Điểm TB: ${d.examStats.avgAccuracy}% | Cao nhất: ${d.examStats.best}%\n`;
  }
  if (d.practiceStats) {
    t += `\n=== LUYỆN TẬP ===\n  Số phiên     : ${d.practiceStats.sessions} | Câu đã thuộc: ${d.practiceStats.totalMastered}\n`;
  }

  t += `\n▌THỐNG KÊ THEO CHỦ ĐỀ\n`;
  Object.entries(d.topicStats)
    .sort(([,a],[,b]) => a.accuracy - b.accuracy)
    .forEach(([n, s]) => {
      t += `  ${n.padEnd(28)} ${String(s.accuracy).padStart(3)}% [${bar(s.accuracy)}] (${s.sessions} buổi, ${s.correct}/${s.correct+s.wrong} đúng)\n`;
    });

  t += `\n▌CHỦ ĐỀ YẾU NHẤT\n`;
  d.topWeakTopics.forEach((w, i) => {
    t += `  ${i+1}. ${w.topic} — ${w.accuracy}% (${w.sessions} buổi)\n`;
  });

  if (d.weakSkills && d.weakSkills.length) {
    t += `\n=== KỸ NĂNG YẾU ===\n`;
    d.weakSkills.forEach(s => {
      t += `  ${s.skill.padEnd(30)} ${String(s.accuracy).padStart(3)}% (${s.total} lần)\n`;
    });
  }
  if (d.goodSkills && d.goodSkills.length) {
    t += `\n=== KỸ NĂNG TỐT ===\n`;
    d.goodSkills.forEach(s => {
      t += `  ${s.skill.padEnd(30)} ${String(s.accuracy).padStart(3)}% (${s.total} lần)\n`;
    });
  }

  if (d.weakQuestions.length) {
    t += `\n▌CÂU HỎI SAI NHIỀU LẦN (top ${Math.min(d.weakQuestions.length, 10)})\n`;
    d.weakQuestions.slice(0, 10).forEach((w, i) => {
      t += `  ${i+1}. [Sai ${w.wrongCount}x | ${w.topic}]\n     Câu: ${w.question}\n     ✅  ${w.correctAnswer}\n`;
    });
  }

  t += `\n▌LỊCH SỬ THEO TUẦN\n`;
  d.weeklyBreakdown.forEach(w => {
    t += `  ${w.week}  ${String(w.accuracy).padStart(3)}% | ${w.questions} câu | ${w.sessions} buổi | ${w.topics.join(', ')}\n`;
  });

  t += `\n▌30 BUỔI GẦN NHẤT\n`;
  d.recentSessions.forEach(s => {
    const modeTag = s.mode === 'practice' ? '[Luyện]' : '[Thi]  ';
    t += `  ${s.date.padEnd(12)} ${modeTag} ${String(s.accuracy).padStart(3)}% (${s.score}/${s.total}) ${s.duration.padStart(6)}  ${s.topic}\n`;
  });

  t += `\n${'─'.repeat(44)}\n▌RAW JSON (dùng cho phân tích tự động)\n${'─'.repeat(44)}\n`;
  t += JSON.stringify(d, null, 2);
  return t;
}

function exportSet(setId) {
  const set = getSet(setId);
  if (!set) return;
  const blob = new Blob([JSON.stringify([set], null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${set.name.replace(/[^a-z0-9]/gi, '_')}_quiz.json`;
  a.click();
  URL.revokeObjectURL(url);
  toast('Đã xuất bộ đề', 'success');
}

function exportAllSets() {
  const sets = getSets();
  if (!sets.length) { toast('Không có bộ đề để xuất', 'error'); return; }
  const blob = new Blob([JSON.stringify(sets, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'quiz_sets_all.json';
  a.click();
  URL.revokeObjectURL(url);
  toast(`Đã xuất ${sets.length} bộ đề`, 'success');
}

function validateSetStructure(obj) {
  if (!obj || typeof obj !== 'object') return false;
  if (typeof obj.name !== 'string' || !obj.name.trim()) return false;
  if (!Array.isArray(obj.questions)) return false;
  for (const q of obj.questions) {
    if (!q || typeof q.text !== 'string') return false;
    if (!Array.isArray(q.options) || q.options.length !== 4) return false;
    if (typeof q.correct !== 'number' || q.correct < 0 || q.correct > 3) return false;
  }
  return true;
}

function importSetsFromData(arr) {
  let imported = 0, skipped = 0;
  arr.forEach(obj => {
    if (!validateSetStructure(obj)) { skipped++; return; }
    saveSet({
      id: uid(),
      name: obj.name.trim(),
      description: obj.description || '',
      timeLimit: obj.timeLimit || null,
      createdAt: Date.now(),
      questions: obj.questions.map(q => ({
        id: uid(),
        text: q.text.trim(),
        options: q.options.map(o => String(o).trim()),
        correct: q.correct,
        explanation: (q.explanation || '').trim(),
        skillTags: (q.skillTags || []).map(t => String(t).toLowerCase().trim())
      }))
    });
    imported++;
  });
  renderLibrary();
  renderHome();
  if (imported > 0) toast(`Đã nhập ${imported} bộ đề`, 'success');
  if (skipped > 0) toast(`Bỏ qua ${skipped} bộ đề không hợp lệ`, 'error');
  return imported;
}

function importSetsFromJSON(jsonStr) {
  let data;
  try { data = JSON.parse(jsonStr); } catch { toast('File JSON không hợp lệ', 'error'); return; }
  const arr = Array.isArray(data) ? data : [data];
  importSetsFromData(arr);
  hideImportModal();
}

function showImportModal() { document.getElementById('import-overlay').classList.add('active'); }
function hideImportModal() {
  document.getElementById('import-overlay').classList.remove('active');
  document.getElementById('import-file-input').value = '';
}

function handleImportFile(e) {
  const file = e.target.files[0];
  if (!file) return;
  if (!file.name.endsWith('.json')) { toast('Vui lòng chọn file .json', 'error'); return; }
  const reader = new FileReader();
  reader.onload = ev => importSetsFromJSON(ev.target.result);
  reader.readAsText(file);
}
