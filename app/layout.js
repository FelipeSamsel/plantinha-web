import './globals.css'
import NavbarWrapper from '../components/NavbarWrapper'

export const metadata = {
  title: 'plantinha',
  description: 'Rede social para quem ama plantas',
}

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body>
        <NavbarWrapper>
          {children}
        </NavbarWrapper>
      </body>
    </html>
  )
}