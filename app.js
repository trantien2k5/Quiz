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
  if (idx >= 0) sets[idx] = set; else sets.push(set);
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
const screens = ['screen-home', 'screen-editor', 'screen-ai', 'screen-quiz', 'screen-result', 'screen-history'];
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
  const container = document.getElementById('set-list');
  if (!sets.length) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📚</div>
        <h3>Chưa có bộ đề nào</h3>
        <p>Tạo bộ đề mới hoặc dùng AI để tạo tự động</p>
        <button class="btn btn-primary" onclick="openEditor(null)">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Tạo bộ đề mới
        </button>
      </div>`;
    return;
  }
  container.innerHTML = sets.map(set => {
    const qCount = set.questions ? set.questions.length : 0;
    const best = getBestScore(set.id);
    const bestBadge = best !== null
      ? `<span class="badge badge-green">🏆 ${best}%</span>`
      : `<span class="badge badge-gray">Chưa làm</span>`;
    const timeBadge = set.timeLimit ? `<span class="badge badge-orange">⏱ ${set.timeLimit} phút</span>` : '';
    return `
      <div class="set-card">
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
          <button class="btn btn-primary btn-sm" onclick="showQuizSettings('${set.id}')" ${qCount === 0 ? 'disabled' : ''}>▶ Làm bài</button>
          <button class="btn btn-secondary btn-sm" onclick="openEditor('${set.id}')">✏️ Sửa</button>
          <button class="btn btn-danger btn-sm" onclick="confirmDeleteSet('${set.id}', '${esc(set.name)}')">🗑</button>
          <button class="btn btn-outline btn-sm" onclick="exportSet('${set.id}')">↓ Xuất</button>
        </div>
      </div>`;
  }).join('');
}

function confirmDeleteSet(id, name) {
  confirm('Xóa bộ đề', `Bạn có chắc muốn xóa bộ đề "${name}"? Lịch sử làm bài cũng sẽ bị xóa.`, () => {
    deleteSet(id);
    renderHome();
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
  setTimeout(() => {
    const cards = document.querySelectorAll('.question-card');
    if (cards.length) cards[cards.length - 1].scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 100);
}

function removeQuestion(qid) {
  _editingQuestions = _editingQuestions.filter(q => q.id !== qid);
  renderEditorQuestions();
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
  showScreen('screen-home');
  renderHome();
  document.querySelector('[data-nav="home"]').click();
}

function cancelEditor() {
  const dirty = _editingQuestions.length > 0 || document.getElementById('set-name').value.trim();
  if (dirty) {
    confirm('Thoát bộ đề', 'Các thay đổi chưa lưu sẽ bị mất. Tiếp tục?', () => {
      showScreen('screen-home'); renderHome();
      document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
      document.querySelector('[data-nav="home"]').classList.add('active');
    });
  } else {
    showScreen('screen-home'); renderHome();
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    document.querySelector('[data-nav="home"]').classList.add('active');
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
  const shuffleQ = document.getElementById('qs-shuffle-q').checked;
  const shuffleOpts = document.getElementById('qs-shuffle-opts').checked;
  const numQRaw = document.getElementById('qs-num-q').value.trim();
  const numQ = numQRaw ? parseInt(numQRaw) : null;
  startQuiz(_pendingSetId, { shuffleQ, shuffleOpts, numQ });
}

/* ===== QUIZ ===== */
let _quiz = null;

function startQuiz(setId, settings) {
  const set = getSet(setId);
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
    originalSetId: setId,
    answers: new Array(questions.length).fill(null),
    startTime: Date.now(),
    currentIdx: 0,
    timerInterval: null,
    timeLeft: set.timeLimit ? set.timeLimit * 60 : null,
    mode: 'one-by-one'
  };
  _quizInProgress = true;
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

  const content = document.getElementById('quiz-questions-content');
  content.innerHTML = q.set.questions.map((question, i) => buildQuizQuestion(question, i)).join(
    q.mode === 'all' ? '<div class="quiz-separator"></div>' : ''
  );
  updateQuizVisibility();
  renderQuizNav();
}

function buildQuizQuestion(question, i) {
  const letters = ['A', 'B', 'C', 'D'];
  const selected = _quiz.answers[i];
  return `
    <div class="question-block quiz-question-block" data-idx="${i}" id="quiz-q-${i}">
      <div class="q-label">Câu ${i + 1} / ${_quiz.set.questions.length}</div>
      <div class="q-text">${esc(question.text)}</div>
      <div class="options-list">
        ${question.options.map((opt, oi) => `
          <button class="option-btn ${selected === oi ? 'selected' : ''}"
            onclick="selectAnswer(${i}, ${oi})">
            <span class="opt-letter">${letters[oi]}</span>
            <span>${esc(opt)}</span>
          </button>`).join('')}
      </div>
    </div>`;
}

function updateQuizVisibility() {
  document.querySelectorAll('.quiz-question-block').forEach((block, i) => {
    block.style.display = (_quiz.mode === 'all' || i === _quiz.currentIdx) ? 'block' : 'none';
  });
}

function renderTimer() {
  const t = _quiz.timeLeft;
  document.getElementById('quiz-timer-text').textContent = fmtTime(Math.max(0, t));
  const el = document.getElementById('quiz-timer');
  if (t <= 60) el.classList.add('warning'); else el.classList.remove('warning');
}

function renderQuizNav() {
  const q = _quiz;
  const total = q.set.questions.length;
  const nav = document.getElementById('quiz-nav');
  if (q.mode === 'all') {
    nav.innerHTML = `<button class="btn btn-primary btn-full" onclick="submitQuizConfirm()">Nộp bài</button>`;
    return;
  }
  const isFirst = q.currentIdx === 0;
  const isLast = q.currentIdx === total - 1;
  nav.innerHTML = `
    <button class="btn btn-secondary" onclick="quizPrev()" ${isFirst ? 'disabled' : ''}>← Trước</button>
    ${isLast
      ? `<button class="btn btn-primary" onclick="submitQuizConfirm()">Nộp bài ✓</button>`
      : `<button class="btn btn-primary" onclick="quizNext()">Tiếp →</button>`}`;
}

function selectAnswer(qIdx, optIdx) {
  _quiz.answers[qIdx] = optIdx;
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
  const answered = _quiz.answers.filter(a => a !== null).length;
  const total = _quiz.set.questions.length;
  document.getElementById('quiz-progress-fill').style.width = (answered / total * 100) + '%';
  document.getElementById('quiz-counter').textContent = `${answered}/${total} đã trả lời`;
  if (_quiz.mode === 'one-by-one' && _quiz.currentIdx < total - 1) {
    setTimeout(() => { _quiz.currentIdx++; updateQuizVisibility(); renderQuizNav(); }, 400);
  }
}

function quizNext() {
  if (_quiz.currentIdx < _quiz.set.questions.length - 1) {
    _quiz.currentIdx++;
    updateQuizVisibility();
    renderQuizNav();
  }
}
function quizPrev() {
  if (_quiz.currentIdx > 0) {
    _quiz.currentIdx--;
    updateQuizVisibility();
    renderQuizNav();
  }
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
    if (q.answers[i] === question.correct) score++;
  });
  const entry = {
    id: uid(),
    setId: q.originalSetId,
    setName: q.set.name,
    score,
    total: q.set.questions.length,
    timeTaken,
    date: Date.now(),
    answers: q.answers.slice()
  };
  addHistoryEntry(entry);
  renderResult(entry, q.set);
  showScreen('screen-result');
}

function toggleQuizMode() {
  if (!_quiz) return;
  _quiz.mode = _quiz.mode === 'one-by-one' ? 'all' : 'one-by-one';
  updateQuizVisibility();
  renderQuizNav();
  toast(_quiz.mode === 'all' ? 'Hiển thị tất cả câu hỏi' : 'Hiển thị từng câu hỏi');
}

function exitQuiz() {
  if (_quizInProgress) {
    confirm('Thoát bài thi', 'Bài thi chưa hoàn thành sẽ không được lưu. Thoát?', () => {
      clearInterval(_quiz && _quiz.timerInterval);
      _quizInProgress = false;
      _quiz = null;
      showScreen('screen-home');
      renderHome();
      document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
      document.querySelector('[data-nav="home"]').classList.add('active');
    });
  } else {
    showScreen('screen-home');
    renderHome();
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    document.querySelector('[data-nav="home"]').classList.add('active');
  }
}

/* ===== RESULTS ===== */
function renderResult(entry, set) {
  const pct = scorePct(entry.score, entry.total);
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

  const letters = ['A', 'B', 'C', 'D'];
  document.getElementById('review-list').innerHTML = set.questions.map((q, i) => {
    const userAns = entry.answers[i];
    const isCorrect = userAns === q.correct;
    const isSkipped = userAns === null;
    const statusClass = isSkipped ? '' : isCorrect ? 'correct' : 'wrong';
    const statusIcon = isSkipped ? '⚪' : isCorrect ? '✅' : '❌';
    const explanationHTML = q.explanation
      ? `<div class="review-explanation">💡 ${esc(q.explanation)}</div>`
      : '';
    return `
      <div class="review-card ${statusClass}">
        <div class="review-card-header">
          <span class="review-status-icon">${statusIcon}</span>
          <span class="review-q-num">Câu ${i + 1}</span>
          <span class="review-q-text">${esc(q.text)}</span>
        </div>
        <div class="review-card-body">
          ${q.options.map((opt, oi) => {
            let cls = '';
            if (oi === q.correct) cls = 'correct-ans';
            else if (oi === userAns && !isCorrect) cls = 'wrong-ans';
            return `<div class="review-option ${cls}">
              <span class="opt-letter">${letters[oi]}</span>
              <span style="flex:1">${esc(opt)}</span>
              ${oi === q.correct ? '<span class="review-tag correct-tag">✓ Đúng</span>' : ''}
              ${oi === userAns && !isCorrect ? '<span class="review-tag wrong-tag">✗ Bạn chọn</span>' : ''}
            </div>`;
          }).join('')}
          ${explanationHTML}
        </div>
      </div>`;
  }).join('');

  document.getElementById('result-retry-btn').onclick = () => showQuizSettings(entry.setId);
  document.getElementById('result-home-btn').onclick = () => {
    showScreen('screen-home'); renderHome();
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    document.querySelector('[data-nav="home"]').classList.add('active');
  };
}

/* ===== HISTORY ===== */
function renderHistory() {
  const history = getHistory();
  const container = document.getElementById('history-content');
  if (!history.length) {
    container.innerHTML = `<div class="empty-state">
      <div class="empty-icon">📋</div>
      <h3>Chưa có lịch sử</h3>
      <p>Làm bài thi để xem lịch sử ở đây</p>
    </div>`;
    return;
  }
  const groups = {};
  history.forEach(h => {
    if (!groups[h.setId]) groups[h.setId] = { name: h.setName, entries: [] };
    groups[h.setId].entries.push(h);
  });
  container.innerHTML = Object.values(groups).map(g => {
    const items = g.entries.map(h => {
      const pct = scorePct(h.score, h.total);
      const cls = scoreClass(pct);
      return `
        <div class="history-item">
          <div class="history-score-circle ${cls}">${pct}%</div>
          <div class="history-info">
            <div class="history-meta">${h.score}/${h.total} câu đúng</div>
            <div class="history-date">${fmtDate(h.date)}</div>
          </div>
          <div class="history-time">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            ${fmtTime(h.timeTaken)}
          </div>
        </div>`;
    }).join('');
    return `<div class="history-set-group">
      <div class="history-set-name">📝 ${esc(g.name)}</div>
      <div class="history-list">${items}</div>
    </div>`;
  }).join('');
}

/* ===== IMPORT / EXPORT ===== */
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
        explanation: (q.explanation || '').trim()
      }))
    });
    imported++;
  });
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

/* ===== AI CREATE ===== */
function generateAIPrompt() {
  const topic = document.getElementById('ai-topic').value.trim();
  if (!topic) { toast('Vui lòng nhập chủ đề', 'error'); return; }
  const count = parseInt(document.getElementById('ai-count').value) || 10;
  const difficulty = document.getElementById('ai-difficulty').value;
  const lang = document.getElementById('ai-lang').value;

  const prompt = `Bạn là chuyên gia về chủ đề "${topic}".

Hãy tạo ${count} câu hỏi trắc nghiệm về "${topic}" với độ khó: ${difficulty}.

Trả về JSON hợp lệ theo đúng format này (KHÔNG thêm bất kỳ text nào khác ngoài JSON):

[
  {
    "text": "Nội dung câu hỏi?",
    "options": ["Đáp án A", "Đáp án B", "Đáp án C", "Đáp án D"],
    "correct": 0,
    "explanation": "Giải thích ngắn gọn tại sao đáp án này đúng và các đáp án kia sai"
  }
]

Yêu cầu bắt buộc:
- Mỗi câu có ĐÚNG 4 đáp án trong mảng "options"
- "correct" là chỉ số (0, 1, 2 hoặc 3) của đáp án đúng
- Các đáp án sai phải hợp lý và có tính đánh lừa cao
- "explanation" giải thích rõ ràng tại sao đáp án đúng và tại sao các đáp án kia sai
- Ngôn ngữ: ${lang}
- Tạo đủ ${count} câu hỏi
- Câu hỏi không được trùng lặp`;

  document.getElementById('ai-prompt-text').value = prompt;
  document.getElementById('ai-setname').value = `${topic} — Trắc nghiệm`;
  document.getElementById('ai-prompt-section').classList.remove('hidden');
  document.getElementById('ai-prompt-section').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function copyAIPrompt() {
  const text = document.getElementById('ai-prompt-text').value;
  if (!text) return;
  navigator.clipboard.writeText(text).then(() => {
    toast('Đã copy prompt! Paste vào ChatGPT hoặc Claude.', 'success');
  }).catch(() => {
    document.getElementById('ai-prompt-text').select();
    document.execCommand('copy');
    toast('Đã copy prompt!', 'success');
  });
}

function importAIText() {
  const raw = document.getElementById('ai-result-text').value.trim();
  if (!raw) { toast('Vui lòng paste kết quả JSON từ AI', 'error'); return; }

  let data;
  try {
    // Thử parse thẳng; nếu lỗi thì tìm JSON trong text
    try {
      data = JSON.parse(raw);
    } catch {
      const match = raw.match(/\[[\s\S]*\]/);
      if (!match) throw new Error('no json');
      data = JSON.parse(match[0]);
    }
  } catch {
    toast('Không tìm thấy JSON hợp lệ. Hãy copy đúng phần JSON từ AI.', 'error');
    return;
  }

  const arr = Array.isArray(data) ? data : [data];

  // Lấy tên bộ đề từ input hoặc topic
  const setName = document.getElementById('ai-setname').value.trim()
    || document.getElementById('ai-topic').value.trim()
    || 'Bộ đề AI';

  // Ghép tất cả câu hỏi vào 1 bộ đề
  const questions = [];
  arr.forEach(item => {
    if (item.text && Array.isArray(item.options) && item.options.length === 4 && typeof item.correct === 'number') {
      questions.push({
        id: uid(),
        text: String(item.text).trim(),
        options: item.options.map(o => String(o).trim()),
        correct: item.correct,
        explanation: (item.explanation || '').trim()
      });
    }
  });

  if (!questions.length) {
    toast('Không tìm thấy câu hỏi hợp lệ trong JSON', 'error');
    return;
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
  toast(`✅ Đã nhập ${questions.length} câu hỏi vào bộ đề "${setName}"`, 'success');

  // Reset form
  document.getElementById('ai-result-text').value = '';
  document.getElementById('ai-prompt-text').value = '';
  document.getElementById('ai-topic').value = '';
  document.getElementById('ai-prompt-section').classList.add('hidden');

  // Chuyển về home
  setTimeout(() => {
    document.querySelector('[data-nav="home"]').click();
  }, 500);
}

/* ===== INIT ===== */
document.addEventListener('DOMContentLoaded', () => {
  showScreen('screen-home');
  renderHome();

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

  window.addEventListener('beforeunload', e => {
    if (_quizInProgress) {
      e.preventDefault();
      e.returnValue = '';
    }
  });
});
