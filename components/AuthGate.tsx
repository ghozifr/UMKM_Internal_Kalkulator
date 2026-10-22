"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import { supabase, terkonfigurasi } from "@/lib/supabase";
import { useAuth } from "@/lib/useAuth";
import Aplikasi from "./Aplikasi";
import SetupInfo from "./SetupInfo";

export function Memuat({ teks = "Memuat…" }: { teks?: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center" role="status">
      <div className="flex items-center gap-3 text-slate-700"><Loader2 className="animate-spin" size={22} /> {teks}</div>
    </div>
  );
}

// Penjaga halaman utama: hanya pengguna yang sudah masuk yang bisa melihat aplikasi.
export default function AuthGate() {
  const a = useAuth();
  const router = useRouter();
  useEffect(() => { if (terkonfigurasi && a.status === "keluar") router.replace("/masuk"); }, [a.status, router]);

  if (!terkonfigurasi || !supabase) return <SetupInfo />;
  if (a.status !== "masuk") return <Memuat teks={a.status === "keluar" ? "Mengarahkan ke halaman masuk…" : "Memuat…"} />;
  return <Aplikasi key={a.user.id} db={supabase} user={a.user} onKeluar={a.keluar} />;
}
