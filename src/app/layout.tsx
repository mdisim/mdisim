import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { ToastProvider } from '@/components/ui/toast'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

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
    <html lang="en" className="h-full" suppressHydrationWarning>
      <body className={`${inter.className} h-full`}>
        <script dangerouslySetInnerHTML={{__html: `
  (function(){
    try {
      var theme = localStorage.getItem('angel-dc-theme') || 'light';
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
