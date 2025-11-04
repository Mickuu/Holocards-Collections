'use client'
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

type Card = {
  id: number
  name: string
  code: string
  rarity: string | null
  color: string | null
  image_url: string | null
}

type Row = {
  user_id: string
  quantity: number
  cards: Card                    // ← objet unique (grâce au nom de FK)
  users: { display_name: string | null } | null
}

type Group = {
  user_id: string
  display_name: string
  total: number
  entries: { quantity: number; card: Card }[]
}

export default function CollectionsPage() {
  const [rows, setRows] = useState<Row[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  useEffect(() => {
    const run = async () => {
      // 👇 On précise la relation par le NOM de la contrainte FK
      //    cards:cards!fk_usercards_card(*) => 1 seule carte (objet)
      //    users:users!fk_usercards_user(display_name) => user (objet)
      const { data, error } = await supabase
        .from('user_cards')
        .select(
          `
          user_id,
          quantity,
          cards:cards!fk_usercards_card (*),
          users:users!fk_usercards_user (display_name)
        `
        )
        .gt('quantity', 0)

      if (error) setError(error.message)
      else setRows(data as unknown as Row[])
    }
    run()
  }, [])

  const groups: Group[] = useMemo(() => {
    if (!rows) return []
    const m = new Map<string, Group>()
    for (const r of rows) {
      const g =
        m.get(r.user_id) ??
        {
          user_id: r.user_id,
          display_name:
            r.users?.display_name || `Utilisateur ${r.user_id.slice(0, 6)}…`,
          total: 0,
          entries: [],
        }
      g.total += r.quantity
      g.entries.push({ quantity: r.quantity, card: r.cards })
      m.set(r.user_id, g)
    }
    return [...m.values()].sort((a, b) => b.total - a.total)
  }, [rows])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return groups
    return groups.filter(
      (g) =>
        g.display_name.toLowerCase().includes(q) ||
        g.user_id.toLowerCase().includes(q)
    )
  }, [groups, search])

  if (error) return <p style={{ color: 'crimson' }}>Erreur : {error}</p>
  if (!rows) return <p>Chargement des collections…</p>
  if (!groups.length) return <p style={{ opacity: 0.7 }}>Aucune collection trouvée.</p>

  return (
    <main style={{ display: 'grid', gap: 16 }}>
      <h1>Collections des joueurs</h1>

      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Rechercher un joueur…"
        style={{ maxWidth: 360, padding: 8, borderRadius: 8, border: '1px solid #ccc' }}
      />

      <ul style={{ display: 'grid', gap: 12 }}>
        {filtered.map((g) => (
          <li
            key={g.user_id}
            style={{
              background: 'var(--card-bg)',
              borderRadius: 10,
              boxShadow: '0 2px 6px rgba(0,0,0,0.08)',
              padding: 12,
            }}
          >
            <div
              onClick={() =>
                setExpanded((p) => (p === g.user_id ? null : g.user_id))
              }
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                cursor: 'pointer',
              }}
            >
              <strong>{g.display_name}</strong>
              <span style={{ opacity: 0.8 }}>
                {g.total} carte{g.total > 1 ? 's' : ''}{' '}
                {expanded === g.user_id ? '▲' : '▼'}
              </span>
            </div>

            {expanded === g.user_id && (
              <div style={{ marginTop: 12 }}>
                <div className="grid-view">
                  {g.entries.map(({ quantity, card }) => (
                    <article key={card.id} className="card" style={{ position: 'relative', padding: 6 }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={card.image_url || '/no-image.png'} alt={card.name} />
                      <span
                        style={{
                          position: 'absolute',
                          top: 8,
                          right: 8,
                          background: 'var(--accent)',
                          color: '#fff',
                          fontWeight: 700,
                          fontSize: 12,
                          padding: '2px 6px',
                          borderRadius: 999,
                          boxShadow: '0 2px 8px rgba(0,0,0,.2)',
                        }}
                      >
                        ×{quantity}
                      </span>
                      <div className="card-content">
                        <strong>{card.code}</strong>
                        <span>{card.name}</span>
                        <span>
                          {card.rarity ?? ''}
                          {card.color ? ` | ${card.color}` : ''}
                        </span>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>
    </main>
  )
}
