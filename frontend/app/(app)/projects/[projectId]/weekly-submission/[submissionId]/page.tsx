import { connection } from "next/server";
import { SubmissionViewer } from "@/components/weekly-submission/submission-viewer";

export const instant = false;

export default async function WeeklySubmissionViewerPage({
  params,
}: {
  params: Promise<{ projectId: string; submissionId: string }>;
}) {
  await connection();
  const { projectId, submissionId } = await params;
  return <SubmissionViewer projectId={projectId} submissionId={submissionId} />;
}
