import { connection } from "next/server";
import EditProjectView from "./edit-view";

export const instant = false;

export default async function AdminProjectEditPage({ params }: { params: Promise<{ id: string }> }) {
  await connection();
  const { id } = await params;
  return <EditProjectView projectId={id} />;
}
