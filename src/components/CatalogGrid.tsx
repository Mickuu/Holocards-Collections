'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

type Card = {
  id: number
  code: string
  name: string
  rarity: string
  color: string
  support_type: string | null
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

  // Chargement user + cartes + collection
  useEffect(() => {
    const loadData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }
      setMe(user.id)

      const { data: cardsData } = await supabase.from('cards').select('*')
      const { data: ownedData } = await supabase
        .from('user_cards')
        .select('card_id, quantity')
        .eq('user_id', user.id)

      setCards(cardsData || [])
      setUserCards(ownedData || [])
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
        if (existing) return prev.map((uc) => uc.card_id === cardId ? { ...uc, quantity: uc.quantity + 1 } : uc)
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
      await supabase.from('user_cards').delete().eq('user_id', me).eq('card_id', cardId)
    } else {
      await supabase.from('user_cards')
        .update({ quantity: newQty })
        .eq('user_id', me)
        .eq('card_id', cardId)
    }

    setUserCards((prev) =>
      prev
        .map((uc) => (uc.card_id === cardId ? { ...uc, quantity: newQty } : uc))
        .filter((uc) => uc.quantity > 0)
    )
  }

  if (loading) return <p>Chargement du catalogue...</p>
  if (!me) return <p style={{ opacity: 0.7 }}>Connecte-toi pour gérer ta collection.</p>

  return (
    <section>
      <h2>Catalogue</h2>
      <div className="grid-view">
        {cards.map((card) => {
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
                <strong>{card.code}</strong>
                <span>{card.name}</span>
                <span>Rareté : {card.rarity}{card.color ? ` | ${card.color}` : ''}</span>
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
