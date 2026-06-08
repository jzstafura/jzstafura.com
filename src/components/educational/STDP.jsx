import { useState, useEffect, useRef, useCallback } from "react";

// ─── STDP learning rule — Bi & Poo (1998), J. Neurosci. 18:10464 ──────────────
// Δt = t_post − t_pre
// Δt > 0 (pre before post): LTP  →  ΔW =  A+ · exp(−Δt / τ+)
// Δt < 0 (post before pre): LTD  →  ΔW = −A− · exp( Δt / τ−)
const A_PLUS   = 1.000;
const A_MINUS  = 0.525;
const TAU_PLUS  = 16.8;   // ms
const TAU_MINUS = 33.7;   // ms
const LR = 0.074;         // per-trial learning rate (scales ΔW into weight space)

const stdpDW = (dt) => {
  if (dt > 0) return  A_PLUS  * Math.exp(-dt / TAU_PLUS);
  if (dt < 0) return -A_MINUS * Math.exp( dt / TAU_MINUS);
  return 0;
};

// ─── SVG layout ──────────────────────────────────────────────────────────────
const W = 840, H = 480;

// Neuron diagram (left half)
const NX = 112;
const PRE_Y = 118, POST_Y = 338, SOMA_R = 22, SYN_CY = 234;

// Voltage traces (right of neuron column)
const TX1 = 200, TX2 = 415, TW = TX2 - TX1;
const T_WIN = 280;   // ms shown per trace
const T_PRE = 110;   // ms at which pre fires within the window
const TRACE_AMP = 28; // ±px voltage deflection

// STDP curve panel (right half)
const CPL = 458, CPR = 826;
const CPT = 50,  CPB = 314;
const CPW = CPR - CPL, CPH = CPB - CPT;
const DT_LIM = 100;
const DW_HI = 1.15, DW_LO = -0.70;

const dtToX = (dt) => CPL + ((dt + DT_LIM) / (2 * DT_LIM)) * CPW;
const dwToY = (dw) => CPB - ((dw - DW_LO) / (DW_HI - DW_LO)) * CPH;

// ─── Pre-computed STDP curve paths ────────────────────────────────────────────
const mkCurvePath = (dtMin, dtMax) => {
  const segs = [];
  for (let dt = dtMin; dt <= dtMax; dt += 0.5) {
    segs.push(`${segs.length === 0 ? "M" : "L"} ${dtToX(dt).toFixed(1)} ${dwToY(stdpDW(dt)).toFixed(1)}`);
  }
  return segs.join(" ");
};
const LTD_PATH = mkCurvePath(-DT_LIM, 0);
const LTP_PATH = mkCurvePath(0, DT_LIM);

// ─── Action potential waveform (Gaussian shape, visually stretched) ────────────
// dt is time since spike onset (ms), returns normalized amplitude 0–1 (with undershoot)
const SV_DUR = 30; // ms of display window per spike
const spikeV = (t, tSpike) => {
  const dt = t - tSpike;
  if (dt <= 0 || dt >= SV_DUR) return 0;
  const x = dt / SV_DUR;
  const peak  =        Math.exp(-((x - 0.14) ** 2) / (2 * 0.048 ** 2));
  const under = -0.21 * Math.exp(-((x - 0.58) ** 2) / (2 * 0.130 ** 2));
  return peak + under;
};

// ─── Component info cards ─────────────────────────────────────────────────────
const INFO = {
  PRE: {
    full: "Presynaptic neuron",
    color: "#22d3ee",
    body: "The sending cell. Its action potential propagates along the axon and triggers glutamate release at the terminal bouton. In the STDP rule, t_pre anchors one end of the timing measurement. What matters biologically is whether this glutamate signal arrives at the synapse before or after the postsynaptic cell fires and its back-propagating AP reaches the same dendritic spine.",
    refs: [
      { text: "Bi & Poo (1998)", url: "https://doi.org/10.1523/JNEUROSCI.18-24-10464.1998" },
      { text: "Markram et al. (1997)", url: "https://doi.org/10.1126/science.275.5297.213" },
    ],
  },
  POST: {
    full: "Postsynaptic neuron",
    color: "#fb923c",
    body: "The receiving cell. When it fires, its action potential actively back-propagates (bAP) into the dendritic tree, providing a retrograde depolarization signal. The bAP amplitude decrements with distance from the soma, so distal synapses experience weaker signals than proximal ones — giving STDP a spatial gradient. Δt = t_post − t_pre is positive when post fires after pre (causal sequence).",
    refs: [
      { text: "Magee & Johnston (1997)", url: "https://doi.org/10.1126/science.275.5297.209" },
      { text: "Stuart & Häusser (2001)", url: "https://doi.org/10.1038/82910" },
    ],
  },
  SYNAPSE: {
    full: "Glutamatergic synapse · NMDA receptor",
    color: "#a78bfa",
    body: "The NMDA receptor (NMDAR) is the molecular coincidence detector at the heart of STDP. It requires both glutamate binding (from the presynaptic terminal) and membrane depolarization (to expel the resting Mg²⁺ block) before it will pass Ca²⁺. Pre-before-post timing satisfies both conditions simultaneously: glutamate is still bound while the bAP arrives, driving strong Ca²⁺ influx and activating CaMKII for LTP. Post-before-pre produces weaker, delayed Ca²⁺ entry that recruits calcineurin instead, causing LTD.",
    refs: [
      { text: "Malenka & Bear (2004)", url: "https://doi.org/10.1016/j.neuron.2004.09.012" },
      { text: "Dan & Poo (2004)", url: "https://doi.org/10.1016/j.neuron.2004.09.007" },
    ],
  },
  LTP: {
    full: "Long-term potentiation",
    color: "#f87171",
    body: "When pre fires before post (Δt > 0), the causal sequence drives strong Ca²⁺ influx through NMDA receptors. High Ca²⁺ activates CaMKII, which phosphorylates existing AMPA receptors (increasing conductance) and recruits additional receptors into the postsynaptic density — increasing the response to the same presynaptic input. The LTP time constant τ+ ≈ 17ms sets a narrow window: only synapses that predict the postsynaptic response within ~50ms are reliably potentiated.",
    refs: [
      { text: "Bliss & Lømo (1973)", url: "https://doi.org/10.1113/jphysiol.1973.sp010273" },
      { text: "Malenka & Bear (2004)", url: "https://doi.org/10.1016/j.neuron.2004.09.012" },
    ],
  },
  LTD: {
    full: "Long-term depression",
    color: "#38bdf8",
    body: "When post fires before pre (Δt < 0), the anti-causal sequence produces weaker, slower Ca²⁺ entry: the bAP has already subsided by the time glutamate arrives. This low-amplitude Ca²⁺ signal engages calcineurin and PP1 phosphatase activity, dephosphorylating and internalizing AMPA receptors — weakening the synapse. The LTD time constant τ− ≈ 34ms is notably broader than the LTP window, reflecting slower calcineurin activation kinetics.",
    refs: [
      { text: "Dudek & Bear (1992)", url: "https://doi.org/10.1073/pnas.89.10.4363" },
      { text: "Bi & Poo (1998)", url: "https://doi.org/10.1523/JNEUROSCI.18-24-10464.1998" },
    ],
  },
  WINDOW: {
    full: "The STDP learning window",
    color: "#fbbf24",
    body: "The asymmetric exponential curve was measured empirically by Bi & Poo (1998) using paired pre/post current injections in cultured hippocampal neurons. The two sides are notably different: the LTP window is narrow (τ+ ≈ 17ms, A+ = 1.0) while the LTD window is broader (τ− ≈ 34ms) with a smaller peak amplitude (A− ≈ 0.53). At the network level, Song, Miller & Abbott (2000) showed that STDP naturally selects for reliable afferents by driving a competition between LTP and LTD, sharpening input selectivity without explicit supervision.",
    refs: [
      { text: "Bi & Poo (1998)", url: "https://doi.org/10.1523/JNEUROSCI.18-24-10464.1998" },
      { text: "Song, Miller & Abbott (2000)", url: "https://doi.org/10.1038/78829" },
    ],
  },
};

// ─── Main component ───────────────────────────────────────────────────────────
export default function STDPApp() {
  const [dtMs, setDtMs]       = useState(25);
  const [animT, setAnimT]     = useState(0);
  const [playing, setPlaying] = useState(false);
  const [weight, setWeight]   = useState(0.5);
  const [history, setHistory] = useState([]);
  const [didUpdate, setDidUpdate] = useState(false);
  const [info, setInfo]       = useState(null);
  const [hovered, setHovered] = useState(null);

  const rafRef = useRef(null);
  const t0Ref  = useRef(null);
  const ANIM_DUR = 2400; // ms

  const animate = useCallback((ts) => {
    if (!t0Ref.current) t0Ref.current = ts;
    const p = Math.min((ts - t0Ref.current) / ANIM_DUR, 1);
    setAnimT(p);
    if (p < 1) rafRef.current = requestAnimationFrame(animate);
    else setPlaying(false);
  }, []);

  const fire = () => {
    if (playing) return;
    cancelAnimationFrame(rafRef.current);
    t0Ref.current = null; setAnimT(0); setDidUpdate(false); setPlaying(true);
    rafRef.current = requestAnimationFrame(animate);
  };

  const reset = () => {
    cancelAnimationFrame(rafRef.current);
    setPlaying(false); setAnimT(0); setWeight(0.5);
    setHistory([]); setDidUpdate(false); t0Ref.current = null;
  };

  useEffect(() => () => cancelAnimationFrame(rafRef.current), []);

  // Apply weight update once per trial at ~87% of animation
  useEffect(() => {
    if (playing && animT >= 0.87 && !didUpdate) {
      const dw  = stdpDW(dtMs);
      const newW = Math.max(0.03, Math.min(0.97, weight + dw * LR));
      setWeight(newW);
      setHistory(prev => [...prev.slice(-14), { dt: dtMs, w: newW }]);
      setDidUpdate(true);
    }
  }, [animT, playing, didUpdate, dtMs, weight]);

  // ── Derived animation values ──────────────────────────────────────────────
  const tCursor = animT * T_WIN;
  const tPost   = T_PRE + dtMs;

  const preFired  = tCursor >= T_PRE;
  const postFired = tCursor >= tPost;
  const bothFired = preFired && postFired;

  const preGlow  = preFired  && tCursor < T_PRE + 45 ? Math.exp(-(tCursor - T_PRE) / 10) : 0;
  const postGlow = postFired && tCursor < tPost + 45 ? Math.exp(-(tCursor - tPost) / 10) : 0;

  const T_AP_SYN = T_PRE + 18;  // AP arrives at bouton ~18ms after pre fires
  const synGlow  = tCursor >= T_AP_SYN && tCursor < T_AP_SYN + 55
    ? Math.exp(-(tCursor - T_AP_SYN) / 16) : 0;
  const apBlob   = preFired ? Math.min(1, (tCursor - T_PRE) / 18) : -1;

  const synColor = dtMs >= 0 ? "#fb923c" : "#38bdf8";

  // ── Build trace paths ─────────────────────────────────────────────────────
  const mkTrace = (tSpike, cY) => {
    if (tCursor < 0.5) return "";
    const segs = [];
    for (let i = 0; i <= 320; i++) {
      const t = (i / 320) * T_WIN;
      if (t > tCursor + 0.4) break;
      const v = spikeV(t, tSpike);
      segs.push(`${i === 0 ? "M" : "L"} ${(TX1 + (t / T_WIN) * TW).toFixed(1)} ${(cY - v * TRACE_AMP).toFixed(1)}`);
    }
    return segs.join(" ");
  };

  const preTrace  = mkTrace(T_PRE, PRE_Y);
  const postTrace = mkTrace(tPost, POST_Y);
  const cursorX   = TX1 + (tCursor / T_WIN) * TW;

  // Spike marker x positions (dashed vertical guides)
  const markPre  = TX1 + (T_PRE / T_WIN) * TW;
  const markPost = TX1 + (Math.max(0, Math.min(T_WIN, tPost)) / T_WIN) * TW;

  // Δt arrow: draw from whichever marker is left to whichever is right
  const arrowL = Math.min(markPre, markPost);
  const arrowR = Math.max(markPre, markPost);
  const arrowY = (PRE_Y + POST_Y) / 2;

  // Live dot on STDP curve
  const dw    = stdpDW(dtMs);
  const dotX  = dtToX(dtMs);
  const dotY  = dwToY(dw);
  const dotC  = dtMs > 0 ? "#fb923c" : dtMs < 0 ? "#38bdf8" : "#94a3b8";

  // Weight bar
  const WBX = CPL, WBW = CPW, WBY = CPB + 44, WBH = 14;
  const SPARK_Y = WBY + WBH + 50;
  const SPARK_H = 34;

  // Marker / Δt overlay visibility
  const markerAlpha = animT > 0 ? Math.min(0.9, 0.4 + animT * 1.2) : 0.28;

  return (
    <div style={{
      minHeight: "100vh", background: "#060d1a",
      display: "flex", flexDirection: "column", alignItems: "center",
      padding: "32px 16px 48px",
      fontFamily: "'DM Mono','Courier New',monospace", color: "#e2e8f0",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:ital,wght@0,300;0,400;0,500;1,400&family=Playfair+Display:wght@400;600&display=swap');
        .tb { transition: all .2s; border: 1px solid; border-radius: 4px; cursor: pointer;
              padding: 6px 14px; font-family: 'DM Mono',monospace; font-size: 12px;
              letter-spacing: .05em; background: transparent; }
        .tb:hover { opacity: .85; } .tb:disabled { opacity: .5; cursor: default; }
        .badge { cursor: pointer; } .badge:hover rect { opacity: .4 !important; }
        input[type=range] { accent-color: #fbbf24; cursor: pointer; }
        a { color: #38bdf8; text-underline-offset: 3px; } a:hover { color: #7dd3fc; }
      `}</style>

      {/* Title */}
      <div style={{ textAlign: "center", marginBottom: 16 }}>
        <h1 style={{
          fontFamily: "'Playfair Display',serif",
          fontSize: "clamp(22px,4vw,32px)", fontWeight: 600, color: "#f1f5f9", margin: 0,
        }}>
          Spike-Timing Dependent Plasticity
        </h1>
        <p style={{ fontSize: 11.5, color: "#64748b", margin: "6px 0 0", letterSpacing: ".08em" }}>
          CAUSAL ORDER DETERMINES SYNAPTIC FATE · LEARNING WINDOW FROM BI & POO (1998)
        </p>
      </div>

      {/* Δt slider */}
      <div style={{
        display: "flex", gap: 12, marginBottom: 12,
        flexWrap: "wrap", justifyContent: "center", alignItems: "center",
      }}>
        <span style={{ fontSize: 10.5, color: "#64748b", letterSpacing: ".06em" }}>
          Δt = t<sub>post</sub> − t<sub>pre</sub>
        </span>
        <input type="range" min={-95} max={95} step={1} value={dtMs}
          onChange={e => { if (!playing) setDtMs(Number(e.target.value)); }}
          style={{ width: 200 }} />
        <span style={{
          fontSize: 13, fontWeight: 500, minWidth: 108,
          color: dtMs > 0 ? "#fb923c" : dtMs < 0 ? "#38bdf8" : "#94a3b8",
        }}>
          {dtMs > 0 ? "+" : ""}{dtMs} ms
          <span style={{ fontSize: 9.5, opacity: .65, marginLeft: 6 }}>
            {dtMs > 0 ? "→ LTP" : dtMs < 0 ? "→ LTD" : "Δt = 0"}
          </span>
        </span>
      </div>

      {/* Controls */}
      <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap", justifyContent: "center" }}>
        <button className="tb" onClick={fire} disabled={playing}
          style={{ borderColor: "#fbbf24", color: "#fbbf24" }}>
          {playing ? "▶ FIRING…" : "▶ FIRE PAIR"}
        </button>
        <button className="tb" onClick={reset}
          style={{ borderColor: "#f97316", color: "#f97316" }}>
          ↺ RESET
        </button>
      </div>

      {/* SVG */}
      <div style={{
        background: "#080f1e", border: "1px solid #1e293b", borderRadius: 8,
        boxShadow: "0 0 40px rgba(0,0,0,.6), inset 0 0 60px rgba(0,20,60,.3)",
        overflow: "hidden", maxWidth: "100%",
      }}>
        <svg viewBox={`0 0 ${W} ${H}`}
          style={{ display: "block", width: "min(840px,96vw)", height: "auto" }}>
          <defs>
            {[["gC","3"],["gO","3"],["gA","3"]].map(([id, sd]) => (
              <filter key={id} id={id} x="-30%" y="-30%" width="160%" height="160%">
                <feGaussianBlur stdDeviation={sd} result="b"/>
                <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
              </filter>
            ))}
          </defs>

          {/* Panel divider */}
          <line x1={443} y1={8} x2={443} y2={472} stroke="#1e293b" strokeWidth={1}/>

          {/* ══════════ NEURON DIAGRAM ══════════════════════════════════════ */}

          {/* PRE dendrites (radiating upward from soma) */}
          {[
            [NX, PRE_Y - SOMA_R,          NX,      PRE_Y - SOMA_R - 30],
            [NX, PRE_Y - SOMA_R - 16,     NX - 26, PRE_Y - SOMA_R - 38],
            [NX, PRE_Y - SOMA_R - 16,     NX + 26, PRE_Y - SOMA_R - 38],
            [NX - SOMA_R * .72, PRE_Y - SOMA_R * .72, NX - 42, PRE_Y - SOMA_R - 6],
            [NX + SOMA_R * .72, PRE_Y - SOMA_R * .72, NX + 42, PRE_Y - SOMA_R - 6],
          ].map(([x1, y1, x2, y2], i) => (
            <line key={`pd${i}`} x1={x1} y1={y1} x2={x2} y2={y2}
              stroke={preGlow > .08 ? "#22d3ee" : "#182838"}
              strokeWidth={1.2} strokeLinecap="round"
              opacity={.55 + preGlow * .45}/>
          ))}

          {/* PRE soma halo + body */}
          {preGlow > .04 && (
            <circle cx={NX} cy={PRE_Y} r={SOMA_R + 14} fill="#22d3ee" opacity={preGlow * .18}/>
          )}
          <circle cx={NX} cy={PRE_Y} r={SOMA_R}
            fill="#060d1a" stroke="#22d3ee"
            strokeWidth={preGlow > .1 ? 2 : 1.3}
            opacity={.78 + preGlow * .22}/>

          {/* Axon (pre to bouton) */}
          <line x1={NX} y1={PRE_Y + SOMA_R} x2={NX} y2={SYN_CY - 22}
            stroke={apBlob >= 0 ? "#22d3ee" : "#182838"} strokeWidth={1.4}
            opacity={.45 + Math.max(0, apBlob) * .55}/>
          {/* AP blob travelling down the axon */}
          {apBlob >= 0 && apBlob < 1 && (
            <circle cx={NX}
              cy={PRE_Y + SOMA_R + apBlob * (SYN_CY - 22 - PRE_Y - SOMA_R)}
              r={5} fill="#22d3ee" filter="url(#gC)" opacity={1 - apBlob * .4}/>
          )}

          {/* Synaptic bouton */}
          {synGlow > .04 && (
            <circle cx={NX} cy={SYN_CY - 14} r={18} fill={synColor} opacity={synGlow * .22}/>
          )}
          <circle cx={NX} cy={SYN_CY - 14} r={11}
            fill="#070d1a" stroke={synGlow > .06 ? synColor : "#334155"}
            strokeWidth={synGlow > .06 ? 2 : 1}
            opacity={.82 + synGlow * .18}/>
          {[[-5, -2], [0, -6], [5, -2]].map(([ox, oy], k) => (
            <circle key={`v${k}`} cx={NX + ox} cy={SYN_CY - 14 + oy} r={2.4}
              fill={synGlow > .1 ? synColor : "#2a3850"}
              opacity={.7 + synGlow * .3}/>
          ))}

          {/* Synaptic cleft */}
          <line x1={NX - 20} y1={SYN_CY - 3} x2={NX + 20} y2={SYN_CY - 3}
            stroke="#1e2e48" strokeWidth={1.2}/>
          {/* Postsynaptic density */}
          <line x1={NX - 24} y1={SYN_CY + 3} x2={NX + 24} y2={SYN_CY + 3}
            stroke={bothFired && synGlow > .04 ? synColor : "#1e2e48"}
            strokeWidth={bothFired && synGlow > .04 ? 2.5 : 1.8}
            opacity={bothFired && synGlow > .04 ? .9 : .55}/>

          {/* POST primary dendrite (synapse to soma) */}
          <line x1={NX} y1={SYN_CY + 5} x2={NX} y2={POST_Y - SOMA_R}
            stroke={postGlow > .08 ? "#fb923c" : "#182838"} strokeWidth={1.4}
            opacity={.5 + postGlow * .5}/>
          {/* Secondary branches off primary dendrite */}
          {[[-24, -22], [24, -22]].map(([ox, oy], i) => {
            const midY = (SYN_CY + 5 + POST_Y - SOMA_R) / 2;
            return (
              <line key={`db${i}`} x1={NX} y1={midY} x2={NX + ox} y2={midY + oy}
                stroke={postGlow > .08 ? "#fb923c" : "#182838"} strokeWidth={1}
                opacity={.45 + postGlow * .35}/>
            );
          })}

          {/* POST soma halo + body */}
          {postGlow > .04 && (
            <circle cx={NX} cy={POST_Y} r={SOMA_R + 14} fill="#fb923c" opacity={postGlow * .18}/>
          )}
          <circle cx={NX} cy={POST_Y} r={SOMA_R}
            fill="#0a0604" stroke="#fb923c"
            strokeWidth={postGlow > .1 ? 2 : 1.3}
            opacity={.78 + postGlow * .22}/>

          {/* POST basal dendrites (pointing downward/outward) */}
          {[
            [NX, POST_Y + SOMA_R,          NX,      POST_Y + SOMA_R + 28],
            [NX, POST_Y + SOMA_R + 12,     NX - 26, POST_Y + SOMA_R + 30],
            [NX, POST_Y + SOMA_R + 12,     NX + 26, POST_Y + SOMA_R + 30],
            [NX - SOMA_R * .72, POST_Y + SOMA_R * .72, NX - 42, POST_Y + SOMA_R + 8],
            [NX + SOMA_R * .72, POST_Y + SOMA_R * .72, NX + 42, POST_Y + SOMA_R + 8],
          ].map(([x1, y1, x2, y2], i) => (
            <line key={`bd${i}`} x1={x1} y1={y1} x2={x2} y2={y2}
              stroke={postGlow > .08 ? "#fb923c" : "#182838"}
              strokeWidth={1.2} strokeLinecap="round"
              opacity={.55 + postGlow * .45}/>
          ))}

          {/* Neuron labels */}
          <text x={NX} y={PRE_Y - SOMA_R - 46} textAnchor="middle"
            fill="#22d3ee" fontSize={9.5} fontFamily="'DM Mono',monospace"
            letterSpacing=".09em" opacity={.75}>PRE</text>
          <text x={NX} y={POST_Y + SOMA_R + 36} textAnchor="middle"
            fill="#fb923c" fontSize={9.5} fontFamily="'DM Mono',monospace"
            letterSpacing=".09em" opacity={.75}>POST</text>

          {/* ── Badges on neuron diagram ── */}
          <BadgeNode cx={NX - 54} cy={PRE_Y} w={40} label="PRE" color="#22d3ee" name="PRE"
            info={info} setInfo={setInfo} hovered={hovered} setHovered={setHovered}/>
          <BadgeNode cx={NX + 58} cy={SYN_CY - 2} w={62} label="SYNAPSE" color="#a78bfa" name="SYNAPSE"
            info={info} setInfo={setInfo} hovered={hovered} setHovered={setHovered}/>
          <BadgeNode cx={NX - 54} cy={POST_Y} w={44} label="POST" color="#fb923c" name="POST"
            info={info} setInfo={setInfo} hovered={hovered} setHovered={setHovered}/>

          {/* ══════════ VOLTAGE TRACES ════════════════════════════════════ */}

          {/* Baselines */}
          <line x1={TX1} y1={PRE_Y}  x2={TX2} y2={PRE_Y}  stroke="#1a2436" strokeWidth={1}/>
          <line x1={TX1} y1={POST_Y} x2={TX2} y2={POST_Y} stroke="#1a2436" strokeWidth={1}/>
          {/* Zero labels */}
          <text x={TX1 - 5} y={PRE_Y + 4}  textAnchor="end" fill="#1e3a4a" fontSize={8} fontFamily="'DM Mono',monospace">0</text>
          <text x={TX1 - 5} y={POST_Y + 4} textAnchor="end" fill="#1e3a4a" fontSize={8} fontFamily="'DM Mono',monospace">0</text>

          {/* Animated traces */}
          {preTrace  && <path d={preTrace}  fill="none" stroke="#22d3ee" strokeWidth={2} filter="url(#gC)" strokeOpacity={.9}/>}
          {postTrace && <path d={postTrace} fill="none" stroke="#fb923c" strokeWidth={2} filter="url(#gO)" strokeOpacity={.9}/>}

          {/* Spike timing markers + Δt arrow */}
          <g opacity={markerAlpha}>
            {/* PRE dashed guide */}
            <line x1={markPre} y1={PRE_Y - TRACE_AMP - 10}
              x2={markPre} y2={POST_Y + TRACE_AMP + 10}
              stroke="#22d3ee" strokeWidth={.8} strokeDasharray="3,3" opacity={.45}/>
            {/* POST dashed guide */}
            {tPost >= 0 && tPost <= T_WIN && (
              <line x1={markPost} y1={PRE_Y - TRACE_AMP - 10}
                x2={markPost} y2={POST_Y + TRACE_AMP + 10}
                stroke="#fb923c" strokeWidth={.8} strokeDasharray="3,3" opacity={.45}/>
            )}
            {/* Δt double-headed arrow */}
            {arrowR - arrowL > 4 && (
              <g opacity={.75}>
                <line x1={arrowL} y1={arrowY} x2={arrowR} y2={arrowY}
                  stroke="#fbbf24" strokeWidth={1.2}/>
                {/* Left arrowhead */}
                <polygon points={`${arrowL},${arrowY} ${arrowL + 6},${arrowY - 3} ${arrowL + 6},${arrowY + 3}`}
                  fill="#fbbf24"/>
                {/* Right arrowhead */}
                <polygon points={`${arrowR},${arrowY} ${arrowR - 6},${arrowY - 3} ${arrowR - 6},${arrowY + 3}`}
                  fill="#fbbf24"/>
                <text x={(arrowL + arrowR) / 2} y={arrowY - 9} textAnchor="middle"
                  fill="#fbbf24" fontSize={9.5} fontFamily="'DM Mono',monospace" fontWeight={500}>
                  Δt = {dtMs > 0 ? "+" : ""}{dtMs} ms
                </text>
              </g>
            )}
            {/* Δt = 0 label */}
            {arrowR - arrowL <= 4 && (
              <text x={markPre} y={arrowY - 9} textAnchor="middle"
                fill="#fbbf24" fontSize={9.5} fontFamily="'DM Mono',monospace">
                Δt = 0
              </text>
            )}
          </g>

          {/* Sweep cursor */}
          {playing && tCursor > 0 && tCursor < T_WIN && (
            <line x1={cursorX} y1={PRE_Y - TRACE_AMP - 14} x2={cursorX} y2={POST_Y + TRACE_AMP + 14}
              stroke="#ffffff" strokeWidth={.8} strokeOpacity={.14}/>
          )}

          {/* Axis label */}
          <text x={(TX1 + TX2) / 2} y={POST_Y + TRACE_AMP + 20} textAnchor="middle"
            fill="#334155" fontSize={8.5} fontFamily="'DM Mono',monospace">
            time (ms) →
          </text>

          {/* ══════════ STDP CURVE PANEL ══════════════════════════════════ */}

          {/* Zone backgrounds */}
          <rect x={CPL} y={CPT} width={CPW / 2} height={CPH} fill="#05101e" opacity={.8}/>
          <rect x={CPL + CPW / 2} y={CPT} width={CPW / 2} height={CPH} fill="#140706" opacity={.8}/>

          {/* Grid */}
          {[-75, -50, -25, 0, 25, 50, 75].map(dt => (
            <line key={dt} x1={dtToX(dt)} y1={CPT} x2={dtToX(dt)} y2={CPB}
              stroke={dt === 0 ? "#2a3a52" : "#0d1620"} strokeWidth={dt === 0 ? 1.2 : .8}/>
          ))}
          {[-0.5, 0, 0.5, 1.0].map(dw => (
            <line key={dw} x1={CPL} y1={dwToY(dw)} x2={CPR} y2={dwToY(dw)}
              stroke={dw === 0 ? "#2a3a52" : "#0d1620"} strokeWidth={dw === 0 ? 1.2 : .8}/>
          ))}

          {/* Axis tick labels */}
          {[-75, -50, -25, 0, 25, 50, 75].map(dt => (
            <text key={dt} x={dtToX(dt)} y={CPB + 14} textAnchor="middle"
              fill="#475569" fontSize={9} fontFamily="'DM Mono',monospace">{dt}</text>
          ))}
          {[-0.5, 0, 0.5, 1.0].map(dw => (
            <text key={dw} x={CPL - 8} y={dwToY(dw) + 3} textAnchor="end"
              fill="#475569" fontSize={9} fontFamily="'DM Mono',monospace">
              {dw.toFixed(1)}
            </text>
          ))}
          <text x={(CPL + CPR) / 2} y={CPB + 28} textAnchor="middle"
            fill="#334155" fontSize={9.5} fontFamily="'DM Mono',monospace">
            Δt = t_post − t_pre (ms)
          </text>
          <text x={CPL - 24} y={(CPT + CPB) / 2} textAnchor="middle"
            fill="#334155" fontSize={9.5} fontFamily="'DM Mono',monospace"
            transform={`rotate(-90,${CPL - 24},${(CPT + CPB) / 2})`}>
            ΔW (normalized)
          </text>

          {/* Zone labels */}
          <text x={(CPL + dtToX(0)) / 2} y={CPT + 20} textAnchor="middle"
            fill="#38bdf8" fontSize={8.5} fontFamily="'DM Mono',monospace" opacity={.55}>
            POST before PRE → LTD
          </text>
          <text x={(dtToX(0) + CPR) / 2} y={CPT + 20} textAnchor="middle"
            fill="#fb923c" fontSize={8.5} fontFamily="'DM Mono',monospace" opacity={.55}>
            PRE before POST → LTP
          </text>

          {/* Time-constant annotations */}
          <text x={dtToX(-52)} y={dwToY(-0.30)} textAnchor="middle"
            fill="#38bdf8" fontSize={8} fontFamily="'DM Mono',monospace" opacity={.5}>
            τ− ≈ 34ms
          </text>
          <text x={dtToX(42)} y={dwToY(0.30)} textAnchor="middle"
            fill="#fb923c" fontSize={8} fontFamily="'DM Mono',monospace" opacity={.5}>
            τ+ ≈ 17ms
          </text>

          {/* STDP curves */}
          <path d={LTD_PATH} fill="none" stroke="#38bdf8" strokeWidth={2.2}
            filter="url(#gC)" strokeOpacity={.9}/>
          <path d={LTP_PATH} fill="none" stroke="#fb923c" strokeWidth={2.2}
            filter="url(#gO)" strokeOpacity={.9}/>

          {/* Live dot on curve */}
          <circle cx={dotX} cy={dotY} r={8} fill={dotC} opacity={.2}/>
          <circle cx={dotX} cy={dotY} r={4.5} fill={dotC}
            filter={`url(#g${dtMs > 0 ? "O" : dtMs < 0 ? "C" : "A"})`}/>
          {/* Crosshairs to axes */}
          <line x1={dotX} y1={dotY} x2={dotX} y2={CPB}
            stroke={dotC} strokeWidth={.8} strokeDasharray="3,3" opacity={.35}/>
          <line x1={dotX} y1={dotY} x2={CPL} y2={dotY}
            stroke={dotC} strokeWidth={.8} strokeDasharray="3,3" opacity={.35}/>
          {/* ΔW readout — sits above the plot frame */}
          <text x={CPR - 8} y={CPT - 8} textAnchor="end"
            fill={dotC} fontSize={10.5} fontFamily="'DM Mono',monospace" fontWeight={500}>
            ΔW = {dw >= 0 ? "+" : ""}{dw.toFixed(3)}
          </text>

          {/* Curve badges */}
          <BadgeNode cx={dtToX(-58)} cy={CPT + 38} w={40} label="LTD" color="#38bdf8" name="LTD"
            info={info} setInfo={setInfo} hovered={hovered} setHovered={setHovered}/>
          <BadgeNode cx={CPL + CPW / 2} cy={CPT + 38} w={62} label="WINDOW" color="#fbbf24" name="WINDOW"
            info={info} setInfo={setInfo} hovered={hovered} setHovered={setHovered}/>
          <BadgeNode cx={dtToX(58)} cy={CPT + 38} w={40} label="LTP" color="#fb923c" name="LTP"
            info={info} setInfo={setInfo} hovered={hovered} setHovered={setHovered}/>

          {/* Plot border */}
          <rect x={CPL} y={CPT} width={CPW} height={CPH}
            fill="none" stroke="#1e293b" strokeWidth={1}/>

          {/* ══════════ SYNAPTIC WEIGHT BAR ═══════════════════════════════ */}
          <text x={WBX} y={WBY - 7} fill="#475569" fontSize={8.5}
            fontFamily="'DM Mono',monospace" letterSpacing=".08em">
            SYNAPTIC WEIGHT
          </text>
          {/* Track */}
          <rect x={WBX} y={WBY} width={WBW} height={WBH} rx={3}
            fill="#090f1e" stroke="#1e293b" strokeWidth={1}/>
          {/* Fill */}
          <rect x={WBX} y={WBY} width={weight * WBW} height={WBH} rx={3}
            fill={weight >= .5 ? "#fb923c" : "#38bdf8"} opacity={.65}/>
          {/* Neutral (baseline) tick */}
          <line x1={WBX + .5 * WBW} y1={WBY - 3} x2={WBX + .5 * WBW} y2={WBY + WBH + 3}
            stroke="#475569" strokeWidth={1.2}/>
          {/* Current weight cursor */}
          <line x1={WBX + weight * WBW} y1={WBY - 4} x2={WBX + weight * WBW} y2={WBY + WBH + 4}
            stroke="#f1f5f9" strokeWidth={2}/>
          {/* End labels */}
          {[["DEPRESSED", "start", 3], ["BASELINE", "middle", WBW / 2], ["POTENTIATED", "end", WBW - 3]].map(
            ([t, anchor, ox]) => (
              <text key={t} x={WBX + ox} y={WBY + WBH + 14} textAnchor={anchor}
                fill="#334155" fontSize={8.5} fontFamily="'DM Mono',monospace">{t}</text>
            )
          )}

          {/* ══════════ TRIAL HISTORY SPARKLINE ════════════════════════════ */}
          {history.length > 0 && (
            <g>
              <text x={WBX} y={SPARK_Y - 7} fill="#334155" fontSize={8.5}
                fontFamily="'DM Mono',monospace" letterSpacing=".06em">
                TRIAL HISTORY ({history.length})
              </text>
              {/* Bounds */}
              <line x1={WBX} y1={SPARK_Y} x2={WBX} y2={SPARK_Y + SPARK_H}
                stroke="#1e293b" strokeWidth={.8}/>
              <line x1={WBX} y1={SPARK_Y + SPARK_H / 2} x2={WBX + WBW} y2={SPARK_Y + SPARK_H / 2}
                stroke="#1e293b" strokeWidth={.8} strokeDasharray="2,4"/>
              {/* Connecting line */}
              {history.length > 1 && (
                <path
                  d={history.map((h, i) =>
                    `${i === 0 ? "M" : "L"} ${(WBX + (i / (history.length - 1)) * WBW).toFixed(1)} ${(SPARK_Y + (1 - h.w) * SPARK_H).toFixed(1)}`
                  ).join(" ")}
                  fill="none" stroke="#475569" strokeWidth={1} opacity={.45}/>
              )}
              {/* Dots */}
              {history.map((h, i) => (
                <circle key={i}
                  cx={WBX + (history.length > 1 ? (i / (history.length - 1)) * WBW : WBW / 2)}
                  cy={SPARK_Y + (1 - h.w) * SPARK_H}
                  r={3.5} fill={h.dt > 0 ? "#fb923c" : "#38bdf8"} opacity={.82}/>
              ))}
            </g>
          )}
        </svg>
      </div>

      {/* Info card */}
      {info && (() => {
        const c = INFO[info];
        return (
          <div style={{
            marginTop: 18, background: "#0d1b2e",
            border: `1px solid ${c.color}44`, borderRadius: 8,
            padding: "16px 22px", maxWidth: 600, width: "100%",
            boxShadow: `0 0 24px ${c.color}22`,
          }}>
            <div style={{
              display: "flex", justifyContent: "space-between",
              alignItems: "baseline", marginBottom: 8,
            }}>
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
        marginTop: 22, maxWidth: 640, fontSize: 12, color: "#64748b",
        lineHeight: 1.8, textAlign: "center",
      }}>
        <p style={{ margin: "0 0 8px" }}>
          STDP adds temporal precision to Hebb's rule: not just "neurons that fire together, wire
          together," but <em>the order matters</em>. Pre before post (Δt &gt; 0) implements a causal
          detection rule, strengthening synapses that predictively drive the postsynaptic cell. Post
          before pre reverses this, weakening the synapse. Drag the slider, fire repeatedly, and
          watch the weight accumulate or decay.
        </p>
        <p style={{ margin: 0 }}>
          References:{" "}
          <a href="https://doi.org/10.1523/JNEUROSCI.18-24-10464.1998" target="_blank" rel="noopener">
            Bi &amp; Poo (1998)
          </a>{" · "}
          <a href="https://doi.org/10.1126/science.275.5297.213" target="_blank" rel="noopener">
            Markram et al. (1997)
          </a>{" · "}
          <a href="https://doi.org/10.1016/j.neuron.2004.09.007" target="_blank" rel="noopener">
            Dan &amp; Poo (2004)
          </a>{" · "}
          <a href="https://doi.org/10.1038/78829" target="_blank" rel="noopener">
            Song, Miller &amp; Abbott (2000)
          </a>
        </p>
      </div>
    </div>
  );
}

// ─── Reusable badge node ──────────────────────────────────────────────────────
function BadgeNode({ cx, cy, w, label, color, name, info, setInfo, hovered, setHovered }) {
  const isActive = hovered === name || info === name;
  return (
    <g className="badge"
      onClick={() => setInfo(info === name ? null : name)}
      onMouseEnter={() => setHovered(name)}
      onMouseLeave={() => setHovered(null)}>
      <rect x={cx - w / 2} y={cy - 9} width={w} height={17} rx={3}
        fill={color} opacity={isActive ? .34 : .16}
        stroke={color} strokeWidth={.6} strokeOpacity={.6}/>
      <text x={cx} y={cy + 3} textAnchor="middle" fill={color}
        fontSize={10} fontWeight={500}
        fontFamily="'DM Mono',monospace" letterSpacing=".04em">
        {label}
      </text>
    </g>
  );
}
