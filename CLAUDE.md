# CLAUDE.md — Quiz App

## QUY TẮC LÀM VIỆC (BẮT BUỘC)

**Mức 1 — NHANH (code ngay):** bug rõ, CSS tweak, đổi text, < ~30 dòng
**Mức 2 — VỪA (hỏi 1 lần rồi code):** thêm feature nhỏ, sửa logic 1-2 file
**Mức 3 — LỚN (dừng chờ duyệt từng bước):** thay đổi data model, flow, kiến trúc

**Khi user nói "code đi / làm đi / fix đi" → implement ngay không hỏi thêm.**

**Token tiết kiệm:**
- KHÔNG đọc dạo file để "hiểu context" — Grep đúng mục tiêu, Read đúng đoạn cần
- Sửa CSS/HTML không cần test. Sửa JS logic → mở browser kiểm tra console
- Trả lời ngắn: kết quả + việc đã làm, không giải thích dài

**Git (BẮT BUỘC):**
- Sau mỗi thay đổi: commit + push lên CÙNG LÚC cả `claude/vietnamese-greeting-q0n2ab` VÀ `main`
- `main` auto-deploy Cloudflare Pages — push là deploy
- Bump cache version `?v=N` trong index.html mỗi lần sửa JS hoặc CSS (tránh cache)
- KHÔNG tạo PR, KHÔNG subscribe PR activity

---

## DỰ ÁN

**Quiz App** — SPA trắc nghiệm chạy trên browser, không cần server.
- Vanilla HTML + CSS + JS, không framework, không build tool
- Lưu trữ: `localStorage` (`quiz_sets`, `quiz_history`)
- Deploy: GitHub Pages (`trantien2k5.github.io/Quiz/`)

---

## KIẾN TRÚC FILE

```
index.html    ← shell duy nhất, load tất cả <script>/<link>
style.css     ← toàn bộ CSS
app.js        ← toàn bộ JS logic
CLAUDE.md     ← file này
```

**Không có module system** — tất cả JS là global scope. Đặt tên function cẩn thận, tránh trùng.

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

`showScreen(id)` trong `screens[]` array — thêm screen mới phải thêm vào array này.

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

**Storage:**
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

**Render (gọi sau khi mutate data):**
```js
renderHome()       // refresh trang chủ (recent sets + recent history)
renderLibrary()    // refresh kho đề (library screen)
renderHistory()    // refresh kết quả (stats + full history)
```

**Navigation:**
```js
navTo('home' | 'library' | 'history')   // chuyển tab + refresh content
showScreen('screen-xxx')                 // chuyển màn không refresh data
```

**UI utils:**
```js
toast('message', 'success'|'error'|'')  // thông báo nổi
confirm('title', 'msg', onOkFn)         // dialog xác nhận custom
esc(str)                                 // escape HTML — BẮT BUỘC khi render user data
```

**Quiz:**
```js
showQuizSettings(setId)    // mở modal cài đặt trước khi làm bài
startQuiz(setId, settings) // bắt đầu quiz với settings {shuffleQ, shuffleOpts, numQ}
```

---

## PATTERN THÊM TÍNH NĂNG

### Thêm field mới vào câu hỏi
1. `buildQuestionCard()` — thêm input field
2. `addQuestion()` — thêm default value
3. `saveEditor()` — map field khi lưu
4. `buildSetCard()` / kết quả — hiện field nếu cần
5. `importSetsFromData()` — parse field từ JSON import

### Thêm section vào tab
- Home: thêm element vào `screen-home`, render trong `renderHome()`
- Library: thêm vào `screen-library`, render trong `renderLibrary()`
- History: thêm vào `screen-history`, render trong `renderHistory()`

### Thêm tab mới
1. Thêm `<button data-nav="name">` vào `#bottom-nav` trong index.html
2. Thêm `<section id="screen-name">` vào index.html
3. Thêm `'screen-name'` vào `screens[]` trong app.js
4. Thêm `else if (name === 'name') { ... }` vào `navTo()` trong app.js

### Thêm modal mới
1. Thêm `<div id="modal-xxx" class="modal-overlay">` vào index.html
2. Thêm functions `showXxx()` / `hideXxx()` vào app.js (toggle class `active`)

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

- Class prefix theo khu vực: `.set-*`, `.quiz-*`, `.result-*`, `.recent-*`, `.stat-*`, `.ai-*`
- Button base: `.btn` + modifier `.btn-primary / -secondary / -danger / -outline / -sm / -full`
- Tất cả button kế thừa ripple effect tự động (class `.btn`)

---

## GOTCHAS

- `esc(str)` BẮT BUỘC khi render bất kỳ string nào từ user/data vào HTML
- Sau mỗi mutate data → gọi `renderXxx()` tương ứng để UI sync
- `navTo()` tự gọi `renderXxx()` — nếu đang ở đúng screen thì không cần gọi thêm
- `confirm()` là custom function (override `window.confirm`) — nhận callback không phải return boolean
- CSS cache: bump `?v=N` trong index.html mỗi lần sửa CSS/JS (cả 2 dòng: `style.css?v=N` và `app.js?v=N`)
- Quiz mode default là `'all'` (hiện tất cả câu) — `'one-by-one'` là chế độ thứ 2
- `shuffleOptions(q)` trả về câu hỏi mới với options đảo và `correct` đã cập nhật

---

## ROADMAP (chưa làm)

- Luyện lại câu sai — sau khi xem kết quả, tạo quiz từ câu trả lời sai
- Xem lại lịch sử chi tiết — click vào history entry → xem lại đáp án
- Export toàn bộ — nút xuất tất cả sets ra 1 file JSON
