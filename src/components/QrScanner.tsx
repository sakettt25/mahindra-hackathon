// Camera scanner using html5-qrcode. Buffers frames into a FrameAssembler
// until a complete batch arrives, then hands the payload up.
import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { FrameAssembler, parseFrame, type QrPayload } from "@/lib/qr-protocol";
import { Camera, CameraOff } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  onPayload?: (p: QrPayload) => void;
  onRawString?: (s: string) => void;
}

export function QrScanner({ onPayload, onRawString }: Props) {
  const elRef = useRef<HTMLDivElement | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const assemblerRef = useRef(new FrameAssembler());
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<{ received: number; total: number } | null>(null);
  const [manual, setManual] = useState("");

  const stop = async () => {
    try {
      if (scannerRef.current && running) {
        await scannerRef.current.stop();
        await scannerRef.current.clear();
      }
    } catch {
      /* ignore */
    }
    setRunning(false);
  };

  const start = async () => {
    setError(null);
    if (!elRef.current) return;
    if (!scannerRef.current) scannerRef.current = new Html5Qrcode(elRef.current.id);
    try {
      await scannerRef.current.start(
        { facingMode: "environment" },
        { fps: 10 },
        (text) => handleText(text),
        () => {},
      );
      setRunning(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Camera access denied");
    }
  };

  const handleText = (text: string) => {
    const frame = parseFrame(text);
    if (!frame) return;
    const r = assemblerRef.current.add(frame);
    setProgress({ received: r.received, total: r.total });
    if (r.complete) {
      if (r.payload && onPayload) {
        onPayload(r.payload);
      } else if (r.rawString && onRawString) {
        onRawString(r.rawString);
      }
      setProgress(null);
    }
  };

  useEffect(() => {
    return () => {
      stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex flex-col gap-4">
      <div
        id="mesh-scanner"
        ref={elRef}
        className="aspect-square w-full max-w-sm self-center overflow-hidden rounded-2xl border border-border bg-black"
      />
      <div className="flex items-center justify-center gap-2">
        {!running ? (
          <Button onClick={start} size="lg" className="gap-2">
            <Camera className="h-5 w-5" /> Start camera
          </Button>
        ) : (
          <Button onClick={stop} size="lg" variant="secondary" className="gap-2">
            <CameraOff className="h-5 w-5" /> Stop
          </Button>
        )}
      </div>
      {error && <p className="text-center text-sm text-emergency">{error}</p>}
      {progress && (
        <div className="mx-auto w-full max-w-sm">
          <div className="mb-1 flex justify-between text-xs mono text-muted-foreground">
            <span>RECEIVING</span>
            <span>
              {progress.received}/{progress.total}
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full bg-signal transition-all"
              style={{ width: `${(progress.received / progress.total) * 100}%` }}
            />
          </div>
        </div>
      )}

      <details className="rounded-lg border border-border bg-card p-3">
        <summary className="cursor-pointer text-sm mono text-muted-foreground">
          MANUAL PASTE FALLBACK
        </summary>
        <div className="mt-3 flex flex-col gap-2">
          <textarea
            value={manual}
            onChange={(e) => setManual(e.target.value)}
            placeholder="Paste frame text (one per line, e.g. MR1|...)"
            className="min-h-24 w-full rounded-md border border-border bg-input p-2 text-sm font-mono"
          />
          <Button
            variant="secondary"
            onClick={() => {
              manual
                .split(/\n+/)
                .map((s) => s.trim())
                .filter(Boolean)
                .forEach(handleText);
              setManual("");
            }}
          >
            Ingest pasted frames
          </Button>
        </div>
      </details>
    </div>
  );
}
