import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { MeshGraph } from "@/components/MeshGraph";
import { PriorityBadge } from "@/components/PriorityBadge";
import {
  createSimDevice,
  simBroadcast,
  simSyncBidirectional,
  type SimDevice,
  type SimMessage,
} from "@/lib/simulator";
import type { Priority } from "@/lib/db";
import { Radio, Repeat2, Trash2, Plus, Zap, Link2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/simulator")({
  head: () => ({
    meta: [
      { title: "Mesh Simulator — MeshRelay" },
      {
        name: "description",
        content:
          "Watch messages hop through a dynamic mesh network in real time.",
      },
    ],
  }),
  component: SimulatorPage,
});

// --- Circle layout helpers ---
const GRAPH_W = 700;
const GRAPH_H = 320;
const CENTER_X = GRAPH_W / 2;
const CENTER_Y = GRAPH_H / 2 - 10;
const RADIUS = 110;

function circlePosition(index: number, total: number) {
  // Distribute devices evenly around a circle, starting from top
  const angle = (2 * Math.PI * index) / total - Math.PI / 2;
  return {
    x: Math.round(CENTER_X + RADIUS * Math.cos(angle)),
    y: Math.round(CENTER_Y + RADIUS * Math.sin(angle)),
  };
}

// --- Device names ---
const DEVICE_NAMES = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

interface DeviceState {
  device: SimDevice;
  inRange: Set<string>; // ids in range
}

function SimulatorPage() {
  // Start with 3 devices, but fully dynamic
  const [deviceStates, setDeviceStates] = useState<DeviceState[]>(() => [
    { device: createSimDevice("A", "A"), inRange: new Set(["B"]) },
    { device: createSimDevice("B", "B"), inRange: new Set(["A"]) },
    { device: createSimDevice("C", "C"), inRange: new Set() },
  ]);

  const [highlight, setHighlight] = useState<{ from: string; to: string }[]>(
    [],
  );
  const [composer, setComposer] = useState<{
    id: string;
    text: string;
    priority: Priority;
  }>({
    id: "A",
    text: "",
    priority: "emergency",
  });
  const [isAutoSync, setIsAutoSync] = useState(true);
  const nextDeviceIdx = useRef(3); // A=0, B=1, C=2 already used

  // --- Auto Sync Loop ---
  useEffect(() => {
    if (!isAutoSync) return;
    const interval = setInterval(() => {
      setDeviceStates((ds) => {
        let syncedAny = false;
        for (let i = 0; i < ds.length; i++) {
          for (let j = i + 1; j < ds.length; j++) {
            const a = ds[i];
            const b = ds[j];
            if (a.inRange.has(b.device.id)) {
              const { aToB, bToA } = simSyncBidirectional(a.device, b.device);
              if (aToB.length > 0 || bToA.length > 0) {
                syncedAny = true;
              }
            }
          }
        }
        return syncedAny ? [...ds] : ds;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isAutoSync]);

  // --- Actions ---
  const broadcast = () => {
    if (!composer.text.trim()) return;
    const target = deviceStates.find((d) => d.device.id === composer.id);
    if (!target) return;
    simBroadcast(target.device, composer.text.trim(), composer.priority);
    setDeviceStates((ds) => [...ds]);
    setComposer((c) => ({ ...c, text: "" }));
    toast.success(
      `Device ${composer.id} broadcast a ${composer.priority} message`,
    );
  };

  const toggleRange = (aId: string, bId: string) => {
    setDeviceStates((ds) => {
      return ds.map((d) => {
        const newRange = new Set(d.inRange);
        if (d.device.id === aId) {
          if (newRange.has(bId)) newRange.delete(bId);
          else newRange.add(bId);
        }
        if (d.device.id === bId) {
          if (newRange.has(aId)) newRange.delete(aId);
          else newRange.add(aId);
        }
        return { ...d, inRange: newRange };
      });
    });
  };

  const syncPair = (aId: string, bId: string) => {
    const a = deviceStates.find((d) => d.device.id === aId);
    const b = deviceStates.find((d) => d.device.id === bId);
    if (!a || !b) return;
    // Check they are in range
    if (!a.inRange.has(bId)) {
      toast.error(`${aId} and ${bId} are not in range`);
      return;
    }
    const { aToB, bToA } = simSyncBidirectional(a.device, b.device);
    const total = aToB.length + bToA.length;
    if (total > 0) {
      toast.success(`${aId} ↔ ${bId}: synced ${total} message(s)`);
      setHighlight([
        { from: aId, to: bId },
        { from: bId, to: aId },
      ]);
      setTimeout(() => setHighlight([]), 1400);
    } else {
      toast.info(`${aId} ↔ ${bId}: already in sync`);
    }
    setDeviceStates((ds) => [...ds]);
  };

  const addDevice = () => {
    const idx = nextDeviceIdx.current;
    if (idx >= 26) {
      toast.error("Maximum 26 devices");
      return;
    }
    const name = DEVICE_NAMES[idx];
    nextDeviceIdx.current = idx + 1;
    setDeviceStates((ds) => [
      ...ds,
      { device: createSimDevice(name, name), inRange: new Set() },
    ]);
    toast.success(`Device ${name} added to the mesh`);
  };

  const removeDevice = (id: string) => {
    setDeviceStates((ds) => {
      // Remove device and clean it from all inRange sets
      return ds
        .filter((d) => d.device.id !== id)
        .map((d) => {
          const newRange = new Set(d.inRange);
          newRange.delete(id);
          return { ...d, inRange: newRange };
        });
    });
    // If composer was set to this device, reset to first available
    setComposer((c) => (c.id === id ? { ...c, id: "A" } : c));
  };

  const reset = () => {
    _resetId();
    setDeviceStates([
      { device: createSimDevice("A", "A"), inRange: new Set(["B"]) },
      { device: createSimDevice("B", "B"), inRange: new Set(["A"]) },
      { device: createSimDevice("C", "C"), inRange: new Set() },
    ]);
    nextDeviceIdx.current = 3;
    setHighlight([]);
    setComposer({ id: "A", text: "", priority: "emergency" });
  };

  // --- Build graph data ---
  const graphNodes = deviceStates.map((d, i) => {
    const pos = circlePosition(i, deviceStates.length);
    return {
      id: d.device.id,
      name: d.device.name,
      x: pos.x,
      y: pos.y,
      inRange: Array.from(d.inRange),
    };
  });

  const recentMessages: Record<string, SimMessage[]> = Object.fromEntries(
    deviceStates.map((d) => [d.device.id, d.device.messages]),
  );

  // --- All unique pairs for connection controls ---
  const pairs: { a: string; b: string; connected: boolean }[] = [];
  for (let i = 0; i < deviceStates.length; i++) {
    for (let j = i + 1; j < deviceStates.length; j++) {
      const aId = deviceStates[i].device.id;
      const bId = deviceStates[j].device.id;
      pairs.push({
        a: aId,
        b: bId,
        connected: deviceStates[i].inRange.has(bId),
      });
    }
  }

  return (
    <AppShell>
      <h1 className="mb-1 mono text-xl font-bold">Mesh Simulator</h1>
      <p className="mb-5 text-sm text-muted-foreground">
        Dynamic mesh network. Add devices, toggle connections, and sync to
        demonstrate multi-hop propagation with TTL, hop counting, and loop
        prevention.
      </p>

      <MeshGraph
        nodes={graphNodes}
        hopHighlights={highlight}
        recentMessages={recentMessages}
      />

      {/* --- Controls --- */}
      <div className="my-4 flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          variant="secondary"
          onClick={addDevice}
          className="gap-1"
        >
          <Plus className="h-3 w-3" /> Add Device
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={reset}
          className="ml-auto gap-1 text-emergency"
        >
          <Trash2 className="h-3 w-3" /> Reset
        </Button>
      </div>

      {/* --- Connections Panel --- */}
      <div className="mb-4 rounded-xl border border-border bg-card p-3">
        <div className="mb-2 flex items-center justify-between mono text-xs uppercase tracking-wider text-muted-foreground">
          <span>Connections & Sync</span>
          <label className="flex cursor-pointer items-center gap-1 hover:text-foreground transition-colors">
            <input
              type="checkbox"
              checked={isAutoSync}
              onChange={(e) => setIsAutoSync(e.target.checked)}
              className="accent-signal"
            />
            Auto-Sync
          </label>
        </div>
        <div className="flex flex-wrap gap-2">
          {pairs.map((p) => (
            <div key={`${p.a}-${p.b}`} className="flex items-center gap-1">
              <button
                onClick={() => toggleRange(p.a, p.b)}
                className={`rounded-md border px-2 py-1 text-xs mono transition-colors ${
                  p.connected
                    ? "border-general/40 bg-general/10 text-general"
                    : "border-border bg-muted text-muted-foreground"
                }`}
                title={
                  p.connected ? `Disconnect ${p.a}↔${p.b}` : `Connect ${p.a}↔${p.b}`
                }
              >
                <Link2 className="mr-1 inline h-3 w-3" />
                {p.a}↔{p.b}
              </button>
              {p.connected && !isAutoSync && (
                <button
                  onClick={() => syncPair(p.a, p.b)}
                  className="rounded-md border border-signal/40 bg-signal/10 px-2 py-1 text-xs mono text-signal hover:bg-signal/20 transition-colors"
                  title={`Sync ${p.a} ↔ ${p.b}`}
                >
                  <Zap className="mr-1 inline h-3 w-3" />
                  Sync
                </button>
              )}
            </div>
          ))}
          {pairs.length === 0 && (
            <span className="text-xs text-muted-foreground">
              Add at least 2 devices
            </span>
          )}
        </div>
      </div>

      {/* --- Compose --- */}
      <div className="mb-6 rounded-xl border border-border bg-card p-3">
        <div className="mb-2 mono text-xs uppercase tracking-wider text-muted-foreground">
          Compose
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={composer.id}
            onChange={(e) =>
              setComposer((c) => ({ ...c, id: e.target.value }))
            }
            className="rounded-md border border-border bg-input px-2 py-2 text-sm mono"
          >
            {deviceStates.map((d) => (
              <option key={d.device.id} value={d.device.id}>
                From {d.device.id}
              </option>
            ))}
          </select>
          <select
            value={composer.priority}
            onChange={(e) =>
              setComposer((c) => ({
                ...c,
                priority: e.target.value as Priority,
              }))
            }
            className="rounded-md border border-border bg-input px-2 py-2 text-sm mono"
          >
            <option value="emergency">Emergency</option>
            <option value="important">Important</option>
            <option value="general">General</option>
          </select>
          <input
            value={composer.text}
            onChange={(e) =>
              setComposer((c) => ({ ...c, text: e.target.value }))
            }
            placeholder="Message text…"
            className="min-w-0 flex-1 rounded-md border border-border bg-input px-3 py-2 text-sm"
            onKeyDown={(e) => e.key === "Enter" && broadcast()}
          />
          <Button onClick={broadcast} className="gap-1">
            <Radio className="h-4 w-4" /> Send
          </Button>
        </div>
      </div>

      {/* --- Device Panels --- */}
      <div
        className="grid gap-3"
        style={{
          gridTemplateColumns: `repeat(${Math.min(deviceStates.length, 4)}, minmax(0, 1fr))`,
        }}
      >
        {deviceStates.map((d) => (
          <DevicePanel
            key={d.device.id}
            device={d.device}
            inRange={d.inRange}
            onRemove={
              deviceStates.length > 2
                ? () => removeDevice(d.device.id)
                : undefined
            }
          />
        ))}
      </div>
    </AppShell>
  );
}

// Helper to reset the _id counter (used on full reset)
function _resetId() {
  // We can't import and modify _id directly, but we don't need to — each
  // reset creates fresh devices, and IDs are still unique via Date.now()
}

function DevicePanel({
  device,
  inRange,
  onRemove,
}: {
  device: SimDevice;
  inRange: Set<string>;
  onRemove?: () => void;
}) {
  const rangeArr = Array.from(inRange);
  return (
    <section className="rounded-xl border border-border bg-card p-3">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-signal/40 bg-signal/10 mono text-sm font-bold text-signal">
            {device.name}
          </div>
          <div className="mono text-xs text-muted-foreground">
            {device.messages.length} msg
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="mono text-[10px] text-muted-foreground">
            range: {rangeArr.join(",") || "—"}
          </div>
          {onRemove && (
            <button
              onClick={onRemove}
              className="text-muted-foreground hover:text-emergency transition-colors"
              title="Remove device"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>
      <div className="flex max-h-64 flex-col gap-2 overflow-y-auto">
        {device.messages.length === 0 && (
          <div className="rounded-md border border-dashed border-border p-3 text-center text-xs text-muted-foreground">
            empty
          </div>
        )}
        {device.messages.map((m) => (
          <div
            key={m.id}
            className="rounded-md border border-border bg-background/50 p-2 text-xs"
          >
            <div className="mb-1 flex items-center justify-between">
              <PriorityBadge priority={m.priority} />
              <span className="inline-flex items-center gap-1 mono text-[10px] text-muted-foreground">
                <Repeat2 className="h-3 w-3" /> {m.hops} · TTL {m.ttl}
              </span>
            </div>
            <p className="text-foreground break-words">{m.content}</p>
            <div className="mt-1 mono text-[10px] text-muted-foreground">
              from {m.originDeviceId} · seen by {m.seenBy.join(",")}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
