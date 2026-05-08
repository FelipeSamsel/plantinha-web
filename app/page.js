'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import PostCard from '../components/PostCard'
import NewPost from '../components/NewPost'

export default function FeedPage() {
  const [posts, setPosts] = useState([])
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setUser(data.session?.user ?? null))
    loadPosts()
  }, [])

  async function loadPosts() {
    const { data } = await supabase
      .from('posts')
      .select('*, profiles(username), post_likes(id, user_id, profiles(username)), post_tags(tag)')
      .order('created_at', { ascending: false })
      .limit(30)
    if (data) setPosts(data)
    setLoading(false)
  }

  async function toggleLike(postId) {
    if (!user) return
    const post = posts.find(p => p.id === postId)
    const liked = post.post_likes.some(l => l.user_id === user.id)
    if (liked) {
      await supabase.from('post_likes').delete().match({ post_id: postId, user_id: user.id })
    } else {
      await supabase.from('post_likes').insert({ post_id: postId, user_id: user.id })
    }
    loadPosts()
  }

  return (
    <div style={{ paddingBottom: 80 }}>

      {/* modal de novo post */}
      {showModal && (
        <div onClick={() => setShowModal(false)} style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
          zIndex: 1000, padding: 16
        }}>
          <div onClick={e => e.stopPropagation()} style={{
            background: '#F4FAF0', borderRadius: '20px 20px 0 0',
            width: '100%', maxWidth: 390, maxHeight: '90vh',
            overflowY: 'auto', paddingBottom: 24
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 16px 8px' }}>
              <span style={{ fontWeight: 500, fontSize: 15, color: '#27500A' }}>Nova publicação</span>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: '#888780' }}>✕</button>
            </div>
            <div style={{ padding: '0 16px' }}>
              <NewPost user={user} onPost={() => { setShowModal(false); loadPosts() }} />
            </div>
          </div>
        </div>
      )}

      {loading && <p style={{ color: '#888', textAlign: 'center', marginTop: 40 }}>Carregando...</p>}
      {!loading && posts.length === 0 && (
        <p style={{ color: '#888', textAlign: 'center', marginTop: 60 }}>Nenhum post ainda. Seja o primeiro! 🌿</p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {posts.map(post => (
          <PostCard key={post.id} post={post} user={user} onLike={toggleLike} onDelete={loadPosts} />
        ))}
      </div>

      {/* botão flutuante */}
      {user && (
        <button onClick={() => setShowModal(true)} style={{
          position: 'fixed', bottom: 24, right: '50%',
          transform: 'translateX(50%)',
          background: '#3B6D11',
          border: 'none', borderRadius: 50,
          padding: '12px 22px',
          display: 'flex', alignItems: 'center', gap: 8,
          cursor: 'pointer', zIndex: 100,
          boxShadow: '0 4px 20px rgba(39,80,10,0.4)',
        }}>
          <svg width="22" height="22" viewBox="0 0 32 32" fill="none">
            <rect x="10" y="22" width="12" height="6" rx="3" fill="#C0DD97"/>
            <path d="M16 22 C16 22 10 16 10 11 C10 7.5 12.8 5 16 5 C19.2 5 22 7.5 22 11 C22 16 16 22 16 22Z" fill="#EAF3DE" opacity="0.9"/>
            <path d="M16 13 V22" stroke="#3B6D11" stroke-width="1.5" stroke-linecap="round"/>
            <path d="M16 17 C16 17 13 15 11 12" stroke="#3B6D11" stroke-width="1.2" stroke-linecap="round"/>
            <path d="M16 15 C16 15 18.5 13 20 10" stroke="#3B6D11" stroke-width="1.2" stroke-linecap="round"/>
          </svg>
          <span style={{ color: '#EAF3DE', fontSize: 13, fontWeight: 500 }}>Nova muda</span>
        </button>
      )}

    </div>
  )
}