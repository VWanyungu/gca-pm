import { connection } from "next/server";
import { MilestonesView } from "@/components/milestones/milestones-view";

export const instant = false;

export default async function ProjectMilestonesPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  await connection();
  const { projectId } = await params;
  return <MilestonesView projectId={projectId} />;
}
