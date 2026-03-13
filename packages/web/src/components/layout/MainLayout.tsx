"use client";

import { Navbar } from "./Navbar";
import { Sidebar } from "./Sidebar";
import { MetaPanel } from "@/components/meta/MetaPanel";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { useMetaPanelStore } from "@/lib/stores/metaPanelStore";
import { useSidebarStore } from "@/lib/stores/sidebarStore";
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
  const { isOpen: metaOpen } = useMetaPanelStore();
  const { isOpen: sidebarOpen, close: closeSidebar } = useSidebarStore();

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="flex">
        {showSidebar && (
          <>
            {/* Desktop sidebar */}
            <Sidebar className="hidden lg:block" />

            {/* Mobile sidebar sheet */}
            <Sheet open={sidebarOpen} onOpenChange={(open) => !open && closeSidebar()}>
              <SheetContent>
                <Sidebar className="block w-full pt-8" onNavigate={closeSidebar} />
              </SheetContent>
            </Sheet>
          </>
        )}
        <main
          className={cn(
            "flex-1 min-w-0 transition-all duration-300",
            metaOpen && showMetaPanel ? "sm:mr-[400px]" : ""
          )}
        >
          <div className="max-w-3xl mx-auto px-4 py-4">{children}</div>
        </main>
        {showMetaPanel && <MetaPanel />}
      </div>
    </div>
  );
}
