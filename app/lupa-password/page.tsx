import type { Metadata } from "next";
import AuthForm from "@/components/AuthForm";

export const metadata: Metadata = { title: "Lupa Kata Sandi | Buku Kas UMKM" };

export default function Page() {
  return <AuthForm mode="lupa" />;
}
