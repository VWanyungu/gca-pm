import { connection } from "next/server";
import { DprListView } from "@/components/dpr/dpr-list-view";

export const instant = false;

export default async function ProjectDprPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  await connection();
  const { projectId } = await params;
  return <DprListView projectId={projectId} />;
}
