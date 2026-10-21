export function summarizeProjectAccess(access: { role: string; scopeName: string }[]): string {
  if (!access.length) return "—";
  return access.map((a) => `${a.role} · ${a.scopeName}`).join(", ");
}

/** "Main PM on 1 project." / "Main Planner on 2 projects." */
export function mainRoleWarning(role: "PM" | "Planner", count: number): string {
  const label = role === "PM" ? "Main PM" : "Main Planner";
  return `${label} on ${count} project${count === 1 ? "" : "s"}. Reassign them first.`;
}
