import express from "express";
import path from "path";
import { initializeApp as initializeAdminApp, cert, getApps as getAdminApps } from 'firebase-admin/app';
import { getFirestore as getAdminFirestore, FieldValue } from 'firebase-admin/firestore';
import { initializeApp as initializeClientApp } from 'firebase/app';
import { getFirestore as getClientFirestore, collection, getDocs, doc, getDoc, setDoc, query, where, deleteDoc, runTransaction } from 'firebase/firestore';
import fs from 'fs';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

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

const SERVER_PEPPER = process.env.SERVER_PEPPER || "kktc-belediye-voting-pepper-2026-secure-secret-key";

function normalizeContact(contact: string): string {
  const clean = contact.trim().toLowerCase();
  if (clean.includes('@')) {
    return clean;
  }
  return clean.replace(/\D/g, '');
}

function hashCredential(normalizedContact: string): string {
  return crypto.createHash('sha256').update(normalizedContact + SERVER_PEPPER).digest('hex');
}

app.post("/api/request-otp", async (req, res) => {
  const { contact } = req.body;
  if (!contact || typeof contact !== 'string') {
    res.status(400).json({ error: "Geçersiz iletişim bilgisi." });
    return;
  }

  const normalized = normalizeContact(contact);
  if (!normalized) {
    res.status(400).json({ error: "Geçersiz e-posta veya telefon numarası." });
    return;
  }

  // Generate 6-digit code
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const credentialId = hashCredential(normalized);
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

  if (adminDb || clientDb) {
    try {
      if (isUsingClient) {
        await withTimeout(setDoc(doc(clientDb, 'otps', credentialId), { code, expiresAt }), 4000, null);
      } else {
        await withTimeout(adminDb.collection('otps').doc(credentialId).set({ code, expiresAt }), 4000, null);
      }
    } catch (error) {
      console.error("Failed to write OTP to Firestore:", error);
    }
  }

  console.log(`[OTP SEND MOCK] Send code ${code} to normalized contact ${normalized}`);

  if (process.env.NODE_ENV !== 'production') {
    res.json({ success: true, code });
  } else {
    res.json({ success: true });
  }
});

app.post("/api/verify-otp", async (req, res) => {
  const { contact, code } = req.body;
  if (!contact || !code) {
    res.status(400).json({ error: "Eksik bilgi." });
    return;
  }

  const normalized = normalizeContact(contact);
  const credentialId = hashCredential(normalized);

  let otpDoc: any = null;

  if (adminDb || clientDb) {
    try {
      if (isUsingClient) {
        const snap = await withTimeout(getDoc(doc(clientDb, 'otps', credentialId)), 4000, null);
        otpDoc = snap && snap.exists() ? snap.data() : null;
      } else {
        const snap = await withTimeout(adminDb.collection('otps').doc(credentialId).get(), 4000, null);
        otpDoc = snap && snap.exists ? snap.data() : null;
      }
    } catch (error) {
      console.error("Failed to fetch OTP from Firestore:", error);
    }
  }

  if (!otpDoc || otpDoc.code !== code.trim()) {
    res.status(400).json({ error: "Doğrulama kodu hatalı." });
    return;
  }

  if (new Date(otpDoc.expiresAt) < new Date()) {
    res.status(400).json({ error: "Doğrulama kodunun süresi dolmuş." });
    return;
  }

  if (adminDb || clientDb) {
    try {
      if (isUsingClient) {
        await withTimeout(setDoc(doc(clientDb, 'voters', credentialId), {
          status: 'verified',
          verifiedAt: new Date().toISOString(),
          used: false
        }), 4000, null);
        await withTimeout(deleteDoc(doc(clientDb, 'otps', credentialId)), 4000, null);
      } else {
        await withTimeout(adminDb.collection('voters').doc(credentialId).set({
          status: 'verified',
          verifiedAt: FieldValue.serverTimestamp(),
          used: false
        }), 4000, null);
        await withTimeout(adminDb.collection('otps').doc(credentialId).delete(), 4000, null);
      }
    } catch (error) {
      console.error("Failed to write voter verification to Firestore:", error);
    }
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

  // Resolve IP Address & Hash it
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
  const rawIp = typeof ip === 'string' 
    ? ip.split(',')[0].trim() 
    : Array.isArray(ip) 
      ? ip[0].trim() 
      : '';
  const ipHash = rawIp ? crypto.createHash('sha256').update(rawIp).digest('hex') : 'unknown';
  const userAgent = req.headers['user-agent'] || 'unknown';

  const isSecure = process.env.SECURE_VOTING_ENABLED !== "false";
  const voteKey = idempotencyKey || `${deviceId}-${mayorId}`;

  // If Secure Voting is Enabled: Transactional Credential Single-Cast
  if (isSecure) {
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
