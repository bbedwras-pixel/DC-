# 新電腦移機指南

這份專案已經包含：

- 原始碼
- `data` 內的機器人設定與紀錄
- `node_modules`
- 已編譯的 `dist`

目前新電腦缺少的是執行環境，不是專案本體。

## 1. 必裝項目

請先安裝：

- Node.js 20 LTS 或更新版
- Git for Windows

安裝完成後，重新開一個 PowerShell 視窗，在專案根目錄執行：

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\check-new-pc.ps1
```

## 2. 必搬資料

移機時最重要的是以下內容：

- `.env`
- `data\settings.json`
- `data\reviews.json`
- `data\tickets.json`
- `data\giveaways.json`

如果舊電腦上有額外自訂檔，也一起帶過來。

## 3. 啟動前確認

`.env` 至少要確認以下欄位已填好：

- `DISCORD_TOKEN`
- `DISCORD_CLIENT_ID`
- `DISCORD_GUILD_ID`
- `DEFAULT_ADMIN_KEY`

若有使用超商代碼付款，還要確認：

- `OPAY_MERCHANT_ID`
- `OPAY_HASH_KEY`
- `OPAY_HASH_IV`
- `OPAY_RETURN_URL`
- `OPAY_PAYMENT_INFO_URL`

## 4. 首次啟動

安裝完 Node.js 之後，在專案根目錄執行：

```powershell
npm install
npm run dev
```

如果只想先開機器人與 API：

```powershell
npm run dev:server
```

如果只想先開網站：

```powershell
npm run dev:web
```

## 5. 常見問題

### `node` 或 `npm` 無法辨識

代表 Node.js 還沒安裝，或安裝後尚未重新開啟終端機。

### `git` 無法辨識

代表 Git for Windows 尚未安裝，之後若要同步版本會受影響。

### Bot 沒上線

優先檢查：

- `.env` 的 `DISCORD_TOKEN` 是否正確
- Bot 是否仍在你的 Discord 開發者後台中
- 該 Bot 是否已邀請進目標伺服器

### 網站打不開 API

優先檢查：

- `PORT` 是否被其他程式占用
- `WEB_ORIGIN` 是否對應目前前端網址

## 6. 建議做法

建議把 `.env` 與 `data` 另外備份到雲端或隨身碟。之後即使換電腦，只要裝好 Node.js 與 Git，再把這兩部分放回來就能快速接手。
