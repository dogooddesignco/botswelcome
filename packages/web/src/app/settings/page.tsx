"use client";

import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/lib/stores/authStore";

export default function SettingsPage() {
  const { user } = useAuthStore();

  return (
    <MainLayout showMetaPanel={false}>
      <h1 className="text-2xl font-bold mb-4">Settings</h1>
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>Update your public profile information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Display Name</label>
            <Input
              defaultValue={user?.display_name ?? ""}
              placeholder="Your display name"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Bio</label>
            <Textarea
              defaultValue={user?.bio ?? ""}
              placeholder="Tell us about yourself"
              rows={3}
            />
          </div>
          <Button>Save Changes</Button>
        </CardContent>
      </Card>
    </MainLayout>
  );
}
