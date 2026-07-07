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

async function generateContentWithRetry(ai: any, params: any, maxRetries = 3, baseDelayMs = 2000): Promise<any> {
  let attempt = 0;
  while (true) {
    try {
      return await ai.models.generateContent(params);
    } catch (err: any) {
      attempt++;
      const errMsg = err.message || "";
      const isTransient = err.status === 503 || err.status === 429 || 
                          errMsg.includes("503") || errMsg.includes("429") ||
                          errMsg.toLowerCase().includes("high demand") || 
                          errMsg.toLowerCase().includes("temporary") ||
                          errMsg.toLowerCase().includes("unavailable") ||
                          errMsg.toLowerCase().includes("overloaded");
      if (isTransient) {
        if (params.model === "gemini-3.5-flash") {
          console.warn(`[Gemini] Model gemini-3.5-flash is unavailable or overloaded. Falling back to gemini-3.1-flash-lite...`);
          params.model = "gemini-3.1-flash-lite";
          attempt = 0;
          continue;
        } else if (params.model === "gemini-3.1-flash-lite") {
          console.warn(`[Gemini] Model gemini-3.1-flash-lite is unavailable or overloaded. Falling back to gemini-flash-latest...`);
          params.model = "gemini-flash-latest";
          attempt = 0;
          continue;
        }
        
        if (attempt < maxRetries) {
          const delay = baseDelayMs * Math.pow(2, attempt - 1) * (0.8 + Math.random() * 0.4);
          console.warn(`[Gemini] Model high demand/rate limit for ${params.model} (status: ${err.status}, msg: ${errMsg}). Retrying in ${Math.round(delay)}ms (attempt ${attempt}/${maxRetries})...`);
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
      systemInstruction: `You are Astra Learning AI, the ultimate neural study companion. You are guiding a student on the video: "${videoTitle}".\n\n` +
      `Context from Video:\n${(transcript || "").substring(0, 15000)}\n\n` +
      `Pedagogical Guidelines:\n` +
      `1. Be the ultimate mentor. Don't just give answers—ask targeted questions that guide the user to the answer.\n` +
      `2. Use specific examples from the transcript to build your explanations.\n` +
      `3. If the user seems lost, simplify the concept using a real-world analogy.\n` +
      `4. Acknowledge the user's progress. Use phrases like "Exactly!", "Great catch", "You've got it".\n` +
      `5. Keep your spoken responses concise and energetic. Aim for natural conversation patterns.\n\n` +
      `EXPLANATION LEVEL DIRECTIVE (CRITICAL):\n` +
      `${getExplanationInstruction(explanationLevel, lang)}`
    }
  });
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
  app.use(express.json());

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
    const { url, youtube_url, lang = 'en', explanationLevel = 'intermediate' } = req.body;
    const targetUrl = url || youtube_url;

    const langNames: Record<string, string> = {
      'pt': 'Portuguese (Brazilian)',
      'en': 'English',
      'es': 'Spanish'
    };
    const targetLang = langNames[lang] || 'English';

    console.log(`[Backend] /api/youtube-info: New request for URL: "${targetUrl}"`);

    if (!targetUrl) {
      return res.status(400).json({ 
        error: lang === 'pt' ? 'URL do YouTube é obrigatória' : 'YouTube URL is required' 
      });
    }

    // Step 1: Video ID Extraction
    const videoId = extractVideoId(targetUrl);
    console.log(`[Backend] Extracted Video ID: ${videoId || 'FAILED'}`);
    
    if (!videoId) {
      return res.status(400).json({ 
        error: lang === 'pt' ? 'URL do YouTube inválida' : 'Invalid YouTube URL',
        details: lang === 'pt' ? 'Verifique se o link está correto.' : 'Please ensure the link is correct.'
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
             Generate a comprehensive educational summary, key points, interactive quiz, and a simple high-level overview mind map.
             
             EXPLANATION LEVEL DIRECTIVE (CRITICAL):
             ${getExplanationInstruction(explanationLevel, lang)}
             
             CRITICAL FOR MIND MAP GENERATION:
             1. Create a simple high-level mind map representing 3 to 5 core branches/categories radiating from the main topic.
             2. Each node should have a 'topic' (short, 1-3 words), 'importance' (1-5), 'category', and 'icon'.
             3. Categories: 'Concept', 'Example', 'Detail', 'Definition', 'Method', 'Benefit', 'Risk', 'Trend'.
             5. Icons: Use Lucide icon names like 'Zap', 'BookOpen', 'Target', 'Layers', 'Cpu', 'Globe', 'Activity', 'TrendingUp', 'CheckCircle', 'AlertCircle'.
             
             GENERAL CRITICAL:
             1. Content must be in ${targetLang}.
             2. Response must be valid JSON only.
             3. Summary should be 3-4 paragraphs of high-quality Markdown.
             
             Transcript:
             ${transcript.substring(0, 80000)}`
          : `Act as a subject matter expert. I don't have the transcript for the video titled "${metadata.title}" by "${metadata.author_name || "Unknown"}". 
             Based on this title, provide an educational analysis and overview of the subject matter.
             
             EXPLANATION LEVEL DIRECTIVE (CRITICAL):
             ${getExplanationInstruction(explanationLevel, lang)}
             
             CRITICAL FOR MIND MAP GENERATION:
             1. Create a simple high-level mind map with 3-5 main core categories/branches radiating from the main topic.
             2. Use importance levels 1-5, appropriate categories, and Lucide icons.
             
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
                - limitations: Mention that this analysis is based on metadata/title as the specific video transcript was unavailable.`;

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
                limitations: { type: Type.ARRAY, items: { type: Type.STRING } }
              },
              required: ["summary", "key_points", "quiz", "mind_map", "tutor_questions", "limitations"]
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
          if (!mm.children || mm.children.length < 3) {
            console.log("[Backend] Mind map too shallow, adding enrichment branches...");
            const fallbackBranches = [
              { topic: isPt ? "Conceitos Chave" : "Key Concepts", category: "Concept", icon: "Layers", importance: 5, children: [] },
              { topic: isPt ? "Aplicações Práticas" : "Practical Applications", category: "Method", icon: "Target", importance: 4, children: [] },
              { topic: isPt ? "Detalhes Adicionais" : "Additional Details", category: "Detail", icon: "BookOpen", importance: 3, children: [] }
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
        analysisData = {
          summary: isPt 
            ? `Esta sessão foca no conteúdo de **${metadata.title}**. Embora a análise automatizada detalhada tenha encontrado uma limitação técnica no momento, você ainda pode explorar os conceitos fundamentais através da transcrição e do Tutor Astra Learning AI.`
            : `This session focuses on **${metadata.title}**. While our automated deep analysis encountered a brief technical limitation, you can still explore the core concepts using the transcript and the Astra Learning AI Tutor.`,
          key_points: [
            isPt ? `Tópico: ${metadata.title}` : `Topic: ${metadata.title}`,
            isPt ? `Criador: ${metadata.author_name || 'Desconhecido'}` : `Creator: ${metadata.author_name || 'Unknown'}`,
            isPt ? "Use o Tutor de Estudos para aprofundar seu conhecimento." : "Use the Study Tutor to deepen your knowledge.",
            isPt ? "Revise a transcrição para detalhes específicos." : "Review the transcript for specific details."
          ],
          quiz: [],
          mind_map: { 
            topic: metadata.title, 
            children: [{ topic: metadata.author_name || 'YouTube', children: [] }] 
          },
          tutor_questions: [
            isPt ? "Pode resumir o ponto principal deste vídeo?" : "Can you summarize the main point of this video?",
            isPt ? "Quais são as lições práticas que posso tirar daqui?" : "What practical lessons can I take from here?"
          ],
          limitations: [
            isPt ? "A análise da IA está temporariamente limitada." : "AI Analysis is temporarily limited.",
            isPt ? "A transcrição pode estar incompleta ou indisponível." : "Transcript may be incomplete or unavailable."
          ]
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
          ? (lang === 'pt' ? "Análise gerada a partir da transcrição." : "Analysis generated from transcript.")
          : (lang === 'pt' ? "Análise gerada a partir dos metadados." : "Analysis generated from video metadata."),
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

  // Extra Quiz Questions Generation Endpoint (Secure server-side proxy)
  app.post("/api/generate-extra-questions", async (req, res) => {
    const { title, content, lang, count = 5, explanationLevel = 'intermediate' } = req.body;
    try {
      const questionCount = count;
      const videoTitle = title;
      const explanationInstr = getExplanationInstruction(explanationLevel, lang);
      let prompt = "";
      if (lang === 'pt') {
        prompt = `Gere exatamente ${questionCount} questões de múltipla escolha com base somente no conteúdo do vídeo analisado. As perguntas devem estar diretamente relacionadas ao assunto do vídeo: ${videoTitle}. Use o resumo, principais pontos, transcrição ou contexto disponível. Não crie perguntas genéricas ou fora do conteúdo. Cada questão deve ter 4 alternativas, apenas uma resposta correta e uma explicação curta da resposta correta.

EXPLANATION LEVEL DIRECTIVE (CRITICAL):
${explanationInstr}

Conteúdo:
${(content || "").substring(0, 30000)}`;
      } else if (lang === 'es') {
        prompt = `Genera exactamente ${questionCount} preguntas de opción múltiple basadas únicamente en el contenido del video analizado. Las preguntas deben estar directamente relacionadas con el tema del video: ${videoTitle}. Usa el resumen, los puntos clave, la transcripción o el contexto disponible. No crees preguntas genéricas ni fuera del contenido. Cada pregunta debe tener 4 alternativas, solo una respuesta correcta y una breve explicación de la respuesta correcta.

EXPLANATION LEVEL DIRECTIVE (CRITICAL):
${explanationInstr}

Contenido:
${(content || "").substring(0, 30000)}`;
      } else {
        prompt = `Generate exactly ${questionCount} multiple-choice questions based only on the analyzed video content. The questions must be directly related to the video's topic: ${videoTitle}. Use the summary, key points, transcript, or available context. Do not create generic questions or questions outside the content. Each question must have 4 options, only one correct answer, and a short explanation of the correct answer.

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
    const { title, content, summary, keyTakeaways, actionableLessons, transcript, fallbackReason, lang, explanationLevel = 'intermediate' } = req.body;
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

Idioma da interface:
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
13. Gere o mapa no idioma atual da interface.
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
        nodes.forEach((node: any) => {
          if (node.label) labels.push(node.label);
          if (node.children?.length) {
            labels.push(...collectAllLabels(node.children));
          }
        });
        return labels;
      }

      function validateMindMap(mindMap: any): boolean {
        if (!mindMap) return false;
        if (!mindMap.centralTopic) return false;
        if (!Array.isArray(mindMap.nodes)) return false;
        if (mindMap.nodes.length < 6) return false;

        const totalNodes = countNodes(mindMap.nodes);
        if (totalNodes < 25) return false;

        const branchesWithChildren = mindMap.nodes.filter(
          (node: any) => Array.isArray(node.children) && node.children.length >= 3
        );

        if (branchesWithChildren.length < 6) return false;

        const hasThirdLevel = mindMap.nodes.some((node: any) =>
          node.children?.some((child: any) =>
            child.children && child.children.length > 0
          )
        );

        if (!hasThirdLevel) return false;

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
    const { question, centralTopic, mindMap, videoTitle, summary, transcript, mode, lang = 'pt', explanationLevel = 'intermediate' } = req.body;

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

Idioma da resposta:
${languageName} (A resposta deve ser obrigatoriamente neste idioma)

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
