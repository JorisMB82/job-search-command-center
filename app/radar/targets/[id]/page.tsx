import { AppHeader } from "../../../../components/AppHeader";
import { RadarTargetDetailClient } from "../../../../components/RadarTargetDetailClient";

export default function RadarTargetPage({ params }: { params: { id: string } }) {
  return (
    <>
      <AppHeader />
      <main className="stack">
        <RadarTargetDetailClient id={params.id} />
      </main>
    </>
  );
}
