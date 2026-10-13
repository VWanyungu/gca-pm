import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { initials, type TeamMember, type ClientContact } from "./types";

export function TeamSection({
  projectId,
  team,
  clientContacts,
}: {
  projectId: string;
  team: TeamMember[];
  clientContacts: ClientContact[];
}) {
  const total = team.length + clientContacts.length;

  return (
    <section className="flex w-full flex-col items-start gap-[8px] pb-[20px]">
      <div className="flex w-full items-center justify-between">
        <div className="flex flex-col gap-[8px]">
          <h3 className="text-[16px] font-semibold text-gca-dark">Team</h3>
          <div className="flex items-center">
            {team.map((m) => (
              <div
                key={m.attribute_id}
                className="mr-[-8px] flex size-[36px] items-center justify-center rounded-[10px] border-2 border-white bg-gca-badge-bg"
                title={`${m.first_name} ${m.last_name}`}
              >
                <span className="text-[12px] font-semibold text-gca-badge-text">
                  {initials(m.first_name, m.last_name)}
                </span>
              </div>
            ))}
            {clientContacts.map((c, i) => (
              <div
                key={c.contact_id}
                className={`flex size-[36px] items-center justify-center rounded-[10px] border-2 border-white bg-[#fff4e5] ${
                  i < clientContacts.length - 1 ? "mr-[-8px]" : ""
                }`}
                title={c.name}
              >
                <span className="text-[12px] font-semibold text-gca-warning">
                  {initials(c.name.split(" ")[0] ?? "", c.name.split(" ")[1] ?? "")}
                </span>
              </div>
            ))}
          </div>
          <p className="text-[12px] text-gca-muted">
            {total} people{clientContacts.length > 0 ? ` · ${clientContacts.length} from the client` : ""}
          </p>
        </div>
        <Link href={`/projects/${projectId}/team`} className="flex items-center gap-[6px] text-[13px] font-medium text-gca-green">
          View team
          <ChevronRight className="size-[10px]" />
        </Link>
      </div>
    </section>
  );
}
