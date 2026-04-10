import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'منصة إنجاز تحفيظ عيبان',
  description: 'منصة ملفات الإنجاز الوظيفي',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&family=Cairo:wght@400;600;700;900&display=swap" rel="stylesheet" />
      </head>
      <body>{children}</body>
    </html>
  )
}
