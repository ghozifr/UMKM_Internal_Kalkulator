import { BookOpen } from "lucide-react";
import type { ReactNode } from "react";
import { card } from "./ui";

// Bingkai halaman masuk/daftar: logo, judul, dan kartu isian di tengah layar.
export default function AuthShell(p: { judul: string; sub?: string; children: ReactNode }) {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-10">
      <div className="anim-up mb-6 flex flex-col items-center text-center">
        <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-700 text-white shadow-lg shadow-teal-700/30">
          <BookOpen size={28} />
        </div>
        <p className="text-sm font-semibold text-teal-800">Buku Kas UMKM</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">{p.judul}</h1>
        {p.sub && <p className="mt-1 text-sm text-slate-700">{p.sub}</p>}
      </div>
      <div className={`p-5 sm:p-6 ${card}`}>{p.children}</div>
    </main>
  );
}
