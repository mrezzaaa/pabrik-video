import { Badge } from "@/components/ui/badge";
import { STATUS_LABELS, type JobStatus, type ProjectStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

const PROJECT_VARIANT: Record<
  ProjectStatus,
  "default" | "muted" | "hot" | "destructive" | "electric" | "warning"
> = {
  QUEUED: "muted",
  RESEARCHING: "electric",
  SCRIPTING: "electric",
  TTS_PROCESSING: "electric",
  VISUAL_PLANNING: "electric",
  RENDERING: "warning",
  DONE: "default",
  FAILED: "destructive",
};

const JOB_VARIANT: Record<
  JobStatus,
  "default" | "muted" | "hot" | "destructive" | "electric" | "warning"
> = {
  PENDING: "muted",
  ACTIVE: "electric",
  COMPLETED: "default",
  FAILED: "destructive",
};

export function StatusBadge({
  status,
  className,
}: {
  status: ProjectStatus;
  className?: string;
}) {
  const live =
    status !== "DONE" && status !== "FAILED" && status !== "QUEUED";

  return (
    <Badge variant={PROJECT_VARIANT[status]} className={className}>
      <span
        className={cn(
          "inline-block size-1.5 rounded-full bg-current",
          live && "animate-pulse",
        )}
      />
      {STATUS_LABELS[status]}
    </Badge>
  );
}

export function JobStatusBadge({
  status,
  className,
}: {
  status: JobStatus;
  className?: string;
}) {
  return (
    <Badge variant={JOB_VARIANT[status]} className={className}>
      {status}
    </Badge>
  );
}
