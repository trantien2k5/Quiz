/* Game hóa practice mode — tách riêng khỏi quiz.js vì khu vực này dự kiến phát triển thêm
   (HUD/combo/level...). Đọc state từ _quiz (global, khai báo ở quiz.js) và các nguồn dữ
   liệu thật dùng chung (getXpLevelInfo/getDailyQuestProgress/devRow/devBadge ở history.js)
   — không lưu state riêng, file này chỉ render. */

/* "Boss card" cột phải khi xoay ngang (xem .practice-hint-placeholder/.boss-card trong
   quiz.css) — dựng theo mockup design, field có data thật lấy từ hệ thống (BKT mastery,
   _quiz.combo, accuracy, activityTracker, getXpLevelInfo, getDailyQuestProgress), field
   chưa có hệ thống (Lives/Coins/Hint, tên boss riêng, mission đa mục tiêu, Reward Chest)
   hiện devBadge() (đã hỏi user, chọn giữ đủ layout + đánh dấu phát triển thay vì ẩn) */
function buildBossCardHtml(total) {
  const masteredCount = _quiz.pMastered.filter(Boolean).length;
  const bossHp = Math.max(0, Math.round((1 - masteredCount / total) * 100));
  const acc = _quiz.totalAttempts ? Math.round(_quiz.correctAttempts / _quiz.totalAttempts * 100) : 100;
  const xp = getXpLevelInfo(getHistory());
  const quest = getDailyQuestProgress(getHistory());
  return `
  <div class="practice-hint-placeholder boss-card">
    <div class="boss-card-header">
      <span class="boss-card-label">⚔️ BOSS BATTLE</span>
      <span class="boss-card-lv">Lv.${xp.level}</span>
    </div>
    <div class="boss-hp-row"><span>❤️ Boss HP</span><span>${bossHp}%</span></div>
    <div class="boss-hp-bar-wrap"><div class="boss-hp-fill" style="width:${bossHp}%"></div></div>
    <div class="boss-card-sub">${masteredCount}/${total} câu đã chinh phục</div>

    <div class="boss-card-stats-row">
      <div class="boss-card-stat"><span>🔥</span><span>Combo</span><strong>${_quiz.combo >= 2 ? 'x' + _quiz.combo : '-'}</strong></div>
      <div class="boss-card-stat"><span>🎯</span><span>Accuracy</span><strong>${acc}%</strong></div>
      <div class="boss-card-stat"><span>⏱</span><span>Time</span><strong id="practice-hud-timer-side">0:00</strong></div>
    </div>

    <div class="boss-card-panel">
      <div class="boss-card-panel-title">⭐ Player Lv.${xp.level}</div>
      <div class="boss-hp-bar-wrap"><div class="practice-hint-xp-fill" style="width:${xp.progress}%"></div></div>
      <div class="boss-card-sub">${xp.xpIntoLevel}/${xp.xpNeeded} XP</div>
    </div>

    <div class="boss-card-mini-row">
      <span class="boss-card-mini-item">❤️ Lives ${devBadge()}</span>
      <span class="boss-card-mini-item">🪙 Coins ${devBadge()}</span>
      <span class="boss-card-mini-item">💡 Hint ${devBadge()}</span>
    </div>

    <div class="boss-card-panel">
      <div class="boss-card-panel-title">🎯 Nhiệm vụ hôm nay</div>
      <div class="boss-card-mission-line">${quest.done ? '✅' : '⬜'} Làm ${quest.target} câu <strong>${quest.current}/${quest.target}</strong></div>
      ${devRow('Đạt 95% Accuracy')}
      ${devRow('Không dùng Hint')}
    </div>

    ${devRow('🏆 Phần thưởng tiếp theo')}
  </div>`;
}
