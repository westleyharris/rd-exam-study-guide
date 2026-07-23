// Headless validation of the adaptive engine. Simulates examinees of known
// ability answering under a Rasch response model and reports how the engine
// behaves. Run: npx tsx scripts/simulate.ts
import { readFileSync } from "node:fs";
import { ExamEngine } from "../src/engine/cat";
import type { OptionKey, Question } from "../src/types";
import { PRETEST_ITEMS } from "../src/engine/examConfig";

const bank = JSON.parse(
  readFileSync(new URL("../src/data/questions.json", import.meta.url), "utf-8"),
) as Question[];

const OPTS: OptionKey[] = ["a", "b", "c", "d"];

function pCorrect(theta: number, b: number): number {
  return 1 / (1 + Math.exp(-(theta - b)));
}

function simulate(trueTheta: number) {
  const eng = new ExamEngine(bank);
  let q: Question | null = eng.start();
  const domainCount: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0 };
  while (q) {
    const correct = Math.random() < pCorrect(trueTheta, q.difficulty);
    let resp: OptionKey;
    if (correct) {
      resp = q.correct;
    } else {
      const wrong = OPTS.filter((o) => o !== q!.correct);
      resp = wrong[Math.floor(Math.random() * wrong.length)];
    }
    domainCount[q.domain]++;
    q = eng.answer(resp, 5);
  }
  const r = eng.buildResult();
  return { r, domainCount };
}

console.log("theta   pass%   avgLen   len[min/max]   avgScaled   pretest=25?");
for (const theta of [-1.5, -1, -0.5, -0.25, 0, 0.25, 0.5, 1, 1.5]) {
  const N = 300;
  let pass = 0, len = 0, scaled = 0, minL = 999, maxL = 0, pretestOk = 0;
  for (let i = 0; i < N; i++) {
    const { r } = simulate(theta);
    if (r.outcome === "pass") pass++;
    len += r.totalItems;
    scaled += r.scaledScore;
    minL = Math.min(minL, r.totalItems);
    maxL = Math.max(maxL, r.totalItems);
    if (r.pretestItems === PRETEST_ITEMS) pretestOk++;
  }
  console.log(
    `${theta.toFixed(2).padStart(5)}   ${((pass / N) * 100).toFixed(0).padStart(3)}    ` +
    `${(len / N).toFixed(1).padStart(5)}   ${minL}/${maxL}         ` +
    `${(scaled / N).toFixed(1).padStart(5)}       ${pretestOk === N ? "yes" : `NO(${pretestOk}/${N})`}`,
  );
}

// Domain mix on a single average-ability exam.
const { domainCount } = simulate(0.2);
const total = Object.values(domainCount).reduce((a, b) => a + b, 0);
console.log("\nDomain mix on one exam (target 21/45/21/13):");
for (const d of [1, 2, 3, 4]) {
  console.log(`  D${d}: ${domainCount[d]}  (${((domainCount[d] / total) * 100).toFixed(0)}%)`);
}
