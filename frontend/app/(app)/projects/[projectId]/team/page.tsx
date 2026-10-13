import { connection } from "next/server";
import TeamView from "./team-view";

export const instant = false;

export default async function ProjectTeamPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  await connection();
  const { projectId } = await params;
  return <TeamView projectId={projectId} />;
}
