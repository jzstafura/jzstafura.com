import { useState } from "react";

const stages = [
  {
    id: "noise",
    label: "Noise Input",
    sublabel: "z ~ p(z)",
    description: "Random latent vector sampled from prior distribution",
    hegel: {
      label: "Immediate Being",
      text: "Pure indeterminate potential — Hegel's 'Being, pure being, without further determination.' The raw material before any self-relation.",
      fit: "strong",
    },
    adorno: {
      label: "Undifferentiated Matter",
      text: "The nonidentical substrate that precedes conceptualization. For Adorno, matter resists total absorption into form — this remainder is philosophically productive.",
      fit: "strong",
    },
    gap: null,
  },
  {
    id: "generator",
    label: "Generator G",
    sublabel: "G(z) → x̂",
    description: "Network maps latent noise to synthetic data samples",
    hegel: {
      label: "Thesis / Positing",
      text: "The generator makes a positive claim about reality — it asserts what real data 'is.' This is the first self-related determination, Hegel's positing of a content.",
      fit: "strong",
    },
    adorno: {
      label: "Identity Claim",
      text: "The generator attempts to make the particular (generated sample) identical to the concept (real data distribution). Adorno's critique begins here: this identification is always incomplete.",
      fit: "strong",
    },
    gap: null,
  },
  {
    id: "discriminator",
    label: "Discriminator D",
    sublabel: "D(x̂) vs D(x)",
    description: "Network judges real vs. generated samples",
    hegel: {
      label: "Antithesis / Negation",
      text: "Determinate negation: the discriminator doesn't just say 'wrong' — its judgment encodes *how* wrong, structuring the space of correction. This is Hegel's key move: negation with content.",
      fit: "strong",
    },
    adorno: {
      label: "Productive Nonidentity",
      text: "The discriminator's gap — the persistent difference between real and fake — is not a problem to be overcome but the engine of the process. Adorno: 'the untruth of identity is the truth of the whole.'",
      fit: "strong",
    },
    gap: null,
  },
  {
    id: "loss",
    label: "Loss Computation",
    sublabel: "min G max D V(D,G)",
    description: "Minimax objective: generator minimizes, discriminator maximizes",
    hegel: {
      label: "Determinate Negation in Form",
      text: "The loss function gives the negation a specific direction. This resembles Hegel's insistence that negation must be *determinate* — not mere nullity but a pointing-toward.",
      fit: "moderate",
    },
    adorno: {
      label: "Structural Tension",
      text: "The minimax opposition formally captures what Adorno calls the 'force field' (Kraftfeld) between opposed poles. Neither side resolves into the other — the tension is constitutive.",
      fit: "strong",
    },
    gap: {
      label: "CONCEPTUAL GAP",
      text: "Loss is scalar and directional, not conceptual. Hegel's determinate negation points toward the next positive moment through internal logic. Gradient descent points toward lower loss through calculus — structurally similar, but without the self-referential conceptual movement.",
    },
  },
  {
    id: "update",
    label: "Backpropagation",
    sublabel: "θ_G, θ_D updated",
    description: "Both networks updated via gradient descent",
    hegel: {
      label: "Aufhebung (Sublation)",
      text: "The generator's update preserves the discriminator's negation in its new weights — this is strikingly close to Aufhebung. The antithesis is canceled, preserved, and elevated into the generator's improved capacity.",
      fit: "moderate",
    },
    adorno: {
      label: "Non-Resolution",
      text: "Both networks update — but neither achieves identity. The discriminator's capability increases alongside the generator's. Adorno would recognize this: the contradiction doesn't resolve, it relocates at a higher level.",
      fit: "strong",
    },
    gap: {
      label: "KEY GAP: No Subject",
      text: "Hegel's Aufhebung requires a subject who experiences the contradiction and recognizes its resolution. Backprop is purely mechanical — there is no self-relation, no 'experience' of the negation. This is where the materialist question lives: is a subject strictly necessary, or is functional self-modification sufficient?",
    },
  },
  {
    id: "equilibrium",
    label: "Nash Equilibrium",
    sublabel: "G* ≈ p_data",
    description: "Theoretical convergence: G reproduces data distribution",
    hegel: {
      label: "Absolute Knowing?",
      text: "In principle, convergence looks like Hegel's Absolute — full self-transparency, the generator 'knowing' the real distribution. But this is rarely achieved cleanly in practice.",
      fit: "weak",
    },
    adorno: {
      label: "Asymptotic Nonidentity",
      text: "For Adorno, the Absolute is precisely what cannot be reached — the persistent gap between concept and object is not a failure but a philosophical truth. GAN training behaves this way empirically: mode collapse, training instability, perpetual non-convergence.",
      fit: "strong",
    },
    gap: {
      label: "STRUCTURAL DIVERGENCE",
      text: "This is where Hegel and Adorno most sharply diverge — and where GAN behavior adjudicates between them. Hegel requires synthesis; Adorno requires its failure. GANs almost never reach true Nash equilibrium, which structurally favors the Adornian reading.",
    },
  },
];

const fitColors = {
  strong: "#4ade80",
  moderate: "#facc15",
  weak: "#f87171",
};

const fitLabels = {
  strong: "Strong fit",
  moderate: "Moderate fit",
  weak: "Weak fit",
};

export default function DialecticalGAN() {
  const [selected, setSelected] = useState(0);
  const [view, setView] = useState("both"); // "hegel", "adorno", "both"

  const stage = stages[selected];

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0f0f13",
        color: "#e8e4dc",
        fontFamily: "'Georgia', 'Times New Roman', serif",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Header */}
      <div
        style={{
          borderBottom: "1px solid #2a2a35",
          padding: "24px 32px 20px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
        }}
      >
        <div>
          <div
            style={{
              fontSize: "11px",
              letterSpacing: "0.18em",
              color: "#7a7a8a",
              textTransform: "uppercase",
              marginBottom: "6px",
            }}
          >
            Dialectical Mapping
          </div>
          <h1
            style={{
              fontSize: "22px",
              fontWeight: "normal",
              fontStyle: "italic",
              color: "#e8e4dc",
              margin: 0,
            }}
          >
            Hegel &amp; Adorno onto the GAN Process
          </h1>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          {["hegel", "both", "adorno"].map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              style={{
                padding: "6px 14px",
                fontSize: "11px",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                background: view === v ? "#2a2a35" : "transparent",
                color: view === v ? "#e8e4dc" : "#7a7a8a",
                border: `1px solid ${view === v ? "#4a4a60" : "#2a2a35"}`,
                cursor: "pointer",
                borderRadius: "2px",
              }}
            >
              {v === "both" ? "Both" : v === "hegel" ? "Hegel" : "Adorno"}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: "flex", flex: 1 }}>
        {/* Stage Pipeline */}
        <div
          style={{
            width: "220px",
            borderRight: "1px solid #2a2a35",
            padding: "24px 0",
            flexShrink: 0,
          }}
        >
          {stages.map((s, i) => (
            <div
              key={s.id}
              onClick={() => setSelected(i)}
              style={{
                padding: "14px 20px",
                cursor: "pointer",
                borderLeft: `3px solid ${selected === i ? "#a78bfa" : "transparent"}`,
                background: selected === i ? "#16161f" : "transparent",
                transition: "all 0.15s",
              }}
            >
              <div
                style={{
                  fontSize: "12px",
                  color: selected === i ? "#e8e4dc" : "#9a9aaa",
                  marginBottom: "2px",
                  fontWeight: selected === i ? "bold" : "normal",
                  fontStyle: "normal",
                  fontFamily: "'Georgia', serif",
                }}
              >
                {s.label}
              </div>
              <div
                style={{
                  fontSize: "10px",
                  color: "#5a5a7a",
                  fontFamily: "monospace",
                  letterSpacing: "0.05em",
                }}
              >
                {s.sublabel}
              </div>
              {i < stages.length - 1 && (
                <div
                  style={{
                    fontSize: "16px",
                    color: "#3a3a50",
                    marginTop: "10px",
                    textAlign: "center",
                  }}
                >
                  ↓
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Main Content */}
        <div style={{ flex: 1, padding: "28px 32px", overflowY: "auto" }}>
          {/* Stage Header */}
          <div style={{ marginBottom: "28px" }}>
            <h2
              style={{
                fontSize: "20px",
                fontStyle: "italic",
                fontWeight: "normal",
                margin: "0 0 6px",
                color: "#c8c4bc",
              }}
            >
              {stage.label}
            </h2>
            <div
              style={{
                fontSize: "12px",
                color: "#7a7a8a",
                fontFamily: "monospace",
              }}
            >
              {stage.description}
            </div>
          </div>

          {/* Framework Cards */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                view === "both" ? "1fr 1fr" : "1fr",
              gap: "16px",
              marginBottom: "20px",
            }}
          >
            {(view === "hegel" || view === "both") && (
              <FrameworkCard
                title="Hegel"
                subtitle="Dialectical Idealism"
                label={stage.hegel.label}
                text={stage.hegel.text}
                fit={stage.hegel.fit}
                color="#818cf8"
              />
            )}
            {(view === "adorno" || view === "both") && (
              <FrameworkCard
                title="Adorno"
                subtitle="Negative Dialectics"
                label={stage.adorno.label}
                text={stage.adorno.text}
                fit={stage.adorno.fit}
                color="#f472b6"
              />
            )}
          </div>

          {/* Gap Box */}
          {stage.gap && (
            <div
              style={{
                border: "1px solid #5a3a3a",
                background: "#1a1215",
                borderRadius: "4px",
                padding: "18px 20px",
              }}
            >
              <div
                style={{
                  fontSize: "10px",
                  letterSpacing: "0.15em",
                  textTransform: "uppercase",
                  color: "#f87171",
                  marginBottom: "8px",
                }}
              >
                ⚡ {stage.gap.label}
              </div>
              <p
                style={{
                  fontSize: "13px",
                  lineHeight: "1.7",
                  color: "#c8a0a0",
                  margin: 0,
                }}
              >
                {stage.gap.text}
              </p>
            </div>
          )}

          {/* Fit Legend */}
          <div
            style={{
              marginTop: "28px",
              display: "flex",
              gap: "20px",
              borderTop: "1px solid #2a2a35",
              paddingTop: "16px",
            }}
          >
            <div
              style={{
                fontSize: "10px",
                color: "#5a5a7a",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                alignSelf: "center",
              }}
            >
              Mapping fit:
            </div>
            {Object.entries(fitColors).map(([k, c]) => (
              <div
                key={k}
                style={{ display: "flex", alignItems: "center", gap: "6px" }}
              >
                <div
                  style={{
                    width: "8px",
                    height: "8px",
                    borderRadius: "50%",
                    background: c,
                  }}
                />
                <span
                  style={{
                    fontSize: "11px",
                    color: "#7a7a8a",
                    textTransform: "capitalize",
                  }}
                >
                  {fitLabels[k]}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Summary Column */}
        <div
          style={{
            width: "240px",
            borderLeft: "1px solid #2a2a35",
            padding: "24px 20px",
            flexShrink: 0,
          }}
        >
          <div
            style={{
              fontSize: "10px",
              letterSpacing: "0.15em",
              textTransform: "uppercase",
              color: "#5a5a7a",
              marginBottom: "18px",
            }}
          >
            Overall Assessment
          </div>

          <SummaryBlock
            title="Where Hegel fits"
            color="#818cf8"
            items={[
              "Noise as immediate being",
              "Generator as positing/thesis",
              "Discriminator as determinate negation",
              "Backprop preserves negation in new weights (≈ Aufhebung)",
            ]}
          />

          <SummaryBlock
            title="Where Hegel breaks"
            color="#f87171"
            items={[
              "No subject experiencing contradiction",
              "Loss is scalar, not conceptual",
              "Nash equilibrium ≠ Absolute Knowing",
              "No self-relation or recognition",
            ]}
          />

          <SummaryBlock
            title="Where Adorno fits better"
            color="#f472b6"
            items={[
              "Minimax tension never resolves",
              "Nonidentity is structural, not accidental",
              "GAN instability = perpetual non-synthesis",
              "The gap is the motor, not the problem",
            ]}
          />

          <div
            style={{
              marginTop: "20px",
              padding: "14px",
              background: "#16161f",
              borderRadius: "4px",
              border: "1px solid #2a2a35",
            }}
          >
            <div
              style={{
                fontSize: "10px",
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: "#7a7a8a",
                marginBottom: "8px",
              }}
            >
              Verdict
            </div>
            <p
              style={{
                fontSize: "12px",
                lineHeight: "1.6",
                color: "#c8c4bc",
                margin: 0,
                fontStyle: "italic",
              }}
            >
              GAN training is structurally Hegelian at individual stages but
              Adornian in its overall trajectory. The empirical tendency toward
              non-convergence favors the negative dialectic reading.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function FrameworkCard({ title, subtitle, label, text, fit, color }) {
  return (
    <div
      style={{
        border: `1px solid ${color}30`,
        background: "#13131a",
        borderRadius: "4px",
        padding: "18px",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: "12px",
        }}
      >
        <div>
          <div
            style={{
              fontSize: "13px",
              color: color,
              letterSpacing: "0.05em",
              marginBottom: "2px",
            }}
          >
            {title}
          </div>
          <div style={{ fontSize: "10px", color: "#5a5a7a" }}>{subtitle}</div>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "5px",
          }}
        >
          <div
            style={{
              width: "7px",
              height: "7px",
              borderRadius: "50%",
              background: fitColors[fit],
              flexShrink: 0,
            }}
          />
          <span style={{ fontSize: "10px", color: "#5a5a7a" }}>
            {fitLabels[fit]}
          </span>
        </div>
      </div>

      <div
        style={{
          fontSize: "12px",
          color: color,
          fontStyle: "italic",
          marginBottom: "8px",
          borderLeft: `2px solid ${color}50`,
          paddingLeft: "10px",
        }}
      >
        {label}
      </div>
      <p
        style={{
          fontSize: "12.5px",
          lineHeight: "1.65",
          color: "#b0aaa8",
          margin: 0,
        }}
      >
        {text}
      </p>
    </div>
  );
}

function SummaryBlock({ title, color, items }) {
  return (
    <div style={{ marginBottom: "18px" }}>
      <div
        style={{
          fontSize: "11px",
          color: color,
          marginBottom: "8px",
          letterSpacing: "0.05em",
        }}
      >
        {title}
      </div>
      {items.map((item, i) => (
        <div
          key={i}
          style={{
            display: "flex",
            gap: "8px",
            marginBottom: "5px",
            alignItems: "flex-start",
          }}
        >
          <span style={{ color: "#3a3a50", fontSize: "12px", flexShrink: 0 }}>
            –
          </span>
          <span style={{ fontSize: "11px", color: "#7a7a8a", lineHeight: "1.5" }}>
            {item}
          </span>
        </div>
      ))}
    </div>
  );
}
