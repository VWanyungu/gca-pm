import { connection } from "next/server";
import StagesListView from "./stages-list-view";

export const instant = false;

export default async function ProjectStagesPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  await connection();
  const { projectId } = await params;
  return <StagesListView projectId={projectId} />;
}
