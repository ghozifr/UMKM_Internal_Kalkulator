"use client";

import type { SupabaseClient, User } from "@supabase/supabase-js";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { useCloudData } from "@/lib/useCloudData";
import BukuKas from "./BukuKas";
import { Memuat } from "./AuthGate";
import AuthShell from "./AuthShell";
import { btn } from "./ui";

// Memuat data milik akun dari database, lalu menampilkan Buku Kas.
export default function Aplikasi(p: { db: SupabaseClient; user: User; onKeluar: () => Promise<void> }) {
  const cloud = useCloudData(p.db, p.user.id);
  if (cloud.fase === "memuat") return <Memuat teks="Memuat data Anda…" />;
  if (cloud.fase === "gagal")
    return (
      <AuthShell judul="Data belum bisa dimuat">
        <div className="flex items-start gap-3 text-sm text-slate-800">
          <AlertTriangle className="mt-0.5 shrink-0 text-amber-600" size={20} />
          <p role="alert">{cloud.galat}</p>
        </div>
        <button className={`${btn} mt-4 w-full`} onClick={cloud.muatUlang}><RefreshCw size={16} /> Coba lagi</button>
      </AuthShell>
    );
  return <BukuKas user={p.user} cloud={cloud} onKeluar={p.onKeluar} />;
}
