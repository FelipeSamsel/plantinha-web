'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import PostCard from '../components/PostCard'

export default function FeedPage() {
  const [posts, setPosts] = useState([])
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTag, setActiveTag] = useState(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null)
      setLoading(false)
    })
    const { data: listener } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null)
    })
    return () => listener.subscription.unsubscribe()
  }, [])

  useEffect(() => { loadPosts() }, [activeTag])

  async function loadPosts() {
    let q = supabase
      .from('posts')
      .select('*, profiles(username, avatar_url), post_likes(id, user_id, profiles(username, avatar_url)), post_tags(tag), comments(id, body, user_id, created_at, profiles(username, avatar_url))')
      .order('created_at', { ascending: false })
      .limit(30)

    if (activeTag) {
      const { data: taggedIds } = await supabase
        .from('post_tags')
        .select('post_id')
        .eq('tag', activeTag)
      const ids = taggedIds?.map(t => t.post_id) ?? []
      if (ids.length === 0) { setPosts([]); return }
      q = q.in('id', ids)
    }

    const { data } = await q
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
      if (post.user_id !== user.id) {
        const { data: profile } = await supabase
          .from('profiles').select('username').eq('id', user.id).single()
        await supabase.from('notifications').insert({
          user_id: post.user_id,
          from_user_id: user.id,
          type: 'like',
          post_id: postId,
          message: `${profile?.username ?? 'Alguém'} curtiu sua foto 🌿`
        })
      }
    }
    loadPosts()
  }

  if (loading) return null
  if (!user) return <LoginScreen />

  return (
    <div>
      {activeTag && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#EAF3DE', borderRadius: 12, padding: '10px 14px', marginBottom: 16, border: '0.5px solid #C5E4A7' }}>
          <span style={{ fontSize: 14, color: '#27500A', fontWeight: 500 }}>#{activeTag}</span>
          <button onClick={() => setActiveTag(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#888780', fontSize: 13, display: 'flex', alignItems: 'center', gap: 4 }}>
            ✕ limpar filtro
          </button>
        </div>
      )}

      {posts.length === 0 && (
        <p style={{ color: '#888', textAlign: 'center', marginTop: 60 }}>
          {activeTag ? `Nenhum post com #${activeTag} ainda.` : 'Nenhum post ainda. Seja o primeiro! 🌿'}
        </p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {posts.map(post => (
          <PostCard
            key={post.id}
            post={post}
            user={user}
            onLike={toggleLike}
            onDelete={loadPosts}
            onTagClick={tag => setActiveTag(tag)}
          />
        ))}
      </div>
    </div>
  )
}

function LoginScreen() {
  const [mode, setMode] = useState('home')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  async function signInGoogle() {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` }
    })
  }

  async function signIn() {
    if (!email || !password) return alert('Preencha e-mail e senha.')
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) alert(error.message === 'Invalid login credentials' ? 'E-mail ou senha incorretos.' : error.message)
    setLoading(false)
  }

  async function register() {
    if (!username || !email || !password) return alert('Preencha todos os campos.')
    if (password.length < 6) return alert('A senha precisa ter pelo menos 6 caracteres.')
    setLoading(true)
    const { error } = await supabase.auth.signUp({
      email, password,
      options: { data: { name: username } }
    })
    if (error) alert(error.message)
    else setSent(true)
    setLoading(false)
  }

  const inputStyle = {
    width: '100%', border: '0.5px solid #C5E4A7', borderRadius: 12,
    padding: '12px 14px', fontSize: 14, outline: 'none',
    fontFamily: 'inherit', background: '#fff', color: '#1a1a1a',
    marginBottom: 10
  }

  const btnGreen = {
    width: '100%', background: '#3B6D11', color: '#EAF3DE',
    border: 'none', borderRadius: 12, padding: '13px 16px',
    fontSize: 14, fontWeight: 500, cursor: 'pointer', marginBottom: 10,
    fontFamily: 'inherit'
  }

  const btnWhite = {
    width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
    background: '#fff', border: '0.5px solid #C5E4A7', borderRadius: 12,
    padding: '13px 16px', cursor: 'pointer', fontSize: 14, fontWeight: 500, color: '#333',
    boxShadow: '0 2px 8px rgba(0,0,0,0.06)', marginBottom: 10, fontFamily: 'inherit'
  }

  const cardStyle = {
    position: 'relative', zIndex: 2,
    background: 'rgba(255,255,255,0.88)',
    backdropFilter: 'blur(16px)',
    borderRadius: 28, padding: '36px 28px',
    width: '100%', maxWidth: 320,
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    boxShadow: '0 8px 40px rgba(39,80,10,0.15)',
    border: '0.5px solid rgba(197,228,167,0.6)'
  }

  const googleIcon = (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
      <path d="M3.964 10.707A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.039l3.007-2.332z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.961L3.964 7.293C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
    </svg>
  )

  const plantIcon = (
    <svg width="56" height="56" viewBox="0 0 56 56" fill="none">
      <rect x="18" y="40" width="20" height="10" rx="5" fill="#C0DD97"/>
      <path d="M28 40 C28 40 16 30 16 20 C16 13 21.4 8 28 8 C34.6 8 40 13 40 20 C40 30 28 40 28 40Z" fill="#7BBF43" opacity="0.8"/>
      <path d="M28 24 V40" stroke="#27500A" strokeWidth="2" strokeLinecap="round"/>
      <path d="M28 30 C28 30 23 27 20 22" stroke="#27500A" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M28 26 C28 26 32 23 35 18" stroke="#27500A" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  )

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(160deg, #EAF3DE 0%, #C0DD97 40%, #7BBF43 100%)' }} />
        <div style={{ position: 'absolute', top: -60, right: -60, width: 220, height: 220, borderRadius: '50%', background: 'rgba(59,109,17,0.15)' }} />
        <div style={{ position: 'absolute', bottom: -40, left: -40, width: 160, height: 160, borderRadius: '50%', background: 'rgba(59,109,17,0.1)' }} />
        <div style={{ position: 'absolute', top: '40%', left: -30, width: 100, height: 100, borderRadius: '50%', background: 'rgba(192,221,151,0.4)' }} />
      </div>

      {mode === 'home' && (
        <div style={cardStyle}>
          <div style={{ marginBottom: 20 }}>{plantIcon}</div>
          <h1 style={{ fontSize: 28, fontWeight: 500, color: '#27500A', marginBottom: 6, letterSpacing: -0.5 }}>plantinha</h1>
          <p style={{ fontSize: 14, color: '#888780', textAlign: 'center', marginBottom: 28, lineHeight: 1.5 }}>
            A rede social para quem ama plantas 🌿
          </p>
          <button onClick={signInGoogle} style={btnWhite}>{googleIcon} Entrar com Google</button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', margin: '2px 0 10px' }}>
            <div style={{ flex: 1, height: 0.5, background: '#C5E4A7' }} />
            <span style={{ fontSize: 12, color: '#B4B2A9' }}>ou</span>
            <div style={{ flex: 1, height: 0.5, background: '#C5E4A7' }} />
          </div>
          <button onClick={() => setMode('login')} style={btnGreen}>Entrar com e-mail</button>
          <button onClick={() => setMode('register')} style={{ ...btnWhite, marginBottom: 0 }}>Criar conta</button>
        </div>
      )}

      {mode === 'login' && (
        <div style={cardStyle}>
          <button onClick={() => setMode('home')} style={{ alignSelf: 'flex-start', background: 'none', border: 'none', color: '#888780', cursor: 'pointer', fontSize: 13, marginBottom: 16, padding: 0, fontFamily: 'inherit' }}>← Voltar</button>
          <h2 style={{ fontSize: 20, fontWeight: 500, color: '#27500A', marginBottom: 20, alignSelf: 'flex-start' }}>Entrar</h2>
          <input style={inputStyle} type="email" placeholder="E-mail" value={email} onChange={e => setEmail(e.target.value)} />
          <input style={inputStyle} type="password" placeholder="Senha" value={password} onChange={e => setPassword(e.target.value)} />
          <button onClick={signIn} disabled={loading} style={{ ...btnGreen, marginTop: 4 }}>
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
          <button onClick={() => setMode('register')} style={{ background: 'none', border: 'none', color: '#3B6D11', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
            Não tem conta? Cadastre-se
          </button>
        </div>
      )}

      {mode === 'register' && !sent && (
        <div style={cardStyle}>
          <button onClick={() => setMode('home')} style={{ alignSelf: 'flex-start', background: 'none', border: 'none', color: '#888780', cursor: 'pointer', fontSize: 13, marginBottom: 16, padding: 0, fontFamily: 'inherit' }}>← Voltar</button>
          <h2 style={{ fontSize: 20, fontWeight: 500, color: '#27500A', marginBottom: 20, alignSelf: 'flex-start' }}>Criar conta</h2>
          <input style={inputStyle} type="text" placeholder="Nome de usuário" value={username} onChange={e => setUsername(e.target.value)} />
          <input style={inputStyle} type="email" placeholder="E-mail" value={email} onChange={e => setEmail(e.target.value)} />
          <input style={inputStyle} type="password" placeholder="Senha (mín. 6 caracteres)" value={password} onChange={e => setPassword(e.target.value)} />
          <button onClick={register} disabled={loading} style={{ ...btnGreen, marginTop: 4 }}>
            {loading ? 'Criando conta...' : 'Criar conta'}
          </button>
          <button onClick={() => setMode('login')} style={{ background: 'none', border: 'none', color: '#3B6D11', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
            Já tem conta? Entre
          </button>
        </div>
      )}

      {mode === 'register' && sent && (
        <div style={cardStyle}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>📬</div>
          <h2 style={{ fontSize: 20, fontWeight: 500, color: '#27500A', marginBottom: 8, textAlign: 'center' }}>Confirme seu e-mail</h2>
          <p style={{ fontSize: 14, color: '#888780', textAlign: 'center', lineHeight: 1.6, marginBottom: 24 }}>
            Enviamos um link de confirmação para<br/>
            <strong style={{ color: '#3B6D11' }}>{email}</strong><br/>
            Clique no link para ativar sua conta.
          </p>
          <button onClick={() => { setMode('login'); setSent(false) }} style={btnGreen}>
            Ir para o login
          </button>
        </div>
      )}
    </div>
  )
}