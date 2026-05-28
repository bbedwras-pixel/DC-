# Discord 評價機器人 + 管理網站

這個專案提供一套完整的 Discord 伺服器工具：

- 評價系統：星級按鈕 + 彈窗留言 + 漂亮 Embed
- 開單系統：按鈕開單、認領、關單、紀錄
- 自動回覆系統：可從網站設定關鍵字與回覆內容
- 管理網站：高質感設定後台，直接調整機器人設定

## 技術棧

- `discord.js` 建立 Discord Bot
- `express` 提供設定 API
- `react + vite` 建立管理網站
- `typescript` 全端統一型別
- JSON 檔案作為預設資料儲存，方便先跑起來

## 專案結構

- `apps/server` Discord Bot + API Server
- `apps/web` 管理網站
- `packages/shared` 共用型別與預設設定
- `data` 儲存伺服器設定與資料

## 安裝

```bash
npm install
```

### 新電腦移機

如果這是新電腦，先看 [MIGRATION_GUIDE.md](C:\Users\USER\Desktop\DC機器人\MIGRATION_GUIDE.md)。

也可以直接執行檢查腳本：

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\check-new-pc.ps1
```

## 環境變數

在根目錄建立 `.env`：

```env
DISCORD_TOKEN=你的機器人Token
DISCORD_CLIENT_ID=你的機器人Client ID
DISCORD_GUILD_ID=你的測試伺服器ID
PORT=3001
DATA_DIR=
WEB_ORIGIN=http://localhost:5173
DEFAULT_ADMIN_KEY=change-me
OPAY_MERCHANT_ID=
OPAY_HASH_KEY=
OPAY_HASH_IV=
OPAY_STAGE=true
OPAY_RETURN_URL=
OPAY_PAYMENT_INFO_URL=
OPAY_CLIENT_BACK_URL=http://localhost:5173
```

## Render 部署

如果你不想一直開著自己的電腦，可以直接部署到 Render。

- Render 設定檔：[render.yaml](C:\Users\USER\Desktop\DC機器人\render.yaml)
- Render 部署說明：[RENDER_DEPLOY.md](C:\Users\USER\Desktop\DC機器人\RENDER_DEPLOY.md)

重點是：

- 網站會用 Render 的固定網址
- 歐付寶 / Discord OAuth / PAYUNi 回呼都可以改成 Render 網址
- 如果要長期正式使用，建議之後加 Persistent Disk 或資料庫

### 歐付寶超商代碼

若要使用網站內的歐付寶快速收款功能，請另外填入：

- `OPAY_MERCHANT_ID`
- `OPAY_HASH_KEY`
- `OPAY_HASH_IV`
- `OPAY_RETURN_URL`
- `OPAY_PAYMENT_INFO_URL`

設定完成後，可在網站右側直接產生超商代碼付款頁。

## 開發

一鍵同時啟動 Bot + API + 網站：

```bash
npm run dev
```

也可以用更簡單的指令：

```bash
npm run open
```

Windows 也可直接雙擊執行 [開啟機器人.cmd](C:\Users\USER\Desktop\DC機器人\開啟機器人.cmd)。

### 區網兩台電腦都能開網站

如果兩台電腦在同一個網路下，請把根目錄 `.env` 的 `WEB_ORIGIN` 設成逗號分隔，多填一個你的主機 IP，例如：

```env
WEB_ORIGIN=http://localhost:5173,http://192.168.1.100:5173
OPAY_CLIENT_BACK_URL=http://192.168.1.100:5173
```

網站現在會透過 Vite 代理自動把 `/api` 轉到本機後端 `3001`，所以另一台電腦只要開網站網址，不需要另外手動改 API 位址。

之後在主機電腦執行 `npm run open`，另一台電腦用瀏覽器開：

```text
http://192.168.1.100:5173
```

請把 `192.168.1.100` 換成你實際主機電腦的區網 IP。

如果你只想單獨開後端：

```bash
npm run dev:server
```

如果你只想單獨開網站：

```bash
npm run dev:web
```

## 功能說明

### 評價系統

- 管理員可用 `/deploy-review-panel` 發送評價面板
- 使用者點擊星等後會跳出 Modal 輸入內容
- 評價會送到指定頻道並寫入資料

### 開單系統

- 管理員可用 `/deploy-ticket-panel` 發送開單面板
- 使用者可建立專屬工單頻道
- 支援認領、關閉工單

### 自動回覆

- 伺服器成員發言命中關鍵字時自動回覆
- 可於網站設定大小寫、完全匹配、冷卻時間

### 管理網站

- 調整品牌名稱、主視覺、配色
- 設定評價面板文案與頻道
- 設定工單分類、面板與權限角色
- 設定自動回覆規則

## 注意

- 目前預設使用本地 JSON 儲存，適合 MVP 與中小型伺服器
- 若之後要上正式環境，建議把儲存層換成 PostgreSQL 或 MongoDB
