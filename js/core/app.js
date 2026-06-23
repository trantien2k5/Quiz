const APP_V = 84;

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
const screens = ['screen-home', 'screen-library', 'screen-editor', 'screen-quiz', 'screen-result', 'screen-history'];

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
    ['quiz_sets','quiz_history','quiz_q_stats','quiz_last_set','quiz_ai_usage_log'].forEach(k => localStorage.removeItem(k));
    renderHome(); renderLibrary(); renderHistory();
    toast('Đã xoá toàn bộ dữ liệu', 'success');
  });
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
