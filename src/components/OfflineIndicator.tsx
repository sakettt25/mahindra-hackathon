import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { Wifi, WifiOff } from "lucide-react";

export function OfflineIndicator() {
  const online = useOnlineStatus();
  return (
    <div
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs mono ${
        online
          ? "border-border bg-muted text-muted-foreground"
          : "border-signal/40 bg-signal/10 text-signal"
      }`}
      title={online ? "Internet detected — mesh still works offline" : "Offline mesh mode active"}
    >
      {online ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
      {online ? "ONLINE" : "OFFLINE • MESH"}
    </div>
  );
}
