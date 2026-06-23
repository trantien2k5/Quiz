# CLAUDE.md — Quiz App

## QUY TẮC LÀM VIỆC (BẮT BUỘC)

**ĐỌC FILE NÀY TRƯỚC** — luôn đọc CLAUDE.md đầu mỗi session để nắm context, tránh hỏi lại.

**Mức 1 — NHANH (code ngay):** bug rõ, CSS tweak, đổi text, < ~30 dòng
**Mức 2 — VỪA (hỏi 1 lần rồi code):** thêm feature nhỏ, sửa logic 1-2 file
**Mức 3 — LỚN (dừng chờ duyệt từng bước):** thay đổi data model, flow, kiến trúc

**Khi user nói "code đi / làm đi / fix đi" → implement ngay không hỏi thêm.**

**User đã yêu cầu: cứ làm theo ý chính, KHÔNG hỏi xác nhận lại — trừ khi vấn đề lớn (Mức 3 thật sự mơ hồ) hoặc câu hỏi chưa rõ ràng tới mức không thể tự quyết định hợp lý.** Áp dụng cho cả request nhiều phần/phức tạp, không chỉ riêng fix nhỏ.

**Token tiết kiệm:**
- KHÔNG đọc dạo file để "hiểu context" — Grep đúng mục tiêu, Read đúng đoạn cần
- Sửa CSS/HTML không cần test. Sửa JS logic → mở browser kiểm tra console
- Trả lời ngắn: kết quả + việc đã làm, không giải thích dài
- Sau mỗi thay đổi lớn → cập nhật CLAUDE.md ngay

**Git (BẮT BUỘC):**
- Sau mỗi thay đổi: commit + push lên CÙNG LÚC cả `claude/vietnamese-greeting-q0n2ab` VÀ `main`
- `main` auto-deploy Cloudflare Pages — push là deploy
- Bump cache version `?v=N` trong index.html + sw.js mỗi lần sửa JS hoặc CSS
- Script tự động: `node scripts/bump.js` (bump version.json, sw.js, index.html, js/core/app.js)
- KHÔNG tạo PR, KHÔNG subscribe PR activity

---

## DỰ ÁN

**Quiz App** — SPA trắc nghiệm chạy trên browser, không cần server.
- Vanilla HTML + CSS + JS, không framework, không build tool
- Lưu trữ: `localStorage` (`quiz_sets`, `quiz_history`)
- Deploy: Cloudflare Pages — version hiện tại: **v71**

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
  history.js            ← renderHistory(), showHistorySection(), stats
  editor.js             ← editor screen (tạo/sửa bộ đề)
  results.js            ← results screen, review chi tiết
  ai.js                 ← AI integration (generate questions)

assets/
  icon-192.svg
  icon-512.svg

scripts/
  bump.js               ← dev: node scripts/bump.js → bump version tất cả file
```

**Global scope** — không có module system, tất cả function là global. Đặt tên cẩn thận, tránh trùng.

---

## 4 TAB NAVIGATION

```
navTo('home')     → screen-home     (Trang chủ — dashboard)
navTo('library')  → screen-library  (Luyện đề — AI + kho đề)
navTo('history')  → screen-history  (Kết quả — stats + lịch sử)
navTo('settings') → screen-settings (Cài đặt — AI config/usage, import/export, xoá dữ liệu, version)
```

Các screen overlay (ẩn bottom nav khi hiện):
- `screen-editor` — tạo/sửa bộ đề
- `screen-quiz`   — đang làm bài
- `screen-result` — xem kết quả

`showScreen(id)` trong `screens[]` array (`js/core/app.js`) — thêm screen mới phải thêm vào array này.

**History sub-screens** (dùng `showHistorySection(name)`):
- `hst-home` — trang chủ thống kê
- `hst-overview`, `hst-progress`, `hst-mistakes`, `hst-log` — các màn con

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
showHistorySection('overview'|'progress'|'mistakes'|'log')
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

---

## GOTCHAS

- `esc(str)` BẮT BUỘC khi render bất kỳ string nào từ user/data vào HTML
- Sau mỗi mutate data → gọi `renderXxx()` tương ứng để UI sync
- `navTo()` tự gọi `renderXxx()` — nếu đang ở đúng screen thì không cần gọi thêm
- `confirm()` là custom function (override `window.confirm`) — nhận callback không phải return boolean
- CSS cache: bump `?v=N` trong index.html (tất cả 24 css file + tất cả js) và sw.js STATIC array
- Dùng `node scripts/bump.js` để tự động bump tất cả cùng lúc
- `hst-home` là flex item của `screen-history` — KHÔNG dùng z-index < 20 cho `.hst-sub` (sẽ bị top-bar che)
- Quiz mode default là `'all'` (hiện tất cả câu) — `'one-by-one'` là chế độ thứ 2
- `shuffleOptions(q)` trả về câu hỏi mới với options đảo và `correct` đã cập nhật
- `renderHistoryMistakes()` dùng `el.innerHTML = ...` → overwrite toàn bộ `hst-mistakes-body` — KHÔNG đặt HTML tĩnh trong container này ở index.html, sẽ bị xóa mất (nút "Làm lại câu sai" phải sinh trong JS, xem `retryBtnHtml`)
- `RECENT_MISTAKES_WINDOW` (js/history.js) — cửa sổ "X lượt gần nhất" dùng chung bởi `renderHistoryMistakes()` (hiện câu sai gần đây) và `retryAllWrongQuestions()` (luyện lại) — PHẢI cùng 1 giá trị, nếu lệch nhau sẽ bị mâu thuẫn (hiện "không có câu sai" nhưng nút retry vẫn tìm thấy câu, hoặc ngược lại)
- Mỗi dòng "Đề yếu nhất" (renderHistoryMistakes) có nút 🎯 gọi `startPractice(setId)` trực tiếp — `weakTopics` map từ `computeSetStats()` PHẢI giữ lại `setId`, đừng chỉ lấy tên (mất khả năng link hành động)
- **Service Worker chỉ chạy khi deploy thật** (không phải `localhost`/`127.0.0.1`) — dev local tự huỷ SW + xoá cache cũ (`index.html` cuối file) để code trên đĩa luôn = code hiển thị, không cần hard-refresh/clear cache tay khi sửa JS/CSS
- **An toàn data model khi thêm field mới**: data cũ của user trong `localStorage` KHÔNG có field mới → đọc field mới phải có fallback (`q.field ?? default`), KHÔNG assume field luôn tồn tại. `getSets()`/`getHistory()` đã có try/catch parse JSON lỗi → trả `[]`, không cần thêm
- `exportPersonalizationData()` (js/library.js) — xuất báo cáo học tập dạng **.txt** (không phải JSON) cho nhẹ + dễ đọc cho người và AI. Logic: `_buildExportJson()` tính toán đầy đủ số liệu (overview, skill/topic stats, weak questions, confusion pairs, recommendations...) → `_buildReportTxt()` format thành text gọn. Thêm field thống kê mới thì sửa cả 2 hàm này.
- `computeSetStats(history)` (js/history.js) — **nguồn tính duy nhất** cho thống kê theo bộ đề (accuracy, wrongRate, avg, best, trend, lastDate), group theo `setId` (KHÔNG theo tên — set trùng tên không bị tính chung). Dùng chung bởi: `generateInsights()` (Tổng quan), `renderSetBreakdownHtml()` (Tiến bộ), `renderHistoryMistakes()` đề yếu nhất (Lỗi sai), và `_buildExportJson()` topicStats (export report) — sửa số liệu theo set thì sửa Ở ĐÂY, không tự tính lại riêng ở từng nơi
- **AI gọi trực tiếp (`generateDirectly()`, js/ai.js)**: API key OpenAI lưu PLAIN TEXT trong `quiz_ai_config` (localStorage) — không có backend, key gửi trực tiếp tới `api.openai.com` từ browser (CORS được OpenAI hỗ trợ). Đây là rủi ro chấp nhận được cho use case cá nhân, đã cảnh báo trong UI modal cấu hình — KHÔNG thêm tính năng đồng bộ/export config có chứa key ra ngoài.
- `OPENAI_PRICING` (js/ai.js) là bảng giá **hardcode ước tính tại thời điểm code** (gpt-4o-mini, gpt-4o) — OpenAI đổi giá thì phải sửa tay, không có cơ chế tự cập nhật. Tỷ giá VND thì tự fetch được qua `refreshFxRate()`.
- `applyAIQuestions(data, fallbackName)` là điểm áp dụng câu hỏi AI DUY NHẤT (dùng chung cho paste-tay `importAIText()` và gọi API `generateDirectly()`) — thêm field mới vào câu hỏi AI thì sửa Ở ĐÂY, không sửa riêng từng flow. Mỗi câu được parse trong `try/catch` riêng — 1 câu lỗi format (vd `skillTags` không phải array) sẽ bị bỏ qua, KHÔNG làm crash mất cả batch các câu hợp lệ khác. `correct` phải nằm trong [0,3], ngoài khoảng thì loại câu đó
- `generateDirectly()` (js/ai.js) dùng `_estimateMaxTokens(request)` để chặn `max_tokens` theo số câu user xin (regex tìm số trong câu, fallback 20, clamp 5-60, ~220 token/câu + buffer, trần tuyệt đối 16000) — tránh chi phí không kiểm soát nếu AI lan man hoặc user xin quá nhiều câu. Xin nhiều hơn mức trần sẽ bị cắt JSON giữa chừng (chấp nhận được, ưu tiên an toàn chi phí hơn)
- `generateDirectly()` gọi OpenAI với `stream: true` + `stream_options: { include_usage: true }` để hiện tiến độ thật (đếm số lần xuất hiện `"skillTags"` trong content đã stream — field cuối mỗi câu hỏi — ra "Đã tạo X/~Y câu (Ns)" trên nút, thay vì chỉ đếm giây thô). Có fallback `res.json()` non-streaming nếu môi trường không hỗ trợ `res.body.getReader` (hiếm). `usage` (token) lấy từ chunk cuối cùng của stream, không phải response chính như trước
- `quiz_last_set` (localStorage) vốn dùng để pin "set đang chơi" lên đầu danh sách Luyện đề (`renderLibrary()`) — `applyAIQuestions()` giờ CŨNG set key này mỗi khi tạo/thêm câu bằng AI, để bộ vừa tạo tự hiện lên đầu mà không cần sửa logic sort. Set card cũng hiện `📅 ${fmtDateShort(set.createdAt)}` (fallback `—` nếu thiếu field)
- `analyzeStudyReport()` (js/ai.js) tái dùng `_buildExportJson()`+`_buildReportTxt()` (js/library.js) làm input cho AI — KHÔNG gửi raw history, để giữ token thấp. Gọi API có `max_tokens: 550` chặn cứng chi phí output. Có log (`quiz_ai_analysis_log`, xem lại được) — mở modal không tự gọi API lại, chỉ gọi khi bấm "Phân tích lại" (`force=true`)
- AI prompt (`buildPromptText()` js/ai.js) có rule NGÔN NGỮ bắt buộc: `name`/`explanation` luôn tiếng Việt, `text`/`options` chỉ tiếng Anh nếu chủ đề yêu cầu (TOEIC...) — nếu AI vẫn trả tiếng Anh sai chỗ, sửa rule ở đây trước, đừng tự dịch lại bằng code
- `explanation` do AI sinh ra PHẢI theo format có cấu trúc cố định: `✅ Đáp án` → `🔍 Phân tích` (kèm `→` quy tắc) → `🗒 Ghi nhớ`, nhiều dòng (xem ví dụ mẫu trong `buildPromptText()`). Trong source code, mọi `\n` dùng để dạy AI escape JSON PHẢI viết `\\n` (double-escape) — vì đang ở trong template literal JS, `\n` thường sẽ bị JS hiểu thành newline thật trước khi gửi đi, làm sai ví dụ. CSS hiển thị (`review-explanation`, `practice-feedback-exp`) đã có `white-space: pre-wrap` để giữ xuống dòng — thêm chỗ hiển thị explanation mới thì nhớ thêm thuộc tính này
- `analyzeStudyReport()` parse 1 dòng `HANH_DONG: REDO:<tên set>` hoặc `HANH_DONG: CREATE:<chủ đề>` ở cuối response AI (`_parseAiAction()`) để sinh nút hành động (luyện tập lại set / mở nhanh modal AI điền sẵn yêu cầu) — KHÔNG tốn thêm lệnh gọi API, action match theo tên set gần đúng (không match được thì không hiện nút, không báo lỗi)
- `startPractice()` khi thoát giữa chừng (`exitQuiz()`) tự lưu tiến trình đã làm (không hỏi xác nhận) qua `_savePracticeResults()` — chỉ lưu nếu đã trả lời ít nhất 1 câu (`responseTimes` có giá trị non-null). Chế độ Thi (`startQuiz`) vẫn giữ confirm + KHÔNG lưu khi thoát giữa chừng như cũ — 2 chế độ có hành vi exit khác nhau có chủ đích
- `startActivityTracking()` (js/core/activity-tracker.js) — đo thời gian học chủ động (loại trừ idle >60s không tương tác + lúc tab ẩn qua `visibilitychange`), dùng CHUNG cho cả `startQuiz()` và `startPractice()` (gắn vào `_quiz.activityTracker`). `handle.stop()` **idempotent** (gọi nhiều lần an toàn, trả lại giá trị đã chốt) — vì bị gọi tới 2 lần trong luồng thoát giữa chừng practice (`_savePracticeResults()` rồi `goBack()`). Nhắc tập trung (rời ≥2 phút) + nhắc nghỉ Pomodoro (25 phút active liên tục) qua `toast()` có sẵn, KHÔNG cần UI mới. Mọi điểm kết thúc quiz (`submitQuiz`, `_savePracticeResults`, `exitQuiz.goBack`) PHẢI gọi `stop()` để tránh leak listener/interval — thêm điểm kết thúc mới thì nhớ gọi theo
- **Tab Cài đặt (`screen-settings`)** gom các chức năng cấu hình/quản lý dữ liệu từ nhiều nơi rải rác về 1 chỗ: Cấu hình AI + Thống kê AI (trước ở icon góc Luyện đề), Nhập/Xuất bộ đề JSON, Xoá toàn bộ dữ liệu (trước ở Thống kê). Các modal/hàm gốc (`showAiConfig()`, `showImportModal()`, `confirmClearAllData()`...) GIỮ NGUYÊN không đổi — tab Settings chỉ là entry point mới, không duplicate logic. "Phân tích lộ trình AI" và "Xuất báo cáo học tập" CỐ Ý giữ ở tab Thống kê (gắn với dữ liệu học tập, không phải cấu hình app)
- `.settings-row` (css/components/settings-row.css) giờ dùng được cả dạng `<div>` (cũ, có toggle, trong quiz settings modal) VÀ `<button>` (mới, dòng điều hướng có chevron, trong tab Cài đặt) — selector `button.settings-row` reset style nút + thêm `.settings-row-chevron`. Thêm dòng settings mới thì copy pattern `<button class="settings-row" onclick="...">...<svg class="settings-row-chevron">`

---

## ROADMAP (chưa làm)

- Xem lại lịch sử chi tiết — click vào history entry → xem lại đáp án
