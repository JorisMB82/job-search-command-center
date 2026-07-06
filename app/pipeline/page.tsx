import { PipelineClient } from "../../components/PipelineClient";
import { requireAuth } from "../../lib/auth";

export const dynamic = "force-dynamic";

export default async function PipelinePage() {
  await requireAuth();
  return <PipelineClient />;
}
