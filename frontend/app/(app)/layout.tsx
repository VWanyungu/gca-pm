import { Navbar } from "@/components/navbar";
import { MobileNavigationProvider } from "@/components/mobile-navigation-context";
import { ProtectedRoute } from "@/components/protected-route";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <div className="flex min-h-screen flex-col bg-gca-surface">
        <MobileNavigationProvider>
          <Navbar />
          {children}
        </MobileNavigationProvider>
      </div>
    </ProtectedRoute>
  );
}
