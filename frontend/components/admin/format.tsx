export function summarizeProjectAccess(access: { role: string; scopeName: string }[]) {
  if (!access.length) return "—";
  return (
    <div className="flex flex-col gap-[4px]">
      {access.map((a, index) => (
        <p key={index}>
          <span className="font-semibold">{a.role}</span> · {a.scopeName}
        </p>
      ))}
    </div>
  );
  // .join("\n");
}

/** "Main PM on 1 project." / "Main Planner on 2 projects." */
export function mainRoleWarning(role: "PM" | "Planner", count: number): string {
  const label = role === "PM" ? "Main PM" : "Main Planner";
  return `${label} on ${count} project${count === 1 ? "" : "s"}. Reassign them first.`;
}
