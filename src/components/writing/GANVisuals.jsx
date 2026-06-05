import { useState } from "react";

const COLORS = {
  bg: "#f7f4ee",
  ink: "#1a1814",
  faint: "#e8e3d8",
  mid: "#b0a898",
  gen: "#2d5a8e",
  disc: "#8e2d2d",
  data: "#2d7a4a",
  hegel: "#4a3a8e",
  adorno: "#8e4a2d",
  gap: "#c0392b",
  accent: "#1a1814",
};

// ─── TAB 1: GAN SCHEMATIC ───────────────────────────────────────────────────

function Arrow({ x1, y1, x2, y2, label, color = COLORS.ink, dashed = false }) {
  const dx = x2 - x1, dy = y2 - y1;
  const len = Math.sqrt(dx * dx + dy * dy);
  const ux = dx / len, uy = dy / len;
  const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
  const headLen = 10;
  const ax1 = x2 - headLen * ux - headLen * 0.5 * (-uy);
  const ay1 = y2 - headLen * uy - headLen * 0.5 * ux;
  const ax2 = x2 - headLen * ux + headLen * 0.5 * (-uy);
  const ay2 = y2 - headLen * uy + headLen * 0.5 * ux;
  return (
    <g>
      <line x1={x1} y1={y1} x2={x2} y2={y2}
        stroke={color} strokeWidth={1.5}
        strokeDasharray={dashed ? "5,4" : undefined} />
      <polygon points={`${x2},${y2} ${ax1},${ay1} ${ax2},${ay2}`} fill={color} />
      {label && (
        <text x={mx} y={my - 8} textAnchor="middle"
          fontSize={10} fill={color} fontFamily="Georgia, serif" fontStyle="italic">
          {label}
        </text>
      )}
    </g>
  );
}

function Box({ x, y, w, h, label, sublabel, color, fill = "#fff", small = false }) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={3}
        fill={fill} stroke={color} strokeWidth={1.8} />
      <text x={x + w / 2} y={y + h / 2 - (sublabel ? 7 : 0)}
        textAnchor="middle" dominantBaseline="middle"
        fontSize={small ? 11 : 13} fontWeight="bold"
        fill={color} fontFamily="Georgia, serif">
        {label}
      </text>
      {sublabel && (
        <text x={x + w / 2} y={y + h / 2 + 10}
          textAnchor="middle" dominantBaseline="middle"
          fontSize={9.5} fill={color} fontFamily="monospace" opacity={0.8}>
          {sublabel}
        </text>
      )}
    </g>
  );
}

function GANSchematic() {
  const [hover, setHover] = useState(null);
  const tips = {
    noise: "Random latent vector z sampled from a prior distribution p(z). The raw, undifferentiated input.",
    gen: "Maps latent noise to synthetic data samples. Learns to produce outputs indistinguishable from real data.",
    fake: "Generated samples G(z). The generator's 'claim' about what real data looks like.",
    real: "Samples drawn from the true data distribution p_data(x). Ground truth.",
    disc: "Classifies inputs as real or fake. Issues the judgment D(x) ∈ [0,1].",
    loss: "Minimax objective: G minimizes, D maximizes V(D,G). The formal site of opposition.",
    gback: "Gradient of discriminator loss flows back to update G — the discriminator's negation preserved in new weights.",
    dback: "Gradient updates D to better distinguish real from fake.",
  };
  const W = 680, H = 360;
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ maxWidth: 680, display: "block", margin: "0 auto" }}>
        {/* Noise */}
        <g onMouseEnter={() => setHover("noise")} onMouseLeave={() => setHover(null)} style={{ cursor: "pointer" }}>
          <Box x={20} y={150} w={90} h={50} label="Noise" sublabel="z ~ p(z)" color={COLORS.ink} fill={hover === "noise" ? "#f0ede4" : "#fff"} />
        </g>

        {/* Arrow noise → gen */}
        <Arrow x1={110} y1={175} x2={175} y2={175} color={COLORS.ink} />

        {/* Generator */}
        <g onMouseEnter={() => setHover("gen")} onMouseLeave={() => setHover(null)} style={{ cursor: "pointer" }}>
          <Box x={175} y={140} w={110} h={70} label="Generator" sublabel="G(z) → x̂" color={COLORS.gen} fill={hover === "gen" ? "#e8f0f8" : "#fff"} />
        </g>

        {/* Arrow gen → fake */}
        <Arrow x1={285} y1={175} x2={345} y2={175} color={COLORS.gen} label="fake x̂" />

        {/* Real data */}
        <g onMouseEnter={() => setHover("real")} onMouseLeave={() => setHover(null)} style={{ cursor: "pointer" }}>
          <Box x={345} y={60} w={110} h={50} label="Real Data" sublabel="x ~ p_data" color={COLORS.data} fill={hover === "real" ? "#e8f5ed" : "#fff"} />
        </g>

        {/* Arrow real → disc */}
        <Arrow x1={400} y1={110} x2={400} y2={148} color={COLORS.data} label="real x" />

        {/* Discriminator */}
        <g onMouseEnter={() => setHover("disc")} onMouseLeave={() => setHover(null)} style={{ cursor: "pointer" }}>
          <Box x={345} y={148} w={110} h={70} label="Discriminator" sublabel="D(x) → [0,1]" color={COLORS.disc} fill={hover === "disc" ? "#f8e8e8" : "#fff"} />
        </g>

        {/* Arrow disc → loss */}
        <Arrow x1={455} y1={183} x2={520} y2={183} color={COLORS.disc} />

        {/* Loss */}
        <g onMouseEnter={() => setHover("loss")} onMouseLeave={() => setHover(null)} style={{ cursor: "pointer" }}>
          <Box x={520} y={148} w={110} h={70} label="Loss" sublabel="min G max D" color={COLORS.ink} fill={hover === "loss" ? "#f0ede4" : "#fff"} />
        </g>

        {/* Backprop to generator — curved path */}
        <g onMouseEnter={() => setHover("gback")} onMouseLeave={() => setHover(null)} style={{ cursor: "pointer" }}>
          <path d={`M 575 218 Q 575 300 400 300 Q 230 300 230 218`}
            fill="none" stroke={COLORS.gen} strokeWidth={1.5} strokeDasharray="5,4" />
          <polygon points="230,210 224,222 236,222" fill={COLORS.gen} />
          <text x={400} y={318} textAnchor="middle" fontSize={10}
            fill={COLORS.gen} fontFamily="Georgia, serif" fontStyle="italic">
            ∂L/∂θ_G — update generator
          </text>
        </g>

        {/* Backprop to discriminator */}
        <g onMouseEnter={() => setHover("dback")} onMouseLeave={() => setHover(null)} style={{ cursor: "pointer" }}>
          <path d={`M 575 218 Q 575 270 400 270`}
            fill="none" stroke={COLORS.disc} strokeWidth={1.5} strokeDasharray="5,4" />
          <polygon points="400,264 394,276 406,276" fill={COLORS.disc} />
          <text x={500} y={258} textAnchor="middle" fontSize={10}
            fill={COLORS.disc} fontFamily="Georgia, serif" fontStyle="italic">
            ∂L/∂θ_D
          </text>
        </g>

        {/* Nash equilibrium label */}
        <text x={340} y={28} textAnchor="middle" fontSize={11}
          fill={COLORS.mid} fontFamily="Georgia, serif" fontStyle="italic">
          → Nash equilibrium: G* ≈ p_data, D*(x) = ½
        </text>
      </svg>

      {/* Tooltip */}
      <div style={{
        minHeight: 52, marginTop: 16, padding: "12px 18px",
        background: "#fff", border: `1px solid ${COLORS.faint}`,
        borderRadius: 3, fontSize: 13, lineHeight: 1.6,
        color: hover ? COLORS.ink : COLORS.mid,
        fontFamily: "Georgia, serif", fontStyle: hover ? "normal" : "italic",
        transition: "color 0.2s",
      }}>
        {hover ? tips[hover] : "Hover over any component for details."}
      </div>
    </div>
  );
}

// ─── TAB 2: DIALECTICAL OVERLAY ─────────────────────────────────────────────

const stages = [
  {
    id: "noise", ganLabel: "Noise Input", ganSub: "z ~ p(z)",
    hegel: { label: "Immediate Being", text: "Pure indeterminate potential. Hegel's pure Being without further determination — the raw material before any self-relation or positing." },
    adorno: { label: "Undifferentiated Matter", text: "The nonidentical substrate that precedes conceptualization. For Adorno, matter always retains a remainder that resists absorption into form." },
    gap: null, hegelFit: "strong", adFit: "strong",
  },
  {
    id: "gen", ganLabel: "Generator G", ganSub: "G(z) → x̂",
    hegel: { label: "Thesis / Positing", text: "The generator makes a positive claim about what real data is. First self-related determination — Hegel's positing of a content." },
    adorno: { label: "Identity Claim", text: "The generator attempts to make the particular identical to the concept. Adorno's critique begins here: this identification is structurally incomplete." },
    gap: null, hegelFit: "strong", adFit: "strong",
  },
  {
    id: "disc", ganLabel: "Discriminator D", ganSub: "D(x̂) vs D(x)",
    hegel: { label: "Antithesis / Determinate Negation", text: "The discriminator doesn't merely say 'wrong' — its judgment encodes how wrong, structuring the space of correction. This is Hegel's key move: negation with content." },
    adorno: { label: "Productive Nonidentity", text: "The discriminator's persistent gap between real and fake is not a problem to overcome. Adorno: the untruth of identity is the truth of the whole." },
    gap: null, hegelFit: "strong", adFit: "strong",
  },
  {
    id: "loss", ganLabel: "Loss / Minimax", ganSub: "min G max D V(D,G)",
    hegel: { label: "Determinate Negation in Form", text: "The loss function gives negation a specific direction. Resembles Hegel's insistence that negation must point toward the next positive moment." },
    adorno: { label: "Structural Tension (Kraftfeld)", text: "The minimax opposition formally captures Adorno's 'force field' between opposed poles. Neither side resolves into the other — the tension is constitutive." },
    gap: { text: "Loss is scalar and directional, not conceptual. Hegel's determinate negation points through internal logic; gradient descent points through calculus. The form is similar, the mechanism is not." },
    hegelFit: "moderate", adFit: "strong",
  },
  {
    id: "backprop", ganLabel: "Backpropagation", ganSub: "θ_G, θ_D ← gradients",
    hegel: { label: "Aufhebung (Sublation)", text: "The generator's update preserves the discriminator's negation in its new weights — strikingly close to Aufhebung. The antithesis is canceled, preserved, and elevated into improved capacity." },
    adorno: { label: "Non-Resolution", text: "Both networks update but neither achieves identity. The contradiction relocates at a higher level — Adorno's dialectic moves without arriving." },
    gap: { text: "Hegel's Aufhebung requires a subject who experiences the contradiction. Backprop is purely mechanical. The subject question: is functional self-modification sufficient, or is self-relation strictly necessary?" },
    hegelFit: "moderate", adFit: "strong",
  },
  {
    id: "equil", ganLabel: "Nash Equilibrium", ganSub: "G* ≈ p_data (theoretical)",
    hegel: { label: "Absolute Knowing?", text: "In principle, convergence resembles Hegel's Absolute — full self-transparency. But GANs rarely achieve clean convergence. The Absolute stays theoretical." },
    adorno: { label: "Asymptotic Nonidentity", text: "For Adorno, the Absolute cannot be reached — the persistent gap between concept and object is not failure but philosophical truth. GAN behavior (mode collapse, instability) empirically vindicates this." },
    gap: { text: "This is the sharpest divergence. Hegel requires synthesis; Adorno requires its failure. GANs almost never reach Nash equilibrium — which structurally favors the Adornian reading of the whole process." },
    hegelFit: "weak", adFit: "strong",
  },
];

const fitDot = { strong: "#2d7a4a", moderate: "#c8a020", weak: COLORS.gap };
const fitLabel = { strong: "Strong fit", moderate: "Moderate fit", weak: "Weak fit" };

function DialecticalOverlay() {
  const [sel, setSel] = useState(0);
  const [show, setShow] = useState("both");
  const s = stages[sel];

  return (
    <div style={{ display: "flex", gap: 0, minHeight: 420 }}>
      {/* Stage list */}
      <div style={{ width: 160, borderRight: `1px solid ${COLORS.faint}`, paddingTop: 4 }}>
        {stages.map((st, i) => (
          <div key={st.id} onClick={() => setSel(i)} style={{
            padding: "11px 14px", cursor: "pointer",
            borderLeft: `3px solid ${sel === i ? COLORS.ink : "transparent"}`,
            background: sel === i ? "#fff" : "transparent",
          }}>
            <div style={{ fontSize: 12, fontFamily: "Georgia, serif", fontWeight: sel === i ? "bold" : "normal", color: sel === i ? COLORS.ink : COLORS.mid, marginBottom: 2 }}>
              {st.ganLabel}
            </div>
            <div style={{ fontSize: 10, fontFamily: "monospace", color: COLORS.mid }}>{st.ganSub}</div>
          </div>
        ))}
      </div>

      {/* Main panel */}
      <div style={{ flex: 1, padding: "20px 24px", overflowY: "auto" }}>
        {/* Toggle */}
        <div style={{ display: "flex", gap: 6, marginBottom: 20 }}>
          {["hegel", "both", "adorno"].map(v => (
            <button key={v} onClick={() => setShow(v)} style={{
              padding: "4px 14px", fontSize: 11, letterSpacing: "0.08em",
              textTransform: "uppercase", fontFamily: "Georgia, serif",
              background: show === v ? COLORS.ink : "transparent",
              color: show === v ? COLORS.bg : COLORS.mid,
              border: `1px solid ${show === v ? COLORS.ink : COLORS.faint}`,
              cursor: "pointer", borderRadius: 2,
            }}>
              {v === "both" ? "Both" : v === "hegel" ? "Hegel" : "Adorno"}
            </button>
          ))}
        </div>

        {/* Cards */}
        <div style={{ display: "grid", gridTemplateColumns: show === "both" ? "1fr 1fr" : "1fr", gap: 14, marginBottom: 16 }}>
          {(show === "hegel" || show === "both") && (
            <PhilCard title="Hegel" color={COLORS.hegel}
              label={s.hegel.label} text={s.hegel.text} fit={s.hegelFit} />
          )}
          {(show === "adorno" || show === "both") && (
            <PhilCard title="Adorno" color={COLORS.adorno}
              label={s.adorno.label} text={s.adorno.text} fit={s.adFit} />
          )}
        </div>

        {/* Gap */}
        {s.gap && (
          <div style={{
            padding: "14px 16px", background: "#fff8f7",
            border: `1px solid #e8c8c0`, borderRadius: 3,
          }}>
            <div style={{ fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: COLORS.gap, marginBottom: 6 }}>
              ⚡ Philosophical Gap
            </div>
            <p style={{ fontSize: 12.5, lineHeight: 1.65, color: "#7a3030", margin: 0, fontFamily: "Georgia, serif" }}>
              {s.gap.text}
            </p>
          </div>
        )}

        {/* Fit legend */}
        <div style={{ display: "flex", gap: 18, marginTop: 18, paddingTop: 14, borderTop: `1px solid ${COLORS.faint}`, alignItems: "center" }}>
          <span style={{ fontSize: 10, color: COLORS.mid, letterSpacing: "0.1em", textTransform: "uppercase" }}>Fit:</span>
          {Object.entries(fitDot).map(([k, c]) => (
            <div key={k} style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <div style={{ width: 7, height: 7, borderRadius: "50%", background: c }} />
              <span style={{ fontSize: 10, color: COLORS.mid }}>{fitLabel[k]}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function PhilCard({ title, color, label, text, fit }) {
  return (
    <div style={{ border: `1px solid ${color}40`, borderRadius: 3, padding: 16, background: "#fff" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
        <span style={{ fontSize: 12, fontFamily: "Georgia, serif", color, letterSpacing: "0.04em" }}>{title}</span>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: fitDot[fit] }} />
          <span style={{ fontSize: 10, color: COLORS.mid }}>{fitLabel[fit]}</span>
        </div>
      </div>
      <div style={{ fontSize: 12, fontStyle: "italic", color, borderLeft: `2px solid ${color}50`, paddingLeft: 10, marginBottom: 8 }}>
        {label}
      </div>
      <p style={{ fontSize: 12.5, lineHeight: 1.65, color: "#4a4540", margin: 0, fontFamily: "Georgia, serif" }}>{text}</p>
    </div>
  );
}

// ─── TAB 3: COMPARISON TABLE ─────────────────────────────────────────────────

const tableRows = [
  {
    feature: "Organizing principle",
    gan: "Adversarial opposition between G and D",
    hegel: "Contradiction internal to a concept drives its development",
    adorno: "Persistent tension between concept and object",
    hegelFit: "strong", adFit: "strong",
  },
  {
    feature: "Nature of negation",
    gan: "Loss gradient — directional, scalar",
    hegel: "Determinate negation — conceptual, points toward next positive moment",
    adorno: "Productive nonidentity — the gap that keeps thought honest",
    hegelFit: "moderate", adFit: "strong",
  },
  {
    feature: "What negation preserves",
    gan: "Discriminator's gradient encoded in updated G weights",
    hegel: "Aufhebung: canceled, preserved, elevated",
    adorno: "The nonidentical remainder — what escaped identity",
    hegelFit: "strong", adFit: "strong",
  },
  {
    feature: "Role of the subject",
    gan: "None — mechanical gradient flow",
    hegel: "Essential: consciousness must experience and recognize contradiction",
    adorno: "Complicated: critique requires a subject, but subject is itself mediated",
    hegelFit: "weak", adFit: "moderate",
  },
  {
    feature: "Trajectory / endpoint",
    gan: "Theoretical Nash equilibrium; practical non-convergence",
    hegel: "Absolute Knowing — full self-transparency of spirit",
    adorno: "No synthesis; contradiction relocates at higher levels indefinitely",
    hegelFit: "weak", adFit: "strong",
  },
  {
    feature: "Status of the gap",
    gan: "Mode collapse / training instability — engineering problem",
    hegel: "Resolved in synthesis — the gap is overcome",
    adorno: "Constitutive — the gap is the motor, not the failure",
    hegelFit: "weak", adFit: "strong",
  },
  {
    feature: "Motor of development",
    gan: "Minimax loss — each side improves through opposing the other",
    hegel: "Internal contradiction of the concept drives Aufhebung",
    adorno: "Force field (Kraftfeld) between irreconcilable poles",
    hegelFit: "moderate", adFit: "strong",
  },
  {
    feature: "Level of best fit",
    gan: "—",
    hegel: "Stage level: individual update steps",
    adorno: "Trajectory level: overall training arc",
    hegelFit: "moderate", adFit: "strong",
  },
];

function ComparisonTable() {
  const [hov, setHov] = useState(null);
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "Georgia, serif", fontSize: 12.5 }}>
        <thead>
          <tr>
            {["Feature", "GAN", "Hegel", "Adorno"].map((h, i) => (
              <th key={h} style={{
                padding: "10px 14px", textAlign: "left",
                borderBottom: `2px solid ${COLORS.ink}`,
                fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase",
                color: i === 0 ? COLORS.mid : i === 1 ? COLORS.ink : i === 2 ? COLORS.hegel : COLORS.adorno,
                fontWeight: "bold", background: COLORS.bg,
              }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {tableRows.map((row, i) => (
            <tr key={i}
              onMouseEnter={() => setHov(i)} onMouseLeave={() => setHov(null)}
              style={{ background: hov === i ? "#fff" : i % 2 === 0 ? COLORS.bg : "#f2efe8" }}>
              <td style={{ padding: "10px 14px", borderBottom: `1px solid ${COLORS.faint}`, fontWeight: "bold", color: COLORS.ink, verticalAlign: "top", width: "15%" }}>
                {row.feature}
              </td>
              <td style={{ padding: "10px 14px", borderBottom: `1px solid ${COLORS.faint}`, color: "#4a4540", verticalAlign: "top", width: "25%" }}>
                {row.gan}
              </td>
              <td style={{ padding: "10px 14px", borderBottom: `1px solid ${COLORS.faint}`, verticalAlign: "top", width: "25%" }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 7 }}>
                  <div style={{ width: 7, height: 7, borderRadius: "50%", background: fitDot[row.hegelFit], marginTop: 4, flexShrink: 0 }} />
                  <span style={{ color: "#4a4070" }}>{row.hegel}</span>
                </div>
              </td>
              <td style={{ padding: "10px 14px", borderBottom: `1px solid ${COLORS.faint}`, verticalAlign: "top", width: "25%" }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 7 }}>
                  <div style={{ width: 7, height: 7, borderRadius: "50%", background: fitDot[row.adFit], marginTop: 4, flexShrink: 0 }} />
                  <span style={{ color: "#704030" }}>{row.adorno}</span>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Fit legend */}
      <div style={{ display: "flex", gap: 18, marginTop: 14, paddingTop: 14, borderTop: `1px solid ${COLORS.faint}`, alignItems: "center" }}>
        <span style={{ fontSize: 10, color: COLORS.mid, letterSpacing: "0.1em", textTransform: "uppercase" }}>Dot = mapping fit:</span>
        {Object.entries(fitDot).map(([k, c]) => (
          <div key={k} style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <div style={{ width: 7, height: 7, borderRadius: "50%", background: c }} />
            <span style={{ fontSize: 10, color: COLORS.mid }}>{fitLabel[k]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── MAIN APP ────────────────────────────────────────────────────────────────

const tabs = [
  { id: "schema", label: "I. GAN Schematic" },
  { id: "overlay", label: "II. Dialectical Overlay" },
  { id: "table", label: "III. Comparison Table" },
];

export default function App() {
  const [tab, setTab] = useState("schema");

  return (
    <div style={{ minHeight: "100vh", background: COLORS.bg, color: COLORS.ink, fontFamily: "Georgia, serif" }}>
      {/* Header */}
      <div style={{ borderBottom: `1px solid ${COLORS.faint}`, padding: "28px 36px 0" }}>
        <div style={{ fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", color: COLORS.mid, marginBottom: 6 }}>
          Against Synthesis
        </div>
        <h1 style={{ fontSize: 22, fontWeight: "normal", fontStyle: "italic", margin: "0 0 22px" }}>
          Hegel &amp; Adorno onto the GAN Process
        </h1>
        <div style={{ display: "flex", gap: 0 }}>
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              padding: "9px 20px", fontSize: 12,
              fontFamily: "Georgia, serif",
              background: tab === t.id ? "#fff" : "transparent",
              color: tab === t.id ? COLORS.ink : COLORS.mid,
              border: `1px solid ${COLORS.faint}`,
              borderBottom: tab === t.id ? "1px solid #fff" : `1px solid ${COLORS.faint}`,
              marginBottom: tab === t.id ? -1 : 0,
              cursor: "pointer",
              borderRadius: "3px 3px 0 0",
              zIndex: tab === t.id ? 1 : 0,
              position: "relative",
            }}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Panel */}
      <div style={{ background: "#fff", border: `1px solid ${COLORS.faint}`, borderTop: "none", margin: "0 36px", padding: "28px 24px", minHeight: 380 }}>
        {tab === "schema" && (
          <div>
            <p style={{ fontSize: 13, color: COLORS.mid, fontStyle: "italic", marginTop: 0, marginBottom: 20 }}>
              Hover over components for details. Dashed lines indicate backpropagation (gradient flow).
            </p>
            <GANSchematic />
          </div>
        )}
        {tab === "overlay" && (
          <div>
            <p style={{ fontSize: 13, color: COLORS.mid, fontStyle: "italic", marginTop: 0, marginBottom: 20 }}>
              Select a GAN stage to see how Hegelian and Adornian logic map onto it. Red boxes indicate philosophical gaps.
            </p>
            <DialecticalOverlay />
          </div>
        )}
        {tab === "table" && (
          <div>
            <p style={{ fontSize: 13, color: COLORS.mid, fontStyle: "italic", marginTop: 0, marginBottom: 20 }}>
              Colored dots indicate mapping fit. The final row states the essay's central claim directly.
            </p>
            <ComparisonTable />
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{ padding: "16px 36px", fontSize: 11, color: COLORS.mid, fontStyle: "italic" }}>
        Ao et al. (2018), arXiv:1807.07778 &nbsp;·&nbsp; Hegel, <em>Phenomenology of Spirit</em> (1807) &nbsp;·&nbsp; Adorno, <em>Negative Dialectics</em> (1966)
      </div>
    </div>
  );
}
