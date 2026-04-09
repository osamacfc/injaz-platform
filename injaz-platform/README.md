# منصة إنجاز تحفيظ عيبان v6.0

## 🚀 تشغيل المشروع محلياً

```bash
# 1. ثبّت المكتبات
npm install

# 2. شغّل المشروع
npm run dev

# 3. افتح المتصفح
# http://localhost:3000
```

## 📁 هيكل المشروع

```
injaz-platform/
├── app/
│   ├── page.tsx          ← التوجيه الرئيسي
│   ├── auth/page.tsx     ← تسجيل الدخول والتسجيل
│   ├── dashboard/page.tsx ← لوحة المدير
│   ├── teacher/[id]/page.tsx ← ملف المعلم
│   └── guest/page.tsx   ← صفحة الزائر
├── components/
│   └── AuthProvider.tsx  ← إدارة الجلسة
└── lib/
    ├── constants.ts      ← الثوابت والأنواع
    └── supabase.ts       ← اتصال قاعدة البيانات
```

## 🌐 النشر على Vercel

```bash
# 1. ثبّت Vercel CLI
npm i -g vercel

# 2. انشر
vercel --prod
```

## 📊 الصفحات

| الرابط | الوصف | من يراه |
|--------|-------|---------|
| `/auth` | تسجيل الدخول والتسجيل | الجميع |
| `/dashboard` | لوحة متابعة كل المعلمين | مدير + وكيل + موجه |
| `/teacher/[id]` | ملف إنجاز معلم | المعلم + الإدارة |
| `/guest` | عرض عام للملفات | الجميع بدون دخول |

## 🔐 بيانات الربط (Supabase)

موجودة في `lib/supabase.ts` — لا تحتاج أي إعداد إضافي.
