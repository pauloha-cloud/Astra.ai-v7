import express from "express";
import http from "http";
import { WebSocketServer } from "ws";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import cors from "cors";
import { YoutubeTranscript } from 'youtube-transcript';
import axios from 'axios';
import "dotenv/config";
import { GoogleGenAI, Type } from "@google/genai";
import multer from "multer";
import { PDFParse } from "pdf-parse";
import fs from "fs";
import Stripe from "stripe";
import { initializeApp as initializeFirebaseApp } from "firebase/app";
import { getFirestore as getFirebaseFirestore, doc as firebaseDoc, updateDoc as firebaseUpdateDoc, setDoc as firebaseSetDoc, collection as firebaseCollection, query as firebaseQuery, where as firebaseWhere, getDocs as firebaseGetDocs, getDoc as firebaseGetDoc, serverTimestamp as firebaseServerTimestamp } from "firebase/firestore";
import { initializeApp as initializeAdminApp, getApps as getAdminApps, getApp as getAdminApp } from "firebase-admin/app";
import { getFirestore as getAdminFirestore, FieldValue as AdminFieldValue } from "firebase-admin/firestore";
import { getAuth as getAdminAuth, type Auth as AdminAuth } from "firebase-admin/auth";
// @ts-ignore
import mammoth from "mammoth";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure multer for in-memory file uploads (max 25MB limit to support 20MB PDFs)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 }
});

// Lazy Initialize AI Client for GoogleGenAI
let cachedAIClient: GoogleGenAI | null = null;
let currentAuthWorkflow = "";

function getAI(): GoogleGenAI {
  if (cachedAIClient) return cachedAIClient;

  const isVertex = !!process.env.VERTEX_PROJECT_ID;
  if (isVertex) {
    const project = process.env.VERTEX_PROJECT_ID;
    const location = process.env.VERTEX_LOCATION || "us-central1";
    console.log(`[Backend AI] AUTH WORKFLOW DETECTED: Google Cloud Vertex AI (Project: ${project}, Location: ${location})`);
    currentAuthWorkflow = `Vertex AI (Project: ${project})`;
    cachedAIClient = new GoogleGenAI({
      vertexai: true,
      project: project,
      location: location
    });
    return cachedAIClient;
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "MY_GEMINI_API_KEY" || apiKey.trim() === "") {
    console.error("[Backend AI] ERROR: GEMINI_API_KEY is missing, empty, or using the placeholder value 'MY_GEMINI_API_KEY'.");
    throw new Error("Missing or invalid Gemini API configuration. Please configure GEMINI_API_KEY on the server.");
  }

  console.log(`[Backend AI] AUTH WORKFLOW DETECTED: Standard Gemini API (API Key starts with: ${apiKey.substring(0, 4)}...)`);
  currentAuthWorkflow = "Standard Gemini API Key";
  cachedAIClient = new GoogleGenAI({
    apiKey: apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build-tutor',
      }
    }
  });

  return cachedAIClient;
}

async function generateContentWithRetry(ai: any, params: any, maxRetries = 4, baseDelayMs = 1500): Promise<any> {
  let attempt = 0;
  while (true) {
    try {
      return await ai.models.generateContent(params);
    } catch (err: any) {
      attempt++;
      const errMsg = err.message || "";
      const errName = err.name || "";
      const isNetworkError = errName.includes("TypeError") || 
                             errMsg.toLowerCase().includes("fetch failed") ||
                             errMsg.toLowerCase().includes("timeout") ||
                             errMsg.toLowerCase().includes("etimedout") ||
                             errMsg.toLowerCase().includes("econnreset") ||
                             errMsg.toLowerCase().includes("socket hang up") ||
                             errMsg.toLowerCase().includes("network connection") ||
                             errMsg.toLowerCase().includes("failed to fetch");
      const isTransient = err.status === 503 || err.status === 429 || 
                          errMsg.includes("503") || errMsg.includes("429") ||
                          errMsg.toLowerCase().includes("high demand") || 
                          errMsg.toLowerCase().includes("temporary") ||
                          errMsg.toLowerCase().includes("unavailable") ||
                          errMsg.toLowerCase().includes("overloaded") ||
                          isNetworkError;

      if (isTransient) {
        if (params.model === "gemini-3.5-flash") {
          console.log(`[Gemini] Model gemini-3.5-flash fallback triggered. Retrying using alternate model...`);
          params.model = "gemini-3.1-flash-lite";
          attempt = 0;
          continue;
        } else if (params.model === "gemini-3.1-flash-lite") {
          console.log(`[Gemini] Model gemini-3.1-flash-lite fallback triggered. Retrying using alternate model...`);
          params.model = "gemini-flash-latest";
          attempt = 0;
          continue;
        }
        
        if (attempt < maxRetries) {
          const delay = baseDelayMs * Math.pow(2, attempt - 1) * (0.8 + Math.random() * 0.4);
          console.log(`[Gemini] Retrying request for ${params.model} in ${Math.round(delay)}ms (attempt ${attempt}/${maxRetries})...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
      }
      throw err;
    }
  }
}

// Helper to extract YouTube Video ID from various formats
function extractVideoId(url: string | any): string | null {
  if (!url || typeof url !== 'string') {
    console.warn("[Backend] extractVideoId: Input is not a valid string", typeof url);
    return null;
  }
  
  const cleanUrl = url.trim();
  console.log(`[Backend] Received URL to extract: "${cleanUrl}"`);
  
  try {
    // Attempt standard URL parsing
    const urlWithProtocol = cleanUrl.includes('://') ? cleanUrl : `https://${cleanUrl}`;
    const urlObj = new URL(urlWithProtocol);
    
    // youtu.be/ID
    if (urlObj.hostname === 'youtu.be') {
      const id = urlObj.pathname.slice(1).split(/[?#&]/)[0];
      if (id.length === 11) {
        console.log(`[Backend] Extracted from youtu.be: ${id}`);
        return id;
      }
    }
    
    // youtube.com
    if (urlObj.hostname.includes('youtube.com')) {
      // 1. Primary check for ?v=ID
      const v = urlObj.searchParams.get('v');
      if (v && v.length === 11) {
        console.log(`[Backend] Extracted from query param 'v': ${v}`);
        return v;
      }
      
      // 2. Check for shorts, live, embed, etc in path
      const pathParts = urlObj.pathname.split('/');
      // e.g. /shorts/ID -> ["", "shorts", "ID"]
      const idFromPath = pathParts.find(part => part.length === 11 && /^[a-zA-Z0-9_-]{11}$/.test(part));
      if (idFromPath) {
        console.log(`[Backend] Extracted from path segment: ${idFromPath}`);
        return idFromPath;
      }
    }
  } catch (e) {
    console.warn("[Backend] URL Parsing failed, using regex fallback");
  }

  // Regex Fallback
  const patterns = [
    /[?&]v=([a-zA-Z0-9_-]{11})/,
    /youtu\.be\/([a-zA-Z0-9_-]{11})/,
    /embed\/([a-zA-Z0-9_-]{11})/,
    /shorts\/([a-zA-Z0-9_-]{11})/,
    /live\/([a-zA-Z0-9_-]{11})/,
    /v\/([a-zA-Z0-9_-]{11})/
  ];

  for (const pattern of patterns) {
    const match = cleanUrl.match(pattern);
    if (match && match[1]) {
      console.log(`[Backend] Regex matched: ${match[1]}`);
      return match[1];
    }
  }

  // Just the ID
  if (/^[a-zA-Z0-9_-]{11}$/.test(cleanUrl)) {
    return cleanUrl;
  }

  return null;
}

// Helper to safely parse Gemini JSON
function safeParseAIJSON(text: string): any {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch (e) {
    console.warn("[Backend] JSON.parse failed on AI response, attempting clean & repair...");
    // Attempt to extract JSON from code blocks or loose braces
    const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/) || 
                      text.match(/\{[\s\S]*\}/);
    
    if (jsonMatch) {
      try {
        const cleaned = (jsonMatch[1] || jsonMatch[0]).trim();
        return JSON.parse(cleaned);
      } catch (innerE) {
        console.error("[Backend] Failed to parse extracted JSON block");
      }
    }
    return null;
  }
}

function getExplanationInstruction(level: string, lang: string): string {
  const isPt = lang === 'pt';
  const isEs = lang === 'es';

  if (level === 'basic') {
    if (isPt) {
      return "Ajuste a profundidade da resposta para o nível BÁSICO: Explique tudo de forma simples e amigável, como se estivesse ensinando a um iniciante total. Evite jargões técnicos desnecessários, use analogias do dia a dia e forneça exemplos muito claros e introdutórios.";
    } else if (isEs) {
      return "Ajusta la profundidad de la respuesta al nivel BÁSICO: Explica todo de manera sencilla y amigable, como si estuvieras enseñando a un principiante absoluto. Evita tecnicismos innecesarios, utiliza analogías de la vida cotidiana y ofrece ejemplos muy claros e introduccionarios.";
    } else {
      return "Adjust the depth of response to BASIC level: Explain everything in a simple, friendly manner, as if teaching a complete beginner. Avoid unnecessary technical jargon, use everyday analogies, and provide very clear, introductory examples.";
    }
  } else if (level === 'advanced') {
    if (isPt) {
      return "Ajuste a profundidade da resposta para o nível AVANÇADO: Entregue explicações de alta profundidade técnica, completas e detalhadas. Use terminologia acadêmica/profissional precisa, explore conexões conceituais avançadas, sutilezas e ramificações complexas do assunto.";
    } else if (isEs) {
      return "Ajusta la profundidad de la respuesta al nivel AVANZADO: Entrega explicaciones de gran profundidad técnica, completas y detalladas. Utiliza terminología académica/profesional precisa, explora conexiones conceptuales avanzadas, sutilezas y ramificaciones complejas del tema.";
    } else {
      return "Adjust the depth of response to ADVANCED level: Deliver highly detailed, technically profound and comprehensive explanations. Use precise academic or professional terminology, explore advanced conceptual connections, nuances, and complex ramifications of the subject.";
    }
  } else {
    // intermediate
    if (isPt) {
      return "Ajuste a profundidade da resposta para o nível INTERMEDIÁRIO: Forneça um equilíbrio perfeito entre clareza e profundidade. Explique os termos técnicos de forma didática, conecte conceitos relacionados e use exemplos práticos para fixação.";
    } else if (isEs) {
      return "Ajusta la profundidad de la respuesta al nivel INTERMEDIO: Proporciona un equilibrio perfecto entre claridad y profundidad. Explica los tecnicismos de forma didáctica, conecta conceptos relacionados y utiliza ejemplos prácticos para reforzar el aprendizaje.";
    } else {
      return "Adjust the depth of response to INTERMEDIO level: Provide a perfect balance between clarity and depth. Explain technical terms didactically, connect related concepts, and use practical examples for solid understanding.";
    }
  }
}

// Handle unhandled promise rejections to prevent process crashes
process.on('unhandledRejection', (reason, promise) => {
  console.error('[Backend] Unhandled Rejection at:', promise, 'reason:', reason);
});

/**
 * Initializes a new Tutor AI Live session using the @google/genai SDK,
 * automatically detecting and configuring either a standard Gemini API key
 * or a Google Cloud Vertex AI authentication workflow.
 */
async function initializeTutorSession(
  videoTitle: string,
  transcript: string,
  clientWs: any,
  explanationLevel: string = "intermediate",
  lang: string = "en"
): Promise<any> {
  let aiClient: GoogleGenAI;
  
  try {
    aiClient = getAI();
    console.log(`[Backend Tutor] Dynamic AI Client resolved. Active workflow: ${currentAuthWorkflow}`);
  } catch (err: any) {
    console.error("[Backend Tutor] Failed to initialize dynamic GoogleGenAI client:", err.message);
    if (clientWs.readyState === 1) { // 1 is WebSocket.OPEN
      clientWs.send(JSON.stringify({ 
        event: "error", 
        details: err?.message || "Tutor live session cannot start due to missing server-side API configuration." 
      }));
    }
    throw err;
  }

  const isVertex = !!process.env.VERTEX_PROJECT_ID;
  const modelName = isVertex 
    ? (process.env.VERTEX_MODEL_NAME || "gemini-3.1-flash-live-preview")
    : "gemini-3.1-flash-live-preview";

  console.log(`[Backend Tutor] Starting Gemini/Vertex Live API connection under model '${modelName}' for: "${videoTitle}"`);

  return await aiClient.live.connect({
    model: modelName,
    callbacks: {
      onopen: () => {
        console.log("[Backend Tutor] Connected successfully to Gemini/Vertex Live API stream");
        if (clientWs.readyState === 1) { // 1 is WebSocket.OPEN
          clientWs.send(JSON.stringify({ event: "open" }));
        }
      },
      onmessage: (liveMsg) => {
        if (clientWs.readyState === 1) { // 1 is WebSocket.OPEN
          clientWs.send(JSON.stringify({ event: "message", data: liveMsg }));
        }
      },
      onclose: () => {
        console.log("[Backend Tutor] Gemini/Vertex Live API session closed cleanly");
        if (clientWs.readyState === 1) { // 1 is WebSocket.OPEN
          clientWs.send(JSON.stringify({ event: "close" }));
          clientWs.close();
        }
      },
      onerror: (err: any) => {
        console.error("[Backend Tutor] Gemini/Vertex Live session encountered an error:", err);
        if (clientWs.readyState === 1) { // 1 is WebSocket.OPEN
          clientWs.send(JSON.stringify({ event: "error", details: err?.message || "Gemini Live Session Error" }));
        }
      }
    },
    config: {
      responseModalities: ["AUDIO" as any],
      speechConfig: {
        voiceConfig: { prebuiltVoiceConfig: { voiceName: "Zephyr" } },
      },
      outputAudioTranscription: {},
      inputAudioTranscription: {},
      systemInstruction: `You are Astra Learning AI, the ultimate neural study companion. You are guiding a student on the study source: "${videoTitle}".\n\n` +
      `Context from the study source:\n${(transcript || "").substring(0, 15000)}\n\n` +
      `Pedagogical Guidelines:\n` +
      `1. Be the ultimate mentor. Don't just give answers—ask targeted questions that guide the user to the answer.\n` +
      `2. Use specific examples from the study source context to build your explanations.\n` +
      `3. If the user seems lost, simplify the concept using a real-world analogy.\n` +
      `4. Acknowledge the user's progress. Use phrases like "Exactly!", "Great catch", "You've got it".\n` +
      `5. Keep your spoken responses concise and energetic. Aim for natural conversation patterns.\n\n` +
      `LANGUAGE DIRECTIVE (CRITICAL):\n` +
      `You MUST conduct the entire voice/chat tutoring session in the user's chosen language: ${lang === "pt" ? "Portuguese (Brazilian)" : lang === "es" ? "Spanish" : "English"}. Do not use English if the user language is Portuguese or Spanish. Even if the video transcript is in another language, speak to the student entirely in ${lang === "pt" ? "Portuguese" : lang === "es" ? "Spanish" : "English"}.\n\n` +
      `EXPLANATION LEVEL DIRECTIVE (CRITICAL):\n` +
      `${getExplanationInstruction(explanationLevel, lang)}`
    }
  });
}

// --- STRIPE & FIREBASE BACKEND INTEGRATION HELPERS ---
let cachedStripeClient: Stripe | null = null;
function getStripe(): Stripe {
  if (cachedStripeClient) return cachedStripeClient;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error("STRIPE_SECRET_KEY is not configured on the server.");
  }
  cachedStripeClient = new Stripe(key);
  return cachedStripeClient;
}

function stripeUnixToDate(value: unknown): Date | null {
  if (typeof value !== "number") return null;
  if (!Number.isInteger(value)) return null;
  if (value <= 0) return null;

  const date = new Date(value * 1000);
  if (Number.isNaN(date.getTime())) return null;

  return date;
}

let cachedFirebaseDb: any = null;
function getFirebaseDb(): any {
  if (cachedFirebaseDb) return cachedFirebaseDb;
  try {
    const firebaseConfigPath = path.resolve(__dirname, "./firebase-applet-config.json");
    if (!fs.existsSync(firebaseConfigPath)) {
      throw new Error(`Firebase configuration file not found at ${firebaseConfigPath}`);
    }
    const firebaseConfig = JSON.parse(fs.readFileSync(firebaseConfigPath, "utf8"));
    console.log("[Firebase Admin] firestoreDatabaseId:", firebaseConfig.firestoreDatabaseId);
    const firebaseApp = initializeFirebaseApp(firebaseConfig);
    cachedFirebaseDb = getFirebaseFirestore(firebaseApp, firebaseConfig.firestoreDatabaseId);
    return cachedFirebaseDb;
  } catch (err: any) {
    console.error("[Backend Firebase] Initialization failed:", err);
    throw err;
  }
}

let cachedAdminDb: any = null;
function getFirebaseAdminDb(): any {
  if (cachedAdminDb) return cachedAdminDb;
  try {
    const firebaseConfigPath = path.resolve(__dirname, "./firebase-applet-config.json");
    if (!fs.existsSync(firebaseConfigPath)) {
      throw new Error(`Firebase configuration file not found at ${firebaseConfigPath}`);
    }
    const firebaseConfig = JSON.parse(fs.readFileSync(firebaseConfigPath, "utf8"));
    console.log("[Firebase Admin] firestoreDatabaseId:", firebaseConfig.firestoreDatabaseId);
    const apps = getAdminApps();
    let adminApp;
    if (apps.length === 0) {
      adminApp = initializeAdminApp({
        projectId: firebaseConfig.projectId,
      });
    } else {
      adminApp = apps[0] || getAdminApp();
    }
    cachedAdminDb = getAdminFirestore(adminApp, firebaseConfig.firestoreDatabaseId);
    return cachedAdminDb;
  } catch (err: any) {
    console.error("[Backend Firebase Admin] Initialization failed:", err);
    throw err;
  }
}

let cachedAdminAuth: AdminAuth | null = null;
export function getFirebaseAdminAuth(): AdminAuth {
  if (cachedAdminAuth) return cachedAdminAuth;
  try {
    const apps = getAdminApps();
    let adminApp;
    if (apps.length === 0) {
      const firebaseConfigPath = path.resolve(__dirname, "./firebase-applet-config.json");
      if (!fs.existsSync(firebaseConfigPath)) {
        throw new Error(`Firebase configuration file not found at ${firebaseConfigPath}`);
      }
      const firebaseConfig = JSON.parse(fs.readFileSync(firebaseConfigPath, "utf8"));
      adminApp = initializeAdminApp({
        projectId: firebaseConfig.projectId,
      });
    } else {
      adminApp = apps[0] || getAdminApp();
    }
    cachedAdminAuth = getAdminAuth(adminApp);
    return cachedAdminAuth;
  } catch (err: any) {
    console.error("[Backend Firebase Admin Auth] Initialization failed:", err);
    throw err;
  }
}

export interface AuthenticatedRequest extends express.Request {
  auth?: {
    uid: string;
    email?: string;
  };
}

export async function requireAuth(
  req: AuthenticatedRequest,
  res: express.Response,
  next: express.NextFunction
): Promise<void | express.Response> {
  const authHeader = req.headers.authorization;
  if (!authHeader || typeof authHeader !== "string") {
    return res.status(401).json({ error: "unauthorized" });
  }

  const parts = authHeader.trim().split(/\s+/);
  if (parts.length !== 2 || parts[0] !== "Bearer" || !parts[1]) {
    return res.status(401).json({ error: "unauthorized" });
  }

  const token = parts[1];

  try {
    const adminAuth = getFirebaseAdminAuth();
    const decodedToken = await adminAuth.verifyIdToken(token, true);
    req.auth = {
      uid: decodedToken.uid,
      email: decodedToken.email,
    };
    return next();
  } catch (err: any) {
    const code = err?.code;
    const isExpectedAuthError =
      code && (
        code === "auth/id-token-expired" ||
        code === "auth/id-token-revoked" ||
        code === "auth/invalid-id-token" ||
        code === "auth/argument-error" ||
        code === "auth/invalid-argument" ||
        code === "auth/user-disabled" ||
        code === "auth/user-not-found" ||
        String(code).startsWith("auth/")
      );

    if (isExpectedAuthError) {
      console.warn(`[requireAuth] Authentication failed: ${code}`);
      return res.status(401).json({ error: "unauthorized" });
    }

    console.error("[requireAuth] Unexpected authentication service error");
    return res.status(500).json({ error: "authentication_service_error" });
  }
}

function getPlanLimits(planId: string) {
  let vLimit = 0;
  let mAnalyses = 50;
  let maxVideoLen = 60;

  if (planId === "explorer") {
    vLimit = 30;
    mAnalyses = 150;
    maxVideoLen = 60;
  } else if (planId === "pro") {
    vLimit = 300;
    mAnalyses = 300;
    maxVideoLen = 999999;
  }

  return {
    voiceTutor: {
      monthlyIncludedMinutes: vLimit,
      monthlyUsedMinutes: 0,
      addonAvailableMinutes: 0,
      addonUsedMinutes: 0,
      addonExpiresAt: null,
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date()
    },
    limits: {
      monthlyVoiceTutorMinutes: vLimit,
      monthlyAnalyses: mAnalyses,
      maxVideoDurationMinutes: maxVideoLen === 999999 ? null : maxVideoLen
    }
  };
}

async function findUserAndSubscriptionUpdate(
  userId: string | undefined, 
  email: string | undefined, 
  subscriptionData: any
): Promise<boolean> {
  const db = getFirebaseAdminDb();
  let userRef: any = null;
  let foundUserId: string | null = null;
  let isNewDoc = false;

  // 1. Try finding by userId
  if (userId) {
    const docRef = db.collection("users").doc(userId);
    try {
      const docSnap = await docRef.get();
      userRef = docRef;
      foundUserId = userId;
      if (docSnap.exists) {
        console.log(`[Stripe Webhook] Found user directly by ID: ${userId}`);
      } else {
        console.log(`[Stripe Webhook] User document does not exist for ID: ${userId}. Will auto-create.`);
        isNewDoc = true;
      }
    } catch (err) {
      console.error(`[Stripe Webhook] Error fetching user doc by ID ${userId}:`, err);
    }
  }

  // 2. Try finding by email query if not found by ID
  if (!userRef && email) {
    const cleanEmail = email.toLowerCase().trim();
    console.log(`[Stripe Webhook] Looking up user by email query: ${cleanEmail}`);
    try {
      const querySnapshot = await db.collection("users").where("email", "==", cleanEmail).get();
      if (!querySnapshot.empty) {
        const userDoc = querySnapshot.docs[0];
        userRef = db.collection("users").doc(userDoc.id);
        foundUserId = userDoc.id;
        console.log(`[Stripe Webhook] Found user by email query: ${cleanEmail}, user UID: ${userDoc.id}`);
      }
    } catch (err) {
      console.error(`[Stripe Webhook] Error querying user by email ${cleanEmail}:`, err);
    }
  }

  // If we couldn't find a doc but we have a direct userId from checkout session metadata, use it as fallback to create a new profile doc
  if (!userRef && userId) {
    userRef = db.collection("users").doc(userId);
    foundUserId = userId;
    isNewDoc = true;
    console.log(`[Stripe Webhook] Creating fallback user document for ID: ${userId}`);
  }

  if (userRef && foundUserId) {
    console.log("Updating subscription with Admin SDK:", {
      userId: foundUserId,
      plan: subscriptionData.plan,
      stripeCustomerId: subscriptionData.stripeCustomerId,
      stripeSubscriptionId: subscriptionData.stripeSubscriptionId
    });

    console.log("Updating user subscription:", {
      userId: foundUserId,
      email: email || "",
      plan: subscriptionData.plan,
      subscriptionStatus: subscriptionData.subscriptionStatus,
      isNewDoc
    });

    try {
      const finalData: any = {
        ...subscriptionData,
        updatedAt: AdminFieldValue.serverTimestamp()
      };
      if (isNewDoc) {
        finalData.createdAt = AdminFieldValue.serverTimestamp();
        if (email) {
          finalData.email = email;
        }
        finalData.uid = foundUserId;
      }
      await userRef.set(finalData, { merge: true });
      console.log(`[Stripe Webhook] Successfully wrote user ${foundUserId} (isNewDoc: ${isNewDoc}) with plan ${subscriptionData.plan}`);
      return true;
    } catch (err) {
      console.error(`[Stripe Webhook] Critical Error setting user doc ${foundUserId} in Firestore:`, err);
      throw err;
    }
  } else {
    const errorMsg = `User not found and cannot be created for Stripe checkout session. userId: ${userId || 'none'}, email: ${email || 'none'}`;
    console.error(`[Stripe Webhook] ${errorMsg}`);
    throw new Error(errorMsg);
  }
}

async function findUserByStripeIdsAndUpdate(
  stripeSubscriptionId: string, 
  stripeCustomerId: string | undefined, 
  subscriptionData: any
): Promise<boolean> {
  const db = getFirebaseAdminDb();
  let userRef: any = null;
  let foundUserId: string | null = null;

  // 1. Query by stripeSubscriptionId
  if (stripeSubscriptionId) {
    const querySnapshot = await db.collection("users").where("stripeSubscriptionId", "==", stripeSubscriptionId).get();
    if (!querySnapshot.empty) {
      const userDoc = querySnapshot.docs[0];
      userRef = db.collection("users").doc(userDoc.id);
      foundUserId = userDoc.id;
    }
  }

  // 2. Query by stripeCustomerId if not found by subscription ID
  if (!userRef && stripeCustomerId) {
    const querySnapshot = await db.collection("users").where("stripeCustomerId", "==", stripeCustomerId).get();
    if (!querySnapshot.empty) {
      const userDoc = querySnapshot.docs[0];
      userRef = db.collection("users").doc(userDoc.id);
      foundUserId = userDoc.id;
    }
  }

  if (userRef && foundUserId) {
    console.log("Updating subscription with Admin SDK:", {
      userId: foundUserId,
      plan: subscriptionData.plan,
      stripeCustomerId: subscriptionData.stripeCustomerId || stripeCustomerId,
      stripeSubscriptionId: subscriptionData.stripeSubscriptionId || stripeSubscriptionId
    });

    console.log("Updating user subscription from webhook event:", {
      userId: foundUserId,
      stripeSubscriptionId,
      subscriptionData
    });
    try {
      await userRef.update({
        ...subscriptionData,
        updatedAt: AdminFieldValue.serverTimestamp()
      });
      return true;
    } catch (err) {
      console.error(`[Stripe Webhook] Error updating user doc ${foundUserId} with subscription data:`, err);
      throw err;
    }
  } else {
    console.warn(`[Stripe Webhook] No user found for stripeSubscriptionId: ${stripeSubscriptionId} or stripeCustomerId: ${stripeCustomerId}`);
    return false;
  }
}

function mapPriceIdToPlan(priceId: string | undefined): string {
  if (!priceId) return "free";
  
  const cleanPriceId = priceId.trim();
  
  // Configured Price IDs
  const starterPrice = process.env.STRIPE_STARTER_PRICE_ID || "price_1TrPxJ671Ksfyi4xJBh7oW23";
  const explorerPrice = process.env.STRIPE_EXPLORER_PRICE_ID || "price_1TrQ07671Ksfyi4xrGx4dexT";
  const proPrice = process.env.STRIPE_PRO_PRICE_ID || "price_1TrQ2y671Ksfyi4xe1v0USXi";

  if (cleanPriceId === starterPrice || cleanPriceId === "price_1TrPxJ671Ksfyi4xJBh7oW23") {
    return "starter";
  }
  if (cleanPriceId === explorerPrice || cleanPriceId === "price_1TrQ07671Ksfyi4xrGx4dexT") {
    return "explorer";
  }
  if (cleanPriceId === proPrice || cleanPriceId === "price_1TrQ2y671Ksfyi4xe1v0USXi") {
    return "pro";
  }
  
  return "free";
}

async function saveStripeCustomerMapping(stripeCustomerId: string, userId: string, email?: string) {
  if (!stripeCustomerId || !userId) return;
  const db = getFirebaseAdminDb();
  try {
    const docRef = db.collection("stripeCustomers").doc(stripeCustomerId);
    await docRef.set({
      userId,
      email: email || "",
      updatedAt: AdminFieldValue.serverTimestamp()
    }, { merge: true });
    console.log(`[Stripe Webhook] Saved mapping: stripeCustomers/${stripeCustomerId} -> userId: ${userId}`);
  } catch (err) {
    console.error(`[Stripe Webhook] Error saving customer mapping for ${stripeCustomerId}:`, err);
  }
}

async function getUserIdByStripeCustomerId(stripeCustomerId: string): Promise<string | null> {
  if (!stripeCustomerId) return null;
  const db = getFirebaseAdminDb();
  try {
    // 1. Try direct map from stripeCustomers
    const docRef = db.collection("stripeCustomers").doc(stripeCustomerId);
    const snap = await docRef.get();
    if (snap.exists) {
      const data = snap.data();
      if (data && data.userId) {
        console.log(`[Stripe Webhook] Found userId ${data.userId} in stripeCustomers mapping for customerId: ${stripeCustomerId}`);
        return data.userId;
      }
    }

    // 2. Fallback query on users collection
    const querySnapshot = await db.collection("users").where("stripeCustomerId", "==", stripeCustomerId).get();
    if (!querySnapshot.empty) {
      const userId = querySnapshot.docs[0].id;
      console.log(`[Stripe Webhook] Found userId ${userId} in users collection by stripeCustomerId query`);
      return userId;
    }
  } catch (err) {
    console.error(`[Stripe Webhook] Error retrieving userId for customerId ${stripeCustomerId}:`, err);
  }
  return null;
}

async function getUserIdByStripeSubscriptionId(stripeSubscriptionId: string): Promise<string | null> {
  if (!stripeSubscriptionId) return null;
  const db = getFirebaseAdminDb();
  try {
    const querySnapshot = await db.collection("users").where("stripeSubscriptionId", "==", stripeSubscriptionId).get();
    if (!querySnapshot.empty) {
      const userId = querySnapshot.docs[0].id;
      console.log(`[Stripe Webhook] Found userId ${userId} in users collection by stripeSubscriptionId query`);
      return userId;
    }
  } catch (err) {
    console.error(`[Stripe Webhook] Error retrieving userId for subscriptionId ${stripeSubscriptionId}:`, err);
  }
  return null;
}

async function updateUserSubscriptionData(userId: string, data: {
  plan: string;
  subscriptionStatus: string;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  stripePriceId?: string;
  billingInterval?: string;
  currentPeriodEnd?: Date | null;
  cancelAtPeriodEnd?: boolean;
}) {
  const db = getFirebaseAdminDb();
  
  const plan = data.plan || "free";
  const status = data.subscriptionStatus || "active";
  
  const limits = getPlanLimits(plan);
  
  // 1. Update users/{uid}/billing/current
  const billingRef = db.collection("users").doc(userId).collection("billing").doc("current");
  const billingData = {
    plan,
    status,
    stripeCustomerId: data.stripeCustomerId || "",
    stripeSubscriptionId: data.stripeSubscriptionId || "",
    stripePriceId: data.stripePriceId || "",
    currentPeriodEnd: data.currentPeriodEnd || null,
    cancelAtPeriodEnd: data.cancelAtPeriodEnd || false,
    updatedAt: AdminFieldValue.serverTimestamp()
  };
  
  await billingRef.set(billingData, { merge: true });
  console.log(`[Firestore Sync] Updated users/${userId}/billing/current with:`, billingData);
  
  // 2. Update users/{uid} main document
  const userRef = db.collection("users").doc(userId);
  const mainUserData = {
    plan,
    subscriptionStatus: status,
    planStatus: status,
    stripeCustomerId: data.stripeCustomerId || "",
    stripeSubscriptionId: data.stripeSubscriptionId || "",
    stripePriceId: data.stripePriceId || "",
    billingInterval: data.billingInterval || "month",
    cancelAtPeriodEnd: data.cancelAtPeriodEnd || false,
    currentPeriodEnd: data.currentPeriodEnd || null,
    ...limits,
    updatedAt: AdminFieldValue.serverTimestamp()
  };
  
  await userRef.set(mainUserData, { merge: true });
  console.log(`[Firestore Sync] Updated users/${userId} with:`, mainUserData);
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Use a standard User-Agent for all axios requests
  const AXIOS_CONFIG = {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9'
    },
    timeout: 10000
  };

  app.use(cors());

  // Stripe Webhook Endpoint (requires raw body, defined before express.json()!)
  app.post("/api/stripe/webhook", express.raw({ type: "application/json" }), async (req: express.Request, res: express.Response) => {
    const sig = req.headers["stripe-signature"];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!sig) {
      console.warn("[Stripe Webhook] Missing stripe-signature header.");
      return res.status(400).send("Webhook Error: Missing stripe-signature header.");
    }

    if (!webhookSecret) {
      console.warn("[Stripe Webhook] STRIPE_WEBHOOK_SECRET is not configured on the server.");
      return res.status(400).send("Webhook Error: STRIPE_WEBHOOK_SECRET is not configured.");
    }

    let event: Stripe.Event;

    try {
      const stripe = getStripe();
      event = stripe.webhooks.constructEvent(req.body, sig as string, webhookSecret);
    } catch (err: any) {
      console.error(`[Stripe Webhook] Signature verification failed:`, err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    const dataObject = event.data.object as any;
    console.log(`[Stripe Webhook] Received event of type: ${event.type}`);

    try {
      switch (event.type) {
        case "checkout.session.completed": {
          const session = dataObject as Stripe.Checkout.Session;
          const stripeCustomerId = session.customer as string;
          const stripeSubscriptionId = session.subscription as string;
          
          console.log(`[Stripe Webhook] Received event: checkout.session.completed`, {
            customerId: stripeCustomerId,
            subscriptionId: stripeSubscriptionId
          });

          const userId = session.metadata?.userId || session.client_reference_id || undefined;
          const email = session.customer_details?.email || session.customer_email || session.metadata?.userEmail || undefined;

          if (!userId) {
            console.error("[Stripe Webhook] No userId found in checkout.session.completed metadata or client_reference_id");
            break;
          }

          console.log(`[Stripe Webhook] Found userId: ${userId}`);

          // Always save stripeCustomerId to userId mapping
          if (stripeCustomerId) {
            await saveStripeCustomerMapping(stripeCustomerId, userId, email);
          }

          let plan = session.metadata?.plan || "free";
          let stripePriceId: string | undefined = undefined;
          let billingInterval = "month";
          let currentPeriodEnd: Date | null = null;
          let cancelAtPeriodEnd = false;

          if (stripeSubscriptionId) {
            try {
              const stripe = getStripe();
              const sub = await stripe.subscriptions.retrieve(stripeSubscriptionId) as any;
              const item = sub.items.data[0];
              if (item) {
                stripePriceId = item.price.id;
                billingInterval = item.price.recurring?.interval || "month";
              }
              currentPeriodEnd = stripeUnixToDate(sub.current_period_end);
              cancelAtPeriodEnd = sub.cancel_at_period_end || false;
            } catch (err) {
              console.error("[Stripe Webhook] Error retrieving subscription details from Stripe:", err);
            }
          }

          if (stripePriceId) {
            plan = mapPriceIdToPlan(stripePriceId);
          } else {
            // fallback mapping if subscription retrieve failed
            const priceMap: Record<string, string | undefined> = {
              start: process.env.STRIPE_STARTER_PRICE_ID || "price_1TrPxJ671Ksfyi4xJBh7oW23",
              starter: process.env.STRIPE_STARTER_PRICE_ID || "price_1TrPxJ671Ksfyi4xJBh7oW23",
              explorer: process.env.STRIPE_EXPLORER_PRICE_ID || "price_1TrQ07671Ksfyi4xrGx4dexT",
              pro: process.env.STRIPE_PRO_PRICE_ID || "price_1TrQ2y671Ksfyi4xe1v0USXi"
            };
            // reverse lookup to get priceId
            const keys = Object.keys(priceMap);
            for (const key of keys) {
              if (key === plan) {
                stripePriceId = priceMap[key];
                break;
              }
            }
            plan = mapPriceIdToPlan(stripePriceId);
          }

          console.log(`[Stripe Webhook] Mapped plan: ${plan}, priceId: ${stripePriceId}`);

          await updateUserSubscriptionData(userId, {
            plan,
            subscriptionStatus: "active",
            stripeCustomerId,
            stripeSubscriptionId,
            stripePriceId,
            billingInterval,
            currentPeriodEnd,
            cancelAtPeriodEnd
          });

          console.log(`[Stripe Webhook] Firestore updated successfully for checkout.session.completed (userId: ${userId})`);
          break;
        }

        case "customer.subscription.created": {
          const subscription = dataObject as any;
          const stripeSubscriptionId = subscription.id;
          const stripeCustomerId = subscription.customer as string;
          const status = subscription.status;
          const priceId = subscription.items.data[0]?.price.id;
          const billingInterval = subscription.items.data[0]?.price.recurring?.interval || "month";
          const currentPeriodEnd = stripeUnixToDate(subscription.current_period_end);
          const cancelAtPeriodEnd = subscription.cancel_at_period_end || false;

          const plan = mapPriceIdToPlan(priceId);

          console.log(`[Stripe Webhook] Received event: customer.subscription.created`, {
            customerId: stripeCustomerId,
            subscriptionId: stripeSubscriptionId,
            priceId,
            plan_mapped: plan
          });

          const metadataUserId = subscription.metadata?.userId;
          let userId = metadataUserId || await getUserIdByStripeCustomerId(stripeCustomerId);
          if (!userId && stripeSubscriptionId) {
            userId = await getUserIdByStripeSubscriptionId(stripeSubscriptionId);
          }

          if (userId) {
            console.log(`[Stripe Webhook] Found userId: ${userId}`);
            await saveStripeCustomerMapping(stripeCustomerId, userId);
            
            await updateUserSubscriptionData(userId, {
              plan,
              subscriptionStatus: status,
              stripeCustomerId,
              stripeSubscriptionId,
              stripePriceId: priceId,
              billingInterval,
              currentPeriodEnd,
              cancelAtPeriodEnd
            });
            console.log(`[Stripe Webhook] Firestore updated successfully for customer.subscription.created (userId: ${userId})`);
          } else {
            console.warn(`[Stripe Webhook] No userId found for customer.subscription.created (customerId: ${stripeCustomerId})`);
          }
          break;
        }

        case "customer.subscription.updated": {
          const subscription = dataObject as any;
          const stripeSubscriptionId = subscription.id;
          const stripeCustomerId = subscription.customer as string;
          const status = subscription.status;
          const priceId = subscription.items.data[0]?.price.id;
          const billingInterval = subscription.items.data[0]?.price.recurring?.interval || "month";
          const currentPeriodEnd = stripeUnixToDate(subscription.current_period_end);
          const cancelAtPeriodEnd = subscription.cancel_at_period_end || false;

          const plan = mapPriceIdToPlan(priceId);

          console.log(`[Stripe Webhook] Received event: customer.subscription.updated`, {
            customerId: stripeCustomerId,
            subscriptionId: stripeSubscriptionId,
            priceId,
            plan_mapped: plan
          });

          let userId = await getUserIdByStripeCustomerId(stripeCustomerId);
          if (!userId && stripeSubscriptionId) {
            userId = await getUserIdByStripeSubscriptionId(stripeSubscriptionId);
          }

          if (userId) {
            console.log(`[Stripe Webhook] Found userId: ${userId}`);
            await updateUserSubscriptionData(userId, {
              plan,
              subscriptionStatus: cancelAtPeriodEnd ? "active" : status,
              stripeCustomerId,
              stripeSubscriptionId,
              stripePriceId: priceId,
              billingInterval,
              currentPeriodEnd,
              cancelAtPeriodEnd
            });
            console.log(`[Stripe Webhook] Firestore updated successfully for customer.subscription.updated (userId: ${userId})`);
          } else {
            console.warn(`[Stripe Webhook] No userId found for customer.subscription.updated (customerId: ${stripeCustomerId})`);
          }
          break;
        }

        case "customer.subscription.deleted": {
          const subscription = dataObject as any;
          const stripeSubscriptionId = subscription.id;
          const stripeCustomerId = subscription.customer as string;

          console.log(`[Stripe Webhook] Received event: customer.subscription.deleted`, {
            customerId: stripeCustomerId,
            subscriptionId: stripeSubscriptionId
          });

          let userId = await getUserIdByStripeCustomerId(stripeCustomerId);
          if (!userId && stripeSubscriptionId) {
            userId = await getUserIdByStripeSubscriptionId(stripeSubscriptionId);
          }

          if (userId) {
            console.log(`[Stripe Webhook] Found userId: ${userId}`);
            await updateUserSubscriptionData(userId, {
              plan: "free",
              subscriptionStatus: "canceled",
              stripeCustomerId,
              stripeSubscriptionId,
              stripePriceId: "",
              billingInterval: "month",
              currentPeriodEnd: null,
              cancelAtPeriodEnd: false
            });
            console.log(`[Stripe Webhook] Firestore updated successfully for customer.subscription.deleted (userId: ${userId})`);
          } else {
            console.warn(`[Stripe Webhook] No userId found for customer.subscription.deleted (customerId: ${stripeCustomerId})`);
          }
          break;
        }

        case "invoice.payment_succeeded": {
          const invoice = dataObject as any;
          const stripeCustomerId = invoice.customer as string;
          const stripeSubscriptionId = invoice.subscription as string;

          console.log(`[Stripe Webhook] Received event: invoice.payment_succeeded`, {
            customerId: stripeCustomerId,
            subscriptionId: stripeSubscriptionId
          });

          let userId = await getUserIdByStripeCustomerId(stripeCustomerId);
          if (!userId && stripeSubscriptionId) {
            userId = await getUserIdByStripeSubscriptionId(stripeSubscriptionId);
          }

          if (userId) {
            console.log(`[Stripe Webhook] Found userId: ${userId}`);
            let currentPeriodEnd: Date | null = null;
            let stripePriceId: string | undefined = undefined;
            let billingInterval = "month";
            let cancelAtPeriodEnd = false;
            let plan = "free";

            if (stripeSubscriptionId) {
              try {
                const stripe = getStripe();
                const sub = await stripe.subscriptions.retrieve(stripeSubscriptionId) as any;
                const item = sub.items.data[0];
                if (item) {
                  stripePriceId = item.price.id;
                  billingInterval = item.price.recurring?.interval || "month";
                  plan = mapPriceIdToPlan(stripePriceId);
                }
                currentPeriodEnd = stripeUnixToDate(sub.current_period_end);
                cancelAtPeriodEnd = sub.cancel_at_period_end || false;
              } catch (err) {
                console.error("[Stripe Webhook] Error fetching subscription details in payment_succeeded:", err);
              }
            }

            await updateUserSubscriptionData(userId, {
              plan,
              subscriptionStatus: "active",
              stripeCustomerId,
              stripeSubscriptionId,
              stripePriceId,
              billingInterval,
              currentPeriodEnd,
              cancelAtPeriodEnd
            });
            console.log(`[Stripe Webhook] Firestore updated successfully for invoice.payment_succeeded (userId: ${userId})`);
          } else {
            console.warn(`[Stripe Webhook] No userId found for invoice.payment_succeeded (customerId: ${stripeCustomerId})`);
          }
          break;
        }

        case "invoice.payment_failed": {
          const invoice = dataObject as any;
          const stripeCustomerId = invoice.customer as string;
          const stripeSubscriptionId = invoice.subscription as string;

          console.log(`[Stripe Webhook] Received event: invoice.payment_failed`, {
            customerId: stripeCustomerId,
            subscriptionId: stripeSubscriptionId
          });

          let userId = await getUserIdByStripeCustomerId(stripeCustomerId);
          if (!userId && stripeSubscriptionId) {
            userId = await getUserIdByStripeSubscriptionId(stripeSubscriptionId);
          }

          if (userId) {
            console.log(`[Stripe Webhook] Found userId: ${userId}`);
            let currentPeriodEnd: Date | null = null;
            let stripePriceId: string | undefined = undefined;
            let billingInterval = "month";
            let cancelAtPeriodEnd = false;
            let plan = "free";

            if (stripeSubscriptionId) {
              try {
                const stripe = getStripe();
                const sub = await stripe.subscriptions.retrieve(stripeSubscriptionId) as any;
                const item = sub.items.data[0];
                if (item) {
                  stripePriceId = item.price.id;
                  billingInterval = item.price.recurring?.interval || "month";
                  plan = mapPriceIdToPlan(stripePriceId);
                }
                currentPeriodEnd = stripeUnixToDate(sub.current_period_end);
                cancelAtPeriodEnd = sub.cancel_at_period_end || false;
              } catch (err) {
                console.error("[Stripe Webhook] Error fetching subscription details in payment_failed:", err);
              }
            }

            await updateUserSubscriptionData(userId, {
              plan,
              subscriptionStatus: "past_due",
              stripeCustomerId,
              stripeSubscriptionId,
              stripePriceId,
              billingInterval,
              currentPeriodEnd,
              cancelAtPeriodEnd
            });
            console.log(`[Stripe Webhook] Firestore updated successfully for invoice.payment_failed (userId: ${userId})`);
          } else {
            console.warn(`[Stripe Webhook] No userId found for invoice.payment_failed (customerId: ${stripeCustomerId})`);
          }
          break;
        }

        default:
          console.log(`[Stripe Webhook] Unhandled event type: ${event.type}`);
      }
    } catch (err: any) {
      console.error(`[Stripe Webhook] Critical failure processing event ${event.type}:`, err);
      return res.status(500).send(`Webhook Error: ${err.message || "Internal error"}`);
    }

    res.json({ received: true });
  });

  app.use(express.json());

  // Stripe Checkout Session Creation Endpoint
  app.post(
    "/api/stripe/create-checkout-session",
    requireAuth,
    async (req: AuthenticatedRequest, res: express.Response) => {
      try {
        const userId = req.auth?.uid;
        if (!userId) {
          return res.status(401).json({ error: "unauthorized" });
        }

        const userEmail = req.auth?.email;
        const { plan, successUrl, cancelUrl } = req.body;

        if (!plan) {
          return res.status(400).json({ error: "Missing plan parameter." });
        }

        const validPlans = ["start", "starter", "explorer", "pro"];
        if (!validPlans.includes(plan)) {
          return res.status(400).json({ error: "Invalid plan specified." });
        }

        // Normalize starter to start
        const targetPlan = (plan === "starter" ? "start" : plan);

        const priceMap: Record<string, string | undefined> = {
          start: process.env.STRIPE_STARTER_PRICE_ID || "price_1TrPxJ671Ksfyi4xJBh7oW23",
          starter: process.env.STRIPE_STARTER_PRICE_ID || "price_1TrPxJ671Ksfyi4xJBh7oW23",
          explorer: process.env.STRIPE_EXPLORER_PRICE_ID || "price_1TrQ07671Ksfyi4xrGx4dexT",
          pro: process.env.STRIPE_PRO_PRICE_ID || "price_1TrQ2y671Ksfyi4xe1v0USXi"
        };

        const priceId = priceMap[targetPlan];
        if (!priceId) {
          return res.status(500).json({ error: `Stripe price ID for plan '${targetPlan}' is not configured on the server.` });
        }

        const stripe = getStripe();
        const FRONTEND_URL = process.env.FRONTEND_URL || process.env.APP_URL || "http://localhost:3000";

        console.log(`[Stripe] Creating subscription checkout session for authenticated user: ${userId}, plan: ${targetPlan}`);

        const session = await stripe.checkout.sessions.create({
          mode: "subscription",
          payment_method_types: ["card"],
          ...(userEmail ? { customer_email: userEmail } : {}),
          line_items: [{ price: priceId, quantity: 1 }],
          success_url: successUrl || `${FRONTEND_URL}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: cancelUrl || `${FRONTEND_URL}/pricing`,
          client_reference_id: userId,
          metadata: {
            plan: targetPlan,
            userId: userId,
            userEmail: userEmail || "",
            app: "astra-learning-ai"
          }
        });

        res.json({ url: session.url });
      } catch (err: any) {
        console.error("[Stripe] Failed to create checkout session:", err);
        res.status(500).json({ error: err.message || "Internal server error creating checkout session." });
      }
    }
  );

  // Stripe Upgrade Subscription Endpoint
  app.post(
    "/api/stripe/update-subscription",
    requireAuth,
    async (req: AuthenticatedRequest, res: express.Response) => {
      try {
        const userId = req.auth?.uid;
        if (!userId) {
          return res.status(401).json({ error: "unauthorized" });
        }

        const { newPlan } = req.body;

        if (!newPlan) {
          return res.status(400).json({ error: "Missing newPlan parameter." });
        }

        const validPlans = ["start", "starter", "explorer", "pro"];
        if (!validPlans.includes(newPlan)) {
          return res.status(400).json({ error: "Invalid plan specified." });
        }

        // Normalize starter to start
        const targetPlan = (newPlan === "starter" ? "start" : newPlan);

        // 1. Get user document from Firestore using Admin SDK
        const adminDb = getFirebaseAdminDb();
        const userRef = adminDb.collection("users").doc(userId);
        const userDoc = await userRef.get();

        if (!userDoc.exists) {
          return res.status(404).json({ error: "User not found in database." });
        }

        const userData = userDoc.data() || {};
        const stripeSubscriptionId = userData.stripeSubscriptionId;

        if (!stripeSubscriptionId) {
          return res.status(409).json({ error: "billing_state_invalid" });
        }

        // Resolve Stripe Customer ID (primary: users/{uid}.stripeCustomerId; fallback: billing/current only if root missing)
        let resolvedStripeCustomerId = userData.stripeCustomerId;
        if (!resolvedStripeCustomerId) {
          try {
            const billingRef = adminDb.collection("users").doc(userId).collection("billing").doc("current");
            const billingSnap = await billingRef.get();
            if (billingSnap.exists) {
              resolvedStripeCustomerId = billingSnap.data()?.stripeCustomerId;
            }
          } catch (billingErr) {
            console.error("[Stripe Update] Error fetching stripeCustomerId from billing/current:", billingErr);
          }
        }

        if (!resolvedStripeCustomerId) {
          return res.status(409).json({ error: "billing_state_invalid" });
        }

        // 2. Fetch price ID for new plan
        const priceMap: Record<string, string | undefined> = {
          start: process.env.STRIPE_STARTER_PRICE_ID || "price_1TrPxJ671Ksfyi4xJBh7oW23",
          starter: process.env.STRIPE_STARTER_PRICE_ID || "price_1TrPxJ671Ksfyi4xJBh7oW23",
          explorer: process.env.STRIPE_EXPLORER_PRICE_ID || "price_1TrQ07671Ksfyi4xrGx4dexT",
          pro: process.env.STRIPE_PRO_PRICE_ID || "price_1TrQ2y671Ksfyi4xe1v0USXi"
        };

        const priceId = priceMap[targetPlan];
        if (!priceId) {
          return res.status(500).json({ error: `Stripe price ID for plan '${targetPlan}' is not configured.` });
        }

        const stripe = getStripe();

        console.log(`[Stripe Update] Fetching subscription ${stripeSubscriptionId} for authenticated user ${userId}`);
        const subscription = await stripe.subscriptions.retrieve(stripeSubscriptionId);

        if (!subscription) {
          return res.status(404).json({ error: "Subscription not found on Stripe." });
        }

        // Extract customer ID from retrieved Stripe subscription
        let subscriptionCustomerId: string | undefined = undefined;
        if (typeof subscription.customer === "string") {
          subscriptionCustomerId = subscription.customer;
        } else if (subscription.customer && typeof subscription.customer === "object" && "id" in subscription.customer) {
          subscriptionCustomerId = (subscription.customer as { id: string }).id;
        }

        // Ownership check: subscription must belong to the resolved Stripe customer of the authenticated user
        if (!subscriptionCustomerId || subscriptionCustomerId !== resolvedStripeCustomerId) {
          return res.status(403).json({ error: "forbidden" });
        }

        console.log(`[Stripe Update] Updating subscription ${stripeSubscriptionId} to price ${priceId} for plan ${targetPlan}`);
        
        // Update subscription item
        const updatedSubscription: any = await stripe.subscriptions.update(stripeSubscriptionId, {
          items: [{
            id: subscription.items.data[0].id,
            price: priceId,
          }],
          proration_behavior: "create_prorations",
          metadata: {
            plan: targetPlan,
            userId: userId,
            userEmail: userData.email || ""
          }
        });

        // 3. Update user document in Firestore using Admin SDK
        console.log("Updating subscription with Admin SDK:", {
          userId,
          plan: targetPlan,
          stripeCustomerId: resolvedStripeCustomerId,
          stripeSubscriptionId
        });

        const limits = getPlanLimits(targetPlan);
        const billingInterval = updatedSubscription.items.data[0]?.price.recurring?.interval || "month";
        const currentPeriodEnd = stripeUnixToDate(updatedSubscription.current_period_end);
        const cancelAtPeriodEnd = updatedSubscription.cancel_at_period_end || false;

        console.log("[Stripe Update] current_period_end raw:", updatedSubscription.current_period_end);
        console.log("[Stripe Update] currentPeriodEnd parsed:", currentPeriodEnd);

        const updateData: any = {
          plan: targetPlan,
          subscriptionStatus: updatedSubscription.status || "active",
          stripePriceId: priceId,
          billingInterval,
          cancelAtPeriodEnd,
          ...limits,
          updatedAt: AdminFieldValue.serverTimestamp()
        };

        if (currentPeriodEnd) {
          updateData.currentPeriodEnd = currentPeriodEnd;
        }

        await userRef.update(updateData);

        console.log(`[Stripe Update] Successfully upgraded user ${userId} to ${targetPlan}`);
        res.json({ success: true, plan: targetPlan, subscriptionStatus: updatedSubscription.status });
      } catch (err: any) {
        console.error("[Stripe Update] Failed to update subscription:", err);
        res.status(500).json({ error: err.message || "Internal server error updating subscription." });
      }
    }
  );

  // Stripe Billing Customer Portal Session Endpoint
  app.post(
    "/api/stripe/create-portal-session",
    requireAuth,
    async (req: AuthenticatedRequest, res: express.Response) => {
      try {
        const userId = req.auth?.uid;
        if (!userId) {
          return res.status(401).json({ error: "unauthorized" });
        }

        console.log("[Stripe Portal] Creating portal session for authenticated user:", userId);

        const db = getFirebaseAdminDb();
        let stripeCustomerId: string | undefined = undefined;

        // Check users/{userId}/billing/current first
        try {
          const billingRef = db.collection("users").doc(userId).collection("billing").doc("current");
          const billingSnap = await billingRef.get();
          if (billingSnap.exists) {
            stripeCustomerId = billingSnap.data()?.stripeCustomerId;
          }
        } catch (billingErr) {
          console.error("[Stripe Portal] Error fetching stripeCustomerId from billing/current:", billingErr);
        }

        // Fallback to the main user document
        if (!stripeCustomerId) {
          const userRef = db.collection("users").doc(userId);
          const userSnap = await userRef.get();
          if (userSnap.exists) {
            const userData = userSnap.data() || {};
            stripeCustomerId = userData.stripeCustomerId;
          }
        }

        if (!stripeCustomerId) {
          return res.status(400).json({ error: "No Stripe customer found for this user." });
        }

        const stripe = getStripe();
        const FRONTEND_URL = process.env.FRONTEND_URL || "https://astra-learning-ai-hml-668575929018.us-west2.run.app";

        const session = await stripe.billingPortal.sessions.create({
          customer: stripeCustomerId,
          return_url: `${FRONTEND_URL}/dashboard`
        });

        res.json({ url: session.url });
      } catch (err: any) {
        console.error("[Stripe Portal] Failed to create portal session:", err);
        res.status(500).json({ error: err.message || "Internal server error creating portal session." });
      }
    }
  );

  // Backend Health Check
  const healthHandler = (req: express.Request, res: express.Response) => {
    const geminiKey = process.env.GEMINI_API_KEY;
    const keyConfigured = !!geminiKey && geminiKey !== "MY_GEMINI_API_KEY" && geminiKey.length > 5;
    const keySnippet = keyConfigured ? `${geminiKey!.substring(0, 4)}...` : "none";
    
    res.json({ 
      status: "ok", 
      service: "astra-api", 
      gemini: keyConfigured ? "configured" : "missing",
      keySnippet,
      timestamp: new Date().toISOString() 
    });
  };

  app.get("/api/health", healthHandler);
  app.get("/health", healthHandler);

  // YouTube Info Endpoint
  app.post("/api/youtube-info", async (req, res) => {
    const { url, youtube_url, lang: reqLang = 'en', targetLanguage, explanationLevel = 'intermediate' } = req.body;
    const lang = targetLanguage || reqLang || 'en';
    const targetUrl = url || youtube_url;

    const langNames: Record<string, string> = {
      'pt': 'Portuguese',
      'en': 'English',
      'es': 'Spanish'
    };
    const targetLang = langNames[lang] || 'English';

    console.log(`[Backend] /api/youtube-info: New request for URL: "${targetUrl}" (lang: ${lang})`);

    if (!targetUrl) {
      return res.status(400).json({ 
        error: lang === 'pt' ? 'URL do YouTube é obrigatória' : lang === 'es' ? 'La URL de YouTube es obligatoria' : 'YouTube URL is required' 
      });
    }

    // Step 1: Video ID Extraction
    const videoId = extractVideoId(targetUrl);
    console.log(`[Backend] Extracted Video ID: ${videoId || 'FAILED'}`);
    
    if (!videoId) {
      return res.status(400).json({ 
        error: lang === 'pt' ? 'URL do YouTube inválida' : lang === 'es' ? 'URL de YouTube no válida' : 'Invalid YouTube URL',
        details: lang === 'pt' ? 'Verifique se o link está correto.' : lang === 'es' ? 'Por favor, asegúrese de que el enlace sea correcto.' : 'Please ensure the link is correct.'
      });
    }

    try {
      // Step 2: Metadata Fetching (Defensive)
      let metadata: any = null;
      try {
        console.log(`[Backend] Fetching metadata for ${videoId}...`);
        const oEmbedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
        const oEmbedResponse = await axios.get(oEmbedUrl, AXIOS_CONFIG);
        metadata = oEmbedResponse.data;
        console.log(`[Backend] Metadata fetch: SUCCESS (title: ${metadata.title})`);
      } catch (metaErr: any) {
        const is404 = metaErr.response?.status === 404;
        console.warn(`[Backend] Metadata fetch: ${is404 ? 'NOT FOUND (404)' : 'FAILED'} - ${metaErr.message}`);
        
        if (is404) {
          return res.status(404).json({
            error: lang === 'pt' ? 'Vídeo não encontrado' : 'Video not found',
            details: lang === 'pt' ? 'Este vídeo pode ser privado ou não existir.' : 'This video might be private or does not exist.'
          });
        }
        
        // Fallback metadata
        metadata = {
          title: "YouTube Video",
          author_name: "YouTube Creator",
          thumbnail_url: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`
        };
      }

      // Step 3: Transcript Fetching (Defensive)
      let transcript = "";
      let mode: "transcript" | "metadata_fallback" = "transcript";
      
      try {
        console.log(`[Backend] Fetching transcript for ${videoId}...`);
        const fetchItems = await Promise.race([
          YoutubeTranscript.fetchTranscript(videoId),
          new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 12000))
        ]) as any[];
        
        transcript = fetchItems.map(i => i.text).join(' ');
        if (!transcript || transcript.trim().length < 10) {
          throw new Error("Transcript too short or empty");
        }
        console.log("[Backend] Transcript fetch: SUCCESS");
      } catch (transErr: any) {
        console.log(`[Backend] Transcript fetch: Using metadata fallback.`);
        mode = "metadata_fallback";
      }

      // Step 4: AI Analysis (Gemini)
      console.log(`[Backend] Starting Gemini analysis in ${mode} mode...`);
      let analysisData: any = null;
      
      try {
        // Construct prompt
        const prompt = mode === "transcript" 
          ? `Analyze the following transcript for the video "${metadata.title}" by "${metadata.author_name || "Unknown"}". 
             Generate a comprehensive educational summary, key points, interactive quiz, a simple high-level overview mind map, and a set of study flashcards.
             
             EXPLANATION LEVEL DIRECTIVE (CRITICAL):
             ${getExplanationInstruction(explanationLevel, lang)}
             
             CRITICAL FOR MIND MAP GENERATION:
             1. Create a simple high-level mind map representing 3 to 5 core branches/categories radiating from the main topic.
             2. Each node should have a 'topic' (short, 1-3 words), 'importance' (1-5), 'category', and 'icon'.
             3. Categories: 'Concept', 'Example', 'Detail', 'Definition', 'Method', 'Benefit', 'Risk', 'Trend'.
             5. Icons: Use Lucide icon names like 'Zap', 'BookOpen', 'Target', 'Layers', 'Cpu', 'Globe', 'Activity', 'TrendingUp', 'CheckCircle', 'AlertCircle'.
             
             CRITICAL FOR FLASHCARDS:
             1. Generate up to 10 high-quality flashcards under the field 'flashcards'.
             2. Each flashcard must have a 'front' (a short question or concept prompt), 'back' (a clear and concise answer), 'topic' (the related topic), and 'difficulty' ('basic', 'intermediate', or 'advanced').
             3. Keep each card focused on one idea, make fronts short/clear and backs concise/objective. Avoid vague questions or overly long answers.
             4. If the content is short, generate fewer flashcards. Avoid duplicates.
             
             GENERAL CRITICAL:
             1. Content must be in ${targetLang}.
             2. Response must be valid JSON only.
             3. Summary should be 3-4 paragraphs of high-quality Markdown.
             
             LANGUAGE DIRECTIVE (CRITICAL):
             IMPORTANT: The final answer must be written entirely in ${targetLang}. The source video, transcript, title, description, or metadata may be in another language, but you must understand it and translate/adapt the generated content to ${targetLang}. Do not mix languages. Target language: ${targetLang}. You may receive source content in Portuguese, Spanish, English, or another language. Use the source content only as input. Generate the final response entirely in ${targetLang}. Do not output any language other than ${targetLang}. Do not mix interface language and source video language.
             Understand the source content, but always produce the final answer entirely in ${targetLang}. All fields in the response (including summary, key_points, question/options/explanation in quiz, topic in mind_map, tutor_questions, and limitations) must be fully translated/written in ${targetLang}. Do not mix languages.
             
             Transcript:
             ${transcript.substring(0, 80000)}`
          : `Act as a subject matter expert. I don't have the transcript for the video titled "${metadata.title}" by "${metadata.author_name || "Unknown"}". 
             Based on this title, provide an educational analysis and overview of the subject matter.
             
             EXPLANATION LEVEL DIRECTIVE (CRITICAL):
             ${getExplanationInstruction(explanationLevel, lang)}
             
             CRITICAL FOR MIND MAP GENERATION:
             1. Create a simple high-level mind map with 3-5 main core categories/branches radiating from the main topic.
             2. Use importance levels 1-5, appropriate categories, and Lucide icons.
             
             CRITICAL FOR FLASHCARDS:
             1. Generate up to 10 high-quality flashcards under the field 'flashcards'.
             2. Each flashcard must have a 'front' (a short question or concept prompt), 'back' (a clear and concise answer), 'topic' (the related topic), and 'difficulty' ('basic', 'intermediate', or 'advanced').
             3. Keep each card focused on one idea, make fronts short/clear and backs concise/objective. Avoid vague questions or overly long answers.
             4. If the content is short, generate fewer flashcards. Avoid duplicates.
             
             OTHER CRITICAL:
             1. Content must be in ${targetLang}.
             2. Response must be valid JSON only.
             3. Do NOT mention that you are an AI or that you are guessing in the summary; act as the expert.
             4. Include:
                - summary: A detailed overview (2-3 paragraphs) of the core concepts related to this title.
                - key_points: At least 5 fundamental aspects of this topic.
                - quiz: 3-5 relevant multiple-choice questions.
                - mind_map: A structured hierarchy of concepts.
                - tutor_questions: Relevant questions for deep learning.
                - limitations: Mention that this analysis is based on metadata/title as the specific video transcript was unavailable.
                - flashcards: Up to 10 high-quality flashcards.
                
             LANGUAGE DIRECTIVE (CRITICAL):
             IMPORTANT: The final answer must be written entirely in ${targetLang}. The source video, transcript, title, description, or metadata may be in another language, but you must understand it and translate/adapt the generated content to ${targetLang}. Do not mix languages. Target language: ${targetLang}. You may receive source content in Portuguese, Spanish, English, or another language. Use the source content only as input. Generate the final response entirely in ${targetLang}. Do not output any language other than ${targetLang}. Do not mix interface language and source video language.
             Understand the source content, but always produce the final answer entirely in ${targetLang}. All fields in the response (including summary, key_points, question/options/explanation in quiz, topic in mind_map, tutor_questions, and limitations) must be fully translated/written in ${targetLang}. Do not mix languages.`;

        const geminiResult = await generateContentWithRetry(getAI(), {
          model: "gemini-3.5-flash",
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                summary: { type: Type.STRING },
                key_points: { type: Type.ARRAY, items: { type: Type.STRING } },
                quiz: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      question: { type: Type.STRING },
                      options: { type: Type.ARRAY, items: { type: Type.STRING } },
                      answer: { type: Type.STRING },
                      explanation: { type: Type.STRING }
                    },
                    required: ["question", "options", "answer", "explanation"]
                  }
                },
                mind_map: {
                  type: Type.OBJECT,
                  properties: {
                    topic: { type: Type.STRING },
                    importance: { type: Type.NUMBER, description: "Importance score 1-5" },
                    children: { 
                      type: Type.ARRAY, 
                      items: { 
                        type: Type.OBJECT,
                        properties: {
                          topic: { type: Type.STRING },
                          importance: { type: Type.NUMBER },
                          category: { type: Type.STRING },
                          icon: { type: Type.STRING }
                        },
                        required: ["topic"]
                      } 
                    }
                  },
                  required: ["topic", "children"]
                },
                tutor_questions: { type: Type.ARRAY, items: { type: Type.STRING } },
                limitations: { type: Type.ARRAY, items: { type: Type.STRING } },
                flashcards: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      front: { type: Type.STRING },
                      back: { type: Type.STRING },
                      topic: { type: Type.STRING },
                      difficulty: { type: Type.STRING, description: "basic | intermediate | advanced" }
                    },
                    required: ["front", "back", "topic", "difficulty"]
                  }
                }
              },
              required: ["summary", "key_points", "quiz", "mind_map", "tutor_questions", "limitations", "flashcards"]
            }
          }
        });

        const rawText = geminiResult.text || "";
        console.log(`[Backend] Gemini raw response received (${rawText.length} chars)`);
        
        analysisData = safeParseAIJSON(rawText);
        
        if (!analysisData) {
          throw new Error("Failed to parse Gemini JSON output after repair attempts");
        }

        // Mind Map Normalization & Enrichment
        if (analysisData.mind_map) {
          const mm = analysisData.mind_map;
          if (!mm.topic) mm.topic = metadata.title;
          
          const isPt = lang === 'pt';
          const isEs = lang === 'es';
          if (!mm.children || mm.children.length < 3) {
            console.log("[Backend] Mind map too shallow, adding enrichment branches...");
            const fallbackBranches = [
              { topic: isPt ? "Conceitos Chave" : isEs ? "Conceptos Clave" : "Key Concepts", category: "Concept", icon: "Layers", importance: 5, children: [] },
              { topic: isPt ? "Aplicações Práticas" : isEs ? "Aplicaciones Prácticas" : "Practical Applications", category: "Method", icon: "Target", importance: 4, children: [] },
              { topic: isPt ? "Detalhes Adicionais" : isEs ? "Detalles Adicionales" : "Additional Details", category: "Detail", icon: "BookOpen", importance: 3, children: [] }
            ];
            mm.children = [...(mm.children || []), ...fallbackBranches];
          }
          
          // Ensure every node has basic structure
          const normalizeNode = (node: any) => {
            if (!node || typeof node !== 'object') return;
            if (!node.topic && node.title) node.topic = node.title;
            if (!node.topic) node.topic = "Topic";
            if (!node.children && node.branches) node.children = node.branches;
            if (!node.children && node.subtopics) node.children = node.subtopics;
            if (!Array.isArray(node.children)) node.children = [];
            node.children.forEach((child: any) => normalizeNode(child));
          };
          normalizeNode(mm);
        }

        if (!analysisData.flashcards || !Array.isArray(analysisData.flashcards)) {
          analysisData.flashcards = [];
        }

        console.log("[Backend] Gemini analysis: SUCCESS");
      } catch (aiErr: any) {
        console.error("[Backend] Gemini analysis: FAILED -", aiErr.message);
        
        // Propagate API configuration errors immediately to let the frontend know the API key requires attention
        if (aiErr.message?.includes("Gemini API configuration") || aiErr.message?.includes("GEMINI_API_KEY")) {
          return res.status(500).json({
            error: "Gemini API Configuration Error",
            details: aiErr.message
          });
        }
        
        // Final fallback analysis object if AI fails completely (constructive and helpful)
        const isPt = lang === 'pt';
        const isEs = lang === 'es';
        analysisData = {
          summary: isPt 
            ? `Esta sessão foca no conteúdo de **${metadata.title}**. Embora a análise automatizada detalhada tenha encontrado uma limitação técnica no momento, você ainda pode explorar os conceitos fundamentais através da transcrição e do Tutor Astra Learning AI.`
            : isEs
              ? `Esta sesión se centra en el contenido de **${metadata.title}**. Aunque el análisis detallado automatizado ha encontrado una limitación técnica en este momento, todavía puede explorar los conceptos fundamentales a través de la transcripción y el Tutor de Astra Learning AI.`
              : `This session focuses on **${metadata.title}**. While our automated deep analysis encountered a brief technical limitation, you can still explore the core concepts using the transcript and the Astra Learning AI Tutor.`,
          key_points: isPt
            ? [
                `Tópico: ${metadata.title}`,
                `Criador: ${metadata.author_name || 'Desconhecido'}`,
                "Use o Tutor de Estudos para aprofundar seu conhecimento.",
                "Revise a transcrição para detalhes específicos."
              ]
            : isEs
              ? [
                  `Tema: ${metadata.title}`,
                  `Creador: ${metadata.author_name || 'Desconocido'}`,
                  "Usa el Tutor de Estudios para profundizar tu conocimiento.",
                  "Revisa la transcripción para obtener detalles específicos."
                ]
              : [
                  `Topic: ${metadata.title}`,
                  `Creator: ${metadata.author_name || 'Unknown'}`,
                  "Use the Study Tutor to deepen your knowledge.",
                  "Review the transcript for specific details."
                ],
          quiz: [],
          mind_map: { 
            topic: metadata.title, 
            children: [{ topic: metadata.author_name || 'YouTube', children: [] }] 
          },
          tutor_questions: isPt
            ? [
                "Pode resumir o ponto principal deste vídeo?",
                "Quais são as lições práticas que posso tirar daqui?"
              ]
            : isEs
              ? [
                  "¿Puedes resumir el punto principal de este video?",
                  "¿Cuáles son las lecciones prácticas que puedo aprender de aquí?"
                ]
              : [
                  "Can you summarize the main point of this video?",
                  "What practical lessons can I take from here?"
                ],
          limitations: isPt
            ? [
                "A análise da IA está temporariamente limitada.",
                "A transcrição pode estar incompleta ou indisponível."
              ]
            : isEs
              ? [
                  "El análisis de la IA está temporalmente limitado.",
                  "La transcripción puede estar incompleta o no disponible."
                ]
              : [
                  "AI Analysis is temporarily limited.",
                  "Transcript may be incomplete or unavailable."
                ],
          flashcards: []
        };
      }

      // Step 5: Final Response
      console.log(`[Backend] Request Finished. Mode: ${mode}`);
      return res.json({
        video: {
          videoId,
          url: `https://www.youtube.com/watch?v=${videoId}`,
          title: metadata.title || "YouTube Video",
          channel: metadata.author_name || "Unknown",
          thumbnail: metadata.thumbnail_url || `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`
        },
        mode,
        message: mode === "transcript" 
          ? (lang === 'pt' ? "Análise gerada a partir da transcrição." : lang === 'es' ? "Análisis generado a partir de la transcripción." : "Analysis generated from transcript.")
          : (lang === 'pt' ? "Análise gerada a partir dos metadados." : lang === 'es' ? "Análisis generado a partir de los metadatos." : "Analysis generated from video metadata."),
        ...analysisData,
        transcript: transcript || "[N/A]"
      });

    } catch (unexpectedErr: any) {
      console.error("[Backend] CRITICAL ERROR in /api/youtube-info:", unexpectedErr);
      return res.status(500).json({ 
        error: "Internal Server Error",
        details: "An unexpected error occurred. Please try again later."
      });
    }
  });

  // Helper function to extract educational content from image using Gemini Vision
  async function extractEducationalContentFromImage({
    imageBuffer,
    mimeType,
    targetLanguage
  }: {
    imageBuffer: Buffer;
    mimeType: string;
    targetLanguage: string;
  }) {
    const aiClient = getAI();
    const base64Data = imageBuffer.toString("base64");
    
    const imagePart = {
      inlineData: {
        mimeType,
        data: base64Data
      }
    };

    const targetLangNames: Record<string, string> = {
      'pt': 'Portuguese',
      'en': 'English',
      'es': 'Spanish'
    };
    const targetLangName = targetLangNames[targetLanguage] || 'English';

    const prompt = `You are analyzing an image uploaded by a user to Astra Learning.

The image may contain educational, informational, promotional, professional, or general visual content.

Your task is to extract and interpret all useful content from the image and convert it into a clear study-ready text.

The image may contain:
- a school question
- an exam exercise
- a slide
- a page from a book
- handwritten or typed notes
- a diagram
- a table
- a chart
- an advertisement
- a promotional flyer
- a travel offer
- a social media post
- a screenshot
- an infographic
- a business document
- general text or visual information

Tasks:
1. Extract all readable text from the image.
2. Preserve important numbers, prices, dates, names, locations, times, phone numbers, websites and conditions.
3. Describe relevant visual elements only when they help understand the content.
4. Identify what type of content the image appears to be.
5. Convert the image into a clear structured text that can be used to generate:
   - summary
   - key points
   - quiz
   - tutor explanation
   - mind map
6. If the image is promotional or commercial, summarize the offer and extract the key information.
7. If the image is an exam question, preserve the question and alternatives exactly when possible.
8. If the image contains a table, chart, or diagram, describe the structure and key insights.
9. Only say the content is insufficient if the image is unreadable, empty, blurry, or has almost no identifiable information.

Return valid JSON only.

LANGUAGE RULE:
The extracted/interpreted content should be written in the selected target language: ${targetLangName}.
If the image contains original text in another language, translate the interpretation to ${targetLangName}, but preserve names, numbers, prices, dates, websites, phone numbers and important original terms.`;

    const response = await generateContentWithRetry(aiClient, {
      model: "gemini-3.5-flash",
      contents: [
        {
          role: "user",
          parts: [
            imagePart,
            { text: prompt }
          ]
        }
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            titleSuggestion: { type: Type.STRING },
            extractedText: { type: Type.STRING },
            detectedContentType: { type: Type.STRING, description: "exam_question | notes | slide | book_page | diagram | table | chart | advertisement | flyer | screenshot | infographic | document | other" },
            confidence: { type: Type.STRING, description: "high | medium | low" }
          },
          required: ["titleSuggestion", "extractedText", "detectedContentType", "confidence"]
        }
      }
    });

    const parsed = safeParseAIJSON(response.text || "");
    if (!parsed || !parsed.extractedText) {
      throw new Error("Failed to parse Gemini Vision output");
    }

    return {
      extractedText: parsed.extractedText,
      detectedContentType: parsed.detectedContentType || "other",
      confidence: parsed.confidence || "medium",
      titleSuggestion: parsed.titleSuggestion || "Extracted Content"
    };
  }

  // Analyze Document Endpoint
  app.post("/api/analyze-source", upload.single("file"), async (req, res) => {
    const { sourceType, documentType, lang: reqLang = "en", targetLanguage, fileName, fileSize } = req.body;
    const lang = targetLanguage || reqLang || "en";
    
    const langNames: Record<string, string> = {
      'pt': 'Portuguese',
      'en': 'English',
      'es': 'Spanish'
    };
    const targetLangName = langNames[lang] || 'English';

    if (sourceType !== "document" || (documentType !== "txt" && documentType !== "pdf" && documentType !== "docx" && documentType !== "image")) {
      return res.status(400).json({
        error: lang === "pt" ? "Processamento de PDF, DOCX e imagem será ativado nas próximas etapas."
               : lang === "es" ? "El procesamiento de PDF, DOCX e imagen se activará en las próximas etapas."
               : "PDF, DOCX, and image processing will be enabled in upcoming steps."
      });
    }

    const file = req.file;
    if (!file) {
      return res.status(400).json({
        error: lang === "pt" ? "Nenhum arquivo enviado." : lang === "es" ? "No se subió ningún archivo." : "No file uploaded."
      });
    }

    // 1. Validate file size based on document type
    if (documentType === "image") {
      const maxSize = 10 * 1024 * 1024;
      if (file.size > maxSize) {
        return res.status(400).json({
          error: lang === "pt" ? "A imagem excede o limite de 10 MB."
                 : lang === "es" ? "La imagen supera el límite de 10 MB."
                 : "The image exceeds the 10 MB limit."
        });
      }
      
      const fileExt = file.originalname.split('.').pop()?.toLowerCase() || '';
      const allowedExts = ['png', 'jpg', 'jpeg', 'webp'];
      const allowedMimes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
      if (!allowedExts.includes(fileExt) && !allowedMimes.includes(file.mimetype)) {
        return res.status(400).json({
          error: lang === "pt" ? "Tipo de imagem não suportado. Envie PNG, JPG, JPEG ou WEBP."
                 : lang === "es" ? "Tipo de imagen no compatible. Sube PNG, JPG, JPEG o WEBP."
                 : "Unsupported image type. Upload PNG, JPG, JPEG, or WEBP."
        });
      }
    } else if (documentType === "txt") {
      const maxSize = 5 * 1024 * 1024;
      if (file.size > maxSize) {
      return res.status(400).json({
        error: lang === "pt" ? "O arquivo TXT excede o limite de 5 MB."
               : lang === "es" ? "El archivo TXT supera el límite de 5 MB."
               : "The TXT file exceeds the 5 MB limit."
      });
    }
    } else if (documentType === "pdf") {
      const maxSize = 20 * 1024 * 1024;
      if (file.size > maxSize) {
        return res.status(400).json({
          error: lang === "pt" ? "O PDF excede o limite de 20 MB."
                 : lang === "es" ? "El PDF supera o límite de 20 MB."
                 : "The PDF exceeds the 20 MB limit."
        });
      }
    } else if (documentType === "docx") {
      const maxSize = 20 * 1024 * 1024;
      if (file.size > maxSize) {
        return res.status(400).json({
          error: lang === "pt" ? "O DOCX excede o limite de 20 MB."
                 : lang === "es" ? "El DOCX supera el límite de 20 MB."
                 : "The DOCX exceeds the 20 MB limit."
        });
      }
    }

    try {
      let normalizedText = "";
      let pageCount = 1;
      let extractedCharacters = 0;
      let detectedContentType = "other";
      let confidence = "high";
      let titleSuggestion = "";

      // 2. Extract text and get page count/characters metadata based on type
      if (documentType === "image") {
        try {
          const visionResult = await extractEducationalContentFromImage({
            imageBuffer: file.buffer,
            mimeType: file.mimetype || `image/${file.originalname.split('.').pop()?.toLowerCase() || 'png'}`,
            targetLanguage: lang
          });
          
          normalizedText = visionResult.extractedText;
          detectedContentType = visionResult.detectedContentType;
          confidence = visionResult.confidence;
          titleSuggestion = visionResult.titleSuggestion;
          pageCount = 1;
          extractedCharacters = normalizedText.length;

          const isInsufficient = !normalizedText || 
                                 normalizedText.trim().length < 50;
          if (isInsufficient) {
            return res.status(400).json({
              error: lang === "pt" ? "Não foi possível identificar conteúdo suficiente nesta imagem. Tente enviar uma imagem mais nítida."
                     : lang === "es" ? "No pudimos identificar suficiente contenido en esta imagen. Intenta subir una imagen más nítida."
                     : "We couldn't identify enough content in this image. Try uploading a clearer image."
            });
          }
        } catch (visionErr: any) {
          console.error("[Backend] Gemini Vision extraction failed:", visionErr);
          return res.status(400).json({
            error: lang === "pt" ? "Não foi possível analisar esta imagem. Tente enviar uma imagem mais nítida."
                   : lang === "es" ? "No pudimos analizar esta imagen. Intenta subir una imagen más nítida."
                   : "We couldn't analyze this image. Try uploading a clearer image."
          });
        }
      } else if (documentType === "txt") {
        const rawContent = file.buffer.toString("utf8");
        normalizedText = rawContent.trim();
        pageCount = 1;
        extractedCharacters = normalizedText.length;
      } else if (documentType === "pdf") {
        let parser;
        try {
          parser = new PDFParse({ data: file.buffer });
          const textResult = await parser.getText();
          const infoResult = await parser.getInfo({ parsePageInfo: false });
          normalizedText = (textResult.text || "").trim();
          pageCount = infoResult.total || 1;
          extractedCharacters = normalizedText.length;
        } catch (parseErr: any) {
          console.error("[Backend] PDF parsing failed:", parseErr);
          return res.status(400).json({
            error: lang === "pt" ? "Falha ao ler o arquivo PDF. Verifique se o arquivo não está corrompido ou protegido por senha."
                   : lang === "es" ? "Fallo al leer el archivo PDF. Verifique si el archivo no está dañado o protegido por contraseña."
                   : "Failed to read the PDF file. Please verify if the file is not corrupted or password-protected."
          });
        } finally {
          if (parser) {
            try {
              await parser.destroy();
            } catch (destroyErr) {
              console.error("[Backend] Error destroying PDFParse instance:", destroyErr);
            }
          }
        }
      } else if (documentType === "docx") {
        try {
          const result = await mammoth.extractRawText({ buffer: file.buffer });
          normalizedText = (result.value || "").trim();
          pageCount = 1;
          extractedCharacters = normalizedText.length;

          if (!normalizedText) {
            return res.status(400).json({
              error: lang === "pt" ? "Não foi possível extrair texto deste DOCX. Tente outro arquivo."
                     : lang === "es" ? "No pudimos extraer texto de este DOCX. Prueba otro archivo."
                     : "We couldn't extract text from this DOCX. Try another file."
            });
          }
        } catch (docxErr: any) {
          console.error("[Backend] DOCX parsing failed:", docxErr);
          return res.status(400).json({
            error: lang === "pt" ? "Não foi possível processar este DOCX. Tente outro arquivo."
                   : lang === "es" ? "No pudimos procesar este DOCX. Prueba outro archivo."
                   : "We couldn't process this DOCX. Try another file."
          });
        }
      }

      // 3. Validate text length
      if (documentType !== "image" && normalizedText.length < 100) {
        if (documentType === "pdf") {
          return res.status(400).json({
            error: lang === "pt" ? "O texto extraído do PDF é insuficiente para análise (mínimo de 100 caracteres)."
                   : lang === "es" ? "El texto extraído del PDF es insuficiente para el análisis (mínimo de 100 caracteres)."
                   : "The extracted PDF text is insufficient for analysis (minimum of 100 characters)."
          });
        } else if (documentType === "docx") {
          return res.status(400).json({
            error: lang === "pt" ? "O DOCX não possui texto suficiente para análise."
                   : lang === "es" ? "El DOCX no contiene suficiente texto para el análisis."
                   : "The DOCX does not contain enough text for analysis."
          });
        } else {
          return res.status(400).json({
            error: lang === "pt" ? "O arquivo não possui texto suficiente para análise."
                   : lang === "es" ? "El archivo no contiene suficiente texto para el análisis."
                   : "The file does not contain enough text for analysis."
          });
        }
      }

      if (documentType === "pdf" && normalizedText.length > 30000) {
        console.log(`[Backend] /api/analyze-source: PDF text exceeded 30k chars (${normalizedText.length} chars). Truncating to 30k chars.`);
        normalizedText = normalizedText.substring(0, 30000) + "\n\n[... TEXT TRUNCATED FOR PERFORMANCE ...]";
        extractedCharacters = normalizedText.length;
      }

      if (documentType === "docx" && normalizedText.length > 30000) {
        return res.status(400).json({
          error: lang === "pt" ? "O conteúdo do DOCX é muito longo. Reduza o conteúdo ou envie um arquivo menor."
                 : lang === "es" ? "El contenido del DOCX es demasiado largo. Reduce el contenido o sube un archivo más pequeño."
                 : "The DOCX content is too long. Reduce the content or upload a smaller file."
        });
      }

      if (documentType === "txt" && normalizedText.length > 30000) {
        return res.status(400).json({
          error: lang === "pt" ? "O texto do arquivo é muito longo. Reduza o conteúdo ou divida em partes."
                 : lang === "es" ? "El texto del archivo es demasiado largo. Reduce el contenido o divídelo en partes."
                 : "The file text is too long. Reduce the content or split it into parts."
        });
      }

      console.log(`[Backend] /api/analyze-source: Processing ${documentType.toUpperCase()} "${file.originalname}" (${normalizedText.length} chars) in ${targetLangName}`);

      // 4. Generate Study Content using Gemini API
      let prompt = "";
      if (documentType === "image") {
        prompt = `Analyze the following extracted and interpreted image content from the file "${file.originalname}".
Generate a comprehensive study material containing summary, key points, interactive quiz, a simple high-level overview mind map, and a set of study flashcards.

Source type: Document
Document type: Image
Detected content type: ${detectedContentType}
Use the extracted and interpreted image content as the learning source.

`;
        const contentTypeStr = String(detectedContentType || "other").toLowerCase();
        const isPromotional = ["advertisement", "flyer", "screenshot", "infographic", "document", "other"].includes(contentTypeStr) || 
                              contentTypeStr.includes("promotional") || 
                              contentTypeStr.includes("offer") ||
                              contentTypeStr.includes("ad") ||
                              contentTypeStr.includes("flyer");
                              
        if (isPromotional) {
          prompt += `SPECIAL ADAPTATION FOR COMMERCIAL/PROMOTIONAL/INFORMATIONAL CONTENT:
Since this is promotional/commercial or informational content (such as an offer, advertisement, flyer, or screenshot):
1. For the summary: Generate a detailed, highly structured summary of the offer, including a breakdown of the promotion, prices, options, and main details.
2. For key_points: List the primary information, offers, prices, dates, validity, and terms/conditions.
3. For the quiz: Create text interpretation and comprehension questions based on the terms, prices, conditions, and details of this promotional offer (instead of purely academic/school questions).
4. For the mind map: Center it on the main offer. Create core branches mapping: price, destination/product, dates/validity, company/brand, contact/how to acquire, and key terms or conditions.
5. For the flashcards: Create flashcards focused on the essential details, pricing, conditions, and benefits of the promotional offer or advertisement.

`;
        }
      } else {
        prompt = `Analyze the following learning document text from the file "${file.originalname}".
Generate a comprehensive educational summary, key points, interactive quiz, a simple high-level overview mind map, and a set of study flashcards.

Source type: Document
Document type: ${documentType.toUpperCase()}
Use the provided text as the learning source.`;
      }

      prompt += `

EXPLANATION LEVEL DIRECTIVE (CRITICAL):
${getExplanationInstruction("intermediate", lang)}

CRITICAL FOR MIND MAP GENERATION:
1. Create a simple high-level mind map representing 3 to 5 core branches/categories radiating from the main topic.
2. Each node should have a 'topic' (short, 1-3 words), 'importance' (1-5), 'category', and 'icon'.
3. Categories: 'Concept', 'Example', 'Detail', 'Definition', 'Method', 'Benefit', 'Risk', 'Trend'.
4. Icons: Use Lucide icon names like 'Zap', 'BookOpen', 'Target', 'Layers', 'Cpu', 'Globe', 'Activity', 'TrendingUp', 'CheckCircle', 'AlertCircle'.

CRITICAL FOR FLASHCARDS:
1. Generate up to 10 high-quality flashcards under the field 'flashcards'.
2. Each flashcard must have a 'front' (a short question or concept prompt), 'back' (a clear and concise answer), 'topic' (the related topic), and 'difficulty' ('basic', 'intermediate', or 'advanced').
3. Keep each card focused on one idea, make fronts short/clear and backs concise/objective. Avoid vague questions or overly long answers.
4. If the content is short, generate fewer flashcards. Avoid duplicates.

GENERAL CRITICAL:
1. Content must be in ${targetLangName}.
2. Response must be valid JSON only.
3. Summary should be 3-4 paragraphs of high-quality Markdown.

LANGUAGE DIRECTIVE (CRITICAL):
IMPORTANT: The final answer must be written entirely in ${targetLangName}. The source document, title, or content may be in another language, but you must understand it and translate/adapt the generated content to ${targetLangName}. Do not mix languages. Target language: ${targetLangName}. Use the source content only as input. Generate the final response entirely in ${targetLangName}. Do not output any language other than ${targetLangName}. Do not mix interface language and source document language.
Understand the source content, but always produce the final answer entirely in ${targetLangName}. All fields in the response (including summary, key_points, question/options/explanation in quiz, topic in mind_map, tutor_questions, and limitations) must be fully translated/written in ${targetLangName}. Do not mix languages.

Document Content:
${normalizedText}`;

      const aiClient = getAI();
      let geminiResult;
      try {
        geminiResult = await generateContentWithRetry(aiClient, {
          model: "gemini-3.5-flash",
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING, description: "A highly concise, professional and educational title generated from the document's content" },
                summary: { type: Type.STRING },
                key_points: { type: Type.ARRAY, items: { type: Type.STRING } },
                quiz: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      question: { type: Type.STRING },
                      options: { type: Type.ARRAY, items: { type: Type.STRING } },
                      answer: { type: Type.STRING },
                      explanation: { type: Type.STRING }
                    },
                    required: ["question", "options", "answer", "explanation"]
                  }
                },
                mind_map: {
                  type: Type.OBJECT,
                  properties: {
                    topic: { type: Type.STRING },
                    importance: { type: Type.NUMBER, description: "Importance score 1-5" },
                    children: { 
                      type: Type.ARRAY, 
                      items: { 
                        type: Type.OBJECT,
                        properties: {
                          topic: { type: Type.STRING },
                          importance: { type: Type.NUMBER },
                          category: { type: Type.STRING },
                          icon: { type: Type.STRING }
                        },
                        required: ["topic"]
                      } 
                    }
                  },
                  required: ["topic", "children"]
                },
                tutor_questions: { type: Type.ARRAY, items: { type: Type.STRING } },
                limitations: { type: Type.ARRAY, items: { type: Type.STRING } },
                flashcards: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      front: { type: Type.STRING },
                      back: { type: Type.STRING },
                      topic: { type: Type.STRING },
                      difficulty: { type: Type.STRING, description: "basic | intermediate | advanced" }
                    },
                    required: ["front", "back", "topic", "difficulty"]
                  }
                }
              },
              required: ["title", "summary", "key_points", "quiz", "mind_map", "tutor_questions", "limitations", "flashcards"]
            }
          }
        });
      } catch (geminiErr: any) {
        console.error("[Backend] Gemini generation failed for document:", geminiErr);
        if (documentType === "pdf") {
          return res.status(500).json({
            error: lang === "pt" ? "O conteúdo do PDF é muito complexo ou excede a capacidade do modelo de IA. Reduza o documento ou tente outro arquivo."
                   : lang === "es" ? "El contenido del PDF es demasiado complejo o supera la capacidad del modelo de IA. Reduzca el documento o intente con otro archivo."
                   : "The PDF content is too complex or exceeds the AI model capacity. Reduce the document or try another file.",
            details: geminiErr.message
          });
        } else {
          throw geminiErr;
        }
      }

      const rawText = geminiResult.text || "";
      console.log(`[Backend] Document Gemini raw response received (${rawText.length} chars)`);
      
      let analysisData = safeParseAIJSON(rawText);
      if (!analysisData) {
        throw new Error("Failed to parse Gemini JSON output for document");
      }

      // Ensure title is set and clean
      const docTitle = analysisData.title || titleSuggestion || file.originalname.replace(/\.[^/.]+$/, "");

      // Mind map normalization
      if (analysisData.mind_map) {
        const mm = analysisData.mind_map;
        if (!mm.topic) mm.topic = docTitle;
        const isPt = lang === 'pt';
        const isEs = lang === 'es';
        if (!mm.children || mm.children.length < 3) {
          const fallbackBranches = [
            { topic: isPt ? "Conceitos Chave" : isEs ? "Conceptos Clave" : "Key Concepts", category: "Concept", icon: "Layers", importance: 5, children: [] },
            { topic: isPt ? "Aplicações Práticas" : isEs ? "Aplicaciones Prácticas" : "Practical Applications", category: "Method", icon: "Target", importance: 4, children: [] },
            { topic: isPt ? "Detalhes Adicionais" : isEs ? "Detalles Adicionales" : "Additional Details", category: "Detail", icon: "BookOpen", importance: 3, children: [] }
          ];
          mm.children = [...(mm.children || []), ...fallbackBranches];
        }
        const normalizeNode = (node: any) => {
          if (!node || typeof node !== 'object') return;
          if (!node.topic && node.title) node.topic = node.title;
          if (!node.topic) node.topic = "Topic";
          if (!node.children && node.branches) node.children = node.branches;
          if (!node.children && node.subtopics) node.children = node.subtopics;
          if (!Array.isArray(node.children)) node.children = [];
          node.children.forEach((child: any) => normalizeNode(child));
        };
        normalizeNode(mm);
      }

      if (!analysisData.flashcards || !Array.isArray(analysisData.flashcards)) {
        analysisData.flashcards = [];
      }

      // Return the response in a structured form matching frontend expected shape
      res.json({
        video: {
          videoId: `doc-${Date.now()}`,
          url: `document://${file.originalname}`,
          title: docTitle,
          channel: lang === 'pt' ? 'Documento Local' : lang === 'es' ? 'Documento Local' : 'Local Document',
          thumbnail: ""
        },
        sourceType: "document",
        documentType: documentType,
        fileName: file.originalname,
        fileSize: file.size,
        title: docTitle,
        mode: "transcript",
        message: lang === 'pt' ? "Análise gerada a partir do documento." : lang === 'es' ? "Análisis generado a partir del documento." : "Analysis generated from document.",
        summary: analysisData.summary,
        key_points: analysisData.key_points,
        quiz: analysisData.quiz,
        mind_map: analysisData.mind_map,
        flashcards: analysisData.flashcards,
        tutor_questions: analysisData.tutor_questions,
        limitations: analysisData.limitations || [],
        transcript: normalizedText, // Treat extracted text as the transcript
        tutorContext: normalizedText,
        generatedLanguage: lang,
        sourceMetadata: {
          pageCount: pageCount,
          extractedCharacters: extractedCharacters,
          extractionMethod: documentType === 'image' ? 'gemini-vision' : (documentType === 'pdf' ? "pdf-text" : (documentType === 'docx' ? "docx-text" : "txt-text")),
          detectedContentType: documentType === 'image' ? detectedContentType : undefined,
          confidence: documentType === 'image' ? confidence : undefined
        }
      });

    } catch (error: any) {
      console.error("[Backend] Error processing document:", error);
      res.status(500).json({
        error: lang === 'pt' ? "Não foi possível gerar a análise agora. Tente novamente."
               : lang === 'es' ? "No pudimos generar el análisis ahora. Inténtalo de nuevo."
               : "We couldn't generate the analysis right now. Try again.",
        details: error.message
      });
    }
  });

  // Extra Quiz Questions Generation Endpoint (Secure server-side proxy)
  app.post("/api/generate-extra-questions", async (req, res) => {
    const { title, content, lang: reqLang = 'en', targetLanguage, count = 5, explanationLevel = 'intermediate' } = req.body;
    const lang = targetLanguage || reqLang || 'en';
    try {
      const questionCount = count;
      const videoTitle = title;
      const explanationInstr = getExplanationInstruction(explanationLevel, lang);
      let prompt = "";
      if (lang === 'pt') {
        prompt = `Gere exatamente ${questionCount} questões de múltipla escolha com base somente no conteúdo do vídeo analisado. As perguntas devem estar diretamente relacionadas ao assunto do vídeo: ${videoTitle}. Use o resumo, principais pontos, transcrição ou contexto disponível. Não crie perguntas genéricas ou fora do conteúdo. Cada questão deve ter 4 alternativas, apenas uma resposta correta e uma explicação curta da resposta correta.

LANGUAGE DIRECTIVE (CRITICAL):
IMPORTANT: The final answer must be written entirely in Portuguese. 
The source video, transcript, title, description, or metadata may be in another language, but you must understand it and translate/adapt the generated content to Portuguese. 
Do not mix languages.

Target language: Portuguese

You may receive source content in Portuguese, Spanish, English, or another language.
Use the source content only as input.
Generate the final response entirely in Portuguese.
Do not output any language other than Portuguese.
Do not mix interface language and source video language.

EXPLANATION LEVEL DIRECTIVE (CRITICAL):
${explanationInstr}

Conteúdo:
${(content || "").substring(0, 30000)}`;
      } else if (lang === 'es') {
        prompt = `Genera exactamente ${questionCount} preguntas de opción múltiple basadas únicamente en el contenido del video analizado. Las preguntas deben estar directamente relacionadas con el tema del video: ${videoTitle}. Usa el resumen, los puntos clave, la transcripción o el contexto disponible. No crees preguntas genéricas ni fuera del contenido. Cada pregunta debe tener 4 alternativas, solo una respuesta correcta y una breve explicación de la respuesta correcta.

LANGUAGE DIRECTIVE (CRITICAL):
IMPORTANT: The final answer must be written entirely in Spanish. 
The source video, transcript, title, description, or metadata may be in another language, but you must understand it and translate/adapt the generated content to Spanish. 
Do not mix languages.

Target language: Spanish

You may receive source content in Portuguese, Spanish, English, or another language.
Use the source content only as input.
Generate the final response entirely in Spanish.
Do not output any language other than Spanish.
Do not mix interface language and source video language.

EXPLANATION LEVEL DIRECTIVE (CRITICAL):
${explanationInstr}

Contenido:
${(content || "").substring(0, 30000)}`;
      } else {
        prompt = `Generate exactly ${questionCount} multiple-choice questions based only on the analyzed video content. The questions must be directly related to the video's topic: ${videoTitle}. Use the summary, key points, transcript, or available context. Do not create generic questions or questions outside the content. Each question must have 4 options, only one correct answer, and a short explanation of the correct answer.

LANGUAGE DIRECTIVE (CRITICAL):
IMPORTANT: The final answer must be written entirely in English. 
The source video, transcript, title, description, or metadata may be in another language, but you must understand it and translate/adapt the generated content to English. 
Do not mix languages.

Target language: English

You may receive source content in Portuguese, Spanish, English, or another language.
Use the source content only as input.
Generate the final response entirely in English.
Do not output any language other than English.
Do not mix interface language and source video language.

EXPLANATION LEVEL DIRECTIVE (CRITICAL):
${explanationInstr}

Content:
${(content || "").substring(0, 30000)}`;
      }

      console.log(`[Backend] Generating extra questions for video "${title}" in: ${lang}`);
      
      const aiClient = getAI();
      const response = await generateContentWithRetry(aiClient, {
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              quiz: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    question: { type: Type.STRING },
                    options: { type: Type.ARRAY, items: { type: Type.STRING } },
                    answer: { type: Type.STRING },
                    explanation: { type: Type.STRING }
                  },
                  required: ["question", "options", "answer", "explanation"]
                }
              }
            },
            required: ["quiz"]
          }
        }
      });

      const text = response.text || "";
      const parsed = JSON.parse(text);
      res.json({ quiz: parsed.quiz || [] });
    } catch (error: any) {
      console.error("[Backend] Error generating extra questions:", error);
      res.status(500).json({ error: error.message || "Failed to generate extra questions from Gemini" });
    }
  });

  // Dedicated Mind Map Generation Endpoint
  app.post("/api/generate-mindmap", async (req, res) => {
    const { title, content, summary, keyTakeaways, actionableLessons, transcript, fallbackReason, lang: reqLang = 'en', targetLanguage, explanationLevel = 'intermediate' } = req.body;
    const lang = targetLanguage || reqLang || 'en';
    try {
      const videoTitle = title || "Unknown Video";
      const languageMap: Record<string, string> = {
        pt: "Português",
        es: "Español",
        en: "English"
      };
      const languageName = languageMap[lang as string] || "English";
 
      // Assemble the richest context possible
      let videoContext = "";
      if (summary) videoContext += `Summary:\n${summary}\n\n`;
      if (keyTakeaways && keyTakeaways.length > 0) {
        videoContext += `Key Takeaways:\n${Array.isArray(keyTakeaways) ? keyTakeaways.map(k => `- ${k}`).join("\n") : keyTakeaways}\n\n`;
      }
      if (actionableLessons && actionableLessons.length > 0) {
        videoContext += `Actionable Lessons:\n${Array.isArray(actionableLessons) ? actionableLessons.map(l => `- ${l}`).join("\n") : actionableLessons}\n\n`;
      }
      if (fallbackReason) {
        videoContext += `Fallback Reason (Technical issues): ${fallbackReason}\n\n`;
      }
      if (transcript && transcript !== "[N/A]") {
        videoContext += `Transcript:\n${transcript.substring(0, 25000)}\n`;
      } else if (content) {
        videoContext += `Content:\n${content.substring(0, 25000)}\n`;
      }
 
      if (!videoContext.trim()) {
        videoContext = `Video Title: ${videoTitle}`;
      }
 
      const basePrompt = `Você é um especialista em design instrucional e mapas mentais educacionais.
 
Sua tarefa é criar um mapa mental profundo, hierárquico e didático com base exclusivamente no conteúdo do vídeo analisado.
 
Tema/título do vídeo:
${videoTitle}
 
Conteúdo disponível:
${videoContext}
 
Idioma da resposta (OBRIGATÓRIO):
${languageName}
 
Crie um mapa mental que ajude o estudante a entender, revisar e memorizar o assunto.
 
EXPLANATION LEVEL DIRECTIVE (CRITICAL):
${getExplanationInstruction(explanationLevel, lang)}
 
Regras obrigatórias:
1. Use somente informações presentes no conteúdo do vídeo, resumo, transcrição ou fallback disponível.
2. Não invente informações.
3. Não use nome do canal, autor, professor ou plataforma como ramo principal.
4. Não transforme metadados em conceitos.
5. Identifique o tema educacional central.
6. Crie entre 6 e 10 ramos principais.
7. Cada ramo principal deve ter pelo menos 3 subtópicos.
8. Pelo menos 3 ramos devem ter terceiro nível de profundidade.
9. O mapa deve ter entre 35 e 70 nós no total.
10. Use labels curtos, claros e conceituais.
11. Organize o conteúdo do geral para o específico.
12. Inclua definições, fórmulas, etapas, exemplos, aplicações, relações e cuidados quando o vídeo mencionar.
13. IMPORTANT: The final answer must be written entirely in ${languageName}. The source video, transcript, title, description, or metadata may be in another language, but you must understand it and translate/adapt the generated content to ${languageName}. Do not mix languages. Target language: ${languageName}. You may receive source content in Portuguese, Spanish, English, or another language. Use the source content only as input. Generate the final response entirely in ${languageName}. Do not output any language other than ${languageName}. Do not mix interface language and source video language. All terms, concepts, labels and descriptions must be written in ${languageName}.
14. Retorne somente JSON válido, sem markdown, sem comentários e sem texto fora do JSON.
 
Formato obrigatório:
{
  "centralTopic": "Tema principal educacional",
  "summary": "Resumo curto do mapa",
  "nodes": [
    {
      "id": "node-1",
      "label": "Ramo principal",
      "description": "Descrição curta",
      "level": 1,
      "children": [
        {
          "id": "node-1-1",
          "label": "Subtópico",
          "description": "Descrição curta",
          "level": 2,
          "children": [
            {
              "id": "node-1-1-1",
              "label": "Detalhe específico",
              "description": "Descrição curta",
              "level": 3,
              "children": []
            }
          ]
        }
      ]
    }
  ]
}`;

      function countNodes(nodes: any[]): number {
        return nodes.reduce((total: number, node: any) => {
          return total + 1 + countNodes(node.children || []);
        }, 0);
      }

      function collectAllLabels(nodes: any[]): string[] {
        const labels: string[] = [];
        if (!Array.isArray(nodes)) return labels;
        nodes.forEach((node: any) => {
          if (node && typeof node === "object") {
            if (node.label && typeof node.label === "string") {
              labels.push(node.label);
            }
            if (node.children?.length) {
              labels.push(...collectAllLabels(node.children));
            }
          }
        });
        return labels;
      }

      function validateMindMap(mindMap: any): boolean {
        if (!mindMap) return false;
        if (!mindMap.centralTopic) return false;
        if (!Array.isArray(mindMap.nodes)) return false;
        if (mindMap.nodes.length < 3) return false;

        const totalNodes = countNodes(mindMap.nodes);
        if (totalNodes < 10) return false;

        const invalidLabels = [
          "youtube",
          "aula completa",
          "resumão",
          "resumo",
          "canal",
          "professor",
          "vídeo",
          "video"
        ];

        const allLabels = collectAllLabels(mindMap.nodes).map((label: string) => label.toLowerCase());

        const hasInvalidLabel = allLabels.some((label: string) =>
          invalidLabels.some((invalid: string) => label === invalid || label.includes(invalid))
        );

        if (hasInvalidLabel) return false;

        return true;
      }

      const nodeSchema = (depth: number): any => {
        if (depth > 4) {
          return {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              label: { type: Type.STRING },
              description: { type: Type.STRING },
              level: { type: Type.NUMBER },
              children: { type: Type.ARRAY, items: { type: Type.OBJECT } }
            },
            required: ["id", "label", "description", "level", "children"]
          };
        }
        return {
          type: Type.OBJECT,
          properties: {
            id: { type: Type.STRING },
            label: { type: Type.STRING },
            description: { type: Type.STRING },
            level: { type: Type.NUMBER },
            children: {
              type: Type.ARRAY,
              items: nodeSchema(depth + 1)
            }
          },
          required: ["id", "label", "description", "level", "children"]
        };
      };

      const responseSchema = {
        type: Type.OBJECT,
        properties: {
          centralTopic: { type: Type.STRING },
          summary: { type: Type.STRING },
          nodes: {
            type: Type.ARRAY,
            items: nodeSchema(1)
          }
        },
        required: ["centralTopic", "summary", "nodes"]
      };

      let attempts = 0;
      let mindMapData: any = null;
      let finalPrompt = basePrompt;

      while (attempts < 2) {
        attempts++;
        console.log(`[Backend] Generating mind map, attempt ${attempts}`);
        
        const response = await generateContentWithRetry(getAI(), {
          model: "gemini-3.5-flash",
          contents: finalPrompt,
          config: {
            responseMimeType: "application/json",
            responseSchema: responseSchema
          }
        });

        const text = response.text || "";
        const parsed = safeParseAIJSON(text);

        if (parsed && validateMindMap(parsed)) {
          mindMapData = parsed;
          console.log(`[Backend] Mind map validation succeeded! Found ${parsed.nodes.length} main branches.`);
          break;
        } else {
          console.warn(`[Backend] Mind map validation failed on attempt ${attempts}.`);
          if (attempts < 2) {
            console.log("[Backend] Retrying with reinforced prompt for second attempt.");
            finalPrompt = `${basePrompt}\n\nA resposta anterior foi superficial ou inválida. Gere uma versão mais profunda, com pelo menos 6 ramos principais, 25 nós totais e subtópicos educacionais reais baseados no vídeo.`;
          }
        }
      }

      if (!mindMapData) {
        return res.status(422).json({ 
          error: "SuficientDepthError", 
          message: lang === 'pt' 
            ? "Não foi possível gerar um mapa mental com profundidade suficiente. Tente novamente." 
            : lang === 'es'
              ? "No fue posible generar un mapa mental con suficiente profundidad. Inténtalo nuevamente."
              : "Could not generate a sufficiently detailed mind map. Please try again."
        });
      }

      res.json({ mindMap: mindMapData });
    } catch (error: any) {
      console.error("[Backend] Error generating mind map:", error);
      res.status(500).json({ error: error.message || "Failed to generate mind map" });
    }
  });

  // Real-time Interaction Endpoint with Gemini for Mind Map Chat
  app.post("/api/mindmap-chat", async (req, res) => {
    const { question, centralTopic, mindMap, videoTitle, summary, transcript, mode, lang: reqLang = 'pt', targetLanguage, explanationLevel = 'intermediate' } = req.body;
    const lang = targetLanguage || reqLang || 'pt';

    if (!question || !question.trim()) {
      return res.status(400).json({ error: "Question is required" });
    }

    try {
      const languageMap: Record<string, string> = {
        pt: "Português",
        es: "Español",
        en: "English"
      };
      const languageName = languageMap[lang as string] || "English";

      const maxTranscriptLength = 12000;
      const truncatedTranscript = transcript && typeof transcript === 'string'
        ? (transcript.length > maxTranscriptLength ? `${transcript.substring(0, maxTranscriptLength)}... [Truncated for context length limit]` : transcript)
        : "N/A";

      const mindMapContext = mindMap ? JSON.stringify(mindMap, null, 2) : "N/A";

      let levelDirective = "";
      if (explanationLevel === 'basic') {
        levelDirective = `Use simples linguagem, explicação curta, exemplos fáceis e evite termos técnicos complexos.`;
      } else if (explanationLevel === 'advanced') {
        levelDirective = `Use explicação mais profunda, linguagem técnica e precisa, faça conexões conceituais avançadas e traga exemplos completos e robustos.`;
      } else {
        levelDirective = `Use explicação didática equilibrada, detalhes moderados e exemplos práticos.`;
      }

      const prompt = `Você é o tutor inteligente do Astra Learning. Seu objetivo é ajudar o usuário a responder às dúvidas referentes ao mapa mental gerado para o vídeo de estudo.

Responda à pergunta do usuário usando como base o contexto do mapa mental, o resumo e a transcrição do vídeo analisado.

Pergunta do usuário:
"${question}"

Tema central do mapa mental:
${centralTopic || "Desconhecido"}

Título do vídeo:
${videoTitle || "Desconhecido"}

Contexto do mapa mental (Nós, níveis e descrições):
${mindMapContext}

Resumo disponível:
${summary || "N/A"}

Transcrição disponível:
${truncatedTranscript}

Origem dos dados / Modo:
${mode || "N/A"}

Idioma da resposta (CRÍTICO - OBRIGATÓRIO):
${languageName}
IMPORTANT: The final answer must be written entirely in ${languageName}. The source video, transcript, title, description, or metadata may be in another language, but you must understand it and translate/adapt the generated content to ${languageName}. Do not mix languages.

Target language: ${languageName}

You may receive source content in Portuguese, Spanish, English, or another language.
Use the source content only as input.
Generate the final response entirely in ${languageName}.
Do not output any language other than ${languageName}.
Do not mix interface language and source video language. All markdown content, questions, options, explanation, title, and texts in the JSON response must be written entirely in ${languageName}.

Nível de explicação desejado:
${explanationLevel}
Diretriz de nível: ${levelDirective}

Regras:
1. Responda diretamente e objetivamente à pergunta do usuário de forma amigável, clara e didática.
2. Se a pergunta mencionar um nó ou conceito específico do mapa, dê foco total a ele em vez de falar sobre o mapa de forma genérica.
3. Se o usuário estiver pedindo um quiz/teste/perguntas sobre o mapa mental (ou a pergunta contiver palavras-chave como "quiz", "teste", "pergunta", "test", "question"), defina o campo "type" como "quiz" e gere de 2 a 3 perguntas interativas e altamente contextualizadas. Caso contrário, defina "type" como "markdown".
4. Não use templates de resposta estática ou fixa. A resposta deve ser dinâmica e parecer uma conversa real com uma IA.
5. Não diga para o usuário mudar para outra aba (ex: "mude para a aba Tutor"), a menos que seja estritamente necessário para um recurso não disponível aqui. Tente resolver a dúvida do usuário no próprio chat.
6. Use markdown para formatar a resposta no campo "content" (negrito, listas, tópicos) de forma elegante e muito legível.
7. Se o contexto do mapa/vídeo for insuficiente para responder à pergunta diretamente, use seu conhecimento geral para responder ao tema associado, mencionando sutilmente de maneira amigável que complementou a resposta com base no assunto do mapa/metadados.
8. Nunca mencione termos de infraestrutura interna ou que você está em um iframe ou contêiner.

Retorne obrigatoriamente no formato JSON definido na especificação do responseSchema.`;

      const responseSchema = {
        type: Type.OBJECT,
        properties: {
          type: { type: Type.STRING, description: "Tipo de resposta. Deve ser 'markdown' ou 'quiz'." },
          title: { type: Type.STRING, description: "Título curto elegante e relevante para a resposta ou mini-quiz." },
          content: { type: Type.STRING, description: "Resposta didática em markdown explicando o tema solicitado pelo usuário. Requerido se o tipo for 'markdown'." },
          questions: {
            type: Type.ARRAY,
            description: "Uma lista de 2 a 3 perguntas de múltipla escolha se o tipo for 'quiz'. Deixe vazio se o tipo for 'markdown'.",
            items: {
              type: Type.OBJECT,
              properties: {
                question: { type: Type.STRING, description: "O enunciado da pergunta de múltipla escolha." },
                options: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Exatamente 3 ou 4 alternativas curtas." },
                correctIdx: { type: Type.NUMBER, description: "Índice (0 a 3) da resposta correta no array de opções." },
                explanation: { type: Type.STRING, description: "Explicação curta e didática da resposta correta." }
              },
              required: ["question", "options", "correctIdx", "explanation"]
            }
          }
        },
        required: ["type", "title"]
      };

      const response = await generateContentWithRetry(getAI(), {
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: responseSchema
        }
      });

      const text = response.text || "";
      let parsedResponse;
      try {
        parsedResponse = JSON.parse(text);
      } catch (err) {
        console.error("[Backend] Error parsing JSON response for mindmap-chat, text:", text);
        parsedResponse = {
          type: "markdown",
          title: lang === 'pt' ? "Explicação da IA" : lang === 'es' ? "Explicación de la IA" : "AI Explanation",
          content: text
        };
      }

      res.json(parsedResponse);
    } catch (error: any) {
      console.error("[Backend] Error in mindmap-chat:", error);
      res.status(500).json({ error: error.message || "Failed to generate mind map chat response" });
    }
  });

  // Global Error Handler
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error("Unhandled Application Error:", err);
    res.status(500).json({ error: "Internal server error" });
  });

  // API Routes (Proxy or direct implementation)
  app.get("/api/v1/status", (req, res) => {
    res.json({ message: "Astra Learning AI API is online" });
  });

  // Vite integration
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      root: path.resolve(__dirname, "./frontend"),
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  const server = http.createServer(app);

  // Attach WebSocket Server
  const wss = new WebSocketServer({ noServer: true });

  server.on("upgrade", (request, socket, head) => {
    try {
      const { pathname } = new URL(request.url || "", `http://${request.headers.host || 'localhost'}`);
      if (pathname === "/api/tutor-socket" || pathname === "/ws/tutor") {
        wss.handleUpgrade(request, socket, head, (ws) => {
          wss.emit("connection", ws, request);
        });
      } else {
        socket.destroy();
      }
    } catch (e) {
      console.error("[Backend WebSocket] Upgrade failed:", e);
      socket.destroy();
    }
  });

  wss.on("connection", (clientWs) => {
    console.log("[Backend Tutor] Client connected to live WebSocket");
    let session: any = null;

    clientWs.on("message", async (messageData) => {
      try {
        const msg = JSON.parse(messageData.toString());
        if (msg.type === "setup") {
          const { videoTitle, transcript, explanationLevel = "intermediate", lang = "en" } = msg;
          console.log(`[Backend Tutor] Initializing separated Tutor Live Session for: "${videoTitle}" (level: ${explanationLevel}, lang: ${lang})`);

          session = await initializeTutorSession(videoTitle, transcript, clientWs, explanationLevel, lang);
        } else if (msg.type === "audio") {
          if (session) {
            session.sendRealtimeInput({
              audio: { data: msg.data, mimeType: 'audio/pcm;rate=16000' }
            });
          }
        } else if (msg.type === "video") {
          if (session) {
            session.sendRealtimeInput({
              video: { data: msg.data, mimeType: 'image/jpeg' }
            });
          }
        }
      } catch (error: any) {
        console.error("[Backend Tutor] Error processing socket message:", error);
        clientWs.send(JSON.stringify({ event: "error", details: error?.message || "Invalid message format" }));
      }
    });

    clientWs.on("close", () => {
      console.log("[Backend Tutor] Client WebSocket disconnected, cleaning up Gemini session...");
      if (session) {
        try {
          session.close();
        } catch (e) {
          // ignore
        }
      }
    });

    clientWs.on("error", (err) => {
      console.error("[Backend Tutor] Client WebSocket error:", err);
    });
  });

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Astra Learning AI integrated server running on http://localhost:${PORT}`);
  });
}

startServer();
