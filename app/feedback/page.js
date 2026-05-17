'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

export default function FeedbackPage() {
  const [user, setUser] = useState(null)
  const [type, setType] = useState('sugestao')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setUser(data.session?.user ?? null))
  }, [])

  async function submit() {
    if (!message.trim()) return alert('Escreva sua mensagem antes de enviar.')
    setLoading(true)
    try {
      const { error } = await supabase.from('feedback').insert({
        user_id: user?.id ?? null,
        type,
        message: message.trim(),
      })
      if (error) throw error
      setSent(true)
      setMessage('')
    } catch (e) {
      alert('Erro ao enviar: ' + e.message)
    }
    setLoading(false)
  }

  return (
    <div style={{ maxWidth: 560, margin: '0 auto', padding: '8px 0' }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 20, fontWeight: 600, color: '#27500A', marginBottom: 4 }}>💬 Feedback</h1>
        <p style={{ fontSize: 13, color: '#888780', lineHeight: 1.5 }}>
          Encontrou um bug ou tem uma sugestão? Conta pra gente — toda mensagem é lida pelo time.
        </p>
      </div>

      {sent ? (
        <div style={{ background: '#EAF3DE', borderRadius: 16, padding: '32px 24px', textAlign: 'center', border: '0.5px solid #C5E4A7' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🌱</div>
          <p style={{ fontWeight: 600, fontSize: 16, color: '#27500A', marginBottom: 6 }}>Obrigado pelo feedback!</p>
          <p style={{ fontSize: 13, color: '#3B6D11', marginBottom: 20 }}>Sua mensagem foi enviada com sucesso.</p>
          <button onClick={() => setSent(false)} style={{ background: '#3B6D11', color: '#EAF3DE', border: 'none', borderRadius: 20, padding: '9px 24px', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
            Enviar outro
          </button>
        </div>
      ) : (
        <div style={{ background: '#fff', borderRadius: 16, border: '0.5px solid #E2F2D4', padding: 20 }}>

          {/* Tipo */}
          <p style={{ fontSize: 12, fontWeight: 600, color: '#B4B2A9', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 10 }}>Tipo</p>
          <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
            {[
              { key: 'sugestao', label: '💡 Sugestão', desc: 'Ideia ou melhoria' },
              { key: 'bug', label: '🐛 Bug', desc: 'Algo não funciona' },
            ].map(({ key, label, desc }) => (
              <button key={key} onClick={() => setType(key)} style={{
                flex: 1, padding: '12px 8px', borderRadius: 12, cursor: 'pointer', textAlign: 'center',
                border: type === key ? '2px solid #3B6D11' : '1px solid #E2F2D4',
                background: type === key ? '#F4FAF0' : '#fff',
                transition: 'all 0.15s'
              }}>
                <p style={{ fontSize: 14, fontWeight: 600, color: type === key ? '#27500A' : '#888780', margin: '0 0 2px' }}>{label}</p>
                <p style={{ fontSize: 11, color: '#B4B2A9', margin: 0 }}>{desc}</p>
              </button>
            ))}
          </div>

          {/* Mensagem */}
          <p style={{ fontSize: 12, fontWeight: 600, color: '#B4B2A9', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 10 }}>Mensagem</p>
          <textarea
            value={message}
            onChange={e => setMessage(e.target.value)}
            placeholder={type === 'bug'
              ? 'Descreva o bug: o que aconteceu, em qual tela, e como reproduzir...'
              : 'Descreva sua ideia ou sugestão de melhoria...'}
            rows={5}
            style={{ width: '100%', border: '1px solid #D6ECC4', borderRadius: 12, padding: '12px 14px', fontSize: 13, fontFamily: 'inherit', resize: 'none', outline: 'none', background: '#F4FAF0', color: '#27500A', marginBottom: 16, boxSizing: 'border-box', lineHeight: 1.6 }}
            onFocus={e => e.target.style.borderColor = '#3B6D11'}
            onBlur={e => e.target.style.borderColor = '#D6ECC4'}
          />

          {!user && (
            <p style={{ fontSize: 12, color: '#B4B2A9', marginBottom: 12, textAlign: 'center' }}>
              Você está enviando como visitante. Faça login para que possamos entrar em contato.
            </p>
          )}

          <button onClick={submit} disabled={loading || !message.trim()} style={{
            width: '100%', background: message.trim() ? '#3B6D11' : '#C5E4A7',
            color: '#EAF3DE', border: 'none', borderRadius: 12, padding: '13px 0',
            fontSize: 14, fontWeight: 500, cursor: message.trim() ? 'pointer' : 'default',
            fontFamily: 'inherit', transition: 'background 0.15s'
          }}>
            {loading ? 'Enviando...' : 'Enviar feedback'}
          </button>
        </div>
      )}
    </div>
  )
}