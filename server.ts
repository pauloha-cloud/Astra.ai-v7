import express from "express";
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

// Initialize Gemini
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

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

// Handle unhandled promise rejections to prevent process crashes
process.on('unhandledRejection', (reason, promise) => {
  console.error('[Backend] Unhandled Rejection at:', promise, 'reason:', reason);
});

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
    const { url, youtube_url, lang = 'en' } = req.body;
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
        console.warn(`[Backend] Transcript fetch: FAILED - ${transErr.message}. Using metadata fallback.`);
        mode = "metadata_fallback";
      }

      // Step 4: AI Analysis (Gemini)
      console.log(`[Backend] Starting Gemini analysis in ${mode} mode...`);
      let analysisData: any = null;
      
      try {
        // Construct prompt
        const prompt = mode === "transcript" 
          ? `Analyze the following transcript for the video "${metadata.title}" by "${metadata.author_name || "Unknown"}". 
             Generate a comprehensive educational summary, key points, interactive quiz, and a HIGHLY DETAILED hierarchical mind map.
             
             CRITICAL FOR MIND MAP GENERATION:
             1. The mind map must be deep and wide. 
             2. DO NOT return just 1 or 2 nodes. 
             3. Generate 5-7 primary branches radiating from the main topic.
             4. Each primary branch MUST have 3-5 child nodes (secondary branches).
             5. Where applicable, add tertiary detail nodes under secondary branches.
             6. Each node should have a 'topic' (short, 1-3 words), 'importance' (1-5), and 'category'.
             7. Categories: 'Concept', 'Example', 'Detail', 'Definition', 'Method', 'Benefit', 'Risk', 'Trend'.
             8. Icons: Use Lucide icon names like 'Zap', 'BookOpen', 'Target', 'Layers', 'Cpu', 'Globe', 'Activity', 'TrendingUp', 'CheckCircle', 'AlertCircle'.
             9. Ensure the concepts flow logically and cover all major sections of the transcript.
             
             GENERAL CRITICAL:
             1. Content must be in ${targetLang}.
             2. Response must be valid JSON only.
             3. Summary should be 3-4 paragraphs of high-quality Markdown.
             
             Transcript:
             ${transcript.substring(0, 80000)}`
          : `Act as a subject matter expert. I don't have the transcript for the video titled "${metadata.title}" by "${metadata.author_name || "Unknown"}". 
             Based on this title, provide an educational analysis and overview of the subject matter.
             
             CRITICAL FOR MIND MAP GENERATION:
             1. Create a RICH and deep hierarchical mind map from your knowledge of this topic.
             2. Generate at least 6 main branches with 3-4 children each.
             3. Use importance levels 1-5 and appropriate categories/icons.
             
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

        const geminiResult = await ai.models.generateContent({
          model: "gemini-3-flash-preview",
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
                          icon: { type: Type.STRING },
                          children: { 
                            type: Type.ARRAY, 
                            items: { 
                              type: Type.OBJECT,
                              properties: {
                                topic: { type: Type.STRING },
                                importance: { type: Type.NUMBER },
                                category: { type: Type.STRING },
                                icon: { type: Type.STRING },
                                children: { type: Type.ARRAY, items: { type: Type.OBJECT } }
                              }
                            } 
                          }
                        }
                      } 
                    }
                  }
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
        
        // Final fallback analysis object if AI fails completely (constructive and helpful)
        const isPt = lang === 'pt';
        analysisData = {
          summary: isPt 
            ? `Esta sessão foca no conteúdo de **${metadata.title}**. Embora a análise automatizada detalhada tenha encontrado uma limitação técnica no momento, você ainda pode explorar os conceitos fundamentais através da transcrição e do Tutor Astra.`
            : `This session focuses on **${metadata.title}**. While our automated deep analysis encountered a brief technical limitation, you can still explore the core concepts using the transcript and the Astra Tutor.`,
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

  // Global Error Handler
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error("Unhandled Application Error:", err);
    res.status(500).json({ error: "Internal server error" });
  });

  // API Routes (Proxy or direct implementation)
  app.get("/api/v1/status", (req, res) => {
    res.json({ message: "Astra.ai API is online" });
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

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Astra.ai integrated server running on http://localhost:${PORT}`);
  });
}

startServer();
