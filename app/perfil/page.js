'use client'
import { useEffect, useState, useRef } from 'react'
import { supabase } from '../../lib/supabase'

function PhotoCell({ post }) {
  const [textColor, setTextColor] = useState('#fff')
  const imgRef = useRef(null)
  const likeCount = post.post_likes?.length ?? 0

  function analyzeImage(img) {
    try {
      const canvas = document.createElement('canvas')
      const size = 40
      canvas.width = size
      canvas.height = size
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, img.width - size, img.height - size, size, size, 0, 0, size, size)
      const data = ctx.getImageData(0, 0, size, size).data
      let brightness = 0
      for (let i = 0; i < data.length; i += 4) {
        brightness += (data[i] * 299 + data[i+1] * 587 + data[i+2] * 114) / 1000
      }
      brightness /= (data.length / 4)
      setTextColor(brightness > 128 ? '#1a1a1a' : '#ffffff')
    } catch {
      setTextColor('#ffffff')
    }
  }

  return (
    <div style={{ aspectRatio: '1', borderRadius: 12, background: '#EAF3DE', overflow: 'hidden', position: 'relative' }}>
      {post.image_url ? (
        <>
          <img
            ref={imgRef}
            src={post.image_url}
            alt=""
            crossOrigin="anonymous"
            onLoad={e => analyzeImage(e.target)}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
          {likeCount > 0 && (
            <div style={{ position: 'absolute', bottom: 6, right: 8, display: 'flex', alignItems: 'center', gap: 3 }}>
              <span style={{ fontSize: 11, color: textColor, fontWeight: 500, textShadow: textColor === '#fff' ? '0 1px 3px rgba(0,0,0,0.5)' : '0 1px 3px rgba(255,255,255,0.5)' }}>
                ♥ {likeCount}
              </span>
            </div>
          )}
        </>
      ) : (
        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 }}>🌿</div>
      )}
    </div>
  )
}

export default function PerfilPage() {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [posts, setPosts] = useState([])
  const [stats, setStats] = useState({ posts: 0, likes: 0 })
  const [editing, setEditing] = useState(false)
  const [username, setUsername] = useState('')
  const [bio, setBio] = useState('')

  useEffect(() => { load() }, [])

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setUser(user)

    let { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle()
    if (!prof) {
      const { data: created } = await supabase.from('profiles')
        .insert({ id: user.id, username: user.email?.split('@')[0] ?? 'usuario' })
        .select().single()
      prof = created
    }
    setProfile(prof)
    setUsername(prof?.username ?? '')
    setBio(prof?.bio ?? '')

    const { data: myPosts } = await supabase.from('posts')
      .select('*, post_likes(id)').eq('user_id', user.id)
      .order('created_at', { ascending: false })
    if (myPosts) {
      setPosts(myPosts)
      setStats({ posts: myPosts.length, likes: myPosts.reduce((a, p) => a + (p.post_likes?.length ?? 0), 0) })
    }
  }

  async function save() {
    await supabase.from('profiles').update({ username, bio }).eq('id', user.id)
    setEditing(false)
    load()
  }

  if (!user) return <p style={{ textAlign: 'center', marginTop: 60, color: '#888' }}>Faça login para ver seu jardim.</p>

  const initial = (profile?.username?.[0] ?? '?').toUpperCase()

  return (
    <div>
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <div style={{ width: 80, height: 80, borderRadius: '50%', background: '#EAF3DE', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, fontWeight: 500, color: '#27500A', margin: '0 auto 12px', border: '2px solid #C5E4A7' }}>
          {initial}
        </div>

        {editing ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 300, margin: '0 auto' }}>
            <input value={username} onChange={e => setUsername(e.target.value)} placeholder="Username" style={{ border: '0.5px solid #C5E4A7', borderRadius: 10, padding: 9, fontSize: 14, textAlign: 'center', outline: 'none', fontFamily: 'inherit' }} />
            <input value={bio} onChange={e => setBio(e.target.value)} placeholder="Bio (opcional)" style={{ border: '0.5px solid #C5E4A7', borderRadius: 10, padding: 9, fontSize: 13, textAlign: 'center', outline: 'none', fontFamily: 'inherit' }} />
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
              <button onClick={save} style={{ background: '#3B6D11', color: '#EAF3DE', border: 'none', borderRadius: 10, padding: '8px 20px', fontSize: 13, cursor: 'pointer' }}>Salvar</button>
              <button onClick={() => setEditing(false)} style={{ background: 'transparent', color: '#888780', border: '0.5px solid #C5E4A7', borderRadius: 10, padding: '8px 20px', fontSize: 13, cursor: 'pointer' }}>Cancelar</button>
            </div>
          </div>
        ) : (
          <>
            <p style={{ fontWeight: 500, fontSize: 18, color: '#1a1a1a', marginBottom: 4 }}>{profile?.username}</p>
            {profile?.bio && <p style={{ fontSize: 13, color: '#888780', marginBottom: 8 }}>{profile.bio}</p>}
            <button onClick={() => setEditing(true)} style={{ background: 'transparent', color: '#3B6D11', border: '0.5px solid #C5E4A7', borderRadius: 20, padding: '5px 14px', fontSize: 12, cursor: 'pointer', marginBottom: 16 }}>editar perfil</button>
          </>
        )}

        <div style={{ display: 'flex', justifyContent: 'center', gap: 40, marginTop: 16 }}>
          {[['posts', stats.posts], ['curtidas', stats.likes]].map(([label, val]) => (
            <div key={label} style={{ textAlign: 'center' }}>
              <p style={{ fontWeight: 500, fontSize: 20, color: '#3B6D11' }}>{val}</p>
              <p style={{ fontSize: 12, color: '#888780' }}>{label}</p>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
        {posts.map(post => <PhotoCell key={post.id} post={post} />)}
        {posts.length === 0 && (
          <p style={{ gridColumn: '1/-1', textAlign: 'center', color: '#888', fontSize: 13, marginTop: 20 }}>Nenhum post ainda 🌱</p>
        )}
      </div>
    </div>
  )
}