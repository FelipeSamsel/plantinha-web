'use client'
import { useEffect, useState, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import PostCard, { CommentsModal } from '../../components/PostCard'

function FollowList({ title, list, onClose }) {
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 20, width: '100%', maxWidth: 370, maxHeight: '70vh', display: 'flex', flexDirection: 'column', boxShadow: '0 8px 40px rgba(0,0,0,0.15)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 16px 12px', borderBottom: '0.5px solid #E2F2D4' }}>
          <span style={{ fontWeight: 500, fontSize: 15, color: '#27500A' }}>{title}</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: '#888780' }}>✕</button>
        </div>
        <div style={{ overflowY: 'auto', flex: 1, padding: '8px 0' }}>
          {list.length === 0 && <p style={{ textAlign: 'center', color: '#888', fontSize: 13, padding: 24 }}>Nenhum usuário ainda 🌱</p>}
          {list.map(item => {
            const profile = item.profiles ?? item
            const initial = (profile.username?.[0] ?? '?').toUpperCase()
            return (
              <a key={item.id} href={`/perfil/${profile.id}`} onClick={onClose} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', textDecoration: 'none', borderBottom: '0.5px solid #F0F7EC' }}>
                {profile.avatar_url
                  ? <img src={profile.avatar_url} alt="" style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover', border: '1.5px solid #C5E4A7' }} />
                  : <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#EAF3DE', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 500, color: '#27500A', fontSize: 16, border: '1.5px solid #C5E4A7' }}>{initial}</div>
                }
                <span style={{ fontSize: 14, fontWeight: 500, color: '#1a1a1a' }}>{profile.username}</span>
              </a>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default function PerfilPage() {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [posts, setPosts] = useState([])
  const [stats, setStats] = useState({ posts: 0, likes: 0, followers: 0, following: 0 })
  const [editing, setEditing] = useState(false)
  const [username, setUsername] = useState('')
  const [bio, setBio] = useState('')
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [showFollowers, setShowFollowers] = useState(false)
  const [showFollowing, setShowFollowing] = useState(false)
  const [followers, setFollowers] = useState([])
  const [following, setFollowing] = useState([])
  const [selectedPost, setSelectedPost] = useState(null)
  const fileRef = useRef(null)

  useEffect(() => { load() }, [])

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setUser(user)

    let { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle()
    if (!prof) {
      const { data: created } = await supabase.from('profiles').insert({ id: user.id, username: user.email?.split('@')[0] ?? 'usuario' }).select().single()
      prof = created
    }
    setProfile(prof)
    setUsername(prof?.username ?? '')
    setBio(prof?.bio ?? '')

    const { data: myPosts } = await supabase
      .from('posts')
      .select('*, profiles(username, avatar_url), post_likes(id, user_id, profiles(username, avatar_url)), post_tags(tag), comments(id, body, user_id, created_at, profiles(username, avatar_url))')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    const { data: followersData } = await supabase.from('follows').select('id, follower_id, profiles!follows_follower_id_fkey(id, username, avatar_url)').eq('following_id', user.id)
    const followersList = followersData ?? []
    setFollowers(followersList.map(f => ({ id: f.follower_id, profiles: f.profiles })))

    const { data: followingData } = await supabase.from('follows').select('id, following_id, profiles!follows_following_id_fkey(id, username, avatar_url)').eq('follower_id', user.id)
    const followingList = followingData ?? []
    setFollowing(followingList.map(f => ({ id: f.following_id, profiles: f.profiles })))

    if (myPosts) {
      setPosts(myPosts)
      setStats({
        posts: myPosts.length,
        likes: myPosts.reduce((a, p) => a + (p.post_likes?.length ?? 0), 0),
        followers: followersList.length,
        following: followingList.length,
      })
    }
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
        await supabase.from('notifications').insert({ user_id: post.user_id, from_user_id: user.id, type: 'like', post_id: postId, message: `${profile?.username ?? 'Alguém'} curtiu sua foto 🌿` })
      }
    }
    load()
  }

  async function save() {
    await supabase.from('profiles').update({ username, bio }).eq('id', user.id)
    setEditing(false); load()
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
      await supabase.from('profiles').update({ avatar_url: `${data.publicUrl}?t=${Date.now()}` }).eq('id', user.id)
      load()
    } catch (e) { alert(e.message) }
    finally { setUploadingAvatar(false) }
  }

  if (!user) return <p style={{ textAlign: 'center', marginTop: 60, color: '#888' }}>Faça login para ver seu jardim.</p>

  const initial = (profile?.username?.[0] ?? '?').toUpperCase()

  return (
    <div>
      {showFollowers && <FollowList title={`Seguidores (${stats.followers})`} list={followers} onClose={() => setShowFollowers(false)} />}
      {showFollowing && <FollowList title={`Seguindo (${stats.following})`} list={following} onClose={() => setShowFollowing(false)} />}

      {selectedPost && (
        <CommentsModal
          post={selectedPost}
          user={user}
          onLike={toggleLike}
          onClose={() => setSelectedPost(null)}
        />
      )}

      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 28 }}>
        <div style={{ position: 'relative', width: 88, height: 88, margin: '0 auto 12px' }}>
          {profile?.avatar_url
            ? <img src={profile.avatar_url} alt="avatar" style={{ width: 88, height: 88, borderRadius: '50%', objectFit: 'cover', border: '2px solid #C5E4A7' }} />
            : <div style={{ width: 88, height: 88, borderRadius: '50%', background: '#EAF3DE', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, fontWeight: 500, color: '#27500A', border: '2px solid #C5E4A7' }}>{initial}</div>
          }
          <button onClick={() => fileRef.current?.click()} disabled={uploadingAvatar} style={{ position: 'absolute', bottom: 0, right: 0, width: 28, height: 28, borderRadius: '50%', background: '#3B6D11', border: '2px solid #fff', color: '#EAF3DE', fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {uploadingAvatar ? '...' : '📷'}
          </button>
          <input ref={fileRef} type="file" accept="image/*" onChange={uploadAvatar} style={{ display: 'none' }} />
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

        <div style={{ display: 'flex', justifyContent: 'center', gap: 24, marginTop: 8 }}>
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontWeight: 500, fontSize: 20, color: '#3B6D11' }}>{stats.posts}</p>
            <p style={{ fontSize: 12, color: '#888780' }}>posts</p>
          </div>
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontWeight: 500, fontSize: 20, color: '#3B6D11' }}>{stats.likes}</p>
            <p style={{ fontSize: 12, color: '#888780' }}>curtidas</p>
          </div>
          <button onClick={() => setShowFollowers(true)} style={{ textAlign: 'center', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
            <p style={{ fontWeight: 500, fontSize: 20, color: '#3B6D11' }}>{stats.followers}</p>
            <p style={{ fontSize: 12, color: '#888780' }}>seguidores</p>
          </button>
          <button onClick={() => setShowFollowing(true)} style={{ textAlign: 'center', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
            <p style={{ fontWeight: 500, fontSize: 20, color: '#3B6D11' }}>{stats.following}</p>
            <p style={{ fontSize: 12, color: '#888780' }}>seguindo</p>
          </button>
        </div>
      </div>

      <div style={{ borderTop: '0.5px solid #E2F2D4', marginBottom: 16 }} />

      {/* Grid */}
      {posts.length === 0 && <p style={{ textAlign: 'center', color: '#888', fontSize: 13, marginTop: 40 }}>Nenhum post ainda 🌱</p>}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 3 }}>
        {posts.map(post => (
          <div key={post.id} onClick={() => setSelectedPost(post)}
            style={{ aspectRatio: '1', borderRadius: 4, background: '#EAF3DE', overflow: 'hidden', cursor: 'pointer', position: 'relative' }}
            onMouseOver={e => e.currentTarget.querySelector('.ov')?.style && (e.currentTarget.querySelector('.ov').style.opacity = '1')}
            onMouseOut={e => e.currentTarget.querySelector('.ov')?.style && (e.currentTarget.querySelector('.ov').style.opacity = '0')}>
            {post.image_url
              ? <img src={post.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 }}>🌿</div>
            }
            {post.video_url && (
              <div style={{ position: 'absolute', top: 6, left: 6, background: 'rgba(0,0,0,0.55)', borderRadius: 6, padding: '2px 6px', fontSize: 11, color: '#fff', display: 'flex', alignItems: 'center', gap: 3 }}>
                ▶ vídeo
              </div>
            )}
            <div className="ov" style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, opacity: 0, transition: 'opacity 0.15s' }}>
              <span style={{ color: '#fff', fontSize: 13, fontWeight: 600 }}>♥ {post.post_likes?.length ?? 0}</span>
              <span style={{ color: '#fff', fontSize: 13, fontWeight: 600 }}>💬 {post.comments?.length ?? 0}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}