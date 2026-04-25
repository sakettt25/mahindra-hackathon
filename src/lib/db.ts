// IndexedDB schema for MeshRelay using Dexie.
// Stores messages, the local device identity (keypair + name), and seen-message IDs
// for loop prevention during gossip propagation.
import Dexie, { type Table } from "dexie";

export type Priority = "emergency" | "important" | "general";

export interface MeshMessage {
  id: string; // UUID
  content: string;
  priority: Priority;
  timestamp: number;
  ttl: number;
  originDeviceId: string; // short id (8 chars)
  originPubKey: string; // base64 raw public key
  originName?: string;
  hops: number;
  signature: string; // base64
  seenBy: string[]; // device ids that have already received it
  receivedAt: number;
  isMine: boolean; // true if I authored it
}

export interface Identity {
  id: "self"; // singleton
  deviceId: string; // short 8-char id
  name: string;
  publicKeyJwk: JsonWebKey;
  privateKeyJwk: JsonWebKey;
  publicKeyB64: string;
  createdAt: number;
}

export interface SeenRecord {
  id: string; // message id
  seenAt: number;
}

class MeshDB extends Dexie {
  messages!: Table<MeshMessage, string>;
  identity!: Table<Identity, string>;
  seen!: Table<SeenRecord, string>;

  constructor() {
    super("meshrelay-db");
    this.version(1).stores({
      messages: "id, timestamp, priority, originDeviceId",
      identity: "id",
      seen: "id, seenAt",
    });
  }
}

export const db = new MeshDB();
