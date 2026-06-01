import Link from "next/link";
import { ArrowUpRight, Clock, Loader2, CircleCheck, CircleX } from "lucide-react";
import type { AuditScores, AuditStatus } from "@/types";
import { Badge } from "@/components/ui/badge";
import { safeHost, timeAgo, scoreColor } from "@/lib/utils";

const STATUS_MAP: Record<
  AuditStatus,
  { label: string; cls: string; icon: typeof Clock }
> = {
  pending: { label: "Pending", cls: "text-fg-muted", icon: Clock },
  running: { label: "Running", cls: "text-matrix", icon: Loader2 },
  completed: { label: "Completed", cls: "text-matrix-bright", icon: CircleCheck },
  failed: { label: "Failed", cls: "text-critical", icon: CircleX },
};

export function AuditCard({
  id,
  targetUrl,
  status,
  mode,
  createdAt,
  scores,
  findingsCount,
  engine,
}: {
  id: string;
  targetUrl: string;
  status: AuditStatus;
  mode: string;
  createdAt: Date | string;
  scores: AuditScores | null;
  findingsCount: number;
  engine?: string | null;
}) {
  const st = STATUS_MAP[status];
  const overall = scores?.overall ?? null;

  return (
    <Link href={`/dashboard/audits/${id}`} className="group block">
      <div className="glass h-full rounded-2xl p-5 transition-colors group-hover:border-border-bright">
        <div className="flex items-start justify-between">
          <div className="min-w-0">
            <p className="truncate font-mono text-sm text-fg">{safeHost(targetUrl)}</p>
            <p className="mt-0.5 text-xs text-fg-faint">{timeAgo(createdAt)}</p>
          </div>
          {overall !== null ? (
            <div className="text-right">
              <span className="text-2xl font-bold tabular-nums" style={{ color: scoreColor(overall) }}>
                {overall}
              </span>
              <span className="text-xs text-fg-faint">/100</span>
            </div>
          ) : (
            <ArrowUpRight className="size-4 text-fg-faint transition-colors group-hover:text-matrix" />
          )}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className={`inline-flex items-center gap-1.5 text-xs ${st.cls}`}>
            <st.icon className={`size-3.5 ${status === "running" ? "animate-spin" : ""}`} />
            {st.label}
          </span>
          <Badge className="capitalize">{mode}</Badge>
          {engine && <Badge>{engine}</Badge>}
          {status === "completed" && <Badge>{findingsCount} findings</Badge>}
        </div>
      </div>
    </Link>
  );
}
