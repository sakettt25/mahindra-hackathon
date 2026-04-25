import { useEffect, useState } from "react";
import { getOrCreateIdentity } from "@/lib/crypto";
import type { Identity } from "@/lib/db";

export function useIdentity() {
  const [identity, setIdentity] = useState<Identity | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    getOrCreateIdentity().then((id) => {
      if (mounted) {
        setIdentity(id);
        setLoading(false);
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  return { identity, loading, refresh: async () => setIdentity(await getOrCreateIdentity()) };
}
