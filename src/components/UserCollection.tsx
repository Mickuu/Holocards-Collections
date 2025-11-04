'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

type Row = {
  card_id: number
  set_code: string
  collector_no: string
  card_name: string
  image_url: string | null
  quantity: number
  user_id: string
  user_display_name: string
}

export default function UserCollection({ userId, editable = true }: { userId: string; editable?: boolean }) {
  const [rows, setRows] = useState<Row[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState<number | null>(null)

  const fetchData = async () => {
    const { data, error } = await supabase
      .from('v_user_collection_detailed')
      .select('*')
      .eq('user_id', userId)
      .order('set_code')
      .order('collector_no')

    if (error) setError(error.message)
    else setRows(data as Row[])
    setLoading(false)
  }

  useEffect(() => {
    fetchData()
  }, [userId])

  const changeQty = async (cardId: number, delta: number) => {
    try {
      setUpdating(cardId)
      if (delta > 0) {
        await supabase.rpc('rpc_give_card', { p_card_id: cardId, p_qty: delta })
      } else {
        await supabase.rpc('rpc_remove_card', { p_card_id: cardId, p_qty: -delta })
      }
      await fetchData()
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      alert('Erreur: ' + msg)
    } finally {
      setUpdating(null)
    }
  }

  if (loading) return <p>Chargement de la collection…</p>
  if (error) return <p style={{ color: 'crimson' }}>Erreur: {error}</p>
  if (!rows || !rows.length) return <p>Collection vide.</p>

  return (
    <section>
      <h2>Collection de {rows[0]?.user_display_name || 'Utilisateur'}</h2>
      <div className="grid-view">
        {rows.map((r) => (
          <article key={r.card_id} className="card" style={{ position: 'relative' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {r.image_url && <img src={r.image_url} alt={r.card_name} />}

            {/* Badge quantité si >1 */}
            {r.quantity > 1 && (
              <span
                style={{
                  position: 'absolute',
                  top: 6,
                  right: 6,
                  background: '#4e6cf2',
                  color: 'white',
                  padding: '2px 6px',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontWeight: 'bold'
                }}
              >
                ×{r.quantity}
              </span>
            )}

            <div className="card-content">
              <strong>[{r.set_code}] {r.collector_no}</strong>
              <span>{r.card_name}</span>

              {/* Boutons +/- uniquement si c’est la collection de l’utilisateur connecté */}
              {editable && (
                <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                  <button
                    disabled={updating === r.card_id}
                    onClick={() => changeQty(r.card_id, +1)}
                  >
                    +
                  </button>
                  <button
                    disabled={updating === r.card_id}
                    onClick={() => changeQty(r.card_id, -1)}
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
