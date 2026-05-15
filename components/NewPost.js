'use client'
import { useState, useRef, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import ReactCrop from 'react-image-crop'
import 'react-image-crop/dist/ReactCrop.css'

const TAGS = ['Suculenta', 'Cacto', 'Monstera', 'Orquídea', 'Samambaia', 'Palmeira']
const MAX_CLIP = 60

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

function fmtTime(s) {
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${sec.toString().padStart(2, '0')}`
}

// Fora do NewPost — componente estável, não recriado a cada render
function VideoTrimmer({ file, duration, onConfirm, onCancel }) {
  const [start, setStart] = useState(0)
  const [end, setEnd] = useState(Math.min(duration, MAX_CLIP))
  const [dragging, setDragging] = useState(null)
  const [currentTime, setCurrentTime] = useState(0)
  const [trimming, setTrimming] = useState(false)
  const videoRef = useRef(null)
  const trackRef = useRef(null)
  const previewUrl = useRef(URL.createObjectURL(file)).current

  useEffect(() => {
    if (videoRef.current) videoRef.current.currentTime = start
  }, [start])

  function posToTime(clientX) {
    const rect = trackRef.current.getBoundingClientRect()
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
    return ratio * duration
  }

  function onTrackMouseDown(e, handle) {
    e.preventDefault()
    setDragging(handle)
  }

  useEffect(() => {
    function onMove(e) {
      if (!dragging) return
      const clientX = e.touches ? e.touches[0].clientX : e.clientX
      const t = posToTime(clientX)
      if (dragging === 'start') {
        const newStart = Math.max(0, Math.min(t, end - 1))
        const newEnd = Math.min(duration, newStart + MAX_CLIP)
        setStart(newStart); setEnd(newEnd)
      } else {
        const newEnd = Math.min(duration, Math.max(t, start + 1))
        const newStart = Math.max(0, newEnd - MAX_CLIP)
        setEnd(newEnd); setStart(Math.max(start, newStart))
      }
    }
    function onUp() { setDragging(null) }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    window.addEventListener('touchmove', onMove, { passive: true })
    window.addEventListener('touchend', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
      window.removeEventListener('touchmove', onMove)
      window.removeEventListener('touchend', onUp)
    }
  }, [dragging, start, end, duration])

  function onTimeUpdate() {
    if (!videoRef.current) return
    const ct = videoRef.current.currentTime
    setCurrentTime(ct)
    if (ct >= end) {
      videoRef.current.pause()
      videoRef.current.currentTime = start
    }
  }

  async function doTrim() {
    setTrimming(true)
    try {
      const video = document.createElement('video')
      video.src = previewUrl
      video.muted = true
      await new Promise(r => { video.onloadedmetadata = r })
      const canvas = document.createElement('canvas')
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      const ctx = canvas.getContext('2d')
      const stream = canvas.captureStream(30)
      let audioStream = null
      try {
        const audioCtx = new AudioContext()
        const arrayBuffer = await file.arrayBuffer()
        const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer)
        const dest = audioCtx.createMediaStreamDestination()
        const source = audioCtx.createBufferSource()
        source.buffer = audioBuffer
        source.connect(dest)
        source.start(0, start, end - start)
        audioStream = dest.stream
      } catch (e) {}
      const tracks = [...stream.getTracks(), ...(audioStream ? audioStream.getTracks() : [])]
      const combined = new MediaStream(tracks)
      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')
        ? 'video/webm;codecs=vp9,opus'
        : MediaRecorder.isTypeSupported('video/webm') ? 'video/webm' : 'video/mp4'
      const chunks = []
      const recorder = new MediaRecorder(combined, { mimeType })
      recorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data) }
      const done = new Promise(resolve => { recorder.onstop = resolve })
      recorder.start(100)
      video.currentTime = start
      await new Promise(r => { video.onseeked = r })
      video.play()
      const drawFrame = () => {
        if (video.currentTime >= end) { video.pause(); recorder.stop(); return }
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
        requestAnimationFrame(drawFrame)
      }
      drawFrame()
      await done
      onConfirm(new Blob(chunks, { type: mimeType }), mimeType)
    } catch (e) {
      alert('Erro ao cortar vídeo: ' + e.message)
      setTrimming(false)
    }
  }

  const startPct = (start / duration) * 100
  const endPct = (end / duration) * 100
  const timePct = (currentTime / duration) * 100
  const clipLen = end - start

  return (
    <div>
      <p style={{ fontSize: 13, color: '#27500A', fontWeight: 500, marginBottom: 12, textAlign: 'center' }}>✂️ Escolha o trecho (máx. 1 min)</p>
      <video ref={videoRef} src={previewUrl} onTimeUpdate={onTimeUpdate}
        onClick={() => { if (videoRef.current.paused) { videoRef.current.currentTime = start; videoRef.current.play() } else videoRef.current.pause() }}
        style={{ width: '100%', maxHeight: 240, borderRadius: 10, background: '#000', display: 'block', cursor: 'pointer', marginBottom: 16 }}
        playsInline />
      <div style={{ padding: '0 12px', marginBottom: 8 }}>
        <div ref={trackRef} style={{ position: 'relative', height: 36, background: '#F0F7EC', borderRadius: 8, userSelect: 'none' }}>
          <div style={{ position: 'absolute', left: 0, width: `${startPct}%`, height: '100%', background: 'rgba(0,0,0,0.25)', borderRadius: '8px 0 0 8px' }} />
          <div style={{ position: 'absolute', left: `${endPct}%`, right: 0, height: '100%', background: 'rgba(0,0,0,0.25)', borderRadius: '0 8px 8px 0' }} />
          <div style={{ position: 'absolute', left: `${startPct}%`, width: `${endPct - startPct}%`, height: '100%', background: '#3B6D11', opacity: 0.35 }} />
          <div style={{ position: 'absolute', left: `${timePct}%`, top: 0, bottom: 0, width: 2, background: '#fff', transform: 'translateX(-50%)', pointerEvents: 'none' }} />
          {['start', 'end'].map(handle => (
            <div key={handle}
              onMouseDown={e => onTrackMouseDown(e, handle)}
              onTouchStart={e => onTrackMouseDown(e, handle)}
              style={{ position: 'absolute', left: `${handle === 'start' ? startPct : endPct}%`, top: 0, bottom: 0, width: 18, transform: 'translateX(-50%)', background: '#3B6D11', borderRadius: 4, cursor: 'ew-resize', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2 }}>
              <div style={{ width: 2, height: 14, background: '#EAF3DE', borderRadius: 2 }} />
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
          <span style={{ fontSize: 11, color: '#3B6D11', fontWeight: 600 }}>{fmtTime(start)}</span>
          <span style={{ fontSize: 11, color: '#888780' }}>{fmtTime(clipLen)} selecionado</span>
          <span style={{ fontSize: 11, color: '#3B6D11', fontWeight: 600 }}>{fmtTime(end)}</span>
        </div>
      </div>
      <p style={{ fontSize: 11, color: '#B4B2A9', textAlign: 'center', marginBottom: 14 }}>Clique no vídeo para pré-visualizar o trecho</p>
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={onCancel} style={{ flex: 1, background: '#fff', border: '0.5px solid #C5E4A7', borderRadius: 10, padding: '11px 0', fontSize: 13, cursor: 'pointer', color: '#888780', fontFamily: 'inherit' }}>Cancelar</button>
        <button onClick={doTrim} disabled={trimming} style={{ flex: 2, background: '#3B6D11', border: 'none', borderRadius: 10, padding: '11px 0', fontSize: 13, fontWeight: 500, cursor: trimming ? 'default' : 'pointer', color: '#EAF3DE', fontFamily: 'inherit' }}>
          {trimming ? 'Processando...' : `Usar este trecho (${fmtTime(clipLen)}) ✓`}
        </button>
      </div>
    </div>
  )
}

export default function NewPost({ user, onPost }) {
  const [caption, setCaption] = useState('')
  const [tags, setTags] = useState([])
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState('select')

  const [rawImage, setRawImage] = useState(null)
  const [croppedBlob, setCroppedBlob] = useState(null)
  const [croppedPreview, setCroppedPreview] = useState(null)
  const [crop, setCrop] = useState({ unit: '%', x: 5, y: 5, width: 90, height: 90 })
  const [aspect, setAspect] = useState(undefined)
  const imgRef = useRef(null)

  const [videoFile, setVideoFile] = useState(null)
  const [videoDuration, setVideoDuration] = useState(0)
  const [trimmedBlob, setTrimmedBlob] = useState(null)
  const [trimmedMime, setTrimmedMime] = useState('video/webm')
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
      setVideoFile(f)
      setVideoDuration(vid.duration)
      if (vid.duration <= MAX_CLIP) {
        setTrimmedBlob(f)
        setTrimmedMime(f.type || 'video/mp4')
        setVideoPreview(url)
        setStep('video-details')
      } else {
        setStep('video-trim')
      }
    }
  }

  function onTrimConfirm(blob, mime) {
    setTrimmedBlob(blob)
    setTrimmedMime(mime)
    setVideoPreview(URL.createObjectURL(blob))
    setStep('video-details')
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
    setVideoFile(null); setTrimmedBlob(null); setVideoPreview(null); setVideoDuration(0)
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
      const { data: post, error: postError } = await supabase.from('posts').insert({ user_id: user.id, caption, image_url: urlData.publicUrl }).select().single()
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
          // captura frame no 1/3 da duração
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
    if (!caption || !trimmedBlob) return alert('Adicione um vídeo e legenda.')
    setLoading(true)
    try {
      const ts = Date.now()
      const ext = trimmedMime.includes('webm') ? 'webm' : 'mp4'
      const filename = `videos/${ts}.${ext}`

      // upload do vídeo
      await supabase.storage.from('post-images').upload(filename, trimmedBlob, { contentType: trimmedMime })
      const { data: urlData } = supabase.storage.from('post-images').getPublicUrl(filename)
      const videoUrl = urlData.publicUrl

      // captura thumbnail do vídeo
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
        user_id: user.id,
        caption,
        video_url: videoUrl,
        image_url: thumbUrl, // thumb usada no grid do perfil
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

  // tags compartilhado entre foto e vídeo
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
            <span style={{ color: '#B4B2A9', fontSize: 11 }}>qualquer duração</span>
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

      {/* Editor de corte de vídeo */}
      {step === 'video-trim' && videoFile && videoDuration > 0 && (
        <VideoTrimmer file={videoFile} duration={videoDuration} onConfirm={onTrimConfirm} onCancel={reset} />
      )}

      {/* Detalhes da foto — inline, sem componente aninhado */}
      {step === 'details' && (
        <div>
          <div style={{ position: 'relative', marginBottom: 12 }}>
            <img src={croppedPreview} alt="preview" style={{ width: '100%', maxHeight: 280, objectFit: 'contain', borderRadius: 12, background: '#F4FAF0', display: 'block' }} />
            <button onClick={() => setStep('crop')} style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(6px)', border: 'none', color: '#fff', borderRadius: 20, padding: '5px 12px', fontSize: 11, cursor: 'pointer' }}>✏️ editar corte</button>
          </div>
          <textarea
            value={caption}
            onChange={e => setCaption(e.target.value)}
            placeholder="Escreva a legenda... use #hashtags para categorizar 🌿"
            rows={3}
            style={{ width: '100%', border: '0.5px solid #C5E4A7', borderRadius: 10, padding: 10, fontSize: 13, fontFamily: 'inherit', resize: 'none', marginBottom: 8, outline: 'none', background: '#fff', boxSizing: 'border-box' }}
          />
          {tagsSection}
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={reset} style={btnCancel}>Cancelar</button>
            <button onClick={publishImage} disabled={loading} style={btnGreen}>{loading ? 'Publicando...' : 'Publicar 🌱'}</button>
          </div>
        </div>
      )}

      {/* Detalhes do vídeo — inline, sem componente aninhado */}
      {step === 'video-details' && (
        <div>
          <div style={{ position: 'relative', marginBottom: 12 }}>
            <video src={videoPreview} controls playsInline style={{ width: '100%', maxHeight: 280, borderRadius: 12, background: '#000', display: 'block' }} />
            <button onClick={() => setStep('video-trim')} style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(6px)', border: 'none', color: '#fff', borderRadius: 20, padding: '5px 12px', fontSize: 11, cursor: 'pointer' }}>✂️ editar corte</button>
          </div>
          <textarea
            value={caption}
            onChange={e => setCaption(e.target.value)}
            placeholder="Escreva a legenda... use #hashtags para categorizar 🌿"
            rows={3}
            style={{ width: '100%', border: '0.5px solid #C5E4A7', borderRadius: 10, padding: 10, fontSize: 13, fontFamily: 'inherit', resize: 'none', marginBottom: 8, outline: 'none', background: '#fff', boxSizing: 'border-box' }}
          />
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