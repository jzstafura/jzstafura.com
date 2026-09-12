import { useState, useEffect, useCallback } from "react";

/*
 * The Confound · Contagion and Homophily on the Same Network
 * Aesthetic track: "atlas register"
 *
 * Two generative processes run on one fixed network. In the left panel risk
 * transmits along ties. In the right panel risk is assigned by a latent trait
 * that is itself clustered on the network, with no transmission at all. Both
 * produce the same clustering, and the observational statistic used to detect
 * network exposure cannot tell them apart.
 *
 * Companion to the Papachristos, Braga & Hureau (2012) demo. The network is
 * the largest connected component of that synthetic graph.
 */

// ─── Layout ──────────────────────────────────────────────────────────────────
const S = 440;

// ─── Palette (atlas register) ────────────────────────────────────────────────
const C = {
  bg:     "#dfe4e8",
  panel:  "#eef1f4",
  ink:    "#16222e",
  mut:    "#4e6274",
  faint:  "#7e93a1",
  border: "#b1c0cb",
  grid:   "#c9d4db",
  vic:    "#b5322a",
  node:   "#6b8090",
  cont:   "#b5322a",
  homo:   "#1a6b66",
};
// Latent-trait field: low to high
const TRAIT = ["#3d6b8f", "#6d93ab", "#a3b7bf", "#cbbd98", "#c99a55", "#b5762a"];
// Largest connected component of the same 220-person network: 167 people, 278 ties.
const POS = [
  244,253,252,269,269,253,217,274,225,258,270,271,240,283,128,330,141,316,96,328,112,320,90,311,
  141,298,176,291,159,357,187,360,172,370,203,368,186,338,181,220,216,224,199,218,205,201,187,203,
  177,187,264,235,279,217,236,234,297,220,244,218,261,214,282,235,276,350,261,318,296,337,288,313,
  257,335,223,336,257,353,275,332,240,342,304,321,108,181,109,157,81,201,130,188,89,184,99,205,
  70,187,156,262,94,167,74,170,201,154,157,169,188,173,171,141,183,155,156,151,57,135,116,100,
  102,126,62,118,83,98,100,92,65,100,33,286,48,254,51,289,19,253,28,269,70,263,114,218,
  70,239,40,239,304,281,322,278,286,295,321,307,333,293,149,230,158,205,167,231,136,243,142,213,
  119,236,306,117,265,135,296,102,242,153,293,129,262,93,278,100,265,117,164,412,148,420,137,406,
  160,390,118,394,184,414,288,187,255,190,213,185,271,199,117,286,187,277,198,291,159,298,120,303,
  216,297,135,281,156,280,167,319,187,309,385,228,403,247,385,246,387,264,354,251,341,175,353,189,
  366,209,379,197,370,182,318,188,331,200,262,19,286,32,295,47,268,36,247,30,281,58,229,33,
  253,54,220,57,277,154,222,168,250,172,291,165,214,137,195,111,161,119,182,124,212,106,178,107,
  229,116,404,300,419,310,375,306,404,320,381,281,349,105,355,80,377,79,382,128,375,112,385,95,
  395,110,341,359,344,386,381,364,304,375,371,380,272,368,320,381,169,23,158,37,196,39
];

const TIES = [
  0,4,1,4,2,4,3,4,4,5,4,6,2,5,0,1,1,6,7,12,8,12,9,12,
  10,12,11,12,12,13,8,13,7,8,8,10,14,18,15,18,16,18,17,18,15,17,14,15,
  15,16,14,16,19,22,20,22,21,22,22,23,22,24,21,23,20,21,23,24,19,21,19,23,
  25,29,26,29,27,29,28,29,29,30,29,31,26,28,26,30,25,31,32,33,33,34,33,35,
  33,36,33,37,33,38,33,39,33,40,33,41,36,39,38,39,37,40,38,40,36,40,32,36,
  32,38,34,41,36,38,42,45,43,45,44,45,45,46,45,47,45,48,45,49,45,50,45,51,
  44,47,42,46,43,50,48,51,46,50,44,48,46,48,42,50,52,54,53,54,54,55,54,56,
  54,57,55,56,53,57,58,60,59,60,60,61,60,62,60,63,60,64,62,63,59,63,62,64,
  61,64,65,70,66,70,67,70,68,70,69,70,70,71,70,72,70,73,71,72,66,73,66,72,
  68,69,72,73,74,76,75,76,76,77,76,78,77,78,79,81,80,81,81,82,81,83,81,84,
  79,82,80,83,79,80,85,92,86,92,87,92,88,92,89,92,90,92,91,92,85,87,90,91,
  86,88,93,96,94,96,95,96,96,97,96,98,94,95,93,95,93,94,93,98,99,102,100,102,
  101,102,100,101,99,100,103,106,104,106,105,106,106,107,106,108,106,109,106,110,106,111,106,112,
  104,108,109,110,105,108,104,110,108,112,111,112,103,109,113,117,114,117,115,117,116,117,115,116,
  114,115,113,115,118,124,119,124,120,124,121,124,122,124,123,124,118,123,119,123,119,122,120,121,
  121,122,125,132,126,132,127,132,128,132,129,132,130,132,131,132,132,133,126,128,125,128,125,129,
  129,131,126,127,128,129,127,130,134,136,135,136,136,137,134,137,138,139,138,140,138,141,138,142,
  138,143,138,144,140,143,139,142,139,143,139,140,140,141,145,147,146,147,147,148,147,149,145,149,
  145,148,145,146,150,151,150,152,150,153,150,154,150,155,150,156,155,156,152,155,154,156,153,154,
  157,158,157,159,157,160,157,161,157,162,157,163,158,163,162,163,160,162,164,166,165,166,164,165,
  4,12,4,13,12,18,4,22,4,29,4,33,18,37,22,45,18,49,45,54,29,54,45,60,
  12,70,54,71,33,76,29,81,54,80,54,92,22,88,18,96,4,102,45,101,12,106,76,108,
  102,117,29,124,102,123,92,132,22,136,54,135,102,138,60,140,117,147,117,149,92,150,147,157,
  18,162,132,166
];

// ─── Graph precomputation ────────────────────────────────────────────────────
const N = POS.length / 2;
const XY = (i) => [POS[2 * i], POS[2 * i + 1]];
const ADJ = (() => {
  const a = Array.from({ length: N }, () => []);
  for (let k = 0; k < TIES.length; k += 2) { a[TIES[k]].push(TIES[k + 1]); a[TIES[k + 1]].push(TIES[k]); }
  return a;
})();
const EDGES = Array.from({ length: TIES.length / 2 }, (_, k) => [TIES[2 * k], TIES[2 * k + 1]]);

const K = 24;                 // victims per draw, held equal across processes
const TRAIT_SHARPNESS = 2.2;  // how strongly the latent trait maps to risk

// Breadth-first distances from one source.
function bfs(src) {
  const d = new Array(N).fill(-1); d[src] = 0; const q = [src];
  for (let h = 0; h < q.length; h++) for (const w of ADJ[q[h]]) if (d[w] === -1) { d[w] = d[q[h]] + 1; q.push(w); }
  return d;
}
const DIST = Array.from({ length: N }, (_, i) => bfs(i));   // 167 x 167, computed once

// ─── Process A · contagion ───────────────────────────────────────────────────
// Risk transmits along ties. A share of cases still arrive independently, as
// introductions from outside the observed network, which is what keeps a real
// outbreak from forming one perfect tree.
const BETA = 0.2;
function simContagion(spark) {
  const vic = new Set(), infector = new Array(N).fill(null), gen = new Array(N).fill(null);
  const index = () => {
    const pool = [...Array(N).keys()].filter((i) => !vic.has(i));
    const i = pool[Math.floor(Math.random() * pool.length)];
    vic.add(i); gen[i] = 0; return i;
  };
  index();
  while (vic.size < K) {
    if (Math.random() < spark) { index(); continue; }
    const cand = [], w = [];
    for (let i = 0; i < N; i++) {
      if (vic.has(i)) continue;
      const k = ADJ[i].reduce((a, u) => a + (vic.has(u) ? 1 : 0), 0);
      if (k) { cand.push(i); w.push(1 - Math.pow(1 - BETA, k)); }
    }
    if (!cand.length) { index(); continue; }
    let r = Math.random() * w.reduce((a, b) => a + b, 0), pick = cand.length - 1;
    for (let k = 0; k < cand.length; k++) { r -= w[k]; if (r <= 0) { pick = k; break; } }
    const i = cand[pick];
    const src = ADJ[i].filter((u) => vic.has(u));
    const from = src[Math.floor(Math.random() * src.length)];
    vic.add(i); infector[i] = from; gen[i] = (gen[from] ?? 0) + 1;
  }
  return { vic, infector, gen, trait: null };
}

// ─── Process B · latent homophily ────────────────────────────────────────────
// No transmission. Each person carries a latent trait, smoothed across ties so
// that connected people resemble one another, which is what tie formation by
// homophily leaves behind. Risk then depends on the trait alone.
function normal() {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}
function simHomophily(rounds) {
  let u = Array.from({ length: N }, normal);
  for (let r = 0; r < rounds; r++) {
    const nu = new Array(N);
    for (let i = 0; i < N; i++) {
      const m = ADJ[i].length ? ADJ[i].reduce((a, w) => a + u[w], 0) / ADJ[i].length : u[i];
      nu[i] = 0.5 * u[i] + 0.5 * m;
    }
    u = nu;
  }
  const mean = u.reduce((a, b) => a + b, 0) / N;
  const sd = Math.sqrt(u.reduce((a, b) => a + (b - mean) ** 2, 0) / N) || 1;
  const trait = u.map((x) => (x - mean) / sd);

  // Sample K people without replacement, with probability rising in the trait.
  const w = trait.map((t) => Math.exp(TRAIT_SHARPNESS * t));
  const pool = [...Array(N).keys()]; const vic = new Set();
  let total = w.reduce((a, b) => a + b, 0);
  while (vic.size < K && pool.length) {
    let r = Math.random() * total, pick = 0;
    for (let k = 0; k < pool.length; k++) { r -= w[pool[k]]; if (r <= 0) { pick = k; break; } }
    const i = pool[pick]; total -= w[i]; pool.splice(pick, 1); vic.add(i);
  }
  return { vic, infector: null, gen: null, trait };
}

// ─── Diagnostics ─────────────────────────────────────────────────────────────
// Logistic regression of victimisation on mean geodesic distance to victims,
// fitted by iteratively reweighted least squares. This is the observational
// statistic that network-exposure studies report.
function logistic(x, y) {
  let b0 = 0, b1 = 0;
  for (let it = 0; it < 40; it++) {
    let s00 = 0, s01 = 0, s11 = 0, g0 = 0, g1 = 0;
    for (let i = 0; i < x.length; i++) {
      const p = 1 / (1 + Math.exp(-(b0 + b1 * x[i])));
      const w = Math.max(p * (1 - p), 1e-6), r = y[i] - p;
      s00 += w; s01 += w * x[i]; s11 += w * x[i] * x[i];
      g0 += r; g1 += r * x[i];
    }
    const det = s00 * s11 - s01 * s01;
    if (!isFinite(det) || Math.abs(det) < 1e-12) break;
    const d0 = (s11 * g0 - s01 * g1) / det, d1 = (s00 * g1 - s01 * g0) / det;
    b0 += d0; b1 += d1;
    if (Math.abs(d0) + Math.abs(d1) < 1e-9) break;
  }
  return { b0, b1 };
}

function diagnose(vic) {
  const V = [...vic];
  // Mean geodesic distance from each person to the victims (self excluded).
  const x = new Array(N).fill(0);
  for (let i = 0; i < N; i++) {
    let s = 0, c = 0;
    for (const v of V) if (v !== i) { s += DIST[i][v]; c++; }
    x[i] = s / c;
  }
  const y = Array.from({ length: N }, (_, i) => (vic.has(i) ? 1 : 0));
  const { b0, b1 } = logistic(x, y);

  const adj = V.filter((v) => ADJ[v].some((w) => vic.has(w))).length;
  const nonVic = [...Array(N).keys()].filter((i) => !vic.has(i));
  const meanGeo = nonVic.reduce((a, i) => a + x[i], 0) / nonVic.length;

  return { or: Math.exp(b1), b0, b1, adjPct: Math.round((adj / V.length) * 100), meanGeo, x };
}

// ─── Concept cards ───────────────────────────────────────────────────────────
const INFO = {
  CONTAGION: {
    full: "Contagion", color: C.cont,
    body: "In the left panel, being shot is transmitted. A person's hazard rises with the number of their contacts who have already been shot, through retaliation, joint activity, or shared exposure to a dispute. Some cases still arrive independently, as introductions from outside the observed network. Set that share to zero and every victim has a victim neighbour, which is the giveaway a real outbreak never offers, because ties go unobserved and disputes cross boundaries the data do not record.",
    refs: [{ text: "Green, Horel & Papachristos (2017) JAMA Intern. Med.", url: "https://doi.org/10.1001/jamainternmed.2016.8245" },
           { text: "Papachristos (2009) Am. J. Sociol.", url: "https://doi.org/10.1086/597791" }],
  },
  HOMOPHILY: {
    full: "Latent homophily", color: C.homo,
    body: "In the right panel nothing is transmitted. Each person carries a latent trait, and risk depends on that trait alone. The trait is smoothed across ties, because homophily means people form ties with others who resemble them, so whatever drove tie formation is still sitting there, correlated across the network. Neighbours end up alike in risk without any influence passing between them. Turn the smoothing to zero and the clustering vanishes, which shows the clustering is coming from the trait's structure, not from the victimisation process.",
    refs: [{ text: "McPherson, Smith-Lovin & Cook (2001) Annu. Rev. Sociol.", url: "https://doi.org/10.1146/annurev.soc.27.1.415" },
           { text: "Shalizi & Thomas (2011) Sociol. Methods Res.", url: "https://doi.org/10.1177/0049124111404820" }],
  },
  CONFOUND: {
    full: "Why the statistic cannot separate them", color: C.ink,
    body: "The odds ratio under each panel comes from the same regression that network-exposure studies report: victimisation on mean geodesic distance to the other victims. Both processes drive it below one, and at matched settings their sampling distributions sit on top of each other. Shalizi and Thomas proved the general version of this. Homophily, contagion, and the direct effect of a person's own covariates are generically confounded in observational network data, and contagion cannot be identified nonparametrically. Separating them needs either strong parametric assumptions or substantive knowledge that rules latent homophily out.",
    refs: [{ text: "Shalizi & Thomas (2011) Sociol. Methods Res.", url: "https://doi.org/10.1177/0049124111404820" },
           { text: "Papachristos, Braga & Hureau (2012) J. Urban Health", url: "https://doi.org/10.1007/s11524-012-9703-9" }],
  },
  SETTLE: {
    full: "What would settle it", color: C.homo,
    body: "Structure alone will not. Timing helps, because transmission implies an order and a lag that a static trait does not: Green and colleagues modelled Chicago gunshot injuries as a diffusion process in time, attributing 63.1% of 11,123 episodes to social contagion, with subjects shot on average 125 days after their infector. Randomisation helps more, where it is available. Richer covariates help to the extent they capture what the latent trait is. None of this makes the concentration finding wrong. It makes the causal reading of it a separate claim needing separate evidence.",
    refs: [{ text: "Green, Horel & Papachristos (2017) JAMA Intern. Med.", url: "https://doi.org/10.1001/jamainternmed.2016.8245" },
           { text: "Papachristos & Wildeman (2014) Am. J. Public Health", url: "https://doi.org/10.2105/AJPH.2013.301441" }],
  },
  SIM: {
    full: "About this simulation", color: C.mut,
    body: "The network is fixed and identical in both panels: the largest connected component of the synthetic Boston-like graph from the companion demo, 167 people and 278 ties. Each draw assigns the same number of victims, 24, so the two panels never differ in prevalence. Everything that differs is the process that placed them. The victim share is set well above the empirical rate so a single draw is readable; the point is the comparison between panels, not the level in either.",
    refs: [{ text: "Companion demo · Five Handshakes", url: "/educational/networks-of-violence/" },
           { text: "Papachristos, Braga & Hureau (2012), open access", url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC3531351/" }],
  },
};
const BADGES = ["CONTAGION", "HOMOPHILY", "CONFOUND", "SETTLE", "SIM"];
const BADGE_LABEL = { CONTAGION: "CONTAGION", HOMOPHILY: "HOMOPHILY", CONFOUND: "THE CONFOUND",
  SETTLE: "WHAT WOULD SETTLE IT", SIM: "ABOUT THIS SIM" };

// ─── Component ───────────────────────────────────────────────────────────────
const fmt = (x, d = 2) => (x == null || !isFinite(x) ? "—" : x.toFixed(d));
const median = (a) => { if (!a.length) return null; const s = [...a].sort((x, y) => x - y);
  const m = Math.floor(s.length / 2); return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const quantile = (a, q) => { if (!a.length) return null; const s = [...a].sort((x, y) => x - y);
  return s[Math.min(s.length - 1, Math.floor(q * s.length))]; };

export default function ContagionOrHomophily() {
  const [spark, setSpark] = useState(0.6);    // share of contagion cases arriving independently
  const [smooth, setSmooth] = useState(5);    // rounds of trait smoothing across ties
  const [draw, setDraw] = useState(null);
  const [hist, setHist] = useState({ A: [], B: [] });
  const [reveal, setReveal] = useState(false);
  const [info, setInfo] = useState(null);

  const newDraw = useCallback((sp, sm) => {
    const A = simContagion(sp), B = simHomophily(sm);
    return { A: { ...A, d: diagnose(A.vic) }, B: { ...B, d: diagnose(B.vic) } };
  }, []);

  const single = () => {
    const r = newDraw(spark, smooth);
    setDraw(r);
    setHist((h) => ({ A: [...h.A, r.A.d.or], B: [...h.B, r.B.d.or] }));
  };
  const many = () => {
    const oa = [], ob = []; let last = null;
    for (let k = 0; k < 25; k++) { last = newDraw(spark, smooth); oa.push(last.A.d.or); ob.push(last.B.d.or); }
    setDraw(last);
    setHist((h) => ({ A: [...h.A, ...oa], B: [...h.B, ...ob] }));
  };
  const reset = () => { setHist({ A: [], B: [] }); setDraw(newDraw(spark, smooth)); };

  // First draw happens on the client, after mount, so nothing depends on a
  // random value during server rendering.
  useEffect(() => { setDraw(newDraw(0.6, 5)); }, [newDraw]);

  const mono = "'DM Mono','Courier New',monospace";

  // ─── One network panel ─────────────────────────────────────────────────────
  const Panel = ({ side, title, subtitle, accent, sim }) => {
    const vic = sim ? sim.vic : new Set();
    const traitColor = (i) => {
      if (!sim || !sim.trait) return C.node;
      const t = Math.max(-2.2, Math.min(2.2, sim.trait[i]));
      const k = Math.min(TRAIT.length - 1, Math.floor(((t + 2.2) / 4.4) * TRAIT.length));
      return TRAIT[k];
    };
    const showTrait = reveal && side === "B" && sim && sim.trait;
    const showTree = reveal && side === "A" && sim && sim.infector;

    return (
      <div style={{ flex: "1 1 340px", minWidth: 300, background: C.panel,
        border: `1px solid ${C.border}`, borderRadius: 3, padding: "12px 12px 10px" }}>
        <div style={{ fontSize: 11, letterSpacing: ".12em", color: accent, marginBottom: 3 }}>{title}</div>
        <div style={{ fontSize: 10, color: C.faint, marginBottom: 8, lineHeight: 1.6, minHeight: 30 }}>{subtitle}</div>

        <svg viewBox={`0 0 ${S} ${S}`} width="100%" style={{ display: "block" }}>
          <defs>
            <marker id={`arw${side}`} viewBox="0 0 8 8" refX="7" refY="4"
              markerWidth="5" markerHeight="5" orient="auto">
              <path d="M 0 0 L 8 4 L 0 8 z" fill={C.cont} />
            </marker>
          </defs>
          <rect width={S} height={S} fill={C.panel} />

          {/* ties */}
          {EDGES.map(([a, b], k) => {
            const [x1, y1] = XY(a), [x2, y2] = XY(b);
            return <line key={k} x1={x1} y1={y1} x2={x2} y2={y2}
              stroke={C.faint} strokeWidth="0.9" opacity={showTree ? 0.25 : 0.5} />;
          })}

          {/* transmission tree */}
          {showTree && Array.from({ length: N }, (_, i) => {
            const from = sim.infector[i]; if (from == null) return null;
            const [x1, y1] = XY(from), [x2, y2] = XY(i);
            const L = Math.hypot(x2 - x1, y2 - y1) || 1;          // stop short of the ring
            const ex = x2 - ((x2 - x1) / L) * 13, ey = y2 - ((y2 - y1) / L) * 13;
            return <line key={`t${i}`} x1={x1} y1={y1} x2={ex} y2={ey}
              stroke={C.cont} strokeWidth="2" opacity="0.9" markerEnd={`url(#arw${side})`} />;
          })}

          {/* nodes */}
          {Array.from({ length: N }, (_, i) => {
            const [x, y] = XY(i), isV = vic.has(i);
            const indexCase = showTree && isV && sim.infector[i] == null;
            return (
              <g key={i}>
                {isV && <circle cx={x} cy={y} r="9" fill="none" stroke={C.vic} strokeWidth="1" opacity="0.5" />}
                {indexCase && <circle cx={x} cy={y} r="12.5" fill="none" stroke={C.ink}
                  strokeWidth="1" strokeDasharray="2,2.5" opacity="0.8" />}
                <circle cx={x} cy={y} r={isV ? 5.6 : 4}
                  fill={isV ? C.vic : showTrait ? traitColor(i) : C.node}
                  stroke={isV ? "#7d1f19" : showTrait ? "#ffffff" : "none"}
                  strokeWidth={isV ? 1 : 0.6} />
              </g>
            );
          })}

          {showTrait && (
            <g transform={`translate(12,${S - 34})`}>
              <rect x="-6" y="-13" width="192" height="36" rx="2" fill={C.panel}
                opacity="1" stroke={C.border} strokeWidth="0.8" />
              <text x="0" y="0" fontSize="8.5" fill={C.mut} letterSpacing=".08em">LATENT TRAIT · LOW TO HIGH</text>
              {TRAIT.map((c, k) => <rect key={k} x={k * 22} y="6" width="20" height="9" fill={c} />)}
            </g>
          )}
          {showTree && (
            <g transform={`translate(12,${S - 34})`}>
              <rect x="-6" y="-13" width="230" height="36" rx="2" fill={C.panel}
                opacity="1" stroke={C.border} strokeWidth="0.8" />
              <text x="0" y="0" fontSize="8.5" fill={C.mut} letterSpacing=".08em">ARROWS: WHO TRANSMITTED TO WHOM</text>
              <circle cx="6" cy="12" r="4" fill="none" stroke={C.ink} strokeWidth="1" strokeDasharray="2,2.5" />
              <text x="16" y="15" fontSize="8.5" fill={C.mut}>independent case</text>
            </g>
          )}
        </svg>

        {/* panel statistics */}
        <div style={{ display: "flex", gap: 14, justifyContent: "space-between", marginTop: 8,
          paddingTop: 8, borderTop: `1px solid ${C.border}` }}>
          {[["VICTIMS WITH A\nVICTIM NEIGHBOUR", sim ? sim.d.adjPct + "%" : "—", C.ink],
            ["MEAN DISTANCE\nTO A VICTIM", sim ? fmt(sim.d.meanGeo) : "—", C.ink],
            ["ODDS RATIO\nPER TIE", sim ? fmt(sim.d.or, 3) : "—", accent]].map(([l, v, col]) => (
            <div key={l} style={{ display: "flex", flexDirection: "column", gap: 3, flex: 1 }}>
              <span style={{ fontSize: 8, letterSpacing: ".08em", color: C.faint, whiteSpace: "pre-line", lineHeight: 1.35 }}>{l}</span>
              <span style={{ fontSize: 15, color: col }}>{v}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // ─── Accumulated odds-ratio strip ──────────────────────────────────────────
  const PW = 820, PH = 190, pL = 14, pR = PW - 14, pT = 30, rowA = 78, rowB = 130;
  const OR_MIN = 0.15, OR_MAX = 2.2;
  const ox = (v) => {
    const t = (Math.log(Math.max(OR_MIN, Math.min(OR_MAX, v))) - Math.log(OR_MIN)) /
              (Math.log(OR_MAX) - Math.log(OR_MIN));
    return pL + t * (pR - pL);
  };
  const ticks = [0.2, 0.3, 0.5, 0.754, 1.0, 1.5, 2.0];
  const nDraw = hist.A.length;
  const medA = median(hist.A), medB = median(hist.B);
  const iqrA = [quantile(hist.A, 0.25), quantile(hist.A, 0.75)];
  const iqrB = [quantile(hist.B, 0.25), quantile(hist.B, 0.75)];
  const overlap = nDraw >= 4 && iqrA[0] < iqrB[1] && iqrB[0] < iqrA[1];

  const slider = (label, value, min, max, step, onChange, display, accent) => (
    <div style={{ flex: "1 1 240px", minWidth: 220 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9.5,
        letterSpacing: ".08em", color: C.faint, marginBottom: 5 }}>
        <span>{label}</span><span style={{ color: accent }}>{display}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        style={{ width: "100%", accentColor: accent }} />
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", flexDirection: "column",
      alignItems: "center", padding: "32px 14px 52px", fontFamily: mono, color: C.ink }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:ital,wght@0,300;0,400;0,500;1,400&family=Playfair+Display:ital,wght@0,400;0,600;1,400&display=swap');
        .at-btn { transition: all .18s; border: 1px solid; border-radius: 2px; cursor: pointer;
                  padding: 6px 13px; font-family: 'DM Mono',monospace; font-size: 11px;
                  letter-spacing: .08em; background: transparent; }
        .at-btn:hover { background: rgba(22,34,46,.07); }
        .at-badge { cursor: pointer; transition: all .15s; }
        .at-badge:hover { background: rgba(22,34,46,.07); }
        a { color: #1a6b66; text-underline-offset: 3px; }
        a:hover { color: #14504c; }
        input[type=range] { height: 18px; }
      `}</style>

      {/* Title */}
      <div style={{ textAlign: "center", marginBottom: 14, maxWidth: 760 }}>
        <h1 style={{ fontFamily: "'Playfair Display',serif", fontSize: "clamp(23px,4.4vw,34px)",
          fontWeight: 600, margin: 0, letterSpacing: "-.01em" }}>
          The Confound · Contagion or Homophily?
        </h1>
        <p style={{ fontSize: 10.5, color: C.mut, margin: "8px 0 0", letterSpacing: ".11em" }}>
          TWO PROCESSES · ONE NETWORK · THE SAME STATISTIC
        </p>
      </div>

      <p style={{ fontSize: 12, color: C.mut, margin: "0 0 16px", maxWidth: 640,
        textAlign: "center", lineHeight: 1.8 }}>
        Both panels use the same {N} people and the same {EDGES.length} ties, and each draw places the
        same {K} gunshot victims. On the left, risk passes along ties. On the right, nothing passes
        between anyone. Try to tell which is which before pressing reveal.
      </p>

      {/* Controls */}
      <div style={{ width: "100%", maxWidth: 820, background: C.panel, border: `1px solid ${C.border}`,
        borderRadius: 3, padding: "14px 16px", marginBottom: 14 }}>
        <div style={{ display: "flex", gap: 24, flexWrap: "wrap", marginBottom: 12 }}>
          {slider("CONTAGION · INDEPENDENT CASES", spark, 0, 0.85, 0.05, setSpark,
            Math.round(spark * 100) + "%", C.cont)}
          {slider("HOMOPHILY · TRAIT CLUSTERING", smooth, 0, 10, 1, setSmooth,
            smooth === 0 ? "none" : String(smooth), C.homo)}
        </div>
        <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
          <button className="at-btn" onClick={single} style={{ borderColor: C.ink, color: C.ink }}>▸ NEW DRAW</button>
          <button className="at-btn" onClick={many} style={{ borderColor: C.ink, color: C.ink }}>▸▸ RUN 25 DRAWS</button>
          <button className="at-btn" onClick={() => setReveal((r) => !r)}
            style={{ borderColor: C.homo, color: reveal ? C.panel : C.homo, background: reveal ? C.homo : "transparent" }}>
            {reveal ? "◉ MECHANISM SHOWN" : "○ REVEAL MECHANISM"}
          </button>
          <button className="at-btn" onClick={reset} style={{ borderColor: C.mut, color: C.mut }}>↺ RESET</button>
        </div>
      </div>

      {/* Panels */}
      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", justifyContent: "center",
        width: "100%", maxWidth: 820 }}>
        <Panel side="A" title="PROCESS A" accent={C.cont} sim={draw && draw.A}
          subtitle="Risk transmits along ties, with some cases arriving independently from outside the network." />
        <Panel side="B" title="PROCESS B" accent={C.homo} sim={draw && draw.B}
          subtitle="Nothing transmits. Risk follows a latent trait that is itself clustered across ties." />
      </div>

      {/* Accumulated estimates */}
      <div style={{ width: "100%", maxWidth: 820, background: C.panel, border: `1px solid ${C.border}`,
        borderRadius: 3, marginTop: 14, padding: "10px 10px 4px" }}>
        <svg viewBox={`0 0 ${PW} ${PH}`} width="100%" style={{ display: "block" }}>
          <text x={pL} y="16" fontSize="10" fill={C.mut} letterSpacing=".09em">
            ESTIMATED ODDS RATIO PER TIE OF DISTANCE · {nDraw} {nDraw === 1 ? "DRAW" : "DRAWS"} EACH
          </text>

          {/* axis */}
          <line x1={pL} y1={pT + 10} x2={pR} y2={pT + 10} stroke={C.border} strokeWidth="1" />
          {ticks.map((t) => (
            <g key={t}>
              <line x1={ox(t)} y1={pT + 6} x2={ox(t)} y2={pT + 14} stroke={C.border} strokeWidth="1" />
              <text x={ox(t)} y={pT + 2} textAnchor="middle" fontSize="8.5"
                fill={t === 0.754 ? C.ink : C.faint}>{t === 1 ? "1.0" : String(t)}</text>
            </g>
          ))}
          <line x1={ox(1)} y1={pT + 14} x2={ox(1)} y2={rowB + 24} stroke={C.faint}
            strokeWidth="1" strokeDasharray="3,3" opacity="0.7" />
          <text x={ox(1)} y={rowB + 36} textAnchor="middle" fontSize="8" fill={C.faint}>no association</text>
          <line x1={ox(0.754)} y1={pT + 14} x2={ox(0.754)} y2={rowB + 24} stroke={C.ink}
            strokeWidth="1" strokeDasharray="2,4" opacity="0.55" />
          <text x={ox(0.754)} y={rowB + 36} textAnchor="middle" fontSize="8" fill={C.mut}>Boston estimate</text>

          {/* rows */}
          {[["A", rowA, C.cont, "CONTAGION", hist.A, medA, iqrA],
            ["B", rowB, C.homo, "HOMOPHILY", hist.B, medB, iqrB]].map(([k, yy, col, lab, arr, med, iqr]) => (
            <g key={k}>
              <text x={pL} y={yy - 16} fontSize="9" fill={col} letterSpacing=".09em">{lab}</text>
              {iqr[0] != null && (
                <rect x={ox(iqr[0])} y={yy - 11} width={Math.max(1, ox(iqr[1]) - ox(iqr[0]))} height="22"
                  fill={col} opacity="0.12" />
              )}
              {arr.map((v, i) => (
                <circle key={i} cx={ox(v)} cy={yy + ((i * 37) % 15) - 7} r="3.1"
                  fill={col} opacity="0.4" />
              ))}
              {med != null && (
                <g>
                  <line x1={ox(med)} y1={yy - 13} x2={ox(med)} y2={yy + 13} stroke={col} strokeWidth="2.2" />
                  <text x={ox(med)} y={yy + 25} textAnchor="middle" fontSize="8.5" fill={col}>
                    median {fmt(med, 2)}
                  </text>
                </g>
              )}
            </g>
          ))}
        </svg>
        <p style={{ margin: "0 10px 10px", fontSize: 11, color: C.mut, lineHeight: 1.7 }}>
          {nDraw === 0
            ? "Press new draw to begin. Each draw refits the same logistic regression that network-exposure studies report."
            : nDraw < 4
              ? "Single draws are noisy. Run more before reading anything into the gap between the medians."
              : overlap
                ? `The two middle halves overlap. At these settings the estimate cannot tell a transmitted risk from a clustered trait, which is the point Shalizi and Thomas make in general.`
                : `The middle halves have separated at these settings, so the estimate does carry some information here. Move the sliders to bring the panels back into line and it stops doing so.`}
        </p>
      </div>

      {/* Concept badges */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "center", marginTop: 18 }}>
        {BADGES.map((k) => {
          const on = info === k;
          return (
            <div key={k} className="at-badge" onClick={() => setInfo(on ? null : k)}
              style={{ fontSize: 10, letterSpacing: ".08em", padding: "6px 11px", borderRadius: 2,
                border: `1px solid ${on ? INFO[k].color : C.border}`,
                background: on ? INFO[k].color : "transparent", color: on ? C.panel : C.mut }}>
              {BADGE_LABEL[k]}
            </div>
          );
        })}
      </div>

      {info && (
        <div style={{ marginTop: 12, maxWidth: 640, width: "100%", background: C.panel,
          border: `1px solid ${INFO[info].color}`, borderLeft: `3px solid ${INFO[info].color}`,
          borderRadius: 3, padding: "14px 18px" }}>
          <div style={{ fontSize: 12, letterSpacing: ".06em", color: INFO[info].color, marginBottom: 8 }}>
            {INFO[info].full}
          </div>
          <p style={{ margin: 0, fontSize: 12, color: C.ink, lineHeight: 1.8 }}>{INFO[info].body}</p>
          <p style={{ margin: "10px 0 0", fontSize: 11, color: C.mut }}>
            {INFO[info].refs.map((r, i) => (
              <span key={r.url}>{i > 0 ? " · " : ""}
                <a href={r.url} target="_blank" rel="noopener">{r.text}</a></span>
            ))}
          </p>
        </div>
      )}

      {/* Closing */}
      <div style={{ marginTop: 24, maxWidth: 660, fontSize: 11.5, color: C.mut,
        lineHeight: 1.85, textAlign: "center" }}>
        <p style={{ margin: "0 0 10px" }}>
          None of this says the concentration finding is wrong. Gunshot injury really does pool in small
          parts of a network, and that is useful whatever produces it. What the two panels show is that
          the pooling by itself does not license the causal reading. Transmission and a shared,
          clustered cause leave the same footprint in cross-sectional data, so anything that turns on
          which one is at work needs evidence the footprint cannot supply.
        </p>
        <p style={{ margin: "0 0 10px", fontStyle: "italic", color: C.faint }}>
          Simulated data on a synthetic network, built as a companion to{" "}
          <a href="/educational/networks-of-violence/">Five Handshakes</a>. Victim prevalence is set
          above the empirical rate so a single draw is legible.
        </p>
        <p style={{ margin: 0 }}>
          References:{" "}
          <a href="https://doi.org/10.1177/0049124111404820" target="_blank" rel="noopener">Shalizi &amp; Thomas (2011)</a>{" · "}
          <a href="https://doi.org/10.1146/annurev.soc.27.1.415" target="_blank" rel="noopener">McPherson, Smith-Lovin &amp; Cook (2001)</a>{" · "}
          <a href="https://doi.org/10.1007/s11524-012-9703-9" target="_blank" rel="noopener">Papachristos, Braga &amp; Hureau (2012)</a>{" · "}
          <a href="https://doi.org/10.2105/AJPH.2013.301441" target="_blank" rel="noopener">Papachristos &amp; Wildeman (2014)</a>{" · "}
          <a href="https://doi.org/10.1001/jamainternmed.2016.8245" target="_blank" rel="noopener">Green, Horel &amp; Papachristos (2017)</a>{" · "}
          <a href="https://doi.org/10.1086/597791" target="_blank" rel="noopener">Papachristos (2009)</a>
        </p>
      </div>
    </div>
  );
}
