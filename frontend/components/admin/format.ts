export function humanizeLastActive(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  const today = new Date();
  const diffDays = Math.floor((today.setHours(0, 0, 0, 0) - new Date(date).setHours(0, 0, 0, 0)) / 86_400_000);
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export function summarizeProjectAccess(access: { role: string; count: number }[]): string {
  if (!access.length) return "—";
  return access.map((a) => `${a.role} ×${a.count}`).join(" · ");
}

/** "Main PM on 1 project." / "Main Planner on 2 projects." */
export function mainRoleWarning(role: "PM" | "Planner", count: number): string {
  const label = role === "PM" ? "Main PM" : "Main Planner";
  return `${label} on ${count} project${count === 1 ? "" : "s"}. Reassign them first.`;
}
