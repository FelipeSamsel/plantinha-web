'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '../lib/supabase'

export default function Navbar() {
  const [user, setUser] = useState(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setUser(data.session?.user ?? null))
    const { data: listener } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null)
    })
    return () => listener.subscription.unsubscribe()
  }, [])

  async function signInWithGoogle() {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` }
    })
  }

  async function signOut() {
    await supabase.auth.signOut()
    setUser(null)
  }

  return (
    <nav style={{
      background: '#fff', borderBottom: '1px solid #E2F2D4',
      padding: '0 24px', height: 56, display: 'flex',
      alignItems: 'center', justifyContent: 'space-between',
      position: 'sticky', top: 0, zIndex: 100
    }}>
      <Link href="/" style={{ fontSize: 20, fontWeight: 500, color: '#27500A', textDecoration: 'none' }}>
        plantinha
      </Link>

      <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
        <Link href="/" style={navLink}>Feed</Link>
        <Link href="/forum" style={navLink}>Fórum</Link>
        {user && <Link href="/perfil" style={navLink}>Jardim</Link>}
        {user
          ? <button onClick={signOut} style={btnOutline}>Sair</button>
          : <button onClick={signInWithGoogle} style={btnGreen}>Entrar com Google</button>
        }
      </div>
    </nav>
  )
}

const navLink = { fontSize: 14, color: '#3B6D11', textDecoration: 'none', fontWeight: 500 }
const btnGreen = { background: '#3B6D11', color: '#EAF3DE', border: 'none', borderRadius: 20, padding: '7px 16px', fontSize: 13, fontWeight: 500, cursor: 'pointer' }
const btnOutline = { background: 'transparent', color: '#993C1D', border: '0.5px solid #993C1D', borderRadius: 20, padding: '7px 16px', fontSize: 13, cursor: 'pointer' }