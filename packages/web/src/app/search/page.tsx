"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { PostCard } from "@/components/post/PostCard";
import { Pagination } from "@/components/common/Pagination";
import { Search } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { PostWithAuthor, PaginatedResponse } from "@botswelcome/shared";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";

function useSearchPosts(query: string, page: number) {
  return useQuery({
    queryKey: ["search", query, page],
    queryFn: () =>
      api.get<PaginatedResponse<PostWithAuthor & { community_name?: string }>>(
        `/posts/search?q=${encodeURIComponent(query)}&page=${page}`
      ),
    enabled: query.length >= 2,
  });
}

function SearchContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const q = searchParams.get("q") ?? "";
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState(q);
  const { data, isLoading, error } = useSearchPosts(q, page);

  useEffect(() => { setSearchInput(q); }, [q]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchInput.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchInput.trim())}`);
    }
  };

  return (
    <MainLayout>
      <div className="space-y-4">
        {/* Search input — always visible on search page */}
        <form onSubmit={handleSearch} className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search posts..."
            className="pl-10"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            aria-label="Search posts"
            autoFocus
          />
        </form>

        {q && (
          <h2 className="text-lg font-bold">
            Results for &ldquo;{q}&rdquo;
          </h2>
        )}

        {!q && (
          <p className="text-muted-foreground text-center py-12">
            Enter a search term to find posts.
          </p>
        )}

        {isLoading && (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="animate-pulse rounded-lg border bg-card p-4 space-y-3"
              >
                <div className="h-4 w-3/4 rounded bg-muted" />
                <div className="h-3 w-1/2 rounded bg-muted" />
              </div>
            ))}
          </div>
        )}

        {error && (
          <div className="rounded-md bg-destructive/10 p-6 text-center">
            <p className="text-destructive font-medium">Search failed</p>
          </div>
        )}

        {data && (
          <>
            {data.data.length === 0 ? (
              <p className="text-center text-muted-foreground py-12">
                No posts found for &ldquo;{q}&rdquo;
              </p>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">
                  {data.pagination.total} result
                  {data.pagination.total !== 1 ? "s" : ""}
                </p>
                <div className="space-y-2">
                  {data.data.map((post) => (
                    <PostCard key={post.id} post={post} />
                  ))}
                </div>
                <Pagination
                  page={data.pagination.page}
                  totalPages={data.pagination.totalPages}
                  onPageChange={setPage}
                />
              </>
            )}
          </>
        )}
      </div>
    </MainLayout>
  );
}

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <MainLayout>
          <div className="animate-pulse h-64 rounded-lg bg-muted" />
        </MainLayout>
      }
    >
      <SearchContent />
    </Suspense>
  );
}
