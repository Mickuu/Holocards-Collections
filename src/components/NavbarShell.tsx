'use client'
import { useState } from 'react'
import Navbar from '@/components/Navbar'

/** Rend la Navbar uniquement côté client, sans setState dans un effet */
export default function NavbarShell() {
  // true si on est déjà côté client, false côté serveur
  const [mounted] = useState(() => typeof window !== 'undefined')

  if (!mounted) return null
  return <Navbar />
}
