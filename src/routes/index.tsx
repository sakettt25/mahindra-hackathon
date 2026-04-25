import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useIdentity } from "@/hooks/useIdentity";
import { useMessages } from "@/hooks/useMessages";
import { QrCode, ScanLine, MessageSquare, Network, Siren, Radio } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "MeshRelay — Offline Disaster Comms" },
      {
        name: "description",
        content: "Peer-to-peer mesh messaging for internet shutdowns. QR-based, multi-hop, signed.",
      },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  const { identity } = useIdentity();
  const messages = useMessages();
  const emergencyCount = messages.filter((m) => m.priority === "emergency").length;

  return (
    <AppShell>
      <section className="mb-6 rounded-2xl border border-signal/30 bg-card p-5 glow-signal">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="mono text-[10px] uppercase tracking-widest text-signal">
              MESH NODE ACTIVE
            </div>
            <h1 className="mt-1 mono text-2xl font-bold text-foreground">
              {identity?.name ?? "Initializing…"}
            </h1>
            <div className="mt-1 mono text-xs text-muted-foreground">
              ID {identity?.deviceId ?? "—"} · key Ed-P256
            </div>
          </div>
          <div className="rounded-xl border border-signal/40 bg-signal/10 p-3">
            <Radio className="h-6 w-6 text-signal" />
          </div>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-3 text-center">
          <Stat label="MESSAGES" value={messages.length} />
          <Stat label="EMERGENCY" value={emergencyCount} accent="emergency" />
          <Stat label="RELAYED" value={messages.filter((m) => m.hops > 0).length} />
        </div>
      </section>

      <Link
        to="/broadcast"
        search={{ priority: "emergency" }}
        className="mb-6 flex items-center justify-center gap-3 rounded-2xl border-2 border-emergency bg-emergency/15 px-6 py-5 text-emergency hover:bg-emergency/25 pulse-emergency"
      >
        <Siren className="h-7 w-7" />
        <span className="mono text-lg font-bold uppercase tracking-wider">Emergency Broadcast</span>
      </Link>

      <div className="mb-4 flex items-center justify-between">
        <h2 className="mono text-xs font-bold uppercase tracking-widest text-muted-foreground">
          Optical Mesh (Communal Drops)
        </h2>
      </div>
      <div className="mb-6 grid grid-cols-2 gap-3">
        <Tile 
          to="/broadcast" 
          label="Create Drop" 
          icon={QrCode} 
          hint="Broadcast via QR" 
          className="border-signal/50 bg-signal/5 glow-signal"
        />
        <Tile 
          to="/scan" 
          label="Scan Drop" 
          icon={ScanLine} 
          hint="Ingest nearby data" 
          className="border-important/50 bg-important/5 drop-shadow-[0_0_8px_rgba(239,68,68,0.15)]"
        />
      </div>

      <div className="mb-4 flex items-center justify-between">
        <h2 className="mono text-xs font-bold uppercase tracking-widest text-muted-foreground">
          Real-Time Tunnels
        </h2>
      </div>
      <div className="mb-6 grid grid-cols-2 gap-3">
        <Tile to="/peer" label="WebRTC Link" icon={Network} hint="Direct connect" />
        <Tile to="/feed" label="Mesh Feed" icon={MessageSquare} hint="All messages" />
      </div>
        <Tile
          to="/simulator"
          label="Mesh Sim"
          icon={Radio}
          hint="Demo A→B→C"
          className="col-span-2"
        />
      </div>

      <p className="mt-8 text-center text-xs mono text-muted-foreground">
        No internet required. No servers. No tracking. Messages live only on devices.
      </p>
    </AppShell>
  );
}

function Stat({ label, value, accent }: { label: string; value: number; accent?: "emergency" }) {
  return (
    <div className="rounded-lg border border-border bg-muted/40 p-3">
      <div
        className={`mono text-2xl font-bold ${
          accent === "emergency" ? "text-emergency" : "text-foreground"
        }`}
      >
        {value}
      </div>
      <div className="mono text-[10px] tracking-wider text-muted-foreground">{label}</div>
    </div>
  );
}

function Tile({
  to,
  label,
  icon: Icon,
  hint,
  className = "",
}: {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  hint: string;
  className?: string;
}) {
  return (
    <Link
      to={to}
      className={`group flex flex-col items-start gap-2 rounded-2xl glass-panel p-5 transition-all hover-lift hover:border-signal/50 ${className}`}
    >
      <Icon className="h-7 w-7 text-signal transition-transform group-hover:scale-110" />
      <div>
        <div className="mono text-base font-bold text-foreground">{label}</div>
        <div className="text-xs text-muted-foreground">{hint}</div>
      </div>
    </Link>
  );
}
