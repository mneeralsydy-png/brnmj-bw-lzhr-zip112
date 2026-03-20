/**
 * Abu Al-Zahra Dialer - Client SDK Integration Example
 * 
 * This example shows how to integrate the backend API into your client application.
 * It covers authentication, number assignment, and status checking.
 */

const API_BASE_URL = window.location.origin + '/api';

class AbuAlZahraSDK {
  constructor() {
    this.token = localStorage.getItem('auth_token');
    this.userId = localStorage.getItem('user_id');
  }

  /**
   * Set authentication token
   * @param {string} token - JWT token from /api/login or /api/firebase-auth
   * @param {string} userId - User ID
   */
  setAuthToken(token, userId) {
    this.token = token;
    this.userId = userId;
    localStorage.setItem('auth_token', token);
    localStorage.setItem('user_id', userId);
  }

  /**
   * Get request headers with authentication
   * @returns {Object} Headers object
   */
  getHeaders() {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.token}`
    };
  }

  /**
   * Login with email and password
   * @param {string} email - User email
   * @param {string} password - User password
   * @returns {Promise<Object>} Login response with token
   */
  async login(email, password) {
    try {
      const response = await fetch(`${API_BASE_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await response.json();
      
      if (data.ok) {
        this.setAuthToken(data.token, data.uid);
      }
      return data;
    } catch (error) {
      console.error('Login error:', error);
      return { ok: false, error: error.message };
    }
  }

  /**
   * Register new user
   * @param {string} email - User email
   * @param {string} password - User password
   * @returns {Promise<Object>} Registration response
   */
  async register(email, password) {
    try {
      const response = await fetch(`${API_BASE_URL}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      return await response.json();
    } catch (error) {
      console.error('Register error:', error);
      return { ok: false, error: error.message };
    }
  }

  /**
   * Get user status - assigned number and balance from Firestore
   * @returns {Promise<Object>} User status with assignedNumber, balance, etc.
   */
  async getUserStatus() {
    try {
      const response = await fetch(`${API_BASE_URL}/user-status`, {
        method: 'GET',
        headers: this.getHeaders()
      });
      return await response.json();
    } catch (error) {
      console.error('User status error:', error);
      return { ok: false, error: error.message };
    }
  }

  /**
   * Assign a Twilio number to the user
   * This endpoint automatically purchases a US phone number
   * @returns {Promise<Object>} Response with phoneNumber, sid, and newBalance
   */
  async assignNumber() {
    try {
      const response = await fetch(`${API_BASE_URL}/assign-number`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({})
      });
      return await response.json();
    } catch (error) {
      console.error('Assign number error:', error);
      return { ok: false, error: error.message };
    }
  }

  /**
   * Make a phone call
   * @param {string} to - Destination phone number
   * @returns {Promise<Object>} Call response with SID
   */
  async makeCall(to) {
    try {
      const response = await fetch(`${API_BASE_URL}/call`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ to })
      });
      return await response.json();
    } catch (error) {
      console.error('Call error:', error);
      return { ok: false, error: error.message };
    }
  }

  /**
   * Send SMS
   * @param {string} to - Recipient phone number
   * @param {string} message - Message content
   * @returns {Promise<Object>} SMS response with SID
   */
  async sendSMS(to, message) {
    try {
      const response = await fetch(`${API_BASE_URL}/sms/send`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ to, message })
      });
      return await response.json();
    } catch (error) {
      console.error('SMS error:', error);
      return { ok: false, error: error.message };
    }
  }

  /**
   * Get user's call history
   * @returns {Promise<Object>} History response with array of calls
   */
  async getCallHistory() {
    try {
      const response = await fetch(`${API_BASE_URL}/history`, {
        method: 'GET',
        headers: this.getHeaders()
      });
      return await response.json();
    } catch (error) {
      console.error('History error:', error);
      return { ok: false, error: error.message };
    }
  }

  /**
   * Get SMS list
   * @returns {Promise<Object>} SMS list response
   */
  async getSMSList() {
    try {
      const response = await fetch(`${API_BASE_URL}/sms/list`, {
        method: 'GET',
        headers: this.getHeaders()
      });
      return await response.json();
    } catch (error) {
      console.error('SMS list error:', error);
      return { ok: false, error: error.message };
    }
  }

  /**
   * Top up balance
   * @param {number} amount - Amount to add
   * @returns {Promise<Object>} Response with newBalance
   */
  async topupBalance(amount) {
    try {
      const response = await fetch(`${API_BASE_URL}/topup`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ amount })
      });
      return await response.json();
    } catch (error) {
      console.error('Topup error:', error);
      return { ok: false, error: error.message };
    }
  }

  /**
   * Get Twilio Voice SDK token
   * @returns {Promise<Object>} Token response
   */
  async getVoiceToken() {
    try {
      const response = await fetch(`${API_BASE_URL}/token`, {
        method: 'GET',
        headers: this.getHeaders()
      });
      const data = await response.json();
      if (data.ok) {
        return data.token;
      }
      throw new Error(data.error);
    } catch (error) {
      console.error('Voice token error:', error);
      throw error;
    }
  }
}

// Export for use in both browser and Node.js environments
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AbuAlZahraSDK;
}

// ==========================================
// USAGE EXAMPLES
// ==========================================

/*
// 1. Login and set token
const sdk = new AbuAlZahraSDK();
const loginResult = await sdk.login('user@example.com', 'password123');
// loginResult = { ok: true, token: '...', balance: 1.0, uid: 1, email: '...' }

// 2. Check user status (assigned number + balance)
const status = await sdk.getUserStatus();
// status = { ok: true, assignedNumber: '+1415...', balance: 0.0, sid: 'PN...', ... }

// 3. Assign a new phone number (purchase)
if (!status.assignedNumber) {
  const assignResult = await sdk.assignNumber();
  // assignResult = { ok: true, phoneNumber: '+1415...', sid: 'PN...', newBalance: 0.0 }
  console.log('New number assigned:', assignResult.phoneNumber);
}

// 4. Make a call
const callResult = await sdk.makeCall('+14155551234');
// callResult = { ok: true, sid: 'CA...' }

// 5. Send SMS
const smsResult = await sdk.sendSMS('+14155551234', 'مرحبا');
// smsResult = { ok: true, sid: 'SM...' }

// 6. Get call history
const history = await sdk.getCallHistory();
// history = { ok: true, history: [{toNumber: '+1...', cost: 0.05, timestamp: '...'}, ...] }

// 7. Top up balance
const topupResult = await sdk.topupBalance(5.0);
// topupResult = { ok: true, newBalance: 5.0 }
*/
