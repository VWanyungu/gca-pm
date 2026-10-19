import { TabBar } from "@/components/engineer-dpr/tab-bar";

export default function EngineerTabsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-1 flex-col">
      <div className="flex flex-1 flex-col">{children}</div>
      <TabBar />
    </div>
  );
}
