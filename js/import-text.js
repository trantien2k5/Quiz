/* ===== IMPORT TỪ VĂN BẢN THÔ (định dạng Azota: Câu N / A-D / Đáp án / Giải thích) ===== */
let _importQuestions = [];
let _importTargetEditor = false; // true = thêm trực tiếp vào _editingQuestions (screen-editor), không lưu localStorage

function openImportText(appendSetId) {
  _appendToSetId = appendSetId || null;
  _importTargetEditor = false;
  _importQuestions = [];
  document.getElementById('import-text-raw').value = '';
  document.getElementById('import-set-name').value = '';
  document.getElementById('import-set-name').style.display = '';
  document.getElementById('import-commit-label').textContent = 'Tạo đề';
  const titleEl = document.getElementById('import-text-title');
  if (_appendToSetId) {
    const set = getSet(_appendToSetId);
    titleEl.textContent = set ? `📋 Thêm câu vào "${set.name}"` : '📋 Tạo đề từ văn bản';
  } else {
    titleEl.textContent = '📋 Tạo đề từ văn bản';
  }
  _showImportStep('input');
  showScreen('screen-import-text');
}

/* Mở từ popup "Thêm câu hỏi" trong Editor — câu hợp lệ sẽ được đẩy thẳng vào _editingQuestions, không qua saveSet() */
function openImportTextForEditor() {
  _appendToSetId = null;
  _importTargetEditor = true;
  _importQuestions = [];
  document.getElementById('import-text-raw').value = '';
  document.getElementById('import-set-name').value = '';
  document.getElementById('import-set-name').style.display = 'none';
  document.getElementById('import-commit-label').textContent = 'Thêm vào bộ đề';
  document.getElementById('import-text-title').textContent = '📋 Dán câu hỏi vào bộ đề';
  _showImportStep('input');
  showScreen('screen-import-text');
}

function closeImportText() {
  _appendToSetId = null;
  if (_importTargetEditor) { _importTargetEditor = false; showScreen('screen-editor'); return; }
  navTo('library');
}

function backToImportInput() {
  _showImportStep('input');
}

/* Copy mẫu định dạng để user paste làm khung tham khảo (vd nhờ ChatGPT điền theo) */
function copyImportFormatTemplate() {
  const text = document.getElementById('import-format-sample').textContent;
  const ok = () => toast('✅ Đã copy mẫu định dạng', 'success');
  const fail = () => toast('❌ Không copy được — thử lại', 'error');
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(ok).catch(() => _fallbackCopyText(text, ok, fail));
  } else {
    _fallbackCopyText(text, ok, fail);
  }
}

function _fallbackCopyText(text, ok, fail) {
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed';
  ta.style.left = '-9999px';
  document.body.appendChild(ta);
  ta.select();
  ta.setSelectionRange(0, 99999);
  const success = document.execCommand('copy');
  document.body.removeChild(ta);
  if (success) ok(); else fail();
}

function _showImportStep(step) {
  document.getElementById('import-text-input-step').classList.toggle('hidden', step !== 'input');
  document.getElementById('import-text-preview-step').classList.toggle('hidden', step !== 'preview');
  document.getElementById('import-text-save-bar').classList.toggle('hidden', step !== 'preview');
}

function parseImportText() {
  const raw = document.getElementById('import-text-raw').value;
  if (!raw.trim()) { toast('Vui lòng dán văn bản đề vào ô trên', 'error'); return; }
  _importQuestions = parseAzotaText(raw);
  if (!_importQuestions.length) {
    toast('Không nhận diện được câu hỏi nào — kiểm tra lại định dạng (Câu 1: ... A. ... Đáp án: B)', 'error');
    return;
  }
  renderImportPreview();
  _showImportStep('preview');
}

/* Tách văn bản thô thành từng block câu hỏi.
   Hỗ trợ cả 2 kiểu: "Câu 1: ..." thuần (Azota) và markdown ("### Câu 1",
   ngăn cách bằng dòng "---", *Đáp án:** in đậm...) — vd xuất ra từ AI/ChatGPT. */
function parseAzotaText(raw) {
  const text = raw.replace(/\r\n/g, '\n').trim();
  const blocks = text
    .split(/\n[ \t]*-{3,}[ \t]*\n|\n(?=[ \t]*#{0,6}[ \t]*(?:Câu|Cau|Question)\s*\d+)/i)
    .map(b => b.trim())
    .filter(Boolean);
  return blocks.map(parseOneQuestionBlock);
}

const _OPT_RE = /^([A-Da-d])[.):\-]\s*(.+)$/;
const _ANS_RE = /^(?:Đáp\s*án(?:\s*đúng)?|ĐA|Answer)\s*[:.\-]?\s*([A-Da-d])\b/i;
const _ANS_TEXT_RE = /^(?:Đáp\s*án(?:\s*đúng)?|ĐA|Answer)\s*[:.\-]?\s*(.+)$/i;
const _EXP_RE = /^(?:Giải\s*thích|Explanation)\s*[:.\-]?\s*(.*)$/i;
const _QHEAD_RE = /^\s*(?:Câu|Cau|Question)?\s*\d+\s*[:.\)]?\s*(.*)$/i;
/* Icon/emoji đầu dòng (✅💡📘📝🎯⚠️...) — chỉ dùng để NHẬN DIỆN nhãn, không xoá khỏi nội dung lưu lại
   (giữ icon trong câu hỏi/giải thích cho đỡ khô khan, vd "📘 Công thức", "🎯 Ghi nhớ") */
const _ICON_PREFIX_RE = /^[←-➿⬀-⯿\u{1F300}-\u{1FAFF}️\s]+/u;

function parseOneQuestionBlock(block) {
  // Bỏ markdown bold (**text**) trước — nhãn "Đáp án"/"Giải thích" thường bị in đậm
  const cleanedBlock = block.replace(/\*\*(.*?)\*\*/g, '$1');
  const lines = cleanedBlock.split('\n')
    .map(l => l.replace(/^#{1,6}\s*/, '').replace(/^>\s*/, '').trim())
    .filter(l => l !== '');

  let text = '';
  const opts = {};
  let correct = null;
  let explanation = '';
  let mode = 'question'; // 'question' | 'options' | 'explanation'

  lines.forEach(rawLine => {
    const line = rawLine.replace(_ICON_PREFIX_RE, ''); // bản bỏ icon, chỉ để test nhãn

    const ansMatch = line.match(_ANS_RE);
    if (ansMatch) { correct = ansMatch[1].toUpperCase().charCodeAt(0) - 65; mode = 'explanation'; return; }

    const expMatch = line.match(_EXP_RE);
    if (expMatch) { explanation = expMatch[1] || ''; mode = 'explanation'; return; }

    if (mode === 'explanation') { explanation += (explanation ? '\n' : '') + rawLine; return; }

    const optMatch = line.match(_OPT_RE);
    if (optMatch) {
      const idx = optMatch[1].toUpperCase().charCodeAt(0) - 65;
      opts[idx] = optMatch[2].trim();
      mode = 'options';
      return;
    }

    if (mode === 'question') {
      const headMatch = line.match(_QHEAD_RE);
      if (headMatch) { if (headMatch[1]) text += (text ? ' ' : '') + headMatch[1]; }
      else { text += (text ? ' ' : '') + rawLine; }
    }
  });

  // Fallback: "Đáp án: <nội dung đầy đủ>" thay vì chữ cái → đối chiếu với các đáp án đã nhận diện
  if (correct === null) {
    for (const rawLine of lines) {
      const line = rawLine.replace(_ICON_PREFIX_RE, '');
      const m = line.match(_ANS_TEXT_RE);
      if (m) {
        const val = m[1].trim().toLowerCase();
        const foundIdx = [0, 1, 2, 3].find(i => (opts[i] || '').trim().toLowerCase() === val);
        if (foundIdx !== undefined) { correct = foundIdx; break; }
      }
    }
  }

  const q = {
    id: uid(),
    text: text.trim(),
    options: [opts[0] || '', opts[1] || '', opts[2] || '', opts[3] || ''],
    correct,
    explanation: explanation.trim(),
    _error: null
  };
  return validateImportQuestion(q);
}

function validateImportQuestion(q) {
  const filled = q.options.filter(o => (o || '').trim() !== '').length;
  if (!q.text.trim()) q._error = 'Thiếu nội dung câu hỏi';
  else if (filled < 4) q._error = `Chỉ nhận diện được ${filled}/4 đáp án`;
  else if (q.correct === null || q.correct === undefined || q.correct < 0 || q.correct > 3) q._error = 'Không xác định được đáp án đúng';
  else q._error = null;
  return q;
}

function renderImportPreview() {
  const list = document.getElementById('import-preview-list');
  list.innerHTML = _importQuestions.map((q, i) => buildImportPreviewCard(q, i)).join('');

  const total = _importQuestions.length;
  const errCount = _importQuestions.filter(q => q._error).length;
  const validCount = total - errCount;
  document.getElementById('import-preview-count').textContent = total;
  document.getElementById('import-preview-error-count').textContent = errCount;
  document.getElementById('import-commit-count').textContent = validCount;
  document.getElementById('import-commit-btn').disabled = validCount === 0;
}

function buildImportPreviewCard(q, i) {
  const letters = ['A', 'B', 'C', 'D'];
  const correct = q.correct;
  const errBanner = q._error ? `<div class="import-error-banner">⚠️ ${esc(q._error)}</div>` : '';
  return `
    <div class="question-card${q._error ? ' has-error' : ''}" id="import-qcard-${q.id}">
      <div class="question-card-header">
        <div class="q-num">${i + 1}</div>
        <div class="q-text">${esc(q.text) || '<em style="color:var(--color-text-light)">Câu hỏi chưa nhập</em>'}</div>
        <button class="btn-icon" onclick="removeImportQuestion('${q.id}')" title="Bỏ câu này">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
        </button>
      </div>
      <div class="question-card-body">
        ${errBanner}
        <div class="form-group">
          <label>Câu hỏi</label>
          <textarea class="form-control" rows="2"
            oninput="updateImportQuestion('${q.id}', 'text', this.value)">${esc(q.text || '')}</textarea>
        </div>
        <div class="section-label" style="padding:0;margin-bottom:8px">Đáp án <span style="font-weight:400;text-transform:none;letter-spacing:0;font-size:12px">(☑ chọn đáp án đúng)</span></div>
        ${letters.map((letter, li) => `
          <div class="option-row">
            <div class="option-letter${correct === li ? ' selected' : ''}"
              onclick="updateImportQuestion('${q.id}', 'correct', ${li})" title="Bấm để chọn đáp án đúng">${letter}</div>
            <input type="text" class="form-control" placeholder="Đáp án ${letter}..."
              value="${esc(q.options[li] || '')}"
              oninput="updateImportOption('${q.id}', ${li}, this.value)">
            <input type="radio" class="radio-correct" name="import-correct-${q.id}" value="${li}"
              ${correct === li ? 'checked' : ''}
              onchange="updateImportQuestion('${q.id}', 'correct', ${li})"
              title="Đáp án đúng">
          </div>`).join('')}
        <div class="form-group" style="margin-top:12px;margin-bottom:0">
          <label>Giải thích <span>(tuỳ chọn)</span></label>
          <textarea class="form-control" rows="2"
            oninput="updateImportQuestion('${q.id}', 'explanation', this.value)">${esc(q.explanation || '')}</textarea>
        </div>
      </div>
    </div>`;
}

function _findImportQ(id) {
  return _importQuestions.find(q => q.id === id);
}

function updateImportQuestion(id, field, value) {
  const q = _findImportQ(id);
  if (!q) return;
  q[field] = value;
  validateImportQuestion(q);
  renderImportPreview();
}

function updateImportOption(id, idx, value) {
  const q = _findImportQ(id);
  if (!q) return;
  q.options[idx] = value;
  validateImportQuestion(q);
  renderImportPreview();
}

function removeImportQuestion(id) {
  _importQuestions = _importQuestions.filter(q => q.id !== id);
  renderImportPreview();
}

/* AI đọc nội dung câu hỏi đã nhận diện → gợi ý 3 tên bộ đề ngắn gọn */
async function suggestImportSetName() {
  const valid = _importQuestions.filter(q => !q._error);
  if (!valid.length) { toast('Chưa có câu hợp lệ để gợi ý tên', 'error'); return; }

  const cfg = getAiConfig();
  if (!cfg.apiKey) { toast('Vui lòng nhập API key trong Cấu hình AI', 'error'); showAiConfig(); return; }

  const btn = document.getElementById('import-suggest-name-btn');
  const origHtml = btn.innerHTML;
  btn.disabled = true;
  btn.textContent = '⏳';

  try {
    const sample = valid.slice(0, 15).map(q => q.text).join('\n');
    const model = cfg.model || 'gpt-4o-mini';
    const prompt = `Dưới đây là nội dung ${valid.length} câu hỏi trắc nghiệm của một bộ đề:

${sample}

Dựa vào nội dung trên, hãy gợi ý ĐÚNG 3 tên ngắn gọn (tối đa 6 từ, tiếng Việt, không đánh số thứ tự) phù hợp để đặt cho bộ đề này. Trả về CHÍNH XÁC theo format JSON array, không thêm chữ nào khác: ["tên 1","tên 2","tên 3"]`;

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + cfg.apiKey },
      body: JSON.stringify({ model, messages: [{ role: 'user', content: prompt }], max_tokens: 120 })
    });

    if (!res.ok) {
      if (res.status === 401) toast('API key không hợp lệ', 'error');
      else if (res.status === 429) toast('Hết quota hoặc bị giới hạn tốc độ (429)', 'error');
      else toast(`Lỗi API (${res.status})`, 'error');
      return;
    }

    const json = await res.json();
    const rawText = json.choices?.[0]?.message?.content || '';
    let names = [];
    try { names = JSON.parse(rawText.match(/\[[\s\S]*\]/)?.[0] || '[]'); } catch { names = []; }
    names = names.filter(n => typeof n === 'string' && n.trim()).map(n => n.trim()).slice(0, 3);
    if (!names.length) { toast('AI không trả về gợi ý hợp lệ', 'error'); return; }

    const usage = json.usage || {};
    const promptTokens = usage.prompt_tokens || 0;
    const completionTokens = usage.completion_tokens || 0;
    const { usd, vnd } = calcAiCost(model, promptTokens, completionTokens, cfg.fxRate);
    logAiUsage({
      id: uid(), date: Date.now(), model, type: 'naming',
      questionsRequested: 0, questionsGenerated: 0,
      promptTokens, completionTokens, totalTokens: promptTokens + completionTokens,
      costUSD: usd, costVND: vnd
    });

    renderImportNameSuggestions(names);
    toast(`✅ Đã gợi ý tên — $${usd.toFixed(4)}`, 'success');
  } catch (err) {
    toast('Lỗi kết nối — kiểm tra mạng/API key', 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = origHtml;
  }
}

function renderImportNameSuggestions(names) {
  const el = document.getElementById('import-name-suggestions');
  el.innerHTML = names.map(n => `<button type="button" class="ai-chip" onclick="pickImportSetName(this)">${esc(n)}</button>`).join('');
  el.classList.remove('hidden');
}

function pickImportSetName(btn) {
  document.getElementById('import-set-name').value = btn.textContent;
  document.getElementById('import-name-suggestions').classList.add('hidden');
}

function commitImportText() {
  const valid = _importQuestions.filter(q => !q._error);
  if (!valid.length) { toast('Không có câu hợp lệ để tạo đề', 'error'); return; }

  if (_importTargetEditor) {
    _importTargetEditor = false;
    valid.forEach(q => _editingQuestions.push({
      id: q.id, text: q.text, options: q.options, correct: q.correct, explanation: q.explanation
    }));
    renderEditorQuestions();
    document.getElementById('q-count-label').textContent = _editingQuestions.length;
    toast(`✅ Đã thêm ${valid.length} câu vào bộ đề`, 'success');
    showScreen('screen-editor');
    return;
  }

  const name = document.getElementById('import-set-name').value.trim();
  const arr = valid.map(q => ({ text: q.text, options: q.options, correct: q.correct, explanation: q.explanation }));
  const result = applyAIQuestions(arr, name || 'Bộ đề nhập từ văn bản');
  if (!result) { toast('Không tạo được bộ đề', 'error'); return; }

  toast(result.appended
    ? `✅ Đã thêm ${result.count} câu vào "${result.setName}"`
    : `✅ Đã tạo đề "${result.setName}" với ${result.count} câu`, 'success');
  navTo('library');
}
