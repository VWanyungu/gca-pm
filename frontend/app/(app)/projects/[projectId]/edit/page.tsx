import { connection } from "next/server";
import EditProjectForm from "./edit-form";

export const instant = false;

export default async function EditProjectPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  await connection();
  const { projectId } = await params;
  return <EditProjectForm projectId={projectId} />;
}
