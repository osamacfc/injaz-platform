'use client'

import { useState, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/AuthProvider'
import { profileHelpers } from '@/lib/supabase'
import {
  SCHOOL, TERM, SECTIONS, KPI_STANDARDS, ROLE_LABELS, ROLE_COLORS,
  calcProgress, pColor, isPrivileged, N_SEC,
  type Profile, type Evidence,
} from '@/lib/constants'

export default function DashboardPage() {
  const { user, evs, loading } = useAuth()
  const router = useRouter()
  const [profiles,      setProfiles]      = useState<Profile[]>([])
  const [search,        setSearch]        = useState('')
  const [roleFilter,    setRoleFilter]    = useState('all')
  const [loadingUsers,  setLoadingUsers]  = useState(true)
  const [showAnalytics, setShowAnalytics] = useState(false)

  useEffect(() => {
    if (!loading && (!user || !isPrivileged(user))) router.replace('/')
  }, [user, loading, router])

  useEffect(() => {
    profileHelpers.getAllProfiles().then(p => {
      setProfiles(p as Profile[])
      setLoadingUsers(false)
    })
  }, [])

  const filtered = useMemo(() => profiles.filter(p => {
    const ms = p.full_name?.includes(search) || p.email?.includes(search)
    const mr = roleFilter === 'all' || p.role === roleFilter
    return ms && mr
  }), [profiles, search, roleFilter])

  const stats = useMemo(() => {
    const totalEvs  = evs.length
    const activeEvs = evs.filter(e => e.active).length
    const avgProg   = profiles.length
      ? Math.round(profiles.reduce((s, p) => s + calcProgress(evs, p.id), 0) / profiles.length)
      : 0
    const allKpis   = evs.flatMap(e => e.kpis ?? [])
    const kpiCov    = new Set(allKpis).size
    return { totalEvs, activeEvs, avgProg, kpiCov }
  }, [evs, profiles])

  if (loading || loadingUsers) return <LoadingScreen />

  return (
    <div className="min-h-screen">
      <div className="mesh-bg" />

      {/* NavBar */}
      <nav className="glass sticky top-0 z-50 flex items-center justify-between px-6 h-16 no-print"
        style={{ borderBottom: '1px solid rgba(201,168,76,.15)' }}>
        <div className="flex items-center gap-3">
          <span style={{ fontFamily: 'Amiri, serif', fontSize: 18, color: 'var(--gold)', fontWeight: 700 }}>منصة إنجاز</span>
          <span className="badge" style={{ background: 'rgba(16,185,129,.12)', color: 'var(--em)', border: '1px solid rgba(16,185,129,.25)', fontSize: 10 }}>☁️ Live</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs" style={{ color: 'var(--tx3)' }}>{user?.full_name}</span>
          <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold"
            style={{ background: `linear-gradient(135deg,${ROLE_COLORS[user?.role ?? 'admin']},${ROLE_COLORS[user?.role ?? 'admin']}88)` }}>
            {user?.av}
          </div>
          <button className="btn btn-ghost" style={{ padding: '6px 12px', fontSize: 12 }}
            onClick={() => { supabaseSignOut(); router.replace('/auth') }}>خروج</button>
        </div>
      </nav>

      <div className="relative z-10 max-w-6xl mx-auto px-5 py-6">
        {/* Header */}
        <div className="mb-6 flex items-end justify-between flex-wrap gap-3">
          <div>
            <h1 style={{ fontFamily: 'Amiri, serif', fontSize: 24, color: 'var(--gold)', fontWeight: 700 }}>
              لوحة متابعة الملفات
            </h1>
            <p style={{ color: 'var(--tx2)', fontSize: 13 }}>{TERM} • مرحباً {user?.full_name?.split(' ')[0]}</p>
          </div>
          <button onClick={() => setShowAnalytics(!showAnalytics)}
            className="btn" style={{ background: showAnalytics ? 'var(--em-pale)' : 'rgba(255,255,255,.06)', color: showAnalytics ? 'var(--em)' : 'var(--tx2)', border: '1px solid', borderColor: showAnalytics ? 'rgba(16,185,129,.3)' : 'var(--bd)', fontFamily: 'Cairo, sans-serif' }}>
            📊 تحليل KPI
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 mb-5 md:grid-cols-4">
          {[
            { v: profiles.length,      l: 'المعلمون',       c: 'var(--gold)', bg: 'var(--gold-pale)', ic: '👨‍🏫' },
            { v: stats.activeEvs,      l: 'الشواهد النشطة', c: 'var(--info)', bg: 'rgba(59,130,246,.1)', ic: '📂' },
            { v: `${stats.avgProg}%`,  l: 'متوسط الإنجاز',  c: pColor(stats.avgProg), bg: `${pColor(stats.avgProg)}18`, ic: '📊' },
            { v: `${stats.kpiCov}/${KPI_STANDARDS.length}`, l: 'تغطية المعايير', c: 'var(--pu)', bg: 'rgba(139,92,246,.1)', ic: '🎯' },
          ].map((s, i) => (
            <div key={i} className="glass animate-fade-up rounded-2xl p-5 text-center"
              style={{ animationDelay: `${i * .06}s`, border: `1px solid ${s.c}20` }}>
              <div className="text-2xl mb-2">{s.ic}</div>
              <div style={{ fontSize: 26, fontWeight: 900, color: s.c, fontFamily: 'Cairo, sans-serif' }}>{s.v}</div>
              <div style={{ fontSize: 12, color: 'var(--tx2)', marginTop: 4 }}>{s.l}</div>
            </div>
          ))}
        </div>

        {/* KPI Analytics */}
        {showAnalytics && (
          <div className="glass animate-fade-up rounded-2xl p-5 mb-5" style={{ border: '1px solid rgba(16,185,129,.2)' }}>
            <h3 style={{ fontFamily: 'Amiri, serif', fontSize: 16, color: 'var(--em)', marginBottom: 14 }}>
              🎯 تغطية المعايير المهنية الوطنية
            </h3>
            <div className="grid grid-cols-5 gap-3">
              {[1,2,3,4,5].map(d => {
                const dom  = KPI_STANDARDS.filter(s => s.domain === d)
                const used = dom.filter(s => evs.some(e => (e.kpis ?? []).includes(s.id))).length
                const pct  = Math.round((used / dom.length) * 100)
                const col  = dom[0]?.color ?? '#fff'
                return (
                  <div key={d} className="text-center p-3 rounded-xl" style={{ background: `${col}0a`, border: `1px solid ${col}25` }}>
                    <div style={{ fontSize: 22, fontWeight: 900, color: col }}>{pct}%</div>
                    <div style={{ fontSize: 9, color: 'var(--tx3)', marginTop: 3 }}>المجال {d}</div>
                    <div style={{ height: 4, borderRadius: 2, background: 'rgba(255,255,255,.08)', marginTop: 6 }}>
                      <div style={{ height: '100%', borderRadius: 2, background: col, width: `${pct}%`, transition: 'width 1s ease' }} />
                    </div>
                    <div style={{ fontSize: 8, color: 'var(--tx3)', marginTop: 3 }}>{used}/{dom.length}</div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="glass rounded-2xl p-4 mb-4 flex gap-3 flex-wrap items-center">
          <div className="relative flex-1" style={{ minWidth: 200 }}>
            <input className="inp" placeholder="ابحث باسم المعلم أو بريده..." value={search}
              onChange={e => setSearch(e.target.value)} style={{ paddingRight: 44 }} />
            <span className="absolute top-1/2 -translate-y-1/2" style={{ right: 14, color: 'var(--tx3)', pointerEvents: 'none' }}>🔍</span>
          </div>
          <select className="inp" value={roleFilter} onChange={e => setRoleFilter(e.target.value)}
            style={{ width: 'auto', minWidth: 150 }}>
            <option value="all">جميع الأدوار</option>
            {Object.entries(ROLE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <span style={{ fontSize: 13, color: 'var(--tx2)', fontWeight: 700 }}>{filtered.length} معلم</span>
        </div>

        {/* Teachers Grid */}
        <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(260px,1fr))' }}>
          {filtered.map((p, i) => (
            <TeacherCard key={p.id} profile={p} evs={evs} idx={i}
              onClick={() => router.push(`/teacher/${p.id}`)} />
          ))}
          {filtered.length === 0 && (
            <div className="col-span-full text-center py-16" style={{ color: 'var(--tx3)' }}>
              <div className="text-5xl mb-3">🔍</div>
              <p className="font-bold">لا توجد نتائج</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function TeacherCard({ profile, evs, idx, onClick }: {
  profile: Profile; evs: Evidence[]; idx: number; onClick: () => void
}) {
  const prog     = calcProgress(evs, profile.id)
  const cnt      = evs.filter(e => e.tid === profile.id).length
  const secs     = new Set(evs.filter(e => e.tid === profile.id && e.active).map(e => e.sid)).size
  const kpiCount = new Set(evs.filter(e => e.tid === profile.id).flatMap(e => e.kpis ?? [])).size
  const col      = ROLE_COLORS[profile.role] ?? '#64748b'
  const colBar   = pColor(prog)

  return (
    <div className="glass animate-fade-up rounded-2xl p-5 cursor-pointer transition-all hover:-translate-y-1"
      style={{ animationDelay: `${idx * .03}s`, border: '1px solid rgba(255,255,255,.05)' }}
      onClick={onClick}
      onMouseEnter={e => (e.currentTarget.style.borderColor = `${col}40`)}
      onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,.05)')}>
      <div className="flex items-center gap-3 mb-3">
        <div className="relative">
          <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-sm"
            style={{ background: `linear-gradient(135deg,${col},${col}88)`, boxShadow: `0 6px 20px ${col}44` }}>
            {profile.av}
          </div>
          {prog >= 80 && <span className="absolute -top-1.5 -left-1.5 text-sm animate-seal-glow">🥇</span>}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-black text-sm truncate" style={{ color: 'var(--tx)' }}>{profile.full_name}</div>
          <span className="badge" style={{ background: `${col}18`, color: col, border: `1px solid ${col}30`, fontSize: 10 }}>
            {ROLE_LABELS[profile.role]}
          </span>
        </div>
        <div className="text-center">
          <div style={{ fontSize: 20, fontWeight: 900, color: colBar }}>{prog}%</div>
        </div>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden mb-3" style={{ background: 'rgba(255,255,255,.06)' }}>
        <div className="h-full rounded-full transition-all duration-1000"
          style={{ width: `${prog}%`, background: `linear-gradient(90deg,${colBar},${colBar}88)` }} />
      </div>
      <div className="flex justify-between text-xs" style={{ color: 'var(--tx3)' }}>
        <span>📂 {cnt} شاهد</span>
        <span>📋 {secs}/{N_SEC}</span>
        {kpiCount > 0 && <span style={{ color: 'var(--pu)' }}>🎯 {kpiCount}</span>}
      </div>
    </div>
  )
}

function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="mesh-bg" />
      <div className="relative z-10 text-center">
        <div className="text-5xl mb-4 animate-float">📚</div>
        <div style={{ fontFamily: 'Amiri, serif', fontSize: 18, color: 'var(--gold)' }}>جاري تحميل اللوحة...</div>
      </div>
    </div>
  )
}

// helper — sign out without importing full supabase
async function supabaseSignOut() {
  const { createBrowserClient } = await import('@supabase/ssr')
  const sb = createBrowserClient(
    'https://tfcaedotumvtcenapbrm.supabase.co',
    'sb_publishable_10Bts7wS5ViCpOx_ealwBQ_K89_-4iz'
  )
  await sb.auth.signOut()
}
