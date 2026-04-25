import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { useIdentity } from "@/hooks/useIdentity";
import { regenerateIdentity } from "@/lib/crypto";
import { db } from "@/lib/db";
import { toast } from "sonner";
import { ShieldCheck, Trash2, RefreshCw, Download } from "lucide-react";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — MeshRelay" },
      { name: "description", content: "Device identity, data export, and reset controls." },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const { identity, refresh } = useIdentity();
  const [name, setName] = useState(identity?.name ?? "");

  if (!identity) return <AppShell>Loading…</AppShell>;

  const saveName = async () => {
    await db.identity.update("self", { name: name.trim() || identity.name });
    await refresh();
    toast.success("Name updated");
  };

  const regen = async () => {
    if (
      !confirm(
        "Generate a new identity? Your existing messages stay but old signatures will not match this new key.",
      )
    )
      return;
    await regenerateIdentity(name.trim() || "Device");
    await refresh();
    toast.success("New identity generated");
  };

  const exportData = async () => {
    const messages = await db.messages.toArray();
    const blob = new Blob([JSON.stringify({ identity, messages }, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `meshrelay-${identity.deviceId}-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const wipeMessages = async () => {
    if (!confirm("Delete all messages? Identity is preserved.")) return;
    await db.messages.clear();
    await db.seen.clear();
    toast.success("Messages cleared");
  };

  return (
    <AppShell>
      <h1 className="mb-5 mono text-xl font-bold">Settings</h1>

      <section className="mb-5 rounded-xl border border-border bg-card p-4">
        <div className="mb-3 flex items-center gap-2 mono text-xs uppercase tracking-wider text-signal">
          <ShieldCheck className="h-4 w-4" /> Identity
        </div>
        <div className="mb-3 grid gap-2 text-sm">
          <Row label="Device ID" value={identity.deviceId} />
          <Row label="Created" value={new Date(identity.createdAt).toLocaleString()} />
          <Row label="Algorithm" value="ECDSA P-256 (Web Crypto)" />
          <Row label="Public key" value={identity.publicKeyB64.slice(0, 32) + "…"} mono />
        </div>
        <label className="mb-2 mono text-xs uppercase tracking-wider text-muted-foreground">
          Display name
        </label>
        <div className="flex gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="flex-1 rounded-md border border-border bg-input px-3 py-2 text-sm"
          />
          <Button onClick={saveName} variant="secondary">
            Save
          </Button>
        </div>
      </section>

      <section className="mb-5 rounded-xl border border-border bg-card p-4">
        <div className="mb-3 mono text-xs uppercase tracking-wider text-muted-foreground">Data</div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={exportData} variant="secondary" className="gap-2">
            <Download className="h-4 w-4" /> Export JSON
          </Button>
          <Button onClick={wipeMessages} variant="secondary" className="gap-2">
            <Trash2 className="h-4 w-4" /> Clear messages
          </Button>
          <Button onClick={regen} variant="secondary" className="gap-2">
            <RefreshCw className="h-4 w-4" /> Regenerate identity
          </Button>
        </div>
      </section>

      <section className="rounded-xl border border-signal/30 bg-signal/5 p-4 text-sm text-muted-foreground">
        <div className="mb-2 mono text-xs uppercase tracking-wider text-signal">Privacy model</div>
        <ul className="list-inside list-disc space-y-1">
          <li>All data lives in this browser (IndexedDB). No servers, no analytics.</li>
          <li>
            Messages are signed so receivers can verify the original author after any number of
            hops.
          </li>
          <li>Broadcasts are public to anyone in mesh range — treat as a public radio band.</li>
          <li>Clear browser data to wipe everything irrecoverably.</li>
        </ul>
      </section>
    </AppShell>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between border-b border-border/40 py-1.5 last:border-b-0">
      <span className="text-xs uppercase tracking-wider text-muted-foreground">{label}</span>
      <span className={`text-sm text-foreground ${mono ? "mono" : ""}`}>{value}</span>
    </div>
  );
}
