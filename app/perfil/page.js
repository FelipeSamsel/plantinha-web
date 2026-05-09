'use client'
import { useEffect, useState, useRef } from 'react'
import { supabase } from '../../lib/supabase'

export default function PerfilPage() {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [posts, setPosts] = useState([])
  const [stats, setStats] = useState({ posts: 0, likes: 0 })
  const [editing, setEditing] = useState(false)
  const [username, setUsername] = useState('')
  const [bio, setBio] = useState('')
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [selected, setSelected] = useState(null)
  const fileRef = useRef(null)

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

  async function uploadAvatar(e) {
    const file = e.target.files[0]
    if (!file) return
    setUploadingAvatar(true)
    try {
      const ext = file.name.split('.').pop()
      const filename = `${user.id}.${ext}`
      await supabase.storage.from('avatars').upload(filename, file, { upsert: true })
      const { data } = supabase.storage.from('avatars').getPublicUrl(filename)
      const avatarUrl = `${data.publicUrl}?t=${Date.now()}`
      await supabase.from('profiles').update({ avatar_url: avatarUrl }).eq('id', user.id)
      load()
    } catch (e) { alert(e.message) }
    finally { setUploadingAvatar(false) }
  }

  if (!user) return <p style={{ textAlign: 'center', marginTop: 60, color: '#888' }}>Faça login para ver seu jardim.</p>

  const initial = (profile?.username?.[0] ?? '?').toUpperCase()

  return (
    <div>
      {/* lightbox */}
      {selected && (
        <div onClick={() => setSelected(null)} style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'zoom-out', padding: 20 }}>
          <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
            <img src={selected.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'blur(24px) brightness(0.4) saturate(1.8)', transform: 'scale(1.1)' }} />
          </div>
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, rgba(39,80,10,0.35) 0%, rgba(15,110,86,0.25) 100%)' }} />
          <div onClick={e => e.stopPropagation()} style={{ position: 'relative', zIndex: 2, width: '100%', maxWidth: 340 }}>
            <img src={selected.image_url} alt="" style={{ width: '100%', borderRadius: 20, boxShadow: '0 24px 60px rgba(0,0,0,0.5)', objectFit: 'contain', maxHeight: '65vh', display: 'block' }} />
          </div>
          <button onClick={() => setSelected(null)} style={{ position: 'fixed', top: 16, right: 16, zIndex: 3, background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)', border: '0.5px solid rgba(255,255,255,0.25)', color: '#fff', width: 36, height: 36, borderRadius: '50%', fontSize: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
        </div>
      )}

      <div style={{ textAlign: 'center', marginBottom: 32 }}>

        {/* avatar com botão de upload */}
        <div style={{ position: 'relative', width: 88, height: 88, margin: '0 auto 12px' }}>
          {profile?.avatar_url
            ? <img src={profile.avatar_url} alt="avatar" style={{ width: 88, height: 88, borderRadius: '50%', objectFit: 'cover', border: '2px solid #C5E4A7' }} />
            : <div style={{ width: 88, height: 88, borderRadius: '50%', background: '#EAF3DE', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, fontWeight: 500, color: '#27500A', border: '2px solid #C5E4A7' }}>
                {initial}
              </div>
          }
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploadingAvatar}
            style={{
              position: 'absolute', bottom: 0, right: 0,
              width: 28, height: 28, borderRadius: '50%',
              background: '#3B6D11', border: '2px solid #fff',
              color: '#EAF3DE', fontSize: 14, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
            {uploadingAvatar ? '...' : '📷'}
          </button>
          <input ref={fileRef} type="file" accept="image/*" onChange={uploadAvatar} style={{ display: 'none' }} />
        </div>

        {editing ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 300, margin: '0 auto' }}>
            <input value={username} onChange={e => setUsername(e.target.value)} placeholder="Username"
              style={{ border: '0.5px solid #C5E4A7', borderRadius: 10, padding: 9, fontSize: 14, textAlign: 'center', outline: 'none', fontFamily: 'inherit' }} />
            <input value={bio} onChange={e => setBio(e.target.value)} placeholder="Bio (opcional)"
              style={{ border: '0.5px solid #C5E4A7', borderRadius: 10, padding: 9, fontSize: 13, textAlign: 'center', outline: 'none', fontFamily: 'inherit' }} />
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
              <button onClick={save} style={{ background: '#3B6D11', color: '#EAF3DE', border: 'none', borderRadius: 10, padding: '8px 20px', fontSize: 13, cursor: 'pointer' }}>Salvar</button>
              <button onClick={() => setEditing(false)} style={{ background: 'transparent', color: '#888780', border: '0.5px solid #C5E4A7', borderRadius: 10, padding: '8px 20px', fontSize: 13, cursor: 'pointer' }}>Cancelar</button>
            </div>
          </div>
        ) : (
          <>
            <p style={{ fontWeight: 500, fontSize: 18, color: '#1a1a1a', marginBottom: 4 }}>{profile?.username}</p>
            {profile?.bio && <p style={{ fontSize: 13, color: '#888780', marginBottom: 8 }}>{profile.bio}</p>}
            <button onClick={() => setEditing(true)} style={{ background: 'transparent', color: '#3B6D11', border: '0.5px solid #C5E4A7', borderRadius: 20, padding: '5px 14px', fontSize: 12, cursor: 'pointer', marginBottom: 16 }}>
              editar perfil
            </button>
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
        {posts.map(post => (
          <div key={post.id} onClick={() => setSelected(post)} style={{ aspectRatio: '1', borderRadius: 12, background: '#EAF3DE', overflow: 'hidden', cursor: 'zoom-in' }}>
            {post.image_url
              ? <img src={post.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 }}>🌿</div>
            }
          </div>
        ))}
        {posts.length === 0 && (
          <p style={{ gridColumn: '1/-1', textAlign: 'center', color: '#888', fontSize: 13, marginTop: 20 }}>Nenhum post ainda 🌱</p>
        )}
      </div>
    </div>
  )
}