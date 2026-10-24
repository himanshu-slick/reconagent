import { mkdirSync, writeFileSync } from "node:fs";
import { buildDataset } from "../src/dataset";
import { PERIOD, VENDORS } from "../src/vendors";

const write = (path: string, value: unknown) => writeFileSync(path, JSON.stringify(value, null, 2) + "\n");

const { invoices, lines, truth } = buildDataset();
const vendors = VENDORS.map((v) => ({
  code: v.code,
  name: v.name,
  period: PERIOD,
  lines: lines.filter((l) => l.vendor === v.code).sort((a, b) => a.date.localeCompare(b.date) || a.ref.localeCompare(b.ref)),
}));

mkdirSync("data", { recursive: true });
mkdirSync("portal/data", { recursive: true });
write("data/invoices.json", invoices);
write("data/truth.json", truth);
write("data/statements.json", { vendors });
write("portal/data/statements.json", { vendors });

console.log(`${invoices.length} invoices, ${lines.length} statement lines, ${truth.length} seeded mismatches`);
