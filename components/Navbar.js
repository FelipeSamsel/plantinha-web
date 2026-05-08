'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '../lib/supabase'
import NewPost from './NewPost'

export default function Navbar() {
  const [user, setUser] = useState(null)
  const [showModal, setShowModal] = useState(false)

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
    <>
      {showModal && (
        <div onClick={() => setShowModal(false)} style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
          zIndex: 1000, padding: 0
        }}>
          <div onClick={e => e.stopPropagation()} style={{
            background: '#F4FAF0', borderRadius: '20px 20px 0 0',
            width: '100%', maxWidth: 390, maxHeight: '90vh',
            overflowY: 'auto', paddingBottom: 32
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 16px 12px', borderBottom: '0.5px solid #E2F2D4' }}>
              <span style={{ fontWeight: 500, fontSize: 15, color: '#27500A' }}>Nova publicação</span>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: '#888780' }}>✕</button>
            </div>
            <div style={{ padding: '16px' }}>
              <NewPost user={user} onPost={() => { setShowModal(false); window.location.reload() }} />
            </div>
          </div>
        </div>
      )}

      <nav style={{
        background: '#fff', borderBottom: '1px solid #E2F2D4',
        padding: '0 20px', height: 56, display: 'flex',
        alignItems: 'center', justifyContent: 'space-between',
        position: 'sticky', top: 0, zIndex: 100
      }}>
        <Link href="/" style={{ fontSize: 20, fontWeight: 500, color: '#27500A', textDecoration: 'none' }}>
          plantinha
        </Link>

        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <Link href="/" style={navLink}>Feed</Link>
          <Link href="/forum" style={navLink}>Fórum</Link>
          {user && <Link href="/perfil" style={navLink}>Jardim</Link>}

          {user && (
            <button onClick={() => setShowModal(true)} style={{
              width: 32, height: 32, borderRadius: '50%',
              background: '#3B6D11', border: 'none',
              color: '#EAF3DE', fontSize: 20, fontWeight: 300,
              cursor: 'pointer', display: 'flex', alignItems: 'center',
              justifyContent: 'center', marginLeft: 4,
              lineHeight: 1
            }}>+</button>
          )}

          {user
            ? <button onClick={signOut} style={btnOutline}>Sair</button>
            : <button onClick={signInWithGoogle} style={btnGreen}>Entrar com Google</button>
          }
        </div>
      </nav>
    </>
  )
}

const navLink = { fontSize: 14, color: '#3B6D11', textDecoration: 'none', fontWeight: 500 }
const btnGreen = { background: '#3B6D11', color: '#EAF3DE', border: 'none', borderRadius: 20, padding: '7px 16px', fontSize: 13, fontWeight: 500, cursor: 'pointer' }
const btnOutline = { background: 'transparent', color: '#993C1D', border: '0.5px solid #993C1D', borderRadius: 20, padding: '7px 16px', fontSize: 13, cursor: 'pointer' }