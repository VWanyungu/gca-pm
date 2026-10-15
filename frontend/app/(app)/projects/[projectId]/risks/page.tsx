import { connection } from "next/server";
import { RisksView } from "@/components/risks/risks-view";

export const instant = false;

export default async function ProjectRisksPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  await connection();
  const { projectId } = await params;
  return <RisksView projectId={projectId} />;
}
