import Link from "next/link";

export function AppHeader() {
  return (
    <header className="header">
      <div className="header-inner">
        <strong>Job Search Command Center</strong>
        <nav className="nav" aria-label="Primary navigation">
          <Link href="/">Dashboard</Link>
          <Link href="/resumes">Resume templates</Link>
          <form action="/api/logout" method="post">
            <button className="secondary" type="submit">Log out</button>
          </form>
        </nav>
      </div>
    </header>
  );
}
