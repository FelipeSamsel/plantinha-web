'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import PostCard from '../components/PostCard'

export default function FeedPage() {
  const [posts, setPosts] = useState([])
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

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
    <div>
      {loading && (
        <p style={{ color: '#888', textAlign: 'center', marginTop: 40 }}>Carregando...</p>
      )}
      {!loading && posts.length === 0 && (
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