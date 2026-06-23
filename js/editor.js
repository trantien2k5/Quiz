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
