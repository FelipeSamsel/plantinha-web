'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Notifications({ user }) {
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState([])
  const unread = notifications.filter(n => !n.read).length

  useEffect(() => {
    if (!user) return
    loadNotifications()

    // escuta notificações em tempo real
    const channel = supabase
      .channel('notifications')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${user.id}`
      }, () => loadNotifications())
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [user])

  async function loadNotifications() {
    const { data } = await supabase
      .from('notifications')
      .select('*, profiles!notifications_from_user_id_fkey(username)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(30)
    if (data) setNotifications(data)
  }

  async function markAllRead() {
    await supabase.from('notifications').update({ read: true }).eq('user_id', user.id).eq('read', false)
    loadNotifications()
  }

  async function markRead(id) {
    await supabase.from('notifications').update({ read: true }).eq('id', id)
    loadNotifications()
  }

  async function deleteAll() {
    await supabase.from('notifications').delete().eq('user_id', user.id)
    setNotifications([])
  }

  function getLink(n) {
    if (n.post_id) return `/?post=${n.post_id}`
    if (n.forum_post_id) return `/forum`
    return '/'
  }

  function getIcon(type) {
    if (type === 'like') return '♥'
    if (type === 'comment') return '💬'
    if (type === 'forum_reply') return '🌱'
    return '🔔'
  }

  function timeAgo(date) {
    const diff = (Date.now() - new Date(date)) / 1000
    if (diff < 60) return 'agora'
    if (diff < 3600) return `${Math.floor(diff / 60)}min`
    if (diff < 86400) return `${Math.floor(diff / 3600)}h`
    return `${Math.floor(diff / 86400)}d`
  }

  if (!user) return null

  return (
    <>
      {open && (
        <div onClick={() => setOpen(false)} style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
          zIndex: 1000
        }}>
          <div onClick={e => e.stopPropagation()} style={{
            background: '#fff', borderRadius: '20px 20px 0 0',
            width: '100%', maxWidth: 390, maxHeight: '75vh',
            display: 'flex', flexDirection: 'column'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 16px 12px', borderBottom: '0.5px solid #E2F2D4', flexShrink: 0 }}>
              <span style={{ fontWeight: 500, fontSize: 15, color: '#27500A' }}>Notificações</span>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                {unread > 0 && (
                  <button onClick={markAllRead} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: '#3B6D11' }}>
                    marcar todas como lidas
                  </button>
                )}
                {notifications.length > 0 && (
                  <button onClick={deleteAll} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: '#B4B2A9' }}>
                    limpar
                  </button>
                )}
                <button onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: '#888780' }}>✕</button>
              </div>
            </div>

            <div style={{ overflowY: 'auto', flex: 1 }}>
              {notifications.length === 0 && (
                <p style={{ textAlign: 'center', color: '#888', fontSize: 13, padding: 32 }}>Nenhuma notificação ainda 🌱</p>
              )}
              {notifications.map(n => (
                <a key={n.id} href={getLink(n)} onClick={() => { markRead(n.id); setOpen(false) }} style={{
                  display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 16px',
                  borderBottom: '0.5px solid #F0F7EC', textDecoration: 'none',
                  background: n.read ? '#fff' : '#F4FAF0',
                  transition: 'background 0.2s'
                }}>
                  <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#EAF3DE', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>
                    {getIcon(n.type)}
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 13, color: '#1a1a1a', lineHeight: 1.4, margin: '0 0 3px' }}>{n.message}</p>
                    <span style={{ fontSize: 11, color: '#B4B2A9' }}>{timeAgo(n.created_at)}</span>
                  </div>
                  {!n.read && (
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#3B6D11', flexShrink: 0, marginTop: 4 }} />
                  )}
                </a>
              ))}
            </div>
          </div>
        </div>
      )}

      <button onClick={() => { setOpen(true); }} style={{
        position: 'relative', background: 'none', border: 'none',
        cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center'
      }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path d="M12 22c1.1 0 2-.9 2-2H10c0 1.1.9 2 2 2zm6-6V11c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z" fill={unread > 0 ? '#3B6D11' : '#B4B2A9'}/>
        </svg>
        {unread > 0 && (
          <div style={{
            position: 'absolute', top: 0, right: 0,
            background: '#993C1D', color: '#fff',
            width: 16, height: 16, borderRadius: '50%',
            fontSize: 10, fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            {unread > 9 ? '9+' : unread}
          </div>
        )}
      </button>
    </>
  )
}