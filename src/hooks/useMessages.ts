import { useEffect, useState } from "react";
import { db, type MeshMessage } from "@/lib/db";

export function useMessages() {
  const [messages, setMessages] = useState<MeshMessage[]>([]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const all = await db.messages.orderBy("timestamp").reverse().toArray();
      if (!cancelled) setMessages(all);
    };
    load();
    // Re-poll on storage events / interval. Dexie has its own observable but
    // a simple interval keeps the dependency surface tiny.
    const i = setInterval(load, 1500);
    return () => {
      cancelled = true;
      clearInterval(i);
    };
  }, []);

  return messages;
}
