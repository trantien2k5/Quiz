/* ===== ACTIVITY TRACKER ===== */
/* Đo thời gian học chủ động (loại trừ lúc treo máy/rời tab) + nhắc tập trung/nghỉ giải lao.
   Module độc lập, không biết gì về _quiz — quiz.js chỉ giữ 1 handle. */

const IDLE_WARNING_MS = 60000;            // không tương tác > 60s → cảnh báo sắp tạm dừng đếm
const IDLE_WARNING_REPEAT_MS = 5000;      // sau mốc 60s, lặp lại cảnh báo mỗi 5s cho tới khi quay lại/bị tạm dừng
const PAUSE_THRESHOLD_MS = 120000;        // không tương tác > 120s → ngừng ghi nhận thời gian học
const RESUME_NUDGE_THRESHOLD_MS = 120000; // chỉ nhắc tập trung nếu đã rời >= 2 phút
const POMODORO_MINUTES = 25;              // mốc nhắc nghỉ giải lao

function startActivityTracking({ onResumeNudge, onPomodoroBreak, onIdleWarning, onIdleResolved } = {}) {
  const state = {
    lastActiveAt: Date.now(),
    activeMs: 0,
    idleSince: null,
    lastIdleWarnAt: 0,
    pomodoroNotifiedAt: 0,
    tickInterval: null,
    stopped: false
  };

  const markActive = () => {
    if (state.idleSince != null) {
      const idleMs = Date.now() - state.idleSince;
      if (idleMs >= RESUME_NUDGE_THRESHOLD_MS && onResumeNudge) {
        onResumeNudge(Math.round(idleMs / 1000));
      }
      state.idleSince = null;
    }
    // Đang ở giữa chuỗi cảnh báo (đã từng bắn ít nhất 1 lần) mà giờ user thao tác lại →
    // báo cho caller đóng toast sticky + ngưng coi như "đã xử lý" (KHÁC onResumeNudge, cái
    // đó chỉ bắn khi rời >= 2 phút, còn cảnh báo bắt đầu từ 60s nên cần hook riêng)
    if (state.lastIdleWarnAt !== 0 && onIdleResolved) onIdleResolved();
    state.lastIdleWarnAt = 0;
    state.lastActiveAt = Date.now();
  };

  const onVisibilityChange = () => {
    if (document.visibilityState === 'hidden') {
      if (state.idleSince == null) state.idleSince = Date.now();
    } else {
      markActive();
    }
  };

  const activityEvents = ['mousemove', 'keydown', 'click', 'touchstart'];
  const listeners = activityEvents.map(type => {
    const fn = markActive;
    document.addEventListener(type, fn, { passive: true });
    return { target: document, type, fn };
  });
  document.addEventListener('visibilitychange', onVisibilityChange);
  listeners.push({ target: document, type: 'visibilitychange', fn: onVisibilityChange });

  state.tickInterval = setInterval(() => {
    const isVisible = document.visibilityState === 'visible';
    const idleMs = Date.now() - state.lastActiveAt;
    if (isVisible && idleMs <= PAUSE_THRESHOLD_MS) {
      state.activeMs += 1000;
      const pomodoroMark = Math.floor(state.activeMs / 60000 / POMODORO_MINUTES);
      if (pomodoroMark > state.pomodoroNotifiedAt) {
        state.pomodoroNotifiedAt = pomodoroMark;
        if (onPomodoroBreak) onPomodoroBreak();
      }
    } else if (state.idleSince == null) {
      state.idleSince = Date.now();
    }
    // Lặp lại cảnh báo mỗi IDLE_WARNING_REPEAT_MS kể từ mốc 60s — KHÔNG dừng ở mốc 120s
    // (mốc đó chỉ ngừng cộng activeMs, không liên quan tới việc còn cảnh báo hay không) —
    // chỉ dừng khi user thao tác lại thật (markActive() reset lastIdleWarnAt về 0)
    if (isVisible && idleMs >= IDLE_WARNING_MS
        && Date.now() - state.lastIdleWarnAt >= IDLE_WARNING_REPEAT_MS) {
      const isFirst = state.lastIdleWarnAt === 0;
      state.lastIdleWarnAt = Date.now();
      if (onIdleWarning) onIdleWarning(isFirst);
    }
  }, 1000);

  function getActiveSec() {
    return Math.round(state.activeMs / 1000);
  }

  function stop() {
    if (state.stopped) return getActiveSec();
    state.stopped = true;
    clearInterval(state.tickInterval);
    listeners.forEach(({ target, type, fn }) => target.removeEventListener(type, fn));
    return getActiveSec();
  }

  return { stop, getActiveSec };
}
