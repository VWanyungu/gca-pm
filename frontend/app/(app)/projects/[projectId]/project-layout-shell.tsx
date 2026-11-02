"use client";

import { ProjectSidebarProvider } from "@/components/project-overview/project-sidebar-context";
import { ProjectSidebar } from "@/components/project-overview/project-sidebar";
import { KickoffBanner } from "@/components/project-overview/kickoff-banner";

export function ProjectLayoutShell({
  projectId,
  children,
}: {
  projectId: string;
  children: React.ReactNode;
}) {
  return (
    <ProjectSidebarProvider projectId={projectId}>
      <div className="flex min-h-[calc(100vh-64px)] w-full">
        <ProjectSidebar />
        <div className="flex w-full min-w-0 flex-col">
          <KickoffBanner />
          <div className="flex w-full justify-center">{children}</div>
        </div>
      </div>
    </ProjectSidebarProvider>
  );
}
