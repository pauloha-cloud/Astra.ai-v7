import { GoogleGenAI, Type } from "@google/genai";
import axios from 'axios';
import { api } from '../lib/api';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export interface AnalysisResult {
  video: {
    videoId: string;
    url: string;
    title: string;
    channel: string;
    thumbnail: string;
  };
  mode: 'transcript' | 'metadata_fallback';
  message: string;
  summary: string;
  key_points: string[];
  quiz: {
    question: string;
    options: string[];
    answer: string;
    explanation?: string;
  }[];
  mind_map: {
    topic: string;
    children: any[];
  } | string[];
  tutor_questions: string[];
  limitations: string[];
  transcript?: string;
}

// Deprecated: Analysis now happens on the backend to secure API keys
export const analyzeVideoContent = async (title: string, transcript: string): Promise<any> => {
  console.warn("analyzeVideoContent is deprecated. Use the backend /api/youtube-info instead.");
  throw new Error("Deprecated. Analysis moved to backend.");
};

export const generateExtraQuestions = async (title: string, content: string, lang: string): Promise<AnalysisResult['quiz']> => {
  try {
    const langNames: Record<string, string> = {
      'pt': 'Portuguese (Brazilian)',
      'en': 'English',
      'es': 'Spanish'
    };
    const targetLang = langNames[lang] || 'English';

    const prompt = `Based on the following content for the video "${title}", generate 5 additional challenging multiple-choice quiz questions.
      
      CRITICAL:
      1. Content must be in ${targetLang}.
      2. Response must be valid JSON only.
      3. Questions must be different from common knowledge, focus on specific details in the content.
      
      Content:
      ${content.substring(0, 30000)}`;

    const response = await ai.models.generateContent({
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

    const text = response.text || "";
    const parsed = JSON.parse(text);
    return parsed.quiz || [];
  } catch (error) {
    console.error("Error generating extra questions in frontend:", error);
    throw error;
  }
};
