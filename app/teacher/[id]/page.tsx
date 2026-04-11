'use client'
import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase, profileHelpers, evidenceHelpers, sealHelpers } from '@/lib/supabase'
import {
  SCHOOL, TERM, SECTIONS, KPI_STANDARDS, ROLE_LABELS, ROLE_COLORS,
  SEALS_CATALOG, calcProgress, pColor, N_SEC, isPrivileged, canAward,
  type Profile, type Evidence,
} from '@/lib/constants'

const gid = () => crypto.randomUUID()

const TYPE_INFO: Record<string,{icon:string;label:string;color:string}> = {
  image:{icon:'🖼️',label:'صورة',color:'#10b981'},
  pdf:  {icon:'📄',label:'PDF',color:'#ef4444'},
  link: {icon:'🔗',label:'رابط',color:'#3b82f6'},
  video:{icon:'🎬',label:'فيديو',color:'#8b5cf6'},
  doc:  {icon:'📋',label:'وثيقة',color:'#f59e0b'},
}

const SECTION_HINTS: Record<number,string> = {
  1: 'أضف بياناتك الشخصية: الاسم الرباعي، رقم الجوال، المؤهل العلمي، وسنة الالتحاق بالتعليم. هذا القسم يُعرّف بك مهنياً.',
  2: 'عبّر عن رؤيتك التربوية: ما الذي يدفعك للتعليم؟ ما قيمك؟ كيف تنظر لدور المعلم؟ اكتب بأسلوبك الخاص.',
  3: 'وثّق مؤهلاتك: الشهادة العلمية، التخصص، الجهة، والسنة. أضف الدورات التدريبية المعتمدة.',
  4: 'سجّل إنجازاتك: جوائز، تكريمات، مشاركات في مسابقات، ريادة مشاريع، أو أي إنجاز تفخر به.',
  5: 'أرفق خططك الدراسية، الوحدات التي طوّرتها، أو استراتيجياتك في تنفيذ المنهج.',
  6: 'أضف نماذج من أدوات تقييمك: اختبارات، بطاقات ملاحظة، تقارير أداء الطلاب.',
  7: 'وثّق الأنشطة الصفية والنشاط اللاصفي: مسرح، رحلات، مبادرات، يوم مفتوح...',
  8: 'أرفق صور أو نماذج من أعمال طلابك المميزة مع وصف للمهارة التي تُظهرها.',
  9: 'سجّل برامج التطوير المهني: دورات، ورش، مؤتمرات، قراءات، شهادات حديثة.',
  10: 'أضف مقاطع فيديو للتدريس، أو تقارير زيارات إشرافية، أو نتائج مراجعات الأداء.',
  11: 'ارفع شهاداتك وأوسمتك وأدلة التميز الرسمية.',
  12: 'اكتب تأملاً ذاتياً: ما نقاط قوتك؟ ما جوانب التطوير؟ ما خطتك المستقبلية؟',
  13: 'اختم ملفك برسالة شكر أو رؤية مستقبلية أو كلمة توجيهية لزملائك وطلابك.',
}

// ── Rich Text Editor ──
function RTE({value,onChange,placeholder='اكتب هنا...'}:{value:string;onChange:(v:string)=>void;placeholder?:string}) {
  const ref = useRef<HTMLDivElement>(null)
  const exec = (cmd:string,val?:string) => { document.execCommand(cmd,false,val); ref.current?.focus() }
  useEffect(()=>{ if(ref.current&&ref.current.innerHTML!==value) ref.current.innerHTML=value||'' },[])
  return (
    <div>
      <div className="rte-toolbar">
        {[['bold','B'],['italic','I'],['underline','U']].map(([c,l])=>(
          <button key={c} className="rte-btn" onMouseDown={e=>{e.preventDefault();exec(c)}} style={{fontWeight:c==='bold'?800:400,fontStyle:c==='italic'?'italic':'normal',textDecoration:c==='underline'?'underline':'none'}}>{l}</button>
        ))}
        <div style={{width:1,background:'var(--bd)',margin:'0 4px'}}/>
        <button className="rte-btn" onMouseDown={e=>{e.preventDefault();exec('insertUnorderedList')}}>• قائمة</button>
        <button className="rte-btn" onMouseDown={e=>{e.preventDefault();exec('insertOrderedList')}}>١. مرقّم</button>
        <div style={{width:1,background:'var(--bd)',margin:'0 4px'}}/>
        <button className="rte-btn" onMouseDown={e=>{e.preventDefault();exec('removeFormat')}} style={{fontSize:10}}>مسح</button>
      </div>
      <div ref={ref} className="rte-area" contentEditable suppressContentEditableWarning
        style={{minHeight:100}}
        data-placeholder={placeholder}
        onInput={()=>onChange(ref.current?.innerHTML||'')}/>
    </div>
  )
}

// ── Camera Modal ──
function CameraModal({onCapture,onClose}:{onCapture:(url:string)=>void;onClose:()=>void}) {
  const videoRef=useRef<HTMLVideoElement>(null)
  const canvasRef=useRef<HTMLCanvasElement>(null)
  const [streaming,setStreaming]=useState(false)
  const [captured,setCaptured]=useState('')
  useEffect(()=>{
    navigator.mediaDevices.getUserMedia({video:{facingMode:'environment'},audio:false})
      .then(s=>{if(videoRef.current){videoRef.current.srcObject=s;videoRef.current.play();setStreaming(true)}})
      .catch(()=>alert('لا يمكن الوصول للكاميرا'))
    return()=>{if(videoRef.current?.srcObject){const s=videoRef.current.srcObject as MediaStream;s.getTracks().forEach(t=>t.stop())}}
  },[])
  const snap=()=>{
    if(!canvasRef.current||!videoRef.current) return
    canvasRef.current.width=videoRef.current.videoWidth
    canvasRef.current.height=videoRef.current.videoHeight
    canvasRef.current.getContext('2d')?.drawImage(videoRef.current,0,0)
    setCaptured(canvasRef.current.toDataURL('image/jpeg',0.85))
  }
  return (
    <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal-box" style={{maxWidth:480}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
          <h3 style={{fontFamily:'var(--serif)',color:'var(--gold)',fontSize:18}}>📷 التقاط صورة</h3>
          <button onClick={onClose} className="btn-ghost" style={{padding:'6px 12px',fontSize:13}}>✕</button>
        </div>
        {!captured ? (
          <>
            <video ref={videoRef} style={{width:'100%',borderRadius:'var(--r12)',background:'#000',maxHeight:320,objectFit:'cover'}} playsInline muted/>
            <canvas ref={canvasRef} style={{display:'none'}}/>
            <button onClick={snap} disabled={!streaming} className="btn-gold" style={{width:'100%',padding:'12px 0',marginTop:14,fontSize:14}}>📸 التقاط</button>
          </>
        ) : (
          <>
            <img src={captured} style={{width:'100%',borderRadius:'var(--r12)',objectFit:'cover'}} alt="captured"/>
            <div style={{display:'flex',gap:10,marginTop:14}}>
              <button onClick={()=>onCapture(captured)} className="btn-gold" style={{flex:1,padding:'12px 0',fontSize:14}}>✅ استخدام هذه الصورة</button>
              <button onClick={()=>setCaptured('')} className="btn-ghost" style={{padding:'12px 16px',fontSize:13}}>إعادة</button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ── Personal Editor ──
function PersonalEditor({tProfile,onSave,saving}:{tProfile:any;onSave:(p:any)=>void;saving:boolean}) {
  const [data,setData]=useState({
    name:tProfile?.name||'',
    phone:tProfile?.phone||'',
    bio:tProfile?.bio||'',
    quals:tProfile?.quals?.length ? tProfile.quals : [
      {id:'q1',label:'التخصص',value:''},
      {id:'q2',label:'الشهادة',value:''},
      {id:'q3',label:'سنة التخرج',value:''},
      {id:'q4',label:'سنة الالتحاق',value:''},
      {id:'q5',label:'قرار التعيين',value:''},
      {id:'q6',label:'الدرجة الوظيفية',value:''},
    ]
  })
  const upQ=(id:string,val:string)=>setData(d=>({...d,quals:d.quals.map((q:any)=>q.id===id?{...q,value:val}:q)}))
  return (
    <div style={{display:'flex',flexDirection:'column',gap:16}}>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
        <div>
          <label style={{fontSize:12,color:'var(--tx3)',display:'block',marginBottom:6}}>الاسم الرباعي</label>
          <input className="inp" value={data.name} onChange={e=>setData(d=>({...d,name:e.target.value}))} placeholder="محمد أحمد علي الغزواني"/>
        </div>
        <div>
          <label style={{fontSize:12,color:'var(--tx3)',display:'block',marginBottom:6}}>رقم الجوال</label>
          <input className="inp" value={data.phone} onChange={e=>setData(d=>({...d,phone:e.target.value}))} placeholder="05XXXXXXXX" style={{direction:'ltr'}}/>
        </div>
      </div>
      <div>
        <label style={{fontSize:12,color:'var(--tx3)',display:'block',marginBottom:6}}>السيرة الذاتية المهنية</label>
        <RTE value={data.bio} onChange={v=>setData(d=>({...d,bio:v}))} placeholder="اكتب نبذة مهنية عن تجربتك التعليمية، إنجازاتك، وفلسفتك التربوية..."/>
      </div>
      <div>
        <label style={{fontSize:12,color:'var(--tx3)',display:'block',marginBottom:8}}>المؤهلات الأكاديمية</label>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(180px,1fr))',gap:8}}>
          {data.quals.map((q:any)=>(
            <div key={q.id} style={{background:'rgba(255,255,255,.03)',border:'1px solid var(--bd)',borderRadius:'var(--r12)',padding:'10px 12px'}}>
              <div style={{fontSize:10,color:'var(--gold)',fontWeight:800,marginBottom:4}}>{q.label}</div>
              <input className="inp" value={q.value} onChange={e=>upQ(q.id,e.target.value)} placeholder={q.label} style={{padding:'6px 10px',fontSize:12}}/>
            </div>
          ))}
        </div>
      </div>
      <button onClick={()=>onSave(data)} disabled={saving} className="btn-role" style={{padding:'12px 0',fontSize:14}}>
        {saving?'⏳ جاري الحفظ...':'💾 حفظ البيانات الشخصية'}
      </button>
    </div>
  )
}

// ── Impact Visualizer ──
function ImpactViz({impact,onChange,canEdit}:{impact:any;onChange:(v:any)=>void;canEdit:boolean}) {
  const [ed,setEd]=useState(false)
  const [loc,setLoc]=useState(impact||{label:'تحسن التحصيل',pre:45,post:78})
  if(!impact&&!canEdit) return null
  return(
    <div style={{marginTop:12,background:'rgba(16,185,129,.06)',border:'1px solid rgba(16,185,129,.2)',borderRadius:'var(--r12)',padding:14}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
        <span style={{fontSize:12,fontWeight:800,color:'#10b981'}}>📈 مؤشر الأثر على المتعلمين</span>
        {canEdit&&(!ed
          ?<button onClick={()=>setEd(true)} style={{background:'rgba(16,185,129,.1)',border:'1px solid rgba(16,185,129,.2)',color:'#10b981',borderRadius:8,padding:'4px 10px',cursor:'pointer',fontSize:11,fontFamily:'var(--font)'}}>{impact?'تعديل':'+ إضافة مؤشر'}</button>
          :<div style={{display:'flex',gap:6}}>
            <button onClick={()=>{onChange(loc);setEd(false)}} style={{background:'rgba(16,185,129,.15)',border:'1px solid rgba(16,185,129,.3)',color:'#10b981',borderRadius:8,padding:'4px 10px',cursor:'pointer',fontSize:11,fontFamily:'var(--font)'}}>حفظ</button>
            <button onClick={()=>setEd(false)} style={{background:'rgba(255,255,255,.06)',border:'1px solid var(--bd)',color:'var(--tx3)',borderRadius:8,padding:'4px 10px',cursor:'pointer',fontSize:11,fontFamily:'var(--font)'}}>إلغاء</button>
          </div>
        )}
      </div>
      {ed?(
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8}}>
          {[['التسمية','label','text'],['القبلي %','pre','number'],['البعدي %','post','number']].map(([l,k,t])=>(
            <div key={k}><label style={{fontSize:11,color:'var(--tx3)',display:'block',marginBottom:4}}>{l}</label>
            <input type={t} value={loc[k]} onChange={e=>setLoc({...loc,[k]:t==='number'?+e.target.value:e.target.value})} className="inp" style={{padding:'7px 10px',fontSize:12}}/></div>
          ))}
        </div>
      ):impact?(
        <>
          {[{l:'قبلي',v:impact.pre,c:'#ef4444'},{l:'بعدي',v:impact.post,c:'#10b981'}].map(r=>(
            <div key={r.l} style={{display:'flex',alignItems:'center',gap:10,marginBottom:8}}>
              <span style={{fontSize:11,color:'var(--tx3)',minWidth:36}}>{r.l}</span>
              <div style={{flex:1,height:8,background:'rgba(255,255,255,.07)',borderRadius:4,overflow:'hidden'}}>
                <div style={{height:'100%',width:`${r.v}%`,background:r.c,borderRadius:4,transition:'width 1.2s ease'}}/>
              </div>
              <span style={{fontSize:13,fontWeight:900,color:r.c,minWidth:36}}>{r.v}%</span>
            </div>
          ))}
          <div style={{textAlign:'center',marginTop:6}}>
            <span style={{padding:'4px 14px',borderRadius:20,background:'rgba(16,185,129,.12)',color:'#10b981',fontSize:12,fontWeight:800,border:'1px solid rgba(16,185,129,.25)'}}>
              📈 نمو {impact.post-impact.pre}% — {impact.label}
            </span>
          </div>
        </>
      ):(
        <div style={{textAlign:'center',padding:'10px 0',color:'var(--tx3)',fontSize:12}}>لم يُضف قياس بعد</div>
      )}
    </div>
  )
}

// ── Supervisor Rating ──
function SupRating({ev,viewer,onSave}:{ev:Evidence;viewer:Profile|null;onSave:(e:Evidence)=>void}) {
  const [r,setR]=useState(ev.sup_rating??0)
  const [note,setNote]=useState(ev.note??'')
  const [sav,setSav]=useState(false)
  if(!isPrivileged(viewer)){
    if(!ev.sup_rating&&!ev.note) return null
    return(
      <div style={{marginTop:10,background:'rgba(245,158,11,.06)',border:'1px solid rgba(245,158,11,.2)',borderRadius:'var(--r12)',padding:'8px 12px'}}>
        {ev.sup_rating>0&&<div style={{color:'var(--am)',fontSize:14,marginBottom:4}}>{'⭐'.repeat(ev.sup_rating)}</div>}
        {ev.note&&<div style={{fontSize:12,color:'var(--gold)'}}>💬 {ev.note}</div>}
      </div>
    )
  }
  return(
    <div style={{marginTop:10,background:'rgba(245,158,11,.06)',border:'1px solid rgba(245,158,11,.2)',borderRadius:'var(--r12)',padding:12}}>
      <div style={{fontSize:11,color:'var(--am)',fontWeight:700,marginBottom:8}}>⭐ تقييم المشرف</div>
      <div style={{display:'flex',gap:2,marginBottom:8}}>
        {[1,2,3,4,5].map(i=><button key={i} onClick={()=>setR(i)} style={{background:'none',border:'none',cursor:'pointer',fontSize:22,color:i<=r?'var(--am)':'rgba(255,255,255,.15)',padding:0,lineHeight:1}}>⭐</button>)}
      </div>
      <textarea className="inp" value={note} onChange={e=>setNote(e.target.value)} placeholder="ملاحظة المشرف..." rows={2} style={{marginBottom:8}}/>
      <button onClick={async()=>{setSav(true);await onSave({...ev,sup_rating:r,note});setSav(false)}} disabled={sav}
        style={{background:'rgba(245,158,11,.15)',border:'1px solid rgba(245,158,11,.3)',color:'var(--am)',borderRadius:'var(--r8)',padding:'7px 14px',cursor:'pointer',fontSize:12,fontFamily:'var(--font)',fontWeight:700}}>
        {sav?'⏳...':'💾 حفظ التقييم'}
      </button>
    </div>
  )
}

// ── QR ──
function QR({text}:{text:string}) {
  const [o,setO]=useState(false)
  return(
    <div style={{position:'relative',display:'inline-block'}}>
      <button onClick={()=>setO(!o)} style={{background:'rgba(255,255,255,.06)',border:'1px solid var(--bd)',borderRadius:'var(--r8)',padding:'4px 10px',color:'var(--tx3)',cursor:'pointer',fontSize:11}}>⊞ QR</button>
      {o&&<div style={{position:'absolute',top:'calc(100% + 6px)',right:0,zIndex:200,background:'var(--navy3)',border:'1px solid var(--bd-gold)',borderRadius:'var(--r12)',padding:12,boxShadow:'0 20px 60px rgba(0,0,0,.6)'}}>
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
  return<button onClick={go} style={{background:'transparent',border:'none',color:sp?'var(--em)':'var(--tx3)',cursor:'pointer',fontSize:14,padding:'2px 6px'}}>{sp?'⏹':'🔊'}</button>
}

// ── File Upload ──
function FileUpload({tid,onDone}:{tid:string;onDone:(url:string,name:string,type:string)=>void}) {
  const ref=useRef<HTMLInputElement>(null)
  const [loading,setLoading]=useState(false)
  const [showCam,setShowCam]=useState(false)
  const handle=async(file:File)=>{
    setLoading(true)
    try{
      const url=await evidenceHelpers.uploadFile(file,tid)
      const t=file.type.startsWith('image')?'image':file.type.includes('pdf')?'pdf':file.type.includes('video')?'video':'doc'
      onDone(url,file.name,t)
    }catch{alert('فشل الرفع — تأكد من وجود bucket اسمه evidences في Supabase Storage')}
    setLoading(false)
  }
  const handleB64=async(b64:string)=>{
    setLoading(true);setShowCam(false)
    try{const url=await evidenceHelpers.uploadBase64(b64,tid);onDone(url,'camera-capture.jpg','image')}
    catch{alert('فشل حفظ الصورة')}
    setLoading(false)
  }
  return(
    <>
      <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
        <button onClick={()=>ref.current?.click()} disabled={loading}
          style={{background:'rgba(59,130,246,.1)',border:'1px solid rgba(59,130,246,.2)',color:'#3b82f6',borderRadius:'var(--r8)',padding:'8px 14px',cursor:'pointer',fontSize:12,fontFamily:'var(--font)',fontWeight:700}}>
          {loading?'⏳ جاري الرفع...':'📎 رفع ملف'}
        </button>
        <button onClick={()=>setShowCam(true)} disabled={loading}
          style={{background:'rgba(16,185,129,.1)',border:'1px solid rgba(16,185,129,.2)',color:'var(--em)',borderRadius:'var(--r8)',padding:'8px 14px',cursor:'pointer',fontSize:12,fontFamily:'var(--font)',fontWeight:700}}>
          📷 كاميرا
        </button>
        <input ref={ref} type="file" accept="image/*,.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.mp4" style={{display:'none'}} onChange={e=>e.target.files?.[0]&&handle(e.target.files[0])}/>
      </div>
      <div style={{fontSize:10,color:'var(--tx3)',marginTop:4}}>يدعم: صور، PDF، Word، PowerPoint، Excel، فيديو</div>
      {showCam&&<CameraModal onCapture={handleB64} onClose={()=>setShowCam(false)}/>}
    </>
  )
}

// ── PDF Export ──
async function exportPdf(teacher:Profile,evs:Evidence[],tProfile:any) {
  const myEvs=evs.filter(e=>e.tid===teacher.id)
  const prog=calcProgress(evs,teacher.id),col=pColor(prog)
  const grouped=SECTIONS.map(s=>({sec:s,evs:myEvs.filter(e=>e.sid===s.id)})).filter(g=>g.evs.length>0)
  const allKpis=[...new Set(myEvs.flatMap(e=>e.kpis??[]))]
  const sealHtml=(tProfile?.seals??[]).map((id:string)=>{const s=SEALS_CATALOG.find(x=>x.id===id);return s?`<span class="seal">${s.icon} ${s.title}</span>`:''}).join('')
  const secHtml=grouped.map(({sec,evs:sevs})=>`
    <div class="section"><div class="sec-hd" style="border-right-color:${sec.color}"><span style="font-size:18px">${sec.icon}</span><span style="color:${sec.color};font-family:Amiri,serif;font-size:15px;font-weight:700">${sec.title}</span><span class="cnt">${sevs.length} شاهد</span></div>
    ${sevs.map(ev=>`<div class="ev"><div class="ev-hd"><span>${(ev as any).type==='image'?'🖼️':(ev as any).type==='pdf'?'📄':(ev as any).type==='link'?'🔗':'📋'}</span><strong>${ev.title}</strong>${ev.date?`<span class="badge">${ev.date}</span>`:''}</div>${ev.desc?`<div class="ev-desc">${ev.desc}</div>`:''}${(ev as any).impact?`<div class="ev-impact">📈 ${(ev as any).impact.label}: ${(ev as any).impact.pre}% → ${(ev as any).impact.post}%</div>`:''}${(ev as any).sup_rating>0?`<div style="color:#f59e0b;font-size:12px;margin-top:4px">${'⭐'.repeat((ev as any).sup_rating)} ${(ev as any).note||''}</div>`:''}</div>`).join('')}</div>`).join('')
  const html=`<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="UTF-8"/><title>ملف إنجاز — ${teacher.full_name}</title>
  <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;700;900&family=Amiri:wght@400;700&display=swap" rel="stylesheet"/>
  <style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:Cairo,sans-serif;background:#fff;color:#1a2540;print-color-adjust:exact;-webkit-print-color-adjust:exact}@page{margin:16mm;size:A4}.cover{min-height:96vh;display:flex;flex-direction:column;align-items:center;justify-content:center;background:linear-gradient(160deg,#070d1a,#0f172a);color:#fff;padding:48px;page-break-after:always;text-align:center}.gold-line{height:4px;background:linear-gradient(90deg,#a07830,#c9a84c,#e8c87a,#c9a84c,#a07830);margin-bottom:32px;border-radius:2px;width:200px}.ct{font-family:Amiri,serif;font-size:32px;color:#c9a84c;margin-bottom:12px}.cn{font-family:Amiri,serif;font-size:24px;color:#e8c87a;margin-bottom:6px}.cr{font-size:13px;color:#8aaccc}.cs{font-size:12px;color:#4a6285;margin-bottom:24px}.mb{background:rgba(255,255,255,.07);border:1px solid rgba(201,168,76,.25);border-radius:16px;padding:20px 36px}.mr{display:flex;gap:28px;justify-content:center;margin-top:10px}.mi .v{font-size:26px;font-weight:900;color:#c9a84c}.mi .l{font-size:11px;color:#8aaccc}.seals{margin-top:16px;display:flex;gap:8px;flex-wrap:wrap;justify-content:center}.seal{display:inline-flex;align-items:center;gap:4px;padding:5px 12px;border-radius:14px;background:linear-gradient(135deg,#c9a84c,#e8c87a);color:#0a0f1e;font-size:11px;font-weight:800}.section{margin-bottom:28px;page-break-inside:avoid}.sec-hd{display:flex;align-items:center;gap:10px;padding:10px 16px;border-right:4px solid #c9a84c;background:rgba(201,168,76,.05);border-radius:0 10px 10px 0;margin-bottom:10px}.cnt{font-size:11px;color:#64748b;margin-right:auto}.ev{border:1px solid #e2e8f0;border-radius:10px;padding:12px 14px;margin-bottom:8px;background:#fafbfc}.ev-hd{display:flex;align-items:center;gap:8px;margin-bottom:6px;flex-wrap:wrap}.ev-hd strong{font-size:13px;font-weight:800}.badge{display:inline-flex;padding:2px 8px;border-radius:16px;font-size:10px;font-weight:700;background:#fef9ec;color:#a07830;border:1px solid rgba(201,168,76,.3);margin:1px}.ev-desc{font-size:12px;color:#64748b;line-height:1.8;margin-top:4px}.ev-impact{font-size:11px;color:#059669;background:#ecfdf5;padding:5px 10px;border-radius:6px;margin-top:6px}.footer{text-align:center;padding:16px;border-top:2px solid #e2e8f0;color:#94a3b8;font-size:11px;margin-top:20px}</style></head>
  <body><div class="cover"><div class="gold-line"></div><div style="font-size:52px;margin-bottom:14px">📚</div>
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
  const w=window.open('','_blank');if(!w)return;w.document.write(html);w.document.close();setTimeout(()=>w.print(),900)
}

// ── Sec Progress ──
function SecProg({evs}:{evs:Evidence[]}) {
  return(
    <div style={{display:'flex',gap:4,flexWrap:'wrap',marginTop:12}}>
      {SECTIONS.map(s=>{const c=evs.filter(e=>e.sid===s.id).length;return(
        <div key={s.id} title={`${s.title}: ${c} شاهد`}
          style={{width:28,height:28,borderRadius:'var(--r8)',background:c>0?`${s.color}20`:'rgba(255,255,255,.03)',border:`1.5px solid ${c>0?s.color+'50':'rgba(255,255,255,.06)'}`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:c>0?12:9,color:c>0?s.color:'var(--tx3)',fontWeight:700,transition:'all .3s'}}>
          {c>0?s.icon:s.id}
        </div>
      )})}
    </div>
  )
}

// ══════════════════════════════════════════
// MAIN PAGE
// ══════════════════════════════════════════
export default function TeacherPage() {
  const router=useRouter()
  const {id}=useParams<{id:string}>()

  const [viewer,  setViewer]  = useState<Profile|null>(null)
  const [teacher, setTeacher] = useState<Profile|null>(null)
  const [tProf,   setTProf]   = useState<any>(null)
  const [evs,     setEvs]     = useState<Evidence[]>([])
  const [loading, setLoading] = useState(true)
  const [tab,     setTab]     = useState(1)
  const [showAdd, setShowAdd] = useState(false)
  const [showEdit,setShowEdit]= useState(false)
  const [saving,  setSaving]  = useState(false)
  const [profSav, setProfSav] = useState(false)
  const [views,   setViews]   = useState<any[]>([])
  const [showViews,setShowViews]=useState(false)

  const [form,setForm]=useState({
    title:'',desc:'',type:'doc',date:'',url:'',
    file_url:'',file_name:'',kpis:[] as string[],
    sid:1,impact:null as any,showImpact:false,
  })

  // ── Load ──
  useEffect(()=>{
    supabase.auth.getSession().then(async({data:{session}})=>{
      let v:Profile|null=null
      if(session){v=await profileHelpers.getProfile(session.user.id) as Profile;setViewer(v)}
      const[t,tp,evList]=await Promise.all([
        profileHelpers.getProfile(id),
        profileHelpers.getTeacherProfile(id),
        evidenceHelpers.getByTeacher(id),
      ])
      if(!t){router.replace('/guest');return}
      setTeacher(t as Profile);setTProf(tp);setEvs(evList as Evidence[]);setLoading(false)
      // role theme
      const role=t.role;const isDev=(t as any).is_developer
      document.documentElement.setAttribute('data-role',isDev?'developer':role)
      // track view
      try{await supabase.from('profile_views').insert({teacher_id:id,viewer_id:v?.id??null,viewer_name:v?.full_name??'زائر مجهول',opened_at:new Date().toISOString()})}catch{}
    })
  },[id,router])

  // load views
  useEffect(()=>{
    if(!viewer) return
    const isOwner=viewer.id===id
    if(isOwner||isPrivileged(viewer))
      supabase.from('profile_views').select('*').eq('teacher_id',id).order('opened_at',{ascending:false}).limit(30)
        .then(({data})=>setViews(data??[]))
  },[viewer,id])

  const prog    =useMemo(()=>calcProgress(evs,id),[evs,id])
  const tabEvs  =useMemo(()=>evs.filter(e=>e.sid===tab),[evs,tab])
  const col     =ROLE_COLORS[teacher?.role??'']??'#64748b'
  const isOwner =viewer?.id===id
  const canAdd  =isOwner||isPrivileged(viewer)

  // ── Save evidence ──
  const saveEv=useCallback(async()=>{
    if(!form.title.trim()||!viewer)return
    setSaving(true)
    const ev={id:gid(),tid:id,sid:form.sid,title:form.title,desc:form.desc,type:form.type,
      date:form.date,url:form.url,file_url:form.file_url,file_name:form.file_name,
      kpis:form.kpis,impact:form.impact,active:true,ts:Date.now(),sup_rating:0,sup_tags:[],is_verified:false,note:''}
    const saved=await evidenceHelpers.upsert(ev)
    setEvs(p=>[saved,...p])
    setForm({title:'',desc:'',type:'doc',date:'',url:'',file_url:'',file_name:'',kpis:[],sid:tab,impact:null,showImpact:false})
    setShowAdd(false);setSaving(false)
    if(typeof window!=='undefined'&&(window as any).confetti)
      (window as any).confetti({particleCount:120,spread:80,origin:{y:.65},colors:['#c9a84c','#10b981','#fff']})
  },[form,viewer,id,tab])

  const deleteEv=useCallback(async(evId:string)=>{
    if(!confirm('حذف هذا الشاهد؟'))return
    await evidenceHelpers.delete(evId);setEvs(p=>p.filter(e=>e.id!==evId))
  },[])

  const updateEv=useCallback(async(ev:Evidence)=>{
    const saved=await evidenceHelpers.upsert(ev);setEvs(p=>p.map(e=>e.id===ev.id?saved:e))
  },[])

  const saveProfile=useCallback(async(data:any)=>{
    setProfSav(true)
    await profileHelpers.upsertTeacherProfile(id,data)
    setTProf((p:any)=>({...p,...data}));setProfSav(false);setShowEdit(false)
  },[id])

  const toggleSeal=useCallback(async(sealId:string)=>{
    if(!viewer||!canAward(viewer))return
    const cur=tProf?.seals??[],has=cur.includes(sealId)
    const next=has?cur.filter((s:string)=>s!==sealId):[...cur,sealId]
    setTProf((p:any)=>({...p,seals:next}))
    if(has) await sealHelpers.revoke(id,sealId)
    else await sealHelpers.award(id,sealId,viewer.id)
    await supabase.from('teacher_profiles').update({seals:next}).eq('uid',id)
  },[viewer,tProf,id])

  if(loading) return(
    <div style={{minHeight:'100vh',background:'var(--navy)',display:'flex',alignItems:'center',justifyContent:'center'}}>
      <div className="mesh"/>
      <div style={{textAlign:'center'}}>
        <div style={{fontSize:48,marginBottom:12,animation:'spin 2s linear infinite'}}>📚</div>
        <div style={{fontFamily:'var(--serif)',color:'var(--gold)',fontSize:18}}>جاري تحميل الملف...</div>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  const sec=SECTIONS.find(s=>s.id===tab)!

  return(
    <div style={{minHeight:'100vh',background:'var(--navy)'}}>
      <div className="mesh"/>
      <script src="https://cdn.jsdelivr.net/npm/canvas-confetti@1.9.3/dist/confetti.browser.min.js"/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}[contenteditable]:empty:before{content:attr(data-placeholder);color:var(--tx3)}`}</style>

      {/* ── NAV ── */}
      <nav className="nav-bar">
        <button onClick={()=>router.back()} className="btn-ghost" style={{padding:'7px 14px',fontSize:12}}>← رجوع</button>
        <span style={{fontFamily:'var(--serif)',fontSize:16,color:'var(--role-primary)',fontWeight:700}}>{teacher?.full_name}</span>
        <div style={{display:'flex',gap:8}}>
          {canAdd&&(
            <button onClick={()=>exportPdf(teacher!,evs,tProf)} className="btn-gold" style={{padding:'7px 14px',fontSize:12}}>
              📄 PDF
            </button>
          )}
          {(isOwner||isPrivileged(viewer))&&views.length>0&&(
            <button onClick={()=>setShowViews(!showViews)} style={{background:'rgba(59,130,246,.1)',border:'1px solid rgba(59,130,246,.2)',color:'#3b82f6',borderRadius:'var(--r8)',padding:'7px 12px',cursor:'pointer',fontSize:12,fontFamily:'var(--font)'}}>
              👁 {views.length}
            </button>
          )}
          {!viewer&&<button onClick={()=>router.push('/auth')} className="btn-ghost" style={{padding:'7px 14px',fontSize:12}}>🔐 دخول</button>}
        </div>
      </nav>

      {/* Views panel */}
      {showViews&&(
        <div style={{background:'rgba(6,12,26,.98)',borderBottom:'1px solid rgba(59,130,246,.2)',padding:'12px 20px',maxWidth:960,margin:'0 auto'}}>
          <div style={{fontSize:13,color:'#3b82f6',fontWeight:700,marginBottom:8}}>👁 إحصائية الزيارات — {views.length} زيارة</div>
          <div style={{display:'flex',flexDirection:'column',gap:6,maxHeight:180,overflowY:'auto'}}>
            {views.map((v,i)=>(
              <div key={i} style={{display:'flex',alignItems:'center',gap:12,fontSize:12,color:'var(--tx2)',padding:'5px 10px',background:'rgba(255,255,255,.03)',borderRadius:'var(--r8)'}}>
                <span>{v.viewer_id?'👤':'👁'}</span>
                <span style={{flex:1,color:'var(--tx)'}}>{v.viewer_name||'زائر مجهول'}</span>
                <span style={{color:'var(--tx3)'}}>{new Date(v.opened_at).toLocaleDateString('ar-SA')} — {new Date(v.opened_at).toLocaleTimeString('ar-SA',{hour:'2-digit',minute:'2-digit'})}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="page">

        {/* ── COVER ── */}
        <div className="mag-cover anim-up" style={{marginBottom:20}}>
          <div className="mag-cover-top"/>
          <div style={{padding:24}}>
            <div style={{display:'flex',gap:20,alignItems:'flex-start',flexWrap:'wrap'}}>
              {/* Avatar + Ring */}
              <div style={{position:'relative',flexShrink:0}}>
                <div className="av" style={{width:76,height:76,background:`linear-gradient(135deg,${col},${col}88)`,fontSize:22,boxShadow:`0 8px 32px ${col}55`}}>{teacher?.av}</div>
                {/* SVG ring */}
                <svg width={90} height={90} style={{position:'absolute',top:-7,right:-7}} viewBox="0 0 90 90">
                  <circle cx={45} cy={45} r={40} fill="none" stroke="rgba(255,255,255,.07)" strokeWidth={5}/>
                  <circle cx={45} cy={45} r={40} fill="none" stroke={pColor(prog)} strokeWidth={5}
                    strokeDasharray={`${2*Math.PI*40*(prog/100)} ${2*Math.PI*40}`}
                    strokeLinecap="round" transform="rotate(-90 45 45)" style={{transition:'stroke-dasharray 1.2s ease'}}/>
                  <text x={45} y={49} textAnchor="middle" fill={pColor(prog)} fontSize={11} fontWeight={900} fontFamily="Cairo,sans-serif">{prog}%</text>
                </svg>
              </div>

              <div style={{flex:1,minWidth:200}}>
                <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:4,flexWrap:'wrap'}}>
                  <h1 style={{fontFamily:'var(--serif)',fontSize:22,color:'var(--role-primary)',fontWeight:700}}>{teacher?.full_name}</h1>
                  {(teacher as any)?.is_developer&&<span className="badge badge-info" style={{fontSize:10}}>🛠 مطور</span>}
                </div>
                <p style={{color:'var(--tx3)',fontSize:12,marginBottom:14}}>{ROLE_LABELS[teacher?.role??'']} • {SCHOOL} • {TERM}</p>

                {/* Stats */}
                <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
                  {[{v:evs.length,l:'شاهد',c:'var(--role-primary)'},{v:`${prog}%`,l:'الإنجاز',c:pColor(prog)},{v:`${new Set(evs.map(e=>e.sid)).size}/${N_SEC}`,l:'قسم',c:'var(--em)'},{v:new Set(evs.flatMap(e=>e.kpis??[])).size,l:'معيار',c:'var(--pu)'}].map((s,i)=>(
                    <div key={i} className="stat-card" style={{padding:'8px 14px',minWidth:60}}>
                      <div className="stat-val" style={{fontSize:17,color:s.c}}>{s.v}</div>
                      <div className="stat-lbl">{s.l}</div>
                    </div>
                  ))}
                  {tProf?.phone&&<div className="stat-card" style={{padding:'8px 14px'}}>
                    <div style={{fontSize:12,color:'var(--tx2)',direction:'ltr'}}>{tProf.phone}</div>
                    <div className="stat-lbl">جوال</div>
                  </div>}
                </div>

                <SecProg evs={evs}/>
              </div>

              {/* Actions */}
              {(isOwner||isPrivileged(viewer))&&(
                <div style={{display:'flex',flexDirection:'column',gap:6}}>
                  {isOwner&&<button onClick={()=>setShowEdit(true)} className="btn-ghost" style={{padding:'7px 14px',fontSize:12,whiteSpace:'nowrap'}}>✏️ تعديل الملف</button>}
                </div>
              )}
            </div>

            {/* Bio */}
            {tProf?.bio&&(
              <div style={{marginTop:16,paddingTop:14,borderTop:'1px solid var(--bd)'}}>
                <div style={{fontSize:12,color:'var(--tx2)',lineHeight:1.9}} dangerouslySetInnerHTML={{__html:tProf.bio}}/>
              </div>
            )}

            {/* Seals */}
            {(tProf?.seals?.length>0||canAward(viewer))&&(
              <div style={{marginTop:16,paddingTop:14,borderTop:'1px solid var(--bd)'}}>
                <div style={{fontSize:11,color:'var(--tx3)',marginBottom:8,fontWeight:700}}>🏅 الأختام الذهبية</div>
                <div style={{display:'flex',gap:7,flexWrap:'wrap'}}>
                  {SEALS_CATALOG.map(seal=>{
                    const has=tProf?.seals?.includes(seal.id)
                    return(
                      <button key={seal.id} onClick={()=>canAward(viewer)&&toggleSeal(seal.id)}
                        style={{background:has?'var(--gold-pale)':'rgba(255,255,255,.03)',border:has?'1px solid rgba(201,168,76,.4)':'1px solid var(--bd)',borderRadius:20,padding:'5px 12px',fontSize:12,color:has?'var(--gold)':'var(--tx3)',cursor:canAward(viewer)?'pointer':'default',display:'flex',alignItems:'center',gap:4,transition:'all .2s',fontFamily:'var(--font)'}}>
                        {seal.icon} {seal.title} {has&&<span style={{fontSize:10}}>✓</span>}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── KPI DOMAINS ── */}
        <div className="glass3 anim-up" style={{padding:'14px 18px',marginBottom:16}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
            <span style={{fontSize:13,color:'var(--role-primary)',fontWeight:700,fontFamily:'var(--serif)'}}>🎯 تغطية المعايير المهنية</span>
            <span className="badge-role badge" style={{fontSize:10}}>{new Set(evs.flatMap(e=>e.kpis??[])).size} / {KPI_STANDARDS.length}</span>
          </div>
          <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
            {[1,2,3,4,5].map(d=>{
              const ds=KPI_STANDARDS.filter(k=>k.domain===d)
              const cov=ds.filter(k=>evs.some(e=>e.kpis?.includes(k.id))).length
              const c=ds[0]?.color??'#64748b'
              return(
                <div key={d} style={{flex:1,minWidth:110,background:`${c}08`,border:`1px solid ${c}25`,borderRadius:'var(--r12)',padding:'8px 12px'}}>
                  <div style={{fontSize:10,color:c,fontWeight:800,marginBottom:4,lineHeight:1.2}}>{ds[0]?.domainName}</div>
                  <div className="prog-track" style={{height:4}}><div className="prog-fill" style={{width:`${(cov/ds.length)*100}%`,background:c}}/></div>
                  <div style={{display:'flex',justifyContent:'space-between',fontSize:10,color:'var(--tx3)',marginTop:4}}>
                    <span>{cov}/{ds.length}</span><span style={{color:c,fontWeight:700}}>{Math.round((cov/ds.length)*100)}%</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* ── SECTION TABS ── */}
        <div style={{display:'flex',gap:6,overflowX:'auto',paddingBottom:8,marginBottom:16,scrollbarWidth:'none'}}>
          {SECTIONS.map(s=>{
            const cnt=evs.filter(e=>e.sid===s.id).length,active=tab===s.id
            return(
              <button key={s.id} onClick={()=>setTab(s.id)}
                style={{flexShrink:0,background:active?`${s.color}18`:'rgba(255,255,255,.03)',border:active?`1.5px solid ${s.color}50`:'1px solid var(--bd)',borderRadius:20,padding:'6px 14px',cursor:'pointer',fontFamily:'var(--font)',fontSize:12,color:active?s.color:'var(--tx3)',display:'flex',alignItems:'center',gap:6,transition:'all .2s'}}>
                {s.icon}<span style={{whiteSpace:'nowrap'}}>{s.title}</span>
                {cnt>0&&<span style={{background:active?s.color:'var(--navy4)',color:active?'#fff':'var(--tx3)',borderRadius:10,padding:'0 6px',fontSize:10,fontWeight:700}}>{cnt}</span>}
              </button>
            )
          })}
        </div>

        {/* ── SECTION CONTENT ── */}
        <div className="glass3 anim-up" style={{overflow:'hidden'}}>
          <div style={{height:3,background:`linear-gradient(90deg,${sec.color},${sec.color}40)`}}/>

          {/* Section header */}
          <div style={{padding:'14px 18px',display:'flex',alignItems:'center',justifyContent:'space-between',borderBottom:`1px solid ${sec.color}15`,background:`${sec.color}06`}}>
            <div style={{display:'flex',alignItems:'center',gap:10}}>
              <span style={{fontSize:22}}>{sec.icon}</span>
              <span style={{fontFamily:'var(--serif)',fontSize:16,color:sec.color,fontWeight:700}}>{sec.title}</span>
              <span className="badge" style={{background:`${sec.color}15`,color:sec.color,border:`1px solid ${sec.color}25`,fontSize:10}}>{tabEvs.length} شاهد</span>
            </div>
            {canAdd&&<button onClick={()=>{setForm(f=>({...f,sid:tab}));setShowAdd(true)}}
              style={{background:`linear-gradient(135deg,${sec.color},${sec.color}88)`,border:'none',borderRadius:'var(--r10)',padding:'7px 14px',color:'#fff',cursor:'pointer',fontFamily:'var(--font)',fontSize:12,fontWeight:700}}>
              + إضافة شاهد
            </button>}
          </div>

          {/* Hint */}
          {SECTION_HINTS[tab]&&tabEvs.length===0&&(
            <div style={{padding:'0 16px',marginTop:12}}>
              <div className="hint-box">
                💡 <strong>إرشاد:</strong> {SECTION_HINTS[tab]}
              </div>
            </div>
          )}

          {/* Evidence list */}
          <div style={{padding:16}}>
            {tabEvs.length===0?(
              <div style={{textAlign:'center',padding:'40px 0',color:'var(--tx3)'}}>
                <div style={{fontSize:40,marginBottom:10}}>📂</div>
                <p style={{fontSize:14}}>لا توجد شواهد في هذا القسم بعد</p>
                {canAdd&&<p style={{fontSize:12,marginTop:4,color:'var(--tx3)'}}>اضغط "+ إضافة شاهد" للبدء</p>}
              </div>
            ):(
              <div style={{display:'flex',flexDirection:'column',gap:12}}>
                {tabEvs.map(ev=>{
                  const ti=TYPE_INFO[ev.type]??TYPE_INFO.doc
                  return(
                    <div key={ev.id} className="ev-card">
                      <div style={{display:'flex',alignItems:'flex-start',gap:12}}>
                        <div style={{flex:1,minWidth:0}}>
                          {/* Header */}
                          <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:8,flexWrap:'wrap'}}>
                            <span style={{fontSize:18}}>{ti.icon}</span>
                            <span style={{fontWeight:700,fontSize:14,color:'var(--tx)'}}>{ev.title}</span>
                            {ev.date&&<span className="badge" style={{background:'rgba(255,255,255,.04)',color:'var(--tx3)',border:'1px solid var(--bd)',fontSize:10}}>📅 {ev.date}</span>}
                            {ev.is_verified&&<span className="badge badge-em" style={{fontSize:10}}>✅ معتمد</span>}
                            {ev.file_name&&<span className="badge badge-pu" style={{fontSize:10}}>📎 {ev.file_name.slice(0,20)}</span>}
                          </div>

                          {/* KPIs */}
                          {(ev.kpis?.length??0)>0&&(
                            <div style={{display:'flex',gap:4,flexWrap:'wrap',marginBottom:8}}>
                              {ev.kpis?.map(kId=>{const k=KPI_STANDARDS.find(x=>x.id===kId);return k?<span key={kId} className="kpi-chip" style={{background:`${k.color}15`,color:k.color,border:`1px solid ${k.color}25`}}>{k.code} {k.name}</span>:null})}
                            </div>
                          )}

                          {/* Desc */}
                          {ev.desc&&<div style={{fontSize:12,color:'var(--tx2)',lineHeight:1.9,marginBottom:8}} dangerouslySetInnerHTML={{__html:ev.desc}}/>}

                          {/* Media */}
                          {ev.url&&ev.type==='link'&&<a href={ev.url} target="_blank" rel="noreferrer" style={{color:'var(--info)',fontSize:12,display:'inline-flex',alignItems:'center',gap:4}}>🔗 فتح الرابط</a>}
                          {ev.file_url&&ev.type==='image'&&<img src={ev.file_url} alt={ev.title} style={{maxHeight:220,borderRadius:'var(--r12)',objectFit:'cover',width:'100%',marginTop:8}}/>}
                          {ev.file_url&&ev.type==='pdf'&&(
                            <a href={ev.file_url} target="_blank" rel="noreferrer" className="pdf-preview-icon" style={{display:'inline-flex',marginTop:8,textDecoration:'none'}}>
                              <span style={{fontSize:24}}>📄</span>
                              <div><div style={{fontSize:13,color:'var(--danger)',fontWeight:700}}>ملف PDF</div><div style={{fontSize:11,color:'var(--tx3)'}}>{ev.file_name}</div></div>
                            </a>
                          )}
                          {ev.file_url&&ev.type==='doc'&&(
                            <a href={ev.file_url} target="_blank" rel="noreferrer" style={{display:'inline-flex',alignItems:'center',gap:8,marginTop:8,color:'var(--info)',fontSize:12,background:'rgba(59,130,246,.08)',padding:'8px 14px',borderRadius:'var(--r8)',textDecoration:'none'}}>
                              📋 تحميل {ev.file_name}
                            </a>
                          )}

                          <ImpactViz impact={(ev as any).impact} canEdit={canAdd} onChange={impact=>updateEv({...ev,impact} as Evidence)}/>
                          <SupRating ev={ev} viewer={viewer} onSave={updateEv}/>
                        </div>

                        {/* Actions */}
                        <div style={{display:'flex',flexDirection:'column',gap:6,flexShrink:0}}>
                          <Voice text={ev.title+'. '+(ev.desc??'')}/>
                          <QR text={ev.file_url||ev.url||`https://injaz-platform-4gv0vy9ho-osamacfcs-projects.vercel.app/teacher/${id}`}/>
                          {(isOwner||isPrivileged(viewer))&&(
                            <button onClick={()=>deleteEv(ev.id)} className="btn-danger" style={{padding:'4px 10px',fontSize:11}}>حذف</button>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── MODAL: إضافة شاهد ── */}
      {showAdd&&(
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setShowAdd(false)}>
          <div className="modal-box">
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
              <h3 style={{fontFamily:'var(--serif)',color:'var(--gold)',fontSize:18}}>إضافة شاهد جديد</h3>
              <button onClick={()=>setShowAdd(false)} className="btn-ghost" style={{padding:'6px 12px',fontSize:14}}>✕</button>
            </div>

            {/* القسم */}
            <div style={{marginBottom:14}}>
              <label style={{fontSize:12,color:'var(--tx3)',display:'block',marginBottom:6}}>القسم</label>
              <select value={form.sid} onChange={e=>setForm(f=>({...f,sid:+e.target.value}))} className="inp">
                {SECTIONS.map(s=><option key={s.id} value={s.id}>{s.icon} {s.title}</option>)}
              </select>
            </div>

            {/* Hint */}
            {SECTION_HINTS[form.sid]&&(
              <div className="hint-box" style={{marginBottom:14}}>
                💡 {SECTION_HINTS[form.sid]}
              </div>
            )}

            {/* العنوان */}
            <div style={{marginBottom:14}}>
              <label style={{fontSize:12,color:'var(--tx3)',display:'block',marginBottom:6}}>عنوان الشاهد *</label>
              <input className="inp" value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))} placeholder="مثال: نشاط صفي إبداعي في تحفيظ القرآن"/>
            </div>

            {/* النوع */}
            <div style={{marginBottom:14}}>
              <label style={{fontSize:12,color:'var(--tx3)',display:'block',marginBottom:6}}>نوع الشاهد</label>
              <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                {Object.entries(TYPE_INFO).map(([t,info])=>(
                  <button key={t} onClick={()=>setForm(f=>({...f,type:t}))}
                    style={{flex:1,minWidth:70,padding:'8px 6px',background:form.type===t?`${info.color}15`:'rgba(255,255,255,.03)',border:form.type===t?`1.5px solid ${info.color}50`:'1px solid var(--bd)',borderRadius:'var(--r10)',color:form.type===t?info.color:'var(--tx3)',cursor:'pointer',fontFamily:'var(--font)',fontSize:11,transition:'all .2s'}}>
                    {info.icon}<br/><span style={{fontSize:10}}>{info.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* رفع ملف */}
            {['image','pdf','video','doc'].includes(form.type)&&(
              <div style={{marginBottom:14}}>
                <label style={{fontSize:12,color:'var(--tx3)',display:'block',marginBottom:6}}>الملف</label>
                <FileUpload tid={id} onDone={(url,name,t)=>{setForm(f=>({...f,file_url:url,file_name:name,type:t}))}}/>
                {form.file_url&&<div style={{marginTop:8,fontSize:11,color:'var(--em)'}}>✅ تم الرفع: {form.file_name}</div>}
              </div>
            )}

            {/* رابط */}
            {form.type==='link'&&(
              <div style={{marginBottom:14}}>
                <label style={{fontSize:12,color:'var(--tx3)',display:'block',marginBottom:6}}>الرابط</label>
                <input className="inp" value={form.url} onChange={e=>setForm(f=>({...f,url:e.target.value}))} placeholder="https://..." style={{direction:'ltr'}}/>
              </div>
            )}

            {/* التاريخ */}
            <div style={{marginBottom:14}}>
              <label style={{fontSize:12,color:'var(--tx3)',display:'block',marginBottom:6}}>التاريخ (هجري)</label>
              <input className="inp" value={form.date} onChange={e=>setForm(f=>({...f,date:e.target.value}))} placeholder="مثال: 15/8/1447"/>
            </div>

            {/* الوصف RTE */}
            <div style={{marginBottom:14}}>
              <label style={{fontSize:12,color:'var(--tx3)',display:'block',marginBottom:6}}>الوصف</label>
              <RTE value={form.desc} onChange={v=>setForm(f=>({...f,desc:v}))} placeholder="اكتب وصفاً تفصيلياً للشاهد..."/>
            </div>

            {/* المعايير */}
            <div style={{marginBottom:14}}>
              <label style={{fontSize:12,color:'var(--tx3)',display:'block',marginBottom:8}}>المعايير المهنية المرتبطة</label>
              <div style={{display:'flex',gap:5,flexWrap:'wrap'}}>
                {KPI_STANDARDS.map(k=>{const sel=form.kpis.includes(k.id);return(
                  <button key={k.id} onClick={()=>setForm(f=>({...f,kpis:sel?f.kpis.filter(x=>x!==k.id):[...f.kpis,k.id]}))}
                    style={{background:sel?`${k.color}20`:'rgba(255,255,255,.03)',border:sel?`1px solid ${k.color}40`:'1px solid var(--bd)',borderRadius:20,padding:'4px 10px',fontSize:11,color:sel?k.color:'var(--tx3)',cursor:'pointer',transition:'all .2s',fontFamily:'var(--font)'}}>
                    {k.code}
                  </button>
                )})}
              </div>
            </div>

            {/* Impact toggle */}
            <div style={{marginBottom:16}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:form.showImpact?8:0}}>
                <label style={{fontSize:12,color:'var(--tx3)'}}>مؤشر الأثر على المتعلمين</label>
                <button onClick={()=>setForm(f=>({...f,showImpact:!f.showImpact}))}
                  style={{background:'rgba(16,185,129,.1)',border:'1px solid rgba(16,185,129,.2)',color:'var(--em)',borderRadius:'var(--r8)',padding:'4px 10px',cursor:'pointer',fontSize:11,fontFamily:'var(--font)'}}>
                  {form.showImpact?'إغلاق':'+ إضافة مؤشر'}
                </button>
              </div>
              {form.showImpact&&<ImpactViz impact={form.impact} canEdit onChange={v=>setForm(f=>({...f,impact:v}))}/>}
            </div>

            {/* Save */}
            <div style={{display:'flex',gap:10}}>
              <button onClick={saveEv} disabled={saving||!form.title.trim()} className="btn-role"
                style={{flex:1,padding:'12px 0',fontSize:14,opacity:!form.title.trim()?.5:1}}>
                {saving?'⏳ جاري الحفظ...':'💾 حفظ الشاهد'}
              </button>
              <button onClick={()=>setShowAdd(false)} className="btn-ghost" style={{padding:'12px 18px',fontSize:14}}>إلغاء</button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: تعديل الملف الشخصي ── */}
      {showEdit&&(
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setShowEdit(false)}>
          <div className="modal-box" style={{maxWidth:640}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
              <h3 style={{fontFamily:'var(--serif)',color:'var(--gold)',fontSize:18}}>✏️ تعديل الملف الشخصي</h3>
              <button onClick={()=>setShowEdit(false)} className="btn-ghost" style={{padding:'6px 12px',fontSize:14}}>✕</button>
            </div>
            <PersonalEditor tProfile={tProf} onSave={saveProfile} saving={profSav}/>
          </div>
        </div>
      )}
    </div>
  )
}
