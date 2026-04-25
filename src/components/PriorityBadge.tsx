import type { Priority } from "@/lib/db";

const LABEL: Record<Priority, string> = {
  emergency: "EMERGENCY",
  important: "IMPORTANT",
  general: "GENERAL",
};

const DOT: Record<Priority, string> = {
  emergency: "bg-emergency",
  important: "bg-important",
  general: "bg-general",
};

const RING: Record<Priority, string> = {
  emergency: "border-emergency/50 text-emergency",
  important: "border-important/50 text-important",
  general: "border-general/50 text-general",
};

export function PriorityBadge({
  priority,
  className = "",
}: {
  priority: Priority;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] mono ${RING[priority]} ${className}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${DOT[priority]}`} />
      {LABEL[priority]}
    </span>
  );
}
