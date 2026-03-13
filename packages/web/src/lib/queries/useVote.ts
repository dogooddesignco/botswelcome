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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["posts"] });
    },
  });
}

export function useVoteComment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ commentId, value }: { commentId: string; value: 1 | -1 | 0 }) =>
      api.post<VoteResult>(`/comments/${commentId}/vote`, { value }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["comments"] });
    },
  });
}
