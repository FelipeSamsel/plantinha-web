'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

function Caption({ text, onTagClick }) {
  if (!text) return null
  const parts = text.split(/(#[\wÀ-ú]+)/g)
  return (
    <p style={{ fontSize: 14, color: '#333', lineHeight: 1.5, margin: '0 0 10px' }}>
      {parts.map((part, i) =>
        part.startsWith('#')
          ? <span key={i} onClick={() => onTagClick(part.slice(1).toLowerCase())}
              style={{ color: '#3B6D11', fontWeight: 500, cursor: 'pointer' }}>
              {part}
            </span>
          : <span key={i}>{part}</span>
      )}
    </p>
  )
}

export default function PostCard({ post, user, onLike, onDelete, onTagClick }) {
  const [lightbox, setLightbox] = useState(false)
  const [showLikes, setShowLikes] = useState(false)
  const [editing, setEditing] = useState(false)
  const [showComments, setShowComments] = useState(false)
  const [comments, setComments] = useState([])
  const [newComment, setNewComment] = useState('')
  const [loadingComment, setLoadingComment] = useState(false)
  const [newCaption, setNewCaption] = useState(post.caption ?? '')
  const [saving, setSaving] = useState(false)
  const liked = user && post.post_likes?.some(l => l.user_id === user.id)
  const isOwner = user && user.id === post.user_id
  const initial = (post.profiles?.username?.[0] ?? '?').toUpperCase()
  const likeCount = post.post_likes?.length ?? 0

  useEffect(() => {
    if (showComments) loadComments()
  }, [showComments])

  async function loadComments() {
    const { data } = await supabase
      .from('comments')
      .select('*, profiles(username)')
      .eq('post_id', post.id)
      .order('created_at', { ascending: true })
    if (data) setComments(data)
  }

async function sendComment() {
  if (!newComment.trim()) return
  setLoadingComment(true)

  await supabase.from('comments').insert({
    post_id: post.id,
    user_id: user.id,
    body: newComment.trim()
  })

  // notifica o dono do post se não for ele mesmo comentando
  if (post.user_id !== user.id) {
    const { data: profile } = await supabase
      .from('profiles').select('username').eq('id', user.id).single()
    await supabase.from('notifications').insert({
      user_id: post.user_id,
      from_user_id: user.id,
      type: 'comment',
      post_id: post.id,
      message: `${profile?.username ?? 'Alguém'} comentou na sua foto: "${newComment.trim().slice(0, 50)}${newComment.length > 50 ? '...' : ''}"`
    })
  }

  setNewComment('')
  await loadComments()
  setLoadingComment(false)
}

  async function deleteComment(commentId) {
    await supabase.from('comments').delete().eq('id', commentId)
    loadComments()
  }

  async function deletePost() {
    if (!confirm('Tem certeza que quer excluir este post?')) return
    await supabase.from('post_tags').delete().eq('post_id', post.id)
    await supabase.from('post_likes').delete().eq('post_id', post.id)
    await supabase.from('comments').delete().eq('post_id', post.id)
    await supabase.from('posts').delete().eq('id', post.id)
    if (onDelete) onDelete()
  }

  async function saveEdit() {
    if (!newCaption.trim()) return alert('A legenda não pode ficar vazia.')
    setSaving(true)
    await supabase.from('posts').update({ caption: newCaption }).eq('id', post.id)
    const matches = newCaption.match(/#[\wÀ-ú]+/g) ?? []
    const tags = [...new Set(matches.map(t => t.slice(1).toLowerCase()))]
    await supabase.from('post_tags').delete().eq('post_id', post.id)
    if (tags.length > 0) {
      await supabase.from('post_tags').insert(tags.map(tag => ({ post_id: post.id, tag })))
    }
    setSaving(false)
    setEditing(false)
    if (onDelete) onDelete()
  }

  return (
    <>
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

      {showLikes && (
        <div onClick={() => setShowLikes(false)} style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
          zIndex: 1000
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
              {likeCount === 0 && <p style={{ textAlign: 'center', color: '#888', fontSize: 13, padding: 24 }}>Nenhuma curtida ainda 🌱</p>}
              {post.post_likes?.map(like => {
                const likeInitial = (like.profiles?.username?.[0] ?? '?').toUpperCase()
                return (
                  <div key={like.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px' }}>
                    <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#EAF3DE', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 500, color: '#3B6D11', fontSize: 14, flexShrink: 0 }}>
                      {likeInitial}
                    </div>
                    <span style={{ fontSize: 14, color: '#1a1a1a', fontWeight: 500 }}>{like.profiles?.username ?? 'usuário'}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {showComments && (
        <div onClick={() => setShowComments(false)} style={{
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
              <span style={{ fontWeight: 500, fontSize: 15, color: '#27500A' }}>💬 Comentários</span>
              <button onClick={() => setShowComments(false)} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: '#888780' }}>✕</button>
            </div>

            <div style={{ overflowY: 'auto', flex: 1, padding: '8px 0' }}>
              {comments.length === 0 && (
                <p style={{ textAlign: 'center', color: '#888', fontSize: 13, padding: 24 }}>Nenhum comentário ainda. Seja o primeiro! 🌱</p>
              )}
              {comments.map(comment => {
                const cInitial = (comment.profiles?.username?.[0] ?? '?').toUpperCase()
                const isCommentOwner = user && user.id === comment.user_id
                return (
                  <div key={comment.id} style={{ display: 'flex', gap: 10, padding: '10px 16px', alignItems: 'flex-start' }}>
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#EAF3DE', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 500, color: '#3B6D11', fontSize: 12, flexShrink: 0 }}>
                      {cInitial}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 2 }}>
                        <a href={`/perfil/${comment.user_id}`} style={{ fontWeight: 500, fontSize: 13, color: '#1a1a1a', textDecoration: 'none' }}>
                          {comment.profiles?.username ?? 'usuário'}
                        </a>
                        {isCommentOwner && (
                          <button onClick={() => deleteComment(comment.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#B4B2A9', fontSize: 11, padding: 0 }}
                            onMouseOver={e => e.target.style.color = '#993C1D'}
                            onMouseOut={e => e.target.style.color = '#B4B2A9'}>
                            excluir
                          </button>
                        )}
                      </div>
                      <p style={{ fontSize: 13, color: '#333', lineHeight: 1.4 }}>{comment.body}</p>
                    </div>
                  </div>
                )
              })}
            </div>

            {user && (
              <div style={{ padding: '12px 16px', borderTop: '0.5px solid #E2F2D4', display: 'flex', gap: 8, flexShrink: 0 }}>
                <input
                  value={newComment}
                  onChange={e => setNewComment(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && sendComment()}
                  placeholder="Adicione um comentário..."
                  style={{ flex: 1, border: '0.5px solid #C5E4A7', borderRadius: 20, padding: '9px 14px', fontSize: 13, outline: 'none', fontFamily: 'inherit', background: '#F4FAF0' }}
                />
                <button onClick={sendComment} disabled={loadingComment || !newComment.trim()} style={{
                  background: newComment.trim() ? '#3B6D11' : '#C5E4A7',
                  border: 'none', borderRadius: 20, padding: '9px 16px',
                  fontSize: 13, fontWeight: 500, color: '#EAF3DE',
                  cursor: newComment.trim() ? 'pointer' : 'default',
                  fontFamily: 'inherit', transition: 'background 0.2s'
                }}>
                  {loadingComment ? '...' : 'Enviar'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {editing && (
        <div onClick={() => setEditing(false)} style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
          zIndex: 1000
        }}>
          <div onClick={e => e.stopPropagation()} style={{
            background: '#F4FAF0', borderRadius: '20px 20px 0 0',
            width: '100%', maxWidth: 390, padding: '20px 16px 32px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <span style={{ fontWeight: 500, fontSize: 15, color: '#27500A' }}>Editar post</span>
              <button onClick={() => setEditing(false)} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: '#888780' }}>✕</button>
            </div>
            {post.image_url && (
              <img src={post.image_url} alt="" style={{ width: '100%', height: 160, objectFit: 'cover', borderRadius: 12, marginBottom: 12 }} />
            )}
            <textarea
              value={newCaption}
              onChange={e => setNewCaption(e.target.value)}
              rows={4}
              style={{ width: '100%', border: '0.5px solid #C5E4A7', borderRadius: 10, padding: 10, fontSize: 13, fontFamily: 'inherit', resize: 'none', outline: 'none', background: '#fff', marginBottom: 12 }}
            />
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setEditing(false)} style={{ flex: 1, background: '#fff', border: '0.5px solid #C5E4A7', borderRadius: 10, padding: '11px 0', fontSize: 13, cursor: 'pointer', color: '#888780', fontFamily: 'inherit' }}>
                Cancelar
              </button>
              <button onClick={saveEdit} disabled={saving} style={{ flex: 1, background: '#3B6D11', border: 'none', borderRadius: 10, padding: '11px 0', fontSize: 13, fontWeight: 500, cursor: 'pointer', color: '#EAF3DE', fontFamily: 'inherit' }}>
                {saving ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{ background: '#fff', borderRadius: 16, border: '0.5px solid #E2F2D4', overflow: 'hidden', marginBottom: 2 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px' }}>
          <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#EAF3DE', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 500, color: '#3B6D11', fontSize: 14, flexShrink: 0 }}>
            {initial}
          </div>
          <a href={`/perfil/${post.user_id}`} style={{ fontWeight: 500, fontSize: 14, color: '#1a1a1a', flex: 1, textDecoration: 'none' }}
            onMouseOver={e => e.target.style.color = '#3B6D11'}
            onMouseOut={e => e.target.style.color = '#1a1a1a'}>
            {post.profiles?.username ?? 'usuário'}
          </a>
          {isOwner && (
            <div style={{ display: 'flex', gap: 4 }}>
              <button onClick={() => setEditing(true)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#B4B2A9', fontSize: 12, padding: '4px 8px', borderRadius: 8 }}
                onMouseOver={e => e.target.style.color = '#3B6D11'}
                onMouseOut={e => e.target.style.color = '#B4B2A9'}>
                editar
              </button>
              <button onClick={deletePost}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#B4B2A9', fontSize: 12, padding: '4px 8px', borderRadius: 8 }}
                onMouseOver={e => e.target.style.color = '#993C1D'}
                onMouseOut={e => e.target.style.color = '#B4B2A9'}>
                excluir
              </button>
            </div>
          )}
        </div>

        {post.image_url && (
          <img src={post.image_url} alt="post" onClick={() => setLightbox(true)} style={{ width: '100%', maxHeight: 360, objectFit: 'cover', cursor: 'zoom-in', display: 'block' }} />
        )}

        <div style={{ padding: '12px 14px' }}>
          <Caption text={post.caption} onTagClick={onTagClick ?? (() => {})} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button onClick={() => onLike(post.id)} style={{ background: 'none', border: 'none', cursor: user ? 'pointer' : 'default', display: 'flex', alignItems: 'center', gap: 6, padding: 0 }}>
              <span style={{ fontSize: 18, color: liked ? '#3B6D11' : '#B4B2A9' }}>♥</span>
              <span style={{ fontSize: 13, color: '#888780' }}>{likeCount}</span>
            </button>
            <button onClick={() => setShowComments(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, padding: 0 }}>
              <span style={{ fontSize: 16, color: '#B4B2A9' }}>💬</span>
              <span style={{ fontSize: 13, color: '#888780' }}>comentar</span>
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