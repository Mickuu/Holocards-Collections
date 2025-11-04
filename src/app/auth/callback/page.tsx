'use client'
import { useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'

export default function CallbackPage() {
  useEffect(() => {
    const run = async () => {
      console.log('CALLBACK URL =', window.location.href) // doit contenir ?code=...
      const { error } = await supabase.auth.exchangeCodeForSession(window.location.href)
      if (error) console.error('exchangeCodeForSession:', error.message)
      await supabase.auth.getSession()
      window.location.replace('/')
    }
    run()
  }, [])

  return <p style={{ padding: 16 }}>Finalisation de la connexion…</p>
}
