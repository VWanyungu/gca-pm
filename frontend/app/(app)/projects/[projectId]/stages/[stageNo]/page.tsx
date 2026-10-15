import { connection } from "next/server";
import { StageView } from "@/components/stage-view/stage-view";

export const instant = false;

export default async function ProjectStagePage({
  params,
}: {
  params: Promise<{ projectId: string; stageNo: string }>;
}) {
  await connection();
  const { projectId, stageNo } = await params;
  return <StageView projectId={projectId} stageNo={Number(stageNo)} />;
}
