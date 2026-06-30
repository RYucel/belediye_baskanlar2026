import express from "express";
import path from "path";
import { GoogleGenAI } from "@google/genai";
import { initializeApp as initializeAdminApp, cert, getApps as getAdminApps } from 'firebase-admin/app';
import { getFirestore as getAdminFirestore, FieldValue } from 'firebase-admin/firestore';
import { initializeApp as initializeClientApp } from 'firebase/app';
import { getFirestore as getClientFirestore, collection, getDocs, doc, getDoc, setDoc } from 'firebase/firestore';
import fs from 'fs';
import { fileURLToPath } from 'url';

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json());

let aiClient: GoogleGenAI | null = null;

function getAiClient() {
  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY || "dummy-key-to-prevent-crash",
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

// Firebase Init
let adminDb: any;
let clientDb: any;
let isUsingClient = false;
try {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    // Vercel deployment approach
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
    const existingApps = getAdminApps();
    const firebaseApp = existingApps.length > 0 
      ? existingApps[0] 
      : initializeAdminApp({
          credential: cert(serviceAccount)
        });
    
    // Resolve custom Firestore database ID if available
    let databaseId = "(default)";
    const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
    if (fs.existsSync(configPath)) {
      try {
        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        if (config.firestoreDatabaseId) {
          databaseId = config.firestoreDatabaseId;
        }
      } catch (err) {
        console.warn("Could not parse database ID from config:", err);
      }
    }
    if (process.env.FIREBASE_DATABASE_ID) {
      databaseId = process.env.FIREBASE_DATABASE_ID;
    }
    
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

// API Routes
app.get("/api/mayors", async (req, res) => {
  try {
    let allVotes: any[] = [];
    
    if (adminDb || clientDb) {
      try {
        if (isUsingClient) {
          const snapshot = await getDocs(collection(clientDb, 'votes'));
          allVotes = snapshot.docs.map(d => d.data());
        } else {
          const snapshot = await adminDb.collection('votes').get();
          allVotes = snapshot.docs.map((d: any) => d.data());
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

app.post("/api/vote", async (req, res) => {
  const { deviceId, mayorId, rating } = req.body;
  
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

  const voteKey = `${deviceId}-${mayorId}`;
  
  if (adminDb || clientDb) {
    try {
      if (isUsingClient) {
        const voteRef = doc(clientDb, 'votes', voteKey);
        const docSnap = await getDoc(voteRef);
        
        if (docSnap.exists()) {
          res.status(400).json({ error: "Bu belediye başkanı için zaten oy kullandınız." });
          return;
        }

        await setDoc(voteRef, {
          deviceId,
          mayorId,
          rating,
          createdAt: new Date().toISOString()
        });
      } else {
        const voteRef = adminDb.collection('votes').doc(voteKey);
        const docSnap = await voteRef.get();
        
        if (docSnap.exists) {
          res.status(400).json({ error: "Bu belediye başkanı için zaten oy kullandınız." });
          return;
        }

        await voteRef.set({
          deviceId,
          mayorId,
          rating,
          createdAt: FieldValue.serverTimestamp()
        });
      }
      
      res.json({ success: true });
      return;
    } catch (error) {
      console.warn("Firestore save failed, falling back to memory:", error);
    }
  }

  // In-memory fallback
  if (memoryVotes.has(voteKey)) {
    res.status(400).json({ error: "Bu belediye başkanı için zaten oy kullandınız." });
    return;
  }

  memoryVotes.set(voteKey, {
    deviceId,
    mayorId,
    rating,
    createdAt: new Date().toISOString()
  });
  
  res.json({ success: true });
});

app.post("/api/mayor/news", async (req, res) => {
  const { name, city } = req.body;
  if (!name || !city) {
    res.status(400).json({ error: "İsim veya şehir eksik." });
    return;
  }
  
  try {
    const response = await getAiClient().models.generateContent({
      model: "gemini-3.5-flash",
      contents: `KKTC ${city} Belediye Başkanı ${name} hakkında en son çıkan haberleri, icraatlarını veya güncel gelişmeleri özetle. Yanıtın kısa, tarafsız ve sadece haber odaklı olsun. Eğer yeni bir bilgi yoksa genel bilgi ver. Sadece Türkçe yanıt ver.`,
      config: {
        tools: [{ googleSearch: {} }],
        systemInstruction: "You are a helpful assistant providing neutral, up-to-date news summaries."
      },
    });
    
    // Extract URLs if available
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    let sources: {uri: string, title: string}[] = [];
    if (chunks) {
      sources = chunks
        .filter((chunk: any) => chunk.web?.uri && chunk.web?.title)
        .map((chunk: any) => ({
          uri: chunk.web.uri,
          title: chunk.web.title
        }));
    }

    res.json({ text: response.text, sources });
  } catch (error) {
    console.error("Gemini Error:", error);
    res.status(500).json({ error: "Haberler alınırken bir hata oluştu." });
  }
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
