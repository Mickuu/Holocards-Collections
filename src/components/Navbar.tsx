"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Navbar({
  user,
}: {
  user?: { user_metadata?: { name?: string; user_name?: string } };
}) {
  const pathname = usePathname();

  const navItems = [
    { href: "/", label: "🏠 Accueil" },
    { href: "/collection", label: "🃏 Ma collection" },
    { href: "/collections", label: "📚 Collections des joueurs" },
  ];

  return (
    <header className="w-full bg-white/10 backdrop-blur-md border-b border-white/20">
      <nav className="max-w-7xl mx-auto flex items-center justify-between px-6 py-4">
        {/* Liens principaux */}
        <div className="flex gap-6">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`transition-all ${
                pathname === item.href
                  ? "text-blue-400 font-semibold"
                  : "text-white hover:text-blue-400"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </div>

        {/* Profil et bouton */}
        <div className="flex items-center gap-3">
          {user && (
            <span className="text-white text-sm">
              🌙 {user.user_metadata?.user_name ?? user.user_metadata?.name ?? "Utilisateur"}
            </span>
          )}
          <form action="/auth/signout" method="post">
            <button
              type="submit"
              className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-white text-sm transition-all"
            >
              Déconnexion
            </button>
          </form>
        </div>
      </nav>
    </header>
  );
}
