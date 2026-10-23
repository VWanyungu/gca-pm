import { connection } from "next/server";
import { DprDetailView } from "@/components/dpr/dpr-detail-view";

export const instant = false;

export default async function DprDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string; dprId: string }>;
  searchParams: Promise<{ back?: string | string[] }>;
}) {
  await connection();
  const { projectId, dprId } = await params;
  const backParam = (await searchParams).back;
  const backTo = (Array.isArray(backParam) ? backParam[0] : backParam) === "dpr" ? "dpr" : "submit";
  return <DprDetailView projectId={projectId} dprId={dprId} backTo={backTo} />;
}
