'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '../lib/supabase'
import NewPost from './NewPost'
import Notifications from './Notifications'

export default function NavbarWrapper({ children }) {
  const [user, setUser] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setUser(data.session?.user ?? null))
    const { data: listener } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null)
    })
    return () => listener.subscription.unsubscribe()
  }, [])

  async function signOut() {
    await supabase.auth.signOut()
    setUser(null)
  }

  const newPostModal = showModal && (
    <div onClick={() => setShowModal(false)} style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000, padding: 20
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: '#F4FAF0', borderRadius: 20,
        width: '100%', maxWidth: 480, maxHeight: '90vh',
        overflowY: 'auto', boxShadow: '0 8px 40px rgba(0,0,0,0.15)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px 12px', borderBottom: '0.5px solid #E2F2D4' }}>
          <span style={{ fontWeight: 500, fontSize: 15, color: '#27500A' }}>Nova publicação</span>
          <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: '#888780' }}>✕</button>
        </div>
        <div style={{ padding: 20 }}>
          <NewPost user={user} onPost={() => { setShowModal(false); window.location.reload() }} />
        </div>
      </div>
    </div>
  )

  return (
    <div className="layout-shell">

      {/* ── SIDEBAR DESKTOP ── */}
      <aside className="side-navbar">
        <Link href="/" style={{ fontSize: 22, fontWeight: 500, color: '#27500A', marginBottom: 36, display: 'block' }}>
          🌿 plantinha
        </Link>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
          {[
            { href: '/', icon: '⊞', label: 'Feed' },
            { href: '/forum', icon: '💬', label: 'Fórum' },
            ...(user ? [{ href: '/perfil', icon: '🪴', label: 'Jardim' }] : []),
          ].map(({ href, icon, label }) => (
            <Link key={href} href={href} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '11px 14px', borderRadius: 12, fontSize: 15,
              color: '#27500A', fontWeight: 500, transition: 'background 0.15s'
            }}
              onMouseOver={e => e.currentTarget.style.background = '#EAF3DE'}
              onMouseOut={e => e.currentTarget.style.background = 'transparent'}>
              <span style={{ fontSize: 18 }}>{icon}</span>
              {label}
            </Link>
          ))}

          {user && (
            <button onClick={() => setShowModal(true)} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '11px 14px', borderRadius: 12, fontSize: 15,
              color: '#fff', fontWeight: 500, background: '#3B6D11',
              border: 'none', cursor: 'pointer', marginTop: 8, width: '100%'
            }}>
              <span style={{ fontSize: 18 }}>＋</span>
              Publicar
            </button>
          )}
        </nav>

        <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {user && <Notifications user={user} />}
          {user && (
            <button onClick={signOut} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 14px', borderRadius: 12, fontSize: 14,
              color: '#993C1D', background: 'transparent',
              border: '0.5px solid #f5c4c4', cursor: 'pointer', width: '100%'
            }}>
              <span>↩</span> Sair
            </button>
          )}
        </div>
      </aside>

      {/* ── TOPBAR MOBILE ── */}
      <header className="top-navbar" style={{
        background: '#fff', borderBottom: '1px solid #E2F2D4',
        padding: '0 16px', height: 56,
        alignItems: 'center', justifyContent: 'space-between',
        position: 'sticky', top: 0, zIndex: 100, width: '100%'
      }}>
        <Link href="/" style={{ fontSize: 18, fontWeight: 500, color: '#27500A' }}>
          🌿 plantinha
        </Link>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {user && <Notifications user={user} />}
          {user && (
            <button onClick={() => setShowModal(true)} style={{
              width: 30, height: 30, borderRadius: '50%',
              background: '#3B6D11', border: 'none',
              color: '#EAF3DE', fontSize: 20,
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>+</button>
          )}
          <button onClick={() => setMenuOpen(!menuOpen)} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            display: 'flex', flexDirection: 'column', gap: 5, padding: 4
          }}>
            <span style={{ display: 'block', width: 22, height: 2, background: menuOpen ? '#3B6D11' : '#888780', borderRadius: 2, transition: 'all 0.2s', transform: menuOpen ? 'rotate(45deg) translate(5px, 5px)' : 'none' }} />
            <span style={{ display: 'block', width: 22, height: 2, background: menuOpen ? 'transparent' : '#888780', borderRadius: 2, transition: 'all 0.2s' }} />
            <span style={{ display: 'block', width: 22, height: 2, background: menuOpen ? '#3B6D11' : '#888780', borderRadius: 2, transition: 'all 0.2s', transform: menuOpen ? 'rotate(-45deg) translate(5px, -5px)' : 'none' }} />
          </button>
        </div>

        {/* menu hamburguer aberto */}
        {menuOpen && (
          <div onClick={() => setMenuOpen(false)} style={{
            position: 'fixed', inset: 0, top: 56, background: 'rgba(0,0,0,0.3)',
            zIndex: 99
          }}>
            <div onClick={e => e.stopPropagation()} style={{
              background: '#fff', width: '70%', maxWidth: 260,
              height: '100%', padding: '20px 16px',
              display: 'flex', flexDirection: 'column', gap: 4,
              boxShadow: '4px 0 20px rgba(0,0,0,0.1)'
            }}>
              <p style={{ fontSize: 12, color: '#B4B2A9', fontWeight: 500, marginBottom: 8, paddingLeft: 14 }}>MENU</p>
              {[
                { href: '/', icon: '⊞', label: 'Feed' },
                { href: '/forum', icon: '💬', label: 'Fórum' },
                ...(user ? [{ href: '/perfil', icon: '🪴', label: 'Jardim' }] : []),
              ].map(({ href, icon, label }) => (
                <Link key={href} href={href} onClick={() => setMenuOpen(false)} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '11px 14px', borderRadius: 12, fontSize: 15,
                  color: '#27500A', fontWeight: 500
                }}>
                  <span>{icon}</span>{label}
                </Link>
              ))}
              {user && (
                <button onClick={() => { signOut(); setMenuOpen(false) }} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '11px 14px', borderRadius: 12, fontSize: 14,
                  color: '#993C1D', background: 'transparent',
                  border: '0.5px solid #f5c4c4', cursor: 'pointer',
                  marginTop: 'auto', width: '100%'
                }}>
                  ↩ Sair
                </button>
              )}
            </div>
          </div>
        )}
      </header>

      {/* ── CONTEÚDO ── */}
      <main className="main-content">
        {children}
      </main>

      {newPostModal}
    </div>
  )
}