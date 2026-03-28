"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Check, X, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  useCheckCommunityName,
  useCreateCommunity,
} from "@/lib/queries/useCommunities";

interface CreateCommunityModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateCommunityModal({
  open,
  onOpenChange,
}: CreateCommunityModalProps) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [description, setDescription] = useState("");
  const [debouncedName, setDebouncedName] = useState("");
  const [debouncedDisplayName, setDebouncedDisplayName] = useState("");

  const nameCheck = useCheckCommunityName(debouncedName, debouncedDisplayName);
  const createCommunity = useCreateCommunity();

  // Debounce name input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedName(name);
      setDebouncedDisplayName(displayName);
    }, 400);
    return () => clearTimeout(timer);
  }, [name, displayName]);

  const handleSubmit = () => {
    if (!name || !displayName) return;
    createCommunity.mutate(
      {
        name,
        display_name: displayName,
        description: description.trim() || undefined,
      },
      {
        onSuccess: () => {
          setName("");
          setDisplayName("");
          setDescription("");
          onOpenChange(false);
          router.push(`/c/${name}`);
        },
      }
    );
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setName("");
      setDisplayName("");
      setDescription("");
      createCommunity.reset();
    }
    onOpenChange(newOpen);
  };

  const isAvailable = nameCheck.data?.available === true;
  const hasCheckResult =
    nameCheck.data && !nameCheck.isLoading && debouncedName.length >= 3;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create a Community</DialogTitle>
          <DialogDescription>
            Create a new community for discussions.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Name (slug)</label>
            <div className="relative">
              <Input
                value={name}
                onChange={(e) =>
                  setName(
                    e.target.value
                      .toLowerCase()
                      .replace(/[^a-z0-9_-]/g, "")
                  )
                }
                placeholder="my-community"
                maxLength={50}
              />
              {nameCheck.isLoading && debouncedName.length >= 3 && (
                <Loader2 className="absolute right-3 top-2.5 h-4 w-4 animate-spin text-muted-foreground" />
              )}
              {hasCheckResult && isAvailable && (
                <Check className="absolute right-3 top-2.5 h-4 w-4 text-green-600" />
              )}
              {hasCheckResult && !isAvailable && (
                <X className="absolute right-3 top-2.5 h-4 w-4 text-destructive" />
              )}
            </div>
            {hasCheckResult && !isAvailable && nameCheck.data?.reason && (
              <p className="text-xs text-destructive">
                {nameCheck.data.reason}
              </p>
            )}
            {hasCheckResult && isAvailable && (
              <p className="text-xs text-green-600">Name is available</p>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Display Name</label>
            <Input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="My Community"
              maxLength={100}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">
              Description{" "}
              <span className="text-muted-foreground font-normal">
                (optional)
              </span>
            </label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this community about?"
              rows={3}
              maxLength={500}
            />
          </div>

          {createCommunity.isError && (
            <p className="text-sm text-destructive">
              {createCommunity.error instanceof Error
                ? createCommunity.error.message
                : "Failed to create community. Please try again."}
            </p>
          )}

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => handleOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={
                !name ||
                !displayName ||
                !isAvailable ||
                createCommunity.isPending
              }
            >
              {createCommunity.isPending
                ? "Creating..."
                : "Create Community"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
