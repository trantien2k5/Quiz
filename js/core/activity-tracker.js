/* ===== ACTIVITY TRACKER ===== */
/* Đo thời gian học chủ động (loại trừ lúc treo máy/rời tab) + nhắc tập trung/nghỉ giải lao.
   Module độc lập, không biết gì về _quiz — quiz.js chỉ giữ 1 handle. */

const IDLE_THRESHOLD_MS = 60000;          // không tương tác > 60s coi là idle
const RESUME_NUDGE_THRESHOLD_MS = 120000; // chỉ nhắc tập trung nếu đã rời >= 2 phút
const POMODORO_MINUTES = 25;              // mốc nhắc nghỉ giải lao

function startActivityTracking({ onResumeNudge, onPomodoroBreak } = {}) {
  const state = {
    lastActiveAt: Date.now(),
    activeMs: 0,
    idleSince: null,
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
    const isWithinIdleThreshold = Date.now() - state.lastActiveAt <= IDLE_THRESHOLD_MS;
    if (isVisible && isWithinIdleThreshold) {
      state.activeMs += 1000;
      const pomodoroMark = Math.floor(state.activeMs / 60000 / POMODORO_MINUTES);
      if (pomodoroMark > state.pomodoroNotifiedAt) {
        state.pomodoroNotifiedAt = pomodoroMark;
        if (onPomodoroBreak) onPomodoroBreak();
      }
    } else if (state.idleSince == null) {
      state.idleSince = Date.now();
    }
  }, 1000);

  function stop() {
    if (state.stopped) return Math.round(state.activeMs / 1000);
    state.stopped = true;
    clearInterval(state.tickInterval);
    listeners.forEach(({ target, type, fn }) => target.removeEventListener(type, fn));
    return Math.round(state.activeMs / 1000);
  }

  return { stop };
}
