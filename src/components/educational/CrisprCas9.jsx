import { useState, useEffect, useRef, useCallback } from "react";

// ─── Layout ────────────────────────────────────────────────────────────────────
const W = 840, H = 460;
const PL = 60, PR = 780, PT = 90, PB = 360;
const PW = PR - PL;
const DNA_Y = 230;            // midline of dsDNA
const STRAND_GAP = 22;        // vertical gap between the two strands
const TOP_Y = DNA_Y - STRAND_GAP / 2;
const BOT_Y = DNA_Y + STRAND_GAP / 2;
const N_BP = 36;              // base pairs drawn
const BP_W = PW / N_BP;
const PROTO_START = 8;        // protospacer index range (0-based)
const PROTO_END = 28;         // exclusive
const PAM_START = PROTO_END;
const PAM_END = PAM_START + 3;
const CUT_BP = PROTO_END - 3; // blunt break 3 bp upstream of PAM

const bpX = (i) => PL + (i + 0.5) * BP_W;

// ─── Stages ────────────────────────────────────────────────────────────────────
const STAGES = [
  { id: "apo",    label: "RNP",       title: "Cas9 + sgRNA · Surveillance complex",    dur: 1400 },
  { id: "pam",    label: "PAM",       title: "PAM recognition · 5'-NGG-3'",             dur: 1700 },
  { id: "rloop",  label: "R-LOOP",    title: "R-loop formation · sgRNA:DNA hybrid",     dur: 2200 },
  { id: "cleave", label: "DSB",       title: "Double-strand break · HNH + RuvC",        dur: 1500 },
  { id: "repair", label: "REPAIR",    title: "Repair pathway · NHEJ vs. HDR",           dur: 1800 },
];

// ─── Component info (clickable badges) ────────────────────────────────────────
const INFO = {
  sgRNA: {
    full: "Single-guide RNA (sgRNA)",
    body: "Engineered fusion of crRNA (20-nt spacer providing target specificity) and tracrRNA (scaffold for Cas9 binding). The spacer base-pairs with the protospacer in the target DNA. Jinek et al. (2012) demonstrated that fusing the two native RNAs into one chimeric guide produces a programmable nuclease.",
    color: "#b8412c",
    refs: [{ text: "Jinek et al. (2012) Science", url: "https://doi.org/10.1126/science.1225829" }],
  },
  PAM: {
    full: "Protospacer Adjacent Motif (PAM)",
    body: "For S. pyogenes Cas9, the PAM is 5'-NGG-3' located immediately 3' of the protospacer on the non-target strand. PAM recognition by the PI domain is the first checkpoint and is required before R-loop formation can begin. Without a PAM, Cas9 dissociates within milliseconds.",
    color: "#c9941a",
    refs: [
      { text: "Anders et al. (2014) Nature", url: "https://doi.org/10.1038/nature13579" },
      { text: "Sternberg et al. (2014) Nature", url: "https://doi.org/10.1038/nature13011" },
    ],
  },
  HNH: {
    full: "HNH nuclease domain",
    body: "Cleaves the target strand (the one paired with the sgRNA spacer). Conformational activation is gated by full sgRNA:DNA complementarity in the PAM-distal seed; mismatches there block HNH docking and prevent cleavage.",
    color: "#9a2a2a",
    refs: [{ text: "Sternberg et al. (2015) Nature", url: "https://doi.org/10.1038/nature15544" }],
  },
  RuvC: {
    full: "RuvC nuclease domain",
    body: "Cleaves the non-target (displaced) strand. Acts in concert with HNH to produce a blunt-ended double-strand break approximately 3 bp upstream of the PAM.",
    color: "#9a2a2a",
    refs: [{ text: "Jinek et al. (2014) Science", url: "https://doi.org/10.1126/science.1247997" }],
  },
  NHEJ: {
    full: "Non-homologous end joining",
    body: "Dominant repair pathway in mammalian cells; active throughout the cell cycle. Religates broken ends without a template, frequently producing small insertions or deletions (indels) that can disrupt gene function. The standard route for CRISPR knockouts.",
    color: "#4a4a78",
    refs: [{ text: "Lieber (2010) Annu. Rev. Biochem.", url: "https://doi.org/10.1146/annurev.biochem.052308.093131" }],
  },
  HDR: {
    full: "Homology-directed repair",
    body: "Precise, template-dependent repair using a homologous donor DNA. Restricted to S/G2 phases of the cell cycle and far less efficient than NHEJ in most cell types. The route for precise CRISPR knock-ins.",
    color: "#3a6a5a",
    refs: [{ text: "Jasin & Rothstein (2013) CSH Perspect.", url: "https://doi.org/10.1101/cshperspect.a012740" }],
  },
};

// ─── Cas9 outline path (two-lobed organic clamp astride DNA) ───────────────────
// Center of clamp follows the protospacer + PAM region.
function cas9Path(cx) {
  const w = 380, h = 150;
  const x0 = cx - w / 2;
  const y0 = DNA_Y - h / 2;
  // Asymmetric two-lobed silhouette — REC lobe (left) larger and rounder,
  // NUC lobe (right) more compact with a slight indent at the channel
  return `
    M ${x0 + 24} ${y0 + 38}
    C ${x0 - 4} ${y0 + 8}, ${x0 + 6} ${y0 - 22}, ${x0 + 70} ${y0 - 18}
    C ${x0 + 130} ${y0 - 28}, ${x0 + 200} ${y0 - 26}, ${x0 + 250} ${y0 - 16}
    C ${x0 + 310} ${y0 - 24}, ${x0 + w + 6} ${y0 - 4}, ${x0 + w - 8} ${y0 + 36}
    C ${x0 + w + 10} ${y0 + 78}, ${x0 + w - 6} ${y0 + h + 10}, ${x0 + w - 60} ${y0 + h + 6}
    C ${x0 + 260} ${y0 + h + 22}, ${x0 + 160} ${y0 + h + 26}, ${x0 + 90} ${y0 + h + 10}
    C ${x0 + 24} ${y0 + h + 14}, ${x0 - 8} ${y0 + h - 24}, ${x0 + 8} ${y0 + h - 58}
    C ${x0 - 6} ${y0 + 84}, ${x0 + 2} ${y0 + 56}, ${x0 + 24} ${y0 + 38} Z
  `;
}

// ─── Easing ────────────────────────────────────────────────────────────────────
const ease = (t) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
const lerp = (a, b, t) => a + (b - a) * t;

// ─── Main component ────────────────────────────────────────────────────────────
export default function CrisprCas9App() {
  const [stageIdx, setStageIdx]   = useState(0);
  const [subProg, setSubProg]     = useState(0);     // 0-1 within current stage
  const [playing, setPlaying]     = useState(false);
  const [info, setInfo]           = useState(null);
  const [hovered, setHovered]     = useState(null);
  const [repairPath, setRepairPath] = useState("nhej");
  const rafRef = useRef(null);
  const stageStartRef = useRef(null);
  const stageRef = useRef(0);

  // Animation loop — plays through one stage, then advances or stops at last
  const animate = useCallback((ts) => {
    if (!stageStartRef.current) stageStartRef.current = ts;
    const elapsed = ts - stageStartRef.current;
    const dur = STAGES[stageRef.current].dur;
    const p = Math.min(elapsed / dur, 1);
    setSubProg(p);
    if (p < 1) {
      rafRef.current = requestAnimationFrame(animate);
    } else if (stageRef.current < STAGES.length - 1) {
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
    setStageIdx(0);
    setSubProg(0);
    stageStartRef.current = null;
    setPlaying(true);
    rafRef.current = requestAnimationFrame(animate);
  };

  const reset = () => {
    cancelAnimationFrame(rafRef.current);
    stageRef.current = 0;
    setStageIdx(0);
    setSubProg(0);
    setPlaying(false);
    stageStartRef.current = null;
  };

  const jumpTo = (idx) => {
    cancelAnimationFrame(rafRef.current);
    stageRef.current = idx;
    setStageIdx(idx);
    setSubProg(1);
    setPlaying(false);
    stageStartRef.current = null;
  };

  useEffect(() => () => cancelAnimationFrame(rafRef.current), []);

  // ─── Derived animation values ───────────────────────────────────────────────
  const e = ease(subProg);
  const stage = STAGES[stageIdx].id;

  // Cas9 horizontal position
  // Apo: starts near left, slides toward PAM during stage 0; PAM stage docks fully.
  const cas9CenterStart  = bpX(8);             // upstream, just touching protospacer 5' end
  const cas9CenterMid    = bpX(15);            // mid-scan
  const cas9CenterDocked = bpX(19.5);          // centered over protospacer+PAM
  let cas9X;
  if (stage === "apo")        cas9X = lerp(cas9CenterStart, cas9CenterMid, e);
  else if (stage === "pam")   cas9X = lerp(cas9CenterMid, cas9CenterDocked, e);
  else                        cas9X = cas9CenterDocked;

  // R-loop progress: 0 = fully duplex, 1 = fully unwound across protospacer
  let rloopProg = 0;
  if (stage === "rloop")  rloopProg = e;
  else if (stage === "cleave" || stage === "repair") rloopProg = 1;

  // Cleavage progress
  let cleaveProg = 0;
  if (stage === "cleave") cleaveProg = e;
  else if (stage === "repair") cleaveProg = 1;

  // Repair stage: ends pull apart
  let repairOpen = 0;
  if (stage === "repair") repairOpen = e;

  // PAM glow
  const pamGlow = stage === "pam" ? e : (stage === "rloop" || stage === "cleave" || stage === "repair" ? 1 : 0);

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <div style={{
      minHeight: "100vh",
      background: "#f5efe2",
      display: "flex", flexDirection: "column", alignItems: "center",
      padding: "32px 16px 48px",
      fontFamily: "'DM Mono','Courier New',monospace",
      color: "#1f2025",
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
        <h1 style={{
          fontFamily: "'Playfair Display',serif",
          fontSize: "clamp(22px,4vw,32px)", fontWeight: 600,
          color: "#1f2025", margin: 0, letterSpacing: ".005em",
        }}>
          CRISPR-Cas9 · Programmable DNA Cleavage
        </h1>
        <p style={{ fontSize: 11, color: "#6b6354", margin: "6px 0 0", letterSpacing: ".1em" }}>
          STREPTOCOCCUS PYOGENES Cas9 — TYPE II-A CRISPR SYSTEM
        </p>
      </div>

      {/* Controls */}
      <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap", justifyContent: "center" }}>
        <button className="lb-btn" onClick={play} disabled={playing}
          style={{ borderColor: "#2a5a8a", color: "#2a5a8a" }}>
          {playing ? "▶ PLAYING…" : "▶ PLAY MECHANISM"}
        </button>
        <button className="lb-btn" onClick={reset}
          style={{ borderColor: "#a85a2a", color: "#a85a2a" }}>
          ↺ RESET
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
                fontSize: 10, letterSpacing: ".08em",
                padding: "5px 10px",
                border: `1px solid ${active ? "#1f2025" : done ? "#8a8170" : "#c8bea5"}`,
                background: active ? "#1f2025" : done ? "#e8dfc6" : "transparent",
                color: active ? "#f5efe2" : done ? "#3a3a45" : "#8a8170",
                borderRadius: 2,
              }}>
              {String(i + 1).padStart(2,"0")} · {s.label}
            </div>
          );
        })}
      </div>

      {/* SVG Plot */}
      <div style={{
        background: "#faf5e8",
        border: "1px solid #c8bea5",
        borderRadius: 4,
        boxShadow: "0 1px 0 rgba(31,32,37,.04), 0 0 32px rgba(31,32,37,.06)",
        overflow: "hidden", maxWidth: "100%",
        position: "relative",
      }}>
        <svg viewBox={`0 0 ${W} ${H}`} style={{ display: "block", width: "min(840px,96vw)", height: "auto" }}>
          <defs>
            {/* Faint paper grid */}
            <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#e3d9bf" strokeWidth=".5" />
            </pattern>
            {/* Soft glow for PAM */}
            <filter id="pamGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" />
            </filter>
            {/* Cas9 fill — sepia paper */}
            <pattern id="cas9Pattern" width="3" height="3" patternUnits="userSpaceOnUse" patternTransform="rotate(35)">
              <rect width="3" height="3" fill="#b89a72" />
              <line x1="0" y1="0" x2="0" y2="3" stroke="#a08658" strokeWidth=".4" />
            </pattern>
          </defs>

          {/* Paper grid background */}
          <rect x="0" y="0" width={W} height={H} fill="url(#grid)" opacity=".55" />

          {/* Stage title */}
          <text x={W/2} y={36} textAnchor="middle"
            fontFamily="'Playfair Display',serif" fontSize={17} fontStyle="italic"
            fill="#1f2025" fontWeight={400}>
            {STAGES[stageIdx].title}
          </text>

          {/* Strand direction labels (left/right) */}
          <text x={PL - 6} y={TOP_Y + 4} textAnchor="end" fontSize={9}
            fill="#8a8170" fontFamily="'DM Mono',monospace">5'</text>
          <text x={PR + 6} y={TOP_Y + 4} textAnchor="start" fontSize={9}
            fill="#8a8170" fontFamily="'DM Mono',monospace">3'</text>
          <text x={PL - 6} y={BOT_Y + 4} textAnchor="end" fontSize={9}
            fill="#8a8170" fontFamily="'DM Mono',monospace">3'</text>
          <text x={PR + 6} y={BOT_Y + 4} textAnchor="start" fontSize={9}
            fill="#8a8170" fontFamily="'DM Mono',monospace">5'</text>

          {/* ─── REPAIR STAGE: split view ─── */}
          {stage === "repair" ? (
            <RepairView
              repairOpen={repairOpen}
              repairPath={repairPath}
              setRepairPath={setRepairPath}
              setInfo={setInfo}
              info={info}
              hovered={hovered}
              setHovered={setHovered}
            />
          ) : (
            <>
              {/* ─── DNA: top strand ─── */}
              {Array.from({ length: N_BP }).map((_, i) => {
                const x = bpX(i);
                const inProto = i >= PROTO_START && i < PROTO_END;
                const inPAM   = i >= PAM_START && i < PAM_END;
                // R-loop: top strand (non-target) is displaced upward across protospacer
                let yOffset = 0;
                if (inProto && rloopProg > 0) {
                  // Stagger displacement from PAM-proximal end
                  const localFrac = (PROTO_END - 1 - i) / (PROTO_END - PROTO_START - 1);
                  const localProg = Math.max(0, Math.min(1, (rloopProg - localFrac * 0.5) * 2));
                  yOffset = -localProg * 22;
                }
                // Cleavage break: top strand cuts at cut position
                let xOffset = 0;
                if (cleaveProg > 0 && i < CUT_BP) xOffset = -cleaveProg * 4;
                if (cleaveProg > 0 && i >= CUT_BP) xOffset = cleaveProg * 4;

                return (
                  <g key={`top-${i}`}>
                    {/* Backbone segment */}
                    <rect
                      x={x - BP_W/2 + xOffset} y={TOP_Y - 1.5 + yOffset}
                      width={BP_W} height={3}
                      fill={inPAM ? "#c9941a" : "#5a7a5a"}
                      opacity={inPAM ? 0.55 + 0.45 * pamGlow : 0.85}
                    />
                    {/* PAM glow halo */}
                    {inPAM && pamGlow > 0 && (
                      <rect
                        x={x - BP_W/2 + xOffset} y={TOP_Y - 5 + yOffset}
                        width={BP_W} height={10}
                        fill="#c9941a" opacity={0.18 * pamGlow} filter="url(#pamGlow)"
                      />
                    )}
                  </g>
                );
              })}

              {/* ─── DNA: bottom strand (target) ─── */}
              {Array.from({ length: N_BP }).map((_, i) => {
                const x = bpX(i);
                const inProto = i >= PROTO_START && i < PROTO_END;
                let xOffset = 0;
                if (cleaveProg > 0 && i < CUT_BP) xOffset = -cleaveProg * 4;
                if (cleaveProg > 0 && i >= CUT_BP) xOffset = cleaveProg * 4;
                return (
                  <rect
                    key={`bot-${i}`}
                    x={x - BP_W/2 + xOffset} y={BOT_Y - 1.5}
                    width={BP_W} height={3}
                    fill={inProto && rloopProg > 0.3 ? "#b8412c" : "#2a5a8a"}
                    opacity={inProto && rloopProg > 0.3 ? lerp(0.85, 0.95, Math.min(1, (rloopProg - 0.3) / 0.7)) : 0.85}
                  />
                );
              })}

              {/* ─── Base-pair rungs (only where strands are duplexed) ─── */}
              {Array.from({ length: N_BP }).map((_, i) => {
                const x = bpX(i);
                const inProto = i >= PROTO_START && i < PROTO_END;
                if (inProto && rloopProg > 0) {
                  const localFrac = (PROTO_END - 1 - i) / (PROTO_END - PROTO_START - 1);
                  const localProg = Math.max(0, Math.min(1, (rloopProg - localFrac * 0.5) * 2));
                  if (localProg > 0.3) return null;  // rung gone
                }
                return (
                  <line
                    key={`rung-${i}`}
                    x1={x} y1={TOP_Y + 1.5} x2={x} y2={BOT_Y - 1.5}
                    stroke="#8a8170" strokeWidth={0.6} opacity={0.4}
                  />
                );
              })}

              {/* ─── sgRNA:DNA hybrid (R-loop) ─── */}
              {rloopProg > 0 && Array.from({ length: PROTO_END - PROTO_START }).map((_, k) => {
                const i = PROTO_START + k;
                const x = bpX(i);
                const localFrac = k / (PROTO_END - PROTO_START - 1);
                const localProg = Math.max(0, Math.min(1, (rloopProg - (1 - localFrac) * 0.5) * 2));
                if (localProg < 0.3) return null;
                return (
                  <line key={`hyb-${i}`}
                    x1={x} y1={BOT_Y - 1.5}
                    x2={x} y2={BOT_Y - 8 - 6 * localProg}
                    stroke="#b8412c" strokeWidth={1.2} opacity={localProg * 0.85}
                  />
                );
              })}

              {/* ─── Cleavage scissors marks ─── */}
              {cleaveProg > 0 && (
                <g opacity={cleaveProg}>
                  {/* Top strand cut */}
                  <line x1={bpX(CUT_BP) - 4 - cleaveProg*4} y1={TOP_Y - 8}
                        x2={bpX(CUT_BP) + 4 + cleaveProg*4} y2={TOP_Y + 8}
                        stroke="#9a2a2a" strokeWidth={1.4} />
                  {/* Bottom strand cut */}
                  <line x1={bpX(CUT_BP) - 4 - cleaveProg*4} y1={BOT_Y - 8}
                        x2={bpX(CUT_BP) + 4 + cleaveProg*4} y2={BOT_Y + 8}
                        stroke="#9a2a2a" strokeWidth={1.4} />
                </g>
              )}

              {/* ─── Cas9 protein body ─── */}
              {(stage !== "repair") && (
                <g opacity={0.92}>
                  <path d={cas9Path(cas9X)} fill="#b89a72" fillOpacity={0.42}
                    stroke="#3a3a45" strokeWidth={1.2} />
                  {/* Subtle texture inside */}
                  <path d={cas9Path(cas9X)} fill="url(#cas9Pattern)" fillOpacity={0.18}
                    stroke="none" />
                  {/* Domain dividers — visible when docked */}
                  {(stage !== "apo" || subProg > 0.7) && (
                    <>
                      <text x={cas9X - 110} y={DNA_Y - 60} fontSize={9}
                        fill="#3a3a45" fontFamily="'DM Mono',monospace" letterSpacing=".05em" opacity={0.75}>
                        REC LOBE
                      </text>
                      <text x={cas9X + 55} y={DNA_Y - 60} fontSize={9}
                        fill="#3a3a45" fontFamily="'DM Mono',monospace" letterSpacing=".05em" opacity={0.75}>
                        NUC LOBE
                      </text>
                    </>
                  )}

                  {/* HNH active site — positioned near cut site, below DNA */}
                  <BadgeNode
                    cx={bpX(CUT_BP) - 20} cy={DNA_Y + 48} w={42} label="HNH"
                    color="#9a2a2a" name="HNH"
                    setInfo={setInfo} info={info} hovered={hovered} setHovered={setHovered}
                    active={stage === "cleave" || stage === "repair"}
                  />
                  {/* RuvC — above DNA, near cut site on non-target strand */}
                  <BadgeNode
                    cx={bpX(CUT_BP) + 20} cy={DNA_Y - 48} w={48} label="RuvC"
                    color="#9a2a2a" name="RuvC"
                    setInfo={setInfo} info={info} hovered={hovered} setHovered={setHovered}
                    active={stage === "cleave" || stage === "repair"}
                  />
                </g>
              )}

              {/* ─── sgRNA path entering Cas9 from above ─── */}
              {(stage !== "repair") && (
                <path
                  d={`M ${cas9X - 90} 60 Q ${cas9X - 50} 80, ${cas9X - 30} 130 T ${cas9X - 10} 200`}
                  fill="none" stroke="#b8412c" strokeWidth={2}
                  opacity={0.7}
                  strokeDasharray="4,3"
                />
              )}

              {/* ─── Badges: sgRNA & PAM ─── */}
              <BadgeNode
                cx={cas9X - 90} cy={50} w={56} label="sgRNA"
                color="#b8412c" name="sgRNA"
                setInfo={setInfo} info={info} hovered={hovered} setHovered={setHovered}
                active={true}
              />
              <BadgeNode
                cx={bpX((PAM_START + PAM_END - 1) / 2)} cy={TOP_Y - 28} w={42} label="PAM"
                color="#c9941a" name="PAM"
                setInfo={setInfo} info={info} hovered={hovered} setHovered={setHovered}
                active={pamGlow > 0.2}
              />

              {/* PAM sequence label */}
              {pamGlow > 0.3 && (
                <text x={bpX((PAM_START + PAM_END - 1) / 2)} y={TOP_Y + 22}
                  textAnchor="middle" fontSize={10} fill="#9a7414"
                  fontFamily="'DM Mono',monospace" opacity={pamGlow}>
                  5'-NGG-3'
                </text>
              )}

              {/* Protospacer bracket */}
              {(stage === "rloop" || stage === "cleave") && rloopProg > 0.2 && (
                <g opacity={rloopProg}>
                  <line x1={bpX(PROTO_START)} y1={BOT_Y + 28} x2={bpX(PROTO_END - 1)} y2={BOT_Y + 28}
                    stroke="#6b6354" strokeWidth={0.6} />
                  <text x={(bpX(PROTO_START) + bpX(PROTO_END - 1)) / 2} y={BOT_Y + 42}
                    textAnchor="middle" fontSize={9} fill="#6b6354"
                    fontFamily="'DM Mono',monospace" letterSpacing=".06em">
                    PROTOSPACER (20 bp)
                  </text>
                </g>
              )}

              {/* Cut-site annotation */}
              {cleaveProg > 0.4 && (
                <text x={bpX(CUT_BP)} y={H - 60}
                  textAnchor="middle" fontSize={9} fill="#9a2a2a"
                  fontFamily="'DM Mono',monospace" opacity={cleaveProg}>
                  ▲ blunt break · 3 bp upstream of PAM
                </text>
              )}
            </>
          )}

          {/* Plot border (notebook frame) */}
          <rect x={4} y={4} width={W - 8} height={H - 8}
            fill="none" stroke="#1f2025" strokeWidth={0.5} opacity={0.25} />
        </svg>
      </div>

      {/* Repair toggle (only visible at repair stage) */}
      {stage === "repair" && (
        <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
          <button onClick={() => setRepairPath("nhej")}
            className="lb-btn"
            style={{
              borderColor: "#4a4a78",
              background: repairPath === "nhej" ? "#4a4a78" : "transparent",
              color: repairPath === "nhej" ? "#f5efe2" : "#4a4a78",
            }}>
            NHEJ
          </button>
          <button onClick={() => setRepairPath("hdr")}
            className="lb-btn"
            style={{
              borderColor: "#3a6a5a",
              background: repairPath === "hdr" ? "#3a6a5a" : "transparent",
              color: repairPath === "hdr" ? "#f5efe2" : "#3a6a5a",
            }}>
            HDR
          </button>
        </div>
      )}

      {/* Info card */}
      {info && (
        <div style={{
          marginTop: 18, background: "#faf5e8",
          border: `1px solid ${info.color}66`, borderRadius: 4,
          padding: "16px 22px", maxWidth: 600, width: "100%",
          boxShadow: `0 0 16px ${info.color}22`,
        }}>
          <div style={{ display: "flex", justifyContent: "space-between",
            alignItems: "baseline", marginBottom: 8 }}>
            <span style={{ fontFamily: "'Playfair Display',serif",
              fontSize: 19, color: info.color, fontWeight: 600 }}>
              {info.full}
            </span>
            <button onClick={() => setInfo(null)}
              style={{ background: "none", border: "none",
                color: "#8a8170", cursor: "pointer", fontSize: 16 }}>✕</button>
          </div>
          <p style={{ fontSize: 12, lineHeight: 1.7, color: "#3a3a45",
            margin: "0 0 10px" }}>
            {info.body}
          </p>
          {info.refs && (
            <div style={{ fontSize: 11, color: "#6b6354", letterSpacing: ".05em" }}>
              REFS:{" "}
              {info.refs.map((r, i) => (
                <span key={i}>{i > 0 ? " · " : ""}
                  <a href={r.url} target="_blank" rel="noopener">{r.text}</a>
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Description / Footer */}
      <div style={{
        marginTop: 22, maxWidth: 660, fontSize: 12, color: "#6b6354",
        lineHeight: 1.8, textAlign: "center",
      }}>
        <p style={{ margin: "0 0 8px" }}>
          Cas9 is a programmable, RNA-guided endonuclease. The 20-nucleotide spacer in the sgRNA
          determines the target; a 5'-NGG-3' PAM on the non-target strand is required for engagement.
          Full sgRNA:DNA complementarity activates the HNH and RuvC nucleases, producing a blunt
          double-strand break that the cell repairs by NHEJ (typically introducing indels) or HDR
          (precise, template-dependent).
        </p>
        <p style={{ margin: 0 }}>
          Click any badge to inspect a component. References:{" "}
          <a href="https://doi.org/10.1126/science.1225829" target="_blank" rel="noopener">
            Jinek et al. (2012)
          </a>{" · "}
          <a href="https://doi.org/10.1038/nature13579" target="_blank" rel="noopener">
            Anders et al. (2014)
          </a>{" · "}
          <a href="https://doi.org/10.1038/nature13011" target="_blank" rel="noopener">
            Sternberg et al. (2014)
          </a>{" · "}
          <a href="https://doi.org/10.1126/science.1258096" target="_blank" rel="noopener">
            Doudna &amp; Charpentier (2014)
          </a>
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
      <text x={cx} y={cy + 3} textAnchor="middle"
        fill={color} fontSize={10} fontWeight={500}
        fontFamily="'DM Mono',monospace" letterSpacing=".04em">
        {label}
      </text>
    </g>
  );
}

// ─── Repair view ────────────────────────────────────────────────────────────────
function RepairView({ repairOpen, repairPath, setRepairPath, setInfo, info, hovered, setHovered }) {
  const cx = (PL + PR) / 2;
  const branchY = 290;
  const sep = repairOpen * 60; // ends pull apart vertically

  // NHEJ: small indel scar; HDR: clean edit with donor template
  const nhejX = PL + PW * 0.28;
  const hdrX  = PL + PW * 0.72;
  const isNHEJ = repairPath === "nhej";
  const isHDR  = repairPath === "hdr";

  return (
    <g>
      {/* Header — broken DNA at top */}
      <g transform={`translate(0, -40)`}>
        {/* Left fragment */}
        <rect x={cx - 180} y={DNA_Y - 1.5 - sep/2} width={140} height={3} fill="#5a7a5a" />
        <rect x={cx - 180} y={DNA_Y + STRAND_GAP - 1.5 - sep/2} width={140} height={3} fill="#2a5a8a" />
        {/* Right fragment */}
        <rect x={cx + 40} y={DNA_Y - 1.5 + sep/2} width={140} height={3} fill="#5a7a5a" />
        <rect x={cx + 40} y={DNA_Y + STRAND_GAP - 1.5 + sep/2} width={140} height={3} fill="#2a5a8a" />
        {/* Break label */}
        <text x={cx} y={DNA_Y + STRAND_GAP/2 + 4} textAnchor="middle"
          fontSize={10} fill="#9a2a2a" fontFamily="'DM Mono',monospace" opacity={0.8}>
          DSB
        </text>
      </g>

      {/* Branching arrows */}
      <path d={`M ${cx - 60} 230 L ${nhejX} ${branchY - 20}`}
        fill="none" stroke={isNHEJ ? "#4a4a78" : "#c8bea5"} strokeWidth={isNHEJ ? 1.5 : 1}
        strokeDasharray={isNHEJ ? "" : "3,3"} />
      <path d={`M ${cx + 60} 230 L ${hdrX} ${branchY - 20}`}
        fill="none" stroke={isHDR ? "#3a6a5a" : "#c8bea5"} strokeWidth={isHDR ? 1.5 : 1}
        strokeDasharray={isHDR ? "" : "3,3"} />

      {/* NHEJ branch */}
      <g opacity={isNHEJ ? 1 : 0.45}>
        <BadgeNode cx={nhejX} cy={branchY} w={56} label="NHEJ"
          color="#4a4a78" name="NHEJ"
          setInfo={setInfo} info={info} hovered={hovered} setHovered={setHovered}
          active={isNHEJ} />
        {/* Repaired DNA with indel scar */}
        <g transform={`translate(${nhejX - 110}, ${branchY + 70})`}>
          <rect x={0} y={-1.5} width={100} height={3} fill="#5a7a5a" />
          <rect x={108} y={-1.5} width={112} height={3} fill="#5a7a5a" />
          <rect x={0} y={STRAND_GAP - 1.5} width={100} height={3} fill="#2a5a8a" />
          <rect x={108} y={STRAND_GAP - 1.5} width={112} height={3} fill="#2a5a8a" />
          {/* Scar — small indel */}
          <rect x={100} y={-3} width={8} height={STRAND_GAP + 6} fill="#4a4a78" opacity={0.55} />
        </g>
        <text x={nhejX} y={branchY + 115} textAnchor="middle" fontSize={10}
          fill="#4a4a78" fontFamily="'DM Mono',monospace" letterSpacing=".05em">
          ERROR-PRONE · DOMINANT
        </text>
      </g>

      {/* HDR branch */}
      <g opacity={isHDR ? 1 : 0.45}>
        <BadgeNode cx={hdrX} cy={branchY} w={48} label="HDR"
          color="#3a6a5a" name="HDR"
          setInfo={setInfo} info={info} hovered={hovered} setHovered={setHovered}
          active={isHDR} />
        {/* Donor template — between badge and repaired DNA */}
        <g opacity={isHDR ? 0.85 : 0.4}>
          <text x={hdrX} y={branchY + 22} textAnchor="middle" fontSize={9}
            fill="#3a6a5a" fontFamily="'DM Mono',monospace" letterSpacing=".05em">
            donor template
          </text>
          <rect x={hdrX - 40} y={branchY + 30} width={80} height={2} fill="#3a6a5a" />
          <rect x={hdrX - 40} y={branchY + 36} width={80} height={2} fill="#3a6a5a" />
        </g>
        {/* Repaired DNA with precise edit */}
        <g transform={`translate(${hdrX - 110}, ${branchY + 80})`}>
          <rect x={0} y={-1.5} width={220} height={3} fill="#5a7a5a" />
          <rect x={0} y={STRAND_GAP - 1.5} width={220} height={3} fill="#2a5a8a" />
          {/* Precise edit marker */}
          <rect x={104} y={-3} width={12} height={STRAND_GAP + 6} fill="#3a6a5a" opacity={0.4} />
          <line x1={110} y1={-6} x2={110} y2={STRAND_GAP + 6}
            stroke="#3a6a5a" strokeWidth={1} strokeDasharray="2,2" />
        </g>
        <text x={hdrX} y={branchY + 125} textAnchor="middle" fontSize={10}
          fill="#3a6a5a" fontFamily="'DM Mono',monospace" letterSpacing=".05em">
          PRECISE · S/G2 ONLY
        </text>
      </g>
    </g>
  );
}
