# Render 部署說明

這個專案已經補好 Render 基本設定，主要檔案是 [render.yaml](C:\Users\USER\Desktop\DC機器人\render.yaml)。

## 建議做法

1. 把專案推到 GitHub
2. 到 [Render](https://render.com/) 建立新的 `Web Service`
3. 選你的 GitHub repo
4. Render 偵測到 `render.yaml` 後，直接用它的設定建立服務

## 重要提醒

- 免費方案可以先上線測試，但服務閒置時可能休眠
- 你這個專案目前資料預設存 JSON 檔
- 如果未來要長期正式使用，建議至少改成：
  - Render Persistent Disk
  - 或 PostgreSQL / 外部資料庫

## 必填環境變數

這些一定要去 Render 後台手動補：

- `DISCORD_TOKEN`
- `DISCORD_CLIENT_ID`
- `DISCORD_CLIENT_SECRET`
- `DISCORD_GUILD_ID`
- `DEFAULT_ADMIN_KEY`
- `WEB_ORIGIN`
- `OPAY_MERCHANT_ID`
- `OPAY_HASH_KEY`
- `OPAY_HASH_IV`
- `OPAY_STAGE`
- `OPAY_RETURN_URL`
- `OPAY_PAYMENT_INFO_URL`
- `OPAY_CLIENT_BACK_URL`

如果之後要接 PAYUNi，再補：

- `PAYUNI_MERCHANT_ID`
- `PAYUNI_HASH_KEY`
- `PAYUNI_HASH_IV`
- `PAYUNI_STAGE`
- `PAYUNI_NOTIFY_URL`
- `PAYUNI_RETURN_URL`

## Render 上推薦的網址格式

假設你的 Render 網址是：

`https://dc-bot-store.onrender.com`

那你應該這樣填：

```env
WEB_ORIGIN=https://dc-bot-store.onrender.com
OPAY_RETURN_URL=https://dc-bot-store.onrender.com/api/opay/return
OPAY_PAYMENT_INFO_URL=https://dc-bot-store.onrender.com/api/opay/payment-info
OPAY_CLIENT_BACK_URL=https://dc-bot-store.onrender.com/shop
DISCORD_OAUTH_REDIRECT_URL=https://dc-bot-store.onrender.com/api/auth/discord/callback
PAYUNI_NOTIFY_URL=https://dc-bot-store.onrender.com/api/payuni/direct/notify
PAYUNI_RETURN_URL=https://dc-bot-store.onrender.com/api/payuni/direct/return
```

## 資料儲存

這個專案現在支援 `DATA_DIR`。

如果你之後有掛 Persistent Disk，可以把：

```env
DATA_DIR=/opt/render/project-data/data
```

這樣 JSON 資料就不會只留在暫時檔區。
