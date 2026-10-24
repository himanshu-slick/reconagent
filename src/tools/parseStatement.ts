import { readFileSync } from "node:fs";
import { extractText } from "unpdf";
import type { StatementLine } from "../types";

const ROW = /^(\d{4}-\d{2}-\d{2})\s+(\S+)\s+(.+?)\s+(-?[\d,]+\.\d{2})$/;
const VENDOR = /^Vendor:\s*(\S+)/m;

export function parseStatementText(text: string): { vendor: string; lines: StatementLine[] } {
  const vendor = text.match(VENDOR)?.[1];
  if (!vendor) throw new Error("statement has no 'Vendor:' header");
  const lines: StatementLine[] = [];
  for (const raw of text.split("\n")) {
    const m = raw.trim().match(ROW);
    if (m) lines.push({ vendor, date: m[1], ref: m[2], description: m[3], amount: Number(m[4].replace(/,/g, "")) });
  }
  return { vendor, lines };
}

export async function parseStatement(pdfPath: string): Promise<{ vendor: string; lines: StatementLine[] }> {
  const { text } = await extractText(new Uint8Array(readFileSync(pdfPath)), { mergePages: true });
  return parseStatementText(text);
}
