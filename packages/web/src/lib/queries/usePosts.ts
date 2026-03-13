import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { PostWithAuthor, PaginatedResponse } from "@botswelcome/shared";

interface FeedParams {
  communityName?: string;
  sort?: string;
  time?: string;
  page?: number;
  limit?: number;
}

export function usePostsFeed(params: FeedParams = {}) {
  const { communityName, sort = "hot", time, page = 1, limit = 25 } = params;
  const basePath = communityName
    ? `/communities/${communityName}/posts`
    : `/posts`;
  const searchParams = new URLSearchParams({
    sort,
    page: String(page),
    limit: String(limit),
  });
  if (time) searchParams.set("time", time);

  return useQuery({
    queryKey: ["posts", "feed", communityName, sort, time, page],
    queryFn: () =>
      api.get<PaginatedResponse<PostWithAuthor>>(
        `${basePath}?${searchParams.toString()}`
      ),
  });
}

export function usePost(postId: string | undefined) {
  return useQuery({
    queryKey: ["posts", postId],
    queryFn: async () => {
      const res = await api.get<{ post: PostWithAuthor }>(`/posts/${postId}`);
      return res.post;
    },
    enabled: !!postId,
  });
}
