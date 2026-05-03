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

const GLOW: Record<string, string> = {
  emergency: "shadow-[inset_4px_0_0_0_var(--color-emergency)] border-emergency/20 bg-gradient-to-r from-emergency/10 to-transparent",
  important: "shadow-[inset_4px_0_0_0_var(--color-important)] border-important/20 bg-gradient-to-r from-important/10 to-transparent",
  general: "shadow-[inset_4px_0_0_0_var(--color-general)] border-general/20",
};

export function MessageCard({ msg }: { msg: MeshMessage }) {
  return (
    <article
      className={`relative rounded-2xl border glass-panel p-5 overflow-hidden transition-all hover-lift ${
        GLOW[msg.priority]
      } ${msg.priority === "emergency" ? "pulse-emergency" : ""}`}
    >
      <header className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <PriorityBadge priority={msg.priority} />
          {msg.isMine && (
            <span className="rounded-full bg-signal/20 px-2 py-0.5 text-[10px] mono font-bold text-signal shadow-[0_0_8px_rgba(245,213,122,0.4)]">
              YOU
            </span>
          )}
        </div>
        <span className="text-xs mono text-muted-foreground bg-black/30 px-2 py-1 rounded-md">{timeAgo(msg.timestamp)}</span>
      </header>

      <p className="mb-5 whitespace-pre-wrap break-words overflow-wrap-anywhere text-[15px] leading-relaxed text-foreground/90 font-medium drop-shadow-sm">
        {msg.content}
      </p>

      <footer className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-white/5">
        <div className="flex items-center gap-1.5 bg-black/20 px-2 py-1 rounded-md">
          <User className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs mono text-muted-foreground">
            {msg.originName ?? "?"} <span className="opacity-50 mx-1">•</span> {msg.originDeviceId}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1 text-xs mono text-muted-foreground">
            <Repeat2 className="h-3.5 w-3.5" /> {msg.hops} hops
          </span>
          <span className="text-xs mono text-muted-foreground opacity-70">TTL {msg.ttl}</span>
          <Link
            to="/broadcast"
            search={{ relay: msg.id }}
            className="rounded-lg border border-signal/40 bg-signal/10 px-3 py-1.5 text-xs mono font-bold text-signal transition-colors hover:bg-signal hover:text-signal-foreground hover:shadow-[0_0_12px_rgba(245,213,122,0.5)]"
          >
            RELAY →
          </Link>
        </div>
      </footer>
    </article>
  );
}
