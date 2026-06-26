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

// "**bold**" / "*italic*" trên text ĐÃ esc() — esc() không đụng tới ký tự *, an toàn thay
// thế thành tag vì nội dung bên trong cặp ** /* đã được escape từ trước, không chèn HTML
// thô từ data người dùng.
function _mdInline(escaped) {
  return escaped
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>');
}

/* q.explanation là string tự do — có thể theo cấu trúc AI sinh ra (✅/🔍/📖, xem
   buildPromptText() ở ai.js) hoặc tự do (dán từ ngoài, nhập tay, không marker gì cả).
   Heuristic tách theo dòng "số. Tiêu đề" hoặc dòng bắt đầu bằng ✅/🔍/📖/💡/📌 thành các
   card riêng, dòng "A. từ (loại) ✅/❌" trong block "phân tích đáp án" được tách thêm
   thành mini-card màu xanh/đỏ. KHÔNG nhận diện được header nào (input quá khác biệt) →
   fallback hiển thị nguyên văn như trước, không vỡ layout. */
function renderExplanationHtml(text) {
  if (!text) return '';
  const lines = String(text).split('\n').map(l => l.trim()).filter(Boolean);
  // Character class [✅🔍📖💡📌] KHÔNG dùng được — 📖/💡/📌/🔍 nằm ngoài BMP (surrogate
  // pair, 2 code unit/ký tự), char class không có flag "u" tách nhầm theo từng nửa code
  // unit, ra ký tự rác "�". Dùng alternation (?:✅|🔍|📖|💡|📌) thay vì character class.
  const HEADER_EMOJI = '(?:✅|🔍|📖|💡|📌)';
  const HEADER_RE = new RegExp(`^(?:\\d+[.)]\\s*|${HEADER_EMOJI}\\s*)\\S`);
  const STRIP_EMOJI_RE = new RegExp(`^${HEADER_EMOJI}\\s*`);
  const OPTION_RE = /^([A-D])[.)]\s*(.+)$/;

  const blocks = [];
  let cur = null;
  lines.forEach(line => {
    if (HEADER_RE.test(line) && line.length < 80) {
      cur = { header: line.replace(/^\d+[.)]\s*/, '').replace(STRIP_EMOJI_RE, ''), body: [] };
      blocks.push(cur);
    } else {
      if (!cur) { cur = { header: null, body: [] }; blocks.push(cur); }
      cur.body.push(line);
    }
  });

  // Không tách được block nào có header (input quá tự do) → giữ hiển thị nguyên văn
  if (!blocks.some(b => b.header)) {
    return `<div class="exp-card exp-card-plain">${_mdInline(esc(text)).replace(/\n/g, '<br>')}</div>`;
  }

  return blocks.map(b => _renderExpBlock(b, OPTION_RE)).join('');
}

function _renderExpBlock(b, OPTION_RE) {
  const h = (b.header || '').toLowerCase();
  let icon = '📖', kind = 'explain';
  if (/đáp án đúng|^đáp án/.test(h)) { icon = '✅'; kind = 'answer'; }
  else if (/từng đáp án|phân tích.*đáp án/.test(h)) { icon = '📌'; kind = 'options'; }
  else if (/ghi nhớ|lưu ý/.test(h)) { icon = '💡'; kind = 'tip'; }

  const titleHtml = b.header ? `<div class="exp-card-title">${icon} ${esc(b.header)}</div>` : '';

  if (kind === 'options') {
    const items = [];
    let curItem = null;
    b.body.forEach(line => {
      const m = line.match(OPTION_RE);
      if (m) {
        curItem = { letter: m[1], rest: m[2], why: [] };
        items.push(curItem);
      } else if (curItem) {
        curItem.why.push(line);
      }
    });
    const itemsHtml = items.map(it => {
      const isCorrect = /✅/.test(it.rest);
      const isWrong = /❌/.test(it.rest);
      const cls = isCorrect ? 'correct' : isWrong ? 'wrong' : '';
      const restClean = it.rest.replace(/[✅❌]/g, '').trim();
      const mTag = restClean.match(/^(.*?)\*?\(([^)]*)\)\*?\s*$/);
      const word = mTag ? mTag[1].trim() : restClean;
      const tag = mTag ? mTag[2].trim() : '';
      const mark = isCorrect ? '✅' : isWrong ? '❌' : '';
      const whyHtml = it.why.length ? `<div class="exp-option-why">${_mdInline(esc(it.why.join(' ')))}</div>` : '';
      return `<div class="exp-option exp-option-${cls}">
        <div class="exp-option-head"><strong>${esc(it.letter)}. ${esc(word)}</strong>${tag ? ` <span class="exp-option-tag">${esc(tag)}</span>` : ''} ${mark}</div>
        ${whyHtml}
      </div>`;
    }).join('');
    return `<div class="exp-card exp-card-${kind}">${titleHtml}${itemsHtml}</div>`;
  }

  const bodyHtml = b.body.map(l => `<p>${_mdInline(esc(l))}</p>`).join('');
  return `<div class="exp-card exp-card-${kind}">${titleHtml}${bodyHtml}</div>`;
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

/* ===== TOAST ===== */
/* sticky=true: không tự ẩn sau 2.8s, trả về element để caller chủ động gọi dismissToast()
   khi muốn đóng (dùng cho cảnh báo treo máy — phải hiện tới khi user thao tác lại) */
function toast(msg, type, sticky) {
  const container = document.getElementById('toast-container');
  const t = document.createElement('div');
  t.className = 'toast' + (type === 'success' ? ' toast-success' : type === 'error' ? ' toast-error' : '');
  const icon = type === 'success' ? '✅' : type === 'error' ? '⚠️' : 'ℹ️';
  t.innerHTML = '<span class="toast-icon"></span><span class="toast-msg"></span>';
  t.querySelector('.toast-icon').textContent = icon;
  t.querySelector('.toast-msg').textContent = msg;
  container.appendChild(t);
  if (sticky) return t;
  setTimeout(() => {
    t.style.animation = 'toastOut 0.25s cubic-bezier(0.4, 0, 1, 1) forwards';
    setTimeout(() => t.remove(), 250);
  }, 2800);
}

function dismissToast(t) {
  if (!t || !t.isConnected) return;
  t.style.animation = 'toastOut 0.25s cubic-bezier(0.4, 0, 1, 1) forwards';
  setTimeout(() => t.remove(), 250);
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

/* ===== SOUND EFFECTS (Web Audio API — không cần file asset) ===== */
let _audioCtx = null;
function playSound(type) {
  if (!getSoundEnabled()) return;
  if (!_audioCtx) _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  const ctx = _audioCtx;
  // Chuông idle bắn từ setInterval (không phải click) — nếu đây là âm đầu tiên trong phiên,
  // trình duyệt có thể tạo AudioContext ở trạng thái 'suspended' và im lặng vĩnh viễn cho
  // tới khi được resume() chủ động (chưa từng gọi resume() ở đâu khác trong file này)
  if (ctx.state === 'suspended') ctx.resume();
  const tones = {
    correct: [{ freq: 880, at: 0 }, { freq: 1320, at: 0.08 }],
    wrong: [{ freq: 300, at: 0, dur: 0.2, type: 'square' }, { freq: 180, at: 0.12, dur: 0.2, type: 'square' }],
    levelup: [{ freq: 660, at: 0 }, { freq: 880, at: 0.1 }, { freq: 1100, at: 0.2 }],
    // Chuông cảnh báo treo máy/sao nhãng lúc luyện tập — 2 nốt cách xa nhau, dur dài hơn
    // (0.4s) để nghe rõ như tiếng chuông, khác hẳn correct/wrong/levelup (ngắn, dồn nhanh).
    // gain cao hơn mức chung (0.15) vì mục đích là GÂY CHÚ Ý đánh thức người dùng đang
    // treo máy, không phải feedback nhẹ nhàng như đúng/sai
    idle: [{ freq: 740, at: 0, dur: 0.4, gain: 0.35 }, { freq: 740, at: 0.5, dur: 0.4, gain: 0.35 }]
  };
  // wrong dùng 'square' + tần số thấp hơn (buzz rõ ràng) vì sine 220Hz ngắn quá nhỏ, dễ bị
  // lẫn/không nghe thấy trên loa điện thoại — vẫn giữ gain thấp để không chói
  (tones[type] || []).forEach(({ freq, at, dur = 0.15, type: oscType = 'sine', gain: gainLevel = 0.15 }) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = freq;
    osc.type = oscType;
    gain.gain.setValueAtTime(gainLevel, ctx.currentTime + at);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + at + dur);
    osc.connect(gain).connect(ctx.destination);
    osc.start(ctx.currentTime + at);
    osc.stop(ctx.currentTime + at + dur);
  });
}

/* ===== CONFETTI (pure CSS, không thư viện) ===== */
function triggerConfetti(count = 40) {
  const container = document.createElement('div');
  container.className = 'confetti-container';
  const colors = ['#FFC700', '#FF3D71', '#00C2FF', '#4ADE80', '#A78BFA'];
  for (let i = 0; i < count; i++) {
    const piece = document.createElement('div');
    piece.className = 'confetti-piece';
    piece.style.left = Math.random() * 100 + '%';
    piece.style.background = colors[i % colors.length];
    piece.style.animationDelay = (Math.random() * 0.4) + 's';
    piece.style.animationDuration = (1.8 + Math.random() * 1) + 's';
    container.appendChild(piece);
  }
  document.body.appendChild(container);
  setTimeout(() => container.remove(), 3200);
}

/* ===== FLOATING XP / COMBO BROKEN (practice mode HUD) ===== */
function showFloatingXp(text, isCrit) {
  const el = document.createElement('div');
  el.className = 'floating-xp' + (isCrit ? ' crit' : '');
  el.textContent = text;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 1200);
}

function showComboBrokenFlash() {
  const el = document.createElement('div');
  el.className = 'combo-broken-flash';
  el.textContent = '💥 Combo Broken';
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 1100);
}

function getISOWeek(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - (d.getDay() + 6) % 7);
  const w1 = new Date(d.getFullYear(), 0, 4);
  const wn = 1 + Math.round(((d - w1) / 86400000 - 3 + (w1.getDay() + 6) % 7) / 7);
  return `${d.getFullYear()}-W${String(wn).padStart(2, '0')}`;
}
