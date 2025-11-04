'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabaseClient'

type UserRow = {
  id: string
  display_name: string | null
  card_count: number
}

export default function UsersPage() {
  const [users, setUsers] = useState<UserRow[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const run = async () => {
      const { data, error } = await supabase
        .from('v_user_card_counts')
        .select('id, display_name, card_count')

      if (error) setError(error.message)
      else setUsers(data as UserRow[])
      setLoading(false)
    }
    run()
  }, [])

  if (loading) return <p>Chargement…</p>
  if (error) return <p style={{ color: 'crimson' }}>Erreur: {error}</p>
  if (!users || !users.length) return <p>Aucun utilisateur trouvé.</p>

  return (
    <main style={{ padding: 16 }}>
      <h1>Liste des utilisateurs</h1>
      <ul style={{ display: 'grid', gap: 8 }}>
        {users.map(u => (
          <li key={u.id}>
            <Link href={`/user/${encodeURIComponent(u.id)}`}>
              {u.display_name || u.id}
            </Link>
            {' '}— {u.card_count} carte{u.card_count > 1 ? 's' : ''}
          </li>
        ))}
      </ul>
    </main>
  )
}
