import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'منصة إنجاز تحفيظ عيبان',
  description: 'منصة ملفات الإنجاز الوظيفي — مدرسة تحفيظ عيبان الابتدائية والمتوسطة | 1447هـ',
  icons: { icon: '/favicon.ico' },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          href="https://fonts.googleapis.com/css2?family=Amiri:ital,wght@0,400;0,700;1,400&family=Cairo:wght@300;400;600;700;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  )
}
