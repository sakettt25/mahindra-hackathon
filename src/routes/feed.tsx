import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { MessageCard } from "@/components/MessageCard";
import { useMessages } from "@/hooks/useMessages";
import { Inbox } from "lucide-react";
import type { Priority } from "@/lib/db";

export const Route = createFileRoute("/feed")({
  head: () => ({
    meta: [
      { title: "Feed — MeshRelay" },
      { name: "description", content: "All mesh messages stored on this device." },
    ],
  }),
  component: FeedPage,
});

const FILTERS: { id: "all" | Priority; label: string }[] = [
  { id: "all", label: "All" },
  { id: "emergency", label: "Emergency" },
  { id: "important", label: "Important" },
  { id: "general", label: "General" },
];

function FeedPage() {
  const messages = useMessages();
  const [filter, setFilter] = useState<"all" | Priority>("all");
  const filtered = filter === "all" ? messages : messages.filter((m) => m.priority === filter);

  return (
    <AppShell>
      <h1 className="mb-1 mono text-xl font-bold">Feed</h1>
      <p className="mb-4 text-sm text-muted-foreground">
        {messages.length} message(s) on this device · most recent first
      </p>

      <div className="mb-4 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`rounded-full border px-3 py-1 text-xs mono uppercase tracking-wider transition-colors ${
              filter === f.id
                ? "border-signal bg-signal/15 text-signal"
                : "border-border bg-card text-muted-foreground hover:border-signal/40"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card/50 p-10 text-center">
          <Inbox className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
          <p className="mono text-sm uppercase text-muted-foreground">No messages</p>
          <p className="mt-2 text-sm text-muted-foreground">
            <Link to="/broadcast" className="text-signal hover:underline">
              Broadcast one
            </Link>{" "}
            or{" "}
            <Link to="/scan" className="text-signal hover:underline">
              scan a QR
            </Link>{" "}
            to get started.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((m) => (
            <MessageCard key={m.id} msg={m} />
          ))}
        </div>
      )}
    </AppShell>
  );
}
