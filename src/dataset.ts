import { addDays } from "./dates";
import type { Invoice, StatementLine, TruthItem } from "./types";
import { VENDORS } from "./vendors";

const INVOICES_PER_VENDOR = [34, 33, 33];

export function mulberry32(seed: number): () => number {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const round2 = (n: number) => Math.round(n * 100) / 100;

function shuffle<T>(items: T[], rand: () => number): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function buildInvoices(rand: () => number): Invoice[] {
  let n = 1000;
  return VENDORS.flatMap((v, i) =>
    Array.from({ length: INVOICES_PER_VENDOR[i] }, () => {
      const ref = `INV-${++n}`;
      const date = addDays("2026-09-01", Math.floor(rand() * 30));
      return { id: `${v.code}-${ref}`, vendor: v.code, ref, date, amount: round2(100 + rand() * 4900) };
    }),
  );
}

const toLine = (inv: Invoice): StatementLine => ({
  vendor: inv.vendor,
  ref: inv.ref,
  date: inv.date,
  description: `Invoice ${inv.ref}`,
  amount: inv.amount,
});

type Lines = (StatementLine | null)[];
type Seed = { invoices: Invoice[]; lines: Lines; truth: TruthItem[]; rand: () => number };

const sign = (rand: () => number) => (rand() < 0.5 ? -1 : 1);

// Real mismatches: the agent must flag these.
function seedAmountDiffs(s: Seed, idx: number[]) {
  for (const i of idx) {
    s.lines[i]!.amount = round2(s.lines[i]!.amount + sign(s.rand) * (5 + s.rand() * 55));
    s.truth.push({ key: `inv:${s.invoices[i].id}`, kind: "amount_diff" });
  }
}

function seedMissing(s: Seed, idx: number[]) {
  for (const i of idx) {
    s.lines[i] = null;
    s.truth.push({ key: `inv:${s.invoices[i].id}`, kind: "missing_on_statement" });
  }
}

function seedOrphans(s: Seed, count: number): StatementLine[] {
  return Array.from({ length: count }, (_, k) => {
    const vendor = VENDORS[k % VENDORS.length].code;
    const ref = `INV-${9100 + k}`;
    s.truth.push({ key: `stm:${vendor}:${ref}`, kind: "missing_in_books" });
    const date = addDays("2026-09-01", Math.floor(s.rand() * 30));
    return { vendor, ref, date, description: `Invoice ${ref}`, amount: round2(100 + s.rand() * 4900) };
  });
}

// Benign noise: the agent must match these without bothering a human.
function seedNoise(s: Seed, groups: { formats: number[]; dates: number[]; roundings: number[]; typos: number[] }) {
  for (const i of groups.formats) s.lines[i]!.ref = s.lines[i]!.ref.replace("-", "");
  for (const i of groups.dates) s.lines[i]!.date = addDays(s.lines[i]!.date, sign(s.rand) * (1 + Math.floor(s.rand() * 2)));
  for (const i of groups.roundings) s.lines[i]!.amount = round2(s.lines[i]!.amount + sign(s.rand) * 0.5);
  for (const i of groups.typos) s.lines[i]!.ref = s.lines[i]!.ref.replace("1", "I");
}

export type Dataset = { invoices: Invoice[]; lines: StatementLine[]; truth: TruthItem[] };

export function buildDataset(seed = 42): Dataset {
  const rand = mulberry32(seed);
  const invoices = buildInvoices(rand);
  const s: Seed = { invoices, lines: invoices.map(toLine), truth: [], rand };
  const order = shuffle(invoices.map((_, i) => i), rand);
  let cursor = 0;
  const take = (n: number) => order.slice(cursor, (cursor += n));
  seedAmountDiffs(s, take(5));
  seedMissing(s, take(4));
  seedNoise(s, { formats: take(3), dates: take(3), roundings: take(2), typos: take(3) });
  const orphans = seedOrphans(s, 3);
  return { invoices, lines: [...s.lines.filter((l): l is StatementLine => l !== null), ...orphans], truth: s.truth };
}
