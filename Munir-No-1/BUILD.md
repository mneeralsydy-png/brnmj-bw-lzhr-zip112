# Private Dialer Build Guide (أبو الزهراء)

## بناء التطبيق | Building the Application

### المتطلبات | Requirements
- Node.js 18+ 
- npm 9+
- SQLite3
- Git

### خطوات البناء المحلي | Local Build Steps

```bash
# 1. نسخ المشروع
git clone <your-repo-url>
cd private-dialer

# 2. تثبيت المتعلقات
npm install

# 3. تشغيل السيرفر
npm start

# 4. فتح التطبيق
# ثم افتح في المتصفح: http://localhost:5000
```

### متغيرات البيئة المطلوبة | Required Environment Variables

```bash
# ضروري للاتصالات الهاتفية | Required for calls
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=your_twilio_phone

# اختياري | Optional (has default)
JWT_SECRET=your_jwt_secret
```

### بناء عبر GitHub Actions | GitHub Actions Build

**الملف**: `.github/workflows/build.yml`

يتحقق من:
- ✓ بناء مشروع النود
- ✓ تثبيت المتعلقات
- ✓ صحة JavaScript syntax
- ✓ تهيئة قاعدة البيانات
- ✓ ملفات HTML الضرورية

### هيكل المشروع | Project Structure

```
private-dialer/
├── server.js                    # السيرفر الرئيسي
├── database.db                  # قاعدة البيانات
├── package.json                 # المتعلقات
├── capacitor.config.ts          # إعدادات Capacitor
├── .github/
│   └── workflows/
│       └── build.yml            # GitHub Actions workflow
├── public/
│   ├── index.html              # الواجهة الرئيسية
│   ├── script.js               # منطق التطبيق
│   └── ...                     # ملفات إضافية
└── .gitignore                  # ملفات معفية
```

### الملفات الضرورية | Essential Files

✓ server.js - Node.js Backend  
✓ public/index.html - Frontend UI  
✓ public/script.js - JavaScript Logic  
✓ package.json - Dependencies  
✓ database.db - SQLite Database  
✓ capacitor.config.ts - Mobile Config  

### اختبار البناء | Testing Build

```bash
# التحقق من صحة JavaScript
node --check server.js
node --check public/script.js

# تشغيل السيرفر للاختبار
npm start

# يجب أن يظهر:
# ✅ Server running on port 5000
# ✅ Database tables created successfully
```

### Capacitor Mobile Build (Android)

```bash
# 1. بناء للويب أولاً
npm install

# 2. إضافة منصة Android
npx cap add android

# 3. بناء APK
npx cap build android

# 4. افتح في Android Studio
npx cap open android
```

---

## استكشاف الأخطاء | Troubleshooting

### الخطأ: "PORT 5000 already in use"
```bash
lsof -ti:5000 | xargs kill -9
npm start
```

### الخطأ: "Database locked"
```bash
rm database.db
npm start  # سيعاد إنشاء قاعدة البيانات
```

### الخطأ: "EACCES: permission denied"
```bash
sudo chown -R $USER:$USER .
npm start
```

## الملاحظات | Notes

- التطبيق يعمل على **البرت 5000**
- قاعدة البيانات تُنشأ تلقائياً عند أول تشغيل
- المستخدمون الجدد يحصلون على **$1.00 credit** تلقائياً
- يدعم **Google Sign-In** و **Email/Password**
