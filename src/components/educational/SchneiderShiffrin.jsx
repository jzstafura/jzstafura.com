import { useState, useEffect, useRef } from "react";

// ─── Palette: lab notebook (matches crispr-cas9.jsx) ──────────────────────────
const C = {
  bg: "#f5efe2",
  panel: "#faf5e8",
  panelSoft: "#fdf9ee",
  border: "#c8bea5",
  borderSoft: "#dcd3b9",
  ink: "#1f2025",
  inkSoft: "#3a3a45",
  inkMuted: "#6b6354",
  inkFaint: "#8a8170",
  grid: "#e3d9bf",
  gridLight: "#ede4cc",
  cm: "#3a6a5a",        // automatic / consistent — earthy green
  cmTint: "#dde8e0",
  vm: "#2a5a8a",        // controlled / varied — notebook ink blue
  vmTint: "#d7e0ea",
  good: "#3a6a5a",
  warn: "#9a2a2a",
  accent: "#a85a2a",
};

// ─── Stimuli ──────────────────────────────────────────────────────────────────
const LETTERS_A = ["B","C","D","F","G","H","J","K","L"];
const LETTERS_B = ["M","N","P","R","S","T","V","W","Z"];
const DIGITS    = ["2","3","4","5","6","7","8","9"];
const SET_SIZES = [1, 2, 4];

// ─── Utils ────────────────────────────────────────────────────────────────────
const shuffle = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};
const sample = (arr, n) => shuffle(arr).slice(0, n);
const mean = (arr) => arr.length === 0 ? null : arr.reduce((s, x) => s + x, 0) / arr.length;

// Build a 12-trial block: 3 set sizes × 2 reps × 2 (present/absent)
function generateBlock(condition) {
  const memorySet = sample(LETTERS_A, 2);
  const distractorPool = condition === "cm"
    ? DIGITS
    : LETTERS_B.filter(l => !memorySet.includes(l));

  const trials = [];
  for (const sz of SET_SIZES) {
    for (let p = 0; p < 2; p++) {
      // Target-present
      const dist = sample(distractorPool, sz - 1);
      const tgt  = memorySet[Math.floor(Math.random() * memorySet.length)];
      trials.push({ setSize: sz, present: true, items: shuffle([...dist, tgt]) });
      // Target-absent
      trials.push({ setSize: sz, present: false, items: sample(distractorPool, sz) });
    }
  }
  return { memorySet, trials: shuffle(trials) };
}

// ─── Canonical reference curves (after Schneider & Shiffrin, 1977, Exp 2) ────
// Memory set size = 2. Values approximate the qualitative pattern reported:
// CM after extensive practice ~5–15 ms/item; VM ~50–80 ms/item.
const CANON = {
  cm: { 1: 435, 2: 450, 4: 475 },
  vm: { 1: 510, 2: 595, 4: 745 },
};

// ─── Info cards ───────────────────────────────────────────────────────────────
const INFO = {
  controlled: {
    full: "Controlled Processing",
    body: "Serial, capacity-limited, effortful. Requires conscious attention and working-memory resources. Slow and flexible; persistent in Varied Mapping conditions regardless of practice. RT scales linearly with the number of comparisons needed, the signature of self-terminating serial search.",
    color: C.vm,
    refs: [{ text: "Schneider & Shiffrin (1977), Psych Rev 84(1)", url: "https://doi.org/10.1037/0033-295X.84.1.1" }],
  },
  automatic: {
    full: "Automatic Processing",
    body: "Parallel, capacity-free, effortless, hard to inhibit once triggered. Develops only with consistent mapping over many trials (often thousands). Indexed by a flat RT slope across set size: search becomes detection. Logan (1988) later reframed automaticity as memory retrieval of past instances rather than a separate process.",
    color: C.cm,
    refs: [
      { text: "Shiffrin & Schneider (1977), Psych Rev 84(2)", url: "https://doi.org/10.1037/0033-295X.84.2.127" },
      { text: "Logan (1988), Psych Rev 95(4)",                url: "https://doi.org/10.1037/0033-295X.95.4.492" },
    ],
  },
  cm: {
    full: "Consistent Mapping (CM)",
    body: "Targets and distractors are drawn from non-overlapping categories that never swap roles. A letter never appears as a distractor on one trial and a target on the next. With practice, CM trials produce pop-out: slopes flatten toward zero, attention is captured automatically, and performance becomes nearly immune to set size. Schneider & Shiffrin reported CM slopes of ~5–10 ms/item after ~2,100 trials.",
    color: C.cm,
    refs: [{ text: "Schneider & Shiffrin (1977), Exp 2", url: "https://doi.org/10.1037/0033-295X.84.1.1" }],
  },
  vm: {
    full: "Varied Mapping (VM)",
    body: "Targets and distractors are drawn from the same category, and an item can be a target on one trial and a distractor on the next. No stable mapping develops. RT scales with memory-set × display-set size (multiplicative interaction). Reported slopes ~40+ ms/item for memory set 4, essentially unchanged by extended practice.",
    color: C.vm,
    refs: [{ text: "Schneider & Shiffrin (1977), Exp 2", url: "https://doi.org/10.1037/0033-295X.84.1.1" }],
  },
};

// ─── Plot geometry ────────────────────────────────────────────────────────────
const PLT = { W: 640, H: 360, L: 72, R: 600, T: 44, B: 290, yMin: 380, yMax: 850 };
const xToPx = (sz) => PLT.L + ((sz - 1) / 3) * (PLT.R - PLT.L);
const yToPx = (rt) => PLT.B - Math.max(0, Math.min(1, (rt - PLT.yMin) / (PLT.yMax - PLT.yMin))) * (PLT.B - PLT.T);
const Y_TICKS = [400, 500, 600, 700, 800];

// ═════════════════════════════════════════════════════════════════════════════
// Main component
// ═════════════════════════════════════════════════════════════════════════════
export default function SchneiderShiffrinApp() {
  const [phase, setPhase]             = useState("intro");      // intro | memorize | task | results
  const [condition, setCondition]     = useState(null);
  const [memorySet, setMemorySet]     = useState([]);
  const [trials, setTrials]           = useState([]);
  const [trialIdx, setTrialIdx]       = useState(0);
  const [substage, setSubstage]       = useState("iti");        // iti | fixation | display | feedback
  const [displayStart, setDisplayStart] = useState(0);
  const [results, setResults]         = useState([]);
  const [lastFeedback, setLastFeedback] = useState(null);
  const [info, setInfo]               = useState(null);
  const [runs, setRuns]               = useState({ cm: null, vm: null });

  const respondedRef = useRef(false);
  const resultsRef   = useRef([]);

  // Start a new block
  const startBlock = (cond) => {
    const { memorySet: ms, trials: ts } = generateBlock(cond);
    resultsRef.current = [];
    setCondition(cond);
    setMemorySet(ms);
    setTrials(ts);
    setTrialIdx(0);
    setResults([]);
    setLastFeedback(null);
    setPhase("memorize");
  };

  const beginTrials = () => {
    setPhase("task");
    setSubstage("iti");
  };

  const resetAll = () => {
    resultsRef.current = [];
    setPhase("intro");
    setCondition(null);
    setMemorySet([]);
    setTrials([]);
    setTrialIdx(0);
    setResults([]);
    setLastFeedback(null);
    setRuns({ cm: null, vm: null });
    setInfo(null);
  };

  // Capture response
  const handleResponse = (resp) => {
    if (substage !== "display" || respondedRef.current) return;
    respondedRef.current = true;
    const rt      = performance.now() - displayStart;
    const trial   = trials[trialIdx];
    const correct = resp !== null && (
      (resp === "present" && trial.present) ||
      (resp === "absent"  && !trial.present)
    );
    const result = {
      setSize:  trial.setSize,
      present:  trial.present,
      response: resp,
      correct,
      rt: resp === null ? null : rt,
    };
    const newResults = [...resultsRef.current, result];
    resultsRef.current = newResults;
    setResults(newResults);
    setLastFeedback({ correct, rt: resp === null ? null : rt, missed: resp === null });
    setSubstage("feedback");
  };

  // Phase / substage state machine
  useEffect(() => {
    if (phase !== "task") return;
    let t;
    if (substage === "iti") {
      t = setTimeout(() => setSubstage("fixation"), 350);
    } else if (substage === "fixation") {
      t = setTimeout(() => {
        respondedRef.current = false;
        setDisplayStart(performance.now());
        setSubstage("display");
      }, 500);
    } else if (substage === "display") {
      t = setTimeout(() => {
        if (!respondedRef.current) handleResponse(null);
      }, 3000);
    } else if (substage === "feedback") {
      t = setTimeout(() => {
        if (trialIdx + 1 >= trials.length) {
          setRuns(prev => ({
            ...prev,
            [condition]: { memorySet, results: resultsRef.current },
          }));
          setPhase("results");
        } else {
          setTrialIdx(i => i + 1);
          setSubstage("iti");
        }
      }, 700);
    }
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, substage, trialIdx, trials.length, condition]);

  // Keyboard handler
  useEffect(() => {
    const onKey = (e) => {
      if (phase === "memorize" && (e.key === " " || e.key === "Enter")) {
        e.preventDefault();
        beginTrials();
        return;
      }
      if (phase !== "task" || substage !== "display") return;
      if (e.key === "f" || e.key === "F") handleResponse("absent");
      else if (e.key === "j" || e.key === "J") handleResponse("present");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, substage, displayStart, trialIdx]);

  return (
    <div style={{
      minHeight: "100vh", background: C.bg,
      display: "flex", flexDirection: "column", alignItems: "center",
      padding: "32px 16px 48px",
      fontFamily: "'DM Mono','Courier New',monospace", color: C.ink,
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:ital,wght@0,300;0,400;0,500;1,400&family=Playfair+Display:ital,wght@0,400;0,600;1,400&display=swap');
        .lb-btn {
          transition: all .18s; border: 1px solid; border-radius: 3px;
          cursor: pointer; padding: 8px 16px; font-family: 'DM Mono',monospace;
          font-size: 12px; letter-spacing: .06em; background: transparent;
        }
        .lb-btn:hover { background: rgba(31,32,37,.06); }
        .lb-btn:disabled { opacity: .4; cursor: default; }
        .lb-btn-primary { background: ${C.ink}; color: ${C.bg}; border-color: ${C.ink}; }
        .lb-btn-primary:hover { background: ${C.inkSoft}; }
        .cond-card {
          padding: 18px 22px; background: ${C.panel};
          border-radius: 4; cursor: pointer; text-align: left;
          font-family: inherit; transition: all .18s;
        }
        .cond-card:hover { transform: translateY(-1px); }
        .resp-btn {
          padding: 14px 24px; font-family: 'DM Mono',monospace;
          font-size: 13px; font-weight: 500; letter-spacing: .1em;
          border: 1.5px solid; border-radius: 4px; cursor: pointer;
          background: ${C.panel}; transition: all .12s; min-width: 140px;
        }
        .resp-btn:hover:not(:disabled) { transform: translateY(-1px); }
        .resp-btn:active:not(:disabled) { transform: translateY(0); }
        .resp-btn:disabled { cursor: default; }
        a { color: #2a5a8a; text-underline-offset: 3px; }
        a:hover { color: #1a4a7a; }
        kbd {
          background: ${C.bg}; padding: 1px 6px;
          border: 1px solid ${C.border}; border-radius: 3px;
          font-family: 'DM Mono',monospace; font-size: 11px;
        }
      `}</style>

      {/* Title */}
      <div style={{ textAlign: "center", marginBottom: 22 }}>
        <h1 style={{
          fontFamily: "'Playfair Display',serif",
          fontSize: "clamp(22px,4vw,32px)", fontWeight: 600,
          color: C.ink, margin: 0, letterSpacing: ".005em",
        }}>
          Controlled vs. Automatic Search
        </h1>
        <p style={{ fontSize: 11, color: C.inkMuted, margin: "6px 0 0", letterSpacing: ".1em" }}>
          AFTER SCHNEIDER &amp; SHIFFRIN (1977) · VISUAL SEARCH PARADIGM
        </p>
      </div>

      {phase === "intro"    && <IntroPanel startBlock={startBlock} />}
      {phase === "memorize" && <MemorizePanel condition={condition} memorySet={memorySet} onBegin={beginTrials} />}
      {phase === "task"     && (
        <TaskPanel
          memorySet={memorySet}
          trial={trials[trialIdx]}
          trialIdx={trialIdx}
          totalTrials={trials.length}
          substage={substage}
          lastFeedback={lastFeedback}
          onRespond={handleResponse}
          condition={condition}
        />
      )}
      {phase === "results"  && (
        <ResultsPanel
          runs={runs}
          startBlock={startBlock}
          resetAll={resetAll}
          info={info}
          setInfo={setInfo}
        />
      )}
    </div>
  );
}

// ─── Intro ────────────────────────────────────────────────────────────────────
function IntroPanel({ startBlock }) {
  return (
    <div style={{ maxWidth: 640, width: "100%", display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{
        background: C.panel, border: `1px solid ${C.border}`, borderRadius: 4,
        padding: "20px 24px",
        boxShadow: "0 1px 0 rgba(31,32,37,.04), 0 0 24px rgba(31,32,37,.05)",
      }}>
        <p style={{ fontSize: 13, lineHeight: 1.7, color: C.inkSoft, margin: 0 }}>
          Schneider &amp; Shiffrin (1977) showed that two qualitatively different modes of
          attention coexist in visual search. When targets and distractors come from stable,
          non-overlapping categories, search becomes <em>automatic</em>: fast, parallel,
          capacity-free. When they share a category, search stays <em>controlled</em>: serial,
          effortful, capacity-limited. This task gives a brief taste of each.
        </p>
      </div>

      <div style={{ fontSize: 10, color: C.inkMuted, letterSpacing: ".1em", paddingLeft: 4 }}>
        CHOOSE A CONDITION
      </div>

      <button className="cond-card" onClick={() => startBlock("cm")}
        style={{ border: `1.5px solid ${C.cm}` }}
        onMouseEnter={e => e.currentTarget.style.background = C.cmTint}
        onMouseLeave={e => e.currentTarget.style.background = C.panel}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, marginBottom: 4 }}>
          <span style={{ fontSize: 13, fontWeight: 500, color: C.cm, letterSpacing: ".08em" }}>
            CONSISTENT MAPPING
          </span>
          <span style={{ fontSize: 10, color: C.inkFaint, fontStyle: "italic" }}>letters among digits</span>
        </div>
        <div style={{ fontSize: 12, color: C.inkMuted, lineHeight: 1.55 }}>
          Target letters appear among digit distractors. Categories never swap.
          Hypothesized to engage automatic, parallel processing.
        </div>
      </button>

      <button className="cond-card" onClick={() => startBlock("vm")}
        style={{ border: `1.5px solid ${C.vm}` }}
        onMouseEnter={e => e.currentTarget.style.background = C.vmTint}
        onMouseLeave={e => e.currentTarget.style.background = C.panel}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, marginBottom: 4 }}>
          <span style={{ fontSize: 13, fontWeight: 500, color: C.vm, letterSpacing: ".08em" }}>
            VARIED MAPPING
          </span>
          <span style={{ fontSize: 10, color: C.inkFaint, fontStyle: "italic" }}>letters among letters</span>
        </div>
        <div style={{ fontSize: 12, color: C.inkMuted, lineHeight: 1.55 }}>
          Target letters appear among other letter distractors. Same category.
          Hypothesized to require controlled, serial search.
        </div>
      </button>

      <p style={{ fontSize: 11, color: C.inkFaint, textAlign: "center", marginTop: 4, fontStyle: "italic" }}>
        Keyboard recommended for cleaner reaction times.
      </p>
    </div>
  );
}

// ─── Memorize ─────────────────────────────────────────────────────────────────
function MemorizePanel({ condition, memorySet, onBegin }) {
  const accent = condition === "cm" ? C.cm : C.vm;
  const condName = condition === "cm" ? "CONSISTENT MAPPING" : "VARIED MAPPING";
  const distractorDescription = condition === "cm" ? "digits" : "other letters";

  return (
    <div style={{ maxWidth: 640, width: "100%", display: "flex", flexDirection: "column", gap: 18 }}>
      <div style={{
        background: C.panel, border: `1px solid ${C.border}`, borderRadius: 4,
        padding: "28px 24px", textAlign: "center",
      }}>
        <div style={{ fontSize: 9, color: accent, letterSpacing: ".15em", marginBottom: 4 }}>
          {condName}
        </div>
        <div style={{ fontSize: 10, color: C.inkMuted, letterSpacing: ".1em", marginBottom: 16 }}>
          MEMORIZE THESE TARGET LETTERS
        </div>
        <div style={{
          fontFamily: "'DM Mono',monospace", fontSize: 56, letterSpacing: ".25em",
          color: accent, fontWeight: 500, padding: "8px 0",
        }}>
          {memorySet.join("  ")}
        </div>
        <div style={{ fontSize: 12, color: C.inkSoft, lineHeight: 1.7, maxWidth: 480, margin: "16px auto 0" }}>
          You will see brief displays of {distractorDescription} that may or may not contain a
          target letter. Press <kbd>J</kbd> if a target is <strong>present</strong>,
          <kbd>F</kbd> if <strong>absent</strong>. Respond as quickly and accurately as possible.
        </div>
      </div>
      <button onClick={onBegin} className="lb-btn lb-btn-primary"
        style={{ alignSelf: "center", padding: "10px 30px" }}>
        BEGIN · 12 TRIALS
      </button>
      <p style={{ fontSize: 10, color: C.inkFaint, textAlign: "center", margin: 0, fontStyle: "italic" }}>
        or press <kbd style={{ fontSize: 10 }}>space</kbd>
      </p>
    </div>
  );
}

// ─── Task ─────────────────────────────────────────────────────────────────────
function TaskPanel({ memorySet, trial, trialIdx, totalTrials, substage, lastFeedback, onRespond, condition }) {
  const accent = condition === "cm" ? C.cm : C.vm;
  return (
    <div style={{ maxWidth: 640, width: "100%", display: "flex", flexDirection: "column", gap: 14 }}>
      {/* Header strip: memory set + progress */}
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        fontSize: 11, color: C.inkMuted, padding: "0 4px",
      }}>
        <span style={{ letterSpacing: ".08em" }}>
          TARGETS:{" "}
          <span style={{ color: accent, fontWeight: 500, letterSpacing: ".15em" }}>
            {memorySet.join(" ")}
          </span>
        </span>
        <span style={{ letterSpacing: ".08em" }}>
          TRIAL {String(trialIdx + 1).padStart(2, "0")} / {String(totalTrials).padStart(2, "0")}
        </span>
      </div>

      {/* Display panel */}
      <div style={{
        background: C.panel, border: `1px solid ${C.border}`, borderRadius: 4,
        height: 220, display: "flex", alignItems: "center", justifyContent: "center",
        position: "relative", boxShadow: "inset 0 1px 0 rgba(31,32,37,.03)",
        backgroundImage: `linear-gradient(${C.gridLight} 1px, transparent 1px), linear-gradient(90deg, ${C.gridLight} 1px, transparent 1px)`,
        backgroundSize: "20px 20px",
      }}>
        {substage === "fixation" && (
          <div style={{ fontSize: 32, color: C.inkMuted, fontFamily: "'DM Mono',monospace" }}>+</div>
        )}
        {substage === "display" && trial && (
          <div style={{
            display: "flex", gap: "clamp(20px, 6vw, 52px)",
            fontFamily: "'DM Mono',monospace",
            fontSize: "clamp(38px, 9vw, 60px)",
            color: C.ink, letterSpacing: ".02em",
          }}>
            {trial.items.map((c, i) => <span key={i}>{c}</span>)}
          </div>
        )}
        {substage === "feedback" && lastFeedback && (
          <div style={{ textAlign: "center" }}>
            {lastFeedback.missed ? (
              <>
                <div style={{ fontSize: 28, color: C.accent, marginBottom: 6 }}>—</div>
                <div style={{ fontSize: 10, color: C.inkMuted, letterSpacing: ".08em" }}>NO RESPONSE</div>
              </>
            ) : (
              <>
                <div style={{ fontSize: 32, color: lastFeedback.correct ? C.good : C.warn, marginBottom: 6 }}>
                  {lastFeedback.correct ? "✓" : "✗"}
                </div>
                <div style={{ fontSize: 11, color: C.inkMuted, letterSpacing: ".08em", fontFamily: "'DM Mono',monospace" }}>
                  {Math.round(lastFeedback.rt)} ms
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Response buttons */}
      <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
        <button className="resp-btn"
          onClick={() => onRespond("absent")}
          disabled={substage !== "display"}
          style={{
            borderColor: C.inkFaint, color: C.inkSoft,
            opacity: substage === "display" ? 1 : 0.4,
          }}>
          ABSENT (F)
        </button>
        <button className="resp-btn"
          onClick={() => onRespond("present")}
          disabled={substage !== "display"}
          style={{
            borderColor: accent, color: accent,
            opacity: substage === "display" ? 1 : 0.4,
          }}>
          PRESENT (J)
        </button>
      </div>

      {/* Progress dots */}
      <div style={{ display: "flex", gap: 4, justifyContent: "center", marginTop: 2 }}>
        {Array.from({ length: totalTrials }).map((_, i) => (
          <div key={i} style={{
            width: 6, height: 6, borderRadius: "50%",
            background: i < trialIdx ? accent : i === trialIdx ? `${accent}80` : C.borderSoft,
          }} />
        ))}
      </div>
    </div>
  );
}

// ─── Results ──────────────────────────────────────────────────────────────────
function ResultsPanel({ runs, startBlock, resetAll, info, setInfo }) {
  const summarize = (run) => {
    if (!run) return null;
    const responded = run.results.filter(r => r.rt !== null);
    const correct   = run.results.filter(r => r.correct);
    const acc       = responded.length === 0 ? 0 : correct.length / responded.length;
    const bySize = {};
    for (const sz of SET_SIZES) {
      const ts = correct.filter(r => r.setSize === sz);
      bySize[sz] = ts.length > 0 ? mean(ts.map(r => r.rt)) : null;
    }
    return { acc, bySize, n: run.results.length };
  };
  const cmSum = summarize(runs.cm);
  const vmSum = summarize(runs.vm);

  const justDid = runs.cm && !runs.vm ? "cm" : runs.vm && !runs.cm ? "vm" : null;
  const both    = runs.cm && runs.vm;

  // Slope (per item) for the current user data
  const userSlope = (sum) => {
    if (!sum) return null;
    const v1 = sum.bySize[1], v4 = sum.bySize[4];
    if (v1 == null || v4 == null) return null;
    return (v4 - v1) / 3;
  };

  return (
    <div style={{ maxWidth: 720, width: "100%", display: "flex", flexDirection: "column", gap: 18 }}>
      {/* Summary cards */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <SummaryCard label="CONSISTENT" sum={cmSum} slope={userSlope(cmSum)} color={C.cm} />
        <SummaryCard label="VARIED"     sum={vmSum} slope={userSlope(vmSum)} color={C.vm} />
      </div>

      {/* Plot */}
      <ResultsPlot cmSum={cmSum} vmSum={vmSum} />

      {/* Action buttons */}
      <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
        {!both && (
          <button className="lb-btn lb-btn-primary"
            onClick={() => startBlock(justDid === "cm" ? "vm" : "cm")}>
            ▶ TRY {justDid === "cm" ? "VARIED" : "CONSISTENT"} MAPPING
          </button>
        )}
        <button className="lb-btn" onClick={resetAll}
          style={{ borderColor: C.accent, color: C.accent }}>
          ↺ START OVER
        </button>
      </div>

      {/* Concept badges */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, justifyContent: "center", marginTop: 4 }}>
        {["controlled", "automatic", "cm", "vm"].map(key => (
          <button key={key} className="lb-btn"
            onClick={() => setInfo(info?.key === key ? null : { key, ...INFO[key] })}
            style={{
              borderColor: INFO[key].color, color: INFO[key].color,
              background: info?.key === key ? `${INFO[key].color}15` : "transparent",
            }}>
            {INFO[key].full.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Info card */}
      {info && (
        <div style={{
          background: C.panel, border: `1px solid ${info.color}66`, borderRadius: 4,
          padding: "16px 22px", boxShadow: `0 0 16px ${info.color}22`,
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
            <span style={{ fontFamily: "'Playfair Display',serif", fontSize: 19, color: info.color, fontWeight: 600 }}>
              {info.full}
            </span>
            <button onClick={() => setInfo(null)}
              style={{ background: "none", border: "none", color: C.inkFaint, cursor: "pointer", fontSize: 16 }}>
              ✕
            </button>
          </div>
          <p style={{ fontSize: 12, lineHeight: 1.7, color: C.inkSoft, margin: "0 0 10px" }}>
            {info.body}
          </p>
          <div style={{ fontSize: 11, color: C.inkMuted, letterSpacing: ".05em" }}>
            REFS:{" "}
            {info.refs.map((r, i) => (
              <span key={i}>{i > 0 ? " · " : ""}
                <a href={r.url} target="_blank" rel="noopener">{r.text}</a>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Footer */}
      <div style={{ fontSize: 12, color: C.inkMuted, lineHeight: 1.8, textAlign: "center", marginTop: 4 }}>
        <p style={{ margin: "0 0 8px" }}>
          The dashed curves show Schneider &amp; Shiffrin's central finding: after extensive practice,
          consistent mapping produces a near-flat RT × set size function (automaticity), while varied
          mapping yields steep, multiplicative slopes that persist indefinitely. Twelve trials are not
          enough for full automatization, but the category-distinction effect is usually immediate.
        </p>
        <p style={{ margin: 0 }}>
          References:{" "}
          <a href="https://doi.org/10.1037/0033-295X.84.1.1" target="_blank" rel="noopener">
            Schneider &amp; Shiffrin (1977)
          </a>{" · "}
          <a href="https://doi.org/10.1037/0033-295X.84.2.127" target="_blank" rel="noopener">
            Shiffrin &amp; Schneider (1977)
          </a>{" · "}
          <a href="https://doi.org/10.1037/0033-295X.95.4.492" target="_blank" rel="noopener">
            Logan (1988)
          </a>
        </p>
      </div>
    </div>
  );
}

// ─── Summary card ─────────────────────────────────────────────────────────────
function SummaryCard({ label, sum, slope, color }) {
  const meanRt = (() => {
    if (!sum) return null;
    const vals = SET_SIZES.map(sz => sum.bySize[sz]).filter(v => v !== null);
    return vals.length > 0 ? mean(vals) : null;
  })();

  return (
    <div style={{
      background: C.panel, border: `1px solid ${sum ? color : C.borderSoft}`,
      borderRadius: 4, padding: "12px 16px",
      opacity: sum ? 1 : 0.55,
    }}>
      <div style={{ fontSize: 10, color: sum ? color : C.inkFaint, letterSpacing: ".1em", marginBottom: 10 }}>
        {label} MAPPING
      </div>
      {sum ? (
        <div style={{ display: "flex", gap: 18, flexWrap: "wrap" }}>
          <Stat label="ACCURACY" value={`${Math.round(sum.acc * 100)}%`} />
          <Stat label="MEAN RT" value={meanRt ? `${Math.round(meanRt)} ms` : "—"} />
          <Stat label="SLOPE" value={slope != null ? `${slope > 0 ? "+" : ""}${Math.round(slope)} ms/item` : "—"} />
        </div>
      ) : (
        <div style={{ fontSize: 11, color: C.inkFaint, fontStyle: "italic" }}>not yet run</div>
      )}
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div>
      <div style={{ fontSize: 9, color: C.inkMuted, letterSpacing: ".06em" }}>{label}</div>
      <div style={{ fontSize: 15, color: C.ink, fontWeight: 500, fontFamily: "'DM Mono',monospace" }}>
        {value}
      </div>
    </div>
  );
}

// ─── Results plot ─────────────────────────────────────────────────────────────
function ResultsPlot({ cmSum, vmSum }) {
  const linePathFor = (sum) => {
    if (!sum) return null;
    const pts = SET_SIZES
      .filter(sz => sum.bySize[sz] !== null)
      .map(sz => ({ x: xToPx(sz), y: yToPx(sum.bySize[sz]) }));
    if (pts.length === 0) return null;
    return pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
  };

  const canonPath = (data) =>
    SET_SIZES.map((sz, i) => `${i === 0 ? "M" : "L"} ${xToPx(sz).toFixed(1)} ${yToPx(data[sz]).toFixed(1)}`).join(" ");

  return (
    <div style={{
      background: C.panel, border: `1px solid ${C.border}`, borderRadius: 4,
      overflow: "hidden", boxShadow: "0 1px 0 rgba(31,32,37,.04)",
    }}>
      <svg viewBox={`0 0 ${PLT.W} ${PLT.H}`} style={{ display: "block", width: "100%", height: "auto" }}>
        <defs>
          <pattern id="paperGrid2" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M 20 0 L 0 0 0 20" fill="none" stroke={C.grid} strokeWidth=".5" />
          </pattern>
        </defs>
        <rect x="0" y="0" width={PLT.W} height={PLT.H} fill="url(#paperGrid2)" opacity=".55" />

        {/* Title */}
        <text x={PLT.W / 2} y={26} textAnchor="middle"
          fontFamily="'Playfair Display',serif" fontSize={14} fontStyle="italic"
          fill={C.ink} fontWeight={400}>
          RT × Display Set Size — your data vs. Schneider &amp; Shiffrin (1977)
        </text>

        {/* Y gridlines + ticks */}
        {Y_TICKS.map(y => (
          <g key={y}>
            <line x1={PLT.L} y1={yToPx(y)} x2={PLT.R} y2={yToPx(y)}
              stroke={C.gridLight} strokeWidth={0.7} />
            <text x={PLT.L - 8} y={yToPx(y) + 3} textAnchor="end"
              fontSize={10} fill={C.inkMuted} fontFamily="'DM Mono',monospace">
              {y}
            </text>
          </g>
        ))}

        {/* X ticks */}
        {SET_SIZES.map(sz => (
          <g key={sz}>
            <line x1={xToPx(sz)} y1={PLT.B} x2={xToPx(sz)} y2={PLT.B + 4}
              stroke={C.inkMuted} strokeWidth={0.8} />
            <text x={xToPx(sz)} y={PLT.B + 18} textAnchor="middle"
              fontSize={11} fill={C.inkMuted} fontFamily="'DM Mono',monospace">
              {sz}
            </text>
          </g>
        ))}

        {/* Axes */}
        <line x1={PLT.L} y1={PLT.B} x2={PLT.R} y2={PLT.B} stroke={C.ink} strokeWidth={0.8} />
        <line x1={PLT.L} y1={PLT.T} x2={PLT.L} y2={PLT.B} stroke={C.ink} strokeWidth={0.8} />

        {/* Axis labels */}
        <text x={(PLT.L + PLT.R) / 2} y={PLT.H - 30} textAnchor="middle"
          fontSize={11} fill={C.inkSoft} fontFamily="'DM Mono',monospace" letterSpacing=".08em">
          DISPLAY SET SIZE
        </text>
        <text x={22} y={(PLT.T + PLT.B) / 2} textAnchor="middle"
          fontSize={11} fill={C.inkSoft} fontFamily="'DM Mono',monospace" letterSpacing=".08em"
          transform={`rotate(-90, 22, ${(PLT.T + PLT.B) / 2})`}>
          REACTION TIME (ms)
        </text>

        {/* Canonical CM (dashed, hollow circles) */}
        <path d={canonPath(CANON.cm)} fill="none" stroke={C.cm} strokeWidth={1.4}
          strokeDasharray="5,3" opacity={0.7} />
        {SET_SIZES.map(sz => (
          <circle key={`canc-${sz}`} cx={xToPx(sz)} cy={yToPx(CANON.cm[sz])}
            r={3.2} fill={C.panel} stroke={C.cm} strokeWidth={1.4} opacity={0.8} />
        ))}

        {/* Canonical VM (dashed) */}
        <path d={canonPath(CANON.vm)} fill="none" stroke={C.vm} strokeWidth={1.4}
          strokeDasharray="5,3" opacity={0.7} />
        {SET_SIZES.map(sz => (
          <circle key={`canv-${sz}`} cx={xToPx(sz)} cy={yToPx(CANON.vm[sz])}
            r={3.2} fill={C.panel} stroke={C.vm} strokeWidth={1.4} opacity={0.8} />
        ))}

        {/* User CM (solid, filled circles) */}
        {cmSum && linePathFor(cmSum) && (
          <>
            <path d={linePathFor(cmSum)} fill="none" stroke={C.cm} strokeWidth={2.2} />
            {SET_SIZES.filter(sz => cmSum.bySize[sz] !== null).map(sz => (
              <circle key={`ucm-${sz}`} cx={xToPx(sz)} cy={yToPx(cmSum.bySize[sz])}
                r={5} fill={C.cm} stroke={C.panel} strokeWidth={1.5} />
            ))}
          </>
        )}

        {/* User VM (solid) */}
        {vmSum && linePathFor(vmSum) && (
          <>
            <path d={linePathFor(vmSum)} fill="none" stroke={C.vm} strokeWidth={2.2} />
            {SET_SIZES.filter(sz => vmSum.bySize[sz] !== null).map(sz => (
              <circle key={`uvm-${sz}`} cx={xToPx(sz)} cy={yToPx(vmSum.bySize[sz])}
                r={5} fill={C.vm} stroke={C.panel} strokeWidth={1.5} />
            ))}
          </>
        )}

        {/* Legend */}
        <g transform={`translate(${PLT.R - 196}, ${PLT.T + 6})`}>
          <rect x={-6} y={-4} width={196} height={68}
            fill={C.panelSoft} stroke={C.borderSoft} strokeWidth={0.6} rx={2} opacity={0.9} />
          <line x1={4} y1={10} x2={28} y2={10} stroke={C.cm} strokeWidth={2.2} />
          <text x={32} y={13} fontSize={9} fill={C.cm} fontFamily="'DM Mono',monospace" letterSpacing=".06em">
            YOUR CM
          </text>
          <line x1={100} y1={10} x2={124} y2={10} stroke={C.vm} strokeWidth={2.2} />
          <text x={128} y={13} fontSize={9} fill={C.vm} fontFamily="'DM Mono',monospace" letterSpacing=".06em">
            YOUR VM
          </text>
          <line x1={4} y1={28} x2={28} y2={28} stroke={C.cm} strokeWidth={1.4}
            strokeDasharray="5,3" opacity={0.7} />
          <text x={32} y={31} fontSize={9} fill={C.cm} fontFamily="'DM Mono',monospace" letterSpacing=".06em" opacity={0.85}>
            S&amp;S CM
          </text>
          <line x1={100} y1={28} x2={124} y2={28} stroke={C.vm} strokeWidth={1.4}
            strokeDasharray="5,3" opacity={0.7} />
          <text x={128} y={31} fontSize={9} fill={C.vm} fontFamily="'DM Mono',monospace" letterSpacing=".06em" opacity={0.85}>
            S&amp;S VM
          </text>
          <text x={4} y={52} fontSize={8} fill={C.inkFaint} fontFamily="'DM Mono',monospace" letterSpacing=".04em">
            dashed = canonical (after practice)
          </text>
        </g>

        {/* Notebook frame */}
        <rect x={4} y={4} width={PLT.W - 8} height={PLT.H - 8}
          fill="none" stroke={C.ink} strokeWidth={0.5} opacity={0.25} />
      </svg>
    </div>
  );
}
