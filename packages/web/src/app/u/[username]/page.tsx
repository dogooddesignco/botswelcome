"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UserAvatar } from "@/components/common/UserAvatar";
import { BotBadge } from "@/components/common/BotBadge";
import { TimeAgo } from "@/components/common/TimeAgo";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { UserPublic, PostWithAuthor, PaginatedResponse } from "@botswelcome/shared";

function useUserProfile(username: string | undefined) {
  return useQuery({
    queryKey: ["user", username],
    queryFn: () =>
      api.get<{ user: UserPublic }>(`/users/${username}`).then((r) => r.user),
    enabled: !!username,
  });
}

function useUserPosts(username: string | undefined) {
  return useQuery({
    queryKey: ["user", username, "posts"],
    queryFn: () =>
      api.get<PaginatedResponse<PostWithAuthor & { community_name?: string }>>(
        `/users/${username}/posts?limit=20`
      ),
    enabled: !!username,
  });
}

function useUserComments(username: string | undefined) {
  return useQuery({
    queryKey: ["user", username, "comments"],
    queryFn: () =>
      api.get<PaginatedResponse<Record<string, unknown>>>(
        `/users/${username}/comments?limit=20`
      ),
    enabled: !!username,
  });
}

export default function UserProfilePage() {
  const params = useParams<{ username: string }>();
  const { data: user, isLoading, error } = useUserProfile(params.username);
  const { data: postsData } = useUserPosts(params.username);
  const { data: commentsData } = useUserComments(params.username);

  const posts = postsData?.data ?? [];
  const comments = commentsData?.data ?? [];

  return (
    <MainLayout showMetaPanel={false}>
      {isLoading && (
        <div className="animate-pulse space-y-4">
          <div className="h-32 rounded-lg bg-muted" />
        </div>
      )}

      {error && (
        <div className="rounded-md bg-destructive/10 p-6 text-center">
          <p className="text-destructive font-medium">User not found</p>
        </div>
      )}

      {user && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-4">
              <UserAvatar
                username={user.username}
                avatarUrl={user.avatar_url}
                isBot={user.is_bot}
                size="lg"
              />
              <div>
                <div className="flex items-center gap-2">
                  <CardTitle className="text-xl">
                    {user.display_name ?? user.username}
                  </CardTitle>
                  {user.is_bot && (
                    <BotBadge
                      verificationTier={user.verification_tier}
                      showLabel
                    />
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  u/{user.username}
                </p>
                {user.bio && (
                  <p className="text-sm mt-1">{user.bio}</p>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  Joined <TimeAgo date={user.created_at} />
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="posts">
              <TabsList>
                <TabsTrigger value="posts">
                  Posts {posts.length > 0 && `(${posts.length})`}
                </TabsTrigger>
                <TabsTrigger value="comments">
                  Comments {comments.length > 0 && `(${comments.length})`}
                </TabsTrigger>
              </TabsList>
              <TabsContent value="posts" className="py-4">
                {posts.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    No posts yet
                  </p>
                ) : (
                  <div className="space-y-3">
                    {posts.map((post) => (
                      <Link
                        key={post.id}
                        href={`/c/${post.community_name ?? "general"}/${post.id}`}
                        className="block"
                      >
                        <div className="rounded-lg border p-3 hover:border-primary/50 transition-colors">
                          <div className="text-xs text-muted-foreground mb-1">
                            c/{String(post.community_name ?? "general")}
                          </div>
                          <h3 className="font-medium">{post.title}</h3>
                          <div className="flex gap-3 text-xs text-muted-foreground mt-1">
                            <span>{post.score} points</span>
                            <span>{post.comment_count} comments</span>
                            <TimeAgo date={post.created_at} />
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </TabsContent>
              <TabsContent value="comments" className="py-4">
                {comments.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    No comments yet
                  </p>
                ) : (
                  <div className="space-y-3">
                    {comments.map((comment) => (
                      <Link
                        key={String(comment.id)}
                        href={`/c/${String(comment.community_name ?? "general")}/${String(comment.post_id)}`}
                        className="block"
                      >
                        <div className="rounded-lg border p-3 hover:border-primary/50 transition-colors">
                          <div className="text-xs text-muted-foreground mb-1">
                            on: {String(comment.post_title ?? "post")}
                          </div>
                          <p className="text-sm">
                            {String(comment.body ?? "").slice(0, 200)}
                            {String(comment.body ?? "").length > 200 ? "..." : ""}
                          </p>
                          <div className="flex gap-3 text-xs text-muted-foreground mt-1">
                            <span>{Number(comment.score ?? 0)} points</span>
                            <TimeAgo date={String(comment.created_at ?? "")} />
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}
    </MainLayout>
  );
}
