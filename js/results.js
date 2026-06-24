/* ===== RESULTS ===== */
let _resultEntry = null, _resultSet = null;

function renderResult(entry, set, activeTimeSec) {
  _resultEntry = entry;
  _resultSet = set;
  if (activeTimeSec === undefined) activeTimeSec = entry.activeTimeSec;
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

  if (pct === 100) triggerConfetti();

  // Populate summary
  document.getElementById('result-emoji').textContent = resultEmoji(pct);
  document.getElementById('result-title').textContent =
    pct === 100 ? 'Xuất sắc! Hoàn hảo!' :
    pct >= 80 ? 'Làm tốt lắm!' :
    pct >= 60 ? 'Khá tốt!' :
    pct >= 40 ? 'Cần cố gắng thêm' : 'Hãy thử lại nhé!';
  document.getElementById('result-subtitle').textContent = `${entry.setName} · ${fmtDate(entry.date)}`;
  const elActive = document.getElementById('result-active-time');
  if (elActive) elActive.textContent = (activeTimeSec != null && entry.timeTaken != null && activeTimeSec < entry.timeTaken - 5)
    ? `⏱ Học thực: ${fmtTime(activeTimeSec)}` : '';
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
