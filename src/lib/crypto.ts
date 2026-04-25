// Cryptographic identity for MeshRelay.
// Uses Web Crypto ECDSA P-256 (broadly available; Ed25519 still has spotty browser support).
// Each device has one keypair; messages are signed so receivers can verify origin
// even when the message has hopped through untrusted relays.
import { db, type Identity } from "./db";

const ALGO = { name: "ECDSA", namedCurve: "P-256" } as const;
const SIGN_ALGO = { name: "ECDSA", hash: "SHA-256" } as const;

function bufToB64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let s = "";
  for (let i = 0; i < bytes.byteLength; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s);
}

function b64ToBuf(b64: string): ArrayBuffer {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes.buffer;
}

async function shortIdFromPubKey(pubB64: string): Promise<string> {
  const hash = await crypto.subtle.digest("SHA-256", b64ToBuf(pubB64));
  const hex = Array.from(new Uint8Array(hash))
    .slice(0, 4)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return hex; // 8 chars
}

export async function getOrCreateIdentity(defaultName = "Device"): Promise<Identity> {
  const existing = await db.identity.get("self");
  if (existing) return existing;

  const keyPair = (await crypto.subtle.generateKey(ALGO, true, [
    "sign",
    "verify",
  ])) as CryptoKeyPair;
  const pubJwk = await crypto.subtle.exportKey("jwk", keyPair.publicKey);
  const privJwk = await crypto.subtle.exportKey("jwk", keyPair.privateKey);
  const pubRaw = await crypto.subtle.exportKey("raw", keyPair.publicKey);
  const pubB64 = bufToB64(pubRaw);
  const deviceId = await shortIdFromPubKey(pubB64);

  const identity: Identity = {
    id: "self",
    deviceId,
    name: `${defaultName}-${deviceId.slice(0, 4)}`,
    publicKeyJwk: pubJwk,
    privateKeyJwk: privJwk,
    publicKeyB64: pubB64,
    createdAt: Date.now(),
  };
  await db.identity.put(identity);
  return identity;
}

export async function regenerateIdentity(name: string): Promise<Identity> {
  await db.identity.delete("self");
  const id = await getOrCreateIdentity(name);
  if (name) {
    id.name = name;
    await db.identity.put(id);
  }
  return id;
}

export async function signString(privateKeyJwk: JsonWebKey, data: string): Promise<string> {
  const key = await crypto.subtle.importKey("jwk", privateKeyJwk, ALGO, false, ["sign"]);
  const sig = await crypto.subtle.sign(SIGN_ALGO, key, new TextEncoder().encode(data));
  return bufToB64(sig);
}

export async function verifyString(
  publicKeyB64: string,
  data: string,
  signatureB64: string,
): Promise<boolean> {
  try {
    const key = await crypto.subtle.importKey("raw", b64ToBuf(publicKeyB64), ALGO, false, [
      "verify",
    ]);
    return await crypto.subtle.verify(
      SIGN_ALGO,
      key,
      b64ToBuf(signatureB64),
      new TextEncoder().encode(data),
    );
  } catch {
    return false;
  }
}

export function canonicalMessagePayload(m: {
  id: string;
  content: string;
  priority: string;
  timestamp: number;
  originDeviceId: string;
  originPubKey: string;
}): string {
  // Stable serialization for signing — only fields that must not change as the
  // message hops through the mesh (hops/ttl/seenBy are mutated by relays).
  return JSON.stringify({
    id: m.id,
    content: m.content,
    priority: m.priority,
    timestamp: m.timestamp,
    originDeviceId: m.originDeviceId,
    originPubKey: m.originPubKey,
  });
}
