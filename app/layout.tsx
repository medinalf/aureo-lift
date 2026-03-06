import type { Metadata, Viewport } from 'next'
import './globals.css'
import { ThemeProvider } from '@/components/layout/theme-provider'

export const metadata: Metadata = {
  title: { default: 'Aureo Lift', template: '%s — Aureo Lift' },
  description: 'Registra tu progresión en fuerza.',
  manifest: '/manifest.webmanifest',
}
export const viewport: Viewport = { themeColor: '#C9A84C', width: 'device-width', initialScale: 1, maximumScale: 1 }

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body><ThemeProvider>{children}</ThemeProvider></body>
    </html>
  )
}
