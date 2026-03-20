# أبو الزهراء - Private Dialer

تطبيق VoIP عربي احترافي للاتصالات الآمنة عبر Twilio.

## للبدء السريع | Quick Start

```bash
# 1. التثبيت
npm install

# 2. التشغيل
npm start

# 3. الدخول على: http://localhost:5000
```

## الميزات | Features

✨ **المصادقة المزدوجة**
- Email & Password
- Google Sign-In
- $1.00 رصيد مجاني للمستخدمين الجدد

📞 **اتصالات VoIP**
- اتصالات صوتية عبر Twilio
- السجلات التفصيلية للاتصالات
- تسجيلات المكالمات

💬 **الرسائل النصية SMS**
- إرسال واستقبال الرسائل
- تكلفة $0.05 لكل رسالة
- سجل الرسائل الكامل

👥 **جهات الاتصال**
- دمج جهات الاتصال الأصلية
- اتصال سريع من القائمة

💳 **نظام الرصيد والدفع**
- PayPal integration
- ترقية الرصيد
- متابعة المعاملات

📱 **دعم الأندرويد**
- Capacitor Native App
- سهل الوصول والاستخدام

## الملفات الضرورية | Essential Files

```
├── server.js              # السيرفر الرئيسي (Node.js)
├── public/
│   ├── index.html        # الواجهة الرئيسية
│   └── script.js         # منطق التطبيق
├── database.db           # قاعدة البيانات
├── package.json          # المتعلقات
├── capacitor.config.ts   # إعدادات الهاتف
├── .github/
│   └── workflows/
│       └── build.yml     # GitHub Actions
├── BUILD.md              # دليل البناء
├── DEPLOYMENT.md         # دليل النشر
└── .env.example          # متغيرات البيئة
```

## متطلبات البيئة | Environment Setup

انسخ `.env.example` إلى `.env`:
```bash
cp .env.example .env
```

ثم أضف بيانات Twilio:
```
TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...
TWILIO_PHONE_NUMBER=...
```

## البناء والاختبار | Build & Test

```bash
# التحقق من الصحة
node --check server.js
node --check public/script.js

# التشغيل
npm start

# يجب أن تظهر:
# ✅ Server running on port 5000
# ✅ Database tables created successfully
```

## GitHub Actions CI/CD

**.github/workflows/build.yml** يقوم بـ:
- ✓ تثبيت المتعلقات تلقائياً
- ✓ فحص الأخطاء البرمجية
- ✓ التحقق من الملفات الضرورية
- ✓ اختبار قاعدة البيانات

## Capacitor Mobile Build

```bash
# إضافة Android
npx cap add android

# البناء
npx cap build android

# الفتح في Android Studio
npx cap open android
```

## استكشاف الأخطاء | Troubleshooting

| الخطأ | الحل |
|-------|------|
| PORT 5000 in use | `lsof -ti:5000 \| xargs kill -9` |
| Database locked | `rm database.db && npm start` |
| Permission denied | `sudo chown -R $USER:$USER .` |

## الدعم | Support

للمزيد من المعلومات، اطلع على:
- `BUILD.md` - دليل البناء الكامل
- `DEPLOYMENT.md` - دليل النشر والـ CI/CD
- `replit.md` - التفاصيل التقنية

---

**Version**: 1.0.2  
**Status**: ✅ Production Ready  
**Last Updated**: March 16, 2026
