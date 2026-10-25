"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

export type Role = "worker" | "agency" | "legal" | "admin";
export type Me = { name: string; phone: string; memoryEnabled: boolean; role: Role; premium: boolean; premiumUntil: string | null; hasPhonePin: boolean } | null;
type Features = { ai: boolean; naturalVoice: boolean; accounts: boolean; phoneLine: string | null };
type Ctx = Features & { me: Me; refreshMe: () => Promise<void>; loaded: boolean };

const FeaturesContext = createContext<Ctx>({ ai: false, naturalVoice: false, accounts: false, phoneLine: null, me: null, refreshMe: async () => {}, loaded: false });

/** Loads which features the server offers and who is logged in, once per page load. */
export function FeaturesProvider({ children }: { children: React.ReactNode }) {
  const [features, setFeatures] = useState<Features>({ ai: false, naturalVoice: false, accounts: false, phoneLine: null });
  const [me, setMe] = useState<Me>(null);
  const [loaded, setLoaded] = useState(false);

  const refreshMe = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me", { cache: "no-store" });
      setMe(res.ok ? (await res.json()).user : null);
    } catch {
      setMe(null);
    }
  }, []);

  useEffect(() => {
    Promise.all([
      fetch("/api/config", { cache: "no-store" }).then((r) => (r.ok ? r.json() : null)).then((f) => f && setFeatures(f)).catch(() => {}),
      refreshMe(),
    ]).finally(() => setLoaded(true));
  }, [refreshMe]);

  return <FeaturesContext.Provider value={{ ...features, me, refreshMe, loaded }}>{children}</FeaturesContext.Provider>;
}

export function useFeatures() {
  return useContext(FeaturesContext);
}
