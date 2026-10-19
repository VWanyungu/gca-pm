import { connection } from "next/server";
import { DprDetailView } from "@/components/dpr/dpr-detail-view";

export const instant = false;

export default async function DprDetailPage({
  params,
}: {
  params: Promise<{ projectId: string; dprId: string }>;
}) {
  await connection();
  const { projectId, dprId } = await params;
  return <DprDetailView projectId={projectId} dprId={dprId} />;
}
