'use client'
import { useEffect, useState, useCallback, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '../lib/supabase'
import NewPost from './NewPost'
import Notifications from './Notifications'

function PainelBusca({ user, onClose }) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [aba, setAba] = useState('pessoas')
  const [loading, setLoading] = useState(false)
  const [pessoas, setPessoas] = useState([])
  const [hashtags, setHashtags] = useState([])
  const [posts, setPosts] = useState([])
  const [seguindo, setSeguindo] = useState(new Set())
  const inputRef = useRef(null)

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 80)
    if (user) carregarSeguindo(user.id)
  }, [user])

  async function carregarSeguindo(userId) {
    const { data } = await supabase
      .from('follows').select('following_id').eq('follower_id', userId)
    if (data) setSeguindo(new Set(data.map(r => r.following_id)))
  }

  const buscar = useCallback(async (termo) => {
    if (!termo.trim()) { setPessoas([]); setHashtags([]); setPosts([]); return }
    setLoading(true)
    const t = termo.trim().replace(/^#/, '')
    const [{ data: users }, { data: tags }, { data: postsData }] = await Promise.all([
      supabase.from('profiles').select('id, username, avatar_url').ilike('username', `%${t}%`).limit(10),
      supabase.from('post_tags').select('tag').ilike('tag', `%${t}%`),
      supabase.from('posts').select('id, image_url, caption').ilike('caption', `%${t}%`).limit(12),
    ])
    const tagMap = {}
    tags?.forEach(({ tag }) => { tagMap[tag] = (tagMap[tag] || 0) + 1 })
    const tagList = Object.entries(tagMap).map(([tag, count]) => ({ tag, count })).sort((a, b) => b.count - a.count)
    setPessoas(users || [])
    setHashtags(tagList)
    setPosts(postsData || [])
    setLoading(false)
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => buscar(query), 400)
    return () => clearTimeout(timer)
  }, [query, buscar])

  async function toggleSeguir(targetId) {
    if (!user) return
    if (seguindo.has(targetId)) {
      await supabase.from('follows').delete().eq('follower_id', user.id).eq('following_id', targetId)
      setSeguindo(prev => { const s = new Set(prev); s.delete(targetId); return s })
    } else {
      await supabase.from('follows').insert({ follower_id: user.id, following_id: targetId })
      setSeguindo(prev => new Set(prev).add(targetId))
    }
  }

  const abas = [
    { key: 'pessoas', label: 'Pessoas', count: pessoas.length },
    { key: 'hashtags', label: 'Hashtags', count: hashtags.length },
    { key: 'posts', label: 'Posts', count: posts.length },
  ]

  const temResultados = pessoas.length > 0 || hashtags.length > 0 || posts.length > 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header do painel */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '20px 20px 14px', borderBottom: '0.5px solid #E2F2D4'
      }}>
        <span style={{ fontWeight: 600, fontSize: 16, color: '#27500A' }}>Buscar</span>
        <button onClick={onClose} style={{
          background: 'none', border: 'none', cursor: 'pointer',
          fontSize: 18, color: '#B4B2A9', padding: 4
        }}>✕</button>
      </div>

      {/* Campo de busca */}
      <div style={{ padding: '14px 16px 10px', position: 'relative' }}>
        <span style={{
          position: 'absolute', left: 28, top: '50%', transform: 'translateY(-50%)',
          fontSize: 16, color: '#B4B2A9', pointerEvents: 'none'
        }}>🔍</span>
        <input
          ref={inputRef}
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Pessoas, #hashtags, palavras..."
          style={{
            width: '100%', padding: '11px 36px 11px 38px',
            borderRadius: 12, border: '1.5px solid #D6ECC4',
            fontSize: 14, outline: 'none', background: '#F4FAF0',
            color: '#27500A', boxSizing: 'border-box'
          }}
          onFocus={e => e.target.style.borderColor = '#3B6D11'}
          onBlur={e => e.target.style.borderColor = '#D6ECC4'}
        />
        {query && (
          <button onClick={() => setQuery('')} style={{
            position: 'absolute', right: 28, top: '50%', transform: 'translateY(-50%)',
            background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: '#B4B2A9'
          }}>✕</button>
        )}
      </div>

      {/* Conteúdo */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 16px 16px' }}>
        {!query.trim() && (
          <div style={{ textAlign: 'center', color: '#B4B2A9', marginTop: 48 }}>
            <div style={{ fontSize: 40, marginBottom: 10 }}>🌱</div>
            <p style={{ fontSize: 14 }}>Digite para buscar</p>
          </div>
        )}

        {query.trim() && loading && (
          <div style={{ textAlign: 'center', color: '#B4B2A9', marginTop: 48 }}>
            <div style={{ fontSize: 28 }}>🌿</div>
            <p style={{ fontSize: 13, marginTop: 8 }}>Buscando...</p>
          </div>
        )}

        {query.trim() && !loading && !temResultados && (
          <div style={{ textAlign: 'center', color: '#B4B2A9', marginTop: 48 }}>
            <div style={{ fontSize: 36 }}>🍂</div>
            <p style={{ fontSize: 14, marginTop: 8 }}>Nenhum resultado encontrado</p>
          </div>
        )}

        {query.trim() && !loading && temResultados && (
          <>
            <div style={{ display: 'flex', gap: 2, marginBottom: 14, borderBottom: '1px solid #E2F2D4' }}>
              {abas.map(({ key, label, count }) => (
                <button key={key} onClick={() => setAba(key)} style={{
                  padding: '8px 12px', background: 'none', border: 'none',
                  cursor: 'pointer', fontSize: 13, fontWeight: 500,
                  color: aba === key ? '#3B6D11' : '#B4B2A9',
                  borderBottom: aba === key ? '2px solid #3B6D11' : '2px solid transparent',
                  marginBottom: -1, transition: 'all 0.15s'
                }}>
                  {label}
                  {count > 0 && (
                    <span style={{
                      marginLeft: 5, fontSize: 11, padding: '1px 6px', borderRadius: 20,
                      background: aba === key ? '#EAF3DE' : '#F4F4F2',
                      color: aba === key ? '#3B6D11' : '#B4B2A9'
                    }}>{count}</span>
                  )}
                </button>
              ))}
            </div>

            {aba === 'pessoas' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {pessoas.length === 0
                  ? <p style={{ color: '#B4B2A9', fontSize: 13, textAlign: 'center', marginTop: 24 }}>Nenhuma pessoa encontrada</p>
                  : pessoas.map(p => (
                    <div key={p.id} style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '10px 12px', borderRadius: 12,
                      background: '#fff', border: '0.5px solid #E2F2D4'
                    }}>
                      <Link href={`/perfil/${p.id}`} onClick={onClose}>
                        <div style={{
                          width: 38, height: 38, borderRadius: '50%', overflow: 'hidden',
                          background: '#EAF3DE', display: 'flex', alignItems: 'center',
                          justifyContent: 'center', flexShrink: 0
                        }}>
                          {p.avatar_url
                            ? <img src={p.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            : <span style={{ fontSize: 18 }}>🪴</span>}
                        </div>
                      </Link>
                      <Link href={`/perfil/${p.id}`} onClick={onClose} style={{
                        flex: 1, color: '#27500A', fontWeight: 500, fontSize: 14, textDecoration: 'none'
                      }}>
                        @{p.username}
                      </Link>
                      {user && user.id !== p.id && (
                        <button onClick={() => toggleSeguir(p.id)} style={{
                          padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 500,
                          cursor: 'pointer', border: 'none',
                          background: seguindo.has(p.id) ? '#EAF3DE' : '#3B6D11',
                          color: seguindo.has(p.id) ? '#3B6D11' : '#fff',
                          transition: 'all 0.2s'
                        }}>
                          {seguindo.has(p.id) ? 'Seguindo' : 'Seguir'}
                        </button>
                      )}
                    </div>
                  ))}
              </div>
            )}

            {aba === 'hashtags' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {hashtags.length === 0
                  ? <p style={{ color: '#B4B2A9', fontSize: 13, textAlign: 'center', marginTop: 24 }}>Nenhuma hashtag encontrada</p>
                  : hashtags.map(({ tag, count }) => (
                    <Link key={tag} href={`/?tag=${tag}`} onClick={onClose} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '12px 14px', borderRadius: 12,
                      background: '#fff', border: '0.5px solid #E2F2D4', textDecoration: 'none'
                    }}>
                      <span style={{ color: '#3B6D11', fontWeight: 600, fontSize: 14 }}>#{tag}</span>
                      <span style={{ color: '#B4B2A9', fontSize: 12 }}>{count} {count === 1 ? 'post' : 'posts'}</span>
                    </Link>
                  ))}
              </div>
            )}

            {aba === 'posts' && (
              posts.length === 0
                ? <p style={{ color: '#B4B2A9', fontSize: 13, textAlign: 'center', marginTop: 24 }}>Nenhum post encontrado</p>
                : <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 3 }}>
                  {posts.map(p => (
                    <div key={p.id}
                      onClick={() => { router.push(`/?post=${p.id}`); onClose() }}
                      style={{
                        aspectRatio: '1', overflow: 'hidden', borderRadius: 8,
                        background: '#EAF3DE', cursor: 'pointer'
                      }}>
                      <img src={p.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                  ))}
                </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default function NavbarWrapper({ children }) {
  const [user, setUser] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [buscaAberta, setBuscaAberta] = useState(false)

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

      {/* ── PAINEL DE BUSCA DESKTOP ── */}
      {buscaAberta && (
        <>
          <div
            className="busca-backdrop-desktop"
            onClick={() => setBuscaAberta(false)}
            style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.15)' }}
          />
          <div className="busca-painel-desktop" style={{
            position: 'fixed', left: 220, top: 0, bottom: 0,
            width: 320, background: '#fff', zIndex: 201,
            boxShadow: '4px 0 24px rgba(0,0,0,0.10)',
            borderRight: '0.5px solid #E2F2D4',
            display: 'flex', flexDirection: 'column'
          }}>
            <PainelBusca user={user} onClose={() => setBuscaAberta(false)} />
          </div>
        </>
      )}

      {/* ── PAINEL DE BUSCA MOBILE ── */}
      {buscaAberta && (
        <div className="busca-painel-mobile" style={{
          position: 'fixed', top: 56, left: 0, right: 0, bottom: 0,
          background: '#fff', zIndex: 150,
          display: 'flex', flexDirection: 'column'
        }}>
          <PainelBusca user={user} onClose={() => setBuscaAberta(false)} />
        </div>
      )}

      {/* ── SIDEBAR DESKTOP ── */}
      <aside className="side-navbar">
        <Link href="/" style={{ fontSize: 22, fontWeight: 500, color: '#27500A', marginBottom: 36, display: 'block' }}>
          🌿 plantinha
        </Link>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
          {[
            { href: '/', icon: '⊞', label: 'Feed' },
            { href: '/forum', icon: '💬', label: 'Fórum' },
            ...(user ? [{ href: '/perfil', icon: '🪴', label: 'Meu Jardim' }] : []),
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

          <button
            onClick={() => setBuscaAberta(b => !b)}
            style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '11px 14px', borderRadius: 12, fontSize: 15,
              color: buscaAberta ? '#3B6D11' : '#27500A',
              fontWeight: 500, background: buscaAberta ? '#EAF3DE' : 'transparent',
              border: 'none', cursor: 'pointer', width: '100%', transition: 'all 0.15s'
            }}
            onMouseOver={e => { if (!buscaAberta) e.currentTarget.style.background = '#EAF3DE' }}
            onMouseOut={e => { if (!buscaAberta) e.currentTarget.style.background = 'transparent' }}>
            <span style={{ fontSize: 18 }}>🔍</span>
            Buscar
          </button>

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
          <button
            onClick={() => { setBuscaAberta(b => !b); setMenuOpen(false) }}
            style={{
              width: 30, height: 30, display: 'flex', alignItems: 'center',
              justifyContent: 'center', fontSize: 18,
              background: buscaAberta ? '#EAF3DE' : 'none',
              border: 'none', borderRadius: 8, cursor: 'pointer'
            }}>🔍</button>

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

        {menuOpen && (
          <div onClick={() => setMenuOpen(false)} style={{
            position: 'fixed', inset: 0, top: 56, background: 'rgba(0,0,0,0.3)', zIndex: 99
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
                ...(user ? [{ href: '/perfil', icon: '🪴', label: 'Meu Jardim' }] : []),
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