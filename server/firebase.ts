import admin from "firebase-admin";

let firebaseApp: admin.app.App | null = null;

export function initializeFirebase(): admin.app.App {
  if (firebaseApp) {
    return firebaseApp;
  }

  try {
    // Get Firebase service account from environment variable
    const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT;
    
    if (!serviceAccountJson) {
      throw new Error("FIREBASE_SERVICE_ACCOUNT environment variable not found");
    }

    let serviceAccount: any;
    try {
      serviceAccount = JSON.parse(serviceAccountJson);
    } catch (parseErr) {
      throw new Error("Failed to parse FIREBASE_SERVICE_ACCOUNT JSON: " + (parseErr as Error).message);
    }

    firebaseApp = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      databaseURL: process.env.FIREBASE_DB_URL || "https://call-now-24582-default-rtdb.firebaseio.com"
    });

    console.log("✅ Firebase initialized successfully");
    return firebaseApp;
  } catch (error) {
    console.error("Firebase initialization error:", error);
    throw error;
  }
}

export function getFirestore() {
  const app = initializeFirebase();
  return admin.firestore(app);
}

export function getRealtimeDb() {
  const app = initializeFirebase();
  return admin.database(app);
}

export async function getUserBalance(userId: string): Promise<number> {
  const db = getFirestore();
  try {
    const userDoc = await db.collection("users").doc(userId).get();
    if (!userDoc.exists) {
      return 0;
    }
    return userDoc.data()?.balance || 0;
  } catch (error) {
    console.error("Error getting user balance:", error);
    throw error;
  }
}

export async function updateUserBalance(userId: string, newBalance: number): Promise<void> {
  const db = getFirestore();
  try {
    await db.collection("users").doc(userId).update({
      balance: newBalance,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
  } catch (error) {
    console.error("Error updating user balance:", error);
    throw error;
  }
}

export async function assignNumberToUser(userId: string, phoneNumber: string, sid: string): Promise<void> {
  const db = getFirestore();
  try {
    await db.collection("users").doc(userId).update({
      assignedNumber: phoneNumber,
      assignedNumberSid: sid,
      assignedAt: admin.firestore.FieldValue.serverTimestamp()
    });
  } catch (error) {
    console.error("Error assigning number to user:", error);
    throw error;
  }
}

export async function getUserAssignedNumber(userId: string): Promise<{ phoneNumber: string; sid: string } | null> {
  const db = getFirestore();
  try {
    const userDoc = await db.collection("users").doc(userId).get();
    if (!userDoc.exists) {
      return null;
    }
    const data = userDoc.data();
    if (data?.assignedNumber && data?.assignedNumberSid) {
      return {
        phoneNumber: data.assignedNumber,
        sid: data.assignedNumberSid
      };
    }
    return null;
  } catch (error) {
    console.error("Error getting user assigned number:", error);
    throw error;
  }
}
