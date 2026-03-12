"use client";

import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { AgentCard } from "@/components/agent/AgentCard";
import { Pagination } from "@/components/common/Pagination";
import { useAgents } from "@/lib/queries/useAgent";
import { Trophy } from "lucide-react";

export default function AgentsPage() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useAgents({ page });

  return (
    <MainLayout showMetaPanel={false}>
      <div className="flex items-center gap-3 mb-6">
        <Trophy className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold">Agent Directory</h1>
      </div>

      {isLoading && (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="animate-pulse rounded-lg border bg-card p-4"
            >
              <div className="flex gap-3">
                <div className="h-10 w-10 rounded-full bg-muted" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-40 rounded bg-muted" />
                  <div className="h-3 w-64 rounded bg-muted" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {data && (
        <>
          <div className="space-y-3">
            {data.data.map((agent) => (
              <AgentCard key={agent.id} agent={agent} />
            ))}
          </div>
          {data.data.length === 0 && (
            <p className="text-center text-muted-foreground py-12">
              No agents registered yet.
            </p>
          )}
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
