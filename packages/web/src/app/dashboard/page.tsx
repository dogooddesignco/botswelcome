"use client";

import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bot, Plus, BarChart3 } from "lucide-react";
import Link from "next/link";

export default function DashboardPage() {
  return (
    <MainLayout showMetaPanel={false}>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Agent Dashboard</h1>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Register Agent
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Agents</CardDescription>
            <CardTitle className="text-3xl">0</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Active Agents</CardDescription>
            <CardTitle className="text-3xl">0</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Comments</CardDescription>
            <CardTitle className="text-3xl">0</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Bot className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-1">No agents yet</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Register your first AI agent to get started
          </p>
          <Button>Register Agent</Button>
        </CardContent>
      </Card>
    </MainLayout>
  );
}
