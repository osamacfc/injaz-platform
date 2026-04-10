'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase, profileHelpers, evidenceHelpers, sealHelpers } from '@/lib/supabase'
import {
  SCHOOL, TERM, SECTIONS, KPI_STANDARDS, ROLE_LABELS, ROLE_COLORS,
  SEALS_CATALOG, calcProgress, pColor, N_SEC, typeEmoji, isPrivileged,
  type Profile, type Evidence,
} from '@/lib/constants'

// ── رمز UUID ──
const uid = () => crypto.randomUUID()

// ── هل للمستخدم صلاحية التقييم؟ ──
const canEvaluate = (p: Profile | null) =>
  p && (['admin','deputy','counselor'].includes(p.role) || p.is_developer || p.is_evaluator)

const canGiveSeals = (p: Profile | null) =>
  p && (['admin','deputy'].includes(p.role) || p.is_developer)

export default function TeacherPage() {
  const router   = useRouter()
  const { id }   = useParams<{ id: string }>()

  const [viewer,    setViewer]    = useState<Profile | null>(null)
  const [teacher,   setTeacher]   = useState<Profile | null>(null)
  const [tProfile,  setTProfile]  = useState<any>(null)
  const [evs,       setEvs]       = useState<Evidence[]>([])
  const [loading,   setLoading]   = useState(true)
  const [activeTab, setActiveTab] = useState<number>(1)
  const [showAdd,   setShowAdd]   = useState(false)
  const [saving,    setSaving]    = useState(false)

  // فورم الشاهد الجديد
  const [form, setForm] = useState({
    title: '', desc: '', type: 'doc' as 'doc'|'link'|'image',
    date: '', url: '', kpis: [] as string[], sid: 1,
  })

  // ── تحميل البيانات ──
  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session) {
        const v = await profileHelpers.getProfile(session.user.id)
        setViewer(v as Profile)
      }

      const [t, tp, evList] = await Promise.all([
        profileHelpers.getProfile(id),
        profileHelpers.getTeacherProfile(id),
        evidenceHelpers.getByTeacher(id),
      ])

      if (!t) { router.replace('/guest'); return }
      setTeacher(t as Profile)
      setTProfile(tp)
      setEvs(evList as Evidence[])
      setLoading(false)
    })
  }, [id, router])

  // ── حفظ شاهد جديد ──
  const saveEvidence = useCallback(async () => {
    if (!form.title.trim() || !viewer) return
    setSaving(true)
    const ev = {
      id: uid(), tid: id, sid: form.sid,
      title: form.title, desc: form.desc,
      type: form.type, date: form.date,
      url: form.url, kpis: form.kpis,
      active: true, ts: Date.now(),
    }
    const saved = await evidenceHelpers.upsert(ev)
    setEvs(prev => [saved, ...prev])
    setForm({ title:'', desc:'', type:'doc', date:'', url:'', kpis:[], sid: activeTab })
    setShowAdd(false)
    setSaving(false)
  }, [form, viewer, id, activeTab])

  // ── حذف شاهد ──
  const deleteEv = useCallback(async (evId: string) => {
    if (!confirm('حذف هذا الشاهد؟')) return
    await evidenceHelpers.delete(evId)
    setEvs(prev => prev.filter(e => e.id !== evId))
  }, [])

  // ── منح ختم ──
  const toggleSeal = useCallback(async (sealId: string) => {
    if (!viewer || !canGiveSeals(viewer)) return
    const current = tProfile?.seals ?? []
    const has = current.includes(sealId)
    const newSeals = has ? current.filter((s: string) => s !== sealId) : [...current, sealId]
    setTProfile((p: any) => ({ ...p, seals: newSeals }))
    if (has) {
      await sealHelpers.revoke(id, sealId)
    } else {
      await sealHelpers.award(id, sealId, viewer.id)
    }
    await supabase.from('teacher_profiles').update({ seals: newSeals }).eq('uid', id)
  }, [viewer, tProfile, id])

  const prog   = useMemo(() => calcProgress(evs, id), [evs, id])
  const tabEvs = useMemo(() => evs.filter(e => e.sid === activeTab), [evs, activeTab])
  const col    = ROLE_COLORS[teacher?.role ?? ''] ?? '#64748b'

  const isOwner   = viewer?.id === id
  const canAdd    = isOwner || canEvaluate(viewer)

  if (loading) return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#0a0f1e' }}>
      <div style={{ textAlign:'center' }}>
        <div style={{ fontSize:48, marginBottom:12 }}>📚</div>
        <div style={{ fontFamily:'Amiri,serif', color:'#c9a84c', fontSize:18 }}>جاري تحميل الملف...</div>
      </div>
    </div>
  )

  return (
    <div style={{ minHeight:'100vh', background:'#0a0f1e', color:'#eef4ff', fontFamily:'Cairo,sans-serif', direction:'rtl' }}>

      {/* ── Navbar ── */}
      <nav style={{ background:'rgba(13,21,38,.95)', borderBottom:'1px solid rgba(201,168,76,.15)', padding:'0 20px', height:56, display:'flex', alignItems:'center', justifyContent:'space-between', position:'sticky', top:0, zIndex:100, backdropFilter:'blur(20px)' }}>
        <button onClick={() => router.back()}
          style={{ background:'rgba(255,255,255,.07)', border:'1px solid rgba(255,255,255,.1)', color:'#8aaccc', padding:'6px 14px', borderRadius:8, cursor:'pointer', fontFamily:'Cairo,sans-serif', fontSize:12 }}>
          ← رجوع
        </button>
        <span style={{ fontFamily:'Amiri,serif', fontSize:16, color:'#c9a84c', fontWeight:700 }}>
          {teacher?.full_name}
        </span>
        <div style={{ display:'flex', gap:8 }}>
          {!viewer && (
            <button onClick={() => router.push('/auth')}
              style={{ background:'linear-gradient(135deg,#c9a84c,#e8c96d)', color:'#0a0f1e', padding:'6px 14px', borderRadius:8, cursor:'pointer', fontFamily:'Cairo,sans-serif', fontSize:12, fontWeight:700, border:'none' }}>
              🔐 دخول
            </button>
          )}
        </div>
      </nav>

      <div style={{ maxWidth:900, margin:'0 auto', padding:'20px 16px' }}>

        {/* ── Cover Card ── */}
        <div style={{ background:'rgba(16,26,50,.85)', borderRadius:20, overflow:'hidden', marginBottom:20, border:'1px solid rgba(255,255,255,.06)' }}>
          <div style={{ height:4, background:`linear-gradient(90deg,${col},#c9a84c,#e8c96d)` }} />
          <div style={{ padding:24 }}>
            <div style={{ display:'flex', gap:20, alignItems:'flex-start', flexWrap:'wrap' }}>

              {/* Avatar */}
              <div style={{ width:72, height:72, borderRadius:'50%', background:`linear-gradient(135deg,${col},${col}88)`, display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontWeight:900, fontSize:22, flexShrink:0, boxShadow:`0 8px 30px ${col}55` }}>
                {teacher?.av}
              </div>

              <div style={{ flex:1 }}>
                <h1 style={{ fontFamily:'Amiri,serif', fontSize:22, color:'#c9a84c', fontWeight:700, margin:'0 0 4px' }}>
                  {teacher?.full_name}
                </h1>
                <p style={{ color:'#8aaccc', fontSize:13, margin:'0 0 16px' }}>
                  {ROLE_LABELS[teacher?.role ?? '']} • {SCHOOL} • {TERM}
                </p>

                {/* Stats */}
                <div style={{ display:'flex', gap:12, flexWrap:'wrap' }}>
                  {[
                    { v: evs.length,                                           l:'شاهد',       c:'#c9a84c' },
                    { v: `${prog}%`,                                           l:'الإنجاز',    c:pColor(prog) },
                    { v: new Set(evs.map(e=>e.sid)).size + `/${N_SEC}`,       l:'قسم',        c:'#10b981' },
                    { v: new Set(evs.flatMap(e=>e.kpis??[])).size,            l:'معيار',      c:'#8b5cf6' },
                  ].map((s,i) => (
                    <div key={i} style={{ textAlign:'center', background:'rgba(255,255,255,.05)', border:'1px solid rgba(255,255,255,.08)', borderRadius:12, padding:'10px 16px' }}>
                      <div style={{ fontSize:20, fontWeight:900, color:s.c }}>{s.v}</div>
                      <div style={{ fontSize:10, color:'#4a6285', marginTop:2 }}>{s.l}</div>
                    </div>
                  ))}
                </div>

                {/* Progress bar */}
                <div style={{ marginTop:16 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', fontSize:11, color:'#4a6285', marginBottom:6 }}>
                    <span>تقدم الملف</span>
                    <span style={{ color:pColor(prog), fontWeight:800 }}>{prog}%</span>
                  </div>
                  <div style={{ height:7, background:'rgba(255,255,255,.07)', borderRadius:4, overflow:'hidden' }}>
                    <div style={{ height:'100%', borderRadius:4, background:`linear-gradient(90deg,${pColor(prog)},${pColor(prog)}88)`, width:`${prog}%`, transition:'width 1s ease' }} />
                  </div>
                </div>
              </div>
            </div>

            {/* Seals */}
            {(tProfile?.seals?.length > 0 || canGiveSeals(viewer)) && (
              <div style={{ marginTop:20, paddingTop:16, borderTop:'1px solid rgba(255,255,255,.06)' }}>
                <div style={{ fontSize:12, color:'#4a6285', marginBottom:8 }}>الأختام الذهبية</div>
                <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                  {(SEALS_CATALOG ?? []).map((seal: any) => {
                    const has = tProfile?.seals?.includes(seal.id)
                    return (
                      <button key={seal.id}
                        onClick={() => canGiveSeals(viewer) && toggleSeal(seal.id)}
                        style={{ background: has ? 'rgba(201,168,76,.15)' : 'rgba(255,255,255,.04)', border: has ? '1px solid rgba(201,168,76,.4)' : '1px solid rgba(255,255,255,.08)', borderRadius:20, padding:'4px 12px', fontSize:12, color: has ? '#c9a84c' : '#4a6285', cursor: canGiveSeals(viewer) ? 'pointer' : 'default', display:'flex', alignItems:'center', gap:4 }}>
                        {seal.icon} {seal.label}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Section Tabs ── */}
        <div style={{ display:'flex', gap:6, overflowX:'auto', paddingBottom:8, marginBottom:16, scrollbarWidth:'none' }}>
          {SECTIONS.map(sec => {
            const cnt = evs.filter(e => e.sid === sec.id).length
            const active = activeTab === sec.id
            return (
              <button key={sec.id} onClick={() => setActiveTab(sec.id)}
                style={{ flexShrink:0, background: active ? `${sec.color}18` : 'rgba(255,255,255,.04)', border: active ? `1.5px solid ${sec.color}50` : '1px solid rgba(255,255,255,.06)', borderRadius:20, padding:'6px 14px', cursor:'pointer', fontFamily:'Cairo,sans-serif', fontSize:12, color: active ? sec.color : '#4a6285', display:'flex', alignItems:'center', gap:6, transition:'all .2s' }}>
                <span>{sec.icon}</span>
                <span style={{ whiteSpace:'nowrap' }}>{sec.title}</span>
                {cnt > 0 && <span style={{ background: active ? sec.color : '#1e3352', color: active ? '#fff' : '#4a6285', borderRadius:10, padding:'0 6px', fontSize:10, fontWeight:700 }}>{cnt}</span>}
              </button>
            )
          })}
        </div>

        {/* ── Section Content ── */}
        {(() => {
          const sec = SECTIONS.find(s => s.id === activeTab)!
          return (
            <div style={{ background:'rgba(16,26,50,.85)', borderRadius:20, overflow:'hidden', border:`1px solid ${sec.color}20` }}>
              <div style={{ height:3, background:`linear-gradient(90deg,${sec.color},${sec.color}40)` }} />

              {/* Header */}
              <div style={{ padding:'16px 20px', display:'flex', alignItems:'center', justifyContent:'space-between', borderBottom:`1px solid ${sec.color}15`, background:`${sec.color}06` }}>
                <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                  <span style={{ fontSize:22 }}>{sec.icon}</span>
                  <span style={{ fontFamily:'Amiri,serif', fontSize:16, color:sec.color, fontWeight:700 }}>{sec.title}</span>
                  <span style={{ fontSize:11, color:sec.color, background:`${sec.color}18`, padding:'2px 8px', borderRadius:10 }}>{tabEvs.length} شاهد</span>
                </div>
                {canAdd && (
                  <button onClick={() => { setForm(f => ({...f, sid: activeTab})); setShowAdd(true) }}
                    style={{ background:`linear-gradient(135deg,${sec.color},${sec.color}88)`, border:'none', borderRadius:10, padding:'7px 14px', color:'#fff', cursor:'pointer', fontFamily:'Cairo,sans-serif', fontSize:12, fontWeight:700 }}>
                    + إضافة شاهد
                  </button>
                )}
              </div>

              {/* Evidences */}
              <div style={{ padding:16 }}>
                {tabEvs.length === 0 ? (
                  <div style={{ textAlign:'center', padding:'40px 0', color:'#4a6285' }}>
                    <div style={{ fontSize:40, marginBottom:12 }}>📂</div>
                    <p style={{ fontSize:14 }}>لا توجد شواهد في هذا القسم بعد</p>
                    {canAdd && <p style={{ fontSize:12, marginTop:4 }}>اضغط "+ إضافة شاهد" للبدء</p>}
                  </div>
                ) : (
                  <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                    {tabEvs.map(ev => (
                      <div key={ev.id} style={{ background:'rgba(8,14,30,.6)', border:'1px solid rgba(255,255,255,.06)', borderRadius:14, padding:16 }}>
                        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:12 }}>
                          <div style={{ flex:1 }}>
                            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
                              <span style={{ fontSize:18 }}>{typeEmoji(ev.type)}</span>
                              <span style={{ fontWeight:700, fontSize:14 }}>{ev.title}</span>
                            </div>
                            <div style={{ display:'flex', gap:12, fontSize:11, color:'#4a6285', marginBottom:8, flexWrap:'wrap' }}>
                              {ev.date && <span>📅 {ev.date}</span>}
                              {(ev.kpis?.length ?? 0) > 0 && <span style={{ color:'#8b5cf6' }}>🎯 {ev.kpis?.length} معيار</span>}
                              {ev.sup_rating > 0 && <span style={{ color:'#f59e0b' }}>{'⭐'.repeat(ev.sup_rating)}</span>}
                              {ev.is_verified && <span style={{ color:'#10b981' }}>✅ معتمد</span>}
                            </div>
                            {ev.desc && <div style={{ fontSize:12, color:'#8aaccc', lineHeight:1.8 }} dangerouslySetInnerHTML={{ __html: ev.desc }} />}
                            {ev.url && ev.type === 'link' && (
                              <a href={ev.url} target="_blank" rel="noreferrer"
                                style={{ color:'#3b82f6', fontSize:12, display:'inline-flex', alignItems:'center', gap:4, marginTop:8 }}>
                                🔗 فتح الرابط
                              </a>
                            )}
                            {ev.file_url && ev.type === 'image' && (
                              <img src={ev.file_url} alt={ev.title}
                                style={{ maxHeight:200, borderRadius:8, objectFit:'cover', width:'100%', marginTop:8 }} />
                            )}
                            {ev.note && (
                              <div style={{ marginTop:10, background:'rgba(201,168,76,.08)', border:'1px solid rgba(201,168,76,.2)', borderRadius:8, padding:'8px 12px', fontSize:12, color:'#c9a84c' }}>
                                💬 {ev.note}
                              </div>
                            )}
                          </div>
                          {(isOwner || canEvaluate(viewer)) && (
                            <button onClick={() => deleteEv(ev.id)}
                              style={{ background:'rgba(239,68,68,.1)', border:'1px solid rgba(239,68,68,.2)', color:'#ef4444', borderRadius:8, padding:'4px 10px', cursor:'pointer', fontSize:12, flexShrink:0 }}>
                              حذف
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )
        })()}

        {/* ── KPI Coverage ── */}
        <div style={{ background:'rgba(16,26,50,.85)', borderRadius:20, padding:20, marginTop:16, border:'1px solid rgba(255,255,255,.06)' }}>
          <h3 style={{ fontFamily:'Amiri,serif', color:'#c9a84c', fontSize:16, margin:'0 0 16px' }}>تغطية المعايير المهنية</h3>
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {KPI_STANDARDS.slice(0,10).map(k => {
              const covered = evs.some(e => e.kpis?.includes(k.id))
              return (
                <div key={k.id} style={{ display:'flex', alignItems:'center', gap:12 }}>
                  <span style={{ fontSize:16 }}>{covered ? '✅' : '⬜'}</span>
                  <span style={{ fontSize:12, color: covered ? '#10b981' : '#4a6285', flex:1 }}>{k.code} — {k.name}</span>
                  <span style={{ fontSize:10, color:'#4a6285' }}>{k.domainName}</span>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* ── Modal إضافة شاهد ── */}
      {showAdd && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.7)', zIndex:200, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}
          onClick={e => e.target === e.currentTarget && setShowAdd(false)}>
          <div style={{ background:'#0d1526', border:'1px solid rgba(201,168,76,.2)', borderRadius:20, padding:24, width:'100%', maxWidth:520, maxHeight:'90vh', overflowY:'auto' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
              <h3 style={{ fontFamily:'Amiri,serif', color:'#c9a84c', fontSize:18, margin:0 }}>إضافة شاهد جديد</h3>
              <button onClick={() => setShowAdd(false)}
                style={{ background:'rgba(255,255,255,.08)', border:'none', color:'#8aaccc', width:32, height:32, borderRadius:8, cursor:'pointer', fontSize:16 }}>✕</button>
            </div>

            {/* القسم */}
            <div style={{ marginBottom:14 }}>
              <label style={{ fontSize:12, color:'#4a6285', display:'block', marginBottom:6 }}>القسم</label>
              <select value={form.sid} onChange={e => setForm(f => ({...f, sid: +e.target.value}))}
                style={{ width:'100%', padding:'10px 12px', background:'rgba(8,14,30,.8)', border:'1.5px solid #1e3352', borderRadius:10, color:'#eef4ff', fontFamily:'Cairo,sans-serif', fontSize:13, outline:'none' }}>
                {SECTIONS.map(s => <option key={s.id} value={s.id}>{s.icon} {s.title}</option>)}
              </select>
            </div>

            {/* العنوان */}
            <div style={{ marginBottom:14 }}>
              <label style={{ fontSize:12, color:'#4a6285', display:'block', marginBottom:6 }}>عنوان الشاهد *</label>
              <input value={form.title} onChange={e => setForm(f => ({...f, title: e.target.value}))}
                placeholder="مثال: نشاط صفي إبداعي"
                style={{ width:'100%', padding:'10px 12px', background:'rgba(8,14,30,.8)', border:'1.5px solid #1e3352', borderRadius:10, color:'#eef4ff', fontFamily:'Cairo,sans-serif', fontSize:13, outline:'none', boxSizing:'border-box' }} />
            </div>

            {/* النوع */}
            <div style={{ marginBottom:14 }}>
              <label style={{ fontSize:12, color:'#4a6285', display:'block', marginBottom:6 }}>نوع الشاهد</label>
              <div style={{ display:'flex', gap:8 }}>
                {(['doc','link','image'] as const).map(t => (
                  <button key={t} onClick={() => setForm(f => ({...f, type: t}))}
                    style={{ flex:1, padding:'8px 0', background: form.type === t ? 'rgba(201,168,76,.15)' : 'rgba(255,255,255,.04)', border: form.type === t ? '1.5px solid rgba(201,168,76,.4)' : '1px solid rgba(255,255,255,.08)', borderRadius:10, color: form.type === t ? '#c9a84c' : '#4a6285', cursor:'pointer', fontFamily:'Cairo,sans-serif', fontSize:12 }}>
                    {typeEmoji(t)} {t === 'doc' ? 'وثيقة' : t === 'link' ? 'رابط' : 'صورة'}
                  </button>
                ))}
              </div>
            </div>

            {/* الرابط */}
            {form.type === 'link' && (
              <div style={{ marginBottom:14 }}>
                <label style={{ fontSize:12, color:'#4a6285', display:'block', marginBottom:6 }}>الرابط</label>
                <input value={form.url} onChange={e => setForm(f => ({...f, url: e.target.value}))}
                  placeholder="https://..."
                  style={{ width:'100%', padding:'10px 12px', background:'rgba(8,14,30,.8)', border:'1.5px solid #1e3352', borderRadius:10, color:'#eef4ff', fontFamily:'Cairo,sans-serif', fontSize:13, outline:'none', boxSizing:'border-box' }} />
              </div>
            )}

            {/* التاريخ */}
            <div style={{ marginBottom:14 }}>
              <label style={{ fontSize:12, color:'#4a6285', display:'block', marginBottom:6 }}>التاريخ (هجري)</label>
              <input value={form.date} onChange={e => setForm(f => ({...f, date: e.target.value}))}
                placeholder="مثال: 15/8/1447"
                style={{ width:'100%', padding:'10px 12px', background:'rgba(8,14,30,.8)', border:'1.5px solid #1e3352', borderRadius:10, color:'#eef4ff', fontFamily:'Cairo,sans-serif', fontSize:13, outline:'none', boxSizing:'border-box' }} />
            </div>

            {/* الوصف */}
            <div style={{ marginBottom:14 }}>
              <label style={{ fontSize:12, color:'#4a6285', display:'block', marginBottom:6 }}>الوصف</label>
              <textarea value={form.desc} onChange={e => setForm(f => ({...f, desc: e.target.value}))}
                placeholder="وصف مختصر للشاهد..."
                rows={3}
                style={{ width:'100%', padding:'10px 12px', background:'rgba(8,14,30,.8)', border:'1.5px solid #1e3352', borderRadius:10, color:'#eef4ff', fontFamily:'Cairo,sans-serif', fontSize:13, outline:'none', resize:'vertical', boxSizing:'border-box' }} />
            </div>

            {/* المعايير */}
            <div style={{ marginBottom:20 }}>
              <label style={{ fontSize:12, color:'#4a6285', display:'block', marginBottom:8 }}>المعايير المهنية المرتبطة</label>
              <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                {KPI_STANDARDS.slice(0,10).map(k => {
                  const sel = form.kpis.includes(k.id)
                  return (
                    <button key={k.id}
                      onClick={() => setForm(f => ({ ...f, kpis: sel ? f.kpis.filter(x => x !== k.id) : [...f.kpis, k.id] }))}
                      style={{ background: sel ? 'rgba(139,92,246,.2)' : 'rgba(255,255,255,.04)', border: sel ? '1px solid rgba(139,92,246,.5)' : '1px solid rgba(255,255,255,.08)', borderRadius:20, padding:'4px 10px', fontSize:11, color: sel ? '#8b5cf6' : '#4a6285', cursor:'pointer' }}>
                      {k.code}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* أزرار */}
            <div style={{ display:'flex', gap:10 }}>
              <button onClick={saveEvidence} disabled={saving || !form.title.trim()}
                style={{ flex:1, background:'linear-gradient(135deg,#c9a84c,#e8c96d)', border:'none', borderRadius:12, padding:'12px 0', color:'#0a0f1e', fontFamily:'Cairo,sans-serif', fontSize:14, fontWeight:800, cursor: saving ? 'wait' : 'pointer', opacity: !form.title.trim() ? .5 : 1 }}>
                {saving ? 'جاري الحفظ...' : '💾 حفظ الشاهد'}
              </button>
              <button onClick={() => setShowAdd(false)}
                style={{ padding:'12px 20px', background:'rgba(255,255,255,.06)', border:'1px solid rgba(255,255,255,.1)', borderRadius:12, color:'#8aaccc', fontFamily:'Cairo,sans-serif', fontSize:14, cursor:'pointer' }}>
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
