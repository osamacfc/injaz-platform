'use client'
import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { supabase, profileHelpers, evidenceHelpers } from '@/lib/supabase'
import { SCHOOL, TERM, SECTIONS, KPI_STANDARDS, ROLE_LABELS, ROLE_COLORS, SEALS_CATALOG, calcProgress, pColor, N_SEC, type Profile, type Evidence } from '@/lib/constants'

const GUEST_CODE = '1447'

export default function GuestPage() {
  const router = useRouter()
  const [code, setCode] = useState('')
  const [auth, setAuth] = useState(false)
  const [codeErr, setCodeErr] = useState(false)
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [evs, setEvs] = useState<Evidence[]>([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [showDrop, setShowDrop] = useState(false)
  const [selTeacher, setSelTeacher] = useState<Profile|null>(null)

  const verify = () => {
    if (code === GUEST_CODE) { setAuth(true); setCodeErr(false); loadData() }
    else { setCodeErr(true); setTimeout(()=>setCodeErr(false), 2000) }
  }

  const loadData = async () => {
    setLoading(true)
    const [profs, evList] = await Promise.all([profileHelpers.getAllProfiles(), evidenceHelpers.getAll()])
    setProfiles(profs as Profile[])
    setEvs(evList as Evidence[])
    setLoading(false)
  }

  const filtered = useMemo(()=> search.trim() ? profiles.filter(p=>(p.full_name||').includes(search.trim())) : profiles, [profiles,search])
  const totalEvs = evs.length
  const coveredSecs = new Set(evs.map(e=>e.sid)).size
  const avgProg = profiles.length>0 ? Math.round(profiles.reduce((a,p)=>a+calcProgress(evs,p.id),0)/profiles.length) : 0
  const topTeacher = profiles.sort((a,b)=>calcProgress(evs,b.id)-calcProgress(evs,a.id))[0]

  if (!auth) return (
    <div style={{minHeight:'100vh',background:'var(--navy)',display:'flex',alignItems:'center',justifyContent:'center',padding:16}}>
      <div className="mesh"/>
      <div style={{width:'100%',maxWidth:380}} className="anim-up">
        <div style={{textAlign:'center',marginBottom:32}}>
          <div style={{width:68,height:68,borderRadius:18,background:'linear-gradient(135deg,var(--gold-d),var(--gold))',display:'flex',alignItems:'center',justifyContent:'center',fontSize:28,margin:'0 auto 14px',boxShadow:'0 8px 40px rgba(201,168,76,.35)'}}>📚</div>
          <h1 style={{fontFamily:'var(--serif)',fontSize:22,color:'var(--gold)',marginBottom:4}}>عرض الملفات</h1>
          <p style={{fontSize:12,color:'var(--tx3)'}}>أدخل رمز الدخول للمشاهدة</p>
        </div>
        <div className="glass" style={{padding:24}}>
          <label style={{fontSize:12,color:'var(--tx3)',display:'block',marginBottom:8}}>رمز الدخول</label>
          <input className="inp" value={code} onChange={e=>setCode(e.target.value)} placeholder="أدخل الرمز" style={{textAlign:'center',fontSize:22,letterSpacing:8,marginBottom:14}} onKeyDown={e=>e.key==='Enter'&&verify()}
            autoFocus/>
          {codeErr&&<p style={{color:'var(--danger)',fontSize:12,textAlign:'center',marginBottom:10}}>❌ رمز غير صحيح</p>}
          <button onClick={verify} className="btn-gold" style={{width:'100%',padding:'12px 0',fontSize:14,borderRadius:12}}>دخول ←</button>
          <hr className="sep" style={{margin:'16px 0'}}/>
          <button onClick={()=>router.push('/auth')} className="btn-ghost" style={{width:'100%',padding:'10px 0',fontSize:13,borderRadius:12}}>
            🔐 تسجيل الدخول بحساب
          </button>
        </div>
      </div>
    </div>
  )

  if (loading) return (
    <div style={{minHeight:'100vh',background:'var(--navy)',display:'flex',alignItems:'center',justifyContent:'center'}}>
      <div className="mesh"/>
      <div style={{textAlign:'center'}}>
        <div style={{fontSize:40,marginBottom:12,animation:'spin 2s linear infinite'}}>📚</div>
        <div style={{fontFamily:'var(--serif)',color:'var(--gold)',fontSize:16}}>جاري التحميل...</div>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  if (selTeacher) {
    const tid = selTeacher.id
    const tEvs = evs.filter(e=>e.tid===tid)
    const prog = calcProgress(evs, tid)
    const col = ROLE_COLORS[selTeacher.role]??'#64748b'
    return (
      <div style={{minHeight:'100vh',background:'var(--navy)'}}>
        <div className="mesh"/>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        <nav className="nav-bar">
          <button onClick={()=>setSelTeacher(null)} className="btn-ghost" style={{padding:'7px 14px',fontSize:12}}>← رجوع</button>
          <span style={{fontFamily:'var(--serif)',color:'var(--gold)',fontSize:15}}>{selTeacher.full_name||selTeacher.name}</span>
          <button onClick={()=>router.push('/auth')} className="btn-ghost" style={{padding:'7px 14px',fontSize:12}}>🔐 دخول</button>
        </nav>
        <div className="page">
          <div className="glass" style={{padding:24,marginBottom:20}} className="anim-up">
            <div style={{height:3,background:`linear-gradient(90deg,${col},#c9a84c,#e8c96d)`,borderRadius:2,marginBottom:20}}/>
            <div style={{display:'flex',gap:16,alignItems:'center',flexWrap:'wrap'}}>
              <div className="av" style={{width:64,height:64,background:`linear-gradient(135deg,${col},${col}88)`,fontSize:20,boxShadow:`0 6px 24px ${col}55`}}>{selTeacher.av}</div>
              <div style={{flex:1}}>
                <h2 style={{fontFamily:'var(--serif)',fontSize:20,color:'var(--gold)',marginBottom:4}}>{selTeacher.full_name||selTeacher.name}</h2>
                <p style={{color:'var(--tx3)',fontSize:12}}>{ROLE_LABELS[selTeacher.role]} • {SCHOOL}</p>
                <div style={{display:'flex',gap:8,marginTop:10,flexWrap:'wrap'}}>
                  {[{v:tEvs.length,l:'شاهد',c:'var(--gold)'},{v:`${prog}%`,l:'الإنجاز',c:pColor(prog)},{v:new Set(tEvs.map(e=>e.sid)).size,l:'قسم',c:'var(--em)'}].map((s,i)=>(
                    <div key={i} className="stat-card" style={{padding:'8px 14px'}}>
                      <div className="stat-val" style={{fontSize:16,color:s.c}}>{s.v}</div>
                      <div className="stat-lbl">{s.l}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
          {SECTIONS.filter(s=>tEvs.some(e=>e.sid===s.id)).map(sec=>(
            <div key={sec.id} className="glass2" style={{marginBottom:14,overflow:'hidden'}} className="anim-up">
              <div style={{height:3,background:`linear-gradient(90deg,${sec.color},${sec.color}40)`}}/>
              <div style={{padding:'12px 16px',background:`${sec.color}06`,borderBottom:`1px solid ${sec.color}15`,display:'flex',alignItems:'center',gap:8}}>
                <span style={{fontSize:18}}>{sec.icon}</span>
                <span style={{fontFamily:'var(--serif)',color:sec.color,fontSize:15,fontWeight:700}}>{sec.title}</span>
                <span className="badge" style={{background:`${sec.color}15`,color:sec.color,border:`1px solid ${sec.color}25`,fontSize:10}}>{tEvs.filter(e=>e.sid===sec.id).length} شاهد</span>
              </div>
              <div style={{padding:14,display:'flex',flexDirection:'column',gap:10}}>
                {tEvs.filter(e=>e.sid===sec.id).map(ev=>(
                  <div key={ev.id} className="ev-card">
                    <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:6,flexWrap:'wrap'}}>
                      <span style={{fontSize:16}}>{ev.type==='image'?'🖼️':ev.type==='link'?'🔗':'📄'}</span>
                      <span style={{fontWeight:700,fontSize:13}}>{ev.title}</span>
                      {ev.date&&<span className="badge" style={{background:'rgba(255,255,255,.05)',color:'var(--tx3)',border:'1px solid var(--bd)',fontSize:10}}>📅 {ev.date}</span>}
                    </div>
                    {ev.desc&&<div style={{fontSize:12,color:'var(--tx2)',lineHeight:1.8}} dangerouslySetInnerHTML={{__html:ev.desc}}/>}
                    {(ev.kpis?.length??0)>0&&(
                      <div style={{display:'flex',gap:4,flexWrap:'wrap',marginTop:8}}>
                        {ev.kpis?.map(kId=>{const k=KPI_STANDARDS.find(x=>x.id===kId);return k?<span key={kId} className="kpi-chip" style={{background:`${k.color}15`,color:k.color,border:`1px solid ${k.color}25`}}>{k.code}</span>:null})}
                      </div>
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

  return (
    <div style={{minHeight:'100vh',background:'var(--navy)'}}>
      <div className="mesh"/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}`}</style>

      <nav className="nav-bar">
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          <div style={{width:32,height:32,borderRadius:8,background:'linear-gradient(135deg,var(--gold-d),var(--gold))',display:'flex',alignItems:'center',justifyContent:'center',fontSize:14}}>📚</div>
          <span style={{fontFamily:'var(--serif)',color:'var(--gold)',fontSize:14}}>منصة إنجاز — عرض عام</span>
        </div>
        <button onClick={()=>router.push('/auth')} className="btn-gold" style={{padding:'7px 16px',fontSize:12}}>🔐 تسجيل الدخول</button>
      </nav>

      <div className="page">
        {/* Header */}
        <div style={{textAlign:'center',marginBottom:32,paddingTop:8}} className="anim-up">
          <h1 style={{fontFamily:'var(--serif)',fontSize:28,color:'var(--gold)',marginBottom:6}}>{SCHOOL}</h1>
          <p style={{color:'var(--tx3)',fontSize:13}}>{TERM} • ملفات الإنجاز الوظيفي</p>
        </div>

        {/* Stats */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(120px,1fr))',gap:10,marginBottom:28}} className="stagger">
          {[
            {v:profiles.length,l:'معلم',c:'var(--gold)',icon:'👨‍🏫'},
            {v:totalEvs,l:'شاهد موثّق',c:'var(--info)',icon:'📂'},
            {v:coveredSecs,l:'محور مُغطى',c:'var(--pu)',icon:'📑'},
            {v:`${avgProg}%`,l:'متوسط الإنجاز',c:pColor(avgProg),icon:'📊'},
          ].map((s,i)=>(
            <div key={i} className="stat-card anim-up">
              <div style={{fontSize:20,marginBottom:6}}>{s.icon}</div>
              <div className="stat-val" style={{color:s.c}}>{s.v}</div>
              <div className="stat-lbl">{s.l}</div>
            </div>
          ))}
        </div>

        {/* Top teacher */}
        {topTeacher&&(
          <div className="glass-gold" style={{padding:16,marginBottom:24,display:'flex',alignItems:'center',gap:14}} className="anim-up">
            <div style={{fontSize:28}}>🥇</div>
            <div style={{flex:1}}>
              <div style={{fontSize:12,color:'var(--tx3)',marginBottom:2}}>الأعلى إنجازاً هذا الفصل</div>
              <div style={{fontWeight:700,fontSize:15,color:'var(--tx)'}}>{topTeacher.full_name||topTeacher.name}</div>
            </div>
            <div style={{fontSize:20,fontWeight:900,color:'var(--gold)'}}>{calcProgress(evs,topTeacher.id)}%</div>
          </div>
        )}

        {/* Search with dropdown */}
        <div style={{position:'relative',marginBottom:24}} className="anim-up">
          <input className="inp" value={search} onChange={e=>{setSearch(e.target.value);setShowDrop(true)}} onFocus={()=>setShowDrop(true)} onBlur={()=>setTimeout(()=>setShowDrop(false),200)}
            placeholder="🔍 ابحث باسم المعلم..." style={{paddingRight:44}}/>
          {showDrop&&filtered.length>0&&search&&(
            <div className="glass2" style={{position:'absolute',top:'calc(100% + 6px)',right:0,left:0,zIndex:50,borderRadius:14,overflow:'hidden',maxHeight:280,overflowY:'auto',boxShadow:'0 20px 60px rgba(0,0,0,.6)'}}>
              {filtered.slice(0,8).map((p,i)=>{
                const prog=calcProgress(evs,p.id)
                const col=ROLE_COLORS[p.role]??'#64748b'
                return(
                  <div key={p.id} style={{display:'flex',alignItems:'center',gap:12,padding:'10px 14px',cursor:'pointer',borderBottom:i<filtered.length-1?'1px solid var(--bd)':'none',transition:'background .2s'}}
                    onMouseEnter={e=>(e.currentTarget as HTMLElement).style.background='rgba(255,255,255,.04)'}
                    onMouseLeave={e=>(e.currentTarget as HTMLElement).style.background=''}
                    onMouseDown={()=>{setSelTeacher(p);setSearch('');setShowDrop(false)}}>
                    <div className="av" style={{width:36,height:36,background:`linear-gradient(135deg,${col},${col}88)`,fontSize:12}}>{p.av}</div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontWeight:700,fontSize:13,color:'var(--tx)'}}>{p.full_name}</div>
                      <div style={{fontSize:11,color:col}}>{ROLE_LABELS[p.role]}</div>
                    </div>
                    <div style={{fontSize:13,fontWeight:900,color:pColor(prog)}}>{prog}%</div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Teachers grid */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(240px,1fr))',gap:12}} className="stagger">
          {filtered.map((p,i)=>{
            const prog=calcProgress(evs,p.id)
            const tc=evs.filter(e=>e.tid===p.id).length
            const col=ROLE_COLORS[p.role]??'#64748b'
            return(
              <div key={p.id} className="glass2 anim-up" style={{cursor:'pointer',padding:16,transition:'all .2s'}}
                onClick={()=>setSelTeacher(p)}
                onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.transform='translateY(-3px)';(e.currentTarget as HTMLElement).style.borderColor='rgba(255,255,255,.12)'}}
                onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.transform='';(e.currentTarget as HTMLElement).style.borderColor='var(--bd)'}}>
                <div style={{height:2,background:`linear-gradient(90deg,${col},${col}40)`,borderRadius:2,marginBottom:12}}/>
                <div style={{display:'flex',gap:10,alignItems:'center',marginBottom:12}}>
                  <div className="av" style={{width:40,height:40,background:`linear-gradient(135deg,${col},${col}88)`,fontSize:13,flexShrink:0}}>{p.av}</div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontWeight:700,fontSize:13,color:'var(--tx)',lineHeight:1.3,marginBottom:3}}>{p.full_name}</div>
                    <span className="badge" style={{fontSize:10,background:`${col}12`,color:col,border:`1px solid ${col}25`}}>{ROLE_LABELS[p.role]}</span>
                  </div>
                </div>
                <div className="prog-track"><div className="prog-fill" style={{width:`${prog}%`,background:`linear-gradient(90deg,${pColor(prog)},${pColor(prog)}80)`}}/></div>
                <div style={{display:'flex',justifyContent:'space-between',marginTop:8,fontSize:11,color:'var(--tx3)'}}>
                  <span>{tc} شاهد</span>
                  <span style={{color:pColor(prog),fontWeight:800}}>{prog}%</span>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}



