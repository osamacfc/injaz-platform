'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function Home() {
  const router = useRouter()
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.replace('/auth'); return }
      supabase.from('profiles').select('role,is_developer').eq('id', session.user.id).single()
        .then(({ data }) => {
          const role = data?.role ?? ''
          if (['admin','deputy'].includes(role) || data?.is_developer) {
            router.replace('/dashboard')
          } else {
            router.replace('/auth')
          }
        })
    })
  }, [router])

  return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#0a0f1e' }}>
      <div style={{ textAlign:'center' }}>
        <div style={{ fontSize:48, marginBottom:12 }}>📚</div>
        <div style={{ fontFamily:'Amiri,serif', fontSize:20, color:'#c9a84c' }}>منصة إنجاز تحفيظ عيبان</div>
      </div>
    </div>
  )
}
