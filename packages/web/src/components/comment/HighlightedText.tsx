"use client";

import Link from "next/link";
import type { QuoteSelection } from "@botswelcome/shared";
import { cn } from "@/lib/utils";

interface HighlightedTextProps {
  text: string;
  highlights?: QuoteSelection[];
  className?: string;
}

interface Segment {
  text: string;
  highlighted: boolean;
  count: number;
}

function buildSegments(
  text: string,
  highlights: QuoteSelection[]
): Segment[] {
  if (highlights.length === 0) {
    return [{ text, highlighted: false, count: 0 }];
  }

  // Build a count array for each character position
  const counts = new Array(text.length).fill(0) as number[];
  for (const h of highlights) {
    const start = Math.max(0, h.start_offset);
    const end = Math.min(text.length, h.end_offset);
    for (let i = start; i < end; i++) {
      counts[i]++;
    }
  }

  // Merge consecutive chars with same count into segments
  const segments: Segment[] = [];
  let i = 0;
  while (i < text.length) {
    const count = counts[i];
    let j = i;
    while (j < text.length && counts[j] === count) j++;
    segments.push({
      text: text.slice(i, j),
      highlighted: count > 0,
      count,
    });
    i = j;
  }
  return segments;
}

function intensityClass(count: number): string {
  if (count >= 5) return "bg-yellow-400/40";
  if (count >= 3) return "bg-yellow-400/30";
  if (count >= 2) return "bg-yellow-400/20";
  return "bg-yellow-400/15";
}

const MENTION_REGEX = /@([a-zA-Z0-9_-]{3,50})\b/g;

/**
 * Renders text with @mentions as clickable profile links.
 */
function TextWithMentions({ children }: { children: string }) {
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  const regex = new RegExp(MENTION_REGEX.source, "g");

  while ((match = regex.exec(children)) !== null) {
    // Add text before the mention
    if (match.index > lastIndex) {
      parts.push(children.slice(lastIndex, match.index));
    }
    // Add the mention as a link
    const username = match[1];
    parts.push(
      <Link
        key={`${match.index}-${username}`}
        href={`/u/${username}`}
        className="text-primary font-medium hover:underline"
      >
        @{username}
      </Link>
    );
    lastIndex = match.index + match[0].length;
  }

  // Add remaining text
  if (lastIndex < children.length) {
    parts.push(children.slice(lastIndex));
  }

  return <>{parts}</>;
}

export function HighlightedText({
  text,
  highlights = [],
  className,
}: HighlightedTextProps) {
  const segments = buildSegments(text, highlights);

  return (
    <span className={className}>
      {segments.map((seg, i) =>
        seg.highlighted ? (
          <mark
            key={i}
            className={cn(
              "rounded-sm px-0.5 text-inherit",
              intensityClass(seg.count)
            )}
            title={`Quoted ${seg.count} time${seg.count === 1 ? "" : "s"}`}
          >
            <TextWithMentions>{seg.text}</TextWithMentions>
          </mark>
        ) : (
          <span key={i}>
            <TextWithMentions>{seg.text}</TextWithMentions>
          </span>
        )
      )}
    </span>
  );
}
