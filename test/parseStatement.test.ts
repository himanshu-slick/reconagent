import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { buildStatementPdf } from "../portal/lib/pdf";
import { parseStatement, parseStatementText } from "../src/tools/parseStatement";

describe("parseStatementText", () => {
  it("reads the vendor and rows, ignores everything else", () => {
    const text = "Statement of Account\nVendor: ACM\n2026-09-03  INV-1001  Invoice INV-1001  1,234.50\nTotal due 1,234.50";
    const { vendor, lines } = parseStatementText(text);
    expect(vendor).toBe("ACM");
    expect(lines).toEqual([{ vendor: "ACM", date: "2026-09-03", ref: "INV-1001", description: "Invoice INV-1001", amount: 1234.5 }]);
  });

  it("rejects a document without a vendor header", () => {
    expect(() => parseStatementText("hello")).toThrow(/Vendor/);
  });
});

describe("parseStatement (PDF round trip)", () => {
  it("recovers every line the portal wrote", async () => {
    const lines = Array.from({ length: 60 }, (_, i) => ({
      vendor: "ACM", ref: `INV-${1000 + i}`, date: "2026-09-05", description: `Invoice INV-${1000 + i}`, amount: 100 + i * 1.25,
    }));
    const pdf = await buildStatementPdf({ code: "ACM", name: "Acme Supplies", period: "2026-09", lines });
    const path = join(mkdtempSync(join(tmpdir(), "recon-")), "s.pdf");
    writeFileSync(path, pdf);
    const parsed = await parseStatement(path);
    expect(parsed.lines).toEqual(lines);
  });
});
