import { useState, useMemo } from "react";

/*
 * Five Handshakes · Social Networks and the Risk of Gunshot Injury
 * Aesthetic track: "atlas register" (third theme in the gallery system)
 *
 * The network below is SYNTHETIC. It is generated to match the reported
 * structural statistics of the Boston network in Papachristos, Braga &
 * Hureau (2012), scaled from 763 people to 220 for legibility:
 *   mean degree 2.89 (here 2.91) · 18 components (paper: 57 of 763)
 *   largest component 76% of the sample (167/220; paper 579/763)
 *   85% of gunshot victims inside the largest component (here 11/13)
 *   mean geodesic distance to a gunshot victim 4.69 (here 4.69)
 * It is not the authors' data, which are not public.
 */

// ─── Layout ──────────────────────────────────────────────────────────────────
const W = 800, H = 600;

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
  sel:    "#1a6b66",
  gang:   "#a8792a",
  none:   "#9fb0bb",
};

// Distance-to-nearest-victim ramp. Index 0 is a victim.
const RAMP = ["#b5322a", "#c85a37", "#d18a45", "#b5a45e", "#7f9e88", "#5b8a9c", "#4d7391", "#5c6f82"];
const rampAt = (d) => (d == null ? C.none : RAMP[Math.min(d, RAMP.length - 1)]);

// 220 people, 320 ties. Flat [x,y,...] pairs.
const POS = [
  358,235,382,229,416,247,351,253,379,250,397,256,405,230,389,166,397,182,450,166,417,167,451,184,
  411,188,397,210,346,186,326,192,350,199,306,197,328,216,220,300,212,275,209,288,277,295,232,287,
  243,274,492,252,534,243,531,263,513,243,497,271,550,249,472,260,209,214,270,206,267,177,220,198,
  231,215,289,220,231,228,210,227,257,224,248,186,327,287,285,285,297,331,310,318,332,300,277,338,
  311,305,315,263,308,291,276,313,425,354,393,339,423,319,448,349,453,337,413,338,205,393,149,362,
  216,362,167,387,174,370,167,355,186,382,567,179,535,192,510,163,537,170,546,161,503,192,467,247,
  509,212,547,200,270,108,289,118,279,141,239,126,247,115,588,277,522,292,570,267,622,263,561,284,
  623,244,362,420,368,379,384,422,335,352,412,423,427,399,431,411,389,400,162,165,165,153,186,154,
  208,181,151,195,148,176,430,306,402,311,374,318,436,322,452,96,370,98,371,125,408,121,463,114,
  346,119,429,88,399,88,422,107,386,109,599,365,575,374,594,379,581,391,538,362,581,323,603,320,
  646,294,652,306,637,318,539,319,589,301,414,474,462,491,482,482,436,484,413,488,490,467,428,500,
  446,463,471,445,181,318,335,323,241,315,174,306,342,369,295,391,274,376,311,382,320,398,295,375,
  347,394,523,396,501,399,509,371,542,402,537,382,308,448,324,473,296,480,263,445,254,457,283,470,
  261,469,469,317,485,303,507,332,436,290,489,343,409,270,458,290,577,477,567,490,527,475,424,12,
  444,15,429,32,405,21,375,27,348,31,326,35,535,40,536,15,513,12,500,30,512,55,504,80,
  654,95,664,74,641,70,629,92,606,104,707,187,729,188,727,166,701,162,683,144,769,293,753,304,
  749,282,734,262,715,390,710,371,732,375,756,369,676,472,684,451,693,430,595,547,582,530,569,511,
  448,587,459,567,469,547,328,583,339,564,349,544,200,521,192,503,117,440,103,456,57,378,71,364,
  54,257,84,179,151,105,272,43
];

// Flat [a,b,...] tie pairs.
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
  18,162,132,166,167,168,168,169,169,170,170,171,171,172,172,173,167,170,174,175,175,176,176,177,
  177,178,178,179,174,178,180,181,181,182,182,183,183,184,180,183,185,186,186,187,187,188,188,189,
  185,188,190,191,191,192,192,193,190,192,194,195,195,196,196,197,194,196,198,199,199,200,201,202,
  202,203,204,205,205,206,207,208,208,209,210,211,212,213,214,215
];

const VICTIMS = [8,19,20,26,27,30,72,114,129,154,159,174,193];

const GANG = [
  0,1,0,0,1,0,1,0,1,0,0,0,1,1,1,1,0,0,1,0,0,1,1,1,0,1,1,0,0,1,0,0,1,1,0,0,1,0,1,1,1,0,0,0,1,1,1,0,1,0,
  1,0,0,0,1,0,0,0,0,0,1,0,0,1,0,0,0,0,0,0,1,1,1,0,0,0,1,0,0,1,1,1,0,0,0,0,0,0,1,0,0,0,1,1,1,0,1,0,0,0,
  1,1,1,0,0,0,1,0,1,0,1,1,1,0,0,1,0,1,0,0,0,1,0,1,1,0,0,0,1,1,0,0,1,0,0,0,1,0,1,1,1,0,0,0,0,1,0,1,0,0,
  1,0,0,0,1,0,0,1,0,0,0,0,1,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
  0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0
];

// ─── Graph precomputation (module level, runs once) ───────────────────────────
const N = POS.length / 2;
const XY = (i) => [POS[2 * i], POS[2 * i + 1]];

const ADJ = (() => {
  const a = Array.from({ length: N }, () => []);
  for (let k = 0; k < TIES.length; k += 2) { a[TIES[k]].push(TIES[k + 1]); a[TIES[k + 1]].push(TIES[k]); }
  return a;
})();
const DEG = ADJ.map((a) => a.length);

const COMP = (() => {
  const c = new Array(N).fill(-1); let n = 0;
  for (let s = 0; s < N; s++) {
    if (c[s] !== -1) continue;
    const q = [s]; c[s] = n;
    for (let h = 0; h < q.length; h++) for (const w of ADJ[q[h]]) if (c[w] === -1) { c[w] = n; q.push(w); }
    n++;
  }
  return { comp: c, ncomp: n };
})();
const COMP_SIZE = (() => { const s = new Array(COMP.ncomp).fill(0); COMP.comp.forEach((c) => s[c]++); return s; })();
const LC = COMP_SIZE.indexOf(Math.max(...COMP_SIZE));
const VSET = new Set(VICTIMS);

// Multi-source BFS from all victims: distance to the NEAREST victim, plus the
// next hop along a shortest path toward one.
const { NEAR, NEXT } = (() => {
  const d = new Array(N).fill(null), nx = new Array(N).fill(null);
  const q = [...VICTIMS]; VICTIMS.forEach((v) => { d[v] = 0; });
  for (let h = 0; h < q.length; h++) {
    const v = q[h];
    for (const w of ADJ[v]) if (d[w] === null) { d[w] = d[v] + 1; nx[w] = v; q.push(w); }
  }
  return { NEAR: d, NEXT: nx };
})();

// Mean geodesic distance to every victim in one's own component (the paper's
// "distance to shooting/homicide victim" variable).
const MEAN_D = (() => {
  const acc = new Array(N).fill(0), cnt = new Array(N).fill(0);
  VICTIMS.forEach((v) => {
    const d = new Array(N).fill(null); d[v] = 0; const q = [v];
    for (let h = 0; h < q.length; h++) for (const w of ADJ[q[h]]) if (d[w] === null) { d[w] = d[q[h]] + 1; q.push(w); }
    for (let i = 0; i < N; i++) if (i !== v && d[i] !== null) { acc[i] += d[i]; cnt[i]++; }
  });
  return acc.map((s, i) => (cnt[i] ? s / cnt[i] : null));
})();

const STATS = (() => {
  const withD = MEAN_D.filter((x) => x !== null);
  return {
    ties: TIES.length / 2,
    meanDeg: (TIES.length / N).toFixed(2),
    ncomp: COMP.ncomp,
    lcSize: COMP_SIZE[LC],
    lcPct: Math.round((COMP_SIZE[LC] / N) * 100),
    victims: VICTIMS.length,
    vicInLC: VICTIMS.filter((v) => COMP.comp[v] === LC).length,
    vicPctLC: Math.round((VICTIMS.filter((v) => COMP.comp[v] === LC).length / VICTIMS.length) * 100),
    meanGeo: (withD.reduce((a, b) => a + b, 0) / withD.length).toFixed(2),
    gangPct: Math.round((GANG.reduce((a, b) => a + b, 0) / N) * 100),
  };
})();

// ─── Illustrative risk model ─────────────────────────────────────────────────
// Slopes are the published odds ratios per unit of social distance:
//   largest component OR = 0.754 (95% CI 0.654–0.869)
//   complete network  OR = 0.912 (95% CI 0.844–0.985)
// The intercept is chosen so that the curve passes through the sample base rate
// (~5%) at the sample mean distance (4.69). It is NOT the authors' fitted
// intercept, which is not reported. Shape is faithful; absolute level is not.
const B_LC = Math.log(0.754), B_ALL = Math.log(0.912);
const BASE_D = 4.69, LOGIT_BASE = Math.log(0.05 / 0.95);
const A_LC = LOGIT_BASE - B_LC * BASE_D, A_ALL = LOGIT_BASE - B_ALL * BASE_D;
const pHat = (d, lc) => { const z = (lc ? A_LC + B_LC * d : A_ALL + B_ALL * d); return 1 / (1 + Math.exp(-z)); };

// ─── View modes ──────────────────────────────────────────────────────────────
const MODES = [
  { id: "distance",  label: "NETWORK POSITION",
    caption: "Shading gives each person's distance, in ties, to the nearest gunshot victim. Risk falls off with every step." },
  { id: "component", label: "COMPONENTS",
    caption: "The largest connected component holds " + STATS.lcPct + "% of the sample and " + STATS.vicPctLC + "% of the gunshot victims." },
  { id: "factors",   label: "RISK FACTORS ONLY",
    caption: "The same people described only by an individual attribute (gang membership, " + STATS.gangPct + "% here). The concentration of injury is invisible." },
];

// ─── Concept cards ───────────────────────────────────────────────────────────
const INFO = {
  GEODESIC: {
    full: "Geodesic distance", color: C.sel,
    body: "The geodesic distance between two people is the length of the shortest chain of ties connecting them: one handshake, two handshakes, and so on. Papachristos and colleagues measured each person's mean geodesic distance to every gunshot victim in their component, capturing indirect exposure that a count of one's immediate friends misses entirely. In the Boston sample that average was 4.69, so a typical person in this network sat under five handshakes from someone who had been shot.",
    refs: [{ text: "Papachristos, Braga & Hureau (2012) J. Urban Health", url: "https://doi.org/10.1007/s11524-012-9703-9" },
           { text: "Wasserman & Faust (1994) Social Network Analysis", url: "https://doi.org/10.1017/CBO9780511815478" }],
  },
  COMPONENT: {
    full: "Connected component", color: C.ink,
    body: "A component is a set of people all reachable from one another through some chain of ties, and unreachable from anyone outside it. The Boston network of 763 individuals broke into 57 components, but 579 people (76%) fell into a single large one, and 85% of the gunshot victims were inside it. Concentration of this kind is the central empirical claim: risk is not spread evenly across a high-risk population, it pools in one structure.",
    refs: [{ text: "Papachristos, Braga & Hureau (2012) J. Urban Health", url: "https://doi.org/10.1007/s11524-012-9703-9" },
           { text: "Papachristos & Wildeman (2014) Am. J. Public Health", url: "https://doi.org/10.2105/AJPH.2013.301441" }],
  },
  DECAY: {
    full: "Distance decay of risk", color: C.vic,
    body: "Within the large Boston component, each additional tie separating a person from a gunshot victim reduced the odds of being shot by roughly 25% (OR = 0.754, 95% CI 0.654 to 0.869). Across the complete network the same effect was weaker (OR = 0.912). The Chicago homicide replication found a steeper gradient still: each social tie removed from a homicide victim cut the odds by 57%, with 41% of gun homicides inside a component holding under 4% of the neighborhood.",
    refs: [{ text: "Papachristos, Braga & Hureau (2012) J. Urban Health", url: "https://doi.org/10.1007/s11524-012-9703-9" },
           { text: "Papachristos & Wildeman (2014) Am. J. Public Health", url: "https://doi.org/10.2105/AJPH.2013.301441" },
           { text: "Papachristos, Wildeman & Roberto (2015) Soc. Sci. Med.", url: "https://doi.org/10.1016/j.socscimed.2014.01.056" }],
  },
  DATA: {
    full: "Where the ties come from", color: C.gang,
    body: "Ties were not reported friendships. They were built from Boston Police field intelligence observation cards, records of non-criminal encounters, and two people counted as associates if officers observed them together. This is a conservative and uneven instrument: it misses relationships police never saw, and it records more ties where police patrol more. The authors sampled outward two steps from 238 known gang members, so the network is a snowball around a policed seed, not a census of a neighborhood.",
    refs: [{ text: "Papachristos, Braga & Hureau (2012), Methods", url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC3531351/" },
           { text: "Braga, Papachristos & Hureau (2010) J. Quant. Criminol.", url: "https://doi.org/10.1007/s10940-009-9082-x" }],
  },
  CONTAGION: {
    full: "Contagion or homophily?", color: C.mut,
    body: "Clustering alone cannot tell you why risk clusters. Violence may transmit along ties, or people already alike in risk may simply choose one another, or both may share an unmeasured neighborhood cause. Shalizi and Thomas showed that in observational network data these explanations are generically confounded, and separating them requires either strong parametric assumptions or knowledge that rules out latent homophily. Later work using timing rather than structure alone, modelling gunshot injury as a diffusion process, tightens the case for transmission without settling it.",
    refs: [{ text: "Shalizi & Thomas (2011) Sociol. Methods Res.", url: "https://doi.org/10.1177/0049124111404820" },
           { text: "Green, Horel & Papachristos (2017) JAMA Intern. Med.", url: "https://doi.org/10.1001/jamainternmed.2016.8245" }],
  },
  ACTION: {
    full: "What follows from this", color: C.sel,
    body: "If risk concentrates in a knowable structure, prevention can be aimed rather than broadcast, and that logic underwrites focused deterrence, street outreach, and hospital-based intervention. It also underwrites individually targeted policing, which has fared less well: an evaluation of Chicago's Strategic Subjects List found that people placed on it were no more and no less likely to be shot than matched comparisons, though they were more likely to be arrested for a shooting. A network model can identify who is exposed. It does not by itself say what should be done about it.",
    refs: [{ text: "Saunders, Hunt & Hollywood (2016) J. Exp. Criminol.", url: "https://doi.org/10.1007/s11292-016-9272-0" },
           { text: "Papachristos (2009) Am. J. Sociol.", url: "https://doi.org/10.1086/597791" }],
  },
};
const BADGES = ["GEODESIC", "COMPONENT", "DECAY", "DATA", "CONTAGION", "ACTION"];
const BADGE_LABEL = { GEODESIC: "GEODESIC", COMPONENT: "COMPONENT", DECAY: "DISTANCE DECAY",
  DATA: "THE DATA", CONTAGION: "CONTAGION?", ACTION: "SO WHAT?" };

// ─── Component ───────────────────────────────────────────────────────────────
export default function NetworksOfViolence() {
  const [mode, setMode] = useState("distance");
  const [sel, setSel] = useState(null);
  const [hover, setHover] = useState(null);
  const [info, setInfo] = useState(null);

  // Shortest path from the selected person to the nearest gunshot victim.
  const path = useMemo(() => {
    if (sel === null || NEAR[sel] === null || NEAR[sel] === 0) return [];
    const p = [sel]; let v = sel;
    while (NEXT[v] != null) { v = NEXT[v]; p.push(v); if (NEAR[v] === 0) break; }
    return p;
  }, [sel]);
  const pathSet = useMemo(() => new Set(path), [path]);
  const pathEdges = useMemo(() => {
    const s = new Set();
    for (let k = 1; k < path.length; k++) { const a = path[k - 1], b = path[k]; s.add(a < b ? a + "," + b : b + "," + a); }
    return s;
  }, [path]);

  const pickRandom = () => {
    let i, guard = 0;
    do { i = Math.floor(Math.random() * N); guard++; }
    while ((VSET.has(i) || COMP.comp[i] !== LC || DEG[i] === 0) && guard < 400);
    setSel(i);
  };

  const nodeFill = (i) => {
    if (mode === "component") return COMP.comp[i] === LC ? (VSET.has(i) ? C.vic : "#3d5568") : (VSET.has(i) ? C.vic : C.none);
    if (mode === "factors")   return GANG[i] ? C.gang : "#8fa2af";
    return rampAt(NEAR[i]);
  };
  const nodeR = (i) => (sel === i ? 7.5 : VSET.has(i) && mode !== "factors" ? 6 : pathSet.has(i) ? 5.5 : 4);

  const active = sel !== null ? sel : hover;
  const cur = active !== null
    ? { id: active, deg: DEG[active], comp: COMP.comp[active], compSize: COMP_SIZE[COMP.comp[active]],
        gang: !!GANG[active], near: NEAR[active], mean: MEAN_D[active], victim: VSET.has(active) }
    : null;

  // ─── Risk curve geometry ───────────────────────────────────────────────────
  const CW = 430, CH = 250, cL = 52, cR = CW - 16, cT = 20, cB = CH - 42;
  const dMin = 1, dMax = 8, pMax = 0.14;
  const dx = (d) => cL + ((d - dMin) / (dMax - dMin)) * (cR - cL);
  const py = (p) => cB - (p / pMax) * (cB - cT);
  const curve = (lc) => {
    let s = "";
    for (let d = dMin; d <= dMax; d += 0.1) s += (s ? " L " : "M ") + dx(d).toFixed(1) + " " + py(pHat(d, lc)).toFixed(1);
    return s;
  };
  const PATH_LC = curve(true), PATH_ALL = curve(false);

  const mono = "'DM Mono','Courier New',monospace";
  const stat = (label, value, color) => (
    <div style={{ display: "flex", flexDirection: "column", gap: 3, minWidth: 76 }}>
      <span style={{ fontSize: 9, letterSpacing: ".1em", color: C.faint }}>{label}</span>
      <span style={{ fontSize: 15, color: color || C.ink }}>{value}</span>
    </div>
  );

  return (
    <div style={{
      minHeight: "100vh", background: C.bg, display: "flex", flexDirection: "column",
      alignItems: "center", padding: "32px 14px 52px", fontFamily: mono, color: C.ink,
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:ital,wght@0,300;0,400;0,500;1,400&family=Playfair+Display:ital,wght@0,400;0,600;1,400&display=swap');
        .at-btn { transition: all .18s; border: 1px solid; border-radius: 2px; cursor: pointer;
                  padding: 6px 13px; font-family: 'DM Mono',monospace; font-size: 11px;
                  letter-spacing: .08em; background: transparent; }
        .at-btn:hover { background: rgba(22,34,46,.07); }
        .at-btn:disabled { opacity: .4; cursor: default; }
        .at-node { cursor: pointer; }
        .at-node:hover circle { stroke: #16222e; stroke-width: 1.6; }
        .at-badge { cursor: pointer; transition: all .15s; }
        .at-badge:hover { background: rgba(22,34,46,.07); }
        a { color: #1a6b66; text-underline-offset: 3px; }
        a:hover { color: #14504c; }
      `}</style>

      {/* ── Title ── */}
      <div style={{ textAlign: "center", marginBottom: 16, maxWidth: 760 }}>
        <h1 style={{ fontFamily: "'Playfair Display',serif", fontSize: "clamp(23px,4.4vw,34px)",
          fontWeight: 600, margin: 0, letterSpacing: "-.01em" }}>
          Five Handshakes · Networks and the Risk of Gunshot Injury
        </h1>
        <p style={{ fontSize: 10.5, color: C.mut, margin: "8px 0 0", letterSpacing: ".11em" }}>
          AFTER PAPACHRISTOS, BRAGA &amp; HUREAU (2012) · BOSTON · SYNTHETIC NETWORK, PUBLISHED STATISTICS
        </p>
      </div>

      {/* ── Mode chips ── */}
      <div style={{ display: "flex", gap: 6, marginBottom: 10, flexWrap: "wrap", justifyContent: "center" }}>
        {MODES.map((m) => {
          const on = mode === m.id;
          return (
            <div key={m.id} className="at-badge" onClick={() => setMode(m.id)}
              style={{ fontSize: 10, letterSpacing: ".08em", padding: "6px 11px", borderRadius: 2,
                border: `1px solid ${on ? C.ink : C.border}`, background: on ? C.ink : "transparent",
                color: on ? C.panel : C.mut }}>
              {m.label}
            </div>
          );
        })}
      </div>

      {/* ── Actions ── */}
      <div style={{ display: "flex", gap: 7, marginBottom: 14, flexWrap: "wrap", justifyContent: "center" }}>
        <button className="at-btn" onClick={pickRandom} style={{ borderColor: C.sel, color: C.sel }}>
          ◎ PICK SOMEONE AT RANDOM
        </button>
        <button className="at-btn" onClick={() => setSel(null)} disabled={sel === null}
          style={{ borderColor: C.mut, color: C.mut }}>↺ CLEAR</button>
      </div>

      {/* ── Caption ── */}
      <p style={{ fontSize: 11.5, color: C.mut, margin: "0 0 12px", maxWidth: 640,
        textAlign: "center", lineHeight: 1.7 }}>
        {MODES.find((m) => m.id === mode).caption}
      </p>

      {/* ── Network ── */}
      <div style={{ width: "100%", maxWidth: 820, background: C.panel,
        border: `1px solid ${C.border}`, borderRadius: 3 }}>
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: "block" }}
          onClick={(e) => { if (e.target.tagName === "svg") setSel(null); }}>
          <defs>
            <pattern id="atGrid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke={C.grid} strokeWidth="0.6" />
            </pattern>
          </defs>
          <rect width={W} height={H} fill={C.panel} />
          <rect width={W} height={H} fill="url(#atGrid)" opacity="0.55" />

          {/* ties */}
          <g>
            {Array.from({ length: TIES.length / 2 }, (_, k) => {
              const a = TIES[2 * k], b = TIES[2 * k + 1];
              const key = a < b ? a + "," + b : b + "," + a;
              const onPath = pathEdges.has(key);
              const [x1, y1] = XY(a), [x2, y2] = XY(b);
              const dim = mode === "component" && COMP.comp[a] !== LC;
              return (
                <line key={key} x1={x1} y1={y1} x2={x2} y2={y2}
                  stroke={onPath ? C.sel : C.faint}
                  strokeWidth={onPath ? 2.4 : 0.9}
                  opacity={onPath ? 1 : sel !== null ? 0.28 : dim ? 0.32 : 0.55} />
              );
            })}
          </g>

          {/* nodes */}
          <g>
            {Array.from({ length: N }, (_, i) => {
              const [x, y] = XY(i);
              const isSel = sel === i, onPath = pathSet.has(i);
              const dimmed = sel !== null && !onPath;
              return (
                <g key={i} className="at-node"
                  onClick={(e) => { e.stopPropagation(); setSel(sel === i ? null : i); }}
                  onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
                  <circle cx={x} cy={y} r={Math.max(nodeR(i), 10)} fill="transparent" />
                  {VSET.has(i) && mode !== "factors" && (
                    <circle cx={x} cy={y} r={9} fill="none" stroke={C.vic}
                      strokeWidth="1" opacity={dimmed ? 0.22 : 0.55} />
                  )}
                  <circle cx={x} cy={y} r={nodeR(i)} fill={nodeFill(i)}
                    opacity={dimmed ? 0.3 : 1}
                    stroke={isSel ? C.sel : VSET.has(i) && mode !== "factors" ? "#7d1f19"
                      : mode === "factors" && GANG[i] ? "#7d5a1c" : "none"}
                    strokeWidth={isSel ? 2.4 : 1} />
                  {isSel && <circle cx={x} cy={y} r={13} fill="none" stroke={C.sel}
                    strokeWidth="1.1" strokeDasharray="3,3" opacity="0.85" />}
                </g>
              );
            })}
          </g>

          {/* legend */}
          <g transform="translate(16,528)">
            <rect x="0" y="0" width="286" height="56" rx="2" fill={C.panel} opacity="0.94"
              stroke={C.border} strokeWidth="0.8" />
            {mode === "distance" && <>
              <text x="10" y="17" fontSize="9" fill={C.mut} letterSpacing=".08em">TIES TO NEAREST GUNSHOT VICTIM</text>
              {RAMP.map((col, k) => (
                <g key={k}>
                  <rect x={10 + k * 26} y="24" width="22" height="10" fill={col} />
                  <text x={21 + k * 26} y="47" fontSize="8.5" fill={C.faint} textAnchor="middle">
                    {k === 0 ? "0" : k === RAMP.length - 1 ? "7+" : String(k)}
                  </text>
                </g>
              ))}
            </>}
            {mode === "component" && <>
              <text x="10" y="17" fontSize="9" fill={C.mut} letterSpacing=".08em">COMPONENT MEMBERSHIP</text>
              <circle cx="17" cy="31" r="4.5" fill="#3d5568" />
              <text x="28" y="34" fontSize="9" fill={C.mut}>largest ({STATS.lcSize})</text>
              <circle cx="132" cy="31" r="4.5" fill={C.none} />
              <text x="143" y="34" fontSize="9" fill={C.mut}>other ({STATS.ncomp - 1})</text>
              <circle cx="232" cy="31" r="5.5" fill={C.vic} />
              <text x="243" y="34" fontSize="9" fill={C.mut}>shot</text>
            </>}
            {mode === "factors" && <>
              <text x="10" y="17" fontSize="9" fill={C.mut} letterSpacing=".08em">INDIVIDUAL ATTRIBUTE ONLY</text>
              <circle cx="17" cy="31" r="4.5" fill={C.gang} stroke="#7d5a1c" strokeWidth="0.8" />
              <text x="28" y="34" fontSize="9" fill={C.mut}>gang-associated</text>
              <circle cx="152" cy="31" r="4.5" fill="#8fa2af" />
              <text x="163" y="34" fontSize="9" fill={C.mut}>not</text>
            </>}
          </g>

          {/* scale note */}
          <text x={W - 14} y={H - 14} textAnchor="end" fontSize="8.5" fill={C.faint} letterSpacing=".06em">
            {N} PEOPLE · {STATS.ties} TIES · SCHEMATIC, NOT THE AUTHORS&rsquo; DATA
          </text>
        </svg>
      </div>

      {/* ── Structural statistics ── */}
      <div style={{ display: "flex", gap: 22, flexWrap: "wrap", justifyContent: "center",
        margin: "16px 0 6px", padding: "12px 18px", background: C.panel,
        border: `1px solid ${C.border}`, borderRadius: 3, maxWidth: 820 }}>
        {stat("PEOPLE", N)}
        {stat("TIES", STATS.ties)}
        {stat("MEAN TIES", STATS.meanDeg)}
        {stat("COMPONENTS", STATS.ncomp)}
        {stat("LARGEST", `${STATS.lcSize} · ${STATS.lcPct}%`)}
        {stat("SHOT", STATS.victims, C.vic)}
        {stat("SHOT IN LARGEST", `${STATS.vicPctLC}%`, C.vic)}
        {stat("MEAN DISTANCE", STATS.meanGeo, C.sel)}
      </div>

      {/* ── Readout + curve ── */}
      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", justifyContent: "center",
        marginTop: 12, width: "100%", maxWidth: 820 }}>

        {/* readout */}
        <div style={{ flex: "1 1 300px", minWidth: 280, background: C.panel,
          border: `1px solid ${C.border}`, borderRadius: 3, padding: "14px 16px" }}>
          {cur === null ? (
            <p style={{ margin: 0, fontSize: 11.5, color: C.mut, lineHeight: 1.75 }}>
              Tap any person in the network, or press <em>pick someone at random</em>. The panel reports
              their position and traces the shortest chain of ties from them to the nearest person who
              has been shot.
            </p>
          ) : (
            <>
              <div style={{ fontSize: 10, letterSpacing: ".12em", color: C.faint, marginBottom: 10 }}>
                PERSON #{String(cur.id).padStart(3, "0")}
                {cur.victim && <span style={{ color: C.vic, marginLeft: 8 }}>· GUNSHOT VICTIM</span>}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 14px" }}>
                {stat("TIES", cur.deg)}
                {stat("COMPONENT", `${cur.compSize}${cur.comp === LC ? " · largest" : ""}`)}
                {stat("GANG-ASSOCIATED", cur.gang ? "yes" : "no", cur.gang ? C.gang : C.mut)}
                {stat("NEAREST VICTIM", cur.near === null ? "none in component"
                  : cur.near === 0 ? "self" : `${cur.near} ${cur.near === 1 ? "tie" : "ties"}`,
                  cur.near === null ? C.mut : rampAt(cur.near))}
                {stat("MEAN DISTANCE", cur.mean === null ? "—" : cur.mean.toFixed(2), C.sel)}
                {stat("MODELLED RISK", cur.mean === null ? "—"
                  : (pHat(cur.mean, cur.comp === LC) * 100).toFixed(1) + "%", C.vic)}
              </div>
              {cur.near !== null && cur.near > 0 && (
                <p style={{ margin: "12px 0 0", fontSize: 11, color: C.mut, lineHeight: 1.7 }}>
                  {cur.near} {cur.near === 1 ? "handshake" : "handshakes"} from someone who has been shot.
                  The highlighted chain is one shortest path.
                </p>
              )}
              {cur.near === null && (
                <p style={{ margin: "12px 0 0", fontSize: 11, color: C.mut, lineHeight: 1.7 }}>
                  No one in this small component was shot, and no chain of observed ties reaches anyone
                  who was. The network measure is undefined here.
                </p>
              )}
            </>
          )}
        </div>

        {/* curve */}
        <div style={{ flex: "1 1 340px", minWidth: 300, background: C.panel,
          border: `1px solid ${C.border}`, borderRadius: 3, padding: "8px 6px 4px" }}>
          <svg viewBox={`0 0 ${CW} ${CH}`} width="100%" style={{ display: "block" }}>
            {/* frame */}
            <line x1={cL} y1={cT} x2={cL} y2={cB} stroke={C.border} strokeWidth="1" />
            <line x1={cL} y1={cB} x2={cR} y2={cB} stroke={C.border} strokeWidth="1" />
            {[0, 0.02, 0.04, 0.06, 0.08, 0.10, 0.12, 0.14].map((p) => (
              <g key={p}>
                <line x1={cL} y1={py(p)} x2={cR} y2={py(p)} stroke={C.grid} strokeWidth="0.7" />
                <text x={cL - 7} y={py(p) + 3} textAnchor="end" fontSize="8.5" fill={C.faint}>
                  {(p * 100).toFixed(0)}%
                </text>
              </g>
            ))}
            {[1, 2, 3, 4, 5, 6, 7, 8].map((d) => (
              <text key={d} x={dx(d)} y={cB + 14} textAnchor="middle" fontSize="8.5" fill={C.faint}>{d}</text>
            ))}
            <text x={(cL + cR) / 2} y={CH - 10} textAnchor="middle" fontSize="9" fill={C.mut} letterSpacing=".07em">
              MEAN DISTANCE TO A GUNSHOT VICTIM (TIES)
            </text>
            <text x="13" y={(cT + cB) / 2} textAnchor="middle" fontSize="9" fill={C.mut}
              letterSpacing=".07em" transform={`rotate(-90,13,${(cT + cB) / 2})`}>
              MODELLED PROBABILITY
            </text>

            {/* sample mean marker */}
            <line x1={dx(BASE_D)} y1={cT} x2={dx(BASE_D)} y2={cB} stroke={C.faint}
              strokeWidth="1" strokeDasharray="3,3" opacity="0.8" />
            <text x={dx(BASE_D)} y={cT - 6} textAnchor="middle" fontSize="8" fill={C.faint}>
              sample mean 4.69
            </text>

            {/* curves */}
            <path d={PATH_ALL} fill="none" stroke={C.mut} strokeWidth="1.7" strokeDasharray="5,3" />
            <path d={PATH_LC} fill="none" stroke={C.vic} strokeWidth="2.4" />

            {/* selected marker */}
            {cur && cur.mean !== null && cur.mean >= dMin && cur.mean <= dMax && (
              <g>
                <line x1={dx(cur.mean)} y1={py(pHat(cur.mean, cur.comp === LC))} x2={dx(cur.mean)} y2={cB}
                  stroke={C.sel} strokeWidth="1" opacity="0.6" />
                <circle cx={dx(cur.mean)} cy={py(pHat(cur.mean, cur.comp === LC))} r="5"
                  fill={C.sel} stroke={C.panel} strokeWidth="1.6" />
              </g>
            )}

            {/* key */}
            <g transform={`translate(${cR - 158},${cT + 4})`}>
              <line x1="0" y1="6" x2="20" y2="6" stroke={C.vic} strokeWidth="2.4" />
              <text x="26" y="9" fontSize="8.5" fill={C.mut}>largest component · OR 0.754</text>
              <line x1="0" y1="21" x2="20" y2="21" stroke={C.mut} strokeWidth="1.7" strokeDasharray="5,3" />
              <text x="26" y="24" fontSize="8.5" fill={C.mut}>complete network · OR 0.912</text>
            </g>
          </svg>
          <p style={{ margin: "2px 10px 8px", fontSize: 9.5, color: C.faint, lineHeight: 1.6, fontStyle: "italic" }}>
            Slopes are the published odds ratios. The intercept is set so each curve passes through the
            sample base rate at the sample mean distance; the authors do not report one, so absolute
            levels here are illustrative and only the shape is faithful.
          </p>
        </div>
      </div>

      {/* ── Concept badges ── */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "center", marginTop: 18 }}>
        {BADGES.map((k) => {
          const on = info === k;
          return (
            <div key={k} className="at-badge" onClick={() => setInfo(on ? null : k)}
              style={{ fontSize: 10, letterSpacing: ".08em", padding: "6px 11px", borderRadius: 2,
                border: `1px solid ${on ? INFO[k].color : C.border}`,
                background: on ? INFO[k].color : "transparent",
                color: on ? C.panel : C.mut }}>
              {BADGE_LABEL[k]}
            </div>
          );
        })}
      </div>

      {/* ── Info card ── */}
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
              <span key={r.url}>
                {i > 0 ? " · " : ""}
                <a href={r.url} target="_blank" rel="noopener">{r.text}</a>
              </span>
            ))}
          </p>
        </div>
      )}

      {/* ── Description and references ── */}
      <div style={{ marginTop: 24, maxWidth: 660, fontSize: 11.5, color: C.mut,
        lineHeight: 1.85, textAlign: "center" }}>
        <p style={{ margin: "0 0 10px" }}>
          Individual and neighbourhood risk factors explain why some places have more gun violence than
          others, yet most people in a high-risk population are never shot. Papachristos and colleagues
          asked a structural question instead: where does a person sit relative to others who have been
          shot? In Boston, 85% of the gunshot victims in a 763-person network fell inside a single
          connected component, and each additional tie separating someone from a victim cut their odds of
          being shot by about a quarter. The Chicago replications found the same shape at city scale.
        </p>
        <p style={{ margin: "0 0 10px", fontStyle: "italic", color: C.faint }}>
          The network shown is synthetic, generated to reproduce the published structural statistics.
          It is not the authors&rsquo; data, which are not public. Click any badge above for the
          measurement details, the limits of police-observed ties, and the contagion-versus-homophily
          problem.
        </p>
        <p style={{ margin: 0 }}>
          References:{" "}
          <a href="https://doi.org/10.1007/s11524-012-9703-9" target="_blank" rel="noopener">Papachristos, Braga &amp; Hureau (2012)</a>{" · "}
          <a href="https://doi.org/10.2105/AJPH.2013.301441" target="_blank" rel="noopener">Papachristos &amp; Wildeman (2014)</a>{" · "}
          <a href="https://doi.org/10.1016/j.socscimed.2014.01.056" target="_blank" rel="noopener">Papachristos, Wildeman &amp; Roberto (2015)</a>{" · "}
          <a href="https://doi.org/10.1001/jamainternmed.2016.8245" target="_blank" rel="noopener">Green, Horel &amp; Papachristos (2017)</a>{" · "}
          <a href="https://doi.org/10.1086/597791" target="_blank" rel="noopener">Papachristos (2009)</a>{" · "}
          <a href="https://doi.org/10.1007/s10940-009-9082-x" target="_blank" rel="noopener">Braga, Papachristos &amp; Hureau (2010)</a>{" · "}
          <a href="https://doi.org/10.1177/0049124111404820" target="_blank" rel="noopener">Shalizi &amp; Thomas (2011)</a>{" · "}
          <a href="https://doi.org/10.1007/s11292-016-9272-0" target="_blank" rel="noopener">Saunders, Hunt &amp; Hollywood (2016)</a>
        </p>
        <p style={{ margin: "14px 0 0", fontSize: 10.5, color: C.faint, lineHeight: 1.7 }}>
          Full text of the Boston study is open access at{" "}
          <a href="https://pmc.ncbi.nlm.nih.gov/articles/PMC3531351/" target="_blank" rel="noopener">PubMed Central</a>.
        </p>
      </div>
    </div>
  );
}
