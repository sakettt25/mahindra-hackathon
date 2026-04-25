// Animated multi-frame QR broadcaster.
// Cycles through encoded chunks at a fixed cadence; receivers point a camera
// and the html5-qrcode scanner buffers frames until the batch completes.
import { useEffect, useMemo, useRef, useState } from "react";
import QRCode from "qrcode";

interface Props {
  frames: string[];
  intervalMs?: number;
  size?: number;
}

export function QrBroadcaster({ frames, intervalMs = 3000, size = 280 }: Props) {
  const [idx, setIdx] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const safeFrames = useMemo(() => (frames.length > 0 ? frames : ["MR1|empty|0|1|"]), [frames]);

  useEffect(() => {
    if (safeFrames.length <= 1) return;
    const t = setInterval(() => setIdx((i) => (i + 1) % safeFrames.length), intervalMs);
    return () => clearInterval(t);
  }, [safeFrames.length, intervalMs]);

  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    QRCode.toCanvas(c, safeFrames[idx], {
      width: size,
      margin: 1,
      errorCorrectionLevel: "M",
      color: { dark: "#0d1116", light: "#f5d57a" },
    }).catch(() => {
      /* ignore render errors for oversized payloads */
    });
  }, [idx, safeFrames, size]);

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="rounded-2xl border border-signal/40 bg-signal/5 p-3 glow-signal">
        <canvas ref={canvasRef} width={size} height={size} className="rounded-lg" />
      </div>
      <div className="mono text-xs text-muted-foreground">
        FRAME {idx + 1} / {safeFrames.length}
      </div>
    </div>
  );
}
