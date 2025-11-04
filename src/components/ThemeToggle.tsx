'use client'
import { useEffect, useState } from 'react'

export default function ThemeToggle() {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    // Valeur par défaut côté serveur (évite le mismatch SSR)
    if (typeof window === 'undefined') return 'light'
    const stored = localStorage.getItem('theme')
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    return stored === 'dark' || (!stored && prefersDark) ? 'dark' : 'light'
  })

  // Met à jour le DOM après le premier rendu
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    document.documentElement.classList.add('theme-loaded')
    localStorage.setItem('theme', theme)
  }, [theme])

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'))
  }

  return (
    <button
      onClick={toggleTheme}
      title="Changer de thème"
      style={{
        background: 'none',
        border: 'none',
        fontSize: '20px',
        cursor: 'pointer',
        color: theme === 'light' ? '#333' : '#f9f9f9'
      }}
    >
      {theme === 'light' ? '🌙' : '☀️'}
    </button>
  )
}
