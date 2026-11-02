import { connection } from "next/server";
import { FeedbackWizard } from "@/components/client-feedback/public/feedback-wizard";

export const instant = false;

export default async function ClientFeedbackPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  await connection();
  const { token } = await params;
  return <FeedbackWizard token={token} />;
}
