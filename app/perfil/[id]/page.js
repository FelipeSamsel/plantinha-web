'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '../../../lib/supabase'
import PostCard, { CommentsModal } from '../../../components/PostCard'

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

export default function PublicProfilePage() {
  const { id } = useParams()
  const [profile, setProfile] = useState(null)
  const [posts, setPosts] = useState([])
  const [stats, setStats] = useState({ posts: 0, likes: 0, followers: 0, following: 0 })
  const [selectedPost, setSelectedPost] = useState(null)
  const [loading, setLoading] = useState(true)
  const [currentUser, setCurrentUser] = useState(null)
  const [isFollowing, setIsFollowing] = useState(false)
  const [followLoading, setFollowLoading] = useState(false)
  const [showFollowers, setShowFollowers] = useState(false)
  const [showFollowing, setShowFollowing] = useState(false)
  const [followers, setFollowers] = useState([])
  const [following, setFollowing] = useState([])

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setCurrentUser(data.session?.user ?? null))
    load()
  }, [id])

  async function load() {
    const { data: { user } } = await supabase.auth.getUser().catch(() => ({ data: { user: null } }))
    const { data: prof } = await supabase.from('profiles').select('*').eq('id', id).maybeSingle()
    setProfile(prof)

    const { data: userPosts } = await supabase
      .from('posts')
      .select('*, profiles(username, avatar_url), post_likes(id, user_id, profiles(username, avatar_url)), post_tags(tag), comments(id, body, user_id, created_at, profiles(username, avatar_url))')
      .eq('user_id', id)
      .order('created_at', { ascending: false })
    if (userPosts) setPosts(userPosts)

    const { data: followersData } = await supabase.from('follows').select('id, follower_id, profiles!follows_follower_id_fkey(id, username, avatar_url)').eq('following_id', id)
    const followersList = followersData ?? []
    setFollowers(followersList.map(f => ({ id: f.follower_id, profiles: f.profiles })))

    const { data: followingData } = await supabase.from('follows').select('id, following_id, profiles!follows_following_id_fkey(id, username, avatar_url)').eq('follower_id', id)
    const followingList = followingData ?? []
    setFollowing(followingList.map(f => ({ id: f.following_id, profiles: f.profiles })))

    if (user) setIsFollowing(followersList.some(f => f.follower_id === user.id))

    setStats({
      posts: userPosts?.length ?? 0,
      likes: userPosts?.reduce((a, p) => a + (p.post_likes?.length ?? 0), 0) ?? 0,
      followers: followersList.length,
      following: followingList.length,
    })
    setLoading(false)
  }

  async function toggleLike(postId) {
    if (!currentUser) return
    const post = posts.find(p => p.id === postId)
    const liked = post.post_likes.some(l => l.user_id === currentUser.id)
    if (liked) {
      await supabase.from('post_likes').delete().match({ post_id: postId, user_id: currentUser.id })
    } else {
      await supabase.from('post_likes').insert({ post_id: postId, user_id: currentUser.id })
      if (post.user_id !== currentUser.id) {
        const { data: prof } = await supabase.from('profiles').select('username').eq('id', currentUser.id).single()
        await supabase.from('notifications').insert({ user_id: post.user_id, from_user_id: currentUser.id, type: 'like', post_id: postId, message: `${prof?.username ?? 'Alguém'} curtiu sua foto 🌿` })
      }
    }
    load()
  }

  async function toggleFollow() {
    if (!currentUser) return
    setFollowLoading(true)
    if (isFollowing) {
      await supabase.from('follows').delete().match({ follower_id: currentUser.id, following_id: id })
    } else {
      await supabase.from('follows').insert({ follower_id: currentUser.id, following_id: id })
      const { data: prof } = await supabase.from('profiles').select('username').eq('id', currentUser.id).single()
      await supabase.from('notifications').insert({ user_id: id, from_user_id: currentUser.id, type: 'like', message: `${prof?.username ?? 'Alguém'} começou a seguir você 🌿` })
    }
    setIsFollowing(!isFollowing)
    await load()
    setFollowLoading(false)
  }

  if (loading) return <p style={{ textAlign: 'center', marginTop: 60, color: '#888' }}>Carregando...</p>
  if (!profile) return <p style={{ textAlign: 'center', marginTop: 60, color: '#888' }}>Perfil não encontrado.</p>

  const isOwnProfile = currentUser?.id === id
  const initial = (profile.username?.[0] ?? '?').toUpperCase()

  return (
    <div>
      {showFollowers && <FollowList title={`Seguidores (${stats.followers})`} list={followers} onClose={() => setShowFollowers(false)} />}
      {showFollowing && <FollowList title={`Seguindo (${stats.following})`} list={following} onClose={() => setShowFollowing(false)} />}

      {selectedPost && (
        <CommentsModal
          post={selectedPost}
          user={currentUser}
          onLike={toggleLike}
          onClose={() => setSelectedPost(null)}
        />
      )}

      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 28 }}>
        <div style={{ width: 88, height: 88, margin: '0 auto 12px' }}>
          {profile.avatar_url
            ? <img src={profile.avatar_url} alt="avatar" style={{ width: 88, height: 88, borderRadius: '50%', objectFit: 'cover', border: '2px solid #C5E4A7', display: 'block' }} />
            : <div style={{ width: 88, height: 88, borderRadius: '50%', background: '#EAF3DE', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, fontWeight: 500, color: '#27500A', border: '2px solid #C5E4A7' }}>{initial}</div>
          }
        </div>
        <p style={{ fontWeight: 500, fontSize: 18, color: '#1a1a1a', marginBottom: 4 }}>{profile.username}</p>
        {profile.bio && <p style={{ fontSize: 13, color: '#888780', marginBottom: 12 }}>{profile.bio}</p>}

        {isOwnProfile ? (
          <a href="/perfil" style={{ display: 'inline-block', background: 'transparent', color: '#3B6D11', border: '0.5px solid #C5E4A7', borderRadius: 20, padding: '6px 16px', fontSize: 13, cursor: 'pointer', marginBottom: 16, textDecoration: 'none' }}>
            ir para meu jardim
          </a>
        ) : currentUser && (
          <button onClick={toggleFollow} disabled={followLoading} style={{ background: isFollowing ? '#fff' : '#3B6D11', color: isFollowing ? '#3B6D11' : '#EAF3DE', border: isFollowing ? '0.5px solid #C5E4A7' : 'none', borderRadius: 20, padding: '8px 24px', fontSize: 13, fontWeight: 500, cursor: 'pointer', marginBottom: 16, fontFamily: 'inherit', transition: 'all 0.2s' }}>
            {followLoading ? '...' : isFollowing ? 'Seguindo ✓' : '+ Seguir'}
          </button>
        )}

        <div style={{ display: 'flex', justifyContent: 'center', gap: 28, marginTop: 8 }}>
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontWeight: 500, fontSize: 20, color: '#3B6D11' }}>{stats.posts}</p>
            <p style={{ fontSize: 12, color: '#888780' }}>posts</p>
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