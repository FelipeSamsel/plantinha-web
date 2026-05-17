'use client'
import { useEffect, useState, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import { useT } from '../../lib/i18n'

const CATS = [null, 'ajuda', 'identificar', 'dica', 'onde_comprar']
const MAX_VIDEO_SECONDS = 60
const BADGE = {
  ajuda: ['#FEF2F0', '#993C1D'],
  identificar: ['#E6F1FB', '#185FA5'],
  dica: ['#EAF3DE', '#27500A'],
  onde_comprar: ['#FAEEDA', '#854F0B']
}

function timeAgo(date, ago) {
  const diff = (Date.now() - new Date(date)) / 1000
  if (diff < 60) return ago
  if (diff < 3600) return `${Math.floor(diff / 60)}min`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`
  return `${Math.floor(diff / 86400)}d`
}

function Avatar({ profile, size = 34 }) {
  const initial = (profile?.username?.[0] ?? '?').toUpperCase()
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', flexShrink: 0, overflow: 'hidden', background: '#EAF3DE', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {profile?.avatar_url
        ? <img src={profile.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
        : <span style={{ fontSize: size * 0.38, fontWeight: 600, color: '#3B6D11' }}>{initial}</span>}
    </div>
  )
}

function buildTree(replies) {
  const map = {}
  replies.forEach(r => { map[r.id] = { ...r, children: [] } })
  const roots = []
  replies.forEach(r => {
    if (r.parent_reply_id && map[r.parent_reply_id]) map[r.parent_reply_id].children.push(map[r.id])
    else roots.push(map[r.id])
  })
  return roots
}

function ReplyItem({ reply, user, t, onDelete, replyingTo, setReplyingTo, replyText, setReplyText, sendSubReply, loadingSubReply, depth = 0 }) {
  const isOwner = user && user.id === reply.user_id
  const isReplying = replyingTo === reply.id
  const indent = Math.min(depth, 4) * 20
  return (
    <div style={{ marginLeft: indent }}>
      <div style={{ display: 'flex', gap: 10, padding: '10px 20px 4px', alignItems: 'flex-start' }}>
        <Avatar profile={reply.profiles} size={30} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, flexWrap: 'wrap', marginBottom: 3 }}>
            <span style={{ fontWeight: 600, fontSize: 13, color: '#1a1a1a' }}>{reply.profiles?.username ?? 'usuário'}</span>
            <span style={{ fontSize: 11, color: '#B4B2A9' }}>{timeAgo(reply.created_at, t.ago)}</span>
            {isOwner && (
              <button onClick={() => onDelete(reply.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#B4B2A9', fontSize: 11, padding: 0 }}
                onMouseOver={e => e.target.style.color = '#993C1D'} onMouseOut={e => e.target.style.color = '#B4B2A9'}>
                {t.delete}
              </button>
            )}
          </div>
          <p style={{ fontSize: 13, color: '#333', lineHeight: 1.5, marginBottom: 4 }}>{reply.body}</p>
          {user && (
            <button onClick={() => setReplyingTo(isReplying ? null : reply.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: isReplying ? '#3B6D11' : '#B4B2A9', fontSize: 11, fontWeight: isReplying ? 600 : 400, padding: 0 }}>
              {isReplying ? t.cancel : t.reply}
            </button>
          )}
        </div>
      </div>
      {isReplying && (
        <div style={{ marginLeft: indent + 40, marginRight: 20, marginBottom: 8, display: 'flex', gap: 8, alignItems: 'center' }}>
          <input autoFocus value={replyText} onChange={e => setReplyText(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendSubReply(reply.id)}
            placeholder={t.replyTo(reply.profiles?.username ?? '')}
            style={{ flex: 1, border: '1px solid #D6ECC4', borderRadius: 20, padding: '8px 14px', fontSize: 13, outline: 'none', fontFamily: 'inherit', background: '#F4FAF0', color: '#27500A' }} />
          <button onClick={() => sendSubReply(reply.id)} disabled={loadingSubReply || !replyText.trim()} style={{ background: replyText.trim() ? '#3B6D11' : '#C5E4A7', border: 'none', borderRadius: 20, padding: '8px 14px', fontSize: 13, fontWeight: 500, color: '#EAF3DE', cursor: replyText.trim() ? 'pointer' : 'default', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>
            {loadingSubReply ? '...' : t.send}
          </button>
        </div>
      )}
      {reply.children?.map(child => (
        <ReplyItem key={child.id} reply={child} user={user} t={t} onDelete={onDelete} replyingTo={replyingTo} setReplyingTo={setReplyingTo} replyText={replyText} setReplyText={setReplyText} sendSubReply={sendSubReply} loadingSubReply={loadingSubReply} depth={depth + 1} />
      ))}
    </div>
  )
}

export default function ForumPage() {
  const t = useT()
  const [posts, setPosts] = useState([])
  const [filter, setFilter] = useState(null)
  const [user, setUser] = useState(null)

  // novo tópico
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [category, setCategory] = useState(null)
  const [loading, setLoading] = useState(false)
  const [showForm, setShowForm] = useState(false)
  // mídia do tópico
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [videoFile, setVideoFile] = useState(null)
  const [videoPreview, setVideoPreview] = useState(null)
  const fileInputRef = useRef(null)
  const videoInputRef = useRef(null)

  // modal do tópico
  const [selectedPost, setSelectedPost] = useState(null)
  const [replies, setReplies] = useState([])
  const [newReply, setNewReply] = useState('')
  const [loadingReply, setLoadingReply] = useState(false)
  const [replyingTo, setReplyingTo] = useState(null)
  const [replyText, setReplyText] = useState('')
  const [loadingSubReply, setLoadingSubReply] = useState(false)

  // edição do tópico
  const [editing, setEditing] = useState(false)
  const [editTitle, setEditTitle] = useState('')
  const [editBody, setEditBody] = useState('')
  const [editCategory, setEditCategory] = useState(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setUser(data.session?.user ?? null))
    load()
  }, [filter])

  useEffect(() => { if (selectedPost) loadReplies(selectedPost.id) }, [selectedPost])

  async function load() {
    let q = supabase.from('forum_posts').select('*, profiles(username, avatar_url), forum_replies(id)').order('created_at', { ascending: false })
    if (filter) q = q.eq('category', filter)
    const { data } = await q
    if (data) setPosts(data)
  }

  async function loadReplies(postId) {
    const { data } = await supabase.from('forum_replies').select('*, profiles(username, avatar_url)').eq('forum_post_id', postId).order('created_at', { ascending: true })
    if (data) setReplies(data)
  }

  function handleImageChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    // limpa vídeo se havia
    setVideoFile(null); setVideoPreview(null)
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
  }

  function handleVideoChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const url = URL.createObjectURL(file)
    const vid = document.createElement('video')
    vid.preload = 'metadata'
    vid.src = url
    vid.onloadedmetadata = () => {
      if (vid.duration > MAX_VIDEO_SECONDS) {
        alert(`O vídeo tem ${Math.round(vid.duration)}s. O limite é 1 minuto (60s).\n\nDica: corte o vídeo no seu celular ou em um editor antes de enviar.`)
        return
      }
      // limpa imagem se havia
      setImageFile(null); setImagePreview(null)
      setVideoFile(file)
      setVideoPreview(url)
    }
    vid.onerror = () => alert('Não foi possível ler o vídeo. Tente outro formato.')
  }

  function clearMedia() {
    setImageFile(null); setImagePreview(null)
    setVideoFile(null); setVideoPreview(null)
  }

  function openEdit() {
    setEditTitle(selectedPost.title)
    setEditBody(selectedPost.body ?? '')
    setEditCategory(selectedPost.category)
    setEditing(true)
  }

  async function saveEdit() {
    if (!editTitle.trim() || !editCategory) return alert(t.chooseCategoryAndTitle)
    setSaving(true)
    await supabase.from('forum_posts').update({ title: editTitle.trim(), body: editBody.trim(), category: editCategory }).eq('id', selectedPost.id)
    const updated = { ...selectedPost, title: editTitle.trim(), body: editBody.trim(), category: editCategory }
    setSelectedPost(updated)
    setSaving(false); setEditing(false)
    load()
  }

  async function publish() {
    if (!title || !category) return alert(t.chooseCategoryAndTitle)
    setLoading(true)
    let image_url = null
    let video_url = null

    if (imageFile) {
      const ext = imageFile.name.split('.').pop()
      const path = `forum/${user.id}_${Date.now()}.${ext}`
      const { error } = await supabase.storage.from('post-images').upload(path, imageFile)
      if (!error) {
        const { data: urlData } = supabase.storage.from('post-images').getPublicUrl(path)
        image_url = urlData.publicUrl
      }
    }

    if (videoFile) {
      const ext = videoFile.name.split('.').pop() || 'mp4'
      const path = `forum/videos/${user.id}_${Date.now()}.${ext}`
      const { error } = await supabase.storage.from('post-images').upload(path, videoFile, { contentType: videoFile.type || 'video/mp4' })
      if (!error) {
        const { data: urlData } = supabase.storage.from('post-images').getPublicUrl(path)
        video_url = urlData.publicUrl
        // captura thumbnail do vídeo
        try {
          const thumbBlob = await captureThumb(videoPreview)
          if (thumbBlob) {
            const thumbPath = `forum/thumbs/${user.id}_${Date.now()}.jpg`
            const { error: te } = await supabase.storage.from('post-images').upload(thumbPath, thumbBlob, { contentType: 'image/jpeg' })
            if (!te) {
              const { data: td } = supabase.storage.from('post-images').getPublicUrl(thumbPath)
              image_url = td.publicUrl
            }
          }
        } catch {}
      }
    }

    await supabase.from('forum_posts').insert({ user_id: user.id, title, body, category, image_url, video_url })
    setTitle(''); setBody(''); setCategory(null); setShowForm(false); clearMedia()
    load()
    setLoading(false)
  }

  async function captureThumb(videoUrl) {
    return new Promise(resolve => {
      try {
        const vid = document.createElement('video')
        vid.src = videoUrl; vid.crossOrigin = 'anonymous'; vid.muted = true; vid.preload = 'metadata'
        vid.onloadedmetadata = () => { vid.currentTime = Math.min(vid.duration * 0.33, vid.duration - 0.1) }
        vid.onseeked = () => {
          try {
            const canvas = document.createElement('canvas')
            canvas.width = vid.videoWidth || 640; canvas.height = vid.videoHeight || 360
            canvas.getContext('2d').drawImage(vid, 0, 0, canvas.width, canvas.height)
            canvas.toBlob(blob => resolve(blob), 'image/jpeg', 0.85)
          } catch { resolve(null) }
        }
        vid.onerror = () => resolve(null)
      } catch { resolve(null) }
    })
  }

  async function sendReply() {
    if (!newReply.trim()) return
    setLoadingReply(true)
    await supabase.from('forum_replies').insert({ forum_post_id: selectedPost.id, user_id: user.id, body: newReply.trim(), parent_reply_id: null })
    if (selectedPost.user_id !== user.id) {
      const { data: profile } = await supabase.from('profiles').select('username').eq('id', user.id).single()
      await supabase.from('notifications').insert({ user_id: selectedPost.user_id, from_user_id: user.id, type: 'forum_reply', forum_post_id: selectedPost.id, message: t.replied(profile?.username ?? '...', selectedPost.title.slice(0, 50)) })
    }
    setNewReply(''); await loadReplies(selectedPost.id); load()
    setLoadingReply(false)
  }

  async function sendSubReply(parentReplyId) {
    if (!replyText.trim()) return
    setLoadingSubReply(true)
    const parentReply = replies.find(r => r.id === parentReplyId)
    await supabase.from('forum_replies').insert({ forum_post_id: selectedPost.id, user_id: user.id, body: replyText.trim(), parent_reply_id: parentReplyId })
    if (parentReply && parentReply.user_id !== user.id) {
      const { data: profile } = await supabase.from('profiles').select('username').eq('id', user.id).single()
      await supabase.from('notifications').insert({ user_id: parentReply.user_id, from_user_id: user.id, type: 'forum_reply', forum_post_id: selectedPost.id, message: t.repliedComment(profile?.username ?? '...', selectedPost.title.slice(0, 40)) })
    }
    setReplyText(''); setReplyingTo(null); await loadReplies(selectedPost.id); load()
    setLoadingSubReply(false)
  }

  async function deleteReply(replyId) {
    await supabase.from('forum_replies').delete().eq('id', replyId)
    loadReplies(selectedPost.id); load()
  }

  async function deleteForumPost(postId) {
    if (!confirm(t.deletePostConfirm)) return
    await supabase.from('forum_replies').delete().eq('forum_post_id', postId)
    await supabase.from('forum_posts').delete().eq('id', postId)
    setSelectedPost(null); load()
  }

  const replyTree = buildTree(replies)
  const isPostOwner = user && selectedPost && user.id === selectedPost.user_id

  return (
    <div>

      {/* ── MODAL DO TÓPICO ── */}
      {selectedPost && (
        <div onClick={() => { setSelectedPost(null); setReplyingTo(null); setReplyText(''); setEditing(false) }}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 20, width: '100%', maxWidth: 860, maxHeight: '90vh', display: 'flex', flexDirection: 'row', overflow: 'hidden', boxShadow: '0 12px 48px rgba(0,0,0,0.2)' }} className="forum-modal-inner">

            {/* Mídia lateral desktop */}
            {(selectedPost.image_url || selectedPost.video_url) && (
              <div style={{ flex: '0 0 420px', background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center' }} className="forum-modal-img-col">
                {selectedPost.video_url
                  ? <video src={selectedPost.video_url} controls playsInline style={{ width: '100%', maxHeight: '90vh' }} />
                  : <img src={selectedPost.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain', maxHeight: '90vh' }} />
                }
              </div>
            )}

            {/* Conteúdo direito */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, maxHeight: '90vh' }}>

              {/* Header */}
              <div style={{ padding: '14px 20px', borderBottom: '0.5px solid #E2F2D4', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexShrink: 0, gap: 12 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  {!editing && selectedPost.category && (() => {
                    const [bg, fg] = BADGE[selectedPost.category] ?? ['#F1EFE8', '#444']
                    return <span style={{ background: bg, color: fg, fontSize: 10, fontWeight: 600, padding: '3px 9px', borderRadius: 20, display: 'inline-block', marginBottom: 6 }}>{selectedPost.category}</span>
                  })()}
                  {!editing && <p style={{ fontWeight: 600, fontSize: 15, color: '#1a1a1a', lineHeight: 1.4, marginBottom: 4 }}>{selectedPost.title}</p>}
                  {!editing && selectedPost.body && <p style={{ fontSize: 13, color: '#888780', lineHeight: 1.5, marginBottom: 6 }}>{selectedPost.body}</p>}
                  {!editing && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Avatar profile={selectedPost.profiles} size={20} />
                      <span style={{ fontSize: 12, color: '#B4B2A9' }}>{t.by} {selectedPost.profiles?.username}</span>
                    </div>
                  )}
                  {editing && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {CATS.slice(1).map(c => (
                          <button key={c} onClick={() => setEditCategory(c)} style={{ padding: '4px 12px', borderRadius: 20, fontSize: 11, cursor: 'pointer', border: '0.5px solid #C5E4A7', background: editCategory === c ? '#EAF3DE' : '#fff', color: editCategory === c ? '#3B6D11' : '#888780', fontWeight: editCategory === c ? 600 : 400 }}>{c}</button>
                        ))}
                      </div>
                      <input value={editTitle} onChange={e => setEditTitle(e.target.value)} placeholder={t.yourQuestion}
                        style={{ border: '1px solid #D6ECC4', borderRadius: 10, padding: '8px 12px', fontSize: 13, outline: 'none', fontFamily: 'inherit', background: '#F4FAF0', color: '#27500A' }} />
                      <textarea value={editBody} onChange={e => setEditBody(e.target.value)} placeholder={t.moreDetails} rows={3}
                        style={{ border: '1px solid #D6ECC4', borderRadius: 10, padding: '8px 12px', fontSize: 13, outline: 'none', fontFamily: 'inherit', background: '#F4FAF0', color: '#27500A', resize: 'none' }} />
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button onClick={() => setEditing(false)} style={{ flex: 1, background: '#fff', border: '0.5px solid #C5E4A7', borderRadius: 10, padding: '8px 0', fontSize: 12, cursor: 'pointer', color: '#888780', fontFamily: 'inherit' }}>{t.cancel}</button>
                        <button onClick={saveEdit} disabled={saving} style={{ flex: 2, background: '#3B6D11', border: 'none', borderRadius: 10, padding: '8px 0', fontSize: 12, fontWeight: 600, cursor: 'pointer', color: '#EAF3DE', fontFamily: 'inherit' }}>{saving ? '...' : 'Salvar'}</button>
                      </div>
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                  {isPostOwner && !editing && (
                    <>
                      <button onClick={openEdit} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#B4B2A9', fontSize: 12, padding: '4px 8px', borderRadius: 8 }}
                        onMouseOver={e => e.target.style.color = '#3B6D11'} onMouseOut={e => e.target.style.color = '#B4B2A9'}>editar</button>
                      <button onClick={() => deleteForumPost(selectedPost.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#B4B2A9', fontSize: 12, padding: '4px 8px', borderRadius: 8 }}
                        onMouseOver={e => e.target.style.color = '#993C1D'} onMouseOut={e => e.target.style.color = '#B4B2A9'}>{t.delete}</button>
                    </>
                  )}
                  <button onClick={() => { setSelectedPost(null); setReplyingTo(null); setReplyText(''); setEditing(false) }}
                    style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#B4B2A9', lineHeight: 1, padding: '4px' }}>✕</button>
                </div>
              </div>

              {/* Mídia mobile */}
              {(selectedPost.image_url || selectedPost.video_url) && (
                <div style={{ display: 'none' }} className="forum-modal-img-mobile">
                  {selectedPost.video_url
                    ? <video src={selectedPost.video_url} controls playsInline style={{ width: '100%', maxHeight: 220, display: 'block', background: '#000' }} />
                    : <img src={selectedPost.image_url} alt="" style={{ width: '100%', maxHeight: 220, objectFit: 'cover' }} />
                  }
                </div>
              )}

              {/* Respostas */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
                {replyTree.length === 0 && <p style={{ textAlign: 'center', color: '#888', fontSize: 13, padding: 32 }}>{t.noRepliesYet}</p>}
                {replyTree.map(reply => (
                  <ReplyItem key={reply.id} reply={reply} user={user} t={t} onDelete={deleteReply} replyingTo={replyingTo} setReplyingTo={setReplyingTo} replyText={replyText} setReplyText={setReplyText} sendSubReply={sendSubReply} loadingSubReply={loadingSubReply} depth={0} />
                ))}
              </div>

              {/* Input resposta */}
              {user ? (
                <div style={{ padding: '12px 20px', borderTop: '0.5px solid #E2F2D4', display: 'flex', gap: 8, flexShrink: 0 }}>
                  <input value={newReply} onChange={e => setNewReply(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendReply()} placeholder={t.writeReply}
                    style={{ flex: 1, border: '1px solid #D6ECC4', borderRadius: 20, padding: '9px 14px', fontSize: 13, outline: 'none', fontFamily: 'inherit', background: '#F4FAF0', color: '#27500A' }} />
                  <button onClick={sendReply} disabled={loadingReply || !newReply.trim()} style={{ background: newReply.trim() ? '#3B6D11' : '#C5E4A7', border: 'none', borderRadius: 20, padding: '9px 18px', fontSize: 13, fontWeight: 500, color: '#EAF3DE', cursor: newReply.trim() ? 'pointer' : 'default', fontFamily: 'inherit' }}>
                    {loadingReply ? '...' : t.send}
                  </button>
                </div>
              ) : (
                <p style={{ padding: '12px 20px', fontSize: 13, color: '#B4B2A9', textAlign: 'center', borderTop: '0.5px solid #E2F2D4' }}>{t.loginToComment}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── HEADER ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h1 style={{ fontSize: 20, fontWeight: 500, color: '#27500A' }}>{t.forumTitle}</h1>
        {user && <button onClick={() => setShowForm(!showForm)} style={{ background: '#3B6D11', color: '#EAF3DE', border: 'none', borderRadius: 20, padding: '7px 16px', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>{t.newQuestion}</button>}
      </div>

      {/* ── FORMULÁRIO NOVO TÓPICO ── */}
      {showForm && (
        <div style={{ background: '#fff', borderRadius: 16, border: '0.5px solid #E2F2D4', padding: 16, marginBottom: 20 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
            {CATS.slice(1).map(c => (
              <button key={c} onClick={() => setCategory(c)} style={{ padding: '6px 14px', borderRadius: 20, fontSize: 12, cursor: 'pointer', border: '0.5px solid #C5E4A7', background: category === c ? '#EAF3DE' : '#fff', color: category === c ? '#3B6D11' : '#888780', fontWeight: category === c ? 500 : 400 }}>{c}</button>
            ))}
          </div>
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder={t.yourQuestion}
            style={{ width: '100%', border: '0.5px solid #C5E4A7', borderRadius: 10, padding: 10, fontSize: 13, marginBottom: 10, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }} />
          <textarea value={body} onChange={e => setBody(e.target.value)} placeholder={t.moreDetails} rows={3}
            style={{ width: '100%', border: '0.5px solid #C5E4A7', borderRadius: 10, padding: 10, fontSize: 13, fontFamily: 'inherit', resize: 'none', marginBottom: 12, outline: 'none', boxSizing: 'border-box' }} />

          {/* Mídia: imagem ou vídeo */}
          <div style={{ marginBottom: 12 }}>
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageChange} style={{ display: 'none' }} />
            <input ref={videoInputRef} type="file" accept="video/*" onChange={handleVideoChange} style={{ display: 'none' }} />

            {/* Preview imagem */}
            {imagePreview && (
              <div style={{ position: 'relative', marginBottom: 8 }}>
                <img src={imagePreview} alt="" style={{ width: '100%', maxHeight: 200, objectFit: 'cover', borderRadius: 10, display: 'block' }} />
                <button onClick={clearMedia} style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(0,0,0,0.55)', border: 'none', borderRadius: '50%', width: 28, height: 28, color: '#fff', cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
              </div>
            )}

            {/* Preview vídeo */}
            {videoPreview && (
              <div style={{ position: 'relative', marginBottom: 8 }}>
                <video src={videoPreview} controls playsInline style={{ width: '100%', maxHeight: 200, borderRadius: 10, background: '#000', display: 'block' }} />
                <button onClick={clearMedia} style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(0,0,0,0.55)', border: 'none', borderRadius: '50%', width: 28, height: 28, color: '#fff', cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
              </div>
            )}

            {/* Botões de mídia (só aparece se não há preview) */}
            {!imagePreview && !videoPreview && (
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => fileInputRef.current?.click()} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, border: '1px dashed #C5E4A7', borderRadius: 10, padding: '10px 0', background: '#F4FAF0', cursor: 'pointer', color: '#888780', fontSize: 13 }}>
                  🖼️ {t.addImage}
                </button>
                <button onClick={() => videoInputRef.current?.click()} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, border: '1px dashed #C5E4A7', borderRadius: 10, padding: '10px 0', background: '#F4FAF0', cursor: 'pointer', color: '#888780', fontSize: 13 }}>
                  🎥 Vídeo <span style={{ fontSize: 10, color: '#B4B2A9' }}>(máx. 1min)</span>
                </button>
              </div>
            )}
          </div>

          <button onClick={publish} disabled={loading} style={{ background: '#3B6D11', color: '#EAF3DE', border: 'none', borderRadius: 10, padding: '10px 24px', fontSize: 14, fontWeight: 500, cursor: 'pointer', width: '100%' }}>
            {loading ? t.sendingQuestion : t.sendQuestion}
          </button>
        </div>
      )}

      {/* ── FILTROS ── */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
        {CATS.map(f => (
          <button key={f ?? 'todos'} onClick={() => setFilter(f)} style={{ padding: '5px 14px', borderRadius: 20, fontSize: 12, cursor: 'pointer', border: '0.5px solid #C5E4A7', background: filter === f ? '#3B6D11' : '#fff', color: filter === f ? '#EAF3DE' : '#888780' }}>
            {f ?? 'todos'}
          </button>
        ))}
      </div>

      {/* ── LISTA DE TÓPICOS ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {posts.map(post => {
          const [bg, fg] = BADGE[post.category] ?? ['#F1EFE8', '#444']
          const isOwner = user && user.id === post.user_id
          return (
            <div key={post.id} onClick={() => { setSelectedPost(post); setEditing(false) }}
              style={{ background: '#fff', borderRadius: 14, border: '0.5px solid #E2F2D4', overflow: 'hidden', cursor: 'pointer', transition: 'box-shadow 0.15s' }}
              onMouseOver={e => e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,0.07)'}
              onMouseOut={e => e.currentTarget.style.boxShadow = 'none'}>

              {/* Thumbnail de imagem ou vídeo no card */}
              {post.video_url && post.image_url && (
                <div style={{ position: 'relative' }}>
                  <img src={post.image_url} alt="" style={{ width: '100%', height: 140, objectFit: 'cover', display: 'block' }} />
                  <div style={{ position: 'absolute', top: 8, left: 8, background: 'rgba(0,0,0,0.55)', borderRadius: 6, padding: '2px 8px', fontSize: 11, color: '#fff' }}>▶ vídeo</div>
                </div>
              )}
              {post.image_url && !post.video_url && (
                <img src={post.image_url} alt="" style={{ width: '100%', height: 140, objectFit: 'cover', display: 'block' }} />
              )}

              <div style={{ padding: 16 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ background: bg, color: fg, fontSize: 10, fontWeight: 500, padding: '3px 9px', borderRadius: 20 }}>{post.category}</span>
                  {isOwner && (
                    <button onClick={e => { e.stopPropagation(); deleteForumPost(post.id) }}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#B4B2A9', fontSize: 12, padding: '2px 6px', borderRadius: 6 }}
                      onMouseOver={e => e.target.style.color = '#993C1D'} onMouseOut={e => e.target.style.color = '#B4B2A9'}>
                      {t.delete}
                    </button>
                  )}
                </div>
                <p style={{ fontWeight: 500, fontSize: 14, color: '#1a1a1a', marginBottom: 6 }}>{post.title}</p>
                {post.body && <p style={{ fontSize: 13, color: '#888780', marginBottom: 8, lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{post.body}</p>}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#B4B2A9' }}>
                  <span>{post.profiles?.username}</span>
                  <span style={{ color: '#3B6D11', fontWeight: 500 }}>💬 {post.forum_replies?.length ?? 0} {t.replies}</span>
                </div>
              </div>
            </div>
          )
        })}
        {posts.length === 0 && <p style={{ textAlign: 'center', color: '#888', marginTop: 40 }}>{t.noQuestions}</p>}
      </div>

      <style>{`
        @media (max-width: 700px) {
          .forum-modal-inner { flex-direction: column !important; max-width: 100% !important; border-radius: 20px 20px 0 0 !important; position: fixed !important; bottom: 0 !important; left: 0 !important; right: 0 !important; max-height: 92vh !important; align-self: flex-end !important; }
          .forum-modal-img-col { display: none !important; }
          .forum-modal-img-mobile { display: block !important; }
        }
      `}</style>
    </div>
  )
}