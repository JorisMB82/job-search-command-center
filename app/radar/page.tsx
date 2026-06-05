import { AppHeader } from "../../components/AppHeader";
import { OpportunityRadarClient } from "../../components/OpportunityRadarClient";

export default function RadarPage() {
  return (
    <>
      <AppHeader />
      <main className="stack">
        <OpportunityRadarClient />
      </main>
    </>
  );
}
