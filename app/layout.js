import './globals.css'
import Navbar from '../components/Navbar'

export const metadata = {
  title: 'plantinha',
  description: 'Rede social para amantes de plantas',
}

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body style={{ background: '#E2F2D4', minHeight: '100vh', display: 'flex', justifyContent: 'center' }}>
        <div style={{
          width: '100%',
          maxWidth: 390,
          minHeight: '100vh',
          background: '#F4FAF0',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 0 40px rgba(0,0,0,0.1)',
          position: 'relative'
        }}>
          <Navbar />
          <main style={{ flex: 1, padding: '16px', overflowY: 'auto' }}>
            {children}
          </main>
        </div>
      </body>
    </html>
  )
}