import { Fragment, useCallback, useEffect, useRef, useState } from "react";

const API_BASE = import.meta.env.VITE_API_BASE || "http://127.0.0.1:8765";
const TENANT_ID = "demo_business";

const PAGES = [
  { id: "flow",      label: "Live Demo",    icon: "▶", color: "var(--sales)", desc: "Multi-platform parallel flow" },
  { id: "support_q", label: "Issue Triage", icon: "🛟", color: "var(--bad)",   desc: "Existing customers · genuine vs not" },
];

// ─── VERTICALS — each one ships its own business config + 5 sample leads.
// Switcher at top of FlowDemoPage swaps these; switching creates a fresh
// session tenant so Manager AI reports stay scoped to one vertical.
const VERTICALS = {
  coaching: {
    id: "coaching", emoji: "📚", label: "Demo Coaching", industry: "Education", color: "#22D3EE",
    config: {
      business_name: "Demo Coaching", industry: "Education", tone: "Friendly Hinglish",
      primary_goal: "Book demo class", primary_cta: "Book free demo class",
      qualification_questions: ["Which class / exam?", "Subject?", "Monthly budget?"],
      do_not_say: ["guaranteed admission", "100% selection", "result guarantee"],
      faqs: [
        { q: "Refund policy?", a: "7 days mein full refund" },
        { q: "Demo class kab milti hai?", a: "Same-day free demo, evening slots open" },
      ],
      escalation_rules: ["payment dispute", "threatening tone", "result complaint"],
    },
    leads: [
      { id: "C1", avatar: "R", name: "Rohan Sharma", city: "Noida", info: "Class 10 student",
        platform: "Instagram DM", platformIcon: "📷", platformColor: "#E1306C", time: "2 min ago",
        message: "Hi! Class 10 ke liye coaching plan dekh raha hoon. Aapke course ka price kya hai? Demo timings bhi share karein." },
      { id: "C2", avatar: "P", name: "Priya Verma", city: "Pune", info: "Class 11 PCM",
        platform: "Facebook Ad", platformIcon: "ⓕ", platformColor: "#1877F2", time: "4 min ago",
        message: "Free demo book karni hai class 11 PCM ke liye, mornings prefer karunga." },
      { id: "C3", avatar: "A", name: "Aditya Kapoor", city: "Bengaluru", info: "Existing customer",
        platform: "Inbound Call", platformIcon: "📞", platformColor: "#10B981", time: "7 min ago",
        message: "Maine kal join kiya tha but class working nahi hai, login pe error aa raha. Refund chahiye please." },
      { id: "C4", avatar: "S", name: "Sneha Iyer", city: "Chennai", info: "Class 12 Board",
        platform: "Website form", platformIcon: "🌐", platformColor: "#0EA5E9", time: "11 min ago",
        message: "Class 12 boards ke liye crash course available hai? Budget around 5000-7000 per month hai." },
      { id: "C5", avatar: "K", name: "Karan Mehta", city: "Delhi", info: "JEE Aspirant",
        platform: "WhatsApp", platformIcon: "💬", platformColor: "#25D366", time: "14 min ago",
        message: "Buy followers cheap, earn $$$ free crypto guaranteed" },
    ],
  },
  real_estate: {
    id: "real_estate", emoji: "🏢", label: "ABC Realty", industry: "Real Estate", color: "#F59E0B",
    config: {
      business_name: "ABC Realty", industry: "Real Estate", tone: "Professional Hinglish",
      primary_goal: "Book site visit", primary_cta: "Schedule a site visit",
      qualification_questions: ["BHK config (2/3/4)?", "Budget range?", "Preferred location?", "Investment or end-use?"],
      do_not_say: ["guaranteed appreciation", "100% returns", "double money"],
      faqs: [
        { q: "Booking process?", a: "10% advance on agreement, balance per construction milestones" },
        { q: "Cancellation policy?", a: "30-day window with 2% deduction; after that case-by-case" },
        { q: "RERA registered?", a: "Haan, sab projects RERA-registered" },
      ],
      escalation_rules: ["payment dispute", "possession delay complaint", "RERA threat", "legal action"],
    },
    leads: [
      { id: "R1", avatar: "V", name: "Vikram Reddy", city: "Gurgaon", info: "Tech executive",
        platform: "Instagram DM", platformIcon: "📷", platformColor: "#E1306C", time: "3 min ago",
        message: "3BHK property dekhni hai Gurgaon mein, budget around 1.5-1.8 cr. Investment ke liye." },
      { id: "R2", avatar: "A", name: "Anjali Kapoor", city: "Delhi", info: "First-time buyer",
        platform: "Facebook Ad", platformIcon: "ⓕ", platformColor: "#1877F2", time: "6 min ago",
        message: "DLF Phase 2 mein site visit book karni hai is weekend, possible hai?" },
      { id: "R3", avatar: "M", name: "Manish Goyal", city: "Noida", info: "Existing customer (3 yr)",
        platform: "Inbound Call", platformIcon: "📞", platformColor: "#10B981", time: "9 min ago",
        message: "Possession 6 months delay ho gaya, maintenance bhi extra charge kar diya. Paisa wapas karo, legal action lunga." },
      { id: "R4", avatar: "S", name: "Sneha Pillai", city: "Pune", info: "Property investor",
        platform: "Website form", platformIcon: "🌐", platformColor: "#0EA5E9", time: "12 min ago",
        message: "Investment property chahiye Pune mein, 2BHK ya 3BHK, budget 80L-1cr. Rental yield zyada wala area suggest karo." },
      { id: "R5", avatar: "X", name: "Anonymous", city: "—", info: "Unverified",
        platform: "WhatsApp", platformIcon: "💬", platformColor: "#25D366", time: "15 min ago",
        message: "Crypto property tokens free guaranteed 50% returns, buy now limited offer" },
    ],
  },
  car_dealer: {
    id: "car_dealer", emoji: "🚗", label: "SmartDrive Motors", industry: "Automotive", color: "#10B981",
    config: {
      business_name: "SmartDrive Motors", industry: "Automotive", tone: "Friendly English-Hinglish mix",
      primary_goal: "Book test drive", primary_cta: "Schedule a free test drive",
      qualification_questions: ["Which model?", "EMI or down-payment?", "Trade-in available?", "Timeline to buy?"],
      do_not_say: ["guaranteed mileage", "lifetime free service", "zero maintenance"],
      faqs: [
        { q: "Finance options?", a: "EMI starts at 7.9% via SBI and HDFC. 15% down-payment minimum." },
        { q: "Test drive process?", a: "Free 30-min slot, license + ID proof zaroori hai" },
        { q: "Exchange bonus?", a: "Up to ₹30,000 on eligible vehicles this month" },
      ],
      escalation_rules: ["service complaint", "delivery delay", "billing dispute", "legal threat"],
    },
    leads: [
      { id: "A1", avatar: "A", name: "Arjun Mehta", city: "Mumbai", info: "First car buyer",
        platform: "Instagram DM", platformIcon: "📷", platformColor: "#E1306C", time: "2 min ago",
        message: "Hyryder G variant ka price kya hai? Finance options bhi batao, monthly EMI 25k tak afford kar sakta hoon." },
      { id: "A2", avatar: "P", name: "Pooja Singh", city: "Bengaluru", info: "Upgrading SUV",
        platform: "Facebook Ad", platformIcon: "ⓕ", platformColor: "#1877F2", time: "5 min ago",
        message: "Test drive book karna hai Creta ka, weekend mornings prefer karungi." },
      { id: "A3", avatar: "S", name: "Sanjay Verma", city: "Delhi", info: "Existing customer (2 yr)",
        platform: "Inbound Call", platformIcon: "📞", platformColor: "#10B981", time: "8 min ago",
        message: "Service center wale issue solve nahi kar rahe pichle 3 visits se, paisa galat charge hua, refund chahiye." },
      { id: "A4", avatar: "N", name: "Nikhil Bansal", city: "Hyderabad", info: "Corporate buyer",
        platform: "Website form", platformIcon: "🌐", platformColor: "#0EA5E9", time: "12 min ago",
        message: "Fleet ke liye 3 SUVs chahiye, Hyryder ya Creta. Corporate discount + EMI 8 lakh tak per car." },
      { id: "A5", avatar: "X", name: "Spammer", city: "—", info: "Unverified",
        platform: "WhatsApp", platformIcon: "💬", platformColor: "#25D366", time: "14 min ago",
        message: "Buy bots cheap, get dollars free crypto guaranteed earn $$$" },
    ],
  },
};

const DEFAULT_VERTICAL = "coaching";

// Back-compat aliases for older page components still in the file (Overview,
// AnalyticsPage, etc.) — not routed anymore but kept around so JS parses.
const SAMPLE_LEADS = VERTICALS.coaching.leads;
const SEED_CONFIG = { tenant_id: TENANT_ID, ...VERTICALS.coaching.config };
const DEMO_LEADS_DATA = VERTICALS.coaching.leads;

const SUPPORT_QUEUE = [
  { id: "S1", avatar: "M", name: "Manish Gupta", customerSince: "3 months", lastIssue: "1 day ago",
    issue: "Refund chahiye paisa wapas, course ka result nahi mila", color: "#EF4444" },
  { id: "S2", avatar: "T", name: "Tanvi Roy", customerSince: "6 weeks", lastIssue: "3 hours ago",
    issue: "Login nahi ho raha mobile pe, password reset bhi nahi aa raha email pe", color: "#F59E0B" },
  { id: "S3", avatar: "V", name: "Vikram Singh", customerSince: "8 months", lastIssue: "30 min ago",
    issue: "Aapne galat charge kiya, mujhe legal action lena padega isse, paisa double cut hua hai", color: "#EF4444" },
  { id: "S4", avatar: "N", name: "Neha Bansal", customerSince: "2 weeks", lastIssue: "5 hours ago",
    issue: "Class material download kaise karein? PDF kahan se milegi?", color: "#10B981" },
];

const uid = () =>
  (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now().toString(36))
    .replace(/-/g, "").slice(0, 16);

const nowTime = () => {
  const d = new Date();
  return `${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}:${String(d.getSeconds()).padStart(2,"0")}`;
};

async function api(path, body) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let data; try { data = JSON.parse(text); } catch { data = text; }
  if (!res.ok) throw Object.assign(new Error(`HTTP ${res.status}`), { status: res.status, body: data });
  return data;
}

// ─────────── primitive UI bits ───────────
function Dots() { return <span>{[0,1,2].map(i => <span key={i} className="dot">•</span>)}</span>; }

function PageHeader({ icon, color, title, subtitle }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 24 }}>
      <div style={{
        width: 44, height: 44, borderRadius: 12,
        background: `color-mix(in srgb, ${color} 15%, transparent)`,
        border: `1.5px solid color-mix(in srgb, ${color} 40%, transparent)`,
        display: "flex", alignItems: "center", justifyContent: "center", color,
        fontFamily: "monospace", fontSize: 20,
      }}>{icon}</div>
      <div>
        <div style={{ fontFamily: "'Instrument Serif',serif", fontSize: 28, letterSpacing: -0.5, lineHeight: 1.05 }}>{title}</div>
        <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 4, maxWidth: 720, lineHeight: 1.5 }}>{subtitle}</div>
      </div>
    </div>
  );
}

function StageCard({ title, color, icon, children, loading }) {
  return (
    <div className="slide-up" style={{
      background: `color-mix(in srgb, ${color} 6%, var(--surface))`,
      border: `1px solid color-mix(in srgb, ${color} 30%, var(--border))`,
      borderRadius: 12, padding: "16px 20px",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
        <div style={{
          width: 28, height: 28, borderRadius: 8,
          background: `color-mix(in srgb, ${color} 18%, transparent)`,
          border: `1px solid color-mix(in srgb, ${color} 45%, transparent)`,
          display: "flex", alignItems: "center", justifyContent: "center",
          color, fontFamily: "monospace", fontSize: 14,
        }}>{icon}</div>
        <div style={{ fontSize: 11.5, fontWeight: 700, color, letterSpacing: 0.8, textTransform: "uppercase" }}>{title}</div>
        {loading && <div style={{ marginLeft: "auto" }}><Dots /></div>}
      </div>
      {children}
    </div>
  );
}

function PipelineStrip({ stage, analyticsScore, routedAgent }) {
  const stepOrder = ["idle", "analytics", "routing", "agent", "done"];
  const stepIdx = stepOrder.indexOf(stage);
  const agentLabel = routedAgent === "support_ai" ? "Support AI" : "Sales AI";
  const agentColor = routedAgent === "support_ai" ? "var(--support)" : "var(--sales)";
  const steps = [
    { id: "lead",      label: "Lead",      icon: "👤", color: "var(--user)" },
    { id: "analytics", label: "Analytics", icon: "◈", color: "var(--analytics)", sub: analyticsScore != null ? `score ${analyticsScore}` : null },
    { id: "routing",   label: "Router",    icon: "↳", color: "var(--router)",    sub: routedAgent ? `→ ${routedAgent.replace("_ai","")}` : null },
    { id: "agent",     label: routedAgent ? agentLabel : "Sales / Support", icon: routedAgent === "support_ai" ? "◉" : "◆", color: agentColor },
  ];
  return (
    <div style={{ padding: "16px 22px", borderBottom: "1px solid var(--border)", background: "var(--surface2)" }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 4 }}>
        {steps.map((s, i) => {
          const idxOfStep = stepOrder.indexOf(s.id);
          const done = stepIdx > idxOfStep || stage === "done";
          const active = stage === s.id;
          const dim = !active && !done;
          return (
            <Fragment key={s.id}>
              <div style={{ flex: 1, textAlign: "center", opacity: dim ? 0.35 : 1, transition: "opacity .25s" }}>
                <div className={active ? "pulse" : ""} style={{
                  margin: "0 auto", width: 34, height: 34, borderRadius: "50%",
                  background: done ? `color-mix(in srgb, ${s.color} 25%, transparent)` : `color-mix(in srgb, ${s.color} 10%, transparent)`,
                  border: `1.5px solid ${active || done ? s.color : "var(--border)"}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 14, color: active || done ? s.color : "var(--muted)",
                  marginBottom: 8, fontFamily: "monospace",
                }}>{done ? "✓" : s.icon}</div>
                <div style={{ fontSize: 11.5, fontWeight: 600, color: active || done ? "var(--text)" : "var(--muted2)" }}>{s.label}</div>
                {s.sub && <div style={{ fontSize: 10.5, color: s.color, marginTop: 2 }}>{s.sub}</div>}
              </div>
              {i < steps.length - 1 && (
                <div style={{
                  width: 28, height: 2, marginTop: 16, flexShrink: 0,
                  background: stepIdx > idxOfStep ? steps[i + 1].color : "var(--border)",
                  opacity: stepIdx > idxOfStep ? 0.7 : 1, transition: "all .25s",
                }} />
              )}
            </Fragment>
          );
        })}
      </div>
    </div>
  );
}

function AnalyticsCard({ data, loading }) {
  if (loading) return <StageCard title="Analytics AI · Scoring…" color="var(--analytics)" icon="◈" loading><div style={{ height: 28 }} /></StageCard>;
  if (!data) return null;
  const cat = data.category || "—";
  const color = cat === "hot_lead" ? "var(--good)" : cat === "spam" ? "var(--bad)" : cat === "cold_lead" ? "var(--muted)" : "var(--router)";
  return (
    <StageCard title="Analytics AI · Decision" color="var(--analytics)" icon="◈">
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 14 }}>
        <Stat label="Score" value={data.score} sub="/ 100" color={color} big />
        <Stat label="Category" value={cat} color={color} />
        <Stat label="Intent" value={data.intent || "—"} color="var(--text)" />
        <Stat label="Action" value={data.recommended_action || "—"} color="var(--sales)" />
      </div>
    </StageCard>
  );
}

function Stat({ label, value, sub, color = "var(--text)", big }) {
  return (
    <div>
      <div style={{ fontSize: 10, color: "var(--muted2)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>{label}</div>
      {big ? (
        <div style={{ fontSize: 22, fontFamily: "'Instrument Serif', serif", color }}>
          {value}<span style={{ fontSize: 13, color: "var(--muted)" }}>{sub}</span>
        </div>
      ) : (
        <div style={{ fontSize: 14, fontWeight: 600, color }}>{value}</div>
      )}
    </div>
  );
}

function RouterArrow({ agent, loading }) {
  const isSupport = agent === "support_ai";
  const color = isSupport ? "var(--support)" : "var(--sales)";
  return (
    <div className="slide-up" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, padding: "4px 0" }}>
      <div style={{ fontSize: 20, color: "var(--muted2)" }}>↓</div>
      <div style={{
        padding: "6px 18px", fontSize: 12, fontWeight: 600, letterSpacing: 0.5,
        background: `color-mix(in srgb, ${color} 15%, transparent)`,
        border: `1px solid color-mix(in srgb, ${color} 35%, transparent)`,
        color, borderRadius: 100,
      }}>Routed to {loading ? "…" : (isSupport ? "Support AI" : "Sales AI")}</div>
      <div style={{ fontSize: 20, color: "var(--muted2)" }}>↓</div>
    </div>
  );
}

function AgentReplyCard({ msg, loading, expectedAgent }) {
  const agent = msg?.agent || expectedAgent || "sales_ai";
  const isSupport = agent === "support_ai";
  const color = isSupport ? "var(--support)" : "var(--sales)";
  const title = isSupport ? "Support AI · Reply" : "Sales AI · Reply";
  const icon = isSupport ? "◉" : "◆";
  if (loading) return <StageCard title={title + " · drafting…"} color={color} icon={icon} loading><div style={{ height: 30 }} /></StageCard>;
  if (!msg) return null;
  return (
    <StageCard title={title} color={color} icon={icon}>
      <div style={{ fontSize: 14, color: "var(--text)", lineHeight: 1.65, whiteSpace: "pre-wrap" }}>{msg.text}</div>
    </StageCard>
  );
}

function UserBubble({ avatar, text, fromLead }) {
  return (
    <div className="slide-up" style={{ display: "flex", flexDirection: "row-reverse", gap: 10, alignItems: "flex-start" }}>
      <div style={{ width: 30, height: 30, borderRadius: "50%", background: "color-mix(in srgb, var(--user) 18%, transparent)", border: "1px solid color-mix(in srgb, var(--user) 35%, transparent)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--user)", fontWeight: 600, fontSize: 13, flexShrink: 0 }}>{avatar}</div>
      <div style={{ maxWidth: "82%" }}>
        {fromLead && (
          <div style={{ fontSize: 10, color: "var(--user)", fontWeight: 600, letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 4, textAlign: "right" }}>from CRM</div>
        )}
        <div style={{ background: "#1D4ED8", color: "var(--text)", padding: "10px 14px", borderRadius: "14px 4px 14px 14px", fontSize: 14, lineHeight: 1.6 }}>{text}</div>
      </div>
    </div>
  );
}

function Button({ children, onClick, variant = "primary", disabled, style, type = "button" }) {
  const variants = {
    primary: { background: disabled ? "var(--surface2)" : "var(--sales)", color: disabled ? "var(--muted2)" : "#020D14" },
    support: { background: disabled ? "var(--surface2)" : "var(--support)", color: disabled ? "var(--muted2)" : "#FFFFFF" },
    ghost:   { background: "transparent", color: "var(--text)", border: "1px solid var(--border)" },
  };
  return (
    <button type={type} onClick={onClick} disabled={disabled}
      style={{ padding: "10px 18px", fontSize: 13, fontWeight: 600, border: "none", borderRadius: 8, ...variants[variant], ...style }}>
      {children}
    </button>
  );
}

function SuggestionChip({ children, onClick }) {
  return (
    <button onClick={onClick} style={{
      background: "transparent", color: "var(--text)", textAlign: "left",
      border: "1px solid var(--border)", padding: "9px 12px", fontSize: 12.5,
      borderRadius: 8, cursor: "pointer",
    }}>{children}</button>
  );
}

// ─────────── Page: Lead Lifecycle (shared by Overview & dedicated) ───────────
function LeadLifecycle({ onTurnComplete, logEvent }) {
  const [leadIdx, setLeadIdx] = useState(0);
  const lead = SAMPLE_LEADS[leadIdx];
  const [turns, setTurns] = useState([]);
  const [stage, setStage] = useState("idle");
  const [hasStarted, setHasStarted] = useState(false);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const [ids, setIds] = useState(() => ({ customerId: "cust_" + uid().slice(0, 10), conversationId: "conv_" + uid().slice(0, 10) }));
  const bottomRef = useRef(null);
  const isBusy = stage !== "idle" && stage !== "done";

  const reset = (nextIdx = leadIdx) => {
    setTurns([]); setStage("idle"); setHasStarted(false); setDraft(""); setError("");
    setLeadIdx(nextIdx);
    setIds({ customerId: "cust_" + uid().slice(0, 10), conversationId: "conv_" + uid().slice(0, 10) });
  };

  const runTurn = useCallback(async (userText, fromLead = false) => {
    setError("");
    const turnIdx = turns.length;
    setTurns((p) => [...p, { user: { text: userText, fromLead }, analytics: null, agent: null }]);
    setStage("analytics");
    const startedAt = Date.now();
    try {
      const r = await api("/chat/message", { tenant_id: TENANT_ID, customer_id: ids.customerId, conversation_id: ids.conversationId, message: userText });
      await new Promise((res) => setTimeout(res, 400));
      setTurns((p) => p.map((t, i) => i === turnIdx ? { ...t, analytics: r.analytics } : t));
      setStage("routing");
      await new Promise((res) => setTimeout(res, 250));
      setStage("agent");
      await new Promise((res) => setTimeout(res, 250));
      setTurns((p) => p.map((t, i) => i === turnIdx ? { ...t, agent: { text: r.response_text, agent: r.agent, intent: r.intent } } : t));
      setStage("done");
      logEvent?.({ method: "POST", path: "/chat/message", status: 200, elapsedMs: Date.now() - startedAt,
        summary: `${r.agent} · ${r.intent} · score ${r.analytics?.score}`, kind: r.agent === "support_ai" ? "support" : "sales" });
      onTurnComplete?.();
    } catch (e) {
      const detail = e?.body?.detail ? (Array.isArray(e.body.detail) ? e.body.detail[0]?.msg : e.body.detail) : e.message;
      setError(`Backend error: ${detail}`); setStage("idle");
      logEvent?.({ method: "POST", path: "/chat/message", status: e.status || 0, elapsedMs: 0, summary: detail, kind: "error" });
    }
  }, [ids, turns.length, onTurnComplete, logEvent]);

  const start = async () => { setHasStarted(true); await runTurn(lead.message, true); };
  const sendFollowUp = async () => { const t = draft.trim(); if (!t || isBusy) return; setDraft(""); await runTurn(t, false); };

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [turns, stage]);

  const lastTurn = turns[turns.length - 1];
  return (
    <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, overflow: "hidden", display: "flex", flexDirection: "column", minHeight: 600 }}>
      <div style={{ padding: "14px 22px", borderBottom: "1px solid var(--border)", background: "var(--surface2)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <div>
          <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--text)" }}>Lead Lifecycle</div>
          <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 2 }}>Pick a lead → click <strong style={{ color: "var(--text)" }}>Run pipeline</strong> → watch each stage fire.</div>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {SAMPLE_LEADS.map((L, i) => (
            <button key={L.name} onClick={() => reset(i)} title={L.name}
              style={{
                width: 32, height: 32, borderRadius: "50%",
                border: `1.5px solid ${i === leadIdx ? "var(--user)" : "var(--border)"}`,
                background: i === leadIdx ? "color-mix(in srgb, var(--user) 18%, transparent)" : "var(--bg)",
                color: i === leadIdx ? "var(--user)" : "var(--muted)", fontSize: 13, fontWeight: 600, cursor: "pointer",
              }}>{L.avatar}</button>
          ))}
        </div>
      </div>

      <PipelineStrip stage={stage} analyticsScore={lastTurn?.analytics?.score} routedAgent={lastTurn?.agent?.agent} />

      <div style={{ padding: "20px 22px", flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 14, background: "var(--bg)" }}>
        <div className="fade-in" style={{ background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: 12, padding: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: "50%", background: "color-mix(in srgb, var(--user) 18%, transparent)", border: "1px solid color-mix(in srgb, var(--user) 35%, transparent)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--user)", fontWeight: 600, fontSize: 14 }}>{lead.avatar}</div>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontWeight: 600, color: "var(--text)", fontSize: 14 }}>{lead.name}</span>
                <span style={{ padding: "2px 10px", fontSize: 10.5, fontWeight: 600, background: "color-mix(in srgb, var(--user) 15%, transparent)", color: "var(--user)", borderRadius: 100, border: "1px solid color-mix(in srgb, var(--user) 30%, transparent)" }}>FROM CRM</span>
              </div>
              <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>{lead.city} · via {lead.source}</div>
            </div>
          </div>
          <div style={{ fontSize: 13.5, color: "var(--text)", padding: "10px 12px", background: "var(--bg)", borderRadius: 8, border: "1px solid var(--border-soft)", lineHeight: 1.55 }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: "var(--muted2)", letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 5 }}>Customer message</div>
            "{lead.message}"
          </div>
        </div>

        {!hasStarted && (
          <div style={{ textAlign: "center", padding: "8px 0" }}>
            <Button onClick={start} style={{ padding: "14px 32px", fontSize: 14.5 }}>▶ Run pipeline on this lead</Button>
            <div style={{ fontSize: 12, color: "var(--muted2)", marginTop: 10 }}>① Score · ② Classify · ③ Route to Sales or Support · ④ Reply</div>
          </div>
        )}

        {turns.map((t, i) => {
          const isLast = i === turns.length - 1;
          const expectedAgent = t.analytics?.recommended_action === "support_routing" ? "support_ai" : "sales_ai";
          return (
            <div key={i} style={{ display: "flex", flexDirection: "column", gap: 10, paddingTop: i > 0 ? 12 : 0, borderTop: i > 0 ? "1px dashed var(--border-soft)" : "none" }}>
              <div style={{ fontSize: 10.5, color: "var(--muted2)", fontWeight: 600, letterSpacing: 0.8, textTransform: "uppercase" }}>
                Turn {i + 1} {t.user.fromLead ? "· initial CRM lead" : "· customer reply"}
              </div>
              <UserBubble avatar={t.user.fromLead ? lead.avatar : "U"} text={t.user.text} fromLead={t.user.fromLead} />
              <AnalyticsCard data={t.analytics} loading={isLast && stage === "analytics"} />
              {(t.analytics || (isLast && stage === "routing")) && <RouterArrow agent={t.agent?.agent || expectedAgent} loading={isLast && stage === "routing"} />}
              <AgentReplyCard msg={t.agent} loading={isLast && stage === "agent"} expectedAgent={expectedAgent} />
            </div>
          );
        })}

        {error && <div style={{ background: "color-mix(in srgb, var(--bad) 15%, transparent)", border: "1px solid color-mix(in srgb, var(--bad) 30%, transparent)", color: "#FCA5A5", padding: "10px 14px", borderRadius: 8, fontSize: 13 }}>{error}</div>}
        <div ref={bottomRef} />
      </div>

      {hasStarted && (
        <form onSubmit={(e) => { e.preventDefault(); sendFollowUp(); }}
          style={{ padding: "14px 18px", borderTop: "1px solid var(--border)", background: "var(--surface2)", display: "flex", gap: 8 }}>
          <input value={draft} onChange={(e) => setDraft(e.target.value)} disabled={isBusy}
            placeholder={isBusy ? "Pipeline running…" : `Reply as ${lead.name.split(" ")[0]}…`}
            style={{ flex: 1, background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)", padding: "11px 14px", borderRadius: 8, fontSize: 13.5, outline: "none" }} />
          <Button type="submit" disabled={isBusy || !draft.trim()}>Send</Button>
          <Button variant="ghost" onClick={() => reset()}>↺ New</Button>
        </form>
      )}
    </div>
  );
}

// ─────────── Single chat panel (used by Sales/Support pages) ───────────
function FocusedChat({ agentLabel, agentColor, agentIcon, placeholder, suggestions, onTurnComplete, logEvent, conversationKey, getAgentFields }) {
  const [msgs, setMsgs] = useState([]);
  const [draft, setDraft] = useState("");
  const [typing, setTyping] = useState(false);
  const [error, setError] = useState("");
  const [ids] = useState(() => ({ customerId: conversationKey + "_" + uid().slice(0, 10), conversationId: conversationKey + "_" + uid().slice(0, 10) }));
  const bottomRef = useRef(null);

  const send = useCallback(async (text) => {
    const t = (text ?? draft).trim();
    if (!t || typing) return;
    setMsgs((p) => [...p, { role: "user", text: t }]);
    setDraft(""); setTyping(true); setError("");
    const startedAt = Date.now();
    try {
      const r = await api("/chat/message", { tenant_id: TENANT_ID, customer_id: ids.customerId, conversation_id: ids.conversationId, message: t });
      setMsgs((p) => [...p, { role: "agent", text: r.response_text, agent: r.agent, intent: r.intent, analytics: r.analytics }]);
      logEvent?.({ method: "POST", path: "/chat/message", status: 200, elapsedMs: Date.now() - startedAt,
        summary: `${r.agent} · ${r.intent} · score ${r.analytics?.score}`, kind: r.agent === "support_ai" ? "support" : "sales" });
      onTurnComplete?.();
    } catch (e) {
      const detail = e?.body?.detail ? (Array.isArray(e.body.detail) ? e.body.detail[0]?.msg : e.body.detail) : e.message;
      setError(`Backend error: ${detail}`);
      logEvent?.({ method: "POST", path: "/chat/message", status: e.status || 0, elapsedMs: 0, summary: detail, kind: "error" });
    } finally { setTyping(false); }
  }, [draft, typing, ids, onTurnComplete, logEvent]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs, typing]);

  return (
    <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, overflow: "hidden", display: "flex", flexDirection: "column", minHeight: 600 }}>
      <div style={{ padding: "16px 22px", borderBottom: "1px solid var(--border)", background: "var(--surface2)", display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ width: 32, height: 32, borderRadius: "50%", background: `color-mix(in srgb, ${agentColor} 18%, transparent)`, border: `1px solid color-mix(in srgb, ${agentColor} 35%, transparent)`, display: "flex", alignItems: "center", justifyContent: "center", color: agentColor, fontFamily: "monospace" }}>{agentIcon}</div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text)" }}>{agentLabel} · Direct Chat</div>
          <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 1 }}>Calls <span style={{ color: "var(--text)", fontFamily: "monospace" }}>POST /chat/message</span> · analytics decides routing</div>
        </div>
      </div>

      <div style={{ padding: "16px 22px", flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 12, background: "var(--bg)" }}>
        {msgs.length === 0 && !typing && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: "8px 0" }}>
            <div style={{ fontSize: 12.5, color: "var(--muted)", lineHeight: 1.6 }}>Try a sample message:</div>
            {suggestions.map((s) => <SuggestionChip key={s} onClick={() => send(s)}>{s}</SuggestionChip>)}
          </div>
        )}
        {msgs.map((m, i) => {
          const isAgent = m.role === "agent";
          const isExpected = isAgent && getAgentFields ? getAgentFields.expected === m.agent : true;
          return (
            <div key={i} className="slide-up" style={{ display: "flex", flexDirection: m.role === "user" ? "row-reverse" : "row", gap: 10, alignItems: "flex-start" }}>
              {isAgent && (
                <div style={{ width: 28, height: 28, borderRadius: "50%", background: `color-mix(in srgb, ${m.agent === "support_ai" ? "var(--support)" : "var(--sales)"} 18%, transparent)`, border: `1px solid color-mix(in srgb, ${m.agent === "support_ai" ? "var(--support)" : "var(--sales)"} 35%, transparent)`, display: "flex", alignItems: "center", justifyContent: "center", color: m.agent === "support_ai" ? "var(--support)" : "var(--sales)", fontSize: 12, flexShrink: 0, fontFamily: "monospace" }}>{m.agent === "support_ai" ? "◉" : "◆"}</div>
              )}
              <div style={{ maxWidth: "82%" }}>
                {isAgent && m.analytics && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 6 }}>
                    <span style={{ fontSize: 10, color: "var(--analytics)", fontWeight: 600, padding: "2px 8px", background: "color-mix(in srgb, var(--analytics) 12%, transparent)", border: "1px solid color-mix(in srgb, var(--analytics) 30%, transparent)", borderRadius: 100 }}>◈ score {m.analytics.score} · {m.analytics.category}</span>
                    <span style={{ fontSize: 10, color: m.agent === "support_ai" ? "var(--support)" : "var(--sales)", fontWeight: 600, padding: "2px 8px", background: `color-mix(in srgb, ${m.agent === "support_ai" ? "var(--support)" : "var(--sales)"} 12%, transparent)`, border: `1px solid color-mix(in srgb, ${m.agent === "support_ai" ? "var(--support)" : "var(--sales)"} 30%, transparent)`, borderRadius: 100 }}>→ {m.agent} · {m.intent}</span>
                    {!isExpected && getAgentFields?.expected && <span style={{ fontSize: 10, color: "var(--router)", fontWeight: 600, padding: "2px 8px", background: "color-mix(in srgb, var(--router) 12%, transparent)", border: "1px solid color-mix(in srgb, var(--router) 30%, transparent)", borderRadius: 100 }}>⚠ rerouted (analytics decided)</span>}
                  </div>
                )}
                <div style={{ background: m.role === "user" ? "#1D4ED8" : "var(--surface2)", color: "var(--text)", padding: "10px 14px", borderRadius: m.role === "user" ? "14px 4px 14px 14px" : "4px 14px 14px 14px", fontSize: 13.5, lineHeight: 1.6, border: m.role === "agent" ? "1px solid var(--border)" : "none", whiteSpace: "pre-wrap" }}>{m.text}</div>
              </div>
            </div>
          );
        })}
        {typing && (
          <div style={{ display: "flex", gap: 10 }}>
            <div style={{ width: 28, height: 28, borderRadius: "50%", background: `color-mix(in srgb, ${agentColor} 18%, transparent)`, border: `1px solid color-mix(in srgb, ${agentColor} 35%, transparent)`, display: "flex", alignItems: "center", justifyContent: "center", color: agentColor, fontSize: 12, flexShrink: 0, fontFamily: "monospace" }}>{agentIcon}</div>
            <div style={{ background: "var(--surface2)", border: "1px solid var(--border)", padding: "12px 16px", borderRadius: "4px 14px 14px 14px" }}><Dots /></div>
          </div>
        )}
        {error && <div style={{ background: "color-mix(in srgb, var(--bad) 15%, transparent)", border: "1px solid color-mix(in srgb, var(--bad) 30%, transparent)", color: "#FCA5A5", padding: "10px 14px", borderRadius: 8, fontSize: 13 }}>{error}</div>}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={(e) => { e.preventDefault(); send(); }}
        style={{ padding: "14px 18px", borderTop: "1px solid var(--border)", background: "var(--surface2)", display: "flex", gap: 8 }}>
        <input value={draft} onChange={(e) => setDraft(e.target.value)} disabled={typing}
          placeholder={typing ? "Backend is thinking…" : placeholder}
          style={{ flex: 1, background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)", padding: "11px 14px", borderRadius: 8, fontSize: 13.5, outline: "none" }} />
        <Button type="submit" disabled={typing || !draft.trim()} variant={agentColor === "var(--support)" ? "support" : "primary"}>Send</Button>
      </form>
    </div>
  );
}

// ─────────── PAGE: Flow Demo (multi-lead parallel) ───────────

function StatusPill({ status, outcome }) {
  const map = {
    incoming:        { label: "incoming",       color: "var(--muted)" },
    analyzing:       { label: "◈ analyzing",    color: "var(--analytics)" },
    sales_replied:   { label: "◆ sales replied",color: "var(--sales)" },
    support_replied: { label: "◉ support",      color: "var(--support)" },
    open:            { label: "open",           color: "var(--router)" },
    closed_won:      { label: "✓ won",          color: "var(--good)" },
    closed_lost:     { label: "✕ lost",         color: "var(--bad)" },
    closed_ignored:  { label: "🛇 ignored",     color: "var(--muted2)" },
  };
  const m = map[status] || map.incoming;
  return (
    <span style={{
      padding: "3px 9px", fontSize: 10.5, fontWeight: 600, letterSpacing: 0.3,
      background: `color-mix(in srgb, ${m.color} 15%, transparent)`,
      color: m.color, border: `1px solid color-mix(in srgb, ${m.color} 30%, transparent)`,
      borderRadius: 100, textTransform: "uppercase",
    }}>{m.label}</span>
  );
}

function MiniLeadCard({ lead }) {
  return (
    <div style={{
      background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: 12,
      padding: 14, display: "flex", flexDirection: "column", gap: 10, minHeight: 170,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ width: 32, height: 32, borderRadius: "50%",
          background: `color-mix(in srgb, ${lead.platformColor} 18%, transparent)`,
          border: `1px solid color-mix(in srgb, ${lead.platformColor} 35%, transparent)`,
          display: "flex", alignItems: "center", justifyContent: "center",
          color: lead.platformColor, fontWeight: 600, fontSize: 13 }}>{lead.avatar}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{lead.name}</div>
          <div style={{ fontSize: 11, color: "var(--muted)" }}>{lead.city} · {lead.info}</div>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 9px",
        background: `color-mix(in srgb, ${lead.platformColor} 10%, transparent)`,
        border: `1px solid color-mix(in srgb, ${lead.platformColor} 25%, transparent)`,
        borderRadius: 6, fontSize: 11 }}>
        <span>{lead.platformIcon}</span>
        <span style={{ color: lead.platformColor, fontWeight: 600 }}>{lead.platform}</span>
        <span style={{ color: "var(--muted2)", marginLeft: "auto" }}>{lead.time}</span>
      </div>
      <div style={{ fontSize: 12.5, color: "var(--text)", lineHeight: 1.5,
        padding: "8px 10px", background: "var(--bg)", borderRadius: 6,
        border: "1px solid var(--border-soft)", flex: 1 }}>
        "{lead.message}"
      </div>
    </div>
  );
}

function LeadFlowCard({ lead, onReply, onClose, busy }) {
  const [draft, setDraft] = useState("");
  const lastAgent = [...(lead.turns || [])].reverse().find(t => t.role === "agent");
  const isClosed = lead.status?.startsWith("closed_");
  const agentColor = lastAgent?.agent === "support_ai" ? "var(--support)" : "var(--sales)";

  const submit = (e) => {
    e.preventDefault();
    const t = draft.trim();
    if (!t || busy || isClosed) return;
    setDraft("");
    onReply?.(lead.id, t);
  };

  return (
    <div style={{
      background: "var(--surface)", border: `1px solid ${isClosed ? "var(--border-soft)" : "var(--border)"}`,
      borderRadius: 14, overflow: "hidden", display: "flex", flexDirection: "column",
      opacity: isClosed ? 0.85 : 1,
    }}>
      {/* Header */}
      <div style={{ padding: "12px 16px", background: "var(--surface2)", borderBottom: "1px solid var(--border)",
        display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ width: 30, height: 30, borderRadius: "50%",
          background: `color-mix(in srgb, ${lead.platformColor} 18%, transparent)`,
          border: `1px solid color-mix(in srgb, ${lead.platformColor} 35%, transparent)`,
          display: "flex", alignItems: "center", justifyContent: "center",
          color: lead.platformColor, fontWeight: 600, fontSize: 13 }}>{lead.avatar}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--text)" }}>{lead.name}</div>
          <div style={{ fontSize: 10.5, color: "var(--muted)" }}>
            {lead.platformIcon} {lead.platform}
          </div>
        </div>
        <StatusPill status={lead.status} />
      </div>

      {/* Body */}
      <div style={{ padding: "12px 16px", flex: 1, overflowY: "auto", maxHeight: 360,
        display: "flex", flexDirection: "column", gap: 8, background: "var(--bg)" }}>
        {(lead.turns || []).map((t, i) => {
          if (t.role === "user") {
            return (
              <div key={i} className="slide-up" style={{ display: "flex", flexDirection: "row-reverse" }}>
                <div style={{ maxWidth: "85%", background: "#1D4ED8", color: "var(--text)",
                  padding: "7px 11px", borderRadius: "10px 4px 10px 10px", fontSize: 12.5, lineHeight: 1.5 }}>{t.text}</div>
              </div>
            );
          }
          const isSupport = t.agent === "support_ai";
          const c = isSupport ? "var(--support)" : "var(--sales)";
          return (
            <div key={i} className="slide-up" style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {t.analytics && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 2 }}>
                  <span style={{ fontSize: 9.5, fontWeight: 600, padding: "1px 7px",
                    background: "color-mix(in srgb, var(--analytics) 13%, transparent)",
                    color: "var(--analytics)",
                    border: "1px solid color-mix(in srgb, var(--analytics) 28%, transparent)",
                    borderRadius: 100 }}>◈ {t.analytics.score} · {t.analytics.category}</span>
                  <span style={{ fontSize: 9.5, fontWeight: 600, padding: "1px 7px",
                    background: `color-mix(in srgb, ${c} 13%, transparent)`, color: c,
                    border: `1px solid color-mix(in srgb, ${c} 28%, transparent)`, borderRadius: 100 }}>
                    {isSupport ? "◉" : "◆"} {t.agent} · {t.intent}
                  </span>
                </div>
              )}
              <div style={{ background: "var(--surface2)", border: "1px solid var(--border)",
                padding: "7px 11px", borderRadius: "4px 10px 10px 10px", fontSize: 12.5, lineHeight: 1.55,
                whiteSpace: "pre-wrap" }}>{t.text}</div>
            </div>
          );
        })}
        {lead.status === "analyzing" && (
          <div style={{ display: "flex", gap: 8, padding: "8px 0", color: "var(--muted)", fontSize: 11.5 }}>
            <Dots /> <span>analytics + agent running…</span>
          </div>
        )}
        {lead.error && (
          <div style={{ fontSize: 11.5, color: "#FCA5A5", background: "color-mix(in srgb, var(--bad) 12%, transparent)",
            border: "1px solid color-mix(in srgb, var(--bad) 25%, transparent)", padding: "6px 10px", borderRadius: 6 }}>
            {lead.error}
          </div>
        )}
      </div>

      {/* Footer */}
      {isClosed ? (
        <div style={{ padding: "10px 16px", background: "var(--surface2)", borderTop: "1px solid var(--border)",
          fontSize: 11.5, color: "var(--muted)", textAlign: "center" }}>
          {lead.status === "closed_won" && <>🎉 Deal closed · marked as <strong style={{ color: "var(--good)" }}>WON</strong></>}
          {lead.status === "closed_lost" && <>Marked as <strong style={{ color: "var(--bad)" }}>LOST</strong></>}
          {lead.status === "closed_ignored" && <>Auto-ignored (analytics flagged spam/ignore)</>}
        </div>
      ) : lead.turns?.length > 0 ? (
        <>
          <form onSubmit={submit} style={{ padding: "10px 14px", background: "var(--surface2)",
            borderTop: "1px solid var(--border)", display: "flex", gap: 6 }}>
            <input value={draft} onChange={(e) => setDraft(e.target.value)} disabled={busy}
              placeholder={`Reply as ${lead.name.split(" ")[0]}…`}
              style={{ flex: 1, background: "var(--bg)", border: "1px solid var(--border)",
                color: "var(--text)", padding: "7px 10px", borderRadius: 6, fontSize: 12, outline: "none" }} />
            <button type="submit" disabled={busy || !draft.trim()}
              style={{ background: busy || !draft.trim() ? "var(--surface2)" : agentColor,
                color: busy || !draft.trim() ? "var(--muted2)" : "#020D14",
                padding: "7px 14px", fontSize: 12, fontWeight: 600, border: "none", borderRadius: 6 }}>
              Send
            </button>
          </form>
          <div style={{ display: "flex", gap: 6, padding: "0 14px 12px" }}>
            <button onClick={() => onClose?.(lead.id, "won")} style={{ flex: 1, fontSize: 11, padding: "6px 8px",
              background: "color-mix(in srgb, var(--good) 14%, transparent)", color: "var(--good)",
              border: "1px solid color-mix(in srgb, var(--good) 30%, transparent)", borderRadius: 6, cursor: "pointer" }}>
              ✓ Close as won
            </button>
            <button onClick={() => onClose?.(lead.id, "lost")} style={{ flex: 1, fontSize: 11, padding: "6px 8px",
              background: "color-mix(in srgb, var(--bad) 14%, transparent)", color: "var(--bad)",
              border: "1px solid color-mix(in srgb, var(--bad) 30%, transparent)", borderRadius: 6, cursor: "pointer" }}>
              ✕ Mark as lost
            </button>
          </div>
        </>
      ) : null}
    </div>
  );
}

function PerLeadReport({ lead }) {
  const lastAgent = [...(lead.turns || [])].reverse().find(t => t.role === "agent");
  const firstAnalytics = (lead.turns || []).find(t => t.analytics)?.analytics;
  const turnCount = (lead.turns || []).length;
  return (
    <div style={{ background: "var(--surface2)", border: "1px solid var(--border)",
      borderRadius: 10, padding: "12px 14px", display: "grid", gridTemplateColumns: "50px 1fr auto", gap: 12, alignItems: "center" }}>
      <div style={{ width: 36, height: 36, borderRadius: "50%",
        background: `color-mix(in srgb, ${lead.platformColor} 18%, transparent)`,
        border: `1px solid color-mix(in srgb, ${lead.platformColor} 35%, transparent)`,
        display: "flex", alignItems: "center", justifyContent: "center",
        color: lead.platformColor, fontWeight: 600 }}>{lead.avatar}</div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{lead.name} <span style={{ color: "var(--muted2)", fontWeight: 400, fontSize: 11 }}>· {lead.platform}</span></div>
        <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 2, display: "flex", gap: 10, flexWrap: "wrap" }}>
          <span>score: <strong style={{ color: "var(--text)" }}>{firstAnalytics?.score ?? "—"}</strong></span>
          <span>intent: <strong style={{ color: "var(--text)" }}>{lastAgent?.intent ?? "—"}</strong></span>
          <span>turns: <strong style={{ color: "var(--text)" }}>{turnCount}</strong></span>
          <span>handled by: <strong style={{ color: lastAgent?.agent === "support_ai" ? "var(--support)" : "var(--sales)" }}>{lastAgent?.agent ?? "—"}</strong></span>
        </div>
      </div>
      <StatusPill status={lead.status} />
    </div>
  );
}

// ─────────── Manager AI charts (pure SVG, no library) ───────────

function CategoryDonut({ summary }) {
  const segments = [
    { label: "Hot",   value: summary.hot_leads ?? 0,   color: "#10B981" },
    { label: "Warm",  value: summary.warm_leads ?? 0,  color: "#F59E0B" },
    { label: "Cold",  value: summary.cold_leads ?? 0,  color: "#6B7280" },
    { label: "Spam",  value: summary.spam ?? 0,        color: "#EF4444" },
  ].filter(s => s.value > 0);
  const total = segments.reduce((a, b) => a + b.value, 0);
  if (total === 0) return <div style={{ fontSize: 12, color: "var(--muted)" }}>No leads yet</div>;

  let cumulative = 0;
  const R = 56;
  const C = 2 * Math.PI * R;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
      <svg width="140" height="140" viewBox="0 0 140 140">
        {segments.map((s, i) => {
          const frac = s.value / total;
          const dash = frac * C;
          const offset = -cumulative * C;
          cumulative += frac;
          return (
            <circle key={i} cx="70" cy="70" r={R} fill="none" stroke={s.color}
              strokeWidth="18" strokeDasharray={`${dash} ${C - dash}`}
              strokeDashoffset={offset} transform="rotate(-90 70 70)" />
          );
        })}
        <text x="70" y="72" textAnchor="middle" fontSize="22" fill="var(--text)"
          fontFamily="'Instrument Serif',serif">{total}</text>
        <text x="70" y="89" textAnchor="middle" fontSize="9" fill="var(--muted2)"
          letterSpacing="1" fontWeight="600">LEADS</text>
      </svg>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {segments.map(s => (
          <div key={s.label} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
            <span style={{ width: 10, height: 10, borderRadius: 3, background: s.color }} />
            <span style={{ color: "var(--text)", fontWeight: 600 }}>{s.label}</span>
            <span style={{ color: "var(--muted)" }}>· {s.value} ({Math.round(s.value / total * 100)}%)</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function FunnelBars({ funnel }) {
  const order = ["sales_followup", "qualification", "nurture", "support_routing", "ignore"];
  const labels = {
    sales_followup: "Sales follow-up",
    qualification: "Qualification",
    nurture: "Nurture",
    support_routing: "Support routing",
    ignore: "Ignored / spam",
  };
  const colors = {
    sales_followup: "#22D3EE",
    qualification: "#F59E0B",
    nurture: "#8B5CF6",
    support_routing: "#8B5CF6",
    ignore: "#6B7280",
  };
  const items = order.map(k => ({ key: k, val: funnel?.[k] ?? 0 })).filter(i => i.val > 0);
  if (items.length === 0) return <div style={{ fontSize: 12, color: "var(--muted)" }}>No routing data yet</div>;
  const max = Math.max(...items.map(i => i.val));
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {items.map(({ key, val }) => (
        <div key={key} style={{ display: "grid", gridTemplateColumns: "120px 1fr 30px", gap: 10, alignItems: "center" }}>
          <span style={{ fontSize: 11.5, color: "var(--text)", textTransform: "capitalize" }}>{labels[key]}</span>
          <div style={{ background: "var(--surface2)", borderRadius: 5, height: 18, overflow: "hidden" }}>
            <div style={{ background: colors[key], height: "100%",
              width: `${(val / max) * 100}%`, transition: "width .4s ease" }} />
          </div>
          <span style={{ fontSize: 12, color: colors[key], fontWeight: 600, textAlign: "right" }}>{val}</span>
        </div>
      ))}
    </div>
  );
}

function buildNarrative(summary, leads, vertical) {
  if (!summary || !leads?.length) return "Run the demo to generate a narrative.";
  const total = summary.total_leads ?? leads.length;
  const hot = summary.hot_leads ?? 0;
  const warm = summary.warm_leads ?? 0;
  const spam = summary.spam ?? 0;
  const won = leads.filter(l => l.status === "closed_won").length;
  const supportLeads = leads.filter(l => l.turns?.find(t => t.agent === "support_ai")).length;
  const avg = summary.avg_lead_score ?? "—";

  const parts = [];
  parts.push(`Is session mein ${vertical?.label || "tenant"} pe total ${total} lead aaye${total === 5 ? "" : ""} — ${hot} hot, ${warm} warm, ${spam} spam.`);
  if (won > 0) parts.push(`${won} deal close-won ho gaye (${Math.round(won/total*100)}% conversion).`);
  if (supportLeads > 0) parts.push(`${supportLeads} customer ka support touch zaroori tha — escalation rules saath chalti rahi.`);
  parts.push(`Avg lead score ${avg}/100 raha.`);
  if (spam > 0) parts.push(`Spam filtering analytics ke through automatic ho gayi — koi sales-team time waste nahi hua.`);
  if (hot > 0 && won < hot) parts.push(`${hot - won} hot leads abhi bhi open hain — fast follow-up recommend hai.`);
  return parts.join(" ");
}

// Cross-session comparison — stored in localStorage
function recordSessionHistory(verticalId, summary, leads) {
  if (!summary) return null;
  try {
    const key = "mos_session_history_v1";
    const all = JSON.parse(localStorage.getItem(key) || "{}");
    const list = all[verticalId] || [];
    const won = leads.filter(l => l.status === "closed_won").length;
    list.push({
      ts: Date.now(),
      total: summary.total_leads ?? 0,
      hot: summary.hot_leads ?? 0,
      won,
      conv: summary.total_leads ? Math.round(won / summary.total_leads * 100) : 0,
      avg: summary.avg_lead_score ?? 0,
    });
    // keep last 20
    all[verticalId] = list.slice(-20);
    localStorage.setItem(key, JSON.stringify(all));
    return all[verticalId];
  } catch { return null; }
}
function loadSessionHistory(verticalId) {
  try {
    const all = JSON.parse(localStorage.getItem("mos_session_history_v1") || "{}");
    return all[verticalId] || [];
  } catch { return []; }
}

function CrossSessionCompare({ verticalId, current, leads }) {
  const [history, setHistory] = useState(() => loadSessionHistory(verticalId));
  useEffect(() => {
    if (current?.total_leads) {
      const updated = recordSessionHistory(verticalId, current, leads);
      if (updated) setHistory(updated);
    }
  }, [verticalId, current?.total_leads, current?.hot_leads]);
  if (!history.length) return null;
  const prev = history.length >= 2 ? history[history.length - 2] : null;
  const now = history[history.length - 1];
  if (!now || !prev) return (
    <div style={{ fontSize: 12, color: "var(--muted)", padding: "8px 0" }}>
      First session for {VERTICALS[verticalId]?.label || verticalId} — future sessions will compare against this.
    </div>
  );

  const fmt = (curr, prev, suffix = "") => {
    const diff = curr - prev;
    const color = diff > 0 ? "var(--good)" : diff < 0 ? "var(--bad)" : "var(--muted)";
    const sign = diff > 0 ? "+" : "";
    return <span style={{ color, fontWeight: 600 }}>{sign}{diff}{suffix}</span>;
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10 }}>
      {[
        { label: "Hot leads",     curr: now.hot,   prev: prev.hot },
        { label: "Closed won",    curr: now.won,   prev: prev.won },
        { label: "Conversion %",  curr: now.conv,  prev: prev.conv, suffix: "%" },
        { label: "Avg score",     curr: now.avg,   prev: prev.avg },
      ].map(m => (
        <div key={m.label} style={{ background: "var(--surface2)", border: "1px solid var(--border-soft)",
          borderRadius: 8, padding: "10px 12px" }}>
          <div style={{ fontSize: 10, color: "var(--muted2)", letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 4 }}>{m.label}</div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
            <span style={{ fontSize: 18, fontWeight: 600, color: "var(--text)", fontFamily: "'Instrument Serif',serif" }}>
              {m.curr}{m.suffix || ""}
            </span>
            <span style={{ fontSize: 10.5 }}>{fmt(m.curr, m.prev, m.suffix || "")}</span>
            <span style={{ fontSize: 9, color: "var(--muted2)" }}>vs prev {m.prev}{m.suffix || ""}</span>
          </div>
        </div>
      ))}
      <div style={{ fontSize: 11, color: "var(--muted2)", gridColumn: "1 / -1", marginTop: 4 }}>
        Based on {history.length} session{history.length === 1 ? "" : "s"} on this device · stored in localStorage
      </div>
    </div>
  );
}

// ─────────── Analytics highlight (lead-centric, rich fields) ───────────
function AnalyticsHighlightCard({ lead, isActive }) {
  const an = lead.turns?.find(t => t.analytics)?.analytics;
  const cat = an?.category;
  const c = cat === "hot_lead" ? "var(--good)" : cat === "spam" ? "var(--bad)" :
            cat === "cold_lead" ? "var(--muted)" : "var(--router)";
  const sentColor = {
    excited: "var(--good)", positive: "var(--good)", neutral: "var(--muted)",
    negative: "var(--bad)", frustrated: "var(--bad)",
  }[an?.sentiment] || "var(--muted)";
  const urgColor = {
    immediate: "var(--bad)", high: "var(--router)", medium: "var(--muted)", low: "var(--muted2)",
  }[an?.urgency] || "var(--muted)";

  return (
    <div className="responsive-cols-3" style={{ background: isActive ? "color-mix(in srgb, var(--analytics) 4%, var(--surface))" : "var(--surface)",
      border: isActive ? "1.5px solid color-mix(in srgb, var(--analytics) 40%, transparent)" : "1px solid var(--border)",
      borderRadius: 14, padding: 16, display: "grid",
      gridTemplateColumns: "minmax(0, 1fr) auto minmax(0, 1.3fr)", gap: 16, alignItems: "stretch",
      transition: "all 0.3s ease",
      boxShadow: isActive ? "0 6px 20px color-mix(in srgb, var(--analytics) 8%, transparent)" : "none" }}>
      {/* LEFT — LEAD context */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: "50%",
            background: `color-mix(in srgb, ${lead.platformColor} 18%, transparent)`,
            border: `1px solid color-mix(in srgb, ${lead.platformColor} 35%, transparent)`,
            display: "flex", alignItems: "center", justifyContent: "center",
            color: lead.platformColor, fontWeight: 600, fontSize: 13 }}>{lead.avatar}</div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{lead.name}</div>
            <div style={{ fontSize: 10.5, color: "var(--muted)" }}>{lead.city} · {lead.info}</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 8px",
          background: `color-mix(in srgb, ${lead.platformColor} 10%, transparent)`,
          border: `1px solid color-mix(in srgb, ${lead.platformColor} 25%, transparent)`,
          borderRadius: 6, fontSize: 10.5 }}>
          <span>{lead.platformIcon}</span>
          <span style={{ color: lead.platformColor, fontWeight: 600 }}>{lead.platform}</span>
        </div>
        <div style={{ fontSize: 11.5, color: "var(--muted)", padding: "6px 8px", background: "var(--bg)",
          borderRadius: 6, border: "1px solid var(--border-soft)", lineHeight: 1.45, flex: 1 }}>
          "{lead.message.length > 110 ? lead.message.slice(0, 110) + "…" : lead.message}"
        </div>
      </div>

      {/* MIDDLE — Analytics icon + arrow (animated if active) */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6 }}>
        <div className={isActive && !an ? "pulse" : ""} style={{
          width: 34, height: 34, borderRadius: "50%",
          background: "color-mix(in srgb, var(--analytics) 20%, transparent)",
          border: "1.5px solid color-mix(in srgb, var(--analytics) 45%, transparent)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 16, color: "var(--analytics)", fontFamily: "monospace" }}>◈</div>
        <span style={{ fontSize: 9, color: "var(--analytics)", fontWeight: 700, letterSpacing: 1, textTransform: "uppercase" }}>Analytics</span>
        <span style={{ fontSize: 22, color: an ? "var(--analytics)" : "var(--muted2)" }}>→</span>
      </div>

      {/* RIGHT — rich decision */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10,
        background: an ? `color-mix(in srgb, ${c} 6%, transparent)` : "var(--surface2)",
        border: an ? `1px solid color-mix(in srgb, ${c} 30%, transparent)` : "1px dashed var(--border)",
        borderRadius: 10, padding: 12 }}>
        {!an ? (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
            color: "var(--muted)", fontSize: 12, gap: 6, minHeight: 100 }}>
            <Dots /> scoring lead…
          </div>
        ) : (
          <>
            {/* Top row: Score + Category + Action */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
              <div>
                <div style={{ fontSize: 9.5, color: "var(--muted2)", textTransform: "uppercase", letterSpacing: 0.5 }}>Score</div>
                <div style={{ fontFamily: "'Instrument Serif',serif", fontSize: 28, color: c, lineHeight: 1 }}>
                  {an.score}<span style={{ fontSize: 11, color: "var(--muted)" }}>/100</span>
                </div>
                <div style={{ fontSize: 10, color: c, fontWeight: 600, marginTop: 2 }}>{cat}</div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 3 }}>
                <span style={{ fontSize: 10, padding: "3px 8px",
                  background: "color-mix(in srgb, var(--sales) 15%, transparent)", color: "var(--sales)",
                  border: "1px solid color-mix(in srgb, var(--sales) 30%, transparent)",
                  borderRadius: 100, fontWeight: 600 }}>→ {an.recommended_action}</span>
                <span style={{ fontSize: 10, color: "var(--muted)" }}>intent: <strong style={{ color: "var(--text)" }}>{an.intent}</strong></span>
                {an.confidence != null && (
                  <span style={{ fontSize: 9, color: "var(--muted2)" }}>
                    confidence: {Math.round(an.confidence * 100)}%
                  </span>
                )}
              </div>
            </div>

            {/* Middle row: sentiment + urgency + deal value */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, paddingTop: 4, borderTop: "1px dashed var(--border-soft)" }}>
              {an.sentiment && an.sentiment !== "neutral" && (
                <span style={{ fontSize: 10, padding: "2px 8px",
                  background: `color-mix(in srgb, ${sentColor} 12%, transparent)`, color: sentColor,
                  border: `1px solid color-mix(in srgb, ${sentColor} 30%, transparent)`,
                  borderRadius: 100, fontWeight: 600 }}>
                  ♥ {an.sentiment}
                </span>
              )}
              {an.urgency && an.urgency !== "low" && (
                <span style={{ fontSize: 10, padding: "2px 8px",
                  background: `color-mix(in srgb, ${urgColor} 12%, transparent)`, color: urgColor,
                  border: `1px solid color-mix(in srgb, ${urgColor} 30%, transparent)`,
                  borderRadius: 100, fontWeight: 600 }}>
                  ⏱ {an.urgency}
                </span>
              )}
              {an.estimated_deal_value && an.estimated_deal_value !== "—" && an.estimated_deal_value !== "existing_customer" && (
                <span style={{ fontSize: 10, padding: "2px 8px",
                  background: "color-mix(in srgb, var(--good) 12%, transparent)", color: "var(--good)",
                  border: "1px solid color-mix(in srgb, var(--good) 30%, transparent)",
                  borderRadius: 100, fontWeight: 600 }}>
                  💰 {an.estimated_deal_value}
                </span>
              )}
              {an.estimated_deal_value === "existing_customer" && (
                <span style={{ fontSize: 10, padding: "2px 8px",
                  background: "color-mix(in srgb, var(--support) 12%, transparent)", color: "var(--support)",
                  border: "1px solid color-mix(in srgb, var(--support) 30%, transparent)",
                  borderRadius: 100, fontWeight: 600 }}>
                  🛟 existing customer
                </span>
              )}
            </div>

            {/* Bottom: buying signals + objections + tags */}
            {(an.buying_signals?.length > 0 || an.objections_detected?.length > 0 || an.tags?.length > 0) && (
              <div style={{ display: "flex", flexDirection: "column", gap: 5, paddingTop: 4, borderTop: "1px dashed var(--border-soft)" }}>
                {an.buying_signals?.length > 0 && (
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 6 }}>
                    <span style={{ fontSize: 9.5, color: "var(--muted2)", letterSpacing: 0.3, textTransform: "uppercase", fontWeight: 600, marginTop: 3, flexShrink: 0 }}>signals</span>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                      {an.buying_signals.map((s) => (
                        <span key={s} style={{ fontSize: 9.5, padding: "1px 7px",
                          background: "color-mix(in srgb, var(--good) 12%, transparent)", color: "var(--good)",
                          border: "1px solid color-mix(in srgb, var(--good) 25%, transparent)",
                          borderRadius: 4 }}>{s}</span>
                      ))}
                    </div>
                  </div>
                )}
                {an.objections_detected?.length > 0 && (
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 6 }}>
                    <span style={{ fontSize: 9.5, color: "var(--muted2)", letterSpacing: 0.3, textTransform: "uppercase", fontWeight: 600, marginTop: 3, flexShrink: 0 }}>objections</span>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                      {an.objections_detected.map((s) => (
                        <span key={s} style={{ fontSize: 9.5, padding: "1px 7px",
                          background: "color-mix(in srgb, var(--bad) 12%, transparent)", color: "#FCA5A5",
                          border: "1px solid color-mix(in srgb, var(--bad) 25%, transparent)",
                          borderRadius: 4 }}>{s}</span>
                      ))}
                    </div>
                  </div>
                )}
                {an.tags?.length > 0 && (
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 6 }}>
                    <span style={{ fontSize: 9.5, color: "var(--muted2)", letterSpacing: 0.3, textTransform: "uppercase", fontWeight: 600, marginTop: 3, flexShrink: 0 }}>tags</span>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                      {an.tags.map((s) => (
                        <span key={s} style={{ fontSize: 9.5, padding: "1px 7px",
                          background: "var(--surface2)", color: "var(--muted)",
                          border: "1px solid var(--border)", borderRadius: 4 }}>#{s}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ─────────── WhatsApp message status (animated ticks) ───────────
// queued (clock) → sent (single grey ✓) → delivered (double grey ✓✓) → read (double blue ✓✓)
function MsgStatus({ status }) {
  if (status === "queued") {
    return <span title="Queued" style={{ fontSize: 10.5, color: "#8696A0" }}>⏱</span>;
  }
  if (status === "sent") {
    return <span title="Sent" style={{ fontSize: 11, color: "#8696A0", letterSpacing: -1 }}>✓</span>;
  }
  if (status === "delivered") {
    return <span title="Delivered" style={{ fontSize: 11, color: "#8696A0", letterSpacing: -2 }}>✓✓</span>;
  }
  return <span title="Read" style={{ fontSize: 11, color: "#53BDEB", letterSpacing: -2 }}>✓✓</span>;
}

// Each outgoing agent msg goes queued → sent → delivered → read over a short window.
function useMsgStatusProgression(turnIndex, totalTurns, busy) {
  const [status, setStatus] = useState("queued");
  useEffect(() => {
    // Only the latest agent message animates through; earlier ones jump to "read"
    const isLatest = turnIndex === totalTurns - 1;
    if (!isLatest) { setStatus("read"); return; }
    setStatus("queued");
    const t1 = setTimeout(() => setStatus("sent"), 180);
    const t2 = setTimeout(() => setStatus("delivered"), 700);
    const t3 = setTimeout(() => setStatus("read"), busy ? 999999 : 1500);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [turnIndex, totalTurns, busy]);
  return status;
}

// Outgoing (Sales AI) WhatsApp bubble with the animated ✓ → ✓✓ → blue progression.
function WAOutgoingBubble({ turn, turnIdx, totalTurns, busy, timestamp }) {
  const status = useMsgStatusProgression(turnIdx, totalTurns, busy);
  return (
    <div className="slide-up" style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2 }}>
      {turn.analytics && (
        <div style={{ fontSize: 9, color: "#8696A0", marginBottom: 2 }}>
          ◈ score {turn.analytics.score} · {turn.analytics.category} · {turn.agent}
        </div>
      )}
      <div style={{ maxWidth: "78%", background: "#005C4B", color: "#E9EDEF",
        padding: "6px 10px 6px 11px", borderRadius: "8px 0 8px 8px",
        fontSize: 13, lineHeight: 1.5, position: "relative",
        boxShadow: "0 1px 0.5px rgba(0,0,0,0.13)" }}>
        {turn.text}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 4, marginTop: 2 }}>
          <span style={{ fontSize: 10, color: "#A0B5BD" }}>{timestamp}</span>
          <MsgStatus status={status} />
        </div>
      </div>
    </div>
  );
}

// Customer-side typing indicator (appears as a left bubble showing "Lead is typing…")
function CustomerTypingBubble({ leadName }) {
  return (
    <div className="slide-up" style={{ display: "flex", justifyContent: "flex-start" }}>
      <div style={{ background: "#202C33", color: "#8696A0",
        padding: "8px 12px", borderRadius: "0 8px 8px 8px",
        fontSize: 12, lineHeight: 1.5, fontStyle: "italic",
        display: "flex", alignItems: "center", gap: 6 }}>
        <span>{leadName} is typing</span>
        <Dots />
      </div>
    </div>
  );
}

// ─────────── WhatsApp-style chat (for Sales-routed leads) ───────────
function WhatsAppChat({ lead, onReply, onClose, busy, customerTyping }) {
  const [draft, setDraft] = useState("");
  const isClosed = lead.status?.startsWith("closed_");
  const turns = lead.turns || [];

  const submit = (e) => {
    e.preventDefault();
    const t = draft.trim();
    if (!t || busy || isClosed) return;
    setDraft("");
    onReply?.(lead.id, t);
  };

  // Pretend timestamps: increment minutes per turn
  const time = (i) => {
    const base = new Date(Date.now() - (turns.length - i) * 90 * 1000);
    return `${String(base.getHours()).padStart(2,"0")}:${String(base.getMinutes()).padStart(2,"0")}`;
  };

  return (
    <div style={{
      background: "#0B141A", border: "1px solid #1F2C34",
      borderRadius: 14, overflow: "hidden", display: "flex", flexDirection: "column",
      boxShadow: "0 6px 20px rgba(0,0,0,0.3)",
    }}>
      {/* WhatsApp-style header */}
      <div style={{ background: "#1F2C34", padding: "10px 14px", display: "flex",
        alignItems: "center", gap: 10, borderBottom: "1px solid #2A3942" }}>
        <span style={{ color: "#8696A0", fontSize: 16 }}>←</span>
        <div style={{ width: 34, height: 34, borderRadius: "50%",
          background: "color-mix(in srgb, #25D366 25%, transparent)",
          border: "1px solid color-mix(in srgb, #25D366 50%, transparent)",
          display: "flex", alignItems: "center", justifyContent: "center",
          color: "#25D366", fontWeight: 600, fontSize: 13 }}>{lead.avatar}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13.5, fontWeight: 600, color: "#E9EDEF" }}>{lead.name}</div>
          <div style={{ fontSize: 11, color: busy ? "#25D366" : "#8696A0", display: "flex", alignItems: "center", gap: 4 }}>
            {busy ? <><span style={{fontStyle:"italic"}}>typing</span><Dots /></> : <>online · {lead.platform}</>}
          </div>
        </div>
        <span style={{ color: "#8696A0", fontSize: 18 }}>⋮</span>
      </div>

      {/* Messages area */}
      <div style={{ flex: 1, padding: "16px 14px", maxHeight: 360, overflowY: "auto",
        display: "flex", flexDirection: "column", gap: 8,
        background: `linear-gradient(180deg, #0B141A 0%, #0B141A 100%)`,
        backgroundImage: "radial-gradient(circle at 10% 10%, rgba(37, 211, 102, 0.04) 0%, transparent 50%), radial-gradient(circle at 90% 80%, rgba(37, 211, 102, 0.03) 0%, transparent 50%)" }}>
        {turns.map((t, i) => {
          if (t.role === "user") {
            // Incoming (from lead) — left side, grey bubble
            return (
              <div key={i} className="slide-up" style={{ display: "flex", justifyContent: "flex-start" }}>
                <div style={{ maxWidth: "78%", background: "#202C33", color: "#E9EDEF",
                  padding: "6px 10px 6px 11px", borderRadius: "0 8px 8px 8px",
                  fontSize: 13, lineHeight: 1.5, position: "relative",
                  boxShadow: "0 1px 0.5px rgba(0,0,0,0.13)" }}>
                  {t.text}
                  <div style={{ fontSize: 10, color: "#8696A0", textAlign: "right", marginTop: 2 }}>{time(i)}</div>
                </div>
              </div>
            );
          }
          // Outgoing (Sales AI) — right side, dark green bubble with animated ticks
          return <WAOutgoingBubble key={i} turn={t} turnIdx={i} totalTurns={turns.length}
                   busy={busy} timestamp={time(i)} />;
        })}
        {busy && (
          <div style={{ display: "flex" }}>
            <div style={{ background: "#202C33", color: "#8696A0", padding: "8px 12px",
              borderRadius: "0 8px 8px 8px", fontSize: 13 }}><Dots /></div>
          </div>
        )}
        {customerTyping && !busy && <CustomerTypingBubble leadName={lead.name.split(" ")[0]} />}
        {lead.error && (
          <div style={{ fontSize: 11.5, color: "#FCA5A5",
            background: "color-mix(in srgb, #EF4444 12%, transparent)",
            padding: "6px 10px", borderRadius: 6 }}>{lead.error}</div>
        )}
      </div>

      {/* Input area */}
      {!isClosed ? (
        <>
          <form onSubmit={submit} style={{ background: "#1F2C34", padding: "8px 10px",
            display: "flex", gap: 6, alignItems: "center", borderTop: "1px solid #2A3942" }}>
            <span style={{ color: "#8696A0", fontSize: 18, padding: "0 4px" }}>😊</span>
            <input value={draft} onChange={(e) => setDraft(e.target.value)} disabled={busy}
              placeholder={`Reply as ${lead.name.split(" ")[0]} on WhatsApp…`}
              style={{ flex: 1, background: "#2A3942", border: "none", color: "#E9EDEF",
                padding: "9px 12px", borderRadius: 100, fontSize: 13, outline: "none" }} />
            <button type="submit" disabled={busy || !draft.trim()}
              style={{ background: busy || !draft.trim() ? "#2A3942" : "#25D366",
                color: busy || !draft.trim() ? "#8696A0" : "#0B141A",
                width: 36, height: 36, borderRadius: "50%", border: "none",
                fontSize: 14, fontWeight: 700, cursor: "pointer" }}>➤</button>
          </form>
          <div style={{ display: "flex", gap: 4, padding: "6px 10px", background: "#1F2C34" }}>
            <button onClick={() => onClose?.(lead.id, "won")} style={{ flex: 1, fontSize: 10.5, padding: "5px",
              background: "color-mix(in srgb, #25D366 18%, transparent)", color: "#25D366",
              border: "1px solid color-mix(in srgb, #25D366 35%, transparent)", borderRadius: 6, cursor: "pointer" }}>
              ✓ Close as won
            </button>
            <button onClick={() => onClose?.(lead.id, "lost")} style={{ flex: 1, fontSize: 10.5, padding: "5px",
              background: "color-mix(in srgb, #EF4444 14%, transparent)", color: "#FCA5A5",
              border: "1px solid color-mix(in srgb, #EF4444 30%, transparent)", borderRadius: 6, cursor: "pointer" }}>
              ✕ Lost
            </button>
          </div>
        </>
      ) : (
        <div style={{ padding: "10px 14px", background: "#1F2C34", borderTop: "1px solid #2A3942",
          fontSize: 11.5, color: "#8696A0", textAlign: "center" }}>
          {lead.status === "closed_won" && <>🎉 Deal closed · marked as <strong style={{ color: "#25D366" }}>WON</strong></>}
          {lead.status === "closed_lost" && <>Marked as <strong style={{ color: "#FCA5A5" }}>LOST</strong></>}
          {lead.status === "closed_ignored" && <>Auto-ignored · spam</>}
        </div>
      )}
    </div>
  );
}

// ─────────── Stage progress strip ───────────
function StageProgress({ stage }) {
  const order = ["incoming", "analyzing", "replies", "complete"];
  const idx = order.indexOf(stage);
  const steps = [
    { id: "incoming",  label: "Incoming",  icon: "📥" },
    { id: "analyzing", label: "Analytics", icon: "◈" },
    { id: "replies",   label: "Replies",   icon: "💬" },
    { id: "complete",  label: "Manager",   icon: "◇" },
  ];
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 22 }}>
      {steps.map((s, i) => {
        const done = idx > i;
        const active = idx === i;
        const c = active ? "var(--sales)" : done ? "var(--good)" : "var(--muted2)";
        return (
          <Fragment key={s.id}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 12px",
              background: (active || done) ? `color-mix(in srgb, ${c} 12%, transparent)` : "transparent",
              border: `1px solid color-mix(in srgb, ${c} ${active ? 40 : 25}%, var(--border))`,
              borderRadius: 100, opacity: idx < i ? 0.45 : 1 }}>
              <span className={active ? "pulse" : ""} style={{ fontSize: 13 }}>{done ? "✓" : s.icon}</span>
              <span style={{ fontSize: 11.5, color: c, fontWeight: 600 }}>{s.label}</span>
            </div>
            {i < steps.length - 1 && (
              <div style={{ flex: 1, height: 2, maxWidth: 24,
                background: idx > i ? "var(--good)" : "var(--border)", opacity: 0.5 }} />
            )}
          </Fragment>
        );
      })}
    </div>
  );
}

function FlowDemoPage({ report, refresh, logEvent }) {
  const [verticalId, setVerticalId] = useState(DEFAULT_VERTICAL);
  const vertical = VERTICALS[verticalId];
  const [leads, setLeads] = useState(() => vertical.leads.map(L => ({
    ...L, turns: [], status: "incoming", cid: null, error: null,
  })));
  const [stage, setStage] = useState("incoming"); // incoming | analyzing | replies | complete
  const [started, setStarted] = useState(false);
  const [speed, setSpeed] = useState("slow"); // slow | normal | fast
  const [activeLeadId, setActiveLeadId] = useState(null);
  const sessionTenantRef = useRef(null);
  const [sessionReport, setSessionReport] = useState(null);
  const [sessionScenario, setSessionScenario] = useState(null);
  // Auto-play (client demo) state
  const [autoPlay, setAutoPlay] = useState(false);
  const autoPlayRef = useRef(false);
  const [autoPlayPaused, setAutoPlayPaused] = useState(false);
  const autoPlayPausedRef = useRef(false);
  const [autoTypingLeadIds, setAutoTypingLeadIds] = useState(new Set());

  useEffect(() => { autoPlayRef.current = autoPlay; }, [autoPlay]);
  useEffect(() => { autoPlayPausedRef.current = autoPlayPaused; }, [autoPlayPaused]);

  // Speed -> delay between lead starts (staggered processing)
  const speedDelay = { slow: 1800, normal: 800, fast: 0 }[speed];
  const speedStageDelay = { slow: 800, normal: 400, fast: 150 }[speed];

  // Make a fresh tenant for each Start so Manager AI sees only this session's data
  const ensureSession = async () => {
    if (sessionTenantRef.current) return sessionTenantRef.current;
    const t = `demo_${verticalId}_${Date.now()}`;
    try { await api("/config/create", { tenant_id: t, ...vertical.config }); } catch {}
    sessionTenantRef.current = t;
    return t;
  };

  // Switching vertical resets everything (you can't switch mid-run)
  const switchVertical = (newId) => {
    if (newId === verticalId || started) return;
    setVerticalId(newId);
    setLeads(VERTICALS[newId].leads.map(L => ({
      ...L, turns: [], status: "incoming", cid: null, error: null,
    })));
    sessionTenantRef.current = null;
    setSessionReport(null);
    setStage("incoming");
  };
  const [busyId, setBusyId] = useState(null);

  const runChat = async (lead, message) => {
    const tenant = await ensureSession();
    const cid = lead.cid || `flow_${lead.id}_${Date.now()}_${Math.random().toString(36).slice(2,5)}`;
    setLeads(prev => prev.map(l => l.id === lead.id ? {
      ...l, cid, status: "analyzing", error: null,
      turns: [...l.turns, { role: "user", text: message }]
    } : l));
    setActiveLeadId(lead.id);
    const started = Date.now();
    try {
      // Stage delay so user can SEE analytics fire
      await new Promise(res => setTimeout(res, speedStageDelay));
      const r = await api("/chat/message", {
        tenant_id: tenant, customer_id: cid, conversation_id: cid, message
      });
      const ignored = r.analytics?.recommended_action === "ignore";
      const isSupport = r.agent === "support_ai";
      setLeads(prev => prev.map(l => l.id === lead.id ? {
        ...l,
        turns: [...l.turns, { role: "agent", text: r.response_text, agent: r.agent, intent: r.intent, analytics: r.analytics }],
        status: ignored ? "closed_ignored" : (isSupport ? "support_replied" : "sales_replied"),
      } : l));
      logEvent?.({
        method: "POST", path: "/chat/message", status: 200, elapsedMs: Date.now() - started,
        summary: `${lead.id} · ${r.agent} · ${r.intent}`,
        kind: isSupport ? "support" : "sales",
      });
      refresh?.();
    } catch (e) {
      const detail = e?.body?.detail ? (Array.isArray(e.body.detail) ? e.body.detail[0]?.msg : e.body.detail) : e.message;
      setLeads(prev => prev.map(l => l.id === lead.id ? { ...l, status: "open", error: `Backend error: ${detail}` } : l));
      logEvent?.({ method: "POST", path: "/chat/message", status: e.status || 0, elapsedMs: 0, summary: detail, kind: "error" });
    }
  };

  // Pause-aware sleep so auto-play can be interrupted
  const pausableSleep = (ms) => new Promise(async (res) => {
    let remaining = ms;
    while (remaining > 0) {
      if (autoPlayPausedRef.current) {
        await new Promise(r => setTimeout(r, 200));
        continue;
      }
      const slice = Math.min(remaining, 150);
      await new Promise(r => setTimeout(r, slice));
      remaining -= slice;
    }
    res();
  });

  // Scripted customer "replies" so auto-play can drive each lead toward close.
  const SCRIPTED_REPLIES = {
    pricing_query: ["Yes pricing share karo full plans", "Ok 1500 monthly chalega, kab start kar sakte hain?"],
    pricing_confirmation: ["Great, contact details share karta hoon"],
    pricing_qualification: ["Class 10 hai, 1 month trial chahiye"],
    demo_request: ["Yes 11 am chalega", "Done — phone share kar deta hoon, schedule karo"],
    demo_confirmation: ["Confirm karo, mera number 99XXXX1234"],
    support_request: ["OK order ID 84123 share kar raha hoon"],
    engagement: ["Pricing aur features detail mein chahiye"],
    general_query: ["Mujhe detail batao, kya plans hain?"],
  };

  const runAutoPlay = async () => {
    // For each sales- or support-routed lead, send 1-2 scripted customer replies.
    const liveLeads = leads.filter(L => L.status === "sales_replied" || L.status === "support_replied");
    for (const lead of liveLeads) {
      if (!autoPlayRef.current) break;
      const lastAgent = [...(lead.turns || [])].reverse().find(t => t.role === "agent");
      const intent = lastAgent?.intent || "general_query";
      const replies = SCRIPTED_REPLIES[intent] || SCRIPTED_REPLIES.general_query;
      for (const reply of replies.slice(0, 2)) {
        if (!autoPlayRef.current) break;
        // Show "customer is typing" indicator briefly
        setAutoTypingLeadIds(prev => new Set(prev).add(lead.id));
        await pausableSleep(1400);
        setAutoTypingLeadIds(prev => { const s = new Set(prev); s.delete(lead.id); return s; });
        if (!autoPlayRef.current) break;
        await runChat({ ...lead, cid: lead.cid }, reply);
        await pausableSleep(900);
      }
      // Demo-mode: auto-close sales leads as won
      if (autoPlayRef.current && (lead.status === "sales_replied" || true)) {
        await pausableSleep(600);
        setLeads(prev => prev.map(l => l.id === lead.id && !l.status.startsWith("closed_")
          ? { ...l, status: "closed_won" } : l));
      }
    }
    if (autoPlayRef.current) {
      await pausableSleep(800);
      await generateManagerReport();
    }
    setAutoPlay(false);
    autoPlayRef.current = false;
  };

  const startAll = async (auto = false) => {
    setStarted(true);
    if (auto) {
      setAutoPlay(true);
      autoPlayRef.current = true;
      setAutoPlayPaused(false);
      autoPlayPausedRef.current = false;
    }
    await ensureSession();
    setStage("analyzing");
    const snapshot = leads;
    // Staggered start: each lead kicked off `speedDelay` ms after the previous,
    // so the user actually sees each one go from "scoring..." -> rich card.
    const promises = snapshot.map((L, i) =>
      new Promise(res => setTimeout(res, i * speedDelay))
        .then(() => runChat(L, L.message))
    );
    await Promise.all(promises);
    setActiveLeadId(null);
    setStage("replies");
    // Auto-fetch session-scoped Manager report
    try {
      const t = sessionTenantRef.current;
      const r = await api("/reports/generate", { tenant_id: t });
      setSessionReport(r);
    } catch {}
    if (auto) {
      await pausableSleep(1500);
      runAutoPlay();
    }
  };

  const generateManagerReport = async () => {
    const t = sessionTenantRef.current;
    if (!t) return;
    try {
      const r = await api("/reports/generate", { tenant_id: t });
      setSessionReport(r);
      setStage("complete");
      logEvent?.({ method: "POST", path: "/reports/generate", status: 200, elapsedMs: 0,
        summary: "manager report (session)", kind: "sales" });
    } catch {}
  };

  const replyAsLead = async (leadId, text) => {
    const lead = leads.find(l => l.id === leadId);
    if (!lead) return;
    setBusyId(leadId);
    await runChat(lead, text);
    setBusyId(null);
  };

  const closeLead = (leadId, outcome) => {
    setLeads(prev => prev.map(l => l.id === leadId ? {
      ...l, status: outcome === "won" ? "closed_won" : "closed_lost"
    } : l));
  };

  const resetAll = () => {
    setStarted(false);
    setStage("incoming");
    sessionTenantRef.current = null;
    setSessionReport(null);
    setLeads(vertical.leads.map(L => ({ ...L, turns: [], status: "incoming", cid: null, error: null })));
  };

  // ---- session-scoped manager view (no stale cumulative data) ----
  const summary = sessionReport?.summary || {};
  const inv = summary.agent_invocations || {};
  const mr = sessionReport?.manager_ai?.data;
  const allTouched = started && leads.every(l => l.status !== "incoming" && l.status !== "analyzing");
  const salesLeads   = leads.filter(L => L.turns?.find(t => t.agent === "sales_ai"));
  const supportLeads = leads.filter(L => L.turns?.find(t => t.agent === "support_ai"));
  const ignoredLeads = leads.filter(L => L.status === "closed_ignored");

  return (
    <>
      <PageHeader icon="▶" color="var(--sales)" title="Live Demo · Multi-Platform Lead Flow"
        subtitle="Pick a business vertical → 5 leads aate hain alag-alag platforms se → Start click karte hi Analytics AI har LEAD ko analyse karega (lead ka context, platform, profile — not just message) → Phir Sales AI WhatsApp pe chat karega, Support AI alag dikhega → Manager AI sirf is session ka data dikhayega." />

      {/* ─── Vertical switcher ─── */}
      <div style={{ marginBottom: 22, padding: "14px 18px", background: "var(--surface)",
        border: "1px solid var(--border)", borderRadius: 14,
        display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <span style={{ fontSize: 10.5, color: "var(--muted2)", letterSpacing: 0.5, textTransform: "uppercase", fontWeight: 700 }}>Business vertical</span>
          <span style={{ fontSize: 11.5, color: "var(--muted)" }}>Same MOS code, different config — proves it's configurable</span>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 6, flexWrap: "wrap" }}>
          {Object.values(VERTICALS).map((v) => {
            const isActive = v.id === verticalId;
            const disabled = started && !isActive;
            return (
              <button key={v.id} onClick={() => switchVertical(v.id)} disabled={disabled}
                style={{
                  padding: "8px 16px", fontSize: 12.5, fontWeight: 600, cursor: disabled ? "not-allowed" : "pointer",
                  background: isActive ? `color-mix(in srgb, ${v.color} 18%, transparent)` : "transparent",
                  color: isActive ? v.color : "var(--muted)",
                  border: isActive ? `1.5px solid color-mix(in srgb, ${v.color} 45%, transparent)` : "1px solid var(--border)",
                  borderRadius: 100, opacity: disabled ? 0.4 : 1,
                  display: "flex", alignItems: "center", gap: 7,
                }}>
                <span style={{ fontSize: 14 }}>{v.emoji}</span>
                <span>{v.label}</span>
                <span style={{ fontSize: 10, color: isActive ? v.color : "var(--muted2)", opacity: 0.7 }}>
                  · {v.industry}
                </span>
              </button>
            );
          })}
        </div>
        {started && (
          <span style={{ fontSize: 10.5, color: "var(--muted2)", marginTop: 6, flexBasis: "100%" }}>
            Locked during run — click Reset to switch vertical.
          </span>
        )}
      </div>

      {/* Auto-play floating control */}
      {started && autoPlay && (
        <div style={{ position: "sticky", top: 12, zIndex: 50, marginBottom: 14,
          display: "flex", justifyContent: "center" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 10,
            padding: "8px 16px", borderRadius: 100,
            background: "color-mix(in srgb, var(--good) 14%, var(--surface))",
            border: "1px solid color-mix(in srgb, var(--good) 35%, transparent)",
            boxShadow: "0 8px 24px rgba(0,0,0,0.3)" }}>
            <span className={autoPlayPaused ? "" : "pulse"}
              style={{ width: 8, height: 8, borderRadius: "50%",
                background: autoPlayPaused ? "var(--router)" : "var(--good)" }} />
            <span style={{ fontSize: 12, color: "var(--text)", fontWeight: 600 }}>
              🎬 Auto-play {autoPlayPaused ? "paused" : "running"}
            </span>
            <button onClick={() => setAutoPlayPaused(p => !p)}
              style={{ background: "var(--surface)", color: "var(--text)",
                border: "1px solid var(--border)", padding: "4px 12px", borderRadius: 100,
                fontSize: 11.5, fontWeight: 600, cursor: "pointer" }}>
              {autoPlayPaused ? "▶ Resume" : "❚❚ Pause"}
            </button>
            <button onClick={() => { setAutoPlay(false); autoPlayRef.current = false; }}
              style={{ background: "transparent", color: "var(--muted)",
                border: "1px solid var(--border)", padding: "4px 12px", borderRadius: 100,
                fontSize: 11.5, fontWeight: 600, cursor: "pointer" }}>
              ✕ Stop
            </button>
          </div>
        </div>
      )}

      {/* Top stage progress strip */}
      {started && <StageProgress stage={stage} />}

      {/* ─── STAGE 1: Incoming leads ─── */}
      {!started && (
        <>
          <SectionHeader n="1" title="Incoming leads from different platforms" />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 12, marginBottom: 22 }}>
            {leads.map(L => <MiniLeadCard key={L.id} lead={L} />)}
          </div>
          <div style={{ textAlign: "center", margin: "8px 0 24px" }}>
            {/* Speed control */}
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, marginBottom: 16,
              padding: "6px 8px", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 100 }}>
              <span style={{ fontSize: 11, color: "var(--muted2)", marginLeft: 8, letterSpacing: 0.5, textTransform: "uppercase" }}>Speed</span>
              {[
                { id: "slow", label: "🐢 Slow (demo)" },
                { id: "normal", label: "🚶 Normal" },
                { id: "fast", label: "🐇 Fast" },
              ].map((s) => (
                <button key={s.id} onClick={() => setSpeed(s.id)}
                  style={{
                    padding: "5px 12px", fontSize: 11.5, fontWeight: 600,
                    background: speed === s.id ? "color-mix(in srgb, var(--sales) 18%, transparent)" : "transparent",
                    color: speed === s.id ? "var(--sales)" : "var(--muted)",
                    border: speed === s.id ? "1px solid color-mix(in srgb, var(--sales) 40%, transparent)" : "1px solid transparent",
                    borderRadius: 100, cursor: "pointer",
                  }}>{s.label}</button>
              ))}
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
              <Button onClick={() => startAll(false)} style={{ padding: "14px 32px", fontSize: 14.5 }}>
                ▶ Start (interactive)
              </Button>
              <Button onClick={() => startAll(true)} variant="ghost"
                style={{ padding: "14px 24px", fontSize: 13.5,
                  background: "color-mix(in srgb, var(--good) 12%, transparent)",
                  color: "var(--good)",
                  border: "1px solid color-mix(in srgb, var(--good) 35%, transparent)" }}>
                🎬 Auto-play (client demo)
              </Button>
            </div>
            <div style={{ fontSize: 12, color: "var(--muted2)", marginTop: 10 }}>
              <strong style={{ color: "var(--text)" }}>Interactive</strong>: you reply for each lead.&nbsp;&nbsp;
              <strong style={{ color: "var(--good)" }}>Auto-play</strong>: hands-free, simulated customer replies, deals auto-close, manager report at the end.
            </div>
          </div>
        </>
      )}

      {/* ─── STAGE 2: Analytics AI analyzes EVERY LEAD (with platform + profile + message) ─── */}
      {started && (
        <>
          <SectionHeader n="2" title="Analytics AI · scoring each lead (lead-level, not message-level)"
            right={<button onClick={resetAll} style={{ background: "transparent", color: "var(--muted)",
              border: "1px solid var(--border)", padding: "6px 12px", borderRadius: 6, fontSize: 12 }}>↺ Reset</button>} />
          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 26 }}>
            {leads.map(L => <AnalyticsHighlightCard key={L.id} lead={L} isActive={activeLeadId === L.id} />)}
          </div>
        </>
      )}

      {/* ─── STAGE 3: Replies — Sales on WhatsApp + Support panel ─── */}
      {started && (stage === "replies" || stage === "complete") && (
        <>
          <SectionHeader n="3" title="Sales AI on WhatsApp · Support AI on chat" />

          {salesLeads.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                <span style={{ padding: "4px 10px", fontSize: 11, fontWeight: 600,
                  background: "color-mix(in srgb, #25D366 15%, transparent)", color: "#25D366",
                  border: "1px solid color-mix(in srgb, #25D366 30%, transparent)", borderRadius: 100 }}>
                  ◆ Sales AI · WhatsApp ({salesLeads.length})
                </span>
                <span style={{ fontSize: 11.5, color: "var(--muted2)" }}>Tu apne aap reply de sakta hai as customer · agar deal close ho gaya toh ✓ Close karke aage badh</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(330px, 1fr))", gap: 14 }}>
                {salesLeads.map(L => (
                  <WhatsAppChat key={L.id} lead={L}
                    onReply={replyAsLead} onClose={closeLead}
                    busy={busyId === L.id}
                    customerTyping={autoTypingLeadIds.has(L.id)} />
                ))}
              </div>
            </div>
          )}

          {supportLeads.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                <span style={{ padding: "4px 10px", fontSize: 11, fontWeight: 600,
                  background: "color-mix(in srgb, var(--support) 15%, transparent)", color: "var(--support)",
                  border: "1px solid color-mix(in srgb, var(--support) 30%, transparent)", borderRadius: 100 }}>
                  ◉ Support AI · ticket queue ({supportLeads.length})
                </span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(310px, 1fr))", gap: 14 }}>
                {supportLeads.map(L => (
                  <LeadFlowCard key={L.id} lead={L}
                    onReply={replyAsLead} onClose={closeLead}
                    busy={busyId === L.id} />
                ))}
              </div>
            </div>
          )}

          {ignoredLeads.length > 0 && (
            <div style={{ marginBottom: 22 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                <span style={{ padding: "4px 10px", fontSize: 11, fontWeight: 600,
                  background: "color-mix(in srgb, var(--muted) 15%, transparent)", color: "var(--muted)",
                  border: "1px solid color-mix(in srgb, var(--muted) 30%, transparent)", borderRadius: 100 }}>
                  🛇 Auto-ignored ({ignoredLeads.length})
                </span>
                <span style={{ fontSize: 11.5, color: "var(--muted2)" }}>Analytics ne spam ya ignore flag kiya — koi agent run nahi hua</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 10 }}>
                {ignoredLeads.map(L => (
                  <div key={L.id} style={{ background: "var(--surface)", border: "1px dashed var(--border)",
                    borderRadius: 10, padding: "10px 14px", display: "flex", alignItems: "center", gap: 10, opacity: 0.65 }}>
                    <div style={{ width: 28, height: 28, borderRadius: "50%",
                      background: `color-mix(in srgb, ${L.platformColor} 18%, transparent)`,
                      border: `1px solid color-mix(in srgb, ${L.platformColor} 35%, transparent)`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      color: L.platformColor, fontWeight: 600, fontSize: 12 }}>{L.avatar}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12.5, color: "var(--text)", fontWeight: 600 }}>{L.name}</div>
                      <div style={{ fontSize: 10.5, color: "var(--muted)" }}>{L.platform} · spam / ignore</div>
                    </div>
                    <StatusPill status={L.status} />
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{ display: "flex", justifyContent: "center", marginBottom: 28 }}>
            <Button onClick={generateManagerReport} style={{ padding: "12px 28px", fontSize: 13.5 }}>
              ◇ Generate Manager AI report for this session
            </Button>
          </div>
        </>
      )}

      {/* ─── STAGE 4: Manager AI report (THIS SESSION ONLY) ─── */}
      {stage === "complete" && (
        <>
          <SectionHeader n="4" title="Manager AI · this session's report" right={
            <span style={{ fontSize: 11, color: "var(--muted2)" }} className="mono">
              tenant: {sessionTenantRef.current}
            </span>
          } />

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10, marginBottom: 14 }}>
            {[
              { label: "Total leads", v: summary.total_leads ?? 0, color: "var(--good)" },
              { label: "Hot", v: summary.hot_leads ?? 0, color: "var(--good)" },
              { label: "Warm", v: summary.warm_leads ?? 0, color: "var(--router)" },
              { label: "Spam", v: summary.spam ?? 0, color: "var(--bad)" },
              { label: "Sales runs", v: inv.sales_ai ?? 0, color: "var(--sales)" },
              { label: "Support runs", v: inv.support_ai ?? 0, color: "var(--support)" },
              { label: "Avg score", v: summary.avg_lead_score ?? "—", color: "var(--analytics)" },
            ].map((m) => (
              <div key={m.label} style={{ background: "var(--surface)", border: "1px solid var(--border)",
                borderRadius: 10, padding: "12px 14px" }}>
                <div style={{ fontSize: 10.5, color: "var(--muted)", textTransform: "uppercase",
                  letterSpacing: 0.5, marginBottom: 6 }}>{m.label}</div>
                <div style={{ fontFamily: "'Instrument Serif',serif", fontSize: 24, color: m.color, lineHeight: 1 }}>{m.v}</div>
              </div>
            ))}
          </div>

          {/* Manager AI narrative paragraph */}
          <div style={{ background: "var(--surface)", border: "1px solid var(--border)",
            borderRadius: 12, padding: 18, marginBottom: 14,
            display: "flex", gap: 14, alignItems: "flex-start" }}>
            <span style={{ fontSize: 22 }}>📝</span>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", letterSpacing: 0.8,
                textTransform: "uppercase", marginBottom: 6 }}>Session narrative</div>
              <p style={{ fontSize: 13.5, color: "var(--text)", lineHeight: 1.65, margin: 0 }}>
                {buildNarrative(summary, leads, vertical)}
              </p>
            </div>
          </div>

          {/* Charts: donut + funnel side by side */}
          <div className="responsive-cols-2" style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1.2fr)", gap: 12, marginBottom: 14 }}>
            <div style={{ background: "var(--surface)", border: "1px solid var(--border)",
              borderRadius: 12, padding: 18 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", letterSpacing: 0.8,
                textTransform: "uppercase", marginBottom: 14 }}>Category distribution</div>
              <CategoryDonut summary={summary} />
            </div>
            <div style={{ background: "var(--surface)", border: "1px solid var(--border)",
              borderRadius: 12, padding: 18 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", letterSpacing: 0.8,
                textTransform: "uppercase", marginBottom: 14 }}>Recommended action funnel</div>
              <FunnelBars funnel={summary.recommended_action_funnel} />
            </div>
          </div>

          {/* Cross-session compare */}
          <div style={{ background: "var(--surface)", border: "1px solid var(--border)",
            borderRadius: 12, padding: 18, marginBottom: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", letterSpacing: 0.8,
              textTransform: "uppercase", marginBottom: 12 }}>This session vs previous</div>
            <CrossSessionCompare verticalId={verticalId} current={summary} leads={leads} />
          </div>

          <div style={{ background: "var(--surface)", border: "1px solid var(--border)",
            borderRadius: 12, padding: 18, marginBottom: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", letterSpacing: 0.8,
              textTransform: "uppercase", marginBottom: 12 }}>Per-lead breakdown · session leads only</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {leads.map(L => <PerLeadReport key={L.id} lead={L} />)}
            </div>
          </div>

          {mr && (
            <div style={{ background: "var(--surface)", border: "1px solid var(--border)",
              borderRadius: 12, padding: 18, marginBottom: 14 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", letterSpacing: 0.8, textTransform: "uppercase" }}>
                  Manager AI · recommendations ({(mr.recommendations || []).length})
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  {(mr.quality_flags || []).map((f) => (
                    <span key={f} style={{ padding: "3px 10px", fontSize: 10.5,
                      background: "color-mix(in srgb, var(--router) 15%, transparent)", color: "var(--router)",
                      border: "1px solid color-mix(in srgb, var(--router) 30%, transparent)", borderRadius: 100 }}>⚑ {f}</span>
                  ))}
                </div>
              </div>
              {(mr.recommendations || []).length === 0 ? (
                <div style={{ fontSize: 12.5, color: "var(--muted)" }}>No recommendations yet for this session.</div>
              ) : (mr.recommendations || []).map((rec, i) => (
                <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 12,
                  padding: "12px 0", borderBottom: i < mr.recommendations.length - 1 ? "1px solid var(--border-soft)" : "none" }}>
                  <span style={{ padding: "2px 8px", fontSize: 10.5, fontWeight: 600,
                    background: "color-mix(in srgb, var(--good) 15%, transparent)", color: "var(--good)",
                    border: "1px solid color-mix(in srgb, var(--good) 30%, transparent)",
                    borderRadius: 100, flexShrink: 0 }}>#{i + 1}</span>
                  <div style={{ fontSize: 13, color: "var(--text)", lineHeight: 1.55 }}>{rec}</div>
                </div>
              ))}
            </div>
          )}

          <SectionHeader n="5" title="Lead status dashboard · session view" />
          <div className="wide-table-wrap" style={{ background: "var(--surface)", border: "1px solid var(--border)",
            borderRadius: 12, overflow: "hidden", marginBottom: 24 }}>
            <div style={{ display: "grid",
              gridTemplateColumns: "50px 1fr 130px 90px 130px 130px 1fr",
              gap: 12, padding: "10px 16px", background: "var(--surface2)",
              borderBottom: "1px solid var(--border)", fontSize: 10.5,
              color: "var(--muted2)", letterSpacing: 0.5, textTransform: "uppercase", fontWeight: 700 }}>
              <span></span><span>Lead</span><span>Platform</span><span>Score</span><span>Agent</span><span>Status</span><span>Reason / outcome</span>
            </div>
            {leads.map(L => {
              const firstAnalytics = (L.turns || []).find(t => t.analytics)?.analytics;
              const lastAgent = [...(L.turns || [])].reverse().find(t => t.role === "agent");
              const reason =
                L.status === "closed_won" ? "Marked as won by demo user" :
                L.status === "closed_lost" ? "Marked as lost by demo user" :
                L.status === "closed_ignored" ? "Analytics flagged spam / ignore — auto-closed" :
                L.status === "support_replied" ? "Routed to support · awaiting customer reply" :
                L.status === "sales_replied" ? "Sales replied · awaiting customer reply" :
                L.status === "analyzing" ? "Analytics + agent running…" :
                L.error ? L.error : "—";
              return (
                <div key={L.id} style={{ display: "grid",
                  gridTemplateColumns: "50px 1fr 130px 90px 130px 130px 1fr",
                  gap: 12, padding: "10px 16px", borderTop: "1px solid var(--border-soft)",
                  fontSize: 12, alignItems: "center" }}>
                  <div style={{ width: 30, height: 30, borderRadius: "50%",
                    background: `color-mix(in srgb, ${L.platformColor} 18%, transparent)`,
                    border: `1px solid color-mix(in srgb, ${L.platformColor} 35%, transparent)`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: L.platformColor, fontWeight: 600, fontSize: 12 }}>{L.avatar}</div>
                  <div>
                    <div style={{ color: "var(--text)", fontWeight: 600 }}>{L.name}</div>
                    <div style={{ color: "var(--muted2)", fontSize: 10.5 }}>{L.city}</div>
                  </div>
                  <span style={{ color: L.platformColor, fontSize: 11.5 }}>{L.platform}</span>
                  <span style={{ color: firstAnalytics?.category === "hot_lead" ? "var(--good)" :
                    firstAnalytics?.category === "spam" ? "var(--bad)" : "var(--router)", fontWeight: 600 }}>
                    {firstAnalytics?.score ?? "—"}
                  </span>
                  <span style={{ color: lastAgent?.agent === "support_ai" ? "var(--support)" : "var(--sales)" }}>
                    {lastAgent?.agent ?? "—"}
                  </span>
                  <StatusPill status={L.status} />
                  <span style={{ color: "var(--muted)" }}>{reason}</span>
                </div>
              );
            })}
          </div>
        </>
      )}
    </>
  );
}

function SectionHeader({ n, title, right }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between",
      gap: 12, marginBottom: 14, marginTop: 8 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center",
          width: 26, height: 26, borderRadius: "50%", background: "color-mix(in srgb, var(--sales) 18%, transparent)",
          color: "var(--sales)", fontWeight: 700, fontSize: 13,
          border: "1px solid color-mix(in srgb, var(--sales) 35%, transparent)" }}>{n}</span>
        <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text)", letterSpacing: -0.1 }}>{title}</span>
      </div>
      {right}
    </div>
  );
}

// ─────────── PAGE: Customer Issue Triage ───────────
function IssueTriagePage({ refresh, logEvent }) {
  const [results, setResults] = useState({}); // id -> { analytics, agent, response_text, intent, verdict, loading, error }

  const triage = async (item) => {
    setResults(prev => ({ ...prev, [item.id]: { ...prev[item.id], loading: true, error: null } }));
    const started = Date.now();
    try {
      const cid = "triage_" + item.id + "_" + Date.now();
      const r = await api("/chat/message", {
        tenant_id: TENANT_ID, customer_id: cid, conversation_id: cid, message: item.issue,
      });
      const score = r.analytics?.score ?? 0;
      const verdict =
        r.agent === "support_ai" && score >= 35 ? "genuine"
        : score < 15 ? "low_credibility"
        : "needs_human_review";
      setResults(prev => ({ ...prev, [item.id]: {
        analytics: r.analytics, agent: r.agent, intent: r.intent, response_text: r.response_text,
        verdict, loading: false, error: null,
      } }));
      logEvent?.({ method: "POST", path: "/chat/message", status: 200, elapsedMs: Date.now() - started,
        summary: `triage ${item.id} · ${verdict}`, kind: "support" });
      refresh?.();
    } catch (e) {
      const detail = e?.body?.detail ? (Array.isArray(e.body.detail) ? e.body.detail[0]?.msg : e.body.detail) : e.message;
      setResults(prev => ({ ...prev, [item.id]: { ...prev[item.id], loading: false, error: `Backend error: ${detail}` } }));
    }
  };

  const triageAll = async () => { await Promise.all(SUPPORT_QUEUE.map(triage)); };

  return (
    <>
      <PageHeader icon="🛟" color="var(--bad)" title="Customer Issue Triage"
        subtitle="Existing customers complain — kya issue genuine hai ya nahi? Support AI har case ko classify karta hai (issue_type, escalation_required), and Analytics score se hum 'genuine / needs review / low credibility' ka verdict nikalte hain." />

      <div style={{ marginBottom: 16, display: "flex", justifyContent: "flex-end" }}>
        <Button onClick={triageAll}>▶ Triage all open tickets</Button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(380px, 1fr))", gap: 14 }}>
        {SUPPORT_QUEUE.map(item => {
          const res = results[item.id];
          return (
            <div key={item.id} style={{ background: "var(--surface)", border: "1px solid var(--border)",
              borderRadius: 14, padding: "16px 20px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                <div style={{ width: 32, height: 32, borderRadius: "50%",
                  background: `color-mix(in srgb, ${item.color} 18%, transparent)`,
                  border: `1px solid color-mix(in srgb, ${item.color} 35%, transparent)`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: item.color, fontWeight: 600 }}>{item.avatar}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{item.name}</div>
                  <div style={{ fontSize: 11, color: "var(--muted)" }}>Customer since {item.customerSince} · ticket {item.lastIssue}</div>
                </div>
              </div>
              <div style={{ fontSize: 12.5, color: "var(--text)", padding: "8px 11px", background: "var(--surface2)",
                borderRadius: 8, border: "1px solid var(--border-soft)", lineHeight: 1.55, marginBottom: 12 }}>
                <span style={{ fontSize: 10, color: "var(--muted2)", fontWeight: 600, letterSpacing: 0.5,
                  textTransform: "uppercase", display: "block", marginBottom: 4 }}>Customer ticket</span>
                "{item.issue}"
              </div>
              {!res?.analytics && !res?.loading && !res?.error && (
                <Button variant="ghost" onClick={() => triage(item)} style={{ width: "100%" }}>
                  Triage this ticket
                </Button>
              )}
              {res?.loading && (
                <div style={{ display: "flex", gap: 8, color: "var(--muted)", fontSize: 12 }}>
                  <Dots /> <span>Support AI judging…</span>
                </div>
              )}
              {res?.error && (
                <div style={{ background: "color-mix(in srgb, var(--bad) 12%, transparent)",
                  color: "#FCA5A5", padding: "8px 10px", borderRadius: 6, fontSize: 12 }}>{res.error}</div>
              )}
              {res?.analytics && !res?.loading && (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {/* Verdict pill */}
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {(() => {
                      const v = res.verdict;
                      const c = v === "genuine" ? "var(--good)" : v === "low_credibility" ? "var(--bad)" : "var(--router)";
                      const label = v === "genuine" ? "✓ likely genuine" : v === "low_credibility" ? "⚠ low credibility" : "→ needs human review";
                      return (
                        <span style={{ padding: "4px 12px", fontSize: 11, fontWeight: 600,
                          background: `color-mix(in srgb, ${c} 15%, transparent)`, color: c,
                          border: `1px solid color-mix(in srgb, ${c} 30%, transparent)`, borderRadius: 100 }}>{label}</span>
                      );
                    })()}
                    <span style={{ padding: "4px 10px", fontSize: 10.5, fontWeight: 600,
                      background: "color-mix(in srgb, var(--analytics) 13%, transparent)", color: "var(--analytics)",
                      border: "1px solid color-mix(in srgb, var(--analytics) 30%, transparent)",
                      borderRadius: 100 }}>◈ score {res.analytics.score} · {res.analytics.category}</span>
                    <span style={{ padding: "4px 10px", fontSize: 10.5, fontWeight: 600,
                      background: `color-mix(in srgb, ${res.agent === "support_ai" ? "var(--support)" : "var(--sales)"} 13%, transparent)`,
                      color: res.agent === "support_ai" ? "var(--support)" : "var(--sales)",
                      border: `1px solid color-mix(in srgb, ${res.agent === "support_ai" ? "var(--support)" : "var(--sales)"} 30%, transparent)`,
                      borderRadius: 100 }}>{res.agent === "support_ai" ? "◉" : "◆"} {res.agent} · {res.intent}</span>
                  </div>
                  {/* Support AI reply */}
                  <div style={{ background: "var(--surface2)", border: "1px solid var(--border)",
                    padding: "10px 12px", borderRadius: 8, fontSize: 12.5, color: "var(--text)", lineHeight: 1.55 }}>
                    <div style={{ fontSize: 10, fontWeight: 600, color: "var(--muted2)", letterSpacing: 0.5,
                      textTransform: "uppercase", marginBottom: 4 }}>Suggested response</div>
                    {res.response_text}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}

// ─────────── PAGE: Overview (single lead deep dive, kept from before) ───────────
function OverviewPage({ report, refresh, logEvent }) {
  const s = report?.summary || {};
  const inv = s.agent_invocations || {};
  return (
    <>
      <PageHeader icon="⌂" color="var(--sales)" title="Overview" subtitle="Pick any lead and watch the full multi-agent pipeline fire. Top stats refresh after each turn." />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 22 }}>
        {[
          { label: "Conversations", v: s.total_conversations ?? 0, sub: `${s.total_user_turns ?? 0} user · ${s.total_assistant_turns ?? 0} assistant`, color: "var(--user)" },
          { label: "Hot leads", v: s.hot_leads ?? 0, sub: `of ${s.total_leads ?? 0} total`, color: "var(--good)" },
          { label: "Sales calls", v: inv.sales_ai ?? 0, sub: "Analytics → sales_followup", color: "var(--sales)" },
          { label: "Support calls", v: inv.support_ai ?? 0, sub: "Analytics → support_routing", color: "var(--support)" },
        ].map((m) => (
          <div key={m.label} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: "14px 18px" }}>
            <div style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>{m.label}</div>
            <div style={{ fontFamily: "'Instrument Serif', serif", fontSize: 32, color: m.color, lineHeight: 1, marginBottom: 4 }}>{m.v}</div>
            <div style={{ fontSize: 11.5, color: "var(--muted2)" }}>{m.sub}</div>
          </div>
        ))}
      </div>

      <LeadLifecycle onTurnComplete={refresh} logEvent={logEvent} />
    </>
  );
}

// ─────────── PAGE: Analytics ───────────
function AnalyticsPage({ refresh, logEvent }) {
  const [history, setHistory] = useState([]);
  const [draft, setDraft] = useState("");
  const [typing, setTyping] = useState(false);
  const [error, setError] = useState("");
  const samples = ["Aapke course ka price kya hai?", "Refund chahiye class working nahi", "Buy followers cheap free crypto", "Hi", "Free demo book karni hai class 10"];

  const run = async (text) => {
    const t = (text ?? draft).trim();
    if (!t || typing) return;
    setTyping(true); setError(""); setDraft("");
    const cid = "analytics_" + uid().slice(0, 10);
    try {
      const r = await api("/chat/message", { tenant_id: TENANT_ID, customer_id: cid, conversation_id: cid, message: t });
      setHistory((p) => [{ msg: t, analytics: r.analytics, agent: r.agent, intent: r.intent }, ...p].slice(0, 8));
      logEvent?.({ method: "POST", path: "/chat/message", status: 200, elapsedMs: 0, summary: `analytics · ${r.intent} · score ${r.analytics?.score}`, kind: "sales" });
      refresh?.();
    } catch (e) {
      const detail = e?.body?.detail ? (Array.isArray(e.body.detail) ? e.body.detail[0]?.msg : e.body.detail) : e.message;
      setError(`Backend error: ${detail}`);
    } finally { setTyping(false); }
  };

  const latest = history[0];
  return (
    <>
      <PageHeader icon="◈" color="var(--analytics)" title="Analytics AI"
        subtitle="The first stage. Takes any inbound message and outputs a score (0–100), intent label, lead category, and recommended_action that decides the next agent." />

      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, padding: 22, marginBottom: 18 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "var(--muted)", letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 14 }}>Try any message</div>
        <form onSubmit={(e) => { e.preventDefault(); run(); }} style={{ display: "flex", gap: 8, marginBottom: 14 }}>
          <input value={draft} onChange={(e) => setDraft(e.target.value)} disabled={typing}
            placeholder="Type a customer message…"
            style={{ flex: 1, background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)", padding: "11px 14px", borderRadius: 8, fontSize: 13.5, outline: "none" }} />
          <Button type="submit" disabled={typing || !draft.trim()}>Score it →</Button>
        </form>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {samples.map((s) => <SuggestionChip key={s} onClick={() => run(s)}>{s}</SuggestionChip>)}
        </div>
      </div>

      {typing && <AnalyticsCard loading />}
      {error && <div style={{ background: "color-mix(in srgb, var(--bad) 15%, transparent)", border: "1px solid color-mix(in srgb, var(--bad) 30%, transparent)", color: "#FCA5A5", padding: "10px 14px", borderRadius: 8, fontSize: 13 }}>{error}</div>}
      {latest && !typing && (
        <div style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 11, color: "var(--muted)", letterSpacing: 0.5, textTransform: "uppercase", fontWeight: 700, marginBottom: 8 }}>Latest decision · message: "{latest.msg}"</div>
          <AnalyticsCard data={latest.analytics} />
          <div style={{ marginTop: 8 }}><RouterArrow agent={latest.agent} /></div>
        </div>
      )}

      {history.length > 1 && (
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: 18 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 12 }}>Recent classifications</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {history.slice(1).map((h, i) => (
              <div key={i} className="responsive-cols-3" style={{ display: "grid", gridTemplateColumns: "1fr 80px 130px 130px", gap: 12, padding: "9px 14px", background: "var(--surface2)", border: "1px solid var(--border-soft)", borderRadius: 8, fontSize: 12.5 }}>
                <span style={{ color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>"{h.msg}"</span>
                <span style={{ color: h.analytics?.category === "hot_lead" ? "var(--good)" : h.analytics?.category === "spam" ? "var(--bad)" : "var(--router)", fontWeight: 600 }}>{h.analytics?.score}</span>
                <span style={{ color: "var(--muted)" }}>{h.analytics?.category}</span>
                <span style={{ color: "var(--sales)" }}>{h.analytics?.recommended_action}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

// ─────────── PAGE: Sales ───────────
function SalesPage({ refresh, logEvent }) {
  return (
    <>
      <PageHeader icon="◆" color="var(--sales)" title="Sales AI"
        subtitle="Runs when Analytics routes to sales_followup / qualification / nurture. Drives qualification, handles objections, pushes the configured primary_cta. Output goes through the do_not_say guard." />
      <FocusedChat
        agentLabel="Sales AI" agentColor="var(--sales)" agentIcon="◆"
        placeholder='Try: "price kya hai?" / "demo book karni hai" / "yes"'
        suggestions={["Aapke course ka price kya hai?", "Free demo book karni hai class 10", "Budget around 2000/month hai", "Discounts available hain?"]}
        conversationKey="sales"
        getAgentFields={{ expected: "sales_ai" }}
        onTurnComplete={refresh} logEvent={logEvent}
      />
    </>
  );
}

// ─────────── PAGE: Support ───────────
function SupportPage({ refresh, logEvent }) {
  return (
    <>
      <PageHeader icon="◉" color="var(--support)" title="Support AI"
        subtitle="Runs when Analytics routes to support_routing. Resolves issues using the FAQ list, sets escalation_required=true when an escalation rule matches. Output goes through the do_not_say guard." />
      <FocusedChat
        agentLabel="Support AI" agentColor="var(--support)" agentIcon="◉"
        placeholder='Try: "refund chahiye" / "login nahi ho raha" / "class working nahi"'
        suggestions={["Refund chahiye class nahi chal rahi", "Login nahi ho raha help karein", "Billing issue hai", "Course material kaise download karein?"]}
        conversationKey="support"
        getAgentFields={{ expected: "support_ai" }}
        onTurnComplete={refresh} logEvent={logEvent}
      />
    </>
  );
}

// ─────────── PAGE: Manager ───────────
function ManagerPage({ report, refresh, logEvent }) {
  const [loading, setLoading] = useState(false);
  const refreshManager = async () => {
    setLoading(true);
    await refresh?.();
    logEvent?.({ method: "POST", path: "/reports/generate", status: 200, elapsedMs: 0, summary: "manager refresh", kind: "sales" });
    setLoading(false);
  };
  const s = report?.summary || {};
  const inv = s.agent_invocations || {};
  const mr = report?.manager_ai?.data || {};
  const recs = mr.recommendations || [];
  const flags = mr.quality_flags || [];

  return (
    <>
      <PageHeader icon="◇" color="var(--good)" title="Manager AI"
        subtitle="The supervisory layer. Reads the deterministic SQL summary + a sample of agent outputs and writes grounded ops-level recommendations + quality flags. Authoritative numbers always come from the DB, never the LLM." />

      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
        <Button variant="ghost" onClick={refreshManager} disabled={loading}>↻ Generate fresh report</Button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 18 }}>
        {[
          { label: "Total leads", v: s.total_leads ?? 0, color: "var(--good)" },
          { label: "Avg score", v: s.avg_lead_score ?? "—", color: "var(--analytics)" },
          { label: "Conversations", v: s.total_conversations ?? 0, color: "var(--user)" },
          { label: "Escalations", v: s.support_escalations_required ?? 0, color: "var(--bad)" },
          { label: "Sales runs", v: inv.sales_ai ?? 0, color: "var(--sales)" },
          { label: "Support runs", v: inv.support_ai ?? 0, color: "var(--support)" },
        ].map((m) => (
          <div key={m.label} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: "16px 18px" }}>
            <div style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>{m.label}</div>
            <div style={{ fontFamily: "'Instrument Serif', serif", fontSize: 30, color: m.color, lineHeight: 1 }}>{m.v}</div>
          </div>
        ))}
      </div>

      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14, padding: 22 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--muted)", letterSpacing: 0.8, textTransform: "uppercase" }}>Manager AI · recommendations ({recs.length})</div>
          <div style={{ display: "flex", gap: 6 }}>
            {flags.map((f) => <span key={f} style={{ padding: "3px 10px", fontSize: 10.5, background: "color-mix(in srgb, var(--router) 15%, transparent)", color: "var(--router)", border: "1px solid color-mix(in srgb, var(--router) 30%, transparent)", borderRadius: 100 }}>⚑ {f}</span>)}
          </div>
        </div>
        {recs.length === 0 ? (
          <div style={{ fontSize: 13, color: "var(--muted)", padding: "14px 0" }}>
            No recommendations yet — send a few demo chats then click <strong style={{ color: "var(--text)" }}>Generate fresh report</strong>.
          </div>
        ) : recs.map((rec, i) => (
          <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 14, padding: "14px 0", borderBottom: i < recs.length - 1 ? "1px solid var(--border-soft)" : "none" }}>
            <span style={{ padding: "3px 10px", fontSize: 10.5, fontWeight: 600, background: "color-mix(in srgb, var(--good) 15%, transparent)", color: "var(--good)", border: "1px solid color-mix(in srgb, var(--good) 30%, transparent)", borderRadius: 100, flexShrink: 0 }}>#{i + 1}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13.5, color: "var(--text)", lineHeight: 1.6 }}>{rec}</div>
              <div style={{ fontSize: 11.5, color: "var(--muted2)", marginTop: 4 }}>grounded in the summary above</div>
            </div>
          </div>
        ))}
        {mr.recommendations_status && mr.recommendations_status !== "ok" && (
          <div style={{ marginTop: 14, padding: "10px 14px", background: "color-mix(in srgb, var(--bad) 12%, transparent)", border: "1px solid color-mix(in srgb, var(--bad) 25%, transparent)", borderRadius: 8, fontSize: 12.5, color: "#FCA5A5" }}>
            ⚠ LLM status: {mr.recommendations_status} — deterministic summary above is still authoritative.
          </div>
        )}
      </div>
    </>
  );
}

// ─────────── PAGE: Scenario ───────────
function ScenarioPage({ logEvent }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const run = useCallback(async () => {
    setLoading(true); setError("");
    const started = Date.now();
    try {
      const r = await api("/scenario/analyze", { tenant_id: TENANT_ID });
      setData(r);
      logEvent?.({ method: "POST", path: "/scenario/analyze", status: 200, elapsedMs: Date.now() - started,
        summary: `${r.scenario_engine?.data?.patterns_detected?.length ?? 0} patterns`, kind: "sales" });
    } catch (e) {
      setError(e.message || "failed");
    } finally { setLoading(false); }
  }, [logEvent]);

  useEffect(() => { run(); }, [run]);

  const pats = data?.scenario_engine?.data?.patterns_detected || [];
  const recs = data?.scenario_engine?.data?.recommendations || [];
  const faqs = data?.scenario_engine?.data?.new_faq_candidates || [];

  return (
    <>
      <PageHeader icon="◌" color="var(--router)" title="Scenario Engine"
        subtitle="The learning layer. Reads recent conversations + agent outputs and proposes concrete artifact changes — FAQs to add, prompt clarifications to insert, do_not_say entries to register. Each pattern is saved to scenario_updates with status='pending'." />

      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
        <Button variant="ghost" onClick={run} disabled={loading}>↻ Re-analyze</Button>
      </div>

      {error && <div style={{ background: "color-mix(in srgb, var(--bad) 15%, transparent)", border: "1px solid color-mix(in srgb, var(--bad) 30%, transparent)", color: "#FCA5A5", padding: "10px 14px", borderRadius: 8, fontSize: 13, marginBottom: 16 }}>{error}</div>}
      {loading && <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: 22, textAlign: "center", color: "var(--muted)" }}><Dots /></div>}

      {!loading && pats.length === 0 && (
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: 26, textAlign: "center", color: "var(--muted)", fontSize: 13.5 }}>
          No patterns yet. Send a few messages through the Overview / Sales / Support pages, then refresh.
        </div>
      )}

      {pats.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 12 }}>Patterns detected ({pats.length})</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 12 }}>
            {pats.map((p, i) => {
              const sev = (p.severity || "medium").toLowerCase();
              const c = sev === "high" ? "var(--bad)" : sev === "low" ? "var(--good)" : "var(--router)";
              return (
                <div key={i} style={{ background: "var(--surface)", border: `1px solid color-mix(in srgb, ${c} 30%, var(--border))`, borderRadius: 12, padding: "16px 20px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                    <span style={{ padding: "3px 10px", fontSize: 10.5, fontWeight: 600, background: `color-mix(in srgb, ${c} 15%, transparent)`, color: c, border: `1px solid color-mix(in srgb, ${c} 30%, transparent)`, borderRadius: 100, textTransform: "uppercase" }}>{sev}</span>
                    <span style={{ fontSize: 11, color: "var(--muted2)" }}>#{i + 1}</span>
                  </div>
                  <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--text)", lineHeight: 1.45, marginBottom: 10 }}>{p.pattern}</div>
                  {p.evidence && <div style={{ fontSize: 12.5, color: "var(--muted)", lineHeight: 1.55, background: "var(--surface2)", padding: "10px 12px", borderRadius: 8, border: "1px solid var(--border-soft)" }}><span style={{ fontSize: 10, color: "var(--muted2)", fontWeight: 600, letterSpacing: 0.4, textTransform: "uppercase", display: "block", marginBottom: 4 }}>Evidence</span>{p.evidence}</div>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {recs.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 12 }}>Suggested artifact changes ({recs.length})</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {recs.map((r, i) => (
              <div key={i} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: "16px 20px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                  <span className="mono" style={{ padding: "3px 10px", fontSize: 11, background: "color-mix(in srgb, var(--analytics) 15%, transparent)", color: "var(--analytics)", border: "1px solid color-mix(in srgb, var(--analytics) 30%, transparent)", borderRadius: 100 }}>{r.target}</span>
                </div>
                <div className="mono" style={{ fontSize: 12.5, color: "var(--text)", lineHeight: 1.55, background: "var(--surface2)", padding: "10px 12px", borderRadius: 8, border: "1px solid var(--border-soft)", whiteSpace: "pre-wrap", marginBottom: 8 }}>{r.change}</div>
                {r.rationale && <div style={{ fontSize: 12, color: "var(--muted)" }}><span style={{ color: "var(--muted2)" }}>Why:</span> {r.rationale}</div>}
              </div>
            ))}
          </div>
        </div>
      )}

      {faqs.length > 0 && (
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 12 }}>New FAQ candidates ({faqs.length})</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 12 }}>
            {faqs.map((f, i) => (
              <div key={i} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: "16px 20px" }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", marginBottom: 8 }}>Q: {f.question}</div>
                <div style={{ fontSize: 12.5, color: "var(--muted)", lineHeight: 1.55 }}>A: {f.suggested_answer}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

// ─────────── Sidebar ───────────
function Sidebar({ active, setActive, status, errorMsg, events }) {
  return (
    <aside className="app-sidebar" style={{
      width: 240, background: "var(--surface)", borderRight: "1px solid var(--border)",
      display: "flex", flexDirection: "column", padding: "20px 14px", position: "sticky", top: 0,
      height: "100vh", flexShrink: 0,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24, paddingLeft: 6 }}>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: "color-mix(in srgb, var(--sales) 15%, transparent)", border: "1px solid color-mix(in srgb, var(--sales) 35%, transparent)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--sales)", fontFamily: "monospace", fontSize: 16 }}>◆</div>
        <div>
          <div style={{ fontFamily: "'Instrument Serif', serif", fontSize: 19 }}>MOS</div>
          <div style={{ fontSize: 10, color: "var(--muted2)", letterSpacing: 0.5 }}>Live Demo</div>
        </div>
      </div>

      <nav style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1 }}>
        {PAGES.map((p) => {
          const isActive = active === p.id;
          return (
            <button key={p.id} onClick={() => setActive(p.id)}
              style={{
                display: "flex", alignItems: "center", gap: 11,
                padding: "10px 12px", borderRadius: 8, border: "none",
                background: isActive ? "color-mix(in srgb, " + p.color + " 12%, transparent)" : "transparent",
                color: isActive ? p.color : "var(--muted)",
                cursor: "pointer", textAlign: "left", fontSize: 13,
                fontWeight: isActive ? 600 : 500,
                transition: "background .15s, color .15s",
              }}
              onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = "var(--surface2)"; }}
              onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = "transparent"; }}>
              <span style={{ width: 22, textAlign: "center", color: p.color, fontFamily: "monospace" }}>{p.icon}</span>
              <span style={{ flex: 1 }}>{p.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Connection */}
      <div className="app-sidebar-secondary" style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid var(--border)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, paddingLeft: 6 }}>
          <span className="pulse" style={{ width: 7, height: 7, borderRadius: "50%", background: status === "error" ? "var(--bad)" : "var(--good)" }} />
          <span style={{ fontSize: 11, color: status === "error" ? "#FCA5A5" : "var(--muted)" }} className="mono">
            {status === "error" ? "OFFLINE" : status === "loading" ? "connecting…" : "live"}
          </span>
        </div>
        <div className="mono" style={{ fontSize: 10, color: "var(--muted2)", paddingLeft: 6, wordBreak: "break-all" }}>
          {API_BASE}<br/>tenant: {TENANT_ID}
        </div>
      </div>

      {/* Mini activity log */}
      {events.length > 0 && (
        <div className="app-sidebar-secondary" style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid var(--border)" }}>
          <div style={{ fontSize: 10, color: "var(--muted2)", letterSpacing: 0.8, textTransform: "uppercase", fontWeight: 600, paddingLeft: 6, marginBottom: 8 }}>recent calls</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: 140, overflowY: "auto" }}>
            {events.slice(0, 6).map((e, i) => {
              const c = e.kind === "support" ? "var(--support)" : e.kind === "error" ? "var(--bad)" : "var(--sales)";
              return (
                <div key={i} className="mono" style={{ fontSize: 10, padding: "4px 6px", borderRadius: 4, background: "var(--surface2)", color: "var(--muted)", display: "flex", justifyContent: "space-between", gap: 6 }}>
                  <span style={{ color: "var(--muted2)" }}>{e.time}</span>
                  <span style={{ color: c, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.summary}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </aside>
  );
}

// ─────────── App ───────────
export default function App() {
  const [page, setPage] = useState("flow");
  const [report, setReport] = useState(null);
  const [status, setStatus] = useState("loading");
  const [errorMsg, setErrorMsg] = useState("");
  const [events, setEvents] = useState([]);

  const logEvent = useCallback((e) => {
    setEvents((p) => [{ ...e, time: nowTime() }, ...p].slice(0, 20));
  }, []);

  const refresh = useCallback(async () => {
    setStatus("loading"); setErrorMsg("");
    try {
      // Seed the default tenant's config so backend is happy on first boot
      try {
        await api("/config/create", { tenant_id: TENANT_ID, ...VERTICALS[DEFAULT_VERTICAL].config });
      } catch {}
      const r = await api("/reports/generate", { tenant_id: TENANT_ID });
      setReport(r); setStatus("ok");
    } catch (e) {
      setStatus("error"); setErrorMsg(e.message || "Backend not reachable");
    }
  }, []);

  useEffect(() => { window.scrollTo({ top: 0 }); refresh(); }, [refresh]);

  // Reset scroll when switching pages
  useEffect(() => { window.scrollTo({ top: 0, behavior: "smooth" }); }, [page]);

  return (
    <div className="app-shell" style={{ display: "flex", minHeight: "100vh" }}>
      <Sidebar active={page} setActive={setPage} status={status} errorMsg={errorMsg} events={events} />
      <main className="app-main" style={{ flex: 1, padding: "28px 36px 60px", maxWidth: 1200, margin: "0 auto", width: "100%" }}>
        {status === "error" && (
          <div style={{ background: "color-mix(in srgb, var(--bad) 12%, transparent)", border: "1px solid color-mix(in srgb, var(--bad) 25%, transparent)", color: "#FCA5A5", padding: "10px 14px", borderRadius: 8, fontSize: 13, marginBottom: 18 }}>
            Backend not reachable at <span className="mono" style={{ color: "var(--text)" }}>{API_BASE}</span>. Start it with <span className="mono" style={{ color: "var(--text)" }}>uvicorn app.main:app --port 8765</span>.
          </div>
        )}
        {page === "flow"      && <FlowDemoPage    report={report} refresh={refresh} logEvent={logEvent} />}
        {page === "support_q" && <IssueTriagePage refresh={refresh} logEvent={logEvent} />}
      </main>
    </div>
  );
}
