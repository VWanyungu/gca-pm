import { connection } from "next/server";
import { ClientFeedbackView } from "@/components/client-feedback/client-feedback-view";

export const instant = false;

export default async function ProjectClientFeedbackPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  await connection();
  const { projectId } = await params;
  return <ClientFeedbackView projectId={projectId} />;
}
