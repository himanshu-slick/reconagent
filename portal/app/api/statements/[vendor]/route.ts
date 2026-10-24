import { isLoggedIn } from "../../../../lib/auth";
import { findStatement } from "../../../../lib/data";
import { buildStatementPdf } from "../../../../lib/pdf";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ vendor: string }> }) {
  if (!(await isLoggedIn())) return new Response("Unauthorized", { status: 401 });
  const { vendor } = await params;
  const statement = findStatement(vendor);
  if (!statement) return new Response("Not found", { status: 404 });
  const pdf = await buildStatementPdf(statement);
  return new Response(Buffer.from(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="statement-${statement.code}.pdf"`,
    },
  });
}
