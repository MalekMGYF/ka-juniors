# رفع النسخة الصحيحة إلى GitHub وVercel

هذه الحزمة تحتوي على النسخة الصحيحة من مشروع K.A Juniors، بما فيها صفحات `/admin/login` و`/register` ومسارات المصادقة ولعبة `/pictionary`.

## الطريقة الأسهل

افتح مستودع GitHub الصحيح، اختر **Add file → Upload files**، وفك ضغط هذه الحزمة على جهازك ثم ارفع محتوياتها من داخل المجلد. استبدل الملفات القديمة عند ظهورها، ولا ترفع `.env.local` أو أي ملف يحتوي مفاتيح حقيقية. بعد ذلك اضغط **Commit changes**.

إذا كان Vercel مربوطًا بهذا المستودع، سيبدأ Deploy تلقائيًا. تأكد أن **Root Directory** هو جذر المشروع، وأن **Framework Preset** هو Next.js، وأن أمر البناء هو `npm run build`.

## متغيرات Vercel

تأكد من وجود هذه القيم في Vercel لبيئتي Production وPreview:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
SESSION_SECRET
ADMIN_PASSWORD
```

بعد إضافة المتغيرات أو تعديلها، استخدم **Redeploy** من آخر commit. شغّل `supabase-migration-pictionary.sql` في Supabase SQL Editor قبل اختبار غرفة الرسم.
