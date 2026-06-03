import { AppHeader } from "../../../components/AppHeader";
import { ConfigNotice } from "../../../components/ConfigNotice";
import { OpportunityDetailClient } from "../../../components/OpportunityDetailClient";

export default function OpportunityDetailPage({ params }: { params: { id: string } }) {
  return (
    <>
      <AppHeader />
      <main className="stack">
      <ConfigNotice />
      <OpportunityDetailClient id={params.id} />
      </main>
    </>
  );
}
