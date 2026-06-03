import { AppHeader } from "../components/AppHeader";
import { ConfigNotice } from "../components/ConfigNotice";
import { DashboardClient } from "../components/DashboardClient";

export default function HomePage() {
  return (
    <>
      <AppHeader />
      <main className="stack">
      <div>
        <h1>Dashboard</h1>
        <p className="muted">Create, review, and manage opportunities. AI assistance stays as copy/paste prompts for ChatGPT Plus.</p>
      </div>
      <ConfigNotice />
      <DashboardClient />
      </main>
    </>
  );
}
