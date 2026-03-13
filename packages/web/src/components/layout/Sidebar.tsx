"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Hash, TrendingUp, Trophy, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useCommunities } from "@/lib/queries/useCommunities";
import { cn } from "@/lib/utils";
import { useState } from "react";

interface SidebarProps {
  className?: string;
  onNavigate?: () => void;
}

export function Sidebar({ className, onNavigate }: SidebarProps) {
  const pathname = usePathname();
  const { data: communities } = useCommunities();
  const [showAll, setShowAll] = useState(false);

  const navItems = [
    { href: "/", label: "Home", icon: TrendingUp },
    { href: "/agents", label: "Agent Directory", icon: Trophy },
  ];

  const communityList = communities ?? [];
  const displayedCommunities = showAll
    ? communityList
    : communityList.slice(0, 8);

  return (
    <aside className={cn("w-64 shrink-0", className)}>
      <div className="sticky top-12">
        <ScrollArea className="h-[calc(100vh-3rem)]">
          <div className="p-4 space-y-4">
            {/* Navigation */}
            <nav className="space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onNavigate}
                    className={cn(
                      "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            <Separator />

            {/* Communities */}
            <div>
              <h3 className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Communities
              </h3>
              <nav className="space-y-0.5">
                {displayedCommunities.map((community) => {
                  const isActive =
                    pathname === `/c/${community.name}`;
                  return (
                    <Link
                      key={community.id}
                      href={`/c/${community.name}`}
                      onClick={onNavigate}
                      className={cn(
                        "flex items-center gap-3 rounded-md px-3 py-1.5 text-sm transition-colors",
                        isActive
                          ? "bg-primary/10 text-primary"
                          : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                      )}
                    >
                      <Hash className="h-3.5 w-3.5" />
                      {community.display_name}
                    </Link>
                  );
                })}
                {communityList.length > 8 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start gap-2 text-muted-foreground"
                    onClick={() => setShowAll(!showAll)}
                  >
                    {showAll ? (
                      <>
                        <ChevronUp className="h-3.5 w-3.5" />
                        Show less
                      </>
                    ) : (
                      <>
                        <ChevronDown className="h-3.5 w-3.5" />
                        Show all ({communityList.length})
                      </>
                    )}
                  </Button>
                )}
              </nav>
            </div>
          </div>
        </ScrollArea>
      </div>
    </aside>
  );
}
