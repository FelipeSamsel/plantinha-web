'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

function StatCard({ icon, label, value, sub, color = '#3B6D11' }) {
  return (
    <div style={{ background: '#fff', borderRadius: 16, border: '0.5px solid #E2F2D4', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <span style={{ fontSize: 20 }}>{icon}</span>
        <span style={{ fontSize: 13, color: '#888780', fontWeight: 500 }}>{label}</span>
      </div>
      <p style={{ fontSize: 32, fontWeight: 600, color, lineHeight: 1 }}>{value ?? '—'}</p>
      {sub && <p style={{ fontSize: 12, color: '#B4B2A9' }}>{sub}</p>}
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: 32 }}>
      <p style={{ fontSize: 13, fontWeight: 600, color: '#B4B2A9', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 12 }}>{title}</p>
      {children}
    </div>
  )
}

export default function DashboardPage() {
  const [allowed, setAllowed] = useState(null)
  const [tab, setTab] = useState('stats') // 'stats' | 'users'
  const [stats, setStats] = useState(null)
  const [topUsers, setTopUsers] = useState([])
  const [topPosts, setTopPosts] = useState([])
  const [recentUsers, setRecentUsers] = useState([])
  const [allUsers, setAllUsers] = useState([])
  const [deletingUser, setDeletingUser] = useState(null)
  const [userSearch, setUserSearch] = useState('')
  const [currentUserId, setCurrentUserId] = useState(null)
  const [feedbackList, setFeedbackList] = useState([])
  const [feedbackFilter, setFeedbackFilter] = useState('todos')

  useEffect(() => { checkAndLoad() }, [])

  async function checkAndLoad() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setAllowed(false); return }

    const { data: adminRow } = await supabase.from('admins').select('user_id').eq('user_id', user.id).maybeSingle()
    if (!adminRow) { setAllowed(false); return }

    setCurrentUserId(user.id)
    setAllowed(true)
    await loadStats()
    await loadAllUsers()
    await loadFeedback()
  }

  async function loadStats() {
    const now = new Date()
    const d7 = new Date(now - 7 * 86400000).toISOString()
    const d30 = new Date(now - 30 * 86400000).toISOString()

    const [
      { count: totalUsers },
      { count: newUsers7d },
      { count: newUsers30d },
      { count: totalPosts },
      { count: newPosts7d },
      { count: totalComments },
      { count: totalLikes },
      { count: totalForumPosts },
      { count: totalForumReplies },
      { count: totalFollows },
    ] = await Promise.all([
      supabase.from('profiles').select('*', { count: 'exact', head: true }),
      supabase.from('profiles').select('*', { count: 'exact', head: true }).gte('created_at', d7),
      supabase.from('profiles').select('*', { count: 'exact', head: true }).gte('created_at', d30),
      supabase.from('posts').select('*', { count: 'exact', head: true }),
      supabase.from('posts').select('*', { count: 'exact', head: true }).gte('created_at', d7),
      supabase.from('comments').select('*', { count: 'exact', head: true }),
      supabase.from('post_likes').select('*', { count: 'exact', head: true }),
      supabase.from('forum_posts').select('*', { count: 'exact', head: true }),
      supabase.from('forum_replies').select('*', { count: 'exact', head: true }),
      supabase.from('follows').select('*', { count: 'exact', head: true }),
    ])

    // posts por usuário (engajamento médio)
    const avgPostsPerUser = totalUsers > 0 ? (totalPosts / totalUsers).toFixed(1) : 0
    const avgLikesPerPost = totalPosts > 0 ? (totalLikes / totalPosts).toFixed(1) : 0
    const avgCommentsPerPost = totalPosts > 0 ? (totalComments / totalPosts).toFixed(1) : 0

    setStats({
      totalUsers, newUsers7d, newUsers30d,
      totalPosts, newPosts7d,
      totalComments, totalLikes,
      totalForumPosts, totalForumReplies,
      totalFollows,
      avgPostsPerUser, avgLikesPerPost, avgCommentsPerPost,
    })

    // top usuários por posts
    const { data: topPostsData } = await supabase
      .from('posts')
      .select('user_id, profiles(username, avatar_url)')
      .order('created_at', { ascending: false })

    if (topPostsData) {
      const countMap = {}
      topPostsData.forEach(p => {
        const uid = p.user_id
        if (!countMap[uid]) countMap[uid] = { profile: p.profiles, count: 0 }
        countMap[uid].count++
      })
      const sorted = Object.values(countMap).sort((a, b) => b.count - a.count).slice(0, 5)
      setTopUsers(sorted)
    }

    // posts mais curtidos
    const { data: topLikedPosts } = await supabase
      .from('posts')
      .select('id, caption, image_url, profiles(username), post_likes(id)')
      .order('created_at', { ascending: false })
      .limit(100)

    if (topLikedPosts) {
      const sorted = topLikedPosts
        .map(p => ({ ...p, likeCount: p.post_likes?.length ?? 0 }))
        .sort((a, b) => b.likeCount - a.likeCount)
        .slice(0, 5)
      setTopPosts(sorted)
    }

    // usuários mais recentes
    const { data: recent } = await supabase
      .from('profiles')
      .select('id, username, avatar_url, created_at')
      .order('created_at', { ascending: false })
      .limit(8)
    if (recent) setRecentUsers(recent)
  }

  async function loadAllUsers() {
    const { data } = await supabase
      .from('profiles')
      .select('id, username, avatar_url, created_at')
      .order('created_at', { ascending: false })
    if (data) setAllUsers(data)
  }

  async function deleteUser(userId, username) {
    if (!confirm(`Excluir a conta de @${username}? Esta ação é irreversível.`)) return
    setDeletingUser(userId)
    try {
      const { error } = await supabase.rpc('admin_delete_user', { target_user_id: userId })
      if (error) throw error
      setAllUsers(prev => prev.filter(u => u.id !== userId))
    } catch (e) {
      alert('Erro ao excluir: ' + e.message)
    }
    setDeletingUser(null)
  }

  async function loadFeedback() {
    const { data } = await supabase
      .from('feedback')
      .select('*')
      .order('created_at', { ascending: false })
    if (!data) return

    // busca usernames separado
    const userIds = [...new Set(data.filter(f => f.user_id).map(f => f.user_id))]
    let profileMap = {}
    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username, avatar_url')
        .in('id', userIds)
      ;(profiles ?? []).forEach(p => { profileMap[p.id] = p })
    }
    setFeedbackList(data.map(f => ({ ...f, profile: profileMap[f.user_id] ?? null })))
  }

  async function markFeedback(id, status) {
    await supabase.from('feedback').update({ status }).eq('id', id)
    setFeedbackList(prev => prev.map(f => f.id === id ? { ...f, status } : f))
  }

  async function deleteFeedback(id) {
    await supabase.from('feedback').delete().eq('id', id)
    setFeedbackList(prev => prev.filter(f => f.id !== id))
  }

  if (allowed === null) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
      <p style={{ color: '#B4B2A9', fontSize: 14 }}>Verificando acesso...</p>
    </div>
  )

  if (allowed === false) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: 12 }}>
      <span style={{ fontSize: 48 }}>🚫</span>
      <p style={{ color: '#993C1D', fontSize: 16, fontWeight: 500 }}>Acesso negado</p>
      <p style={{ color: '#B4B2A9', fontSize: 13 }}>Você não tem permissão para ver esta página.</p>
    </div>
  )

  function timeAgo(date) {
    const diff = (Date.now() - new Date(date)) / 1000
    if (diff < 3600) return `${Math.floor(diff / 60)}min atrás`
    if (diff < 86400) return `${Math.floor(diff / 3600)}h atrás`
    return `${Math.floor(diff / 86400)}d atrás`
  }

  const filteredUsers = allUsers.filter(u =>
    u.username?.toLowerCase().includes(userSearch.toLowerCase())
  )

  return (
    <div style={{ maxWidth: 780, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
        <span style={{ fontSize: 24 }}>🌿</span>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 600, color: '#27500A' }}>Dashboard</h1>
          <p style={{ fontSize: 12, color: '#B4B2A9' }}>Visão geral da plataforma</p>
        </div>
        <button onClick={() => { loadStats(); loadAllUsers() }} style={{ marginLeft: 'auto', background: '#EAF3DE', border: 'none', borderRadius: 10, padding: '7px 14px', fontSize: 12, color: '#3B6D11', cursor: 'pointer', fontWeight: 500 }}>
          ↻ Atualizar
        </button>
      </div>

      {/* Abas */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 24, borderBottom: '1px solid #E2F2D4' }}>
        {[{ key: 'stats', label: '📊 Estatísticas' }, { key: 'users', label: '👥 Usuários' }, { key: 'feedback', label: '💬 Feedback' }].map(({ key, label }) => (
          <button key={key} onClick={() => setTab(key)} style={{
            padding: '9px 18px', background: 'none', border: 'none', cursor: 'pointer',
            fontSize: 13, fontWeight: 500,
            color: tab === key ? '#3B6D11' : '#B4B2A9',
            borderBottom: tab === key ? '2px solid #3B6D11' : '2px solid transparent',
            marginBottom: -1, transition: 'all 0.15s'
          }}>{label}</button>
        ))}
      </div>

      {/* Aba Usuários */}
      {tab === 'users' && (
        <div>
          <div style={{ marginBottom: 16 }}>
            <input
              value={userSearch}
              onChange={e => setUserSearch(e.target.value)}
              placeholder="Buscar por username..."
              style={{ width: '100%', border: '1px solid #D6ECC4', borderRadius: 12, padding: '10px 16px', fontSize: 14, outline: 'none', background: '#F4FAF0', color: '#27500A', boxSizing: 'border-box' }}
            />
          </div>
          <div style={{ background: '#fff', borderRadius: 16, border: '0.5px solid #E2F2D4', overflow: 'hidden' }}>
            {filteredUsers.length === 0 && <p style={{ textAlign: 'center', color: '#B4B2A9', padding: 32, fontSize: 13 }}>Nenhum usuário encontrado</p>}
            {filteredUsers.map((u, i) => {
              const initial = (u.username?.[0] ?? '?').toUpperCase()
              const isSelf = u.id === currentUserId
              const isDeleting = deletingUser === u.id
              return (
                <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderBottom: i < filteredUsers.length - 1 ? '0.5px solid #F0F7EC' : 'none' }}>
                  <div style={{ width: 38, height: 38, borderRadius: '50%', overflow: 'hidden', background: '#EAF3DE', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {u.avatar_url
                      ? <img src={u.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                      : <span style={{ fontSize: 14, fontWeight: 600, color: '#3B6D11' }}>{initial}</span>
                    }
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 14, fontWeight: 500, color: '#1a1a1a', margin: 0 }}>@{u.username}</p>
                    <p style={{ fontSize: 11, color: '#B4B2A9', margin: '2px 0 0' }}>{timeAgo(u.created_at)}</p>
                  </div>
                  {isSelf
                    ? <span style={{ fontSize: 11, color: '#3B6D11', background: '#EAF3DE', padding: '3px 10px', borderRadius: 20, fontWeight: 600 }}>você</span>
                    : (
                      <button
                        onClick={() => deleteUser(u.id, u.username)}
                        disabled={isDeleting}
                        style={{ padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 500, cursor: isDeleting ? 'default' : 'pointer', border: 'none', background: isDeleting ? '#F0F0F0' : '#FEF2F0', color: isDeleting ? '#B4B2A9' : '#993C1D', transition: 'all 0.15s', whiteSpace: 'nowrap' }}
                      >
                        {isDeleting ? 'excluindo...' : 'excluir conta'}
                      </button>
                    )
                  }
                </div>
              )
            })}
          </div>
          <p style={{ fontSize: 12, color: '#B4B2A9', textAlign: 'center', marginTop: 12 }}>{filteredUsers.length} usuário{filteredUsers.length !== 1 ? 's' : ''}</p>
        </div>
      )}

      {/* Aba Feedback */}
      {tab === 'feedback' && (
        <div>
          {/* Filtros */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
            {['todos', 'novo', 'visto', 'resolvido'].map(f => (
              <button key={f} onClick={() => setFeedbackFilter(f)} style={{
                padding: '5px 14px', borderRadius: 20, fontSize: 12, cursor: 'pointer',
                border: '0.5px solid #C5E4A7',
                background: feedbackFilter === f ? '#3B6D11' : '#fff',
                color: feedbackFilter === f ? '#EAF3DE' : '#888780',
                fontWeight: feedbackFilter === f ? 500 : 400
              }}>{f}</button>
            ))}
            <button onClick={loadFeedback} style={{ marginLeft: 'auto', background: '#EAF3DE', border: 'none', borderRadius: 20, padding: '5px 14px', fontSize: 12, color: '#3B6D11', cursor: 'pointer' }}>↻ Atualizar</button>
          </div>

          {/* Lista */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {feedbackList
              .filter(f => feedbackFilter === 'todos' || f.status === feedbackFilter)
              .map(fb => {
                const statusColor = fb.status === 'novo' ? '#993C1D' : fb.status === 'visto' ? '#854F0B' : '#27500A'
                const statusBg = fb.status === 'novo' ? '#FEF2F0' : fb.status === 'visto' ? '#FAEEDA' : '#EAF3DE'
                return (
                  <div key={fb.id} style={{ background: '#fff', borderRadius: 14, border: '0.5px solid #E2F2D4', padding: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 10 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontSize: 18 }}>{fb.type === 'bug' ? '🐛' : '💡'}</span>
                        <div>
                          <p style={{ fontSize: 13, fontWeight: 600, color: '#1a1a1a', margin: 0 }}>
                            {fb.type === 'bug' ? 'Bug' : 'Sugestão'}
                          </p>
                          <p style={{ fontSize: 11, color: '#B4B2A9', margin: '2px 0 0' }}>
                            {fb.profile?.username ? `@${fb.profiles.username}` : 'visitante'} · {timeAgo(fb.created_at)}
                          </p>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                        <span style={{ background: statusBg, color: statusColor, fontSize: 10, fontWeight: 600, padding: '3px 9px', borderRadius: 20 }}>{fb.status}</span>
                        <button onClick={() => deleteFeedback(fb.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#B4B2A9', fontSize: 12, padding: '2px 6px' }}
                          onMouseOver={e => e.target.style.color = '#993C1D'} onMouseOut={e => e.target.style.color = '#B4B2A9'}>✕</button>
                      </div>
                    </div>
                    <p style={{ fontSize: 13, color: '#333', lineHeight: 1.6, margin: '0 0 12px', background: '#F4FAF0', padding: '10px 12px', borderRadius: 10 }}>{fb.message}</p>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {['novo', 'visto', 'resolvido'].map(s => (
                        <button key={s} onClick={() => markFeedback(fb.id, s)} style={{
                          padding: '5px 12px', borderRadius: 20, fontSize: 11, cursor: 'pointer',
                          border: '0.5px solid #C5E4A7',
                          background: fb.status === s ? '#3B6D11' : '#fff',
                          color: fb.status === s ? '#EAF3DE' : '#888780',
                          fontWeight: fb.status === s ? 600 : 400
                        }}>{s}</button>
                      ))}
                    </div>
                  </div>
                )
              })}
            {feedbackList.filter(f => feedbackFilter === 'todos' || f.status === feedbackFilter).length === 0 && (
              <p style={{ textAlign: 'center', color: '#B4B2A9', padding: 40, fontSize: 13 }}>Nenhum feedback {feedbackFilter !== 'todos' ? `"${feedbackFilter}"` : ''} ainda 🌱</p>
            )}
          </div>
        </div>
      )}

      {/* Aba Estatísticas */}
      {tab === 'stats' && !stats && (
        <p style={{ color: '#B4B2A9', textAlign: 'center', marginTop: 60 }}>Carregando estatísticas...</p>
      )}
      {tab === 'stats' && stats && (
        <>
          {/* Usuários */}
          <Section title="Usuários">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
              <StatCard icon="👥" label="Total de usuários" value={stats.totalUsers} />
              <StatCard icon="🌱" label="Novos (7 dias)" value={stats.newUsers7d} color="#185FA5" />
              <StatCard icon="📅" label="Novos (30 dias)" value={stats.newUsers30d} color="#854F0B" />
              <StatCard icon="🤝" label="Conexões (follows)" value={stats.totalFollows} />
            </div>
          </Section>

          {/* Posts */}
          <Section title="Conteúdo">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
              <StatCard icon="🖼️" label="Total de posts" value={stats.totalPosts} />
              <StatCard icon="✨" label="Posts (7 dias)" value={stats.newPosts7d} color="#185FA5" />
              <StatCard icon="♥" label="Total de curtidas" value={stats.totalLikes} color="#993C1D" />
              <StatCard icon="💬" label="Total de comentários" value={stats.totalComments} />
              <StatCard icon="🌿" label="Tópicos no fórum" value={stats.totalForumPosts} />
              <StatCard icon="↩" label="Respostas no fórum" value={stats.totalForumReplies} />
            </div>
          </Section>

          {/* Engajamento */}
          <Section title="Engajamento médio">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
              <StatCard icon="📊" label="Posts por usuário" value={stats.avgPostsPerUser} sub="média geral" />
              <StatCard icon="♥" label="Curtidas por post" value={stats.avgLikesPerPost} sub="média geral" color="#993C1D" />
              <StatCard icon="💬" label="Comentários por post" value={stats.avgCommentsPerPost} sub="média geral" />
            </div>
          </Section>

          {/* Top usuários */}
          {topUsers.length > 0 && (
            <Section title="Usuários mais ativos (por posts)">
              <div style={{ background: '#fff', borderRadius: 16, border: '0.5px solid #E2F2D4', overflow: 'hidden' }}>
                {topUsers.map((item, i) => {
                  const initial = (item.profile?.username?.[0] ?? '?').toUpperCase()
                  return (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderBottom: i < topUsers.length - 1 ? '0.5px solid #F0F7EC' : 'none' }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#B4B2A9', width: 16 }}>{i + 1}</span>
                      <div style={{ width: 36, height: 36, borderRadius: '50%', overflow: 'hidden', background: '#EAF3DE', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        {item.profile?.avatar_url
                          ? <img src={item.profile.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                          : <span style={{ fontSize: 14, fontWeight: 600, color: '#3B6D11' }}>{initial}</span>
                        }
                      </div>
                      <span style={{ flex: 1, fontSize: 14, fontWeight: 500, color: '#1a1a1a' }}>@{item.profile?.username ?? 'usuário'}</span>
                      <span style={{ fontSize: 13, color: '#3B6D11', fontWeight: 600 }}>{item.count} posts</span>
                    </div>
                  )
                })}
              </div>
            </Section>
          )}

          {/* Posts mais curtidos */}
          {topPosts.length > 0 && (
            <Section title="Posts mais curtidos">
              <div style={{ background: '#fff', borderRadius: 16, border: '0.5px solid #E2F2D4', overflow: 'hidden' }}>
                {topPosts.map((post, i) => (
                  <div key={post.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderBottom: i < topPosts.length - 1 ? '0.5px solid #F0F7EC' : 'none' }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#B4B2A9', width: 16 }}>{i + 1}</span>
                    {post.image_url && <img src={post.image_url} alt="" style={{ width: 44, height: 44, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }} />}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 13, color: '#333', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {post.caption || '(sem legenda)'}
                      </p>
                      <p style={{ fontSize: 11, color: '#B4B2A9', margin: '2px 0 0' }}>@{post.profiles?.username}</p>
                    </div>
                    <span style={{ fontSize: 13, color: '#993C1D', fontWeight: 600, flexShrink: 0 }}>♥ {post.likeCount}</span>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Usuários recentes */}
          {recentUsers.length > 0 && (
            <Section title="Usuários mais recentes">
              <div style={{ background: '#fff', borderRadius: 16, border: '0.5px solid #E2F2D4', overflow: 'hidden' }}>
                {recentUsers.map((u, i) => {
                  const initial = (u.username?.[0] ?? '?').toUpperCase()
                  return (
                    <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', borderBottom: i < recentUsers.length - 1 ? '0.5px solid #F0F7EC' : 'none' }}>
                      <div style={{ width: 34, height: 34, borderRadius: '50%', overflow: 'hidden', background: '#EAF3DE', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        {u.avatar_url
                          ? <img src={u.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                          : <span style={{ fontSize: 13, fontWeight: 600, color: '#3B6D11' }}>{initial}</span>
                        }
                      </div>
                      <span style={{ flex: 1, fontSize: 13, fontWeight: 500, color: '#1a1a1a' }}>@{u.username}</span>
                      <span style={{ fontSize: 11, color: '#B4B2A9' }}>{timeAgo(u.created_at)}</span>
                    </div>
                  )
                })}
              </div>
            </Section>
          )}
        </>
      )}
    </div>
  )
}