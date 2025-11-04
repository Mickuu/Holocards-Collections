'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabaseClient'
import UserCollection from '@/components/UserCollection'
import CatalogGrid from '@/components/CatalogGrid'
import ThemeToggle from '@/components/ThemeToggle'

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
      setMe(user ? {
        id: user.id,
        label: user.user_metadata?.full_name || user.user_metadata?.user_name || user.email || user.id
      } : null)
      setLoading(false)
    }

    const { data: sub } = supabase.auth.onAuthStateChange((_evt, session) => {
      const u = session?.user
      setMe(u ? {
        id: u.id,
        label: u.user_metadata?.full_name || u.user_metadata?.user_name || u.email || u.id
      } : null)
    })

    init()
    return () => sub.subscription.unsubscribe()
  }, [])

  // --- Connexion / Déconnexion ---
  const loginDiscord = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'discord',
      options: { redirectTo: window.location.origin + '/auth/callback' }
    })
  }

  const loginTwitch = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'twitch',
      options: { redirectTo: window.location.origin + '/auth/callback' }
    })
  }

  const logout = async () => {
    await supabase.auth.signOut()
  }

  if (loading) return <p style={{ padding: 16 }}>Chargement…</p>

  return (
    <main style={{ padding: 16, display: 'grid', gap: 12 }}>
      {/* NAVIGATION */}
      <nav
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'var(--card-bg)',
          backdropFilter: 'blur(10px)',
          borderRadius: 10,
          padding: '10px 16px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
        }}
      >
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <Link href="/" style={{ fontWeight: 'bold', textDecoration: 'none', color: 'var(--text-main)' }}>🏠 Accueil</Link>
          {me && (
            <>
              <Link href={`/user/${encodeURIComponent(me.id)}`} style={{ textDecoration: 'none', color: 'var(--text-main)' }}>
                💼 Ma collection
              </Link>
              <Link href="/collections" style={{ textDecoration: 'none', color: 'var(--text-main)' }}>
                🃏 Collections des joueurs
              </Link>
            </>
          )}
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <ThemeToggle />
          {me && (
            <>
              <span style={{ fontWeight: 'bold' }}>{me.label}</span>
              <button onClick={logout}>Déconnexion</button>
            </>
          )}
        </div>
      </nav>

      {/* CONTENU */}
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
          {/* Masqué mais conservé */}
          {SHOW_OWN_COLLECTION && <UserCollection userId={me.id} editable={true} />}

          {/* Catalogue uniquement */}
          <CatalogGrid />
        </div>
      )}
    </main>
  )
}
