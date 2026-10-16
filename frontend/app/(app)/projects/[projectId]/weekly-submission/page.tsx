import { connection } from "next/server";
import { SubmitView } from "@/components/weekly-submission/submit-view";

export const instant = false;

export default async function ProjectWeeklySubmissionPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  await connection();
  const { projectId } = await params;
  return <SubmitView projectId={projectId} />;
}
