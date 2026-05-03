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
      <section className="mb-8 relative overflow-hidden rounded-3xl border border-signal/40 bg-card p-6 glow-signal glass-panel">
        <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
          <Radio className="h-32 w-32 text-signal" />
        </div>
        <div className="relative z-10 flex items-start justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 mb-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-signal opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-signal"></span>
              </span>
              <span className="mono text-xs uppercase tracking-widest text-signal font-bold">
                MESH NODE ACTIVE
              </span>
            </div>
            <h1 className="mt-1 text-3xl font-extrabold text-foreground tracking-tight drop-shadow-sm">
              {identity?.name ?? "Initializing…"}
            </h1>
            <div className="mt-2 inline-flex items-center gap-2 rounded-lg bg-black/40 px-3 py-1.5 border border-border">
              <span className="mono text-xs text-muted-foreground">ID</span>
              <span className="mono text-xs font-bold text-foreground">{identity?.deviceId ?? "—"}</span>
              <span className="text-muted-foreground text-xs">•</span>
              <span className="mono text-xs text-muted-foreground">Ed-25519</span>
            </div>
          </div>
        </div>
        <div className="mt-6 grid grid-cols-3 gap-3 text-center">
          <Stat label="MESSAGES" value={messages.length} />
          <Stat label="EMERGENCY" value={emergencyCount} accent="emergency" />
          <Stat label="RELAYED" value={messages.filter((m) => m.hops > 0).length} />
        </div>
      </section>

      <Link
        to="/broadcast"
        search={{ priority: "emergency" }}
        className="mb-8 flex items-center justify-center gap-4 rounded-3xl border border-emergency/50 bg-gradient-to-r from-emergency/20 to-emergency/5 px-6 py-6 text-emergency hover:bg-emergency/30 pulse-emergency glass-panel animate-float hover:border-emergency shadow-lg shadow-emergency/20"
      >
        <Siren className="h-8 w-8 drop-shadow-[0_0_8px_rgba(220,38,38,0.8)]" />
        <span className="text-xl font-extrabold uppercase tracking-widest drop-shadow-sm">Emergency Broadcast</span>
      </Link>

      <div className="mb-4 flex items-center gap-3">
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border to-transparent"></div>
        <h2 className="mono text-[10px] font-bold uppercase tracking-widest text-muted-foreground whitespace-nowrap">
          Optical Mesh (Communal)
        </h2>
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border to-transparent"></div>
      </div>
      
      <div className="mb-8 grid grid-cols-2 gap-4">
        <Tile 
          to="/broadcast" 
          label="Create Drop" 
          icon={QrCode} 
          hint="Broadcast via QR" 
          className="border-signal/50 bg-gradient-to-br from-signal/10 to-transparent glow-signal"
        />
        <Tile 
          to="/scan" 
          label="Scan Drop" 
          icon={ScanLine} 
          hint="Ingest nearby data" 
          className="border-important/50 bg-gradient-to-br from-important/10 to-transparent glow-signal"
        />
      </div>

      <div className="mb-4 flex items-center gap-3">
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border to-transparent"></div>
        <h2 className="mono text-[10px] font-bold uppercase tracking-widest text-muted-foreground whitespace-nowrap">
          Real-Time Tunnels
        </h2>
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border to-transparent"></div>
      </div>
      
      <div className="mb-8 grid grid-cols-2 gap-4">
        <Tile to="/peer" label="WebRTC Link" icon={Network} hint="Direct connect" />
        <Tile to="/feed" label="Mesh Feed" icon={MessageSquare} hint="All messages" />
      </div>
      <div className="mb-6 grid grid-cols-1">
        <Tile
          to="/simulator"
          label="Mesh Sim"
          icon={Radio}
          hint="Demo A→B→C"
          className="bg-black/20"
        />
      </div>

      <p className="mt-10 mb-8 text-center text-xs mono text-muted-foreground/60 leading-relaxed max-w-sm mx-auto">
        No internet required. No servers.<br/>Messages live only on devices.
      </p>
    </AppShell>
  );
}

function Stat({ label, value, accent }: { label: string; value: number; accent?: "emergency" }) {
  return (
    <div className={`rounded-xl border border-white/5 bg-black/40 p-4 backdrop-blur-md transition-colors ${accent === 'emergency' ? 'hover:border-emergency/30' : 'hover:border-signal/30'}`}>
      <div
        className={`font-display text-3xl font-extrabold tracking-tight ${
          accent === "emergency" ? "text-emergency drop-shadow-[0_0_8px_rgba(220,38,38,0.5)]" : "text-foreground drop-shadow-[0_0_8px_rgba(255,255,255,0.2)]"
        }`}
      >
        {value}
      </div>
      <div className="mt-1 mono text-[9px] font-bold uppercase tracking-widest text-muted-foreground">{label}</div>
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
      className={`group relative overflow-hidden flex flex-col items-start gap-3 rounded-3xl glass-panel p-6 transition-all hover-lift hover:border-signal/60 ${className}`}
    >
      <div className="absolute -right-6 -top-6 opacity-5 transition-transform group-hover:scale-150 group-hover:rotate-12">
        <Icon className="h-32 w-32" />
      </div>
      <div className="relative z-10 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/5 border border-white/10 shadow-inner group-hover:bg-signal/20 group-hover:border-signal/30 transition-colors">
        <Icon className="h-6 w-6 text-foreground group-hover:text-signal transition-colors" />
      </div>
      <div className="relative z-10 mt-2">
        <div className="text-lg font-bold text-foreground tracking-tight">{label}</div>
        <div className="mt-1 text-xs text-muted-foreground">{hint}</div>
      </div>
    </Link>
  );
}
