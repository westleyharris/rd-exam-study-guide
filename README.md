# RD Exam Simulator

A faithful practice simulator for the **Registered Dietitian (RD) registration
examination** administered by the Commission on Dietetic Registration (CDR)
through Pearson VUE. It reproduces the exam's unusual *computer-adaptive* format
and scoring as closely as possible, using real practice questions.

---

## Running it on your computer

You need [Node.js](https://nodejs.org) (version 18 or newer). Then, from this
folder:

```bash
npm install       # one-time: install dependencies
npm run dev       # start the app; it opens at http://localhost:5173
```

Leave that terminal running while you use the app. To stop it, press `Ctrl+C`.

To create a standalone build you can open without the dev server:

```bash
npm run build     # outputs a static site into dist/
npm run preview   # serve the built site locally to check it
```

---

## What makes it faithful to the real exam

Everything below is drawn from the CDR *Candidate Handbook (2026)* and *Exam FAQ*:

| Real exam behavior | How it's simulated |
| --- | --- |
| **Variable length, 125–145 questions.** 100–120 scored + 25 unscored "pretest." | The engine always administers ≥125, inserts exactly 25 pretest items that don't affect the score, and can extend to 145. |
| **Adaptive difficulty.** Harder items require fewer correct answers to pass. | A Rasch (1-PL) item-response model. Each answer updates an ability estimate (EAP); the next item is chosen for maximum information at your current ability. |
| **Ends when the result is certain.** Clear pass/fail stops early; borderline runs longer. | After 125 items, the exam stops as soon as a 95% confidence interval around your ability clears the passing standard — otherwise it continues to 145. |
| **Scaled score 1–50, pass = 25.** Not a percentage. | Ability is mapped linearly to a 1–50 scaled score centered so that the passing standard is exactly 25. |
| **No skipping or going back.** | Each question must be answered to advance; previous answers can't be changed. |
| **One continuous 3-hour clock.** Fewer than 125 answered = inconclusive fail. | A 3-hour countdown that never pauses; running out under 125 items yields a failing score of 2. |
| **Two reported sub-scores.** Food & Nutrition Sciences (I+II) and Food Service Systems / Management (III+IV). | Both are computed and shown on the score report (informational only, as CDR notes). |
| **Content weighting** 21% / 45% / 21% / 13% across the four domains. | The item selector balances scored items toward these target proportions. |

**Fidelity caveat:** CDR does not publish the real item difficulty calibrations,
so difficulties here are *simulated* (a realistic spread centered on the passing
standard). The adaptive *behavior* is authentic; the exact scaled score is a
well-grounded estimate, not an official CDR result.

---

## The question bank

`src/data/questions.json` holds **1,045 real practice questions** with verified
correct answers, drawn from the Jean Inman RD review materials (for personal
study). Each item is tagged with its CDR content domain.

The bank is generated from the source PDFs by the scripts in `scripts/`:

| Script | Purpose |
| --- | --- |
| `ocr_columns.py` | Re-OCRs the two-column scanned tests column-by-column into clean, correctly ordered text (the PDFs' embedded OCR interleaves the columns). |
| `parse_questions.py` | Parses stems + options, anchoring each on its exact question number so answers can never be mis-aligned (ambiguous items are dropped, not guessed). |
| `answer_keys.py` + `keys/*.txt` | The verified answer keys — hand-transcribed from the key images and cross-checked cell-by-cell against an independent OCR read (all 9 disagreements were OCR errors, resolved from the source). |
| `build_bank.py` | Merges everything, classifies Domain III vs IV by content, assigns simulated difficulties, validates, and writes `questions.json`. |

To rebuild the bank from source text:

```bash
npm run build:bank
```

Roughly 140 questions in the source scans were too OCR-damaged to include
safely; they were omitted rather than risk a wrong answer. 1,045 items is ample
for many full, non-repeating adaptive exams.

---

## Project layout

```
src/
  engine/
    cat.ts          # the adaptive engine (IRT ability estimation, item
                    # selection, confidence stopping rule, scoring)
    examConfig.ts   # official exam constants (lengths, timing, weights)
  components/        # StartScreen, ExamScreen, ResultsScreen
  hooks/useExam.ts   # exam session state + 3-hour timer
  data/questions.json
scripts/             # the question-bank build pipeline (Python)
```

The engine is standalone and can be validated headlessly:

```bash
npx tsx scripts/simulate.ts   # simulates examinees of known ability
```
