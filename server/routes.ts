import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import sqlite3 from "sqlite3";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import twilio from "twilio";
import path from "path";
import { fileURLToPath } from "url";
import { initializeFirebase, getFirestore, getUserBalance, updateUserBalance, assignNumberToUser } from "./firebase";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SECRET = process.env.JWT_SECRET || "PRIVATE_DIALER_SECRET";

// Database setup with promise wrapper
const sqliteVerbose = sqlite3.verbose();
const db = new sqliteVerbose.Database("./database.db");

const dbRun = (sql: string, params: any[] = []) => {
  return new Promise<any>((resolve, reject) => {
    db.run(sql, params, function(err: Error | null) {
      if (err) reject(err);
      else resolve(this);
    });
  });
};

const dbGet = (sql: string, params: any[] = []) => {
  return new Promise<any>((resolve, reject) => {
    db.get(sql, params, (err: Error | null, row: any) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
};

const dbAll = (sql: string, params: any[] = []) => {
  return new Promise<any[]>((resolve, reject) => {
    db.all(sql, params, (err: Error | null, rows: any[]) => {
      if (err) reject(err);
      else resolve(rows || []);
    });
  });
};

// Initialize tables
(async () => {
  try {
    await dbRun(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      balance REAL DEFAULT 0,
      is_new_user INTEGER DEFAULT 1
    )`);

    await dbRun(`CREATE TABLE IF NOT EXISTS calls (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER,
      toNumber TEXT,
      duration INTEGER,
      cost REAL,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    await dbRun(`CREATE TABLE IF NOT EXISTS sms (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER,
      toNumber TEXT,
      message TEXT,
      direction TEXT,
      cost REAL DEFAULT 0.05,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    console.log("✅ Database tables created successfully");
  } catch (e) {
    console.error("Database init error:", e);
  }
})();

// Twilio client
const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

// Auth Middleware
const authenticate = (req: any, res: any, next: any) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ ok: false, error: "Unauthorized" });
  jwt.verify(token, SECRET, (err: any, decoded: any) => {
    if (err) return res.status(401).json({ ok: false, error: "Invalid token" });
    req.userId = decoded.id;
    next();
  });
};

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Initialize Firebase
  try {
    initializeFirebase();
  } catch (firebaseErr: any) {
    console.warn("Firebase initialization warning:", firebaseErr.message);
  }

  // put application routes here
  // prefix all routes with /api

  // use storage to perform CRUD operations on the storage interface
  // e.g. storage.insertUser(user) or storage.getUserByUsername(username)

  // Test Firebase connection
  app.post("/api/test-firebase", async (req: any, res: any) => {
    try {
      const { userId } = req.body;
      if (!userId) {
        return res.json({ ok: false, error: "userId مطلوب" });
      }

      const db = getFirestore();
      
      // Try to read from Firestore
      const userDoc = await db.collection("users").doc(userId).get();
      
      if (userDoc.exists) {
        res.json({ 
          ok: true, 
          message: "✅ Firebase متصل بنجاح",
          userData: userDoc.data()
        });
      } else {
        res.json({ 
          ok: true, 
          message: "✅ Firebase متصل بنجاح، المستخدم غير موجود حالياً",
          userData: null
        });
      }
    } catch (e: any) {
      console.error("Firebase test error:", e);
      res.json({ 
        ok: false, 
        error: "خطأ في الاتصال بـ Firebase: " + e.message 
      });
    }
  });

  // Register
  app.post("/api/register", async (req: any, res: any) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.json({ ok: false, error: "بيانات ناقصة" });
      }

      const existing = await dbGet("SELECT id FROM users WHERE email = ?", [email]);
      if (existing) {
        return res.json({ ok: false, error: "المستخدم موجود مسبقاً" });
      }

      const hash = await bcrypt.hash(password, 10);
      await dbRun(
        "INSERT INTO users (email, password, balance, is_new_user) VALUES (?, ?, 0, 1)",
        [email, hash]
      );

      res.json({ ok: true, message: "تم التسجيل بنجاح" });
    } catch (e: any) {
      console.error("Register error:", e);
      res.json({ ok: false, error: e.message });
    }
  });

  // Login — grants $1 on first login
  app.post("/api/login", async (req: any, res: any) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.json({ ok: false, error: "أدخل البريد وكلمة المرور" });
      }

      const user = await dbGet("SELECT * FROM users WHERE email = ?", [email]);
      if (!user) {
        return res.json({ ok: false, error: "المستخدم غير موجود" });
      }

      const match = await bcrypt.compare(password, user.password);
      if (!match) {
        return res.json({ ok: false, error: "كلمة المرور خاطئة" });
      }

      let balance = user.balance;
      if (user.is_new_user === 1) {
        await dbRun("UPDATE users SET balance = 1.0, is_new_user = 0 WHERE id = ?", [user.id]);
        balance = 1.0;
      }

      const token = jwt.sign({ id: user.id }, SECRET);
      res.json({ ok: true, token, balance, uid: user.id, email: user.email });
    } catch (e: any) {
      console.error("Login error:", e);
      res.json({ ok: false, error: "حدث خطأ: " + e.message });
    }
  });

  // Get user info
  app.get("/api/user", authenticate, async (req: any, res: any) => {
    try {
      const user = await dbGet("SELECT id, email, balance FROM users WHERE id = ?", [req.userId]);
      if (!user) {
        return res.json({ ok: false, error: "User not found" });
      }
      res.json({ ok: true, user });
    } catch (e: any) {
      res.json({ ok: false, error: e.message });
    }
  });

  // Call history
  app.get("/api/history", authenticate, async (req: any, res: any) => {
    try {
      const history = await dbAll(
        "SELECT toNumber, cost, timestamp FROM calls WHERE userId = ? ORDER BY timestamp DESC LIMIT 50",
        [req.userId]
      );
      res.json({ ok: true, history });
    } catch (e: any) {
      res.json({ ok: false, error: e.message });
    }
  });

  // Make a call via Twilio REST
  app.post("/api/call", authenticate, async (req: any, res: any) => {
    try {
      const { to } = req.body;
      if (!to) {
        return res.json({ ok: false, error: "Phone number required" });
      }

      const user = await dbGet("SELECT balance FROM users WHERE id = ?", [req.userId]);
      if (!user) {
        return res.json({ ok: false, error: "User not found" });
      }

      const cost = 0.05;
      if (user.balance < cost) {
        return res.json({ ok: false, error: "الرصيد غير كافٍ" });
      }

      try {
        const call = await twilioClient.calls.create({
          to,
          from: process.env.TWILIO_PHONE_NUMBER,
          url: `https://${req.get("host")}/twiml`
        });

        await dbRun("UPDATE users SET balance = balance - ? WHERE id = ?", [cost, req.userId]);
        await dbRun(
          "INSERT INTO calls (userId, toNumber, cost) VALUES (?, ?, ?)",
          [req.userId, to, cost]
        );

        res.json({ ok: true, sid: call.sid });
      } catch (twilioErr: any) {
        console.error("Twilio error:", twilioErr);
        res.json({ ok: false, error: "Twilio error: " + twilioErr.message });
      }
    } catch (e: any) {
      console.error("Call error:", e);
      res.json({ ok: false, error: e.message });
    }
  });

  // TwiML endpoint
  app.post("/twiml", (req: any, res: any) => {
    res.type("text/xml");
    const response = new twilio.twiml.VoiceResponse();
    const dialVerb = response.dial({ callerId: process.env.TWILIO_PHONE_NUMBER });
    dialVerb.number(req.body.To || "");
    res.send(response.toString());
  });

  // Twilio Access Token for Voice SDK
  app.get("/api/token", authenticate, async (req: any, res: any) => {
    try {
      const AccessToken = twilio.jwt.AccessToken;
      const VoiceGrant = AccessToken.VoiceGrant;

      const token = new AccessToken(
        process.env.TWILIO_ACCOUNT_SID!,
        process.env.TWILIO_API_KEY || process.env.TWILIO_ACCOUNT_SID!,
        process.env.TWILIO_API_SECRET || process.env.TWILIO_AUTH_TOKEN!,
        { ttl: 3600 }
      );
      (token as any).identity = `user_${req.userId}`;

      const grant = new VoiceGrant({
        outgoingApplicationSid: process.env.TWILIO_TWIML_APP_SID,
        incomingAllow: true
      });
      token.addGrant(grant);

      res.json({ ok: true, token: token.toJwt() });
    } catch (e: any) {
      res.json({ ok: false, error: e.message });
    }
  });

  // Twilio token for legacy SDK (used in index.html)
  app.get("/token", async (req: any, res: any) => {
    try {
      const identity = req.query.identity || "anonymous";
      const AccessToken = twilio.jwt.AccessToken;
      const VoiceGrant = AccessToken.VoiceGrant;

      const token = new AccessToken(
        process.env.TWILIO_ACCOUNT_SID!,
        process.env.TWILIO_API_KEY || process.env.TWILIO_ACCOUNT_SID!,
        process.env.TWILIO_API_SECRET || process.env.TWILIO_AUTH_TOKEN!,
        { ttl: 3600 }
      );
      (token as any).identity = identity;

      const grant = new VoiceGrant({
        outgoingApplicationSid: process.env.TWILIO_TWIML_APP_SID,
        incomingAllow: true
      });
      token.addGrant(grant);

      res.send(token.toJwt());
    } catch (e: any) {
      res.status(500).send("Token error: " + e.message);
    }
  });

  // Firebase Authentication Endpoint
  app.post("/api/firebase-auth", async (req: any, res: any) => {
    try {
      const { firebaseToken, email, uid, displayName } = req.body;
      if (!firebaseToken || !email) {
        return res.json({ ok: false, error: "بيانات ناقصة" });
      }

      let user = await dbGet("SELECT * FROM users WHERE email = ?", [email]);

      if (!user) {
        await dbRun(
          "INSERT INTO users (email, password, balance, is_new_user) VALUES (?, ?, 1.0, 1)",
          [email, "firebase_auth"]
        );
        user = await dbGet("SELECT * FROM users WHERE email = ?", [email]);
      } else if (user.is_new_user === 1) {
        await dbRun("UPDATE users SET balance = 1.0, is_new_user = 0 WHERE id = ?", [user.id]);
        user.balance = 1.0;
      }

      const token = jwt.sign({ id: user.id }, SECRET);
      res.json({ ok: true, token, balance: user.balance, uid: user.id, email: user.email });
    } catch (e: any) {
      console.error("Firebase Auth error:", e);
      res.json({ ok: false, error: "خطأ في المصادقة: " + e.message });
    }
  });

  // Setup new user (called from Firebase auth flow)
  app.post("/setup-new-user", async (req: any, res: any) => {
    try {
      const { uid } = req.body;
      res.json({ ok: true });
    } catch (e: any) {
      res.json({ ok: false, error: e.message });
    }
  });

  // SMS send
  app.post("/api/sms/send", authenticate, async (req: any, res: any) => {
    try {
      const { to, message } = req.body;
      if (!to || !message) {
        return res.json({ ok: false, error: "أدخل الرقم والرسالة" });
      }

      const user = await dbGet("SELECT balance FROM users WHERE id = ?", [req.userId]);
      if (!user || user.balance < 0.05) {
        return res.json({ ok: false, error: "الرصيد غير كافٍ" });
      }

      try {
        const sms = await twilioClient.messages.create({
          body: message,
          from: process.env.TWILIO_PHONE_NUMBER,
          to: to
        });

        await dbRun("UPDATE users SET balance = balance - 0.05 WHERE id = ?", [req.userId]);
        await dbRun(
          "INSERT INTO sms (userId, toNumber, message, direction, cost) VALUES (?, ?, ?, ?, 0.05)",
          [req.userId, to, message, "outgoing"]
        );

        res.json({ ok: true, sid: sms.sid });
      } catch (twilioErr: any) {
        console.error("Twilio SMS error:", twilioErr);
        res.json({ ok: false, error: "خطأ في إرسال الرسالة: " + twilioErr.message });
      }
    } catch (e: any) {
      res.json({ ok: false, error: e.message });
    }
  });

  // SMS list
  app.get("/api/sms/list", authenticate, async (req: any, res: any) => {
    try {
      const messages = await dbAll(
        "SELECT toNumber, message, direction, timestamp FROM sms WHERE userId = ? ORDER BY timestamp DESC LIMIT 100",
        [req.userId]
      );
      res.json({ ok: true, messages });
    } catch (e: any) {
      res.json({ ok: false, error: e.message });
    }
  });

  // Fetch call recordings from Twilio
  app.get("/api/recordings", authenticate, async (req: any, res: any) => {
    try {
      const user = await dbGet("SELECT id FROM users WHERE id = ?", [req.userId]);
      if (!user) return res.json({ ok: false, error: "User not found" });

      const calls = await twilioClient.calls.list({ limit: 50 });
      const recordings: any[] = [];

      for (const call of calls) {
        const callRecordings = await twilioClient.recordings.list({
          callSid: call.sid
        });

        for (const rec of callRecordings) {
          recordings.push({
            callSid: call.sid,
            recordingSid: rec.sid,
            duration: rec.duration,
            dateCreated: rec.dateCreated,
            url: `https://api.twilio.com${rec.uri.replace('.json', '.wav')}`
          });
        }
      }

      res.json({ ok: true, recordings });
    } catch (e: any) {
      console.error("Recordings error:", e);
      res.json({ ok: false, error: "خطأ في جلب التسجيلات: " + e.message });
    }
  });

  // Top-up balance endpoint
  app.post("/api/topup", authenticate, async (req: any, res: any) => {
    try {
      const { amount } = req.body;
      if (!amount || amount <= 0) {
        return res.json({ ok: false, error: "مبلغ غير صحيح" });
      }

      await dbRun("UPDATE users SET balance = balance + ? WHERE id = ?", [amount, req.userId]);
      const user = await dbGet("SELECT balance FROM users WHERE id = ?", [req.userId]);

      res.json({ ok: true, newBalance: user.balance });
    } catch (e: any) {
      res.json({ ok: false, error: e.message });
    }
  });

  // Get user info (balance, email, virtual number)
  app.get("/api/user-info", authenticate, async (req: any, res: any) => {
    try {
      const user = await dbGet("SELECT id, email, balance FROM users WHERE id = ?", [req.userId]);
      if (!user) {
        return res.json({ ok: false, error: "User not found" });
      }

      const virtualNumber = `+1822${String(user.id).padStart(7, '0')}`;

      res.json({
        ok: true,
        uid: user.id,
        email: user.email,
        balance: user.balance,
        virtualNumber: virtualNumber
      });
    } catch (e: any) {
      res.json({ ok: false, error: e.message });
    }
  });

  // Get user status - returns assigned number and balance from Firestore
  app.get("/api/user-status", authenticate, async (req: any, res: any) => {
    try {
      const userId = String(req.userId);
      const db = getFirestore();

      // Get user data from Firestore
      const userDoc = await db.collection("users").doc(userId).get();
      
      if (!userDoc.exists) {
        return res.json({
          ok: true,
          assignedNumber: null,
          sid: null,
          balance: 0,
          assignedAt: null
        });
      }

      const userData = userDoc.data();
      res.json({
        ok: true,
        assignedNumber: userData?.assignedNumber || null,
        sid: userData?.assignedNumberSid || null,
        balance: userData?.balance || 0,
        assignedAt: userData?.assignedAt || null,
        email: userData?.email || null
      });
    } catch (e: any) {
      console.error("User status error:", e);
      res.json({ ok: false, error: e.message });
    }
  });

  // Assign Twilio number to user - automatically purchase a US phone number
  app.post("/api/assign-number", authenticate, async (req: any, res: any) => {
    try {
      const userId = req.userId;
      
      // Get user's current balance from Firestore
      const userBalance = await getUserBalance(String(userId));
      
      // Cost of a phone number (example: $1.00 per month)
      const phoneCost = 1.0;
      
      if (userBalance < phoneCost) {
        return res.json({ 
          ok: false, 
          error: "الرصيد غير كافٍ لشراء رقم هاتفي. الحد الأدنى: $1.00" 
        });
      }

      try {
        // Search for available US Local phone numbers
        const availableNumbers = await twilioClient.availablePhoneNumbers
          .getList("US", "Local", {
            areaCode: "415", // San Francisco area code as example
            limit: 1
          });

        if (!availableNumbers || availableNumbers.length === 0) {
          return res.json({ 
            ok: false, 
            error: "لا توجد أرقام متاحة حالياً. حاول لاحقاً" 
          });
        }

        const phoneNumber = availableNumbers[0].phoneNumber;

        // Purchase the phone number
        const incomingPhoneNumber = await twilioClient.incomingPhoneNumbers.create({
          phoneNumber: phoneNumber,
          voiceUrl: `https://${req.get("host")}/api/voice`,
          voiceMethod: "POST",
          smsUrl: `https://${req.get("host")}/api/sms-webhook`,
          smsMethod: "POST"
        });

        // Deduct cost from Firestore balance
        const newBalance = userBalance - phoneCost;
        await updateUserBalance(String(userId), newBalance);

        // Save assigned number and SID to Firestore
        await assignNumberToUser(String(userId), phoneNumber, incomingPhoneNumber.sid);

        res.json({
          ok: true,
          message: "تم شراء الرقم بنجاح",
          phoneNumber: phoneNumber,
          sid: incomingPhoneNumber.sid,
          newBalance: newBalance
        });
      } catch (twilioErr: any) {
        console.error("Twilio error:", twilioErr);
        res.json({ 
          ok: false, 
          error: "خطأ في شراء الرقم: " + twilioErr.message 
        });
      }
    } catch (e: any) {
      console.error("Assign number error:", e);
      res.json({ ok: false, error: e.message });
    }
  });

  // Voice webhook - handle incoming calls
  app.post("/api/voice", (req: any, res: any) => {
    try {
      const twiml = new twilio.twiml.VoiceResponse();

      // Say welcome message in English
      twiml.say("Welcome to Abu Al-Zahra Dialer");
      
      // Route the call to Twilio Voice SDK client
      const connect = twiml.connect();
      connect.stream({
        url: `wss://${req.get("host")}/voice-stream`,
        transport: "websocket"
      });

      res.type("text/xml");
      res.send(twiml.toString());
    } catch (e: any) {
      console.error("Voice webhook error:", e);
      res.type("text/xml");
      const twiml = new twilio.twiml.VoiceResponse();
      twiml.say("حدث خطأ");
      res.send(twiml.toString());
    }
  });

  // SMS webhook - handle incoming SMS
  app.post("/api/sms-webhook", async (req: any, res: any) => {
    try {
      const { From, To, Body } = req.body;
      
      console.log(`SMS from ${From} to ${To}: ${Body}`);
      
      // TODO: Store incoming SMS in database
      // For now, just acknowledge receipt
      const twiml = new twilio.twiml.MessagingResponse();
      twiml.message("تم استقبال رسالتك");
      
      res.type("text/xml");
      res.send(twiml.toString());
    } catch (e: any) {
      console.error("SMS webhook error:", e);
      res.type("text/xml");
      const twiml = new twilio.twiml.MessagingResponse();
      res.send(twiml.toString());
    }
  });

  // Serve admin dashboard
  app.get("/admin-dashboard.html", (req: any, res: any) => {
    try {
      res.sendFile(path.join(__dirname, "../server/admin-dashboard.html"));
    } catch (e: any) {
      res.status(500).json({ ok: false, error: "Dashboard not found" });
    }
  });

  app.get("/admin-dashboard", (req: any, res: any) => {
    try {
      res.sendFile(path.join(__dirname, "../server/admin-dashboard.html"));
    } catch (e: any) {
      res.status(500).json({ ok: false, error: "Dashboard not found" });
    }
  });

  return httpServer;
}
