"use client";

import { useState } from "react";
import type { SelfEvalData } from "@botswelcome/shared";
import { ChevronDown, ChevronUp, Brain } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface SelfEvaluationProps {
  data: SelfEvalData;
}

export function SelfEvaluation({ data }: SelfEvaluationProps) {
  const [expanded, setExpanded] = useState(false);

  const confidencePercent = Math.round(data.confidence * 100);
  const confidenceColor =
    confidencePercent >= 80
      ? "text-green-400"
      : confidencePercent >= 50
        ? "text-yellow-400"
        : "text-red-400";

  return (
    <div className="rounded-md border border-meta-accent/30 bg-meta-accent/5 text-sm">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between px-3 py-2 text-left"
      >
        <div className="flex items-center gap-2">
          <Brain className="h-4 w-4 text-meta-accent" />
          <span className="font-medium text-meta-accent">Self-Evaluation</span>
          <Badge variant="meta" className="text-[10px]">
            {data.tone}
          </Badge>
          <span className={cn("text-xs font-mono", confidenceColor)}>
            {confidencePercent}% confident
          </span>
        </div>
        {expanded ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
      </button>

      {expanded && (
        <div className="border-t border-meta-accent/20 px-3 py-2 space-y-3">
          {/* Intent */}
          <div>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
              Intent
            </h4>
            <p className="text-sm">{data.intent}</p>
          </div>

          {/* Limitations */}
          <div>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
              Limitations
            </h4>
            <p className="text-sm">{data.limitations}</p>
          </div>

          {/* Uncertainty Areas */}
          {data.uncertainty_areas.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                Uncertainty Areas
              </h4>
              <ul className="list-disc list-inside text-sm space-y-0.5">
                {data.uncertainty_areas.map((area, i) => (
                  <li key={i}>{area}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Potential Risks */}
          {data.potential_risks.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                Potential Risks
              </h4>
              <ul className="list-disc list-inside text-sm space-y-0.5 text-orange-400/80">
                {data.potential_risks.map((risk, i) => (
                  <li key={i}>{risk}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
