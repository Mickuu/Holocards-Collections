"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import ThemeToggle from "@/components/ThemeToggle";
import type { User } from "@supabase/supabase-js";

function capitalizeWords(str: string) {
  return str
    .replace(/_/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

type Me = { id: string; label: string };

export default function Navbar() {
  const [me, setMe] = useState<Me | null>(null);

  useEffect(() => {
    const buildLabel = (u: User | null): Me | null => {
      if (!u) return null;
      const raw =
        u.user_metadata?.full_name ||
        u.user_metadata?.user_name ||
        u.email ||
        u.id;
      return { id: u.id, label: capitalizeWords(String(raw)) };
    };

    const init = async () => {
      const { data } = await supabase.auth.getUser();
      setMe(buildLabel(data.user));
    };
    init();

    const { data: sub } = supabase.auth.onAuthStateChange((_evt, sess) =>
      setMe(buildLabel(sess?.user ?? null))
    );
    return () => sub.subscription.unsubscribe();
  }, []);

  const logout = async () => {
    await supabase.auth.signOut();
    setMe(null);
  };

  return (
    <nav>
      <div className="navbar-left">
        <Link href="/" className="nav-link nav-link-strong">🏠 Accueil</Link>

        {me && (
          <>
            <Link href={`/user/${me.id}`} className="nav-link">
              💼 Ma collection
            </Link>

            <Link href="/collections" className="nav-link">
              🃏 Collections des joueurs
            </Link>

            <Link href="/trades" className="nav-link">
              🔁 Échanges
            </Link>
          </>
        )}
      </div>

      <div className="navbar-right">
        <ThemeToggle />
        {me && (
          <>
            <span style={{ fontWeight: "bold" }}>{me.label}</span>
            <button className="btn btn-sm" onClick={logout}>
              Déconnexion
            </button>
          </>
        )}
      </div>
    </nav>
  );
}
