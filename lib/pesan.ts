// Menerjemahkan galat Supabase ke bahasa yang mudah dipahami pengguna.
type Galat = { message?: string; code?: string; status?: number } | null | undefined;

const JARINGAN = /failed to fetch|networkerror|load failed|network request failed|fetch failed/i;

export function pesanAuth(e: Galat): string {
  const m = e?.message ?? "";
  const c = e?.code ?? "";
  if (JARINGAN.test(m)) return "Tidak dapat terhubung ke server. Periksa koneksi internet Anda.";
  if (c === "invalid_credentials" || /invalid login credentials/i.test(m)) return "Email atau kata sandi salah.";
  if (c === "email_not_confirmed" || /email not confirmed/i.test(m)) return "Email belum dikonfirmasi. Buka email dari kami lalu klik tautan konfirmasi.";
  if (c === "user_already_exists" || /already registered/i.test(m)) return "Email ini sudah terdaftar. Silakan masuk.";
  if (c === "weak_password" || /password should be|weak/i.test(m)) return "Kata sandi terlalu lemah. Gunakan minimal 8 karakter, campurkan huruf dan angka.";
  if (c === "same_password" || /different from the old/i.test(m)) return "Kata sandi baru harus berbeda dari yang lama.";
  if (/over_email_send_rate_limit|over_request_rate_limit|rate limit|too many/i.test(c + m)) return "Terlalu banyak permintaan. Tunggu beberapa menit lalu coba lagi.";
  if (c === "signup_disabled" || /signups not allowed/i.test(m)) return "Pendaftaran akun baru sedang ditutup.";
  if (/invalid.*email|unable to validate email/i.test(m)) return "Format email tidak valid.";
  if (c === "otp_expired" || /expired|invalid.*(token|link)/i.test(m)) return "Tautan sudah kedaluwarsa atau tidak valid. Minta tautan baru.";
  if (c === "session_not_found" || /auth session missing/i.test(m)) return "Sesi tidak ditemukan. Minta tautan baru.";
  return m ? `Terjadi kesalahan: ${m}` : "Terjadi kesalahan. Coba lagi.";
}

export function pesanDb(e: Galat): string {
  const m = e?.message ?? "";
  const c = e?.code ?? "";
  if (JARINGAN.test(m))
    return "Tidak dapat terhubung ke server. Periksa internet Anda. Di paket gratis Supabase, proyek dijeda setelah 1 minggu tanpa aktivitas dan perlu diaktifkan lagi dari dashboard.";
  if (c === "23505") return "Kode transaksi bentrok dengan data yang dibuat dari perangkat lain.";
  if (c === "42P01" || c === "PGRST205" || /could not find the table|does not exist/i.test(m))
    return "Tabel database belum dibuat. Jalankan supabase/schema.sql di Supabase SQL Editor.";
  if (c === "PGRST301" || e?.status === 401 || /jwt/i.test(m)) return "Sesi berakhir. Muat ulang halaman lalu masuk lagi.";
  if (c === "42501") return "Akses ditolak oleh database. Pastikan skema (RLS) sudah dipasang dan Anda sudah masuk.";
  if (c === "23514" || c === "22P02" || c === "22007") return `Ada data yang tidak sesuai aturan database (${m}).`;
  return m || "Gagal menyimpan ke server.";
}
