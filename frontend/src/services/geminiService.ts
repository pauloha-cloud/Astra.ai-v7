import axios from 'axios';
import { api } from '../lib/api';

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

export const generateExtraQuestions = async (title: string, content: string, lang: string, count: number = 5, explanationLevel: string = 'intermediate'): Promise<AnalysisResult['quiz']> => {
  try {
    const response = await api.post('/generate-extra-questions', { title, content, lang, targetLanguage: lang, count, explanationLevel });
    return response.data.quiz || [];
  } catch (error) {
    console.error("Error generating extra questions from backend proxy:", error);
    throw error;
  }
};
