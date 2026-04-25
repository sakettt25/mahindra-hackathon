// Mesh propagation engine: ingest, dedupe, forward, TTL accounting.
//
// A device acts as receiver + storage + relay. Every received message is
// signature-verified, deduped against the `seen` table, and stored locally
// with hops+1, ttl-1, and our deviceId appended to seenBy.
import { db, type MeshMessage, type Identity, type Priority } from "./db";
import { canonicalMessagePayload, signString, verifyString } from "./crypto";
import type { QrPayload } from "./qr-protocol";

export const DEFAULT_TTL: Record<Priority, number> = {
  emergency: 12,
  important: 8,
  general: 5,
};

function uuid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export async function createBroadcast(
  identity: Identity,
  content: string,
  priority: Priority,
): Promise<MeshMessage> {
  const base = {
    id: uuid(),
    content: content.trim(),
    priority,
    timestamp: Date.now(),
    originDeviceId: identity.deviceId,
    originPubKey: identity.publicKeyB64,
  };
  const sig = await signString(identity.privateKeyJwk, canonicalMessagePayload(base));
  const msg: MeshMessage = {
    ...base,
    originName: identity.name,
    ttl: DEFAULT_TTL[priority],
    hops: 0,
    signature: sig,
    seenBy: [identity.deviceId],
    receivedAt: Date.now(),
    isMine: true,
  };
  await db.messages.put(msg);
  await db.seen.put({ id: msg.id, seenAt: Date.now() });
  return msg;
}

export interface IngestResult {
  accepted: number;
  rejected: number;
  duplicates: number;
  newMessages: MeshMessage[];
}

export async function ingestPayload(identity: Identity, payload: QrPayload): Promise<IngestResult> {
  const result: IngestResult = { accepted: 0, rejected: 0, duplicates: 0, newMessages: [] };
  for (const incoming of payload.messages) {
    // Dedupe
    const seen = await db.seen.get(incoming.id);
    if (seen) {
      result.duplicates++;
      // Even if seen, merge seenBy so we don't re-send to this peer later
      const existing = await db.messages.get(incoming.id);
      if (existing) {
        const merged = Array.from(
          new Set([...existing.seenBy, ...incoming.seenBy, payload.sender.deviceId]),
        );
        await db.messages.update(incoming.id, { seenBy: merged });
      }
      continue;
    }
    // Verify signature against original payload fields
    const ok = await verifyString(
      incoming.originPubKey,
      canonicalMessagePayload(incoming),
      incoming.signature,
    );
    if (!ok) {
      result.rejected++;
      continue;
    }
    // TTL gate
    if (incoming.ttl <= 0) {
      result.rejected++;
      continue;
    }
    const stored: MeshMessage = {
      ...incoming,
      hops: incoming.hops + 1,
      ttl: incoming.ttl - 1,
      seenBy: Array.from(new Set([...incoming.seenBy, identity.deviceId])),
      receivedAt: Date.now(),
      isMine: false,
    };
    await db.messages.put(stored);
    await db.seen.put({ id: stored.id, seenAt: Date.now() });
    result.accepted++;
    result.newMessages.push(stored);
  }
  return result;
}

/**
 * Build a payload of messages to send to a target peer. Skips messages the peer
 * has already seen (per their seenBy list, if known) and messages with ttl<=0.
 * Emergency messages are listed first (priority routing).
 */
export async function buildOutgoingPayload(
  identity: Identity,
  targetDeviceId?: string,
  includeIds?: string[],
): Promise<QrPayload> {
  let all: MeshMessage[];
  if (includeIds && includeIds.length > 0) {
    all = (await db.messages.bulkGet(includeIds)).filter((m): m is MeshMessage => !!m);
  } else {
    all = await db.messages.toArray();
  }
  const filtered = all
    .filter((m) => m.ttl > 0)
    .filter((m) => (targetDeviceId ? !m.seenBy.includes(targetDeviceId) : true))
    .sort((a, b) => {
      const order = { emergency: 0, important: 1, general: 2 } as const;
      if (order[a.priority] !== order[b.priority]) return order[a.priority] - order[b.priority];
      return b.timestamp - a.timestamp;
    })
    .slice(0, 25); // cap batch size to keep QR count reasonable

  return {
    messages: filtered,
    sender: { deviceId: identity.deviceId, name: identity.name },
    sentAt: Date.now(),
  };
}

export function priorityColor(p: Priority): string {
  switch (p) {
    case "emergency":
      return "emergency";
    case "important":
      return "important";
    default:
      return "general";
  }
}
