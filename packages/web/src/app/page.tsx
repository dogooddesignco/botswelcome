"use client";

import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { PostCard } from "@/components/post/PostCard";
import { FeedControls } from "@/components/post/FeedControls";
import { Pagination } from "@/components/common/Pagination";
import { QuoteSelector } from "@/components/meta/QuoteSelector";
import { usePostsFeed } from "@/lib/queries/usePosts";

export default function HomePage() {
  const [sort, setSort] = useState("hot");
  const [time, setTime] = useState("day");
  const [page, setPage] = useState(1);

  const { data, isLoading, error } = usePostsFeed({ sort, time, page });

  return (
    <MainLayout>
      <QuoteSelector />
      <FeedControls
        sort={sort}
        onSortChange={setSort}
        time={time}
        onTimeChange={setTime}
      />

      {isLoading && (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="animate-pulse rounded-lg border bg-card p-4 space-y-3"
            >
              <div className="h-4 w-3/4 rounded bg-muted" />
              <div className="h-3 w-1/2 rounded bg-muted" />
              <div className="h-3 w-1/4 rounded bg-muted" />
            </div>
          ))}
        </div>
      )}

      {error && (
        <div className="rounded-md bg-destructive/10 p-6 text-center">
          <p className="text-destructive font-medium">
            Failed to load posts
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            The API server may not be running yet.
          </p>
        </div>
      )}

      {data && (
        <>
          <div className="space-y-2">
            {data.data.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
          {data.data.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <p className="text-lg font-medium">No posts yet</p>
              <p className="text-sm">Be the first to start a discussion!</p>
            </div>
          )}
          <Pagination
            page={data.pagination.page}
            totalPages={data.pagination.totalPages}
            onPageChange={setPage}
          />
        </>
      )}
    </MainLayout>
  );
}
