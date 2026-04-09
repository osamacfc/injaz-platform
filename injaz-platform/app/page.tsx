'use client'

import { useEffect } from 'react'
import { useRouter }  from 'next/navigation'
import { useAuth }    from '@/components/AuthProvider'
import { isPrivileged } from '@/lib/constants'

export default function Home() {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (loading) return
    if (!user) {
      router.replace('/auth')
    } else if (isPrivileged(user)) {
      router.replace('/dashboard')
    } else {
      router.replace(`/teacher/${user.id}`)
    }
  }, [user, loading, router])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="mesh-bg" />
      <div className="relative z-10 text-center">
        <div className="text-5xl mb-4 animate-float">📚</div>
        <div style={{ fontFamily: 'Amiri, serif', fontSize: 20, color: 'var(--gold)' }}>
          منصة إنجاز تحفيظ عيبان
        </div>
        <div className="mt-3 flex gap-2 justify-center">
          {['', '', ''].map((_, i) => (
            <div key={i} style={{
              width: 8, height: 8, borderRadius: '50%',
              background: 'var(--gold)',
              animation: `floatUp 1.2s ease ${i * .2}s infinite`,
            }} />
          ))}
        </div>
      </div>
    </div>
  )
}
