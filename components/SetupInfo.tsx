import { DatabaseZap } from "lucide-react";
import AuthShell from "./AuthShell";

// Tampil bila alamat dan kunci Supabase belum diisi.
export default function SetupInfo() {
  return (
    <AuthShell judul="Database belum dihubungkan" sub="Satu langkah lagi sebelum aplikasi bisa dipakai.">
      <div className="flex items-start gap-3 text-sm text-slate-800">
        <DatabaseZap className="mt-0.5 shrink-0 text-teal-700" size={20} />
        <div className="space-y-3">
          <p>Isi dua variabel lingkungan berikut (di file <code className="rounded bg-slate-100 px-1">.env.local</code>, atau di pengaturan Environment Variables hosting), lalu jalankan ulang aplikasi:</p>
          <pre className="overflow-x-auto rounded-xl bg-slate-900 p-3 text-xs leading-relaxed text-slate-100">{`NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...`}</pre>
          <p>Langkah lengkap membuat proyek Supabase gratis ada di file <b>SETUP-DATABASE.md</b>.</p>
        </div>
      </div>
    </AuthShell>
  );
}
