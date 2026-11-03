import type { SupabaseClient } from "@supabase/supabase-js";
import { KODE_RE } from "./kode";
import { normalisasiPers, PERS_KOSONG, type Pers } from "./persediaan";
import type { Opsi, Transaksi, Turunan } from "./types";

/* =====================================================================
   Penyimpanan ke database (Supabase) memakai pola "bandingkan lalu tulis":
   aplikasi tetap bekerja dengan array biasa, lalu baris yang berubah, baru, atau hilang
   dikirim ke tabel. Kunci tiap baris adalah (user_id, id).
   ===================================================================== */

export type Baris = Record<string, unknown>;
export type Spek<T> = {
  tabel: string;
  id: (x: T) => string;
  ke: (x: T) => Baris; // item -> kolom (tanpa user_id dan urut); juga merapikan agar lolos aturan database
  dari: (b: Baris) => T;
  desc?: boolean; // true: item pertama di array adalah yang terbaru (urut terbesar)
};

export type Nomor = { id: string; nomor: number };

const teks = (v: unknown, maks: number) => String(v ?? "").slice(0, maks);
const angka = (v: unknown) => (Number.isFinite(Number(v)) && Number(v) > 0 ? Number(v) : 0);
const HARI = /^\d{4}-\d{2}-\d{2}$/;

export const SPEK_OPSI: Spek<Opsi> = {
  tabel: "opsi",
  id: (o) => o.id,
  ke: (o) => ({
    id: o.id, level: o.level, nama: teks(o.nama, 500) || "-",
    kode: o.kode && KODE_RE.test(o.kode) ? o.kode : null,
    parent_id: o.parentId ?? null,
    tipe: o.level === "akun" ? o.tipe ?? "keluar" : null,
    produksi: o.level === "akun" && o.produksi === true,
  }),
  dari: (b) => {
    const o: Opsi = { id: b.id as string, level: b.level as Opsi["level"], nama: b.nama as string };
    if (b.kode) o.kode = b.kode as string;
    if (b.parent_id) o.parentId = b.parent_id as string;
    if (b.tipe) o.tipe = b.tipe as Opsi["tipe"];
    if (b.produksi === true) o.produksi = true;
    return o;
  },
};

export const SPEK_TRX: Spek<Transaksi> = {
  tabel: "transaksi",
  desc: true,
  id: (t) => t.id,
  ke: (t) => ({
    id: t.id, kode: teks(t.kode, 60), tanggal: HARI.test(t.tanggal) ? t.tanggal : new Date().toISOString().slice(0, 10),
    tipe: t.tipe === "masuk" ? "masuk" : "keluar",
    akun: t.akun ?? "", sub_akun: t.subAkun ?? "", kas: t.kas ?? "", ket1: t.ket1 ?? "",
    ket2: teks(t.ket2, 500), ket3: teks(t.ket3, 500),
    jumlah: angka(t.jumlah), harga: angka(t.harga),
    aid: t.aid ?? "", sid: t.sid ?? "", kid: t.kid ?? "", k1id: t.k1id ?? "",
  }),
  dari: (b) => ({
    id: b.id as string, kode: b.kode as string, tanggal: b.tanggal as string, tipe: b.tipe as Transaksi["tipe"],
    akun: b.akun as string, subAkun: b.sub_akun as string, kas: b.kas as string, ket1: b.ket1 as string,
    ket2: b.ket2 as string, ket3: b.ket3 as string, jumlah: Number(b.jumlah), harga: Number(b.harga),
    aid: b.aid as string, sid: b.sid as string, kid: b.kid as string, k1id: b.k1id as string,
  }),
};

export const SPEK_TURUNAN: Spek<Turunan> = {
  tabel: "turunan",
  id: (t) => t.id,
  ke: (t) => ({ id: t.id, nama: teks(t.nama, 500) || "-", kodes: t.kodes }),
  dari: (b) => ({ id: b.id as string, nama: b.nama as string, kodes: (b.kodes as string[]) ?? [] }),
};

export const SPEK_SEQ: Spek<Nomor> = {
  tabel: "urutan_kode",
  id: (n) => n.id,
  ke: (n) => ({ id: n.id, nomor: Math.max(0, Math.trunc(Number(n.nomor) || 0)) }),
  dari: (b) => ({ id: b.id as string, nomor: Number(b.nomor) }),
};

// Pengaturan dan data persediaan disimpan sebagai satu dokumen JSON per akun.
export type DokPers = { id: string; data: Pers };
const urut = (v: unknown): unknown =>
  Array.isArray(v) ? v.map(urut)
    : v && typeof v === "object" ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, urut((v as Record<string, unknown>)[k])]))
    : v;
export const SPEK_PERS: Spek<DokPers> = {
  tabel: "persediaan",
  id: (d) => d.id,
  // Kunci diurutkan karena jsonb di database tidak mempertahankan urutan kunci; tanpa ini setiap muat dianggap berubah.
  ke: (d) => ({ id: d.id, data: urut(d.data) }),
  dari: (b) => ({ id: b.id as string, data: normalisasiPers(b.data) }),
};
const DOK = new WeakMap<Pers, DokPers>();
const dokPers = (p: Pers): DokPers[] => {
  if (p === PERS_KOSONG) return [];
  let d = DOK.get(p);
  if (!d) DOK.set(p, (d = { id: "data", data: p }));
  return [d];
};

/* ---------- Mesin sinkronisasi ---------- */

type Tahu = Map<string, { json: string; urut: number }>;
type Item = { id: string; row: Baris; json: string; urut: number };
export type Rencana = { hapus: { tabel: string; ids: string[] }[]; simpan: { tabel: string; item: Item[] }[] };
export type Hasil<T> = { items: T[]; tahu: Tahu };

const CACHE = new WeakMap<object, { row: Baris; json: string }>();
const HALAMAN = 1000; // batas baris per permintaan di API Supabase
const POTONG = 400;

export const kosong = (r: Rencana) => r.hapus.every((h) => !h.ids.length) && r.simpan.every((s) => !s.item.length);

export class Sinkron {
  // Isi database yang terakhir diketahui, per tabel
  tahu = new Map<string, Tahu>();
  private maks = 0;

  constructor(private db: SupabaseClient, private uid: string) {}

  async ambilTabel<T>(sp: Spek<T>): Promise<Hasil<T>> {
    const items: T[] = [];
    const tahu: Tahu = new Map();
    for (let dari = 0; ; dari += HALAMAN) {
      const { data, error } = await this.db.from(sp.tabel).select("*")
        .order("urut", { ascending: !sp.desc }).order("id").range(dari, dari + HALAMAN - 1);
      if (error) throw error;
      for (const r of data as Baris[]) {
        const it = sp.dari(r);
        const id = sp.id(it);
        if (tahu.has(id)) continue; // jaga-jaga bila data bergeser saat halaman dibaca
        items.push(it);
        tahu.set(id, { json: JSON.stringify(sp.ke(it)), urut: Number(r.urut) });
      }
      if (data.length < HALAMAN) break;
    }
    return { items, tahu };
  }

  // Membaca semua tabel dari server. Belum mengubah apa pun di mesin ini; panggil adopsi() untuk memakainya.
  async ambil() {
    const [opsi, trx, turunan, seq, pers] = await Promise.all([
      this.ambilTabel(SPEK_OPSI), this.ambilTabel(SPEK_TRX), this.ambilTabel(SPEK_TURUNAN), this.ambilTabel(SPEK_SEQ),
      this.ambilTabel(SPEK_PERS),
    ]);
    return { opsi, trx, turunan, seq, pers };
  }

  adopsi(h: Awaited<ReturnType<Sinkron["ambil"]>>) {
    this.tahu = new Map([
      [SPEK_OPSI.tabel, h.opsi.tahu], [SPEK_TRX.tabel, h.trx.tahu],
      [SPEK_TURUNAN.tabel, h.turunan.tahu], [SPEK_SEQ.tabel, h.seq.tahu], [SPEK_PERS.tabel, h.pers.tahu],
    ]);
    for (const t of this.tahu.values()) for (const v of t.values()) this.maks = Math.max(this.maks, v.urut);
  }

  // Apakah isi server berbeda dari yang terakhir kita ketahui?
  beda(h: Awaited<ReturnType<Sinkron["ambil"]>>) {
    const bandingkan = (a: Tahu | undefined, b: Tahu) => {
      if (!a || a.size !== b.size) return true;
      for (const [k, v] of b) { const x = a.get(k); if (!x || x.json !== v.json || x.urut !== v.urut) return true; }
      return false;
    };
    return bandingkan(this.tahu.get("opsi"), h.opsi.tahu) || bandingkan(this.tahu.get("transaksi"), h.trx.tahu)
      || bandingkan(this.tahu.get("turunan"), h.turunan.tahu) || bandingkan(this.tahu.get("urutan_kode"), h.seq.tahu)
      || bandingkan(this.tahu.get("persediaan"), h.pers.tahu);
  }

  private urutBaru() {
    this.maks = Math.max(Date.now() * 1000, this.maks + 1);
    return this.maks;
  }

  private selisih<T>(sp: Spek<T>, items: readonly T[]) {
    const tahu = this.tahu.get(sp.tabel) ?? new Map();
    const ada = new Set<string>();
    const ubah: Item[] = [];
    const baru: Item[] = [];
    for (const it of items) {
      const id = sp.id(it);
      ada.add(id);
      // Objek data tidak pernah diubah di tempat, jadi hasil olahannya aman disimpan per objek:
      // baris yang tidak berubah tidak diolah ulang walaupun tabelnya berisi puluhan ribu baris.
      let c = CACHE.get(it as object);
      if (!c) {
        const r = sp.ke(it);
        c = { row: r, json: JSON.stringify(r) };
        CACHE.set(it as object, c);
      }
      const { row, json } = c;
      const lama = tahu.get(id);
      if (!lama) baru.push({ id, row, json, urut: 0 });
      else if (lama.json !== json) ubah.push({ id, row, json, urut: lama.urut });
    }
    // Item baru diberi urutan naik; pada tabel "terbaru di atas" array dibaca dari belakang agar elemen pertama paling besar.
    if (sp.desc) for (let i = baru.length - 1; i >= 0; i--) baru[i].urut = this.urutBaru();
    else for (const b of baru) b.urut = this.urutBaru();
    const hapus: string[] = [];
    for (const id of tahu.keys()) if (!ada.has(id)) hapus.push(id);
    return { hapus, item: [...ubah, ...baru] };
  }

  rencana(d: { opsi: readonly Opsi[]; trx: readonly Transaksi[]; turunan: readonly Turunan[]; seq: Record<string, number>; pers: Pers }): Rencana {
    const s = [
      { tabel: "opsi", ...this.selisih(SPEK_OPSI, d.opsi) },
      { tabel: "transaksi", ...this.selisih(SPEK_TRX, d.trx) },
      { tabel: "turunan", ...this.selisih(SPEK_TURUNAN, d.turunan) },
      { tabel: "urutan_kode", ...this.selisih(SPEK_SEQ, Object.entries(d.seq).map(([id, nomor]) => ({ id, nomor }))) },
      { tabel: "persediaan", ...this.selisih(SPEK_PERS, dokPers(d.pers)) },
    ];
    return {
      hapus: s.map((x) => ({ tabel: x.tabel, ids: x.hapus })),
      simpan: s.map((x) => ({ tabel: x.tabel, item: x.item })),
    };
  }

  // Hapus dulu, baru simpan (supaya kode yang dilepas bisa dipakai lagi). Keberhasilan dicatat per potongan,
  // jadi jika terputus di tengah, percobaan berikutnya hanya mengirim sisanya.
  async jalankan(r: Rencana) {
    for (const h of r.hapus) {
      for (let i = 0; i < h.ids.length; i += POTONG) {
        const ids = h.ids.slice(i, i + POTONG);
        const { error } = await this.db.from(h.tabel).delete().eq("user_id", this.uid).in("id", ids);
        if (error) throw error;
        const t = this.tahu.get(h.tabel);
        for (const id of ids) t?.delete(id);
      }
    }
    for (const s of r.simpan) {
      for (let i = 0; i < s.item.length; i += POTONG) {
        const potong = s.item.slice(i, i + POTONG);
        const { error } = await this.db.from(s.tabel)
          .upsert(potong.map((x) => ({ ...x.row, user_id: this.uid, urut: x.urut })), { onConflict: "user_id,id" });
        if (error) throw error;
        let t = this.tahu.get(s.tabel);
        if (!t) this.tahu.set(s.tabel, (t = new Map()));
        for (const x of potong) t.set(x.id, { json: x.json, urut: x.urut });
      }
    }
  }
}
