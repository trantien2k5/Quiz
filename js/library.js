/* ===== LIBRARY SCREEN ===== */
function _nowStamp() {
  const d = new Date(), p = n => String(n).padStart(2,'0');
  return `${d.getFullYear()}${p(d.getMonth()+1)}${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}
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
  const json = _buildExportJson(history, getSets(), getQuestionStats(), getSkillLog(), getTopicLog());
  const txt = _buildReportTxt(json);
  const blob = new Blob(['﻿' + txt], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `quiz-report-${_nowStamp()}.txt`;
  a.click();
  URL.revokeObjectURL(url);
  toast('Đã xuất báo cáo học tập (' + history.length + ' phiên)', 'success');
}

function _buildExportJson(history, sets, qStats, skillLog, topicLog) {
  const now = Date.now();
  const toISO  = ts => new Date(ts).toISOString();
  const toDate = ts => new Date(ts).toISOString().slice(0,10);
  const classify = (ms, ok) => !ms ? 'unknown' : ok ? (ms < 5000 ? 'confident' : 'uncertain') : (ms < 3000 ? 'guessing' : 'confused');

  // Lookup maps
  const setById = {}; const qById = {};
  sets.forEach(s => {
    setById[s.id] = s;
    (s.questions||[]).forEach(q => { qById[q.id] = { ...q, setName: s.name, setId: s.id }; });
  });

  const examH  = history.filter(h => h.mode !== 'practice');
  const practH = history.filter(h => h.mode === 'practice');
  const totalQ       = history.reduce((s,h) => s + h.total, 0);
  const totalCorrect = history.reduce((s,h) => s + h.score, 0);
  const totalTime    = history.reduce((s,h) => s + (h.timeTaken||0), 0);
  const daySet = new Set(history.map(h => toDate(h.date)));
  const sortedDays = [...daySet].sort();

  // --- overview ---
  const overview = {
    totalSessions: history.length,
    examSessions: examH.length,
    practiceSessions: practH.length,
    totalQuestions: totalQ,
    totalCorrect,
    overallAccuracy: totalQ ? Math.round(totalCorrect/totalQ*100) : 0,
    totalStudyMinutes: Math.round(totalTime/60),
    activeDays: daySet.size,
    firstActivity: sortedDays[0]||null,
    lastActivity: sortedDays[sortedDays.length-1]||null,
    currentStreak: calcStreak()
  };

  // --- examStats ---
  const examStats = examH.length ? {
    sessions: examH.length,
    avgAccuracy: Math.round(examH.reduce((s,h) => s+scorePct(h.score,h.total),0)/examH.length),
    bestScore: Math.max(...examH.map(h => scorePct(h.score,h.total))),
    worstScore: Math.min(...examH.map(h => scorePct(h.score,h.total))),
    avgSecondsPerQuestion: examH.reduce((s,h) => s+(h.timeTaken||0)/h.total,0)/examH.length|0
  } : null;

  // --- practiceStats ---
  const practiceStats = practH.length ? {
    sessions: practH.length,
    totalMastered: practH.reduce((s,h) => s+h.score,0),
    avgMasteryRate: Math.round(practH.reduce((s,h) => s+h.score/h.total*100,0)/practH.length)
  } : null;

  // --- topicStats ---
  const topicMap = {};
  history.forEach(h => {
    if (!topicMap[h.setName]) topicMap[h.setName] = {correct:0,wrong:0,sessions:0,totalTime:0,lastStudied:0};
    const t = topicMap[h.setName];
    t.correct += h.score; t.wrong += h.total-h.score;
    t.sessions++; t.totalTime += h.timeTaken||0;
    if (h.date > t.lastStudied) t.lastStudied = h.date;
  });
  const topicStats = Object.entries(topicMap).map(([topic,s]) => ({
    topic, sessions: s.sessions, correct: s.correct, wrong: s.wrong,
    accuracy: Math.round(s.correct/(s.correct+s.wrong)*100),
    lastStudied: toDate(s.lastStudied)
  })).sort((a,b) => a.accuracy-b.accuracy);

  // --- skillStats from qStats ---
  const skillMap = {};
  Object.entries(qStats).forEach(([qId,qs]) => {
    const q = qById[qId];
    (q?.skillTags||[]).forEach(sk => {
      if (!skillMap[sk]) skillMap[sk] = {correct:0,wrong:0};
      skillMap[sk].correct += qs.correct||0;
      skillMap[sk].wrong   += qs.wrong||0;
    });
  });
  const skillStats = Object.entries(skillMap).map(([skill,s]) => {
    const total = s.correct+s.wrong;
    return { skill, correct:s.correct, wrong:s.wrong, total, accuracy: total?Math.round(s.correct/total*100):0 };
  }).sort((a,b) => a.accuracy-b.accuracy);

  // --- timelines from daily logs ---
  const _buildTimeline = log => {
    const out = {};
    Object.entries(log).forEach(([name,days]) => {
      out[name] = Object.entries(days).sort(([a],[b]) => a.localeCompare(b))
        .map(([date,v]) => ({ date, correct:v.c, wrong:v.w, accuracy:v.c+v.w?Math.round(v.c/(v.c+v.w)*100):0 }));
    });
    return out;
  };
  const skillTimeline = _buildTimeline(skillLog);
  const topicTimeline = _buildTimeline(topicLog);

  // --- questionStats ---
  const questionStats = Object.entries(qStats).map(([qId,qs]) => {
    const q = qById[qId];
    const total = (qs.correct||0)+(qs.wrong||0);
    return {
      questionId: qId,
      questionText: q?.text||null,
      setName: q?.setName||null,
      skills: q?.skillTags||[],
      correct: qs.correct||0,
      wrong: qs.wrong||0,
      accuracy: total?Math.round((qs.correct||0)/total*100):0,
      firstSeen: qs.firstSeen||null
    };
  }).sort((a,b) => a.accuracy-b.accuracy);

  // --- attemptHistory + learningPatterns (computed in one pass) ---
  const attempts = [];
  let fastCorrect=0, slowCorrect=0, fastWrong=0, slowWrong=0;
  let maxWrongStreak=0, curStreak=0;
  const confusionMap = {};

  history.forEach(h => {
    const set = setById[h.setId];
    if (!set) return;
    (set.questions||[]).forEach((q,i) => {
      const ans = h.answers[i];
      if (ans == null) return;
      const ok = ans === q.correct;
      const rt = h.responseTimes?.[i] || null;
      const signal = classify(rt, ok);
      if (ok) { curStreak=0; if(rt){ if(rt<5000) fastCorrect++; else slowCorrect++; } }
      else {
        curStreak++; if(curStreak>maxWrongStreak) maxWrongStreak=curStreak;
        if(rt){ if(rt<3000) fastWrong++; else slowWrong++; }
        const ck = `${q.options[ans]}|||${q.options[q.correct]}`;
        confusionMap[ck] = (confusionMap[ck]||0)+1;
      }
      attempts.push({
        sessionId: h.id, date: toISO(h.date), setName: h.setName, mode: h.mode||'exam',
        questionId: q.id, questionText: q.text,
        selectedAnswer: q.options[ans], correctAnswer: q.options[q.correct],
        isCorrect: ok, responseTimeMs: rt, signal
      });
    });
  });
  const attemptHistory = attempts.slice(-1000); // giới hạn 1000 attempt gần nhất

  const confusionPairs = Object.entries(confusionMap)
    .sort(([,a],[,b]) => b-a).slice(0,10)
    .map(([k,count]) => { const [sel,cor] = k.split('|||'); return {selected:sel,correct:cor,count}; });

  const learningPatterns = { fastCorrect, slowCorrect, fastWrong, slowWrong, maxWrongStreak, confusionPairs };

  // --- masteryScores ---
  const masteryScores = Object.entries(qStats).map(([qId,qs]) => {
    const q = qById[qId];
    const total = (qs.correct||0)+(qs.wrong||0);
    const accuracy = total?Math.round((qs.correct||0)/total*100):0;
    const signal = total<3?'insufficient_data': accuracy>=80?'strong':accuracy>=50?'learning':'weak';
    return { questionId:qId, questionText:q?.text||null, skills:q?.skillTags||[], mastery:accuracy, totalAttempts:total, signal };
  }).sort((a,b) => a.mastery-b.mastery);

  // --- studyBehavior ---
  const hourCounts = {};
  history.forEach(h => { const hr=new Date(h.date).getHours(); hourCounts[hr]=(hourCounts[hr]||0)+1; });
  const bestStudyHour = Object.entries(hourCounts).sort(([,a],[,b]) => b-a)[0]?.[0];
  const weekSet = new Set(history.map(h => getISOWeek(h.date)));
  const studyBehavior = {
    avgSessionMinutes: history.length?Math.round(totalTime/history.length/6)/10:0,
    avgQuestionsPerSession: history.length?Math.round(totalQ/history.length):0,
    bestStudyHour: bestStudyHour!=null?parseInt(bestStudyHour):null,
    totalActiveDays: daySet.size,
    avgDaysPerWeek: weekSet.size?Math.round(daySet.size/weekSet.size*10)/10:0
  };

  // --- weak / strong questions ---
  const weakQuestions = Object.entries(qStats)
    .filter(([,s]) => (s.wrong||0)>=2)
    .sort(([,a],[,b]) => (b.wrong||0)-(a.wrong||0)).slice(0,20)
    .map(([qId,s]) => {
      const q=qById[qId]; const total=(s.correct||0)+(s.wrong||0);
      return { questionId:qId, text:q?.text||null, setName:q?.setName||null,
        skills:q?.skillTags||[], correct:s.correct||0, wrong:s.wrong||0,
        accuracy:total?Math.round((s.correct||0)/total*100):0 };
    });
  const strongQuestions = Object.entries(qStats)
    .filter(([,s]) => { const t=(s.correct||0)+(s.wrong||0); return t>=3&&Math.round((s.correct||0)/t*100)>=90; })
    .sort(([,a],[,b]) => (b.correct||0)-(a.correct||0)).slice(0,20)
    .map(([qId,s]) => {
      const q=qById[qId]; const total=(s.correct||0)+(s.wrong||0);
      return { questionId:qId, text:q?.text||null, setName:q?.setName||null,
        skills:q?.skillTags||[], correct:s.correct||0, wrong:s.wrong||0,
        accuracy:total?Math.round((s.correct||0)/total*100):0 };
    });

  // --- recommendations ---
  const recommendations = {
    weakestSkills:   skillStats.slice(0,5).map(s => ({skill:s.skill,accuracy:s.accuracy,attempts:s.total})),
    strongestSkills: [...skillStats].reverse().slice(0,5).map(s => ({skill:s.skill,accuracy:s.accuracy,attempts:s.total})),
    weakestTopics:   topicStats.slice(0,3).map(t => ({topic:t.topic,accuracy:t.accuracy,sessions:t.sessions})),
    priorityQuestions: weakQuestions.slice(0,5).map(q => ({questionId:q.questionId,text:q.text,wrong:q.wrong,accuracy:q.accuracy}))
  };

  return {
    meta: { exportedAt: toISO(now), purpose: 'AI learning analysis — quiz performance data' },
    overview, examStats, practiceStats,
    topicStats, skillStats,
    skillTimeline, topicTimeline,
    questionStats, attemptHistory,
    masteryScores, learningPatterns,
    studyBehavior,
    weakQuestions, strongQuestions,
    recommendations
  };
}

/* Format object từ _buildExportJson() thành text gọn, dễ đọc cho người + AI */
function _buildReportTxt(d) {
  const o = d.overview;
  const bar = pct => '█'.repeat(Math.round(pct / 10)) + '░'.repeat(10 - Math.round(pct / 10));
  let t = `=== BÁO CÁO HỌC TẬP CÁ NHÂN HOÁ ===
Xuất ngày : ${d.meta.exportedAt.slice(0, 10)}
Mục đích  : Theo dõi cá nhân / gửi AI phân tích lộ trình học

▌TỔNG QUAN
  Buổi học     : ${o.totalSessions} (Thi: ${o.examSessions} | Luyện tập: ${o.practiceSessions})
  Câu đã làm   : ${o.totalQuestions} | Đúng: ${o.totalCorrect} (${o.overallAccuracy}%)
  Thời gian học: ${o.totalStudyMinutes} phút | Ngày có học: ${o.activeDays}
  Hoạt động    : ${o.firstActivity} → ${o.lastActivity} | Chuỗi hiện tại: ${o.currentStreak} ngày\n`;

  if (d.examStats) {
    t += `\n▌THI THỬ\n  Số lần: ${d.examStats.sessions} | Điểm TB: ${d.examStats.avgAccuracy}% | Cao nhất: ${d.examStats.bestScore}% | Thấp nhất: ${d.examStats.worstScore}% | TB ${d.examStats.avgSecondsPerQuestion}s/câu\n`;
  }
  if (d.practiceStats) {
    t += `\n▌LUYỆN TẬP\n  Số phiên: ${d.practiceStats.sessions} | Câu đã thuộc: ${d.practiceStats.totalMastered} | Tỉ lệ thuộc TB: ${d.practiceStats.avgMasteryRate}%\n`;
  }

  if (d.topicStats.length) {
    t += `\n▌CHỦ ĐỀ (yếu → mạnh)\n`;
    d.topicStats.forEach(s => {
      t += `  ${s.topic.padEnd(28)} ${String(s.accuracy).padStart(3)}% [${bar(s.accuracy)}] ${s.correct}/${s.correct + s.wrong} đúng, ${s.sessions} buổi, gần nhất ${s.lastStudied}\n`;
    });
  }

  if (d.skillStats.length) {
    const weakSkills = d.skillStats.slice(0, 5);
    const strongSkills = [...d.skillStats].reverse().slice(0, 5);
    t += `\n▌KỸ NĂNG YẾU NHẤT (top 5)\n`;
    weakSkills.forEach(s => { t += `  ${s.skill.padEnd(28)} ${String(s.accuracy).padStart(3)}% (${s.total} lần)\n`; });
    t += `\n▌KỸ NĂNG MẠNH NHẤT (top 5)\n`;
    strongSkills.forEach(s => { t += `  ${s.skill.padEnd(28)} ${String(s.accuracy).padStart(3)}% (${s.total} lần)\n`; });
  }

  if (d.weakQuestions.length) {
    t += `\n▌CÂU SAI NHIỀU NHẤT (top ${Math.min(d.weakQuestions.length, 10)})\n`;
    d.weakQuestions.slice(0, 10).forEach((w, i) => {
      t += `  ${i + 1}. [${w.setName}] ${w.text}\n     Sai ${w.wrong} lần, đúng ${w.correct} lần (${w.accuracy}%)\n`;
    });
  }

  const cp = d.learningPatterns.confusionPairs;
  if (cp && cp.length) {
    t += `\n▌NHẦM LẪN PHỔ BIẾN (top ${Math.min(cp.length, 5)})\n`;
    cp.slice(0, 5).forEach(c => { t += `  Chọn "${c.selected}" thay vì "${c.correct}" — ${c.count} lần\n`; });
  }

  const lp = d.learningPatterns;
  t += `\n▌THÓI QUEN LÀM BÀI\n  Trả lời nhanh-đúng: ${lp.fastCorrect} | chậm-đúng: ${lp.slowCorrect} | nhanh-sai (đoán): ${lp.fastWrong} | chậm-sai (chưa hiểu): ${lp.slowWrong}\n  Chuỗi sai liên tiếp dài nhất: ${lp.maxWrongStreak} câu\n`;

  const sb = d.studyBehavior;
  t += `\n▌THÓI QUEN HỌC TẬP\n  TB ${sb.avgSessionMinutes} phút/buổi, ${sb.avgQuestionsPerSession} câu/buổi | ${sb.avgDaysPerWeek} ngày học/tuần${sb.bestStudyHour != null ? ` | Giờ học tốt nhất: ${sb.bestStudyHour}h` : ''}\n`;

  const r = d.recommendations;
  if (r.weakestSkills.length || r.weakestTopics.length || r.priorityQuestions.length) {
    t += `\n▌GỢI Ý ƯU TIÊN ÔN TẬP\n`;
    if (r.weakestSkills.length) t += `  Kỹ năng  : ${r.weakestSkills.map(s => `${s.skill} (${s.accuracy}%)`).join(', ')}\n`;
    if (r.weakestTopics.length) t += `  Chủ đề   : ${r.weakestTopics.map(s => `${s.topic} (${s.accuracy}%)`).join(', ')}\n`;
    if (r.priorityQuestions.length) t += `  Câu hỏi  : ${r.priorityQuestions.length} câu cần ôn lại (xem mục "Câu sai nhiều nhất")\n`;
  }

  return t;
}

function exportSet(setId) {
  const set = getSet(setId);
  if (!set) return;
  const blob = new Blob([JSON.stringify([set], null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${set.name.replace(/[^a-z0-9]/gi, '_')}_quiz_${_nowStamp()}.json`;
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
  a.download = `quiz_sets_all_${_nowStamp()}.json`;
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
