# MeshRelay — Internet Shutdown Communication Layer

> Offline-first peer-to-peer mesh messaging for civilians during internet blackouts.
> No servers. No accounts. No tracking. Just QR codes and your phone's browser.

MeshRelay is a Progressive Web App that lets people communicate when the
internet, cell networks, and Wi-Fi are all unavailable. Messages hop physically
from device to device via QR codes — every device is a relay.

## How it works

```
     ┌──────────┐    QR     ┌──────────┐    QR     ┌──────────┐
     │ Device A │ ────────▶ │ Device B │ ────────▶ │ Device C │
     │ (origin) │           │ (relay)  │           │ (relay)  │
     └──────────┘           └──────────┘           └──────────┘
        hop 0                  hop 1                  hop 2
        ttl 12                 ttl 11                 ttl 10
```

1. Author signs a message with their device key (Web Crypto, ECDSA P-256).
2. Message is JSON-encoded → LZ-compressed → split into ~600-byte chunks.
3. Each chunk becomes one QR frame; the sender cycles through them.
4. The receiver's camera reads frames, reassembles the batch, **verifies the
   signature**, dedupes against `seen` IDs, decrements TTL, increments hops,
   stores it.
5. The next time the receiver broadcasts, it gossips this message onward
   (priority-sorted: emergency first).

## Features

- **Crisis UI** — high-contrast disaster theme, oversized tap targets, color-coded priority
- **QR transport** — chunked + animated, manual paste fallback, base-64 LZ compression
- **Multi-hop gossip** — TTL, hop count, seenBy tracking, loop prevention
- **Signed broadcasts** — every message carries an ECDSA signature; relays cannot tamper
- **Local-first** — Dexie/IndexedDB; zero network calls at runtime
- **Demo simulator** — three virtual devices showing A→B→C propagation live
- **Installable** — web app manifest for Add to Home Screen

## Setup

```bash
bun install
bun dev
```

Open the dev URL on multiple devices (or browser tabs/profiles) on the same
network for testing the full QR flow with real cameras.

## Demo (real devices)

1. Open MeshRelay on **Phone A**, tap **Emergency Broadcast**, write a message,
   generate the QR.
2. Open MeshRelay on **Phone B**, go to **Scan**, point at A's QR. Wait for
   "RECEIVING X/X" to complete. Message appears in B's feed at `hops: 1`.
3. Walk Phone B to **Phone C**. Open Feed on B, tap **Relay** on the message,
   generate the QR. Have C scan it. Message appears on C at `hops: 2`.
4. Open **Mesh Sim** on any device for an animated 3-node demo with the same
   protocol running in-memory (great for judges who can't gather 3 phones).

## Architecture

```
src/
├── lib/
│   ├── db.ts            Dexie schema (messages, identity, seen)
│   ├── crypto.ts        Web Crypto identity, sign / verify
│   ├── qr-protocol.ts   chunking, framing, reassembly (FrameAssembler)
│   ├── mesh.ts          ingest, dedupe, TTL/hops, gossip payload builder
│   └── simulator.ts     in-memory virtual devices for the demo page
├── components/
│   ├── AppShell.tsx     header + bottom nav, online indicator
│   ├── QrBroadcaster    animated multi-frame QR
│   ├── QrScanner        html5-qrcode camera + paste fallback
│   ├── MessageCard      priority-bordered message item
│   ├── MeshGraph        SVG visualization for simulator
│   └── PriorityBadge / OfflineIndicator
├── routes/
│   ├── index.tsx        Home dashboard
│   ├── broadcast.tsx    Compose + generate QR
│   ├── scan.tsx         Receive via camera
│   ├── feed.tsx         Local message store
│   ├── simulator.tsx    Built-in 3-device mesh demo
│   └── settings.tsx     Identity, export, wipe
└── hooks/
    ├── useIdentity.ts
    ├── useMessages.ts
    └── useOnlineStatus.ts
```

### Multi-hop propagation logic

Each message carries:

```ts
{
  id, content, priority, timestamp,
  ttl,                // decremented at every hop
  originDeviceId,     // never changes
  originPubKey,       // for signature verification
  hops,               // incremented at every hop
  signature,          // signed over the immutable fields above
  seenBy: string[]    // ids of every device that has stored this message
}
```

On receive: verify signature → check `seen` table → if new and `ttl > 0`,
store with `hops + 1`, `ttl - 1`, append our id to `seenBy`. When building an
outgoing batch, we skip messages where `seenBy` already includes the target,
preventing redundant retransmission and loops.

### Offline-first design

- App shell + assets are static and cacheable by the browser; no API calls.
- All persistent state in IndexedDB (Dexie). Identity keypair is generated on
  first launch and never leaves the device.
- The "online" indicator is informational only — the app is fully functional
  with airplane mode on.

### Security model

- **Identity:** ECDSA P-256 keypair generated via Web Crypto on first launch.
- **Signing:** every broadcast is signed over its immutable fields. Receivers
  reject unsigned or invalid messages.
- **No encryption of content:** broadcasts are public to anyone in mesh range,
  by design (think public radio band). E2E-encrypted DMs are a future addition.
- **No central trust:** there is no key server. Trust is per-message via
  signature verification against the embedded `originPubKey`.

## Tech stack

Vite • React 19 • TypeScript • TanStack Router • Tailwind v4 •
Dexie (IndexedDB) • qrcode + html5-qrcode • lz-string • Web Crypto API.

## License

MIT — use it, fork it, ship it where it's needed.
