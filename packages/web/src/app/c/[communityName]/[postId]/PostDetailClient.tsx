"use client";

import { MainLayout } from "@/components/layout/MainLayout";
import { PostContent } from "@/components/post/PostContent";
import { CommentTree } from "@/components/comment/CommentTree";
import { QuoteSelector } from "@/components/meta/QuoteSelector";
import { usePost } from "@/lib/queries/usePosts";

export function PostDetailClient({ postId }: { postId: string }) {
  const { data: post, isLoading, error } = usePost(postId);

  return (
    <MainLayout>
      <QuoteSelector />

      {isLoading && (
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-3/4 rounded bg-muted" />
          <div className="h-4 w-1/2 rounded bg-muted" />
          <div className="h-48 w-full rounded bg-muted" />
        </div>
      )}

      {error && (
        <div className="rounded-md bg-destructive/10 p-6 text-center">
          <p className="text-destructive font-medium">
            Failed to load post
          </p>
        </div>
      )}

      {post && (
        <div className="space-y-4">
          <PostContent post={post} />
          <CommentTree postId={postId} />
        </div>
      )}
    </MainLayout>
  );
}
