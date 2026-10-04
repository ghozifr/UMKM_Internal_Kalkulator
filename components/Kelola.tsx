"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import Modal from "./Modal";
import { LEVEL_LABEL, type Level, type Opsi, type Tipe } from "@/lib/types";

const box =
  "rounded-xl border border-slate-400 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-500 transition focus:border-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-700/30";
const ada = (items: Opsi[], nama: string, kecuali?: string) =>
  items.some((x) => x.id !== kecuali && x.nama.toLowerCase() === nama.toLowerCase());

function TipeSelect(p: { value: Tipe; onChange: (t: Tipe) => void }) {
  return (
    <select className={box} value={p.value} onChange={(e) => p.onChange(e.target.value as Tipe)} aria-label="Jenis akun">
      <option value="masuk">Pemasukan (+)</option>
      <option value="keluar">Pengeluaran (−)</option>
    </select>
  );
}

export default function Kelola(p: {
  level: Level;
  parentLabel?: string;
  items: Opsi[];
  onAdd: (nama: string, tipe: Tipe) => void;
  onRename: (id: string, nama: string) => void;
  onTipe: (id: string, tipe: Tipe) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}) {
  const [nama, setNama] = useState("");
  const [tipe, setTipe] = useState<Tipe>("masuk");
  const [err, setErr] = useState("");

  const tambah = () => {
    const v = nama.trim();
    if (!v) return;
    if (ada(p.items, v)) return setErr(`"${v}" sudah ada.`);
    p.onAdd(v, tipe);
    setNama(""); setErr("");
  };

  return (
    <Modal title={`Kelola ${LEVEL_LABEL[p.level]}`} subtitle={p.parentLabel ? `Untuk: ${p.parentLabel}` : undefined} onClose={p.onClose}>
      <div className="flex flex-wrap gap-2">
        <input className={`${box} min-w-0 flex-1`} placeholder={`Tambah ${LEVEL_LABEL[p.level]} baru`} value={nama}
          onChange={(e) => { setNama(e.target.value); setErr(""); }} onKeyDown={(e) => e.key === "Enter" && tambah()} />
        {p.level === "akun" && <TipeSelect value={tipe} onChange={setTipe} />}
        <button onClick={tambah} className="press inline-flex items-center gap-1 rounded-xl bg-teal-700 px-3 py-2.5 text-sm font-semibold text-white hover:bg-teal-800">
          <Plus size={16} /> Tambah
        </button>
      </div>
      {err && <p className="anim-fade mt-2 text-sm font-semibold text-rose-800" role="alert">{err}</p>}

      <ul className="mt-4 space-y-2">
        {p.items.length === 0 && <li className="text-sm text-slate-700">Belum ada pilihan. Tambahkan di atas.</li>}
        {p.items.map((i) => (
          <li key={i.id} className="anim-up flex items-center gap-2">
            <input className={`${box} min-w-0 flex-1`} defaultValue={i.nama} aria-label="Ubah nama"
              onBlur={(e) => {
                const v = e.target.value.trim();
                if (!v || v === i.nama) { e.target.value = i.nama; return; }
                if (ada(p.items, v, i.id)) { e.target.value = i.nama; setErr(`"${v}" sudah ada.`); return; }
                setErr(""); p.onRename(i.id, v);
              }}
              onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()} />
            {p.level === "akun" && <TipeSelect value={i.tipe ?? "keluar"} onChange={(t) => p.onTipe(i.id, t)} />}
            <button aria-label={`Hapus ${i.nama}`} className="press rounded-lg p-2 text-slate-600 hover:bg-red-50 hover:text-red-700"
              onClick={() => confirm(`Hapus "${i.nama}"? Pilihan turunannya ikut terhapus. Riwayat transaksi tidak berubah.`) && p.onDelete(i.id)}>
              <Trash2 size={16} />
            </button>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-sm text-slate-700">Ubah nama langsung di kolom, lalu tekan Enter atau klik di luar kolom.</p>
    </Modal>
  );
}
