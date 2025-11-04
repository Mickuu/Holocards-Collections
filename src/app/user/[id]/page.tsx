'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import UserCollection from '@/components/UserCollection'

export default function UserPage() {
  const params = useParams<{ id: string }>()
  const [loading, setLoading] = useState(true)
  const [exists, setExists] = useState<boolean | null>(null)

  useEffect(() => {
    const checkUser = async () => {
      // Vérifie que l'user existe
      const { data, error } = await supabase
        .from('users')
        .select('id')
        .eq('id', params.id)
        .maybeSingle()

      if (error) {
        console.error(error)
        setExists(false)
      } else {
        setExists(!!data)
      }
      setLoading(false)
    }
    checkUser()
  }, [params.id])

  if (loading) return <p>Chargement…</p>
  if (exists === false) return <p>Utilisateur inconnu.</p>

  return (
    <main style={{ padding: 16 }}>
      <h1>Collection d’un utilisateur</h1>
      <UserCollection userId={params.id} editable={false} />
    </main>
  )
}
