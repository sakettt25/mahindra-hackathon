import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { QrScanner } from "@/components/QrScanner";
import { useIdentity } from "@/hooks/useIdentity";
import { ingestPayload } from "@/lib/mesh";
import { toast } from "sonner";

export const Route = createFileRoute("/scan")({
  head: () => ({
    meta: [
      { title: "Scan — MeshRelay" },
      {
        name: "description",
        content: "Scan QR codes from nearby devices to receive mesh messages.",
      },
    ],
  }),
  component: ScanPage,
});

function ScanPage() {
  const { identity } = useIdentity();
  const navigate = useNavigate();

  return (
    <AppShell>
      <h1 className="mb-1 mono text-xl font-bold">Scan</h1>
      <p className="mb-5 text-sm text-muted-foreground">
        Receive a multi-frame QR broadcast from a nearby device. Signatures are verified before
        storage; duplicates are silently skipped.
      </p>
      <QrScanner
        onPayload={async (payload) => {
          if (!identity) return;
          const r = await ingestPayload(identity, payload);
          if (r.accepted > 0) {
            toast.success(`Received ${r.accepted} new message(s) from ${payload.sender.name}`, {
              description:
                r.duplicates || r.rejected
                  ? `${r.duplicates} duplicate · ${r.rejected} invalid`
                  : undefined,
            });
            navigate({ to: "/feed" });
          } else {
            toast.info(`No new messages — ${r.duplicates} already known, ${r.rejected} invalid`);
          }
        }}
      />
    </AppShell>
  );
}
