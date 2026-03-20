# GitHub Actions Build Configuration

## الملف | File Location
`.github/workflows/build.yml`

## ما يفعله | What It Does

يتحقق الـ workflow من:
1. ✓ تثبيت المتعلقات (Node 18 و 20)
2. ✓ صحة بناء النود JavaScript
3. ✓ وجود ملفات HTML الضرورية
4. ✓ تهيئة قاعدة البيانات
5. ✓ التحقق من متغيرات البيئة المطلوبة

## يعمل على
- Push إلى main, master, dev
- Pull Requests على تلك الفروع

## مراحل البناء | Build Stages

| المرحلة | الوصف |
|--------|--------|
| Install deps | تثبيت npm install |
| Validate syntax | فحص JavaScript للأخطاء |
| Check files | التحقق من وجود ملفات المشروع |
| Init database | اختبار إنشاء قاعدة البيانات |
| Summary | عرض ملخص الإعدادات |

## متطلبات البيئة | Environment Variables

أضف في GitHub Settings > Secrets:
```
TWILIO_ACCOUNT_SID
TWILIO_AUTH_TOKEN
TWILIO_PHONE_NUMBER
JWT_SECRET (optional)
```

## حالة البناء | Build Status

للتحقق من حالة البناء:
1. اذهب إلى GitHub Repo
2. اضغط على **Actions** tab
3. حدد الـ workflow الأخير
4. شاهد النتائج التفصيلية
