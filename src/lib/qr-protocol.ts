// QR transport protocol for MeshRelay.
//
// Wire format (per QR frame):
//   MR1|<batchId>|<chunkIdx>|<totalChunks>|<base64Data>
//
// Process:
//   1. JSON.stringify a payload (one or more messages)
//   2. compress with lz-string (UTF-16-safe → base64)
//   3. split into ~CHUNK_SIZE byte chunks
//   4. each chunk becomes one QR frame; sender cycles through them
//   5. receiver buffers per batchId until totalChunks are collected, then decompresses
import LZString from "lz-string";
import type { MeshMessage } from "./db";

const PROTO = "MR1";
const CHUNK_SIZE = 600; // chars; safely fits in QR M-level density

export interface QrPayload {
  // Bundle of messages being shared in this batch.
  messages: MeshMessage[];
  sender: { deviceId: string; name: string };
  sentAt: number;
}

export function encodePayloadToFrames(payload: QrPayload): string[] {
  const json = JSON.stringify(payload);
  const compressed = LZString.compressToBase64(json);
  const batchId = Math.random().toString(36).slice(2, 8);
  const chunks: string[] = [];
  for (let i = 0; i < compressed.length; i += CHUNK_SIZE) {
    chunks.push(compressed.slice(i, i + CHUNK_SIZE));
  }
  const total = chunks.length;
  return chunks.map((c, idx) => `${PROTO}|${batchId}|${idx}|${total}|${c}`);
}

export interface FrameInfo {
  batchId: string;
  index: number;
  total: number;
  data: string;
}

export function parseFrame(raw: string): FrameInfo | null {
  if (!raw.startsWith(PROTO + "|")) return null;
  const parts = raw.split("|");
  if (parts.length < 5) return null;
  const [, batchId, idxStr, totalStr, ...rest] = parts;
  const data = rest.join("|"); // tolerate '|' inside base64 (shouldn't happen, but safe)
  const index = Number(idxStr);
  const total = Number(totalStr);
  if (!Number.isFinite(index) || !Number.isFinite(total)) return null;
  return { batchId, index, total, data };
}

export class FrameAssembler {
  private batches = new Map<
    string,
    { total: number; chunks: Map<number, string>; startedAt: number }
  >();
  private timeoutMs: number;

  constructor(timeoutMs = 30_000) {
    this.timeoutMs = timeoutMs;
  }

  add(frame: FrameInfo): {
    complete: boolean;
    received: number;
    total: number;
    payload?: QrPayload;
    timedOut?: boolean;
  } {
    // Clean up stale batches
    const now = Date.now();
    for (const [id, batch] of this.batches) {
      if (now - batch.startedAt > this.timeoutMs) {
        this.batches.delete(id);
      }
    }

    let entry = this.batches.get(frame.batchId);
    if (!entry) {
      entry = { total: frame.total, chunks: new Map(), startedAt: Date.now() };
      this.batches.set(frame.batchId, entry);
    }
    entry.chunks.set(frame.index, frame.data);
    if (entry.chunks.size === entry.total) {
      let combined = "";
      for (let i = 0; i < entry.total; i++) {
        const part = entry.chunks.get(i);
        if (part === undefined) {
          return { complete: false, received: entry.chunks.size, total: entry.total };
        }
        combined += part;
      }
      this.batches.delete(frame.batchId);
      try {
        const json = LZString.decompressFromBase64(combined);
        if (!json) return { complete: false, received: entry.total, total: entry.total };
        const payload = JSON.parse(json) as QrPayload;
        return { complete: true, received: entry.total, total: entry.total, payload };
      } catch {
        return { complete: false, received: entry.total, total: entry.total };
      }
    }
    return { complete: false, received: entry.chunks.size, total: entry.total };
  }

  reset() {
    this.batches.clear();
  }
}
