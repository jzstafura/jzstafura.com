import { useState, useEffect, useRef, useMemo, useCallback } from "react";

// ─── Geometry (760 × 520 coordinate space) ─────────────────────────────────────
const W = 760, H = 520;
const CX = 380, CY = 262;
const R_SCALP = 205, R_SKULL = 192, R_BRAIN = 176;
const R_DIP_MAX = R_BRAIN - 10;   // dipole stays in cortex
const R_DIP_MIN = 14;
const N_E = 21;                   // electrodes across the upper arc
const DEFL = 42;                  // max radial deflection of the readout curve
const GAIN = 5200;                // field → color sensitivity (tanh)

// Electrode positions along the upper scalp arc (left → top → right)
const ELECTRODES = Array.from({ length: N_E }, (_, i) => {
  const t = Math.PI * (i / (N_E - 1));
  return { ex: CX - R_SCALP * Math.cos(t), ey: CY - R_SCALP * Math.sin(t), t };
});

// ─── Physics: potential of a current dipole in a homogeneous medium ─────────────
// V(r) ∝ (p · r̂) / r²  =  (p · R) / |R|³
const fieldAt = (x, y, dx, dy, px, py) => {
  const rx = x - dx, ry = y - dy;
  const r2 = rx * rx + ry * ry + 1e-3;
  return (px * rx + py * ry) / (r2 * Math.sqrt(r2));
};

// 1-D Gaussian smoothing along the electrode arc (the schematic "skull blur")
const smooth = (arr, sigma) => {
  if (sigma <= 0.05) return arr.slice();
  const n = arr.length, out = new Array(n).fill(0);
  const rad = Math.max(1, Math.ceil(sigma * 3));
  for (let i = 0; i < n; i++) {
    let s = 0, w = 0;
    for (let k = -rad; k <= rad; k++) {
      let j = i + k;
      if (j < 0) j = -j;                 // reflect at edges
      if (j >= n) j = 2 * n - 2 - j;
      if (j < 0 || j >= n) continue;
      const g = Math.exp(-(k * k) / (2 * sigma * sigma));
      s += arr[j] * g; w += g;
    }
    out[i] = s / w;
  }
  return out;
};

// Measured scalp profile: raw field sampled at electrodes, blurred by the skull
const scalpProfile = (dx, dy, px, py, skull) => {
  const v = ELECTRODES.map(e => fieldAt(e.ex, e.ey, dx, dy, px, py));
  return smooth(v, skull ? 2.8 : 0.4);
};

const pearson = (a, b) => {
  const n = a.length;
  let ma = 0, mb = 0;
  for (let i = 0; i < n; i++) { ma += a[i]; mb += b[i]; }
  ma /= n; mb /= n;
  let num = 0, da = 0, db = 0;
  for (let i = 0; i < n; i++) {
    const x = a[i] - ma, y = b[i] - mb;
    num += x * y; da += x * x; db += y * y;
  }
  return num / (Math.sqrt(da * db) + 1e-12);
};

// Diverging colour (dark-adapted blue ↔ red, white-hot core)
const rgbFor = (n) => {
  const an = Math.min(1, Math.abs(n));
  let R, G, B;
  if (n >= 0) { R = 248; G = 113; B = 90; } else { R = 56; G = 160; B = 248; }
  const wc = an > 0.82 ? (an - 0.82) / 0.18 : 0;
  return [
    Math.round(R + (255 - R) * wc),
    Math.round(G + (255 - G) * wc),
    Math.round(B + (255 - B) * wc),
  ];
};
const dotFill = (n) => {
  const [R, G, B] = rgbFor(n);
  const a = Math.max(0.42, Math.pow(Math.min(1, Math.abs(n)), 0.8));
  const bg = [11, 17, 30];
  return `rgb(${Math.round(bg[0] + (R - bg[0]) * a)},${Math.round(bg[1] + (G - bg[1]) * a)},${Math.round(bg[2] + (B - bg[2]) * a)})`;
};
const bandFill = (n) => {
  const [R, G, B] = rgbFor(n);
  const a = (0.22 + 0.6 * Math.pow(Math.min(1, Math.abs(n)), 0.85)).toFixed(2);
  return `rgba(${R},${G},${B},${a})`;
};

// ─── Component info cards ───────────────────────────────────────────────────────
const INFO = {
  SOURCE: {
    full: "Current dipole · cortical source",
    color: "#fbbf24",
    body: "Scalp EEG is generated mainly by post-synaptic potentials in the apical dendrites of cortical pyramidal neurons. Because these cells are aligned in parallel (an \"open field\"), their tiny currents summate into a net current dipole. Drag the source and rotate it: a radial dipole (pointing toward the scalp) yields a single peak above it; a tangential dipole yields a two-lobed positive/negative pattern with a zero-crossing over the source.",
    refs: [
      { text: "Buzsáki, Anastassiou & Koch (2012)", url: "https://doi.org/10.1038/nrn3241" },
      { text: "Hallez et al. (2007)", url: "https://doi.org/10.1186/1743-0003-4-46" },
    ],
  },
  SKULL: {
    full: "Volume conduction · the skull",
    color: "#94a3b8",
    body: "The field must pass through brain, cerebrospinal fluid, skull, and scalp to reach the electrodes. The skull's low conductivity spreads and attenuates the potential, acting as a spatial low-pass filter. Toggle it here to watch the measured profile sharpen or blur. This smearing is the reason scalp EEG has poor spatial resolution (centimetres) despite its excellent temporal resolution (milliseconds). The field here is a homogeneous schematic, not a solved layered model.",
    refs: [{ text: "Hallez et al. (2007), three-shell model", url: "https://doi.org/10.1186/1743-0003-4-46" }],
  },
  SCALP: {
    full: "Scalp potential · what you measure",
    color: "#e2e8f0",
    body: "Each electrode reads a single number: the local potential. The curve traces those readings around the head, the 1-D analogue of a topographic map. Red bumps outward for positive potential, blue inward for negative. Notice the readout is always broader and smoother than the compact source beneath it, because volume conduction blurs the spatial detail before it reaches the surface.",
    refs: [{ text: "Hallez et al. (2007)", url: "https://doi.org/10.1186/1743-0003-4-46" }],
  },
  INVERSE: {
    full: "The inverse problem · non-uniqueness",
    color: "#22d3ee",
    body: "Going from scalp to source is ill-posed: infinitely many internal configurations produce the same surface pattern. The cyan dipole here is deeper and stronger, yet its scalp profile nearly matches the amber source. From the scalp alone you cannot decide between them. Helmholtz proved this non-uniqueness in 1853; modern source localisation only proceeds by adding assumptions (priors) about the source.",
    refs: [{ text: "Grech et al. (2008), inverse-problem review", url: "https://doi.org/10.1186/1743-0003-5-25" }],
  },
};

const DEFAULT = { dx: CX, dy: CY - Math.round(0.62 * R_BRAIN), phi: 0 };

// ─── Main component ─────────────────────────────────────────────────────────────
export default function SourceToScalpApp() {
  const [dip, setDip]       = useState({ dx: DEFAULT.dx, dy: DEFAULT.dy });
  const [phiDeg, setPhiDeg] = useState(DEFAULT.phi);   // orientation, degrees
  const [skull, setSkull]   = useState(true);
  const [inverse, setInverse] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [info, setInfo]     = useState(null);
  const [hovered, setHovered] = useState(null);
  const [dragging, setDragging] = useState(false);

  const canvasRef = useRef(null);
  const offRef = useRef(null);
  const svgRef = useRef(null);
  const rafRef = useRef(null);
  const sweepRef = useRef({ base: 0, swept: 0, last: 0 });

  // ── Orientation vector (radial / tangential mix defined at the dipole) ──
  const phi = (phiDeg * Math.PI) / 180;
  let rdx = dip.dx - CX, rdy = dip.dy - CY;
  const rl = Math.hypot(rdx, rdy) || 1;
  rdx /= rl; rdy /= rl;
  const perx = -rdy, pery = rdx;
  const cphi = Math.cos(phi), sphi = Math.sin(phi);
  const pux = rdx * cphi + perx * sphi;
  const puy = rdy * cphi + pery * sphi;

  // ── Draw the true field heatmap (skull-independent ground truth) ──
  const drawField = useCallback((dx, dy, px, py) => {
    const main = canvasRef.current;
    if (!main) return;
    const ctx = main.getContext("2d");
    ctx.clearRect(0, 0, W, H);
    ctx.save();
    ctx.beginPath();
    ctx.arc(CX, CY, R_SCALP - 1, 0, Math.PI * 2);
    ctx.clip();

    const ow = 380, oh = 260;
    if (!offRef.current) {
      offRef.current = document.createElement("canvas");
      offRef.current.width = ow; offRef.current.height = oh;
    }
    const octx = offRef.current.getContext("2d");
    const img = octx.createImageData(ow, oh);
    const d = img.data;
    const r2max = (R_SCALP - 1) * (R_SCALP - 1);
    for (let yy = 0; yy < oh; yy++) {
      const y = ((yy + 0.5) / oh) * H;
      for (let xx = 0; xx < ow; xx++) {
        const x = ((xx + 0.5) / ow) * W;
        const k = (yy * ow + xx) * 4;
        const ddx = x - CX, ddy = y - CY;
        if (ddx * ddx + ddy * ddy > r2max) { d[k + 3] = 0; continue; }
        const V = fieldAt(x, y, dx, dy, px, py);
        const n = Math.tanh(GAIN * V);
        const an = Math.min(1, Math.abs(n));
        const [R, G, B] = rgbFor(n);
        d[k] = R; d[k + 1] = G; d[k + 2] = B;
        d[k + 3] = Math.round(Math.pow(an, 0.82) * 235);
      }
    }
    octx.putImageData(img, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(offRef.current, 0, 0, ow, oh, 0, 0, W, H);
    ctx.restore();
  }, []);

  useEffect(() => { drawField(dip.dx, dip.dy, pux, puy); }, [dip, pux, puy, drawField]);

  // ── Sweep animation (rotate orientation once, 360°) ──
  const tick = useCallback((ts) => {
    const s = sweepRef.current;
    if (!s.last) s.last = ts;
    const dt = (ts - s.last) / 1000;
    s.last = ts;
    s.swept += dt * 60;                  // 60°/s
    setPhiDeg((s.base + s.swept) % 360);
    if (s.swept >= 360) { setPlaying(false); return; }
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  const play = () => {
    cancelAnimationFrame(rafRef.current);
    sweepRef.current = { base: phiDeg, swept: 0, last: 0 };
    setPlaying(true);
    rafRef.current = requestAnimationFrame(tick);
  };
  const stopSweep = () => { cancelAnimationFrame(rafRef.current); setPlaying(false); };
  const reset = () => {
    stopSweep();
    setDip({ dx: DEFAULT.dx, dy: DEFAULT.dy });
    setPhiDeg(DEFAULT.phi); setSkull(true); setInverse(false); setInfo(null);
  };
  useEffect(() => () => cancelAnimationFrame(rafRef.current), []);

  // ── Pointer dragging of the dipole ──
  const toSvg = (e) => {
    const r = svgRef.current.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * W, y: ((e.clientY - r.top) / r.height) * H };
  };
  const moveDip = (e) => {
    const { x, y } = toSvg(e);
    let dx = x - CX, dy = y - CY;
    let dist = Math.hypot(dx, dy);
    if (dist > R_DIP_MAX) { dx = (dx / dist) * R_DIP_MAX; dy = (dy / dist) * R_DIP_MAX; }
    else if (dist < R_DIP_MIN) { const a = Math.atan2(dy, dx); dx = R_DIP_MIN * Math.cos(a); dy = R_DIP_MIN * Math.sin(a); }
    setDip({ dx: CX + dx, dy: CY + dy });
  };
  const onDown = (e) => { e.target.setPointerCapture?.(e.pointerId); setDragging(true); stopSweep(); };
  const onMove = (e) => { if (dragging) moveDip(e); };
  const onUp = (e) => { e.target.releasePointerCapture?.(e.pointerId); setDragging(false); };

  // ── Primary measured profile ──
  const m = scalpProfile(dip.dx, dip.dy, pux, puy, skull);
  const maxAbs = Math.max(1e-9, ...m.map(Math.abs));

  // ── Inverse-problem decoy: deeper source with the closest scalp profile ──
  const decoy = useMemo(() => {
    if (!inverse) return null;
    const dp = Math.hypot(dip.dx - CX, dip.dy - CY);
    let best = null;
    for (let dist = R_DIP_MIN; dist <= R_DIP_MAX; dist += (R_DIP_MAX - R_DIP_MIN) / 24) {
      if (Math.abs(dist - dp) < 28) continue;          // must be visibly different depth
      const ddx = CX + rdx * dist, ddy = CY + rdy * dist;
      const dm = scalpProfile(ddx, ddy, pux, puy, skull);
      const c = pearson(m, dm);
      if (!best || c > best.c) best = { ddx, ddy, dm, c };
    }
    if (!best) return null;
    let num = 0, den = 0;
    for (let i = 0; i < N_E; i++) { num += m[i] * best.dm[i]; den += best.dm[i] * best.dm[i]; }
    const scale = num / (den + 1e-12);
    return { ddx: best.ddx, ddy: best.ddy, corr: best.c, scaled: best.dm.map(v => v * scale) };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inverse, dip, pux, puy, skull]);

  // ── Build SVG paths for readout curve + colour band ──
  const pts = ELECTRODES.map((e, i) => {
    const ox = (e.ex - CX) / R_SCALP, oy = (e.ey - CY) / R_SCALP;
    const off = (m[i] / maxAbs) * DEFL;
    return { x: e.ex + ox * off, y: e.ey + oy * off, ox, oy };
  });
  const curvePath = pts.map((p, i) => `${i ? "L" : "M"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");

  const decoyPts = decoy ? ELECTRODES.map((e, i) => {
    const ox = (e.ex - CX) / R_SCALP, oy = (e.ey - CY) / R_SCALP;
    const off = (decoy.scaled[i] / maxAbs) * DEFL;
    return { x: e.ex + ox * off, y: e.ey + oy * off };
  }) : null;
  const decoyPath = decoyPts ? decoyPts.map((p, i) => `${i ? "L" : "M"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ") : "";

  // Dipole arrow endpoints
  const aLen = 19;
  const headX = dip.dx + pux * aLen, headY = dip.dy + puy * aLen;
  const tailX = dip.dx - pux * aLen, tailY = dip.dy - puy * aLen;
  const arrow = (hx, hy, ux, uy, color, dash) => {
    const bx = hx - ux * 9, by = hy - uy * 9;
    const nx = -uy, ny = ux;
    return (
      <>
        <line x1={hx - ux * 2 * 19} y1={hy - uy * 2 * 19} x2={hx} y2={hy}
          stroke={color} strokeWidth={2.4} strokeLinecap="round" strokeDasharray={dash || "none"} />
        <polygon points={`${hx},${hy} ${bx + nx * 6},${by + ny * 6} ${bx - nx * 6},${by - ny * 6}`} fill={color} />
      </>
    );
  };

  const radialPct = Math.round(Math.abs(Math.cos(phi)) * 100);

  return (
    <div style={{
      minHeight: "100vh", background: "#060d1a",
      display: "flex", flexDirection: "column", alignItems: "center",
      padding: "32px 16px 48px",
      fontFamily: "'DM Mono','Courier New',monospace", color: "#e2e8f0",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:ital,wght@0,300;0,400;0,500;1,400&family=Playfair+Display:wght@400;600&display=swap');
        .tb { transition: all .2s; border: 1px solid; border-radius: 4px; cursor: pointer; padding: 6px 14px; font-family: 'DM Mono',monospace; font-size: 12px; letter-spacing: .05em; background: transparent; }
        .tb:hover { opacity: .85; } .tb:disabled { opacity: .5; cursor: default; }
        .qb { transition: all .15s; border: 1px solid #334155; border-radius: 4px; cursor: pointer; padding: 4px 12px; font-family: 'DM Mono',monospace; font-size: 11px; letter-spacing: .05em; background: transparent; color: #94a3b8; }
        .qb:hover { border-color: #64748b; color: #cbd5e1; }
        .badge { cursor: pointer; } .badge:hover rect { opacity: .4 !important; }
        input[type=range] { accent-color: #fbbf24; }
        a { color: #38bdf8; text-underline-offset: 3px; } a:hover { color: #7dd3fc; }
      `}</style>

      {/* Title */}
      <div style={{ textAlign: "center", marginBottom: 16 }}>
        <h1 style={{ fontFamily: "'Playfair Display',serif", fontSize: "clamp(22px,4vw,32px)", fontWeight: 600, color: "#f1f5f9", margin: 0 }}>
          From Source to Scalp
        </h1>
        <p style={{ fontSize: 11.5, color: "#64748b", margin: "6px 0 0", letterSpacing: ".08em" }}>
          THE EEG FORWARD PROBLEM · WHY A SCALP MAP CANNOT LOCATE ITS SOURCE
        </p>
      </div>

      {/* Controls */}
      <div style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap", justifyContent: "center" }}>
        <button className="tb" onClick={play} disabled={playing} style={{ borderColor: "#38bdf8", color: "#38bdf8" }}>
          {playing ? "▶ SWEEPING…" : "▶ SWEEP ORIENTATION"}
        </button>
        <button className="tb" onClick={reset} style={{ borderColor: "#f97316", color: "#f97316" }}>↺ RESET</button>
        <button className="tb" onClick={() => setSkull(s => !s)}
          style={{ borderColor: "#94a3b8", color: skull ? "#cbd5e1" : "#475569" }}>
          {skull ? "● SKULL ON" : "○ SKULL OFF"}
        </button>
        <button className="tb" onClick={() => setInverse(v => !v)}
          style={{ borderColor: "#22d3ee", color: inverse ? "#22d3ee" : "#475569" }}>
          {inverse ? "● INVERSE DEMO" : "○ INVERSE DEMO"}
        </button>
      </div>

      {/* Orientation */}
      <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap", justifyContent: "center", alignItems: "center", maxWidth: 560 }}>
        <span style={{ fontSize: 10.5, color: "#64748b", letterSpacing: ".08em" }}>ORIENTATION</span>
        <input type="range" min={0} max={360} value={Math.round(phiDeg)}
          onChange={e => { stopSweep(); setPhiDeg(Number(e.target.value)); }}
          style={{ width: 180 }} />
        <span style={{ fontSize: 10.5, color: "#94a3b8", minWidth: 150 }}>
          radial {radialPct}% · tangential {100 - radialPct}%
        </span>
        <button className="qb" onClick={() => { stopSweep(); setPhiDeg(0); }}>RADIAL</button>
        <button className="qb" onClick={() => { stopSweep(); setPhiDeg(90); }}>TANGENTIAL</button>
      </div>

      {/* Figure */}
      <div style={{
        position: "relative", background: "#080f1e", border: "1px solid #1e293b", borderRadius: 8,
        boxShadow: "0 0 40px rgba(0,0,0,.6), inset 0 0 60px rgba(0,20,60,.3)",
        overflow: "hidden", maxWidth: "100%", lineHeight: 0,
      }}>
        <canvas ref={canvasRef} width={W} height={H}
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} />
        <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`}
          onPointerMove={onMove} onPointerUp={onUp} onPointerLeave={onUp}
          style={{ position: "relative", display: "block", width: "min(760px,96vw)", height: "auto", touchAction: "none" }}>

          {/* Head layers */}
          <circle cx={CX} cy={CY} r={R_SCALP} fill="none" stroke="#334155" strokeWidth={1.4} />
          <circle cx={CX} cy={CY} r={R_SKULL} fill="none" stroke="#1e293b" strokeWidth={6} opacity={skull ? 0.8 : 0.25} />
          <circle cx={CX} cy={CY} r={R_BRAIN} fill="none" stroke="#1e293b" strokeWidth={1} />
          <text x={CX} y={CY + R_SCALP + 18} textAnchor="middle" fill="#334155" fontSize={9}
            fontFamily="'DM Mono',monospace" letterSpacing=".1em">CORONAL SECTION · scalp / skull / brain</text>

          {/* Scalp colour band (the measured topography wrapped on the head) */}
          {ELECTRODES.slice(0, -1).map((e, i) => (
            <line key={`band-${i}`} x1={e.ex} y1={e.ey} x2={ELECTRODES[i + 1].ex} y2={ELECTRODES[i + 1].ey}
              stroke={bandFill(((m[i] + m[i + 1]) / 2) / maxAbs)} strokeWidth={9} strokeLinecap="round" />
          ))}

          {/* Readout curve + electrodes */}
          <path d={curvePath} fill="none" stroke="#e2e8f0" strokeWidth={1.6} strokeOpacity={0.85} />
          {ELECTRODES.map((e, i) => (
            <g key={`e-${i}`}>
              <line x1={e.ex} y1={e.ey} x2={pts[i].x} y2={pts[i].y} stroke={dotFill(m[i] / maxAbs)} strokeWidth={1} strokeOpacity={0.5} />
              <circle cx={e.ex} cy={e.ey} r={3.1} fill={dotFill(m[i] / maxAbs)} stroke="#0b1422" strokeWidth={0.6} />
            </g>
          ))}

          {/* Inverse-problem decoy */}
          {decoy && (
            <>
              <path d={decoyPath} fill="none" stroke="#22d3ee" strokeWidth={1.5} strokeDasharray="5,4" strokeOpacity={0.9} />
              {arrow(decoy.ddx + pux * aLen, decoy.ddy + puy * aLen, pux, puy, "#22d3ee", "3,3")}
              <circle cx={decoy.ddx} cy={decoy.ddy} r={3} fill="#22d3ee" />
            </>
          )}

          {/* Dipole source */}
          {arrow(headX, headY, pux, puy, "#fbbf24")}
          <text x={tailX - pux * 5} y={tailY - puy * 5 + 3} textAnchor="middle" fontSize={11} fill="#fbbf24" opacity={0.8}>−</text>
          <text x={headX + pux * 6} y={headY + puy * 6 + 3} textAnchor="middle" fontSize={11} fill="#fbbf24">+</text>
          {/* drag handle */}
          <circle cx={dip.dx} cy={dip.dy} r={22} fill="transparent"
            style={{ cursor: dragging ? "grabbing" : "grab" }} onPointerDown={onDown} />
          <circle cx={dip.dx} cy={dip.dy} r={3.4} fill="#fde68a" />

          {/* Badges */}
          <BadgeNode cx={Math.min(Math.max(dip.dx, 64), W - 64)} cy={Math.max(dip.dy - 46, 60)}
            w={56} label="SOURCE" color="#fbbf24" name="SOURCE"
            info={info} setInfo={setInfo} hovered={hovered} setHovered={setHovered} link={[dip.dx, dip.dy]} />
          <BadgeNode cx={CX - R_SKULL * Math.cos(2.3)} cy={CY - R_SKULL * Math.sin(2.3)}
            w={48} label="SKULL" color="#94a3b8" name="SKULL"
            info={info} setInfo={setInfo} hovered={hovered} setHovered={setHovered} />
          <BadgeNode cx={CX} cy={Math.max(CY - R_SCALP - DEFL - 6, 18)}
            w={52} label="SCALP" color="#cbd5e1" name="SCALP"
            info={info} setInfo={setInfo} hovered={hovered} setHovered={setHovered} />
          {decoy && (
            <BadgeNode cx={Math.min(Math.max(decoy.ddx, 70), W - 70)} cy={Math.min(decoy.ddy + 40, H - 30)}
              w={62} label="INVERSE" color="#22d3ee" name="INVERSE"
              info={info} setInfo={setInfo} hovered={hovered} setHovered={setHovered} link={[decoy.ddx, decoy.ddy]} />
          )}

          {/* Correlation readout */}
          {decoy && (
            <text x={W - 16} y={28} textAnchor="end" fontSize={11} fill="#22d3ee" fontFamily="'DM Mono',monospace">
              scalp profiles correlate {Math.round(decoy.corr * 100)}%
            </text>
          )}
        </svg>
      </div>

      {/* Legend + hint */}
      <div style={{ display: "flex", gap: 16, marginTop: 12, flexWrap: "wrap", justifyContent: "center", fontSize: 10.5, color: "#64748b", letterSpacing: ".04em" }}>
        <Legend c="#f8716e" t="positive" /><Legend c="#38bdf8" t="negative" />
        <Legend c="#fbbf24" t="source dipole" />{inverse && <Legend c="#22d3ee" t="decoy source" />}
        <span>· drag the source · rotate it · toggle the skull</span>
      </div>

      {/* Info card */}
      {info && (
        <div style={{
          marginTop: 18, background: "#0d1b2e", border: `1px solid ${INFO[info].color}44`,
          borderRadius: 8, padding: "16px 22px", maxWidth: 600, width: "100%",
          boxShadow: `0 0 24px ${INFO[info].color}22`,
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
            <span style={{ fontFamily: "'Playfair Display',serif", fontSize: 19, color: INFO[info].color, fontWeight: 600 }}>{INFO[info].full}</span>
            <button onClick={() => setInfo(null)} style={{ background: "none", border: "none", color: "#475569", cursor: "pointer", fontSize: 16 }}>✕</button>
          </div>
          <p style={{ fontSize: 12.5, lineHeight: 1.7, color: "#cbd5e1", margin: "0 0 10px" }}>{INFO[info].body}</p>
          <div style={{ fontSize: 11, color: "#64748b", letterSpacing: ".04em" }}>
            REFS:{" "}
            {INFO[info].refs.map((r, i) => (
              <span key={i}>{i > 0 ? " · " : ""}<a href={r.url} target="_blank" rel="noopener">{r.text}</a></span>
            ))}
          </div>
        </div>
      )}

      {/* Footer */}
      <div style={{ marginTop: 22, maxWidth: 640, fontSize: 12, color: "#64748b", lineHeight: 1.8, textAlign: "center" }}>
        <p style={{ margin: "0 0 8px" }}>
          A cortical current dipole spreads its potential through the head and arrives at the scalp as a
          broad, attenuated profile. Computing that surface pattern from a known source is the{" "}
          <strong style={{ color: "#94a3b8" }}>forward problem</strong>, and it is well-posed. Reversing it,
          recovering the source from the scalp, is the <strong style={{ color: "#22d3ee" }}>inverse problem</strong>,
          and it has no unique solution. The colour field is a homogeneous-medium schematic, not a solved layered model.
        </p>
        <p style={{ margin: 0 }}>
          References:{" "}
          <a href="https://doi.org/10.1038/nrn3241" target="_blank" rel="noopener">Buzsáki et al. (2012)</a>{" · "}
          <a href="https://doi.org/10.1186/1743-0003-4-46" target="_blank" rel="noopener">Hallez et al. (2007)</a>{" · "}
          <a href="https://doi.org/10.1186/1743-0003-5-25" target="_blank" rel="noopener">Grech et al. (2008)</a>
        </p>
      </div>
    </div>
  );
}

// ─── Reusable badge ─────────────────────────────────────────────────────────────
function BadgeNode({ cx, cy, w, label, color, name, info, setInfo, hovered, setHovered, link }) {
  const isActive = hovered === name || info === name;
  return (
    <g className="badge"
      onClick={() => setInfo(info === name ? null : name)}
      onMouseEnter={() => setHovered(name)} onMouseLeave={() => setHovered(null)}>
      {link && <line x1={cx} y1={cy + 8} x2={link[0]} y2={link[1]} stroke={color} strokeWidth={0.7} strokeOpacity={0.4} />}
      <rect x={cx - w / 2} y={cy - 9} width={w} height={17} rx={3}
        fill={color} opacity={isActive ? 0.38 : 0.16} stroke={color} strokeWidth={0.6} strokeOpacity={0.55} />
      <text x={cx} y={cy + 3} textAnchor="middle" fill={color} fontSize={10} fontWeight={500}
        fontFamily="'DM Mono',monospace" letterSpacing=".05em">{label}</text>
    </g>
  );
}

function Legend({ c, t }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
      <span style={{ width: 9, height: 9, borderRadius: "50%", background: c, display: "inline-block" }} />{t}
    </span>
  );
}
