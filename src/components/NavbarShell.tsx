'use client';

import dynamic from 'next/dynamic';

// Navbar rendue uniquement côté client (pas de SSR)
const Navbar = dynamic(() => import('./Navbar'), {
  ssr: false,
});

export default function NavbarShell() {
  return <Navbar />;
}
