'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '../../lib/supabase'

export default function BuscaPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [query, setQuery] = useState(searchParams.get('q') || '')
  const [aba, setAba] = useState('pessoas')
  const [loading, setLoading] = useState(false)
  const [user, setUser] = useState(null)

  const [pessoas, setPessoas] = useState([])
  const [hashtags, setHashtags] = useState([])
  const [posts, setPosts] = useState([])
  const [seguindo, setSeguindo] = useState(new Set())

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const u = data.session?.user ?? null
      setUser(u)
      if (u) carregarSeguindo(u.id)
    })
  }, [])

  async function carregarSeguindo(userId) {
    const { data } = await supabase
      .from('follows')
      .select('following_id')
      .eq('follower_id', userId)
    if (data) setSeguindo(new Set(data.map(r => r.following_id)))
  }

  const buscar = useCallback(async (termo) => {
    if (!termo.trim()) {
      setPessoas([]); setHashtags([]); setPosts([])
      return
    }
    setLoading(true)
    const t = termo.trim().replace(/^#/, '')

    const [{ data: users }, { data: tags }, { data: postsData }] = await Promise.all([
      supabase
        .from('profiles')
        .select('id, username, avatar_url')
        .ilike('username', `%${t}%`)
        .limit(20),
      supabase
        .from('post_tags')
        .select('tag')
        .ilike('tag', `%${t}%`),
      supabase
        .from('posts')
        .select('id, image_url, caption')
        .ilike('caption', `%${t}%`)
        .limit(30),
    ])

    // agrupa hashtags e conta
    const tagMap = {}
    tags?.forEach(({ tag }) => { tagMap[tag] = (tagMap[tag] || 0) + 1 })
    const tagList = Object.entries(tagMap)
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count)

    setPessoas(users || [])
    setHashtags(tagList)
    setPosts(postsData || [])
    setLoading(false)
  }, [])

  // debounce
  useEffect(() => {
    const timer = setTimeout(() => buscar(query), 400)
    return () => clearTimeout(timer)
  }, [query, buscar])

  async function toggleSeguir(targetId) {
    if (!user) return
    if (seguindo.has(targetId)) {
      await supabase.from('follows')
        .delete()
        .eq('follower_id', user.id)
        .eq('following_id', targetId)
      setSeguindo(prev => { const s = new Set(prev); s.delete(targetId); return s })
    } else {
      await supabase.from('follows')
        .insert({ follower_id: user.id, following_id: targetId })
      setSeguindo(prev => new Set(prev).add(targetId))
    }
  }

  const abas = [
    { key: 'pessoas', label: 'Pessoas', count: pessoas.length },
    { key: 'hashtags', label: 'Hashtags', count: hashtags.length },
    { key: 'posts', label: 'Posts', count: posts.length },
  ]

  return (
    <div style={{ maxWidth: 600, margin: '0 auto', padding: '24px 16px' }}>

      {/* Campo de busca */}
      <div style={{ position: 'relative', marginBottom: 24 }}>
        <span style={{
          position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
          fontSize: 18, color: '#B4B2A9', pointerEvents: 'none'
        }}>🔍</span>
        <input
          autoFocus
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Buscar pessoas, #hashtags ou palavras..."
          style={{
            width: '100%', padding: '13px 16px 13px 44px',
            borderRadius: 14, border: '1.5px solid #D6ECC4',
            fontSize: 15, outline: 'none', background: '#F4FAF0',
            color: '#27500A', boxSizing: 'border-box',
            transition: 'border-color 0.2s'
          }}
          onFocus={e => e.target.style.borderColor = '#3B6D11'}
          onBlur={e => e.target.style.borderColor = '#D6ECC4'}
        />
        {query && (
          <button
            onClick={() => setQuery('')}
            style={{
              position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: 16, color: '#B4B2A9'
            }}>✕</button>
        )}
      </div>

      {/* Estado vazio */}
      {!query.trim() && (
        <div style={{ textAlign: 'center', color: '#B4B2A9', marginTop: 60 }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🔍</div>
          <p style={{ fontSize: 15 }}>Digite para buscar pessoas, hashtags ou posts</p>
        </div>
      )}

      {/* Resultados */}
      {query.trim() && (
        <>
          {/* Abas */}
          <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: '1px solid #E2F2D4' }}>
            {abas.map(({ key, label, count }) => (
              <button
                key={key}
                onClick={() => setAba(key)}
                style={{
                  padding: '9px 16px', background: 'none', border: 'none',
                  cursor: 'pointer', fontSize: 14, fontWeight: 500,
                  color: aba === key ? '#3B6D11' : '#B4B2A9',
                  borderBottom: aba === key ? '2px solid #3B6D11' : '2px solid transparent',
                  transition: 'all 0.15s', marginBottom: -1
                }}>
                {label} {!loading && count > 0 && (
                  <span style={{
                    background: aba === key ? '#EAF3DE' : '#F4F4F2',
                    color: aba === key ? '#3B6D11' : '#B4B2A9',
                    borderRadius: 20, padding: '1px 7px', fontSize: 12, marginLeft: 4
                  }}>{count}</span>
                )}
              </button>
            ))}
          </div>

          {loading && (
            <div style={{ textAlign: 'center', color: '#B4B2A9', padding: 40 }}>
              <div style={{ fontSize: 24 }}>🌿</div>
              <p style={{ fontSize: 14, marginTop: 8 }}>Buscando...</p>
            </div>
          )}

          {!loading && (
            <>
              {/* ABA PESSOAS */}
              {aba === 'pessoas' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {pessoas.length === 0 ? (
                    <Vazio texto="Nenhuma pessoa encontrada" />
                  ) : pessoas.map(p => (
                    <div key={p.id} style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '12px 14px', borderRadius: 14,
                      background: '#fff', border: '0.5px solid #E2F2D4'
                    }}>
                      <Link href={`/perfil/${p.id}`}>
                        <div style={{
                          width: 44, height: 44, borderRadius: '50%',
                          overflow: 'hidden', background: '#EAF3DE',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          flexShrink: 0
                        }}>
                          {p.avatar_url
                            ? <img src={p.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            : <span style={{ fontSize: 20 }}>🪴</span>
                          }
                        </div>
                      </Link>
                      <Link href={`/perfil/${p.id}`} style={{ flex: 1, color: '#27500A', fontWeight: 500, fontSize: 15, textDecoration: 'none' }}>
                        @{p.username}
                      </Link>
                      {user && user.id !== p.id && (
                        <button
                          onClick={() => toggleSeguir(p.id)}
                          style={{
                            padding: '7px 16px', borderRadius: 20, fontSize: 13,
                            fontWeight: 500, cursor: 'pointer', border: 'none',
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

              {/* ABA HASHTAGS */}
              {aba === 'hashtags' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {hashtags.length === 0 ? (
                    <Vazio texto="Nenhuma hashtag encontrada" />
                  ) : hashtags.map(({ tag, count }) => (
                    <Link key={tag} href={`/?tag=${tag}`} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '13px 16px', borderRadius: 14,
                      background: '#fff', border: '0.5px solid #E2F2D4',
                      textDecoration: 'none'
                    }}>
                      <span style={{ color: '#3B6D11', fontWeight: 600, fontSize: 15 }}>#{tag}</span>
                      <span style={{ color: '#B4B2A9', fontSize: 13 }}>{count} {count === 1 ? 'post' : 'posts'}</span>
                    </Link>
                  ))}
                </div>
              )}

              {/* ABA POSTS */}
              {aba === 'posts' && (
                <>
                  {posts.length === 0 ? (
                    <Vazio texto="Nenhum post encontrado" />
                  ) : (
                    <div style={{
                      display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
                      gap: 3
                    }}>
                      {posts.map(p => (
                        <div key={p.id} style={{
                          aspectRatio: '1', overflow: 'hidden',
                          borderRadius: 8, background: '#EAF3DE',
                          cursor: 'pointer'
                        }}
                          onClick={() => router.push(`/?post=${p.id}`)}>
                          <img
                            src={p.image_url}
                            alt=""
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </>
      )}
    </div>
  )
}

function Vazio({ texto }) {
  return (
    <div style={{ textAlign: 'center', color: '#B4B2A9', padding: '48px 0' }}>
      <div style={{ fontSize: 36, marginBottom: 8 }}>🌱</div>
      <p style={{ fontSize: 14 }}>{texto}</p>
    </div>
  )
}