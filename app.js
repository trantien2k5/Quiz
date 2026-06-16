const APP_V = 46;

/* ===== AUTO UPDATE CHECK ===== */
let _updateDetected = false;

function startUpdateCheck() {
  setInterval(async () => {
    if (_updateDetected) return; // đã phát hiện rồi, không check nữa
    try {
      const res = await fetch('version.json?t=' + Date.now());
      const { v } = await res.json();
      if (v > APP_V) showUpdateBanner();
    } catch (_) {}
  }, 60000);
}

function showUpdateBanner() {
  if (_updateDetected) return;
  _updateDetected = true;
  if (!_quizInProgress) {
    // Tự reload khi không đang làm bài
    toast('🆕 Cập nhật mới — đang tải lại...', '');
    setTimeout(reloadApp, 2000);
  } else {
    // Đang làm bài → hiện banner để user tự quyết
    const el = document.getElementById('update-banner');
    if (el) el.classList.add('show');
  }
}

function reloadApp() {
  // Bypass HTML cache bằng cách thêm timestamp vào URL
  const url = location.pathname + '?_=' + Date.now();
  location.replace(url);
}

/* ===== UTILS ===== */
function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function fmtTime(seconds) {
  if (seconds < 60) return seconds + 's';
  const m = Math.floor(seconds / 60), s = seconds % 60;
  return m + ':' + String(s).padStart(2, '0');
}

function fmtDate(ts) {
  const d = new Date(ts);
  return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }) +
    ' ' + d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
}

function scorePct(score, total) {
  if (!total) return 0;
  return Math.round(score / total * 100);
}

function scoreClass(pct) {
  if (pct >= 70) return 'good';
  if (pct >= 40) return 'mid';
  return 'bad';
}

function resultEmoji(pct) {
  if (pct === 100) return '🏆';
  if (pct >= 80) return '🎉';
  if (pct >= 60) return '😊';
  if (pct >= 40) return '🤔';
  return '💪';
}

function esc(s) {
  if (!s) return '';
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

// Trộn mảng (Fisher-Yates), trả về mảng mới
function shuffleArray(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Đảo đáp án của 1 câu hỏi, cập nhật lại chỉ số correct
function shuffleOptions(q) {
  const order = shuffleArray([0, 1, 2, 3]);
  return {
    ...q,
    options: order.map(i => q.options[i]),
    correct: order.indexOf(q.correct)
  };
}

/* ===== STORAGE ===== */
function getQuestionStats() {
  try { return JSON.parse(localStorage.getItem('quiz_q_stats') || '{}'); } catch { return {}; }
}
function saveQuestionStats(stats) { localStorage.setItem('quiz_q_stats', JSON.stringify(stats)); }
function trackQuestionResult(questionId, isCorrect, selectedIdx, correctIdx) {
  const stats = getQuestionStats();
  if (!stats[questionId]) stats[questionId] = { firstSeen: new Date().toISOString().slice(0, 10), reviewCount: 0, correct: 0, wrong: 0, optionPattern: {} };
  stats[questionId].reviewCount++;
  if (isCorrect) stats[questionId].correct++;
  else {
    stats[questionId].wrong++;
    const key = `${selectedIdx}->${correctIdx}`;
    stats[questionId].optionPattern[key] = (stats[questionId].optionPattern[key] || 0) + 1;
  }
  saveQuestionStats(stats);
}

function getSets() {
  try { return JSON.parse(localStorage.getItem('quiz_sets') || '[]'); } catch { return []; }
}
function saveSets(sets) {
  localStorage.setItem('quiz_sets', JSON.stringify(sets));
}
function getHistory() {
  try { return JSON.parse(localStorage.getItem('quiz_history') || '[]'); } catch { return []; }
}
function saveHistory(history) {
  localStorage.setItem('quiz_history', JSON.stringify(history));
}
function getSet(id) {
  return getSets().find(s => s.id === id) || null;
}
function saveSet(set) {
  const sets = getSets();
  const idx = sets.findIndex(s => s.id === set.id);
  if (idx >= 0) sets[idx] = set; else sets.unshift(set);
  saveSets(sets);
}
function deleteSet(id) {
  saveSets(getSets().filter(s => s.id !== id));
  saveHistory(getHistory().filter(h => h.setId !== id));
}
function addHistoryEntry(entry) {
  const history = getHistory();
  history.unshift(entry);
  if (history.length > 500) history.splice(500);
  saveHistory(history);
}
function getBestScore(setId) {
  const entries = getHistory().filter(h => h.setId === setId);
  if (!entries.length) return null;
  return entries.reduce((best, h) => {
    const pct = scorePct(h.score, h.total);
    return pct > best ? pct : best;
  }, 0);
}

/* ===== NAVIGATION ===== */
const screens = ['screen-home', 'screen-library', 'screen-editor', 'screen-quiz', 'screen-result', 'screen-history'];
let _quizInProgress = false;

function showScreen(id) {
  screens.forEach(s => {
    const el = document.getElementById(s);
    if (el) el.classList.remove('active');
  });
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.add('active');

  const noNav = ['screen-quiz', 'screen-editor', 'screen-result'];
  const nav = document.getElementById('bottom-nav');
  nav.style.display = noNav.includes(id) ? 'none' : 'flex';
}

/* ===== TOAST ===== */
function toast(msg, type) {
  const container = document.getElementById('toast-container');
  const t = document.createElement('div');
  t.className = 'toast' + (type === 'success' ? ' toast-success' : type === 'error' ? ' toast-error' : '');
  t.textContent = msg;
  container.appendChild(t);
  setTimeout(() => {
    t.style.animation = 'toastOut 0.3s ease forwards';
    setTimeout(() => t.remove(), 300);
  }, 2800);
}

/* ===== CONFIRM MODAL ===== */
function confirm(title, msg, onOk) {
  document.getElementById('confirm-title').textContent = title;
  document.getElementById('confirm-msg').textContent = msg;
  document.getElementById('confirm-overlay').classList.add('active');
  document.getElementById('confirm-ok').onclick = () => {
    document.getElementById('confirm-overlay').classList.remove('active');
    onOk();
  };
  document.getElementById('confirm-cancel').onclick = () => {
    document.getElementById('confirm-overlay').classList.remove('active');
  };
}

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

/* ===== LIBRARY SCREEN ===== */
function buildSetCard(set) {
  const qCount = set.questions ? set.questions.length : 0;
  const best = getBestScore(set.id);
  const bestBadge = best !== null ? `<span class="badge badge-green">🏆 ${best}%</span>` : `<span class="badge badge-gray">Chưa làm</span>`;
  const timeBadge = set.timeLimit ? `<span class="badge badge-orange">⏱ ${set.timeLimit} phút</span>` : '';
  return `<div class="set-card">
    <div class="set-card-top">
      <div class="set-card-icon">📝</div>
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
      <button class="btn btn-danger btn-sm" onclick="confirmDeleteSet('${set.id}', '${esc(set.name)}')">🗑</button>
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

/* ===== EDITOR ===== */
let _editingSetId = null;
let _editingQuestions = [];

function openEditor(setId) {
  _editingSetId = setId;
  const set = setId ? getSet(setId) : null;
  _editingQuestions = set ? JSON.parse(JSON.stringify(set.questions || [])) : [];
  document.getElementById('editor-title').textContent = setId ? 'Sửa bộ đề' : 'Tạo bộ đề mới';
  document.getElementById('set-name').value = set ? set.name : '';
  document.getElementById('set-desc').value = set ? (set.description || '') : '';
  document.getElementById('set-timelimit').value = set ? (set.timeLimit || '') : '';
  renderEditorQuestions();
  document.getElementById('q-count-label').textContent = _editingQuestions.length;
  showScreen('screen-editor');
}

function renderEditorQuestions() {
  const container = document.getElementById('question-list');
  if (!_editingQuestions.length) {
    container.innerHTML = `<div class="empty-state" style="padding:32px 16px">
      <div class="empty-icon" style="font-size:40px">❓</div>
      <p>Chưa có câu hỏi nào. Nhấn "Thêm câu hỏi" bên dưới.</p>
    </div>`;
    return;
  }
  container.innerHTML = _editingQuestions.map((q, i) => buildQuestionCard(q, i)).join('');
}

function buildQuestionCard(q, i) {
  const letters = ['A', 'B', 'C', 'D'];
  const options = q.options || ['', '', '', ''];
  const correct = q.correct !== undefined ? q.correct : 0;
  return `
    <div class="question-card" id="qcard-${q.id}">
      <div class="question-card-header">
        <div class="q-num">${i + 1}</div>
        <div class="q-text">${esc(q.text) || '<em style="color:var(--text-light)">Câu hỏi chưa nhập</em>'}</div>
        <button class="btn-icon" onclick="removeQuestion('${q.id}')" title="Xóa câu hỏi">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
        </button>
      </div>
      <div class="question-card-body">
        <div class="form-group">
          <label>Câu hỏi</label>
          <textarea class="form-control" rows="2" placeholder="Nhập nội dung câu hỏi..."
            oninput="updateQuestion('${q.id}', 'text', this.value)">${esc(q.text || '')}</textarea>
        </div>
        <div class="section-label" style="padding:0;margin-bottom:8px">Đáp án <span style="font-weight:400;text-transform:none;letter-spacing:0;font-size:12px">(☑ chọn đáp án đúng)</span></div>
        ${letters.map((letter, li) => `
          <div class="option-row">
            <div class="option-letter">${letter}</div>
            <input type="text" class="form-control" placeholder="Đáp án ${letter}..."
              value="${esc(options[li] || '')}"
              oninput="updateOption('${q.id}', ${li}, this.value)">
            <input type="radio" class="radio-correct" name="correct-${q.id}" value="${li}"
              ${correct === li ? 'checked' : ''}
              onchange="updateQuestion('${q.id}', 'correct', ${li})"
              title="Đáp án đúng">
          </div>`).join('')}
        <div class="form-group" style="margin-top:12px;margin-bottom:0">
          <label>Giải thích đáp án <span>(tuỳ chọn)</span></label>
          <textarea class="form-control" rows="2" placeholder="Giải thích tại sao đáp án đúng, ghi chú thêm..."
            oninput="updateQuestion('${q.id}', 'explanation', this.value)">${esc(q.explanation || '')}</textarea>
        </div>
      </div>
    </div>`;
}

function addQuestion() {
  _editingQuestions.push({ id: uid(), text: '', options: ['', '', '', ''], correct: 0, explanation: '' });
  renderEditorQuestions();
  document.getElementById('q-count-label').textContent = _editingQuestions.length;
  setTimeout(() => {
    const cards = document.querySelectorAll('.question-card');
    if (cards.length) cards[cards.length - 1].scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 100);
}

function removeQuestion(qid) {
  confirm('Xóa câu hỏi', 'Bạn có chắc muốn xóa câu hỏi này?', () => {
    _editingQuestions = _editingQuestions.filter(q => q.id !== qid);
    renderEditorQuestions();
    document.getElementById('q-count-label').textContent = _editingQuestions.length;
  });
}

function updateQuestion(qid, field, value) {
  const q = _editingQuestions.find(q => q.id === qid);
  if (!q) return;
  if (field === 'correct') q.correct = parseInt(value);
  else q[field] = value;
  if (field === 'text') {
    const el = document.querySelector(`#qcard-${qid} .question-card-header .q-text`);
    if (el) el.innerHTML = esc(value) || '<em style="color:var(--text-light)">Câu hỏi chưa nhập</em>';
  }
}

function updateOption(qid, idx, value) {
  const q = _editingQuestions.find(q => q.id === qid);
  if (!q) return;
  if (!q.options) q.options = ['', '', '', ''];
  q.options[idx] = value;
}

function saveEditor() {
  const name = document.getElementById('set-name').value.trim();
  if (!name) { toast('Vui lòng nhập tên bộ đề', 'error'); return; }
  for (let i = 0; i < _editingQuestions.length; i++) {
    const q = _editingQuestions[i];
    if (!q.text.trim()) { toast(`Câu ${i + 1}: Chưa nhập nội dung câu hỏi`, 'error'); return; }
    for (let j = 0; j < 4; j++) {
      if (!q.options[j] || !q.options[j].trim()) {
        toast(`Câu ${i + 1}: Chưa nhập đáp án ${['A','B','C','D'][j]}`, 'error'); return;
      }
    }
  }
  const timeLimitRaw = document.getElementById('set-timelimit').value.trim();
  const timeLimit = timeLimitRaw ? parseInt(timeLimitRaw) : null;
  if (timeLimitRaw && (isNaN(timeLimit) || timeLimit < 1)) {
    toast('Thời gian giới hạn không hợp lệ', 'error'); return;
  }
  const set = {
    id: _editingSetId || uid(),
    name,
    description: document.getElementById('set-desc').value.trim(),
    timeLimit: timeLimit || null,
    createdAt: _editingSetId ? ((getSet(_editingSetId) || {}).createdAt || Date.now()) : Date.now(),
    questions: _editingQuestions.map(q => ({
      id: q.id,
      text: q.text.trim(),
      options: q.options.map(o => o.trim()),
      correct: q.correct,
      explanation: (q.explanation || '').trim()
    }))
  };
  saveSet(set);
  toast('Đã lưu bộ đề', 'success');
  navTo('library');
}

function cancelEditor() {
  const dirty = _editingQuestions.length > 0 || document.getElementById('set-name').value.trim();
  if (dirty) {
    confirm('Thoát bộ đề', 'Các thay đổi chưa lưu sẽ bị mất. Tiếp tục?', () => navTo('library'));
  } else {
    navTo('library');
  }
}

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

/* ===== QUIZ ===== */
let _quiz = null;

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
  _quiz = {
    set: { ...set, questions },
    originalSetId: setId,
    pQueue:      questions.map((_, i) => i),
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
      <div class="options-list">${optHtml}</div>
      ${feedbackHtml}
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
      ${isLocked
        ? `<div class="practice-btn-row">
            <button class="btn btn-primary practice-next-btn" onclick="practiceAdvance()">Tiếp theo →</button>
            ${isWrong ? `<button class="btn btn-secondary practice-skip-btn" onclick="practiceSkip()">⏭ Bỏ qua</button>` : ''}
           </div>`
        : `<div class="practice-hint-nav">Chọn đáp án để tiếp tục</div>`}
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

/* ===== RESULTS ===== */
let _resultEntry = null, _resultSet = null;

function renderResult(entry, set) {
  _resultEntry = entry;
  _resultSet = set;
  const pct = scorePct(entry.score, entry.total);

  // Reset labels/buttons có thể bị renderPracticeResult đổi
  const labels = document.querySelectorAll('#screen-result .result-stat-label');
  if (labels[0]) labels[0].textContent = 'Đúng';
  if (labels[1]) labels[1].textContent = 'Sai';
  if (labels[2]) labels[2].textContent = 'Điểm';
  document.getElementById('result-retry-btn').innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 102.13-9.36L1 10"/></svg> Làm lại đề`;
  document.getElementById('result-home-btn').innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg> Về trang chủ`;
  document.getElementById('result-detail-btn').style.display = '';
  document.getElementById('result-detail-btn').innerHTML = '📋 Xem đáp án chi tiết';

  // Populate summary
  document.getElementById('result-emoji').textContent = resultEmoji(pct);
  document.getElementById('result-title').textContent =
    pct === 100 ? 'Xuất sắc! Hoàn hảo!' :
    pct >= 80 ? 'Làm tốt lắm!' :
    pct >= 60 ? 'Khá tốt!' :
    pct >= 40 ? 'Cần cố gắng thêm' : 'Hãy thử lại nhé!';
  document.getElementById('result-subtitle').textContent = `${entry.setName} · ${fmtDate(entry.date)}`;
  document.getElementById('result-score-correct').textContent = entry.score;
  document.getElementById('result-score-wrong').textContent = entry.total - entry.score;
  document.getElementById('result-score-pct').textContent = pct + '%';
  document.getElementById('result-retry-btn').onclick = () => showQuizSettings(entry.setId);
  document.getElementById('result-home-btn').onclick = () => navTo('home');

  // Populate review list
  const letters = ['A', 'B', 'C', 'D'];
  document.getElementById('review-list').innerHTML = set.questions.map((q, i) => {
    const userAns = entry.answers[i];
    const isCorrect = userAns === q.correct;
    const isSkipped = userAns === null;
    const statusClass = isSkipped ? 'skipped' : isCorrect ? 'correct' : 'wrong';
    const statusIcon = isSkipped ? '⚪' : isCorrect ? '✅' : '❌';
    const expHTML = q.explanation ? `<div class="review-explanation">💡 ${esc(q.explanation)}</div>` : '';
    return `<div class="review-card ${statusClass}" data-result="${statusClass}">
      <div class="review-card-header">
        <span class="review-status-icon">${statusIcon}</span>
        <span class="review-q-num">Câu ${i + 1}</span>
        <span class="review-q-text">${esc(q.text)}</span>
      </div>
      <div class="review-card-body">
        ${q.options.map((opt, oi) => {
          let cls = oi === q.correct ? 'correct-ans' : (oi === userAns && !isCorrect ? 'wrong-ans' : '');
          return `<div class="review-option ${cls}">
            <span class="opt-letter">${letters[oi]}</span>
            <span style="flex:1">${esc(opt)}</span>
            ${oi === q.correct ? '<span class="review-tag correct-tag">✓ Đúng</span>' : ''}
            ${oi === userAns && !isCorrect ? '<span class="review-tag wrong-tag">✗ Bạn chọn</span>' : ''}
          </div>`;
        }).join('')}
        ${expHTML}
      </div>
    </div>`;
  }).join('');

  // Setup retry buttons in detail view
  document.getElementById('result-retry-btn2').onclick = () => showQuizSettings(entry.setId);

  const wrongCount = entry.answers.filter((a, i) => a !== set.questions[i].correct).length;
  const retryWrongBtn = document.getElementById('result-retry-wrong-btn');
  retryWrongBtn.textContent = `Làm lại ${wrongCount} câu sai`;
  retryWrongBtn.disabled = wrongCount === 0;

  showResultSummary();
}

function showResultSummary() {
  document.getElementById('result-summary-view').style.display = 'flex';
  document.getElementById('result-summary-view').style.flexDirection = 'column';
  document.getElementById('result-detail-view').style.display = 'none';
}

function showResultDetail() {
  document.getElementById('result-summary-view').style.display = 'none';
  document.getElementById('result-detail-view').style.display = 'flex';
  filterReview('all');
}

function filterReview(type) {
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.filter === type);
  });
  document.querySelectorAll('.review-card').forEach(card => {
    const r = card.dataset.result;
    card.style.display = (type === 'all' || r === type) ? 'block' : 'none';
  });
}

function retryWrongQuestions() {
  if (!_resultEntry || !_resultSet) return;
  const wrongQs = _resultSet.questions.filter((q, i) => _resultEntry.answers[i] !== q.correct);
  if (!wrongQs.length) { toast('Không có câu sai!', 'success'); return; }
  startQuiz({
    id: _resultSet.id,
    name: `[Câu sai] ${_resultSet.name}`,
    questions: wrongQs
  }, { shuffleQ: true, shuffleOpts: true, numQ: null });
}

/* ===== HISTORY ===== */

function fmtStudyTime(seconds) {
  if (!seconds) return '0 phút';
  const m = Math.round(seconds / 60);
  if (m < 60) return m + ' phút';
  return Math.floor(m / 60) + 'h ' + (m % 60) + 'p';
}

function fmtDateShort(ts) {
  const d = new Date(ts);
  const today = new Date();
  if (d.toDateString() === today.toDateString()) return 'Hôm nay';
  if (d.toDateString() === new Date(Date.now() - 86400000).toDateString()) return 'Hôm qua';
  return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
}

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

  const tm = {};
  history.forEach(h => {
    if (!tm[h.setName]) tm[h.setName] = { c: 0, t: 0 };
    tm[h.setName].c += h.score; tm[h.setName].t += h.total;
  });
  const topics = Object.entries(tm).filter(([, v]) => v.t >= 5)
    .map(([n, v]) => ({ n, acc: Math.round(v.c / v.t * 100) }));
  if (topics.length) {
    const best  = [...topics].sort((a, b) => b.acc - a.acc)[0];
    const worst = [...topics].sort((a, b) => a.acc - b.acc)[0];
    if (best.acc >= 80) out.push({ icon: '💪', text: `Đề mạnh nhất: "${best.n}" (${best.acc}%)` });
    if (worst.acc < 60 && worst.n !== best.n) out.push({ icon: '⚠️', text: `Cần cải thiện: "${worst.n}" (${worst.acc}%)` });
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

function renderSetBreakdownHtml(history) {
  const sm = {};
  [...history].reverse().forEach(h => {
    if (!sm[h.setId]) sm[h.setId] = { name: h.setName, scores: [] };
    sm[h.setId].scores.push(scorePct(h.score, h.total));
  });
  const rows = Object.values(sm).map(({ name, scores }) => {
    const avg  = Math.round(scores.reduce((s, v) => s + v, 0) / scores.length);
    const best = Math.max(...scores);
    const diff = scores.length >= 3 ? scores[scores.length - 1] - scores[0] : null;
    const tEl  = diff === null ? '—'
      : diff > 0  ? `<span class="hst-trend-up">▲ +${diff}%</span>`
      : diff < 0  ? `<span class="hst-trend-down">▼ ${diff}%</span>`
      : '<span style="color:var(--text-muted)">→</span>';
    const c = avg >= 80 ? 'var(--green)' : avg >= 60 ? 'var(--orange)' : 'var(--red)';
    return { name, avg, best, n: scores.length, tEl, c };
  }).sort((a, b) => b.n - a.n).slice(0, 10);

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
    ${setBreakdown ? `<div class="hst-chart-card" style="margin-bottom:80px">
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

  const topicMap = {};
  history.forEach(h => {
    if (!topicMap[h.setName]) topicMap[h.setName] = { wrong: 0, total: 0 };
    topicMap[h.setName].wrong += h.total - h.score;
    topicMap[h.setName].total += h.total;
  });
  const weakTopics = Object.entries(topicMap)
    .map(([n, s]) => ({ n, wrong: s.wrong, total: s.total, rate: s.wrong / (s.total || 1) }))
    .filter(t => t.wrong > 0)
    .sort((a, b) => b.rate - a.rate)
    .slice(0, 5);

  const wrongHtml = recentWrongs.length
    ? recentWrongs.map(({ q, setName }) => `
        <div class="hst-mistake-card">
          <div class="hst-mistake-badge">Sai</div>
          <div class="hst-mistake-content">
            <div class="hst-mistake-set">${esc(setName)}</div>
            <div class="hst-mistake-q">${esc(q.text)}</div>
            <div class="hst-mistake-correct">✅ ${esc(q.options[q.correct])}</div>
          </div>
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
          <div class="hst-mistake-badge hst-hotspot-badge">Sai ${count}×</div>
          <div class="hst-mistake-content">
            <div class="hst-mistake-set">${esc(setName)}</div>
            <div class="hst-mistake-q">${esc(q.text)}</div>
            <div class="hst-mistake-correct">✅ ${esc(q.options[q.correct])}</div>
          </div>
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

  el.innerHTML = `
    ${hotspotsHtml ? `<div class="hst-section-header"><div class="section-label">🔥 Câu hay sai nhất</div></div>${hotspotsHtml}` : ''}
    <div class="hst-section-header" style="margin-top:4px"><div class="section-label">Câu sai gần đây</div></div>
    ${wrongHtml}
    ${topicsHtml ? `<div class="hst-section-header" style="margin-top:4px"><div class="section-label">Đề yếu nhất</div></div><div class="hst-weak-topics-list">${topicsHtml}</div>` : ''}
    ${skillsHtml}
    <div style="padding:16px 16px 80px">
      <button class="btn btn-danger btn-full" onclick="retryAllWrongQuestions()">🔁 Làm lại câu sai gần đây</button>
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
  startQuiz({ id: 'retry-wrong', name: 'Luyện lại câu sai', questions, timeLimit: null },
    { shuffleQ: true, shuffleOpts: true, numQ: null });
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

/* ===== IMPORT / EXPORT ===== */

function getISOWeek(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - (d.getDay() + 6) % 7);
  const w1 = new Date(d.getFullYear(), 0, 4);
  const wn = 1 + Math.round(((d - w1) / 86400000 - 3 + (w1.getDay() + 6) % 7) / 7);
  return `${d.getFullYear()}-W${String(wn).padStart(2, '0')}`;
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
  const blob = new Blob([txt], { type: 'text/plain;charset=utf-8' });
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

const AI_DEFAULTS = ['Từ loại TOEIC','Giới từ TOEIC','Từ vựng TOEIC','Tiếng Anh lớp 10','Toán THPT','Lịch sử Việt Nam','Java OOP cơ bản','Python cơ bản'];

function renderAiChips() {
  document.getElementById('ai-suggestions').innerHTML = AI_DEFAULTS.map(t =>
    `<button class="ai-chip" onclick="setAiTopic('${t.replace(/'/g,"&#39;")}')">
      ${esc(t)}
    </button>`
  ).join('');
}

let _appendToSetId = null;

function showAICreate(appendSetId) {
  _appendToSetId = appendSetId || null;
  const topicEl = document.getElementById('ai-topic');
  const titleEl = document.getElementById('ai-modal-title');
  const suggestionsEl = document.getElementById('ai-suggestions');
  if (_appendToSetId) {
    const set = getSet(_appendToSetId);
    titleEl.textContent = set ? `✨ Thêm câu vào "${set.name}"` : '✨ Tạo đề AI';
    // Tự điền topic từ tên set, ẩn chip gợi ý
    topicEl.value = set ? set.name : '';
    suggestionsEl.innerHTML = '';
  } else {
    titleEl.textContent = '✨ Tạo đề AI';
    topicEl.value = '';
    renderAiChips();
  }
  document.getElementById('modal-ai-create').classList.add('active');
}
function hideAICreate() {
  _appendToSetId = null;
  document.getElementById('modal-ai-create').classList.remove('active');
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

/* ===== AI CREATE ===== */
function setAiTopic(text) {
  const el = document.getElementById('ai-topic');
  el.value = text;
  el.focus();
}

function buildPromptText({ topic, level, count }) {
  const levelLine = level ? `\nCấp độ: ${level}` : '';
  return `Tạo ${count} câu hỏi trắc nghiệm chất lượng cao về: "${topic}"${levelLine}

CHỈ trả về JSON thuần, không markdown, không giải thích thêm:

{
  "name": "Tên bộ đề ngắn gọn, chuyên nghiệp (≤ 50 ký tự, không đề số câu)",
  "questions": [
    {
      "text": "Câu hỏi rõ ràng, hỏi đúng 1 khái niệm?",
      "options": ["Đáp án A", "Đáp án B", "Đáp án C", "Đáp án D"],
      "correct": 0,
      "explanation": "Đáp án A đúng vì [lý do cụ thể]. B sai vì [lý do]. C sai vì [lý do]. D sai vì [lý do].",
      "skillTags": ["word_form", "adverb"]
    }
  ]
}

== YÊU CẦU CHẤT LƯỢNG ==

TÊN BỘ ĐỀ (name):
- Ngắn gọn, chuyên nghiệp, ≤ 50 ký tự
- Mô tả đúng nội dung: ví dụ "Từ loại TOEIC cơ bản", "Giới từ thời gian tiếng Anh", "Toán THPT — Đạo hàm"
- KHÔNG ghi số câu, không ghi độ khó, không thêm emoji hay ký tự đặc biệt

CÂU HỎI:
- Hỏi đúng 1 khái niệm cụ thể, không mơ hồ, không có 2 cách hiểu
- Đa dạng loại: định nghĩa, ứng dụng thực tế, so sánh, phân tích, tìm lỗi sai
- Phân bố độ khó: ~30% dễ, ~50% trung bình, ~20% khó
- Không trùng nội dung giữa các câu

ĐÁP ÁN:
- Luôn đúng 4 phần tử trong "options", "correct" là index 0/1/2/3
- Đáp án đúng phải hoàn toàn chính xác, không có ngoại lệ
- Đáp án sai phải hợp lý — người chưa học dễ nhầm, nhưng người học kỹ sẽ phân biệt được
- Tránh đáp án sai quá hiển nhiên hoặc vô nghĩa
- Phân bố vị trí đáp án đúng đều ở A/B/C/D, không dồn vào 1 vị trí

CHỐNG PATTERN (CỰC KỲ QUAN TRỌNG):
- KHÔNG dùng cùng 1 bộ 4 options lặp đi lặp lại nhiều câu liên tiếp — người học sẽ đoán được vị trí
- Nếu topic chỉ hỏi 2–3 loại (vd: adjective vs adverb), PHẢI đa dạng hoá theo 3 cách:
  1. Thay đổi loại câu hỏi: mix dạng "từ loại nào?" + "câu nào ĐÚNG?" + "từ nào SAI/khác loại?" + "chọn dạng đúng để điền vào chỗ trống"
  2. Thay đổi distractors: 1 câu dùng [Noun, Verb, Adjective, Adverb]; câu khác dùng 4 từ cụ thể (quickly/quick/quickness/quieter); câu khác dùng [Adjective, Adverb, Cả hai đều đúng, Không phải từ nào]
  3. Đảo vị trí đáp án đúng trong options — không có quy luật A=đúng hay D=đúng
- Mục tiêu: sau 20 câu, người học KHÔNG THỂ đoán đáp án dựa vào pattern mà phải thực sự hiểu nội dung

SKILL TAGS:
- Mỗi câu PHẢI có "skillTags": mảng 1-3 string, snake_case, mô tả kỹ năng được test
- Ví dụ: ["word_form", "adjective_vs_adverb"], ["preposition", "time_expression"], ["tense", "present_perfect"]
- Tags phải cụ thể, không dùng tags chung chung như "grammar" hay "vocabulary"

GIẢI THÍCH (explanation) — ngắn gọn, đúng trọng tâm:
- Tối đa 2 câu, không dài hơn
- Câu 1: lý do cốt lõi tại sao đáp án đúng — nêu quy tắc/dấu hiệu nhận dạng ngay trong câu hỏi
- Câu 2 (nếu cần): mẹo nhanh để nhớ hoặc pattern hay gặp trong đề thi
- KHÔNG giải thích tại sao đáp án sai — không cần thiết
- KHÔNG lặp lại nội dung câu hỏi
- QUAN TRỌNG: chỉ dùng dấu nháy đơn (') không dùng dấu nháy kép (") để tránh lỗi JSON

Tạo đúng ${count} câu, không thiếu, không thừa.`;
}

function generateAndCopy() {
  const topic = document.getElementById('ai-topic').value.trim();
  const level = document.getElementById('ai-level').value;
  const count = parseInt(document.getElementById('ai-count').value) || 20;
  if (!topic) { toast('Nhập chủ đề bạn muốn học!', 'error'); document.getElementById('ai-topic').focus(); return; }
  const text = buildPromptText({ topic, level, count });

  const ta = document.getElementById('ai-prompt-text');
  ta.value = text;

  const ok = () => toast('✅ Đã copy! Paste vào ChatGPT / Claude', 'success');
  const fail = () => toast('❌ Không copy được — thử lại', 'error');

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(ok).catch(() => fallbackCopy(ta, ok, fail));
  } else {
    fallbackCopy(ta, ok, fail);
  }
}

function fallbackCopy(ta, ok, fail) {
  ta.removeAttribute('readonly');
  ta.select();
  ta.setSelectionRange(0, 99999);
  const success = document.execCommand('copy');
  ta.setAttribute('readonly', '');
  if (success) ok(); else if (fail) fail();
}

function normalizeJSON(raw) {
  return raw
    .replace(/[“”„‟″‶]/g, '"') // smart double quotes → "
    .replace(/[‘’‚‛′‵]/g, "'") // smart single quotes → '
    .replace(/[–—]/g, '-')   // em/en dash
    .replace(/[ ]/g, ' ')          // non-breaking space
    .trim();
}

// Escape dấu " bên trong chuỗi JSON (ChatGPT hay trả về "word" không escaped)
function fixInnerQuotes(str) {
  let out = '', inStr = false, i = 0;
  while (i < str.length) {
    const ch = str[i];
    if (inStr && ch === '\\') { out += ch + (str[i + 1] || ''); i += 2; continue; }
    if (ch === '"') {
      if (!inStr) { inStr = true; out += ch; i++; continue; }
      let j = i + 1;
      while (j < str.length && ' \t\r\n'.includes(str[j])) j++;
      const next = str[j];
      if (next === ':' || next === ',' || next === '}' || next === ']' || j >= str.length) {
        inStr = false; out += ch;
      } else {
        out += '\\"';
      }
      i++; continue;
    }
    out += ch; i++;
  }
  return out;
}

function tryParseJSON(raw) {
  try { return JSON.parse(raw); } catch {}
  try { return JSON.parse(fixInnerQuotes(raw)); } catch {}
  const matchArr = raw.match(/\[[\s\S]*\]/);
  const matchObj = raw.match(/\{[\s\S]*\}/);
  const extracted = matchArr || matchObj;
  if (extracted) {
    try { return JSON.parse(extracted[0]); } catch {}
    try { return JSON.parse(fixInnerQuotes(extracted[0])); } catch {}
  }
  return null;
}

function importAIText() {
  const raw = document.getElementById('ai-result-text').value.trim();
  if (!raw) { toast('Vui lòng paste kết quả JSON từ AI', 'error'); return; }

  const data = tryParseJSON(normalizeJSON(raw));
  if (!data) {
    toast('Không parse được JSON — thử copy lại từ AI', 'error');
    return;
  }

  // Hỗ trợ cả 2 format: array (cũ) và { name, questions } (mới)
  let arr, aiName;
  if (Array.isArray(data)) {
    arr = data; aiName = null;
  } else if (data && Array.isArray(data.questions)) {
    arr = data.questions; aiName = data.name || null;
  } else {
    arr = [data]; aiName = null;
  }

  const setName = (aiName && aiName.trim()) || document.getElementById('ai-topic').value.trim() || 'Bộ đề AI';

  // Ghép tất cả câu hỏi vào 1 bộ đề
  const questions = [];
  arr.forEach(item => {
    if (item.text && Array.isArray(item.options) && item.options.length === 4 && typeof item.correct === 'number') {
      questions.push({
        id: uid(),
        text: String(item.text).trim(),
        options: item.options.map(o => String(o).trim()),
        correct: item.correct,
        explanation: (item.explanation || '').trim(),
        skillTags: (item.skillTags || []).map(t => String(t).toLowerCase().trim())
      });
    }
  });

  if (!questions.length) {
    toast('Không tìm thấy câu hỏi hợp lệ trong JSON', 'error');
    return;
  }

  // Append vào set có sẵn nếu ở chế độ thêm câu
  if (_appendToSetId) {
    const existing = getSet(_appendToSetId);
    if (existing) {
      existing.questions = [...existing.questions, ...questions];
      saveSet(existing);
      toast(`✅ Đã thêm ${questions.length} câu vào "${existing.name}"`, 'success');
      ['ai-result-text', 'ai-prompt-text'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
      });
      hideAICreate();
      renderLibrary();
      return;
    }
  }

  const newSet = {
    id: uid(),
    name: setName,
    description: `Tạo bởi AI · ${questions.length} câu hỏi`,
    timeLimit: null,
    createdAt: Date.now(),
    questions
  };
  saveSet(newSet);
  toast(`✅ Đã nhập ${questions.length} câu hỏi vào "${setName}"`, 'success');

  ['ai-topic', 'ai-result-text', 'ai-prompt-text'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  hideAICreate();
  renderLibrary();
}

/* ===== NAVIGATION ===== */
function navTo(name) {
  document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
  const btn = document.querySelector(`[data-nav="${name}"]`);
  if (btn) btn.classList.add('active');
  if (name === 'home') { showScreen('screen-home'); renderHome(); }
  else if (name === 'library') { showScreen('screen-library'); renderLibrary(); }
  else if (name === 'history') { showScreen('screen-history'); renderHistory(); }
}

function confirmClearAllData() {
  confirm('Xoá toàn bộ dữ liệu', 'Tất cả bộ đề, lịch sử và thống kê sẽ bị xoá vĩnh viễn. Không thể khôi phục!', () => {
    ['quiz_sets','quiz_history','quiz_q_stats','quiz_last_set'].forEach(k => localStorage.removeItem(k));
    renderHome(); renderLibrary(); renderHistory();
    toast('Đã xoá toàn bộ dữ liệu', 'success');
  });
}

function confirmClearHistory() {
  confirm('Xóa lịch sử', 'Toàn bộ lịch sử làm bài sẽ bị xóa. Bạn có chắc?', () => {
    localStorage.removeItem('quiz_history');
    renderHistory();
    toast('Đã xóa lịch sử', 'success');
  });
}

/* ===== BUTTON ANIMATIONS ===== */
function addRipple(btn, e) {
  const rect = btn.getBoundingClientRect();
  const size = Math.max(rect.width, rect.height) * 2;
  const x = (e.clientX - rect.left) - size / 2;
  const y = (e.clientY - rect.top) - size / 2;
  const ripple = document.createElement('span');
  ripple.className = 'ripple';
  ripple.style.cssText = `width:${size}px;height:${size}px;left:${x}px;top:${y}px`;
  btn.appendChild(ripple);
  ripple.addEventListener('animationend', () => ripple.remove());
}

function flashSuccess(btn, successText, duration = 1800) {
  const orig = btn.innerHTML;
  btn.classList.add('btn-success-flash');
  btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="width:16px;height:16px"><polyline points="20 6 9 17 4 12"/></svg> ${successText}`;
  btn.disabled = true;
  setTimeout(() => {
    btn.classList.remove('btn-success-flash');
    btn.innerHTML = orig;
    btn.disabled = false;
  }, duration);
}

/* ===== INIT ===== */
document.addEventListener('DOMContentLoaded', () => {
  showScreen('screen-home');
  renderHome();
  renderLibrary();
  startUpdateCheck();

  document.getElementById('import-file-input').addEventListener('change', handleImportFile);

  const dropZone = document.getElementById('import-drop-zone');
  dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.classList.add('dragover'); });
  dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
  dropZone.addEventListener('drop', e => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    const file = e.dataTransfer.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => importSetsFromJSON(ev.target.result);
    reader.readAsText(file);
  });

  // Ripple effect — dùng click để không chặn gesture trên mobile
  document.addEventListener('click', e => {
    const btn = e.target.closest('.btn');
    if (btn && !btn.disabled) addRipple(btn, e);
  }, true);

  window.addEventListener('beforeunload', e => {
    if (_quizInProgress) {
      e.preventDefault();
      e.returnValue = '';
    }
  });
});
