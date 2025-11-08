import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import NavbarShell from "@/components/NavbarShell";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Holocards",
  description: "Collections de cartes Hololive",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {/* Navbar rendue côté client uniquement */}
        <NavbarShell />

        <main style={{ maxWidth: 1200, margin: "0 auto", padding: "0 16px 24px" }}>
          {children}
        </main>
      </body>
    </html>
  );
}
