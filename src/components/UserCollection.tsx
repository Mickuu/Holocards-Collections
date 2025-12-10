"use client"
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

type CollectionRow = {
  card_id: number
  set_code: string        // = set_name dans la vue
  collector_no: string
  card_name: string
  image_url: string | null
  quantity: number
  user_id: string
  user_display_name: string

  // champs supplémentaires pour les filtres
  rarity_code: string | null
  colors: string | null
  is_support: boolean | null
}

type SetTotalRow = {
  set_name: string
  set_code: string
  total_cards: number
}

type UserCompletionRow = {
  user_id: string
  user_display_name: string
  set_name: string
  set_code: string
  total_cards: number
  owned_unique: number
  completion_percent: number
}

type CardSet = {
  name: string
  code: string
  total_cards: number
}

type PinnedRow = {
  card_id: number
  position: number
}

// "micku_san" → "Micku San"
function capitalizeWords(str: string) {
  return str
    .replace(/_/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ')
}

export default function UserCollection({
  userId,
  editable = true,
}: {
  userId: string
  editable?: boolean
}) {
  const [collection, setCollection] = useState<CollectionRow[] | null>(null)
  const [setTotals, setSetTotals] = useState<CardSet[]>([])
  const [completion, setCompletion] = useState<UserCompletionRow[]>([])
  const [pinned, setPinned] = useState<PinnedRow[]>([])

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [updating, setUpdating] = useState<number | null>(null)

  const [selectedSet, setSelectedSet] = useState<string | null>(null)
  const [ownedUnique, setOwnedUnique] = useState(0)
  const [totalCards, setTotalCards] = useState(0)

  // 🔹 filtres (comme sur la Home)
  const [rarities, setRarities] = useState<string[]>([])
  const [selectedRarity, setSelectedRarity] = useState<string | null>(null)

  const [colors, setColors] = useState<string[]>([])
  const [selectedColor, setSelectedColor] = useState<string | null>(null)

  const [names, setNames] = useState<string[]>([])
  const [selectedName, setSelectedName] = useState<string | null>(null)

  // ─────────────────────────────────────
  // Chargement initial
  // ─────────────────────────────────────
  useEffect(() => {
    let cancelled = false

    const load = async () => {
      setLoading(true)
      setError(null)

      const [collRes, totalsRes, completionRes, pinnedRes] = await Promise.all([
        supabase
          .from('v_user_collection_detailed')
          .select('*')
          .eq('user_id', userId)
          .order('set_code')
          .order('collector_no'),
        supabase.from('v_set_totals').select('set_name, set_code, total_cards'),
        supabase
          .from('v_user_set_completion')
          .select('*')
          .eq('user_id', userId),
        supabase
          .from('user_pinned_cards')
          .select('card_id, position')
          .eq('user_id', userId)
          .order('position'),
      ])

      if (cancelled) return

      if (collRes.error) {
        setError(collRes.error.message)
        setLoading(false)
        return
      }
      if (totalsRes.error) {
        setError(totalsRes.error.message)
        setLoading(false)
        return
      }
      if (completionRes.error) {
        setError(completionRes.error.message)
        setLoading(false)
        return
      }
      if (pinnedRes.error) {
        console.error('Erreur user_pinned_cards:', pinnedRes.error.message)
      }

      const collRows = (collRes.data || []) as CollectionRow[]
      setCollection(collRows)

      const totalsRows = (totalsRes.data || []) as SetTotalRow[]
      const sets: CardSet[] = totalsRows
        .map((r) => ({
          name: r.set_name,
          code: r.set_code,
          total_cards: r.total_cards,
        }))
        .sort((a, b) => a.name.localeCompare(b.name))
      setSetTotals(sets)

      // 👉 on force une extension par défaut (plus de "Toutes les extensions")
      if (sets.length > 0) {
        setSelectedSet((prev) => prev ?? sets[0].name)
      }

      setCompletion((completionRes.data || []) as UserCompletionRow[])
      setPinned((pinnedRes.data || []) as PinnedRow[])

      // ⚙️ remplit les listes de filtres à partir des données
      const rar = Array.from(
        new Set(
          collRows
            .map((r) => r.rarity_code)
            .filter((v): v is string => !!v)
        )
      ).sort()
      setRarities(rar)

      const cols = Array.from(
        new Set(
          collRows
            .map((r) => r.colors)
            .filter((v): v is string => !!v)
        )
      ).sort()
      setColors(cols)

      // 🔹 Talents issus des non-supports uniquement
      const nms = Array.from(
        new Set(
          collRows
            .filter((r) => !r.is_support)
            .map((r) => r.card_name)
            .filter((v): v is string => !!v)
        )
      ).sort()
      setNames(nms)

      setLoading(false)
    }

    load()
    return () => {
      cancelled = true
    }
  }, [userId])

  // ─────────────────────────────────────
  // Mise à jour de la progression
  // ─────────────────────────────────────
  useEffect(() => {
    if (!collection || collection.length === 0 || setTotals.length === 0) {
      setOwnedUnique(0)
      setTotalCards(0)
      return
    }

    if (selectedSet) {
      const comp = completion.find((c) => c.set_name === selectedSet)
      const owned = comp ? comp.owned_unique : 0
      const total =
        comp?.total_cards ??
        setTotals.find((s) => s.name === selectedSet)?.total_cards ??
        0

      setOwnedUnique(owned)
      setTotalCards(total)
    } else {
      const uniqueIds = new Set(collection.map((r) => r.card_id))
      const ownedAll = uniqueIds.size
      const totalAll = setTotals.reduce((sum, s) => sum + s.total_cards, 0)
      setOwnedUnique(ownedAll)
      setTotalCards(totalAll)
    }
  }, [collection, setTotals, completion, selectedSet])

  // ─────────────────────────────────────
  // + / − quantité
  // ─────────────────────────────────────
  const changeQty = async (cardId: number, delta: number) => {
    try {
      setUpdating(cardId)
      if (delta > 0) {
        await supabase.rpc('rpc_give_card', { p_card_id: cardId, p_qty: delta })
      } else {
        await supabase.rpc('rpc_remove_card', {
          p_card_id: cardId,
          p_qty: -delta,
        })
      }

      const [collRes, completionRes] = await Promise.all([
        supabase
          .from('v_user_collection_detailed')
          .select('*')
          .eq('user_id', userId)
          .order('set_code')
          .order('collector_no'),
        supabase
          .from('v_user_set_completion')
          .select('*')
          .eq('user_id', userId),
      ])

      if (!collRes.error) {
        const collRows = (collRes.data || []) as CollectionRow[]
        setCollection(collRows)

        // on remet à jour les listes de filtres pour rester synchro
        const rar = Array.from(
          new Set(
            collRows
              .map((r) => r.rarity_code)
              .filter((v): v is string => !!v)
          )
        ).sort()
        setRarities(rar)

        const cols = Array.from(
          new Set(
            collRows
              .map((r) => r.colors)
              .filter((v): v is string => !!v)
          )
        ).sort()
        setColors(cols)

        const nms = Array.from(
          new Set(
            collRows
              .filter((r) => !r.is_support)
              .map((r) => r.card_name)
              .filter((v): v is string => !!v)
          )
        ).sort()
        setNames(nms)
      }
      if (!completionRes.error) {
        setCompletion((completionRes.data || []) as UserCompletionRow[])
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      alert('Erreur: ' + msg)
    } finally {
      setUpdating(null)
    }
  }

  // ─────────────────────────────────────
  // ⭐ Favoris
  // ─────────────────────────────────────
  const togglePinned = async (cardId: number) => {
    if (!editable) return

    const existing = pinned.find((p) => p.card_id === cardId)

    if (existing) {
      // suppression
      const { error } = await supabase
        .from('user_pinned_cards')
        .delete()
        .eq('user_id', userId)
        .eq('card_id', cardId)

      if (!error) {
        setPinned((prev) => prev.filter((p) => p.card_id !== cardId))
      }
    } else {
      // insertion avec nouvelle position
      const maxPos = pinned.reduce(
        (max, p) => (p.position > max ? p.position : max),
        0
      )
      const newPos = maxPos + 1

      const { error } = await supabase
        .from('user_pinned_cards')
        .upsert({
          user_id: userId,
          card_id: cardId,
          position: newPos,
        })

      if (!error) {
        setPinned((prev) => [...prev, { card_id: cardId, position: newPos }])
      }
    }
  }

  // ─────────────────────────────────────
  // États d’affichage
  // ─────────────────────────────────────
  if (loading) return <p>Chargement de la collection…</p>
  if (error) return <p style={{ color: 'crimson' }}>Erreur: {error}</p>
  if (!collection || collection.length === 0) return <p>Collection vide.</p>

  const ownerName = capitalizeWords(
    collection[0]?.user_display_name || 'Utilisateur'
  )

  // base filtrée par extension (toujours une extension sélectionnée)
  const visibleBase = selectedSet
    ? collection.filter((r) => r.set_code === selectedSet)
    : collection

  // filtres supplémentaires
  const visibleFiltered = visibleBase
    .filter((r) => (selectedRarity ? r.rarity_code === selectedRarity : true))
    .filter((r) => (selectedColor ? r.colors === selectedColor : true))
    .filter((r) => (selectedName ? r.card_name === selectedName : true))

  // 📌 ordre d’origine (pour garder le tri si pas favori)
  const originalIndex = new Map<number, number>()
  collection.forEach((r, idx) => {
    originalIndex.set(r.card_id, idx)
  })

  // 📌 index des favoris
  const pinnedIndex = new Map<number, number>()
  pinned.forEach((p, idx) => {
    pinnedIndex.set(p.card_id, idx)
  })

  const visible = [...visibleFiltered].sort((a, b) => {
    const aPinned = pinnedIndex.has(a.card_id)
    const bPinned = pinnedIndex.has(b.card_id)

    if (aPinned && !bPinned) return -1
    if (!aPinned && bPinned) return 1

    if (aPinned && bPinned) {
      return (
        (pinnedIndex.get(a.card_id) ?? 0) -
        (pinnedIndex.get(b.card_id) ?? 0)
      )
    }

    // ni l'un ni l'autre favori → garder l'ordre d'origine
    return (
      (originalIndex.get(a.card_id) ?? 0) -
      (originalIndex.get(b.card_id) ?? 0)
    )
  })

  const percent =
    totalCards > 0 ? Math.round((ownedUnique / totalCards) * 100) : 0

  // ─────────────────────────────────────
  // Rendu
  // ─────────────────────────────────────
  return (
    <section>
      <div className="page-header">
        <div>
          <h2 className="page-title">Ma collection — {ownerName}</h2>
          <div className="page-subtitle">
            Affichage : <strong>{selectedSet || '—'}</strong>
          </div>
        </div>

        <div className="rpg-panel">
          {/* Progression */}
          <div className="rpg-progress-wrapper" aria-hidden>
            <div className="rpg-progress-label">Progression</div>
            <div className="rpg-progress-bar-outer">
              <div
                className="rpg-progress-bar-inner"
                style={{ width: `${percent}%` }}
              />
            </div>
            <div className="rpg-progress-meta">
              <div>
                {ownedUnique}/{totalCards}
              </div>
              <div>{percent}%</div>
            </div>
          </div>

          {/* Filtres stylés en grille responsive */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: 12,
              alignItems: 'center',
            }}
          >
            {/* Extensions */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={{ fontSize: 12, color: 'var(--text-light)' }}>
                Extensions
              </label>
              <select
                className="rpg-select"
                value={selectedSet ?? (setTotals[0]?.name ?? '')}
                onChange={(e) => {
                  const v = e.target.value || null
                  setSelectedSet(v)
                }}
              >
                {setTotals.map((s) => (
                  <option key={s.name} value={s.name}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Raretés */}
            {rarities.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <label style={{ fontSize: 12, color: 'var(--text-light)' }}>
                  Raretés
                </label>
                <select
                  className="rpg-select"
                  value={selectedRarity ?? ''}
                  onChange={(e) =>
                    setSelectedRarity(e.target.value || null)
                  }
                >
                  <option value="">Toutes les raretés</option>
                  {rarities.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Couleurs */}
            {colors.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <label style={{ fontSize: 12, color: 'var(--text-light)' }}>
                  Couleurs
                </label>
                <select
                  className="rpg-select"
                  value={selectedColor ?? ''}
                  onChange={(e) =>
                    setSelectedColor(e.target.value || null)
                  }
                >
                  <option value="">Toutes les couleurs</option>
                  {colors.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Talents */}
            {names.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <label style={{ fontSize: 12, color: 'var(--text-light)' }}>
                  Talents
                </label>
                <select
                  className="rpg-select"
                  value={selectedName ?? ''}
                  onChange={(e) =>
                    setSelectedName(e.target.value || null)
                  }
                >
                  <option value="">Tous les talents</option>
                  {names.map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Grille de cartes */}
      <div className="grid-view">
        {visible.map((r) => {
          const isPinned = pinnedIndex.has(r.card_id)

          return (
            <article
              key={r.card_id}
              className="card"
              style={{
                position: 'relative',
                boxShadow: isPinned
                  ? '0 0 14px rgba(250, 204, 21, 0.65)'
                  : undefined,
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {r.image_url && <img src={r.image_url} alt={r.card_name} />}

              {/* ⭐ bouton favori */}
              {editable && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    togglePinned(r.card_id)
                  }}
                  style={{
                    position: 'absolute',
                    top: 8,
                    left: 8,
                    width: 40,
                    height: 40,
                    border: 'none',
                    padding: 0,
                    background: 'transparent',
                    cursor: 'pointer',
                    zIndex: 50,
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={isPinned ? '/star-on.png' : '/star-off.png'}
                    alt="favorite"
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'contain',
                      filter: isPinned
                        ? 'drop-shadow(0 0 6px gold)'
                        : 'drop-shadow(0 0 3px #000)',
                      transition: 'transform .15s ease',
                    }}
                  />
                </button>
              )}

              {r.quantity > 1 && (
                <span className="badge-qty">×{r.quantity}</span>
              )}

              <div className="card-content">
                <strong>
                  [{r.card_name}]
                </strong>
                <span>{r.colors} | {r.rarity_code}</span>

                {editable && (
                  <div className="card-actions">
                    <button
                      disabled={updating === r.card_id}
                      onClick={() => changeQty(r.card_id, +1)}
                      className="btn btn-sm"
                    >
                      +
                    </button>
                    <button
                      disabled={updating === r.card_id}
                      onClick={() => changeQty(r.card_id, -1)}
                      className="btn btn-sm"
                    >
                      −
                    </button>
                  </div>
                )}
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}
