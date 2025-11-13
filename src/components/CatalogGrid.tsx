'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

type Card = {
  id: number
  set_name: string
  collector_no: string
  name: string
  rarity_code: string | null
  colors: string | null
  is_support: boolean | null
  image_url: string | null
}

type UserCard = {
  card_id: number
  quantity: number
}

export default function CatalogGrid() {
  const [cards, setCards] = useState<Card[]>([])
  const [userCards, setUserCards] = useState<UserCard[]>([])
  const [me, setMe] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const [sets, setSets] = useState<string[]>([])
  const [selectedSet, setSelectedSet] = useState<string | null>(null)

  // Chargement user + cartes + collection
  useEffect(() => {
    const loadData = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        setLoading(false)
        return
      }
      setMe(user.id)

      // 🔹 On récupère les colonnes dont on a besoin, avec set_name
      const { data: cardsData } = await supabase
        .from('cards')
        .select(
          'id, set_name, collector_no, name, rarity_code, colors, image_url, is_support'
        )

      const { data: ownedData } = await supabase
        .from('user_cards')
        .select('card_id, quantity')
        .eq('user_id', user.id)

      const allCards = (cardsData || []) as Card[]
      setCards(allCards)
      setUserCards((ownedData || []) as UserCard[])

      // 🔹 Liste des sets distincts
      const uniqueSets = Array.from(
        new Set(allCards.map((c) => c.set_name).filter(Boolean))
      ).sort()
      setSets(uniqueSets)
      // Si aucun set sélectionné, on prend le premier
      setSelectedSet((prev) => prev ?? (uniqueSets[0] ?? null))

      setLoading(false)
    }
    loadData()
  }, [])

  const getQuantity = (cardId: number) =>
    userCards.find((uc) => uc.card_id === cardId)?.quantity || 0

  // +1
  const addCard = async (cardId: number) => {
    if (!me) return
    const current = getQuantity(cardId)
    const { error } = await supabase
      .from('user_cards')
      .upsert({ user_id: me, card_id: cardId, quantity: current + 1 })
    if (!error) {
      setUserCards((prev) => {
        const existing = prev.find((uc) => uc.card_id === cardId)
        if (existing)
          return prev.map((uc) =>
            uc.card_id === cardId ? { ...uc, quantity: uc.quantity + 1 } : uc
          )
        return [...prev, { card_id: cardId, quantity: 1 }]
      })
    }
  }

  // -1
  const removeCard = async (cardId: number) => {
    if (!me) return
    const current = getQuantity(cardId)
    if (current <= 0) return
    const newQty = current - 1

    if (newQty === 0) {
      await supabase
        .from('user_cards')
        .delete()
        .eq('user_id', me)
        .eq('card_id', cardId)
    } else {
      await supabase
        .from('user_cards')
        .update({ quantity: newQty })
        .eq('user_id', me)
        .eq('card_id', cardId)
    }

    setUserCards((prev) =>
      prev
        .map((uc) =>
          uc.card_id === cardId ? { ...uc, quantity: newQty } : uc
        )
        .filter((uc) => uc.quantity > 0)
    )
  }

  if (loading) return <p>Chargement du catalogue...</p>
  if (!me) return <p style={{ opacity: 0.7 }}>Connecte-toi pour gérer ta collection.</p>

  // 🃏 Cartes filtrées par set sélectionné
  const visibleCards = selectedSet
    ? cards.filter((c) => c.set_name === selectedSet)
    : cards

  return (
    <section>
      {/* Titre = nom du set + select pour changer de set */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 12,
          marginBottom: 12,
        }}
      >
        <h2 style={{ margin: 0 }}>{selectedSet || 'Catalogue'}</h2>

        {sets.length > 0 && (
          <select
            value={selectedSet ?? ''}
            onChange={(e) => setSelectedSet(e.target.value || null)}
          >
            {sets.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        )}
      </div>

      <div className="grid-view">
        {visibleCards.map((card) => {
          const qty = getQuantity(card.id)
          const isOwned = qty > 0

          return (
            <article
              key={card.id}
              className="card"
              style={{
                position: 'relative',
                opacity: isOwned ? 1 : 0.4,
                filter: isOwned ? 'none' : 'grayscale(100%)',
                transition: 'transform .2s, filter .3s, opacity .3s',
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={card.image_url || '/no-image.png'}
                alt={card.name}
                style={{ borderRadius: 10 }}
              />

              {/* 🔵 Badge quantité en haut-droite si possédée */}
              {qty > 0 && (
                <span
                  aria-label={`Quantité possédée ${qty}`}
                  style={{
                    position: 'absolute',
                    top: 8,
                    right: 8,
                    background: 'var(--accent)',
                    color: '#fff',
                    fontWeight: 700,
                    fontSize: 12,
                    padding: '2px 8px',
                    borderRadius: 999,
                    boxShadow: '0 2px 8px rgba(0,0,0,.2)',
                    userSelect: 'none',
                  }}
                >
                  ×{qty}
                </span>
              )}

              <div className="card-content">
                <strong>
                  [{card.set_name}] {card.collector_no}
                </strong>
                <span>{card.name}</span>
                <span>
                  Rareté : {card.rarity_code}
                  {card.colors ? ` | ${card.colors}` : ''}
                </span>
              </div>

              {/* Boutons + / − */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'center',
                  gap: 8,
                  marginTop: 8,
                }}
              >
                <button
                  onClick={() => addCard(card.id)}
                  aria-label="Ajouter un exemplaire"
                  style={{ padding: '4px 10px', fontSize: 14 }}
                >
                  +
                </button>
                <button
                  onClick={() => removeCard(card.id)}
                  aria-label="Retirer un exemplaire"
                  disabled={qty === 0}
                  style={{ padding: '4px 10px', fontSize: 14 }}
                >
                  −
                </button>
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}
