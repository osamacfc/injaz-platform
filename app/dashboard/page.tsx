'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase, profileHelpers, evidenceHelpers } from '@/lib/supabase'
import {
  SCHOOL, TERM, SECTIONS, KPI_STANDARDS, ROLE_LABELS, ROLE_COLORS,
  SEALS_CATALOG, calcProgress, pColor, N_SEC,
  type Profile, type Evidence,
} from '@/lib/constants'

// ── Helpers ──
const delay = (i: number) => ({ animationDelay: `${i * .05}s` })

export default function DashboardPage() {
  const router = useRouter()
  const [viewer,   setViewer]   = useState<Profile | null>(null)
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [evs,      setEvs]      = useState<Evidence[]>([])
  const [search,   setSearch]   = useState('')
  const [filter,   setFilter]   = useState<string>('all')
  const [loading,  setLoading]  = useState(true)
  const [view,     setView]     = useState<'grid'|'list'>('grid')

  // ── Load ──
  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { router.replace('/auth'); return }

      const profile = await profileHelpers.getProfile(session.user.id)
      if (!profile) { router.replace('/auth'); return }

      const canView = ['admin','deputy'].includes(profile.role) || profile.is_developer
      if (!canView) { router.replace(`/teacher/${session.user.id}`); return }

      setViewer(profile as Profile)

      const [profs, evList] = await Promise.all([
        profileHelpers.getAllProfiles(),
        evidenceHelpers.getAll(),
      ])
      setProfiles(profs as Profile[])
      setEvs(evList as Evidence[])
      setLoading(false)
    })
  }, [router])

  // ── Real-time ──
  useEffect(() => {
    const ch = supabase.channel('db-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'evidences' }, payload => {
        if (payload.eventType === 'INSERT') {
          setEvs(prev => [payload.new as Evidence, ...prev])
        } else if (payload.eventType === 'DELETE') {
          setEvs(prev => prev.filter(e => e.id !== payload.old.id))
        }
      })
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [])

  // ── Stats ──
  const stats = useMemo(() => {
    const active = profiles.filter(p => evs.some(e => e.tid === p.id))
    const avgProg = profiles.length
      ? Math.round(profiles.reduce((s,p) => s + calcProgress(evs,p.id), 0) / profiles.length)
      : 0
    const topTeacher = [...profiles].sort((a,b) => calcProgress(evs,b.id) - calcProgress(evs,a.id))[0]
    const kpiCoverage = new Set(evs.flatMap(e => e.kpis ?? [])).size
    return { active: active.length, avgProg, topTeacher, kpiCoverage, total: profiles.length }
  }, [profiles, evs])

  // ── Filter ──
  const filtered = useMemo(() => {
    let list = profiles
    if (search) list = list.filter(p => p.full_name?.includes(search) || p.email?.includes(search))
    if (filter !== 'all') list = list.filter(p => p.role === filter)
    return list.sort((a,b) => calcProgress(evs,b.id) - calcProgress(evs,a.id))
  }, [profiles, evs, search, filter])

  if (loading) return <LoadingScreen />

  return (
    <div className="min-h-screen" style={{ background:'var(--navy)' }}>
      <div className="mesh-bg" />
      <div className="blob" style={{ width:500, height:500, background:'var(--gold)', top:-200, right:-200 }} />
      <div className="blob" style={{ width:400, height:400, background:'var(--em)', bottom:-150, left:-150, animationDelay:'7s' }} />

      {/* ── Navbar ── */}
      <nav className="topnav no-print">
        <div className="flex items-center gap-3">
          <div style={{ width:36, height:36, borderRadius:10, background:'linear-gradient(135deg,var(--gold),var(--gold-d))', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18 }}>
            📚
          </div>
          <div>
            <div style={{ fontFamily:'Amiri,serif', fontSize:16, color:'var(--gold)', fontWeight:700, lineHeight:1.2 }}>منصة إنجاز</div>
            <div style={{ fontSize:10, color:'var(--tx3)' }}>{TERM}</div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl" style={{ background:'rgba(201,168,76,.08)', border:'1px solid var(--bd-gold)' }}>
            <div style={{ width:28, height:28, borderRadius:8, background:`linear-gradient(135deg,${ROLE_COLORS[viewer?.role ?? ''] ?? '#64748b'},${ROLE_COLORS[viewer?.role ?? ''] ?? '#64748b'}88)`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:700, color:'#fff' }}>
              {viewer?.av}
            </div>
            <div>
              <div style={{ fontSize:12, fontWeight:700, color:'var(--tx)' }}>{viewer?.full_name}</div>
              <div style={{ fontSize:10, color:'var(--gold)' }}>{ROLE_LABELS[viewer?.role ?? '']}</div>
            </div>
          </div>
          <button onClick={() => router.push('/guest')} className="btn btn-ghost" style={{ padding:'7px 14px', fontSize:12 }}>
            👁 عرض عام
          </button>
          <button onClick={async () => { await supabase.auth.signOut(); router.replace('/auth') }}
            className="btn btn-ghost" style={{ padding:'7px 14px', fontSize:12, color:'var(--danger)', borderColor:'rgba(239,68,68,.25)' }}>
            خروج
          </button>
        </div>
      </nav>

      <div className="relative z-10" style={{ maxWidth:1200, margin:'0 auto', padding:'24px 20px' }}>

        {/* ── Header ── */}
        <div className="animate-fade-up mb-8">
          <h1 style={{ fontFamily:'Amiri,serif', fontSize:28, color:'var(--gold)', fontWeight:700, marginBottom:4 }}>
            لوحة المتابعة
          </h1>
          <p style={{ color:'var(--tx3)', fontSize:14 }}>{SCHOOL}</p>
        </div>

        {/* ── Stats Grid ── */}
        <div className="grid grid-cols-2 gap-3 mb-8 md:grid-cols-4">
          {[
            { v: stats.total,         l:'المعلمون',      ic:'👨‍🏫', c:'var(--gold)',   sub:'إجمالي الكادر' },
            { v: stats.active,        l:'نشطون',          ic:'✅',   c:'var(--em)',    sub:'أضافوا شواهد' },
            { v: evs.length,          l:'الشواهد',        ic:'📂',   c:'var(--info)', sub:'إجمالي موثق' },
            { v: `${stats.avgProg}%`, l:'متوسط الإنجاز',  ic:'📊',   c:pColor(stats.avgProg), sub:'تقدم الملفات' },
          ].map((s,i) => (
            <div key={i} className="stat-card animate-fade-up" style={delay(i)}>
              <div style={{ fontSize:28, marginBottom:10 }}>{s.ic}</div>
              <div style={{ fontSize:26, fontWeight:900, color:s.c, marginBottom:2 }}>{s.v}</div>
              <div style={{ fontSize:13, fontWeight:700, color:'var(--tx2)', marginBottom:2 }}>{s.l}</div>
              <div style={{ fontSize:10, color:'var(--tx3)' }}>{s.sub}</div>
            </div>
          ))}
        </div>

        {/* ── KPI Coverage ── */}
        <div className="glass2 rounded-3xl p-5 mb-6 animate-fade-up" style={{ animationDelay:'.2s' }}>
          <div className="flex items-center justify-between mb-4">
            <h2 style={{ fontFamily:'Amiri,serif', fontSize:17, color:'var(--gold)', fontWeight:700 }}>
              تغطية المعايير المهنية
            </h2>
            <span className="badge" style={{ background:'var(--gold-pale)', color:'var(--gold)', borderColor:'var(--bd-gold)' }}>
              {stats.kpiCoverage}/{KPI_STANDARDS.length} معيار
            </span>
          </div>
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
            {[1,2,3,4,5].map(domain => {
              const kpis = KPI_STANDARDS.filter(k => k.domain === domain)
              const covered = kpis.filter(k => evs.some(e => e.kpis?.includes(k.id))).length
              const pct = Math.round((covered/kpis.length)*100)
              const col = kpis[0]?.color ?? 'var(--gold)'
              return (
                <div key={domain} className="flex items-center gap-3 p-3 rounded-xl" style={{ background:'rgba(255,255,255,.03)' }}>
                  <div style={{ fontSize:18 }}>{['🧠','📖','🌱','🤝','💻'][domain-1]}</div>
                  <div style={{ flex:1 }}>
                    <div className="flex justify-between mb-1">
                      <span style={{ fontSize:12, color:'var(--tx2)' }}>{kpis[0]?.domainName}</span>
                      <span style={{ fontSize:11, fontWeight:700, color:col }}>{covered}/{kpis.length}</span>
                    </div>
                    <div className="kpi-bar">
                      <div className="kpi-fill" style={{ width:`${pct}%`, background:col }} />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* ── Teachers Section ── */}
        <div className="animate-fade-up" style={{ animationDelay:'.3s' }}>

          {/* Controls */}
          <div className="flex items-center gap-3 mb-5 flex-wrap">
            <div className="relative flex-1" style={{ minWidth:220 }}>
              <input
                className="inp"
                placeholder="🔍 ابحث باسم المعلم..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ paddingRight:16 }}
              />
            </div>

            <select
              value={filter}
              onChange={e => setFilter(e.target.value)}
              className="inp"
              style={{ width:'auto', padding:'11px 14px' }}>
              <option value="all">كل الأدوار</option>
              {Object.entries(ROLE_LABELS).map(([k,v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>

            <div className="flex gap-1 p-1 rounded-xl" style={{ background:'var(--card3)', border:'1px solid var(--bd)' }}>
              {(['grid','list'] as const).map(v => (
                <button key={v} onClick={() => setView(v)}
                  style={{ padding:'7px 12px', borderRadius:10, border:'none', cursor:'pointer', fontSize:14,
                    background: view === v ? 'rgba(201,168,76,.15)' : 'transparent',
                    color: view === v ? 'var(--gold)' : 'var(--tx3)',
                  }}>
                  {v === 'grid' ? '⊞' : '☰'}
                </button>
              ))}
            </div>

            <span style={{ fontSize:13, color:'var(--tx3)' }}>{filtered.length} معلم</span>
          </div>

          {/* Grid/List */}
          {view === 'grid' ? (
            <div className="grid gap-4" style={{ gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))' }}>
              {filtered.map((p,i) => <TeacherCard key={p.id} p={p} evs={evs} i={i} onClick={() => router.push(`/teacher/${p.id}`)} />)}
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {filtered.map((p,i) => <TeacherRow key={p.id} p={p} evs={evs} i={i} onClick={() => router.push(`/teacher/${p.id}`)} />)}
            </div>
          )}

          {filtered.length === 0 && (
            <div className="text-center py-20" style={{ color:'var(--tx3)' }}>
              <div style={{ fontSize:48, marginBottom:12 }}>🔍</div>
              <p>لا توجد نتائج</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Teacher Card (Grid) ──
function TeacherCard({ p, evs, i, onClick }: { p: Profile; evs: Evidence[]; i: number; onClick: () => void }) {
  const prog = calcProgress(evs, p.id)
  const cnt  = evs.filter(e => e.tid === p.id).length
  const col  = ROLE_COLORS[p.role] ?? '#64748b'
  const secs = new Set(evs.filter(e => e.tid === p.id).map(e => e.sid)).size

  return (
    <div className="glass-card animate-fade-up cursor-pointer" style={{ ...delay(i), padding:20 }} onClick={onClick}>
      <div className="flex items-center gap-3 mb-4">
        <div className="relative">
          <div style={{ width:50, height:50, borderRadius:'50%', background:`linear-gradient(135deg,${col},${col}88)`, display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontWeight:900, fontSize:16, boxShadow:`0 6px 20px ${col}44` }}>
            {p.av}
          </div>
          {prog >= 80 && <span className="absolute -top-1 -right-1 animate-seal-glow text-sm">🥇</span>}
        </div>
        <div className="flex-1 min-w-0">
          <div style={{ fontWeight:800, fontSize:14, marginBottom:3 }} className="truncate">{p.full_name}</div>
          <span className="badge" style={{ background:`${col}15`, color:col, borderColor:`${col}30`, fontSize:10 }}>
            {ROLE_LABELS[p.role]}
          </span>
        </div>
        <div style={{ fontSize:22, fontWeight:900, color:pColor(prog), flexShrink:0 }}>{prog}%</div>
      </div>

      <div className="progress-track mb-3">
        <div className="progress-fill" style={{ width:`${prog}%`, background:`linear-gradient(90deg,${pColor(prog)},${pColor(prog)}88)` }} />
      </div>

      <div className="flex justify-between" style={{ fontSize:11, color:'var(--tx3)' }}>
        <span>📂 {cnt} شاهد</span>
        <span>{secs}/{N_SEC} قسم</span>
        <span style={{ color:prog >= 80 ? 'var(--em)' : prog >= 50 ? 'var(--am)' : 'var(--danger)' }}>
          {prog >= 80 ? '✅ متميز' : prog >= 50 ? '🔄 جيد' : '⚠️ يحتاج متابعة'}
        </span>
      </div>
    </div>
  )
}

// ── Teacher Row (List) ──
function TeacherRow({ p, evs, i, onClick }: { p: Profile; evs: Evidence[]; i: number; onClick: () => void }) {
  const prog = calcProgress(evs, p.id)
  const cnt  = evs.filter(e => e.tid === p.id).length
  const col  = ROLE_COLORS[p.role] ?? '#64748b'

  return (
    <div className="glass-card animate-fade-up cursor-pointer" style={{ ...delay(i), padding:'14px 18px', borderRadius:16 }} onClick={onClick}>
      <div className="flex items-center gap-4">
        <div style={{ width:42, height:42, borderRadius:'50%', background:`linear-gradient(135deg,${col},${col}88)`, display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontWeight:800, fontSize:14, flexShrink:0 }}>
          {p.av}
        </div>
        <div style={{ width:180, flexShrink:0 }}>
          <div style={{ fontWeight:700, fontSize:14 }} className="truncate">{p.full_name}</div>
          <span style={{ fontSize:10, color:col }}>{ROLE_LABELS[p.role]}</span>
        </div>
        <div style={{ flex:1 }}>
          <div className="progress-track" style={{ height:4 }}>
            <div className="progress-fill" style={{ width:`${prog}%`, background:pColor(prog) }} />
          </div>
        </div>
        <div style={{ fontSize:16, fontWeight:900, color:pColor(prog), width:48, textAlign:'center', flexShrink:0 }}>{prog}%</div>
        <div style={{ fontSize:12, color:'var(--tx3)', width:64, textAlign:'center', flexShrink:0 }}>📂 {cnt}</div>
        <div style={{ fontSize:18, flexShrink:0 }}>←</div>
      </div>
    </div>
  )
}

// ── Loading ──
function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background:'var(--navy)' }}>
      <div className="mesh-bg" />
      <div className="relative z-10 text-center">
        <div style={{ fontSize:52, marginBottom:16 }} className="animate-float">📚</div>
        <div style={{ fontFamily:'Amiri,serif', color:'var(--gold)', fontSize:20, marginBottom:20 }}>
          جاري تحميل اللوحة...
        </div>
        <div className="flex gap-2 justify-center">
          {[0,1,2].map(i => <div key={i} className="loading-dot" style={{ animationDelay:`${i*.2}s` }} />)}
        </div>
      </div>
    </div>
  )
}
