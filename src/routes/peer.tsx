import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useIdentity } from "@/hooks/useIdentity";
import { useState, useEffect, useRef } from "react";
import { PeerConnection, type PeerStatus } from "@/lib/webrtc";
import { QrCode, ScanLine, Copy, Check, Network, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { compressToUTF16, decompressFromUTF16 } from "lz-string";

export const Route = createFileRoute("/peer")({
  component: PeerPage,
});

function PeerPage() {
  const { identity } = useIdentity();
  const [status, setStatus] = useState<PeerStatus>("disconnected");
  const [mode, setMode] = useState<"idle" | "host" | "join">("idle");
  const [offer, setOffer] = useState<string>("");
  const [answer, setAnswer] = useState<string>("");
  const [remoteInput, setRemoteInput] = useState<string>("");
  const pcRef = useRef<PeerConnection | null>(null);

  useEffect(() => {
    if (!identity) return;
    const pc = new PeerConnection(identity, setStatus, (count) => {
      toast.success(`Received ${count} new messages via WebRTC!`);
    });
    pcRef.current = pc;
    return () => {
      pc.close();
    };
  }, [identity]);

  const handleCreateOffer = async () => {
    if (!pcRef.current) return;
    setMode("host");
    const sdpOffer = await pcRef.current.createOffer();
    // Compress SDP for QR Code
    setOffer(compressToUTF16(sdpOffer));
  };

  const handleCreateAnswer = async (remoteOfferCompressed: string) => {
    if (!pcRef.current) return;
    try {
      const remoteOffer = decompressFromUTF16(remoteOfferCompressed);
      if (!remoteOffer) throw new Error("Invalid SDP");
      const sdpAnswer = await pcRef.current.handleOffer(remoteOffer);
      setAnswer(compressToUTF16(sdpAnswer));
    } catch (e) {
      toast.error("Failed to parse remote offer.");
    }
  };

  const handleProcessAnswer = async (remoteAnswerCompressed: string) => {
    if (!pcRef.current) return;
    try {
      const remoteAnswer = decompressFromUTF16(remoteAnswerCompressed);
      if (!remoteAnswer) throw new Error("Invalid SDP");
      await pcRef.current.handleAnswer(remoteAnswer);
    } catch (e) {
      toast.error("Failed to parse remote answer.");
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard!");
  };

  return (
    <AppShell>
      <div className="flex items-center gap-3 mb-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-signal/10 text-signal border border-signal/30">
          <Network className="h-5 w-5" />
        </div>
        <div>
          <h1 className="mono text-xl font-bold text-foreground">WebRTC Peer Link</h1>
          <p className="text-xs text-muted-foreground mono">High-bandwidth direct connection</p>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5 mb-6">
        <div className="flex items-center justify-between">
          <div className="mono text-sm font-bold text-foreground">Status</div>
          <div className="flex items-center gap-2">
            <span className="relative flex h-3 w-3">
              {status === "connected" && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-general opacity-75"></span>
              )}
              <span
                className={`relative inline-flex rounded-full h-3 w-3 ${
                  status === "connected"
                    ? "bg-general"
                    : status === "error"
                      ? "bg-destructive"
                      : status === "connecting"
                        ? "bg-important"
                        : "bg-muted"
                }`}
              ></span>
            </span>
            <span className="mono text-xs uppercase tracking-wider text-muted-foreground">
              {status}
            </span>
          </div>
        </div>
      </div>

      {status === "connected" ? (
        <div className="rounded-2xl border border-general/30 bg-general/10 p-6 text-center glow-signal">
          <Check className="h-12 w-12 text-general mx-auto mb-4" />
          <h2 className="mono text-lg font-bold text-foreground mb-2">Peers Connected</h2>
          <p className="text-sm text-muted-foreground mono mb-6">
            Messages will sync automatically between devices.
          </p>
          <button
            onClick={() => pcRef.current?.syncMessages()}
            className="rounded-lg bg-general px-6 py-2 mono text-general-foreground hover:bg-general/90 transition-colors"
          >
            Force Sync
          </button>
        </div>
      ) : (
        <>
          {mode === "idle" && (
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={handleCreateOffer}
                className="group flex flex-col items-center gap-3 rounded-2xl border border-border bg-card p-6 transition-all hover:border-signal/50 hover:bg-signal/5"
              >
                <div className="rounded-full bg-signal/10 p-4 transition-transform group-hover:scale-110">
                  <QrCode className="h-8 w-8 text-signal" />
                </div>
                <div className="mono text-sm font-bold">Host Connection</div>
                <div className="text-center text-xs text-muted-foreground">
                  Generate offer for another device to scan
                </div>
              </button>

              <button
                onClick={() => setMode("join")}
                className="group flex flex-col items-center gap-3 rounded-2xl border border-border bg-card p-6 transition-all hover:border-important/50 hover:bg-important/5"
              >
                <div className="rounded-full bg-important/10 p-4 transition-transform group-hover:scale-110">
                  <ScanLine className="h-8 w-8 text-important" />
                </div>
                <div className="mono text-sm font-bold">Join Connection</div>
                <div className="text-center text-xs text-muted-foreground">
                  Scan offer from a hosting device
                </div>
              </button>
            </div>
          )}

          {mode === "host" && (
            <div className="space-y-6">
              <button
                onClick={() => {
                  setMode("idle");
                  setOffer("");
                  setRemoteInput("");
                }}
                className="flex items-center gap-2 text-sm mono text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="h-4 w-4" /> Back
              </button>
              <div className="rounded-2xl border border-border bg-card p-5 text-center">
                <h3 className="mono text-sm font-bold mb-4">1. Share Offer</h3>
                {offer ? (
                  <div className="flex flex-col items-center gap-3">
                    <button
                      onClick={() => copyToClipboard(offer)}
                      className="flex items-center gap-2 rounded-lg bg-signal px-5 py-3 mono text-sm text-primary-foreground hover:bg-signal/90 transition-colors"
                    >
                      <Copy className="h-4 w-4" /> Copy Offer to Clipboard
                    </button>
                    <p className="text-xs text-muted-foreground">
                      Send this to the joining device via any local method (AirDrop, paste, etc.)
                    </p>
                  </div>
                ) : (
                  <div className="mono text-xs text-muted-foreground animate-pulse">
                    Generating SDP offer...
                  </div>
                )}
              </div>

              <div className="rounded-2xl border border-border bg-card p-5">
                <h3 className="mono text-sm font-bold mb-4">2. Process Answer</h3>
                <p className="text-xs text-muted-foreground mb-4">
                  Once the other device scans your offer, they will generate an answer. Scan it or
                  paste it here.
                </p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={remoteInput}
                    onChange={(e) => setRemoteInput(e.target.value)}
                    placeholder="Paste Answer SDP here..."
                    className="flex-1 rounded-lg border border-border bg-background px-3 py-2 mono text-xs text-foreground placeholder:text-muted-foreground"
                  />
                  <button
                    onClick={() => handleProcessAnswer(remoteInput)}
                    className="rounded-lg bg-signal px-4 py-2 mono text-xs text-primary-foreground hover:bg-signal/90"
                  >
                    Connect
                  </button>
                </div>
              </div>
            </div>
          )}

          {mode === "join" && (
            <div className="space-y-6">
              <button
                onClick={() => {
                  setMode("idle");
                  setAnswer("");
                  setRemoteInput("");
                }}
                className="flex items-center gap-2 text-sm mono text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="h-4 w-4" /> Back
              </button>
              <div className="rounded-2xl border border-border bg-card p-5">
                <h3 className="mono text-sm font-bold mb-4">1. Provide Host's Offer</h3>
                {!answer ? (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={remoteInput}
                      onChange={(e) => setRemoteInput(e.target.value)}
                      placeholder="Paste Offer SDP here..."
                      className="flex-1 rounded-lg border border-border bg-background px-3 py-2 mono text-xs text-foreground placeholder:text-muted-foreground"
                    />
                    <button
                      onClick={() => handleCreateAnswer(remoteInput)}
                      className="rounded-lg bg-important px-4 py-2 mono text-xs text-primary-foreground hover:bg-important/90"
                    >
                      Process
                    </button>
                  </div>
                ) : (
                  <div className="text-center">
                    <Check className="h-8 w-8 text-general mx-auto mb-2" />
                    <div className="mono text-xs text-general">Offer Processed</div>
                  </div>
                )}
              </div>

              {answer && (
                <div className="rounded-2xl border border-border bg-card p-5 text-center transition-all">
                  <h3 className="mono text-sm font-bold mb-4">2. Share Answer to Host</h3>
                  <div className="flex flex-col items-center gap-3">
                    <button
                      onClick={() => copyToClipboard(answer)}
                      className="flex items-center gap-2 rounded-lg bg-important px-5 py-3 mono text-sm text-primary-foreground hover:bg-important/90 transition-colors"
                    >
                      <Copy className="h-4 w-4" /> Copy Answer to Clipboard
                    </button>
                    <p className="text-xs text-muted-foreground">
                      Send this back to the hosting device
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </AppShell>
  );
}
