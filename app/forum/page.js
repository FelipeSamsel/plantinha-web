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

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setUser(data.session?.user ?? null))
    load()
  }, [filter])

  async function load() {
    let q = supabase.from('forum_posts')
      .select('*, profiles(username), forum_replies(id)')
      .order('created_at', { ascending: false })
    if (filter) q = q.eq('category', filter)
    const { data } = await q
    if (data) setPosts(data)
  }

  async function publish() {
    if (!title || !category) return alert('Escolha uma categoria e escreva sua pergunta.')
    setLoading(true)
    await supabase.from('forum_posts').insert({ user_id: user.id, title, body, category })
    setTitle(''); setBody(''); setCategory(null); setShowForm(false)
    load()
    setLoading(false)
  }

  return (
    <div>
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
          return (
            <div key={post.id} style={{ background: '#fff', borderRadius: 14, border: '0.5px solid #E2F2D4', padding: 16 }}>
              <span style={{ background: bg, color: fg, fontSize: 10, fontWeight: 500, padding: '3px 9px', borderRadius: 20, display: 'inline-block', marginBottom: 8 }}>{post.category}</span>
              <p style={{ fontWeight: 500, fontSize: 14, color: '#1a1a1a', marginBottom: 8 }}>{post.title}</p>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#B4B2A9' }}>
                <span>{post.profiles?.username}</span>
                <span style={{ color: '#3B6D11', fontWeight: 500 }}>{post.forum_replies?.length ?? 0} respostas</span>
              </div>
            </div>
          )
        })}
        {posts.length === 0 && <p style={{ textAlign: 'center', color: '#888', marginTop: 40 }}>Nenhuma pergunta ainda. Seja o primeiro! 🌱</p>}
      </div>
    </div>
  )
}