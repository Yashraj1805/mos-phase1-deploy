# backend/app/main.py
import sys

# Force UTF-8 on stdio so the orchestrator's emoji print()s don't crash the
# request on Windows consoles (cp1252 can't encode ⚡/🤖/⚠️/✨).
for stream in (sys.stdout, sys.stderr):
    try:
        stream.reconfigure(encoding="utf-8")
    except Exception:
        pass

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
from app.api.routers import api_router
from app.db.database import engine
from app.db import models

# Application startup par saare SQLite tables ko generate karna
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Multi-Agent Operating System (MOS) - Phase 1")

# Clean CORS Policy - Allows ALL Origins, Methods, and Headers
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Saare domains/origins ko explicitly allow karta hai
    allow_credentials=True,
    allow_methods=["*"],  # GET, POST, OPTIONS saare standard methods allow karta hai
    allow_headers=["*"],  # Content-Type, Authorization saare headers allow karta hai
)

# Core API router network assignment loading
app.include_router(api_router)

_ROOT_HTML = """<!doctype html>
<html><head><meta charset="utf-8"><title>MOS Backend</title>
<style>
  body { background:#080C12; color:#F0F4F8; font-family:system-ui,sans-serif; padding:48px; line-height:1.6; }
  a { color:#22D3EE; text-decoration:none; }
  .badge { display:inline-block; background:#22D3EE12; color:#22D3EE; border:1px solid #22D3EE30;
           padding:4px 12px; border-radius:100px; font-size:12px; margin-bottom:24px; }
  .card { background:#0D1117; border:1px solid #1F2937; border-radius:14px; padding:22px 26px;
          margin:16px 0; max-width:680px; }
  code { background:#111827; padding:2px 8px; border-radius:6px; font-family:ui-monospace,Consolas,monospace; }
  h1 { font-size:28px; margin-bottom:8px; font-weight:500; }
  h3 { font-size:14px; color:#9CA3AF; text-transform:uppercase; letter-spacing:1px;
       margin-bottom:10px; font-weight:600; }
  p, li { color:#9CA3AF; font-size:14px; }
  li { margin-bottom:6px; }
</style></head>
<body>
  <div class="badge">● MOS Backend API · Running</div>
  <h1>You opened the <em>backend</em>, not the UI.</h1>
  <p>The visual app (AgentOS) lives on a different port.</p>
  <div class="card">
    <h3>Open the UI</h3>
    <p style="font-size:16px;color:#F0F4F8">→ <a href="http://127.0.0.1:5173">http://127.0.0.1:5173</a></p>
  </div>
  <div class="card">
    <h3>This server's endpoints</h3>
    <ul>
      <li><code>GET  /health</code> — service check</li>
      <li><code>GET  /docs</code> — Swagger UI (try every endpoint)</li>
      <li><code>POST /config/create</code> · <code>GET /config/{tenant}</code></li>
      <li><code>POST /leads/create</code></li>
      <li><code>POST /chat/message</code> — analytics → sales/support, persists to SQLite</li>
      <li><code>POST /reports/generate</code> — summary + Manager AI recs</li>
      <li><code>POST /scenario/analyze</code> — deterministic patterns + Scenario Engine LLM</li>
    </ul>
  </div>
</body></html>"""


@app.get("/", response_class=HTMLResponse)
def read_root():
    return _ROOT_HTML