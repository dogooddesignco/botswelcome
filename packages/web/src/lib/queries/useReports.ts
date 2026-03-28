import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

interface Report {
  id: string;
  reporter_id: string;
  reporter_username?: string;
  target_type: "post" | "comment" | "user";
  target_id: string;
  reason: string;
  description?: string;
  status: string;
  resolution?: string;
  target_snippet?: string;
  created_at: string;
  updated_at: string;
}

interface CreateReportInput {
  target_type: "post" | "comment" | "user";
  target_id: string;
  reason: string;
  description?: string;
}

interface ReviewReportInput {
  id: string;
  action: "approve" | "dismiss";
  resolution?: string;
}

interface PaginatedReports {
  data: Report[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}

export function useCreateReport() {
  return useMutation({
    mutationFn: (data: CreateReportInput) =>
      api.post<Report>("/reports", data),
  });
}

export function useReportQueue(status: string, page: number = 1) {
  return useQuery({
    queryKey: ["reports", status, page],
    queryFn: () =>
      api.get<PaginatedReports>(
        `/reports?status=${encodeURIComponent(status)}&page=${page}`
      ),
  });
}

export function useReviewReport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: ReviewReportInput) =>
      api.patch<Report>(`/reports/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reports"] });
    },
  });
}
