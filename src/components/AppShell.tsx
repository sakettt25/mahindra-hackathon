import { Link, useLocation } from "@tanstack/react-router";
import { OfflineIndicator } from "./OfflineIndicator";
import { useIdentity } from "@/hooks/useIdentity";
import { Radio, QrCode, ScanLine, MessageSquare, Network, Settings, Home } from "lucide-react";

const navItems = [
  { to: "/", label: "Home", icon: Home },
  { to: "/broadcast", label: "Broadcast", icon: QrCode },
  { to: "/peer", label: "WebRTC", icon: Network },
  { to: "/feed", label: "Feed", icon: MessageSquare },
  { to: "/simulator", label: "Mesh", icon: Network },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  const { identity } = useIdentity();
  const loc = useLocation();

  return (
    <div className="min-h-screen scanlines pb-24">
      <header className="sticky top-0 z-20 glass-panel border-b-0 rounded-b-3xl">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <Link to="/" className="flex items-center gap-2 hover-lift">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-signal/20 text-signal glow-signal shadow-[inset_0_0_12px_rgba(245,213,122,0.4)]">
              <Radio className="h-5 w-5" />
            </div>
            <div className="leading-tight">
              <div className="mono text-sm font-bold tracking-wider text-signal">MESHRELAY</div>
              <div className="text-[10px] mono uppercase text-muted-foreground">
                shutdown comms · v1
              </div>
            </div>
          </Link>
          <div className="flex items-center gap-2">
            <OfflineIndicator />
            {identity && (
              <span className="hidden rounded-full border border-border bg-muted/50 px-2 py-1 text-xs mono text-muted-foreground sm:inline backdrop-blur-md">
                {identity.deviceId}
              </span>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-6">{children}</main>

      <nav className="fixed bottom-0 left-0 right-0 z-20 glass-panel border-t-0 rounded-t-3xl pb-safe">
        <div className="mx-auto grid max-w-3xl grid-cols-6 px-2 py-1">
          {navItems.map(({ to, label, icon: Icon }) => {
            const active = to === "/" ? loc.pathname === "/" : loc.pathname.startsWith(to);
            return (
              <Link
                key={to}
                to={to}
                className={`flex flex-col items-center gap-1 py-2 text-[10px] mono transition-all hover-lift ${
                  active
                    ? "text-signal scale-110 drop-shadow-[0_0_8px_rgba(245,213,122,0.6)]"
                    : "text-muted-foreground hover:text-foreground hover:scale-105"
                }`}
              >
                <Icon className="h-5 w-5" />
                {label.toUpperCase()}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
