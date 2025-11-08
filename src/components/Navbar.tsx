"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import ThemeToggle from "@/components/ThemeToggle";

export default function Navbar() {
  const [me, setMe] = useState<null | { id: string; label: string }>(null);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setMe(
        user
          ? {
              id: user.id,
              label:
                user.user_metadata?.full_name ||
                user.user_metadata?.user_name ||
                user.email ||
                user.id,
            }
          : null
      );
    };
    init();

    const { data: sub } = supabase.auth.onAuthStateChange((_evt, session) => {
      const u = session?.user;
      setMe(
        u
          ? {
              id: u.id,
              label:
                u.user_metadata?.full_name ||
                u.user_metadata?.user_name ||
                u.email ||
                u.id,
            }
          : null
      );
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const logout = async () => {
    await supabase.auth.signOut();
    setMe(null);
  };

  // 👉 mêmes styles que ta barre de l'accueil (inline CSS)
  return (
    <nav
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        background: "var(--card-bg)",
        backdropFilter: "blur(10px)",
        borderRadius: 10,
        padding: "10px 16px",
        boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
        margin: "16px auto",
        maxWidth: 1200,
      }}
    >
      <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
        <Link
          href="/"
          style={{
            fontWeight: "bold",
            textDecoration: "none",
            color: "var(--text-main)",
          }}
        >
          🏠 Accueil
        </Link>

        {me && (
          <>
            <Link
              href={`/user/${encodeURIComponent(me.id)}`} // ✅ lien correct vers la collection de l'user
              style={{ textDecoration: "none", color: "var(--text-main)" }}
            >
              💼 Ma collection
            </Link>

            <Link
              href="/collections"
              style={{ textDecoration: "none", color: "var(--text-main)" }}
            >
              🃏 Collections des joueurs
            </Link>
          </>
        )}
      </div>

      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <ThemeToggle />
        {me && (
          <>
            <span style={{ fontWeight: "bold" }}>{me.label}</span>
            <button onClick={logout}>Déconnexion</button>
          </>
        )}
      </div>
    </nav>
  );
}
