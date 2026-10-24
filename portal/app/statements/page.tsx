import { redirect } from "next/navigation";
import { isLoggedIn } from "../../lib/auth";
import { statements } from "../../lib/data";

export const dynamic = "force-dynamic";

export default async function StatementsPage() {
  if (!(await isLoggedIn())) redirect("/");
  return (
    <main>
      <h1>Statements</h1>
      <ul>
        {statements.map((s) => (
          <li key={s.code}>
            {s.name} ({s.period}){" "}
            <a data-vendor={s.code} href={`/api/statements/${s.code}`}>
              Download PDF
            </a>
          </li>
        ))}
      </ul>
    </main>
  );
}
