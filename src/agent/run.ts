import { readFileSync } from "node:fs";
import { Command } from "@langchain/langgraph";
import { makeTracer } from "../trace";
import type { Decision, Flagged, Invoice, Mismatch } from "../types";
import { buildGraph, type RunState } from "./graph";

export type ReviewRequest = { mismatch: Mismatch; index: number; total: number };
export type Decider = (req: ReviewRequest) => Promise<Decision> | Decision;

export type RunOptions = { portalUrl: string; decide: Decider; runsDir?: string; user?: string; pass?: string };

export type Report = {
  runId: string;
  vendors: number;
  statementLines: number;
  invoices: number;
  matched: Record<string, number>;
  mismatches: number;
  approved: number;
  rejected: number;
  seconds: number;
  flagged: Flagged[];
};

export const loadInvoices = (path = "data/invoices.json"): Invoice[] => JSON.parse(readFileSync(path, "utf8"));

function summarize(runId: string, s: RunState, seconds: number): Report {
  const matched: Record<string, number> = { exact: 0, tolerance: 0, fuzzy: 0 };
  for (const m of s.matches) matched[m.method]++;
  return {
    runId,
    vendors: Object.keys(s.files).length,
    statementLines: s.lines.length,
    invoices: s.invoices.length,
    matched,
    mismatches: s.mismatches.length,
    approved: s.flagged.filter((f) => f.decision.action === "approve").length,
    rejected: s.flagged.filter((f) => f.decision.action === "reject").length,
    seconds,
    flagged: s.flagged,
  };
}

export async function runReconciliation(opts: RunOptions): Promise<{ state: RunState; report: Report }> {
  const runId = new Date().toISOString().replace(/[:.]/g, "-");
  const dir = opts.runsDir ?? "runs";
  const app = buildGraph({
    outDir: `${dir}/${runId}/downloads`,
    user: opts.user ?? process.env.PORTAL_USER ?? "demo",
    pass: opts.pass ?? process.env.PORTAL_PASS ?? "demo-pass",
    wrap: makeTracer(`${dir}/${runId}/trace.jsonl`),
  });
  const cfg = { configurable: { thread_id: runId } };
  const t0 = Date.now();
  let out: any = await app.invoke({ portalUrl: opts.portalUrl, invoices: loadInvoices() }, cfg);
  while (out.__interrupt__?.length) {
    const decision = await opts.decide(out.__interrupt__[0].value as ReviewRequest);
    out = await app.invoke(new Command({ resume: decision }), cfg);
  }
  const state = (await app.getState(cfg)).values as RunState;
  return { state, report: summarize(runId, state, (Date.now() - t0) / 1000) };
}
