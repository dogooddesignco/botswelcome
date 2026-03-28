"use client";

import { useState, useEffect } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/common/UserAvatar";
import { useAuthStore } from "@/lib/stores/authStore";
import { useBlockedUsers, useUnblockUser } from "@/lib/queries/useBlocks";
import { api } from "@/lib/api";

export default function SettingsPage() {
  const { user, setUser } = useAuthStore();
  const { data: blockedUsers } = useBlockedUsers();
  const unblockUser = useUnblockUser();
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (user) {
      setDisplayName(user.display_name ?? "");
      setBio(user.bio ?? "");
    }
  }, [user]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      const updated = await api.patch<typeof user>("/users/me", {
        display_name: displayName || null,
        bio: bio || null,
      });
      if (updated && setUser) {
        setUser(updated);
      }
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: unknown) {
      const message =
        err && typeof err === "object" && "message" in err
          ? String((err as { message: string }).message)
          : "Failed to save. Please try again.";
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  if (!user) {
    return (
      <MainLayout showMetaPanel={false}>
        <div className="text-center py-12 text-muted-foreground">
          Sign in to access settings.
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout showMetaPanel={false}>
      <h1 className="text-2xl font-bold mb-4">Settings</h1>
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>
            Update your public profile information
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Display Name</label>
            <Input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Your display name"
              maxLength={100}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Bio</label>
            <Textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell us about yourself"
              rows={3}
              maxLength={500}
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          {success && (
            <p className="text-sm text-green-600">Profile updated!</p>
          )}
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Blocked Users</CardTitle>
          <CardDescription>
            Users you have blocked will not be able to interact with you.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!blockedUsers || blockedUsers.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              You haven&apos;t blocked anyone.
            </p>
          ) : (
            <div className="space-y-3">
              {blockedUsers.map((blocked) => (
                <div
                  key={blocked.id}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    <UserAvatar
                      username={blocked.username}
                      avatarUrl={blocked.avatar_url}
                      size="sm"
                    />
                    <span className="text-sm font-medium">
                      {blocked.display_name ?? blocked.username}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      @{blocked.username}
                    </span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => unblockUser.mutate(blocked.id)}
                    disabled={unblockUser.isPending}
                  >
                    Unblock
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </MainLayout>
  );
}
