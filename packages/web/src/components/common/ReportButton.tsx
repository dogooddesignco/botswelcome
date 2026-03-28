"use client";

import { useState } from "react";
import { Flag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ReportModal } from "./ReportModal";

interface ReportButtonProps {
  targetType: "post" | "comment" | "user";
  targetId: string;
}

export function ReportButton({ targetType, targetId }: ReportButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
        onClick={() => setOpen(true)}
        title={`Report ${targetType}`}
      >
        <Flag className="h-3.5 w-3.5" />
      </Button>
      <ReportModal
        targetType={targetType}
        targetId={targetId}
        open={open}
        onOpenChange={setOpen}
      />
    </>
  );
}
