"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Card = {
  id: number;
  name: string;
  code: string;
  rarity: string | null;
  color: string | null;
  image_url: string | null;
  set_name: string; // 🔹 nécessaire pour filtrer par extension
};

type Row = {
  user_id: string;
  quantity: number;
  cards: Card;
  users: { display_name: string | null } | null;
};

type Group = {
  user_id: string;
  display_name: string;
  total: number;
  entries: { quantity: number; card: Card }[];
};

type TradeOffer = {
  user_id: string;
  card_id: number;
};

type TradeRequest = {
  to_user_id: string;
  card_id: number;
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

export default function CollectionsPage() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const [meId, setMeId] = useState<string | null>(null);
  const [offers, setOffers] = useState<TradeOffer[]>([]);
  const [requests, setRequests] = useState<TradeRequest[]>([]);

  // 🔹 Filtres
  const [sets, setSets] = useState<string[]>([]);
  const [selectedSet, setSelectedSet] = useState<string | null>(null);

  // Chargement user + cartes + offres d'échange + demandes
  useEffect(() => {
    const run = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setMeId(user?.id ?? null);

      const { data, error } = await supabase
        .from("user_cards")
        .select(
          `
          user_id,
          quantity,
          cards:cards!fk_usercards_card (*),
          users:users!fk_usercards_user (display_name)
        `
        )
        .gt("quantity", 0);

      if (error) {
        setError(error.message);
        return;
      }

      const typedRows = (data || []) as unknown as Row[];
      setRows(typedRows);

      // 🟦 liste des extensions uniques (set_name)
      const uniqueSets = Array.from(
        new Set(
          typedRows
            .map((r) => r.cards.set_name)
            .filter((s): s is string => !!s)
        )
      ).sort();
      setSets(uniqueSets);

      const { data: offersData } = await supabase
        .from("trade_offers")
        .select("user_id, card_id");
      setOffers((offersData || []) as TradeOffer[]);

      if (user) {
        const { data: requestsData } = await supabase
          .from("trade_requests")
          .select("to_user_id, card_id")
          .eq("from_user_id", user.id)
          .eq("status", "pending");
        setRequests((requestsData || []) as TradeRequest[]);
      }
    };

    run();
  }, []);

  // Regroupe les offres par user_id → Set<card_id>
  const offersByUser = useMemo(() => {
    const m = new Map<string, Set<number>>();
    for (const o of offers) {
      const set = m.get(o.user_id) ?? new Set<number>();
      set.add(o.card_id);
      m.set(o.user_id, set);
    }
    return m;
  }, [offers]);

  // Tes cartes marquées "en échange" → Set<card_id>
  const myOffersSet = useMemo(() => {
    if (!meId) return new Set<number>();
    return offersByUser.get(meId) ?? new Set<number>();
  }, [meId, offersByUser]);

  // Tes demandes par cible → Map<to_user_id, Set<card_id>>
  const myRequestsByUser = useMemo(() => {
    const m = new Map<string, Set<number>>();
    for (const r of requests) {
      const set = m.get(r.to_user_id) ?? new Set<number>();
      set.add(r.card_id);
      m.set(r.to_user_id, set);
    }
    return m;
  }, [requests]);

  // 🧮 Regroupement par joueur
  const groups: Group[] = useMemo(() => {
    if (!rows) return [];
    const m = new Map<string, Group>();

    for (const r of rows) {
      const rawName =
        r.users?.display_name || `Utilisateur ${r.user_id.slice(0, 6)}…`;
      const displayName = capitalizeWords(rawName);

      const g = m.get(r.user_id) ?? {
        user_id: r.user_id,
        display_name: displayName,
        total: 0,
        entries: [],
      };

      g.total += r.quantity;
      g.entries.push({ quantity: r.quantity, card: r.cards });
      m.set(r.user_id, g);
    }

    return [...m.values()].sort((a, b) => b.total - a.total);
  }, [rows]);

  // 🧮 Ta collection (card_id → qty)
  const myCards = useMemo(() => {
    if (!meId || !rows) return new Map<number, number>();
    const m = new Map<number, number>();
    for (const r of rows) {
      if (r.user_id === meId) {
        const id = r.cards.id;
        m.set(id, (m.get(id) ?? 0) + r.quantity);
      }
    }
    return m;
  }, [meId, rows]);

  // 🔍 Filtre recherche par joueur
  const filteredGroups = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return groups;
    return groups.filter(
      (g) =>
        g.display_name.toLowerCase().includes(q) ||
        g.user_id.toLowerCase().includes(q)
    );
  }, [groups, search]);

  // Toggle d'une carte offerte par toi
  const toggleTradeSelection = async (cardId: number) => {
    if (!meId) return;

    const isSelected = offers.some(
      (o) => o.user_id === meId && o.card_id === cardId
    );

    if (isSelected) {
      await supabase
        .from("trade_offers")
        .delete()
        .eq("user_id", meId)
        .eq("card_id", cardId);

      setOffers((prev) =>
        prev.filter((o) => !(o.user_id === meId && o.card_id === cardId))
      );
    } else {
      await supabase.from("trade_offers").upsert({
        user_id: meId,
        card_id: cardId,
      });

      setOffers((prev) => [...prev, { user_id: meId, card_id: cardId }]);
    }
  };

  // Toggle d'une DEMANDE de carte à un autre joueur
  const toggleRequest = async (toUserId: string, cardId: number) => {
    if (!meId) return;

    const isRequested = requests.some(
      (r) => r.to_user_id === toUserId && r.card_id === cardId
    );

    if (isRequested) {
      await supabase
        .from("trade_requests")
        .delete()
        .eq("from_user_id", meId)
        .eq("to_user_id", toUserId)
        .eq("card_id", cardId)
        .eq("status", "pending");

      setRequests((prev) =>
        prev.filter(
          (r) => !(r.to_user_id === toUserId && r.card_id === cardId)
        )
      );
    } else {
      await supabase.from("trade_requests").upsert({
        from_user_id: meId,
        to_user_id: toUserId,
        card_id: cardId,
        status: "pending",
      });

      setRequests((prev) => [...prev, { to_user_id: toUserId, card_id: cardId }]);
    }
  };

  if (error) return <p style={{ color: "crimson" }}>Erreur : {error}</p>;
  if (!rows) return <p>Chargement des collections…</p>;
  if (!groups.length)
    return <p style={{ opacity: 0.7 }}>Aucune collection trouvée.</p>;

  return (
    <main style={{ display: "grid", gap: 16 }}>
      <h1>Collections des joueurs</h1>

      {/* Barre de recherche + filtre extensions */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 10,
          alignItems: "center",
        }}
      >
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher un joueur..."
          style={{
            maxWidth: 360,
            padding: 8,
            borderRadius: 8,
            border: "1px solid #ccc",
          }}
        />

        {sets.length > 0 && (
          <select
            value={selectedSet ?? ""}
            onChange={(e) => setSelectedSet(e.target.value || null)}
            style={{
              maxWidth: 260,
              padding: 8,
              borderRadius: 8,
              border: "1px solid #ccc",
            }}
          >
            <option value="">Toutes les extensions</option>
            {sets.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        )}
      </div>

      <ul style={{ display: "grid", gap: 12 }}>
        {filteredGroups.map((g) => {
          // 💱 Potentiel d’échange avec le user connecté
          const wantFromThem: Card[] = [];
          const canOffer: Card[] = [];

          if (meId && meId !== g.user_id && myCards.size) {
            // cartes où il/elle a des doubles et toi 0
            for (const { quantity, card } of g.entries) {
              const myQty = myCards.get(card.id) ?? 0;
              if (quantity > 1 && myQty === 0) {
                wantFromThem.push(card);
              }
            }

            // cartes où toi tu as des doubles et lui/elle 0
            const theyHave = new Set(g.entries.map((e) => e.card.id));
            myCards.forEach((myQty, cardId) => {
              if (myQty > 1 && !theyHave.has(cardId) && rows) {
                const anyRow = rows.find(
                  (r) => r.user_id === meId && r.cards.id === cardId
                );
                if (anyRow) {
                  canOffer.push(anyRow.cards);
                }
              }
            });
          }

          const theirOffersSet =
            offersByUser.get(g.user_id) ?? new Set<number>();
          const myRequestsForThisUser =
            myRequestsByUser.get(g.user_id) ?? new Set<number>();

          const wantFromThemVisible = wantFromThem.filter((c) =>
            theirOffersSet.has(c.id)
          );
          const canOfferVisible = canOffer;

          const hasTradeContent =
            (wantFromThemVisible.length > 0 || canOfferVisible.length > 0) &&
            meId &&
            meId !== g.user_id;

          return (
            <li
              key={g.user_id}
              style={{
                background: "var(--card-bg)",
                borderRadius: 10,
                boxShadow: "0 2px 6px rgba(0,0,0,0.08)",
                padding: 12,
              }}
            >
              <div
                onClick={() =>
                  setExpanded((p) => (p === g.user_id ? null : g.user_id))
                }
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  cursor: "pointer",
                }}
              >
                <strong>{g.display_name}</strong>
                <span style={{ opacity: 0.8 }}>
                  {g.total} carte{g.total > 1 ? "s" : ""}{" "}
                  {expanded === g.user_id ? "▲" : "▼"}
                </span>
              </div>

              {expanded === g.user_id && (
                <div style={{ marginTop: 12 }}>
                  {/* ⚔️ Bloc d’échanges RPG */}
                  {hasTradeContent && (
                    <div className="trade-panel">
                      <div className="trade-header">
                        <div className="trade-title">
                          🔁 POTENTIEL D’ÉCHANGE AVEC TOI
                        </div>
                        <div className="trade-subtitle">
                          Compare ta collection avec{" "}
                          <strong>{g.display_name}</strong>
                        </div>
                      </div>

                      <div className="trade-grid">
                        {canOfferVisible.length > 0 && meId && (
                          <div className="trade-side">
                            <div className="trade-side-title">
                              ⚔️ Cartes que tu proposes
                              <br />
                              <span
                                style={{ fontSize: 11, opacity: 0.8 }}
                              >
                                (Clique pour ajouter/enlever de ta liste
                                d’échange)
                              </span>
                            </div>
                            <div className="trade-card-list">
                              {canOfferVisible.map((c) => {
                                const isSelected = myOffersSet.has(c.id);
                                return (
                                  <div
                                    key={"co-" + c.id}
                                    className={`trade-card ${
                                      isSelected ? "selected" : ""
                                    }`}
                                    onClick={() =>
                                      toggleTradeSelection(c.id)
                                    }
                                  >
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                      src={c.image_url || "/no-image.png"}
                                      alt={c.name}
                                      className="trade-card-img"
                                    />
                                    {isSelected && (
                                      <div className="trade-card-check">
                                        ✔
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Grille des cartes du joueur */}
                  <div className="grid-view">
                    {g.entries
                      .filter(({ card }) =>
                        selectedSet ? card.set_name === selectedSet : true
                      )
                      .map(({ quantity, card }) => {
                        const isMe = g.user_id === meId;
                        const isRequested =
                          !isMe && myRequestsForThisUser.has(card.id);

                        const handleClick = () => {
                          if (!meId) return;
                          if (isMe) return; // on ne demande pas ses propres cartes
                          toggleRequest(g.user_id, card.id);
                        };

                        return (
                          <article
                            key={card.id}
                            className="card"
                            onClick={handleClick}
                            style={{
                              position: "relative",
                              padding: 6,
                              cursor:
                                !meId || isMe ? "default" : "pointer",
                              boxShadow: isRequested
                                ? "0 0 10px rgba(80,160,255,0.8)"
                                : undefined,
                              outline: isRequested
                                ? "2px solid rgba(80,160,255,0.9)"
                                : "none",
                            }}
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={card.image_url || "/no-image.png"}
                              alt={card.name}
                            />
                            <span
                              style={{
                                position: "absolute",
                                top: 8,
                                right: 8,
                                background: "var(--accent)",
                                color: "#fff",
                                fontWeight: 700,
                                fontSize: 12,
                                padding: "2px 6px",
                                borderRadius: 999,
                                boxShadow:
                                  "0 2px 8px rgba(0,0,0,0.2)",
                              }}
                            >
                              ×{quantity}
                            </span>

                            {isRequested && (
                              <span
                                style={{
                                  position: "absolute",
                                  bottom: 6,
                                  right: 6,
                                  background:
                                    "rgba(80,160,255,0.95)",
                                  color: "#000",
                                  fontWeight: 900,
                                  fontSize: 11,
                                  padding: "2px 6px",
                                  borderRadius: 999,
                                  border: "1px solid #000",
                                }}
                              >
                                ★ Demandée
                              </span>
                            )}

                            <div className="card-content">
                              <strong>{card.code}</strong>
                              <span>{card.name}</span>
                              <span>
                                {card.rarity ?? ""}
                                {card.color ? ` | ${card.color}` : ""}
                              </span>
                            </div>
                          </article>
                        );
                      })}
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </main>
  );
}
