import { Navbar } from "@/components/navbar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <Navbar />
      {children}
    </div>
  );
}
