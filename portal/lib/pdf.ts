import { PDFDocument, StandardFonts, type PDFFont, type PDFPage } from "pdf-lib";
import type { VendorStatement } from "./data";

const ROWS_PER_PAGE = 48;
const SIZE = 9;
const LEFT = 40;
const STEP = 14;

const money = (n: number) => n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// Fixed-width columns keep each row on one text run, so any PDF text extractor reads it back intact.
export const formatRow = (l: { date: string; ref: string; description: string; amount: number }) =>
  `${l.date}  ${l.ref.padEnd(10)}  ${l.description.padEnd(26)}  ${money(l.amount).padStart(12)}`;

function drawHeader(page: PDFPage, font: PDFFont, s: VendorStatement) {
  const top = page.getHeight() - 50;
  const rows = [`Statement of Account`, `Vendor: ${s.code}`, `Name: ${s.name}`, `Period: ${s.period}`];
  rows.forEach((t, i) => page.drawText(t, { x: LEFT, y: top - i * STEP, size: SIZE, font }));
  const head = "Date        Reference   Description                     Amount";
  page.drawText(head, { x: LEFT, y: top - 5 * STEP, size: SIZE, font });
}

function drawRows(page: PDFPage, font: PDFFont, rows: VendorStatement["lines"]) {
  const top = page.getHeight() - 50 - 6 * STEP;
  rows.forEach((l, i) => page.drawText(formatRow(l), { x: LEFT, y: top - i * STEP, size: SIZE, font }));
}

export async function buildStatementPdf(s: VendorStatement): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Courier);
  for (let i = 0; i < s.lines.length || i === 0; i += ROWS_PER_PAGE) {
    const page = doc.addPage([595, 842]);
    drawHeader(page, font, s);
    drawRows(page, font, s.lines.slice(i, i + ROWS_PER_PAGE));
  }
  return doc.save();
}
