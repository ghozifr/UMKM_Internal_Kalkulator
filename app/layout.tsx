import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./animations.css";

export const metadata: Metadata = {
  title: "Buku Kas UMKM",
  description: "Catat pemasukan dan pengeluaran UMKM dengan pilihan yang dapat diatur sendiri.",
};
export const viewport: Viewport = { width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" style={{ colorScheme: "light" }}>
      <body className="app-bg min-h-screen text-slate-900 antialiased">{children}</body>
    </html>
  );
}
