"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Card = {
  id: number;
  name: string;
  image_url: string | null;
  code: string;
  rarity: string | null;
  color: string | null;
};

type RequestRow = {
  id: number;
  from_user_id: string;
  to_user_id: string;
  card_id: number;
  status: string;
  created_at: string;
  cards: Card;
  from_user: { display_name: string | null } | null;
  to_user: { display_name: string | null } | null;
};

// Format “Micku_san” → “Micku San”
function capitalizeWords(str: string) {
  return str
    .replace(/_/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapDbRowToRequestRow(r: any): RequestRow {
  const cardRaw = r.cards;
  const fromRaw = r.from_user;
  const toRaw = r.to_user;

  const card = Array.isArray(cardRaw) ? cardRaw[0] : cardRaw;
  const fromUser = Array.isArray(fromRaw) ? fromRaw[0] : fromRaw;
  const toUser = Array.isArray(toRaw) ? toRaw[0] : toRaw;

  return {
    id: r.id,
    from_user_id: r.from_user_id,
    to_user_id: r.to_user_id,
    card_id: r.card_id,
    status: r.status,
    created_at: r.created_at,
    cards: {
      id: card?.id,
      name: card?.name,
      image_url: card?.image_url ?? null,
      code: card?.code,
      rarity: card?.rarity ?? null,
      color: card?.color ?? null,
    },
    from_user: fromUser
      ? { display_name: fromUser.display_name ?? null }
      : null,
    to_user: toUser ? { display_name: toUser.display_name ?? null } : null,
  };
}

export default function TradesPage() {
  const [me, setMe] = useState<string | null>(null);
  const [requestsIn, setRequestsIn] = useState<RequestRow[]>([]);
  const [requestsOut, setRequestsOut] = useState<RequestRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setLoading(false);
        return;
      }
      setMe(user.id);

      // 📥 demandes reçues
      const { data: incoming } = await supabase
        .from("trade_requests")
        .select(
          `
          id,
          from_user_id,
          to_user_id,
          card_id,
          status,
          created_at,
          cards:card_id (*),
          from_user:from_user_id (display_name),
          to_user:to_user_id (display_name)
        `
        )
        .eq("to_user_id", user.id)
        .eq("status", "pending");

      // 📤 demandes envoyées
      const { data: outgoing } = await supabase
        .from("trade_requests")
        .select(
          `
          id,
          from_user_id,
          to_user_id,
          card_id,
          status,
          created_at,
          cards:card_id (*),
          from_user:from_user_id (display_name),
          to_user:to_user_id (display_name)
        `
        )
        .eq("from_user_id", user.id)
        .eq("status", "pending");

      setRequestsIn((incoming || []).map(mapDbRowToRequestRow));
      setRequestsOut((outgoing || []).map(mapDbRowToRequestRow));

      setLoading(false);
    };

    load();
  }, []);

  // Accepter (statut = accepted)
  const accept = async (req: RequestRow) => {
    await supabase
      .from("trade_requests")
      .update({ status: "accepted" })
      .eq("id", req.id);

    setRequestsIn((prev) => prev.filter((r) => r.id !== req.id));
  };

  // Refuser (statut = refused)
  const refuse = async (req: RequestRow) => {
    await supabase
      .from("trade_requests")
      .update({ status: "refused" })
      .eq("id", req.id);

    setRequestsIn((prev) => prev.filter((r) => r.id !== req.id));
  };

  if (loading) return <p style={{ padding: 16 }}>Chargement…</p>;
  if (!me)
    return <p style={{ padding: 16 }}>Connecte-toi pour voir tes échanges.</p>;

  return (
    <main style={{ padding: 16, display: "grid", gap: 32 }}>
      <h1>Demandes d’échange</h1>

      {/* 📥 DEMANDES REÇUES */}
      <section>
        <h2>📥 Demandes reçues</h2>

        {requestsIn.length === 0 && (
          <p style={{ opacity: 0.6 }}>Aucune demande pour le moment.</p>
        )}

        <div style={{ display: "grid", gap: 16 }}>
          {requestsIn.map((r) => (
            <article
              key={r.id}
              style={{
                background: "var(--card-bg)",
                padding: 16,
                borderRadius: 12,
                boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                display: "flex",
                gap: 16,
                alignItems: "center",
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={r.cards.image_url || "/no-image.png"}
                alt={r.cards.name}
                style={{ width: 80, height: 110, borderRadius: 8 }}
              />

              <div style={{ flex: 1 }}>
                <strong>
                  {capitalizeWords(r.from_user?.display_name || "Inconnu")}
                </strong>{" "}
                souhaite obtenir :
                <div style={{ marginTop: 6 }}>
                  <strong>{r.cards.code}</strong> — {r.cards.name}
                </div>
                <span style={{ opacity: 0.6, fontSize: 12 }}>
                  Reçu le {new Date(r.created_at).toLocaleString()}
                </span>
              </div>

              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={() => accept(r)}
                  style={{ background: "green", color: "white" }}
                >
                  Accepter
                </button>
                <button
                  onClick={() => refuse(r)}
                  style={{ background: "crimson", color: "white" }}
                >
                  Refuser
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* 📤 DEMANDES ENVOYÉES */}
      <section>
        <h2>📤 Demandes envoyées</h2>

        {requestsOut.length === 0 && (
          <p style={{ opacity: 0.6 }}>
            Tu n’as fait aucune demande pour l’instant.
          </p>
        )}

        <div style={{ display: "grid", gap: 16 }}>
          {requestsOut.map((r) => (
            <article
              key={r.id}
              style={{
                background: "var(--card-bg)",
                padding: 16,
                borderRadius: 12,
                boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                display: "flex",
                gap: 16,
                alignItems: "center",
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={r.cards.image_url || "/no-image.png"}
                alt={r.cards.name}
                style={{ width: 80, height: 110, borderRadius: 8 }}
              />

              <div style={{ flex: 1 }}>
                Demande envoyée à{" "}
                <strong>
                  {capitalizeWords(r.to_user?.display_name || "Inconnu")}
                </strong>
                <div style={{ marginTop: 6 }}>
                  <strong>{r.cards.code}</strong> — {r.cards.name}
                </div>
                <span style={{ opacity: 0.6, fontSize: 12 }}>
                  Envoyée le {new Date(r.created_at).toLocaleString()}
                </span>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
