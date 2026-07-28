import { useState, useEffect, useRef, useCallback } from "react";

// ─── Layout ──────────────────────────────────────────────────────────────────
const W = 860, H = 560, CX = 430;

// ─── Palette (lab-notebook) ───────────────────────────────────────────────────
const C = {
  ink: "#1f2025", mut: "#6b6354", faint: "#8a8170", border: "#c8bea5",
  glu: "#b8412c",   // glutamate
  ca: "#c9941a",    // calcium / NMDA
  camk: "#2a5a8a",  // CaMKII
  casc: "#7a5a9a",  // PKA / ERK cascade
  creb: "#3a6a5a",  // CREB / nucleus / stable
  prot: "#a85a2a",  // new protein / labile
  block: "#9a2a2a", // inhibitor / amnesia
  ampa: "#9a7b3a",
};

// ─── Stages ───────────────────────────────────────────────────────────────────
const STAGES = [
  { id: "acquire",      label: "ACQUIRE",       title: "Acquisition · glutamate release and NMDA-gated Ca²⁺ influx",            dur: 2600 },
  { id: "early",        label: "EARLY-LTP",     title: "Early LTP · CaMKII activation and AMPA insertion",                     dur: 2200 },
  { id: "consolidate",  label: "CONSOLIDATE",   title: "Cellular consolidation · PKA/ERK → CREB → new protein (late LTP)",     dur: 3200 },
  { id: "stable",       label: "STABLE",        title: "Consolidated trace · structurally stabilized",                         dur: 1600 },
  { id: "retrieve",     label: "RETRIEVE",      title: "Reactivation · retrieval returns the trace to a labile state",         dur: 2200 },
  { id: "reconsolidate",label: "RECONSOLIDATE", title: "Reconsolidation · de novo synthesis restabilizes the trace",          dur: 3200 },
];

// ─── Component info (clickable badges) ────────────────────────────────────────
const INFO = {
  NMDA: {
    full: "NMDA receptor", color: C.ca,
    body: "An N-methyl-D-aspartate receptor acts as a coincidence detector. Its channel is blocked by Mg²⁺ at rest and opens only when glutamate binds while the postsynaptic membrane is already depolarized, admitting Ca²⁺. This Hebbian gating links pre- and postsynaptic activity and triggers long-term potentiation (LTP), the leading synaptic model of memory.",
    refs: [{ text: "Bliss & Collingridge (1993) Nature", url: "https://doi.org/10.1038/361031a0" }],
  },
  CaMKII: {
    full: "CaMKII", color: C.camk,
    body: "Ca²⁺/calmodulin-dependent protein kinase II. Calcium entry activates CaMKII, which autophosphorylates and becomes persistently active, then phosphorylates and drives insertion of AMPA receptors. This underlies early LTP, lasts minutes to a few hours, and requires no new protein synthesis.",
    refs: [{ text: "Lisman, Schulman & Cline (2002) Nat. Rev. Neurosci.", url: "https://doi.org/10.1038/nrn753" }],
  },
  PKAERK: {
    full: "PKA · ERK cascade", color: C.casc,
    body: "cAMP-activated PKA and the MAPK/ERK pathway relay the synaptic signal from the spine to the nucleus, converting a local, transient change into a transcriptional one. This step gates the transition from early, protein-synthesis-independent LTP to late, protein-synthesis-dependent LTP.",
    refs: [{ text: "Kandel (2001) Science", url: "https://doi.org/10.1126/science.1067020" }],
  },
  CREB: {
    full: "CREB", color: C.creb,
    body: "cAMP-response-element-binding protein, a transcription factor. Once phosphorylated, CREB binds CRE sites and switches on the genes whose products consolidate the trace. Mice lacking CREB form normal short-term memory but are profoundly deficient in long-term memory.",
    refs: [
      { text: "Bourtchuladze et al. (1994) Cell", url: "https://doi.org/10.1016/0092-8674(94)90400-6" },
      { text: "Kandel (2001) Science", url: "https://doi.org/10.1126/science.1067020" },
    ],
  },
  IEGs: {
    full: "Immediate-early genes", color: C.prot,
    body: "CREB-driven transcription yields immediate-early gene products such as Arc/Arg3.1 and Zif268/Egr1, which build new synaptic structure and stabilize the trace (late LTP). Notably, Zif268 is required specifically for reconsolidation but not consolidation, dissociating the two processes at the molecular level.",
    refs: [
      { text: "Lee, Everitt & Thomas (2004) Science", url: "https://doi.org/10.1126/science.1095760" },
      { text: "Kandel (2001) Science", url: "https://doi.org/10.1126/science.1067020" },
    ],
  },
  ANISO: {
    full: "Anisomycin · protein-synthesis inhibitor", color: C.block,
    body: "Anisomycin blocks translation. Given during the post-acquisition window it prevents consolidation; given after retrieval it prevents reconsolidation, erasing the reactivated memory. Critically, without reactivation the same inhibitor leaves a consolidated memory intact, a result not predicted by classic consolidation theory.",
    refs: [
      { text: "Nader, Schafe & LeDoux (2000) Nature", url: "https://doi.org/10.1038/35021052" },
      { text: "McGaugh (2000) Science", url: "https://doi.org/10.1126/science.287.5451.248" },
    ],
  },
};

// ─── Math ─────────────────────────────────────────────────────────────────────
const ease = (t) => (t < 0.5 ? 4*t*t*t : 1 - Math.pow(-2*t+2,3)/2);
const lerp = (a,b,t) => a + (b-a)*t;
const clamp = (v,a,b) => Math.max(a, Math.min(b, v));

function strength(stageId, e, aniso, consol) {
  switch (stageId) {
    case "acquire":       return lerp(0.08, 0.45, e);
    case "early":         return lerp(0.45, 0.60, e);
    case "consolidate":   return aniso ? lerp(0.60, 0.12, e) : lerp(0.60, 1.0, e);
    case "stable":        return consol;
    case "retrieve":      return consol;
    case "reconsolidate": return aniso ? lerp(consol, 0.12, e) : consol;
    default: return 0.08;
  }
}

function spinePath(halfW) {
  const topY = 196, neckTop = 300, neckBot = 320, nh = 34, dome = 300;
  return `M ${CX-halfW} ${topY} L ${CX+halfW} ${topY}`
    + ` C ${CX+halfW+12} 250, ${CX+nh+24} ${dome}, ${CX+nh} ${neckTop}`
    + ` L ${CX+nh} ${neckBot} L ${CX-nh} ${neckBot} L ${CX-nh} ${neckTop}`
    + ` C ${CX-nh-24} ${dome}, ${CX-halfW-12} 250, ${CX-halfW} ${topY} Z`;
}

function ampaXs(S) {
  const xs = [CX-70, CX-30];
  if (S > 0.5) xs.push(CX+92);
  if (S > 0.75) xs.push(CX-112);
  if (S > 0.9) xs.push(CX+8);
  return xs;
}

const CAPTION = {
  acquire:      "Coincident pre- and postsynaptic activity opens NMDA receptors; Ca²⁺ enters the spine.",
  early:        "CaMKII drives AMPA insertion. Early LTP needs no new protein and is short-lived.",
  consolidate_ok:    "Signaling reaches the nucleus; CREB switches on genes whose protein products stabilize the synapse.",
  consolidate_block: "Anisomycin blocks translation: without new protein, the trace fails to consolidate.",
  stable_ok:    "The trace is consolidated and structurally stable.",
  stable_block: "An inhibitor now has no effect: an un-reactivated consolidated trace is insensitive (the Nader control).",
  retrieve:     "Retrieval reactivates the trace and briefly returns it to a labile, protein-synthesis-dependent state.",
  reconsolidate_ok:    "New protein synthesis restabilizes the reactivated trace (reconsolidation).",
  reconsolidate_block: "Anisomycin during the reconsolidation window erases the reactivated memory.",
};

// ─── Main component ────────────────────────────────────────────────────────────
export default function MemoryConsolidationApp() {
  const [stageIdx, setStageIdx] = useState(0);
  const [subProg, setSubProg]   = useState(0);
  const [playing, setPlaying]   = useState(false);
  const [aniso, setAniso]       = useState(false);
  const [info, setInfo]         = useState(null);
  const [hovered, setHovered]   = useState(null);

  const rafRef = useRef(null);
  const stageStartRef = useRef(null);
  const stageRef = useRef(0);
  const anisoRef = useRef(false);
  const consolRef = useRef(1.0); // strength a consolidated trace carries into stable/retrieve/reconsolidate

  useEffect(() => { anisoRef.current = aniso; }, [aniso]);

  const animate = useCallback((ts) => {
    if (!stageStartRef.current) stageStartRef.current = ts;
    const elapsed = ts - stageStartRef.current;
    const dur = STAGES[stageRef.current].dur;
    const p = Math.min(elapsed / dur, 1);
    setSubProg(p);
    if (p < 1) {
      rafRef.current = requestAnimationFrame(animate);
    } else if (stageRef.current < STAGES.length - 1) {
      // fix the consolidation outcome when leaving the consolidate stage
      if (STAGES[stageRef.current].id === "consolidate") {
        consolRef.current = anisoRef.current ? 0.12 : 1.0;
      }
      stageRef.current += 1;
      setStageIdx(stageRef.current);
      stageStartRef.current = ts;
      setSubProg(0);
      rafRef.current = requestAnimationFrame(animate);
    } else {
      setPlaying(false);
    }
  }, []);

  const play = () => {
    cancelAnimationFrame(rafRef.current);
    stageRef.current = 0;
    consolRef.current = 1.0;
    setStageIdx(0);
    setSubProg(0);
    stageStartRef.current = null;
    setPlaying(true);
    rafRef.current = requestAnimationFrame(animate);
  };

  const reset = () => {
    cancelAnimationFrame(rafRef.current);
    stageRef.current = 0;
    consolRef.current = 1.0;
    setStageIdx(0);
    setSubProg(0);
    setPlaying(false);
    stageStartRef.current = null;
  };

  const jumpTo = (idx) => {
    cancelAnimationFrame(rafRef.current);
    if (idx <= 2) consolRef.current = 1.0;                              // fresh / re-derivable
    else if (idx === 3) consolRef.current = anisoRef.current ? 0.12 : 1.0; // stable fixes the outcome
    // retrieve / reconsolidate keep the carried value
    stageRef.current = idx;
    setStageIdx(idx);
    setSubProg(1);
    setPlaying(false);
    stageStartRef.current = null;
  };

  useEffect(() => () => cancelAnimationFrame(rafRef.current), []);

  // ─── Derived ────────────────────────────────────────────────────────────────
  const stageId = STAGES[stageIdx].id;
  const e = ease(subProg);
  const consol = consolRef.current;
  const S = clamp(strength(stageId, e, aniso, consol), 0, 1);
  const halfW = 96 + 38 * S;

  const showGlu = stageId === "acquire" || stageId === "retrieve";
  const showCa  = stageId === "acquire" || stageId === "retrieve";
  const camkOn  = ["early","consolidate","stable","retrieve","reconsolidate"].includes(stageId);
  const cascadeOn = stageId === "consolidate" || stageId === "reconsolidate";
  const psWindow = stageId === "consolidate" || stageId === "reconsolidate";
  const proteinOn = psWindow && !aniso;
  const blocked = psWindow && aniso;
  const crebP = psWindow;
  const showHalo = stageId === "retrieve" || (stageId === "reconsolidate" && (aniso || e < 0.85));

  // state tag
  let tag;
  if (blocked) {
    tag = S < 0.2 ? ["TRACE LOST", C.block]
        : [(stageId === "reconsolidate" ? "RECONSOLIDATION BLOCKED" : "CONSOLIDATION BLOCKED"), C.block];
  } else if (stageId === "acquire" || stageId === "early") {
    tag = ["LABILE", C.prot];
  } else if (stageId === "consolidate") {
    tag = e < 0.9 ? ["CONSOLIDATING", C.casc] : ["STABLE", C.creb];
  } else if (stageId === "stable") {
    tag = ["STABLE", C.creb];
  } else if (stageId === "retrieve") {
    tag = ["LABILE · REACTIVATED", C.prot];
  } else {
    tag = e < 0.9 ? ["RESTABILIZING", C.casc] : ["STABLE", C.creb];
  }

  // caption
  let caption;
  if (stageId === "consolidate")        caption = aniso ? CAPTION.consolidate_block : CAPTION.consolidate_ok;
  else if (stageId === "stable")        caption = aniso ? CAPTION.stable_block : CAPTION.stable_ok;
  else if (stageId === "reconsolidate") caption = aniso ? CAPTION.reconsolidate_block : CAPTION.reconsolidate_ok;
  else                                  caption = CAPTION[stageId];

  const barX = 255, barW = 350, barY = 512;
  const gut = (y, t) => (
    <text x={18} y={y} fontSize={9} fill={C.faint} fontFamily="'DM Mono',monospace" letterSpacing=".06em">{t}</text>
  );

  return (
    <div style={{
      minHeight: "100vh", background: "#f5efe2",
      display: "flex", flexDirection: "column", alignItems: "center",
      padding: "32px 16px 48px", fontFamily: "'DM Mono','Courier New',monospace", color: C.ink,
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:ital,wght@0,300;0,400;0,500;1,400&family=Playfair+Display:ital,wght@0,400;0,600;1,400&display=swap');
        .lb-btn { transition: all .18s; border: 1px solid; border-radius: 3px; cursor: pointer; padding: 6px 14px; font-family: 'DM Mono',monospace; font-size: 12px; letter-spacing: .06em; background: transparent; }
        .lb-btn:hover { background: rgba(31,32,37,.06); }
        .lb-btn:disabled { opacity: .45; cursor: default; }
        .stage-chip { transition: all .18s; cursor: pointer; }
        .stage-chip:hover { opacity: .85; }
        .badge { cursor: pointer; transition: all .15s; }
        .badge:hover rect { opacity: .35 !important; }
        a { color: #2a5a8a; text-underline-offset: 3px; }
        a:hover { color: #1a4a7a; }
      `}</style>

      {/* Title */}
      <div style={{ textAlign: "center", marginBottom: 18 }}>
        <h1 style={{ fontFamily: "'Playfair Display',serif", fontSize: "clamp(22px,4vw,32px)", fontWeight: 600, color: C.ink, margin: 0 }}>
          Consolidation &amp; Reconsolidation · The Labile Synapse
        </h1>
        <p style={{ fontSize: 11, color: C.mut, margin: "6px 0 0", letterSpacing: ".1em" }}>
          SYNAPTIC CONSOLIDATION — LTP, PROTEIN SYNTHESIS, AND THE RECONSOLIDATION WINDOW
        </p>
      </div>

      {/* Controls */}
      <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap", justifyContent: "center" }}>
        <button className="lb-btn" onClick={play} disabled={playing} style={{ borderColor: C.camk, color: C.camk }}>
          {playing ? "▶ PLAYING…" : "▶ PLAY MECHANISM"}
        </button>
        <button className="lb-btn" onClick={reset} style={{ borderColor: C.prot, color: C.prot }}>↺ RESET</button>
        <button className="lb-btn" onClick={() => setAniso(a => !a)}
          style={{ borderColor: C.block, color: aniso ? "#f5efe2" : C.block, background: aniso ? C.block : "transparent" }}>
          {aniso ? "⊘ ANISOMYCIN: ON" : "○ ANISOMYCIN: OFF"}
        </button>
      </div>

      {/* Stage scrubber */}
      <div style={{ display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap", justifyContent: "center" }}>
        {STAGES.map((s, i) => {
          const active = i === stageIdx;
          const done = i < stageIdx || (i === stageIdx && subProg >= 1);
          return (
            <div key={s.id} className="stage-chip" onClick={() => jumpTo(i)}
              style={{
                fontSize: 10, letterSpacing: ".08em", padding: "5px 10px",
                border: `1px solid ${active ? C.ink : done ? C.faint : C.border}`,
                background: active ? C.ink : done ? "#e8dfc6" : "transparent",
                color: active ? "#f5efe2" : done ? "#3a3a45" : C.faint, borderRadius: 2,
              }}>
              {String(i + 1).padStart(2,"0")} · {s.label}
            </div>
          );
        })}
      </div>

      {/* SVG */}
      <div style={{
        background: "#faf5e8", border: "1px solid #c8bea5", borderRadius: 4,
        boxShadow: "0 1px 0 rgba(31,32,37,.04), 0 0 32px rgba(31,32,37,.06)",
        overflow: "hidden", maxWidth: "100%", position: "relative",
      }}>
        <svg viewBox={`0 0 ${W} ${H}`} style={{ display: "block", width: "min(860px,96vw)", height: "auto" }}>
          <defs>
            <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#e3d9bf" strokeWidth=".5" />
            </pattern>
          </defs>

          <rect x="0" y="0" width={W} height={H} fill="url(#grid)" opacity=".55" />

          {/* Stage title */}
          <text x={W/2} y={34} textAnchor="middle" fontFamily="'Playfair Display',serif"
            fontSize={17} fontStyle="italic" fill={C.ink}>{STAGES[stageIdx].title}</text>

          {/* Left-gutter region labels */}
          {gut(110, "PRESYNAPTIC")}{gut(122, "TERMINAL")}
          {gut(176, "SYNAPTIC CLEFT")}
          {gut(250, "DENDRITIC")}{gut(262, "SPINE")}
          {gut(406, "NUCLEUS")}{gut(418, "· SOMA")}

          {/* Presynaptic terminal */}
          <rect x="255" y="58" width="350" height="92" rx="40" fill="#e7dcc4" fillOpacity="0.6" stroke={C.mut} strokeWidth="1" />
          {[330,366,402,498,534].map((x,i) => <circle key={`v${i}`} cx={x} cy={120} r={7} fill="#cdbf9c" opacity={0.9} />)}
          {[384,452].map((x,i) => <circle key={`vd${i}`} cx={x} cy={140} r={7} fill={showGlu ? C.glu : "#cdbf9c"} opacity={showGlu ? 0.85 : 0.7} />)}
          <line x1="275" y1="150" x2="585" y2="150" stroke={C.mut} strokeWidth="2" />

          {/* Cleft */}
          <rect x="275" y="151" width="310" height="44" fill="#efe6d0" opacity="0.4" />
          {showGlu && (() => {
            const gy = lerp(152, 190, e);
            return (<g>
              {[384,420,452].map((x,i) => <circle key={`g${i}`} cx={x} cy={gy + (i%2?6:-2)} r={4} fill={C.glu} opacity={0.9} />)}
              <text x={CX+96} y={172} fontSize={9} fill={C.glu} fontFamily="'DM Mono',monospace">Glu</text>
            </g>);
          })()}

          {/* Spine */}
          <path d={spinePath(halfW)} fill="#e3e9df" fillOpacity="0.55" stroke={C.creb} strokeWidth="1.4" />
          {showHalo && <path d={spinePath(halfW+7)} fill="none" stroke={C.glu} strokeWidth="1" strokeDasharray="4,4" opacity="0.7" />}
          <line x1={CX-halfW} y1="196" x2={CX+halfW} y2="196" stroke={C.creb} strokeWidth="2" />

          {/* AMPA receptors */}
          {ampaXs(S).map((x,i) => (
            <rect key={`a${i}`} x={x-6} y="189" width="12" height="14" rx="2" fill={C.ampa} fillOpacity="0.8" stroke={C.ampa} strokeWidth="0.6" />
          ))}
          {/* NMDA receptor */}
          <rect x={CX+40-7} y="187" width="14" height="16" rx="2" fill={C.ca} fillOpacity="0.85" stroke={C.ca} strokeWidth="0.8" />
          <BadgeNode cx={CX+40} cy={178} w={46} label="NMDA" color={C.ca} name="NMDA"
            setInfo={setInfo} info={info} hovered={hovered} setHovered={setHovered} active />

          {/* Ca²⁺ influx */}
          {showCa && (<g>
            {[0,1,2,3].map(i => {
              const yy = lerp(210, 286, clamp(e*1.2 - i*0.12, 0, 1));
              return <circle key={`c${i}`} cx={CX+40 + (i%2?6:-5)} cy={yy} r={3.4} fill={C.ca} opacity={0.9} />;
            })}
            <text x={CX+62} y={232} fontSize={9} fill={C.ca} fontFamily="'DM Mono',monospace">Ca²⁺</text>
          </g>)}

          {/* CaMKII */}
          <BadgeNode cx={CX-58} cy={252} w={56} label="CaMKII" color={camkOn ? C.camk : C.faint} name="CaMKII"
            setInfo={setInfo} info={info} hovered={hovered} setHovered={setHovered} active={camkOn} />

          {/* Neck → nucleus cascade */}
          <path d={`M ${CX} 320 L ${CX} 352`} stroke={C.mut} strokeWidth="1" strokeDasharray="3,3" opacity="0.6" />
          <BadgeNode cx={CX+92} cy={332} w={70} label="PKA · ERK" color={cascadeOn ? C.casc : C.faint} name="PKAERK"
            setInfo={setInfo} info={info} hovered={hovered} setHovered={setHovered} active={cascadeOn} />
          {cascadeOn && [0,1,2].map(i => {
            const yy = lerp(316, 356, clamp(e - i*0.18, 0, 1));
            return <circle key={`cas${i}`} cx={CX} cy={yy} r={3.4} fill={C.casc} opacity={0.9} />;
          })}

          {/* Nucleus */}
          <ellipse cx={CX} cy="410" rx="158" ry="56" fill="#dfe7e1" fillOpacity="0.55" stroke={C.creb} strokeWidth="1.2" />
          <line x1="300" y1="408" x2="560" y2="408" stroke={C.mut} strokeWidth="1.4" />
          <line x1="300" y1="414" x2="560" y2="414" stroke={C.mut} strokeWidth="1.4" />
          <rect x="406" y="405" width="48" height="12" fill={C.creb} fillOpacity="0.25" stroke={C.creb} strokeWidth="0.6" />
          <text x="430" y="429" textAnchor="middle" fontSize={8} fill={C.creb} fontFamily="'DM Mono',monospace">CRE</text>
          <BadgeNode cx={CX} cy={394} w={52} label="CREB" color={C.creb} name="CREB"
            setInfo={setInfo} info={info} hovered={hovered} setHovered={setHovered} active />
          {crebP && (<g>
            <circle cx={CX+32} cy={388} r={7} fill="#fff" stroke={C.block} strokeWidth="1" />
            <text x={CX+32} y={391} textAnchor="middle" fontSize={9} fill={C.block} fontFamily="'DM Mono',monospace">P</text>
          </g>)}
          <BadgeNode cx={CX} cy={448} w={124} label="IEGs · Arc · Zif268" color={C.prot} name="IEGs"
            setInfo={setInfo} info={info} hovered={hovered} setHovered={setHovered} active />

          {/* Protein-synthesis output / block */}
          {proteinOn && (<g>
            {[0,1,2].map(i => {
              const yy = lerp(356, 312, clamp(e - i*0.18, 0, 1));
              return <circle key={`p${i}`} cx={CX-14 + i*14} cy={yy} r={3.6} fill={C.prot} opacity={0.9} />;
            })}
            <text x={CX-44} y={360} fontSize={9} fill={C.prot} fontFamily="'DM Mono',monospace">↑ new protein</text>
          </g>)}
          {blocked && (
            <g stroke={C.block} strokeWidth="2.4">
              <line x1={CX-12} y1="338" x2={CX+12} y2="362" />
              <line x1={CX+12} y1="338" x2={CX-12} y2="362" />
            </g>
          )}

          {/* Anisomycin tag (clickable) */}
          {aniso && (
            <g className="badge" onClick={() => setInfo(info?.name === "ANISO" ? null : { name: "ANISO", ...INFO.ANISO })}>
              <circle cx="638" cy="404" r="9" fill="none" stroke={C.block} strokeWidth="1.4" />
              <line x1="632" y1="410" x2="644" y2="398" stroke={C.block} strokeWidth="1.4" />
              <text x="652" y="408" fontSize={10} fill={C.block} fontFamily="'DM Mono',monospace" letterSpacing=".04em">ANISOMYCIN</text>
            </g>
          )}

          {/* State bar */}
          <text x={barX} y={502} fontSize={9} fill={C.mut} fontFamily="'DM Mono',monospace" letterSpacing=".05em">MEMORY STRENGTH</text>
          <text x={barX+barW} y={502} textAnchor="end" fontSize={10} fill={tag[1]} fontFamily="'DM Mono',monospace" letterSpacing=".05em">{tag[0]}</text>
          <rect x={barX} y={barY} width={barW} height="12" rx="6" fill="#e8dfc6" stroke={C.border} strokeWidth="0.6" />
          <rect x={barX} y={barY} width={barW*S} height="12" rx="6" fill={tag[1]} fillOpacity="0.8" />

          {/* Frame */}
          <rect x="4" y="4" width={W-8} height={H-8} fill="none" stroke={C.ink} strokeWidth="0.5" opacity="0.25" />
        </svg>
      </div>

      {/* Dynamic caption */}
      <div style={{ marginTop: 12, maxWidth: 660, textAlign: "center", fontSize: 12.5, lineHeight: 1.6, color: "#3a3a45", minHeight: 40 }}>
        {caption}
      </div>

      {/* Info card */}
      {info && (
        <div style={{
          marginTop: 8, background: "#faf5e8", border: `1px solid ${info.color}66`, borderRadius: 4,
          padding: "16px 22px", maxWidth: 600, width: "100%", boxShadow: `0 0 16px ${info.color}22`,
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
            <span style={{ fontFamily: "'Playfair Display',serif", fontSize: 19, color: info.color, fontWeight: 600 }}>{info.full}</span>
            <button onClick={() => setInfo(null)} style={{ background: "none", border: "none", color: C.faint, cursor: "pointer", fontSize: 16 }}>✕</button>
          </div>
          <p style={{ fontSize: 12, lineHeight: 1.7, color: "#3a3a45", margin: "0 0 10px" }}>{info.body}</p>
          {info.refs && (
            <div style={{ fontSize: 11, color: C.mut, letterSpacing: ".05em" }}>
              REFS:{" "}
              {info.refs.map((r, i) => (
                <span key={i}>{i > 0 ? " · " : ""}<a href={r.url} target="_blank" rel="noopener">{r.text}</a></span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Footer */}
      <div style={{ marginTop: 22, maxWidth: 680, fontSize: 12, color: C.mut, lineHeight: 1.8, textAlign: "center" }}>
        <p style={{ margin: "0 0 8px" }}>
          A new memory is at first labile. NMDA-gated Ca²⁺ entry activates CaMKII and inserts AMPA receptors
          (early LTP, no new protein), while PKA and ERK carry the signal to the nucleus, where CREB drives
          the genes whose products structurally stabilize the synapse (late LTP, consolidation). Retrieval can
          return a consolidated trace to a labile state that again requires protein synthesis to persist
          (reconsolidation). Blocking translation with anisomycin in either window prevents stabilization;
          without reactivation it does not.
        </p>
        <p style={{ margin: "0 0 8px", fontStyle: "italic", color: C.faint }}>
          Schematic; not to scale. Click any badge to inspect a component.
        </p>
        <p style={{ margin: 0 }}>
          References:{" "}
          <a href="https://doi.org/10.1038/361031a0" target="_blank" rel="noopener">Bliss &amp; Collingridge (1993)</a>{" · "}
          <a href="https://doi.org/10.1038/nrn753" target="_blank" rel="noopener">Lisman et al. (2002)</a>{" · "}
          <a href="https://doi.org/10.1016/0092-8674(94)90400-6" target="_blank" rel="noopener">Bourtchuladze et al. (1994)</a>{" · "}
          <a href="https://doi.org/10.1126/science.1067020" target="_blank" rel="noopener">Kandel (2001)</a>{" · "}
          <a href="https://doi.org/10.1126/science.287.5451.248" target="_blank" rel="noopener">McGaugh (2000)</a>{" · "}
          <a href="https://doi.org/10.1038/35021052" target="_blank" rel="noopener">Nader, Schafe &amp; LeDoux (2000)</a>{" · "}
          <a href="https://doi.org/10.1126/science.1095760" target="_blank" rel="noopener">Lee, Everitt &amp; Thomas (2004)</a>{" · "}
          <a href="https://doi.org/10.1038/nrn2090" target="_blank" rel="noopener">Tronson &amp; Taylor (2007)</a>{" · "}
          <a href="https://doi.org/10.1016/j.neuron.2004.09.003" target="_blank" rel="noopener">Dudai &amp; Eisenberg (2004)</a>
        </p>
      </div>
    </div>
  );
}

// ─── Reusable badge ─────────────────────────────────────────────────────────────
function BadgeNode({ cx, cy, w, label, color, name, setInfo, info, hovered, setHovered, active }) {
  const isActive = hovered === name || info?.name === name;
  return (
    <g className="badge"
      onClick={() => setInfo(info?.name === name ? null : { name, ...INFO[name] })}
      onMouseEnter={() => setHovered(name)}
      onMouseLeave={() => setHovered(null)}
      opacity={active ? 1 : 0.55}>
      <rect x={cx - w/2} y={cy - 9} width={w} height={17} rx={2}
        fill={color} opacity={isActive ? 0.32 : 0.18}
        stroke={color} strokeWidth={0.6} strokeOpacity={0.6} />
      <text x={cx} y={cy + 3} textAnchor="middle" fill={color} fontSize={10} fontWeight={500}
        fontFamily="'DM Mono',monospace" letterSpacing=".04em">{label}</text>
    </g>
  );
}
