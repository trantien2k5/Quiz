# CLAUDE.md — Quiz App

## QUY TẮC LÀM VIỆC (BẮT BUỘC)

**ĐỌC FILE NÀY TRƯỚC** — luôn đọc CLAUDE.md đầu mỗi session để nắm context, tránh hỏi lại.

**Mức 1 — NHANH (code ngay):** bug rõ, CSS tweak, đổi text, < ~30 dòng
**Mức 2 — VỪA (hỏi 1 lần rồi code):** thêm feature nhỏ, sửa logic 1-2 file
**Mức 3 — LỚN (dừng chờ duyệt từng bước):** thay đổi data model, flow, kiến trúc

**Khi user nói "code đi / làm đi / fix đi" → implement ngay không hỏi thêm.**

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
- Deploy: GitHub Pages (`trantien2k5.github.io/Quiz/`) — version hiện tại: **v66**

---

## KIẾN TRÚC FILE

```
index.html              ← shell duy nhất, load tất cả <script>/<link>
manifest.json           ← PWA manifest (phải ở root)
sw.js                   ← Service Worker (phải ở root)
version.json            ← { "v": N } — dùng để detect update
CLAUDE.md               ← file này

css/
  style.css             ← toàn bộ CSS

js/
  core/
    app.js              ← init, routing, showScreen, navTo, APP_V
    storage.js          ← localStorage CRUD (getSets, saveSet, getHistory...)
    utils.js            ← esc, toast, confirm, date helpers
  home/
    home.js             ← renderHome()
  library/
    library.js          ← renderLibrary(), set cards, import/export
  quiz/
    quiz.js             ← quiz state, timer, submit, scoring
  history/
    history.js          ← renderHistory(), showHistorySection(), stats
  editor/
    editor.js           ← editor screen (tạo/sửa bộ đề)
  results/
    results.js          ← results screen, review chi tiết
  ai/
    ai.js               ← AI integration (generate questions)

assets/
  icon-192.svg
  icon-512.svg

scripts/
  bump.js               ← dev: node scripts/bump.js → bump version tất cả file
```

**Global scope** — không có module system, tất cả function là global. Đặt tên cẩn thận, tránh trùng.

---

## 3 TAB NAVIGATION

```
navTo('home')     → screen-home     (Trang chủ — dashboard)
navTo('library')  → screen-library  (Luyện đề — AI + kho đề)
navTo('history')  → screen-history  (Kết quả — stats + lịch sử)
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
{ id, setId, setName, score, total, timeTaken, date, answers: [0|1|2|3|null] }
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
```

**Render** (gọi sau khi mutate data):
```js
renderHome()       // js/home/home.js
renderLibrary()    // js/library/library.js
renderHistory()    // js/history/history.js
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

**Quiz** (`js/quiz/quiz.js`):
```js
showQuizSettings(setId)    // mở modal cài đặt trước khi làm bài
startQuiz(set, settings)   // bắt đầu quiz với settings {shuffleQ, shuffleOpts, numQ}
```

---

## PATTERN THÊM TÍNH NĂNG

### Thêm field mới vào câu hỏi
1. `buildQuestionCard()` trong `js/editor/editor.js` — thêm input field
2. `addQuestion()` — thêm default value
3. `saveEditor()` — map field khi lưu
4. `buildSetCard()` / kết quả — hiện field nếu cần
5. `importSetsFromData()` — parse field từ JSON import

### Thêm section vào tab
- Home: thêm element vào `screen-home` (index.html), render trong `renderHome()` (js/home/home.js)
- Library: thêm vào `screen-library`, render trong `renderLibrary()` (js/library/library.js)
- History: thêm vào `screen-history`, render trong `renderHistory()` (js/history/history.js)

### Thêm tab mới
1. Thêm `<button data-nav="name">` vào `#bottom-nav` trong index.html
2. Thêm `<section id="screen-name">` vào index.html
3. Thêm `'screen-name'` vào `screens[]` trong `js/core/app.js`
4. Thêm `else if (name === 'name') { ... }` vào `navTo()` trong `js/core/app.js`

### Thêm modal mới
1. Thêm `<div id="modal-xxx" class="modal-overlay">` vào index.html
2. Thêm functions `showXxx()` / `hideXxx()` vào file JS tương ứng (toggle class `active`)

---

## CSS CONVENTIONS

```css
/* Màu chính */
--purple: #6366F1    --green: #059669    --red: #DC2626    --orange: #D97706

/* Surface */
--bg: #F8FAFF        --surface: #FFFFFF   --border: #E5E7EB
--text: #1E293B      --text-muted: #6B7280

/* Shape */
--radius: 16px       --radius-sm: 10px   --shadow-sm: ...

/* Layout */
--nav-h: 64px        --top-h: 56px       --max-w: 680px
```

**Z-index scale** (css/style.css):
```
Screen content (default): 0
Top bar (.top-bar):        z-index 10
Sub-screens (.hst-sub):    z-index 20   ← phải > top-bar để che hst-home
Nav bar (#bottom-nav):     z-index 100
Modals (.modal-overlay):   z-index 200
Toast:                     z-index 300
```

- Class prefix theo khu vực: `.set-*`, `.quiz-*`, `.result-*`, `.recent-*`, `.stat-*`, `.ai-*`, `.hst-*`
- Button base: `.btn` + modifier `.btn-primary / -secondary / -danger / -outline / -sm / -full`
- Tất cả button kế thừa ripple effect tự động (class `.btn`)

---

## GOTCHAS

- `esc(str)` BẮT BUỘC khi render bất kỳ string nào từ user/data vào HTML
- Sau mỗi mutate data → gọi `renderXxx()` tương ứng để UI sync
- `navTo()` tự gọi `renderXxx()` — nếu đang ở đúng screen thì không cần gọi thêm
- `confirm()` là custom function (override `window.confirm`) — nhận callback không phải return boolean
- CSS cache: bump `?v=N` trong index.html (css/style.css + tất cả js) và sw.js STATIC array
- Dùng `node scripts/bump.js` để tự động bump tất cả cùng lúc
- `hst-home` là flex item của `screen-history` — KHÔNG dùng z-index < 20 cho `.hst-sub` (sẽ bị top-bar che)
- Quiz mode default là `'all'` (hiện tất cả câu) — `'one-by-one'` là chế độ thứ 2
- `shuffleOptions(q)` trả về câu hỏi mới với options đảo và `correct` đã cập nhật
- `renderHistoryMistakes()` dùng `el.innerHTML = ...` → overwrite toàn bộ `hst-mistakes-body`

---

## ROADMAP (chưa làm)

- Xem lại lịch sử chi tiết — click vào history entry → xem lại đáp án
- Export toàn bộ — nút xuất tất cả sets ra 1 file JSON
