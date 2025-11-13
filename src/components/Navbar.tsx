"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import type { User } from "@supabase/supabase-js";
import ThemeToggle from "@/components/ThemeToggle";

// "micku_san" → "Micku San"
function capitalizeWords(str: string) {
  return str
    .replace(/_/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

type Me = { id: string; label: string };

export default function Navbar() {
  const [me, setMe] = useState<Me | null>(null);

  useEffect(() => {
    const buildLabel = (user: User | null): Me | null => {
      if (!user) return null;

      const raw =
        user.user_metadata?.full_name ||
        user.user_metadata?.user_name ||
        user.email ||
        user.id;

      return {
        id: user.id,
        label: capitalizeWords(String(raw)),
      };
    };

    const init = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setMe(buildLabel(user));
    };
    init();

    const { data: sub } = supabase.auth.onAuthStateChange((_evt, session) => {
      setMe(buildLabel(session?.user ?? null));
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  const logout = async () => {
    await supabase.auth.signOut();
    setMe(null);
  };

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
              href={`/user/${encodeURIComponent(me.id)}`}
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

            {/* 🔁 Nouvelle page des échanges */}
            <Link
              href="/trades"
              style={{ textDecoration: "none", color: "var(--text-main)" }}
            >
              🔁 Échanges
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
