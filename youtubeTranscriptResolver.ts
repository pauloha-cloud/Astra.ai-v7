export type TranscriptMode = "transcript" | "metadata_fallback";

export interface TranscriptItem {
  text?: string;
}

export interface TranscriptFallbackResult {
  text: string;
  billableRequests?: string;
}

export interface YouTubeTranscriptResolution {
  text: string;
  mode: TranscriptMode;
  fallbackUsed: boolean;
  billableRequests?: string;
  primaryError?: unknown;
  fallbackError?: unknown;
}

export interface ResolveYouTubeTranscriptOptions {
  videoId: string;
  primary: (videoId: string) => Promise<TranscriptItem[]>;
  fallback: (videoId: string) => Promise<TranscriptFallbackResult>;
  primaryTimeoutMs?: number;
}

const DEFAULT_PRIMARY_TIMEOUT_MS = 12000;

async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number
): Promise<T> {
  let timeout: ReturnType<typeof setTimeout> | undefined;

  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timeout = setTimeout(() => reject(new Error("Timeout")), timeoutMs);
      }),
    ]);
  } finally {
    if (timeout) {
      clearTimeout(timeout);
    }
  }
}

export async function resolveYouTubeTranscript(
  options: ResolveYouTubeTranscriptOptions
): Promise<YouTubeTranscriptResolution> {
  const timeoutMs =
    options.primaryTimeoutMs ?? DEFAULT_PRIMARY_TIMEOUT_MS;

  try {
    const items = await withTimeout(
      options.primary(options.videoId),
      timeoutMs
    );

    const text = items.map((item) => item.text).join(" ");

    if (!text || text.trim().length < 10) {
      throw new Error("Transcript too short or empty");
    }

    return {
      text,
      mode: "transcript",
      fallbackUsed: false,
    };
  } catch (primaryError) {
    try {
      const fallbackResult = await options.fallback(options.videoId);

      if (!fallbackResult.text || fallbackResult.text.trim().length < 10) {
        throw new Error("Fallback transcript too short or empty");
      }

      return {
        text: fallbackResult.text,
        mode: "transcript",
        fallbackUsed: true,
        billableRequests: fallbackResult.billableRequests,
        primaryError,
      };
    } catch (fallbackError) {
      return {
        text: "",
        mode: "metadata_fallback",
        fallbackUsed: true,
        primaryError,
        fallbackError,
      };
    }
  }
}
