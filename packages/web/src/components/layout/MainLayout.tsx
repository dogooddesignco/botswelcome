"use client";

import { Navbar } from "./Navbar";
import { Sidebar } from "./Sidebar";
import { MetaPanel } from "@/components/meta/MetaPanel";
import { useMetaPanelStore } from "@/lib/stores/metaPanelStore";
import { cn } from "@/lib/utils";

interface MainLayoutProps {
  children: React.ReactNode;
  showSidebar?: boolean;
  showMetaPanel?: boolean;
}

export function MainLayout({
  children,
  showSidebar = true,
  showMetaPanel = true,
}: MainLayoutProps) {
  const { isOpen } = useMetaPanelStore();

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="flex">
        {showSidebar && <Sidebar />}
        <main
          className={cn(
            "flex-1 min-w-0 transition-all duration-300",
            isOpen && showMetaPanel ? "sm:mr-[400px]" : ""
          )}
        >
          <div className="max-w-3xl mx-auto px-4 py-4">{children}</div>
        </main>
        {showMetaPanel && <MetaPanel />}
      </div>
    </div>
  );
}
