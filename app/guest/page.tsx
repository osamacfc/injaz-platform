'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { evidenceHelpers } from '@/lib/supabase'
import {
  SCHOOL, TERM, SECTIONS, KPI_STANDARDS, ROLE_LABELS, ROLE_COLORS,
  calcProgress, pColor, N_SEC, typeEmoji,
  type Evidence,
} from '@/lib/constants'

// نجيب قائمة المعلمين من Supabase مباشرة
import { profileHelpers } from '@/lib/supabase'
import type { Profile } from '@/lib/constants'

export default function GuestPage() {
  const [profiles,    setProfiles]    = useState<Profile[]>([])
  const [evs,         setEvs]         = useState<Evidence[]>([])
  const [selTeacher,  setSelTeacher]  = useState<Profile | null>(null)
  const [search,      setSearch]      = useState('')
  const [loading,     setLoading]     = useState(true)
  const router = useRouter()

  useEffect(() => {
    Promise.all([
      profileHelpers.getAllProfiles(),
      evidenceHelpers.getActive(),
    ]).then(([profs, evsList]) => {
      setProfiles(profs as Profile[])
      setEvs((evsList as Evidence[]).filter(e => e.active))
      setLoading(false)
    })
  }, [])

  const stats = useMemo(() => ({
    totalEvs:   evs.length,
    withEvs:    profiles.filter(p => evs.some(e => e.tid === p.id)).length,
    avgProg:    profiles.length
      ? Math.round(profiles.reduce((s, p) => s + calcProgress(evs, p.id), 0) / profiles.length)
      : 0,
    kpiCount:   new Set(evs.flatMap(e => e.kpis ?? [])).size,
    topTeacher: [...profiles].sort((a, b) => calcProgress(evs, b.id) - calcProgress(evs, a.id))[0],
  }), [evs, profiles])

  const filtered = useMemo(() =>
    profiles.filter(p =>
      !search || p.full_name?.includes(search) || ROLE_LABELS[p.role]?.includes(search)
    ), [profiles, search])

  if (loading) return <LoadingScreen />

  // ── Teacher Detail View ──
  if (selTeacher) {
    const tEvs    = evs.filter(e => e.tid === selTeacher.id)
    const prog    = calcProgress(evs, selTeacher.id)
    const grouped = SECTIONS.map(s => ({ ...s, sevs: tEvs.filter(e => e.sid === s.id) })).filter(s => s.sevs.length > 0)
    const col     = ROLE_COLORS[selTeacher.role] ?? '#64748b'

    return (
      <div className="min-h-screen">
        <div className="mesh-bg" />
        <nav className="glass sticky top-0 z-50 flex items-center justify-between px-5 h-16 no-print"
          style={{ borderBottom: '1px solid rgba(201,168,76,.15)' }}>
          <div className="flex items-center gap-3">
            <button onClick={() => setSelTeacher(null)} className="btn btn-ghost" style={{ padding: '6px 12px', fontSize: 12, fontFamily: 'Cairo, sans-serif' }}>
              ← رجوع
            </button>
            <span style={{ fontFamily: 'Amiri, serif', fontSize: 15, color: 'var(--gold)', fontWeight: 700 }}>{selTeacher.full_name}</span>
          </div>
          <div className="flex gap-2 items-center">
            <span className="badge text-xs" style={{ background: 'rgba(16,185,129,.08)', color: 'var(--em)', border: '1px solid rgba(16,185,129,.2)' }}>👁 زائر</span>
            <button onClick={() => router.push('/auth')} className="btn btn-gold" style={{ padding: '7px 14px', fontSize: 12, fontFamily: 'Cairo, sans-serif' }}>
              🔐 تسجيل دخول
            </button>
          </div>
        </nav>

        <div className="relative z-10 max-w-4xl mx-auto px-5 py-6">
          {/* Cover */}
          <div className="glass2 animate-fade-up rounded-3xl overflow-hidden mb-6">
            <div className="h-1.5" style={{ background: `linear-gradient(90deg,${col},var(--gold),var(--gold-l))` }} />
            <div className="p-6">
              <div className="flex gap-5 items-start flex-wrap">
                <div className="w-16 h-16 rounded-full flex items-center justify-center text-white font-bold text-lg flex-shrink-0"
                  style={{ background: `linear-gradient(135deg,${col},${col}88)`, boxShadow: `0 8px 30px ${col}55` }}>
                  {selTeacher.av}
                </div>
                <div className="flex-1">
                  <h1 style={{ fontFamily: 'Amiri, serif', fontSize: 22, color: 'var(--gold)', fontWeight: 700, marginBottom: 4 }}>
                    {selTeacher.full_name}
                  </h1>
                  <p style={{ fontSize: 13, color: 'var(--tx2)', marginBottom: 12 }}>
                    {ROLE_LABELS[selTeacher.role]} • {SCHOOL} • {TERM}
                  </p>
                  <div className="flex gap-3 flex-wrap">
                    {[
                      { v: tEvs.length, l: 'شاهد', c: 'var(--gold)' },
                      { v: `${prog}%`, l: 'الإنجاز', c: pColor(prog) },
                      { v: grouped.length, l: `قسم/${N_SEC}`, c: 'var(--em)' },
                      { v: new Set(tEvs.flatMap(e => e.kpis ?? [])).size, l: 'معيار', c: 'var(--pu)' },
                    ].map((s, i) => (
                      <div key={i} className="text-center px-3 py-2 rounded-xl" style={{ background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.08)' }}>
                        <div style={{ fontSize: 18, fontWeight: 900, color: s.c }}>{s.v}</div>
                        <div style={{ fontSize: 10, color: 'var(--tx3)', marginTop: 2 }}>{s.l}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              {/* Progress */}
              <div className="mt-4 pt-4" style={{ borderTop: '1px solid rgba(255,255,255,.06)' }}>
                <div className="flex justify-between text-xs mb-1.5" style={{ color: 'var(--tx3)' }}>
                  <span>تقدم الملف</span>
                  <span style={{ color: pColor(prog), fontWeight: 800 }}>{prog}%</span>
                </div>
                <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,.08)' }}>
                  <div className="h-full rounded-full transition-all duration-1000"
                    style={{ width: `${prog}%`, background: `linear-gradient(90deg,${pColor(prog)},${pColor(prog)}88)` }} />
                </div>
              </div>
            </div>
          </div>

          {/* Sections */}
          {grouped.map(sec => (
            <div key={sec.id} className="glass animate-fade-up rounded-2xl overflow-hidden mb-4"
              style={{ border: `1px solid ${sec.color}20` }}>
              <div className="h-0.5" style={{ background: `linear-gradient(90deg,${sec.color},${sec.color}40)` }} />
              <div className="px-5 py-3 flex items-center gap-3" style={{ background: `${sec.color}08`, borderBottom: `1px solid ${sec.color}15` }}>
                <span className="text-xl">{sec.icon}</span>
                <span style={{ fontFamily: 'Amiri, serif', fontSize: 15, color: sec.color, fontWeight: 700 }}>{sec.title}</span>
                <span className="badge" style={{ background: `${sec.color}18`, color: sec.color, border: 'none', fontSize: 10 }}>{sec.sevs.length} شاهد</span>
              </div>
              <div className="p-4 space-y-3">
                {sec.sevs.map(ev => (
                  <div key={ev.id} className="p-3 rounded-xl" style={{ background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.06)' }}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-base">{typeEmoji(ev.type)}</span>
                      <span className="font-bold text-sm" style={{ color: 'var(--tx)' }}>{ev.title}</span>
                    </div>
                    <div className="flex gap-3 text-xs mb-2" style={{ color: 'var(--tx3)' }}>
                      {ev.date && <span>📅 {ev.date}</span>}
                      {(ev.kpis?.length ?? 0) > 0 && <span style={{ color: 'var(--pu)' }}>🎯 {ev.kpis?.length} معيار</span>}
                      {ev.impact && <span style={{ color: 'var(--em)' }}>📈 نمو {ev.impact.post - ev.impact.pre}%</span>}
                    </div>
                    {ev.desc && (
                      <div className="text-xs leading-7" style={{ color: 'var(--tx2)' }}
                        dangerouslySetInnerHTML={{ __html: ev.desc }} />
                    )}
                    {ev.url && ev.type === 'link' && (
                      <a href={ev.url} target="_blank" rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs mt-2" style={{ color: 'var(--info)' }}>
                        🔗 فتح الرابط
                      </a>
                    )}
                    {(ev.file_url || ev.url) && ev.type === 'image' && (
                      <img src={ev.file_url || ev.url} alt={ev.title}
                        className="mt-2 rounded-lg max-h-48 object-cover w-full" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  // ── Teachers List ──
  return (
    <div className="min-h-screen">
      <div className="mesh-bg" />
      <nav className="glass sticky top-0 z-50 flex items-center justify-between px-5 h-16 no-print"
        style={{ borderBottom: '1px solid rgba(201,168,76,.15)' }}>
        <span style={{ fontFamily: 'Amiri, serif', fontSize: 17, color: 'var(--gold)', fontWeight: 700 }}>منصة إنجاز</span>
        <div className="flex gap-2 items-center">
          <span className="badge text-xs" style={{ background: 'rgba(16,185,129,.08)', color: 'var(--em)', border: '1px solid rgba(16,185,129,.2)' }}>👁 زائر</span>
          <button onClick={() => router.push('/auth')} className="btn btn-gold" style={{ padding: '7px 14px', fontSize: 12, fontFamily: 'Cairo, sans-serif' }}>
            🔐 تسجيل دخول
          </button>
        </div>
      </nav>

      <div className="relative z-10 max-w-5xl mx-auto px-5 py-6">
        {/* School Header */}
        <div className="glass2 animate-fade-up rounded-3xl overflow-hidden mb-6 text-center">
          <div className="h-1.5" style={{ background: 'linear-gradient(90deg,var(--gold-d),var(--gold),var(--gold-l),var(--gold),var(--gold-d))' }} />
          <div className="py-7 px-5">
            <div className="text-5xl mb-3">🏫</div>
            <h1 style={{ fontFamily: 'Amiri, serif', fontSize: 26, color: 'var(--gold)', fontWeight: 700, marginBottom: 4 }}>
              {SCHOOL}
            </h1>
            <p style={{ color: 'var(--tx2)', fontSize: 14, marginBottom: 2 }}>{TERM}</p>
            <p style={{ color: 'var(--tx3)', fontSize: 12 }}>منصة ملفات الإنجاز الوظيفي الرقمية</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 mb-6 md:grid-cols-4">
          {[
            { v: profiles.length,      l: 'المعلمون',      ic: '👨‍🏫', c: 'var(--gold)' },
            { v: stats.withEvs,        l: 'نشطون',          ic: '✅',   c: 'var(--em)' },
            { v: evs.length,           l: 'شاهد موثق',      ic: '📂',   c: 'var(--info)' },
            { v: `${stats.avgProg}%`,  l: 'متوسط الإنجاز',  ic: '📊',   c: pColor(stats.avgProg) },
          ].map((s, i) => (
            <div key={i} className="glass animate-fade-up rounded-2xl p-4 text-center"
              style={{ animationDelay: `${i * .06}s`, border: `1px solid ${s.c}20` }}>
              <div className="text-2xl mb-1">{s.ic}</div>
              <div style={{ fontSize: 22, fontWeight: 900, color: s.c }}>{s.v}</div>
              <div style={{ fontSize: 11, color: 'var(--tx3)', marginTop: 3 }}>{s.l}</div>
            </div>
          ))}
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3 mb-5">
          <div className="flex-1 h-px" style={{ background: 'linear-gradient(to left,transparent,rgba(201,168,76,.3))' }} />
          <span style={{ fontFamily: 'Amiri, serif', fontSize: 16, color: 'var(--gold)', whiteSpace: 'nowrap' }}>ملفات المعلمين</span>
          <div className="flex-1 h-px" style={{ background: 'linear-gradient(to right,transparent,rgba(201,168,76,.3))' }} />
        </div>

        {/* Search */}
        <div className="relative max-w-sm mx-auto mb-6">
          <input className="inp text-center" placeholder="ابحث باسم المعلم..." value={search}
            onChange={e => setSearch(e.target.value)} style={{ paddingRight: 44 }} />
          <span className="absolute top-1/2 -translate-y-1/2" style={{ right: 14, color: 'var(--tx3)', pointerEvents: 'none' }}>🔍</span>
        </div>

        {/* Grid */}
        <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(240px,1fr))' }}>
          {filtered.map((p, i) => {
            const prog = calcProgress(evs, p.id)
            const tEvs = evs.filter(e => e.tid === p.id)
            const col  = ROLE_COLORS[p.role] ?? '#64748b'
            return (
              <div key={p.id} className="glass animate-fade-up rounded-2xl p-5 cursor-pointer transition-all hover:-translate-y-1"
                style={{ animationDelay: `${i * .03}s`, border: '1px solid rgba(255,255,255,.05)' }}
                onClick={() => setSelTeacher(p)}>
                <div className="flex items-center gap-3 mb-3">
                  <div className="relative">
                    <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-sm"
                      style={{ background: `linear-gradient(135deg,${col},${col}88)`, boxShadow: `0 6px 20px ${col}44` }}>
                      {p.av}
                    </div>
                    {prog >= 80 && <span className="absolute -top-1.5 -left-1.5 text-xs animate-seal-glow">🥇</span>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-black text-sm truncate">{p.full_name}</div>
                    <span className="badge" style={{ background: `${col}18`, color: col, border: `1px solid ${col}30`, fontSize: 10 }}>
                      {ROLE_LABELS[p.role]}
                    </span>
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 900, color: pColor(prog) }}>{prog}%</div>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden mb-3" style={{ background: 'rgba(255,255,255,.06)' }}>
                  <div className="h-full rounded-full" style={{ width: `${prog}%`, background: `linear-gradient(90deg,${pColor(prog)},${pColor(prog)}88)` }} />
                </div>
                <div className="flex justify-between text-xs" style={{ color: 'var(--tx3)' }}>
                  <span>📂 {tEvs.length}</span>
                  <span>{new Set(tEvs.map(e => e.sid)).size}/{N_SEC} قسم</span>
                </div>
              </div>
            )
          })}
        </div>

        <div className="text-center mt-8 text-xs" style={{ color: 'var(--tx3)' }}>
          منصة إنجاز تحفيظ عيبان • {TERM} •{' '}
          <button onClick={() => router.push('/auth')} className="bg-transparent border-none cursor-pointer font-bold"
            style={{ color: 'var(--gold)', fontFamily: 'Cairo, sans-serif', fontSize: 12 }}>
            سجّل دخولك
          </button>
        </div>
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
        <div style={{ fontFamily: 'Amiri, serif', color: 'var(--gold)', fontSize: 18 }}>جاري تحميل الملفات...</div>
      </div>
    </div>
  )
}
