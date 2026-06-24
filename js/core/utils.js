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
  const tones = {
    correct: [{ freq: 880, at: 0 }, { freq: 1320, at: 0.08 }],
    wrong: [{ freq: 220, at: 0 }],
    levelup: [{ freq: 660, at: 0 }, { freq: 880, at: 0.1 }, { freq: 1100, at: 0.2 }]
  };
  (tones[type] || []).forEach(({ freq, at }) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = freq;
    osc.type = 'sine';
    gain.gain.setValueAtTime(0.15, ctx.currentTime + at);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + at + 0.15);
    osc.connect(gain).connect(ctx.destination);
    osc.start(ctx.currentTime + at);
    osc.stop(ctx.currentTime + at + 0.15);
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
