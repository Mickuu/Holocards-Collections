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
    <nav>
      <div className="navbar-left">
        <Link href="/" className="nav-link nav-link-strong">
          🏠 Accueil
        </Link>

        {me && (
          <>
            <Link
              href={`/user/${encodeURIComponent(me.id)}`}
              className="nav-link"
            >
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
