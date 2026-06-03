export default function LoginPage({ searchParams }: { searchParams: { next?: string } }) {
  const next = searchParams.next?.startsWith("/") ? searchParams.next : "/";

  return (
    <main className="login-shell">
      <section className="card login-card stack">
        <div>
          <h1>Private access</h1>
          <p className="muted">Enter the app password to access this internal V1 deployment.</p>
        </div>
        <form className="stack" action="/api/login" method="post">
          <input type="hidden" name="next" value={next} />
          <label>
            App password
            <input name="password" type="password" autoComplete="current-password" required />
          </label>
          <button type="submit">Log in</button>
        </form>
        <p className="muted">Set <code>APP_ACCESS_PASSWORD</code> in your local or Vercel environment.</p>
      </section>
    </main>
  );
}
