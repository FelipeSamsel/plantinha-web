'use client'
import { useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import Cropper from 'react-easy-crop'

function getCroppedImg(imageSrc, croppedAreaPixels) {
  return new Promise((resolve) => {
    const image = new Image()
    image.src = imageSrc
    image.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = croppedAreaPixels.width
      canvas.height = croppedAreaPixels.height
      const ctx = canvas.getContext('2d')
      ctx.drawImage(
        image,
        croppedAreaPixels.x, croppedAreaPixels.y,
        croppedAreaPixels.width, croppedAreaPixels.height,
        0, 0,
        croppedAreaPixels.width, croppedAreaPixels.height
      )
      canvas.toBlob(blob => resolve(blob), 'image/jpeg', 0.85)
    }
  })
}

const ASPECTS = [
  { label: '1:1', value: 1 },
  { label: '4:3', value: 4/3 },
  { label: '3:4', value: 3/4 },
  { label: 'livre', value: null },
]

const TAGS = ['Suculenta', 'Cacto', 'Monstera', 'Orquídea', 'Samambaia', 'Palmeira']

export default function NewPost({ user, onPost }) {
  const [caption, setCaption] = useState('')
  const [rawImage, setRawImage] = useState(null)
  const [croppedBlob, setCroppedBlob] = useState(null)
  const [croppedPreview, setCroppedPreview] = useState(null)
  const [tags, setTags] = useState([])
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState('select') // 'select' | 'crop' | 'details'

  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [aspect, setAspect] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null)
  const [freeAspect, setFreeAspect] = useState(false)

  function onFileChange(e) {
    const f = e.target.files[0]
    if (!f) return
    const url = URL.createObjectURL(f)
    setRawImage(url)
    setStep('crop')
  }

  const onCropComplete = useCallback((_, pixels) => {
    setCroppedAreaPixels(pixels)
  }, [])

  async function confirmCrop() {
    const blob = await getCroppedImg(rawImage, croppedAreaPixels)
    setCroppedBlob(blob)
    setCroppedPreview(URL.createObjectURL(blob))
    setStep('details')
  }

  function toggleTag(t) {
    setTags(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t])
  }

  async function publish() {
    if (!caption || !croppedBlob) return alert('Adicione uma foto e legenda.')
    setLoading(true)
    try {
      const filename = `${Date.now()}.jpg`
      await supabase.storage.from('post-images').upload(filename, croppedBlob, { contentType: 'image/jpeg' })
      const { data: urlData } = supabase.storage.from('post-images').getPublicUrl(filename)
      const { data: post } = await supabase.from('posts')
        .insert({ user_id: user.id, caption, image_url: urlData.publicUrl })
        .select().single()
      const extractedTags = [...new Set((caption.match(/#[\wÀ-ú]+/g) ?? []).map(t => t.slice(1).toLowerCase()))]
      const allTags = [...new Set([...extractedTags, ...tags.map(t => t.toLowerCase())])]
      if (allTags.length > 0) {
        await supabase.from('post_tags').insert(allTags.map(tag => ({ post_id: post.id, tag })))
      }
      setCaption(''); setCroppedBlob(null); setCroppedPreview(null)
      setRawImage(null); setTags([]); setStep('select')
      onPost()
    } catch (e) { alert(e.message) }
    finally { setLoading(false) }
  }

  function reset() {
    setRawImage(null); setCroppedBlob(null); setCroppedPreview(null)
    setStep('select'); setCrop({ x: 0, y: 0 }); setZoom(1)
  }

  return (
    <div>

      {/* STEP 1 — selecionar foto */}
      {step === 'select' && (
        <label style={{ display: 'block', border: '1px dashed #C5E4A7', borderRadius: 12, padding: 32, textAlign: 'center', cursor: 'pointer', background: '#fff' }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>📷</div>
          <span style={{ color: '#888780', fontSize: 13 }}>Toque para selecionar uma foto</span>
          <input type="file" accept="image/*" onChange={onFileChange} style={{ display: 'none' }} />
        </label>
      )}

      {/* STEP 2 — cortar */}
      {step === 'crop' && (
        <div>
          {/* seletor de proporção */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
            {ASPECTS.map(a => (
              <button key={a.label} onClick={() => {
                if (a.value === null) { setFreeAspect(true) }
                else { setFreeAspect(false); setAspect(a.value) }
              }} style={{
                padding: '5px 12px', borderRadius: 20, fontSize: 12, cursor: 'pointer',
                border: '0.5px solid #C5E4A7',
                background: (a.value === null ? freeAspect : (!freeAspect && aspect === a.value)) ? '#3B6D11' : '#fff',
                color: (a.value === null ? freeAspect : (!freeAspect && aspect === a.value)) ? '#EAF3DE' : '#888780',
              }}>
                {a.label}
              </button>
            ))}
          </div>

          {/* área de crop */}
          <div style={{ position: 'relative', width: '100%', height: 280, borderRadius: 12, overflow: 'hidden', background: '#111' }}>
            <Cropper
              image={rawImage}
              crop={crop}
              zoom={zoom}
              aspect={freeAspect ? undefined : aspect}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropComplete}
            />
          </div>

          {/* zoom */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '10px 0' }}>
            <span style={{ fontSize: 12, color: '#888780' }}>zoom</span>
            <input type="range" min={1} max={3} step={0.01} value={zoom}
              onChange={e => setZoom(Number(e.target.value))}
              style={{ flex: 1, accentColor: '#3B6D11' }} />
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={reset} style={{ flex: 1, background: '#fff', border: '0.5px solid #C5E4A7', borderRadius: 10, padding: '11px 0', fontSize: 13, cursor: 'pointer', color: '#888780' }}>
              Cancelar
            </button>
            <button onClick={confirmCrop} style={{ flex: 1, background: '#3B6D11', border: 'none', borderRadius: 10, padding: '11px 0', fontSize: 13, fontWeight: 500, cursor: 'pointer', color: '#EAF3DE' }}>
              Confirmar corte
            </button>
          </div>
        </div>
      )}

      {/* STEP 3 — detalhes */}
      {step === 'details' && (
        <div>
          <div style={{ position: 'relative', marginBottom: 12 }}>
            <img src={croppedPreview} alt="preview" style={{ width: '100%', maxHeight: 260, objectFit: 'contain', borderRadius: 12, background: '#F4FAF0', display: 'block' }} />
            <button onClick={() => setStep('crop')} style={{
              position: 'absolute', top: 8, right: 8,
              background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(6px)',
              border: 'none', color: '#fff', borderRadius: 20,
              padding: '4px 10px', fontSize: 11, cursor: 'pointer'
            }}>✏️ editar corte</button>
          </div>

          <textarea value={caption} onChange={e => setCaption(e.target.value)}
            placeholder="Escreva a legenda... use #hashtags para categorizar 🌿"
            rows={3}
            style={{ width: '100%', border: '0.5px solid #C5E4A7', borderRadius: 10, padding: 10, fontSize: 13, fontFamily: 'inherit', resize: 'none', marginBottom: 8, outline: 'none', background: '#fff' }} />

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
            {TAGS.map(t => (
              <button key={t} onClick={() => toggleTag(t)} style={{
                padding: '4px 12px', borderRadius: 20, fontSize: 12, cursor: 'pointer',
                border: '0.5px solid #C5E4A7',
                background: tags.includes(t) ? '#EAF3DE' : '#fff',
                color: tags.includes(t) ? '#3B6D11' : '#888780',
                fontWeight: tags.includes(t) ? 500 : 400
              }}>
                {t}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={reset} style={{ flex: 1, background: '#fff', border: '0.5px solid #C5E4A7', borderRadius: 10, padding: '11px 0', fontSize: 13, cursor: 'pointer', color: '#888780' }}>
              Cancelar
            </button>
            <button onClick={publish} disabled={loading} style={{ flex: 2, background: '#3B6D11', border: 'none', borderRadius: 10, padding: '11px 0', fontSize: 13, fontWeight: 500, cursor: 'pointer', color: '#EAF3DE' }}>
              {loading ? 'Publicando...' : 'Publicar 🌱'}
            </button>
          </div>
        </div>
      )}

    </div>
  )
}