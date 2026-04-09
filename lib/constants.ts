// ══════════════════════════════════════════════
// منصة إنجاز تحفيظ عيبان — Types & Constants
// ══════════════════════════════════════════════

export const SCHOOL = 'مدرسة تحفيظ عيبان الابتدائية والمتوسطة'
export const TERM   = 'الفصل الدراسي الثاني 1447هـ'
export const VER    = '6.0.0'
export const N_SEC  = 13

// ── Roles ──
export const ROLE_LABELS: Record<string, string> = {
  admin:        'مدير المدرسة',
  deputy:       'وكيل المدرسة',
  counselor:    'موجه طلابي',
  expert:       'معلم خبير',
  advanced:     'معلم متقدم',
  practitioner: 'معلم ممارس',
  assistant:    'مساعد معلم',
}

export const ROLE_COLORS: Record<string, string> = {
  admin:        '#ef4444',
  deputy:       '#f59e0b',
  counselor:    '#3b82f6',
  expert:       '#10b981',
  advanced:     '#8b5cf6',
  practitioner: '#64748b',
  assistant:    '#ec4899',
}

// ── Sections ──
export const SECTIONS = [
  { id:1,  icon:'👤', color:'#c9a84c', title:'البيانات الشخصية',          kpiHints:['S1.1'] },
  { id:2,  icon:'🌟', color:'#8b5cf6', title:'الفلسفة التربوية',          kpiHints:['S3.1','S1.2'] },
  { id:3,  icon:'🎓', color:'#3b82f6', title:'المؤهلات الأكاديمية',       kpiHints:['S1.1','S3.2'] },
  { id:4,  icon:'🏆', color:'#f59e0b', title:'الإنجازات المهنية',         kpiHints:['S5.2','S4.2'] },
  { id:5,  icon:'📚', color:'#ec4899', title:'الخطط والمناهج',            kpiHints:['S2.1','S1.3'] },
  { id:6,  icon:'📊', color:'#06b6d4', title:'التقييمات',                 kpiHints:['S2.3','S3.1'] },
  { id:7,  icon:'🎨', color:'#10b981', title:'الأنشطة الصفية واللاصفية', kpiHints:['S2.2','S2.4','S4.2'] },
  { id:8,  icon:'✏️', color:'#f59e0b', title:'نماذج من أعمال الطلاب',    kpiHints:['S2.2','S2.3'] },
  { id:9,  icon:'🔬', color:'#8b5cf6', title:'التطوير المهني',            kpiHints:['S3.2','S3.3'] },
  { id:10, icon:'📹', color:'#3b82f6', title:'التوثيق والتقييم',          kpiHints:['S2.2','S5.1'] },
  { id:11, icon:'📜', color:'#ec4899', title:'الشهادات والأدلة الموثقة',  kpiHints:['S4.1','S4.2'] },
  { id:12, icon:'💭', color:'#06b6d4', title:'انعكاس شخصي',              kpiHints:['S3.1','S3.2'] },
  { id:13, icon:'🎯', color:'#c9a84c', title:'الخاتمة',                   kpiHints:['S3.1'] },
] as const

// ── KPI Standards ──
export const KPI_STANDARDS = [
  { id:'S1.1', domain:1, color:'#c9a84c', code:'م١-١', name:'المعرفة بالمادة الدراسية',           domainName:'المعرفة المهنية' },
  { id:'S1.2', domain:1, color:'#c9a84c', code:'م١-٢', name:'معرفة المتعلمين وأساليب تعلمهم',    domainName:'المعرفة المهنية' },
  { id:'S1.3', domain:1, color:'#c9a84c', code:'م١-٣', name:'المعرفة بالمناهج والبيئة التعليمية',domainName:'المعرفة المهنية' },
  { id:'S2.1', domain:2, color:'#10b981', code:'م٢-١', name:'التخطيط للتدريس',                    domainName:'الممارسة التدريسية' },
  { id:'S2.2', domain:2, color:'#10b981', code:'م٢-٢', name:'تنفيذ التدريس',                      domainName:'الممارسة التدريسية' },
  { id:'S2.3', domain:2, color:'#10b981', code:'م٢-٣', name:'تقييم التعلم',                       domainName:'الممارسة التدريسية' },
  { id:'S2.4', domain:2, color:'#10b981', code:'م٢-٤', name:'البيئة الصفية',                      domainName:'الممارسة التدريسية' },
  { id:'S3.1', domain:3, color:'#3b82f6', code:'م٣-١', name:'التأمل المهني والتقييم الذاتي',     domainName:'النمو المهني' },
  { id:'S3.2', domain:3, color:'#3b82f6', code:'م٣-٢', name:'التطوير المهني المستمر',             domainName:'النمو المهني' },
  { id:'S3.3', domain:3, color:'#3b82f6', code:'م٣-٣', name:'قيادة مجتمعات التعلم',              domainName:'النمو المهني' },
  { id:'S4.1', domain:4, color:'#8b5cf6', code:'م٤-١', name:'التواصل مع أولياء الأمور',          domainName:'التفاعل المجتمعي' },
  { id:'S4.2', domain:4, color:'#8b5cf6', code:'م٤-٢', name:'الانخراط في المجتمع المدرسي',       domainName:'التفاعل المجتمعي' },
  { id:'S4.3', domain:4, color:'#8b5cf6', code:'م٤-٣', name:'الشراكة مع المجتمع الخارجي',        domainName:'التفاعل المجتمعي' },
  { id:'S5.1', domain:5, color:'#ec4899', code:'م٥-١', name:'توظيف التقنية في التعليم',          domainName:'الابتكار الرقمي' },
  { id:'S5.2', domain:5, color:'#ec4899', code:'م٥-٢', name:'الابتكار والإبداع التربوي',         domainName:'الابتكار الرقمي' },
  { id:'S5.3', domain:5, color:'#ec4899', code:'م٥-٣', name:'القيادة الرقمية',                   domainName:'الابتكار الرقمي' },
] as const

// ── Gold Seals ──
export const SEALS_CATALOG = [
  { id:'seal_dl',  style:'gold',    icon:'💻', title:'قائد رقمي',       sub:'Digital Leader' },
  { id:'seal_ex',  style:'gold',    icon:'⭐', title:'معلم متميز',       sub:'Excellence Award' },
  { id:'seal_inn', style:'emerald', icon:'🚀', title:'مبتكر تربوي',      sub:'Educational Innovator' },
  { id:'seal_res', style:'silver',  icon:'🔬', title:'باحث تربوي',       sub:'Research Excellence' },
  { id:'seal_com', style:'purple',  icon:'🤝', title:'شريك مجتمعي',      sub:'Community Partner' },
  { id:'seal_men', style:'emerald', icon:'🌱', title:'مرشد الموهوبين',   sub:'Gifted Mentor' },
  { id:'seal_qur', style:'gold',    icon:'📖', title:'متميز في التحفيظ', sub:'Quran Excellence' },
  { id:'seal_ldr', style:'purple',  icon:'👑', title:'قائد تعليمي',      sub:'Educational Leader' },
] as const

// ── Database Types ──
export type Role = 'admin' | 'deputy' | 'counselor' | 'expert' | 'advanced' | 'practitioner' | 'assistant'
export type EvidenceType = 'image' | 'link' | 'doc'

export interface Profile {
  id: string
  full_name: string
  email: string
  role: Role
  av: string
  is_developer: boolean
  is_evaluator: boolean
  created_at: string
}

export interface TeacherProfile {
  id: string
  uid: string
  name: string | null
  phone: string | null
  bio: string | null
  photo: string | null
  philosophy: string | null
  reflection: string | null
  conclusion: string | null
  quals: QualItem[]
  hidden_secs: number[]
  seals: string[]
  kpi_summary: Record<string, number>
  updated_at: string
}

export interface QualItem {
  id: string
  label: string
  value: string
  active: boolean
  url?: string
}

export interface Evidence {
  id: string
  tid: string
  sid: number
  title: string
  desc: string
  type: EvidenceType
  date: string
  url: string
  file_name: string
  file_url: string
  active: boolean
  kpis: string[]
  impact: ImpactData | null
  note: string
  sup_rating: number
  sup_tags: string[]
  is_verified: boolean
  ts: number
  created_at: string
}

export interface ImpactData {
  label: string
  pre: number
  post: number
  unit: string
}

export interface SealAward {
  id: string
  teacher_id: string
  awarded_by: string
  seal_id: string
  note: string
  awarded_at: string
}

// ── Helpers ──
export const pColor = (p: number) =>
  p >= 80 ? '#10b981' : p >= 50 ? '#f59e0b' : '#ef4444'

export const typeEmoji = (t: EvidenceType) =>
  ({ image: '🖼️', link: '🔗', doc: '📄' }[t] ?? '📄')

export const stripHtml = (h: string) =>
  h ? h.replace(/<[^>]*>/g, '').trim() : ''

export const calcProgress = (evs: Evidence[], tid: string) => {
  const active = evs.filter(e => e.tid === tid && e.active)
  return Math.round((new Set(active.map(e => e.sid)).size / N_SEC) * 100)
}

export const canAward = (profile: Profile | null) =>
  profile !== null && (
    profile.role === 'admin' ||
    profile.role === 'deputy' ||
    profile.is_evaluator
  )

export const isPrivileged = (profile: Profile | null) =>
  profile !== null && (
    ['admin', 'deputy', 'counselor'].includes(profile.role) ||
    profile.is_developer ||
    profile.is_evaluator
  )
