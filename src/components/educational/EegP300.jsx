import { useState, useEffect, useRef, useCallback } from "react";

// ─── Layout constants ─────────────────────────────────────────────────────────
const W = 800, H = 420;
const PL = 88, PR = 760, PT = 55, PB = 355;
const PW = PR - PL, PH = PB - PT;
const T_MIN = -100, T_MAX = 800;
const A_MIN = -9, A_MAX = 20;

const tToX = (t) => PL + ((t - T_MIN) / (T_MAX - T_MIN)) * PW;
const aToY = (a) => PB - ((a - A_MIN) / (A_MAX - A_MIN)) * PH;
const yToA = (y) => A_MIN + ((PB - y) / PH) * (A_MAX - A_MIN);

// ─── ERP component definitions ────────────────────────────────────────────────
const gauss = (t, peak, amp, sigma) =>
  amp * Math.exp(-((t - peak) ** 2) / (2 * sigma ** 2));

const COMPONENTS = [
  { name: "P1",   peak: 105, sigma: 18,  posColor: "#94a3b8" },
  { name: "N1",   peak: 145, sigma: 22,  posColor: "#94a3b8" },
  { name: "P2",   peak: 205, sigma: 28,  posColor: "#94a3b8" },
  { name: "N2",   peak: 265, sigma: 32,  posColor: "#94a3b8" },
  { name: "P300", peak: 385, sigma: 65,  posColor: "#fbbf24" },
];

const STANDARD_AMPS = [2.2, -4.0, 3.0, -2.8, 4.0];
const DEVIANT_AMPS  = [2.3, -5.2, 3.1, -5.0, 15.5];

const buildPoints = (amps, steps = 450) => {
  const pts = [];
  for (let i = 0; i <= steps; i++) {
    const t = T_MIN + (i / steps) * (T_MAX - T_MIN);
    const a = COMPONENTS.reduce((s, c, j) => s + gauss(t, c.peak, amps[j], c.sigma), 0);
    pts.push({ t, a, x: tToX(t), y: aToY(a) });
  }
  return pts;
};

const STD_PTS = buildPoints(STANDARD_AMPS);
const DEV_PTS = buildPoints(DEVIANT_AMPS);

const ptsToPath = (pts) =>
  pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(" ");

const STD_PATH = ptsToPath(STD_PTS);
const DEV_PATH = ptsToPath(DEV_PTS);

// ─── Component info cards ─────────────────────────────────────────────────────
const COMP_INFO = {
  P1: {
    latency: "80–120 ms",
    polarity: "Positive",
    generator: "Extrastriate visual cortex",
    modulation: "Attention amplitude; similar for standard & deviant",
    color: "#7dd3fc",
  },
  N1: {
    latency: "100–160 ms",
    polarity: "Negative",
    generator: "Temporal & frontal cortex",
    modulation: "Amplitude scales with attention; slightly enhanced for deviant",
    color: "#7dd3fc",
  },
  P2: {
    latency: "170–250 ms",
    polarity: "Positive",
    generator: "Frontal & parietal cortex",
    modulation: "Relatively stable across conditions",
    color: "#7dd3fc",
  },
  N2: {
    latency: "200–350 ms",
    polarity: "Negative",
    generator: "Anterior cingulate, prefrontal cortex",
    modulation: "Enhanced for rare/unexpected stimuli; mismatch detection",
    color: "#86efac",
  },
  P300: {
    latency: "250–600 ms (peak ~380 ms)",
    polarity: "Positive",
    generator: "Temporoparietal junction, hippocampus, thalamus",
    modulation: "LARGE for unexpected; small for expected. Reflects context updating & working memory",
    color: "#fbbf24",
  },
};

// ─── Grid ticks ──────────────────────────────────────────────────────────────
const TIME_TICKS = [-100, 0, 100, 200, 300, 400, 500, 600, 700, 800];
const AMP_TICKS  = [-8, -4, 0, 4, 8, 12, 16, 20];

// ─── Main component ───────────────────────────────────────────────────────────
export default function EEGApp() {
  const [show, setShow]         = useState({ std: true, dev: true });
  const [playing, setPlaying]   = useState(false);
  const [progress, setProgress] = useState(0);   // 0–1
  const [hovered, setHovered]   = useState(null); // component name
  const [info, setInfo]         = useState(null); // pinned info
  const rafRef = useRef(null);
  const startRef = useRef(null);
  const DURATION = 2800; // ms for animation

  // Animation loop
  const animate = useCallback((ts) => {
    if (!startRef.current) startRef.current = ts;
    const elapsed = ts - startRef.current;
    const p = Math.min(elapsed / DURATION, 1);
    setProgress(p);
    if (p < 1) rafRef.current = requestAnimationFrame(animate);
    else setPlaying(false);
  }, []);

  const play = () => {
    cancelAnimationFrame(rafRef.current);
    startRef.current = null;
    setProgress(0);
    setPlaying(true);
    rafRef.current = requestAnimationFrame(animate);
  };

  const reset = () => {
    cancelAnimationFrame(rafRef.current);
    setPlaying(false);
    setProgress(0);
    startRef.current = null;
  };

  useEffect(() => () => cancelAnimationFrame(rafRef.current), []);

  // Compute clip width based on progress
  const clipX = PL + progress * PW;

  // Component label positions (at peak)
  const labelPositions = COMPONENTS.map((c, i) => ({
    ...c,
    stdY: aToY(DEVIANT_AMPS[i] > 0 ? Math.max(DEVIANT_AMPS[i], STANDARD_AMPS[i]) : Math.min(DEVIANT_AMPS[i], STANDARD_AMPS[i])),
    devY: aToY(DEVIANT_AMPS[i]),
    stdA: STANDARD_AMPS[i],
    devA: DEVIANT_AMPS[i],
  }));

  return (
    <div style={{
      minHeight: "100vh",
      background: "#060d1a",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "flex-start",
      padding: "32px 16px 48px",
      fontFamily: "'DM Mono', 'Courier New', monospace",
      color: "#e2e8f0",
    }}>
      {/* Google Fonts */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:ital,wght@0,300;0,400;0,500;1,400&family=Playfair+Display:wght@400;600&display=swap');
        .trace-btn { transition: all 0.2s; border: 1px solid; border-radius: 4px; cursor: pointer; padding: 6px 16px; font-family: 'DM Mono', monospace; font-size: 12px; letter-spacing: 0.05em; }
        .trace-btn:hover { opacity: 0.85; }
        .comp-badge { cursor: pointer; transition: all 0.15s; }
        .comp-badge:hover rect { opacity: 0.25 !important; }
        a { color: #38bdf8; text-underline-offset: 3px; }
        a:hover { color: #7dd3fc; }
      `}</style>

      {/* Title */}
      <div style={{ textAlign: "center", marginBottom: 24 }}>
        <h1 style={{
          fontFamily: "'Playfair Display', Georgia, serif",
          fontSize: "clamp(22px, 4vw, 32px)",
          fontWeight: 600,
          color: "#f1f5f9",
          letterSpacing: "0.01em",
          margin: 0,
        }}>
          Parietal ERP: Expected vs. Unexpected
        </h1>
        <p style={{ fontSize: 12, color: "#64748b", margin: "6px 0 0", letterSpacing: "0.08em" }}>
          ODDBALL PARADIGM — Pz ELECTRODE — EVENT-RELATED POTENTIAL
        </p>
      </div>

      {/* Controls */}
      <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap", justifyContent: "center" }}>
        <button className="trace-btn"
          onClick={play} disabled={playing}
          style={{ background: playing ? "#1e293b" : "#0f2a44", borderColor: "#38bdf8", color: "#38bdf8" }}>
          {playing ? "▶ PLAYING…" : "▶ PLAY"}
        </button>
        <button className="trace-btn"
          onClick={reset}
          style={{ background: "#1e0a00", borderColor: "#f97316", color: "#f97316" }}>
          ↺ RESET
        </button>
        <button className="trace-btn"
          onClick={() => setShow(s => ({ ...s, std: !s.std }))}
          style={{ background: show.std ? "#0a1f1a" : "#111827", borderColor: "#22d3ee", color: show.std ? "#22d3ee" : "#475569" }}>
          {show.std ? "● STANDARD" : "○ STANDARD"}
        </button>
        <button className="trace-btn"
          onClick={() => setShow(s => ({ ...s, dev: !s.dev }))}
          style={{ background: show.dev ? "#1a0f00" : "#111827", borderColor: "#fb923c", color: show.dev ? "#fb923c" : "#475569" }}>
          {show.dev ? "● DEVIANT" : "○ DEVIANT"}
        </button>
      </div>

      {/* SVG Plot */}
      <div style={{
        background: "#080f1e",
        border: "1px solid #1e293b",
        borderRadius: 8,
        boxShadow: "0 0 40px rgba(0,0,0,0.6), inset 0 0 60px rgba(0,20,60,0.3)",
        overflow: "hidden",
        maxWidth: "100%",
      }}>
        <svg
          viewBox={`0 0 ${W} ${H}`}
          style={{ display: "block", width: "min(800px, 96vw)", height: "auto" }}
        >
          <defs>
            {/* Clip rect for animation */}
            <clipPath id="progressClip">
              <rect x={PL} y={PT - 10} width={progress * PW} height={PH + 20} />
            </clipPath>
            {/* Glow filters */}
            <filter id="glowCyan" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="2.5" result="blur" />
              <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
            <filter id="glowAmber" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="2.5" result="blur" />
              <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
          </defs>

          {/* Background grid */}
          {TIME_TICKS.map(t => (
            <line key={t}
              x1={tToX(t)} y1={PT} x2={tToX(t)} y2={PB}
              stroke={t === 0 ? "#334155" : "#111827"} strokeWidth={t === 0 ? 1.5 : 1}
            />
          ))}
          {AMP_TICKS.map(a => (
            <line key={a}
              x1={PL} y1={aToY(a)} x2={PR} y2={aToY(a)}
              stroke={a === 0 ? "#334155" : "#111827"} strokeWidth={a === 0 ? 1.5 : 1}
            />
          ))}

          {/* Axes labels */}
          {TIME_TICKS.map(t => (
            <text key={t} x={tToX(t)} y={PB + 16}
              textAnchor="middle" fill="#475569" fontSize={10} fontFamily="'DM Mono', monospace">
              {t}
            </text>
          ))}
          {AMP_TICKS.map(a => (
            <text key={a} x={PL - 10} y={aToY(a) + 4}
              textAnchor="end" fill="#475569" fontSize={10} fontFamily="'DM Mono', monospace">
              {a}
            </text>
          ))}

          {/* Axis unit labels */}
          <text x={PL + PW / 2} y={H - 8} textAnchor="middle" fill="#334155" fontSize={10} fontFamily="'DM Mono', monospace">
            TIME (ms)
          </text>
          <text x={14} y={aToY(0)} textAnchor="middle" fill="#334155" fontSize={10}
            fontFamily="'DM Mono', monospace"
            transform={`rotate(-90, 14, ${aToY(0)})`}>
            AMPLITUDE (µV)
          </text>

          {/* Stimulus onset marker */}
          <line x1={tToX(0)} y1={PT - 5} x2={tToX(0)} y2={PB + 5}
            stroke="#475569" strokeWidth={1.5} strokeDasharray="4,3" />
          <text x={tToX(0)} y={PT - 10} textAnchor="middle"
            fill="#64748b" fontSize={9} fontFamily="'DM Mono', monospace">
            STIMULUS
          </text>

          {/* STANDARD trace (full dim, then bright up to progress) */}
          {show.std && (
            <>
              {/* Dim full trace */}
              <path d={STD_PATH} fill="none" stroke="#22d3ee" strokeWidth={1}
                strokeOpacity={0.12} />
              {/* Bright animated portion */}
              <path d={STD_PATH} fill="none" stroke="#22d3ee" strokeWidth={2}
                filter="url(#glowCyan)" clipPath="url(#progressClip)" />
            </>
          )}

          {/* DEVIANT trace */}
          {show.dev && (
            <>
              <path d={DEV_PATH} fill="none" stroke="#fb923c" strokeWidth={1}
                strokeOpacity={0.12} />
              <path d={DEV_PATH} fill="none" stroke="#fb923c" strokeWidth={2}
                filter="url(#glowAmber)" clipPath="url(#progressClip)" />
            </>
          )}

          {/* Component labels — show after animation passes peak */}
          {COMPONENTS.map((c, i) => {
            const peakT = c.peak;
            const peakProgress = (peakT - T_MIN) / (T_MAX - T_MIN);
            if (progress < peakProgress + 0.03) return null;

            const cx = tToX(c.peak);
            const isP300 = c.name === "P300";
            const devA = DEVIANT_AMPS[i];
            const stdA = STANDARD_AMPS[i];
            const labelY = devA > 0
              ? aToY(devA) - (isP300 ? 22 : 14)
              : aToY(devA) + (isP300 ? 22 : 16);

            const isActive = hovered === c.name || info?.name === c.name;

            return (
              <g key={c.name} className="comp-badge"
                onClick={() => setInfo(info?.name === c.name ? null : { name: c.name, ...COMP_INFO[c.name] })}
                onMouseEnter={() => setHovered(c.name)}
                onMouseLeave={() => setHovered(null)}>
                <rect
                  x={cx - 18} y={labelY - 10}
                  width={36} height={16}
                  rx={3}
                  fill={isP300 ? "#fbbf24" : "#22d3ee"}
                  opacity={isActive ? 0.35 : 0.18}
                />
                <text x={cx} y={labelY + 2}
                  textAnchor="middle"
                  fill={isP300 ? "#fde68a" : "#7dd3fc"}
                  fontSize={isP300 ? 11 : 10}
                  fontWeight={isP300 ? "500" : "400"}
                  fontFamily="'DM Mono', monospace">
                  {c.name}
                </text>
                {/* Small tick down to trace */}
                <line
                  x1={cx} y1={labelY + 4}
                  x2={cx} y2={devA > 0 ? aToY(devA) - 3 : aToY(devA) + 3}
                  stroke={isP300 ? "#fbbf24" : "#22d3ee"}
                  strokeWidth={0.8} strokeOpacity={0.5}
                />
              </g>
            );
          })}

          {/* Progress cursor */}
          {playing && progress > 0 && progress < 1 && (
            <line
              x1={PL + progress * PW} y1={PT}
              x2={PL + progress * PW} y2={PB}
              stroke="#ffffff" strokeWidth={1} strokeOpacity={0.2}
            />
          )}

          {/* Legend */}
          {show.std && (
            <g>
              <line x1={PR - 130} y1={PT + 12} x2={PR - 108} y2={PT + 12}
                stroke="#22d3ee" strokeWidth={2} />
              <text x={PR - 104} y={PT + 16}
                fill="#7dd3fc" fontSize={10} fontFamily="'DM Mono', monospace">
                STANDARD
              </text>
            </g>
          )}
          {show.dev && (
            <g>
              <line x1={PR - 130} y1={PT + 28} x2={PR - 108} y2={PT + 28}
                stroke="#fb923c" strokeWidth={2} />
              <text x={PR - 104} y={PT + 32}
                fill="#fdba74" fontSize={10} fontFamily="'DM Mono', monospace">
                DEVIANT
              </text>
            </g>
          )}

          {/* Border */}
          <rect x={PL} y={PT} width={PW} height={PH}
            fill="none" stroke="#1e293b" strokeWidth={1} />
        </svg>
      </div>

      {/* Info card */}
      {info && (
        <div style={{
          marginTop: 20,
          background: "#0d1b2e",
          border: `1px solid ${info.color}44`,
          borderRadius: 8,
          padding: "16px 22px",
          maxWidth: 540,
          width: "100%",
          boxShadow: `0 0 24px ${info.color}22`,
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <span style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: 20,
              color: info.color,
              fontWeight: 600,
            }}>{info.name}</span>
            <button onClick={() => setInfo(null)}
              style={{ background: "none", border: "none", color: "#475569", cursor: "pointer", fontSize: 16 }}>✕</button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "6px 14px", fontSize: 12, lineHeight: 1.6 }}>
            <span style={{ color: "#475569" }}>LATENCY</span>
            <span style={{ color: "#e2e8f0" }}>{info.latency}</span>
            <span style={{ color: "#475569" }}>POLARITY</span>
            <span style={{ color: "#e2e8f0" }}>{info.polarity}</span>
            <span style={{ color: "#475569" }}>GENERATOR</span>
            <span style={{ color: "#e2e8f0" }}>{info.generator}</span>
            <span style={{ color: "#475569" }}>MODULATION</span>
            <span style={{ color: "#e2e8f0" }}>{info.modulation}</span>
          </div>
        </div>
      )}

      {/* Description */}
      <div style={{
        marginTop: 22, maxWidth: 620, fontSize: 12, color: "#64748b",
        lineHeight: 1.8, textAlign: "center",
      }}>
        <p style={{ margin: "0 0 8px" }}>
          In the <strong style={{ color: "#94a3b8" }}>oddball paradigm</strong>, rare deviant stimuli
          (~20%) are interspersed among frequent standard stimuli (~80%). The parietal P300 (P3b)
          is dramatically larger for unexpected targets — a hallmark of <em>context updating</em> in working memory.
        </p>
        <p style={{ margin: 0 }}>
          Click any component label to explore its properties.{" "}
          References:{" "}
          <a href="https://doi.org/10.1126/science.150.3700.1187" target="_blank" rel="noopener">
            Sutton et al. (1965)
          </a>{" · "}
          <a href="https://doi.org/10.1016/j.clinph.2007.04.019" target="_blank" rel="noopener">
            Polich (2007)
          </a>{" · "}
          <a href="https://www.ncbi.nlm.nih.gov/books/NBK539805/" target="_blank" rel="noopener">
            ERP primer (NCBI)
          </a>
        </p>
      </div>
    </div>
  );
}
