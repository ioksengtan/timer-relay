# 計時停錶挑戰 / Timer Stop Challenge

同機派對遊戲（timer-relay）：心中默數後按下大红停錶鈕，比誰比較接近目標秒數。可自己玩、1 對 1，或兩隊各 2 人的 2v2。

視覺靈感來自 YouTube Shorts「Timer Relay Race」：暗底、紅色七段 LED 秒錶、巨大紅色停錶鈕、目標與誤差疊字。

## 規則

- 一次只打一組（或一局）。打完再進入下一組。
- 三種模式（設定頁選擇，第一次開啟預設 **2v2**，之後這台裝置記住上次的模式）：
  - **自己玩**：填 1 個名字，打完整個目標序列一次，看累計絕對誤差。
  - **1v1**：兩位玩家。玩家 A 先打完整個序列，再換玩家 B。較低總誤差勝。
  - **2v2**：兩隊各 2 人。同隊兩人交替完成該隊序列；甲隊先打完，再換乙隊。較低總誤差勝。
- 預設目標為 **1、2、3、4、5 秒**，開打前可改成逗號分隔清單（至少 1 個，最多 20 個；每個大於 0 且不超過 60 秒）。也可點「短 1,2,3」「標準 1,2,3,4,5」「長 3,4,5,6,7」填入，欄位仍可自己改。
- 模式、名字與目標秒數會記在這台裝置的瀏覽器（localStorage）。打不開儲存時就略過，不影響開打。
- 打完後主按鈕「再來一局」（自己玩）或「下一組」（1v1／2v2）用同一設定直接再開。要改內容按「修改設定」。
- 秒錶從 0 往上跑；進行中不顯示即時數字，停錶後才亮 LED。
- 單輪誤差 = |停錶時間 − 目標|。分數是各輪絕對誤差加總。
- 大鈕或空白鍵開始／停錶。在輸入框打字時空白鍵不會停錶。

沒有帳號、連線或排行榜。

## 本機執行

這是靜態網頁，不必編譯。

**方式 A — 直接開檔**

用瀏覽器打開專案根目錄的 `index.html`。

**方式 B — 本機伺服器（建議，尤其是手機連同一台電腦測）**

```bash
# 任選其一
python3 -m http.server 8080
# 或
npx --yes serve -l 8080
```

然後開 <http://localhost:8080>。手機請用電腦區網 IP，直向直式畫面最佳。

操作：選模式、填名字、確認或改目標秒數 → 開始。輪到的人按「開始」或空白鍵，默數後按「停」或空白鍵。

## 計時

經過時間一律用 `performance.now()`，**不用** `setInterval` 推進秒數。分數對齊 LED 的百分之一秒（百分秒）。

## 手機直握

派對時把手機直著拿、用瀏覽器打開（GitHub Pages 為 https，Wake Lock 才會生效）。比賽畫面會：

- 鎖住捲動、雙擊放大與雙指縮放，避免默數時畫面跑掉。
- 在支援 Screen Wake Lock 的瀏覽器保持螢幕亮著；不支援就略過。
- 開始與停錶時短震一下；不支援就略過。

姓名與目標秒數的輸入框為 16px，聚焦時不會把整頁放大。`index.html` 裡的 `?v=` 是靜態資源版本，改 css／js 時要一起加。

## 測試規則邏輯

需要 Node.js：

```bash
node test/game.test.js
```

## 檔案

| 路徑 | 說明 |
| --- | --- |
| `index.html` | 設定 / 比賽 / 結果畫面 |
| `css/styles.css` | 直式優先、LED 與停錶鈕 |
| `js/game.js` | 規則（瀏覽器與 Node 共用） |
| `js/app.js` | 畫面、高解析計時、觸控／滑鼠／空白鍵 |
| `test/game.test.js` | 模式、目標序列、輪流順序、誤差、勝負 |

## Rules (English)

Same-device party game. Pick **solo**, **1v1**, or **2v2**. The first visit still defaults to **2v2** so an existing party group is not switched to solo; later visits on that device restore the last mode, names, and target list from localStorage (if storage is blocked, the form simply keeps its defaults). Default targets are 1–5 seconds and can be edited before start, or filled from the short / standard / long presets. After a match, **再來一局** (solo) or **下一組** (1v1 / 2v2) starts again with that same setup in one tap; **修改設定** returns to the form. Timer counts up from 0 with live digits hidden; stop with the big button or Space. Score is total absolute error. In 2v2, teammates alternate covering their team's stops and Team A goes first; in 1v1, Player A finishes the whole sequence, then Player B. Lower total wins. On a phone held upright, the play screen blocks accidental zoom and scroll, asks the browser to keep the screen awake while that screen is open, and vibrates lightly on start and stop when the device supports it. Open `index.html` or serve the folder as above.
