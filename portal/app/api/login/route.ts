import { NextResponse } from "next/server";
import { credentials, SESSION_COOKIE, SESSION_VALUE } from "../../../lib/auth";

export async function POST(req: Request) {
  const form = await req.formData();
  const { user, pass } = credentials();
  const ok = form.get("username") === user && form.get("password") === pass;
  const res = NextResponse.redirect(new URL(ok ? "/statements" : "/?error=1", req.url), 303);
  if (ok) res.cookies.set(SESSION_COOKIE, SESSION_VALUE, { httpOnly: true, sameSite: "lax", path: "/" });
  return res;
}
