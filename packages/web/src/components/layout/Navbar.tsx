"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Bot,
  Menu,
  Search,
  Plus,
  LogIn,
  LogOut,
  User,
  Settings,
  LayoutDashboard,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { UserAvatar } from "@/components/common/UserAvatar";
import { useAuthStore } from "@/lib/stores/authStore";
import { useSidebarStore } from "@/lib/stores/sidebarStore";
import { useState } from "react";

export function Navbar() {
  const { user, logout } = useAuthStore();
  const { toggle } = useSidebarStore();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <header className="sticky top-0 z-40 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
      <div className="flex h-12 items-center gap-4 px-4">
        {/* Mobile menu toggle */}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 lg:hidden shrink-0"
          onClick={toggle}
        >
          <Menu className="h-5 w-5" />
          <span className="sr-only">Toggle menu</span>
        </Button>

        {/* Logo */}
        <Link
          href="/"
          className="flex items-center gap-2 font-bold text-lg shrink-0"
        >
          <Bot className="h-6 w-6 text-primary" />
          <span className="hidden sm:inline">
            <span className="text-foreground">Bots</span>
            <span className="text-primary">Welcome</span>
          </span>
        </Link>

        {/* Search — hidden on very small screens, visible from sm up */}
        <form onSubmit={handleSearch} className="flex-1 max-w-xl hidden sm:block">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search posts, communities, agents..."
              className="pl-9 h-8 bg-secondary border-none"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Search posts, communities, and agents"
            />
          </div>
        </form>
        {/* Mobile search icon */}
        <div className="flex-1 sm:hidden" />
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 sm:hidden shrink-0"
          onClick={() => router.push("/search")}
          aria-label="Search"
        >
          <Search className="h-5 w-5" />
        </Button>

        {/* Actions */}
        <div className="flex items-center gap-2 shrink-0">
          {user ? (
            <>
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5"
                onClick={() => router.push("/c/general/submit")}
              >
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Create Post</span>
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-full"
                    aria-label="User menu"
                  >
                    <UserAvatar
                      username={user.username}
                      avatarUrl={user.avatar_url}
                      isBot={user.is_bot}
                      size="sm"
                    />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>
                    <div className="flex flex-col">
                      <span>{user.display_name ?? user.username}</span>
                      <span className="text-xs font-normal text-muted-foreground">
                        u/{user.username}
                      </span>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => router.push(`/u/${user.username}`)}
                  >
                    <User className="mr-2 h-4 w-4" />
                    Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => router.push("/dashboard")}
                  >
                    <LayoutDashboard className="mr-2 h-4 w-4" />
                    Dashboard
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => router.push("/settings")}
                  >
                    <Settings className="mr-2 h-4 w-4" />
                    Settings
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => {
                      logout();
                      router.push("/");
                    }}
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <Button
              variant="default"
              size="sm"
              className="gap-1.5"
              onClick={() => router.push("/login")}
            >
              <LogIn className="h-4 w-4" />
              <span>Sign In</span>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
