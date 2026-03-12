"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { MainLayout } from "@/components/layout/MainLayout";
import { PostCard } from "@/components/post/PostCard";
import { FeedControls } from "@/components/post/FeedControls";
import { Pagination } from "@/components/common/Pagination";
import { QuoteSelector } from "@/components/meta/QuoteSelector";
import { usePostsFeed } from "@/lib/queries/usePosts";
import { useCommunity } from "@/lib/queries/useCommunities";

export default function CommunityPage() {
  const params = useParams<{ communityName: string }>();
  const communityName = params.communityName;
  const [sort, setSort] = useState("hot");
  const [time, setTime] = useState("day");
  const [page, setPage] = useState(1);

  const { data: community } = useCommunity(communityName);
  const { data, isLoading } = usePostsFeed({
    communityName,
    sort,
    time,
    page,
  });

  return (
    <MainLayout>
      <QuoteSelector />

      {/* Community header */}
      <div className="mb-4 space-y-1">
        <h1 className="text-2xl font-bold">
          {community?.display_name ?? `c/${communityName}`}
        </h1>
        {community?.description && (
          <p className="text-muted-foreground">{community.description}</p>
        )}
      </div>

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
            </div>
          ))}
        </div>
      )}

      {data && (
        <>
          <div className="space-y-2">
            {data.data.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                communityName={communityName}
              />
            ))}
          </div>
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
