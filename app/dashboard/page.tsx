'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { profileHelpers, evidenceHelpers } from '@/lib/supabase'
import {
  ROLE_LABELS, ROLE_COLORS, calcProgress, pColor, N_SEC,
  type Profile, type Evidence,
} from '@/lib/constants'

export default function DashboardPage() {
  const [user,     setUser]     = useState<Profile | null>(null)
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [evs,      setEvs]      = useState<Evidence[]>([])
  const [search,   setSearch]   = useState('')
  const [loading,  setLoading]  = useState(true)
  const router = useRouter()

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { router.replace('/auth'); return }
      const profile = await profileHelpers.getProfile(session.user.id)
      if (!profile || !['admin','deputy'].includes(profile.role) && !profile.is_developer) {
        router.replace('/auth'); return
      }
      setUser(profile as Profile)
      const [profs, evsList] = await Promise.all([
        profileHelpers.getAllProfiles(),
        evidenceHelpers.getAll(),
      ])
      setProfiles(profs as Profile[])
      setEvs(evsList as Evidence[])
      setLoading(false)
    })
  }, [router])

  const filtered = useMemo(() =>
    profiles.filter(p => !search || p.full_name?.includes(search) || p.email?.includes(search))
  , [profiles, search])

  const stats = useMemo(() => ({
    total:   profiles.length,
    active:  evs.length,
    avg:     profiles.length ? Math.round(profiles.reduce((s,p) => s + calcProgress(evs,p.id), 0) / profiles.length) : 0,
  }), [profiles, evs])

  if (loading) return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#0a0f1e' }}>
      <div style={{ textAlign:'center' }}>
        <div style={{ fontSize:48, marginBottom:12 }}>📚</div>
        <div style={{ fontFamily:'Amiri,serif', fontSize:18, color:'#c9a84c' }}>جاري تحميل اللوحة...</div>
      </div>
    </div>
  )

  return (
    <div style={{ minHeight:'100vh', background:'#0a0f1e', color:'#eef4ff', fontFamily:'Cairo,sans-serif', direction:'rtl' }}>
      {/* NavBar */}
      <nav style={{ background:'rgba(13,21,38,.9)', borderBottom:'1px solid rgba(201,168,76,.15)', padding:'0 24px', height:60, display:'flex', alignItems:'center', justifyContent:'space-between', position:'sticky', top:0, zIndex:50, backdropFilter:'blur(20px)' }}>
        <span style={{ fontFamily:'Amiri,serif', fontSize:18, color:'#c9a84c', fontWeight:700 }}>منصة إنجاز</span>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <span style={{ fontSize:13, color:'#8aaccc' }}>{user?.full_name}</span>
          <button onClick={async () => { await supabase.auth.signOut(); router.replace('/auth') }}
            style={{ background:'rgba(255,255,255,.08)', border:'1px solid rgba(255,255,255,.1)', color:'#8aaccc', padding:'6px 14px', borderRadius:8, cursor:'pointer', fontFamily:'Cairo,sans-serif', fontSize:12 }}>
            خروج
          </button>
        </div>
      </nav>

      <div style={{ maxWidth:1100, margin:'0 auto', padding:'24px 20px' }}>
        {/* Stats */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12, marginBottom:24 }}>
          {[
            { v: stats.total,        l: 'المعلمون',     c: '#c9a84c', ic: '👨‍🏫' },
            { v: stats.active,       l: 'الشواهد',      c: '#3b82f6', ic: '📂' },
            { v: `${stats.avg}%`,    l: 'متوسط الإنجاز', c: pColor(stats.avg), ic: '📊' },
          ].map((s,i) => (
            <div key={i} style={{ background:'rgba(16,26,50,.75)', border:`1px solid ${s.c}20`, borderRadius:16, padding:'20px 16px', textAlign:'center' }}>
              <div style={{ fontSize:28, marginBottom:8 }}>{s.ic}</div>
              <div style={{ fontSize:26, fontWeight:900, color:s.c }}>{s.v}</div>
              <div style={{ fontSize:12, color:'#4a6285', marginTop:4 }}>{s.l}</div>
            </div>
          ))}
        </div>

        {/* Search */}
        <div style={{ marginBottom:16 }}>
          <input
            placeholder="🔍 ابحث باسم المعلم..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ width:'100%', padding:'10px 16px', background:'rgba(8,14,30,.7)', border:'1.5px solid #1e3352', borderRadius:12, color:'#eef4ff', fontFamily:'Cairo,sans-serif', fontSize:14, outline:'none', boxSizing:'border-box' }}
          />
        </div>

        {/* Teachers Grid */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(250px,1fr))', gap:12 }}>
          {filtered.map(p => {
            const prog = calcProgress(evs, p.id)
            const cnt  = evs.filter(e => e.tid === p.id).length
            const col  = ROLE_COLORS[p.role] ?? '#64748b'
            return (
              <div key={p.id} style={{ background:'rgba(16,26,50,.75)', border:'1px solid rgba(255,255,255,.06)', borderRadius:16, padding:18, cursor:'pointer', transition:'transform .2s' }}
                onMouseEnter={e => (e.currentTarget.style.transform = 'translateY(-4px)')}
                onMouseLeave={e => (e.currentTarget.style.transform = 'translateY(0)')}>
                <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:12 }}>
                  <div style={{ width:46, height:46, borderRadius:'50%', background:`linear-gradient(135deg,${col},${col}88)`, display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontWeight:700, fontSize:14, flexShrink:0 }}>
                    {p.av}
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontWeight:800, fontSize:14, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{p.full_name}</div>
                    <span style={{ fontSize:10, color:col, background:`${col}18`, padding:'2px 8px', borderRadius:20, border:`1px solid ${col}30` }}>{ROLE_LABELS[p.role]}</span>
                  </div>
                  <div style={{ fontSize:20, fontWeight:900, color:pColor(prog), flexShrink:0 }}>{prog}%</div>
                </div>
                <div style={{ height:5, background:'rgba(255,255,255,.06)', borderRadius:3, overflow:'hidden', marginBottom:8 }}>
                  <div style={{ height:'100%', borderRadius:3, background:`linear-gradient(90deg,${pColor(prog)},${pColor(prog)}88)`, width:`${prog}%` }} />
                </div>
                <div style={{ display:'flex', justifyContent:'space-between', fontSize:11, color:'#4a6285' }}>
                  <span>📂 {cnt} شاهد</span>
                  <span>{new Set(evs.filter(e=>e.tid===p.id).map(e=>e.sid)).size}/{N_SEC} قسم</span>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
