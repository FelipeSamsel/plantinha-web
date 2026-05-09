'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

const CATS = [null, 'ajuda', 'identificar', 'dica', 'onde_comprar']
const BADGE = { ajuda: ['#FEF2F0','#993C1D'], identificar: ['#E6F1FB','#185FA5'], dica: ['#EAF3DE','#27500A'], onde_comprar: ['#FAEEDA','#854F0B'] }

export default function ForumPage() {
  const [posts, setPosts] = useState([])
  const [filter, setFilter] = useState(null)
  const [user, setUser] = useState(null)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [category, setCategory] = useState(null)
  const [loading, setLoading] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [selectedPost, setSelectedPost] = useState(null)
  const [replies, setReplies] = useState([])
  const [newReply, setNewReply] = useState('')
  const [loadingReply, setLoadingReply] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setUser(data.session?.user ?? null))
    load()
  }, [filter])

  useEffect(() => {
    if (selectedPost) loadReplies(selectedPost.id)
  }, [selectedPost])

  async function load() {
    let q = supabase.from('forum_posts')
      .select('*, profiles(username), forum_replies(id)')
      .order('created_at', { ascending: false })
    if (filter) q = q.eq('category', filter)
    const { data } = await q
    if (data) setPosts(data)
  }

  async function loadReplies(postId) {
    const { data } = await supabase
      .from('forum_replies')
      .select('*, profiles(username)')
      .eq('forum_post_id', postId)
      .order('created_at', { ascending: true })
    if (data) setReplies(data)
  }

  async function publish() {
    if (!title || !category) return alert('Escolha uma categoria e escreva sua pergunta.')
    setLoading(true)
    await supabase.from('forum_posts').insert({ user_id: user.id, title, body, category })
    setTitle(''); setBody(''); setCategory(null); setShowForm(false)
    load()
    setLoading(false)
  }

  async function sendReply() {
    if (!newReply.trim()) return
    setLoadingReply(true)

    await supabase.from('forum_replies').insert({
      forum_post_id: selectedPost.id,
      user_id: user.id,
      body: newReply.trim()
    })

    // notifica o dono do post se não for ele mesmo respondendo
    if (selectedPost.user_id !== user.id) {
      const { data: profile } = await supabase
        .from('profiles').select('username').eq('id', user.id).single()
      await supabase.from('notifications').insert({
        user_id: selectedPost.user_id,
        from_user_id: user.id,
        type: 'forum_reply',
        forum_post_id: selectedPost.id,
        message: `${profile?.username ?? 'Alguém'} respondeu sua pergunta: "${selectedPost.title.slice(0, 50)}${selectedPost.title.length > 50 ? '...' : ''}"`
      })
    }

    setNewReply('')
    await loadReplies(selectedPost.id)
    load()
    setLoadingReply(false)
  }

  async function deleteReply(replyId) {
    await supabase.from('forum_replies').delete().eq('id', replyId)
    loadReplies(selectedPost.id)
    load()
  }

  async function deleteForumPost(postId) {
    if (!confirm('Tem certeza que quer excluir esta pergunta?')) return
    await supabase.from('forum_replies').delete().eq('forum_post_id', postId)
    await supabase.from('forum_posts').delete().eq('id', postId)
    load()
  }

  function timeAgo(date) {
    const diff = (Date.now() - new Date(date)) / 1000
    if (diff < 60) return 'agora'
    if (diff < 3600) return `${Math.floor(diff / 60)}min`
    if (diff < 86400) return `${Math.floor(diff / 3600)}h`
    return `${Math.floor(diff / 86400)}d`
  }

  return (
    <div>
      {/* modal de respostas */}
      {selectedPost && (
        <div onClick={() => setSelectedPost(null)} style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
          zIndex: 1000
        }}>
          <div onClick={e => e.stopPropagation()} style={{
            background: '#fff', borderRadius: '20px 20px 0 0',
            width: '100%', maxWidth: 390, maxHeight: '80vh',
            display: 'flex', flexDirection: 'column'
          }}>
            <div style={{ padding: '16px 16px 12px', borderBottom: '0.5px solid #E2F2D4', flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontWeight: 500, fontSize: 14, color: '#27500A', flex: 1, paddingRight: 12, lineHeight: 1.4 }}>{selectedPost.title}</span>
                <button onClick={() => setSelectedPost(null)} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: '#888780', flexShrink: 0 }}>✕</button>
              </div>
              {selectedPost.body && <p style={{ fontSize: 13, color: '#888780', lineHeight: 1.5 }}>{selectedPost.body}</p>}
              <p style={{ fontSize: 11, color: '#B4B2A9', marginTop: 6 }}>por {selectedPost.profiles?.username}</p>
            </div>

            <div style={{ overflowY: 'auto', flex: 1, padding: '8px 0' }}>
              {replies.length === 0 && (
                <p style={{ textAlign: 'center', color: '#888', fontSize: 13, padding: 24 }}>Nenhuma resposta ainda. Seja o primeiro! 🌱</p>
              )}
              {replies.map(reply => {
                const rInitial = (reply.profiles?.username?.[0] ?? '?').toUpperCase()
                const isReplyOwner = user && user.id === reply.user_id
                return (
                  <div key={reply.id} style={{ display: 'flex', gap: 10, padding: '10px 16px', alignItems: 'flex-start' }}>
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#EAF3DE', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 500, color: '#3B6D11', fontSize: 12, flexShrink: 0 }}>
                      {rInitial}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 3 }}>
                        <span style={{ fontWeight: 500, fontSize: 13, color: '#1a1a1a' }}>{reply.profiles?.username ?? 'usuário'}</span>
                        <span style={{ fontSize: 11, color: '#B4B2A9' }}>{timeAgo(reply.created_at)}</span>
                        {isReplyOwner && (
                          <button onClick={() => deleteReply(reply.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#B4B2A9', fontSize: 11, padding: 0, marginLeft: 4 }}
                            onMouseOver={e => e.target.style.color = '#993C1D'}
                            onMouseOut={e => e.target.style.color = '#B4B2A9'}>
                            excluir
                          </button>
                        )}
                      </div>
                      <p style={{ fontSize: 13, color: '#333', lineHeight: 1.4 }}>{reply.body}</p>
                    </div>
                  </div>
                )
              })}
            </div>

            {user && (
              <div style={{ padding: '12px 16px', borderTop: '0.5px solid #E2F2D4', display: 'flex', gap: 8, flexShrink: 0 }}>
                <input
                  value={newReply}
                  onChange={e => setNewReply(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && sendReply()}
                  placeholder="Escreva sua resposta..."
                  style={{ flex: 1, border: '0.5px solid #C5E4A7', borderRadius: 20, padding: '9px 14px', fontSize: 13, outline: 'none', fontFamily: 'inherit', background: '#F4FAF0' }}
                />
                <button onClick={sendReply} disabled={loadingReply || !newReply.trim()} style={{
                  background: newReply.trim() ? '#3B6D11' : '#C5E4A7',
                  border: 'none', borderRadius: 20, padding: '9px 16px',
                  fontSize: 13, fontWeight: 500, color: '#EAF3DE',
                  cursor: newReply.trim() ? 'pointer' : 'default',
                  fontFamily: 'inherit'
                }}>
                  {loadingReply ? '...' : 'Enviar'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h1 style={{ fontSize: 20, fontWeight: 500, color: '#27500A' }}>Fórum</h1>
        {user && <button onClick={() => setShowForm(!showForm)} style={{ background: '#3B6D11', color: '#EAF3DE', border: 'none', borderRadius: 20, padding: '7px 16px', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>+ Pergunta</button>}
      </div>

      {showForm && (
        <div style={{ background: '#fff', borderRadius: 16, border: '0.5px solid #E2F2D4', padding: 16, marginBottom: 20 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
            {CATS.slice(1).map(c => (
              <button key={c} onClick={() => setCategory(c)} style={{ padding: '6px 14px', borderRadius: 20, fontSize: 12, cursor: 'pointer', border: '0.5px solid #C5E4A7', background: category === c ? '#EAF3DE' : '#fff', color: category === c ? '#3B6D11' : '#888780', fontWeight: category === c ? 500 : 400 }}>{c}</button>
            ))}
          </div>
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Sua pergunta..." style={{ width: '100%', border: '0.5px solid #C5E4A7', borderRadius: 10, padding: 10, fontSize: 13, marginBottom: 10, outline: 'none', fontFamily: 'inherit' }} />
          <textarea value={body} onChange={e => setBody(e.target.value)} placeholder="Mais detalhes (opcional)..." rows={3} style={{ width: '100%', border: '0.5px solid #C5E4A7', borderRadius: 10, padding: 10, fontSize: 13, fontFamily: 'inherit', resize: 'none', marginBottom: 12, outline: 'none' }} />
          <button onClick={publish} disabled={loading} style={{ background: '#3B6D11', color: '#EAF3DE', border: 'none', borderRadius: 10, padding: '10px 24px', fontSize: 14, fontWeight: 500, cursor: 'pointer', width: '100%' }}>
            {loading ? 'Enviando...' : 'Enviar pergunta'}
          </button>
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
        {CATS.map(f => (
          <button key={f ?? 'todos'} onClick={() => setFilter(f)} style={{ padding: '5px 14px', borderRadius: 20, fontSize: 12, cursor: 'pointer', border: '0.5px solid #C5E4A7', background: filter === f ? '#3B6D11' : '#fff', color: filter === f ? '#EAF3DE' : '#888780' }}>
            {f ?? 'todos'}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {posts.map(post => {
          const [bg, fg] = BADGE[post.category] ?? ['#F1EFE8', '#444']
          const isOwner = user && user.id === post.user_id
          return (
            <div key={post.id} style={{ background: '#fff', borderRadius: 14, border: '0.5px solid #E2F2D4', padding: 16, cursor: 'pointer' }}
              onClick={() => setSelectedPost(post)}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ background: bg, color: fg, fontSize: 10, fontWeight: 500, padding: '3px 9px', borderRadius: 20, display: 'inline-block' }}>{post.category}</span>
                {isOwner && (
                  <button
                    onClick={e => { e.stopPropagation(); deleteForumPost(post.id) }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#B4B2A9', fontSize: 12, padding: '2px 6px', borderRadius: 6 }}
                    onMouseOver={e => e.target.style.color = '#993C1D'}
                    onMouseOut={e => e.target.style.color = '#B4B2A9'}>
                    excluir
                  </button>
                )}
              </div>
              <p style={{ fontWeight: 500, fontSize: 14, color: '#1a1a1a', marginBottom: 8 }}>{post.title}</p>
              {post.body && <p style={{ fontSize: 13, color: '#888780', marginBottom: 8, lineHeight: 1.5 }}>{post.body}</p>}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#B4B2A9' }}>
                <span>{post.profiles?.username}</span>
                <span style={{ color: '#3B6D11', fontWeight: 500 }}>💬 {post.forum_replies?.length ?? 0} respostas</span>
              </div>
            </div>
          )
        })}
        {posts.length === 0 && <p style={{ textAlign: 'center', color: '#888', marginTop: 40 }}>Nenhuma pergunta ainda. Seja o primeiro! 🌱</p>}
      </div>
    </div>
  )
}