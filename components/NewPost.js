'use client'
import { useState } from 'react'
import { supabase } from '../lib/supabase'

const TAGS = ['Suculenta', 'Cacto', 'Monstera', 'Orquídea', 'Samambaia', 'Palmeira']

export default function NewPost({ user, onPost }) {
  const [caption, setCaption] = useState('')
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [tags, setTags] = useState([])
  const [loading, setLoading] = useState(false)

  function onFileChange(e) {
    const f = e.target.files[0]
    if (!f) return
    setFile(f)
    setPreview(URL.createObjectURL(f))
  }

  function toggleTag(t) {
    setTags(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t])
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
      if (tags.length > 0) {
        await supabase.from('post_tags').insert(tags.map(tag => ({ post_id: post.id, tag })))
      }
      setCaption(''); setFile(null); setPreview(null); setTags([])
      onPost()
    } catch (e) { alert(e.message) }
    finally { setLoading(false) }
  }

  return (
    <div style={{ background: '#fff', borderRadius: 16, border: '0.5px solid #E2F2D4', padding: 16, marginBottom: 24 }}>
      <p style={{ fontWeight: 500, color: '#27500A', marginBottom: 12 }}>Nova publicação</p>
      <label style={{ display: 'block', border: '1px dashed #C5E4A7', borderRadius: 12, padding: preview ? 0 : 24, textAlign: 'center', cursor: 'pointer', marginBottom: 12, overflow: 'hidden' }}>
        {preview
          ? <img src={preview} alt="preview" style={{ width: '100%', maxHeight: 300, objectFit: 'cover' }} />
          : <span style={{ color: '#888780', fontSize: 13 }}>Clique para adicionar foto 📷</span>
        }
        <input type="file" accept="image/*" onChange={onFileChange} style={{ display: 'none' }} />
      </label>
      <textarea value={caption} onChange={e => setCaption(e.target.value)}
        placeholder="Legenda..." rows={2}
        style={{ width: '100%', border: '0.5px solid #C5E4A7', borderRadius: 10, padding: 10, fontSize: 13, fontFamily: 'inherit', resize: 'none', marginBottom: 12, outline: 'none' }} />
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
        {TAGS.map(t => (
          <button key={t} onClick={() => toggleTag(t)} style={{ padding: '4px 12px', borderRadius: 20, fontSize: 12, cursor: 'pointer', border: '0.5px solid #C5E4A7', background: tags.includes(t) ? '#EAF3DE' : '#fff', color: tags.includes(t) ? '#3B6D11' : '#888780', fontWeight: tags.includes(t) ? 500 : 400 }}>
            {t}
          </button>
        ))}
      </div>
      <button onClick={publish} disabled={loading} style={{ background: '#3B6D11', color: '#EAF3DE', border: 'none', borderRadius: 10, padding: '10px 24px', fontSize: 14, fontWeight: 500, cursor: 'pointer', width: '100%' }}>
        {loading ? 'Publicando...' : 'Publicar'}
      </button>
    </div>
  )
}