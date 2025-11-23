'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

type CollectionRow = {
  card_id: number
  set_code: string
  collector_no: string
  card_name: string
  image_url: string | null
  quantity: number
  user_id: string
  user_display_name: string
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
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [updating, setUpdating] = useState<number | null>(null)

  const [selectedSet, setSelectedSet] = useState<string | null>(null)
  const [ownedUnique, setOwnedUnique] = useState(0)
  const [totalCards, setTotalCards] = useState(0)

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      setLoading(true)
      setError(null)

      const [collRes, totalsRes, completionRes] = await Promise.all([
        supabase
          .from('v_user_collection_detailed')
          .select('*')
          .eq('user_id', userId)
          .order('set_code')
          .order('collector_no'),
        supabase
          .from('v_set_totals')
          .select('set_name, set_code, total_cards'),
        supabase
          .from('v_user_set_completion')
          .select('*')
          .eq('user_id', userId),
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

      setCollection((collRes.data || []) as CollectionRow[])

      const totalsRows = (totalsRes.data || []) as SetTotalRow[]
      const sets: CardSet[] = totalsRows
        .map((r) => ({
          name: r.set_name,
          code: r.set_code,
          total_cards: r.total_cards,
        }))
        .sort((a, b) => a.name.localeCompare(b.name))
      setSetTotals(sets)

      setCompletion((completionRes.data || []) as UserCompletionRow[])
      setLoading(false)
    }

    load()
    return () => {
      cancelled = true
    }
  }, [userId])

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
      const totalAll = setTotals.reduce(
        (sum, s) => sum + s.total_cards,
        0
      )
      setOwnedUnique(ownedAll)
      setTotalCards(totalAll)
    }
  }, [collection, setTotals, completion, selectedSet])

  const changeQty = async (cardId: number, delta: number) => {
    try {
      setUpdating(cardId)
      if (delta > 0) {
        await supabase.rpc('rpc_give_card', { p_card_id: cardId, p_qty: delta })
      } else {
        await supabase.rpc('rpc_remove_card', { p_card_id: cardId, p_qty: -delta })
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
        setCollection((collRes.data || []) as CollectionRow[])
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

  if (loading) return <p>Chargement de la collection…</p>
  if (error) return <p style={{ color: 'crimson' }}>Erreur: {error}</p>
  if (!collection || collection.length === 0) return <p>Collection vide.</p>

  const ownerName = capitalizeWords(
    collection[0]?.user_display_name || 'Utilisateur'
  )

  const visible = selectedSet
    ? collection.filter((r) => r.set_code === selectedSet)
    : collection

  const percent =
    totalCards > 0 ? Math.round((ownedUnique / totalCards) * 100) : 0

  return (
    <section>
      <div className="page-header">
        <div>
          <h2 className="page-title">Ma collection — {ownerName}</h2>
          <div className="page-subtitle">
            {selectedSet ? (
              <>
                Affichage : <strong>{selectedSet}</strong>
              </>
            ) : (
              <>
                Affichage : <strong>Toutes les extensions</strong>
              </>
            )}
          </div>
        </div>

        <div className="rpg-panel">
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

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 12, color: 'var(--text-light)' }}>
              Filtrer
            </label>
            <select
              className="rpg-select"
              value={selectedSet ?? ''}
              onChange={(e) => {
                const v = e.target.value || null
                setSelectedSet(v)
              }}
            >
              <option value="">Toutes les extensions</option>
              {setTotals.map((s) => (
                <option key={s.name} value={s.name}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="grid-view">
        {visible.map((r) => (
          <article
            key={r.card_id}
            className="card"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {r.image_url && <img src={r.image_url} alt={r.card_name} />}

            {r.quantity > 1 && (
              <span className="badge-qty">
                ×{r.quantity}
              </span>
            )}

            <div className="card-content">
              <strong>
                [{r.set_code}] {r.collector_no}
              </strong>
              <span>{r.card_name}</span>

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
        ))}
      </div>
    </section>
  )
}
