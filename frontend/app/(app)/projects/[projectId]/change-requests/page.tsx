import { connection } from "next/server";
import { ChangeRequestsView } from "@/components/change-requests/change-requests-view";

export const instant = false;

export default async function ProjectChangeRequestsPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  await connection();
  const { projectId } = await params;
  return <ChangeRequestsView projectId={projectId} />;
}
