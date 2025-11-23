"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Card = {
  id: number;
  name: string;
  image_url: string | null;
  code: string; // collector_no
  rarity: string | null; // rarity_code
  color: string | null; // colors
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

type SessionRow = {
  id: number;
  requester_id: string;
  owner_id: string;
  card_id: number;
  status: string;
  created_at: string;
  confirmed_by_requester: boolean;
  confirmed_by_owner: boolean;
  cards: Card;
  requester: { display_name: string | null } | null;
  owner: { display_name: string | null } | null;
};

// "micku_san" → "Micku San"
function capitalizeWords(str: string) {
  return str
    .replace(/_/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapDbRequestRow(r: any): RequestRow {
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
      code: card?.collector_no,
      rarity: card?.rarity_code ?? null,
      color: card?.colors ?? null,
    },
    from_user: fromUser
      ? { display_name: fromUser.display_name ?? null }
      : null,
    to_user: toUser ? { display_name: toUser.display_name ?? null } : null,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapDbSessionRow(r: any): SessionRow {
  const cardRaw = r.cards;
  const requesterRaw = r.requester;
  const ownerRaw = r.owner;

  const card = Array.isArray(cardRaw) ? cardRaw[0] : cardRaw;
  const requester = Array.isArray(requesterRaw) ? requesterRaw[0] : requesterRaw;
  const owner = Array.isArray(ownerRaw) ? ownerRaw[0] : ownerRaw;

  return {
    id: r.id,
    requester_id: r.requester_id,
    owner_id: r.owner_id,
    card_id: r.card_id,
    status: r.status,
    created_at: r.created_at,
    confirmed_by_requester: !!r.confirmed_by_requester,
    confirmed_by_owner: !!r.confirmed_by_owner,
    cards: {
      id: card?.id,
      name: card?.name,
      image_url: card?.image_url ?? null,
      code: card?.collector_no,
      rarity: card?.rarity_code ?? null,
      color: card?.colors ?? null,
    },
    requester: requester
      ? { display_name: requester.display_name ?? null }
      : null,
    owner: owner ? { display_name: owner.display_name ?? null } : null,
  };
}

type TabKey = "received" | "sent" | "sessions" | "history";

export default function TradesPage() {
  const [me, setMe] = useState<string | null>(null);
  const [requestsIn, setRequestsIn] = useState<RequestRow[]>([]);
  const [requestsOut, setRequestsOut] = useState<RequestRow[]>([]);
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [history, setHistory] = useState<SessionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>("received");

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

      // 📥 Demandes reçues (pending)
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

      // 📤 Demandes envoyées (pending)
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

      // 🔄 Sessions IRL en cours (non completed)
      const { data: sessionsRaw } = await supabase
        .from("trade_sessions")
        .select(
          `
          id,
          requester_id,
          owner_id,
          card_id,
          status,
          created_at,
          confirmed_by_requester,
          confirmed_by_owner,
          cards:card_id (*),
          requester:requester_id (display_name),
          owner:owner_id (display_name)
        `
        )
        .or(`requester_id.eq.${user.id},owner_id.eq.${user.id}`)
        .neq("status", "completed");

      // 📜 Historique des échanges complétés
      const { data: historyRaw } = await supabase
        .from("trade_sessions")
        .select(
          `
          id,
          requester_id,
          owner_id,
          card_id,
          status,
          created_at,
          confirmed_by_requester,
          confirmed_by_owner,
          cards:card_id (*),
          requester:requester_id (display_name),
          owner:owner_id (display_name)
        `
        )
        .or(`requester_id.eq.${user.id},owner_id.eq.${user.id}`)
        .eq("status", "completed")
        .order("created_at", { ascending: false });

      setRequestsIn((incoming || []).map(mapDbRequestRow));
      setRequestsOut((outgoing || []).map(mapDbRequestRow));
      setSessions((sessionsRaw || []).map(mapDbSessionRow));
      setHistory((historyRaw || []).map(mapDbSessionRow));

      setLoading(false);
    };

    load();
  }, []);

  // ✅ Accepter → passe la demande en accepted + crée une session IRL
  const accept = async (req: RequestRow) => {
    // 1) mettre la demande à "accepted"
    await supabase
      .from("trade_requests")
      .update({ status: "accepted" })
      .eq("id", req.id);

    // 2) créer la session + récupérer la ligne complète (avec cartes + users)
    const { data: inserted, error: insertError } = await supabase
      .from("trade_sessions")
      .insert({
        requester_id: req.from_user_id,
        owner_id: req.to_user_id,
        card_id: req.card_id,
        status: "waiting_real_life",
      })
      .select(
        `
        id,
        requester_id,
        owner_id,
        card_id,
        status,
        created_at,
        confirmed_by_requester,
        confirmed_by_owner,
        cards:card_id (*),
        requester:requester_id (display_name),
        owner:owner_id (display_name)
      `
      )
      .single();

    if (insertError) {
      console.error("Erreur insert trade_sessions:", insertError.message);
    } else if (inserted) {
      // 3) mettre à jour la liste des sessions en cours côté front
      setSessions((prev) => [...prev, mapDbSessionRow(inserted)]);
    }

    // 4) retirer la demande de la liste "Demandes reçues"
    setRequestsIn((prev) => prev.filter((r) => r.id !== req.id));
  };

  // ❌ Refuser
  const refuse = async (req: RequestRow) => {
    await supabase
      .from("trade_requests")
      .update({ status: "refused" })
      .eq("id", req.id);

    setRequestsIn((prev) => prev.filter((r) => r.id !== req.id));
  };

  // ✅ 1 clic = échange terminé
  const confirmSession = async (session: SessionRow) => {
    if (!me) return;

    // On met les deux flags à true + status=completed côté BDD
    await supabase
      .from("trade_sessions")
      .update({
        confirmed_by_requester: true,
        confirmed_by_owner: true,
        status: "completed",
      })
      .eq("id", session.id);

    // On applique la RPC qui bouge la carte d’un user à l’autre
    await supabase.rpc("finalize_trade", {
      p_owner_id: session.owner_id,
      p_requester_id: session.requester_id,
      p_card_id: session.card_id,
    });

    // On retire de la liste "en cours"
    setSessions((prev) => prev.filter((s) => s.id !== session.id));

    // On ajoute en haut de l’historique côté front
    setHistory((prev) => [
      {
        ...session,
        status: "completed",
        confirmed_by_owner: true,
        confirmed_by_requester: true,
      },
      ...prev,
    ]);
  };

  if (loading) return <p style={{ padding: 16 }}>Chargement…</p>;
  if (!me)
    return (
      <p style={{ padding: 16 }}>
        Connecte-toi pour voir tes échanges.
      </p>
    );

  return (
    <main style={{ padding: 16, display: "grid", gap: 24 }}>
      {/* Titre + onglets RPG */}
      <div style={{ marginBottom: 4 }}>
        <h1 style={{ marginBottom: 12 }}>Échanges</h1>
        <div
          style={{
            display: "flex",
            gap: 10,
            flexWrap: "wrap",
          }}
        >
          <button
            className={`trade-tab ${
              activeTab === "received" ? "active" : ""
            }`}
            onClick={() => setActiveTab("received")}
          >
            🔮 Reçues ({requestsIn.length})
          </button>
          <button
            className={`trade-tab ${activeTab === "sent" ? "active" : ""}`}
            onClick={() => setActiveTab("sent")}
          >
            📤 Envoyées ({requestsOut.length})
          </button>
          <button
            className={`trade-tab ${
              activeTab === "sessions" ? "active" : ""
            }`}
            onClick={() => setActiveTab("sessions")}
          >
            🔁 En cours ({sessions.length})
          </button>
          <button
            className={`trade-tab ${
              activeTab === "history" ? "active" : ""
            }`}
            onClick={() => setActiveTab("history")}
          >
            📜 Historique ({history.length})
          </button>
        </div>
      </div>

      {/* 📥 DEMANDES REÇUES */}
      {activeTab === "received" && (
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
      )}

      {/* 📤 DEMANDES ENVOYÉES */}
      {activeTab === "sent" && (
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
      )}

      {/* 🔄 ÉCHANGES IRL EN COURS */}
      {activeTab === "sessions" && (
        <section>
          <h2>🔄 Échanges en cours (à valider en vrai)</h2>

          {sessions.length === 0 && (
            <p style={{ opacity: 0.6 }}>Aucun échange IRL en cours.</p>
          )}

          <div style={{ display: "grid", gap: 16 }}>
            {sessions.map((s) => {
              const isRequester = s.requester_id === me;
              const otherName = capitalizeWords(
                isRequester
                  ? s.owner?.display_name || "Inconnu"
                  : s.requester?.display_name || "Inconnu"
              );

              return (
                <article
                  key={s.id}
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
                    src={s.cards.image_url || "/no-image.png"}
                    alt={s.cards.name}
                    style={{ width: 80, height: 110, borderRadius: 8 }}
                  />

                  <div style={{ flex: 1 }}>
                    <strong>{otherName}</strong> est en échange avec toi pour :
                    <div style={{ marginTop: 6 }}>
                      <strong>{s.cards.code}</strong> — {s.cards.name}
                    </div>

                    <div
                      style={{
                        marginTop: 6,
                        opacity: 0.8,
                        fontSize: 13,
                      }}
                    >
                      ✔ Demandeur confirmé — ✔ Donneur confirmé
                    </div>

                    <span style={{ opacity: 0.6, fontSize: 12 }}>
                      Créé le {new Date(s.created_at).toLocaleString()}
                    </span>
                  </div>

                  <button
                    onClick={() => confirmSession(s)}
                    style={{ background: "green", color: "white" }}
                  >
                    Confirmer IRL
                  </button>
                </article>
              );
            })}
          </div>
        </section>
      )}

      {/* 📜 HISTORIQUE DES ÉCHANGES VALIDÉS */}
      {activeTab === "history" && (
        <section>
          <h2>📜 Historique des échanges validés</h2>

          {history.length === 0 && (
            <p style={{ opacity: 0.6 }}>
              Aucun échange validé pour le moment.
            </p>
          )}

          <div style={{ display: "grid", gap: 16 }}>
            {history.map((h) => (
              <article
                key={h.id}
                style={{
                  background: "var(--card-bg)",
                  padding: 16,
                  borderRadius: 12,
                  boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
                  display: "flex",
                  gap: 16,
                  alignItems: "center",
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={h.cards.image_url || "/no-image.png"}
                  alt={h.cards.name}
                  style={{ width: 80, height: 110, borderRadius: 8 }}
                />

                <div style={{ flex: 1 }}>
                  <div>
                    Échange entre{" "}
                    <strong>
                      {capitalizeWords(
                        h.requester?.display_name || "Inconnu"
                      )}
                    </strong>{" "}
                    et{" "}
                    <strong>
                      {capitalizeWords(h.owner?.display_name || "Inconnu")}
                    </strong>
                  </div>

                  <div style={{ marginTop: 6 }}>
                    <strong>{h.cards.code}</strong> — {h.cards.name}
                  </div>

                  <span style={{ opacity: 0.6, fontSize: 12 }}>
                    Validé le {new Date(h.created_at).toLocaleString()}
                  </span>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
