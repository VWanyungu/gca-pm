import { connection } from "next/server";
import ProjectOverview from "./overview";

export const instant = false;

export default async function ProjectOverviewPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  await connection();
  const { projectId } = await params;
  return <ProjectOverview projectId={projectId} />;
}
