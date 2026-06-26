# CLAUDE.md — Quiz App

## QUY TẮC LÀM VIỆC (BẮT BUỘC)

**ĐỌC FILE NÀY TRƯỚC** — luôn đọc CLAUDE.md đầu mỗi session để nắm context, tránh hỏi lại.

**Mức 1 — NHANH (code ngay):** bug rõ, CSS tweak, đổi text, < ~30 dòng
**Mức 2 — VỪA (hỏi 1 lần rồi code):** thêm feature nhỏ, sửa logic 1-2 file
**Mức 3 — LỚN (dừng chờ duyệt từng bước):** thay đổi data model, flow, kiến trúc

**Khi user nói "code đi / làm đi / fix đi" → implement ngay không hỏi thêm.**

**User đã yêu cầu: cứ làm theo ý chính, KHÔNG hỏi xác nhận lại — trừ khi vấn đề lớn (Mức 3 thật sự mơ hồ) hoặc câu hỏi chưa rõ ràng tới mức không thể tự quyết định hợp lý.** Áp dụng cho cả request nhiều phần/phức tạp, không chỉ riêng fix nhỏ.

**4 nguyên tắc code (BẮT BUỘC, áp dụng mọi mức 1-2-3):**
1. **Suy nghĩ trước khi code** — phân tích kiến trúc liên quan, thuật toán/công thức cần dùng, và các edge case (data rỗng, ít dữ liệu, field thiếu ở data cũ) TRƯỚC khi viết dòng code đầu tiên. Không code-by-trial.
2. **Ưu tiên đơn giản** — không tự "vẽ" thêm tính năng/metric/toggle ngoài phạm vi user yêu cầu. Không thêm thư viện/dependency ngoài mà không hỏi (project hiện tại 0 dependency ngoài, giữ nguyên). Nếu thấy hướng đơn giản hơn vẫn đáp ứng đúng yêu cầu, ưu tiên hướng đó.
3. **Sửa "phẫu thuật"** — chỉ sửa đúng vị trí cần (hàm/đoạn liên quan đến bug hoặc feature). KHÔNG viết lại toàn bộ file hoặc đổi cấu trúc code đang chạy ổn định nếu user không yêu cầu refactor rõ ràng. Ngoại lệ: khi user tự đưa spec là "viết lại nguyên 1 section/trang" — đó vẫn phải khoanh đúng phạm vi section đó, không lan ra phần khác của file.
4. **Mục tiêu rõ + acceptance criteria** — trước khi code Mức 2/3, xác định rõ "xong là khi nào" (input/output cụ thể, hành vi mong đợi). Nếu request mơ hồ tới mức không tự suy ra được tiêu chí nghiệm thu, hỏi lại (dùng AskUserQuestion) thay vì tự đoán.

**Token tiết kiệm:**
- KHÔNG đọc dạo file để "hiểu context" — Grep đúng mục tiêu, Read đúng đoạn cần
- Sửa CSS/HTML không cần test. Sửa JS logic rõ ràng/đơn giản → đọc lại code kỹ là đủ, KHÔNG cần mở browser. CHỈ mở browser kiểm tra khi logic phức tạp/rủi ro cao (tính toán điểm, BKT, data model, flow nhiều bước) hoặc khi không tự tin chắc đúng
- Trả lời ngắn: kết quả + việc đã làm, không giải thích dài
- Sau mỗi thay đổi lớn → cập nhật CLAUDE.md ngay

**Git (BẮT BUỘC):**
- KHÔNG commit/push sau mỗi thay đổi nhỏ riêng lẻ — gộp nhiều việc nhỏ trong cùng phiên làm việc, chỉ commit + push khi user dừng lại / chuyển sang yêu cầu khác hẳn / chủ động bảo "push đi"
- Khi push: lên CÙNG LÚC cả `claude/vietnamese-greeting-q0n2ab` VÀ `main`
- `main` auto-deploy Cloudflare Pages — push là deploy
- Bump cache version `?v=N` trong index.html + sw.js — chỉ cần bump 1 LẦN trước khi commit (không bump mỗi sửa nhỏ giữa session)
- Script tự động: `node scripts/bump.js` (bump version.json, sw.js, index.html, js/core/app.js)
- KHÔNG tạo PR, KHÔNG subscribe PR activity

---

## DỰ ÁN

**Quiz App** — SPA trắc nghiệm chạy trên browser, không cần server.
- Vanilla HTML + CSS + JS, không framework, không build tool
- Lưu trữ: `localStorage` (`quiz_sets`, `quiz_history`)
- Deploy: Cloudflare Pages — version hiện tại: **v118**

---

## KIẾN TRÚC FILE

```
index.html              ← shell duy nhất, load tất cả <script>/<link>
manifest.json           ← PWA manifest (phải ở root)
sw.js                   ← Service Worker (phải ở root)
version.json            ← { "v": N } — dùng để detect update
CLAUDE.md               ← file này

css/
  base/
    tokens.css          ← design tokens (colors, spacing, typography, z-index, transitions)
    reset.css           ← box-sizing reset, base element styles
  layout/
    shell.css           ← .app, section screens, .scroll-content
    nav.css             ← .top-bar, #bottom-nav, .nav-item
  components/
    button.css          ← .btn + modifiers, ripple, .btn-icon
    form.css            ← .form-group, .form-control, .form-hint, .form-row
    toggle.css          ← .toggle, .toggle-slider
    badge.css           ← .badge + variants
    modal.css           ← .modal-overlay, .modal-sheet
    toast.css           ← .toast-container, .toast
    update-banner.css   ← .update-banner / #update-banner
    fab.css             ← .fab
    card.css            ← .set-list, .set-card, .empty-state
    section-label.css   ← .section-label, .section-row, .link-btn
    drop-zone.css       ← .import-drop-zone
    settings-row.css    ← .settings-row (quiz settings modal)
  pages/
    home.css            ← .stat-box, .recent-set-item, .recent-history-item
    editor.css          ← .question-card, .option-row, .add-question-btn
    quiz.css            ← .quiz-header, .option-btn, .qmap-*, practice mode
    results.css         ← .result-hero, .review-card, .review-option
    history.css         ← .hst-*, .cal-*, .hst-log-*, .history-score-circle
    ai.css              ← .ai-card, .ai-chip, .ai-suggestions
    import.css          ← .question-card.has-error, .import-error-banner, .import-format-hint
  utilities/
    utilities.css       ← .hidden, .text-center, .mt-*, .flex, .truncate
    animations.css      ← @keyframes (ripple-expand, toast-in, fadeIn...)

js/
  core/
    app.js              ← init, routing, showScreen, navTo, APP_V
    storage.js          ← localStorage CRUD (getSets, saveSet, getHistory...)
    utils.js            ← esc, toast, confirm, date helpers
    activity-tracker.js ← startActivityTracking() — đo active time, idle/Pomodoro nhắc nhở
  home.js               ← renderHome()
  library.js            ← renderLibrary(), set cards, import/export
  quiz.js               ← quiz state, timer, submit, scoring
  gamification.js        ← buildPracticeStatsCardHtml() — cột phải practice mode khi xoay ngang, 6 field thật (Combo/Accuracy/Progress/Time/Level+XP), KHÔNG hiện Boss HP/Coin/Mission (chưa có hệ thống thật, đã thử bản mockup đầy đủ rồi bỏ vì rối — xem GOTCHAS). Đọc state từ _quiz (global ở quiz.js) — PHỤ THUỘC quiz.js, load SAU
  history.js            ← renderHistory(), showHistorySection(), helper chung (XP/level, chart SVG, compare, BKT...), + các tab nhỏ (Lỗi sai/Ghi nhớ/Hiệu suất/Hành vi học/Lịch sử/So sánh/Dự đoán/Báo cáo/Cài đặt) — 1886 dòng cũ đã tách, file gốc còn ~1290 dòng
  history-progress.js   ← tách từ history.js: riêng tab Tiến bộ (filter, chart, personal best, prediction) — PHỤ THUỘC helper chung ở history.js, phải load SAU
  history-analysis.js   ← tách từ history.js: riêng tab Phân tích (theo chủ đề/bộ đề, skill stats) — PHỤ THUỘC helper chung ở history.js, phải load SAU
  editor.js             ← editor screen (tạo/sửa bộ đề)
  results.js            ← results screen, review chi tiết
  ai.js                 ← AI integration (generate questions)
  import-text.js        ← parse văn bản thô (định dạng Azota) → preview/sửa lỗi → tạo đề

assets/
  icon-192.svg
  icon-512.svg

scripts/
  bump.js               ← dev: node scripts/bump.js → bump version tất cả file

data/
  index.json            ← { "sets": [ "sets/xxx.json", ... ] } — danh sách bộ đề mẫu đóng gói cùng app
  sets/*.json            ← từng file 1 Set (đúng format DATA MODEL quiz_sets)
```

**Global scope** — không có module system, tất cả function là global. Đặt tên cẩn thận, tránh trùng.

**Bộ đề mẫu (`data/`)**: `seedSampleSets()` (js/core/app.js, gọi 1 lần ở `DOMContentLoaded`) fetch `data/index.json` + từng file trong `data/sets/`, tự `saveSet()` vào `quiz_sets` cho set nào CHƯA từng seed (track qua `quiz_seeded_sample_ids` trong localStorage — seed 1 lần/id, user xoá đi sẽ KHÔNG tự thêm lại). Thêm bộ đề mẫu mới: tạo file JSON trong `data/sets/`, thêm path vào `data/index.json` — tự xuất hiện ở Luyện đề cho mọi user (cũ và mới) ở lần load app kế tiếp, không cần sửa code.

---

## 4 TAB NAVIGATION

```
navTo('home')     → screen-home     (Trang chủ — dashboard)
navTo('library')  → screen-library  (Luyện đề — AI + kho đề)
navTo('history')  → screen-history  (Kết quả — stats + lịch sử)
navTo('settings') → screen-settings (Cài đặt — AI config/usage, import/export, xoá dữ liệu, version)
```

Các screen overlay (ẩn bottom nav khi hiện):
- `screen-editor`      — tạo/sửa bộ đề
- `screen-import-text` — dán văn bản thô (Azota) → preview/sửa lỗi → tạo đề
- `screen-quiz`        — đang làm bài
- `screen-result`      — xem kết quả

`showScreen(id)` trong `screens[]` array (`js/core/app.js`) — thêm screen mới phải thêm vào array này.

**History sub-screens** (`showHistorySection(name)`, mảng `HST_SECTIONS` trong js/history.js — tên hiển thị do user định nghĩa, không tự đổi):
`hst-home` (lưới `#hst-nav-grid`, 12 card) → `overview`=Dashboard, `progress`=Tiến bộ, `analysis`=Phân tích, `mistakes`=Lỗi sai, `memory`=Ghi nhớ, `performance`=Hiệu suất, `behavior`=Hành vi học, `log`=Lịch sử, `compare`=So sánh, `predict`=Dự đoán, `report`=Báo cáo, `settings`=Cài đặt thống kê.

**XP/Level là số thật** (không phải mock): `getXpLevelInfo(history)` suy ra từ `quiz_history` mỗi lần render (không lưu field riêng). Công thức ở `XP_PER_CORRECT/WRONG/SESSION/STREAK_DAY` (+10/+2/+50/+20) và `xpThresholdForLevel()` (L1=0, L2=100, mỗi level sau +50) — sửa công thức thì sửa đúng 2 chỗ này. `calcXpForEntries()` là điểm tính XP DUY NHẤT, tái dùng ở Dashboard/Tiến bộ/Dự đoán.

**Game hóa nhẹ (animation)**: `js/quiz.js` (`submitQuiz()`/`_savePracticeResults()`) so `getXpLevelInfo(history).level` TRƯỚC và SAU `addHistoryEntry()` — tăng level thì gọi `showLevelUpCelebration(xpInfo)` (js/history.js) mở `#level-up-overlay` (tự ẩn sau 3s hoặc click, CSS ở `css/components/level-up.css`). Đáp án đúng ở practice mode (`.option-btn.correct-ans`) có animation `option-pop` (đã định nghĩa sẵn trong `animations.css`, trước đây chưa dùng tới) — thêm hiệu ứng mới thì ưu tiên tái dùng keyframe có sẵn trước khi tạo keyframe mới. Combo streak (`_quiz.combo`, tăng khi đúng liên tiếp trong practice, reset về 0 khi sai) hiện badge "🔥 Combo xN" khi ≥2 — set/reset trong `selectAnswer()` nhánh practice. `playSound(type)` (js/core/utils.js, Web Audio API thuần — không cần file asset) phát tiếng `correct`/`wrong`/`levelup`, tắt/mở qua `getSoundEnabled()`/toggle ở Cài đặt > Trải nghiệm (mặc định bật). `triggerConfetti()` (utils.js, CSS thuần) gọi khi `renderResult()` (js/results.js) thấy điểm thi 100% — KHÔNG áp dụng cho practice (mastered/skipped khác khái niệm % so với exam).

**Hành trình học (Chapter)** — nhóm bộ đề user tự gán theo thứ tự, bản thân tính năng KHÔNG gắn cứng theo TOEIC/môn học cụ thể (đã hỏi user, chọn generic). Data: `quiz_chapters` (storage.js `getChapters()`/`saveChapters()`) — mỗi Chapter `{id,name,icon,setIds}`. CRUD + modal quản lý (`showChapterManager()`, `addChapter()`/`editChapter()`/`deleteChapter()`/`moveChapter()`, modal `#modal-chapter-manager`/`#modal-chapter-edit`) đều ở `js/library.js` — entry point ở Cài đặt > "Quản lý Chapter". `getChapterProgress(chapter)` (library.js) = % bộ đề trong Chapter có `getBestScore() >= 80`, `mastered` khi đạt 100% bộ đề (Chapter rỗng `setIds` luôn `mastered:false` → khoá vĩnh viễn Chapter sau, đúng ý "chưa có nội dung thì chưa qua được"). Hiển thị ở Dashboard qua `renderJourneyMapHtml()` (js/history.js) — Chapter sau chỉ hiện khoá `🔒` (CSS `.journey-chapter.locked`, chỉ mang tính trực quan/động viên, KHÔNG chặn thật việc vào làm bộ đề ở Library) nếu Chapter ngay trước chưa `mastered`. `seedDefaultChapters()` (js/core/app.js, gọi 1 lần ở `DOMContentLoaded`, track qua `quiz_chapters_seeded_v1`) seed sẵn lộ trình "TOEIC B1" 5 Chapter theo yêu cầu user (Giai đoạn 1 Xây nền Part 5 → ... → Giai đoạn 5 Reading) — chỉ Giai đoạn 1 có set thật (`sample-word-form-toeic-1`), 4 giai đoạn sau để trống `setIds`, thêm bộ đề mới cho từng giai đoạn thì sửa trực tiếp Chapter qua UI (Cài đặt > Quản lý Chapter) hoặc thêm setId vào đúng Chapter trong code seed.

**Nhiệm vụ hàng ngày (Daily Quest)**: `getDailyQuestProgress(history)` (js/history.js) tính thẳng từ `quiz_history` lọc theo ngày hôm nay (KHÔNG lưu state riêng) — mục tiêu cố định `DAILY_QUEST_TARGET=20` câu/ngày. Toast chúc mừng chỉ hiện 1 lần/ngày qua `sessionStorage` key `quiz_quest_celebrated` (không phải localStorage — reset mỗi session là chủ ý, tránh phải thêm field mới vào data model).

**Practice HUD (Boss HP/Combo/Accuracy/Critical Hit)** — CHỈ áp dụng practice mode, KHÔNG đổi exam mode. `#quiz-practice-hud` (index.html) thay thế `.quiz-progress-bar`/`#quiz-counter`/`#quiz-timer` khi practice (toggle hiện/ẩn ở `startPractice()`/`startQuiz()` — đổi 1 trong 2 hàm này thì phải đổi cả hàm kia để không lệch trạng thái khi tái dùng `#screen-quiz`). `updatePracticeHud()` (js/quiz.js, gọi từ `updateQuizCounterDisplay()` nhánh practice) tính: Boss HP = `(1 - mastered/total)*100` (giảm khi pL BKT vượt ngưỡng mastered — KHÔNG giảm ngay lúc trả lời đúng, vì mastery là BKT spaced-repetition, có thể cần nhiều lần đúng mới đủ ngưỡng — do đó feedback mỗi câu chỉ ghi "⚔️ Đánh trúng Boss!" chung, không ghi số HP cụ thể để tránh sai lệch với thanh HP thật), Accuracy live = `correctAttempts/totalAttempts` (đếm mọi lần trả lời trong phiên, kể cả câu lặp lại do SRS chèn lại — khác `pMastered`), near-finish banner khi còn ≤3 câu chưa xong. `_quiz.combo` (tăng đúng liên tiếp, reset khi sai) → Critical Hit nếu `rt<3000ms` HOẶC combo chia hết 3, hiện `showFloatingXp()`/`showComboBrokenFlash()` (js/core/utils.js, `position:fixed` gắn vào `document.body` — KHÔNG gắn trong `#quiz-questions-content` vì DOM đó bị `innerHTML` ghi đè ngay sau mỗi câu). Critical Hit "+15 XP" CHỈ là số hiển thị nổi (cosmetic, không persist) — XP thật vẫn tính qua `calcXpForEntries()` (nguồn duy nhất), không đổi công thức XP_PER_CORRECT thật. ĐÃ CHỦ ĐỘNG BỎ theo yêu cầu: Reward Milestone/Chest (trùng hướng Badge/cosmetic đã quyết định không mở rộng thêm), Danger Zone (practice dùng đếm-lên active time, không có countdown nên "sắp hết giờ" không áp dụng — chỉ hợp lý cho exam mode nếu sau này được yêu cầu).

**Mục chưa có chức năng/data thật vẫn hiện trong UI** kèm `devRow()`/`devBadge()` (badge cam "🚧 Đang phát triển") thay vì ẩn đi — gồm: Avatar/Rank, AI Insight thật (hiện là heuristic `generateInsights()`), tag Part/từ loại/ngữ pháp/CEFR/độ khó/loại câu/nguồn (đã hỏi user, xác nhận bỏ qua — KHÔNG tự thêm field tag câu hỏi nếu chưa hỏi lại), Forgetting Curve, Precision/Recall/Confidence/Fatigue Score, Calendar/Replay/Ghi chú, PDF/Excel/Đồng bộ/Sao lưu. Phải hỏi user trước khi build thật bất kỳ mục nào ở đây.

**Helper tính toán dùng chung** (js/history.js, tái dùng trước khi viết hàm mới): `compareTimePeriods(history,unit)`, `calcStdDev/median/linearRegressionPredict`, `getMemoryBuckets()` (đọc `quiz_q_stats` BKT `pL`), `getTopConfusedAnswers()`/`getConsecutiveWrongStreaks()`/`getFixStatus()`, `computeCoreMetrics()` (accuracy/velocity/efficiency/consistency/focus — dùng chung Dashboard+Hiệu suất+Hành vi học), `computeSetStats()` (nguồn tính duy nhất theo set), `predictLevelETA()`/`getGoalProgress()` (dùng chung Dự đoán + Tiến bộ), `getAchievementBadges()`/`getLongestStreakEver()` (badge tính thật từ history, không phải data giả), `getPersonalBests()`, `showDayDetail()`/`hideDayDetail()` (popup chi tiết ngày, dùng chung Dashboard heatmap + XP-by-day chart ở Tiến bộ).

**Tiến bộ (js/history-progress.js) & Phân tích (js/history-analysis.js)**: mỗi tab có bộ lọc riêng persistent (`_progressFilter`/`_analysisFilter`: range `7d|30d|90d|6m|1y|all` + bộ đề/chủ đề) — đổi filter chỉ re-render phần chart (`renderProgressCharts()`/`renderAnalysisBody()`), KHÔNG render lại filter bar (giữ DOM, không mất giá trị select). `getProgressFilteredHistory()` cache theo chữ ký filter, không tính lại nếu filter chưa đổi. Phân tích chỉ "Theo chủ đề" (`computeSkillStats()` — khác `computeWeakSkills()` ở tab Lỗi sai, đừng gộp 2 hàm) và "Theo bộ đề" có data thật, 7 mục còn lại là `devRow()`. Click 1 dòng → `showSkillDetail()`/`showSetDetail()` mở `#modal-analysis-detail` chung. Nhóm `<10 câu` hiện "Dữ liệu chưa đủ để đánh giá."

**Khác**: `getStatsGoal()`/`saveStatsGoal()` (storage.js) lưu mục tiêu accuracy trong `quiz_stats_goal`, dùng ở Dự đoán + Cài đặt thống kê.

---

## DATA MODEL (localStorage)

**`quiz_sets`** — array bộ đề:
```js
{
  id, name, description, timeLimit,  // timeLimit: phút | null
  createdAt,
  questions: [{
    id, text,
    options: [str, str, str, str],   // luôn đúng 4 phần tử
    correct: 0|1|2|3,                // index đáp án đúng
    explanation: str                 // giải thích (có thể rỗng)
  }]
}
```

**`quiz_history`** — array lịch sử:
```js
{ id, setId, setName, score, total, timeTaken, activeTimeSec, date, mode: 'exam'|'practice', answers: [0|1|2|3|null], responseTimes }
// activeTimeSec: number|null — thời gian học CHỦ ĐỘNG (loại trừ treo máy/rời tab), entry cũ không có field này → null
// timeTaken: wall-clock giây (Date.now() - startTime lúc nộp/thoát) — giữ nguyên ý nghĩa cũ, không đổi
```

**`quiz_ai_config`** — cấu hình gọi AI trực tiếp (js/ai.js):
```js
{ apiKey, model: 'gpt-4o-mini'|'gpt-4o', fxRate: number /* VND/USD */, fxUpdatedAt: ts|null }
```

**`quiz_ai_usage_log`** — array log mỗi lượt gọi OpenAI API (giữ max 500):
```js
{ id, date, model, type: 'generate'|'analysis' /* thiếu field = 'generate' */, topic, setName,
  questionsRequested, questionsGenerated, promptTokens, completionTokens, totalTokens, costUSD, costVND }
```

**`quiz_ai_analysis_log`** — array log các lần phân tích lộ trình học (giữ max 20, xem lại được):
```js
{ id, text, action: {type:'redo',setId,label} | {type:'create',topic,label} | null,
  date, model, promptTokens, completionTokens, costUSD, costVND }
```

**`quiz_skill_log`** / **`quiz_topic_log`** — object log tiến độ đúng/sai theo ngày, key = tên skill/topic (`js/core/storage.js: appendSkillLog()/appendTopicLog()`):
```js
{ [skillOrTopicName]: { [date]: { c: số câu đúng, w: số câu sai } } }
```

**`quiz_chapters`** — array Chapter (Hành trình học), thứ tự trong array = thứ tự hiển thị:
```js
{ id, name, icon, setIds: [setId, ...] }
```

---

## API CHEATSHEET — hàm có sẵn, KHÔNG viết lại

**Storage** (`js/core/storage.js`):
```js
getSets()                    // → Set[]
saveSets(sets)
getHistory()                 // → HistoryEntry[]
getSet(id)                   // → Set | null
saveSet(set)                 // upsert theo id
deleteSet(id)                // xóa set + history liên quan
addHistoryEntry(entry)       // prepend, giữ max 500
getBestScore(setId)          // → pct | null
getAiConfig() / saveAiConfig(cfg)        // API key, model, tỷ giá
getAiUsageLog() / logAiUsage(entry)      // prepend, giữ max 500
getAiAnalysisLog() / addAiAnalysisLog(entry)   // prepend, giữ max 20 — log các lần phân tích để xem lại
```

**AI** (`js/ai.js`):
```js
generateDirectly()           // gọi OpenAI API trực tiếp bằng key đã lưu, tự nhập câu hỏi + log usage
applyAIQuestions(data, fallbackName)   // áp dụng JSON câu hỏi vào set — dùng chung cho paste-tay (importAIText) và gọi API (generateDirectly)
calcAiCost(model, promptTokens, completionTokens, fxRate)  // → {usd, vnd}
showAiConfig() / showAiUsage()          // mở modal cấu hình / thống kê dùng AI
analyzeStudyReport(force)    // phân tích lộ trình học (xem log nếu có, force=true mới gọi API lại)
viewAiAnalysisEntry(id)       // xem lại 1 lần phân tích cũ trong log
quickCreateFromAnalysis(topic) // mở modal AI, điền sẵn yêu cầu theo gợi ý từ phân tích
```

**Chapter / Hành trình học** (`js/library.js`):
```js
getChapterProgress(chapter)   // → {done,total,pct,mastered} dựa getBestScore() >= 80 mỗi set trong chapter
showChapterManager() / hideChapterManager()      // modal danh sách Chapter
addChapter() / editChapter(id) / deleteChapter(id) / moveChapter(idx, dir)
saveChapterDraft()             // lưu _chapterDraft (đang sửa) vào quiz_chapters
```

**Import text** (`js/import-text.js`):
```js
openImportText(appendSetId)  // mở screen-import-text, set _appendToSetId (dùng chung biến với ai.js)
parseAzotaText(raw)          // text thô → array câu hỏi {text,options,correct,explanation,_error}
commitImportText()           // lọc câu hợp lệ (!q._error) → applyAIQuestions() tạo/thêm vào set
```

**Render** (gọi sau khi mutate data):
```js
renderHome()       // js/home.js
renderLibrary()    // js/library.js
renderHistory()    // js/history.js
```

**Navigation** (`js/core/app.js`):
```js
navTo('home' | 'library' | 'history')   // chuyển tab + refresh content
showScreen('screen-xxx')                 // chuyển màn không refresh data
showHistorySection('overview'|'progress'|'analysis'|'mistakes'|'memory'|'performance'|'behavior'|'log'|'compare'|'predict'|'report'|'settings')
showHistoryHome()                        // về hst-home
```

**UI utils** (`js/core/utils.js`):
```js
toast('message', 'success'|'error'|'')  // thông báo nổi
confirm('title', 'msg', onOkFn)         // dialog xác nhận custom
esc(str)                                 // escape HTML — BẮT BUỘC khi render user data
```

**Quiz** (`js/quiz.js`):
```js
showQuizSettings(setId)    // mở modal cài đặt trước khi làm bài
startQuiz(set, settings)   // bắt đầu quiz với settings {shuffleQ, shuffleOpts, numQ}
```

---

## PATTERN THÊM TÍNH NĂNG

### Thêm field mới vào câu hỏi
1. `buildQuestionCard()` trong `js/editor.js` — thêm input field
2. `addQuestion()` — thêm default value
3. `saveEditor()` — map field khi lưu
4. `buildSetCard()` / kết quả — hiện field nếu cần
5. `importSetsFromData()` — parse field từ JSON import

### Thêm section vào tab
- Home: thêm element vào `screen-home` (index.html), render trong `renderHome()` (js/home.js)
- Library: thêm vào `screen-library`, render trong `renderLibrary()` (js/library.js)
- History: thêm vào `screen-history`, render trong `renderHistory()` (js/history.js)

### Thêm tab mới
1. Thêm `<button data-nav="name">` vào `#bottom-nav` trong index.html
2. Thêm `<section id="screen-name">` vào index.html
3. Thêm `'screen-name'` vào `screens[]` trong `js/core/app.js`
4. Thêm `else if (name === 'name') { ... }` vào `navTo()` trong `js/core/app.js`

### Thêm modal mới
1. Thêm `<div id="modal-xxx" class="modal-overlay">` vào index.html
2. Thêm functions `showXxx()` / `hideXxx()` vào file JS tương ứng (toggle class `active`)

---

## CSS CONVENTIONS (v71+)

**Quy tắc CSS chung bổ sung (áp dụng cho code mới/sửa, không bắt buộc refactor retroactive — phần file/token/class-prefix đã có ở KIẾN TRÚC FILE + token list dưới, không lặp lại ở đây):**
- Mobile-first (`min-width` media queries)
- Quy ước đặt tên class nhất quán (BEM hoặc tương tự), 1 class = 1 trách nhiệm
- Hạn chế selector lồng sâu (tối đa 2–3 cấp), giữ specificity thấp
- Ưu tiên class hơn ID; tránh style inline (ngoại lệ thực tế: layout 1-lần/sửa nhanh trong index.html vẫn dùng `style=""` — không bắt buộc dọn lại trừ khi đang sửa đúng đoạn đó)
- `%`, `fr`, `vw`, `clamp()` cho layout responsive; Flexbox cho layout 1 chiều, Grid cho layout 2 chiều
- Utility class cho style lặp lại; không lặp code, trích xuất style chung
- Tách state bằng class (`.is-active`, `.is-open`, `.is-hidden`...) — KHÔNG nhầm với `.active` đã dùng cho screen/modal/nav-item hiện tại, giữ nguyên convention cũ khi sửa code cũ
- Luôn có style cho `:hover`, `:focus-visible`, `:disabled`
- Hạn chế `height`/`width` cố định khi không cần; dùng `max-width` thay `width` cho container
- Tránh margin chồng chéo, ưu tiên `gap`; dùng `aspect-ratio` khi cần giữ tỷ lệ
- Không viết CSS phụ thuộc thứ tự DOM
- Gom media query theo component (viết ngay trong file của component đó, không tách file riêng)
- Animation tiết kiệm, ưu tiên `transform`/`opacity`
- Thứ tự property trong 1 rule: Layout → Box Model → Typography → Visual → Animation
- Comment chỉ cho logic phức tạp (lý do/constraint ẩn), không comment hiển nhiên

**Design tokens** (`css/base/tokens.css`) — dùng tên semantic, KHÔNG dùng tên primitive:
```css
/* Brand / semantic colors */
--color-brand        --color-brand-dark    --color-brand-light
--color-success      --color-success-light
--color-danger       --color-danger-light
--color-warning      --color-warning-light

/* Surface */
--color-bg           --color-surface       --color-border    --color-border-focus
--color-text         --color-text-muted    --color-text-light

/* Spacing (rem) */
--space-1 (0.25rem) ... --space-16 (4rem)

/* Typography */
--text-2xs (11px) ... --text-4xl (28px)
--fw-normal ... --fw-black

/* Shape */
--radius (16px)      --radius-sm (10px)   --radius-xs (6px)   --radius-full
--shadow-sm          --shadow-md

/* Layout */
--nav-h: var(--space-16)    --top-h: var(--space-14)    --max-w: 42.5rem

/* Transitions */
--transition-fast (0.1s)  --transition-base (0.15s)  --transition-slow (0.3s)
```

**Z-index** — dùng biến, không ghi số:
```
--z-base: 0      --z-top-bar: 10    --z-sub: 20
--z-nav: 100     --z-modal: 200     --z-toast: 300    --z-banner: 9999
```

- Đơn vị: **rem** (không px), trừ border width (1px/2px OK)
- KHÔNG dùng `!important` — locked options dùng `pointer-events: none` thay thế
- Class prefix: `.set-*`, `.quiz-*`, `.result-*`, `.recent-*`, `.hst-*`, `.ai-*`
- Button base: `.btn` + modifier `.btn-primary / -secondary / -danger / -outline / -sm / -full`
- Ripple effect tự động qua class `.btn`
- Breakpoint: 37.5rem = 600px (hard-code vì CSS vars không dùng được trong @media)
- Breakpoint PC riêng: 48rem = 768px (đổi nav→sidebar, mobile-first) và 64rem = 1024px (`.quiz-side-map` lúc làm bài) — xem "PC RESPONSIVE" dưới

---

## PC RESPONSIVE (v107+, mobile-first — KHÔNG dùng position để căn layout, ưu tiên CSS Grid + clamp())

**Kiến trúc:** `#bottom-nav` và `#app` đều là con trực tiếp của `<body>` (xem index.html) — từ `48rem` (768px), `body` trở thành **CSS Grid 2 cột** (`css/layout/shell.css`): `grid-template-columns: clamp(13rem,13vw,15rem) minmax(0,1fr)`. `#bottom-nav` tự nhiên là cột 1 (sidebar), `#app` là cột 2 (main content, co giãn `1fr` — KHÔNG width cố định). Toàn grid giới hạn `max-width:100rem` (1600px, tránh quá dãn ở 2K/4K) + `margin:0 auto` canh giữa. `gap:0`, KHÔNG có padding ngoài — edge-to-edge thật (kiểu Discord/Notion/Slack, user yêu cầu bỏ "đệm trắng khung bao ngoài cùng"), `#app`/`#bottom-nav` không bo góc/đổ bóng nữa (chạm sát viền `body` nên bo góc sẽ lộ góc trắng). Phân tách sidebar/content chỉ bằng `border-right` ở `#bottom-nav` (nav.css), không dùng shadow.

`#update-banner` là `position:fixed` → tự thoát khỏi grid (không tính là 1 trong 2 cột), không ảnh hưởng layout.

**Khi nav bị ẩn** (quiz/editor/dán văn bản/kết quả — mảng `noNav` trong `showScreen()`, js/core/app.js): `body:has(#screen-quiz.active)` (+ 3 screen khác) đổi `grid-template-columns: minmax(0,1fr)` để cột sidebar KHÔNG để trống (track grid vẫn chiếm chỗ dù item display:none, phải tự đổi số cột bằng `:has()`, không sửa JS).

`#bottom-nav` ở breakpoint này: `position:static` (không còn fixed/calc), `flex-direction:column`, `.nav-item` đổi row, `justify-content:flex-start` (KHÔNG dùng `center` — đã thử, dồn hết item vào giữa sidebar trông trống/xấu, user phản hồi sửa lại). `.nav-item.active` có vạch nhấn trái (`::before`, kiểu Linear/Notion) + `font-weight:bold`; `.nav-item:not(.active):hover` có nền nhạt — sidebar PC cần hover state riêng (mobile không cần vì là tap).

**`.quiz-side-map`** (bảng câu hỏi lúc làm bài) — KHÔNG dùng `position:fixed` nữa: từ `64rem` (1024px, đủ chỗ cho cả 2 sidebar), `#screen-quiz.active` (⚠️ phải có `.active`, không chỉ `#screen-quiz`, nếu không ID-selector sẽ đè cơ chế ẩn/hiện của `.active`) tự thành Grid riêng (`minmax(0,1fr) 16rem`), các con stack theo `grid-row` cố định 1-6 (đặt cố định, KHÔNG để auto-placement — vì `#quiz-practice-hud` có thể `display:none`, auto-placement sẽ làm các dòng sau bị lệch track `1fr` dành cho `.scroll-content`), `.quiz-side-map` span `grid-row:1/-1` cột 2.

`#toast-container` ở breakpoint này dùng `bottom:var(--space-4)` (KHÔNG còn cộng thêm padding của body vì body không còn padding).

**Grid nội dung** dùng `repeat(auto-fit, minmax(...))` (KHÔNG cố định số cột — tự co giãn theo độ rộng thật, ít breakpoint hơn):
- `.stats-row` (Trang chủ — 3 thẻ thống kê), `minmax(6.25rem,1fr)`, `css/pages/home.css`
- `#home-recent-sets` (Trang chủ — đề gần đây), `minmax(17.5rem,1fr)`, cùng file
- `.set-list` (Luyện đề — `#library-set-list`), `minmax(17.5rem,1fr)`, `css/components/card.css`

`.home-ai-cta` (nút "Tạo đề bằng AI") chỉ full-width ở mobile (`.btn-full`), từ `48rem` co về `width:auto;min-width:16rem;max-width:22rem` (1 hành động không cần chiếm cả hàng).

`#screen-settings` (Cài đặt) — mỗi nhóm (label + `.settings-card`) bọc trong `.settings-group`, tất cả nằm trong `.settings-grid` (`css/components/settings-row.css`) dùng `auto-fit` giống Trang chủ/Luyện đề. Thêm nhóm settings mới: chỉ cần thêm 1 `.settings-group` trong `.settings-grid`, KHÔNG cần sửa CSS.

CHƯA làm: Thống kê (History)/Editor — chưa có layout multi-column riêng cho PC như Trang chủ/Luyện đề/Quiz/Cài đặt.

---

## HTML CONVENTIONS

⚠️ **Lưu ý quan trọng trước khi áp dụng:** dự án này dùng `onclick="..."` inline trong HTML xuyên suốt làm cơ chế binding chính (xem "Global scope" ở KIẾN TRÚC FILE) — đây là lựa chọn có chủ đích cho app vanilla không build tool, KHÔNG phải lỗi cần sửa. Các quy tắc dưới áp dụng cho phần còn áp dụng được (semantic tags, heading, alt, label, ID/class...); riêng quy tắc "không dùng onclick" và "dùng data-* để JS thao tác" CHỈ áp dụng khi viết feature mới có thể dùng event delegation gọn hơn — KHÔNG đi sửa lại onclick hiện có trong index.html trừ khi user yêu cầu refactor rõ ràng (Mức 3).

- Dùng HTML semantic (`header`, `main`, `section`, `article`, `nav`, `footer`...)
- Mỗi trang chỉ một `h1`; heading theo đúng thứ bậc (`h1 → h2 → h3`)
- Không lạm dụng `div` khi có tag semantic phù hợp hơn
- Form luôn có `label`; ảnh luôn có `alt`
- Dùng `button` cho hành động, `a` cho điều hướng
- Dùng `data-*` để JS thao tác (đọc dữ liệu, không phải binding event — xem lưu ý trên)
- ID chỉ dùng khi thật sự cần (state toggle qua JS, anchor); class chỉ phục vụ style hoặc JS hook
- Thuộc tính HTML viết thường; tên class nhất quán
- Không nhúng CSS/JS trực tiếp trong thẻ (style="" cho layout 1-lần là ngoại lệ thực tế đã chấp nhận, xem CSS CONVENTIONS)
- Tách component rõ ràng (xem "4 TAB NAVIGATION" — mỗi `screen-*` đã là 1 khối độc lập)
- HTML chỉ chứa cấu trúc, không chứa logic (logic nằm trong file JS tương ứng)

## JAVASCRIPT CONVENTIONS

⚠️ **Lưu ý quan trọng:** dự án dùng **global scope, không có module system** (xem KIẾN TRÚC FILE — đã là quyết định kiến trúc, không phải nợ kỹ thuật). Các quy tắc "ES Modules import/export", "tách api/storage/utils/ui/features riêng file .mjs" KHÔNG áp dụng theo nghĩa đen — thay vào đó tinh thần tương đương đã có sẵn: mỗi file JS trong `js/` đảm nhiệm 1 khu vực (`storage.js`, `utils.js`, `quiz.js`...), function global đặt tên cẩn thận tránh trùng. KHÔNG tự ý chuyển sang ES Modules/bundler — đó là thay đổi kiến trúc lớn (Mức 3), chỉ làm khi user yêu cầu rõ.

- Mỗi file JS một khu vực chức năng (tinh thần "module theo tính năng" — xem KIẾN TRÚC FILE)
- Hàm ngắn, một trách nhiệm; đặt tên rõ nghĩa
- Ưu tiên `const`, sau đó `let`, tránh `var`
- camelCase cho biến/hàm, UPPER_SNAKE_CASE cho hằng số (ví dụ `APP_V`, `RECENT_MISTAKES_WINDOW`)
- Tránh thêm biến global mới ngoài những global state đã có (`_quiz`, `_editingQuestions`, `_appendToSetId`...) — nếu cần state mới, cân nhắc gắn vào object global sẵn có trước khi tạo biến rời
- Không hardcode dữ liệu lặp lại; tách config/hằng số lên đầu file khi dùng nhiều nơi
- Không lặp code (DRY) — xem pattern "1 điểm áp dụng duy nhất" đã có (`applyAIQuestions()`, `computeSetStats()`)
- Dùng `async/await`, bắt lỗi bằng `try...catch` ở boundary (gọi AI API, parse JSON từ localStorage)
- Luôn kiểm tra `null`/`undefined` khi đọc field có thể thiếu ở data cũ (xem GOTCHAS "Field mới trong data model")
- Cache DOM thay vì query nhiều lần trong cùng hàm; không query DOM trong vòng lặp
- Tách logic khỏi UI khi hợp lý: tính toán/state ở đầu hàm, render DOM ở cuối
- Render từ state (`_quiz`, `_editingQuestions`...) — sửa DOM trực tiếp chỉ cho patch nhỏ cục bộ (ví dụ `selectAnswer()` toggle class), không thay cho việc cập nhật state
- Cleanup event listener/interval khi không còn dùng (xem `activityTracker.stop()` idempotent ở GOTCHAS)
- Dùng object thay nhiều biến rời liên quan (ví dụ `_quiz = {...}` thay vì nhiều biến quiz rời)
- Dùng destructuring + template literals khi hợp lý
- Comment cho "tại sao" (constraint ẩn, lý do workaround), không comment "làm gì" (tên hàm/biến đã rõ nghĩa)
- Tránh magic number/string — đặt hằng số có tên khi giá trị lặp lại hoặc ý nghĩa không tự rõ
- Dùng guard clause (`if (!x) return;`) để giảm lồng `if`
- Mọi thay đổi dữ liệu đi qua hàm storage có sẵn (xem API CHEATSHEET) — không tự ý `localStorage.setItem` rải rác ngoài `js/core/storage.js`

---

## GOTCHAS

**Render/data chung:**
- `esc(str)` BẮT BUỘC khi render string từ user/data vào HTML
- Sau mutate data → gọi `renderXxx()` tương ứng. `navTo()` tự gọi rồi, không cần gọi lại nếu đang đúng screen
- `confirm()` là custom (override `window.confirm`) — nhận callback, không return boolean
- Field mới trong data model: data cũ KHÔNG có field này → đọc phải fallback (`q.field ?? default`). `getSets()`/`getHistory()` đã try/catch parse lỗi → `[]`
- Cache: bump `?v=N` (index.html + sw.js STATIC) bằng `node scripts/bump.js`, không sửa tay
- Service Worker chỉ chạy khi deploy thật, KHÔNG chạy ở `localhost`/`127.0.0.1` — dev tự huỷ SW + xoá cache cũ, sửa code là thấy ngay không cần hard-refresh

**Quiz/History:**
- Quiz mode default `'all'` (list — hiện hết câu, cuộn dọc), `'one-by-one'` là chế độ 2 (1 câu/màn, Trước/Tiếp). `toggleQuizMode()` chuyển qua lại, ẩn ở practice mode. `shuffleOptions(q)` trả câu hỏi mới với options đảo + `correct` cập nhật
- `qs-time-limit` (modal-quiz-settings) mặc định = tổng số câu (1 phút/câu) khi mở `showQuizSettings()` — KHÔNG tự đổi nếu user sửa "Số câu muốn làm" sau đó, là giới hạn biết trước, không phải bug
- `.quiz-side-map` (css/pages/quiz.css) — sidebar bảng câu hỏi cố định bên phải, CHỈ hiện ở desktop (`@media min-width: 80rem`), ẩn hẳn qua JS khi practice mode. Render bằng `renderQuizMap()` — hàm này ghi vào CẢ modal mobile (`#qmap-grid`) VÀ sidebar desktop (`#qmap-grid-side`) cùng lúc, gọi từ `renderQuizNav()` (mọi lần đổi câu/đáp án) + `toggleFlag()` (không tự kéo theo renderQuizNav)
- `.qnav-map-btn` (nút "X/10" mở modal map, chế độ one-by-one) bị ẩn bằng CSS ở cùng breakpoint `80rem` — vì sidebar desktop đã thay chức năng, hiện cả 2 sẽ trùng UI
- `jumpToQuestion(idx)` phân biệt theo `_quiz.mode`: `'all'` → `scrollIntoView()` tới block câu đó; `'one-by-one'` → đổi `currentIdx` + render lại. Thêm mode mới phải xử lý cả 2 nhánh này
- `toggleFlag(idx)` phải query `#quiz-q-${idx} .quiz-flag-btn` (scoped theo từng câu) — KHÔNG dùng `document.querySelector('.quiz-flag-btn')` chung, vì mode `'all'` hiện nhiều nút cờ cùng lúc trên màn hình
- `renderHistoryMistakes()` overwrite toàn bộ `hst-mistakes-body` bằng `innerHTML` — không đặt HTML tĩnh trong container này (mất), nút retry phải sinh trong JS (`retryBtnHtml`)
- `RECENT_MISTAKES_WINDOW` (js/history.js) dùng chung bởi `renderHistoryMistakes()` và `retryAllWrongQuestions()` — phải cùng giá trị, lệch nhau sẽ mâu thuẫn giữa hiển thị và hành động
- Dòng "Đề yếu nhất" có nút 🎯 `startPractice(setId)` — `weakTopics` map từ `computeSetStats()` phải giữ `setId`, không chỉ lấy tên
- `computeSetStats(history)` (js/history.js) là **nguồn tính duy nhất** cho thống kê theo set (group theo `setId`, không theo tên) — dùng chung bởi Tổng quan/Tiến bộ/Lỗi sai/export report, sửa số liệu thì sửa Ở ĐÂY
- `exportPersonalizationData()` (js/library.js) xuất **.txt** (không JSON) — `_buildExportJson()` tính số liệu → `_buildReportTxt()` format text. Thêm field thống kê thì sửa cả 2 hàm
- `startPractice()` thoát giữa chừng (`exitQuiz()`) tự lưu tiến trình nếu đã trả lời ≥1 câu, không hỏi xác nhận. Chế độ Thi vẫn confirm + không lưu — khác biệt có chủ đích
- `startActivityTracking()` (js/core/activity-tracker.js) đo active time (loại trừ idle >120s hoặc tab ẩn), dùng chung cho cả 2 mode qua `_quiz.activityTracker`. Idle 60s → `onIdleWarning` (cảnh báo sắp dừng đếm), idle 120s → ngừng cộng `activeMs` (`PAUSE_THRESHOLD_MS`), quay lại sau idle ≥120s → `onResumeNudge`. `handle.getActiveSec()` đọc active time hiện tại không cần stop. `handle.stop()` **idempotent** (bị gọi 2 lần khi thoát giữa chừng practice) — mọi điểm kết thúc quiz đều phải gọi `stop()` tránh leak listener/interval
- Practice mode hiện bộ đếm thời gian học count-up (`#quiz-timer`/`#quiz-timer-text` — dùng chung element với countdown thi) qua `_quiz.activeDisplayInterval` (interval riêng đọc `activityTracker.getActiveSec()` mỗi giây). Phải `clearInterval(_quiz.activeDisplayInterval)` ở mọi điểm dừng practice (`_savePracticeResults()`, `exitQuiz()` goBack), giống `timerInterval` của exam. `renderQuiz()` chỉ ẩn `#quiz-timer` khi không phải exam countdown VÀ không phải practice (`!q.pQueue`)

**AI (js/ai.js):**
- API key OpenAI lưu **plain text** trong `quiz_ai_config`, gửi trực tiếp từ browser tới OpenAI (không backend) — rủi ro đã chấp nhận cho use case cá nhân, KHÔNG thêm sync/export config ra ngoài
- `OPENAI_PRICING` là giá hardcode tại thời điểm code — OpenAI đổi giá phải sửa tay. Tỷ giá VND tự fetch qua `refreshFxRate()`
- `applyAIQuestions()` là điểm áp dụng câu hỏi AI DUY NHẤT (paste-tay + gọi API) — thêm field mới sửa Ở ĐÂY. Mỗi câu parse trong `try/catch` riêng (1 câu lỗi không crash cả batch), `correct` phải trong [0,3]
- `generateDirectly()` dùng `_estimateMaxTokens(request)` chặn `max_tokens` theo số câu xin (clamp 5-60, ~220 token/câu, trần 16000) — tránh chi phí không kiểm soát. Gọi với `stream:true` + `stream_options.include_usage` để đếm `"skillTags"` xuất hiện trong stream → hiện tiến độ thật "X/~Y câu". Có fallback `res.json()` nếu không hỗ trợ streaming
- `quiz_last_set` vốn pin "set đang chơi" lên đầu Luyện đề — `applyAIQuestions()` cũng set key này nên set vừa tạo/thêm câu tự lên đầu. Set card hiện `📅 fmtDateShort(set.createdAt)` (fallback `—`)
- `modal-ai-create` (FAB "+" duy nhất ở Library, đã gộp FAB dán-văn-bản cũ vào đây) có 2 tab `.aqc-tabs`: "Bằng AI" (nội dung cũ) / "Dán văn bản" (`goToImportTextFromAiCreate()` → `openImportText(_appendToSetId)`, giữ đúng context tạo mới hay thêm vào set). `showAICreate()` luôn reset về tab 'ai' khi mở. `.aqc-tabs`/`.aqc-tab`/`.aqc-page` định nghĩa ở css/pages/editor.css nhưng dùng chung global (không scoped theo screen)
- `analyzeStudyReport()` tái dùng `_buildExportJson()`+`_buildReportTxt()` làm input AI (không gửi raw history), `max_tokens:550`. Log ở `quiz_ai_analysis_log` (xem lại được) — mở modal không tự gọi lại API, chỉ gọi khi "Phân tích lại"
- `buildPromptText()` rule ngôn ngữ: `name`/`explanation` luôn tiếng Việt, `text`/`options` tiếng Anh chỉ khi chủ đề cần (TOEIC...)
- `explanation` AI sinh PHẢI theo format cố định: `✅ Đáp án` → `🔍 Nhìn cấu trúc` (+ `➡` lý do) → `✔ <đáp án> (phân loại)` → `📖 Ghi nhớ`. Không giải thích đáp án sai. Trong source, `\n` dạy AI escape JSON phải viết `\\n` (double-escape, vì đang trong template literal JS). CSS hiển thị đã có `white-space: pre-wrap`
- `analyzeStudyReport()` parse dòng `HANH_DONG: REDO:<set>` / `CREATE:<chủ đề>` cuối response (`_parseAiAction()`) để sinh nút hành động — không tốn thêm API call, match tên gần đúng

**Import text (js/import-text.js):**
- `parseAzotaText()` tách block theo dòng đầu `Câu N:`/`N.`, nhận diện đáp án A-D bằng chữ cái HOẶC đối chiếu full-text nếu AI/người dùng ghi "Đáp án: <nội dung>" thay vì chữ cái
- Mỗi câu parse ra đều có `_error` (null nếu hợp lệ) — set tự validate lại mỗi lần user sửa trực tiếp trong preview card (`updateImportQuestion`/`updateImportOption`), không cần parse lại từ đầu
- Dùng chung `_appendToSetId` (global khai báo ở `ai.js`) và `applyAIQuestions()` để tạo/thêm set — KHÔNG viết lại logic tạo set riêng
- Preview card tái dùng `.question-card`/`.option-row` từ `css/pages/editor.css`, chỉ thêm class `.has-error` (viền đỏ) — style mới nằm ở `css/pages/import.css`
- `_ICON_PREFIX_RE` lọc icon/emoji đầu dòng (✅💡📘...) CHỈ dùng để test nhãn (`_ANS_RE`/`_EXP_RE`/`_ANS_TEXT_RE`) — nội dung lưu lại (`explanation`/`text`) luôn dùng `rawLine` gốc còn icon, giữ định dạng AI-style (📘 Công thức/📝 Ví dụ/🎯 Ghi nhớ) không bị khô khan
- `suggestImportSetName()` — nút ✨ cạnh `#import-set-name` (chỉ hiện ở bước preview), gửi tối đa 15 câu hỏi đã nhận diện cho AI, parse JSON 3 tên gợi ý → render `.ai-chip` ở `#import-name-suggestions`, bấm chip điền vào input. Log usage `type:'naming'` (thêm field mới ngoài `'generate'|'analysis'`, `renderAiUsage()` đã xử lý hiển thị riêng)

**Tab Cài đặt:**
- `screen-settings` gom cấu hình/quản lý dữ liệu rải rác (AI config/usage, import/export, xoá data) về 1 chỗ — modal/hàm gốc giữ nguyên, chỉ là entry point mới. "Phân tích AI" + "Xuất báo cáo" CỐ Ý giữ ở tab Thống kê (gắn dữ liệu học tập)
- `.settings-row` dùng được cả `<div>` (toggle, cũ) và `<button>` (chevron, mới) — copy pattern có sẵn khi thêm dòng settings

---

## ROADMAP (chưa làm)

- Xem lại lịch sử chi tiết — click vào history entry → xem lại đáp án
