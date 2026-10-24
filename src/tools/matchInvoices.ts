import { daysBetween } from "../dates";
import type { Invoice, Match, Mismatch, StatementLine } from "../types";

export const AMOUNT_TOLERANCE = 1.0;
export const DATE_TOLERANCE_DAYS = 3;

export type MatchResult = { matches: Match[]; mismatches: Mismatch[] };

export const normRef = (ref: string) => ref.toUpperCase().replace(/[^A-Z0-9]/g, "");

const amountClose = (a: number, b: number) => Math.abs(a - b) <= AMOUNT_TOLERANCE + 1e-9;

const mismatch = (m: Omit<Mismatch, "key">, key: string): Mismatch => ({ ...m, key });

// Pass 1: same reference. Equal amount is an exact match, a small gap is a tolerance match, a large gap is a mismatch.
function matchByReference(lines: StatementLine[], pool: Map<string, Invoice>, out: MatchResult): StatementLine[] {
  const rest: StatementLine[] = [];
  for (const line of lines) {
    const inv = pool.get(normRef(line.ref));
    if (!inv) {
      rest.push(line);
      continue;
    }
    pool.delete(normRef(line.ref));
    const gap = Math.abs(line.amount - inv.amount);
    if (gap < 0.005) out.matches.push(hit(inv, "exact", `reference ${inv.ref} and amount ${inv.amount.toFixed(2)} agree`));
    else if (amountClose(line.amount, inv.amount))
      out.matches.push(hit(inv, "tolerance", `reference agrees, amount differs by ${gap.toFixed(2)} (within ${AMOUNT_TOLERANCE.toFixed(2)})`));
    else
      out.mismatches.push(
        mismatch({ kind: "amount_diff", vendor: inv.vendor, invoice: inv, line, reason: `invoice ${inv.amount.toFixed(2)} vs statement ${line.amount.toFixed(2)} (gap ${gap.toFixed(2)})` }, `inv:${inv.id}`),
      );
  }
  return rest;
}

const hit = (inv: Invoice, method: Match["method"], reason: string): Match => ({
  invoiceId: inv.id,
  vendor: inv.vendor,
  ref: inv.ref,
  method,
  reason,
});

// Pass 2: no reference match. Accept a single invoice with the same amount and a nearby date.
function matchFuzzy(rest: StatementLine[], pool: Map<string, Invoice>, out: MatchResult) {
  for (const line of rest) {
    const near = [...pool.values()].filter(
      (inv) => amountClose(inv.amount, line.amount) && daysBetween(inv.date, line.date) <= DATE_TOLERANCE_DAYS,
    );
    if (near.length === 1) {
      pool.delete(normRef(near[0].ref));
      out.matches.push(hit(near[0], "fuzzy", `statement ref ${line.ref} not in books; unique invoice ${near[0].ref} within ${DATE_TOLERANCE_DAYS} days and ${AMOUNT_TOLERANCE.toFixed(2)}`));
    } else if (near.length > 1) {
      out.mismatches.push(mismatch({ kind: "ambiguous", vendor: line.vendor, line, reason: `${near.length} invoices fit statement line ${line.ref}` }, `stm:${line.vendor}:${line.ref}`));
    } else {
      out.mismatches.push(mismatch({ kind: "missing_in_books", vendor: line.vendor, line, reason: `statement line ${line.ref} (${line.amount.toFixed(2)}) has no invoice` }, `stm:${line.vendor}:${line.ref}`));
    }
  }
}

function leftoverInvoices(pool: Map<string, Invoice>, out: MatchResult) {
  for (const inv of pool.values())
    out.mismatches.push(mismatch({ kind: "missing_on_statement", vendor: inv.vendor, invoice: inv, reason: `invoice ${inv.ref} (${inv.amount.toFixed(2)}) is not on the statement` }, `inv:${inv.id}`));
}

export function matchInvoices(lines: StatementLine[], invoices: Invoice[]): MatchResult {
  const out: MatchResult = { matches: [], mismatches: [] };
  const vendors = [...new Set([...lines, ...invoices].map((x) => x.vendor))].sort();
  for (const vendor of vendors) {
    const pool = new Map(invoices.filter((i) => i.vendor === vendor).map((i) => [normRef(i.ref), i]));
    const rest = matchByReference(lines.filter((l) => l.vendor === vendor), pool, out);
    matchFuzzy(rest, pool, out);
    leftoverInvoices(pool, out);
  }
  return out;
}
