import { useState } from "react";

// ═══════════════════════════════════════════════════════════════════════════════
// DESIGN TOKENS  (lab-notebook palette, matching CRISPR component)
// ═══════════════════════════════════════════════════════════════════════════════
const FS = "'Playfair Display', Georgia, serif";
const FM = "'DM Mono', 'Courier New', monospace";
const BG   = "#f5efe2";
const SURF = "#faf5e8";
const INK  = "#1f2025";
const FAINT  = "#6b6354";
const FAINTR = "#8a8170";
const BDR  = "#c8bea5";
const BDRF = "#e3d9bf";

// ═══════════════════════════════════════════════════════════════════════════════
// MATH UTILITIES
// ═══════════════════════════════════════════════════════════════════════════════
const normPDF = (x, mu = 0, s = 1) =>
  Math.exp(-0.5 * ((x - mu) / s) ** 2) / (s * Math.sqrt(2 * Math.PI));

// Abramowitz & Stegun approximation of Φ(x)
const normCDF = (x) => {
  const sg = x < 0 ? -1 : 1, z = Math.abs(x);
  const t = 1 / (1 + 0.3275911 * z);
  const e = t * (0.254829592 + t * (-0.284496736 + t * (1.421413741 + t * (-1.453152027 + t * 1.061405429))));
  return 0.5 * (1 + sg * (1 - e * Math.exp(-z * z)));
};

// ═══════════════════════════════════════════════════════════════════════════════
// SHARED SVG LAYOUT
// ═══════════════════════════════════════════════════════════════════════════════
const SW = 760, SH = 300;
const PL = 72, PR = 718, PT = 40, PB = 268;
const PW = PR - PL, PH = PB - PT;

// ═══════════════════════════════════════════════════════════════════════════════
// MICRO-COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════════
function Frame({ gid, children }) {
  return (
    <div style={{ background: SURF, border: `1px solid ${BDR}`, borderRadius: 4, overflow: "hidden", maxWidth: "100%" }}>
      <svg viewBox={`0 0 ${SW} ${SH}`} style={{ display: "block", width: "min(760px,96vw)", height: "auto" }}>
        <defs>
          <pattern id={gid} width="18" height="18" patternUnits="userSpaceOnUse">
            <path d="M 18 0 L 0 0 0 18" fill="none" stroke={BDRF} strokeWidth=".5" />
          </pattern>
        </defs>
        <rect x="0" y="0" width={SW} height={SH} fill={`url(#${gid})`} opacity=".65" />
        <rect x={PL} y={PT} width={PW} height={PH} fill="none" stroke={BDR} strokeWidth={0.8} />
        {children}
      </svg>
    </div>
  );
}

function Slider({ label, min, max, step = 0.1, value, onChange, color = INK, fmt = v => v.toFixed(1) }) {
  return (
    <div style={{ flex: 1, minWidth: 175 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3, fontSize: 10, letterSpacing: ".05em" }}>
        <span style={{ color: FAINT }}>{label}</span>
        <span style={{ color, fontFamily: FM, fontWeight: 500 }}>{fmt(value)}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(Number(e.target.value))} style={{ width: "100%", accentColor: color, color }} />
    </div>
  );
}

function Chip({ label, value, color = INK }) {
  return (
    <div style={{ flex: "1 1 90px", background: SURF, border: `1px solid ${BDR}`, borderRadius: 3, padding: "7px 10px", textAlign: "center" }}>
      <div style={{ fontSize: 9, color: FAINTR, letterSpacing: ".09em", marginBottom: 2 }}>{label}</div>
      <div style={{ fontFamily: FM, fontSize: 15, fontWeight: 500, color }}>{value}</div>
    </div>
  );
}

function Note({ children }) {
  return (
    <p style={{ fontSize: 11.5, color: FAINT, margin: "14px auto 0", lineHeight: 1.85, textAlign: "center", maxWidth: 660 }}>
      {children}
    </p>
  );
}

function AxisLabel({ text, x, y, rotate }) {
  return (
    <text x={x} y={y} textAnchor="middle" fontSize={9} fill={FAINT} fontFamily={FM}
      transform={rotate ? `rotate(-90,${x},${y})` : undefined}>
      {text}
    </text>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 01 · SIGNAL DETECTION THEORY
// ═══════════════════════════════════════════════════════════════════════════════
function SDTPanel() {
  const [dp, setDp]     = useState(2.0);
  const [crit, setCrit] = useState(1.0);

  const X0 = -4.5, X1 = 7.5;
  const PDF_MAX = normPDF(0, 0); // ≈ 0.3989

  const xSvg = x => PL + ((x - X0) / (X1 - X0)) * PW;
  const pSvg = p => PB - (p / PDF_MAX) * PH * 0.88;

  // Area fill under a Gaussian from xFrom to xTo, closing at baseline
  const area = (mu, xFrom, xTo, n = 180) => {
    const a = Math.max(xFrom, X0), b = Math.min(xTo, X1);
    if (a >= b) return "";
    let d = `M ${xSvg(a).toFixed(1)} ${PB}`;
    for (let i = 0; i <= n; i++) {
      const x = a + (i / n) * (b - a);
      d += ` L ${xSvg(x).toFixed(1)} ${pSvg(normPDF(x, mu)).toFixed(1)}`;
    }
    return d + ` L ${xSvg(b).toFixed(1)} ${PB} Z`;
  };

  const curvePath = (mu) => {
    let d = "";
    for (let i = 0; i <= 400; i++) {
      const x = X0 + (i / 400) * (X1 - X0);
      d += `${i ? " L" : "M"} ${xSvg(x).toFixed(1)} ${pSvg(normPDF(x, mu)).toFixed(1)}`;
    }
    return d;
  };

  // SDT outcome rates
  const H  = normCDF(dp - crit);   // Hit rate  = Φ(d′ − c)
  const FA = normCDF(-crit);        // FA rate   = Φ(−c)
  const M  = 1 - H;
  const CR = 1 - FA;
  const cX = xSvg(crit);

  const xTicks = [-4, -2, 0, 2, 4, 6];
  const yTicks = [0.1, 0.2, 0.3];

  return (
    <div>
      <Frame gid="sdt-grid">
        {/* Grid lines */}
        {xTicks.map(t => (
          <line key={t} x1={xSvg(t)} y1={PT} x2={xSvg(t)} y2={PB}
            stroke={BDRF} strokeWidth={0.7} />
        ))}
        {yTicks.map(t => (
          <line key={t} x1={PL} y1={pSvg(t)} x2={PR} y2={pSvg(t)}
            stroke={BDRF} strokeWidth={0.7} />
        ))}

        {/* Colored fills — order matters for layering */}
        <path d={area(0,  X0,   crit)} fill="#4a6a8a" opacity={0.20} />  {/* CR  */}
        <path d={area(0,  crit, X1  )} fill="#b87030" opacity={0.22} />  {/* FA  */}
        <path d={area(dp, X0,   crit)} fill="#8a4a4a" opacity={0.22} />  {/* Miss*/}
        <path d={area(dp, crit, X1  )} fill="#4a7a5a" opacity={0.30} />  {/* Hit */}

        {/* Gaussian curves */}
        <path d={curvePath(0)}  fill="none" stroke="#4a5a7a" strokeWidth={2.2} />
        <path d={curvePath(dp)} fill="none" stroke="#3a7a5a" strokeWidth={2.2} />

        {/* Criterion line */}
        <line x1={cX} y1={PT - 6} x2={cX} y2={PB + 5}
          stroke="#8a2020" strokeWidth={1.8} strokeDasharray="5,3" />
        <text x={cX} y={PT - 9} textAnchor="middle" fontSize={9} fill="#8a2020" fontFamily={FM}>
          c = {crit.toFixed(1)}
        </text>

        {/* d′ bracket between the two peaks */}
        {dp > 0.3 && (() => {
          const bY = pSvg(PDF_MAX * 0.80);
          const x0 = xSvg(0), xd = xSvg(dp);
          return (
            <g>
              <line x1={x0} y1={bY} x2={xd} y2={bY} stroke={FAINT} strokeWidth={1} />
              <line x1={x0} y1={bY - 4} x2={x0} y2={bY + 4} stroke={FAINT} strokeWidth={1} />
              <line x1={xd} y1={bY - 4} x2={xd} y2={bY + 4} stroke={FAINT} strokeWidth={1} />
              <text x={(x0 + xd) / 2} y={bY - 7} textAnchor="middle"
                fontSize={11} fill={FAINT} fontFamily={FM}>d′ = {dp.toFixed(1)}</text>
            </g>
          );
        })()}

        {/* Distribution labels */}
        <text x={xSvg(0)}  y={pSvg(PDF_MAX * 0.60)} textAnchor="middle"
          fontSize={10} fill="#4a5a7a" fontFamily={FM}>Noise</text>
        <text x={xSvg(dp)} y={pSvg(PDF_MAX * 0.60)} textAnchor="middle"
          fontSize={10} fill="#3a7a5a" fontFamily={FM}>Signal+Noise</text>

        {/* Region labels — conditional on region being large enough */}
        {CR > 0.08 && <text x={xSvg(Math.max(crit - 1.8, X0 + 0.4))} y={PB - 10} textAnchor="middle" fontSize={8} fill="#4a6a8a" fontFamily={FM}>CR</text>}
        {FA > 0.08 && <text x={xSvg(Math.min(crit + 1.6, X1 - 0.4))} y={PB - 10} textAnchor="middle" fontSize={8} fill="#b87030" fontFamily={FM}>FA</text>}
        {M  > 0.08 && <text x={xSvg(Math.max(crit - 1.8, X0 + 0.4))} y={PB - 24} textAnchor="middle" fontSize={8} fill="#8a4a4a" fontFamily={FM}>MISS</text>}
        {H  > 0.08 && <text x={xSvg(Math.min(crit + 1.6, X1 - 0.4))} y={PB - 24} textAnchor="middle" fontSize={8} fill="#4a7a5a" fontFamily={FM}>HIT</text>}

        {/* Axis tick labels */}
        {xTicks.map(t => (
          <text key={t} x={xSvg(t)} y={PB + 14} textAnchor="middle" fontSize={9} fill={FAINTR} fontFamily={FM}>{t}</text>
        ))}
        {yTicks.map(t => (
          <text key={t} x={PL - 6} y={pSvg(t) + 3} textAnchor="end" fontSize={9} fill={FAINTR} fontFamily={FM}>{t.toFixed(1)}</text>
        ))}

        {/* Axis titles */}
        <AxisLabel text="Decision Variable" x={PL + PW / 2} y={SH - 4} />
        <AxisLabel text="Probability Density" x={13} y={PT + PH / 2} rotate />

        {/* Legend */}
        {[["Noise N(0,1)", "#4a5a7a"], ["Signal N(d′,1)", "#3a7a5a"]].map(([lbl, col], i) => (
          <g key={lbl}>
            <line x1={PR - 136} y1={PT + 14 + i * 16} x2={PR - 116} y2={PT + 14 + i * 16}
              stroke={col} strokeWidth={2} />
            <text x={PR - 112} y={PT + 18 + i * 16} fontSize={9} fill={col} fontFamily={FM}>{lbl}</text>
          </g>
        ))}
      </Frame>

      <div style={{ display: "flex", gap: 18, marginTop: 14, flexWrap: "wrap" }}>
        <Slider label="d′ — Discriminability" min={0} max={4} step={0.1} value={dp}
          onChange={setDp} color="#3a7a5a" fmt={v => v.toFixed(1)} />
        <Slider label="Criterion (c) — Response Bias" min={-2} max={4} step={0.1} value={crit}
          onChange={setCrit} color="#8a2020" fmt={v => v.toFixed(1)} />
      </div>

      <div style={{ display: "flex", gap: 7, marginTop: 10, flexWrap: "wrap" }}>
        <Chip label="HIT RATE (H)"      value={`${(H  * 100).toFixed(0)}%`} color="#4a7a5a" />
        <Chip label="MISS RATE"         value={`${(M  * 100).toFixed(0)}%`} color="#8a4a4a" />
        <Chip label="FALSE ALARM (FA)"  value={`${(FA * 100).toFixed(0)}%`} color="#b87030" />
        <Chip label="CORR. REJECTION"   value={`${(CR * 100).toFixed(0)}%`} color="#4a6a8a" />
      </div>

      <Note>
        <strong style={{ color: INK }}>Signal Detection Theory</strong> separates <em>sensitivity</em> (d′)
        from <em>response bias</em> (criterion c). A liberal observer (low c) earns more hits but also
        more false alarms; a conservative observer does the reverse. d′ measures the signal-to-noise gap
        independently of criterion placement — a key advance over classical threshold theory.{" "}
        <a href="https://archive.org/details/signaldetectiont0000gree" target="_blank" rel="noopener">Green &amp; Swets (1966)</a>{" · "}
        <a href="https://books.google.com/books?id=P094AgAAQBAJ" target="_blank" rel="noopener">Macmillan &amp; Creelman (2005)</a>
      </Note>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 02 · SPEED-ACCURACY TRADEOFF
// ═══════════════════════════════════════════════════════════════════════════════
function SATPanel() {
  const [deadline, setDeadline] = useState(600);  // ms
  const [beta,     setBeta]     = useState(0.005); // accrual rate (ms⁻¹)
  const [delta,    setDelta]    = useState(200);   // onset latency (ms)
  const LAMBDA = 0.95; // asymptotic accuracy (fixed)

  const T0 = 0, T1 = 1500;
  const A0 = 0.5, A1 = 1.0;
  const tSvg = t => PL + ((t - T0) / (T1 - T0)) * PW;
  const aSvg = a => PB - ((a - A0) / (A1 - A0)) * PH;

  // SATF: Wickelgren (1977) exponential growth form
  const satf = t => t <= delta ? 0.5 : 0.5 + (LAMBDA - 0.5) * (1 - Math.exp(-beta * (t - delta)));

  const curvePath = () => {
    let d = "";
    for (let i = 0; i <= 500; i++) {
      const t = T0 + (i / 500) * (T1 - T0);
      d += `${i ? " L" : "M"} ${tSvg(t).toFixed(1)} ${aSvg(satf(t)).toFixed(1)}`;
    }
    return d;
  };

  // Speed zone fill (left of deadline, under SATF curve)
  const speedZone = () => {
    const end = Math.min(deadline, T1);
    let d = `M ${tSvg(T0)} ${aSvg(0.5)}`;
    for (let i = 0; i <= 300; i++) {
      const t = T0 + (i / 300) * (end - T0);
      d += ` L ${tSvg(t).toFixed(1)} ${aSvg(satf(t)).toFixed(1)}`;
    }
    return d + ` L ${tSvg(end).toFixed(1)} ${PB} L ${tSvg(T0)} ${PB} Z`;
  };

  const currentAcc = satf(deadline);
  const dX = tSvg(deadline);
  const dY = aSvg(currentAcc);

  const tTicks = [0, 300, 600, 900, 1200, 1500];
  const aTicks = [0.5, 0.6, 0.7, 0.8, 0.9, 1.0];

  return (
    <div>
      <Frame gid="sat-grid">
        {/* Grid */}
        {tTicks.map(t => (
          <line key={t} x1={tSvg(t)} y1={PT} x2={tSvg(t)} y2={PB}
            stroke={BDRF} strokeWidth={0.7} />
        ))}
        {aTicks.map(a => (
          <line key={a} x1={PL} y1={aSvg(a)} x2={PR} y2={aSvg(a)}
            stroke={BDRF} strokeWidth={0.7} />
        ))}

        {/* Chance level marker */}
        <line x1={PL} y1={aSvg(0.5)} x2={PR} y2={aSvg(0.5)}
          stroke={FAINT} strokeWidth={1} strokeDasharray="2,4" opacity={0.5} />
        <text x={PL - 6} y={aSvg(0.5) + 3} textAnchor="end" fontSize={8} fill={FAINT} fontFamily={FM}>0.5</text>
        <text x={PR + 4} y={aSvg(0.5) + 3} fontSize={8} fill={FAINT} fontFamily={FM}>chance</text>

        {/* Speed zone fill */}
        <path d={speedZone()} fill="#b8760a" opacity={0.09} />

        {/* SATF curve */}
        <path d={curvePath()} fill="none" stroke="#2a4a7a" strokeWidth={2.4} />

        {/* Asymptote */}
        <line x1={PL} y1={aSvg(LAMBDA)} x2={PR} y2={aSvg(LAMBDA)}
          stroke="#2a4a7a" strokeWidth={1} strokeDasharray="4,4" opacity={0.3} />
        <text x={PR + 4} y={aSvg(LAMBDA) + 3} fontSize={8} fill="#2a4a7a" fontFamily={FM} opacity={0.6}>λ</text>

        {/* δ tick mark */}
        {(() => {
          const dx = tSvg(delta);
          return (
            <g>
              <line x1={dx} y1={PB} x2={dx} y2={PB + 8} stroke={FAINT} strokeWidth={1} />
              <text x={dx} y={PB + 18} textAnchor="middle" fontSize={8} fill={FAINT} fontFamily={FM}>δ</text>
            </g>
          );
        })()}

        {/* Deadline line */}
        <line x1={dX} y1={PT} x2={dX} y2={PB}
          stroke="#8a4a2a" strokeWidth={1.6} strokeDasharray="5,3" />

        {/* Accuracy dashed readout */}
        <line x1={PL} y1={dY} x2={dX} y2={dY}
          stroke="#b8760a" strokeWidth={1} strokeDasharray="3,3" opacity={0.7} />

        {/* Operating point */}
        <circle cx={dX} cy={dY} r={7} fill="#b8760a" opacity={0.9} />
        <circle cx={dX} cy={dY} r={7} fill="none" stroke={INK} strokeWidth={1} opacity={0.25} />

        {/* Axis ticks */}
        {tTicks.map(t => (
          <text key={t} x={tSvg(t)} y={PB + 14} textAnchor="middle" fontSize={9} fill={FAINTR} fontFamily={FM}>{t}</text>
        ))}
        {aTicks.filter(a => a > 0.5).map(a => (
          <text key={a} x={PL - 6} y={aSvg(a) + 3} textAnchor="end" fontSize={9} fill={FAINTR} fontFamily={FM}>{a.toFixed(1)}</text>
        ))}

        <AxisLabel text="Processing Time (ms)" x={PL + PW / 2} y={SH - 4} />
        <AxisLabel text="Accuracy (PC)" x={13} y={PT + PH / 2} rotate />

        {/* Zone labels */}
        <text x={tSvg(deadline / 2)} y={PB - 12} textAnchor="middle" fontSize={9}
          fill="#b8760a" fontFamily={FM} opacity={0.7}>SPEED</text>
        <text x={tSvg((deadline + T1) / 2)} y={PB - 12} textAnchor="middle" fontSize={9}
          fill="#2a4a7a" fontFamily={FM} opacity={0.6}>ACCURACY</text>
      </Frame>

      <div style={{ display: "flex", gap: 18, marginTop: 14, flexWrap: "wrap" }}>
        <Slider label="Response Deadline" min={50} max={1490} step={10} value={deadline}
          onChange={setDeadline} color="#8a4a2a" fmt={v => `${v} ms`} />
        <Slider label="Accrual Rate (β)" min={0.001} max={0.015} step={0.001} value={beta}
          onChange={setBeta} color="#2a4a7a" fmt={v => v.toFixed(3)} />
        <Slider label="Onset Latency (δ)" min={50} max={500} step={10} value={delta}
          onChange={v => { setDelta(v); if (deadline <= v) setDeadline(v + 10); }}
          color={FAINT} fmt={v => `${v} ms`} />
      </div>

      <div style={{ display: "flex", gap: 7, marginTop: 10, flexWrap: "wrap" }}>
        <Chip label="DEADLINE" value={`${deadline} ms`} color="#8a4a2a" />
        <Chip label="ACCURACY" value={`${(currentAcc * 100).toFixed(1)}%`} color="#2a4a7a" />
        <Chip label="ASYMPTOTE (λ)" value={`${(LAMBDA * 100).toFixed(0)}%`} color={FAINT} />
        <Chip label="ONSET (δ)" value={`${delta} ms`} color={FAINT} />
      </div>

      <Note>
        <strong style={{ color: INK }}>Speed-Accuracy Tradeoff</strong>: accuracy accrues
        exponentially from chance (0.5) toward an asymptote λ. The amber dot is your operating point.
        A tighter deadline forces you left on the curve. β controls how quickly information accumulates;
        δ is the irreducible latency before any signal is available.{" "}
        <a href="https://doi.org/10.1016/0001-6918(77)90012-9" target="_blank" rel="noopener">Wickelgren (1977)</a>{" · "}
        <a href="https://doi.org/10.1037/0096-3445.118.4.346" target="_blank" rel="noopener">McElree &amp; Dosher (1989)</a>
      </Note>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 03 · STEVENS' POWER LAW
// ═══════════════════════════════════════════════════════════════════════════════
const MODALITIES = [
  { id: "brightness", label: "Brightness",    n: 0.33, color: "#b8880a", ref: "Stevens (1961)" },
  { id: "loudness",   label: "Loudness",      n: 0.60, color: "#2a7a7a", ref: "Stevens (1957)" },
  { id: "length",     label: "Line Length",   n: 1.00, color: "#4a5a8a", ref: "Ekman (1958)"   },
  { id: "heaviness",  label: "Heaviness",     n: 1.45, color: "#4a7a5a", ref: "Stevens (1957)" },
  { id: "pain",       label: "Pain",          n: 1.60, color: "#8a4a4a", ref: "Stevens (1968)" },
  { id: "shock",      label: "Elec. Shock",   n: 3.50, color: "#6a4a8a", ref: "Stevens (1957)" },
];

function StevensPanel() {
  const [modId,   setModId]   = useState("brightness");
  const [phi,     setPhi]     = useState(0.5);
  const [logMode, setLogMode] = useState(false);

  const sel = MODALITIES.find(m => m.id === modId);

  // Linear coordinate transforms
  const xLin = x => PL + x * PW;
  const yLin = y => PB - y * PH;

  // Log-log coordinate transforms (φ from 0.1 to 1, Ψ = φⁿ)
  // log₁₀ x range: -1 to 0; log₁₀ y range: -4 to 0
  const LL_X0 = -1, LL_X1 = 0, LL_Y0 = -4, LL_Y1 = 0;
  const xLog = lx => PL + ((lx - LL_X0) / (LL_X1 - LL_X0)) * PW;
  const yLog = ly => PB - ((ly - LL_Y0) / (LL_Y1 - LL_Y0)) * PH;

  const curvePath = (mod) => {
    if (logMode) {
      // Straight line: log(Ψ) = n·log(φ), range φ ∈ [0.1, 1]
      const lx0 = LL_X0, lx1 = LL_X1;
      return `M ${xLog(lx0)} ${yLog(mod.n * lx0)} L ${xLog(lx1)} ${yLog(mod.n * lx1)}`;
    }
    let d = "";
    for (let i = 0; i <= 300; i++) {
      const x = i / 300; // φ from 0 to 1
      const y = Math.pow(x, mod.n);
      d += `${i ? " L" : "M"} ${xLin(x).toFixed(1)} ${yLin(y).toFixed(1)}`;
    }
    return d;
  };

  const clampedPhi = Math.max(phi, 0.1);
  const psi = Math.pow(clampedPhi, sel.n);
  const opX = logMode ? xLog(Math.log10(clampedPhi)) : xLin(phi);
  const opY = logMode ? yLog(sel.n * Math.log10(clampedPhi)) : yLin(psi);

  const linTicks = [0, 0.2, 0.4, 0.6, 0.8, 1.0];
  const logXVals = [0.1, 0.2, 0.5, 1.0];
  const logYVals = [-3, -2, -1, 0]; // log₁₀ labels

  // Reference line n=1 in linear mode
  const identity = logMode ? null : `M ${xLin(0)} ${yLin(0)} L ${xLin(1)} ${yLin(1)}`;

  return (
    <div>
      <Frame gid="stev-grid">
        {/* Grid and axis ticks */}
        {!logMode ? (
          <>
            {linTicks.map(t => (
              <g key={t}>
                <line x1={xLin(t)} y1={PT} x2={xLin(t)} y2={PB} stroke={BDRF} strokeWidth={0.7} />
                <line x1={PL} y1={yLin(t)} x2={PR} y2={yLin(t)} stroke={BDRF} strokeWidth={0.7} />
                <text x={xLin(t)} y={PB + 14} textAnchor="middle" fontSize={9} fill={FAINTR} fontFamily={FM}>{t.toFixed(1)}</text>
                {t > 0 && <text x={PL - 6} y={yLin(t) + 3} textAnchor="end" fontSize={9} fill={FAINTR} fontFamily={FM}>{t.toFixed(1)}</text>}
              </g>
            ))}
            {/* Identity reference line (n = 1) */}
            <path d={identity} fill="none" stroke={BDRF} strokeWidth={1} strokeDasharray="3,3" />
            <text x={xLin(0.85)} y={yLin(0.88)} fontSize={8} fill={FAINTR} fontFamily={FM}>n=1</text>
          </>
        ) : (
          <>
            {logXVals.map(v => {
              const lx = Math.log10(v);
              return (
                <g key={v}>
                  <line x1={xLog(lx)} y1={PT} x2={xLog(lx)} y2={PB} stroke={BDRF} strokeWidth={0.7} />
                  <text x={xLog(lx)} y={PB + 14} textAnchor="middle" fontSize={9} fill={FAINTR} fontFamily={FM}>{v}</text>
                </g>
              );
            })}
            {logYVals.map(lv => (
              <g key={lv}>
                <line x1={PL} y1={yLog(lv)} x2={PR} y2={yLog(lv)} stroke={BDRF} strokeWidth={0.7} />
                <text x={PL - 6} y={yLog(lv) + 3} textAnchor="end" fontSize={9} fill={FAINTR} fontFamily={FM}>10^{lv}</text>
              </g>
            ))}
            {/* Log-log identity reference */}
            <path d={`M ${xLog(-1)} ${yLog(-1)} L ${xLog(0)} ${yLog(0)}`}
              fill="none" stroke={BDRF} strokeWidth={1} strokeDasharray="3,3" />
            <text x={xLog(-0.15)} y={yLog(-0.22)} fontSize={8} fill={FAINTR} fontFamily={FM}>n=1</text>
          </>
        )}

        {/* All modality curves — faint background */}
        {MODALITIES.map(mod => (
          <path key={mod.id} d={curvePath(mod)}
            fill="none" stroke={mod.color}
            strokeWidth={mod.id === modId ? 2.6 : 1.0}
            opacity={mod.id === modId ? 1.0 : 0.18}
          />
        ))}

        {/* Curve slope label on selected */}
        {logMode && (() => {
          const lx = -0.55;
          const ly = sel.n * lx;
          if (ly < LL_Y0 + 0.2 || ly > LL_Y1 - 0.1) return null;
          return (
            <text x={xLog(lx) + 10} y={yLog(ly) - 6} fontSize={10}
              fill={sel.color} fontFamily={FM}>n = {sel.n.toFixed(2)}</text>
          );
        })()}

        {/* Operating point */}
        {phi >= 0.1 && (
          <>
            <line x1={PL} y1={opY} x2={opX} y2={opY}
              stroke={sel.color} strokeWidth={1} strokeDasharray="3,3" opacity={0.55} />
            <line x1={opX} y1={opY} x2={opX} y2={PB}
              stroke={sel.color} strokeWidth={1} strokeDasharray="3,3" opacity={0.55} />
            <circle cx={opX} cy={opY} r={6} fill={sel.color} opacity={0.9} />
            <circle cx={opX} cy={opY} r={6} fill="none" stroke={INK} strokeWidth={1} opacity={0.2} />
          </>
        )}

        {/* Axis titles */}
        <AxisLabel text={`Physical Intensity (φ)${logMode ? "  —  log scale" : ""}`}
          x={PL + PW / 2} y={SH - 4} />
        <AxisLabel text={`Perceived Magnitude (Ψ)${logMode ? "  log" : ""}`}
          x={13} y={PT + PH / 2} rotate />
      </Frame>

      {/* Modality buttons */}
      <div style={{ display: "flex", gap: 5, marginTop: 12, flexWrap: "wrap", justifyContent: "center" }}>
        {MODALITIES.map(mod => (
          <button key={mod.id} onClick={() => setModId(mod.id)}
            style={{
              fontFamily: FM, fontSize: 10, letterSpacing: ".06em",
              padding: "5px 11px", cursor: "pointer",
              border: `1px solid ${mod.color}`,
              borderRadius: 2,
              background: modId === mod.id ? mod.color : "transparent",
              color: modId === mod.id ? BG : mod.color,
              transition: "all .15s",
            }}>
            {mod.label} <span style={{ opacity: 0.75 }}>n={mod.n}</span>
          </button>
        ))}
        <button onClick={() => setLogMode(l => !l)}
          style={{
            fontFamily: FM, fontSize: 10, letterSpacing: ".06em",
            padding: "5px 11px", cursor: "pointer",
            border: `1px solid ${FAINT}`,
            borderRadius: 2,
            background: logMode ? FAINT : "transparent",
            color: logMode ? BG : FAINT,
            transition: "all .15s",
          }}>
          {logMode ? "LINEAR" : "LOG-LOG"}
        </button>
      </div>

      <div style={{ display: "flex", gap: 18, marginTop: 12, flexWrap: "wrap" }}>
        <Slider label="Physical Intensity (φ)" min={0.1} max={1.0} step={0.01} value={phi}
          onChange={setPhi} color={sel.color} fmt={v => v.toFixed(2)} />
      </div>

      <div style={{ display: "flex", gap: 7, marginTop: 10, flexWrap: "wrap" }}>
        <Chip label="MODALITY"   value={sel.label} color={sel.color} />
        <Chip label="EXPONENT n" value={sel.n.toFixed(2)} color={sel.color} />
        <Chip label="φ (PHYSICAL)" value={phi.toFixed(2)} color={FAINT} />
        <Chip label="Ψ (PERCEIVED)" value={psi.toFixed(3)} color={sel.color} />
      </div>

      <Note>
        <strong style={{ color: INK }}>Stevens' Power Law</strong>: Ψ = k·φ<sup>n</sup> —
        perceived magnitude grows as a power function of physical intensity. When n &lt; 1 (brightness,
        loudness) the perceptual scale compresses; when n &gt; 1 (pain, shock) it expands. Toggle to
        log-log view to see all modalities become straight lines with slopes equal to their exponents.{" "}
        <a href="https://doi.org/10.1037/h0046162" target="_blank" rel="noopener">Stevens (1957)</a>{" · "}
        <a href="https://doi.org/10.1126/science.133.3446.80" target="_blank" rel="noopener">Stevens (1961)</a>
      </Note>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 04 · HICK'S LAW
// ═══════════════════════════════════════════════════════════════════════════════
const HICK_A = 180; // ms intercept
const HICK_B = 153; // ms per bit
const HICK_COLORS = ["#2a5a8a","#3a6a5a","#8a4a2a","#6a4a8a","#8a6a2a","#2a7a6a","#8a3a4a","#4a5a8a"];
const hick_rt = n => (n <= 1 ? HICK_A : HICK_A + HICK_B * Math.log2(n));

function HickPanel() {
  const [n, setN] = useState(4);

  // Axis: X = n (1 to 8), Y = RT (0 to 750ms)
  const N_MIN = 1, N_MAX = 8;
  const RT_MIN = 0, RT_MAX = 750;
  const nSvg  = v => PL + ((v - N_MIN) / (N_MAX - N_MIN)) * PW;
  const rtSvg = v => PB - ((v - RT_MIN) / (RT_MAX - RT_MIN)) * PH;

  const rt = hick_rt(n);
  const bits = n <= 1 ? 0 : Math.log2(n);

  // Theoretical Hick line
  const linePath = (() => {
    let d = "";
    for (let i = 0; i <= 200; i++) {
      const v = N_MIN + (i / 200) * (N_MAX - N_MIN);
      const r = hick_rt(v);
      d += `${i ? " L" : "M"} ${nSvg(v).toFixed(1)} ${rtSvg(r).toFixed(1)}`;
    }
    return d;
  })();

  const nVals  = [1, 2, 3, 4, 5, 6, 7, 8];
  const rtTicks = [0, 100, 200, 300, 400, 500, 600, 700];

  return (
    <div>
      <Frame gid="hick-grid">
        {/* Grid */}
        {nVals.map(v => (
          <line key={v} x1={nSvg(v)} y1={PT} x2={nSvg(v)} y2={PB}
            stroke={BDRF} strokeWidth={0.7} />
        ))}
        {rtTicks.map(v => (
          <line key={v} x1={PL} y1={rtSvg(v)} x2={PR} y2={rtSvg(v)}
            stroke={BDRF} strokeWidth={0.7} />
        ))}

        {/* Information gain annotation — vertical bar for each n */}
        {nVals.map(v => {
          const x = nSvg(v);
          const r = hick_rt(v);
          const isSelected = v === n;
          return (
            <g key={v}>
              <line x1={x} y1={rtSvg(r)} x2={x} y2={PB}
                stroke={isSelected ? "#b8760a" : BDR} strokeWidth={isSelected ? 1.5 : 0.8}
                strokeDasharray={isSelected ? "" : "2,3"} />
            </g>
          );
        })}

        {/* Hick's law line */}
        <path d={linePath} fill="none" stroke="#2a3a5a" strokeWidth={2.2} />

        {/* Data points at each integer n */}
        {nVals.map(v => {
          const isSelected = v === n;
          return (
            <circle key={v} cx={nSvg(v)} cy={rtSvg(hick_rt(v))} r={isSelected ? 9 : 5}
              fill={isSelected ? "#b8760a" : "#2a3a5a"}
              stroke={isSelected ? INK : "none"}
              strokeWidth={1} opacity={isSelected ? 1 : 0.75}
              style={{ cursor: "pointer" }}
              onClick={() => setN(v)}
            />
          );
        })}

        {/* Operating point label */}
        {(() => {
          const x = nSvg(n), y = rtSvg(rt);
          const labelX = n <= 4 ? x + 14 : x - 14;
          const anchor = n <= 4 ? "start" : "end";
          return (
            <text x={labelX} y={y - 4} textAnchor={anchor}
              fontSize={11} fill="#b8760a" fontFamily={FM} fontWeight={500}>
              {Math.round(rt)} ms
            </text>
          );
        })()}

        {/* Axis ticks */}
        {nVals.map(v => (
          <text key={v} x={nSvg(v)} y={PB + 14} textAnchor="middle"
            fontSize={9} fill={FAINTR} fontFamily={FM}>{v}</text>
        ))}
        {rtTicks.map(v => (
          <text key={v} x={PL - 6} y={rtSvg(v) + 3} textAnchor="end"
            fontSize={9} fill={FAINTR} fontFamily={FM}>{v}</text>
        ))}

        {/* Formula annotation */}
        <text x={PR - 8} y={PT + 14} textAnchor="end"
          fontSize={10} fill={FAINT} fontFamily={FM} fontStyle="italic">
          RT = {HICK_A} + {HICK_B}·log₂(n)
        </text>

        <AxisLabel text="Number of Alternatives (n)" x={PL + PW / 2} y={SH - 4} />
        <AxisLabel text="Response Time (ms)" x={13} y={PT + PH / 2} rotate />
      </Frame>

      {/* n selector */}
      <div style={{ display: "flex", gap: 5, marginTop: 12, justifyContent: "center", flexWrap: "wrap" }}>
        {nVals.map(v => (
          <button key={v} onClick={() => setN(v)}
            style={{
              fontFamily: FM, fontSize: 12, fontWeight: 500,
              width: 38, height: 38, cursor: "pointer",
              border: `1px solid ${v === n ? HICK_COLORS[v - 1] : BDR}`,
              borderRadius: 2,
              background: v === n ? HICK_COLORS[v - 1] : "transparent",
              color: v === n ? BG : FAINT,
              transition: "all .15s",
            }}>
            {v}
          </button>
        ))}
      </div>

      {/* Visual alternatives */}
      <div style={{ display: "flex", gap: 4, marginTop: 10, justifyContent: "center", alignItems: "center", flexWrap: "wrap" }}>
        <span style={{ fontSize: 10, color: FAINTR, fontFamily: FM, marginRight: 6 }}>STIMULI:</span>
        {Array.from({ length: n }).map((_, i) => (
          <div key={i} style={{
            width: 28, height: 28, borderRadius: 3,
            background: HICK_COLORS[i % HICK_COLORS.length],
            border: `1px solid ${BDR}`,
            opacity: 0.75,
          }} />
        ))}
      </div>

      <div style={{ display: "flex", gap: 7, marginTop: 10, flexWrap: "wrap" }}>
        <Chip label="ALTERNATIVES (n)"  value={n}                           color={HICK_COLORS[n - 1]} />
        <Chip label="INFORMATION (bits)" value={bits.toFixed(2)}             color={FAINT} />
        <Chip label="PREDICTED RT"      value={`${Math.round(rt)} ms`}       color="#2a3a5a" />
        <Chip label="GAIN OVER n=1"     value={`+${Math.round(rt - HICK_A)} ms`} color="#8a4a2a" />
      </div>

      <Note>
        <strong style={{ color: INK }}>Hick's Law</strong> (Hick-Hyman Law): reaction time increases
        logarithmically with the number of equally-probable response alternatives. Each additional
        doubling of choices adds ~{HICK_B} ms. The log₂ term captures the information-theoretic
        interpretation: each alternative contributes one bit of uncertainty. Click any point or button
        to change n.{" "}
        <a href="https://doi.org/10.1080/17470215208416600" target="_blank" rel="noopener">Hick (1952)</a>{" · "}
        <a href="https://doi.org/10.1037/h0056940" target="_blank" rel="noopener">Hyman (1953)</a>
      </Note>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════
const PANELS = [
  { id: "sdt",     short: "SDT",   long: "Signal Detection Theory", Component: SDTPanel   },
  { id: "sat",     short: "SAT",   long: "Speed-Accuracy Tradeoff", Component: SATPanel   },
  { id: "stevens", short: "POWER", long: "Stevens' Power Law",      Component: StevensPanel },
  { id: "hick",    short: "HICK",  long: "Hick's Law",              Component: HickPanel  },
];

export default function PsychophysicsGallery() {
  const [active, setActive] = useState("sdt");
  const ActivePanel = PANELS.find(p => p.id === active).Component;

  return (
    <div style={{
      minHeight: "100vh",
      background: BG,
      display: "flex", flexDirection: "column", alignItems: "center",
      padding: "32px 16px 56px",
      fontFamily: FM, color: INK,
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:ital,wght@0,300;0,400;0,500;1,400&family=Playfair+Display:ital,wght@0,400;0,600;1,400&display=swap');
        input[type=range]{-webkit-appearance:none;width:100%;height:4px;border-radius:2px;background:${BDR};outline:none}
        input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:13px;height:13px;border-radius:50%;cursor:pointer;background:currentColor}
        input[type=range]::-moz-range-thumb{width:13px;height:13px;border-radius:50%;cursor:pointer;background:currentColor;border:none}
        button:focus{outline:none}
        a{color:#2a5a8a;text-underline-offset:3px}
        a:hover{color:#1a4a7a}
        circle{transition:r .15s,fill .15s}
      `}</style>

      {/* Title */}
      <div style={{ textAlign: "center", marginBottom: 24 }}>
        <h1 style={{
          fontFamily: FS, fontSize: "clamp(22px,4vw,34px)", fontWeight: 600,
          color: INK, margin: 0, letterSpacing: ".005em",
        }}>
          Core Psychophysics
        </h1>
        <p style={{ fontSize: 11, color: FAINT, margin: "6px 0 0", letterSpacing: ".1em" }}>
          FOUR FOUNDATIONAL FINDINGS IN PERCEPTION &amp; RESPONSE
        </p>
      </div>

      {/* Tab navigation */}
      <div style={{ display: "flex", gap: 6, marginBottom: 22, flexWrap: "wrap", justifyContent: "center" }}>
        {PANELS.map((p, i) => (
          <button key={p.id} onClick={() => setActive(p.id)}
            style={{
              fontFamily: FM, fontSize: 10.5, letterSpacing: ".08em",
              padding: "7px 16px", cursor: "pointer",
              border: `1px solid ${active === p.id ? INK : BDR}`,
              borderRadius: 2,
              background: active === p.id ? INK : "transparent",
              color: active === p.id ? BG : FAINT,
              transition: "all .15s",
            }}>
            {String(i + 1).padStart(2, "0")} · {p.short}
          </button>
        ))}
      </div>

      {/* Panel title */}
      <div style={{ textAlign: "center", marginBottom: 14, width: "100%", maxWidth: 760 }}>
        <h2 style={{ fontFamily: FS, fontSize: "clamp(17px,3vw,24px)", fontWeight: 600, color: INK, margin: 0 }}>
          {PANELS.find(p => p.id === active).long}
        </h2>
      </div>

      {/* Active panel */}
      <div style={{ width: "100%", maxWidth: 760 }}>
        <ActivePanel />
      </div>
    </div>
  );
}
