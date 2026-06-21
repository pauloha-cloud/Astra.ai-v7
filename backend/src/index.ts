import express, { Request, Response } from 'express';
import http from 'http';
import { WebSocketServer } from 'ws';
import cors from 'cors';
import dotenv from 'dotenv';
import { YoutubeTranscript } from 'youtube-transcript';
import axios from 'axios';
import { GoogleGenAI, Type } from "@google/genai";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

// Helper to extract YouTube Video ID from various formats
function extractVideoId(url: string | any): string | null {
  if (!url || typeof url !== 'string') {
    console.warn("[Backend] extractVideoId: Input is not a valid string", typeof url);
    return null;
  }
  
  const cleanUrl = url.trim();
  try {
    const urlWithProtocol = cleanUrl.includes('://') ? cleanUrl : `https://${cleanUrl}`;
    const urlObj = new URL(urlWithProtocol);
    
    if (urlObj.hostname === 'youtu.be') {
      const id = urlObj.pathname.slice(1).split(/[?#&]/)[0];
      if (id.length === 11) {
        return id;
      }
    }
    
    if (urlObj.hostname.includes('youtube.com')) {
      const v = urlObj.searchParams.get('v');
      if (v && v.length === 11) {
        return v;
      }
      const pathParts = urlObj.pathname.split('/');
      const idFromPath = pathParts.find(part => part.length === 11 && /^[a-zA-Z0-9_-]{11}$/.test(part));
      if (idFromPath) {
        return idFromPath;
      }
    }
  } catch (e) {
    // ignore URL parser failure
  }

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
      return match[1];
    }
  }

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
  clientWs: any
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
      generationConfig: {
        responseModalities: ["AUDIO" as any],
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: "Zephyr" } },
        },
      },
      outputAudioTranscription: {},
      inputAudioTranscription: {},
      systemInstruction: `You are Astra Learning AI, the ultimate neural study companion. You are guiding a student on the video: "${videoTitle}".\n\n` +
      `Context from Video:\n${(transcript || "").substring(0, 15000)}\n\n` +
      `Pedagogical Guidelines:\n` +
      `1. Be the ultimate mentor. Don't just give answers—ask targeted questions that guide the user to the answer.\n` +
      `2. Use specific examples from the transcript to build your explanations.\n` +
      `3. If the user seems lost, simplify the concept using a real-world analogy.\n` +
      `4. Acknowledge the user's progress. Use phrases like "Exactly!", "Great catch", "You've got it".\n` +
      `5. Keep your spoken responses concise and energetic. Aim for natural conversation patterns.`
    }
  });
}

async function startServer() {
  const app = express();
  const PORT = process.env.PORT || 8080;

  const AXIOS_CONFIG = {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    },
    timeout: 10000
  };

  app.use(cors());
  app.use(express.json());

  // Health Check
  const healthHandler = (req: Request, res: Response) => {
    const geminiKey = process.env.GEMINI_API_KEY;
    const keyConfigured = !!geminiKey && geminiKey !== "MY_GEMINI_API_KEY" && geminiKey.length > 5;
    res.json({ 
      status: "ok", 
      service: "astra-backend-service", 
      gemini: keyConfigured ? "configured" : "missing",
      timestamp: new Date().toISOString() 
    });
  };

  app.get('/health', healthHandler);
  app.get('/api/health', healthHandler);

  // Status check endpoint
  app.get('/api/v1/status', (req: Request, res: Response) => {
    res.json({ message: 'Astra Learning AI API is online' });
  });

  // YouTube Info Endpoint
  app.post("/api/youtube-info", async (req: Request, res: Response) => {
    const { url, youtube_url, lang = 'en' } = req.body;
    const targetUrl = url || youtube_url;

    const langNames: Record<string, string> = {
      'pt': 'Portuguese (Brazilian)',
      'en': 'English',
      'es': 'Spanish'
    };
    const targetLang = langNames[lang] || 'English';

    console.log(`[Backend-Service] /api/youtube-info: New request for URL: "${targetUrl}"`);

    if (!targetUrl) {
      return res.status(400).json({ 
        error: lang === 'pt' ? 'URL do YouTube é obrigatória' : 'YouTube URL is required' 
      });
    }

    const videoId = extractVideoId(targetUrl);
    if (!videoId) {
      return res.status(400).json({ 
        error: lang === 'pt' ? 'URL do YouTube inválida' : 'Invalid YouTube URL',
        details: lang === 'pt' ? 'Verifique se o link está correto.' : 'Please ensure the link is correct.'
      });
    }

    try {
      let metadata: any = null;
      try {
        const oEmbedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
        const oEmbedResponse = await axios.get(oEmbedUrl, AXIOS_CONFIG);
        metadata = oEmbedResponse.data;
      } catch (metaErr: any) {
        if (metaErr.response?.status === 404) {
          return res.status(404).json({
            error: lang === 'pt' ? 'Vídeo não encontrado' : 'Video not found'
          });
        }
        metadata = {
          title: "YouTube Video",
          author_name: "YouTube Creator",
          thumbnail_url: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`
        };
      }

      let transcript = "";
      let mode: "transcript" | "metadata_fallback" = "transcript";
      
      try {
        const fetchItems = await Promise.race([
          YoutubeTranscript.fetchTranscript(videoId),
          new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 12000))
        ]) as any[];
        
        transcript = fetchItems.map(i => i.text).join(' ');
        if (!transcript || transcript.trim().length < 10) {
          throw new Error("Transcript too short");
        }
      } catch (transErr: any) {
        mode = "metadata_fallback";
      }

      let analysisData: any = null;
      try {
        const prompt = mode === "transcript" 
          ? `Analyze the following transcript for the video "${metadata.title}" by "${metadata.author_name || "Unknown"}". 
             Generate summary, key points, interactive quiz, and a detailed mind map.
             Transcript: ${(transcript || "").substring(0, 80000)}`
          : `Act as a subject matter expert. Based on the video title "${metadata.title}" by "${metadata.author_name || "Unknown"}", provide a detailed overview.`;

        const response = await getAI().models.generateContent({
          model: "gemini-3-flash-preview",
          contents: prompt,
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
                    children: { type: Type.ARRAY, items: { type: Type.OBJECT } }
                  }
                },
                tutor_questions: { type: Type.ARRAY, items: { type: Type.STRING } },
                limitations: { type: Type.ARRAY, items: { type: Type.STRING } }
              },
              required: ["summary", "key_points", "quiz", "mind_map", "tutor_questions", "limitations"]
            }
          }
        });

        analysisData = safeParseAIJSON(response.text || "");
      } catch (aiErr: any) {
        console.error("[Backend] Gemini analysis failed:", aiErr);
        if (aiErr.message?.includes("Gemini API configuration") || aiErr.message?.includes("GEMINI_API_KEY")) {
          return res.status(500).json({
            error: "Gemini API Configuration Error",
            details: aiErr.message
          });
        }
        analysisData = {
          summary: "Error generating full AI summary. Using fallback template.",
          key_points: ["Key Topic Analysis", "General Overview"],
          quiz: [],
          mind_map: { topic: metadata.title, children: [] },
          tutor_questions: ["Could you summarize this conceptually?"],
          limitations: ["AI services are momentarily loaded."]
        };
      }

      return res.json({
        video: {
          videoId,
          url: `https://www.youtube.com/watch?v=${videoId}`,
          title: metadata.title,
          channel: metadata.author_name,
          thumbnail: metadata.thumbnail_url
        },
        mode,
        ...analysisData,
        transcript: transcript || "[N/A]"
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // Generate Extra Questions Endpoint
  app.post("/api/generate-extra-questions", async (req: Request, res: Response) => {
    const { title, content, lang } = req.body;
    try {
      const langNames: Record<string, string> = {
        'pt': 'Portuguese (Brazilian)',
        'en': 'English',
        'es': 'Spanish'
      };
      const targetLang = langNames[lang] || 'English';

      const prompt = `Based on the following content for the video "${title}", generate 5 additional challenging multiple-choice quiz questions.
        Language: ${targetLang}
        Content: ${(content || "").substring(0, 30000)}`;

      const response = await getAI().models.generateContent({
        model: "gemini-3-flash-preview",
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

      res.json({ quiz: safeParseAIJSON(response.text || "")?.quiz || [] });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  const server = http.createServer(app);
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
          const { videoTitle, transcript } = msg;
          session = await initializeTutorSession(videoTitle, transcript, clientWs);
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
        clientWs.send(JSON.stringify({ event: "error", details: error?.message }));
      }
    });

    clientWs.on("close", () => {
      if (session) {
        try { session.close(); } catch (e) {}
      }
    });
  });

  server.listen(PORT, () => {
    console.log(`Backend server running on port ${PORT}`);
  });
}

startServer();
