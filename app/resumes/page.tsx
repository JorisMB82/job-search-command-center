import { AppHeader } from "../../components/AppHeader";
import { ConfigNotice } from "../../components/ConfigNotice";
import { ResumeTemplatesClient } from "../../components/ResumeTemplatesClient";

export default function ResumesPage() {
  return (
    <>
      <AppHeader />
      <main className="stack">
      <div>
        <h1>Resume templates</h1>
        <p className="muted">Store reusable resume versions and tailoring notes.</p>
      </div>
      <ConfigNotice />
      <ResumeTemplatesClient />
      </main>
    </>
  );
}
