'use client'
import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { supabase, profileHelpers, evidenceHelpers } from '@/lib/supabase'
import { SCHOOL, TERM, SECTIONS, KPI_STANDARDS, ROLE_LABELS, ROLE_COLORS, SEALS_CATALOG, calcProgress, pColor, N_SEC, type Profile, type Evidence } from '@/lib/constants'

export default function DashboardPage() {
  const router = useRouter()
  const [viewer,   setViewer]   = useState<Profile|null>(null)
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [evs,      setEvs]      = useState<Evidence[]>([])
  const [search,   setSearch]   = useState('')
  const [filter,   setFilter]   = useState('all')
  const [loading,  setLoading]  = useState(true)
  const [view,     setView]     = useState<'grid'|'list'>('grid')

  useEffect(()=>{
    supabase.auth.getSession().then(async({data:{session}})=>{
      if(!session){router.replace('/auth');return}
      const profile=await profileHelpers.getProfile(session.user.id)
      if(!profile){router.replace('/auth');return}
      const canView=['admin','deputy'].includes(profile.role)||profile.is_developer
      if(!canView){router.replace(`/teacher/${session.user.id}`);return}
      setViewer(profile as Profile)
      const[profs,evList]=await Promise.all([profileHelpers.getAllProfiles(),evidenceHelpers.getAll()])
      setProfiles(profs as Profile[]); setEvs(evList as Evidence[]); setLoading(false)
    })
  },[router])

  // Real-time
  useEffect(()=>{
    const ch=supabase.channel('db-changes')
      .on('postgres_changes',{event:'*',schema:'public',table:'evidences'},payload=>{
        if(payload.eventType==='INSERT') setEvs(p=>[payload.new as Evidence,...p])
        else if(payload.eventType==='DELETE') setEvs(p=>p.filter(e=>e.id!==payload.old.id))
        else if(payload.eventType==='UPDATE') setEvs(p=>p.map(e=>e.id===payload.new.id?payload.new as Evidence:e))
      }).subscribe()
    return()=>{supabase.removeChannel(ch)}
  },[])

  const filtered=useMemo(()=>{
    let p=profiles
    if(filter!=='all') p=p.filter(x=>x.role===filter)
    if(search.trim()) p=p.filter(x=>(x.full_name||x.name||'').includes(search.trim()))
    return p
  },[profiles,filter,search])

  // Stats
  const totalEvs=evs.length
  const activeTeachers=profiles.filter(p=>evs.some(e=>e.tid===p.id)).length
  const avgProg=profiles.length>0?Math.round(profiles.reduce((a,p)=>a+calcProgress(evs,p.id),0)/profiles.length):0
  const coveredKpis=new Set(evs.flatMap(e=>e.kpis??[])).size

  if(loading) return(
    <div style={{minHeight:'100vh',background:'var(--navy)',display:'flex',alignItems:'center',justifyContent:'center'}}>
      <div className="mesh"/>
      <div style={{textAlign:'center'}}>
        <div style={{width:56,height:56,borderRadius:16,background:'linear-gradient(135deg,var(--gold-d),var(--gold))',display:'flex',alignItems:'center',justifyContent:'center',fontSize:24,margin:'0 auto 14px',animation:'spin 2s linear infinite'}}>📚</div>
        <div style={{fontFamily:'var(--serif)',color:'var(--gold)',fontSize:16}}>جاري تحميل البيانات...</div>
      </div>
    </div>
  )

  return(
    <div style={{minHeight:'100vh',background:'var(--navy)'}}>
      <div className="mesh"/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      {/* Nav */}
      <nav className="nav-bar">
        <div style={{display:'flex',alignItems:'center',gap:12}}>
          <div style={{width:36,height:36,borderRadius:10,background:'linear-gradient(135deg,var(--gold-d),var(--gold))',display:'flex',alignItems:'center',justifyContent:'center',fontSize:16}}>📚</div>
          <div>
            <div style={{fontFamily:'var(--serif)',color:'var(--gold)',fontSize:14,fontWeight:700,lineHeight:1}}>منصة إنجاز</div>
            <div style={{fontSize:10,color:'var(--tx3)',lineHeight:1,marginTop:2}}>{TERM}</div>
          </div>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:8}}>
          {/* Live indicator */}
          <div style={{display:'flex',alignItems:'center',gap:5,padding:'4px 10px',background:'rgba(16,185,129,.08)',border:'1px solid rgba(16,185,129,.2)',borderRadius:20,fontSize:11,color:'var(--em)'}}>
            <span style={{width:6,height:6,borderRadius:'50%',background:'var(--em)',display:'inline-block',animation:'pulse 2s infinite'}}/>
            مباشر
          </div>
          <div style={{display:'flex',alignItems:'center',gap:6,padding:'4px 12px',background:'var(--gold-pale)',border:'1px solid var(--bd-gold)',borderRadius:20,fontSize:12,color:'var(--gold)'}}>
            <span>{viewer?.av}</span>
            <span style={{fontWeight:700}}>{viewer?.full_name?.split(' ')[0]}</span>
          </div>
          <button onClick={()=>router.push(`/teacher/${viewer?.id}`)} className="btn-ghost" style={{padding:'7px 14px',fontSize:12}}>ملفي</button>
          <button onClick={()=>{supabase.auth.signOut().then(()=>router.push('/auth'))}} className="btn-ghost" style={{padding:'7px 14px',fontSize:12,color:'var(--danger)'}}>خروج</button>
        </div>
      </nav>

      <div className="page">

        {/* Header */}
        <div style={{marginBottom:28}} className="anim-up">
          <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',flexWrap:'wrap',gap:12}}>
            <div>
              <h1 style={{fontFamily:'var(--serif)',fontSize:26,color:'var(--gold)',marginBottom:4}}>لوحة التحكم</h1>
              <p style={{color:'var(--tx3)',fontSize:13}}>{SCHOOL}</p>
            </div>
            <div style={{display:'flex',gap:8}}>
              <button onClick={()=>setView(view==='grid'?'list':'grid')} className="btn-ghost" style={{padding:'8px 14px',fontSize:12}}>
                {view==='grid'?'⬜ قائمة':'▦ شبكة'}
              </button>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))',gap:12,marginBottom:28}} className="stagger">
          {[
            {v:profiles.length,l:'معلم',c:'var(--gold)',icon:'👨‍🏫'},
            {v:activeTeachers,l:'نشط',c:'var(--em)',icon:'✅'},
            {v:totalEvs,l:'شاهد',c:'var(--info)',icon:'📂'},
            {v:`${avgProg}%`,l:'متوسط الإنجاز',c:pColor(avgProg),icon:'📊'},
            {v:coveredKpis,l:'معيار مُغطى',c:'var(--pu)',icon:'🎯'},
          ].map((s,i)=>(
            <div key={i} className="stat-card anim-up">
              <div style={{fontSize:18,marginBottom:6}}>{s.icon}</div>
              <div className="stat-val" style={{color:s.c}}>{s.v}</div>
              <div className="stat-lbl">{s.l}</div>
            </div>
          ))}
        </div>

        {/* KPI Coverage */}
        <div className="glass" style={{padding:20,marginBottom:24}} className="anim-up">
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
            <h3 style={{fontFamily:'var(--serif)',color:'var(--gold)',fontSize:16}}>🎯 تغطية المعايير المهنية</h3>
            <span className="badge badge-gold">{coveredKpis}/{KPI_STANDARDS.length}</span>
          </div>
          <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
            {[1,2,3,4,5].map(domain=>{
              const ds=KPI_STANDARDS.filter(k=>k.domain===domain)
              const cov=ds.filter(k=>evs.some(e=>e.kpis?.includes(k.id))).length
              const c=ds[0]?.color??'#64748b'
              const pct=Math.round((cov/ds.length)*100)
              return(
                <div key={domain} style={{flex:1,minWidth:120,background:`${c}08`,border:`1px solid ${c}25`,borderRadius:12,padding:'10px 14px'}}>
                  <div style={{fontSize:10,color:c,fontWeight:800,marginBottom:6}}>{ds[0]?.domainName}</div>
                  <div className="prog-track"><div className="prog-fill" style={{width:`${pct}%`,background:c}}/></div>
                  <div style={{fontSize:11,color:'var(--tx3)',marginTop:6,display:'flex',justifyContent:'space-between'}}>
                    <span>{cov}/{ds.length}</span><span style={{color:c,fontWeight:700}}>{pct}%</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Section Coverage */}
        <div className="glass" style={{padding:20,marginBottom:24}} className="anim-up">
          <h3 style={{fontFamily:'var(--serif)',color:'var(--gold)',fontSize:16,marginBottom:14}}>📂 تغطية الأقسام الـ 13</h3>
          <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
            {SECTIONS.map(s=>{
              const cnt=evs.filter(e=>e.sid===s.id).length
              const pct=profiles.length>0?Math.round((profiles.filter(p=>evs.some(e=>e.tid===p.id&&e.sid===s.id)).length/profiles.length)*100):0
              return(
                <div key={s.id} title={`${s.title}: ${cnt} شاهد`}
                  style={{background:cnt>0?`${s.color}12`:'rgba(255,255,255,.03)',border:`1px solid ${cnt>0?s.color+'30':'rgba(255,255,255,.06)'}`,borderRadius:10,padding:'8px 12px',minWidth:100,flex:'1 0 100px'}}>
                  <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:4}}>
                    <span style={{fontSize:14}}>{s.icon}</span>
                    <span style={{fontSize:10,color:cnt>0?s.color:'var(--tx3)',fontWeight:700,lineHeight:1.2}}>{s.title}</span>
                  </div>
                  <div className="prog-track" style={{height:3}}><div className="prog-fill" style={{width:`${pct}%`,background:s.color}}/></div>
                  <div style={{fontSize:10,color:'var(--tx3)',marginTop:4}}>{cnt} شاهد • {pct}%</div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Search + Filter */}
        <div style={{display:'flex',gap:10,marginBottom:20,flexWrap:'wrap'}} className="anim-up">
          <input className="inp" value={search} onChange={e=>setSearch(e.target.value)}
            placeholder="🔍 ابحث باسم المعلم..." style={{flex:'1 1 200px',maxWidth:320}}/>
          <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
            {[{v:'all',l:'الكل'},{v:'admin',l:'إدارة'},{v:'expert',l:'خبير'},{v:'advanced',l:'متقدم'},{v:'practitioner',l:'ممارس'}].map(f=>(
              <button key={f.v} onClick={()=>setFilter(f.v)}
                style={{padding:'8px 14px',border:`1px solid ${filter===f.v?'var(--gold)':'var(--bd)'}`,background:filter===f.v?'var(--gold-pale)':'transparent',color:filter===f.v?'var(--gold)':'var(--tx3)',borderRadius:20,cursor:'pointer',fontSize:12,fontFamily:'var(--font)',fontWeight:filter===f.v?700:400,transition:'all .2s'}}>
                {f.l}
              </button>
            ))}
          </div>
        </div>

        {/* Teachers */}
        {view==='grid'?(
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))',gap:14}} className="stagger">
            {filtered.map((p,i)=>{
              const prog=calcProgress(evs,p.id)
              const tc=evs.filter(e=>e.tid===p.id).length
              const col=ROLE_COLORS[p.role]??'#64748b'
              return(
                <div key={p.id} className="glass2 anim-up" style={{cursor:'pointer',transition:'all .2s',padding:18}}
                  onClick={()=>router.push(`/teacher/${p.id}`)}
                  onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.transform='translateY(-4px)';(e.currentTarget as HTMLElement).style.borderColor='rgba(255,255,255,.12)'}}
                  onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.transform='';(e.currentTarget as HTMLElement).style.borderColor='var(--bd)'}}>
                  <div style={{height:3,background:`linear-gradient(90deg,${col},${col}40)`,borderRadius:2,marginBottom:14}}/>
                  <div style={{display:'flex',gap:12,alignItems:'center',marginBottom:14}}>
                    <div className="av" style={{width:44,height:44,background:`linear-gradient(135deg,${col},${col}88)`,fontSize:14,boxShadow:`0 4px 16px ${col}44`}}>{p.av}</div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontWeight:700,fontSize:14,color:'var(--tx)',marginBottom:2,lineHeight:1.3}}>{p.full_name||p.name}</div>
                      <span className="badge" style={{fontSize:10,background:`${col}15`,color:col,border:`1px solid ${col}30`}}>{ROLE_LABELS[p.role]}</span>
                    </div>
                    <div style={{fontSize:16,fontWeight:900,color:pColor(prog)}}>{prog}%</div>
                  </div>
                  <div className="prog-track" style={{marginBottom:10}}>
                    <div className="prog-fill" style={{width:`${prog}%`,background:`linear-gradient(90deg,${pColor(prog)},${pColor(prog)}80)`}}/>
                  </div>
                  <div style={{display:'flex',justifyContent:'space-between',fontSize:11,color:'var(--tx3)'}}>
                    <span>📂 {tc} شاهد</span>
                    <span>🎯 {new Set(evs.filter(e=>e.tid===p.id).flatMap(e=>e.kpis??[])).size} معيار</span>
                    <span>📑 {new Set(evs.filter(e=>e.tid===p.id).map(e=>e.sid)).size}/{N_SEC} قسم</span>
                  </div>
                </div>
              )
            })}
          </div>
        ):(
          <div style={{display:'flex',flexDirection:'column',gap:8}} className="stagger">
            {filtered.map((p,i)=>{
              const prog=calcProgress(evs,p.id)
              const tc=evs.filter(e=>e.tid===p.id).length
              const col=ROLE_COLORS[p.role]??'#64748b'
              return(
                <div key={p.id} className="glass2 anim-up" style={{cursor:'pointer',padding:'14px 18px',display:'flex',alignItems:'center',gap:14,transition:'all .2s'}}
                  onClick={()=>router.push(`/teacher/${p.id}`)}>
                  <div className="av" style={{width:40,height:40,background:`linear-gradient(135deg,${col},${col}88)`,fontSize:13,flexShrink:0}}>{p.av}</div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontWeight:700,fontSize:14,color:'var(--tx)'}}>{p.full_name||p.name}</div>
                    <div style={{fontSize:11,color:'var(--tx3)',marginTop:2}}>{ROLE_LABELS[p.role]} • {tc} شاهد</div>
                  </div>
                  <div style={{width:100}}>
                    <div className="prog-track"><div className="prog-fill" style={{width:`${prog}%`,background:pColor(prog)}}/></div>
                  </div>
                  <div style={{fontSize:16,fontWeight:900,color:pColor(prog),minWidth:36,textAlign:'center'}}>{prog}%</div>
                  <span style={{fontSize:12,color:'var(--tx3)'}}>←</span>
                </div>
              )
            })}
          </div>
        )}

        {filtered.length===0&&(
          <div style={{textAlign:'center',padding:'60px 0',color:'var(--tx3)'}}>
            <div style={{fontSize:48,marginBottom:12}}>🔍</div>
            <p style={{fontSize:14}}>لا نتائج للبحث</p>
          </div>
        )}
      </div>
    </div>
  )
}
