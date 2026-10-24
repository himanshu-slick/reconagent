export type Invoice = { id: string; vendor: string; ref: string; date: string; amount: number };

export type StatementLine = { vendor: string; ref: string; date: string; description: string; amount: number };

export type MatchMethod = "exact" | "tolerance" | "fuzzy";

export type Match = { invoiceId: string; vendor: string; ref: string; method: MatchMethod; reason: string };

export type MismatchKind = "amount_diff" | "missing_on_statement" | "missing_in_books" | "ambiguous";

export type Mismatch = {
  key: string;
  kind: MismatchKind;
  vendor: string;
  invoice?: Invoice;
  line?: StatementLine;
  reason: string;
};

export type Decision = { action: "approve" | "reject"; note?: string };

export type Flagged = { key: string; kind: MismatchKind; vendor: string; reason: string; decision: Decision };

export type TruthItem = { key: string; kind: MismatchKind };
