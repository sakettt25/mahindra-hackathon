// In-memory mesh simulator. N virtual devices each with their own
// message store. Devices can be moved into range of each other and
// sync to demonstrate multi-hop gossip propagation.
import { canonicalMessagePayload } from "./crypto";
import type { Priority } from "./db";
import { DEFAULT_TTL } from "./mesh";

export interface SimMessage {
  id: string;
  content: string;
  priority: Priority;
  timestamp: number;
  ttl: number;
  originDeviceId: string;
  hops: number;
  seenBy: string[];
  signature: string; // simulator uses pseudo-sig (origin id + payload hash)
}

export interface SimDevice {
  id: string;
  name: string;
  messages: SimMessage[];
}

let _id = 0;
const nextId = () => `sim-${Date.now().toString(36)}-${(_id++).toString(36)}`;

export function createSimDevice(id: string, name: string): SimDevice {
  return { id, name, messages: [] };
}

export function simBroadcast(
  device: SimDevice,
  content: string,
  priority: Priority,
): SimMessage {
  const base = {
    id: nextId(),
    content,
    priority,
    timestamp: Date.now(),
    originDeviceId: device.id,
    originPubKey: device.id,
  };
  const sig = `sim:${btoa(canonicalMessagePayload(base)).slice(0, 12)}`;
  const msg: SimMessage = {
    id: base.id,
    content,
    priority,
    timestamp: base.timestamp,
    originDeviceId: device.id,
    hops: 0,
    ttl: DEFAULT_TTL[priority],
    seenBy: [device.id],
    signature: sig,
  };
  device.messages = [msg, ...device.messages];
  return msg;
}

/**
 * Sync from `from` → `to`. Mimics the gossip protocol: only forwards messages
 * the target hasn't seen, decrements TTL and bumps hops.
 * Returns the message ids actually accepted by the target.
 */
export function simSync(from: SimDevice, to: SimDevice): string[] {
  const accepted: string[] = [];
  for (const m of from.messages) {
    if (m.ttl <= 0) continue;
    if (m.seenBy.includes(to.id)) continue;
    if (to.messages.some((existing) => existing.id === m.id)) continue;
    const hopped: SimMessage = {
      ...m,
      hops: m.hops + 1,
      ttl: m.ttl - 1,
      seenBy: Array.from(new Set([...m.seenBy, to.id])),
    };
    to.messages = [hopped, ...to.messages];
    // Update sender's record of who has now seen this message
    from.messages = from.messages.map((x) =>
      x.id === m.id
        ? { ...x, seenBy: Array.from(new Set([...x.seenBy, to.id])) }
        : x,
    );
    accepted.push(m.id);
  }
  return accepted;
}

/**
 * Bidirectional sync — both devices share all messages with each other.
 * Returns total accepted count.
 */
export function simSyncBidirectional(
  a: SimDevice,
  b: SimDevice,
): { aToB: string[]; bToA: string[] } {
  const aToB = simSync(a, b);
  const bToA = simSync(b, a);
  return { aToB, bToA };
}
