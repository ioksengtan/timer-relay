# 計時停錶挑戰 / Timer Stop Challenge

同機派對遊戲（timer-relay）：兩隊各派 2 人，輪流在心中默數後按下大红停錶鈕，比誰比較接近目標秒數。

視覺靈感來自 YouTube Shorts「Timer Relay Race」：暗底、紅色七段 LED 秒錶、巨大紅色停錶鈕、目標與誤差疊字。

## 規則（v1 鎖定）

- 一次只打一組對戰。打完再進入下一組。
- 每組：兩隊各 2 名球員（共 4 個名字）。
- 固定 5 輪，目標依序為 **1、2、3、4、5 秒**。
- 秒錶從 0 往上跑；球員默數後用大鈕或空白鍵停錶。
- 單輪誤差 = |停錶時間 − 目標|。
- **隊內輪流：** 同隊兩人交替完成該隊的 5 次停錶。對手另外打自己的 5 輪、累計自己的誤差。不是 A、B 每輪對打。
- 本實作流程：甲隊先打完 5 輪，再換乙隊打完 5 輪。
- 組結束：各隊 5 輪絕對誤差加總，較低者勝，然後可開「下一組」。

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

操作：設定隊名與四位球員 → 開始對戰。輪到的人按「開始」或空白鍵，默數後按「停」或空白鍵。在輸入框打字時空白鍵不會停錶。

## 計時

經過時間一律用 `performance.now()`，畫面用 `requestAnimationFrame` 更新。**不用** `setInterval` 推進秒數。分數對齊 LED 的百分之一秒（百分秒）。

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
| `test/game.test.js` | 輪流順序、誤差、勝負 |

## Rules (English)

Same-device party game. Two teams, two players each. Five rounds with targets 1s–5s. Timer counts up from 0; stop with the big button or Space. Teammates alternate covering their team's five stops; each team totals its own absolute error. Lower total wins. Then start the next matchup. Open `index.html` or serve the folder as above.
