import { useState, useRef, useEffect } from "react";

// --- CONFIGURATION CONSTANTS ---
const GEMINI_MODEL = "gemini-2.5-flash"; // Easily update to 'gemini-2.5-pro' or 'gemini-3.1-pro-preview'
const GEMINI_API_BASE_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

const CFO_SYSTEM_PROMPT = `You are Srinivasan Vaidyanathan, CFO (Group Head – Finance) at HDFC Bank. You are roleplaying a sales meeting where a vendor from Sunfire (a systems integrator) is trying to sell you a Private AI Stack and professional services.

## YOUR PERSONA
- 30 years at Citigroup before joining HDFC Bank in 2019 as CFO
- Results-driven, direct, analytical, data-first. You speak in metrics, not buzzwords.
- You are NOT hostile — you are professionally measured, calm, and skeptical-but-open
- You expect clear ROI, strong governance, regulatory compliance alignment
- You dislike hype, vague claims, and pitches that sacrifice margins for novelty
- You are a cricket fan and Carnatic music listener — warm but precise
- Your famous line: "Finance without strategy is just numbers — strategy without finance is just dreaming."

## YOUR CURRENT PRIORITIES
- Post-merger HDFC Ltd integration — balance sheet normalization, CD ratio targeting 85-90% by FY27
- Cost-to-income ratio improvement (currently 39.2%) — you want operating leverage
- RBI FREE-AI compliance is now a board-level obligation
- Data sovereignty — cannot use offshore AI APIs for customer/transaction data (RBI + DPDP Act)
- You support technology that creates a "single source of truth" for finance and improves governance
- GenAI interests you but you expect concrete business cases

## YOUR OBJECTIONS (deploy naturally, don't dump them all at once)
1. Budget: "Where does this sit in the capital allocation? What's the ROI timeline?"
2. Risk: "What happens if this disrupts current workflows during implementation?"
3. Alternatives: "We already have Azure and Microsoft. Why can't they do this?"
4. Proof: "Show me a bank that's done this at our scale with real numbers."
5. Compliance: "How does this map to RBI FREE-AI? Our board needs to sign off."
6. TCO: "What's the TOTAL cost — not just licensing, but integration, training, maintenance?"

## SCENARIO
The salesperson (from Sunfire) has requested a 20-minute meeting. You've agreed because HDFC Bank is under pressure to produce compliant GenAI infrastructure. You have limited time and will push back on budget early.

## BEHAVIOR RULES
- Stay in character throughout. Never break the fourth wall.
- Start skeptically but reward good financial/compliance arguments
- Ask follow-up questions when answers are vague
- If the salesperson gives strong ROI data or compliance alignment, soften slightly
- Keep responses concise (2-4 sentences) — you're a busy CFO
- Occasionally reference HDFC Bank specifics: the merger, EVA chatbot scale, the Azure data lake, RBI FREE-AI
- Do NOT accept the pitch too easily — make them work for it
- Signal meeting time pressure after 8-10 exchanges: "We have about 5 minutes left."

Begin the meeting when the user sends their first message. Do NOT introduce yourself first — wait for the salesperson to open.`;

const FEEDBACK_SYSTEM_PROMPT = `You are an expert B2B enterprise sales coach specializing in BFSI (Banking, Financial Services, Insurance) deals in India. You've just observed a sales roleplay between a Sunfire salesperson selling a Private AI Stack to Srinivasan Vaidyanathan, CFO of HDFC Bank.

Analyze the FULL conversation and provide structured feedback. Be specific, direct, and developmental — not harsh, not sycophantic.

Return ONLY valid JSON with this exact structure:
{
  "overallScore": <number 1-100>,
  "overallSummary": "<2-3 sentence executive summary of performance>",
  "categories": [
    {
      "name": "Opening Welcome",
      "score": <1-10>,
      "feedback": "<specific observation>",
      "tip": "<one actionable improvement>"
    },
    {
      "name": "Financial Clarity & Quantification",
      "score": <1-10>,
      "feedback": "<specific observation>",
      "tip": "<one actionable improvement>"
    },
    {
      "name": "Capital Allocation Justification",
      "score": <1-10>,
      "feedback": "<specific observation>",
      "tip": "<one actionable improvement>"
    },
    {
      "name": "Risk Mitigation & Downside Thinking",
      "score": <1-10>,
      "feedback": "<specific observation>",
      "tip": "<one actionable improvement>"
    },
    {
      "name": "Total Cost Transparency",
      "score": <1-10>,
      "feedback": "<specific observation>",
      "tip": "<one actionable improvement>"
    },
    {
      "name": "Strategic Alignment",
      "score": <1-10>,
      "feedback": "<specific observation>",
      "tip": "<one actionable improvement>"
    },
    {
      "name": "Board-Ready Framing",
      "score": <1-10>,
      "feedback": "<specific observation>",
      "tip": "<one actionable improvement>"
    },
    {
      "name": "Credibility & Evidence",
      "score": <1-10>,
      "feedback": "<specific observation>",
      "tip": "<one actionable improvement>"
    },
    {
      "name": "Executive Composure & Structure",
      "score": <1-10>,
      "feedback": "<specific observation>",
      "tip": "<one actionable improvement>"
    },
    {
      "name": "Ending & Next Steps",
      "score": <1-10>,
      "feedback": "<specific observation>",
      "tip": "<one actionable improvement>"
    }
  ],
  "topStrengths": ["<strength 1>", "<strength 2>"],
  "topImprovements": ["<improvement 1>", "<improvement 2>", "<improvement 3>"],
  "nextStepSuggestion": "<concrete recommended next step for the actual deal>"
}`;

const COLORS = {
  bg: "#0a0e1a",
  surface: "#111827",
  surfaceHover: "#1a2236",
  border: "#1e2d45",
  accent: "#0ea5e9",
  accentGlow: "rgba(14,165,233,0.15)",
  gold: "#f59e0b",
  goldGlow: "rgba(245,158,11,0.15)",
  success: "#10b981",
  danger: "#ef4444",
  textPrimary: "#f1f5f9",
  textSecondary: "#94a3b8",
  textMuted: "#4b5563",
  cfoAccent: "#8b5cf6",
};

function ScoreRing({ score, size = 80 }) {
  const r = (size - 10) / 2;
  const circ = 2 * Math.PI * r;
  const filled = (score / 100) * circ;
  const color = score >= 75 ? COLORS.success : score >= 50 ? COLORS.gold : COLORS.danger;
  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={COLORS.border} strokeWidth={8} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={8}
        strokeDasharray={`${filled} ${circ}`} strokeLinecap="round"
        style={{ transition: "stroke-dasharray 1s ease" }} />
      <text x={size/2} y={size/2} textAnchor="middle" dominantBaseline="central"
        style={{ fill: color, fontSize: 18, fontWeight: 700, transform: "rotate(90deg)", transformOrigin: `${size/2}px ${size/2}px` }}>
        {score}
      </text>
    </svg>
  );
}

function CategoryBar({ cat }) {
  const color = cat.score >= 8 ? COLORS.success : cat.score >= 6 ? COLORS.gold : COLORS.danger;
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <span style={{ color: COLORS.textPrimary, fontWeight: 600, fontSize: 13 }}>{cat.name}</span>
        <span style={{ color, fontWeight: 700, fontSize: 14 }}>{cat.score}/10</span>
      </div>
      <div style={{ height: 6, background: COLORS.border, borderRadius: 4, marginBottom: 8, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${cat.score * 10}%`, background: color, borderRadius: 4, transition: "width 1s ease" }} />
      </div>
      <p style={{ color: COLORS.textSecondary, fontSize: 12, margin: "0 0 4px" }}>{cat.feedback}</p>
      <p style={{ color: COLORS.accent, fontSize: 12, margin: 0 }}>💡 {cat.tip}</p>
    </div>
  );
}

export default function App() {
  const [phase, setPhase] = useState("intro"); // intro | chat | feedback
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [error, setError] = useState("");
  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Robust helper function to interact with Gemini
  async function callGemini(msgs, systemPrompt, requireJson = false) {
    const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

    if (!API_KEY) {
      throw new Error("Missing Setup: VITE_GEMINI_API_KEY is not defined in your environment variables.");
    }

    const contents = msgs.map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

    const body = {
      systemInstruction: {
        parts: [{ text: systemPrompt }],
      },
      contents: contents,
    };

    if (requireJson) {
      body.generationConfig = { responseMimeType: "application/json" };
    }

    try {
      const res = await fetch(`${GEMINI_API_BASE_URL}?key=${API_KEY}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      // Handle HTTP Errors explicitly
      if (!res.ok) {
        let errorMsg = `HTTP Error ${res.status}`;
        try {
          const errorData = await res.json();
          if (errorData.error?.message) errorMsg = errorData.error.message;
        } catch (e) { /* Fallback to standard status if JSON parsing fails */ }

        if (res.status === 400) throw new Error(`Bad Request: ${errorMsg}`);
        if (res.status === 403) throw new Error("Authentication Failed: Invalid Gemini API Key.");
        if (res.status === 429) throw new Error("Rate Limit Exceeded: You have hit the API quota. Try again later.");
        if (res.status >= 500) throw new Error("Gemini API Server Error: The service is currently unavailable.");
        throw new Error(`API Error: ${errorMsg}`);
      }

      const data = await res.json();
      
      // Handle edge cases where generation is blocked by safety settings
      if (!data.candidates || data.candidates.length === 0) {
        throw new Error("No response was generated. This may be due to the AI's safety filters blocking the content.");
      }

      return data.candidates[0].content.parts[0].text;
    } catch (err) {
      console.error("Gemini API Error:", err);
      throw err; // Re-throw to be caught by the caller
    }
  }

  async function sendMessage() {
    if (!input.trim() || loading) return;
    
    const userMsg = { role: "user", content: input.trim() };
    const originalInput = input; // Save input for rollback
    const newMessages = [...messages, userMsg];
    
    setMessages(newMessages);
    setInput("");
    setLoading(true);
    setError("");
    
    try {
      const reply = await callGemini(newMessages, CFO_SYSTEM_PROMPT, false);
      setMessages([...newMessages, { role: "assistant", content: reply }]);
    } catch (e) {
      setError(e.message || "Failed to connect to the AI. Please check your network and try again.");
      // Rollback on error so the user doesn't lose their message
      setMessages(messages); 
      setInput(originalInput);
    } finally {
      setLoading(false);
    }
  }

  async function endSession() {
    if (messages.length < 2) {
      setError("Please interact with the CFO at least once before requesting feedback.");
      return;
    }
    
    setFeedbackLoading(true);
    setPhase("feedback");
    setError("");
    
    const transcript = messages.map(m => `${m.role === "user" ? "SALESPERSON" : "CFO"}: ${m.content}`).join("\n\n");
    
    try {
      const rawResponseString = await callGemini(
        [{ role: "user", content: `Here is the full sales roleplay transcript:\n\n${transcript}\n\nProvide your coaching feedback now.` }], 
        FEEDBACK_SYSTEM_PROMPT, 
        true
      );
      
      // Resilient JSON parsing: Strip out markdown block formatting if Gemini returns it
      const cleanJsonString = rawResponseString.replace(/```json/gi, "").replace(/```/g, "").trim();
      
      const cleanJson = JSON.parse(cleanJsonString);
      setFeedback(cleanJson);
    } catch (e) {
      // Differentiate between API errors and JSON Parsing errors
      if (e instanceof SyntaxError) {
        setError("The AI returned an improperly formatted evaluation. Please try generating feedback again.");
      } else {
        setError(e.message || "Could not generate feedback. Please try again.");
      }
      // Revert phase so the user can try ending the session again
      setPhase("chat"); 
    } finally {
      setFeedbackLoading(false);
    }
  }

  function restart() {
    setMessages([]);
    setFeedback(null);
    setPhase("intro");
    setError("");
    setInput("");
  }

  const styles = {
    app: { minHeight: "100vh", background: COLORS.bg, fontFamily: "'DM Sans', 'Segoe UI', system-ui, sans-serif", color: COLORS.textPrimary },
    header: { background: COLORS.surface, borderBottom: `1px solid ${COLORS.border}`, padding: "14px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 100 },
    logo: { display: "flex", alignItems: "center", gap: 10 },
    logoIcon: { width: 34, height: 34, background: `linear-gradient(135deg, ${COLORS.accent}, ${COLORS.cfoAccent})`, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 },
    logoText: { fontSize: 15, fontWeight: 700, color: COLORS.textPrimary, letterSpacing: "-0.02em" },
    logoSub: { fontSize: 11, color: COLORS.textSecondary },
    badge: { background: COLORS.accentGlow, border: `1px solid ${COLORS.accent}`, color: COLORS.accent, borderRadius: 20, padding: "3px 10px", fontSize: 11, fontWeight: 600 },
  };

  return (
    <div style={styles.app}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />

      {/* Header */}
      <div style={styles.header}>
        <div style={styles.logo}>
          <div style={styles.logoIcon}>🎯</div>
          <div>
            <div style={styles.logoText}>SalesPractice AI</div>
            <div style={styles.logoSub}>For Sunfire</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {phase === "chat" && (
            <>
              <span style={{ ...styles.badge, background: "rgba(16,185,129,0.1)", borderColor: COLORS.success, color: COLORS.success }}>
                ● Live Session
              </span>
              <button onClick={endSession} style={{ background: COLORS.surfaceHover, border: `1px solid ${COLORS.border}`, color: COLORS.textSecondary, borderRadius: 8, padding: "6px 14px", fontSize: 12, cursor: "pointer", fontWeight: 600 }}>
                End & Get Feedback
              </button>
            </>
          )}
          {phase !== "intro" && (
            <button onClick={restart} style={{ background: "transparent", border: "none", color: COLORS.textMuted, cursor: "pointer", fontSize: 12 }}>
              ↩ Restart
            </button>
          )}
        </div>
      </div>

      {/* INTRO PHASE */}
      {phase === "intro" && (
        <div style={{ maxWidth: 720, margin: "0 auto", padding: "48px 24px" }}>
          
          {/* Scenario card */}
          <div style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 16, padding: 32, marginBottom: 24, transition: "opacity 0.3s" }}>
            <div style={{ display: "flex", gap: 16, alignItems: "flex-start", marginBottom: 24 }}>
              <div style={{ width: 52, height: 52, background: `linear-gradient(135deg, ${COLORS.cfoAccent}30, ${COLORS.cfoAccent}60)`, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, flexShrink: 0 }}>
                🏦
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", color: COLORS.cfoAccent, textTransform: "uppercase", marginBottom: 4 }}>HDFC Bank · CFO Roleplay</div>
                <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: COLORS.textPrimary, lineHeight: 1.3 }}>Handle a CFO's Budget Objection</h1>
                <p style={{ color: COLORS.textSecondary, margin: "8px 0 0", fontSize: 14 }}>Practice selling a Private AI Stack to India's largest private bank</p>
              </div>
            </div>

            {/* CFO Profile */}
            <div style={{ background: COLORS.bg, borderRadius: 12, padding: 20, marginBottom: 20, border: `1px solid ${COLORS.border}` }}>
              <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 12 }}>
                <div style={{ width: 40, height: 40, background: `linear-gradient(135deg, #7c3aed, #4f46e5)`, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>👔</div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: COLORS.textPrimary }}>Srinivasan Vaidyanathan</div>
                  <div style={{ fontSize: 12, color: COLORS.textSecondary }}>Group Head – Finance (CFO), HDFC Bank</div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
                {["Results-Driven", "Data-First", "Governance Focused", "Metrics-Led"].map(t => (
                  <span key={t} style={{ background: `${COLORS.cfoAccent}15`, border: `1px solid ${COLORS.cfoAccent}40`, color: COLORS.cfoAccent, borderRadius: 20, padding: "2px 8px", fontSize: 11, fontWeight: 600 }}>{t}</span>
                ))}
              </div>
              <p style={{ color: COLORS.textSecondary, fontSize: 13, margin: 0, lineHeight: 1.6 }}>
                27 years at Citigroup (CFO, Global Treasury). Joined HDFC Bank 2019. Focused on post-merger balance sheet normalisation, cost-to-income improvement, and RBI compliance. Skeptical of tech hype but open to clear ROI. Will grill you on total cost, governance, and proof.
              </p>
            </div>

            {/* Context */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
              {[
                { icon: "⚡", label: "Hot Trigger", value: "RBI FREE-AI compliance deadline pressure in 2026" },
                { icon: "💰", label: "Deal Size", value: "$3M–$15M infrastructure + services" },
                { icon: "🎯", label: "Your Objective", value: "Get CFO buy-in for a Private AI Stack pilot" },
                { icon: "⏱️", label: "Meeting Time", value: "20 minutes — he's a busy CFO" },
              ].map(item => (
                <div key={item.label} style={{ background: COLORS.surfaceHover, borderRadius: 10, padding: "12px 14px" }}>
                  <div style={{ fontSize: 18, marginBottom: 4 }}>{item.icon}</div>
                  <div style={{ fontSize: 11, color: COLORS.textMuted, fontWeight: 600, marginBottom: 2 }}>{item.label}</div>
                  <div style={{ fontSize: 12, color: COLORS.textSecondary }}>{item.value}</div>
                </div>
              ))}
            </div>

            {/* Tips */}
            <div style={{ background: `${COLORS.gold}10`, border: `1px solid ${COLORS.gold}30`, borderRadius: 10, padding: "14px 16px" }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: COLORS.gold, marginBottom: 8 }}>💡 COACHING TIPS BEFORE YOU START</div>
              <ul style={{ margin: 0, paddingLeft: 18, color: COLORS.textSecondary, fontSize: 12, lineHeight: 1.8 }}>
                <li>Open with a crisp intro — company, name, purpose. Don't assume he knows you.</li>
                <li>Lead with <strong style={{ color: COLORS.textPrimary }}>regulatory risk</strong> (RBI FREE-AI) before commercial value.</li>
                <li>Quantify everything — cost-per-inference savings, NPA reduction %, time-to-compliance.</li>
                <li>Reference HDFC specifics: EVA's 16M queries/month, the Azure data fabric, post-merger data sprawl.</li>
                <li>End with a clear, low-risk next step — propose a pilot, not a full purchase.</li>
              </ul>
            </div>
            
            {/* Intro Error display */}
            {error && <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid #ef444440", borderRadius: 8, padding: "12px 16px", color: COLORS.danger, fontSize: 13, marginTop: 20, lineHeight: 1.5 }}>⚠️ {error}</div>}
          </div>

          <button
            onClick={() => { setError(""); setPhase("chat"); }}
            style={{
              width: "100%",
              background: `linear-gradient(135deg, ${COLORS.accent}, ${COLORS.cfoAccent})`,
              border: "none",
              borderRadius: 12,
              padding: "16px",
              color: "#fff",
              fontSize: 16,
              fontWeight: 700,
              cursor: "pointer",
              letterSpacing: "-0.01em",
              transition: "all 0.3s"
            }}
          >
            Start Roleplay → Meet the CFO
          </button>
        </div>
      )}

      {/* CHAT PHASE */}
      {phase === "chat" && (
        <div style={{ maxWidth: 760, margin: "0 auto", padding: "0 16px 100px", display: "flex", flexDirection: "column", height: "calc(100vh - 57px)" }}>
          {/* CFO header */}
          <div style={{ background: COLORS.surface, borderBottom: `1px solid ${COLORS.border}`, padding: "12px 16px", display: "flex", gap: 12, alignItems: "center", flexShrink: 0 }}>
            <div style={{ width: 36, height: 36, background: "linear-gradient(135deg,#7c3aed,#4f46e5)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>👔</div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 13 }}>Srinivasan Vaidyanathan</div>
              <div style={{ fontSize: 11, color: COLORS.textSecondary }}>CFO, HDFC Bank · Results-Driven · Data-First</div>
            </div>
            <div style={{ marginLeft: "auto", fontSize: 11, color: COLORS.textMuted }}>{messages.filter(m => m.role === "user").length} exchanges</div>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: "auto", padding: "20px 4px" }}>
            {messages.length === 0 && (
              <div style={{ textAlign: "center", padding: "40px 20px" }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>💬</div>
                <p style={{ color: COLORS.textMuted, fontSize: 14 }}>The CFO is waiting. Open with your introduction.</p>
              </div>
            )}
            {messages.map((msg, i) => (
              <div key={i} style={{ display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start", marginBottom: 16 }}>
                {msg.role === "assistant" && (
                  <div style={{ width: 32, height: 32, background: "linear-gradient(135deg,#7c3aed,#4f46e5)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0, marginRight: 10, marginTop: 4 }}>👔</div>
                )}
                <div style={{
                  maxWidth: "75%",
                  background: msg.role === "user" ? `linear-gradient(135deg, ${COLORS.accent}20, ${COLORS.accent}10)` : COLORS.surface,
                  border: `1px solid ${msg.role === "user" ? COLORS.accent + "40" : COLORS.border}`,
                  borderRadius: msg.role === "user" ? "16px 4px 16px 16px" : "4px 16px 16px 16px",
                  padding: "12px 16px",
                  fontSize: 14,
                  lineHeight: 1.6,
                  color: COLORS.textPrimary,
                }}>
                  {msg.role === "assistant" && (
                    <div style={{ fontSize: 10, fontWeight: 700, color: COLORS.cfoAccent, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>CFO</div>
                  )}
                  {msg.content}
                </div>
                {msg.role === "user" && (
                  <div style={{ width: 32, height: 32, background: `linear-gradient(135deg, ${COLORS.accent}, #0284c7)`, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0, marginLeft: 10, marginTop: 4 }}>🧑</div>
                )}
              </div>
            ))}
            {loading && (
              <div style={{ display: "flex", gap: 10, alignItems: "center", padding: "8px 4px" }}>
                <div style={{ width: 32, height: 32, background: "linear-gradient(135deg,#7c3aed,#4f46e5)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0 }}>👔</div>
                <div style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: "4px 16px 16px 16px", padding: "12px 16px" }}>
                  <div style={{ display: "flex", gap: 4 }}>
                    {[0, 1, 2].map(j => (
                      <div key={j} style={{ width: 6, height: 6, borderRadius: "50%", background: COLORS.textMuted, animation: `pulse 1.2s ease-in-out ${j * 0.2}s infinite` }} />
                    ))}
                  </div>
                </div>
              </div>
            )}
            {error && <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid #ef444440", borderRadius: 8, padding: "10px 14px", color: COLORS.danger, fontSize: 13, margin: "8px 0" }}>⚠️ {error}</div>}
            <div ref={chatEndRef} />
          </div>

          {/* Input */}
          <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: COLORS.bg, borderTop: `1px solid ${COLORS.border}`, padding: "12px 16px" }}>
            <div style={{ maxWidth: 760, margin: "0 auto", display: "flex", gap: 10 }}>
              <textarea
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                placeholder="Type your response to the CFO… (Enter to send, Shift+Enter for new line)"
                style={{
                  flex: 1,
                  background: COLORS.surface,
                  border: `1px solid ${COLORS.border}`,
                  borderRadius: 10,
                  padding: "10px 14px",
                  color: COLORS.textPrimary,
                  fontSize: 14,
                  resize: "none",
                  fontFamily: "inherit",
                  outline: "none",
                  lineHeight: 1.5,
                  minHeight: 44,
                  maxHeight: 120,
                  opacity: loading ? 0.7 : 1
                }}
                rows={2}
                disabled={loading}
              />
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <button
                  onClick={sendMessage}
                  disabled={loading || !input.trim()}
                  style={{
                    background: loading || !input.trim() ? COLORS.border : COLORS.accent,
                    border: "none",
                    borderRadius: 10,
                    width: 44,
                    height: 44,
                    color: "#fff",
                    cursor: loading || !input.trim() ? "not-allowed" : "pointer",
                    fontSize: 18,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >↑</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* FEEDBACK PHASE */}
      {phase === "feedback" && (
        <div style={{ maxWidth: 760, margin: "0 auto", padding: "32px 16px 60px" }}>
          {feedbackLoading && (
            <div style={{ textAlign: "center", padding: "80px 20px" }}>
              <div style={{ fontSize: 40, marginBottom: 16 }}>🔍</div>
              <h2 style={{ color: COLORS.textPrimary, fontSize: 20, marginBottom: 8 }}>Analysing your session…</h2>
              <p style={{ color: COLORS.textSecondary, fontSize: 14 }}>Your AI sales coach is reviewing the conversation</p>
            </div>
          )}
          
          {error && !feedbackLoading && (
            <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid #ef444440", borderRadius: 8, padding: "16px", color: COLORS.danger, fontSize: 14, margin: "20px 0", textAlign: "center" }}>
               ⚠️ {error}
               <br/><br/>
               <button onClick={endSession} style={{ background: COLORS.danger, border: "none", borderRadius: 6, padding: "8px 16px", color: "#fff", cursor: "pointer", fontSize: 13, fontWeight: "bold" }}>Retry Feedback</button>
            </div>
          )}

          {feedback && !feedbackLoading && (
            <>
              {/* Overall */}
              <div style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 16, padding: 28, marginBottom: 20, display: "flex", gap: 24, alignItems: "center" }}>
                <ScoreRing score={feedback.overallScore} size={90} />
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: COLORS.textMuted, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>Session Score</div>
                  <h2 style={{ margin: "0 0 8px", fontSize: 20, color: COLORS.textPrimary }}>
                    {feedback.overallScore >= 80 ? "Strong Performance" : feedback.overallScore >= 60 ? "Solid Foundation" : "Room to Grow"}
                  </h2>
                  <p style={{ margin: 0, color: COLORS.textSecondary, fontSize: 14, lineHeight: 1.6 }}>{feedback.overallSummary}</p>
                </div>
              </div>

              {/* Strengths & Improvements */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
                <div style={{ background: `${COLORS.success}08`, border: `1px solid ${COLORS.success}25`, borderRadius: 12, padding: 20 }}>
                  <div style={{ fontWeight: 700, fontSize: 13, color: COLORS.success, marginBottom: 12 }}>✅ Top Strengths</div>
                  {feedback.topStrengths?.map((s, i) => (
                    <div key={i} style={{ color: COLORS.textSecondary, fontSize: 13, marginBottom: 8, paddingLeft: 14, position: "relative" }}>
                      <span style={{ position: "absolute", left: 0, color: COLORS.success }}>·</span>
                      {s}
                    </div>
                  ))}
                </div>
                <div style={{ background: `${COLORS.gold}08`, border: `1px solid ${COLORS.gold}25`, borderRadius: 12, padding: 20 }}>
                  <div style={{ fontWeight: 700, fontSize: 13, color: COLORS.gold, marginBottom: 12 }}>⚡ Key Improvements</div>
                  {feedback.topImprovements?.map((s, i) => (
                    <div key={i} style={{ color: COLORS.textSecondary, fontSize: 13, marginBottom: 8, paddingLeft: 14, position: "relative" }}>
                      <span style={{ position: "absolute", left: 0, color: COLORS.gold }}>·</span>
                      {s}
                    </div>
                  ))}
                </div>
              </div>

              {/* Categories */}
              <div style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 16, padding: 28, marginBottom: 20 }}>
                <h3 style={{ margin: "0 0 24px", fontSize: 15, fontWeight: 700, color: COLORS.textPrimary }}>📊 Detailed Scorecard</h3>
                {feedback.categories?.map((cat, i) => <CategoryBar key={i} cat={cat} />)}
              </div>

              {/* Next step */}
              {feedback.nextStepSuggestion && (
                <div style={{ background: `${COLORS.accent}10`, border: `1px solid ${COLORS.accent}30`, borderRadius: 12, padding: 20, marginBottom: 20 }}>
                  <div style={{ fontWeight: 700, fontSize: 13, color: COLORS.accent, marginBottom: 8 }}>🎯 Recommended Next Step for the Real Deal</div>
                  <p style={{ margin: 0, color: COLORS.textSecondary, fontSize: 14, lineHeight: 1.6 }}>{feedback.nextStepSuggestion}</p>
                </div>
              )}

              {/* Actions */}
              <div style={{ display: "flex", gap: 12 }}>
                <button onClick={() => { setMessages([]); setFeedback(null); setPhase("chat"); setError(""); }} style={{ flex: 1, background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: "14px", color: COLORS.textPrimary, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
                  🔁 Practice Again
                </button>
                <button onClick={restart} style={{ flex: 1, background: `linear-gradient(135deg, ${COLORS.accent}, ${COLORS.cfoAccent})`, border: "none", borderRadius: 12, padding: "14px", color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
                  ↩ Back to Start
                </button>
              </div>
            </>
          )}
        </div>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.3; transform: scale(0.8); }
          50% { opacity: 1; transform: scale(1.2); }
        }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #1e2d45; border-radius: 3px; }
        textarea::placeholder { color: #374151; }
      `}</style>
    </div>
  );
}