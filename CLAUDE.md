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

**Render/data chung:**
- `esc(str)` BẮT BUỘC khi render string từ user/data vào HTML
- Sau mutate data → gọi `renderXxx()` tương ứng. `navTo()` tự gọi rồi, không cần gọi lại nếu đang đúng screen
- `confirm()` là custom (override `window.confirm`) — nhận callback, không return boolean
- Field mới trong data model: data cũ KHÔNG có field này → đọc phải fallback (`q.field ?? default`). `getSets()`/`getHistory()` đã try/catch parse lỗi → `[]`
- Cache: bump `?v=N` (index.html + sw.js STATIC) bằng `node scripts/bump.js`, không sửa tay
- Service Worker chỉ chạy khi deploy thật, KHÔNG chạy ở `localhost`/`127.0.0.1` — dev tự huỷ SW + xoá cache cũ, sửa code là thấy ngay không cần hard-refresh

**Quiz/History:**
- Quiz mode default `'all'`, `'one-by-one'` là chế độ 2. `shuffleOptions(q)` trả câu hỏi mới với options đảo + `correct` cập nhật
- `renderHistoryMistakes()` overwrite toàn bộ `hst-mistakes-body` bằng `innerHTML` — không đặt HTML tĩnh trong container này (mất), nút retry phải sinh trong JS (`retryBtnHtml`)
- `RECENT_MISTAKES_WINDOW` (js/history.js) dùng chung bởi `renderHistoryMistakes()` và `retryAllWrongQuestions()` — phải cùng giá trị, lệch nhau sẽ mâu thuẫn giữa hiển thị và hành động
- Dòng "Đề yếu nhất" có nút 🎯 `startPractice(setId)` — `weakTopics` map từ `computeSetStats()` phải giữ `setId`, không chỉ lấy tên
- `computeSetStats(history)` (js/history.js) là **nguồn tính duy nhất** cho thống kê theo set (group theo `setId`, không theo tên) — dùng chung bởi Tổng quan/Tiến bộ/Lỗi sai/export report, sửa số liệu thì sửa Ở ĐÂY
- `exportPersonalizationData()` (js/library.js) xuất **.txt** (không JSON) — `_buildExportJson()` tính số liệu → `_buildReportTxt()` format text. Thêm field thống kê thì sửa cả 2 hàm
- `startPractice()` thoát giữa chừng (`exitQuiz()`) tự lưu tiến trình nếu đã trả lời ≥1 câu, không hỏi xác nhận. Chế độ Thi vẫn confirm + không lưu — khác biệt có chủ đích
- `startActivityTracking()` (js/core/activity-tracker.js) đo active time (loại trừ idle >60s hoặc tab ẩn), dùng chung cho cả 2 mode qua `_quiz.activityTracker`. `handle.stop()` **idempotent** (bị gọi 2 lần khi thoát giữa chừng practice) — mọi điểm kết thúc quiz đều phải gọi `stop()` tránh leak listener/interval

**AI (js/ai.js):**
- API key OpenAI lưu **plain text** trong `quiz_ai_config`, gửi trực tiếp từ browser tới OpenAI (không backend) — rủi ro đã chấp nhận cho use case cá nhân, KHÔNG thêm sync/export config ra ngoài
- `OPENAI_PRICING` là giá hardcode tại thời điểm code — OpenAI đổi giá phải sửa tay. Tỷ giá VND tự fetch qua `refreshFxRate()`
- `applyAIQuestions()` là điểm áp dụng câu hỏi AI DUY NHẤT (paste-tay + gọi API) — thêm field mới sửa Ở ĐÂY. Mỗi câu parse trong `try/catch` riêng (1 câu lỗi không crash cả batch), `correct` phải trong [0,3]
- `generateDirectly()` dùng `_estimateMaxTokens(request)` chặn `max_tokens` theo số câu xin (clamp 5-60, ~220 token/câu, trần 16000) — tránh chi phí không kiểm soát. Gọi với `stream:true` + `stream_options.include_usage` để đếm `"skillTags"` xuất hiện trong stream → hiện tiến độ thật "X/~Y câu". Có fallback `res.json()` nếu không hỗ trợ streaming
- `quiz_last_set` vốn pin "set đang chơi" lên đầu Luyện đề — `applyAIQuestions()` cũng set key này nên set vừa tạo/thêm câu tự lên đầu. Set card hiện `📅 fmtDateShort(set.createdAt)` (fallback `—`)
- `analyzeStudyReport()` tái dùng `_buildExportJson()`+`_buildReportTxt()` làm input AI (không gửi raw history), `max_tokens:550`. Log ở `quiz_ai_analysis_log` (xem lại được) — mở modal không tự gọi lại API, chỉ gọi khi "Phân tích lại"
- `buildPromptText()` rule ngôn ngữ: `name`/`explanation` luôn tiếng Việt, `text`/`options` tiếng Anh chỉ khi chủ đề cần (TOEIC...)
- `explanation` AI sinh PHẢI theo format cố định: `✅ Đáp án` → `🔍 Nhìn cấu trúc` (+ `➡` lý do) → `✔ <đáp án> (phân loại)` → `📖 Ghi nhớ`. Không giải thích đáp án sai. Trong source, `\n` dạy AI escape JSON phải viết `\\n` (double-escape, vì đang trong template literal JS). CSS hiển thị đã có `white-space: pre-wrap`
- `analyzeStudyReport()` parse dòng `HANH_DONG: REDO:<set>` / `CREATE:<chủ đề>` cuối response (`_parseAiAction()`) để sinh nút hành động — không tốn thêm API call, match tên gần đúng

**Tab Cài đặt:**
- `screen-settings` gom cấu hình/quản lý dữ liệu rải rác (AI config/usage, import/export, xoá data) về 1 chỗ — modal/hàm gốc giữ nguyên, chỉ là entry point mới. "Phân tích AI" + "Xuất báo cáo" CỐ Ý giữ ở tab Thống kê (gắn dữ liệu học tập)
- `.settings-row` dùng được cả `<div>` (toggle, cũ) và `<button>` (chevron, mới) — copy pattern có sẵn khi thêm dòng settings

---

## ROADMAP (chưa làm)

- Xem lại lịch sử chi tiết — click vào history entry → xem lại đáp án
