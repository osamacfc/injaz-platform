'use client'
import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase, profileHelpers, evidenceHelpers, sealHelpers } from '@/lib/supabase'
import { SCHOOL, TERM, SECTIONS, KPI_STANDARDS, ROLE_LABELS, ROLE_COLORS, SEALS_CATALOG, calcProgress, pColor, N_SEC, type Profile, type Evidence } from '@/lib/constants'

const gid = () => crypto.randomUUID()
const typeEmoji = (t:string) => t==='image'?'🖼️':t==='link'?'🔗':t==='pdf'?'📄':t==='video'?'🎬':'📋'
const isPriv = (p:Profile|null) => p&&(['admin','deputy'].includes(p.role)||p.is_developer)
const canEval = (p:Profile|null) => p&&(['admin','deputy','counselor'].includes(p.role)||p.is_developer||p.is_evaluator)

// ── Toast ──
function useToast() {
  const [toasts,setToasts] = useState<{id:string;msg:string;t:string}[]>([])
  const show = useCallback((msg:string,t='success')=>{
    const id=gid(); setToasts(p=>[...p,{id,msg,t}])
    setTimeout(()=>setToasts(p=>p.filter(x=>x.id!==id)),3200)
  },[])
  return {toasts,show}
}

// ── Completion Ring ──
function Ring({prog,size=84}:{prog:number;size?:number}) {
  const r=(size-10)/2,circ=2*Math.PI*r,dash=circ*(prog/100),c=pColor(prog)
  return (
    <svg width={size} height={size} style={{transform:'rotate(-90deg)',position:'absolute',top:-6,right:-6}}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,.07)" strokeWidth={6}/>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={c} strokeWidth={6} strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" style={{transition:'stroke-dasharray 1s ease'}}/>
      <text x={size/2} y={size/2} textAnchor="middle" dominantBaseline="central" fill={c} fontSize={12} fontWeight={900} fontFamily="Cairo,sans-serif" style={{transform:`rotate(90deg)`,transformOrigin:`${size/2}px ${size/2}px`}}>{prog}%</text>
    </svg>
  )
}

// ── Impact Visualizer ──
function Impact({impact,onChange,canEdit}:{impact:any;onChange:(v:any)=>void;canEdit:boolean}) {
  const [ed,setEd]=useState(false)
  const [loc,setLoc]=useState(impact||{label:'تحسن التحصيل',pre:45,post:78})
  if(!impact&&!canEdit) return null
  return (
    <div style={{marginTop:12,background:'rgba(16,185,129,.06)',border:'1px solid rgba(16,185,129,.2)',borderRadius:12,padding:14}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
        <span style={{fontSize:12,fontWeight:800,color:'#10b981'}}>📈 مؤشر الأثر على المتعلمين</span>
        {canEdit&&<div style={{display:'flex',gap:6}}>
          {ed?<><button onClick={()=>{onChange(loc);setEd(false)}} style={SB('#10b981')}>حفظ</button><button onClick={()=>setEd(false)} style={SB('#64748b')}>إلغاء</button></>
          :<button onClick={()=>setEd(true)} style={SB('#c9a84c')}>{impact?'تعديل':'+ أضف مؤشر'}</button>}
        </div>}
      </div>
      {ed?(
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8}}>
          {[['التسمية','label','text'],['القبلي %','pre','number'],['البعدي %','post','number']].map(([l,k,tp])=>(
            <div key={k}><label style={{fontSize:11,color:'#4a6285',display:'block',marginBottom:4}}>{l}</label>
            <input type={tp} value={loc[k]} onChange={e=>setLoc({...loc,[k]:tp==='number'?+e.target.value:e.target.value})} style={INP}/></div>
          ))}
        </div>
      ):impact?(
        <>
          {[{l:'قبلي',v:impact.pre,c:'#ef4444'},{l:'بعدي',v:impact.post,c:'#10b981'}].map(r=>(
            <div key={r.l} style={{display:'flex',alignItems:'center',gap:10,marginBottom:8}}>
              <span style={{fontSize:11,color:'#4a6285',minWidth:36}}>{r.l}</span>
              <div style={{flex:1,height:8,background:'rgba(255,255,255,.07)',borderRadius:4,overflow:'hidden'}}><div style={{height:'100%',width:`${r.v}%`,background:r.c,borderRadius:4,transition:'width 1s ease'}}/></div>
              <span style={{fontSize:13,fontWeight:900,color:r.c,minWidth:36}}>{r.v}%</span>
            </div>
          ))}
          <div style={{textAlign:'center',marginTop:6}}>
            <span style={{padding:'4px 14px',borderRadius:20,background:'rgba(16,185,129,.12)',color:'#10b981',fontSize:12,fontWeight:800,border:'1px solid rgba(16,185,129,.25)'}}>📈 نمو {impact.post-impact.pre}% — {impact.label}</span>
          </div>
        </>
      ):(
        <div style={{textAlign:'center',padding:'10px 0',color:'#4a6285',fontSize:12}}>لم يُضف قياس بعد</div>
      )}
    </div>
  )
}

// ── Supervisor Rating ──
function SupRating({ev,viewer,onSave}:{ev:Evidence;viewer:Profile|null;onSave:(e:Evidence)=>void}) {
  const [rating,setRating]=useState(ev.sup_rating??0)
  const [note,setNote]=useState(ev.note??'')
  const [saving,setSaving]=useState(false)
  if(!canEval(viewer)) {
    if(!ev.sup_rating&&!ev.note) return null
    return (
      <div style={{marginTop:10,background:'rgba(245,158,11,.06)',border:'1px solid rgba(245,158,11,.2)',borderRadius:10,padding:'8px 12px'}}>
        {ev.sup_rating>0&&<div style={{color:'#f59e0b',fontSize:14,marginBottom:4}}>{'⭐'.repeat(ev.sup_rating)}</div>}
        {ev.note&&<div style={{fontSize:12,color:'#c9a84c'}}>💬 {ev.note}</div>}
      </div>
    )
  }
  const save = async ()=>{ setSaving(true); await onSave({...ev,sup_rating:rating,note}); setSaving(false) }
  return (
    <div style={{marginTop:10,background:'rgba(245,158,11,.06)',border:'1px solid rgba(245,158,11,.2)',borderRadius:10,padding:'10px 12px'}}>
      <div style={{fontSize:11,color:'#f59e0b',fontWeight:700,marginBottom:8}}>تقييم المشرف</div>
      <div style={{display:'flex',gap:4,marginBottom:8}}>
        {[1,2,3,4,5].map(i=><button key={i} onClick={()=>setRating(i)} style={{background:'none',border:'none',cursor:'pointer',fontSize:20,color:i<=rating?'#f59e0b':'#4a6285'}}>⭐</button>)}
      </div>
      <textarea value={note} onChange={e=>setNote(e.target.value)} placeholder="ملاحظة المشرف..." rows={2}
        style={{...INP,resize:'none'} as any}/>
      <button onClick={save} disabled={saving} style={{...SB('#f59e0b'),marginTop:8,width:'100%',padding:'7px 0'}}>
        {saving?'جاري الحفظ...':'💾 حفظ التقييم'}
      </button>
    </div>
  )
}

// ── File Upload Button ──
function FileUpload({tid,onUploaded}:{tid:string;onUploaded:(url:string,name:string,type:string)=>void}) {
  const ref=useRef<HTMLInputElement>(null)
  const [loading,setLoading]=useState(false)
  const handle = async (file:File)=>{
    setLoading(true)
    try {
      const url = await evidenceHelpers.uploadFile(file,tid)
      const t = file.type.startsWith('image')?'image':file.type.includes('pdf')?'pdf':file.type.includes('video')?'video':'doc'
      onUploaded(url,file.name,t)
    } catch(e) { alert('فشل رفع الملف — تأكد من إنشاء bucket اسمه evidences في Supabase Storage') }
    setLoading(false)
  }
  return (
    <div>
      <button onClick={()=>ref.current?.click()} style={{...SB('#3b82f6'),padding:'8px 16px',fontSize:12}}>
        {loading?'⏳ جاري الرفع...':'📎 رفع ملف (صورة/PDF/Word)'}
      </button>
      <input ref={ref} type="file" accept="image/*,.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.mp4,.mov" style={{display:'none'}}
        onChange={e=>e.target.files?.[0]&&handle(e.target.files[0])}/>
      <div style={{fontSize:10,color:'#4a6285',marginTop:4}}>يدعم: صور، PDF، Word، PowerPoint، Excel، فيديو</div>
    </div>
  )
}

// ── QR ──
function QR({text}:{text:string}) {
  const [o,setO]=useState(false)
  return (
    <div style={{position:'relative',display:'inline-block'}}>
      <button onClick={()=>setO(!o)} style={SB('#4a6285')}>⊞ QR</button>
      {o&&<div style={{position:'absolute',top:'100%',right:0,zIndex:200,background:'#0d1526',border:'1px solid rgba(201,168,76,.3)',borderRadius:12,padding:12,boxShadow:'0 20px 60px rgba(0,0,0,.5)'}}>
        <img src={`https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(text)}`} width={140} height={140} alt="QR" style={{borderRadius:6,display:'block'}}/>
      </div>}
    </div>
  )
}

// ── Voice ──
function Voice({text}:{text:string}) {
  const [sp,setSp]=useState(false)
  const go=()=>{
    if(!('speechSynthesis' in window)) return
    if(sp){window.speechSynthesis.cancel();setSp(false);return}
    const u=new SpeechSynthesisUtterance(text.replace(/<[^>]+>/g,'').slice(0,600))
    u.lang='ar-SA';u.onend=()=>setSp(false);window.speechSynthesis.speak(u);setSp(true)
  }
  return <button onClick={go} style={{background:'transparent',border:'none',color:sp?'#10b981':'#4a6285',cursor:'pointer',fontSize:14,padding:'2px 6px'}}>{sp?'⏹':'🔊'}</button>
}

// ── Section Progress ──
function SecProg({evs}:{evs:Evidence[]}) {
  return (
    <div style={{display:'flex',gap:4,flexWrap:'wrap',marginTop:12}}>
      {SECTIONS.map(s=>{const c=evs.filter(e=>e.sid===s.id).length;return(
        <div key={s.id} title={`${s.title}: ${c} شاهد`} style={{width:28,height:28,borderRadius:8,background:c>0?`${s.color}20`:'rgba(255,255,255,.04)',border:`1.5px solid ${c>0?s.color+'60':'rgba(255,255,255,.08)'}`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:c>0?11:9,color:c>0?s.color:'#4a6285',fontWeight:700}}>
          {c>0?s.icon:s.id}
        </div>
      )})}
    </div>
  )
}

// ── Profile Views Tracker ──
async function trackView(tid:string, viewerId:string|null, viewerName:string) {
  try {
    await supabase.from('profile_views').insert({
      teacher_id: tid,
      viewer_id: viewerId,
      viewer_name: viewerName,
      opened_at: new Date().toISOString(),
    })
  } catch {}
}

// ── PDF Export ──
function exportPdf(teacher:Profile,evs:Evidence[],tProfile:any) {
  const myEvs=evs.filter(e=>e.tid===teacher.id)
  const prog=calcProgress(evs,teacher.id),col=pColor(prog)
  const grouped=SECTIONS.map(s=>({sec:s,evs:myEvs.filter(e=>e.sid===s.id)})).filter(g=>g.evs.length>0)
  const allKpis=[...new Set(myEvs.flatMap(e=>e.kpis??[]))]
  const sealHtml=(tProfile?.seals??[]).map((id:string)=>{const s=SEALS_CATALOG.find(x=>x.id===id);return s?`<span class="seal">${s.icon} ${s.title}`:''}).join('')
  const secHtml=grouped.map(({sec,evs:sevs})=>`
    <div class="section"><div class="sec-hd" style="border-right-color:${sec.color}"><span>${sec.icon}</span><span style="color:${sec.color};font-family:Amiri,serif;font-size:16px;font-weight:700">${sec.title}</span><span class="cnt">${sevs.length} شاهد</span></div>
    ${sevs.map(ev=>`<div class="ev"><div class="ev-hd"><span>${typeEmoji(ev.type)}</span><strong>${ev.title}</strong>${ev.date?`<span class="badge">${ev.date}</span>`:''}</div>${ev.desc?`<div class="ev-desc">${ev.desc}</div>`:''}${(ev as any).impact?`<div class="ev-impact">📈 ${(ev as any).impact.label}: ${(ev as any).impact.pre}% → ${(ev as any).impact.post}% (نمو ${(ev as any).impact.post-(ev as any).impact.pre}%)</div>`:''}${ev.sup_rating>0?`<div style="color:#f59e0b;font-size:12px;margin-top:4px">${'⭐'.repeat(ev.sup_rating)} ${ev.note||''}</div>`:''}</div>`).join('')}</div>`).join('')
  const html=`<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="UTF-8"/><title>ملف إنجاز — ${teacher.full_name}</title>
  <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;700;900&family=Amiri:wght@400;700&display=swap" rel="stylesheet"/>
  <style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:Cairo,sans-serif;background:#fff;color:#1a2540;print-color-adjust:exact;-webkit-print-color-adjust:exact}@page{margin:16mm;size:A4}.cover{min-height:96vh;display:flex;flex-direction:column;align-items:center;justify-content:center;background:linear-gradient(160deg,#070d1a,#0f172a);color:#fff;padding:48px;page-break-after:always;text-align:center}.gold-line{height:4px;background:linear-gradient(90deg,#a07830,#c9a84c,#e8c87a,#c9a84c,#a07830);margin-bottom:32px;border-radius:2px;width:200px}.ct{font-family:Amiri,serif;font-size:32px;color:#c9a84c;margin-bottom:12px}.cn{font-family:Amiri,serif;font-size:24px;color:#e8c87a;margin-bottom:6px}.cr{font-size:13px;color:#8aaccc}.cs{font-size:12px;color:#4a6285;margin-bottom:24px}.mb{background:rgba(255,255,255,.07);border:1px solid rgba(201,168,76,.25);border-radius:16px;padding:20px 36px}.mr{display:flex;gap:28px;justify-content:center;margin-top:10px}.mi .v{font-size:26px;font-weight:900;color:#c9a84c}.mi .l{font-size:11px;color:#8aaccc}.seals{margin-top:16px;display:flex;gap:8px;flex-wrap:wrap;justify-content:center}.seal{display:inline-flex;align-items:center;gap:4px;padding:5px 12px;border-radius:14px;background:linear-gradient(135deg,#c9a84c,#e8c87a);color:#0a0f1e;font-size:11px;font-weight:800}.section{margin-bottom:28px;page-break-inside:avoid}.sec-hd{display:flex;align-items:center;gap:10px;padding:10px 16px;border-right:4px solid #c9a84c;background:rgba(201,168,76,.05);border-radius:0 10px 10px 0;margin-bottom:10px}.cnt{font-size:11px;color:#64748b;margin-right:auto}.ev{border:1px solid #e2e8f0;border-radius:10px;padding:12px 14px;margin-bottom:8px;background:#fafbfc}.ev-hd{display:flex;align-items:center;gap:8px;margin-bottom:6px;flex-wrap:wrap}.ev-hd strong{font-size:13px;font-weight:800}.badge{display:inline-flex;padding:2px 8px;border-radius:16px;font-size:10px;font-weight:700;background:#fef9ec;color:#a07830;border:1px solid rgba(201,168,76,.3);margin:1px}.ev-desc{font-size:12px;color:#64748b;line-height:1.8;margin-top:4px}.ev-impact{font-size:11px;color:#059669;background:#ecfdf5;padding:5px 10px;border-radius:6px;margin-top:6px}.footer{text-align:center;padding:16px;border-top:2px solid #e2e8f0;color:#94a3b8;font-size:11px;margin-top:20px}</style></head>
  <body><div class="cover"><div class="gold-line"></div><div style="font-size:48px;margin-bottom:12px">📚</div>
  <div class="ct">ملف الإنجاز الوظيفي</div><div class="cn">${teacher.full_name}</div>
  <div class="cr">${ROLE_LABELS[teacher.role]}</div><div class="cs">${SCHOOL}</div>
  <div class="mb"><div style="font-size:13px;color:#8aaccc">${TERM}</div>
  <div class="mr"><div class="mi"><div class="v">${myEvs.length}</div><div class="l">شاهد</div></div>
  <div class="mi"><div class="v" style="color:${col}">${prog}%</div><div class="l">اكتمال</div></div>
  <div class="mi"><div class="v">${grouped.length}/${N_SEC}</div><div class="l">قسم</div></div>
  <div class="mi"><div class="v">${allKpis.length}</div><div class="l">معيار</div></div></div></div>
  ${sealHtml?`<div class="seals">${sealHtml}</div>`:''}</div>
  <div style="padding:28px 0">${secHtml}</div>
  <div class="footer">منصة إنجاز تحفيظ عيبان • ${SCHOOL} • ${TERM}</div></body></html>`
  const w=window.open('','_blank');if(!w)return;w.document.write(html);w.document.close();setTimeout(()=>w.print(),800)
}

// ── Style helpers ──
const SB=(c:string):React.CSSProperties=>({background:`${c}20`,border:`1px solid ${c}40`,color:c,borderRadius:8,padding:'4px 10px',cursor:'pointer',fontSize:11,fontFamily:'Cairo,sans-serif',fontWeight:700})
const LBL:React.CSSProperties={fontSize:12,color:'#4a6285',display:'block',marginBottom:6}
const INP:React.CSSProperties={width:'100%',padding:'10px 12px',background:'rgba(8,14,30,.8)',border:'1.5px solid #1e3352',borderRadius:10,color:'#eef4ff',fontFamily:'Cairo,sans-serif',fontSize:13,outline:'none',boxSizing:'border-box'}

// ══ MAIN ══
export default function TeacherPage() {
  const router=useRouter()
  const {id}=useParams<{id:string}>()
  const {toasts,show:toast}=useToast()

  const [viewer,  setViewer]  = useState<Profile|null>(null)
  const [teacher, setTeacher] = useState<Profile|null>(null)
  const [tProf,   setTProf]   = useState<any>(null)
  const [evs,     setEvs]     = useState<Evidence[]>([])
  const [loading, setLoading] = useState(true)
  const [tab,     setTab]     = useState(1)
  const [showAdd, setShowAdd] = useState(false)
  const [saving,  setSaving]  = useState(false)
  const [showImp, setShowImp] = useState(false)
  const [views,   setViews]   = useState<any[]>([])
  const [showViews,setShowViews]=useState(false)

  const [form,setForm]=useState({title:'',desc:'',type:'doc' as string,date:'',url:'',file_url:'',file_name:'',kpis:[] as string[],sid:1,impact:null as any})

  // ── Load ──
  useEffect(()=>{
    supabase.auth.getSession().then(async({data:{session}})=>{
      let v:Profile|null=null
      if(session){ v=await profileHelpers.getProfile(session.user.id) as Profile; setViewer(v) }
      const [t,tp,evList]=await Promise.all([
        profileHelpers.getProfile(id),
        profileHelpers.getTeacherProfile(id),
        evidenceHelpers.getByTeacher(id),
      ])
      if(!t){router.replace('/guest');return}
      setTeacher(t as Profile); setTProf(tp); setEvs(evList as Evidence[])
      setLoading(false)
      // Track view
      trackView(id, v?.id??null, v?.full_name??'زائر مجهول')
    })
  },[id,router])

  // ── Load views (for owner/admin) ──
  useEffect(()=>{
    if(!viewer) return
    const isOwner=viewer.id===id
    if(isOwner||isPriv(viewer)){
      supabase.from('profile_views').select('*').eq('teacher_id',id).order('opened_at',{ascending:false}).limit(50)
        .then(({data})=>setViews(data??[]))
    }
  },[viewer,id])

  const prog   =useMemo(()=>calcProgress(evs,id),[evs,id])
  const tabEvs =useMemo(()=>evs.filter(e=>e.sid===tab),[evs,tab])
  const col    =ROLE_COLORS[teacher?.role??'']??'#64748b'
  const isOwner=viewer?.id===id
  const canAdd =isOwner||canEval(viewer)

  // ── Save evidence ──
  const saveEv=useCallback(async()=>{
    if(!form.title.trim()||!viewer) return
    setSaving(true)
    const ev={id:gid(),tid:id,sid:form.sid,title:form.title,desc:form.desc,type:form.type,date:form.date,url:form.url,file_url:form.file_url,file_name:form.file_name,kpis:form.kpis,impact:form.impact,active:true,ts:Date.now()}
    const saved=await evidenceHelpers.upsert(ev)
    setEvs(p=>[saved,...p])
    setForm({title:'',desc:'',type:'doc',date:'',url:'',file_url:'',file_name:'',kpis:[],sid:tab,impact:null})
    setShowAdd(false);setSaving(false);setShowImp(false)
    toast('✅ تم حفظ الشاهد')
    if(typeof window!=='undefined'&&(window as any).confetti)
      (window as any).confetti({particleCount:120,spread:80,origin:{y:.65},colors:['#c9a84c','#10b981','#fff']})
  },[form,viewer,id,tab,toast])

  const deleteEv=useCallback(async(evId:string)=>{
    if(!confirm('حذف هذا الشاهد؟')) return
    await evidenceHelpers.delete(evId);setEvs(p=>p.filter(e=>e.id!==evId));toast('تم الحذف','warn')
  },[toast])

  const updateEv=useCallback(async(ev:Evidence)=>{
    const saved=await evidenceHelpers.upsert(ev);setEvs(p=>p.map(e=>e.id===ev.id?saved:e))
  },[])

  const toggleSeal=useCallback(async(sealId:string)=>{
    if(!viewer||!isPriv(viewer)) return
    const cur=tProf?.seals??[],has=cur.includes(sealId)
    const next=has?cur.filter((s:string)=>s!==sealId):[...cur,sealId]
    setTProf((p:any)=>({...p,seals:next}))
    if(has) await sealHelpers.revoke(id,sealId)
    else{await sealHelpers.award(id,sealId,viewer.id);toast('🥇 تم منح الختم الذهبي')}
    await supabase.from('teacher_profiles').update({seals:next}).eq('uid',id)
  },[viewer,tProf,id,toast])

  if(loading) return(
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'#0a0f1e'}}>
      <div style={{textAlign:'center'}}><div style={{fontSize:48,marginBottom:12}}>📚</div>
        <div style={{fontFamily:'Amiri,serif',color:'#c9a84c',fontSize:18}}>جاري تحميل الملف...</div></div>
    </div>
  )

  const sec=SECTIONS.find(s=>s.id===tab)!

  return(
    <div style={{minHeight:'100vh',background:'#0a0f1e',color:'#eef4ff',fontFamily:'Cairo,sans-serif',direction:'rtl'}}>
      <style>{`@keyframes fu{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}::-webkit-scrollbar{width:4px}::-webkit-scrollbar-thumb{background:rgba(201,168,76,.3);border-radius:4px}`}</style>
      <script src="https://cdn.jsdelivr.net/npm/canvas-confetti@1.9.3/dist/confetti.browser.min.js"/>

      {/* Nav */}
      <nav style={{background:'rgba(13,21,38,.95)',borderBottom:'1px solid rgba(201,168,76,.15)',padding:'0 20px',height:56,display:'flex',alignItems:'center',justifyContent:'space-between',position:'sticky',top:0,zIndex:100,backdropFilter:'blur(20px)'}}>
        <button onClick={()=>router.back()} style={{background:'rgba(255,255,255,.07)',border:'1px solid rgba(255,255,255,.1)',color:'#8aaccc',padding:'6px 14px',borderRadius:8,cursor:'pointer',fontFamily:'Cairo,sans-serif',fontSize:12}}>← رجوع</button>
        <span style={{fontFamily:'Amiri,serif',fontSize:16,color:'#c9a84c',fontWeight:700}}>{teacher?.full_name}</span>
        <div style={{display:'flex',gap:8}}>
          {canAdd&&<button onClick={()=>exportPdf(teacher!,evs,tProf)} style={{background:'linear-gradient(135deg,#c9a84c,#e8c96d)',color:'#0a0f1e',padding:'6px 14px',borderRadius:8,cursor:'pointer',fontFamily:'Cairo,sans-serif',fontSize:12,fontWeight:700,border:'none'}}>📄 PDF</button>}
          {(isOwner||isPriv(viewer))&&views.length>0&&(
            <button onClick={()=>setShowViews(!showViews)} style={{...SB('#3b82f6'),padding:'6px 12px'}}>
              👁 {views.length}
            </button>
          )}
          {!viewer&&<button onClick={()=>router.push('/auth')} style={{background:'rgba(255,255,255,.08)',border:'1px solid rgba(255,255,255,.1)',color:'#8aaccc',padding:'6px 14px',borderRadius:8,cursor:'pointer',fontFamily:'Cairo,sans-serif',fontSize:12}}>🔐 دخول</button>}
        </div>
      </nav>

      {/* Views Panel */}
      {showViews&&(
        <div style={{background:'rgba(13,21,38,.98)',borderBottom:'1px solid rgba(59,130,246,.2)',padding:'12px 20px',maxWidth:900,margin:'0 auto'}}>
          <div style={{fontSize:13,color:'#3b82f6',fontWeight:700,marginBottom:8}}>👁 إحصائية فتح الملف — {views.length} زيارة</div>
          <div style={{display:'flex',flexDirection:'column',gap:6,maxHeight:200,overflowY:'auto'}}>
            {views.slice(0,20).map((v,i)=>(
              <div key={i} style={{display:'flex',alignItems:'center',gap:12,fontSize:12,color:'#8aaccc',padding:'6px 10px',background:'rgba(255,255,255,.03)',borderRadius:8}}>
                <span style={{fontSize:16}}>{v.viewer_id?'👤':'👁'}</span>
                <span style={{flex:1,color:'#eef4ff'}}>{v.viewer_name||'زائر مجهول'}</span>
                <span style={{color:'#4a6285'}}>{new Date(v.opened_at).toLocaleDateString('ar-SA')}</span>
                <span style={{color:'#4a6285'}}>{new Date(v.opened_at).toLocaleTimeString('ar-SA',{hour:'2-digit',minute:'2-digit'})}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{maxWidth:900,margin:'0 auto',padding:'20px 16px'}}>

        {/* Cover */}
        <div style={{background:'rgba(16,26,50,.85)',borderRadius:20,overflow:'hidden',marginBottom:20,border:'1px solid rgba(255,255,255,.06)'}}>
          <div style={{height:4,background:`linear-gradient(90deg,${col},#c9a84c,#e8c96d)`}}/>
          <div style={{padding:24}}>
            <div style={{display:'flex',gap:20,alignItems:'flex-start',flexWrap:'wrap'}}>
              <div style={{position:'relative',flexShrink:0,width:72,height:72}}>
                <div style={{width:72,height:72,borderRadius:'50%',background:`linear-gradient(135deg,${col},${col}88)`,display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontWeight:900,fontSize:22,boxShadow:`0 8px 30px ${col}55`}}>{teacher?.av}</div>
                <Ring prog={prog}/>
              </div>
              <div style={{flex:1}}>
                <h1 style={{fontFamily:'Amiri,serif',fontSize:22,color:'#c9a84c',fontWeight:700,margin:'0 0 4px'}}>{teacher?.full_name}</h1>
                <p style={{color:'#8aaccc',fontSize:13,margin:'0 0 14px'}}>{ROLE_LABELS[teacher?.role??'']} • {SCHOOL} • {TERM}</p>
                <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
                  {[{v:evs.length,l:'شاهد',c:'#c9a84c'},{v:`${prog}%`,l:'الإنجاز',c:pColor(prog)},{v:`${new Set(evs.map(e=>e.sid)).size}/${N_SEC}`,l:'قسم',c:'#10b981'},{v:new Set(evs.flatMap(e=>e.kpis??[])).size,l:'معيار',c:'#8b5cf6'}].map((s,i)=>(
                    <div key={i} style={{textAlign:'center',background:'rgba(255,255,255,.05)',border:'1px solid rgba(255,255,255,.08)',borderRadius:12,padding:'8px 14px'}}>
                      <div style={{fontSize:18,fontWeight:900,color:s.c}}>{s.v}</div>
                      <div style={{fontSize:10,color:'#4a6285',marginTop:2}}>{s.l}</div>
                    </div>
                  ))}
                  {views.length>0&&(isOwner||isPriv(viewer))&&(
                    <div style={{textAlign:'center',background:'rgba(59,130,246,.08)',border:'1px solid rgba(59,130,246,.2)',borderRadius:12,padding:'8px 14px',cursor:'pointer'}} onClick={()=>setShowViews(!showViews)}>
                      <div style={{fontSize:18,fontWeight:900,color:'#3b82f6'}}>{views.length}</div>
                      <div style={{fontSize:10,color:'#4a6285',marginTop:2}}>زيارة</div>
                    </div>
                  )}
                </div>
                <SecProg evs={evs}/>
              </div>
            </div>

            {/* Seals */}
            {(tProf?.seals?.length>0||isPriv(viewer))&&(
              <div style={{marginTop:18,paddingTop:14,borderTop:'1px solid rgba(255,255,255,.06)'}}>
                <div style={{fontSize:12,color:'#4a6285',marginBottom:8}}>🏅 الأختام الذهبية</div>
                <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
                  {SEALS_CATALOG.map(seal=>{
                    const has=tProf?.seals?.includes(seal.id)
                    return(
                      <button key={seal.id} onClick={()=>isPriv(viewer)&&toggleSeal(seal.id)}
                        style={{background:has?'rgba(201,168,76,.15)':'rgba(255,255,255,.04)',border:has?'1px solid rgba(201,168,76,.4)':'1px solid rgba(255,255,255,.08)',borderRadius:20,padding:'5px 12px',fontSize:12,color:has?'#c9a84c':'#4a6285',cursor:isPriv(viewer)?'pointer':'default',display:'flex',alignItems:'center',gap:4,transition:'all .2s'}}>
                        {seal.icon} {seal.title} {has&&'✓'}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* KPI Domains */}
        <div style={{background:'rgba(16,26,50,.85)',borderRadius:16,padding:'14px 18px',marginBottom:16,border:'1px solid rgba(255,255,255,.06)'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
            <span style={{fontSize:13,color:'#c9a84c',fontWeight:700}}>🎯 تغطية المعايير المهنية</span>
            <span style={{fontSize:11,color:'#4a6285'}}>{new Set(evs.flatMap(e=>e.kpis??[])).size} / {KPI_STANDARDS.length}</span>
          </div>
          <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
            {[1,2,3,4,5].map(domain=>{
              const ds=KPI_STANDARDS.filter(k=>k.domain===domain)
              const cov=ds.filter(k=>evs.some(e=>e.kpis?.includes(k.id))).length
              const c=ds[0]?.color??'#64748b'
              return(
                <div key={domain} style={{flex:1,minWidth:110,background:`${c}10`,border:`1px solid ${c}30`,borderRadius:10,padding:'8px 12px'}}>
                  <div style={{fontSize:10,color:c,fontWeight:700,marginBottom:4}}>{ds[0]?.domainName}</div>
                  <div style={{height:4,background:'rgba(255,255,255,.08)',borderRadius:2,overflow:'hidden'}}><div style={{height:'100%',width:`${(cov/ds.length)*100}%`,background:c,borderRadius:2}}/></div>
                  <div style={{fontSize:10,color:'#4a6285',marginTop:4}}>{cov}/{ds.length}</div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Tabs */}
        <div style={{display:'flex',gap:6,overflowX:'auto',paddingBottom:8,marginBottom:16,scrollbarWidth:'none'}}>
          {SECTIONS.map(s=>{
            const cnt=evs.filter(e=>e.sid===s.id).length,active=tab===s.id
            return(
              <button key={s.id} onClick={()=>setTab(s.id)}
                style={{flexShrink:0,background:active?`${s.color}18`:'rgba(255,255,255,.04)',border:active?`1.5px solid ${s.color}50`:'1px solid rgba(255,255,255,.06)',borderRadius:20,padding:'6px 14px',cursor:'pointer',fontFamily:'Cairo,sans-serif',fontSize:12,color:active?s.color:'#4a6285',display:'flex',alignItems:'center',gap:6,transition:'all .2s'}}>
                {s.icon}<span style={{whiteSpace:'nowrap'}}>{s.title}</span>
                {cnt>0&&<span style={{background:active?s.color:'#1e3352',color:active?'#fff':'#4a6285',borderRadius:10,padding:'0 6px',fontSize:10,fontWeight:700}}>{cnt}</span>}
              </button>
            )
          })}
        </div>

        {/* Section */}
        <div style={{background:'rgba(16,26,50,.85)',borderRadius:20,overflow:'hidden',border:`1px solid ${sec.color}20`}}>
          <div style={{height:3,background:`linear-gradient(90deg,${sec.color},${sec.color}40)`}}/>
          <div style={{padding:'14px 18px',display:'flex',alignItems:'center',justifyContent:'space-between',borderBottom:`1px solid ${sec.color}15`,background:`${sec.color}06`}}>
            <div style={{display:'flex',alignItems:'center',gap:10}}>
              <span style={{fontSize:22}}>{sec.icon}</span>
              <span style={{fontFamily:'Amiri,serif',fontSize:16,color:sec.color,fontWeight:700}}>{sec.title}</span>
              <span style={{fontSize:11,color:sec.color,background:`${sec.color}18`,padding:'2px 8px',borderRadius:10}}>{tabEvs.length} شاهد</span>
            </div>
            {canAdd&&<button onClick={()=>{setForm(f=>({...f,sid:tab}));setShowAdd(true)}} style={{background:`linear-gradient(135deg,${sec.color},${sec.color}88)`,border:'none',borderRadius:10,padding:'7px 14px',color:'#fff',cursor:'pointer',fontFamily:'Cairo,sans-serif',fontSize:12,fontWeight:700}}>+ إضافة شاهد</button>}
          </div>
          <div style={{padding:16}}>
            {tabEvs.length===0?(
              <div style={{textAlign:'center',padding:'40px 0',color:'#4a6285'}}>
                <div style={{fontSize:40,marginBottom:12}}>📂</div>
                <p style={{fontSize:14}}>لا توجد شواهد في هذا القسم بعد</p>
                {canAdd&&<p style={{fontSize:12,marginTop:4}}>اضغط "+ إضافة شاهد" للبدء</p>}
              </div>
            ):(
              <div style={{display:'flex',flexDirection:'column',gap:12}}>
                {tabEvs.map(ev=>(
                  <div key={ev.id} style={{background:'rgba(8,14,30,.6)',border:'1px solid rgba(255,255,255,.06)',borderRadius:14,padding:16,animation:'fu .3s ease'}}>
                    <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:12}}>
                      <div style={{flex:1}}>
                        <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:8,flexWrap:'wrap'}}>
                          <span style={{fontSize:18}}>{typeEmoji(ev.type)}</span>
                          <span style={{fontWeight:700,fontSize:14}}>{ev.title}</span>
                          {ev.date&&<span style={{fontSize:11,color:'#4a6285',background:'rgba(255,255,255,.05)',padding:'2px 8px',borderRadius:10}}>📅 {ev.date}</span>}
                          {ev.is_verified&&<span style={{fontSize:11,color:'#10b981',background:'rgba(16,185,129,.1)',padding:'2px 8px',borderRadius:10}}>✅ معتمد</span>}
                          {ev.file_name&&<span style={{fontSize:11,color:'#8b5cf6',background:'rgba(139,92,246,.1)',padding:'2px 8px',borderRadius:10}}>📎 {ev.file_name}</span>}
                        </div>
                        {(ev.kpis?.length??0)>0&&(
                          <div style={{display:'flex',gap:4,flexWrap:'wrap',marginBottom:8}}>
                            {ev.kpis?.map(kId=>{const k=KPI_STANDARDS.find(x=>x.id===kId);return k?<span key={kId} style={{fontSize:10,padding:'2px 8px',borderRadius:12,background:`${k.color}15`,color:k.color,border:`1px solid ${k.color}30`,fontWeight:700}}>{k.code}</span>:null})}
                          </div>
                        )}
                        {ev.desc&&<div style={{fontSize:12,color:'#8aaccc',lineHeight:1.8,marginBottom:8}} dangerouslySetInnerHTML={{__html:ev.desc}}/>}
                        {ev.url&&ev.type==='link'&&<a href={ev.url} target="_blank" rel="noreferrer" style={{color:'#3b82f6',fontSize:12,display:'inline-flex',alignItems:'center',gap:4,marginTop:4}}>🔗 فتح الرابط</a>}
                        {ev.file_url&&ev.type==='image'&&<img src={ev.file_url} alt={ev.title} style={{maxHeight:200,borderRadius:8,objectFit:'cover',width:'100%',marginTop:8}}/>}
                        {ev.file_url&&ev.type==='pdf'&&<a href={ev.file_url} target="_blank" rel="noreferrer" style={{display:'inline-flex',alignItems:'center',gap:6,marginTop:8,color:'#ef4444',fontSize:12,background:'rgba(239,68,68,.1)',padding:'6px 12px',borderRadius:8}}>📄 فتح PDF</a>}
                        {ev.file_url&&ev.type==='doc'&&ev.file_name&&<a href={ev.file_url} target="_blank" rel="noreferrer" style={{display:'inline-flex',alignItems:'center',gap:6,marginTop:8,color:'#3b82f6',fontSize:12,background:'rgba(59,130,246,.1)',padding:'6px 12px',borderRadius:8}}>📋 تحميل الملف</a>}
                        <Impact impact={(ev as any).impact} canEdit={canAdd} onChange={impact=>updateEv({...ev,impact} as Evidence)}/>
                        <SupRating ev={ev} viewer={viewer} onSave={updateEv}/>
                      </div>
                      <div style={{display:'flex',flexDirection:'column',gap:6,flexShrink:0,alignItems:'flex-end'}}>
                        <Voice text={ev.title+'. '+(ev.desc??'')}/>
                        <QR text={ev.file_url||ev.url||`https://injaz-platform-8t1fovbmh-osamacfcs-projects.vercel.app/teacher/${id}`}/>
                        {(isOwner||canEval(viewer))&&<button onClick={()=>deleteEv(ev.id)} style={{background:'rgba(239,68,68,.1)',border:'1px solid rgba(239,68,68,.2)',color:'#ef4444',borderRadius:8,padding:'4px 10px',cursor:'pointer',fontSize:11}}>حذف</button>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal */}
      {showAdd&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.75)',zIndex:200,display:'flex',alignItems:'center',justifyContent:'center',padding:16}} onClick={e=>e.target===e.currentTarget&&setShowAdd(false)}>
          <div style={{background:'#0d1526',border:'1px solid rgba(201,168,76,.2)',borderRadius:20,padding:24,width:'100%',maxWidth:540,maxHeight:'92vh',overflowY:'auto'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
              <h3 style={{fontFamily:'Amiri,serif',color:'#c9a84c',fontSize:18,margin:0}}>إضافة شاهد جديد</h3>
              <button onClick={()=>setShowAdd(false)} style={{background:'rgba(255,255,255,.08)',border:'none',color:'#8aaccc',width:32,height:32,borderRadius:8,cursor:'pointer',fontSize:16}}>✕</button>
            </div>

            <div style={{marginBottom:14}}><label style={LBL}>القسم</label>
              <select value={form.sid} onChange={e=>setForm(f=>({...f,sid:+e.target.value}))} style={INP}>
                {SECTIONS.map(s=><option key={s.id} value={s.id}>{s.icon} {s.title}</option>)}
              </select></div>

            <div style={{marginBottom:14}}><label style={LBL}>عنوان الشاهد *</label>
              <input value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))} placeholder="مثال: نشاط صفي إبداعي" style={INP}/></div>

            {/* النوع */}
            <div style={{marginBottom:14}}><label style={LBL}>نوع الشاهد</label>
              <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                {[['doc','📋 وثيقة'],['link','🔗 رابط'],['image','🖼️ صورة'],['pdf','📄 PDF'],['video','🎬 فيديو']].map(([t,l])=>(
                  <button key={t} onClick={()=>setForm(f=>({...f,type:t}))}
                    style={{flex:1,minWidth:80,padding:'8px 6px',background:form.type===t?'rgba(201,168,76,.15)':'rgba(255,255,255,.04)',border:form.type===t?'1.5px solid rgba(201,168,76,.4)':'1px solid rgba(255,255,255,.08)',borderRadius:10,color:form.type===t?'#c9a84c':'#4a6285',cursor:'pointer',fontFamily:'Cairo,sans-serif',fontSize:11}}>
                    {l}
                  </button>
                ))}
              </div>
            </div>

            {/* رفع ملف */}
            {['image','pdf','video','doc'].includes(form.type)&&(
              <div style={{marginBottom:14}}><label style={LBL}>رفع ملف</label>
                <FileUpload tid={id} onUploaded={(url,name,t)=>{setForm(f=>({...f,file_url:url,file_name:name,type:t}));toast('✅ تم رفع الملف')}}/>
                {form.file_url&&<div style={{marginTop:8,fontSize:11,color:'#10b981'}}>✅ {form.file_name}</div>}
              </div>
            )}

            {form.type==='link'&&(
              <div style={{marginBottom:14}}><label style={LBL}>الرابط</label>
                <input value={form.url} onChange={e=>setForm(f=>({...f,url:e.target.value}))} placeholder="https://..." style={INP}/></div>
            )}

            <div style={{marginBottom:14}}><label style={LBL}>التاريخ (هجري)</label>
              <input value={form.date} onChange={e=>setForm(f=>({...f,date:e.target.value}))} placeholder="مثال: 15/8/1447" style={INP}/></div>

            <div style={{marginBottom:14}}><label style={LBL}>الوصف</label>
              <textarea value={form.desc} onChange={e=>setForm(f=>({...f,desc:e.target.value}))} placeholder="وصف مختصر للشاهد..." rows={3} style={{...INP,resize:'vertical'} as any}/></div>

            <div style={{marginBottom:14}}><label style={LBL}>المعايير المهنية</label>
              <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                {KPI_STANDARDS.map(k=>{const sel=form.kpis.includes(k.id);return(
                  <button key={k.id} onClick={()=>setForm(f=>({...f,kpis:sel?f.kpis.filter(x=>x!==k.id):[...f.kpis,k.id]}))}
                    style={{background:sel?`${k.color}20`:'rgba(255,255,255,.04)',border:sel?`1px solid ${k.color}50`:'1px solid rgba(255,255,255,.08)',borderRadius:20,padding:'4px 10px',fontSize:11,color:sel?k.color:'#4a6285',cursor:'pointer'}}>
                    {k.code}
                  </button>
                )})}
              </div>
            </div>

            <div style={{marginBottom:16}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                <label style={LBL}>مؤشر الأثر على المتعلمين</label>
                <button onClick={()=>setShowImp(!showImp)} style={SB('#c9a84c')}>{showImp?'إغلاق':'+ إضافة مؤشر'}</button>
              </div>
              {showImp&&<Impact impact={form.impact} canEdit onChange={v=>setForm(f=>({...f,impact:v}))}/>}
            </div>

            <div style={{display:'flex',gap:10}}>
              <button onClick={saveEv} disabled={saving||!form.title.trim()}
                style={{flex:1,background:'linear-gradient(135deg,#c9a84c,#e8c96d)',border:'none',borderRadius:12,padding:'12px 0',color:'#0a0f1e',fontFamily:'Cairo,sans-serif',fontSize:14,fontWeight:800,cursor:saving?'wait':'pointer',opacity:!form.title.trim()?.5:1}}>
                {saving?'جاري الحفظ...':'💾 حفظ الشاهد'}
              </button>
              <button onClick={()=>setShowAdd(false)} style={{padding:'12px 20px',background:'rgba(255,255,255,.06)',border:'1px solid rgba(255,255,255,.1)',borderRadius:12,color:'#8aaccc',fontFamily:'Cairo,sans-serif',fontSize:14,cursor:'pointer'}}>إلغاء</button>
            </div>
          </div>
        </div>
      )}

      {/* Toasts */}
      <div style={{position:'fixed',bottom:24,left:'50%',transform:'translateX(-50%)',zIndex:9999,display:'flex',flexDirection:'column',gap:8,pointerEvents:'none'}}>
        {toasts.map(t=><div key={t.id} style={{background:t.t==='error'?'#ef4444':t.t==='warn'?'#f59e0b':'#10b981',color:'#fff',padding:'10px 20px',borderRadius:12,fontSize:13,fontWeight:700,fontFamily:'Cairo,sans-serif',boxShadow:'0 8px 30px rgba(0,0,0,.4)'}}>{t.msg}</div>)}
      </div>
    </div>
  )
}
