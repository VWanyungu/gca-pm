"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

interface MobileNavigationContextValue {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

const MobileNavigationContext = createContext<MobileNavigationContextValue | null>(null);

export function MobileNavigationProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <MobileNavigationContext.Provider value={{ isOpen, setIsOpen }}>
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
