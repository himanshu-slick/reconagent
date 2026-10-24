import { describe, expect, it } from "vitest";
import { buildDataset } from "../src/dataset";
import { matchInvoices } from "../src/tools/matchInvoices";
import type { Invoice, StatementLine } from "../src/types";
import { scoreDetection } from "../eval/score";

const inv = (ref: string, amount: number, date = "2026-09-10", vendor = "ACM"): Invoice => ({ id: `${vendor}-${ref}`, vendor, ref, date, amount });
const line = (ref: string, amount: number, date = "2026-09-10", vendor = "ACM"): StatementLine => ({ vendor, ref, date, description: `Invoice ${ref}`, amount });

describe("matchInvoices", () => {
  it("matches exact reference and amount", () => {
    const r = matchInvoices([line("INV-1", 100)], [inv("INV-1", 100)]);
    expect(r.matches[0].method).toBe("exact");
    expect(r.mismatches).toHaveLength(0);
  });

  it("treats a formatting difference in the reference as the same reference", () => {
    const r = matchInvoices([line("INV1", 100)], [inv("INV-1", 100)]);
    expect(r.matches[0].method).toBe("exact");
  });

  it("accepts a sub-tolerance amount gap", () => {
    const r = matchInvoices([line("INV-1", 100.5)], [inv("INV-1", 100)]);
    expect(r.matches[0].method).toBe("tolerance");
  });

  it("flags an amount gap beyond tolerance", () => {
    const r = matchInvoices([line("INV-1", 130)], [inv("INV-1", 100)]);
    expect(r.mismatches.map((m) => [m.kind, m.key])).toEqual([["amount_diff", "inv:ACM-INV-1"]]);
  });

  it("fuzzy-matches a typo'd reference by unique amount and date", () => {
    const r = matchInvoices([line("INV-I", 100, "2026-09-12")], [inv("INV-1", 100)]);
    expect(r.matches[0].method).toBe("fuzzy");
  });

  it("does not guess between two equally good invoices", () => {
    const r = matchInvoices([line("INV-X", 100)], [inv("INV-1", 100), inv("INV-2", 100)]);
    expect(r.mismatches.some((m) => m.kind === "ambiguous")).toBe(true);
  });

  it("flags statement-only and books-only items", () => {
    const r = matchInvoices([line("INV-9", 50)], [inv("INV-1", 700, "2026-09-25")]);
    expect(r.mismatches.map((m) => m.kind).sort()).toEqual(["missing_in_books", "missing_on_statement"]);
  });

  it("keeps vendors apart", () => {
    const r = matchInvoices([line("INV-1", 100, "2026-09-10", "GLB")], [inv("INV-1", 100)]);
    expect(r.matches).toHaveLength(0);
  });

  it("finds every seeded mismatch with no false alarms", () => {
    const { invoices, lines, truth } = buildDataset();
    const score = scoreDetection(matchInvoices(lines, invoices).mismatches.map((m) => m.key), truth);
    expect(score.falsePositives).toEqual([]);
    expect(score.falseNegatives).toEqual([]);
  });
});
