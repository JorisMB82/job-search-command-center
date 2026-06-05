import { RadarTargetDetailClient } from "../../../../components/RadarTargetDetailClient";

export default function RadarTargetPage({ params }: { params: { id: string } }) {
  return <RadarTargetDetailClient id={params.id} />;
}
