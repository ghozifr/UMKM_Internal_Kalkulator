"use client";

import type { User } from "@supabase/supabase-js";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "./supabase";

export type Auth =
  | { status: "memuat" }
  | { status: "keluar" }
  | { status: "masuk"; user: User };

// Status login. Sesi disimpan Supabase di browser dan diperbarui otomatis.
export function useAuth() {
  const [auth, setAuth] = useState<Auth>({ status: "memuat" });

  useEffect(() => {
    if (!supabase) { setAuth({ status: "keluar" }); return; }
    let batal = false;
    const pakai = (user: User | null | undefined) =>
      setAuth((cur) => {
        if (!user) return cur.status === "keluar" ? cur : { status: "keluar" };
        // Pembaruan token menghasilkan objek user baru; jangan memicu render ulang bila orangnya sama.
        return cur.status === "masuk" && cur.user.id === user.id && cur.user.email === user.email ? cur : { status: "masuk", user };
      });
    supabase.auth.getSession().then(({ data }) => { if (!batal) pakai(data.session?.user); });
    // Jangan memanggil fungsi Supabase lain di dalam callback ini (bisa membuat macet); cukup simpan status.
    const { data } = supabase.auth.onAuthStateChange((_e, session) => { if (!batal) pakai(session?.user); });
    return () => { batal = true; data.subscription.unsubscribe(); };
  }, []);

  const keluar = useCallback(async () => { await supabase?.auth.signOut(); }, []);
  return { ...auth, keluar };
}
