# Private Dialer - أبو الزهراء

## Overview

Private Dialer is a professional Arabic VoIP application called "أبو الزهراء" (Abu Al-Zahra). It's a web-based phone calling application that allows users to make phone calls through Twilio's API. The app features dual authentication (email/password + Google), a balance/credit system, call history tracking, SMS messaging, and PayPal integration for adding funds. The interface is designed in Arabic (RTL layout) and styled as a mobile-first application resembling a native phone dialer with Capacitor Android support.

## Project Structure

### Frontend (Vanilla HTML/CSS/JS)
- **`client/index.html`** - Main app HTML with full RTL Arabic UI, CSS styles, and inline JS logic
- **`client/public/script.js`** - External JS brain logic (auth, calling, contacts, SMS, payments)
- **`client/public/sdk-example.js`** - JavaScript SDK class for client integration (easy API wrapper)
- **`client/public/manifest.json`** - PWA manifest for mobile-app-like experience

### Backend (Node.js + Express + TypeScript)
- **`server/index.ts`** - Express server entry point
- **`server/routes.ts`** - All API routes (register, login, calls, SMS, recordings, topup, assign-number, voice webhooks, etc.)
- **`server/firebase.ts`** - Firebase Admin SDK integration (Firestore balance tracking, number assignment)
- **`server/storage.ts`** - Storage interface
- **`server/admin-dashboard.html`** - Built-in admin UI for monitoring users and numbers
- **`database.db`** - SQLite database file (auto-created)

### Mobile (Android / Capacitor)
- **`capacitor.config.json`** - Capacitor configuration for mobile build
- **`android/gradle.properties`** - Android Gradle settings
- **`android/variables.gradle`** - Android SDK version variables
- **`android/app/google-services.json`** - Firebase configuration for Android
- **`android/app/src/main/AndroidManifest.xml`** - Android permissions and activity config

## Architecture

### Backend API Routes (all under `/api/`)
| Route | Method | Auth | Description |
|-------|--------|------|-------------|
| `/api/register` | POST | No | User registration |
| `/api/login` | POST | No | User login (grants $1 on first login) |
| `/api/user` | GET | JWT | Get user info |
| `/api/user-info` | GET | JWT | Get user info + virtual US number |
| `/api/history` | GET | JWT | Call history |
| `/api/call` | POST | JWT | Make outbound call via Twilio |
| `/api/token` | GET | JWT | Get Twilio Voice SDK access token |
| `/api/sms/send` | POST | JWT | Send SMS via Twilio |
| `/api/sms/list` | GET | JWT | List sent SMS messages |
| `/api/recordings` | GET | JWT | Fetch call recordings from Twilio |
| `/api/topup` | POST | JWT | Add balance (after PayPal payment) |
| `/api/firebase-auth` | POST | No | Google/Firebase authentication |
| `/api/test-firebase` | POST | No | Test Firestore connection (userId in body) |
| `/api/assign-number` | POST | JWT | Purchase US Twilio number, deduct cost from Firestore balance, save to user doc |
| `/api/voice` | POST | No | TwiML webhook for incoming calls - plays welcome message |
| `/api/sms-webhook` | POST | No | TwiML webhook for incoming SMS messages |
| `/api/user-status` | GET | JWT | Get user status from Firestore (assigned number, balance, etc.) |
| `/twiml` | POST | No | TwiML webhook for legacy Twilio calls |
| `/token` | GET | No | Legacy Twilio token (for index.html SDK) |
| `/setup-new-user` | POST | No | Firebase new user setup hook |

### Database (SQLite)
- **`users`** - id, email, password (bcrypt), balance, is_new_user
- **`calls`** - id, userId, toNumber, duration, cost, timestamp
- **`sms`** - id, userId, toNumber, message, direction, cost, timestamp

### Firestore Database (Firebase)
- **`users/{userId}`** collection - balance, assignedNumber, assignedNumberSid, etc.
- Used for balance verification before Twilio operations
- Stores assigned phone numbers and their Twilio SIDs

### External Services
- **Firebase** - Authentication (email/password + Google) + Firestore (balance tracking) + Realtime Database
- **Twilio** - VoIP calls + SMS + recordings + phone number management
- **PayPal** - Payment processing for balance top-up

## Firebase Backend Integration

### Firebase Module (`server/firebase.ts`)
Provides the following functions:
- **`initializeFirebase()`** - Initializes Firebase Admin SDK using FIREBASE_SERVICE_ACCOUNT secret
- **`getFirestore()`** - Returns Firestore database instance
- **`getRealtimeDb()`** - Returns Firebase Realtime Database instance
- **`getUserBalance(userId)`** - Async function to get user's balance from Firestore
- **`updateUserBalance(userId, newBalance)`** - Async function to update user's balance
- **`assignNumberToUser(userId, phoneNumber, sid)`** - Stores assigned Twilio number to user's Firestore doc
- **`getUserAssignedNumber(userId)`** - Retrieves assigned Twilio number from Firestore

### Test Firebase Connection
POST `/api/test-firebase` with `{"userId": "test_user_id"}` to verify Firestore connectivity.

## Client SDK & Integration

### JavaScript SDK Class (`client/public/sdk-example.js`)
Provides a convenient wrapper for all backend API endpoints. Features:

```javascript
const sdk = new AbuAlZahraSDK();

// Authentication
await sdk.login(email, password);
await sdk.register(email, password);

// User Management
await sdk.getUserStatus();           // Get assigned number & balance from Firestore
await sdk.getVoiceToken();           // Get Twilio Voice SDK token

// Calling
await sdk.makeCall(phoneNumber);     // Make outbound call ($0.05)
await sdk.assignNumber();             // Purchase US phone number ($1.00)

// SMS
await sdk.sendSMS(phoneNumber, msg);  // Send SMS ($0.05)
await sdk.getSMSList();              // Get SMS history

// Billing
await sdk.topupBalance(amount);       // Add balance
await sdk.getCallHistory();           // Get call records
```

**Usage in Capacitor (Android/iOS):**
```javascript
// In your Capacitor app
<script src="sdk-example.js"></script>
<script>
  const sdk = new AbuAlZahraSDK();
  // Use sdk methods as shown above
</script>
```

## Admin Dashboard

### Access the Dashboard
**URL:** `http://localhost:5000/admin-dashboard.html`

### Features
- ✅ **Test Firebase Connection** - Verify Firestore connectivity with user ID
- ✅ **Create Test Users** - Register new users for testing
- ✅ **User Statistics** - View total users, active numbers, total balance
- ✅ **User & Numbers Table** - Monitor assigned phone numbers per user
- ✅ **Call Logs** - View recent calls and SMS messages
- ✅ **Assign Numbers** - Manually purchase and assign Twilio numbers
- ✅ **Real-time Alerts** - Success/error notifications for all operations

### Admin Dashboard Routes
- `GET /admin-dashboard` - Serve dashboard
- `GET /admin-dashboard.html` - Serve dashboard (alternative)

## Twilio Number Assignment & Voice Webhooks

### POST `/api/assign-number` (Requires JWT Authentication)
Automatically purchases a US phone number from Twilio and assigns it to the user.

**Request:**
```json
POST /api/assign-number
Headers: { "Authorization": "Bearer <JWT_TOKEN>" }
Body: {} (empty, userId comes from JWT)
```

**Process:**
1. Retrieves user's balance from Firestore using `getUserBalance()`
2. Checks if balance ≥ $1.00 (phone number cost)
3. Searches for available US Local phone numbers (area code: 415 by default)
4. Purchases the number via Twilio API
5. Sets Voice webhook URL to `/api/voice` and SMS webhook to `/api/sms-webhook`
6. Deducts $1.00 from user's Firestore balance via `updateUserBalance()`
7. Saves the phone number and SID to Firestore via `assignNumberToUser()`

**Success Response:**
```json
{
  "ok": true,
  "message": "تم شراء الرقم بنجاح",
  "phoneNumber": "+1415XXXXXXX",
  "sid": "PN...",
  "newBalance": 0.0
}
```

**Error Cases:**
- Insufficient balance: "الرصيد غير كافٍ لشراء رقم هاتفي. الحد الأدنى: $1.00"
- No available numbers: "لا توجد أرقام متاحة حالياً. حاول لاحقاً"
- Twilio error: "خطأ في شراء الرقم: [error details]"

### POST `/api/voice` (Twilio Voice Webhook)
Handles incoming calls to the assigned Twilio number.

**Twilio sends:**
- From: caller's phone number
- To: assigned Twilio number
- CallSid: unique call identifier

**Response:**
- Plays "Welcome to Abu Al-Zahra Dialer" greeting
- Attempts to route call to Twilio Voice SDK client via WebSocket stream (`wss://{host}/voice-stream`)
- Falls back to error message if exception occurs

**TwiML Output:**
```xml
<Response>
  <Say>Welcome to Abu Al-Zahra Dialer</Say>
  <Connect>
    <Stream url="wss://{host}/voice-stream" transport="websocket"/>
  </Connect>
</Response>
```

### POST `/api/sms-webhook` (Twilio SMS Webhook)
Handles incoming SMS messages to the assigned Twilio number.

**Twilio sends:**
- From: sender's phone number
- To: assigned Twilio number
- Body: message content

**Response:**
- Acknowledges receipt with "تم استقبال رسالتك" message
- TODO: Store incoming SMS to database for user history

## Environment Variables Required

| Variable | Purpose |
|----------|---------|
| `TWILIO_ACCOUNT_SID` | Twilio account identifier |
| `TWILIO_AUTH_TOKEN` | Twilio authentication token |
| `TWILIO_PHONE_NUMBER` | Twilio phone number for outbound calls |
| `TWILIO_TWIML_APP_SID` | TwiML app SID for Voice SDK |
| `TWILIO_API_KEY` | (Optional) Twilio API key |
| `TWILIO_API_SECRET` | (Optional) Twilio API secret |
| `JWT_SECRET` | JWT signing secret (defaults to PRIVATE_DIALER_SECRET) |

## User Preferences

Preferred communication style: Simple, everyday language.
