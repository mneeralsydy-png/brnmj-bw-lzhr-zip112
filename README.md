# Abu Al-Zahra Dialer - VoIP Backend API

A professional Arabic VoIP application backend built with Express.js, Firebase, and Twilio. Features automatic phone number assignment, call management, SMS, Firebase Firestore balance tracking, and Capacitor mobile support.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Twilio account with credentials
- Firebase project with service account
- Environment variables configured (see `.env.example`)

### Installation
```bash
npm install
npm run dev  # Starts on port 5000
```

### Admin Dashboard
Access the admin dashboard at: `http://localhost:5000/admin-dashboard.html`

## 🔑 Environment Variables Required

| Variable | Purpose |
|----------|---------|
| `TWILIO_ACCOUNT_SID` | Twilio account identifier |
| `TWILIO_AUTH_TOKEN` | Twilio authentication token |
| `TWILIO_PHONE_NUMBER` | Twilio phone number for outbound calls |
| `TWILIO_TWIML_APP_SID` | TwiML app SID for Voice SDK |
| `FIREBASE_SERVICE_ACCOUNT` | Firebase service account JSON |
| `FIREBASE_DB_URL` | Firebase Realtime Database URL |
| `JWT_SECRET` | Secret key for JWT signing |

## 📚 API Endpoints

### Authentication

#### `POST /api/register`
Register a new user with email and password.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "secure_password"
}
```

**Response (Success):**
```json
{
  "ok": true,
  "message": "تم التسجيل بنجاح"
}
```

---

#### `POST /api/login`
Login with email and password. Returns JWT token and initial $1.00 balance.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "secure_password"
}
```

**Response (Success):**
```json
{
  "ok": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "balance": 1.0,
  "uid": 1,
  "email": "user@example.com"
}
```

---

#### `POST /api/firebase-auth`
Google/Firebase authentication. Auto-creates user on first login.

**Request:**
```json
{
  "firebaseToken": "...",
  "email": "user@gmail.com",
  "uid": "firebase_uid",
  "displayName": "User Name"
}
```

**Response:**
```json
{
  "ok": true,
  "token": "eyJ...",
  "balance": 1.0,
  "uid": 1,
  "email": "user@gmail.com"
}
```

---

#### `POST /api/test-firebase`
Test Firestore connection (for debugging).

**Request:**
```json
{
  "userId": "test_user_id"
}
```

**Response:**
```json
{
  "ok": true,
  "message": "✅ Firebase متصل بنجاح",
  "userData": {
    "balance": 5.0,
    "assignedNumber": "+1415...",
    "...": "..."
  }
}
```

---

### User Management

#### `GET /api/user`
Get authenticated user info (requires JWT).

**Headers:**
```
Authorization: Bearer {JWT_TOKEN}
```

**Response:**
```json
{
  "ok": true,
  "user": {
    "id": 1,
    "email": "user@example.com",
    "balance": 0.95
  }
}
```

---

#### `GET /api/user-info`
Get user profile with virtual number (requires JWT).

**Headers:**
```
Authorization: Bearer {JWT_TOKEN}
```

**Response:**
```json
{
  "ok": true,
  "uid": 1,
  "email": "user@example.com",
  "balance": 0.95,
  "virtualNumber": "+18220000001"
}
```

---

#### `GET /api/user-status`
Get user status from Firestore - assigned number and balance (requires JWT).

**Headers:**
```
Authorization: Bearer {JWT_TOKEN}
```

**Response:**
```json
{
  "ok": true,
  "assignedNumber": "+1415XXXXXXX",
  "sid": "PNxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  "balance": 0.0,
  "assignedAt": "2024-03-19T20:00:00Z",
  "email": "user@example.com"
}
```

---

### Phone Number Management

#### `POST /api/assign-number`
Automatically purchase a US phone number from Twilio (requires JWT).

**Process:**
1. Checks user balance from Firestore
2. Searches for available US Local phone numbers (area code 415)
3. Purchases the number
4. Deducts $1.00 from Firestore balance
5. Saves number and SID to Firestore
6. Sets Voice and SMS webhooks

**Headers:**
```
Authorization: Bearer {JWT_TOKEN}
```

**Request:**
```json
{}
```

**Response (Success):**
```json
{
  "ok": true,
  "message": "تم شراء الرقم بنجاح",
  "phoneNumber": "+1415XXXXXXX",
  "sid": "PNxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  "newBalance": 0.0
}
```

**Error Cases:**
- Insufficient balance: `"الرصيد غير كافٍ لشراء رقم هاتفي. الحد الأدنى: $1.00"`
- No available numbers: `"لا توجد أرقام متاحة حالياً. حاول لاحقاً"`

---

### Voice & Calling

#### `POST /api/call`
Make an outbound call (requires JWT).

**Headers:**
```
Authorization: Bearer {JWT_TOKEN}
```

**Request:**
```json
{
  "to": "+1415XXXXXXX"
}
```

**Response:**
```json
{
  "ok": true,
  "sid": "CAxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
}
```

**Cost:** $0.05 per call

---

#### `GET /api/token`
Get Twilio Voice SDK access token (requires JWT).

**Headers:**
```
Authorization: Bearer {JWT_TOKEN}
```

**Response:**
```json
{
  "ok": true,
  "token": "eyJ..."
}
```

---

#### `POST /api/voice`
TwiML webhook for incoming calls to assigned number.

**Twilio sends:**
```
From: caller's phone
To: assigned Twilio number
CallSid: unique call identifier
```

**Response (TwiML):**
```xml
<Response>
  <Say>Welcome to Abu Al-Zahra Dialer</Say>
  <Connect>
    <Stream url="wss://{host}/voice-stream" transport="websocket"/>
  </Connect>
</Response>
```

---

#### `GET /api/history`
Get call history (requires JWT).

**Headers:**
```
Authorization: Bearer {JWT_TOKEN}
```

**Response:**
```json
{
  "ok": true,
  "history": [
    {
      "toNumber": "+1415XXXXXXX",
      "cost": 0.05,
      "timestamp": "2024-03-19T20:00:00Z"
    }
  ]
}
```

---

#### `GET /api/recordings`
Get call recordings from Twilio (requires JWT).

**Response:**
```json
{
  "ok": true,
  "recordings": [
    {
      "callSid": "CA...",
      "recordingSid": "RE...",
      "duration": 60,
      "dateCreated": "2024-03-19T20:00:00Z",
      "url": "https://api.twilio.com/.../Recordings/RE.../Wave"
    }
  ]
}
```

---

### SMS

#### `POST /api/sms/send`
Send SMS message (requires JWT).

**Headers:**
```
Authorization: Bearer {JWT_TOKEN}
```

**Request:**
```json
{
  "to": "+1415XXXXXXX",
  "message": "Hello, this is a test message"
}
```

**Response:**
```json
{
  "ok": true,
  "sid": "SMxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
}
```

**Cost:** $0.05 per message

---

#### `GET /api/sms/list`
Get SMS message history (requires JWT).

**Response:**
```json
{
  "ok": true,
  "messages": [
    {
      "toNumber": "+1415XXXXXXX",
      "message": "Hello",
      "direction": "outgoing",
      "timestamp": "2024-03-19T20:00:00Z"
    }
  ]
}
```

---

#### `POST /api/sms-webhook`
TwiML webhook for incoming SMS to assigned number.

**Twilio sends:**
```
From: sender's phone
To: assigned Twilio number
Body: message content
```

**Response (TwiML):**
```xml
<Response>
  <Message>تم استقبال رسالتك</Message>
</Response>
```

---

### Billing

#### `POST /api/topup`
Add balance to user account (requires JWT).

**Headers:**
```
Authorization: Bearer {JWT_TOKEN}
```

**Request:**
```json
{
  "amount": 5.00
}
```

**Response:**
```json
{
  "ok": true,
  "newBalance": 5.95
}
```

---

## 💻 Client SDK Integration

### JavaScript/Capacitor Example

**File:** `client/public/sdk-example.js`

```javascript
// 1. Initialize SDK
const sdk = new AbuAlZahraSDK();

// 2. Login
const loginResult = await sdk.login('user@example.com', 'password123');
// loginResult = { ok: true, token: '...', balance: 1.0, uid: 1 }

// 3. Check user status (assigned number + balance)
const status = await sdk.getUserStatus();
// status = { ok: true, assignedNumber: '+1415...', balance: 0.0, sid: 'PN...', ... }

// 4. Assign a new phone number
if (!status.assignedNumber) {
  const assignResult = await sdk.assignNumber();
  console.log('New number:', assignResult.phoneNumber);
}

// 5. Make a call
const callResult = await sdk.makeCall('+14155551234');

// 6. Send SMS
const smsResult = await sdk.sendSMS('+14155551234', 'مرحبا');

// 7. Top up balance
const topupResult = await sdk.topupBalance(5.0);
```

### Available Methods
- `login(email, password)` - User authentication
- `register(email, password)` - User registration
- `getUserStatus()` - Get assigned number & balance
- `assignNumber()` - Purchase US phone number
- `makeCall(phoneNumber)` - Make outbound call
- `sendSMS(phoneNumber, message)` - Send SMS
- `getCallHistory()` - Get call records
- `getSMSList()` - Get SMS history
- `topupBalance(amount)` - Add balance
- `getVoiceToken()` - Get Twilio Voice SDK token

---

## 📊 Admin Dashboard

Access the built-in admin dashboard at: **`/admin-dashboard.html`**

Features:
- ✅ Test Firestore connection
- ✅ Create test users
- ✅ View user statistics
- ✅ Monitor active phone numbers
- ✅ View call logs
- ✅ Assign numbers to users

---

## 📂 Project Structure

```
├── server/
│   ├── index.ts          # Express server entry point
│   ├── routes.ts         # API endpoints
│   ├── firebase.ts       # Firebase Admin integration
│   ├── storage.ts        # Storage interface
│   └── admin-dashboard.html # Admin UI
├── client/
│   ├── index.html        # Main app HTML (RTL Arabic)
│   └── public/
│       ├── script.js     # App logic
│       ├── sdk-example.js # Client SDK example
│       └── manifest.json # PWA manifest
├── android/              # Capacitor Android build
├── database.db           # SQLite database (auto-created)
├── replit.md             # Detailed documentation
└── README.md             # This file
```

---

## 🛠️ Database Schema

### SQLite

**users**
```sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  balance REAL DEFAULT 0,
  is_new_user INTEGER DEFAULT 1
);
```

**calls**
```sql
CREATE TABLE calls (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  userId INTEGER,
  toNumber TEXT,
  duration INTEGER,
  cost REAL,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

**sms**
```sql
CREATE TABLE sms (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  userId INTEGER,
  toNumber TEXT,
  message TEXT,
  direction TEXT,
  cost REAL DEFAULT 0.05,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### Firestore

**Collection: `users/{userId}`**
```json
{
  "balance": 0.0,
  "assignedNumber": "+1415XXXXXXX",
  "assignedNumberSid": "PNxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  "assignedAt": "2024-03-19T20:00:00Z",
  "email": "user@example.com"
}
```

---

## 🔒 Security

- ✅ JWT authentication on protected routes
- ✅ Passwords hashed with bcrypt
- ✅ Firebase service account stored in environment secrets
- ✅ Twilio credentials in environment variables
- ✅ CORS enabled for frontend requests
- ✅ Rate limiting recommended for production

---

## 📦 Dependencies

- **express** - Web framework
- **cors** - Cross-origin requests
- **sqlite3** - Database
- **bcrypt** - Password hashing
- **jsonwebtoken** - JWT authentication
- **twilio** - VoIP/SMS service
- **firebase-admin** - Firebase backend

---

## 🚀 Deployment

### On Replit
1. Configure all environment secrets
2. Run `npm install`
3. Execute `npm run dev`
4. App runs on `https://{replit-domain}:5000`

### Production Checklist
- [ ] Set secure `JWT_SECRET`
- [ ] Configure Firebase with production project
- [ ] Use production Twilio account
- [ ] Set `NODE_ENV=production`
- [ ] Enable HTTPS
- [ ] Add rate limiting
- [ ] Set up monitoring/logging
- [ ] Test all payment flows

---

## 📞 Support

For issues or questions:
1. Check `/admin-dashboard.html` test endpoint
2. Review logs: `npm run dev` console output
3. Test Firebase connection: `POST /api/test-firebase`
4. Verify environment variables are set

---

## 📝 License

This project is part of the Abu Al-Zahra private dialer application.

---

**Last Updated:** March 19, 2024  
**Version:** 1.0.0
# brnmj-bw-lzhr-zip112
