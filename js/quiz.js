/* ===== QUIZ ===== */
let _quiz = null;
let _quizInProgress = false;
let _questionStartTime = null;

/* ===== QUIZ SETTINGS ===== */
let _pendingSetId = null;

function showQuizSettings(setId) {
  const set = getSet(setId);
  if (!set) return;
  _pendingSetId = setId;
  const total = set.questions ? set.questions.length : 0;
  document.getElementById('qs-total-label').textContent = `/ ${total} câu`;
  document.getElementById('qs-num-q').value = '';
  document.getElementById('qs-num-q').max = total;
  document.getElementById('qs-time-limit').value = set.timeLimit || total; // mặc định 1 phút/câu
  document.getElementById('modal-quiz-settings').classList.add('active');
}

function closeQuizSettings() {
  document.getElementById('modal-quiz-settings').classList.remove('active');
}

function beginQuiz() {
  closeQuizSettings();
  const shuffleQ      = document.getElementById('qs-shuffle-q').checked;
  const shuffleOpts   = document.getElementById('qs-shuffle-opts').checked;
  const numQRaw       = document.getElementById('qs-num-q').value.trim();
  const numQ          = numQRaw ? parseInt(numQRaw) : null;
  const timeLimitRaw  = document.getElementById('qs-time-limit').value.trim();
  const timeLimitMin  = timeLimitRaw ? parseInt(timeLimitRaw) : null;
  startQuiz(_pendingSetId, { shuffleQ, shuffleOpts, numQ, timeLimitMin });
}

function startQuiz(setOrId, settings) {
  const set = typeof setOrId === 'string' ? getSet(setOrId) : setOrId;
  if (!set || !set.questions || !set.questions.length) {
    toast('Bộ đề không có câu hỏi', 'error'); return;
  }
  settings = settings || { shuffleQ: false, shuffleOpts: false, numQ: null };

  let questions = JSON.parse(JSON.stringify(set.questions));

  // Trộn câu hỏi
  if (settings.shuffleQ) questions = shuffleArray(questions);

  // Lấy N câu ngẫu nhiên
  if (settings.numQ && settings.numQ > 0 && settings.numQ < questions.length) {
    questions = questions.slice(0, settings.numQ);
  }

  // Đảo đáp án
  if (settings.shuffleOpts) questions = questions.map(q => shuffleOptions(q));

  _quiz = {
    set: { ...set, questions },
    originalSetId: typeof setOrId === 'string' ? setOrId : setOrId.id,
    answers: new Array(questions.length).fill(null),
    responseTimes: new Array(questions.length).fill(null),
    flagged: new Array(questions.length).fill(false),
    startTime: Date.now(),
    currentIdx: 0,
    timerInterval: null,
    timeLeft: settings.timeLimitMin ? settings.timeLimitMin * 60 : null,
    mode: 'all'
  };
  _quiz.activityTracker = startActivityTracking({
    onResumeNudge: sec => toast(`👋 Quay lại tập trung học nào! (đã rời ${fmtTime(sec)})`),
    onPomodoroBreak: () => toast('🍅 Đã học liên tục 25 phút — nghỉ giải lao 5 phút nhé!'),
    onIdleWarning: () => toast('⏸️ Không thấy thao tác — bộ đếm sẽ tạm dừng nếu bạn rời thêm 60s nữa')
  });
  _quizInProgress = true;
  localStorage.setItem('quiz_last_set', _quiz.originalSetId);
  document.querySelector('[onclick="toggleQuizMode()"]').style.display = '';
  document.getElementById('quiz-side-map').style.display = '';
  document.querySelector('.quiz-progress-bar').style.display = '';
  document.getElementById('quiz-counter').style.display = '';
  document.getElementById('quiz-practice-hud').style.display = 'none';
  renderQuiz();
  showScreen('screen-quiz');
}

function startPractice(setOrId) {
  const set = typeof setOrId === 'string' ? getSet(setOrId) : setOrId;
  if (!set || !set.questions || !set.questions.length) {
    toast('Bộ đề không có câu hỏi', 'error'); return;
  }
  const questions = JSON.parse(JSON.stringify(set.questions)).map(q => shuffleOptions(q));
  const n = questions.length;

  // Ưu tiên câu pL thấp nhất lên đầu (chưa thuộc nhất)
  const qStats = getQuestionStats();
  const pQueue = questions.map((_, i) => i).sort((a, b) => {
    const pLa = (qStats[questions[a].id] || {}).pL ?? 0.3;
    const pLb = (qStats[questions[b].id] || {}).pL ?? 0.3;
    return pLa - pLb;
  });
  const pL = questions.map(q => (qStats[q.id] || {}).pL ?? 0.3);
  _quiz = {
    set: { ...set, questions },
    originalSetId: typeof setOrId === 'string' ? setOrId : setOrId.id,
    pQueue,
    pL,
    pMastered:   new Array(n).fill(false),
    pWrongCount: new Array(n).fill(0),
    pSkipped:    new Array(n).fill(false),
    answers: new Array(n).fill(null),
    responseTimes: new Array(n).fill(null),
    locked:  new Array(n).fill(false),
    flagged: new Array(n).fill(false),
    combo: 0,
    totalAttempts: 0,
    correctAttempts: 0,
    startTime: Date.now(),
    currentIdx: 0,
    timerInterval: null,
    timeLeft: null,
    mode: 'one-by-one'
  };
  _quiz.activityTracker = startActivityTracking({
    onResumeNudge: sec => toast(`👋 Quay lại tập trung học nào! (đã rời ${fmtTime(sec)})`),
    onPomodoroBreak: () => toast('🍅 Đã học liên tục 25 phút — nghỉ giải lao 5 phút nhé!'),
    onIdleWarning: () => toast('⏸️ Không thấy thao tác — bộ đếm sẽ tạm dừng nếu bạn rời thêm 60s nữa')
  });
  _quizInProgress = true;
  localStorage.setItem('quiz_last_set', _quiz.originalSetId);
  document.querySelector('[onclick="toggleQuizMode()"]').style.display = 'none';
  document.getElementById('quiz-side-map').style.display = 'none';
  document.querySelector('.quiz-progress-bar').style.display = 'none';
  document.getElementById('quiz-counter').style.display = 'none';
  document.getElementById('quiz-timer').style.display = 'none';
  document.getElementById('quiz-practice-hud').style.display = '';
  _quiz.activeDisplayInterval = setInterval(() => {
    document.getElementById('practice-hud-timer').textContent = '⏱ ' + fmtTime(_quiz.activityTracker.getActiveSec());
  }, 1000);
  renderQuiz();
  showScreen('screen-quiz');
}

function renderQuiz() {
  const q = _quiz;
  const total = q.set.questions.length;
  document.getElementById('quiz-top-title').textContent = q.set.name;

  const answered = q.answers.filter(a => a !== null).length;
  document.getElementById('quiz-progress-fill').style.width = (answered / total * 100) + '%';
  document.getElementById('quiz-counter').textContent = `${answered}/${total} đã trả lời`;

  const timerEl = document.getElementById('quiz-timer');
  if (q.timeLeft !== null) {
    timerEl.style.display = 'flex';
    renderTimer();
    if (!q.timerInterval) {
      q.timerInterval = setInterval(() => {
        q.timeLeft--;
        renderTimer();
        if (q.timeLeft <= 0) {
          clearInterval(q.timerInterval);
          q.timerInterval = null;
          toast('⏰ Hết giờ! Bài thi đã được nộp tự động.', 'error');
          submitQuiz(true);
        }
      }, 1000);
    }
  } else if (!q.pQueue) {
    timerEl.style.display = 'none';
  }

  if (q.mode === 'all') {
    document.getElementById('quiz-questions-content').innerHTML =
      q.set.questions.map((question, i) => buildQuizQuestion(question, i)).join('<div class="quiz-separator"></div>');
  } else {
    renderCurrentQuestion();
  }
  renderQuizNav();
}

function buildQuizQuestion(question, i) {
  const letters    = ['A', 'B', 'C', 'D'];
  const isPractice = !!_quiz.pQueue;
  const qIdx       = isPractice ? _quiz.pQueue[i] : i;
  const selected   = _quiz.answers[i];
  const isLocked   = isPractice && _quiz.locked[i];
  const isFlagged  = !isPractice && _quiz.flagged[i];
  const correct    = question.correct;
  const total      = _quiz.set.questions.length;

  const optHtml = question.options.map((opt, oi) => {
    let cls = 'option-btn';
    if (isLocked) {
      cls += ' locked';
      if (oi === correct)       cls += ' correct-ans';
      else if (oi === selected) cls += ' wrong-ans';
    } else if (selected === oi) {
      cls += ' selected';
    }
    return `<button class="${cls}" onclick="${isLocked ? '' : `selectAnswer(${i}, ${oi})`}">
      <span class="opt-letter">${letters[oi]}</span>
      <span>${esc(opt)}</span>
    </button>`;
  }).join('');

  const feedbackHtml = isLocked ? `
    <div class="practice-feedback ${selected === correct ? 'correct' : 'wrong'}">
      <div class="practice-feedback-header">
        <span class="practice-feedback-badge">${selected === correct ? '✅ Chính xác! ⚔️ Đánh trúng Boss!' : '❌ Sai rồi! 🛡 Boss chưa mất máu'}</span>
        ${selected === correct && _quiz.combo >= 2 ? `<span class="combo-badge">🔥 Combo x${_quiz.combo}</span>` : ''}
      </div>
      <div class="practice-feedback-body">
        ${selected !== correct ? `<div class="practice-feedback-correct">Đáp án đúng: <strong>${esc(question.options[correct])}</strong></div>` : ''}
        ${question.explanation ? `<div class="practice-feedback-exp">${esc(question.explanation)}</div>` : ''}
      </div>
    </div>
    <div class="practice-inline-nav">
      <button class="btn btn-primary practice-next-btn" onclick="practiceAdvance()">Tiếp theo →</button>
    </div>` : '';

  const isMastered = isPractice && _quiz.pMastered[qIdx];
  const pLPct = isPractice ? Math.round((_quiz.pL[qIdx] ?? 0.3) * 100) : 0;
  const streakDots = isPractice
    ? (isMastered
        ? `<span class="practice-badge mastered" title="Đã đạt ngưỡng thuộc bài">✅ Đã thuộc</span>`
        : `<span class="practice-badge ${pLPct < 50 ? 'wrong-hint' : 'progress-hint'}" title="Mức độ thuộc câu này — cần đạt 90% để được tính là đã thuộc">🧠 Đã thuộc ${pLPct}%</span>`)
    : '';

  const numLabel = isPractice ? '' : `Câu ${i + 1}`;

  const flagBtn = isPractice ? '' : `
    <button class="quiz-flag-btn ${isFlagged ? 'flagged' : ''}" onclick="toggleFlag(${i})" title="Đánh dấu xem lại">
      <svg viewBox="0 0 24 24" fill="${isFlagged ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>
    </button>`;

  return `
    <div class="question-block quiz-question-block" data-idx="${i}" id="quiz-q-${i}">
      <div class="q-num-row">
        <div class="q-num-label">${numLabel}${streakDots}</div>
        ${flagBtn}
      </div>
      <div class="q-text">${esc(question.text)}</div>
      <div class="options-list">${optHtml}</div>
      ${feedbackHtml}
    </div>`;
}

function renderCurrentQuestion() {
  _questionStartTime = Date.now();
  const i = _quiz.currentIdx;
  const question = _quiz.pQueue
    ? _quiz.set.questions[_quiz.pQueue[i]]
    : _quiz.set.questions[i];
  document.getElementById('quiz-questions-content').innerHTML = buildQuizQuestion(question, i);
  document.getElementById('quiz-questions-content').scrollTop = 0;
  updateQuizCounterDisplay();
}

function updateQuizCounterDisplay() {
  const q = _quiz;
  const total = q.set.questions.length;
  if (q.pQueue) {
    const mastered = q.pMastered.filter(Boolean).length;
    const skipped  = q.pSkipped.filter(Boolean).length;
    document.getElementById('quiz-counter').textContent =
      `${mastered}/${total} đã thuộc${skipped ? ' · ' + skipped + ' bỏ qua' : ''}`;
    document.getElementById('quiz-progress-fill').style.width = ((mastered + skipped) / total * 100) + '%';
    updatePracticeHud();
  } else {
    const answered = q.answers.filter(a => a !== null).length;
    if (q.mode === 'one-by-one') {
      document.getElementById('quiz-counter').textContent = `Câu ${q.currentIdx + 1} / ${total}  ·  ${answered} đã làm`;
    } else {
      document.getElementById('quiz-counter').textContent = `${answered}/${total} đã trả lời`;
    }
    document.getElementById('quiz-progress-fill').style.width = (answered / total * 100) + '%';
  }
}

/* HUD luyện tập: Boss HP (= % chưa thuộc), combo, accuracy live, near-finish banner */
function updatePracticeHud() {
  const q = _quiz;
  const total = q.set.questions.length;
  const mastered = q.pMastered.filter(Boolean).length;
  const skipped  = q.pSkipped.filter(Boolean).length;
  const bossHp = Math.max(0, Math.round((1 - mastered / total) * 100));
  document.getElementById('boss-hp-pct').textContent = bossHp + '%';
  document.getElementById('boss-hp-fill').style.width = bossHp + '%';

  const comboEl = document.getElementById('practice-hud-combo');
  if (q.combo >= 2) { comboEl.style.display = ''; comboEl.textContent = `🔥 x${q.combo}`; }
  else comboEl.style.display = 'none';

  const acc = q.totalAttempts ? Math.round(q.correctAttempts / q.totalAttempts * 100) : 100;
  document.getElementById('practice-hud-accuracy').textContent = `🎯 ${acc}%`;

  const remaining = total - mastered - skipped;
  const finishEl = document.getElementById('practice-near-finish');
  if (remaining > 0 && remaining <= 3) {
    finishEl.style.display = '';
    finishEl.textContent = `🏁 Còn ${remaining} câu nữa`;
  } else {
    finishEl.style.display = 'none';
  }
}

function renderTimer() {
  const t = _quiz.timeLeft;
  document.getElementById('quiz-timer-text').textContent = fmtTime(Math.max(0, t));
  const el = document.getElementById('quiz-timer');
  if (t <= 60) el.classList.add('warning'); else el.classList.remove('warning');
}

function renderQuizNav() {
  const q = _quiz;
  const nav = document.getElementById('quiz-nav');

  if (q.pQueue) { // practice mode
    const mastered = q.pMastered.filter(Boolean).length;
    const skipped  = q.pSkipped.filter(Boolean).length;
    const total    = q.set.questions.length;
    const pos      = q.currentIdx;
    const isLocked = q.locked[pos];
    const qIdx     = q.pQueue[pos];
    const statLabel  = `${mastered}/${total} đã thuộc${skipped ? ' · ' + skipped + ' bỏ qua' : ''}`;
    nav.innerHTML = !isLocked ? `<div class="practice-nav"><div class="practice-hint-nav">Chọn đáp án để tiếp tục</div></div>` : '';
    return;
  }

  const total = q.set.questions.length;
  renderQuizMap(); // đồng bộ sidebar bảng câu hỏi (desktop) + modal map (mobile)
  if (q.mode === 'all') {
    nav.innerHTML = `<button class="btn btn-primary btn-full" onclick="submitQuizConfirm()">Nộp bài ✓</button>`;
    return;
  }
  const isFirst = q.currentIdx === 0;
  const isLast  = q.currentIdx === total - 1;
  const answered = q.answers.filter(a => a !== null).length;
  nav.innerHTML = `
    <button class="btn btn-secondary qnav-prev" onclick="quizPrev()" ${isFirst ? 'disabled' : ''}>← Trước</button>
    <button class="qnav-map-btn" onclick="showQuizMap()">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="15" height="15"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
      ${answered}/${total}
    </button>
    ${isLast
      ? `<button class="btn btn-primary qnav-next" onclick="submitQuizConfirm()">Nộp ✓</button>`
      : `<button class="btn btn-primary qnav-next" onclick="quizNext()">Tiếp →</button>`}`;
}

function selectAnswer(qIdx, optIdx) {
  if (_quiz.pQueue && _quiz.locked[qIdx]) return; // practice: đã chốt
  if (_questionStartTime) { _quiz.responseTimes[qIdx] = Date.now() - _questionStartTime; _questionStartTime = null; }
  _quiz.answers[qIdx] = optIdx;
  if (_quiz.pQueue) { // practice mode
    _quiz.locked[qIdx] = true;
    const isCorrect = optIdx === _quiz.set.questions[_quiz.pQueue[qIdx]].correct;
    const rt = _quiz.responseTimes[qIdx];
    const prevCombo = _quiz.combo || 0;
    _quiz.combo = isCorrect ? prevCombo + 1 : 0;
    _quiz.totalAttempts++;
    if (isCorrect) _quiz.correctAttempts++;
    playSound(isCorrect ? 'correct' : 'wrong');
    if (isCorrect) {
      const isCrit = (rt != null && rt < 3000) || (_quiz.combo > 0 && _quiz.combo % 3 === 0);
      showFloatingXp(isCrit ? '⚡ +15 XP' : '+10 XP', isCrit);
    } else if (prevCombo >= 2) {
      showComboBrokenFlash();
    }
    renderCurrentQuestion();
    renderQuizNav();
    return;
  }
  // exam mode: cập nhật UI inline — màu do CSS class .selected .opt-letter xử lý (css/pages/quiz.css)
  const block = document.getElementById('quiz-q-' + qIdx);
  if (!block) return;
  block.querySelectorAll('.option-btn').forEach((btn, i) => {
    btn.classList.toggle('selected', i === optIdx);
  });
  updateQuizCounterDisplay();
  renderQuizNav();
}

const PRACTICE_MAX_WRONG = 3; // sai 3 lần → tự động bỏ qua

function _practiceIsDone() {
  return _quiz.pMastered.every((m, i) => m || _quiz.pSkipped[i]);
}

const PRACTICE_MASTERED_PL = 0.90; // ngưỡng BKT để coi là thuộc

function practiceAdvance() {
  const pos  = _quiz.currentIdx;
  const qIdx = _quiz.pQueue[pos];
  const q    = _quiz.set.questions[qIdx];
  const isCorrect = _quiz.answers[pos] === q.correct;
  const rtMs = _quiz.responseTimes[pos];

  trackQuestionResult(q.id, isCorrect, _quiz.answers[pos], q.correct, rtMs);

  // Đọc pL mới sau khi BKT update
  const updatedStats = getQuestionStats();
  const newPL = (updatedStats[q.id] || {}).pL ?? 0.3;
  _quiz.pL[qIdx] = newPL;

  if (newPL >= PRACTICE_MASTERED_PL) {
    _quiz.pMastered[qIdx] = true;
  } else {
    if (!isCorrect) {
      _quiz.pWrongCount[qIdx]++;
      if (_quiz.pWrongCount[qIdx] >= PRACTICE_MAX_WRONG) {
        _quiz.pSkipped[qIdx] = true;
      }
    }
    if (!_quiz.pSkipped[qIdx]) {
      // pL thấp → ôn lại sớm hơn; pL cao hơn → chèn xa hơn
      const dist = newPL < 0.5
        ? 2 + Math.floor(Math.random() * 2)   // 2-3 vị trí
        : 4 + Math.floor(Math.random() * 3);  // 4-6 vị trí
      const insertAt = Math.min(pos + dist, _quiz.pQueue.length);
      _quiz.pQueue.splice(insertAt, 0, qIdx);
      _quiz.answers.splice(insertAt, 0, null);
      _quiz.locked.splice(insertAt, 0, false);
    }
  }

  _quiz.currentIdx++;
  if (_practiceIsDone()) { finishPractice(); return; }
  if (_quiz.currentIdx >= _quiz.pQueue.length) { finishPractice(); return; }

  renderCurrentQuestion();
  renderQuizNav();
}

/* Lưu kết quả luyện tập (history + skill/topic log) — dùng chung cho hoàn thành tự nhiên VÀ thoát giữa chừng */
function _savePracticeResults() {
  const oldLevel = getXpLevelInfo(getHistory()).level;
  const timeTaken = Math.round((Date.now() - _quiz.startTime) / 1000);
  clearInterval(_quiz.activeDisplayInterval);
  const activeTimeSec = _quiz.activityTracker ? _quiz.activityTracker.stop() : null;
  const total    = _quiz.set.questions.length;
  const mastered = _quiz.pMastered.filter(Boolean).length;
  const skipped  = _quiz.pSkipped.filter(Boolean).length;
  // Build responseTimes per original question index (last attempt wins)
  const _rtByQIdx = {};
  _quiz.pQueue.forEach((qIdx, pos) => { if (_quiz.responseTimes[pos] != null) _rtByQIdx[qIdx] = _quiz.responseTimes[pos]; });
  const entry = {
    id: uid(),
    setId: _quiz.originalSetId,
    setName: _quiz.set.name,
    score: mastered,
    total,
    timeTaken,
    activeTimeSec,
    date: Date.now(),
    mode: 'practice',
    answers: _quiz.set.questions.map((q, i) => _quiz.pMastered[i] ? q.correct : null),
    responseTimes: _quiz.set.questions.map((_, i) => _rtByQIdx[i] ?? null)
  };
  addHistoryEntry(entry);
  const newXp = getXpLevelInfo(getHistory());
  if (newXp.level > oldLevel) showLevelUpCelebration(newXp);
  // Log skill + topic timeline
  const _today = new Date().toISOString().slice(0,10);
  const _sk = {}, _skW = {};
  _quiz.set.questions.forEach((q, i) => {
    if (_quiz.pSkipped[i]) return;
    const ok = _quiz.pMastered[i];
    (q.skillTags||[]).forEach(tag => {
      _sk[tag] = (_sk[tag]||0) + (ok?1:0);
      _skW[tag] = (_skW[tag]||0) + (ok?0:1);
    });
  });
  Object.keys(_sk).forEach(t => appendSkillLog(t, _today, _sk[t], _skW[t]));
  appendTopicLog(_quiz.set.name, _today, mastered, total - mastered - skipped);
  return { mastered, skipped, total, timeTaken, activeTimeSec };
}

function finishPractice() {
  _quizInProgress = false;
  const { mastered, skipped, total, timeTaken, activeTimeSec } = _savePracticeResults();
  // Hiện kết quả practice riêng
  renderPracticeResult(mastered, skipped, total, timeTaken, _quiz.set, activeTimeSec);
  showScreen('screen-result');
}

function renderPracticeResult(mastered, skipped, total, timeTaken, set, activeTimeSec) {
  const pct = Math.round(mastered / total * 100);
  const emoji = pct === 100 ? '🏆' : pct >= 70 ? '👍' : '💪';

  document.getElementById('result-emoji').textContent = emoji;
  document.getElementById('result-title').textContent =
    pct === 100 ? '🎉 Boss Defeated! Chapter Cleared!' : `Hoàn thành luyện tập!`;
  document.getElementById('result-subtitle').textContent =
    `${set.name} · ${fmtTime(timeTaken)}`;
  const elActive = document.getElementById('result-active-time');
  if (elActive) elActive.textContent = (activeTimeSec != null && activeTimeSec < timeTaken - 5)
    ? `⏱ Học thực: ${fmtTime(activeTimeSec)}` : '';

  document.getElementById('result-score-correct').textContent = mastered;
  document.getElementById('result-score-wrong').textContent = skipped;
  document.getElementById('result-score-pct').textContent = pct + '%';

  // Đổi label "Sai" thành "Bỏ qua" cho practice
  const labels = document.querySelectorAll('#screen-result .result-stat-label');
  if (labels[0]) labels[0].textContent = 'Đã thuộc';
  if (labels[1]) labels[1].textContent = 'Bỏ qua';
  if (labels[2]) labels[2].textContent = 'Điểm';

  const retryBtn = document.getElementById('result-retry-btn');
  retryBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 102.13-9.36L1 10"/></svg> ${skipped > 0 ? 'Luyện lại (gồm câu bỏ qua)' : 'Luyện tập lại'}`;
  retryBtn.onclick = () => startPractice(set.id);

  document.getElementById('result-home-btn').innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg> Về kho đề`;
  document.getElementById('result-home-btn').onclick = () => navTo('library');

  // Ẩn nút xem đáp án và populate review list với kết quả practice
  document.getElementById('result-detail-btn').style.display = 'none';
  const letters = ['A', 'B', 'C', 'D'];
  document.getElementById('review-list').innerHTML = set.questions.map((q, i) => {
    const isMastered = _quiz.pMastered[i];
    const isSkipped  = _quiz.pSkipped[i];
    const statusClass = isMastered ? 'correct' : isSkipped ? 'skipped' : 'wrong';
    const statusIcon  = isMastered ? '✅' : isSkipped ? '⚪' : '❌';
    const statusLabel = isMastered ? 'Đã thuộc' : isSkipped ? 'Bỏ qua' : 'Chưa thuộc';
    const expHTML = q.explanation ? `<div class="review-explanation">💡 ${esc(q.explanation)}</div>` : '';
    return `<div class="review-card ${statusClass}" data-result="${statusClass}">
      <div class="review-card-header">
        <span class="review-status-icon">${statusIcon}</span>
        <span class="review-q-num">Câu ${i + 1}</span>
        <span class="review-q-text">${esc(q.text)}</span>
      </div>
      <div class="review-card-body">
        ${q.options.map((opt, oi) => {
          const cls = oi === q.correct ? 'correct-ans' : '';
          return `<div class="review-option ${cls}">
            <span class="opt-letter">${letters[oi]}</span>
            <span style="flex:1">${esc(opt)}</span>
            ${oi === q.correct ? '<span class="review-tag correct-tag">✓ Đúng</span>' : ''}
          </div>`;
        }).join('')}
        ${expHTML}
        <div style="margin-top:8px;font-size:13px;color:var(--color-text-muted)">${statusLabel}</div>
      </div>
    </div>`;
  }).join('');
  // Cho phép xem đáp án practice
  document.getElementById('result-detail-btn').style.display = '';
  document.getElementById('result-detail-btn').textContent = '📋 Xem đáp án chi tiết';
}

function quizNext() {
  if (_quiz.currentIdx < _quiz.set.questions.length - 1) {
    _quiz.currentIdx++;
    renderCurrentQuestion();
    renderQuizNav();
  }
}
function quizPrev() {
  if (_quiz.currentIdx > 0) {
    _quiz.currentIdx--;
    renderCurrentQuestion();
    renderQuizNav();
  }
}
function toggleFlag(idx) {
  _quiz.flagged[idx] = !_quiz.flagged[idx];
  // Scoped theo question block — mode "all" hiện nhiều nút cờ cùng lúc, không thể querySelector chung
  const btn = document.querySelector(`#quiz-q-${idx} .quiz-flag-btn`);
  if (btn) {
    btn.classList.toggle('flagged', _quiz.flagged[idx]);
    btn.querySelector('svg').setAttribute('fill', _quiz.flagged[idx] ? 'currentColor' : 'none');
  }
  renderQuizMap();
}
function showQuizMap() {
  renderQuizMap();
  document.getElementById('modal-quiz-map').classList.add('active');
}
function hideQuizMap() {
  document.getElementById('modal-quiz-map').classList.remove('active');
}
function renderQuizMap() {
  const q = _quiz;
  const total = q.set.questions.length;
  const answered = q.answers.filter(a => a !== null).length;
  const flagged = q.flagged.filter(Boolean).length;
  const statsText = `${answered}/${total} đã làm${flagged ? ' · ' + flagged + ' đánh dấu' : ''}`;
  const classFor = i => {
    let cls = 'qmap-btn';
    if (i === q.currentIdx && q.mode !== 'all') cls += ' current';
    else if (q.flagged[i]) cls += ' flagged';
    else if (q.answers[i] !== null) cls += ' answered';
    return cls;
  };

  const statsEl = document.getElementById('qmap-stats');
  if (statsEl) statsEl.textContent = statsText;
  const statsSideEl = document.getElementById('qmap-stats-side');
  if (statsSideEl) statsSideEl.textContent = statsText;

  // Toggle class trên nút đã có sẵn thay vì ghi lại innerHTML cả grid mỗi lần điều hướng/đánh dấu —
  // chỉ rebuild khi số câu đổi (lần đầu hiện modal/sidebar)
  [document.getElementById('qmap-grid'), document.getElementById('qmap-grid-side')].forEach(gridEl => {
    if (!gridEl) return;
    if (gridEl.children.length !== total) {
      gridEl.innerHTML = q.set.questions.map((_, i) => `<button class="${classFor(i)}" onclick="jumpToQuestion(${i})">${i + 1}</button>`).join('');
    } else {
      for (let i = 0; i < total; i++) gridEl.children[i].className = classFor(i);
    }
  });
}
function jumpToQuestion(idx) {
  hideQuizMap();
  if (_quiz.mode === 'all') {
    const el = document.getElementById('quiz-q-' + idx);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    return;
  }
  _quiz.currentIdx = idx;
  renderCurrentQuestion();
  renderQuizNav();
}

function submitQuizConfirm() {
  const unanswered = _quiz.answers.filter(a => a === null).length;
  if (unanswered > 0) {
    confirm('Nộp bài', `Còn ${unanswered} câu chưa trả lời. Câu chưa trả lời tính là sai. Nộp bài?`, () => submitQuiz(false));
  } else {
    submitQuiz(false);
  }
}

function submitQuiz(autoSubmit) {
  if (!_quiz) return;
  const oldLevel = getXpLevelInfo(getHistory()).level;
  clearInterval(_quiz.timerInterval);
  _quiz.timerInterval = null;
  _quizInProgress = false;
  const timeTaken = Math.round((Date.now() - _quiz.startTime) / 1000);
  const activeTimeSec = _quiz.activityTracker ? _quiz.activityTracker.stop() : null;
  const q = _quiz;
  let score = 0;
  q.set.questions.forEach((question, i) => {
    const isCorrect = q.answers[i] === question.correct;
    if (isCorrect) score++;
    if (q.answers[i] !== null) {
      trackQuestionResult(question.id, isCorrect, q.answers[i], question.correct, q.responseTimes[i]);
    }
  });
  const answered = q.answers.filter(a => a !== null).length;
  const entry = {
    id: uid(),
    setId: q.originalSetId,
    setName: q.set.name,
    score,
    total: q.set.questions.length,
    timeTaken,
    activeTimeSec,
    date: Date.now(),
    mode: 'exam',
    answers: q.answers.slice(),
    responseTimes: q.responseTimes.slice()
  };
  addHistoryEntry(entry);
  const newXp = getXpLevelInfo(getHistory());
  if (newXp.level > oldLevel) showLevelUpCelebration(newXp);
  // Log skill + topic timeline
  const _today = new Date().toISOString().slice(0,10);
  const _sk = {}, _skW = {};
  q.set.questions.forEach((question, i) => {
    if (q.answers[i] === null) return;
    const ok = q.answers[i] === question.correct;
    (question.skillTags||[]).forEach(tag => {
      _sk[tag] = (_sk[tag]||0) + (ok?1:0);
      _skW[tag] = (_skW[tag]||0) + (ok?0:1);
    });
  });
  Object.keys(_sk).forEach(t => appendSkillLog(t, _today, _sk[t], _skW[t]));
  if (answered > 0) appendTopicLog(q.set.name, _today, score, answered - score);
  renderResult(entry, q.set, activeTimeSec);
  showScreen('screen-result');
}

function toggleQuizMode() {
  if (!_quiz) return;
  _quiz.mode = _quiz.mode === 'one-by-one' ? 'all' : 'one-by-one';
  const content = document.getElementById('quiz-questions-content');
  if (_quiz.mode === 'all') {
    content.innerHTML = _quiz.set.questions.map((q, i) => buildQuizQuestion(q, i)).join('<div class="quiz-separator"></div>');
  } else {
    renderCurrentQuestion();
  }
  renderQuizNav();
  toast(_quiz.mode === 'all' ? 'Hiển thị tất cả câu' : 'Hiển thị từng câu');
}

function exitQuiz() {
  const goBack = () => {
    clearInterval(_quiz && _quiz.timerInterval);
    clearInterval(_quiz && _quiz.activeDisplayInterval);
    if (_quiz && _quiz.activityTracker) _quiz.activityTracker.stop();
    _quizInProgress = false; _quiz = null; navTo('library');
  };
  if (!_quizInProgress) { goBack(); return; }

  const isPractice = !!(_quiz && _quiz.pQueue);
  if (isPractice) {
    // Luyện tập: thoát giữa chừng vẫn tự lưu tiến trình đã làm, không hỏi xác nhận
    const hasProgress = _quiz.responseTimes.some(rt => rt != null);
    if (hasProgress) {
      _savePracticeResults();
      toast('Đã lưu tiến trình luyện tập', 'success');
    }
    goBack();
    return;
  }

  confirm('Thoát bài thi', 'Bài thi chưa hoàn thành sẽ không được lưu. Thoát?', goBack);
}

/* ===== KEYBOARD SHORTCUTS ===== */
document.addEventListener('keydown', e => {
  if (!_quiz || !_quizInProgress) return;
  if (document.querySelector('.modal-overlay.active')) return;
  if (e.target.matches('input, textarea, select')) return;

  const isPractice = !!_quiz.pQueue;
  const pos = _quiz.currentIdx;
  const isLocked = isPractice ? _quiz.locked[pos] : false;

  const optMap = { '1': 0, 'a': 0, '2': 1, 'b': 1, '3': 2, 'c': 2, '4': 3, 'd': 3 };
  const key = e.key.toLowerCase();

  if (optMap[key] !== undefined && !isLocked) {
    selectAnswer(pos, optMap[key]);
    return;
  }

  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    if (isPractice) {
      if (isLocked) practiceAdvance();
    } else if (_quiz.mode === 'one-by-one') {
      const isLast = pos === _quiz.set.questions.length - 1;
      isLast ? submitQuizConfirm() : quizNext();
    }
    return;
  }

  if (!isPractice && _quiz.mode === 'one-by-one') {
    if (e.key === 'ArrowLeft') quizPrev();
    else if (e.key === 'ArrowRight') quizNext();
  }
});
