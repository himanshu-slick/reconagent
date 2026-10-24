// End-to-end eval: real Puppeteer download from the mock portal, real PDF parse, real matching.
// Precision/recall are measured against the mismatches seeded by src/dataset.ts.
import { readFileSync, writeFileSync } from "node:fs";
import { runReconciliation } from "../src/agent/run";
import type { TruthItem } from "../src/types";
import { scoreDetection } from "./score";

// Assumption, not a measurement: a person logging in, downloading and eyeballing one statement.
const MANUAL_MINUTES_PER_VENDOR = 15;

const pct = (n: number) => `${(n * 100).toFixed(1)}%`;

async function main() {
  const truth: TruthItem[] = JSON.parse(readFileSync("data/truth.json", "utf8"));
  const portalUrl = process.env.PORTAL_URL ?? "http://localhost:3111";
  const { report } = await runReconciliation({ portalUrl, decide: () => ({ action: "reject", note: "eval" }) });
  const score = scoreDetection(report.flagged.map((f) => f.key), truth);
  const manualSeconds = report.vendors * MANUAL_MINUTES_PER_VENDOR * 60;
  const md = [
    "| Metric | Value |",
    "| --- | --- |",
    `| Vendors / statement lines / invoices | ${report.vendors} / ${report.statementLines} / ${report.invoices} |`,
    `| Seeded mismatches | ${truth.length} |`,
    `| Flagged | ${report.mismatches} |`,
    `| Precision | ${pct(score.precision)} |`,
    `| Recall | ${pct(score.recall)} |`,
    `| Auto-matched (exact / tolerance / fuzzy) | ${report.matched.exact} / ${report.matched.tolerance} / ${report.matched.fuzzy} |`,
    `| Time per run | ${report.seconds.toFixed(1)} s |`,
    `| Manual estimate (assumed ${MANUAL_MINUTES_PER_VENDOR} min/vendor) | ${manualSeconds / 60} min |`,
    "",
  ].join("\n");
  writeFileSync("eval/results.md", md);
  console.log(md);
  if (score.falsePositives.length || score.falseNegatives.length)
    console.log("false positives:", score.falsePositives, "false negatives:", score.falseNegatives);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
