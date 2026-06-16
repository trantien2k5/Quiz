/* ===== QUIZ ===== */
let _quiz = null;
let _quizInProgress = false;

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
  document.getElementById('modal-quiz-settings').classList.add('active');
}

function closeQuizSettings() {
  document.getElementById('modal-quiz-settings').classList.remove('active');
}

function beginQuiz() {
  closeQuizSettings();
  const shuffleQ    = document.getElementById('qs-shuffle-q').checked;
  const shuffleOpts = document.getElementById('qs-shuffle-opts').checked;
  const numQRaw     = document.getElementById('qs-num-q').value.trim();
  const numQ        = numQRaw ? parseInt(numQRaw) : null;
  startQuiz(_pendingSetId, { shuffleQ, shuffleOpts, numQ });
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
    flagged: new Array(questions.length).fill(false),
    startTime: Date.now(),
    currentIdx: 0,
    timerInterval: null,
    timeLeft: set.timeLimit ? set.timeLimit * 60 : null,
    mode: 'one-by-one'
  };
  _quizInProgress = true;
  localStorage.setItem('quiz_last_set', _quiz.originalSetId);
  renderQuiz();
  showScreen('screen-quiz');
}

function startPractice(setId) {
  const set = getSet(setId);
  if (!set || !set.questions || !set.questions.length) {
    toast('Bộ đề không có câu hỏi', 'error'); return;
  }
  const questions = JSON.parse(JSON.stringify(set.questions)).map(q => shuffleOptions(q));
  const n = questions.length;

  // Ưu tiên câu sai nhiều nhất lên đầu; câu chưa có stats giữ thứ tự gốc
  const qStats = getQuestionStats();
  const pQueue = questions.map((_, i) => i).sort((a, b) => {
    const wa = (qStats[questions[a].id] || {}).wrong || 0;
    const wb = (qStats[questions[b].id] || {}).wrong || 0;
    if (wb !== wa) return wb - wa;
    return a - b;
  });
  _quiz = {
    set: { ...set, questions },
    originalSetId: setId,
    pQueue,
    pStreaks:    new Array(n).fill(0),   // streak đúng liên tiếp
    pMastered:  new Array(n).fill(false),
    pWrongCount: new Array(n).fill(0),  // tổng số lần sai trong phiên
    pSkipped:   new Array(n).fill(false),
    answers: new Array(n).fill(null),
    locked:  new Array(n).fill(false),
    flagged: new Array(n).fill(false),
    startTime: Date.now(),
    currentIdx: 0,
    timerInterval: null,
    timeLeft: null,
    mode: 'one-by-one'
  };
  _quizInProgress = true;
  localStorage.setItem('quiz_last_set', _quiz.originalSetId);
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
  } else {
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
      <div class="practice-feedback-badge">${selected === correct ? '✅ Chính xác!' : '❌ Sai rồi!'}</div>
      ${selected !== correct ? `<div class="practice-feedback-correct">Đáp án đúng: <strong>${esc(question.options[correct])}</strong></div>` : ''}
      ${question.explanation ? `<div class="practice-feedback-exp">${esc(question.explanation)}</div>` : ''}
      <div class="practice-inline-nav">
        <button class="btn btn-primary practice-next-btn" onclick="practiceAdvance()">Tiếp theo →</button>
        ${selected !== correct ? `<button class="btn btn-secondary practice-skip-btn" onclick="practiceSkip()">⏭ Bỏ qua</button>` : ''}
      </div>
    </div>` : '';

  const isMastered = isPractice && _quiz.pMastered[qIdx];
  const wrongCount = isPractice ? (_quiz.pWrongCount[qIdx] || 0) : 0;
  const streakDots = isPractice
    ? (isMastered
        ? `<span class="practice-badge mastered">✅ Đã thuộc</span>`
        : wrongCount > 0
          ? `<span class="practice-badge wrong-hint">Sai ${wrongCount}/3</span>`
          : '')
    : '';

  const numLabel = isPractice
    ? `Câu ${qIdx + 1}<span class="q-num-total"> / ${total}</span>` : `Câu ${i + 1}`;

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
      ${isLocked ? feedbackHtml : `<div class="options-list">${optHtml}</div>`}
    </div>`;
}

function renderCurrentQuestion() {
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
    const isWrong  = isLocked && q.answers[pos] !== null && q.answers[pos] !== q.set.questions[qIdx].correct;
    const wrongCount = q.pWrongCount[qIdx] || 0;
    const skipLabel  = `⏭ Bỏ qua${wrongCount >= 2 ? ' (đã sai ' + wrongCount + ' lần)' : ''}`;
    const statLabel  = `${mastered}/${total} đã thuộc${skipped ? ' · ' + skipped + ' bỏ qua' : ''}`;
    nav.innerHTML = `<div class="practice-nav">
      <div class="practice-mastery-label">${statLabel}</div>
      ${!isLocked ? `<div class="practice-hint-nav">Chọn đáp án để tiếp tục</div>` : ''}
    </div>`;
    return;
  }

  const total = q.set.questions.length;
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
  _quiz.answers[qIdx] = optIdx;
  if (_quiz.pQueue) { // practice mode
    _quiz.locked[qIdx] = true;
    renderCurrentQuestion();
    renderQuizNav();
    return;
  }
  // exam mode: cập nhật UI inline
  const block = document.getElementById('quiz-q-' + qIdx);
  if (!block) return;
  block.querySelectorAll('.option-btn').forEach((btn, i) => {
    btn.classList.toggle('selected', i === optIdx);
    const letter = btn.querySelector('.opt-letter');
    if (i === optIdx) {
      letter.style.background = 'var(--purple)';
      letter.style.borderColor = 'var(--purple)';
      letter.style.color = '#fff';
    } else {
      letter.style.background = '';
      letter.style.borderColor = '';
      letter.style.color = '';
    }
  });
  updateQuizCounterDisplay();
  renderQuizNav();
}

const PRACTICE_MAX_WRONG = 3; // sai 3 lần → tự động bỏ qua

function _practiceIsDone() {
  return _quiz.pMastered.every((m, i) => m || _quiz.pSkipped[i]);
}

function practiceAdvance() {
  const pos  = _quiz.currentIdx;
  const qIdx = _quiz.pQueue[pos];
  const q    = _quiz.set.questions[qIdx];
  const isCorrect = _quiz.answers[pos] === q.correct;

  trackQuestionResult(q.id, isCorrect, _quiz.answers[pos], q.correct);

  if (isCorrect) {
    _quiz.pStreaks[qIdx]++;
    if (_quiz.pStreaks[qIdx] >= 1) _quiz.pMastered[qIdx] = true; // đúng 1 lần = thuộc
  } else {
    _quiz.pStreaks[qIdx] = 0;
    _quiz.pWrongCount[qIdx]++;
    if (_quiz.pWrongCount[qIdx] >= PRACTICE_MAX_WRONG) {
      // Sai quá nhiều → bỏ qua, không lặp lại
      _quiz.pSkipped[qIdx] = true;
    } else {
      // Chèn lại vào hàng đợi, cách 2-4 vị trí
      const insertAt = Math.min(pos + 2 + Math.floor(Math.random() * 3), _quiz.pQueue.length);
      _quiz.pQueue.splice(insertAt, 0, qIdx);
      _quiz.answers.splice(insertAt, 0, null);
      _quiz.locked.splice(insertAt, 0, false);
    }
  }

  _quiz.currentIdx++;
  if (_practiceIsDone()) { finishPractice(); return; }

  // Nếu queue cạn nhưng vẫn còn câu chưa xong (không nên xảy ra nhưng để an toàn)
  if (_quiz.currentIdx >= _quiz.pQueue.length) { finishPractice(); return; }

  renderCurrentQuestion();
  renderQuizNav();
}

function practiceSkip() {
  const pos  = _quiz.currentIdx;
  const qIdx = _quiz.pQueue[pos];
  _quiz.pSkipped[qIdx] = true;
  _quiz.pStreaks[qIdx] = 0;
  _quiz.currentIdx++;
  if (_practiceIsDone() || _quiz.currentIdx >= _quiz.pQueue.length) { finishPractice(); return; }
  renderCurrentQuestion();
  renderQuizNav();
}

function finishPractice() {
  _quizInProgress = false;
  const timeTaken = Math.round((Date.now() - _quiz.startTime) / 1000);
  const total    = _quiz.set.questions.length;
  const mastered = _quiz.pMastered.filter(Boolean).length;
  const skipped  = _quiz.pSkipped.filter(Boolean).length;
  const entry = {
    id: uid(),
    setId: _quiz.originalSetId,
    setName: _quiz.set.name,
    score: mastered,
    total,
    timeTaken,
    date: Date.now(),
    mode: 'practice',
    answers: _quiz.set.questions.map((q, i) => _quiz.pMastered[i] ? q.correct : null)
  };
  addHistoryEntry(entry);
  // Hiện kết quả practice riêng
  renderPracticeResult(mastered, skipped, total, timeTaken, _quiz.set);
  showScreen('screen-result');
}

function renderPracticeResult(mastered, skipped, total, timeTaken, set) {
  const pct = Math.round(mastered / total * 100);
  const emoji = pct === 100 ? '🎉' : pct >= 70 ? '👍' : '💪';

  document.getElementById('result-emoji').textContent = emoji;
  document.getElementById('result-title').textContent =
    pct === 100 ? 'Xuất sắc! Thuộc hết rồi!' : `Hoàn thành luyện tập!`;
  document.getElementById('result-subtitle').textContent =
    `${set.name} · ${fmtTime(timeTaken)}`;

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
        <div style="margin-top:8px;font-size:13px;color:var(--text-muted)">${statusLabel}</div>
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
  const btn = document.querySelector('.quiz-flag-btn');
  if (btn) {
    btn.classList.toggle('flagged', _quiz.flagged[idx]);
    btn.querySelector('svg').setAttribute('fill', _quiz.flagged[idx] ? 'currentColor' : 'none');
  }
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
  document.getElementById('qmap-stats').textContent = `${answered}/${total} đã làm${flagged ? ' · ' + flagged + ' đánh dấu' : ''}`;
  document.getElementById('qmap-grid').innerHTML = q.set.questions.map((_, i) => {
    let cls = 'qmap-btn';
    if (i === q.currentIdx) cls += ' current';
    else if (q.flagged[i]) cls += ' flagged';
    else if (q.answers[i] !== null) cls += ' answered';
    return `<button class="${cls}" onclick="jumpToQuestion(${i})">${i + 1}</button>`;
  }).join('');
}
function jumpToQuestion(idx) {
  hideQuizMap();
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
  clearInterval(_quiz.timerInterval);
  _quiz.timerInterval = null;
  _quizInProgress = false;
  const timeTaken = Math.round((Date.now() - _quiz.startTime) / 1000);
  const q = _quiz;
  let score = 0;
  q.set.questions.forEach((question, i) => {
    const isCorrect = q.answers[i] === question.correct;
    if (isCorrect) score++;
    if (q.answers[i] !== null) {
      trackQuestionResult(question.id, isCorrect, q.answers[i], question.correct);
    }
  });
  const entry = {
    id: uid(),
    setId: q.originalSetId,
    setName: q.set.name,
    score,
    total: q.set.questions.length,
    timeTaken,
    date: Date.now(),
    mode: 'exam',
    answers: q.answers.slice()
  };
  addHistoryEntry(entry);
  renderResult(entry, q.set);
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
  const goBack = () => { clearInterval(_quiz && _quiz.timerInterval); _quizInProgress = false; _quiz = null; navTo('library'); };
  if (_quizInProgress) {
    confirm('Thoát bài thi', 'Bài thi chưa hoàn thành sẽ không được lưu. Thoát?', goBack);
  } else {
    goBack();
  }
}
