import { connection } from "next/server";
import SettingsView from "./settings-view";

export const instant = false;

export default async function ProjectSettingsPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  await connection();
  const { projectId } = await params;
  return <SettingsView projectId={projectId} />;
}
