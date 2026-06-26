const APP_V = 120;

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

/* ===== NAVIGATION ===== */
const screens = ['screen-home', 'screen-library', 'screen-editor', 'screen-import-text', 'screen-quiz', 'screen-result', 'screen-history', 'screen-settings'];

function showScreen(id) {
  screens.forEach(s => {
    const el = document.getElementById(s);
    if (el) el.classList.remove('active');
  });
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.add('active');

  const noNav = ['screen-quiz', 'screen-editor', 'screen-import-text', 'screen-result'];
  const nav = document.getElementById('bottom-nav');
  nav.style.display = noNav.includes(id) ? 'none' : 'flex';
}

function navTo(name) {
  _appendToSetId = null;     // tránh rò set "thêm câu vào" khi chuyển tab thẳng không qua nút Đóng
  _importTargetEditor = false; // tránh rò trạng thái "đang dán câu vào editor" tương tự
  document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
  const btn = document.querySelector(`[data-nav="${name}"]`);
  if (btn) btn.classList.add('active');
  if (name === 'home') { showScreen('screen-home'); renderHome(); }
  else if (name === 'library') { showScreen('screen-library'); renderLibrary(); }
  else if (name === 'history') { showScreen('screen-history'); renderHistory(); }
  else if (name === 'settings') { showScreen('screen-settings'); renderSettings(); }
}

function renderSettings() {
  const el = document.getElementById('settings-version');
  if (el) el.textContent = 'v' + APP_V;
  const soundToggle = document.getElementById('settings-sound-toggle');
  if (soundToggle) soundToggle.checked = getSoundEnabled();
}

function seedDefaultChapters() {
  // Lộ trình TOEIC B1 mặc định — seed 1 lần duy nhất, không tự thêm lại nếu user đã xoá
  if (localStorage.getItem('quiz_chapters_seeded_v1')) return;
  localStorage.setItem('quiz_chapters_seeded_v1', '1');
  const defaults = [
    { id: 'toeic-b1-stage-1', name: 'Giai đoạn 1 – Xây nền Part 5', icon: '📝', setIds: [] },
    { id: 'toeic-b1-stage-2', name: 'Giai đoạn 2 – Ngữ pháp trọng tâm', icon: '🧩', setIds: [] },
    { id: 'toeic-b1-stage-3', name: 'Giai đoạn 3 – Từ vựng TOEIC', icon: '📚', setIds: [] },
    { id: 'toeic-b1-stage-4', name: 'Giai đoạn 4 – Listening', icon: '🎧', setIds: [] },
    { id: 'toeic-b1-stage-5', name: 'Giai đoạn 5 – Reading', icon: '📖', setIds: [] }
  ];
  const chapters = getChapters();
  if (chapters.some(c => c.id === defaults[0].id)) return; // tránh trùng nếu hàm bị gọi lại
  saveChapters([...chapters, ...defaults]);
}

function confirmClearAllData() {
  confirm('Xoá toàn bộ dữ liệu', 'Tất cả bộ đề, lịch sử và thống kê sẽ bị xoá vĩnh viễn. Không thể khôi phục!', () => {
    ['quiz_sets','quiz_history','quiz_q_stats','quiz_last_set','quiz_ai_usage_log','quiz_ai_analysis_log','quiz_skill_log','quiz_topic_log'].forEach(k => localStorage.removeItem(k));
    renderHome(); renderLibrary(); renderHistory();
    toast('Đã xoá toàn bộ dữ liệu', 'success');
  });
}

/* ===== SAO LƯU / KHÔI PHỤC — gộp toàn bộ data học tập vào 1 file JSON. KHÔNG gồm
   quiz_ai_config (API key) — theo quy ước có sẵn "không thêm sync/export config ra
   ngoài" (xem quiz_ai_config ở storage.js), và quiz_last_set (chỉ là state UI tạm). */
const BACKUP_KEYS = ['quiz_sets','quiz_history','quiz_q_stats','quiz_skill_log','quiz_topic_log','quiz_chapters','quiz_stats_goal','quiz_sound_enabled','quiz_ai_usage_log','quiz_ai_analysis_log'];

function exportBackup() {
  const data = {};
  BACKUP_KEYS.forEach(k => { const v = localStorage.getItem(k); if (v !== null) data[k] = v; });
  const payload = { type: 'quiz_backup', version: APP_V, exportedAt: Date.now(), data };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `quiz_backup_${_nowStamp()}.json`;
  a.click();
  URL.revokeObjectURL(url);
  toast('Đã xuất file sao lưu', 'success');
}

function triggerRestoreBackup() {
  document.getElementById('restore-file-input').click();
}

function handleRestoreFile(e) {
  const file = e.target.files[0];
  e.target.value = '';
  if (!file) return;
  if (!file.name.endsWith('.json')) { toast('Vui lòng chọn file .json', 'error'); return; }
  const reader = new FileReader();
  reader.onload = ev => confirmRestoreBackup(ev.target.result);
  reader.readAsText(file);
}

function confirmRestoreBackup(jsonStr) {
  let payload;
  try { payload = JSON.parse(jsonStr); } catch { toast('File sao lưu không hợp lệ', 'error'); return; }
  const data = payload && payload.type === 'quiz_backup' && payload.data ? payload.data : null;
  if (!data) { toast('File sao lưu không hợp lệ', 'error'); return; }
  confirm('Khôi phục dữ liệu', 'Toàn bộ bộ đề, lịch sử, thống kê hiện tại sẽ bị THAY THẾ bằng dữ liệu trong file sao lưu. Không thể hoàn tác!', () => {
    BACKUP_KEYS.forEach(k => localStorage.removeItem(k));
    Object.keys(data).forEach(k => { if (BACKUP_KEYS.includes(k)) localStorage.setItem(k, data[k]); });
    renderHome(); renderLibrary(); renderHistory(); renderSettings();
    toast('Đã khôi phục dữ liệu', 'success');
  });
}

/* ===== INIT ===== */
document.addEventListener('DOMContentLoaded', () => {
  showScreen('screen-home');
  renderHome();
  renderLibrary();
  startUpdateCheck();
  seedDefaultChapters();

  document.getElementById('import-file-input').addEventListener('change', handleImportFile);
  document.getElementById('restore-file-input').addEventListener('change', handleRestoreFile);

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
