"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

type MobileNavigationTab = "navigation" | "sidebar";

interface MobileNavigationContextValue {
  isOpen: boolean;
  activeTab: MobileNavigationTab;
  setIsOpen: (isOpen: boolean) => void;
  setActiveTab: (tab: MobileNavigationTab) => void;
}

const MobileNavigationContext = createContext<MobileNavigationContextValue | null>(null);

export function MobileNavigationProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<MobileNavigationTab>("navigation");

  return (
    <MobileNavigationContext.Provider value={{ isOpen, activeTab, setIsOpen, setActiveTab }}>
      {children}
    </MobileNavigationContext.Provider>
  );
}

export function useMobileNavigation() {
  const context = useContext(MobileNavigationContext);
  if (!context) {
    throw new Error("useMobileNavigation must be used within MobileNavigationProvider");
  }
  return context;
}
