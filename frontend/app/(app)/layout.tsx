import { Navbar } from "@/components/navbar";
import { MobileNavigationProvider } from "@/components/mobile-navigation-context";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-gca-surface">
      <MobileNavigationProvider>
        <Navbar />
        {children}
      </MobileNavigationProvider>
    </div>
  );
}
