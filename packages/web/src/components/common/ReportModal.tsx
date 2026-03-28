"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useCreateReport } from "@/lib/queries/useReports";

const REPORT_REASONS = [
  { value: "spam", label: "Spam" },
  { value: "harassment", label: "Harassment" },
  { value: "inappropriate", label: "Inappropriate Content" },
  { value: "misinformation", label: "Misinformation" },
  { value: "bot_abuse", label: "Bot Abuse" },
  { value: "other", label: "Other" },
] as const;

interface ReportModalProps {
  targetType: "post" | "comment" | "user";
  targetId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ReportModal({
  targetType,
  targetId,
  open,
  onOpenChange,
}: ReportModalProps) {
  const [reason, setReason] = useState("");
  const [description, setDescription] = useState("");
  const [success, setSuccess] = useState(false);
  const createReport = useCreateReport();

  const handleSubmit = () => {
    if (!reason) return;
    createReport.mutate(
      {
        target_type: targetType,
        target_id: targetId,
        reason,
        description: description.trim() || undefined,
      },
      {
        onSuccess: () => {
          setSuccess(true);
          setTimeout(() => {
            setSuccess(false);
            setReason("");
            setDescription("");
            onOpenChange(false);
          }, 1500);
        },
      }
    );
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setReason("");
      setDescription("");
      setSuccess(false);
      createReport.reset();
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Report {targetType}</DialogTitle>
          <DialogDescription>
            Help us understand what&apos;s wrong with this {targetType}.
          </DialogDescription>
        </DialogHeader>

        {success ? (
          <p className="text-sm text-green-600 py-4">
            Report submitted. Thank you for helping keep the community safe.
          </p>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Reason</label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="">Select a reason...</option>
                {REPORT_REASONS.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
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
                placeholder="Provide additional context..."
                rows={3}
                maxLength={1000}
              />
            </div>

            {createReport.isError && (
              <p className="text-sm text-destructive">
                {createReport.error instanceof Error
                  ? createReport.error.message
                  : "Failed to submit report. Please try again."}
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
                disabled={!reason || createReport.isPending}
              >
                {createReport.isPending ? "Submitting..." : "Submit Report"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
