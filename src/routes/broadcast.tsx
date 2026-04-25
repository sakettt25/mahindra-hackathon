import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { AppShell } from "@/components/AppShell";
import { QrBroadcaster } from "@/components/QrBroadcaster";
import { Button } from "@/components/ui/button";
import { useIdentity } from "@/hooks/useIdentity";
import { buildOutgoingPayload, createBroadcast } from "@/lib/mesh";
import { encodePayloadToFrames } from "@/lib/qr-protocol";
import { db, type Priority } from "@/lib/db";
import { toast } from "sonner";
import { Siren, AlertTriangle, Info } from "lucide-react";
import { getGlobalPeerConnection } from "@/lib/webrtc";

const search = z.object({
  priority: z.enum(["emergency", "important", "general"]).optional(),
  relay: z.string().optional(),
});

export const Route = createFileRoute("/broadcast")({
  head: () => ({
    meta: [
      { title: "Broadcast — MeshRelay" },
      {
        name: "description",
        content: "Compose a signed message and broadcast it via QR to nearby devices.",
      },
    ],
  }),
  validateSearch: search,
  component: BroadcastPage,
});

const PRIORITIES: {
  id: Priority;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  tone: string;
}[] = [
  {
    id: "emergency",
    label: "Emergency",
    icon: Siren,
    tone: "border-emergency text-emergency bg-emergency/10",
  },
  {
    id: "important",
    label: "Important",
    icon: AlertTriangle,
    tone: "border-important text-important bg-important/10",
  },
  {
    id: "general",
    label: "General",
    icon: Info,
    tone: "border-general text-general bg-general/10",
  },
];

function BroadcastPage() {
  const sp = Route.useSearch();
  const { identity } = useIdentity();
  const navigate = useNavigate();
  const [content, setContent] = useState("");
  const [priority, setPriority] = useState<Priority>(sp.priority ?? "general");
  const [frames, setFrames] = useState<string[] | null>(null);
  const [includeForwarded, setIncludeForwarded] = useState(true);
  const [extraIds, setExtraIds] = useState<string[]>([]);

  // Relay mode: pre-fill from existing message
  useEffect(() => {
    if (!sp.relay) return;
    db.messages.get(sp.relay).then((m) => {
      if (!m) return;
      setExtraIds([m.id]);
      toast.info(`Forwarding "${m.content.slice(0, 40)}…" — generate QR to relay`);
    });
  }, [sp.relay]);

  const charCount = content.length;
  const overLimit = charCount > 1000;

  const handleGenerate = async () => {
    if (!identity) return;
    if (!content.trim() && extraIds.length === 0) {
      toast.error("Write a message or pick something to relay");
      return;
    }
    if (content.trim()) {
      await createBroadcast(identity, content, priority);
    }
    
    // If actively connected via WebRTC, skip the QR code and just sync directly.
    const pc = getGlobalPeerConnection(identity);
    if (pc.status === "connected") {
      toast.success("Message sent instantly over WebRTC tunnel!");
      pc.syncMessages(); // Force immediate sync instead of waiting 3s
      reset();
      return;
    }

    const ids = includeForwarded ? undefined : extraIds.length > 0 ? extraIds : [];
    const payload = await buildOutgoingPayload(identity, undefined, ids);
    const f = encodePayloadToFrames(payload);
    setFrames(f);
    toast.success(`Bundled ${payload.messages.length} message(s) → ${f.length} QR frame(s)`);
  };

  const reset = () => {
    setFrames(null);
    setContent("");
    setExtraIds([]);
    navigate({ to: "/broadcast", search: {} });
  };

  const totalToBundle = useMemo<string>(() => {
    if (includeForwarded) return "all";
    const n = (content.trim() ? 1 : 0) + extraIds.length;
    return String(n);
  }, [content, includeForwarded, extraIds]);

  if (frames) {
    return (
      <AppShell>
        <h1 className="mb-2 mono text-xl font-bold">Transmitting</h1>
        <p className="mb-6 text-sm text-muted-foreground">
          Point a receiving device's camera at the QR. Frames cycle automatically — keep it steady
          until "RECEIVING X/X" completes.
        </p>
        <QrBroadcaster frames={frames} />
        <div className="mt-6 flex justify-center gap-3">
          <Button variant="secondary" onClick={reset}>
            Done
          </Button>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <h1 className="mb-1 mono text-xl font-bold">Create Data Drop</h1>
      <p className="mb-5 text-sm text-muted-foreground">
        Composed messages are signed with your device key and broadcasted optically as a Communal Data Drop.
      </p>

      <div className="mb-4">
        <div className="mb-2 mono text-xs uppercase tracking-wider text-muted-foreground">
          Priority
        </div>
        <div className="grid grid-cols-3 gap-2">
          {PRIORITIES.map((p) => {
            const active = priority === p.id;
            const Icon = p.icon;
            return (
              <button
                key={p.id}
                onClick={() => setPriority(p.id)}
                className={`flex flex-col items-center gap-1 rounded-xl border-2 px-2 py-3 transition-all ${
                  active
                    ? p.tone
                    : "border-border bg-card text-muted-foreground hover:border-border/80"
                }`}
              >
                <Icon className="h-5 w-5" />
                <span className="mono text-xs font-bold uppercase">{p.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="mb-4">
        <div className="mb-2 flex items-center justify-between">
          <span className="mono text-xs uppercase tracking-wider text-muted-foreground">
            Message
          </span>
          <span
            className={`mono text-xs ${overLimit ? "text-emergency" : "text-muted-foreground"}`}
          >
            {charCount}/1000
          </span>
        </div>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="What needs to reach others?"
          className="min-h-32 w-full resize-y rounded-xl border border-border bg-input p-4 text-base text-foreground placeholder:text-muted-foreground focus:border-signal focus:outline-none"
          maxLength={1200}
        />
      </div>

      <label className="mb-5 flex items-center gap-3 rounded-lg border border-border bg-card p-3 text-sm">
        <input
          type="checkbox"
          checked={includeForwarded}
          onChange={(e) => setIncludeForwarded(e.target.checked)}
          className="h-4 w-4 accent-signal"
        />
        <span>
          <span className="font-medium text-foreground">Piggyback unseen messages</span>
          <span className="ml-2 text-muted-foreground">
            (gossip protocol — relays everything in your store)
          </span>
        </span>
      </label>

      <Button
        onClick={handleGenerate}
        disabled={!identity || overLimit}
        className="h-14 w-full text-base mono uppercase tracking-wider disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {overLimit
          ? "Message too long"
          : identity && getGlobalPeerConnection(identity).status === "connected"
            ? "Send via WebRTC Tunnel"
            : `Generate broadcast QR (${totalToBundle === "all" ? "all from store" : `${totalToBundle} msg`})`}
      </Button>
    </AppShell>
  );
}
