import { connection } from "next/server";
import { ScheduleView } from "@/components/schedule/schedule-view";

export const instant = false;

export default async function ProjectSchedulePage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  await connection();
  const { projectId } = await params;
  return <ScheduleView projectId={projectId} />;
}
