"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import Modal from "./Modal";
import { box as boxFull } from "./ui";
import { KODE_RE, kodeKembar, normKode } from "@/lib/kode";
import { BERKODE, LEVEL_LABEL, type Level, type Opsi, type Tipe } from "@/lib/types";

const box = boxFull.replace("w-full ", "");
const ada = (items: readonly Opsi[], nama: string, kecuali?: string) =>
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
  items: readonly Opsi[];
  onAdd: (nama: string, tipe: Tipe) => void;
  onRename: (id: string, nama: string) => void;
  onKode: (id: string, kode: string) => void;
  onTipe: (id: string, tipe: Tipe) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}) {
  const [nama, setNama] = useState("");
  const [tipe, setTipe] = useState<Tipe>("masuk");
  const [err, setErr] = useState("");
  const berkode = BERKODE.includes(p.level);

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

      {berkode && p.items.length > 0 && (
        <div className="mt-4 flex gap-2 pr-11 text-sm font-semibold text-slate-800">
          <span className="flex-1">Nama</span>
          <span className="w-24">Kode</span>
          {p.level === "akun" && <span className="w-36">Jenis</span>}
        </div>
      )}
      <ul className={`${berkode ? "mt-1" : "mt-4"} space-y-2`}>
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
            {berkode && (
              <input className={`${box} w-24 font-mono uppercase`} defaultValue={i.kode ?? ""} aria-label={`Kode ${i.nama}`} maxLength={6}
                onBlur={(e) => {
                  const v = normKode(e.target.value);
                  if (!v || v === i.kode) { e.target.value = i.kode ?? ""; return; }
                  if (!KODE_RE.test(v) || kodeKembar(p.items, i.id, v)) {
                    e.target.value = i.kode ?? "";
                    setErr(`Kode "${v}" sudah dipakai pilihan lain.`);
                    return;
                  }
                  setErr(""); e.target.value = v; p.onKode(i.id, v);
                }}
                onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()} />
            )}
            {p.level === "akun" && <TipeSelect value={i.tipe ?? "keluar"} onChange={(t) => p.onTipe(i.id, t)} />}
            <button aria-label={`Hapus ${i.nama}`} className="press rounded-lg p-2 text-slate-600 hover:bg-red-50 hover:text-red-700"
              onClick={() => confirm(`Hapus "${i.nama}"? Pilihan turunannya ikut terhapus. Transaksi lama tetap tersimpan.`) && p.onDelete(i.id)}>
              <Trash2 size={16} />
            </button>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-sm text-slate-700">
        Ubah nama atau kode langsung di kolom, lalu tekan Enter. Mengganti nama ikut memperbarui transaksi lama.
        {berkode && " Kode dibuat otomatis dari huruf depan nama dan dipakai membentuk kode transaksi. Kode transaksi lama tidak berubah."}
      </p>
    </Modal>
  );
}
