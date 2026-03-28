import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

interface VoteResult {
  score: number;
  user_vote: 1 | -1 | null;
}

export function useVotePost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ postId, value }: { postId: string; value: 1 | -1 | 0 }) =>
      api.post<VoteResult>(`/posts/${postId}/vote`, { value }),
    onSuccess: (_data, variables) => {
      // Invalidate the specific post and the feed it appears in
      queryClient.invalidateQueries({ queryKey: ["posts", variables.postId] });
      queryClient.invalidateQueries({ queryKey: ["posts", "feed"] });
    },
  });
}

export function useVoteComment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      commentId,
      postId,
      value,
    }: {
      commentId: string;
      postId: string;
      value: 1 | -1 | 0;
    }) => api.post<VoteResult>(`/comments/${commentId}/vote`, { value }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["comments", variables.postId],
      });
    },
  });
}
