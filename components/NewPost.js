'use client'
import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function NewPost({ user, onPost }) {
  const [caption, setCaption] = useState('')
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [loading, setLoading] = useState(false)

  function onFileChange(e) {
    const f = e.target.files[0]
    if (!f) return
    setFile(f)
    setPreview(URL.createObjectURL(f))
  }

  function extractTags(text) {
    const matches = text.match(/#[\wÀ-ú]+/g) ?? []
    return [...new Set(matches.map(t => t.slice(1).toLowerCase()))]
  }

  async function publish() {
    if (!caption || !file) return alert('Adicione uma foto e legenda.')
    setLoading(true)
    try {
      const ext = file.name.split('.').pop()
      const filename = `${Date.now()}.${ext}`
      await supabase.storage.from('post-images').upload(filename, file)
      const { data: urlData } = supabase.storage.from('post-images').getPublicUrl(filename)
      const { data: post } = await supabase.from('posts')
        .insert({ user_id: user.id, caption, image_url: urlData.publicUrl })
        .select().single()
      const tags = extractTags(caption)
      if (tags.length > 0) {
        await supabase.from('post_tags').insert(tags.map(tag => ({ post_id: post.id, tag })))
      }
      setCaption(''); setFile(null); setPreview(null)
      onPost()
    } catch (e) { alert(e.message) }
    finally { setLoading(false) }
  }

  // preview da legenda com hashtags coloridas
  function renderCaptionPreview() {
    if (!caption) return null
    const parts = caption.split(/(#[\wÀ-ú]+)/g)
    return (
      <div style={{ fontSize: 13, color: '#555', lineHeight: 1.5, padding: '8px 12px', background: '#F4FAF0', borderRadius: 10, marginBottom: 12 }}>
        {parts.map((part, i) =>
          part.startsWith('#')
            ? <span key={i} style={{ color: '#3B6D11', fontWeight: 500 }}>{part}</span>
            : <span key={i}>{part}</span>
        )}
      </div>
    )
  }

  return (
    <div>
      <label style={{ display: 'block', border: '1px dashed #C5E4A7', borderRadius: 12, padding: preview ? 0 : 32, textAlign: 'center', cursor: 'pointer', marginBottom: 12, overflow: 'hidden', background: '#fff' }}>
        {preview
          ? <img src={preview} alt="preview" style={{ width: '100%', maxHeight: 260, objectFit: 'cover', display: 'block' }} />
          : <span style={{ color: '#888780', fontSize: 13 }}>Toque para adicionar foto 📷</span>
        }
        <input type="file" accept="image/*" onChange={onFileChange} style={{ display: 'none' }} />
      </label>

      <textarea value={caption} onChange={e => setCaption(e.target.value)}
        placeholder="Escreva a legenda... use #hashtags para categorizar 🌿"
        rows={3}
        style={{ width: '100%', border: '0.5px solid #C5E4A7', borderRadius: 10, padding: 10, fontSize: 13, fontFamily: 'inherit', resize: 'none', marginBottom: 8, outline: 'none', background: '#fff' }} />

      {caption && renderCaptionPreview()}

      <button onClick={publish} disabled={loading} style={{ background: '#3B6D11', color: '#EAF3DE', border: 'none', borderRadius: 10, padding: '12px 24px', fontSize: 14, fontWeight: 500, cursor: 'pointer', width: '100%', fontFamily: 'inherit' }}>
        {loading ? 'Publicando...' : 'Publicar 🌱'}
      </button>
    </div>
  )
}