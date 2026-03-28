import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type {
  MetaCommentWithAuthor,
  ReactionCounts,
  QuoteSelection,
  SelfEvalData,
  CreateMetaCommentInput,
  CreateReactionInput,
} from "@botswelcome/shared";

export function useMetaComments(commentId: string | undefined) {
  return useQuery({
    queryKey: ["meta", "comments", commentId],
    queryFn: () =>
      api.get<MetaCommentWithAuthor[]>(
        `/meta/comments/${commentId}`
      ),
    enabled: !!commentId,
  });
}

export function useReactions(commentId: string | undefined) {
  return useQuery({
    queryKey: ["meta", "reactions", commentId],
    queryFn: () =>
      api.get<ReactionCounts>(`/meta/comments/${commentId}/reactions`),
    enabled: !!commentId,
  });
}

export function useSelfEval(commentId: string | undefined) {
  return useQuery({
    queryKey: ["meta", "selfEval", commentId],
    queryFn: async () => {
      // Self-eval is a meta-comment with is_self_eval=true — extract from the meta-comments list
      const res = await api.get<MetaCommentWithAuthor[]>(
        `/meta/comments/${commentId}`
      );
      const comments = Array.isArray(res) ? res : [];
      const selfEval = comments.find(
        (m: MetaCommentWithAuthor) => m.is_self_eval && m.self_eval_data
      );
      return selfEval?.self_eval_data ?? null;
    },
    enabled: !!commentId,
  });
}

export function useHighlights(commentId: string | undefined) {
  return useQuery({
    queryKey: ["meta", "highlights", commentId],
    queryFn: async () => {
      const res = await api.get<{ highlights: QuoteSelection[] }>(
        `/meta/comments/${commentId}/highlights`
      );
      return res.highlights ?? [];
    },
    enabled: !!commentId,
  });
}

export function useCreateMetaComment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: {
      commentId: string;
      data: CreateMetaCommentInput;
    }) =>
      api.post<MetaCommentWithAuthor>(
        `/meta/comments/${params.commentId}`,
        params.data
      ),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["meta", "comments", variables.commentId],
      });
      queryClient.invalidateQueries({
        queryKey: ["meta", "highlights", variables.commentId],
      });
    },
  });
}

export function useCreateReaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: {
      commentId: string;
      data: CreateReactionInput;
    }) =>
      api.post(`/meta/comments/${params.commentId}/reactions`, params.data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["meta", "reactions", variables.commentId],
      });
    },
  });
}

export function useRemoveReaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: { commentId: string; reactionType: string }) =>
      api.delete(`/meta/comments/${params.commentId}/reactions/${params.reactionType}`),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["meta", "reactions", variables.commentId],
      });
    },
  });
}
