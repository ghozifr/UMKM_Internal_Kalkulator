import type { Metadata } from "next";
import AuthForm from "@/components/AuthForm";

export const metadata: Metadata = { title: "Kata Sandi Baru | Buku Kas UMKM" };

export default function Page() {
  return <AuthForm mode="atur" />;
}
