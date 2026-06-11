import Link from "next/link";
import type { Opportunity } from "../../../../lib/database.types";
import { getServerSupabaseClient } from "../../../../lib/supabase";

function formatDateTime(value: string | null | undefined) {
  if (!value) return "Not saved yet";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Not saved yet";
  return parsed.toLocaleString(undefined, { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
}

export default async function InterviewScreenMapPage({ params }: { params: { id: string } }) {
  const supabase = getServerSupabaseClient();

  if (!supabase) {
    return (
      <main className="screen-map-main">
        <section className="screen-map-shell stack">
          <p className="error">Supabase is not configured.</p>
          <Link className="button secondary" href={`/opportunities/${params.id}`}>Back to opportunity</Link>
        </section>
      </main>
    );
  }

  const { data, error } = await supabase.from("opportunities").select("*").eq("id", params.id).single();
  const opportunity = data as Opportunity | null;
  const screenMap = opportunity?.interview_screen_map?.trim();

  if (error || !opportunity) {
    return (
      <main className="screen-map-main">
        <section className="screen-map-shell stack">
          <p className="error">Could not load this opportunity.</p>
          <Link className="button secondary" href="/">Back to dashboard</Link>
        </section>
      </main>
    );
  }

  return (
    <main className="screen-map-main">
      <section className="screen-map-shell stack">
        <header className="screen-map-header">
          <div>
            <p className="muted">Interview Screen Map</p>
            <h1>{opportunity.company} / {opportunity.role}</h1>
            <p className="date-line">Updated: {formatDateTime(opportunity.updated_at)}</p>
          </div>
          <Link className="button secondary" href={`/opportunities/${opportunity.id}`}>Back to detail</Link>
        </header>

        {screenMap ? (
          <pre className="screen-map-content">{screenMap}</pre>
        ) : (
          <div className="card stack">
            <h2>No screen map saved yet</h2>
            <p className="muted">Go back to the opportunity detail page, copy the screen-map prompt, paste the final ChatGPT output into the Interview Screen Map box, and save it.</p>
          </div>
        )}
      </section>
    </main>
  );
}
