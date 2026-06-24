/* Game hóa practice mode — tách riêng khỏi quiz.js vì khu vực này dự kiến phát triển thêm
   (HUD/combo/level...). Đọc state từ _quiz (global, khai báo ở quiz.js) và các nguồn dữ
   liệu thật dùng chung (getXpLevelInfo ở history.js) — không lưu state riêng, file này
   chỉ render. */

/* Cột phải khi xoay ngang (xem .practice-hint-placeholder/.practice-stats-card trong
   quiz.css) — TẠM ẩn "Boss card" mockup đầy đủ (BOSS BATTLE/Boss HP/Lives/Coins/Hint/
   Mission/Reward, nhiều field chưa có data thật, nhìn rối), thay bằng 6 field thật sự
   cần lúc đang luyện tập (đã hỏi user, chốt theo gợi ý UX): Combo, Level+XP, Accuracy
   phiên hiện tại, Progress (số câu đã thuộc/tổng), Time. KHÔNG hiện Boss HP/Coin/Gem/
   Mission (chưa có hệ thống thật đứng sau) — tránh nhiễu lúc đang tập trung làm bài. */
function buildPracticeStatsCardHtml(total) {
  const masteredCount = _quiz.pMastered.filter(Boolean).length;
  const acc = _quiz.totalAttempts ? Math.round(_quiz.correctAttempts / _quiz.totalAttempts * 100) : 100;
  const xp = getXpLevelInfo(getHistory());
  return `
  <div class="practice-hint-placeholder practice-stats-card">
    <div class="practice-stats-level">
      <span>${xp.icon} Cấp ${xp.level}</span>
      <div class="boss-hp-bar-wrap"><div class="practice-hint-xp-fill" style="width:${xp.progress}%"></div></div>
      <span>${xp.xpIntoLevel}/${xp.xpNeeded} XP</span>
    </div>
    <div class="practice-stats-grid">
      <div class="practice-stats-item combo"><span>🔥</span><span>Combo</span><strong>${_quiz.combo >= 2 ? 'x' + _quiz.combo : '-'}</strong></div>
      <div class="practice-stats-item accuracy"><span>🎯</span><span>Accuracy</span><strong>${acc}%</strong></div>
      <div class="practice-stats-item progress"><span>📝</span><span>Progress</span><strong>${masteredCount}/${total}</strong></div>
      <div class="practice-stats-item time"><span>⏱</span><span>Time</span><strong id="practice-hud-timer-side">0:00</strong></div>
    </div>
  </div>`;
}
