import { ingestPayload, buildOutgoingPayload } from "./mesh";
import type { Identity } from "./db";
import type { QrPayload } from "./qr-protocol";

export type PeerStatus = "disconnected" | "connecting" | "connected" | "error";

export class PeerConnection {
  public pc: RTCPeerConnection;
  public dataChannel?: RTCDataChannel;
  public status: PeerStatus = "disconnected";

  private identity: Identity;
  public onStatusChange?: (status: PeerStatus) => void;
  public onMessageReceived?: (count: number) => void;

  constructor(identity: Identity) {
    this.identity = identity;

    // We use google's public STUN servers for local network discovery if allowed,
    // but the app should work purely via local connection with SDP exchange even without STUN
    // if devices are on the same local network / Wi-Fi Direct.
    this.pc = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });

    this.pc.onconnectionstatechange = () => {
      console.log("Connection state:", this.pc.connectionState);
      switch (this.pc.connectionState) {
        case "connected":
          this.updateStatus("connected");
          this.syncMessages(); // Auto-sync on connect
          break;
        case "disconnected":
        case "failed":
        case "closed":
          this.updateStatus("disconnected");
          break;
        case "connecting":
          this.updateStatus("connecting");
          break;
      }
    };

    // Handle receiving data channel
    this.pc.ondatachannel = (event) => {
      this.setupDataChannel(event.channel);
    };

    // Auto-sync heartbeat every 3 seconds while connected
    setInterval(() => {
      if (this.status === "connected") {
        this.syncMessages();
      }
    }, 3000);
  }

  private updateStatus(status: PeerStatus) {
    this.status = status;
    if (this.onStatusChange) this.onStatusChange(status);
  }

  public async createOffer(): Promise<string> {
    this.dataChannel = this.pc.createDataChannel("meshSync");
    this.setupDataChannel(this.dataChannel);

    const offer = await this.pc.createOffer();
    await this.pc.setLocalDescription(offer);

    // Wait for ICE gathering to complete (or timeout after 1.5s for offline scenarios)
    await new Promise<void>((resolve) => {
      if (this.pc.iceGatheringState === "complete") {
        resolve();
        return;
      }
      
      let resolved = false;
      const timeout = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          this.pc.removeEventListener("icegatheringstatechange", checkState);
          resolve();
        }
      }, 1500);

      const checkState = () => {
        if (this.pc.iceGatheringState === "complete" && !resolved) {
          resolved = true;
          clearTimeout(timeout);
          this.pc.removeEventListener("icegatheringstatechange", checkState);
          resolve();
        }
      };
      this.pc.addEventListener("icegatheringstatechange", checkState);
    });

    return JSON.stringify(this.pc.localDescription);
  }

  public async handleOffer(offerStr: string): Promise<string> {
    const offer = JSON.parse(offerStr);
    await this.pc.setRemoteDescription(new RTCSessionDescription(offer));

    const answer = await this.pc.createAnswer();
    await this.pc.setLocalDescription(answer);

    // Wait for ICE gathering to complete (or timeout)
    await new Promise<void>((resolve) => {
      if (this.pc.iceGatheringState === "complete") {
        resolve();
        return;
      }

      let resolved = false;
      const timeout = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          this.pc.removeEventListener("icegatheringstatechange", checkState);
          resolve();
        }
      }, 1500);

      const checkState = () => {
        if (this.pc.iceGatheringState === "complete" && !resolved) {
          resolved = true;
          clearTimeout(timeout);
          this.pc.removeEventListener("icegatheringstatechange", checkState);
          resolve();
        }
      };
      this.pc.addEventListener("icegatheringstatechange", checkState);
    });

    return JSON.stringify(this.pc.localDescription);
  }

  public async handleAnswer(answerStr: string) {
    const answer = JSON.parse(answerStr);
    if (this.pc.signalingState !== "stable") {
      await this.pc.setRemoteDescription(new RTCSessionDescription(answer));
    }
  }

  private setupDataChannel(channel: RTCDataChannel) {
    this.dataChannel = channel;
    this.dataChannel.onopen = () => {
      console.log("Data channel opened");
      this.updateStatus("connected");
      this.syncMessages();
    };

    this.dataChannel.onmessage = async (event) => {
      try {
        const payload: QrPayload = JSON.parse(event.data);
        const result = await ingestPayload(this.identity, payload);
        if (result.accepted > 0 && this.onMessageReceived) {
          this.onMessageReceived(result.accepted);
        }
      } catch (err) {
        console.error("Error handling incoming peer message", err);
      }
    };

    this.dataChannel.onerror = (err) => {
      console.error("Data channel error", err);
      this.updateStatus("error");
    };

    this.dataChannel.onclose = () => {
      console.log("Data channel closed");
      this.updateStatus("disconnected");
    };
  }

  public async syncMessages() {
    if (!this.dataChannel || this.dataChannel.readyState !== "open") return;
    try {
      const payload = await buildOutgoingPayload(this.identity);
      this.dataChannel.send(JSON.stringify(payload));
    } catch (err) {
      console.error("Error sending sync payload", err);
    }
  }

  public close() {
    if (this.dataChannel) this.dataChannel.close();
    if (this.pc) this.pc.close();
    this.updateStatus("disconnected");
  }
}

let globalConnection: PeerConnection | null = null;

export function getGlobalPeerConnection(identity: Identity): PeerConnection {
  if (!globalConnection || globalConnection.status === "disconnected" || globalConnection.status === "error") {
    if (globalConnection) globalConnection.close();
    globalConnection = new PeerConnection(identity);
  }
  return globalConnection;
}
