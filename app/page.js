'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import PostCard from '../components/PostCard'

export default function FeedPage() {
  const [posts, setPosts] = useState([])
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null)
      setLoading(false)
    })
    const { data: listener } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null)
    })
    loadPosts()
    return () => listener.subscription.unsubscribe()
  }, [])

  async function loadPosts() {
    const { data } = await supabase
      .from('posts')
      .select('*, profiles(username), post_likes(id, user_id, profiles(username)), post_tags(tag)')
      .order('created_at', { ascending: false })
      .limit(30)
    if (data) setPosts(data)
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

  if (loading) return null

  if (!user) return <LoginScreen />

  return (
    <div>
      {posts.length === 0 && (
        <p style={{ color: '#888', textAlign: 'center', marginTop: 60 }}>
          Nenhum post ainda. Seja o primeiro! 🌿
        </p>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {posts.map(post => (
          <PostCard key={post.id} post={post} user={user} onLike={toggleLike} onDelete={loadPosts} />
        ))}
      </div>
    </div>
  )
}

function LoginScreen() {
  async function signIn() {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` }
    })
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 200,
      display: 'flex', alignItems: 'center', justifyContent: 'center'
    }}>
      {/* fundo verde desfocado */}
      <div style={{
        position: 'absolute', inset: 0, overflow: 'hidden'
      }}>
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(160deg, #EAF3DE 0%, #C0DD97 40%, #7BBF43 100%)'
        }} />
        {/* círculos decorativos */}
        <div style={{ position: 'absolute', top: -60, right: -60, width: 220, height: 220, borderRadius: '50%', background: 'rgba(59,109,17,0.15)' }} />
        <div style={{ position: 'absolute', bottom: -40, left: -40, width: 160, height: 160, borderRadius: '50%', background: 'rgba(59,109,17,0.1)' }} />
        <div style={{ position: 'absolute', top: '40%', left: -30, width: 100, height: 100, borderRadius: '50%', background: 'rgba(192,221,151,0.4)' }} />
      </div>

      {/* card central */}
      <div style={{
        position: 'relative', zIndex: 2,
        background: 'rgba(255,255,255,0.85)',
        backdropFilter: 'blur(16px)',
        borderRadius: 28, padding: '40px 32px',
        width: '100%', maxWidth: 320,
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0,
        boxShadow: '0 8px 40px rgba(39,80,10,0.15)',
        border: '0.5px solid rgba(197,228,167,0.6)'
      }}>
        {/* ícone */}
        <div style={{ marginBottom: 20 }}>
          <svg width="56" height="56" viewBox="0 0 56 56" fill="none">
            <rect x="18" y="40" width="20" height="10" rx="5" fill="#C0DD97"/>
            <path d="M28 40 C28 40 16 30 16 20 C16 13 21.4 8 28 8 C34.6 8 40 13 40 20 C40 30 28 40 28 40Z" fill="#7BBF43" opacity="0.8"/>
            <path d="M28 24 V40" stroke="#27500A" strokeWidth="2" strokeLinecap="round"/>
            <path d="M28 30 C28 30 23 27 20 22" stroke="#27500A" strokeWidth="1.5" strokeLinecap="round"/>
            <path d="M28 26 C28 26 32 23 35 18" stroke="#27500A" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </div>

        <h1 style={{ fontSize: 28, fontWeight: 500, color: '#27500A', marginBottom: 6, letterSpacing: -0.5 }}>plantinha</h1>
        <p style={{ fontSize: 14, color: '#888780', textAlign: 'center', marginBottom: 32, lineHeight: 1.5 }}>
          A rede social para quem ama plantas 🌿
        </p>

        <button onClick={signIn} style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
          background: '#fff', border: '0.5px solid #C5E4A7', borderRadius: 14,
          padding: '13px 16px', cursor: 'pointer', fontSize: 14, fontWeight: 500, color: '#333',
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)', marginBottom: 16
        }}>
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
            <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
            <path d="M3.964 10.707A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.039l3.007-2.332z" fill="#FBBC05"/>
            <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.961L3.964 7.293C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
          </svg>
          Entrar com Google
        </button>

        <p style={{ fontSize: 11, color: '#B4B2A9', textAlign: 'center', lineHeight: 1.5 }}>
          Ao entrar você concorda com os<br/>termos de uso da plantinha
        </p>
      </div>
    </div>
  )
}