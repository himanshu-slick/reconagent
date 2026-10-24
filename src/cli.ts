import { mkdirSync, writeFileSync } from "node:fs";
import { createInterface } from "node:readline/promises";
import { runReconciliation, type Decider, type Report, type ReviewRequest } from "./agent/run";

const describe = ({ mismatch: m, index, total }: ReviewRequest) =>
  `\n[${index + 1}/${total}] ${m.vendor} ${m.kind}\n  ${m.reason}`;

const askHuman: Decider = async (req) => {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const answer = await rl.question(`${describe(req)}\n  (a)pprove vendor figure / (r)eject and dispute? `);
  rl.close();
  return { action: answer.trim().toLowerCase().startsWith("a") ? "approve" : "reject" };
};

// No human in the loop: dispute everything. Used for demos and the eval.
const autoReject: Decider = () => ({ action: "reject", note: "auto" });

function printSummary(r: Report) {
  const matched = Object.entries(r.matched).map(([k, v]) => `${v} ${k}`).join(", ");
  console.log(`\nReconciled ${r.vendors} vendors, ${r.statementLines} statement lines against ${r.invoices} invoices in ${r.seconds.toFixed(1)}s`);
  console.log(`  matched: ${matched}`);
  console.log(`  mismatches: ${r.mismatches} (approved ${r.approved}, disputed ${r.rejected})`);
}

async function main() {
  const auto = process.argv.includes("--auto");
  const portalUrl = process.env.PORTAL_URL ?? "http://localhost:3111";
  const { report } = await runReconciliation({ portalUrl, decide: auto ? autoReject : askHuman });
  mkdirSync("runs", { recursive: true });
  writeFileSync(`runs/${report.runId}/report.json`, JSON.stringify(report, null, 2));
  printSummary(report);
  console.log(`  report: runs/${report.runId}/report.json`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
