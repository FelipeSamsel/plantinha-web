'use client'
import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function PostCard({ post, user, onLike, onDelete }) {
  const [lightbox, setLightbox] = useState(false)
  const [showLikes, setShowLikes] = useState(false)
  const liked = user && post.post_likes?.some(l => l.user_id === user.id)
  const isOwner = user && user.id === post.user_id
  const initial = (post.profiles?.username?.[0] ?? '?').toUpperCase()
  const likeCount = post.post_likes?.length ?? 0

  async function deletePost() {
    if (!confirm('Tem certeza que quer excluir este post?')) return
    await supabase.from('post_tags').delete().eq('post_id', post.id)
    await supabase.from('post_likes').delete().eq('post_id', post.id)
    await supabase.from('posts').delete().eq('id', post.id)
    if (onDelete) onDelete()
  }

  return (
    <>
      {/* lightbox */}
      {lightbox && (
        <div onClick={() => setLightbox(false)} style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000, cursor: 'zoom-out', padding: 16
        }}>
          <div style={{ position: 'relative', maxWidth: '100%' }} onClick={e => e.stopPropagation()}>
            <img src={post.image_url} alt="foto ampliada" style={{ maxWidth: '100%', maxHeight: '90vh', borderRadius: 12, objectFit: 'contain', display: 'block' }} />
            <button onClick={() => setLightbox(false)} style={{
              position: 'absolute', top: 10, right: 10,
              background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(6px)',
              border: '0.5px solid rgba(255,255,255,0.2)',
              color: '#fff', width: 32, height: 32, borderRadius: '50%',
              fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>✕</button>
          </div>
        </div>
      )}

      {/* modal de quem curtiu */}
      {showLikes && (
        <div onClick={() => setShowLikes(false)} style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
          zIndex: 1000, padding: 0
        }}>
          <div onClick={e => e.stopPropagation()} style={{
            background: '#fff', borderRadius: '20px 20px 0 0',
            width: '100%', maxWidth: 390, maxHeight: '60vh',
            overflow: 'hidden', display: 'flex', flexDirection: 'column'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 16px 12px', borderBottom: '0.5px solid #E2F2D4' }}>
              <span style={{ fontWeight: 500, fontSize: 15, color: '#27500A' }}>♥ Curtidas ({likeCount})</span>
              <button onClick={() => setShowLikes(false)} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: '#888780' }}>✕</button>
            </div>
            <div style={{ overflowY: 'auto', padding: '8px 0' }}>
              {likeCount === 0 && (
                <p style={{ textAlign: 'center', color: '#888', fontSize: 13, padding: 24 }}>Nenhuma curtida ainda 🌱</p>
              )}
              {post.post_likes?.map(like => {
                const likeInitial = (like.profiles?.username?.[0] ?? '?').toUpperCase()
                return (
                  <div key={like.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px' }}>
                    <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#EAF3DE', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 500, color: '#3B6D11', fontSize: 14, flexShrink: 0 }}>
                      {likeInitial}
                    </div>
                    <span style={{ fontSize: 14, color: '#1a1a1a', fontWeight: 500 }}>
                      {like.profiles?.username ?? 'usuário'}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* card do post */}
      <div style={{ background: '#fff', borderRadius: 16, border: '0.5px solid #E2F2D4', overflow: 'hidden', marginBottom: 2 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px' }}>
          <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#EAF3DE', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 500, color: '#3B6D11', fontSize: 14, flexShrink: 0 }}>
            {initial}
          </div>
          <span style={{ fontWeight: 500, fontSize: 14, color: '#1a1a1a', flex: 1 }}>
            {post.profiles?.username ?? 'usuário'}
          </span>
          {isOwner && (
            <button onClick={deletePost}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#B4B2A9', fontSize: 12, padding: '4px 8px', borderRadius: 8 }}
              onMouseOver={e => e.target.style.color = '#993C1D'}
              onMouseOut={e => e.target.style.color = '#B4B2A9'}>
              excluir
            </button>
          )}
        </div>

        {post.image_url && (
          <img src={post.image_url} alt="post" onClick={() => setLightbox(true)} style={{ width: '100%', maxHeight: 360, objectFit: 'cover', cursor: 'zoom-in', display: 'block' }} />
        )}

        <div style={{ padding: '12px 14px' }}>
          <p style={{ fontSize: 14, color: '#333', lineHeight: 1.5, margin: '0 0 10px' }}>{post.caption}</p>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
            {post.post_tags?.map(t => (
              <span key={t.tag} style={{ background: '#F4FAF0', color: '#3B6D11', fontSize: 11, padding: '3px 10px', borderRadius: 20, border: '0.5px solid #C5E4A7' }}>
                {t.tag}
              </span>
            ))}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button onClick={() => onLike(post.id)} style={{ background: 'none', border: 'none', cursor: user ? 'pointer' : 'default', display: 'flex', alignItems: 'center', gap: 6, padding: 0 }}>
              <span style={{ fontSize: 18, color: liked ? '#3B6D11' : '#B4B2A9' }}>♥</span>
              <span style={{ fontSize: 13, color: '#888780' }}>{likeCount}</span>
            </button>
            {isOwner && likeCount > 0 && (
              <button onClick={() => setShowLikes(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: '#3B6D11', padding: 0, textDecoration: 'underline' }}>
                ver quem curtiu
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  )
}