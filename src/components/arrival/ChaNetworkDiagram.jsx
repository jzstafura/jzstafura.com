import { useState } from "react";

// ─── Color palette ────────────────────────────────────────────────────────────
const MODE_COLORS = {
  CHA:  { bg: "#B45309", light: "#FEF3C7", border: "#92400E", label: "white" },
  TEC:  { bg: "#1D4ED8", light: "#DBEAFE", border: "#1E40AF", label: "white" },
  NET:  { bg: "#065F46", light: "#D1FAE5", border: "#047857", label: "white" },
  ECO:  { bg: "#0E7490", light: "#CFFAFE", border: "#155E75", label: "white" },
  MOR:  { bg: "#991B1B", light: "#FEE2E2", border: "#7F1D1D", label: "white" },
  ORG:  { bg: "#374151", light: "#F3F4F6", border: "#1F2937", label: "white" },
  LAW:  { bg: "#4C1D95", light: "#EDE9FE", border: "#3B0764", label: "white" },
  REL:  { bg: "#78350F", light: "#FEF9C3", border: "#451A03", label: "white" },
  NEED: { bg: "#1C1917", light: "#F5F5F4", border: "#0C0A09", label: "white" },
  MET:  { bg: "#14532D", light: "#DCFCE7", border: "#166534", label: "white" },
};

// ─── Tooltip component ────────────────────────────────────────────────────────
function Tooltip({ content, x, y, svgWidth }) {
  if (!content) return null;
  const W = 220, H_EST = 80;
  const tx = x + 14 + W > svgWidth ? x - W - 14 : x + 14;
  const ty = y - 10;
  return (
    <foreignObject x={tx} y={ty} width={W} height={H_EST + 30}>
      <div xmlns="http://www.w3.org/1999/xhtml"
        style={{
          background: "#1C1917",
          color: "#F5F5F4",
          borderRadius: 6,
          padding: "10px 13px",
          fontSize: 12,
          fontFamily: "'Georgia', serif",
          lineHeight: 1.55,
          boxShadow: "0 4px 20px rgba(0,0,0,0.35)",
          pointerEvents: "none",
        }}>
        <div style={{ fontWeight: 700, marginBottom: 4, color: "#FDE68A", fontSize: 11, letterSpacing: "0.05em" }}>
          {content.title}
        </div>
        {content.body}
      </div>
    </foreignObject>
  );
}

// ─── Node component ───────────────────────────────────────────────────────────
function Node({ x, y, modeKey, label, sublabel, onHover, onLeave, hovered, r = 38 }) {
  const c = MODE_COLORS[modeKey] || MODE_COLORS.NEED;
  const isHov = hovered;
  return (
    <g
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
      style={{ cursor: "pointer" }}
    >
      <circle
        cx={x} cy={y} r={r}
        fill={isHov ? c.bg : c.light}
        stroke={c.border}
        strokeWidth={isHov ? 2.5 : 1.5}
        style={{ transition: "all 0.18s ease" }}
      />
      <text x={x} y={sublabel ? y - 5 : y + 4}
        textAnchor="middle"
        style={{
          fontFamily: "'Georgia', serif",
          fontSize: sublabel ? 11 : 12,
          fontWeight: 700,
          fill: isHov ? "white" : c.bg,
          pointerEvents: "none",
          transition: "fill 0.18s ease",
        }}>
        {label}
      </text>
      {sublabel && (
        <text x={x} y={y + 10} textAnchor="middle"
          style={{
            fontFamily: "'Georgia', serif",
            fontSize: 9.5,
            fill: isHov ? "#FDE68A" : "#6B7280",
            pointerEvents: "none",
          }}>
          {sublabel}
        </text>
      )}
    </g>
  );
}

// ─── Arrow / Edge component ───────────────────────────────────────────────────
function Edge({ x1, y1, x2, y2, label, dashed, color = "#6B7280", onHover, onLeave, hovered }) {
  const dx = x2 - x1, dy = y2 - y1;
  const len = Math.sqrt(dx * dx + dy * dy);
  const ux = dx / len, uy = dy / len;
  const pad = 42;
  const sx = x1 + ux * pad, sy = y1 + uy * pad;
  const ex = x2 - ux * pad, ey = y2 - uy * pad;
  const mx = (sx + ex) / 2, my = (sy + ey) / 2;

  const strokeColor = hovered ? "#B45309" : color;

  return (
    <g onMouseEnter={onHover} onMouseLeave={onLeave} style={{ cursor: "default" }}>
      <defs>
        <marker id={`arrow-${label?.replace(/\s/g,"")}-${Math.round(x1)}`}
          markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
          <path d="M0,0 L0,6 L8,3 z" fill={strokeColor} />
        </marker>
      </defs>
      {/* wider invisible hit zone */}
      <line x1={sx} y1={sy} x2={ex} y2={ey}
        stroke="transparent" strokeWidth={18} />
      <line
        x1={sx} y1={sy} x2={ex} y2={ey}
        stroke={strokeColor}
        strokeWidth={hovered ? 2 : 1.5}
        strokeDasharray={dashed ? "5,4" : undefined}
        markerEnd={`url(#arrow-${label?.replace(/\s/g,"")}-${Math.round(x1)})`}
        style={{ transition: "stroke 0.18s ease, stroke-width 0.18s ease" }}
      />
      {label && (
        <text x={mx} y={my - 7} textAnchor="middle"
          style={{
            fontFamily: "'Georgia', serif",
            fontSize: 9.5,
            fill: hovered ? "#92400E" : "#6B7280",
            fontStyle: "italic",
            pointerEvents: "none",
          }}>
          {label}
        </text>
      )}
    </g>
  );
}

// ─── Animated Feedback Loop component (Example 4 only) ───────────────────────
// Draws a curved arc from the training loop node back to the platform node,
// with three traveling dots at increasing durations to show variance collapse.
function AnimatedFeedback({ fromX, fromY, toX, toY }) {
  // Pad away from node edges
  const pad = 40;
  // Start: top of loop node, end: top of platform node
  const sx = fromX, sy = fromY - pad;
  const ex = toX,   ey = toY - pad;
  // Arc: curve upward via a high control point
  const cy = Math.min(sy, ey) - 80;
  const cx1 = sx, cy1 = cy;
  const cx2 = ex, cy2 = cy;
  const arcPath = `M ${sx},${sy} C ${cx1},${cy1} ${cx2},${cy2} ${ex},${ey}`;

  // Three dots: fast → medium → slow, representing iterations
  // Each subsequent dot is slightly smaller and more transparent
  const dots = [
    { delay: "0s",    dur: "1.8s",  r: 5,   opacity: 0.9, color: "#1D4ED8" },
    { delay: "0.9s",  dur: "3.2s",  r: 4,   opacity: 0.65, color: "#1D4ED8" },
    { delay: "1.8s",  dur: "5.8s",  r: 3,   opacity: 0.4,  color: "#6B7280" },
  ];

  // Midpoint of arc for label placement
  const labelX = (sx + ex) / 2;
  const labelY = cy + 18;

  return (
    <g>
      {/* The arc path itself — slightly lighter than the straight dashed edge */}
      <path
        d={arcPath}
        fill="none"
        stroke="#93C5FD"
        strokeWidth={1.5}
        strokeDasharray="4,3"
        opacity={0.7}
      />
      {/* Arrowhead at end of arc */}
      <defs>
        <marker id="arc-arrow" markerWidth="7" markerHeight="7" refX="5" refY="3" orient="auto">
          <path d="M0,0 L0,6 L7,3 z" fill="#93C5FD" opacity={0.8} />
        </marker>
      </defs>
      <path
        d={arcPath}
        fill="none"
        stroke="#93C5FD"
        strokeWidth={1.5}
        strokeDasharray="4,3"
        opacity={0.7}
        markerEnd="url(#arc-arrow)"
      />

      {/* Traveling dots */}
      {dots.map((dot, i) => (
        <circle key={i} r={dot.r} fill={dot.color} opacity={dot.opacity}>
          <animateMotion
            dur={dot.dur}
            begin={dot.delay}
            repeatCount="indefinite"
            path={arcPath}
            calcMode="spline"
            keyTimes="0;0.5;1"
            keySplines="0.4 0 0.6 1; 0.4 0 0.6 1"
          />
        </circle>
      ))}

      {/* "t+1, t+2, t+3…" label at arc apex */}
      <text
        x={labelX}
        y={labelY}
        textAnchor="middle"
        style={{
          fontFamily: "'Georgia', serif",
          fontSize: 9,
          fill: "#3B82F6",
          fontStyle: "italic",
          opacity: 0.75,
        }}>
        each iteration: variance ↓
      </text>
    </g>
  );
}

// ─── EXAMPLE DEFINITIONS ──────────────────────────────────────────────────────

const EXAMPLES = [
  {
    id: "snow",
    title: "Example 1: The Neighbor's Shovel",
    subtitle: "A near-direct [CHA] trajectory with minimal crossings",
    description: "A classic Beings of Charity instantiation: need becomes visible through proximity, the assemblage forms almost without deliberation, and the need is met. The only crossing is [NET] — the pre-existing social tie that makes the need legible in the first place.",
    svgH: 320,
    nodes: [
      { id: "need", x: 90,  y: 160, modeKey: "NEED", label: "Need", sublabel: "unmet" },
      { id: "vis",  x: 260, y: 100, modeKey: "NET",  label: "[NET]", sublabel: "visibility" },
      { id: "cha",  x: 430, y: 160, modeKey: "CHA",  label: "[CHA]", sublabel: "assembled" },
      { id: "met",  x: 600, y: 160, modeKey: "MET",  label: "Need", sublabel: "met ✓" },
    ],
    edges: [
      { from: "need", to: "vis",  label: "becomes legible" },
      { from: "vis",  to: "cha",  label: "activates" },
      { from: "cha",  to: "met",  label: "arrives" },
    ],
    tooltips: {
      need:       { title: "Need (unmet)",          body: "The need exists but is not yet legible to anyone who might act." },
      vis:        { title: "[NET] — Social Tie",    body: "Proximity collapses the visibility gap — a pre-existing tie makes the need legible without announcement." },
      cha:        { title: "[CHA] Assembled",       body: "Not a feeling but a network — neighbor, shovel, social tie, proximity — that holds together long enough for the mode to travel." },
      met:        { title: "Need Met ✓",            body: "Motive is irrelevant; what matters is that the trajectory arrived intact." },
      e_need_vis: { title: "Need → Visibility",     body: "Need existing and need becoming legible are two different events." },
      e_vis_cha:  { title: "[NET] → [CHA]",         body: "Network ties activate [CHA] with a slight betrayal the trajectory still survives." },
      e_cha_met:  { title: "Arrival",               body: "A felicitous crossing: [CHA] passed through [NET] without losing what makes it [CHA]." },
    },
  },

  {
    id: "gofundme",
    title: "Example 2: The GoFundMe Campaign",
    subtitle: "Multiple crossings: [TEC]/[NET] as designed infrastructure, [ECO] as payment layer",
    description: "Need must pass through technology and social networks to become legible at scale. The platform designs the felicity conditions — 'legible need + friction-reduced giving.' More crossings mean more opportunity for betrayal, but also wider reach through weak ties.",
    svgH: 340,
    nodes: [
      { id: "need",   x: 80,  y: 170, modeKey: "NEED", label: "Need",        sublabel: "unmet" },
      { id: "tecnet", x: 260, y: 110, modeKey: "TEC",  label: "[TEC]/[NET]", sublabel: "platform + spread" },
      { id: "cha",    x: 450, y: 200, modeKey: "CHA",  label: "[CHA]",       sublabel: "assembled" },
      { id: "eco",    x: 600, y: 120, modeKey: "ECO",  label: "[ECO]",       sublabel: "payment" },
      { id: "met",    x: 720, y: 170, modeKey: "MET",  label: "Need",        sublabel: "met ✓" },
    ],
    edges: [
      { from: "need",   to: "tecnet", label: "formatted & shared" },
      { from: "tecnet", to: "cha",    label: "activates donors" },
      { from: "cha",    to: "eco",    label: "giving impulse" },
      { from: "eco",    to: "met",    label: "arrives (minus fees)" },
    ],
    tooltips: {
      need:          { title: "Need (unmet)",           body: "Real, but geographically and relationally inaccessible to most potential givers without technological mediation." },
      tecnet:        { title: "[TEC]/[NET] — Platform + Spread", body: "Platform formats the need; weak ties carry it to strangers who would never have been reached directly." },
      cha:           { title: "[CHA] Assembled",        body: "Dispersed across strangers, held together by platform infrastructure rather than personal relationship." },
      eco:           { title: "[ECO] — Payment Layer",  body: "Payment infrastructure introduces economic rationality — fees, transaction costs — as a constitutive part of the charitable trajectory." },
      met:           { title: "Need Met ✓",             body: "The mode arrives, slightly transformed by platform conventions and the cost of crossing [ECO]." },
      e_need_tecnet: { title: "Formatting the Need",    body: "Need must be made legible in the platform's terms: title, story, photo — and not all needs translate equally well." },
      e_tecnet_cha:  { title: "[TEC]/[NET] → [CHA]",   body: "Weak ties carry the formatted need to social regions no strong tie can reach, activating strangers as donors." },
      e_cha_eco:     { title: "[CHA] → [ECO]",          body: "The giving impulse enters economic infrastructure; friction is reduced by design, but [ECO]'s rationality now shapes the assemblage." },
      e_eco_met:     { title: "Final Arrival",           body: "The need is met, minus a small but constitutive betrayal — the cost of crossing [ECO]." },
    },
  },

  {
    id: "capture",
    title: "Example 3: Mode Capture via [MOR]",
    subtitle: "How moral evaluation colonizes the [CHA] trajectory",
    description: "When [MOR] captures [CHA], the question 'does this person deserve help?' replaces 'is there a need?' Recipients are screened; some needs pass, many don't. The assemblage now serves moral rationality, not charitable rationality. The mode arrives — but only for needs that survive the filter.",
    svgH: 420,
    nodes: [
      { id: "need",    x: 80,  y: 210, modeKey: "NEED", label: "Need",   sublabel: "unmet" },
      { id: "org",     x: 250, y: 210, modeKey: "ORG",  label: "[ORG]",  sublabel: "institution" },
      { id: "mor",     x: 420, y: 130, modeKey: "MOR",  label: "[MOR]",  sublabel: "evaluation" },
      { id: "filter",  x: 420, y: 290, modeKey: "MOR",  label: "[MOR]",  sublabel: "filter" },
      { id: "pass",    x: 590, y: 210, modeKey: "CHA",  label: "[CHA]",  sublabel: "surviving needs" },
      { id: "met",     x: 720, y: 150, modeKey: "MET",  label: "Need",   sublabel: "met ✓" },
      { id: "fail",    x: 720, y: 290, modeKey: "NEED", label: "Need",   sublabel: "rejected ✗" },
    ],
    edges: [
      { from: "need",   to: "org",    label: "institutionalized" },
      { from: "org",    to: "mor",    label: "screening begins" },
      { from: "mor",    to: "filter", label: "evaluation" },
      { from: "filter", to: "pass",   label: "'deserving'" },
      { from: "filter", to: "fail",   label: "'undeserving'", dashed: true },
      { from: "pass",   to: "met",    label: "arrives" },
    ],
    tooltips: {
      need:          { title: "Need (unmet)",              body: "A range of genuine needs — housing instability, medical debt, addiction — enter the system; not all will exit with help." },
      org:           { title: "[ORG] — Institutional Channel", body: "[ORG] imposes its own rationality — intake forms, eligibility criteria, waiting lists — before [CHA] can act." },
      mor:           { title: "[MOR] — Evaluation Begins", body: "Here the question shifts from 'what is needed?' to 'do they deserve help?' — this is the capture point." },
      filter:        { title: "[MOR] — The Filter",        body: "Mode capture in operation: [CHA]'s felicity condition (need met) is replaced by [MOR]'s (virtue rewarded)." },
      pass:          { title: "[CHA] — Surviving Needs",   body: "The mode is intact for this subset, but the assemblage now serves moral rationality, not charitable rationality." },
      met:           { title: "Need Met ✓ (for some)",     body: "Some needs are met, but the population served has been selected by moral evaluation, not by need." },
      fail:          { title: "Need Rejected ✗",           body: "Needs that fail moral screening are turned away — an infelicity [CHA] would never generate on its own terms." },
      e_need_org:    { title: "Institutionalization",       body: "[ORG] crossings can be felicitous, but they create the conditions for capture." },
      e_org_mor:     { title: "The Dangerous Crossing",    body: "The slide from 'what do you need?' to 'why do you need it?' happens gradually and feels natural." },
      e_mor_filter:  { title: "Capture Consolidates",      body: "By the filter stage, [MOR] is the operative rationality of what still appears to be a charitable system." },
      e_filter_pass: { title: "'Deserving' Pathway",       body: "The mode survives for needs that passed moral evaluation — not because they were needs, but because they were morally legible." },
      e_filter_fail: { title: "'Undeserving' Pathway",     body: "The trajectory breaks — not through bureaucracy or technology, but because the wrong rationality was applied." },
    },
  },
  {
    id: "collapse",
    title: "Example 4: Model Collapse",
    subtitle: "Algorithmic convergence and the disappearance of need diversity",
    description: "When a platform trains on its own outputs, it converges toward a point estimate of 'the legible need.' This is not [MOR] capture — no moral evaluation occurs. Instead, the visibility architecture progressively narrows until only algorithmically optimized needs can activate [CHA] at all. The rest do not fail screening; they simply never appear.",
    svgH: 440,
    svgW: 900,
    nodes: [
      { id: "n1",       x: 80,  y: 100, modeKey: "NEED", label: "Need",   sublabel: "type A" },
      { id: "n2",       x: 80,  y: 180, modeKey: "NEED", label: "Need",   sublabel: "type B" },
      { id: "n3",       x: 80,  y: 260, modeKey: "NEED", label: "Need",   sublabel: "type C" },
      { id: "n4",       x: 80,  y: 340, modeKey: "NEED", label: "Need",   sublabel: "type D" },
      { id: "platform", x: 270, y: 220, modeKey: "TEC",  label: "[TEC]",  sublabel: "platform/algo" },
      { id: "loop",     x: 440, y: 140, modeKey: "TEC",  label: "[TEC]",  sublabel: "training loop" },
      { id: "conv",     x: 570, y: 220, modeKey: "NET",  label: "Legible",sublabel: "need (t→∞)" },
      { id: "cha",      x: 700, y: 155, modeKey: "CHA",  label: "[CHA]",  sublabel: "narrow" },
      { id: "met",      x: 820, y: 155, modeKey: "MET",  label: "Need",   sublabel: "met ✓" },
      { id: "dark",     x: 700, y: 320, modeKey: "NEED", label: "Dark",   sublabel: "needs ✗" },
    ],
    edges: [
      { from: "n1",       to: "platform", label: "" },
      { from: "n2",       to: "platform", label: "" },
      { from: "n3",       to: "platform", label: "" },
      { from: "n4",       to: "platform", label: "" },
      { from: "platform", to: "loop",     label: "trains on outputs" },
      // loop→platform is rendered as AnimatedFeedback, not a static edge
      { from: "platform", to: "conv",     label: "t=n: convergence" },
      { from: "conv",     to: "cha",      label: "activates" },
      { from: "cha",      to: "met",      label: "arrives" },
      { from: "platform", to: "dark",     label: "invisible", dashed: true },
    ],
    tooltips: {
      n1:             { title: "Need Type A",          body: "A well-photographed medical emergency: high engagement in training data, so legibility increases with each iteration." },
      n2:             { title: "Need Type B",          body: "Chronic poverty — diffuse, ongoing, less narratively coherent — loses legibility slightly with each training cycle." },
      n3:             { title: "Need Type C",          body: "Structural need cannot be formatted as a fundable campaign and disappears from the legibility model early." },
      n4:             { title: "Need Type D",          body: "Need from someone without platform literacy or social capital is invisible to the algorithm from the start." },
      platform:       { title: "[TEC] — Algorithmic Platform", body: "The platform optimizes for engagement, not urgency — learning from its own prior outputs what 'need' looks like." },
      loop:           { title: "The Training Loop",    body: "Shumailov et al. (Nature, 2024): recursive self-training causes variance in the learned distribution to collapse toward zero." },
      conv:           { title: "Convergence (t→∞)",   body: "At the limit, only one need type is fully legible — not the most urgent, but the most compatible with the platform's learned engagement model." },
      cha:            { title: "[CHA] — Narrowed",    body: "The charitable assemblage forms genuinely, but can only respond to what the visibility architecture makes visible." },
      met:            { title: "Need Met ✓ (survivors)", body: "Some needs are met — specifically those matching the convergent legibility profile — and the platform reports success." },
      dark:           { title: "Dark Needs ✗",        body: "Dark needs are not rejected; they simply never appear, producing no refusal, no record, no possibility of appeal." },
      e_n1_platform:  { title: "Entry: Type A",        body: "High-engagement need shapes the next training iteration toward its own profile." },
      e_n2_platform:  { title: "Entry: Type B",        body: "Each training cycle slightly downweights this need type relative to higher-engagement patterns." },
      e_n3_platform:  { title: "Entry: Type C",        body: "Structural need generates minimal engagement data and disappears from the legibility model quickly." },
      e_n4_platform:  { title: "Entry: Type D",        body: "Without engagement data to contribute, this need type does not shape training and effectively does not exist." },
      e_platform_loop: { title: "Training on Outputs", body: "A closed feedback loop: the platform optimizes on data generated by its own prior outputs." },
      e_loop_platform: { title: "Variance Collapse",   body: "Formal result (Shumailov et al.): variance in the learned need distribution narrows monotonically across iterations." },
      e_platform_conv: { title: "Convergence",         body: "At t=n, the platform surfaces one dominant need type with high confidence, suppressing others through learned inattention." },
      e_conv_cha:     { title: "Narrow Activation",    body: "Only the convergent need type reliably activates [CHA]; the charitable impulse is real, but the funnel is not." },
      e_cha_met:      { title: "Arrival (narrow)",     body: "The mode arrives for the surviving need type; aggregate giving may even increase while the loss remains invisible." },
      e_platform_dark: { title: "Structural Invisibility", body: "No decision is logged, no one is responsible — the platform's silence is indistinguishable from the needs' nonexistence." },
    },
  },
];

// ─── Main Component ───────────────────────────────────────────────────────────
export default function CharityNetworkDiagram() {
  const [activeEx, setActiveEx] = useState(0);
  const [hovered, setHovered] = useState(null); // node/edge id
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  const ex = EXAMPLES[activeEx];

  // Build node lookup
  const nodeMap = {};
  ex.nodes.forEach(n => { nodeMap[n.id] = n; });

  // Build edge id from-to
  const getEdgeId = (f, t) => `e_${f}_${t}`;

  const handleMouseEnter = (id, svgX, svgY) => {
    setHovered(id);
    setTooltipPos({ x: svgX, y: svgY });
  };
  const handleMouseLeave = () => setHovered(null);

  const tooltipContent = hovered ? ex.tooltips[hovered] : null;

  const SVG_W = ex.svgW || 790;

  return (
    <div style={{
      fontFamily: "'Georgia', serif",
      background: "#FAFAF8",
      minHeight: "100vh",
      padding: "0 0 60px",
      color: "#1C1917",
    }}>
      {/* Header */}
      <div style={{
        borderBottom: "1px solid #D6D3D1",
        padding: "36px 48px 28px",
        background: "#F7F3EE",
      }}>
        <div style={{ fontSize: 11, letterSpacing: "0.12em", color: "#78716C", textTransform: "uppercase", marginBottom: 10 }}>
          Beings of Charity — Network Diagrams
        </div>
        <h1 style={{
          margin: 0,
          fontSize: 26,
          fontWeight: 700,
          letterSpacing: "-0.01em",
          color: "#1C1917",
          lineHeight: 1.25,
        }}>
          Mode Crossings in the [CHA] Trajectory
        </h1>
        <p style={{ margin: "12px 0 0", fontSize: 14, color: "#57534E", maxWidth: 620, lineHeight: 1.65 }}>
          Each diagram traces a charitable assemblage as it crosses other modes of existence. 
          Hover over nodes and edges to see annotations. 
          Different crossings produce different felicity conditions — and different risks of mode capture.
        </p>
      </div>

      {/* Tabs */}
      <div style={{
        display: "flex",
        gap: 0,
        borderBottom: "1px solid #D6D3D1",
        background: "#F7F3EE",
        padding: "0 48px",
      }}>
        {EXAMPLES.map((e, i) => (
          <button key={e.id}
            onClick={() => { setActiveEx(i); setHovered(null); }}
            style={{
              border: "none",
              borderBottom: i === activeEx ? "2.5px solid #B45309" : "2.5px solid transparent",
              background: "transparent",
              padding: "14px 20px 12px",
              fontSize: 12.5,
              fontFamily: "'Georgia', serif",
              fontWeight: i === activeEx ? 700 : 400,
              color: i === activeEx ? "#B45309" : "#78716C",
              cursor: "pointer",
              transition: "all 0.15s ease",
              letterSpacing: "0.01em",
            }}>
            {e.title.split(":")[0]}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ padding: "32px 48px 0" }}>
        <div style={{ marginBottom: 6 }}>
          <span style={{
            fontFamily: "'Georgia', serif",
            fontSize: 18,
            fontWeight: 700,
            color: "#1C1917",
          }}>{ex.title}</span>
        </div>
        <div style={{ fontSize: 13, color: "#78716C", fontStyle: "italic", marginBottom: 12 }}>
          {ex.subtitle}
        </div>
        <p style={{ fontSize: 14, color: "#44403C", maxWidth: 680, lineHeight: 1.7, margin: "0 0 24px" }}>
          {ex.description}
        </p>

        {/* Legend */}
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 20 }}>
          {Object.entries(MODE_COLORS)
            .filter(([k]) => ex.nodes.some(n => n.modeKey === k))
            .map(([k, c]) => (
              <div key={k} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{
                  width: 12, height: 12, borderRadius: "50%",
                  background: c.bg, border: `1.5px solid ${c.border}`,
                }} />
                <span style={{ fontSize: 11.5, color: "#57534E", fontFamily: "'Georgia', serif" }}>
                  {k === "NEED" ? "Need" : k === "MET" ? "Need Met" : `[${k}]`}
                </span>
              </div>
            ))}
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <svg width={28} height={12}>
              <line x1={0} y1={6} x2={22} y2={6} stroke="#6B7280" strokeWidth={1.5} strokeDasharray="4,3" markerEnd="url(#tip)" />
            </svg>
            <span style={{ fontSize: 11.5, color: "#57534E" }}>Broken trajectory</span>
          </div>
        </div>

        {/* SVG diagram */}
        <div style={{
          background: "white",
          border: "1px solid #E7E5E4",
          borderRadius: 8,
          overflow: "hidden",
          boxShadow: "0 1px 8px rgba(0,0,0,0.05)",
          position: "relative",
        }}>
          <svg
            width="100%"
            viewBox={`0 0 ${SVG_W} ${ex.svgH}`}
            style={{ display: "block", maxWidth: SVG_W }}
          >
            {/* Subtle grid */}
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#F3F4F6" strokeWidth="0.5"/>
              </pattern>
            </defs>
            <rect width={SVG_W} height={ex.svgH} fill="url(#grid)" />

            {/* Edges */}
            {ex.edges.map((e) => {
              const fn = nodeMap[e.from], tn = nodeMap[e.to];
              const eid = getEdgeId(e.from, e.to);
              return (
                <Edge
                  key={eid}
                  x1={fn.x} y1={fn.y} x2={tn.x} y2={tn.y}
                  label={e.label}
                  dashed={e.dashed}
                  hovered={hovered === eid}
                  onHover={() => handleMouseEnter(eid, (fn.x + tn.x) / 2, (fn.y + tn.y) / 2 - 20)}
                  onLeave={handleMouseLeave}
                />
              );
            })}

            {/* Animated feedback loop (Example 4 only) */}
            {ex.id === "collapse" && (() => {
              const loopNode     = nodeMap["loop"];
              const platformNode = nodeMap["platform"];
              return (
                <AnimatedFeedback
                  fromX={loopNode.x}     fromY={loopNode.y}
                  toX={platformNode.x}   toY={platformNode.y}
                />
              );
            })()}

            {/* Nodes */}
            {ex.nodes.map(n => (
              <Node
                key={n.id}
                x={n.x} y={n.y}
                modeKey={n.modeKey}
                label={n.label}
                sublabel={n.sublabel}
                hovered={hovered === n.id}
                onHover={() => handleMouseEnter(n.id, n.x, n.y - 40)}
                onLeave={handleMouseLeave}
              />
            ))}

            {/* Tooltip */}
            {tooltipContent && (
              <Tooltip
                content={tooltipContent}
                x={tooltipPos.x}
                y={tooltipPos.y}
                svgWidth={SVG_W}
              />
            )}
          </svg>
        </div>

        <p style={{
          fontSize: 12,
          color: "#A8A29E",
          fontStyle: "italic",
          marginTop: 10,
          textAlign: "center",
        }}>
          Hover over nodes and edges for annotations. ← → to switch examples.
        </p>

        {/* Keyboard nav */}
      </div>

      {/* Navigation */}
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        padding: "24px 48px 0",
        borderTop: "1px solid #E7E5E4",
        marginTop: 32,
      }}>
        <button
          onClick={() => setActiveEx(i => Math.max(0, i - 1))}
          disabled={activeEx === 0}
          style={{
            background: "none", border: "1px solid #D6D3D1",
            padding: "8px 18px", borderRadius: 4,
            fontFamily: "'Georgia', serif", fontSize: 13,
            color: activeEx === 0 ? "#D6D3D1" : "#57534E",
            cursor: activeEx === 0 ? "default" : "pointer",
          }}>
          ← Previous
        </button>
        <div style={{ fontSize: 12, color: "#A8A29E", alignSelf: "center", fontStyle: "italic" }}>
          {activeEx + 1} of {EXAMPLES.length}
        </div>
        <button
          onClick={() => setActiveEx(i => Math.min(EXAMPLES.length - 1, i + 1))}
          disabled={activeEx === EXAMPLES.length - 1}
          style={{
            background: activeEx === EXAMPLES.length - 1 ? "none" : "#1C1917",
            border: "1px solid #1C1917",
            padding: "8px 18px", borderRadius: 4,
            fontFamily: "'Georgia', serif", fontSize: 13,
            color: activeEx === EXAMPLES.length - 1 ? "#D6D3D1" : "white",
            cursor: activeEx === EXAMPLES.length - 1 ? "default" : "pointer",
          }}>
          Next →
        </button>
      </div>
    </div>
  );
}
