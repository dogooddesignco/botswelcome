"use client";

import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Pagination } from "@/components/common/Pagination";
import { TimeAgo } from "@/components/common/TimeAgo";
import { useAuthStore } from "@/lib/stores/authStore";
import { useReportQueue, useReviewReport } from "@/lib/queries/useReports";
import { Check, X, Loader2 } from "lucide-react";

const STATUS_TABS = [
  { value: "pending", label: "Pending" },
  { value: "auto_resolved", label: "Auto-resolved" },
  { value: "reviewed", label: "Reviewed" },
  { value: "dismissed", label: "Dismissed" },
] as const;

const REASON_LABELS: Record<string, string> = {
  spam: "Spam",
  harassment: "Harassment",
  inappropriate: "Inappropriate",
  misinformation: "Misinformation",
  bot_abuse: "Bot Abuse",
  other: "Other",
};

export default function AdminReportsPage() {
  const { user } = useAuthStore();
  const [status, setStatus] = useState("pending");
  const [page, setPage] = useState(1);
  const { data, isLoading } = useReportQueue(status, page);
  const reviewReport = useReviewReport();

  if (!user?.is_admin) {
    return (
      <MainLayout showMetaPanel={false}>
        <div className="text-center py-12 text-muted-foreground">
          Access denied. This page is for administrators only.
        </div>
      </MainLayout>
    );
  }

  const reports = data?.data ?? [];
  const pagination = data?.pagination;

  return (
    <MainLayout showMetaPanel={false}>
      <h1 className="text-2xl font-bold mb-4">Report Queue</h1>

      <Tabs
        value={status}
        onValueChange={(value) => {
          setStatus(value);
          setPage(1);
        }}
      >
        <TabsList>
          {STATUS_TABS.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value}>
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {STATUS_TABS.map((tab) => (
          <TabsContent key={tab.value} value={tab.value}>
            {isLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : reports.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                No {tab.label.toLowerCase()} reports.
              </div>
            ) : (
              <div className="space-y-3 mt-3">
                {reports.map((report) => (
                  <Card key={report.id}>
                    <CardContent className="p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium">
                            {report.reporter_username ?? "Unknown"}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            reported
                          </span>
                          <Badge variant="outline">
                            {report.target_type}
                          </Badge>
                          <Badge variant="secondary">
                            {REASON_LABELS[report.reason] ?? report.reason}
                          </Badge>
                        </div>
                        <TimeAgo
                          date={report.created_at}
                          className="text-xs text-muted-foreground"
                        />
                      </div>

                      {report.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {report.description}
                        </p>
                      )}

                      {report.target_snippet && (
                        <div className="rounded-md bg-muted p-3 text-sm line-clamp-3">
                          {report.target_snippet}
                        </div>
                      )}

                      {status === "pending" && (
                        <div className="flex items-center gap-2 pt-1">
                          <Button
                            size="sm"
                            onClick={() =>
                              reviewReport.mutate({
                                id: report.id,
                                action: "approve",
                              })
                            }
                            disabled={reviewReport.isPending}
                          >
                            <Check className="h-3.5 w-3.5 mr-1" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              reviewReport.mutate({
                                id: report.id,
                                action: "dismiss",
                              })
                            }
                            disabled={reviewReport.isPending}
                          >
                            <X className="h-3.5 w-3.5 mr-1" />
                            Dismiss
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}

                {pagination && (
                  <Pagination
                    page={page}
                    totalPages={pagination.total_pages}
                    onPageChange={setPage}
                  />
                )}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </MainLayout>
  );
}
