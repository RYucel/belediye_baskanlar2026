import express from "express";
import path from "path";
import { initializeApp as initializeAdminApp, cert, getApps as getAdminApps } from 'firebase-admin/app';
import { getFirestore as getAdminFirestore, FieldValue } from 'firebase-admin/firestore';
import { initializeApp as initializeClientApp } from 'firebase/app';
import { getFirestore as getClientFirestore, collection, getDocs, doc, getDoc, setDoc, query, where, deleteDoc, runTransaction } from 'firebase/firestore';
import fs from 'fs';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { getOtpSender } from './mailer.js';

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json());


// Firebase Init
let adminDb: any;
let clientDb: any;
let isUsingClient = false;
try {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    // Vercel deployment approach
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
    if (serviceAccount.private_key) {
      serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
    }
    const existingApps = getAdminApps();
    const firebaseApp = existingApps.length > 0 
      ? existingApps[0] 
      : initializeAdminApp({
          credential: cert(serviceAccount)
        });
    
    // For Vercel production, default to "(default)" unless FIREBASE_DATABASE_ID is explicitly set.
    // Do NOT fall back to the local AI Studio sandbox database ID in firebase-applet-config.json.
    const databaseId = process.env.FIREBASE_DATABASE_ID || "(default)";
    
    adminDb = getAdminFirestore(firebaseApp, databaseId);
    console.log(`Firebase initialized successfully from Service Account (Vercel) on database: ${databaseId}`);
  } else {
    // AI Studio local development approach
    const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      const firebaseApp = initializeClientApp(config);
      clientDb = getClientFirestore(firebaseApp, config.firestoreDatabaseId);
      isUsingClient = true;
      console.log("Firebase initialized successfully from AI Studio config (Client SDK)");
    } else {
      console.warn("No Firebase configuration found. Firestore will not work.");
    }
  }
} catch (error) {
  console.error("Firebase init error:", error);
}

// Data structures
interface Rating {
  infrastructure: number;
  social: number;
  traffic: number;
  transparency: number;
  review?: string;
}

interface Mayor {
  id: string;
  city: string;
  name: string;
  party: string;
  imageUrl?: string;
}

const MAYORS: Mayor[] = [
 { 
    id: "1", 
    city: "LEFKOŞA", 
    name: "MEHMET HARMANCI", 
    party: "TDP", 
    imageUrl: "https://ktbb.org/v1/wp-content/uploads/2023/05/harmanci_yeni_foto-300x300.jpg" 
  },
  { 
    id: "2", 
    city: "GAZİMAĞUSA", 
    name: "SÜLEYMAN ULUÇAY", 
    party: "CTP", 
    imageUrl: "https://ktbb.org/v1/wp-content/uploads/2023/05/baskan-suleyman-ulucay-300x200.jpg" 
  },
  { 
    id: "3", 
    city: "GİRNE", 
    name: "MURAT ŞENKUL", 
    party: "CTP", 
    imageUrl: "https://ktbb.org/v1/wp-content/uploads/2023/05/MURAT-SENKUL-300x200.jpg" 
  },
  { 
    id: "4", 
    city: "GÖNYELİ-ALAYKÖY", 
    name: "HÜSEYİN AMCAOĞLU", 
    party: "UBP", 
    imageUrl: "https://ktbb.org/v1/wp-content/uploads/2023/05/H-Amcaoglu-1-Copy-300x200.jpg" 
  },
  { 
    id: "5", 
    city: "LAPTA-ALSANCAK-ÇAMLIBEL", 
    name: "FIRAT ATASER", 
    party: "Bağımsız", 
    imageUrl: "https://ktbb.org/v1/wp-content/uploads/2023/05/firat-ataser-200x301.jpg" 
  },
  { 
    id: "6", 
    city: "GÜZELYURT", 
    name: "MAHMUT ÖZÇINAR", 
    party: "UBP", 
    imageUrl: "https://ktbb.org/v1/wp-content/uploads/2023/05/Mahmut-Ozcinar-217x300.jpeg" 
  },
  { 
    id: "7", 
    city: "DEĞİRMENLİK-AKINCILAR", 
    name: "ALİ KARAVEZİRLER", 
    party: "CTP", 
    imageUrl: "https://ktbb.org/v1/wp-content/uploads/2023/05/Ali-Karavezirler.jpg" 
  },
  { 
    id: "8", 
    city: "DİKMEN", 
    name: "YÜKSEL ÇELEBİ", 
    party: "CTP", 
    imageUrl: "https://ktbb.org/v1/wp-content/uploads/2023/05/yuksel-celebi-300x169.jpg" 
  },
  { 
    id: "9", 
    city: "LEFKE", 
    name: "AZİZ KAYA", 
    party: "CTP", 
    imageUrl: "https://ktbb.org/v1/wp-content/uploads/2023/05/aziz-kaya-2-300x200.jpg" 
  },
  { 
    id: "10", 
    city: "MESARYA", 
    name: "AHMET LATİF", 
    party: "CTP", 
    imageUrl: "https://ktbb.org/v1/wp-content/uploads/2023/05/BASKAN-RESMI-300x199.jpg" 
  },
  { 
    id: "11", 
    city: "ÇATALKÖY-ESENTEPE", 
    name: "CEYHUN KIROK", 
    party: "CTP", 
    imageUrl: "https://ktbb.org/v1/wp-content/uploads/2023/05/ceyhun-kirok-268x300.png" 
  },
  { 
    id: "12", 
    city: "İSKELE", 
    name: "HASAN SADIKOĞLU", 
    party: "UBP", 
    imageUrl: "https://ktbb.org/v1/wp-content/uploads/2023/05/Hasan-Sadikoglu-Copy-183x300.png" 
  },
  { 
    id: "13", 
    city: "ERENKÖY-KARPAZ", 
    name: "HAMİT BAKIRCI", 
    party: "UBP", 
    imageUrl: "https://ktbb.org/v1/wp-content/uploads/2023/05/IMG-7755-300x300.jpg" 
  },
  { 
    id: "14", 
    city: "YENİ BOĞAZİÇİ", 
    name: "KATİP DEMİR", 
    party: "Bağımsız", 
    imageUrl: "https://ktbb.org/v1/wp-content/uploads/2023/05/katip-demir-229x300.png" 
  },
  { 
    id: "15", 
    city: "GEÇİTKALE-SERDARLI", 
    name: "HALİL KASIM", 
    party: "UBP", 
    imageUrl: "https://ktbb.org/v1/wp-content/uploads/2023/05/Baskan-Resim-224x300.jpg" 
  },
  { 
    id: "16", 
    city: "MEHMETÇİK-BÜYÜKKONUK", 
    name: "FATMA ÇİMEN TUĞLU", 
    party: "UBP", 
    imageUrl: "https://ktbb.org/v1/wp-content/uploads/2023/05/Fatma-Cimen-Tuglu-300x300.jpeg" 
  },
  { 
    id: "17", 
    city: "BEYARMUDU", 
    name: "BÜLENT BEBEK", 
    party: "Bağımsız", 
    imageUrl: "https://ktbb.org/v1/wp-content/uploads/2023/05/Bulent-Bebek-300x183.png" 
  },
  { 
    id: "18", 
    city: "TATLISU", 
    name: "HAYRİ ORÇAN", 
    party: "DP", 
    imageUrl: "https://ktbb.org/v1/wp-content/uploads/2023/05/Hayri-Orcan-300x300.jpg" 
  }
];

// In-memory store fallback for AI Studio
const memoryVotes = new Map<string, any>();

// Timeout helper to prevent Vercel Serverless Function hangs
function withTimeout<T>(promise: Promise<T>, ms: number, fallbackValue: T): Promise<T> {
  let timeoutId: NodeJS.Timeout;
  const timeoutPromise = new Promise<T>((resolve) => {
    timeoutId = setTimeout(() => {
      console.warn(`Promise timed out after ${ms}ms. Returning fallback.`);
      resolve(fallbackValue);
    }, ms);
  });
  return Promise.race([promise, timeoutPromise]).then((res) => {
    clearTimeout(timeoutId);
    return res;
  });
}

// API Routes
app.get("/api/config", (req, res) => {
  res.json({
    secureVotingEnabled: process.env.SECURE_VOTING_ENABLED !== "false"
  });
});

app.get("/api/mayors", async (req, res) => {
  try {
    const isSecure = process.env.SECURE_VOTING_ENABLED !== "false";
    const collectionName = isSecure ? "ballots" : "votes";
    let allVotes: any[] = [];
    
    if (adminDb || clientDb) {
      try {
        if (isUsingClient) {
          const snapshot = await withTimeout(getDocs(collection(clientDb, collectionName)), 4000, null);
          allVotes = snapshot ? snapshot.docs.map(d => d.data()) : Array.from(memoryVotes.values());
        } else {
          const snapshot = await withTimeout(adminDb.collection(collectionName).get(), 4000, null);
          allVotes = snapshot ? snapshot.docs.map((d: any) => d.data()) : Array.from(memoryVotes.values());
        }
      } catch (err) {
        console.warn("Firestore query failed, using in-memory store", err);
        allVotes = Array.from(memoryVotes.values());
      }
    } else {
      allVotes = Array.from(memoryVotes.values());
    }

    const result = MAYORS.map((mayor) => {
      let totalVotes = 0;
      let sumInfra = 0, sumSocial = 0, sumTraffic = 0, sumTrans = 0;

      for (const v of allVotes) {
        if (v.mayorId === mayor.id) {
          totalVotes++;
          sumInfra += v.rating.infrastructure;
          sumSocial += v.rating.social;
          sumTraffic += v.rating.traffic;
          sumTrans += v.rating.transparency;
        }
      }

      const overall = totalVotes > 0 ? (sumInfra + sumSocial + sumTraffic + sumTrans) / (totalVotes * 4) : 0;

      return {
        ...mayor,
        totalVotes,
        score: {
          overall: Number(overall.toFixed(1)),
          infrastructure: totalVotes > 0 ? Number((sumInfra / totalVotes).toFixed(1)) : 0,
          social: totalVotes > 0 ? Number((sumSocial / totalVotes).toFixed(1)) : 0,
          traffic: totalVotes > 0 ? Number((sumTraffic / totalVotes).toFixed(1)) : 0,
          transparency: totalVotes > 0 ? Number((sumTrans / totalVotes).toFixed(1)) : 0,
        }
      };
    });

    // Sort by overall score descending
    result.sort((a, b) => b.score.overall - a.score.overall);

    res.json(result);
  } catch (error) {
    console.error("Error fetching mayors:", error);
    res.status(500).json({ error: "Veriler alınamadı." });
  }
});

// The pepper is REQUIRED. No hardcoded fallback: a default committed to a
// public repo would make every credential hash computable (and therefore
// enumerable) by anyone. If it is missing we refuse secure operations rather
// than silently degrade integrity.
const SERVER_PEPPER = process.env.SERVER_PEPPER || "";
if (!SERVER_PEPPER) {
  console.error("FATAL: SERVER_PEPPER is not set. Secure voting endpoints will be disabled.");
}

// OTP / abuse-control tuning.
const OTP_TTL_MS = 10 * 60 * 1000;        // code valid for 10 minutes
const OTP_RESEND_COOLDOWN_MS = 60 * 1000; // min gap between sends to one contact
const OTP_MAX_SENDS_PER_WINDOW = 5;       // max sends per contact per window
const OTP_SEND_WINDOW_MS = 60 * 60 * 1000;// rolling 1h window for the send cap
const OTP_MAX_VERIFY_ATTEMPTS = 5;        // wrong-guess attempts before lockout

function isEmail(contact: string): boolean {
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(contact);
}

// Canonicalize a contact so trivial variations of the SAME identity collapse to
// ONE credential. Without this, user+1@gmail.com / u.s.e.r@gmail.com / phone
// format variants would each yield a distinct credential and allow re-voting.
function normalizeContact(contact: string): string {
  const clean = contact.trim().toLowerCase();

  if (clean.includes('@')) {
    const [localRaw, domainRaw] = clean.split('@');
    let local = localRaw;
    const domain = domainRaw;
    // Strip plus-addressing tags for all providers (user+anything -> user).
    local = local.split('+')[0];
    // Gmail ignores dots in the local part and treats googlemail as gmail.
    if (domain === 'gmail.com' || domain === 'googlemail.com') {
      local = local.replace(/\./g, '');
      return `${local}@gmail.com`;
    }
    return `${local}@${domain}`;
  }

  // Phone: keep digits only, then normalize to a country-code form so a leading
  // 0 vs +90 (KKTC/TR) variant maps to the same identity.
  let digits = clean.replace(/\D/g, '');
  if (digits.startsWith('00')) digits = digits.slice(2);
  if (digits.startsWith('0')) digits = '90' + digits.slice(1);
  return digits;
}

function hashCredential(normalizedContact: string): string {
  return crypto.createHash('sha256').update(normalizedContact + SERVER_PEPPER).digest('hex');
}

function hashCode(code: string, credentialId: string): string {
  // Bind the code hash to the credential so a stolen hash can't be replayed for
  // a different contact, and so the plaintext code is never stored.
  return crypto.createHash('sha256').update(code + credentialId + SERVER_PEPPER).digest('hex');
}

// --- Firestore single-doc helpers that abstract Client SDK vs Admin SDK ---
async function dbGetDoc(collectionName: string, id: string): Promise<any | null> {
  if (isUsingClient) {
    const snap = await withTimeout(getDoc(doc(clientDb, collectionName, id)), 4000, null);
    return snap && snap.exists() ? snap.data() : null;
  }
  const snap = await withTimeout(adminDb.collection(collectionName).doc(id).get(), 4000, null);
  return snap && snap.exists ? snap.data() : null;
}

async function dbSetDoc(collectionName: string, id: string, data: any): Promise<void> {
  if (isUsingClient) {
    await withTimeout(setDoc(doc(clientDb, collectionName, id), data), 4000, null);
  } else {
    await withTimeout(adminDb.collection(collectionName).doc(id).set(data), 4000, null);
  }
}

async function dbDeleteDoc(collectionName: string, id: string): Promise<void> {
  if (isUsingClient) {
    await withTimeout(deleteDoc(doc(clientDb, collectionName, id)), 4000, null);
  } else {
    await withTimeout(adminDb.collection(collectionName).doc(id).delete(), 4000, null);
  }
}

function clientIpHash(req: any): string {
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
  const rawIp = typeof ip === 'string'
    ? ip.split(',')[0].trim()
    : Array.isArray(ip) ? ip[0].trim() : '';
  return rawIp ? crypto.createHash('sha256').update(rawIp).digest('hex') : 'unknown';
}

app.post("/api/request-otp", async (req, res) => {
  if (!SERVER_PEPPER) {
    res.status(500).json({ error: "Sunucu yapılandırması eksik. Lütfen daha sonra tekrar deneyin." });
    return;
  }

  const { contact } = req.body;
  if (!contact || typeof contact !== 'string') {
    res.status(400).json({ error: "Geçersiz iletişim bilgisi." });
    return;
  }

  const normalized = normalizeContact(contact);
  // Email-only verification (chosen channel). Phone OTP is not delivered.
  if (!normalized || !isEmail(normalized)) {
    res.status(400).json({ error: "Lütfen geçerli bir e-posta adresi girin." });
    return;
  }

  const credentialId = hashCredential(normalized);
  const now = Date.now();

  // If this credential has already cast its vote, don't bother sending a code.
  try {
    const voter = await dbGetDoc('voters', credentialId);
    if (voter && (voter.status === 'used' || voter.used === true)) {
      res.status(400).json({ error: "Bu kimlikle zaten oy kullanıldı." });
      return;
    }
  } catch (error) {
    console.error("Failed to read voter state in request-otp:", error);
  }

  // Rate limiting: cooldown between sends + capped sends per rolling window.
  let sendCount = 0;
  let windowStart = now;
  try {
    const existing = await dbGetDoc('otps', credentialId);
    if (existing) {
      const lastSentAt = existing.lastSentAt ? new Date(existing.lastSentAt).getTime() : 0;
      if (now - lastSentAt < OTP_RESEND_COOLDOWN_MS) {
        res.status(429).json({ error: "Lütfen yeni kod istemeden önce biraz bekleyin." });
        return;
      }
      windowStart = existing.windowStart ? new Date(existing.windowStart).getTime() : now;
      if (now - windowStart > OTP_SEND_WINDOW_MS) {
        windowStart = now; // window expired, reset
        sendCount = 0;
      } else {
        sendCount = existing.sendCount || 0;
      }
      if (sendCount >= OTP_MAX_SENDS_PER_WINDOW) {
        res.status(429).json({ error: "Çok fazla kod talebi. Lütfen bir süre sonra tekrar deneyin." });
        return;
      }
    }
  } catch (error) {
    console.error("Failed to read OTP rate-limit state:", error);
  }

  // Generate 6-digit code; store only its hash (bound to credential).
  const code = crypto.randomInt(100000, 1000000).toString();
  const codeHash = hashCode(code, credentialId);
  const expiresAt = new Date(now + OTP_TTL_MS).toISOString();

  try {
    await dbSetDoc('otps', credentialId, {
      codeHash,
      expiresAt,
      attempts: 0,
      sendCount: sendCount + 1,
      lastSentAt: new Date(now).toISOString(),
      windowStart: new Date(windowStart).toISOString(),
    });
  } catch (error) {
    console.error("Failed to write OTP to Firestore:", error);
    res.status(500).json({ error: "Kod oluşturulamadı. Lütfen tekrar deneyin." });
    return;
  }

  // Deliver via the configured sender (Resend in production).
  try {
    await getOtpSender().send(normalized, code);
  } catch (error) {
    console.error("Failed to deliver OTP:", error);
    res.status(502).json({ error: "Doğrulama kodu gönderilemedi. Lütfen tekrar deneyin." });
    return;
  }

  // Only echo the code back in non-production to ease local testing.
  if (process.env.NODE_ENV !== 'production') {
    res.json({ success: true, code });
  } else {
    res.json({ success: true });
  }
});

app.post("/api/verify-otp", async (req, res) => {
  if (!SERVER_PEPPER) {
    res.status(500).json({ error: "Sunucu yapılandırması eksik. Lütfen daha sonra tekrar deneyin." });
    return;
  }

  const { contact, code } = req.body;
  if (!contact || !code) {
    res.status(400).json({ error: "Eksik bilgi." });
    return;
  }

  const normalized = normalizeContact(contact);
  if (!normalized || !isEmail(normalized)) {
    res.status(400).json({ error: "Lütfen geçerli bir e-posta adresi girin." });
    return;
  }
  const credentialId = hashCredential(normalized);

  let otpDoc: any = null;
  try {
    otpDoc = await dbGetDoc('otps', credentialId);
  } catch (error) {
    console.error("Failed to fetch OTP from Firestore:", error);
  }

  if (!otpDoc) {
    res.status(400).json({ error: "Doğrulama kodu bulunamadı. Lütfen yeni kod isteyin." });
    return;
  }

  // Brute-force lockout: too many wrong guesses invalidates the code entirely.
  if ((otpDoc.attempts || 0) >= OTP_MAX_VERIFY_ATTEMPTS) {
    try { await dbDeleteDoc('otps', credentialId); } catch {}
    res.status(429).json({ error: "Çok fazla hatalı deneme. Lütfen yeni kod isteyin." });
    return;
  }

  if (new Date(otpDoc.expiresAt) < new Date()) {
    try { await dbDeleteDoc('otps', credentialId); } catch {}
    res.status(400).json({ error: "Doğrulama kodunun süresi dolmuş." });
    return;
  }

  const submittedHash = hashCode(String(code).trim(), credentialId);
  const expectedHash = String(otpDoc.codeHash || '');
  const matches = expectedHash.length > 0 &&
    submittedHash.length === expectedHash.length &&
    crypto.timingSafeEqual(Buffer.from(submittedHash), Buffer.from(expectedHash));

  if (!matches) {
    // Increment attempt counter; preserve the rest of the OTP doc.
    try {
      await dbSetDoc('otps', credentialId, { ...otpDoc, attempts: (otpDoc.attempts || 0) + 1 });
    } catch (error) {
      console.error("Failed to record failed OTP attempt:", error);
    }
    res.status(400).json({ error: "Doğrulama kodu hatalı." });
    return;
  }

  // Success: mark the credential verified (idempotent) and consume the OTP.
  // Do NOT reset an already-used voter back to verified.
  try {
    const existingVoter = await dbGetDoc('voters', credentialId);
    if (existingVoter && (existingVoter.status === 'used' || existingVoter.used === true)) {
      try { await dbDeleteDoc('otps', credentialId); } catch {}
      res.status(400).json({ error: "Bu kimlikle zaten oy kullanıldı." });
      return;
    }
    if (isUsingClient) {
      await withTimeout(setDoc(doc(clientDb, 'voters', credentialId), {
        status: 'verified',
        verifiedAt: new Date().toISOString(),
        used: false
      }), 4000, null);
    } else {
      await withTimeout(adminDb.collection('voters').doc(credentialId).set({
        status: 'verified',
        verifiedAt: FieldValue.serverTimestamp(),
        used: false
      }), 4000, null);
    }
    await dbDeleteDoc('otps', credentialId);
  } catch (error) {
    console.error("Failed to write voter verification to Firestore:", error);
  }

  res.json({ success: true, credentialId });
});

app.post("/api/vote", async (req, res) => {
  const { deviceId, fingerprint, credentialId, idempotencyKey, mayorId, rating } = req.body;
  
  if (!deviceId || !mayorId || !rating) {
    res.status(400).json({ error: "Eksik bilgi." });
    return;
  }

  // Basic validation of ratings
  const isValid = [rating.infrastructure, rating.social, rating.traffic, rating.transparency].every(
    v => typeof v === 'number' && v >= 1 && v <= 10
  );

  if (!isValid) {
    res.status(400).json({ error: "Puanlar 1 ile 10 arasında olmalıdır." });
    return;
  }

  // Resolve IP Address & Hash it (used as a secondary abuse signal only)
  const ipHash = clientIpHash(req);
  const userAgent = req.headers['user-agent'] || 'unknown';

  const isSecure = process.env.SECURE_VOTING_ENABLED !== "false";
  const voteKey = idempotencyKey || `${deviceId}-${mayorId}`;

  // If Secure Voting is Enabled: Transactional Credential Single-Cast
  if (isSecure) {
    if (!SERVER_PEPPER) {
      res.status(500).json({ error: "Sunucu yapılandırması eksik. Lütfen daha sonra tekrar deneyin." });
      return;
    }

    if (!credentialId) {
      res.status(400).json({ error: "Oy kullanmak için doğrulama gerekli." });
      return;
    }

    if (process.env.ELECTION_CLOSED === "true") {
      res.status(400).json({ error: "Oylama şu anda kapalı." });
      return;
    }

    if (adminDb || clientDb) {
      try {
        if (isUsingClient) {
          // Client SDK Transaction
          await runTransaction(clientDb, async (transaction) => {
            const voterRef = doc(clientDb, 'voters', credentialId);
            const voterSnap = await transaction.get(voterRef);
            if (!voterSnap.exists()) {
              throw new Error("Oy kullanmak için doğrulama gerekli.");
            }
            if (voterSnap.data().status === 'used' || voterSnap.data().used === true) {
              throw new Error("Bu kimlikle zaten oy kullanıldı.");
            }
            if (voterSnap.data().status !== 'verified') {
              throw new Error("Oy kullanmak için doğrulama gerekli.");
            }

            const ballotRef = doc(clientDb, 'ballots', voteKey);
            const ballotSnap = await transaction.get(ballotRef);
            if (ballotSnap.exists()) {
              return; // Idempotency check
            }

            // Perform single cast atomic writes
            transaction.update(voterRef, { status: 'used', used: true, usedAt: new Date().toISOString() });
            transaction.set(ballotRef, {
              mayorId,
              rating,
              createdAt: new Date().toISOString()
            });

            // Write audit log inside transaction
            const logRef = doc(collection(clientDb, 'audit_logs'));
            transaction.set(logRef, {
              action: 'vote_cast',
              result: 'success',
              ipHash,
              fingerprint: fingerprint || 'unknown',
              userAgent,
              createdAt: new Date().toISOString()
            });
          });
        } else {
          // Admin SDK Transaction
          await adminDb.runTransaction(async (transaction: any) => {
            const voterRef = adminDb.collection('voters').doc(credentialId);
            const voterSnap = await transaction.get(voterRef);
            if (!voterSnap.exists) {
              throw new Error("Oy kullanmak için doğrulama gerekli.");
            }
            if (voterSnap.data().status === 'used' || voterSnap.data().used === true) {
              throw new Error("Bu kimlikle zaten oy kullanıldı.");
            }
            if (voterSnap.data().status !== 'verified') {
              throw new Error("Oy kullanmak için doğrulama gerekli.");
            }

            const ballotRef = adminDb.collection('ballots').doc(voteKey);
            const ballotSnap = await transaction.get(ballotRef);
            if (ballotSnap.exists) {
              return;
            }

            // Perform single cast atomic writes
            transaction.update(voterRef, { status: 'used', used: true, usedAt: FieldValue.serverTimestamp() });
            transaction.set(ballotRef, {
              mayorId,
              rating,
              createdAt: FieldValue.serverTimestamp()
            });

            // Write audit log inside transaction
            const logRef = adminDb.collection('audit_logs').doc();
            transaction.set(logRef, {
              action: 'vote_cast',
              result: 'success',
              ipHash,
              fingerprint: fingerprint || 'unknown',
              userAgent,
              createdAt: FieldValue.serverTimestamp()
            });
          });
        }

        res.json({ success: true });
        return;
      } catch (error: any) {
        console.warn("Secure voting transaction failed:", error);
        
        // Write failed audit log
        try {
          const logData = {
            action: 'vote_cast',
            result: 'failed',
            reason: error.message || 'unknown',
            ipHash,
            fingerprint: fingerprint || 'unknown',
            userAgent,
            createdAt: new Date().toISOString()
          };
          if (isUsingClient) {
            await setDoc(doc(collection(clientDb, 'audit_logs')), logData);
          } else {
            await adminDb.collection('audit_logs').doc().set(logData);
          }
        } catch (logErr) {
          console.error("Failed to write audit log:", logErr);
        }

        res.status(400).json({ error: error.message || "İşlem başarısız." });
        return;
      }
    }
  }

  // --- HEURISTIC VOTE FLOW (SECURE_VOTING_ENABLED = false) ---
  if (adminDb || clientDb) {
    try {
      if (isUsingClient) {
        // 1. One vote in total across all mayors per deviceId (UUID)
        const qDevice = query(collection(clientDb, 'votes'), where('deviceId', '==', deviceId));
        const deviceSnap = await withTimeout(getDocs(qDevice), 4000, null);
        if (deviceSnap && !deviceSnap.empty) {
          res.status(400).json({ error: "Zaten bir oy kullandınız. Sadece tek bir belediye başkanı için oy kullanabilirsiniz." });
          return;
        }

        // 2. Max 2 votes per fingerprint
        if (fingerprint) {
          const qF = query(collection(clientDb, 'votes'), where('fingerprint', '==', fingerprint));
          const fingerprintSnap = await withTimeout(getDocs(qF), 4000, null);
          if (fingerprintSnap && fingerprintSnap.size >= 2) {
            res.status(400).json({ error: "Cihaz limitine ulaşıldı. Bu tarayıcıdan en fazla 2 oy kullanılabilir." });
            return;
          }
        }

        // 3. Max 10 votes per IP hash (avoids blocking entire cellular towers but blocks bots)
        if (ipHash !== 'unknown') {
          const qIP = query(collection(clientDb, 'votes'), where('ipHash', '==', ipHash));
          const ipSnap = await withTimeout(getDocs(qIP), 4000, null);
          if (ipSnap && ipSnap.size >= 10) {
            res.status(400).json({ error: "Aynı internet ağından maksimum oy limitine ulaşıldı." });
            return;
          }
        }

        const voteRef = doc(clientDb, 'votes', voteKey);
        await withTimeout(setDoc(voteRef, {
          deviceId,
          fingerprint: fingerprint || 'unknown',
          ipHash,
          mayorId,
          rating,
          createdAt: new Date().toISOString()
        }), 4000, null);
      } else {
        // 1. One vote in total across all mayors per deviceId (UUID)
        const deviceSnap = await withTimeout(adminDb.collection('votes').where('deviceId', '==', deviceId).limit(1).get(), 4000, null);
        if (deviceSnap && !deviceSnap.empty) {
          res.status(400).json({ error: "Zaten bir oy kullandınız. Sadece tek bir belediye başkanı için oy kullanabilirsiniz." });
          return;
        }

        // 2. Max 2 votes per fingerprint
        if (fingerprint) {
          const fingerprintSnap = await withTimeout(adminDb.collection('votes').where('fingerprint', '==', fingerprint).get(), 4000, null);
          if (fingerprintSnap && fingerprintSnap.size >= 2) {
            res.status(400).json({ error: "Cihaz limitine ulaşıldı. Bu tarayıcıdan en fazla 2 oy kullanılabilir." });
            return;
          }
        }

        // 3. Max 10 votes per IP hash
        if (ipHash !== 'unknown') {
          const ipSnap = await withTimeout(adminDb.collection('votes').where('ipHash', '==', ipHash).get(), 4000, null);
          if (ipSnap && ipSnap.size >= 10) {
            res.status(400).json({ error: "Aynı internet ağından maksimum oy limitine ulaşıldı." });
            return;
          }
        }

        const voteRef = adminDb.collection('votes').doc(voteKey);
        await withTimeout(voteRef.set({
          deviceId,
          fingerprint: fingerprint || 'unknown',
          ipHash,
          mayorId,
          rating,
          createdAt: FieldValue.serverTimestamp()
        }), 4000, null);
      }
      
      res.json({ success: true });
      return;
    } catch (error) {
      console.warn("Firestore save failed, falling back to memory:", error);
    }
  }

  // In-memory fallback
  const deviceVoted = Array.from(memoryVotes.values()).some(v => v.deviceId === deviceId);
  if (deviceVoted) {
    res.status(400).json({ error: "Zaten bir oy kullandınız. Sadece tek bir belediye başkanı için oy kullanabilirsiniz." });
    return;
  }

  if (fingerprint) {
    const fingerprintCount = Array.from(memoryVotes.values()).filter(v => v.fingerprint === fingerprint).length;
    if (fingerprintCount >= 2) {
      res.status(400).json({ error: "Cihaz limitine ulaşıldı. Bu tarayıcıdan en fazla 2 oy kullanılabilir." });
      return;
    }
  }

  if (ipHash !== 'unknown') {
    const ipCount = Array.from(memoryVotes.values()).filter(v => v.ipHash === ipHash).length;
    if (ipCount >= 10) {
      res.status(400).json({ error: "Aynı internet ağından maksimum oy limitine ulaşıldı." });
      return;
    }
  }

  memoryVotes.set(voteKey, {
    deviceId,
    fingerprint: fingerprint || 'unknown',
    ipHash,
    mayorId,
    rating,
    createdAt: new Date().toISOString()
  });
  
  res.json({ success: true });
});


async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    // Hide vite import from bundlers
    const viteMod = "vi" + "te";
    const { createServer: createViteServer } = await import(viteMod);
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

// Check if the current file is being run directly (e.g. via tsx server.ts or node dist/server.cjs)
const isMain = process.argv[1] && (
  (typeof __filename !== 'undefined' && path.resolve(process.argv[1]) === path.resolve(__filename)) ||
  (typeof import.meta !== 'undefined' && import.meta && import.meta.url && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url))
);

if (!process.env.VERCEL || isMain) {
  startServer();
}

export default app;
