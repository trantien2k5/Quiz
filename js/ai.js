/* ===== AI CREATE ===== */
const AI_DEFAULTS = ['Từ loại TOEIC','Giới từ TOEIC','Từ vựng TOEIC','Tiếng Anh lớp 10','Toán THPT','Lịch sử Việt Nam','Java OOP cơ bản','Python cơ bản'];

let _appendToSetId = null;

function renderAiChips() {
  document.getElementById('ai-suggestions').innerHTML = AI_DEFAULTS.map(t =>
    `<button class="ai-chip" onclick="setAiTopic('${t.replace(/'/g,"&#39;")}')">
      ${esc(t)}
    </button>`
  ).join('');
}

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
