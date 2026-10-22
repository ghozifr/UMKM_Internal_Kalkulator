"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { CheckCircle2, Eye, EyeOff, Loader2, MailCheck } from "lucide-react";
import { supabase, terkonfigurasi } from "@/lib/supabase";
import { pesanAuth } from "@/lib/pesan";
import { useAuth } from "@/lib/useAuth";
import AuthShell from "./AuthShell";
import SetupInfo from "./SetupInfo";
import { box, btn, Lbl } from "./ui";

export type Mode = "masuk" | "daftar" | "lupa" | "atur";
const JUDUL: Record<Mode, [string, string]> = {
  masuk: ["Masuk ke akun Anda", "Data buku kas Anda tersimpan aman di akun ini."],
  daftar: ["Buat akun baru", "Gratis. Data setiap akun terpisah dan hanya bisa dilihat pemiliknya."],
  lupa: ["Lupa kata sandi", "Masukkan email Anda, kami kirim tautan untuk membuat kata sandi baru."],
  atur: ["Buat kata sandi baru", "Pilih kata sandi baru untuk akun Anda."],
};
const MIN = 8;
const asal = () => (typeof window === "undefined" ? "" : window.location.origin);

function Sandi(p: { label: string; v: string; set: (v: string) => void; auto: string; id: string }) {
  const [lihat, setLihat] = useState(false);
  return (
    <Lbl t={p.label}>
      <div className="relative">
        <input id={p.id} name={p.id} type={lihat ? "text" : "password"} className={`${box} pr-11`} value={p.v} autoComplete={p.auto}
          onChange={(e) => p.set(e.target.value)} required minLength={MIN} />
        <button type="button" onClick={() => setLihat(!lihat)} aria-label={lihat ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
          className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-slate-600 hover:text-slate-900">
          {lihat ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
    </Lbl>
  );
}

export default function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const a = useAuth();
  const [email, setEmail] = useState("");
  const [sandi, setSandi] = useState("");
  const [ulangi, setUlangi] = useState("");
  const [usaha, setUsaha] = useState("");
  const [kerja, setKerja] = useState(false);
  const [galat, setGalat] = useState("");
  const [info, setInfo] = useState("");
  const [selesai, setSelesai] = useState<"" | "cek-email" | "kirim-tautan">("");
  const [bisaKirimUlang, setBisaKirimUlang] = useState(false);

  // Sudah masuk? Langsung ke aplikasi (kecuali sedang mengatur ulang kata sandi)
  useEffect(() => { if (mode !== "atur" && a.status === "masuk") router.replace("/"); }, [mode, a.status, router]);

  // Galat dari tautan di email (kedaluwarsa, dipakai di browser lain, dll.)
  useEffect(() => {
    const q = new URLSearchParams(window.location.search + "&" + window.location.hash.slice(1));
    const d = q.get("error_description");
    if (d) {
      setGalat(/expired|invalid/i.test(d)
        ? "Tautan sudah kedaluwarsa atau tidak bisa dipakai di browser ini. Jika email Anda sudah dikonfirmasi, silakan masuk; jika belum, minta tautan baru."
        : d.replace(/\+/g, " "));
    }
  }, []);

  if (!terkonfigurasi || !supabase) return <SetupInfo />;
  const db = supabase;

  async function kirim(e: FormEvent) {
    e.preventDefault();
    setGalat(""); setInfo(""); setBisaKirimUlang(false);
    const em = email.trim();
    if (mode !== "atur" && !em) return setGalat("Isi email Anda.");
    if ((mode === "daftar" || mode === "atur") && sandi.length < MIN) return setGalat(`Kata sandi minimal ${MIN} karakter.`);
    if ((mode === "daftar" || mode === "atur") && sandi !== ulangi) return setGalat("Kata sandi dan pengulangannya tidak sama.");
    setKerja(true);
    try {
      if (mode === "masuk") {
        const { error } = await db.auth.signInWithPassword({ email: em, password: sandi });
        if (error) {
          setGalat(pesanAuth(error));
          setBisaKirimUlang(error.code === "email_not_confirmed" || /not confirmed/i.test(error.message));
        } else router.replace("/");
      } else if (mode === "daftar") {
        const { data, error } = await db.auth.signUp({
          email: em, password: sandi, options: { emailRedirectTo: `${asal()}/`, data: usaha.trim() ? { nama_usaha: usaha.trim().slice(0, 100) } : {} },
        });
        if (error) setGalat(pesanAuth(error));
        else if (data.session) router.replace("/"); // konfirmasi email dimatikan: langsung masuk
        else if (data.user && data.user.identities?.length === 0) setGalat("Email ini sudah terdaftar. Silakan masuk.");
        else setSelesai("cek-email");
      } else if (mode === "lupa") {
        const { error } = await db.auth.resetPasswordForEmail(em, { redirectTo: `${asal()}/atur-ulang-password` });
        if (error) setGalat(pesanAuth(error));
        else setSelesai("kirim-tautan");
      } else {
        const { error } = await db.auth.updateUser({ password: sandi });
        if (error) setGalat(pesanAuth(error));
        else { setInfo("Kata sandi berhasil diganti. Mengalihkan…"); setTimeout(() => router.replace("/"), 900); }
      }
    } catch (x) {
      setGalat(pesanAuth(x as Error));
    } finally {
      setKerja(false);
    }
  }

  async function kirimUlang() {
    setKerja(true); setGalat("");
    const { error } = await db.auth.resend({ type: "signup", email: email.trim(), options: { emailRedirectTo: `${asal()}/` } });
    setKerja(false);
    if (error) setGalat(pesanAuth(error));
    else { setInfo("Email konfirmasi dikirim ulang. Cek kotak masuk dan folder spam."); setBisaKirimUlang(false); }
  }

  if (selesai) {
    return (
      <AuthShell judul={selesai === "cek-email" ? "Cek email Anda" : "Tautan terkirim"}>
        <div className="flex flex-col items-center gap-3 text-center text-sm text-slate-800">
          <MailCheck className="text-teal-700" size={40} />
          {selesai === "cek-email" ? (
            <p>Kami mengirim tautan konfirmasi ke <b>{email.trim()}</b>. Klik tautan itu untuk mengaktifkan akun, lalu masuk. Jika tidak ada, cek folder spam.</p>
          ) : (
            <p>Jika <b>{email.trim()}</b> terdaftar, tautan untuk membuat kata sandi baru sudah dikirim. Cek kotak masuk dan folder spam.</p>
          )}
          <Link href="/masuk" className="font-semibold text-teal-800 underline">Ke halaman masuk</Link>
        </div>
      </AuthShell>
    );
  }

  // Halaman atur-ulang hanya berguna bila tautan dari email sudah menghasilkan sesi
  if (mode === "atur" && a.status === "keluar") {
    return (
      <AuthShell judul="Tautan tidak valid">
        <p className="text-sm text-slate-800">Tautan pengaturan kata sandi sudah kedaluwarsa atau tidak bisa dipakai di browser ini. Minta tautan baru, lalu buka tautannya di browser yang sama dengan yang Anda pakai sekarang.</p>
        <Link href="/lupa-password" className={`${btn} mt-4 w-full`}>Minta tautan baru</Link>
      </AuthShell>
    );
  }

  const [judul, sub] = JUDUL[mode];
  return (
    <AuthShell judul={judul} sub={sub}>
      <form onSubmit={kirim} className="space-y-4" noValidate>
        {mode === "daftar" && (
          <Lbl t="Nama usaha (boleh dikosongkan)">
            <input name="usaha" className={box} value={usaha} maxLength={100} autoComplete="organization" onChange={(e) => setUsaha(e.target.value)} placeholder="Contoh: Warung Bu Sari" />
          </Lbl>
        )}
        {mode !== "atur" && (
          <Lbl t="Email">
            <input name="email" type="email" className={box} value={email} autoComplete="email" inputMode="email" required
              onChange={(e) => setEmail(e.target.value)} placeholder="nama@email.com" />
          </Lbl>
        )}
        {mode !== "lupa" && (
          <Sandi id="sandi" label={mode === "atur" ? "Kata sandi baru" : "Kata sandi"} v={sandi} set={setSandi} auto={mode === "masuk" ? "current-password" : "new-password"} />
        )}
        {(mode === "daftar" || mode === "atur") && <Sandi id="ulangi" label="Ulangi kata sandi" v={ulangi} set={setUlangi} auto="new-password" />}
        {(mode === "daftar" || mode === "atur") && <p className="-mt-2 text-xs text-slate-600">Minimal {MIN} karakter.</p>}

        {galat && <p role="alert" className="rounded-xl border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-900">{galat}</p>}
        {info && <p role="status" className="flex items-start gap-2 rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-900"><CheckCircle2 className="mt-0.5 shrink-0" size={16} />{info}</p>}
        {bisaKirimUlang && <button type="button" onClick={kirimUlang} disabled={kerja} className="text-sm font-semibold text-teal-800 underline">Kirim ulang email konfirmasi</button>}

        <button className={`${btn} w-full`} disabled={kerja}>
          {kerja && <Loader2 className="animate-spin" size={16} />}
          {mode === "masuk" ? "Masuk" : mode === "daftar" ? "Daftar" : mode === "lupa" ? "Kirim tautan" : "Simpan kata sandi"}
        </button>
      </form>

      <div className="mt-5 space-y-1.5 text-center text-sm text-slate-700">
        {mode === "masuk" && (<>
          <p><Link href="/lupa-password" className="font-semibold text-teal-800 underline">Lupa kata sandi?</Link></p>
          <p>Belum punya akun? <Link href="/daftar" className="font-semibold text-teal-800 underline">Daftar</Link></p>
        </>)}
        {mode === "daftar" && <p>Sudah punya akun? <Link href="/masuk" className="font-semibold text-teal-800 underline">Masuk</Link></p>}
        {mode === "lupa" && <p><Link href="/masuk" className="font-semibold text-teal-800 underline">Kembali ke halaman masuk</Link></p>}
      </div>
    </AuthShell>
  );
}
