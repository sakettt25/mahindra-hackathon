import { Link } from "@tanstack/react-router";
import { PriorityBadge } from "./PriorityBadge";
import type { MeshMessage } from "@/lib/db";
import { Repeat2, User } from "lucide-react";

function timeAgo(ts: number): string {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

const BORDER: Record<string, string> = {
  emergency: "border-l-emergency",
  important: "border-l-important",
  general: "border-l-general",
};

export function MessageCard({ msg }: { msg: MeshMessage }) {
  return (
    <article
      className={`rounded-lg border border-border border-l-4 bg-card p-4 overflow-hidden ${
        BORDER[msg.priority]
      } ${msg.priority === "emergency" ? "pulse-emergency" : ""}`}
    >
      <header className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <PriorityBadge priority={msg.priority} />
          {msg.isMine && (
            <span className="rounded-full border border-signal/40 px-2 py-0.5 text-[10px] mono text-signal">
              YOU
            </span>
          )}
        </div>
        <span className="text-xs mono text-muted-foreground">{timeAgo(msg.timestamp)}</span>
      </header>

      <p className="mb-3 whitespace-pre-wrap break-words overflow-wrap-anywhere text-base leading-relaxed text-foreground">
        {msg.content}
      </p>

      <footer className="flex flex-wrap items-center justify-between gap-2 text-xs mono text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <User className="h-3 w-3" />
          {msg.originName ?? "?"} · {msg.originDeviceId}
        </span>
        <span className="inline-flex items-center gap-3">
          <span className="inline-flex items-center gap-1">
            <Repeat2 className="h-3 w-3" /> {msg.hops} hops
          </span>
          <span>TTL {msg.ttl}</span>
          <Link
            to="/broadcast"
            search={{ relay: msg.id }}
            className="rounded-md border border-signal/40 px-2 py-1 text-signal hover:bg-signal/10"
          >
            RELAY →
          </Link>
        </span>
      </footer>
    </article>
  );
}
