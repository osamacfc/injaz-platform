'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function Home() {
  const router = useRouter()
  useEffect(() => {
    router.replace('/auth')
  }, [router])
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0a0f1e' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>📚</div>
        <div style={{ fontFamily: 'serif', fontSize: 20, color: '#c9a84c' }}>منصة إنجاز تحفيظ عيبان</div>
      </div>
    </div>
  )
}
