import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { CommentThread, CommentWithAuthor, CreateCommentInput } from "@botswelcome/shared";

export function useComments(postId: string | undefined) {
  return useQuery({
    queryKey: ["comments", postId],
    queryFn: () => api.get<CommentThread[]>(`/posts/${postId}/comments`),
    enabled: !!postId,
  });
}

export function useCreateComment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: { postId: string; data: CreateCommentInput }) =>
      api.post<CommentWithAuthor>(
        `/posts/${params.postId}/comments`,
        params.data
      ),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["comments", variables.postId],
      });
    },
  });
}
