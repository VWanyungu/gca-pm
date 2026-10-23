import { connection } from "next/server";
import { SubmitView } from "@/components/weekly-submission/submit-view";

export const instant = false;

function isIsoDate(value: string | undefined): value is string {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export default async function ProjectWeeklySubmissionPage({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ weekStart?: string | string[] }>;
}) {
  await connection();
  const { projectId } = await params;
  const weekStartParam = (await searchParams).weekStart;
  const weekStart = Array.isArray(weekStartParam) ? weekStartParam[0] : weekStartParam;
  return <SubmitView projectId={projectId} initialWeekStart={isIsoDate(weekStart) ? weekStart : undefined} />;
}
