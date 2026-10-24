import { cookies } from "next/headers";

// Mock portal: a fixed session token is enough. Never point the agent at a real vendor site.
export const SESSION_COOKIE = "portal_session";
export const SESSION_VALUE = "mock-session-ok";

export const credentials = () => ({
  user: process.env.PORTAL_USER ?? "demo",
  pass: process.env.PORTAL_PASS ?? "demo-pass",
});

export async function isLoggedIn(): Promise<boolean> {
  const jar = await cookies();
  return jar.get(SESSION_COOKIE)?.value === SESSION_VALUE;
}
