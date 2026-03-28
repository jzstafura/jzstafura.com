import { useState, useEffect, useRef, useCallback } from "react";

// ─── Layout constants ─────────────────────────────────────────────────────────
const W = 840, H = 440;
const PL = 88, PR = 800, PT = 60, PB = 370;
const PW = PR - PL, PH = PB - PT;
const T_MIN = -200, T_MAX = 1000;
const A_MIN = -11, A_MAX = 14;

const tToX = (t) => PL + ((t - T_MIN) / (T_MAX - T_MIN)) * PW;
const aToY = (a) => PB - ((a - A_MIN) / (A_MAX - A_MIN)) * PH;

// ─── Waveform model ───────────────────────────────────────────────────────────
const gauss = (t, peak, amp, sigma) =>
  amp * Math.exp(-((t - peak) ** 2) / (2 * sigma ** 2));

const COMPS = [
  { name: "N1",   peak: 150, sigma: 22 },
  { name: "P2",   peak: 225, sigma: 28 },
  { name: "N400", peak: 400, sigma: 85 },
  { name: "P600", peak: 600, sigma: 90 },
];

//                        [N1,   P2,   N400,  P600]
const CON_AMPS = [-3.0,  2.5,  -2.0,  1.5];
const SEM_AMPS = [-3.2,  2.6,  -8.5,  2.0];
const SYN_AMPS = [-3.0,  2.5,  -3.0,  9.5];

const buildPts = (amps, steps = 600) => {
  const pts = [];
  for (let i = 0; i <= steps; i++) {
    const t = T_MIN + (i / steps) * (T_MAX - T_MIN);
    const a = COMPS.reduce((s, c, j) => s + gauss(t, c.peak, amps[j], c.sigma), 0);
    pts.push({ t, a, x: tToX(t), y: aToY(a) });
  }
  return pts;
};

const toPath = (pts) =>
  pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(" ");

const CON_PTS = buildPts(CON_AMPS), SEM_PTS = buildPts(SEM_AMPS), SYN_PTS = buildPts(SYN_AMPS);
const CON_PATH = toPath(CON_PTS), SEM_PATH = toPath(SEM_PTS), SYN_PATH = toPath(SYN_PTS);

// ─── Component info ───────────────────────────────────────────────────────────
const COMP_INFO = {
  N1: {
    latency: "100–200 ms (peak ~150 ms)", polarity: "Negative",
    generator: "Posterior temporal cortex (visual N1); superior temporal gyrus (auditory N1)",
    modulation: "Largely exogenous; broadly similar across conditions. Reflects early sensory encoding of the stimulus. Amplitude modulated by attention but not by semantic/syntactic fit.",
    color: "#7dd3fc",
    refs: [{ text: "Hillyard et al. (1973)", url: "https://doi.org/10.1126/science.182.4108.177" }],
  },
  P2: {
    latency: "180–260 ms", polarity: "Positive",
    generator: "Occipito-temporal & extrastriate visual cortex",
    modulation: "Relatively stable across semantic/syntactic conditions. Reflects early orthographic and phonological encoding. Modulated by word frequency in some paradigms.",
    color: "#7dd3fc",
    refs: [{ text: "Luck (2014) — Introduction to the ERP Technique", url: "https://mitpress.mit.edu/9780262525855/" }],
  },
  N400: {
    latency: "300–500 ms (peak ~400 ms)", polarity: "Negative",
    generator: "Left temporal–occipital & inferior frontal cortex; middle temporal gyrus; possibly hippocampus",
    modulation: "Amplitude is inversely related to cloze probability and semantic fit in context. Largest for semantically anomalous words. Observed across reading, speech, and sign language. First reported by Kutas & Hillyard (1980).",
    color: "#f43f5e",
    refs: [
      { text: "Kutas & Hillyard (1980)", url: "https://doi.org/10.1126/science.7355273" },
      { text: "Kutas & Federmeier (2011)", url: "https://doi.org/10.1146/annurev.psych.093008.131123" },
    ],
  },
  P600: {
    latency: "500–900 ms (peak ~600 ms)", polarity: "Positive",
    generator: "Parietal & left perisylvian regions; anterior and posterior language network",
    modulation: "Elicited by syntactic violations (phrase structure, agreement, subcategorization errors), garden-path sentences, and morphosyntactic anomalies. Reflects syntactic reanalysis or repair. Also called the 'syntactic positive shift' (SPS).",
    color: "#a78bfa",
    refs: [
      { text: "Osterhout & Holcomb (1992)", url: "https://doi.org/10.1016/0749-596X(92)90003-A" },
      { text: "Kuperberg (2007)", url: "https://doi.org/10.1016/j.brainres.2006.12.063" },
    ],
  },
};

// ─── Sentences ────────────────────────────────────────────────────────────────
const SENTENCES = [
  { key: "con", label: "CONGRUENT",          color: "#22d3ee", critical: "spoon",   tc: "#7dd3fc" },
  { key: "sem", label: "SEMANTIC VIOLATION", color: "#f43f5e", critical: "bicycle", tc: "#fda4af" },
  { key: "syn", label: "SYNTACTIC VIOLATION",color: "#a78bfa", critical: "swiftly", tc: "#c4b5fd" },
];

// ─── SVG data ─────────────────────────────────────────────────────────────────
const TRACES = [
  { key: "con", path: CON_PATH, color: "#22d3ee", fid: "gCyan"   },
  { key: "sem", path: SEM_PATH, color: "#f43f5e", fid: "gRose"   },
  { key: "syn", path: SYN_PATH, color: "#a78bfa", fid: "gViolet" },
];

const BADGES = [
  { name: "N1",   peakT: 150, ampIdx: 0, amps: CON_AMPS, cKey: "con", color: "#7dd3fc", isKey: false },
  { name: "P2",   peakT: 225, ampIdx: 1, amps: CON_AMPS, cKey: "con", color: "#7dd3fc", isKey: false },
  { name: "N400", peakT: 400, ampIdx: 2, amps: SEM_AMPS, cKey: "sem", color: "#f43f5e", isKey: true  },
  { name: "P600", peakT: 600, ampIdx: 3, amps: SYN_AMPS, cKey: "syn", color: "#a78bfa", isKey: true  },
];

const LEGEND = [
  { key: "con", label: "CONGRUENT", color: "#22d3ee" },
  { key: "sem", label: "SEMANTIC",  color: "#f43f5e" },
  { key: "syn", label: "SYNTACTIC", color: "#a78bfa" },
];

const T_TICKS = [-200,-100,0,100,200,300,400,500,600,700,800,900,1000];
const A_TICKS = [-10,-6,-2,2,6,10,14];

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function ERPLanguageApp() {
  const [show, setShow] = useState({ con: true, sem: true, syn: true });
  const [progress, setProgress] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [info, setInfo] = useState(null);
  const [hovered, setHovered] = useState(null);
  const rafRef = useRef(null);
  const t0Ref = useRef(null);
  const DUR = 3800;

  const animate = useCallback((ts) => {
    if (!t0Ref.current) t0Ref.current = ts;
    const p = Math.min((ts - t0Ref.current) / DUR, 1);
    setProgress(p);
    if (p < 1) rafRef.current = requestAnimationFrame(animate);
    else setPlaying(false);
  }, []);

  const play = () => {
    cancelAnimationFrame(rafRef.current);
    t0Ref.current = null;
    setProgress(0);
    setPlaying(true);
    rafRef.current = requestAnimationFrame(animate);
  };

  const reset = () => {
    cancelAnimationFrame(rafRef.current);
    setPlaying(false);
    setProgress(0);
    t0Ref.current = null;
  };

  useEffect(() => () => cancelAnimationFrame(rafRef.current), []);

  return (
    <div style={{
      minHeight: "100vh", background: "#060d1a",
      display: "flex", flexDirection: "column", alignItems: "center",
      padding: "32px 16px 48px",
      fontFamily: "'DM Mono','Courier New',monospace", color: "#e2e8f0",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:ital,wght@0,300;0,400;0,500;1,400&family=Playfair+Display:wght@400;600&display=swap');
        .tb { transition: all 0.2s; border: 1px solid; border-radius: 4px; cursor: pointer; padding: 6px 14px; font-family: 'DM Mono', monospace; font-size: 12px; letter-spacing: .05em; }
        .tb:hover { opacity: .85; } .tb:disabled { opacity: .5; cursor: default; }
        .cb { cursor: pointer; } .cb:hover rect { opacity: .3 !important; }
        a { color: #38bdf8; text-underline-offset: 3px; } a:hover { color: #7dd3fc; }
      `}</style>

      {/* Title */}
      <div style={{ textAlign: "center", marginBottom: 18 }}>
        <h1 style={{
          fontFamily: "'Playfair Display', serif",
          fontSize: "clamp(22px,4vw,32px)", fontWeight: 600, color: "#f1f5f9", margin: 0,
        }}>
          Language ERPs: N400 &amp; P600
        </h1>
        <p style={{ fontSize: 12, color: "#64748b", margin: "6px 0 0", letterSpacing: ".08em" }}>
          SEMANTIC &amp; SYNTACTIC VIOLATIONS — MIDLINE CENTRAL–PARIETAL (Cz / Pz)
        </p>
      </div>

      {/* Sentence display */}
      <div style={{ display: "flex", flexDirection: "column", gap: 5, marginBottom: 14, maxWidth: 660, width: "100%" }}>
        {SENTENCES.filter(s => show[s.key]).map(s => (
          <div key={s.key} style={{
            background: "#080f1e", border: `1px solid ${s.color}30`, borderRadius: 5,
            padding: "7px 14px", fontSize: 13, display: "flex", alignItems: "baseline", gap: 14,
          }}>
            <span style={{ color: s.color, fontSize: 9.5, letterSpacing: ".1em", minWidth: 162, flexShrink: 0 }}>
              {s.label}
            </span>
            <span style={{ color: "#94a3b8" }}>
              She stirred her coffee with a{" "}
              <span style={{ color: s.tc, fontWeight: "500", borderBottom: `1px solid ${s.color}80`, paddingBottom: 1 }}>
                {s.critical}
              </span>.
            </span>
          </div>
        ))}
      </div>

      {/* Controls */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap", justifyContent: "center" }}>
        <button className="tb" onClick={play} disabled={playing}
          style={{ background: playing ? "#1e293b" : "#0f2a44", borderColor: "#38bdf8", color: "#38bdf8" }}>
          {playing ? "▶ PLAYING…" : "▶ PLAY"}
        </button>
        <button className="tb" onClick={reset}
          style={{ background: "#1e0a00", borderColor: "#f97316", color: "#f97316" }}>
          ↺ RESET
        </button>
        {[
          { k: "con", l: "CONGRUENT", bg: "#041a1a", bc: "#22d3ee" },
          { k: "sem", l: "SEMANTIC",  bg: "#1a060a", bc: "#f43f5e" },
          { k: "syn", l: "SYNTACTIC", bg: "#100a1a", bc: "#a78bfa" },
        ].map(b => (
          <button key={b.k} className="tb"
            onClick={() => setShow(s => ({ ...s, [b.k]: !s[b.k] }))}
            style={{ background: show[b.k] ? b.bg : "#111827", borderColor: b.bc, color: show[b.k] ? b.bc : "#475569" }}>
            {show[b.k] ? `● ${b.l}` : `○ ${b.l}`}
          </button>
        ))}
      </div>

      {/* SVG Plot */}
      <div style={{
        background: "#080f1e", border: "1px solid #1e293b", borderRadius: 8,
        boxShadow: "0 0 40px rgba(0,0,0,.6), inset 0 0 60px rgba(0,20,60,.3)",
        overflow: "hidden", maxWidth: "100%",
      }}>
        <svg viewBox={`0 0 ${W} ${H}`} style={{ display: "block", width: "min(840px,96vw)", height: "auto" }}>
          <defs>
            <clipPath id="pc">
              <rect x={PL} y={PT - 10} width={progress * PW} height={PH + 20} />
            </clipPath>
            {["Cyan", "Rose", "Violet"].map(n => (
              <filter key={n} id={`g${n}`} x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="2.5" result="b" />
                <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
            ))}
          </defs>

          {/* Grid */}
          {T_TICKS.map(t => (
            <line key={t} x1={tToX(t)} y1={PT} x2={tToX(t)} y2={PB}
              stroke={t === 0 ? "#334155" : "#111827"} strokeWidth={t === 0 ? 1.5 : 1} />
          ))}
          {A_TICKS.map(a => (
            <line key={a} x1={PL} y1={aToY(a)} x2={PR} y2={aToY(a)}
              stroke={a === 0 ? "#334155" : "#111827"} strokeWidth={a === 0 ? 1.5 : 1} />
          ))}

          {/* Axis labels */}
          {T_TICKS.map(t => (
            <text key={t} x={tToX(t)} y={PB + 16} textAnchor="middle"
              fill="#475569" fontSize={9} fontFamily="'DM Mono',monospace">{t}</text>
          ))}
          {A_TICKS.map(a => (
            <text key={a} x={PL - 8} y={aToY(a) + 3} textAnchor="end"
              fill="#475569" fontSize={9} fontFamily="'DM Mono',monospace">{a}</text>
          ))}
          <text x={PL + PW / 2} y={H - 8} textAnchor="middle" fill="#334155" fontSize={10} fontFamily="'DM Mono',monospace">
            TIME (ms)
          </text>
          <text x={14} y={aToY(0)} textAnchor="middle" fill="#334155" fontSize={10}
            fontFamily="'DM Mono',monospace" transform={`rotate(-90,14,${aToY(0)})`}>
            AMPLITUDE (µV)
          </text>

          {/* Word onset marker */}
          <line x1={tToX(0)} y1={PT - 5} x2={tToX(0)} y2={PB + 5}
            stroke="#475569" strokeWidth={1.5} strokeDasharray="4,3" />
          <text x={tToX(0)} y={PT - 10} textAnchor="middle"
            fill="#64748b" fontSize={9} fontFamily="'DM Mono',monospace">WORD ONSET</text>

          {/* Traces */}
          {TRACES.map(tr => show[tr.key] && (
            <g key={tr.key}>
              <path d={tr.path} fill="none" stroke={tr.color} strokeWidth={1} strokeOpacity={0.12} />
              <path d={tr.path} fill="none" stroke={tr.color} strokeWidth={2}
                filter={`url(#${tr.fid})`} clipPath="url(#pc)" />
            </g>
          ))}

          {/* Component badges */}
          {BADGES.map(bd => {
            const pp = (bd.peakT - T_MIN) / (T_MAX - T_MIN);
            if (progress < pp + 0.03 || !show[bd.cKey]) return null;
            const amp = bd.amps[bd.ampIdx];
            const cx = tToX(bd.peakT);
            const peakY = aToY(amp);
            const offset = bd.isKey ? 28 : 22;
            const labelY = Math.max(peakY - offset, PT + 6);
            const bw = bd.isKey ? 46 : 28;
            const isActive = hovered === bd.name || info?.name === bd.name;
            return (
              <g key={bd.name} className="cb"
                onClick={() => setInfo(info?.name === bd.name ? null : { name: bd.name, ...COMP_INFO[bd.name] })}
                onMouseEnter={() => setHovered(bd.name)}
                onMouseLeave={() => setHovered(null)}>
                <rect x={cx - bw / 2} y={labelY - 10} width={bw} height={16} rx={3}
                  fill={bd.color} opacity={isActive ? 0.3 : 0.15} />
                <text x={cx} y={labelY + 2} textAnchor="middle" fill={bd.color}
                  fontSize={bd.isKey ? 11 : 10} fontWeight={bd.isKey ? "500" : "400"}
                  fontFamily="'DM Mono',monospace">{bd.name}</text>
                <line x1={cx} y1={labelY + 6} x2={cx} y2={peakY - 3}
                  stroke={bd.color} strokeWidth={0.8} strokeOpacity={0.5} />
              </g>
            );
          })}

          {/* Progress cursor */}
          {playing && progress > 0 && progress < 1 && (
            <line x1={PL + progress * PW} y1={PT} x2={PL + progress * PW} y2={PB}
              stroke="#fff" strokeWidth={1} strokeOpacity={0.2} />
          )}

          {/* Legend */}
          {LEGEND.filter(l => show[l.key]).map((l, i) => (
            <g key={l.key}>
              <line x1={PR - 120} y1={PT + 14 + i * 16} x2={PR - 100} y2={PT + 14 + i * 16}
                stroke={l.color} strokeWidth={2} />
              <text x={PR - 96} y={PT + 18 + i * 16} fill={l.color} fontSize={9}
                fontFamily="'DM Mono',monospace">{l.label}</text>
            </g>
          ))}

          {/* Plot border */}
          <rect x={PL} y={PT} width={PW} height={PH} fill="none" stroke="#1e293b" strokeWidth={1} />
        </svg>
      </div>

      {/* Info card */}
      {info && (
        <div style={{
          marginTop: 20, background: "#0d1b2e",
          border: `1px solid ${info.color}44`, borderRadius: 8,
          padding: "16px 22px", maxWidth: 580, width: "100%",
          boxShadow: `0 0 24px ${info.color}22`,
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <span style={{ fontFamily: "'Playfair Display',serif", fontSize: 20, color: info.color, fontWeight: 600 }}>
              {info.name}
            </span>
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
            {info.refs?.length > 0 && (
              <>
                <span style={{ color: "#475569" }}>KEY REFS</span>
                <span>
                  {info.refs.map((r, i) => (
                    <span key={i}>{i > 0 ? " · " : ""}
                      <a href={r.url} target="_blank" rel="noopener" style={{ color: "#38bdf8" }}>{r.text}</a>
                    </span>
                  ))}
                </span>
              </>
            )}
          </div>
        </div>
      )}

      {/* Description */}
      <div style={{
        marginTop: 22, maxWidth: 660, fontSize: 12, color: "#64748b",
        lineHeight: 1.8, textAlign: "center",
      }}>
        <p style={{ margin: "0 0 8px" }}>
          The <strong style={{ color: "#f43f5e" }}>N400</strong> indexes semantic integration difficulty —
          its amplitude inversely tracks a word's contextual fit (cloze probability). The{" "}
          <strong style={{ color: "#a78bfa" }}>P600</strong> reflects syntactic reanalysis, elicited by
          phrase-structure violations, agreement errors, and garden-path sentences. Their classic{" "}
          <em>double dissociation</em> supports distinct neural substrates for meaning and structure in
          language comprehension.
        </p>
        <p style={{ margin: 0 }}>
          Click any component label to explore its properties. References:{" "}
          <a href="https://doi.org/10.1126/science.7355273" target="_blank" rel="noopener">
            Kutas &amp; Hillyard (1980)
          </a>{" · "}
          <a href="https://doi.org/10.1016/0749-596X(92)90003-A" target="_blank" rel="noopener">
            Osterhout &amp; Holcomb (1992)
          </a>{" · "}
          <a href="https://doi.org/10.1146/annurev.psych.093008.131123" target="_blank" rel="noopener">
            Kutas &amp; Federmeier (2011)
          </a>{" · "}
          <a href="https://doi.org/10.1016/j.brainres.2006.12.063" target="_blank" rel="noopener">
            Kuperberg (2007)
          </a>
        </p>
      </div>
    </div>
  );
}
