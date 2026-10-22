import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Kedua nilai ini aman berada di browser: yang melindungi data adalah Row Level Security di database
// (lihat supabase/schema.sql), bukan kerahasiaan kunci. JANGAN pernah memakai kunci "secret"/"service_role" di sini.
// Nama variabel harus ditulis utuh agar Next.js bisa menyisipkannya saat build.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const kunci = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const terkonfigurasi = Boolean(url && kunci);

export const supabase: SupabaseClient | null = terkonfigurasi
  ? createClient(url!, kunci!, { auth: { flowType: "pkce", persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } })
  : null;
