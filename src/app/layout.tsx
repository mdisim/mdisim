import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { ToastProvider } from '@/components/ui/toast'
import './globals.css'

const geistSans = Geist({ subsets: ['latin'], variable: '--font-geist-sans' })
const geistMono = Geist_Mono({ subsets: ['latin'], variable: '--font-geist-mono' })

export const metadata: Metadata = {
  title: 'ANGEL D.C. — Construction Intelligence Platform',
  description: 'Enterprise construction intelligence and project management platform',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full`} suppressHydrationWarning>
      <body className="h-full">
        <script dangerouslySetInnerHTML={{__html: `
  (function(){
    try {
      var theme = localStorage.getItem('angel-dc-theme') || 'dark';
      if (theme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }

      var lang = localStorage.getItem('angel-dc-language') || 'en';
      var rtl = ['ar','he'].includes(lang);
      document.documentElement.setAttribute('dir', rtl ? 'rtl' : 'ltr');
      document.documentElement.setAttribute('lang', lang);
      if (lang === 'ar') document.documentElement.classList.add('font-arabic');
      if (lang === 'he') document.documentElement.classList.add('font-hebrew');
    } catch(e) { console.error('Failed to initialize language/direction settings:', e) }
  })()
`}} />
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  )
}
