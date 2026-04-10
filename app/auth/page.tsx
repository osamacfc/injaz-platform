'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { authHelpers } from '@/lib/supabase'
import { SCHOOL, TERM } from '@/lib/constants'

export default function AuthPage() {
  const router = useRouter()
  const [mode, setMode] = useState<'login'|'signup'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')
  const [showPass, setShowPass] = useState(false)

  const submit = async () => {
    if (!email || !password) { setErr('أدخل البريد وكلمة المرور'); return }
    if (mode === 'signup' && !name.trim()) { setErr('أدخل اسمك الثلاثي'); return }
    setLoading(true); setErr('')
    try {
      if (mode === 'login') {
        const { session } = await authHelpers.signIn(email, password)
        if (session) router.replace('/dashboard')
      } else {
        await authHelpers.signUp(email, password, name)
        setErr('✅ تم إنشاء الحساب — تحقق من بريدك لتأكيد التسجيل')
        setMode('login')
      }
    } catch(e:any) {
      const m = e?.message ?? ''
      if (m.includes('Invalid login')) setErr('بريد أو كلمة مرور غير صحيحة')
      else if (m.includes('Email not confirmed')) setErr('يرجى تأكيد بريدك الإلكتروني أولاً')
      else if (m.includes('already registered')) setErr('هذا البريد مسجّل مسبقاً')
      else setErr(m || 'حدث خطأ، حاول مرة أخرى')
    }
    setLoading(false)
  }

  return (
    <div style={{minHeight:'100vh',background:'var(--navy)',display:'flex',alignItems:'center',justifyContent:'center',padding:16}}>
      <div className="mesh"/>

      {/* Decorative blobs */}
      <div style={{position:'fixed',top:'-20%',right:'-10%',width:500,height:500,background:'radial-gradient(circle,rgba(201,168,76,.08),transparent 70%)',borderRadius:'50%',pointerEvents:'none'}}/>
      <div style={{position:'fixed',bottom:'-20%',left:'-10%',width:400,height:400,background:'radial-gradient(circle,rgba(16,185,129,.06),transparent 70%)',borderRadius:'50%',pointerEvents:'none'}}/>

      <div style={{width:'100%',maxWidth:420}} className="anim-up">

        {/* Logo */}
        <div style={{textAlign:'center',marginBottom:36}}>
          <div style={{width:72,height:72,borderRadius:20,background:'linear-gradient(135deg,var(--gold-d),var(--gold))',display:'flex',alignItems:'center',justifyContent:'center',fontSize:32,margin:'0 auto 16px',boxShadow:'0 8px 40px rgba(201,168,76,.35)'}}>📚</div>
          <h1 style={{fontFamily:'var(--serif)',fontSize:26,color:'var(--gold)',marginBottom:4}}>منصة إنجاز</h1>
          <p style={{fontSize:12,color:'var(--tx3)'}}>{SCHOOL}</p>
          <p style={{fontSize:11,color:'var(--tx3)',marginTop:2,opacity:.6}}>{TERM}</p>
        </div>

        {/* Card */}
        <div className="glass" style={{padding:28}}>

          {/* Tabs */}
          <div style={{display:'flex',background:'rgba(255,255,255,.04)',borderRadius:12,padding:3,marginBottom:24}}>
            {[{k:'login',l:'تسجيل الدخول'},{k:'signup',l:'حساب جديد'}].map(t=>(
              <button key={t.k} onClick={()=>{setMode(t.k as any);setErr('')}}
                style={{flex:1,padding:'9px 0',borderRadius:10,border:'none',cursor:'pointer',fontFamily:'var(--font)',fontSize:13,fontWeight:700,transition:'all .2s',
                  background:mode===t.k?'linear-gradient(135deg,var(--gold-d),var(--gold))':'transparent',
                  color:mode===t.k?'#000':'var(--tx3)'}}>
                {t.l}
              </button>
            ))}
          </div>

          {/* Fields */}
          <div style={{display:'flex',flexDirection:'column',gap:14}}>
            {mode==='signup'&&(
              <div>
                <label style={{fontSize:12,color:'var(--tx3)',display:'block',marginBottom:6}}>الاسم الثلاثي</label>
                <input className="inp" value={name} onChange={e=>setName(e.target.value)} placeholder="مثال: محمد أحمد الغزواني"/>
              </div>
            )}
            <div>
              <label style={{fontSize:12,color:'var(--tx3)',display:'block',marginBottom:6}}>البريد الإلكتروني</label>
              <input className="inp" type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="osama@injaz.sa" onKeyDown={e=>e.key==='Enter'&&submit()}/>
            </div>
            <div>
              <label style={{fontSize:12,color:'var(--tx3)',display:'block',marginBottom:6}}>كلمة المرور</label>
              <div style={{position:'relative'}}>
                <input className="inp" type={showPass?'text':'password'} value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••••••" onKeyDown={e=>e.key==='Enter'&&submit()} style={{paddingLeft:40}}/>
                <button onClick={()=>setShowPass(!showPass)} style={{position:'absolute',left:12,top:'50%',transform:'translateY(-50%)',background:'none',border:'none',color:'var(--tx3)',cursor:'pointer',fontSize:14,padding:0}}>
                  {showPass?'🙈':'👁'}
                </button>
              </div>
            </div>
          </div>

          {/* Error */}
          {err&&(
            <div style={{marginTop:14,padding:'10px 14px',borderRadius:10,background:err.startsWith('✅')?'rgba(16,185,129,.1)':'rgba(239,68,68,.1)',border:`1px solid ${err.startsWith('✅')?'rgba(16,185,129,.2)':'rgba(239,68,68,.2)'}`,fontSize:12,color:err.startsWith('✅')?'var(--em)':'var(--danger)'}}>
              {err}
            </div>
          )}

          {/* Submit */}
          <button onClick={submit} disabled={loading} className="btn-gold"
            style={{width:'100%',padding:'13px 0',marginTop:20,fontSize:15,borderRadius:12,opacity:loading?.6:1}}>
            {loading?'⏳ جاري التحقق...':(mode==='login'?'دخول ←':'إنشاء حساب ←')}
          </button>

          {/* Divider */}
          <div style={{display:'flex',alignItems:'center',gap:12,margin:'20px 0'}}>
            <div className="sep" style={{flex:1}}/>
            <span style={{fontSize:11,color:'var(--tx3)'}}>أو</span>
            <div className="sep" style={{flex:1}}/>
          </div>

          {/* Guest */}
          <button onClick={()=>router.push('/guest')} className="btn-ghost"
            style={{width:'100%',padding:'11px 0',fontSize:13,borderRadius:12}}>
            👁 دخول كزائر — عرض الملفات العامة
          </button>
        </div>

        {/* Footer */}
        <p style={{textAlign:'center',fontSize:11,color:'var(--tx3)',marginTop:20,opacity:.6}}>
          منصة إنجاز تحفيظ عيبان v9.0 — جميع الحقوق محفوظة
        </p>
      </div>
    </div>
  )
}
