/* ===== AI CREATE ===== */
const AI_DEFAULTS = ['Từ loại TOEIC','Giới từ TOEIC','Từ vựng TOEIC','Tiếng Anh lớp 10','Toán THPT','Lịch sử Việt Nam','Java OOP cơ bản','Python cơ bản'];

let _appendToSetId = null;

function renderAiChips() {
  document.getElementById('ai-suggestions').innerHTML = AI_DEFAULTS.map(t =>
    `<button class="ai-chip" onclick="setAiRequest('${t.replace(/'/g,"&#39;")}')">
      ${esc(t)}
    </button>`
  ).join('');
}

function showAICreate(appendSetId) {
  _appendToSetId = appendSetId || null;
  const requestEl = document.getElementById('ai-request');
  const titleEl = document.getElementById('ai-modal-title');
  const suggestionsEl = document.getElementById('ai-suggestions');
  if (_appendToSetId) {
    const set = getSet(_appendToSetId);
    titleEl.textContent = set ? `✨ Thêm câu vào "${set.name}"` : '✨ Tạo đề AI';
    requestEl.value = set ? `Thêm câu hỏi vào bộ đề "${set.name}"${set.description ? ' (' + set.description + ')' : ''}, mức trung bình` : '';
    suggestionsEl.innerHTML = '';
  } else {
    titleEl.textContent = '✨ Tạo đề AI';
    requestEl.value = '';
    renderAiChips();
    suggestionsEl.style.display = '';
  }
  updateAiManualSectionVisibility();
  document.getElementById('modal-ai-create').classList.add('active');
}
function hideAICreate() {
  _appendToSetId = null;
  document.getElementById('modal-ai-create').classList.remove('active');
}

/* Chip gợi ý → điền sẵn 1 câu yêu cầu tự nhiên vào ô chat, user có thể sửa thêm */
function setAiRequest(topic) {
  const el = document.getElementById('ai-request');
  el.value = `Tạo 20 câu về ${topic}, mức trung bình`;
  el.focus();
}

/* Ẩn chip gợi ý khi user đã tự gõ yêu cầu — tránh bấm nhầm chip đè mất nội dung đang gõ */
function updateAiSuggestionsVisibility() {
  const request = document.getElementById('ai-request').value.trim();
  const el = document.getElementById('ai-suggestions');
  if (el) el.style.display = request ? 'none' : '';
}

/* Đã có API key thì ẩn luôn form copy-paste thủ công — không cần nữa */
function updateAiManualSectionVisibility() {
  const hasKey = !!getAiConfig().apiKey;
  const el = document.getElementById('ai-manual-section');
  if (el) el.style.display = hasKey ? 'none' : '';
}

function buildPromptText(request) {
  return `Yêu cầu của người dùng: "${request}"

Phân tích yêu cầu trên để xác định chủ đề, phạm vi, đối tượng học, và:
- Số câu hỏi: theo đúng số người dùng nói; nếu không nói rõ thì tạo 20 câu
- Cấp độ khó: theo đúng mức người dùng nói; nếu không nói rõ thì mức trung bình

Tạo câu hỏi trắc nghiệm chất lượng cao theo yêu cầu trên.

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

Tạo đúng số câu đã xác định ở trên, không thiếu, không thừa.`;
}

function generateAndCopy() {
  const request = document.getElementById('ai-request').value.trim();
  if (!request) { toast('Nhập mô tả bộ đề bạn muốn tạo!', 'error'); document.getElementById('ai-request').focus(); return; }
  const text = buildPromptText(request);

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
    .replace(/[""„‟″‶]/g, '"') // smart double quotes → "
    .replace(/[''‚‛′‵]/g, "'") // smart single quotes → '
    .replace(/[–—]/g, '-')   // em/en dash
    .replace(/[ ]/g, ' ')          // non-breaking space
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

/* Áp dụng data JSON (từ paste tay hoặc gọi API trực tiếp) vào set — dùng chung cho cả 2 flow */
function applyAIQuestions(data, fallbackName) {
  // Hỗ trợ cả 2 format: array (cũ) và { name, questions } (mới)
  let arr, aiName;
  if (Array.isArray(data)) {
    arr = data; aiName = null;
  } else if (data && Array.isArray(data.questions)) {
    arr = data.questions; aiName = data.name || null;
  } else {
    arr = [data]; aiName = null;
  }

  const setName = (aiName && aiName.trim()) || fallbackName || 'Bộ đề AI';

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

  if (!questions.length) return null;

  // Append vào set có sẵn nếu ở chế độ thêm câu
  if (_appendToSetId) {
    const existing = getSet(_appendToSetId);
    if (existing) {
      existing.questions = [...existing.questions, ...questions];
      saveSet(existing);
      renderLibrary();
      return { count: questions.length, setName: existing.name, appended: true };
    }
  }

  const newSet = {
    id: uid(),
    name: setName,
    description: 'Tạo bởi AI',
    timeLimit: null,
    createdAt: Date.now(),
    questions
  };
  saveSet(newSet);
  renderLibrary();
  return { count: questions.length, setName, appended: false };
}

function _clearAiModalFields(appended) {
  const ids = appended ? ['ai-result-text', 'ai-prompt-text'] : ['ai-request', 'ai-result-text', 'ai-prompt-text'];
  ids.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
}

function importAIText() {
  const raw = document.getElementById('ai-result-text').value.trim();
  if (!raw) { toast('Vui lòng paste kết quả JSON từ AI', 'error'); return; }

  const data = tryParseJSON(normalizeJSON(raw));
  if (!data) {
    toast('Không parse được JSON — thử copy lại từ AI', 'error');
    return;
  }

  const request = document.getElementById('ai-request').value.trim();
  const result = applyAIQuestions(data, request.slice(0, 50));
  if (!result) { toast('Không tìm thấy câu hỏi hợp lệ trong JSON', 'error'); return; }

  toast(result.appended
    ? `✅ Đã thêm ${result.count} câu vào "${result.setName}"`
    : `✅ Đã nhập ${result.count} câu hỏi vào "${result.setName}"`, 'success');

  _clearAiModalFields(result.appended);
  hideAICreate();
}

/* ===== AI CONFIG (API key, model, tỷ giá) ===== */
const OPENAI_PRICING = {
  'gpt-4o-mini': { input: 0.15, output: 0.60 },
  'gpt-4o':      { input: 2.50, output: 10.00 }
};
const AI_FX_DEFAULT = 26000;

function calcAiCost(model, promptTokens, completionTokens, fxRate) {
  const p = OPENAI_PRICING[model] || OPENAI_PRICING['gpt-4o-mini'];
  const usd = (promptTokens / 1e6) * p.input + (completionTokens / 1e6) * p.output;
  const vnd = usd * (fxRate || AI_FX_DEFAULT);
  return { usd, vnd };
}

function showAiConfig() {
  const cfg = getAiConfig();
  document.getElementById('ai-cfg-key').value = cfg.apiKey || '';
  document.getElementById('ai-cfg-model').value = cfg.model || 'gpt-4o-mini';
  document.getElementById('ai-cfg-fxrate').value = cfg.fxRate || AI_FX_DEFAULT;
  document.getElementById('ai-cfg-fxupdated').textContent = cfg.fxUpdatedAt
    ? 'Tỷ giá cập nhật lúc: ' + fmtDate(cfg.fxUpdatedAt)
    : 'Chưa cập nhật tỷ giá tự động';
  document.getElementById('modal-ai-config').classList.add('active');
}
function hideAiConfig() {
  document.getElementById('modal-ai-config').classList.remove('active');
}
function toggleAiKeyVisibility() {
  const el = document.getElementById('ai-cfg-key');
  el.type = el.type === 'password' ? 'text' : 'password';
}
function saveAiConfigForm() {
  const apiKey = document.getElementById('ai-cfg-key').value.trim();
  const model  = document.getElementById('ai-cfg-model').value;
  const fxRate = parseFloat(document.getElementById('ai-cfg-fxrate').value) || AI_FX_DEFAULT;
  saveAiConfig({ ...getAiConfig(), apiKey, model, fxRate });
  toast('✅ Đã lưu cấu hình AI', 'success');
  hideAiConfig();
  updateAiManualSectionVisibility();
}
async function refreshFxRate() {
  const btn = document.getElementById('ai-cfg-fx-btn');
  if (btn) btn.disabled = true;
  try {
    const res = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
    const json = await res.json();
    const rate = json.rates && json.rates.VND;
    if (!rate) throw new Error('no rate');
    const rounded = Math.round(rate);
    document.getElementById('ai-cfg-fxrate').value = rounded;
    saveAiConfig({ ...getAiConfig(), fxRate: rounded, fxUpdatedAt: Date.now() });
    document.getElementById('ai-cfg-fxupdated').textContent = 'Tỷ giá cập nhật lúc: ' + fmtDate(Date.now());
    toast(`✅ Tỷ giá mới: ${rounded.toLocaleString('vi-VN')}đ/$`, 'success');
  } catch {
    toast('Không lấy được tỷ giá — kiểm tra kết nối mạng', 'error');
  } finally {
    if (btn) btn.disabled = false;
  }
}

/* Đếm giây real-time trong lúc chờ API — tránh cảm giác "đứng hình" không biết đang tới đâu */
function _startElapsedTicker(renderFn) {
  let s = 0;
  renderFn(s);
  return setInterval(() => { s++; renderFn(s); }, 1000);
}

/* ===== GỌI OPENAI API TRỰC TIẾP (không qua copy-paste) ===== */
async function generateDirectly() {
  const cfg = getAiConfig();
  if (!cfg.apiKey) {
    toast('Vui lòng nhập API key trong Cấu hình AI', 'error');
    showAiConfig();
    return;
  }
  const request = document.getElementById('ai-request').value.trim();
  if (!request) { toast('Nhập mô tả bộ đề bạn muốn tạo!', 'error'); document.getElementById('ai-request').focus(); return; }

  const model = cfg.model || 'gpt-4o-mini';
  const promptText = buildPromptText(request);

  const btn = document.getElementById('ai-generate-direct-btn');
  const origHtml = btn ? btn.innerHTML : '';
  let timer = null;
  if (btn) {
    btn.disabled = true;
    timer = _startElapsedTicker(s => { btn.textContent = `⏳ Đang tạo... (${s}s)`; });
  }

  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + cfg.apiKey },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: promptText }],
        response_format: { type: 'json_object' }
      })
    });

    if (!res.ok) {
      if (res.status === 401) toast('API key không hợp lệ', 'error');
      else if (res.status === 429) toast('Hết quota hoặc bị giới hạn tốc độ (429)', 'error');
      else toast(`Lỗi API (${res.status})`, 'error');
      return;
    }

    const json = await res.json();
    const content = json.choices && json.choices[0] && json.choices[0].message && json.choices[0].message.content;
    if (!content) { toast('AI không trả về nội dung', 'error'); return; }

    const data = tryParseJSON(normalizeJSON(content));
    if (!data) { toast('Không parse được JSON từ AI', 'error'); return; }

    const result = applyAIQuestions(data, request.slice(0, 50));
    if (!result) { toast('AI không trả về câu hỏi hợp lệ', 'error'); return; }

    const usage = json.usage || {};
    const promptTokens = usage.prompt_tokens || 0;
    const completionTokens = usage.completion_tokens || 0;
    const totalTokens = usage.total_tokens || (promptTokens + completionTokens);
    const { usd, vnd } = calcAiCost(model, promptTokens, completionTokens, cfg.fxRate);

    logAiUsage({
      id: uid(), date: Date.now(), model, topic: request.slice(0, 80), setName: result.setName,
      questionsRequested: result.count, questionsGenerated: result.count,
      promptTokens, completionTokens, totalTokens,
      costUSD: usd, costVND: vnd
    });

    toast(`✅ Đã tạo ${result.count} câu — ${totalTokens.toLocaleString('vi-VN')} tokens, $${usd.toFixed(4)} (~${Math.round(vnd).toLocaleString('vi-VN')}đ)`, 'success');
    _clearAiModalFields(result.appended);
    hideAICreate();
  } catch (err) {
    toast('Lỗi kết nối — kiểm tra mạng/API key', 'error');
  } finally {
    if (timer) clearInterval(timer);
    if (btn) { btn.disabled = false; btn.innerHTML = origHtml; }
  }
}

/* ===== THỐNG KÊ SỬ DỤNG AI ===== */
function showAiUsage() {
  renderAiUsage();
  document.getElementById('modal-ai-usage').classList.add('active');
}
function hideAiUsage() {
  document.getElementById('modal-ai-usage').classList.remove('active');
}
function renderAiUsage() {
  const log = getAiUsageLog();
  const el = document.getElementById('ai-usage-body');
  if (!log.length) {
    el.innerHTML = `<div class="empty-state"><div class="empty-icon">📊</div><h3>Chưa có dữ liệu</h3><p>Tạo đề bằng API key để xem thống kê</p></div>`;
    return;
  }

  const totalCalls = log.length;
  const totalQuestions = log.reduce((s, e) => s + (e.questionsGenerated || 0), 0);
  const totalTokens = log.reduce((s, e) => s + (e.totalTokens || 0), 0);
  const totalUSD = log.reduce((s, e) => s + (e.costUSD || 0), 0);
  const totalVND = log.reduce((s, e) => s + (e.costVND || 0), 0);

  const modelMap = {};
  log.forEach(e => {
    if (!modelMap[e.model]) modelMap[e.model] = { calls: 0, tokens: 0, usd: 0 };
    modelMap[e.model].calls++;
    modelMap[e.model].tokens += e.totalTokens || 0;
    modelMap[e.model].usd += e.costUSD || 0;
  });
  const modelRows = Object.entries(modelMap).map(([m, s]) => `
    <div class="hst-set-brow">
      <span class="hst-set-name">${esc(m)}</span>
      <span class="hst-set-col" style="color:var(--text-muted)">${s.calls}</span>
      <span class="hst-set-col">${s.tokens.toLocaleString('vi-VN')}</span>
      <span class="hst-set-col">$${s.usd.toFixed(3)}</span>
    </div>`).join('');

  const logRows = log.slice(0, 50).map(e => `
    <div class="hst-set-brow">
      <span class="hst-set-name">${e.type === 'analysis' ? '🤖 Phân tích lộ trình' : esc(e.topic || e.setName || '—')}</span>
      <span class="hst-set-col" style="color:var(--text-muted)">${e.type === 'analysis' ? '—' : (e.questionsGenerated || 0) + 'c'}</span>
      <span class="hst-set-col">${(e.totalTokens || 0).toLocaleString('vi-VN')}</span>
      <span class="hst-set-col">$${(e.costUSD || 0).toFixed(4)}</span>
    </div>`).join('');

  el.innerHTML = `
    <div class="hst-stats-grid">
      <div class="hst-stat-card"><div class="hst-stat-val">${totalCalls}</div><div class="hst-stat-lbl">Lượt gọi</div></div>
      <div class="hst-stat-card"><div class="hst-stat-val">${totalQuestions}</div><div class="hst-stat-lbl">Câu đã tạo</div></div>
      <div class="hst-stat-card" style="grid-column:1/-1"><div class="hst-stat-val">${totalTokens.toLocaleString('vi-VN')}</div><div class="hst-stat-lbl">Tổng token</div></div>
      <div class="hst-stat-card hst-stat-accent"><div class="hst-stat-val">$${totalUSD.toFixed(3)}</div><div class="hst-stat-lbl">Chi phí (USD)</div></div>
      <div class="hst-stat-card hst-stat-green"><div class="hst-stat-val">${Math.round(totalVND).toLocaleString('vi-VN')}đ</div><div class="hst-stat-lbl">Chi phí (VND)</div></div>
    </div>
    <div class="hst-section-header" style="margin-top:12px"><div class="section-label">Theo model</div></div>
    <div class="hst-set-breakdown">
      <div class="hst-set-brow hst-set-head">
        <span class="hst-set-name">Model</span><span class="hst-set-col">Lượt</span><span class="hst-set-col">Token</span><span class="hst-set-col">USD</span>
      </div>
      ${modelRows}
    </div>
    <div class="hst-section-header" style="margin-top:12px"><div class="section-label">Lịch sử gần đây (${Math.min(log.length, 50)})</div></div>
    <div class="hst-set-breakdown">
      <div class="hst-set-brow hst-set-head">
        <span class="hst-set-name">Chủ đề</span><span class="hst-set-col">Câu</span><span class="hst-set-col">Token</span><span class="hst-set-col">USD</span>
      </div>
      ${logRows}
    </div>`;
}

/* ===== PHÂN TÍCH LỘ TRÌNH HỌC (1 lần gọi, dùng report .txt đã tóm tắt sẵn — tiết kiệm token) ===== */
function renderAiAnalysisBody(cached) {
  const el = document.getElementById('ai-analysis-body');
  if (!cached) {
    el.innerHTML = `<div class="empty-state"><div class="empty-icon">🤖</div><h3>Chưa phân tích</h3><p>Bấm "Phân tích lộ trình học" để AI nhận xét dựa trên dữ liệu của bạn</p></div>`;
    return;
  }
  el.innerHTML = `
    <p class="form-hint" style="margin-top:0">Phân tích lúc: ${fmtDate(cached.date)} · ${esc(cached.model)} · ${(cached.promptTokens + cached.completionTokens).toLocaleString('vi-VN')} tokens · $${cached.costUSD.toFixed(4)}</p>
    <div style="white-space:pre-wrap;line-height:1.6">${esc(cached.text)}</div>`;
}

function showAiAnalysisModal() {
  renderAiAnalysisBody(getAiAnalysis());
  document.getElementById('modal-ai-analysis').classList.add('active');
}
function hideAiAnalysisModal() {
  document.getElementById('modal-ai-analysis').classList.remove('active');
}

async function analyzeStudyReport(force) {
  const cached = getAiAnalysis();
  if (cached && !force) {
    showAiAnalysisModal();
    return;
  }

  const cfg = getAiConfig();
  if (!cfg.apiKey) {
    toast('Vui lòng nhập API key trong Cấu hình AI', 'error');
    showAiConfig();
    return;
  }
  const history = getHistory();
  if (!history.length) {
    toast('Chưa có dữ liệu lịch sử để phân tích', 'error');
    return;
  }

  const btn = document.getElementById('ai-analysis-refresh-btn');
  if (btn) btn.disabled = true;
  showAiAnalysisModal();
  const timer = _startElapsedTicker(s => {
    document.getElementById('ai-analysis-body').innerHTML = `<div class="empty-state"><div class="empty-icon">⏳</div><h3>Đang phân tích... (${s}s)</h3></div>`;
  });

  try {
    const reportJson = _buildExportJson(history, getSets(), getQuestionStats(), getSkillLog(), getTopicLog());
    const reportTxt = _buildReportTxt(reportJson);
    const model = cfg.model || 'gpt-4o-mini';
    const prompt = `Dưới đây là báo cáo học tập của một học viên:

${reportTxt}

Dựa vào báo cáo trên, hãy phân tích và trả lời NGẮN GỌN (tối đa ~300 từ), bằng tiếng Việt, không markdown, theo đúng 4 phần:
1. Nhận xét tổng quan (1-2 câu)
2. Điểm mạnh
3. Cần cải thiện
4. Lộ trình ôn tập gợi ý cho 1-2 tuần tới (gạch đầu dòng ngắn, cụ thể)`;

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + cfg.apiKey },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 500
      })
    });

    if (!res.ok) {
      if (res.status === 401) toast('API key không hợp lệ', 'error');
      else if (res.status === 429) toast('Hết quota hoặc bị giới hạn tốc độ (429)', 'error');
      else toast(`Lỗi API (${res.status})`, 'error');
      renderAiAnalysisBody(getAiAnalysis());
      return;
    }

    const json = await res.json();
    const text = json.choices && json.choices[0] && json.choices[0].message && json.choices[0].message.content;
    if (!text) { toast('AI không trả về nội dung', 'error'); renderAiAnalysisBody(getAiAnalysis()); return; }

    const usage = json.usage || {};
    const promptTokens = usage.prompt_tokens || 0;
    const completionTokens = usage.completion_tokens || 0;
    const { usd, vnd } = calcAiCost(model, promptTokens, completionTokens, cfg.fxRate);

    const result = { text: text.trim(), date: Date.now(), model, promptTokens, completionTokens, costUSD: usd, costVND: vnd };
    saveAiAnalysis(result);
    logAiUsage({
      id: uid(), date: Date.now(), model, type: 'analysis',
      questionsRequested: 0, questionsGenerated: 0,
      promptTokens, completionTokens, totalTokens: promptTokens + completionTokens,
      costUSD: usd, costVND: vnd
    });

    renderAiAnalysisBody(result);
    toast(`✅ Đã phân tích — $${usd.toFixed(4)} (~${Math.round(vnd).toLocaleString('vi-VN')}đ)`, 'success');
  } catch (err) {
    toast('Lỗi kết nối — kiểm tra mạng/API key', 'error');
    renderAiAnalysisBody(getAiAnalysis());
  } finally {
    clearInterval(timer);
    if (btn) btn.disabled = false;
  }
}
