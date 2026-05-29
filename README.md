# 工研菁英記者會 AI 新聞助理 v2

## 檔案結構

```
itri-press-v2/
├── api/
│   ├── chat.js       ← 對話 API（讀取 SYSTEM_PROMPT 環境變數）
│   └── admin.js      ← 後台更新 API
├── public/
│   ├── index.html    ← 記者前台
│   └── admin.html    ← 後台管理介面
├── vercel.json
├── package.json
└── README.md
```

---

## 部署步驟

### 1. 上傳到 GitHub

1. 登入 github.com
2. 右上角「+」→「New repository」
3. 名稱填 `itri-press-ai`，選 Private，點「Create repository」
4. 點「uploading an existing file」
5. 把本資料夾**裡面**的所有檔案（api/ public/ vercel.json package.json README.md）拖進去
6. 點「Commit changes」

### 2. 部署到 Vercel

1. 前往 vercel.com，用 GitHub 帳號登入
2. 點「Add New Project」→ 選 `itri-press-ai`
3. Framework Preset 選「Other」
4. 點「Deploy」

### 3. 設定環境變數（4 個）

部署完成後 → Settings → Environment Variables，逐一新增：

| Name | Value | 說明 |
|------|-------|------|
| `ANTHROPIC_API_KEY` | sk-ant-... | Anthropic API Key |
| `ADMIN_PASSWORD` | 自訂密碼 | 後台登入密碼 |
| `VERCEL_TOKEN` | 見下方說明 | Vercel API Token |
| `VERCEL_PROJECT_ID` | 見下方說明 | 這個專案的 ID |

**取得 VERCEL_TOKEN：**
vercel.com → 右上角頭像 → Account Settings → Tokens → Create Token

**取得 VERCEL_PROJECT_ID：**
Vercel 專案頁面 → Settings → General → 往下捲找「Project ID」

### 4. Redeploy

Settings 存好後 → Deployments → 最新一筆「⋯」→ Redeploy

---

## 使用方式

- **記者前台**：https://你的網址.vercel.app/
- **後台管理**：https://你的網址.vercel.app/admin

後台輸入密碼後，直接在文字框貼上新聞稿與技術資料，點「儲存並更新」，約 30 秒生效。
