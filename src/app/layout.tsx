import type { Metadata } from 'next'
import '@fran/lar/vars.css'
import './globals.css'

export const metadata: Metadata = {
  title: 'Tomasa',
  description: 'Gestión de visitas a la casa de Granada',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="flex min-h-screen flex-col">{children}</body>
    </html>
  )
}
