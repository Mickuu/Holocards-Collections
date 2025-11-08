'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import UserCollection from '@/components/UserCollection'
import CatalogGrid from '@/components/CatalogGrid'

// ← change juste cette valeur pour afficher/masquer la section
const SHOW_OWN_COLLECTION = false

export default function Home() {
  const [me, setMe] = useState<null | { id: string; label: string }>(null)
  const [loading, setLoading] = useState(true)

  // --- Auth & session ---
  useEffect(() => {
    const init = async () => {
      const href = typeof window !== 'undefined' ? window.location.href : ''
      if (href.includes('code=') && href.includes('state=')) {
        await supabase.auth.exchangeCodeForSession(href).catch(() => {})
        const url = new URL(window.location.href)
        url.search = ''
        window.history.replaceState({}, '', url.toString())
      }

      const { data: { user } } = await supabase.auth.getUser()
      setMe(
        user
          ? {
              id: user.id,
              label:
                user.user_metadata?.full_name ||
                user.user_metadata?.user_name ||
                user.email ||
                user.id,
            }
          : null
      )
      setLoading(false)
    }

    const { data: sub } = supabase.auth.onAuthStateChange((_evt, session) => {
      const u = session?.user
      setMe(
        u
          ? {
              id: u.id,
              label:
                u.user_metadata?.full_name ||
                u.user_metadata?.user_name ||
                u.email ||
                u.id,
            }
          : null
      )
    })

    init()
    return () => sub.subscription.unsubscribe()
  }, [])

  // --- Connexion ---
  const loginDiscord = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'discord',
      options: { redirectTo: window.location.origin + '/auth/callback' },
    })
  }
  const loginTwitch = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'twitch',
      options: { redirectTo: window.location.origin + '/auth/callback' },
    })
  }

  if (loading) return <p style={{ padding: 16 }}>Chargement…</p>

  return (
    <div style={{ padding: 16 }}>
      {!me ? (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 20 }}>
          <button
            onClick={loginDiscord}
            style={{ background: '#5865F2', color: 'white', border: 'none', borderRadius: 6, padding: '10px 16px', cursor: 'pointer' }}
          >
            Se connecter avec Discord
          </button>
          <button
            onClick={loginTwitch}
            style={{ background: '#9146FF', color: 'white', border: 'none', borderRadius: 6, padding: '10px 16px', cursor: 'pointer' }}
          >
            Se connecter avec Twitch
          </button>
          <p>Après connexion, tu seras redirigé ici.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 24, marginTop: 20 }}>
          {SHOW_OWN_COLLECTION && <UserCollection userId={me.id} editable={true} />}
          <CatalogGrid />
        </div>
      )}
    </div>
  )
}
