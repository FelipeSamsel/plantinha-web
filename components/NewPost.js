'use client'
import { useState, useRef } from 'react'
import { supabase } from '../lib/supabase'
import ReactCrop from 'react-image-crop'
import 'react-image-crop/dist/ReactCrop.css'

const TAGS = ['Suculenta', 'Cacto', 'Monstera', 'Orquídea', 'Samambaia', 'Palmeira']
const MAX_SECONDS = 60

async function getCroppedBlob(imgEl, crop) {
  const canvas = document.createElement('canvas')
  const scaleX = imgEl.naturalWidth / imgEl.width
  const scaleY = imgEl.naturalHeight / imgEl.height
  canvas.width = crop.width * scaleX
  canvas.height = crop.height * scaleY
  const ctx = canvas.getContext('2d')
  ctx.drawImage(imgEl, crop.x * scaleX, crop.y * scaleY, crop.width * scaleX, crop.height * scaleY, 0, 0, crop.width * scaleX, crop.height * scaleY)
  return new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.88))
}

export default function NewPost({ user, onPost }) {
  const [caption, setCaption] = useState('')
  const [tags, setTags] = useState([])
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState('select')

  // imagem
  const [rawImage, setRawImage] = useState(null)
  const [croppedBlob, setCroppedBlob] = useState(null)
  const [croppedPreview, setCroppedPreview] = useState(null)
  const [crop, setCrop] = useState({ unit: '%', x: 5, y: 5, width: 90, height: 90 })
  const [aspect, setAspect] = useState(undefined)
  const imgRef = useRef(null)

  // vídeo
  const [videoFile, setVideoFile] = useState(null)
  const [videoPreview, setVideoPreview] = useState(null)

  function onImageChange(e) {
    const f = e.target.files[0]
    if (!f) return
    setRawImage(URL.createObjectURL(f))
    setCrop({ unit: '%', x: 5, y: 5, width: 90, height: 90 })
    setAspect(undefined)
    setStep('crop')
  }

  function onVideoChange(e) {
    const f = e.target.files[0]
    if (!f) return
    const url = URL.createObjectURL(f)
    const vid = document.createElement('video')
    vid.preload = 'metadata'
    vid.src = url
    vid.onloadedmetadata = () => {
      if (vid.duration > MAX_SECONDS) {
        alert(`O vídeo tem ${Math.round(vid.duration)}s. O limite é 1 minuto (60s).\n\nDica: corte o vídeo no seu celular ou em um editor antes de enviar.`)
        return
      }
      setVideoFile(f)
      setVideoPreview(url)
      setStep('video-details')
    }
    vid.onerror = () => alert('Não foi possível ler o vídeo. Tente outro formato.')
  }

  async function confirmCrop() {
    if (!imgRef.current || !crop.width || !crop.height) return
    const blob = await getCroppedBlob(imgRef.current, crop)
    setCroppedBlob(blob)
    setCroppedPreview(URL.createObjectURL(blob))
    setStep('details')
  }

  function toggleTag(t) {
    setTags(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t])
  }

  function reset() {
    setRawImage(null); setCroppedBlob(null); setCroppedPreview(null)
    setVideoFile(null); setVideoPreview(null)
    setStep('select'); setCrop({ unit: '%', x: 5, y: 5, width: 90, height: 90 })
    setTags([]); setCaption('')
  }

  async function saveTags(postId) {
    if (!postId) return
    const extracted = [...new Set((caption.match(/#[\wÀ-ú]+/g) ?? []).map(t => t.slice(1).toLowerCase()))]
    const all = [...new Set([...extracted, ...tags.map(t => t.toLowerCase())])]
    if (all.length > 0) await supabase.from('post_tags').insert(all.map(tag => ({ post_id: postId, tag })))
  }

  async function publishImage() {
    if (!user?.id) return alert('Sessão expirada. Recarregue a página e tente novamente.')
    if (!caption || !croppedBlob) return alert('Adicione uma foto e legenda.')
    setLoading(true)
    try {
      const filename = `${Date.now()}.jpg`
      await supabase.storage.from('post-images').upload(filename, croppedBlob, { contentType: 'image/jpeg' })
      const { data: urlData } = supabase.storage.from('post-images').getPublicUrl(filename)
      const { data: post, error: postError } = await supabase.from('posts')
        .insert({ user_id: user.id, caption, image_url: urlData.publicUrl })
        .select().single()
      if (postError) throw postError
      await saveTags(post.id)
      reset(); onPost()
    } catch (e) { alert(e.message) }
    finally { setLoading(false) }
  }

  async function captureThumb(videoUrl) {
    return new Promise(resolve => {
      try {
        const vid = document.createElement('video')
        vid.src = videoUrl
        vid.crossOrigin = 'anonymous'
        vid.muted = true
        vid.preload = 'metadata'
        vid.onloadedmetadata = () => {
          vid.currentTime = Math.min(vid.duration * 0.33, vid.duration - 0.1)
        }
        vid.onseeked = () => {
          try {
            const canvas = document.createElement('canvas')
            canvas.width = vid.videoWidth || 640
            canvas.height = vid.videoHeight || 360
            canvas.getContext('2d').drawImage(vid, 0, 0, canvas.width, canvas.height)
            canvas.toBlob(blob => resolve(blob), 'image/jpeg', 0.85)
          } catch { resolve(null) }
        }
        vid.onerror = () => resolve(null)
      } catch { resolve(null) }
    })
  }

  async function publishVideo() {
    if (!user?.id) return alert('Sessão expirada. Recarregue a página e tente novamente.')
    if (!caption || !videoFile) return alert('Adicione um vídeo e legenda.')
    setLoading(true)
    try {
      const ts = Date.now()
      const ext = videoFile.name.split('.').pop() || 'mp4'
      const filename = `videos/${ts}.${ext}`

      await supabase.storage.from('post-images').upload(filename, videoFile, { contentType: videoFile.type || 'video/mp4' })
      const { data: urlData } = supabase.storage.from('post-images').getPublicUrl(filename)
      const videoUrl = urlData.publicUrl

      // thumbnail
      let thumbUrl = null
      const thumbBlob = await captureThumb(videoPreview)
      if (thumbBlob) {
        const thumbFilename = `thumbs/${ts}.jpg`
        const { error: thumbErr } = await supabase.storage.from('post-images').upload(thumbFilename, thumbBlob, { contentType: 'image/jpeg' })
        if (!thumbErr) {
          const { data: thumbData } = supabase.storage.from('post-images').getPublicUrl(thumbFilename)
          thumbUrl = thumbData.publicUrl
        }
      }

      const { data: post, error: postError } = await supabase.from('posts').insert({
        user_id: user.id, caption,
        video_url: videoUrl,
        image_url: thumbUrl,
      }).select().single()
      if (postError) throw postError
      await saveTags(post.id)
      reset(); onPost()
    } catch (e) { alert(e.message) }
    finally { setLoading(false) }
  }

  const ASPECTS = [
    { label: 'livre', value: undefined },
    { label: '1:1', value: 1 },
    { label: '4:3', value: 4/3 },
    { label: '3:4', value: 3/4 },
    { label: '16:9', value: 16/9 },
  ]

  const btnCancel = { flex: 1, background: '#fff', border: '0.5px solid #C5E4A7', borderRadius: 10, padding: '11px 0', fontSize: 13, cursor: 'pointer', color: '#888780', fontFamily: 'inherit' }
  const btnGreen = { flex: 2, background: '#3B6D11', border: 'none', borderRadius: 10, padding: '11px 0', fontSize: 13, fontWeight: 500, cursor: 'pointer', color: '#EAF3DE', fontFamily: 'inherit' }

  const tagsSection = (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
      {TAGS.map(t => (
        <button key={t} onClick={() => toggleTag(t)} style={{ padding: '4px 12px', borderRadius: 20, fontSize: 12, cursor: 'pointer', border: '0.5px solid #C5E4A7', background: tags.includes(t) ? '#EAF3DE' : '#fff', color: tags.includes(t) ? '#3B6D11' : '#888780', fontWeight: tags.includes(t) ? 500 : 400, fontFamily: 'inherit' }}>{t}</button>
      ))}
    </div>
  )

  return (
    <div>

      {/* Seleção */}
      {step === 'select' && (
        <div style={{ display: 'flex', gap: 10 }}>
          <label style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, border: '1px dashed #C5E4A7', borderRadius: 12, padding: '28px 16px', textAlign: 'center', cursor: 'pointer', background: '#fff' }}>
            <span style={{ fontSize: 32 }}>📷</span>
            <span style={{ color: '#888780', fontSize: 13 }}>Foto</span>
            <input type="file" accept="image/*" onChange={onImageChange} style={{ display: 'none' }} />
          </label>
          <label style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, border: '1px dashed #C5E4A7', borderRadius: 12, padding: '28px 16px', textAlign: 'center', cursor: 'pointer', background: '#fff' }}>
            <span style={{ fontSize: 32 }}>🎥</span>
            <span style={{ color: '#888780', fontSize: 13 }}>Vídeo</span>
            <span style={{ color: '#B4B2A9', fontSize: 11 }}>máx. 1 minuto</span>
            <input type="file" accept="video/*" onChange={onVideoChange} style={{ display: 'none' }} />
          </label>
        </div>
      )}

      {/* Crop imagem */}
      {step === 'crop' && (
        <div>
          <p style={{ fontSize: 12, color: '#888780', marginBottom: 10, textAlign: 'center' }}>Arraste os cantos para cortar livremente</p>
          <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
            {ASPECTS.map(a => (
              <button key={a.label} onClick={() => { setAspect(a.value); setCrop({ unit: '%', x: 5, y: 5, width: 90, height: 90 }) }} style={{ padding: '5px 12px', borderRadius: 20, fontSize: 12, cursor: 'pointer', border: '0.5px solid #C5E4A7', background: aspect === a.value ? '#3B6D11' : '#fff', color: aspect === a.value ? '#EAF3DE' : '#888780' }}>{a.label}</button>
            ))}
          </div>
          <div style={{ borderRadius: 12, overflow: 'hidden', background: '#111', marginBottom: 12 }}>
            <ReactCrop crop={crop} onChange={c => setCrop(c)} aspect={aspect} minWidth={40} minHeight={40} style={{ width: '100%' }}>
              <img ref={imgRef} src={rawImage} alt="para cortar" style={{ width: '100%', display: 'block', maxHeight: 380, objectFit: 'contain' }} />
            </ReactCrop>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={reset} style={btnCancel}>Cancelar</button>
            <button onClick={confirmCrop} style={{ ...btnGreen, flex: 1 }}>Confirmar corte ✓</button>
          </div>
        </div>
      )}

      {/* Detalhes da foto */}
      {step === 'details' && (
        <div>
          <div style={{ position: 'relative', marginBottom: 12 }}>
            <img src={croppedPreview} alt="preview" style={{ width: '100%', maxHeight: 280, objectFit: 'contain', borderRadius: 12, background: '#F4FAF0', display: 'block' }} />
            <button onClick={() => setStep('crop')} style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(6px)', border: 'none', color: '#fff', borderRadius: 20, padding: '5px 12px', fontSize: 11, cursor: 'pointer' }}>✏️ editar corte</button>
          </div>
          <textarea value={caption} onChange={e => setCaption(e.target.value)} placeholder="Escreva a legenda... use #hashtags para categorizar 🌿" rows={3}
            style={{ width: '100%', border: '0.5px solid #C5E4A7', borderRadius: 10, padding: 10, fontSize: 13, fontFamily: 'inherit', resize: 'none', marginBottom: 8, outline: 'none', background: '#fff', boxSizing: 'border-box' }} />
          {tagsSection}
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={reset} style={btnCancel}>Cancelar</button>
            <button onClick={publishImage} disabled={loading} style={btnGreen}>{loading ? 'Publicando...' : 'Publicar 🌱'}</button>
          </div>
        </div>
      )}

      {/* Detalhes do vídeo */}
      {step === 'video-details' && (
        <div>
          <div style={{ marginBottom: 12 }}>
            <video src={videoPreview} controls playsInline style={{ width: '100%', maxHeight: 280, borderRadius: 12, background: '#000', display: 'block' }} />
          </div>
          <textarea value={caption} onChange={e => setCaption(e.target.value)} placeholder="Escreva a legenda... use #hashtags para categorizar 🌿" rows={3}
            style={{ width: '100%', border: '0.5px solid #C5E4A7', borderRadius: 10, padding: 10, fontSize: 13, fontFamily: 'inherit', resize: 'none', marginBottom: 8, outline: 'none', background: '#fff', boxSizing: 'border-box' }} />
          {tagsSection}
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={reset} style={btnCancel}>Cancelar</button>
            <button onClick={publishVideo} disabled={loading} style={btnGreen}>{loading ? 'Publicando...' : 'Publicar 🌱'}</button>
          </div>
        </div>
      )}

    </div>
  )
}