'use client'
import { useEffect, useState } from 'react'

function getInitialTheme(): 'light' | 'dark' {
  // Appelé uniquement côté client (Navbar est ssr:false)
  try {
    const stored = localStorage.getItem('theme')
    if (stored === 'light' || stored === 'dark') return stored
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    return prefersDark ? 'dark' : 'light'
  } catch {
    return 'light'
  }
}

export default function ThemeToggle() {
  // ✅ pas de setState dans l'effet
  const [theme, setTheme] = useState<'light' | 'dark'>(getInitialTheme)

  // Synchronise le DOM quand `theme` change
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    document.documentElement.classList.add('theme-loaded')
    try {
      localStorage.setItem('theme', theme)
    } catch {}
  }, [theme])

  const toggle = () => setTheme(t => (t === 'light' ? 'dark' : 'light'))

  return (
    <button
      onClick={toggle}
      title="Changer de thème"
      style={{
        background: 'none',
        border: 'none',
        fontSize: 20,
        cursor: 'pointer',
        color: theme === 'light' ? '#333' : '#f9f9f9',
      }}
      aria-label={theme === 'light' ? 'Passer en mode sombre' : 'Passer en mode clair'}
    >
      {theme === 'light' ? '🌙' : '☀️'}
    </button>
  )
}
