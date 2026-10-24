export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <main>
      <h1>Vendor Portal (mock)</h1>
      <p>Demo site for the ReconAgent project. Credentials: demo / demo-pass.</p>
      {error && <p role="alert" style={{ color: "#b00020" }}>Invalid username or password.</p>}
      <form method="post" action="/api/login" style={{ display: "grid", gap: 12 }}>
        <input id="username" name="username" placeholder="Username" autoComplete="username" required />
        <input id="password" name="password" type="password" placeholder="Password" autoComplete="current-password" required />
        <button id="submit" type="submit">Sign in</button>
      </form>
    </main>
  );
}
