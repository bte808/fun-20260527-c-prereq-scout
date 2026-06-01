# Prereq Scout

Prereq Scout is a small local study tool for course review and research-method refreshes. Paste a topic sheet with prerequisite links and self-rated confidence, and it turns that sheet into a study route, bottleneck list, dependency graph, and Markdown plan.

It runs entirely in the browser with static HTML, CSS, and JavaScript. No login, model key, upload, or private environment is required.

Live demo: <https://bte808.github.io/fun-20260527-c-prereq-scout/>

## What It Can Do

- Start from starter sheets for measurement labs, exam review, or paper-method reading
- Parse a plain-text topic sheet: `Topic | prereq1, prereq2 | confidence 0-4 | note`
- Detect missing prerequisites and prerequisite cycles
- Highlight low-confidence bottlenecks that block later topics
- Recommend one "next focus" topic or input fix before the full route
- Separate "repair first", "ready now", and "extend later" study buckets
- Draw a dependency graph that shows what unlocks what
- Export a Markdown study plan for notes, lab logs, or review pages
- Restore your last topic-sheet draft from local browser storage after refreshes

## Good Study And Research Uses

- Planning a chapter review before an exam
- Organizing a methods refresher before reading a paper
- Seeing which lab concepts must be stabilized before data analysis
- Turning a lecture outline into a concrete next-study sequence
- Preparing a tutoring or TA session around topic dependencies instead of intuition alone

## Why It Is Useful

Many study tools show scores or flashcards, but not the order in which understanding should be repaired. Prereq Scout makes that order explicit. If one fragile base concept quietly blocks three later topics, the tool surfaces that relationship before you spend an hour revising the wrong chapter.

This is intentionally not an authority engine. It does not prove a concept is correct, generate citations, validate a course syllabus, or replace the textbook, paper, lecture, or instructor. If you enter formulas, definitions, or methods, check them against your real source material. The bundled sample is example data only.

## Why It Is Interesting

Recent public learning tools keep returning to graph-shaped understanding rather than flat lists. This project applies that idea to local study planning: not "what facts exist," but "what should I repair first so later material becomes reachable."

## Inspiration

Browsed on 2026-05-27 for recent public study-tool ideas. This project borrows only the direction of graph-based learning and local structured review; the implementation, UI, wording, and sample content here are original.

- Show HN: DAG-based Kanji learning through components: <https://mykanji.app/>
- Show HN: Loom, a Markdown knowledge graph for coding-agent execution: <https://github.com/z3z1ma/agent-loom>
- FluencyCraft, a recent vocabulary study tool: <https://fluencycraft.com/>

## Run Locally

Open `index.html` directly, or serve the folder:

```bash
python3 -m http.server 5181
```

Then open <http://localhost:5181/>.

## Validation

```bash
npm test
npm run check
```

The validation covers parsing, missing prerequisites, cycle detection, route generation, and a static check for required files, mobile CSS, README caveats, and sample output quality.

## Core Usage

1. Pick a starter sheet that is close to your situation.
2. Replace the sample with your own chapter or methods topic list.
3. Rate each topic from `0` to `4`.
4. Build the plan.
5. Start with the Next Focus card, then review bottlenecks and the ready-now bucket.
6. Copy or download the Markdown plan into your notes.

Your topic sheet is saved only in this browser's local storage, so a refresh will
bring back the latest draft without uploading it anywhere. Use **Load starter**
if you want to overwrite the draft with one of the bundled examples again.

Example input:

```text
Signals and noise |  | 2 | I remember the intuition but not the formal distinction
Sampling rate | Signals and noise | 1 | Nyquist examples still feel shaky
Aliasing | Sampling rate | 1 | I mix it up with quantization
Uncertainty propagation | Sensor calibration, Quantization error | 1 | Formula steps are easy to lose
```

Confidence scale:

- `0`: blank
- `1`: fragile
- `2`: patchy
- `3`: usable
- `4`: solid

## Later Extensions

- Add per-topic tags such as lecture, lab, formula, or paper-reading
- Import topic sheets from CSV
- Track the same map across multiple review dates
- Export the graph as an image

## License

MIT
