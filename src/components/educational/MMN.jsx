import { useState, useEffect, useRef, useCallback } from "react";

// ─── Layout constants ─────────────────────────────────────────────────────────
const W = 870, H = 490;
const PL = 88, PR = 688, PT = 58, PB = 378;
const PW = PR - PL, PH = PB - PT;
const T_MIN = -100, T_MAX = 600;
const A_MIN = -11, A_MAX = 11;
const STEPS = 500;

const tToX = (t) => PL + ((t - T_MIN) / (T_MAX - T_MIN)) * PW;
const aToY = (a) => PB - ((a - A_MIN) / (A_MAX - A_MIN)) * PH;

// Scalp topo panel center
const SCX = 792, SCY = 218, SCR = 54;

// ─── Gaussian waveform model ──────────────────────────────────────────────────
const gauss = (t, pk, amp, sig) =>
  amp * Math.exp(-((t - pk) ** 2) / (2 * sig ** 2));

const buildPts = (comps) => {
  const pts = [];
  for (let i = 0; i <= STEPS; i++) {
    const t = T_MIN + (i / STEPS) * (T_MAX - T_MIN);
    const a = comps.reduce((s, c) => s + gauss(t, c.pk, c.amp, c.sig), 0);
    pts.push({ t, a, x: tToX(t), y: aToY(a) });
  }
  return pts;
};

const toPath = (pts) =>
  pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(" ");

// ─── Standard waveform  (Fz reference — P1, N1, P2) ──────────────────────────
const STD_COMPS = [
  { pk:  55, amp:  1.5, sig: 14 },
  { pk: 100, amp: -5.5, sig: 20 },
  { pk: 180, amp:  3.0, sig: 25 },
];
const STD_PTS  = buildPts(STD_COMPS);
const STD_PATH = toPath(STD_PTS);

// ─── Deviant variants  (comp order: P1, N1, MMN, P2, P3a) ────────────────────
const VARIANTS = {
  freq: {
    label: "Frequency",
    comps: [
      { pk:  55, amp:  1.5, sig: 14 },
      { pk: 100, amp: -6.0, sig: 20 },
      { pk: 178, amp: -4.2, sig: 30 },
      { pk: 200, amp:  3.0, sig: 25 },
      { pk: 268, amp:  4.5, sig: 40 },
    ],
    n1Peak: 100, mmnPeak: 178, p3aPeak: 268,
  },
  dur: {
    label: "Duration",
    comps: [
      { pk:  55, amp:  1.5, sig: 14 },
      { pk: 105, amp: -5.8, sig: 20 },
      { pk: 188, amp: -3.0, sig: 35 },
      { pk: 205, amp:  3.0, sig: 25 },
      { pk: 278, amp:  3.5, sig: 40 },
    ],
    n1Peak: 105, mmnPeak: 188, p3aPeak: 278,
  },
  int: {
    label: "Intensity",
    comps: [
      { pk:  55, amp:  1.5, sig: 14 },
      { pk:  95, amp: -6.5, sig: 20 },
      { pk: 156, amp: -2.8, sig: 27 },
      { pk: 190, amp:  3.0, sig: 25 },
      { pk: 262, amp:  3.2, sig: 40 },
    ],
    n1Peak: 95, mmnPeak: 156, p3aPeak: 262,
  },
};

// Pre-compute all 6 combinations (3 variants × attended/unattended)
// Attention modulates only P3a (index 4); MMN is fully preserved pre-attentively
const ALL = {};
["freq", "dur", "int"].forEach(v => {
  [true, false].forEach(att => {
    const comps = VARIANTS[v].comps.map((c, i) =>
      i === 4 ? { ...c, amp: att ? c.amp : c.amp * 0.15 } : c
    );
    const devPts  = buildPts(comps);
    const diffPts = devPts.map((p, j) => ({
      t: p.t, a: p.a - STD_PTS[j].a,
      x: p.x, y: aToY(p.a - STD_PTS[j].a),
    }));
    ALL[`${v}:${att}`] = {
      devPts, diffPts,
      devPath:  toPath(devPts),
      diffPath: toPath(diffPts),
    };
  });
});

// ─── Scalp electrode layout ───────────────────────────────────────────────────
const ELEC = [
  { id: "Fz",  nx:  0.00, ny: -0.75, labeled: true  },
  { id: "FCz", nx:  0.00, ny: -0.35, labeled: true  },
  { id: "Cz",  nx:  0.00, ny:  0.05, labeled: true  },
  { id: "Pz",  nx:  0.00, ny:  0.55, labeled: true  },
  { id: "F3",  nx: -0.52, ny: -0.55, labeled: false },
  { id: "F4",  nx:  0.52, ny: -0.55, labeled: false },
  { id: "C3",  nx: -0.62, ny:  0.05, labeled: false },
  { id: "C4",  nx:  0.62, ny:  0.05, labeled: false },
];

// Normalized amplitudes in [-1, +1] per topo state
const TOPO = {
  mmn: { Fz: -1.0, FCz: -0.9, Cz: -0.5, Pz:  0.1, F3: -0.6, F4: -0.6, C3: -0.3, C4: -0.3 },
  p3a: { Fz:  1.0, FCz:  0.9, Cz:  0.5, Pz:  0.2, F3:  0.6, F4:  0.6, C3:  0.3, C4:  0.3 },
  n1:  { Fz: -0.2, FCz: -0.4, Cz: -0.7, Pz: -0.5, F3: -0.5, F4: -0.5, C3: -0.9, C4: -0.9 },
};

// Blue (-1) → gray (0) → red (+1)
const topoColor = (a) => {
  if (a <= 0) {
    const t = a + 1;
    return `rgb(${Math.round(29 + 71 * t)},${Math.round(78 + 38 * t)},${Math.round(216 - 77 * t)})`;
  }
  return `rgb(${Math.round(100 + 120 * a)},${Math.round(116 - 78 * a)},${Math.round(139 - 101 * a)})`;
};

// ─── Info card content ────────────────────────────────────────────────────────
const INFO = {
  MMN: {
    full:      "Mismatch Negativity",
    color:     "#c084fc",
    latency:   "100–250 ms (peak ~150–200 ms post-deviant)",
    polarity:  "Negative — fronto-central maximum (Fz/FCz)",
    generator: "Superior temporal plane (bilateral auditory cortex); right-hemisphere dominant",
    body:      "The MMN is a fronto-central negative deflection elicited by any physically deviant sound embedded in a train of repetitive standards. Crucially, it arises pre-attentively: the MMN is fully preserved when subjects attend elsewhere (e.g., watching a silent film), demonstrating that auditory cortex evaluates regularities and detects violations automatically. Amplitude and latency vary with the magnitude and type of deviance — frequency, duration, intensity, spatial location, or abstract rule violations. The MMN is widely used as a clinical index of auditory sensory memory and cortical plasticity.",
    refs: [
      { text: "Näätänen et al. (1978)", url: "https://doi.org/10.1016/0001-6918(78)90006-9" },
      { text: "Näätänen et al. (2007)", url: "https://doi.org/10.1016/j.clinph.2007.04.026" },
    ],
  },
  N1: {
    full:      "Auditory N1 (N100)",
    color:     "#22d3ee",
    latency:   "80–130 ms (varies by deviant type)",
    polarity:  "Negative — central maximum; bilateral temporal distribution",
    generator: "Primary auditory cortex (Heschl's gyrus); planum temporale",
    body:      "The auditory N1 is an obligatory negative component reflecting initial cortical encoding of acoustic features. For deviant stimuli the N1 is typically enhanced relative to the standard, partly because the standard N1 is reduced by refractoriness in neurons tuned to its specific properties. For frequency and intensity deviants this N1 enhancement contributes to the early portion of the MMN visible in the difference wave. The N1 is preserved across attended and unattended conditions — compare it with the strongly attention-dependent P3a.",
    refs: [
      { text: "Hillyard et al. (1973)", url: "https://doi.org/10.1126/science.182.4108.177" },
      { text: "Näätänen & Picton (1987)", url: "https://doi.org/10.1111/j.1469-8986.1987.tb00311.x" },
    ],
  },
  P3a: {
    full:      "P3a (Frontal P300 / Novelty P300)",
    color:     "#fb923c",
    latency:   "220–360 ms (peak ~250–300 ms, later than MMN)",
    polarity:  "Positive — fronto-central maximum",
    generator: "Prefrontal and dorsal frontal cortex; dorsal attention network; superior temporal gyrus",
    body:      "The P3a is elicited by task-irrelevant novel or deviant sounds and reflects automatic attentional capture: the auditory system flags the deviance, driving an involuntary orienting response. Toggle to Unattended to see the P3a strongly attenuated while the MMN persists intact. This dissociation is the central empirical demonstration that MMN and P3a reflect distinct processing stages: automatic deviance detection (MMN, pre-attentive) followed by attention-dependent orienting (P3a). The P3a is distinct from the parietal P3b (P300) of the classic target-detection paradigm.",
    refs: [
      { text: "Escera et al. (1998)", url: "https://doi.org/10.1162/089892998562997" },
      { text: "Polich (2007)", url: "https://doi.org/10.1016/j.clinph.2007.04.019" },
    ],
  },
  DIFF: {
    full:      "Difference Wave (Deviant minus Standard)",
    color:     "#c084fc",
    latency:   "Spans full epoch; negative peak = MMN; positive peak = P3a",
    polarity:  "Biphasic: negative (MMN) then positive (P3a, if attended)",
    generator: "Deviance-specific activity only; shared components cancel by subtraction",
    body:      "The difference wave is computed by subtracting the standard ERP from the deviant ERP at every time point. This cancels activity common to both conditions (P1, N1, P2), leaving only the neural response specific to deviance detection. The negative peak is the canonical MMN; the subsequent positive deflection is the P3a. Toggle attention states and watch the second peak disappear while the first remains. Difference-wave analysis is a foundational method in MMN research and across ERP cognitive neuroscience more broadly.",
    refs: [
      { text: "Näätänen et al. (1978)", url: "https://doi.org/10.1016/0001-6918(78)90006-9" },
      { text: "Luck (2014) — Introduction to the ERP Technique", url: "https://mitpress.mit.edu/9780262525855/" },
    ],
  },
  PRED: {
    full:      "Predictive Coding and the MMN",
    color:     "#4ade80",
    latency:   "Prediction-error signal: ~100–250 ms post-stimulus",
    polarity:  "Fronto-central negative (same scalp distribution as MMN)",
    generator: "Hierarchical auditory cortex; prefrontal modulation of prediction-error signaling",
    body:      "Predictive coding (Friston, 2005) offers a principled account of MMN: the brain maintains an internal generative model of environmental regularities. When a deviant violates this model, the prediction error propagates up the auditory cortical hierarchy as the MMN. The standard's suppressed response reflects fulfilled expectation. This framework links the MMN directly to STDP: repeated stimulation drives synaptic depression in auditory cortex via Hebbian-like timing-dependent plasticity, progressively suppressing the standard response and building the 'expectation' that the deviant then violates. MMN may thus be the electrophysiological signature of prediction-error signals shaped by STDP-like adaptation — the same learning rule modeled in the companion STDP visualization.",
    refs: [
      { text: "Friston (2005)", url: "https://doi.org/10.1098/rstb.2005.1622" },
      { text: "Garrido et al. (2009)", url: "https://doi.org/10.1016/j.clinph.2008.11.029" },
    ],
  },
};

const TIME_TICKS = [-100, 0, 100, 200, 300, 400, 500, 600];
const AMP_TICKS  = [-10, -5, 0, 5, 10];

// ─── Main component ───────────────────────────────────────────────────────────
export default function MMNApp() {
  const [show, setShow]         = useState({ std: true, dev: true, diff: true });
  const [playing, setPlaying]   = useState(false);
  const [progress, setProgress] = useState(0);
  const [variant, setVariant]   = useState("freq");
  const [attended, setAttended] = useState(true);
  const [info, setInfo]         = useState(null);
  const [hovered, setHovered]   = useState(null);

  const rafRef   = useRef(null);
  const startRef = useRef(null);
  const DURATION = 2800;

  const animate = useCallback((ts) => {
    if (!startRef.current) startRef.current = ts;
    const p = Math.min((ts - startRef.current) / DURATION, 1);
    setProgress(p);
    if (p < 1) rafRef.current = requestAnimationFrame(animate);
    else setPlaying(false);
  }, []);

  const reset = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    setPlaying(false);
    setProgress(0);
    startRef.current = null;
  }, []);

  const play = () => {
    cancelAnimationFrame(rafRef.current);
    startRef.current = null;
    setProgress(0);
    setPlaying(true);
    rafRef.current = requestAnimationFrame(animate);
  };

  useEffect(() => () => cancelAnimationFrame(rafRef.current), []);
  useEffect(() => { reset(); }, [variant, attended, reset]);

  const waveKey = `${variant}:${attended}`;
  const { devPts, diffPts, devPath, diffPath } = ALL[waveKey];
  const vDef = VARIANTS[variant];

  const tFrac    = (t) => (t - T_MIN) / (T_MAX - T_MIN);
  const showN1   = progress > tFrac(vDef.n1Peak)  + 0.05;
  const showMMN  = progress > tFrac(vDef.mmnPeak) + 0.05;
  const showP3a  = attended && progress > tFrac(vDef.p3aPeak) + 0.05;
  const showPRED = progress > 0.82;

  const getPtY = (pts, t) =>
    pts[Math.min(Math.round(tFrac(t) * STEPS), STEPS)]?.y ?? aToY(0);

  // Scalp topo switches with open info card
  const topoState = info === "P3a" ? "p3a" : info === "N1" ? "n1" : "mmn";

  // Badge helper — renders inline (not a component) to avoid remount issues
  const badge = (name, cx, cy, color, label, above) => {
    const active = hovered === name || info === name;
    const by = above ? cy - 18 : cy + 18;
    return (
      <g key={name} style={{ cursor: "pointer" }}
        onClick={() => setInfo(info === name ? null : name)}
        onMouseEnter={() => setHovered(name)}
        onMouseLeave={() => setHovered(null)}>
        <rect x={cx - 18} y={by - 10} width={36} height={16} rx={3}
          fill={color} opacity={active ? 0.35 : 0.18}
          stroke={color} strokeWidth={0.6} strokeOpacity={0.65} />
        <text x={cx} y={by + 2} textAnchor="middle" fill={color}
          fontSize={10} fontWeight={500} fontFamily="'DM Mono',monospace">
          {label}
        </text>
        <line x1={cx} y1={above ? by + 6 : by - 10}
          x2={cx} y2={above ? cy - 3 : cy + 3}
          stroke={color} strokeWidth={0.8} strokeOpacity={0.5} />
      </g>
    );
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "#060d1a",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "flex-start",
      padding: "32px 16px 48px",
      fontFamily: "'DM Mono','Courier New',monospace",
      color: "#e2e8f0",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:ital,wght@0,300;0,400;0,500;1,400&family=Playfair+Display:wght@400;600&display=swap');
        .mmn-btn { transition: all 0.2s; border: 1px solid; border-radius: 4px; cursor: pointer;
          padding: 6px 14px; font-family: 'DM Mono',monospace; font-size: 12px; letter-spacing: 0.05em; }
        .mmn-btn:hover { opacity: 0.85; }
        .mmn-btn:disabled { opacity: 0.5; cursor: default; }
        a { color: #38bdf8; text-underline-offset: 3px; }
        a:hover { color: #7dd3fc; }
      `}</style>

      {/* Title */}
      <div style={{ textAlign: "center", marginBottom: 20 }}>
        <h1 style={{
          fontFamily: "'Playfair Display',Georgia,serif",
          fontSize: "clamp(20px,4vw,30px)",
          fontWeight: 600, color: "#f1f5f9",
          letterSpacing: "0.01em", margin: 0,
        }}>
          Mismatch Negativity: Pre-attentive Auditory Deviance Detection
        </h1>
        <p style={{ fontSize: 11.5, color: "#64748b", margin: "5px 0 0", letterSpacing: "0.08em" }}>
          FRONTAL ERP · Fz ELECTRODE · AUDITORY ODDBALL PARADIGM
        </p>
      </div>

      {/* Controls — row 1 */}
      <div style={{ display: "flex", gap: 8, marginBottom: 8, flexWrap: "wrap", justifyContent: "center" }}>
        <button className="mmn-btn" onClick={play} disabled={playing}
          style={{ background: playing ? "#1e293b" : "#0f2a44", borderColor: "#38bdf8", color: "#38bdf8" }}>
          {playing ? "▶ PLAYING…" : "▶ PLAY"}
        </button>
        <button className="mmn-btn" onClick={reset}
          style={{ background: "#1e0a00", borderColor: "#f97316", color: "#f97316" }}>
          ↺ RESET
        </button>
        {[
          ["STANDARD",   "std",  "#22d3ee", "#7dd3fc", "#0a1f1a"],
          ["DEVIANT",    "dev",  "#fb923c", "#fdba74", "#1a0f00"],
          ["DIFFERENCE", "diff", "#c084fc", "#e9d5ff", "#130a1e"],
        ].map(([label, k, bc, c, bg]) => (
          <button key={k} className="mmn-btn"
            onClick={() => setShow(s => ({ ...s, [k]: !s[k] }))}
            style={{ background: show[k] ? bg : "#111827", borderColor: bc, color: show[k] ? c : "#475569" }}>
            {show[k] ? "●" : "○"} {label}
          </button>
        ))}
      </div>

      {/* Controls — row 2 */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap", justifyContent: "center", alignItems: "center" }}>
        <span style={{ fontSize: 11, color: "#475569", letterSpacing: ".06em" }}>DEVIANT:</span>
        {Object.entries(VARIANTS).map(([k, v]) => (
          <button key={k} className="mmn-btn"
            onClick={() => setVariant(k)}
            style={{
              background: variant === k ? "#1a0f00" : "#0d1117",
              borderColor: variant === k ? "#fb923c" : "#1e293b",
              color: variant === k ? "#fb923c" : "#475569",
              padding: "4px 12px",
            }}>
            {v.label}
          </button>
        ))}
        <span style={{ fontSize: 11, color: "#334155", margin: "0 2px" }}>|</span>
        <span style={{ fontSize: 11, color: "#475569", letterSpacing: ".06em" }}>ATTENTION:</span>
        {[true, false].map(a => (
          <button key={String(a)} className="mmn-btn"
            onClick={() => setAttended(a)}
            style={{
              background: attended === a ? (a ? "#0a1a0a" : "#111827") : "#0d1117",
              borderColor: attended === a ? (a ? "#4ade80" : "#64748b") : "#1e293b",
              color: attended === a ? (a ? "#4ade80" : "#94a3b8") : "#475569",
              padding: "4px 12px",
            }}>
            {a ? "Attended" : "Unattended"}
          </button>
        ))}
      </div>

      {/* SVG canvas */}
      <div style={{
        background: "#080f1e", border: "1px solid #1e293b",
        borderRadius: 8, overflowX: "auto", maxWidth: "100%",
      }}>
        <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
          <defs>
            <filter id="glowCyan" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="2.5" result="b"/>
              <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
            <filter id="glowAmber" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="2.5" result="b"/>
              <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
            <filter id="glowViolet" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="2.0" result="b"/>
              <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
            <clipPath id="progressClip">
              <rect x={PL} y={PT - 4} width={Math.max(0, progress * PW)} height={PH + 8} />
            </clipPath>
            <linearGradient id="topoGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%"   stopColor="rgb(29,78,216)" />
              <stop offset="50%"  stopColor="rgb(100,116,139)" />
              <stop offset="100%" stopColor="rgb(220,38,38)" />
            </linearGradient>
          </defs>

          {/* Grid */}
          {TIME_TICKS.map(t => (
            <line key={t} x1={tToX(t)} y1={PT} x2={tToX(t)} y2={PB}
              stroke={t === 0 ? "#334155" : "#111827"} strokeWidth={t === 0 ? 1.5 : 1} />
          ))}
          {AMP_TICKS.map(a => (
            <line key={a} x1={PL} y1={aToY(a)} x2={PR} y2={aToY(a)}
              stroke={a === 0 ? "#334155" : "#111827"} strokeWidth={a === 0 ? 1.5 : 1} />
          ))}

          {/* Axis labels */}
          {TIME_TICKS.map(t => (
            <text key={t} x={tToX(t)} y={PB + 16}
              textAnchor="middle" fill="#475569" fontSize={10} fontFamily="'DM Mono',monospace">
              {t}
            </text>
          ))}
          {AMP_TICKS.map(a => (
            <text key={a} x={PL - 10} y={aToY(a) + 4}
              textAnchor="end" fill="#475569" fontSize={10} fontFamily="'DM Mono',monospace">
              {a}
            </text>
          ))}
          <text x={PL + PW / 2} y={H - 14} textAnchor="middle"
            fill="#334155" fontSize={10} fontFamily="'DM Mono',monospace">
            TIME (ms)
          </text>
          <text x={14} y={aToY(0)} textAnchor="middle" fill="#334155" fontSize={10}
            fontFamily="'DM Mono',monospace" transform={`rotate(-90,14,${aToY(0)})`}>
            AMPLITUDE (µV)
          </text>

          {/* Stimulus onset marker */}
          <line x1={tToX(0)} y1={PT - 5} x2={tToX(0)} y2={PB + 5}
            stroke="#475569" strokeWidth={1.5} strokeDasharray="4,3" />
          <text x={tToX(0)} y={PT - 10} textAnchor="middle"
            fill="#64748b" fontSize={9} fontFamily="'DM Mono',monospace">
            STIMULUS
          </text>

          {/* ── ERP traces ── */}
          {show.std && <>
            <path d={STD_PATH} fill="none" stroke="#22d3ee" strokeWidth={1} strokeOpacity={0.12} />
            <path d={STD_PATH} fill="none" stroke="#22d3ee" strokeWidth={2}
              filter="url(#glowCyan)" clipPath="url(#progressClip)" />
          </>}
          {show.dev && <>
            <path d={devPath} fill="none" stroke="#fb923c" strokeWidth={1} strokeOpacity={0.12} />
            <path d={devPath} fill="none" stroke="#fb923c" strokeWidth={2}
              filter="url(#glowAmber)" clipPath="url(#progressClip)" />
          </>}
          {show.diff && <>
            <path d={diffPath} fill="none" stroke="#c084fc" strokeWidth={1}
              strokeOpacity={0.12} strokeDasharray="5,3" />
            <path d={diffPath} fill="none" stroke="#c084fc" strokeWidth={1.8}
              strokeDasharray="5,3" filter="url(#glowViolet)" clipPath="url(#progressClip)" />
          </>}

          {/* ── Component badges ── */}
          {show.dev  && showN1  && badge("N1",  tToX(vDef.n1Peak),  getPtY(devPts,  vDef.n1Peak),  "#22d3ee", "N1",  false)}
          {show.diff && showMMN  && badge("MMN", tToX(vDef.mmnPeak), getPtY(diffPts, vDef.mmnPeak), "#c084fc", "MMN", false)}
          {show.dev  && showP3a  && badge("P3a", tToX(vDef.p3aPeak), getPtY(devPts,  vDef.p3aPeak), "#fb923c", "P3a", true)}

          {/* PREDICT badge — fixed upper-right, appears late in animation */}
          {showPRED && (
            <g style={{ cursor: "pointer" }}
              onClick={() => setInfo(info === "PRED" ? null : "PRED")}
              onMouseEnter={() => setHovered("PRED")}
              onMouseLeave={() => setHovered(null)}>
              <rect x={PR - 58} y={PT + 4} width={52} height={16} rx={3}
                fill="#4ade80"
                opacity={(hovered === "PRED" || info === "PRED") ? 0.35 : 0.18}
                stroke="#4ade80" strokeWidth={0.6} strokeOpacity={0.65} />
              <text x={PR - 32} y={PT + 16} textAnchor="middle" fill="#4ade80"
                fontSize={10} fontWeight={500} fontFamily="'DM Mono',monospace">
                PREDICT
              </text>
            </g>
          )}

          {/* Progress cursor */}
          {playing && progress > 0 && progress < 1 && (
            <line x1={PL + progress * PW} y1={PT} x2={PL + progress * PW} y2={PB}
              stroke="#ffffff" strokeWidth={1} strokeOpacity={0.15} />
          )}

          {/* Legend — upper-left of plot */}
          {(() => {
            const lx = PL + 8, ly0 = PT + 14, rH = 16;
            let row = 0;
            const els = [];
            if (show.std) {
              els.push(<g key="ls">
                <line x1={lx} y1={ly0 + row * rH} x2={lx + 20} y2={ly0 + row * rH}
                  stroke="#22d3ee" strokeWidth={2} />
                <text x={lx + 25} y={ly0 + row * rH + 4} fill="#7dd3fc"
                  fontSize={10} fontFamily="'DM Mono',monospace">STANDARD</text>
              </g>);
              row++;
            }
            if (show.dev) {
              els.push(<g key="ld">
                <line x1={lx} y1={ly0 + row * rH} x2={lx + 20} y2={ly0 + row * rH}
                  stroke="#fb923c" strokeWidth={2} />
                <text x={lx + 25} y={ly0 + row * rH + 4} fill="#fdba74"
                  fontSize={10} fontFamily="'DM Mono',monospace">
                  DEVIANT ({vDef.label})
                </text>
              </g>);
              row++;
            }
            if (show.diff) {
              const active = info === "DIFF";
              els.push(
                <g key="lf" style={{ cursor: "pointer" }}
                  onClick={() => setInfo(info === "DIFF" ? null : "DIFF")}
                  onMouseEnter={() => setHovered("DIFF_LG")}
                  onMouseLeave={() => setHovered(null)}>
                  <line x1={lx} y1={ly0 + row * rH} x2={lx + 20} y2={ly0 + row * rH}
                    stroke="#c084fc" strokeWidth={1.8} strokeDasharray="5,3" />
                  <text x={lx + 25} y={ly0 + row * rH + 4}
                    fill={active ? "#e9d5ff" : "#a855f7"}
                    fontSize={10} fontFamily="'DM Mono',monospace">
                    DIFFERENCE ℹ
                  </text>
                </g>
              );
            }
            return els;
          })()}

          {/* Plot border */}
          <rect x={PL} y={PT} width={PW} height={PH}
            fill="none" stroke="#1e293b" strokeWidth={1} />

          {/* ═══════════ SCALP TOPO PANEL ════════════════════════════════ */}
          <text x={SCX} y={PT + 6} textAnchor="middle"
            fill="#334155" fontSize={8.5} fontFamily="'DM Mono',monospace" letterSpacing=".06em">
            SCALP TOPOGRAPHY
          </text>
          <text x={SCX} y={PT + 18} textAnchor="middle"
            fill={topoState === "p3a" ? "#fb923c" : topoState === "n1" ? "#22d3ee" : "#c084fc"}
            fontSize={8} fontFamily="'DM Mono',monospace" letterSpacing=".04em">
            {topoState === "p3a" ? "P3a distribution" : topoState === "n1" ? "N1 distribution" : "MMN distribution"}
          </text>

          {/* Head outline */}
          <circle cx={SCX} cy={SCY} r={SCR}
            fill="#090f1e" stroke="#1e293b" strokeWidth={1.2} />
          {/* Nose */}
          <path d={`M ${SCX - 6} ${SCY - SCR + 2} L ${SCX} ${SCY - SCR - 9} L ${SCX + 6} ${SCY - SCR + 2}`}
            fill="none" stroke="#1e293b" strokeWidth={1.2} />
          {/* Ears */}
          <path d={`M ${SCX - SCR} ${SCY - 7} Q ${SCX - SCR - 7} ${SCY} ${SCX - SCR} ${SCY + 7}`}
            fill="none" stroke="#1e293b" strokeWidth={1.2} />
          <path d={`M ${SCX + SCR} ${SCY - 7} Q ${SCX + SCR + 7} ${SCY} ${SCX + SCR} ${SCY + 7}`}
            fill="none" stroke="#1e293b" strokeWidth={1.2} />

          {/* Electrodes */}
          {ELEC.map(e => {
            const ex = SCX + e.nx * SCR;
            const ey = SCY + e.ny * SCR;
            const col = topoColor(TOPO[topoState][e.id] ?? 0);
            return (
              <g key={e.id}>
                <circle cx={ex} cy={ey} r={e.labeled ? 5.5 : 4.5}
                  fill={col} stroke="#0d1b2e" strokeWidth={0.8} opacity={0.92} />
                {e.labeled && (
                  <text x={ex + 8} y={ey + 3.5} fill="#64748b"
                    fontSize={8} fontFamily="'DM Mono',monospace">
                    {e.id}
                  </text>
                )}
              </g>
            );
          })}

          {/* Color scale bar */}
          {(() => {
            const bx = SCX - 40, by = SCY + SCR + 14, bw = 80, bh = 7;
            return (
              <g>
                <rect x={bx} y={by} width={bw} height={bh} rx={2}
                  fill="url(#topoGrad)" opacity={0.82} />
                <text x={bx}        y={by + bh + 10} textAnchor="start"
                  fill="#334155" fontSize={8} fontFamily="'DM Mono',monospace">−</text>
                <text x={bx + bw/2} y={by + bh + 10} textAnchor="middle"
                  fill="#334155" fontSize={8} fontFamily="'DM Mono',monospace">0</text>
                <text x={bx + bw}   y={by + bh + 10} textAnchor="end"
                  fill="#334155" fontSize={8} fontFamily="'DM Mono',monospace">+</text>
              </g>
            );
          })()}

          {/* State indicators */}
          <text x={SCX} y={SCY + SCR + 36} textAnchor="middle"
            fill={attended ? "#4ade80" : "#475569"}
            fontSize={8.5} fontFamily="'DM Mono',monospace" letterSpacing=".06em">
            {attended ? "ATTENDED" : "UNATTENDED"}
          </text>
          <text x={SCX} y={SCY + SCR + 48} textAnchor="middle"
            fill="#fb923c" fontSize={8.5} fontFamily="'DM Mono',monospace" letterSpacing=".06em">
            {vDef.label.toUpperCase()} DEVIANT
          </text>
        </svg>
      </div>

      {/* Info card */}
      {info && INFO[info] && (() => {
        const c = INFO[info];
        return (
          <div style={{
            marginTop: 18, background: "#0d1b2e",
            border: `1px solid ${c.color}44`, borderRadius: 8,
            padding: "16px 22px", maxWidth: 600, width: "100%",
            boxShadow: `0 0 24px ${c.color}22`,
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
              <span style={{
                fontFamily: "'Playfair Display',serif",
                fontSize: 19, color: c.color, fontWeight: 600,
              }}>{c.full}</span>
              <button onClick={() => setInfo(null)}
                style={{ background: "none", border: "none", color: "#475569", cursor: "pointer", fontSize: 16 }}>
                ✕
              </button>
            </div>
            <p style={{ fontSize: 12.5, lineHeight: 1.75, color: "#cbd5e1", margin: "0 0 10px" }}>
              {c.body}
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "4px 12px", fontSize: 12, marginBottom: 10 }}>
              <span style={{ color: "#475569" }}>LATENCY</span>
              <span style={{ color: "#e2e8f0" }}>{c.latency}</span>
              <span style={{ color: "#475569" }}>POLARITY</span>
              <span style={{ color: "#e2e8f0" }}>{c.polarity}</span>
              <span style={{ color: "#475569" }}>GENERATOR</span>
              <span style={{ color: "#e2e8f0" }}>{c.generator}</span>
            </div>
            <div style={{ fontSize: 11, color: "#64748b", letterSpacing: ".04em" }}>
              REFS:{" "}
              {c.refs.map((r, i) => (
                <span key={i}>{i > 0 ? " · " : ""}
                  <a href={r.url} target="_blank" rel="noopener">{r.text}</a>
                </span>
              ))}
            </div>
          </div>
        );
      })()}

      {/* Description */}
      <div style={{
        marginTop: 22, maxWidth: 660, fontSize: 12, color: "#64748b",
        lineHeight: 1.8, textAlign: "center",
      }}>
        <p style={{ margin: "0 0 8px" }}>
          The MMN is elicited <em>pre-attentively</em> by any sound violating an established auditory
          regularity. Toggle between <strong style={{ color: "#94a3b8" }}>Attended</strong> and{" "}
          <strong style={{ color: "#94a3b8" }}>Unattended</strong> to see the P3a vanish while the MMN
          persists intact. The <strong style={{ color: "#c084fc" }}>difference wave</strong> (Deviant
          minus Standard) isolates the mismatch response from shared obligatory components. Click any
          badge or the ℹ legend entry to explore components. The scalp topography updates when you open
          each card.
        </p>
        <p style={{ margin: 0 }}>
          References:{" "}
          <a href="https://doi.org/10.1016/0001-6918(78)90006-9" target="_blank" rel="noopener">
            Näätänen et al. (1978)
          </a>{" · "}
          <a href="https://doi.org/10.1016/j.clinph.2007.04.026" target="_blank" rel="noopener">
            Näätänen et al. (2007)
          </a>{" · "}
          <a href="https://doi.org/10.1016/j.clinph.2008.11.029" target="_blank" rel="noopener">
            Garrido et al. (2009)
          </a>{" · "}
          <a href="https://doi.org/10.1098/rstb.2005.1622" target="_blank" rel="noopener">
            Friston (2005)
          </a>
        </p>
      </div>
    </div>
  );
}
