'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { authHelpers } from '@/lib/supabase'
import { SCHOOL, TERM, VER } from '@/lib/constants'

export default function AuthPage() {
  const [tab,      setTab]      = useState<'login' | 'signup'>('login')
  const [email,    setEmail]    = useState('')
  const [pass,     setPass]     = useState('')
  const [fullName, setFullName] = useState('')
  const [showP,    setShowP]    = useState(false)
  const [loading,  setLoading]  = useState(false)
  const [err,      setErr]      = useState('')
  const [info,     setInfo]     = useState('')
  const router = useRouter()

  const strength = pass.length === 0 ? 0 : pass.length < 6 ? 1 : pass.length < 10 ? 2 : 3
  const strengthColors = ['', '#ef4444', '#f59e0b', '#10b981']
  const strengthLabels = ['', 'ضعيفة', 'مقبولة', 'قوية']

  const doLogin = async () => {
    if (!email || !pass) { setErr('أدخل البريد وكلمة المرور'); return }
    setLoading(true); setErr('')
    try {
      await authHelpers.signIn(email, pass)
      router.replace('/')
    } catch (e: any) {
      const msg = e.message ?? ''
      if (msg.includes('Invalid') || msg.includes('invalid_credentials'))
        setErr('البريد أو كلمة المرور غير صحيحة')
      else if (msg.includes('Email not confirmed'))
        setErr('يرجى تفعيل حسابك من رابط البريد الإلكتروني')
      else setErr(msg || 'حدث خطأ')
    }
    setLoading(false)
  }

  const doSignUp = async () => {
    if (fullName.trim().split(' ').filter(Boolean).length < 2)
      { setErr('أدخل الاسم الثلاثي كاملاً'); return }
    if (!email.includes('@')) { setErr('البريد الإلكتروني غير صحيح'); return }
    if (pass.length < 6) { setErr('كلمة المرور 6 أحرف على الأقل'); return }
    setLoading(true); setErr(''); setInfo('')
    try {
      await authHelpers.signUp(email, pass, fullName.trim())
      setInfo(`✅ تم إنشاء حسابك يا ${fullName.trim().split(' ')[0]}! تحقق من بريدك لتفعيل الحساب.`)
      setTab('login')
    } catch (e: any) {
      setErr(e.message?.includes('already') ? 'هذا البريد مسجّل مسبقاً' : e.message || 'خطأ')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-5">
      <div className="mesh-bg" />
      {/* Blobs */}
      <div className="blob" style={{ width: 500, height: 500, background: 'radial-gradient(circle,#c9a84c,transparent 70%)', top: -150, right: -150 }} />
      <div className="blob" style={{ width: 400, height: 400, background: 'radial-gradient(circle,#10b981,transparent 70%)', bottom: -100, left: -100, animationDelay: '-5s' }} />

      <div className="relative z-10 w-full max-w-md">
        {/* Brand */}
        <div className="animate-fade-up text-center mb-8">
          <div className="text-5xl mb-3 animate-float">📚</div>
          <h1 style={{ fontFamily: 'Amiri, serif', fontSize: 28, fontWeight: 700, color: 'var(--gold)', marginBottom: 4 }}>
            منصة إنجاز تحفيظ عيبان
          </h1>
          <p style={{ color: 'var(--tx2)', fontSize: 13 }}>{SCHOOL}</p>
          <p style={{ color: 'var(--tx3)', fontSize: 12, marginTop: 2 }}>{TERM}</p>
          <div className="flex justify-center gap-2 mt-3 flex-wrap">
            {[`v${VER}`, '☁️ Supabase', 'KPI+Seals', 'Real-time'].map(t => (
              <span key={t} className="badge" style={{ background: 'var(--gold-pale)', color: 'var(--gold)', border: '1px solid rgba(201,168,76,.3)', fontSize: 10 }}>{t}</span>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-4 p-1 rounded-2xl" style={{ background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.06)' }}>
          {(['login', 'signup'] as const).map(t => (
            <button key={t} onClick={() => { setTab(t); setErr(''); setInfo('') }}
              className="flex-1 py-2 rounded-xl font-bold text-sm transition-all"
              style={{
                fontFamily: 'Cairo, sans-serif', border: 'none', cursor: 'pointer',
                background: tab === t ? 'var(--gold-pale)' : 'transparent',
                color:      tab === t ? 'var(--gold)'      : 'var(--tx2)',
                borderBottom: tab === t ? '2px solid var(--gold)' : '2px solid transparent',
              }}>
              {t === 'login' ? '🔐 دخول' : '✨ حساب جديد'}
            </button>
          ))}
        </div>

        {info && (
          <div className="mb-4 p-3 rounded-xl text-sm" style={{ background: 'rgba(16,185,129,.1)', border: '1px solid rgba(16,185,129,.3)', color: 'var(--em)' }}>
            {info}
          </div>
        )}
        {err && (
          <div className="mb-4 p-3 rounded-xl text-sm flex gap-2 items-center" style={{ background: 'rgba(239,68,68,.1)', border: '1px solid rgba(239,68,68,.3)', color: 'var(--danger)' }}>
            ⚠️ {err}
          </div>
        )}

        {/* Login */}
        {tab === 'login' && (
          <div className="glass2 animate-fade-up rounded-2xl p-7">
            <div className="mb-4">
              <label className="block text-xs font-black mb-1.5 tracking-widest uppercase" style={{ color: 'var(--gold)' }}>البريد الإلكتروني</label>
              <div className="relative">
                <input className="inp" type="email" placeholder="your@email.com" value={email}
                  onChange={e => { setEmail(e.target.value); setErr('') }}
                  onKeyDown={e => e.key === 'Enter' && doLogin()}
                  style={{ paddingRight: 44 }} />
                <span className="absolute top-1/2 -translate-y-1/2" style={{ right: 14, color: 'var(--tx3)', pointerEvents: 'none' }}>👤</span>
              </div>
            </div>
            <div className="mb-6">
              <label className="block text-xs font-black mb-1.5 tracking-widest uppercase" style={{ color: 'var(--gold)' }}>كلمة المرور</label>
              <div className="relative">
                <input className="inp" type={showP ? 'text' : 'password'} placeholder="كلمة المرور" value={pass}
                  onChange={e => { setPass(e.target.value); setErr('') }}
                  onKeyDown={e => e.key === 'Enter' && doLogin()}
                  style={{ paddingRight: 44, paddingLeft: 44 }} />
                <span className="absolute top-1/2 -translate-y-1/2" style={{ right: 14, color: 'var(--tx3)', pointerEvents: 'none' }}>🔒</span>
                <button onClick={() => setShowP(!showP)}
                  className="absolute top-1/2 -translate-y-1/2 bg-transparent border-none cursor-pointer"
                  style={{ left: 14, color: 'var(--tx3)' }}>
                  {showP ? '🙈' : '👁'}
                </button>
              </div>
            </div>
            <button className="btn btn-gold w-full justify-center text-base py-3" onClick={doLogin} disabled={loading}>
              {loading ? <><Spinner /> جاري التحقق...</> : <>دخول →</>}
            </button>
            <div className="text-center mt-4 text-xs" style={{ color: 'var(--tx3)' }}>
              ليس لديك حساب؟{' '}
              <button onClick={() => { setTab('signup'); setErr('') }}
                className="bg-transparent border-none cursor-pointer font-bold"
                style={{ color: 'var(--gold)', fontFamily: 'Cairo, sans-serif', fontSize: 12 }}>
                سجّل اسمك الآن
              </button>
            </div>
            {/* Guest */}
            <div className="mt-4 p-3 rounded-xl text-center" style={{ background: 'rgba(16,185,129,.05)', border: '1px solid rgba(16,185,129,.15)' }}>
              <div className="text-xs mb-2" style={{ color: 'var(--tx3)' }}>تريد تصفح الملفات بدون تسجيل دخول؟</div>
              <button className="btn w-full justify-center" onClick={() => router.push('/guest')}
                style={{ background: 'linear-gradient(135deg,var(--em),var(--em-d))', color: '#fff', fontFamily: 'Cairo, sans-serif' }}>
                👁 دخول كزائر — عرض الملفات
              </button>
            </div>
          </div>
        )}

        {/* SignUp */}
        {tab === 'signup' && (
          <div className="glass2 animate-fade-up rounded-2xl p-7">
            <div className="p-3 rounded-xl mb-5 text-xs" style={{ background: 'rgba(201,168,76,.06)', border: '1px solid rgba(201,168,76,.15)', color: 'var(--gold)' }}>
              🏫 إنشاء حساب ضمن منصة {SCHOOL}
            </div>
            <div className="mb-4">
              <label className="block text-xs font-black mb-1.5 tracking-widest uppercase" style={{ color: 'var(--gold)' }}>الاسم الثلاثي الكامل</label>
              <input className="inp" type="text" placeholder="مثال: أسامة حيان المالكي" value={fullName}
                onChange={e => { setFullName(e.target.value); setErr('') }} />
              <p className="text-xs mt-1" style={{ color: 'var(--tx3)' }}>يُستخدم في ملف الإنجاز وشهادات التقدير</p>
            </div>
            <div className="mb-4">
              <label className="block text-xs font-black mb-1.5 tracking-widest uppercase" style={{ color: 'var(--gold)' }}>البريد الإلكتروني</label>
              <input className="inp" type="email" placeholder="your@email.com" value={email}
                onChange={e => { setEmail(e.target.value); setErr('') }} />
            </div>
            <div className="mb-6">
              <label className="block text-xs font-black mb-1.5 tracking-widest uppercase" style={{ color: 'var(--gold)' }}>كلمة المرور</label>
              <div className="relative">
                <input className="inp" type={showP ? 'text' : 'password'} placeholder="اختر كلمة مرور قوية" value={pass}
                  onChange={e => { setPass(e.target.value); setErr('') }}
                  style={{ paddingLeft: 44 }} />
                <button onClick={() => setShowP(!showP)}
                  className="absolute top-1/2 -translate-y-1/2 bg-transparent border-none cursor-pointer"
                  style={{ left: 14, color: 'var(--tx3)' }}>
                  {showP ? '🙈' : '👁'}
                </button>
              </div>
              {pass.length > 0 && (
                <div className="flex gap-1 mt-2 items-center">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="flex-1 h-1 rounded-full transition-all"
                      style={{ background: strength >= i ? strengthColors[strength] : 'rgba(255,255,255,.1)' }} />
                  ))}
                  <span className="text-xs mr-1" style={{ color: strengthColors[strength], minWidth: 40 }}>
                    {strengthLabels[strength]}
                  </span>
                </div>
              )}
            </div>
            <button className="btn btn-gold w-full justify-center text-base py-3" onClick={doSignUp} disabled={loading}>
              {loading ? <><Spinner /> جاري الإنشاء...</> : 'إنشاء الحساب ✨'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function Spinner() {
  return (
    <span className="inline-block w-4 h-4 border-2 rounded-full animate-spin"
      style={{ borderColor: 'rgba(0,0,0,.2)', borderTopColor: '#000' }} />
  )
}
