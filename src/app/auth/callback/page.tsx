"use client";
import { useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function CallbackPage() {
  useEffect(() => {
    const run = async () => {
      await supabase.auth.exchangeCodeForSession(window.location.href);
      await supabase.auth.getSession();
      window.location.replace("/");
    };
    run();
  }, []);

  return <p className="page-message">Finalisation de la connexion…</p>;
}
