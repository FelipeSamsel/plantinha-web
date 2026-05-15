'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import PostCard from '../components/PostCard'
import { useT } from '../lib/i18n'

// Busca sugestões — lógica compartilhada, retorna sempre 5 embaralhados
async function fetchSuggestions(userId) {
  const { data: myFollows } = await supabase
    .from('follows').select('following_id').eq('follower_id', userId)
  const myFollowingIds = new Set((myFollows ?? []).map(f => f.following_id))

  let candidates = []

  if (myFollowingIds.size > 0) {
    const { data: friendsFollows } = await supabase
      .from('follows').select('following_id').in('follower_id', [...myFollowingIds])

    const freq = {}
    ;(friendsFollows ?? []).forEach(({ following_id }) => {
      if (following_id !== userId && !myFollowingIds.has(following_id)) {
        freq[following_id] = (freq[following_id] ?? 0) + 1
      }
    })

    const topIds = Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 20).map(([id]) => id)

    if (topIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles').select('id, username, avatar_url').in('id', topIds)
      candidates = (profiles ?? []).sort((a, b) => (freq[b.id] ?? 0) - (freq[a.id] ?? 0))
    }
  }

  // completa com aleatórios se precisar
  if (candidates.length < 10) {
    const excludeIds = [...myFollowingIds, userId, ...candidates.map(c => c.id)]
    const { data: random } = await supabase
      .from('profiles').select('id, username, avatar_url')
      .not('id', 'in', `(${excludeIds.join(',')})`)
      .limit(20)
    candidates = [...candidates, ...(random ?? []).filter(p => !candidates.find(c => c.id === p.id))]
  }

  // embaralha e pega 5
  const shuffled = candidates.sort(() => Math.random() - 0.5)
  return { suggestions: shuffled.slice(0, 5), following: myFollowingIds }
}

// ── Painel lateral desktop ──────────────────────────────────────────
function SuggestPanel({ user }) {
  const [suggestions, setSuggestions] = useState([])
  const [following, setFollowing] = useState(new Set())
  const [loading, setLoading] = useState(true)

  useEffect(() => { if (user) load() }, [user])

  async function load() {
    setLoading(true)
    const { suggestions, following } = await fetchSuggestions(user.id)
    setSuggestions(suggestions)
    setFollowing(following)
    setLoading(false)
  }

  async function toggleFollow(targetId) {
    if (following.has(targetId)) {
      await supabase.from('follows').delete().eq('follower_id', user.id).eq('following_id', targetId)
      setFollowing(prev => { const s = new Set(prev); s.delete(targetId); return s })
    } else {
      await supabase.from('follows').insert({ follower_id: user.id, following_id: targetId })
      const { data: profile } = await supabase.from('profiles').select('username').eq('id', user.id).single()
      await supabase.from('notifications').insert({
        user_id: targetId, from_user_id: user.id, type: 'like',
        message: `${profile?.username ?? 'Alguém'} começou a seguir você 🌿`
      })
      setFollowing(prev => new Set(prev).add(targetId))
    }
  }

  if (loading) return (
    <div style={{ background: '#fff', borderRadius: 16, border: '0.5px solid #E2F2D4', padding: 16 }}>
      <p style={{ fontSize: 13, color: '#B4B2A9', textAlign: 'center' }}>Carregando...</p>
    </div>
  )

  if (suggestions.length === 0) return null

  return (
    <div style={{ background: '#fff', borderRadius: 16, border: '0.5px solid #E2F2D4', overflow: 'hidden', position: 'sticky', top: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px 10px', borderBottom: '0.5px solid #F0F7EC' }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: '#27500A', margin: 0 }}>🌱 Quem seguir</p>
        <button onClick={load} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: '#B4B2A9' }} title="Atualizar sugestões">↻</button>
      </div>
      <div style={{ padding: '6px 0' }}>
        {suggestions.map(profile => {
          const initial = (profile.username?.[0] ?? '?').toUpperCase()
          const isFollowing = following.has(profile.id)
          return (
            <div key={profile.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 14px' }}>
              <a href={`/perfil/${profile.id}`} style={{ flexShrink: 0 }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', overflow: 'hidden', background: '#EAF3DE', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {profile.avatar_url
                    ? <img src={profile.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <span style={{ fontSize: 14, fontWeight: 600, color: '#3B6D11' }}>{initial}</span>
                  }
                </div>
              </a>
              <a href={`/perfil/${profile.id}`} style={{ flex: 1, minWidth: 0, textDecoration: 'none' }}>
                <p style={{ fontSize: 13, fontWeight: 500, color: '#1a1a1a', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  @{profile.username}
                </p>
              </a>
              <button onClick={() => toggleFollow(profile.id)} style={{
                padding: '5px 12px', borderRadius: 20, fontSize: 12, fontWeight: 500,
                cursor: 'pointer', border: 'none', flexShrink: 0,
                background: isFollowing ? '#EAF3DE' : '#3B6D11',
                color: isFollowing ? '#3B6D11' : '#fff', transition: 'all 0.15s'
              }}>
                {isFollowing ? 'Seguindo' : 'Seguir'}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Bolinhas mobile ─────────────────────────────────────────────────
function SuggestStories({ user }) {
  const [suggestions, setSuggestions] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { if (user) load() }, [user])

  async function load() {
    setLoading(true)
    const { suggestions } = await fetchSuggestions(user.id)
    setSuggestions(suggestions)
    setLoading(false)
  }

  if (loading || suggestions.length === 0) return null

  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, paddingRight: 4 }}>
        <p style={{ fontSize: 12, fontWeight: 600, color: '#27500A', margin: 0 }}>🌱 Quem seguir</p>
        <button onClick={load} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: '#B4B2A9' }}>↻</button>
      </div>
      <div style={{ display: 'flex', gap: 16, overflowX: 'auto', paddingBottom: 4, scrollbarWidth: 'none' }}>
        {suggestions.map(profile => {
          const initial = (profile.username?.[0] ?? '?').toUpperCase()
          return (
            <a key={profile.id} href={`/perfil/${profile.id}`} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, textDecoration: 'none', flexShrink: 0 }}>
              <div style={{
                width: 56, height: 56, borderRadius: '50%', overflow: 'hidden',
                background: '#EAF3DE', border: '2px solid #C5E4A7',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                {profile.avatar_url
                  ? <img src={profile.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <span style={{ fontSize: 20, fontWeight: 600, color: '#3B6D11' }}>{initial}</span>
                }
              </div>
              <span style={{ fontSize: 11, color: '#27500A', fontWeight: 500, maxWidth: 60, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'center' }}>
                {profile.username}
              </span>
            </a>
          )
        })}
      </div>
    </div>
  )
}

// ── Feed principal ───────────────────────────────────────────────────
export default function FeedPage() {
  const t = useT()
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
      const { data: taggedIds } = await supabase.from('post_tags').select('post_id').eq('tag', activeTag)
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
        const { data: profile } = await supabase.from('profiles').select('username').eq('id', user.id).single()
        await supabase.from('notifications').insert({
          user_id: post.user_id, from_user_id: user.id, type: 'like', post_id: postId,
          message: t.liked(profile?.username ?? 'Alguém')
        })
      }
    }
    loadPosts()
  }

  if (loading) return null
  if (!user) return <LoginScreen />

  return (
    <>
      <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>

        {/* Coluna principal */}
        <div style={{ flex: 1, minWidth: 0 }}>

          {/* Bolinhas mobile — some no desktop */}
          <div className="stories-mobile">
            <SuggestStories user={user} />
          </div>

          {activeTag && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#EAF3DE', borderRadius: 12, padding: '10px 14px', marginBottom: 16, border: '0.5px solid #C5E4A7' }}>
              <span style={{ fontSize: 14, color: '#27500A', fontWeight: 500 }}>#{activeTag}</span>
              <button onClick={() => setActiveTag(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#888780', fontSize: 13, display: 'flex', alignItems: 'center', gap: 4 }}>
                {t.clearFilter}
              </button>
            </div>
          )}

          {posts.length === 0 && (
            <p style={{ color: '#888', textAlign: 'center', marginTop: 60 }}>
              {activeTag ? t.noPostsTag(activeTag) : t.noPostsYet}
            </p>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {posts.map(post => (
              <PostCard key={post.id} post={post} user={user} onLike={toggleLike} onDelete={loadPosts} onTagClick={tag => setActiveTag(tag)} />
            ))}
          </div>
        </div>

        {/* Coluna direita — some no mobile */}
        <div className="suggest-col" style={{ width: 260, flexShrink: 0 }}>
          <SuggestPanel user={user} />
        </div>
      </div>

      <style>{`
        .suggest-col { display: block; }
        .stories-mobile { display: none; }
        @media (max-width: 900px) {
          .suggest-col { display: none !important; }
          .stories-mobile { display: block !important; }
        }
        .stories-mobile div::-webkit-scrollbar { display: none; }
      `}</style>
    </>
  )
}

// ── Tela de login ────────────────────────────────────────────────────
function LoginScreen() {
  const t = useT()
  const [mode, setMode] = useState('home')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  async function signInGoogle() {
    await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: `${window.location.origin}/auth/callback` } })
  }

  async function signIn() {
    if (!email || !password) return alert(t.fillEmailPassword)
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) alert(error.message === 'Invalid login credentials' ? t.wrongCredentials : error.message)
    setLoading(false)
  }

  async function register() {
    if (!username || !email || !password) return alert(t.fillAllFields)
    if (password.length < 6) return alert(t.passwordTooShort)
    setLoading(true)
    const { error } = await supabase.auth.signUp({ email, password, options: { data: { name: username } } })
    if (error) alert(error.message)
    else setSent(true)
    setLoading(false)
  }

  const inputStyle = { width: '100%', border: '0.5px solid #C5E4A7', borderRadius: 12, padding: '12px 14px', fontSize: 14, outline: 'none', fontFamily: 'inherit', background: '#fff', color: '#1a1a1a', marginBottom: 10 }
  const btnGreen = { width: '100%', background: '#3B6D11', color: '#EAF3DE', border: 'none', borderRadius: 12, padding: '13px 16px', fontSize: 14, fontWeight: 500, cursor: 'pointer', marginBottom: 10, fontFamily: 'inherit' }
  const btnWhite = { width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, background: '#fff', border: '0.5px solid #C5E4A7', borderRadius: 12, padding: '13px 16px', cursor: 'pointer', fontSize: 14, fontWeight: 500, color: '#333', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', marginBottom: 10, fontFamily: 'inherit' }
  const cardStyle = { position: 'relative', zIndex: 2, background: 'rgba(255,255,255,0.88)', backdropFilter: 'blur(16px)', borderRadius: 28, padding: '36px 28px', width: '100%', maxWidth: 320, display: 'flex', flexDirection: 'column', alignItems: 'center', boxShadow: '0 8px 40px rgba(39,80,10,0.15)', border: '0.5px solid rgba(197,228,167,0.6)' }

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
          <p style={{ fontSize: 14, color: '#888780', textAlign: 'center', marginBottom: 28, lineHeight: 1.5 }}>{t.tagline}</p>
          <button onClick={signInGoogle} style={btnWhite}>{googleIcon} {t.signInGoogle}</button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', margin: '2px 0 10px' }}>
            <div style={{ flex: 1, height: 0.5, background: '#C5E4A7' }} />
            <span style={{ fontSize: 12, color: '#B4B2A9' }}>ou</span>
            <div style={{ flex: 1, height: 0.5, background: '#C5E4A7' }} />
          </div>
          <button onClick={() => setMode('login')} style={btnGreen}>{t.signInEmail}</button>
          <button onClick={() => setMode('register')} style={{ ...btnWhite, marginBottom: 0 }}>{t.createAccount}</button>
        </div>
      )}
      {mode === 'login' && (
        <div style={cardStyle}>
          <button onClick={() => setMode('home')} style={{ alignSelf: 'flex-start', background: 'none', border: 'none', color: '#888780', cursor: 'pointer', fontSize: 13, marginBottom: 16, padding: 0, fontFamily: 'inherit' }}>{t.back}</button>
          <h2 style={{ fontSize: 20, fontWeight: 500, color: '#27500A', marginBottom: 20, alignSelf: 'flex-start' }}>{t.signIn}</h2>
          <input style={inputStyle} type="email" placeholder={t.email} value={email} onChange={e => setEmail(e.target.value)} />
          <input style={inputStyle} type="password" placeholder={t.password} value={password} onChange={e => setPassword(e.target.value)} />
          <button onClick={signIn} disabled={loading} style={{ ...btnGreen, marginTop: 4 }}>{loading ? t.signingIn : t.signIn}</button>
          <button onClick={() => setMode('register')} style={{ background: 'none', border: 'none', color: '#3B6D11', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>{t.noAccount}</button>
        </div>
      )}
      {mode === 'register' && !sent && (
        <div style={cardStyle}>
          <button onClick={() => setMode('home')} style={{ alignSelf: 'flex-start', background: 'none', border: 'none', color: '#888780', cursor: 'pointer', fontSize: 13, marginBottom: 16, padding: 0, fontFamily: 'inherit' }}>{t.back}</button>
          <h2 style={{ fontSize: 20, fontWeight: 500, color: '#27500A', marginBottom: 20, alignSelf: 'flex-start' }}>{t.createAccount}</h2>
          <input style={inputStyle} type="text" placeholder={t.username} value={username} onChange={e => setUsername(e.target.value)} />
          <input style={inputStyle} type="email" placeholder={t.email} value={email} onChange={e => setEmail(e.target.value)} />
          <input style={inputStyle} type="password" placeholder={t.passwordMin} value={password} onChange={e => setPassword(e.target.value)} />
          <button onClick={register} disabled={loading} style={{ ...btnGreen, marginTop: 4 }}>{loading ? t.creatingAccount : t.createAccount}</button>
          <button onClick={() => setMode('login')} style={{ background: 'none', border: 'none', color: '#3B6D11', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>{t.hasAccount}</button>
        </div>
      )}
      {mode === 'register' && sent && (
        <div style={cardStyle}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>📬</div>
          <h2 style={{ fontSize: 20, fontWeight: 500, color: '#27500A', marginBottom: 8, textAlign: 'center' }}>{t.confirmEmail}</h2>
          <p style={{ fontSize: 14, color: '#888780', textAlign: 'center', lineHeight: 1.6, marginBottom: 24 }}>
            {t.confirmEmailText(email)}<br/>
            <strong style={{ color: '#3B6D11' }}>{email}</strong><br/>
            {t.confirmEmailAction}
          </p>
          <button onClick={() => { setMode('login'); setSent(false) }} style={btnGreen}>{t.goToLogin}</button>
        </div>
      )}
    </div>
  )
}