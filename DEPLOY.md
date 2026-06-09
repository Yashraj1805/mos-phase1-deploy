# MOS Deployment Guide — Render + Vercel

End-to-end: backend on Render (free), frontend on Vercel (free).
Estimated time: **20–30 minutes** the first time.

---

## Prerequisites

- [ ] GitHub account
- [ ] Render account — sign up free at https://render.com (use GitHub login)
- [ ] Vercel account — sign up free at https://vercel.com (use GitHub login)
- [ ] Git installed locally

---

## ⚠️ STEP 0 — Rotate your Gemini API key (DO THIS FIRST)

The old key (`AIzaSyADkzkq...`) was shared in chat history and may be leaked. Get a fresh one:

1. Go to https://aistudio.google.com/apikey
2. Delete the old key.
3. Click **"Create API Key"** → copy the new value somewhere safe (Notepad).
4. Do NOT put it in any file you commit. We will set it as an env var on Render.

---

## STEP 1 — Push code to a new GitHub repo

You'll create a new empty repo on GitHub, then push this local folder to it.

### 1a. Create the empty repo on GitHub

1. Go to https://github.com/new
2. Repository name: `mos-phase1-deploy` (or whatever you want)
3. **Important:** Do NOT initialize with README, .gitignore, or LICENSE. Keep it empty.
4. Click **"Create repository"**
5. Copy the URL — looks like `https://github.com/<your-username>/mos-phase1-deploy.git`

### 1b. Push from local

Open PowerShell (or any terminal) and `cd` into the repo:

```powershell
cd c:\Users\dyash\Downloads\mos-phase1\mos-phase1-remote
```

If `.git` already exists (it does — was cloned earlier), update the remote:

```powershell
git remote remove origin
git remote add origin https://github.com/<your-username>/mos-phase1-deploy.git
```

Stage, commit, push:

```powershell
git add .
git commit -m "Initial deploy-ready MOS code"
git branch -M main
git push -u origin main
```

If asked to authenticate, use a GitHub Personal Access Token (https://github.com/settings/tokens — "Tokens (classic)" → Generate new token → check `repo` scope → copy).

✅ Verify: open the GitHub repo in browser. You should see `backend/`, `mos-demo/`, `render.yaml`, `DEPLOY.md`, etc.

---

## STEP 2 — Deploy the backend on Render

1. Go to https://dashboard.render.com → click **"New +"** → **"Blueprint"**
2. Click **"Connect a repository"** → select your `mos-phase1-deploy` repo.
3. Render reads `render.yaml` at the root → shows it will create one service: `mos-backend`.
4. Click **"Apply"**.
5. Render starts building. First build takes 3–5 minutes.

### 2a. Set the GEMINI_API_KEY env var

Render will fail the first run because GEMINI_API_KEY isn't set. While it's building:

1. Click on the `mos-backend` service in the Render dashboard.
2. Go to **"Environment"** tab on the left.
3. Click **"Add Environment Variable"**:
   - Key: `GEMINI_API_KEY`
   - Value: (paste the new Gemini key from Step 0)
4. Click **"Save Changes"** — Render auto-redeploys.

### 2b. Verify backend is live

Once status is **"Live"**, copy the URL — looks like `https://mos-backend-xxxx.onrender.com`.

Test in browser:
- `https://mos-backend-xxxx.onrender.com/health` → should return `{"status":"ok",...}`
- `https://mos-backend-xxxx.onrender.com/` → should show the dark HTML landing page

✅ Backend live. Save this URL — you'll paste it into Vercel next.

---

## STEP 3 — Deploy the frontend on Vercel

1. Go to https://vercel.com/new
2. **"Import Git Repository"** → select your `mos-phase1-deploy` repo.
3. Vercel detects the monorepo. Click **"Configure"** → set:
   - **Root Directory**: `mos-demo` (click "Edit" if needed)
   - **Framework Preset**: Vite (should auto-detect)
4. Expand **"Environment Variables"**:
   - Name: `VITE_API_BASE`
   - Value: `https://mos-backend-xxxx.onrender.com` (the Render URL from Step 2b — no trailing slash)
   - Apply to: Production, Preview, Development
5. Click **"Deploy"**.
6. Build takes ~1 minute.

### 3a. Verify frontend

When done, Vercel shows your URL: `https://mos-phase1-deploy-xxx.vercel.app`.

Open it. Connection banner top-left should be GREEN — connected to backend.

✅ Both live.

---

## STEP 4 — Test the full demo

1. Open the Vercel URL.
2. Sidebar should show **Live Demo** + **Issue Triage** only.
3. Click **Live Demo** → hit **▶ Start processing all 5 leads**.
4. You should see leads stagger through Analytics with rich fields (sentiment, urgency, deal value, signals, tags).
5. WhatsApp chats for sales-routed, Support cards for refund-routed.
6. **Generate Manager AI report** at the bottom.

If chat is slow on first request after sleep → backend cold-starting. Wait ~30 sec.

---

## Operational notes

### Render free tier cold start
- Backend sleeps after **15 min idle**.
- First request after sleep: ~30–60 sec wake-up.
- Before client demo: open `https://<your-backend>.onrender.com/health` in browser to wake it.
- Or upgrade to Render paid ($7/mo) — always-on.

### Updating code later
Just push to GitHub:
```powershell
git add .
git commit -m "Update X"
git push
```
- Render auto-deploys backend
- Vercel auto-deploys frontend

### Useful URLs
- Render dashboard: https://dashboard.render.com
- Vercel dashboard: https://vercel.com/dashboard
- Backend logs: Render service → "Logs" tab
- Frontend logs: Vercel project → "Deployments" → click any deploy → "View Function Logs" (only for SSR; for static SPA you use browser DevTools)

### Cost summary
- Render free tier: 750 hours/month (one always-on service ≈ 720 hrs) — **₹0 if not idle-killed**
- Vercel free tier: 100 GB bandwidth/month — **₹0 for any reasonable demo traffic**
- Total: **₹0/month**

### Going paid later
- Render Starter ($7/mo): always-on, no cold start, more compute
- Vercel Pro ($20/mo): teams, analytics, more bandwidth
- Both have one-click upgrade in dashboard

---

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| Banner "OFFLINE" on frontend | Backend URL wrong in VITE_API_BASE | Vercel dashboard → Project → Settings → Environment Variables → fix → Redeploy |
| Backend 500 on /chat/message | `GEMINI_API_KEY` not set, or invalid | Render dashboard → mos-backend → Environment → check the var → restart |
| Build fails on Render: "module not found" | Missing dep in requirements.txt | Add it locally → push → Render auto-rebuilds |
| Build fails on Vercel: "vite not found" | Wrong root directory | Vercel project → Settings → General → Root Directory = `mos-demo` |
| CORS error in browser console | Frontend origin not in CORS allowlist | Backend has `allow_origins=["*"]` — should not happen. If it does, check the URL has no trailing slash. |

---

That's it. After Step 4, both URLs are public. Send the Vercel URL to anyone.
