import { Annotation, END, interrupt, MemorySaver, START, StateGraph } from "@langchain/langgraph";
import { flagMismatch } from "../tools/flagMismatch";
import { loginAndDownload } from "../tools/loginAndDownload";
import { matchInvoices } from "../tools/matchInvoices";
import { parseStatement } from "../tools/parseStatement";
import type { Decision, Flagged, Invoice, Match, Mismatch, StatementLine } from "../types";

const last = <T>(init: () => T) => Annotation<T>({ reducer: (_old, next) => next, default: init });

export const State = Annotation.Root({
  portalUrl: last(() => ""),
  invoices: last<Invoice[]>(() => []),
  files: last<Record<string, string>>(() => ({})),
  lines: last<StatementLine[]>(() => []),
  matches: last<Match[]>(() => []),
  mismatches: last<Mismatch[]>(() => []),
  cursor: last(() => 0),
  flagged: last<Flagged[]>(() => []),
});

export type RunState = typeof State.State;
export type Wrap = (node: string, step: (s: RunState) => any) => (s: RunState) => any;

export type GraphOptions = { outDir: string; user: string; pass: string; wrap: Wrap };

const download = (o: GraphOptions) => async (s: RunState) => ({
  files: await loginAndDownload({ portalUrl: s.portalUrl, user: o.user, pass: o.pass, outDir: o.outDir }),
});

const parse = async (s: RunState) => {
  const parsed = await Promise.all(Object.values(s.files).map(parseStatement));
  return { lines: parsed.flatMap((p) => p.lines) };
};

const match = (s: RunState) => {
  const { matches, mismatches } = matchInvoices(s.lines, s.invoices);
  return { matches, mismatches };
};

// Pauses on the current mismatch. The graph resumes with the human's Decision as interrupt()'s value.
const review = (s: RunState) => {
  const m = s.mismatches[s.cursor];
  const decision = interrupt({ mismatch: m, index: s.cursor, total: s.mismatches.length }) as Decision;
  return { flagged: [...s.flagged, flagMismatch(m, decision)], cursor: s.cursor + 1 };
};

const nextAfterMatch = (s: RunState) => (s.mismatches.length ? "review" : END);
const nextAfterReview = (s: RunState) => (s.cursor < s.mismatches.length ? "review" : END);

export function buildGraph(o: GraphOptions) {
  return new StateGraph(State)
    .addNode("download", o.wrap("login_and_download", download(o)))
    .addNode("parse", o.wrap("parse_statement", parse))
    .addNode("match", o.wrap("match_invoices", match))
    .addNode("review", o.wrap("flag_mismatch", review))
    .addEdge(START, "download")
    .addEdge("download", "parse")
    .addEdge("parse", "match")
    .addConditionalEdges("match", nextAfterMatch)
    .addConditionalEdges("review", nextAfterReview)
    .compile({ checkpointer: new MemorySaver() });
}
