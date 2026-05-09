'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '../../../lib/supabase'

function Lightbox({ post, onClose }) {
  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      cursor: 'zoom-out', padding: 20
    }}>
      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
        <img src={post.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'blur(24px) brightness(0.4) saturate(1.8)', transform: 'scale(1.1)' }} />
      </div>
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, rgba(39,80,10,0.35) 0%, rgba(15,110,86,0.25) 100%)' }} />
      <div onClick={e => e.stopPropagation()} style={{ position: 'relative', zIndex: 2, width: '100%', maxWidth: 340 }}>
        <img src={post.image_url} alt="" style={{ width: '100%', borderRadius: 20, boxShadow: '0 24px 60px rgba(0,0,0,0.5)', objectFit: 'contain', maxHeight: '65vh', display: 'block' }} />
        <div style={{ background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(12px)', borderRadius: 14, padding: '10px 16px', marginTop: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 13, color: '#fff' }}>{post.caption || ''}</span>
          <span style={{ fontSize: 13, color: '#C0DD97', fontWeight: 500 }}>♥ {post.post_likes?.length ?? 0}</span>
        </div>
      </div>
      <button onClick={onClose} style={{ position: 'fixed', top: 16, right: 16, zIndex: 3, background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)', border: '0.5px solid rgba(255,255,255,0.25)', color: '#fff', width: 36, height: 36, borderRadius: '50%', fontSize: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
    </div>
  )
}

export default function PublicProfilePage() {
  const { id } = useParams()
  const [profile, setProfile] = useState(null)
  const [posts, setPosts] = useState([])
  const [stats, setStats] = useState({ posts: 0, likes: 0 })
  const [selected, setSelected] = useState(null)
  const [loading, setLoading] = useState(true)
  const [currentUser, setCurrentUser] = useState(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setCurrentUser(data.session?.user ?? null))
    load()
  }, [id])

  async function load() {
    const { data: prof } = await supabase
      .from('profiles').select('*').eq('id', id).maybeSingle()
    setProfile(prof)

    const { data: userPosts } = await supabase
      .from('posts').select('*, post_likes(id)')
      .eq('user_id', id)
      .order('created_at', { ascending: false })

    if (userPosts) {
      setPosts(userPosts)
      setStats({
        posts: userPosts.length,
        likes: userPosts.reduce((a, p) => a + (p.post_likes?.length ?? 0), 0)
      })
    }
    setLoading(false)
  }

  if (loading) return <p style={{ textAlign: 'center', marginTop: 60, color: '#888' }}>Carregando...</p>
  if (!profile) return <p style={{ textAlign: 'center', marginTop: 60, color: '#888' }}>Perfil não encontrado.</p>

  const isOwnProfile = currentUser?.id === id
  const initial = (profile.username?.[0] ?? '?').toUpperCase()

  return (
    <div>
      {selected && <Lightbox post={selected} onClose={() => setSelected(null)} />}

      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <div style={{ width: 80, height: 80, borderRadius: '50%', background: '#EAF3DE', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, fontWeight: 500, color: '#27500A', margin: '0 auto 12px', border: '2px solid #C5E4A7' }}>
          {initial}
        </div>
        <p style={{ fontWeight: 500, fontSize: 18, color: '#1a1a1a', marginBottom: 4 }}>{profile.username}</p>
        {profile.bio && <p style={{ fontSize: 13, color: '#888780', marginBottom: 12 }}>{profile.bio}</p>}

        {isOwnProfile && (
          <a href="/perfil" style={{ display: 'inline-block', background: 'transparent', color: '#3B6D11', border: '0.5px solid #C5E4A7', borderRadius: 20, padding: '5px 14px', fontSize: 12, cursor: 'pointer', marginBottom: 16, textDecoration: 'none' }}>
            ir para meu jardim
          </a>
        )}

        <div style={{ display: 'flex', justifyContent: 'center', gap: 40, marginTop: 8 }}>
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