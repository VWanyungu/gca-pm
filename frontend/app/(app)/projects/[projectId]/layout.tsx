import { connection } from "next/server";
import { ProjectLayoutShell } from "./project-layout-shell";

export const instant = false;

export default async function ProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ projectId: string }>;
}) {
  await connection();
  const { projectId } = await params;
  return <ProjectLayoutShell projectId={projectId}>{children}</ProjectLayoutShell>;
}
