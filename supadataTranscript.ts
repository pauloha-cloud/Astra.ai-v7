import axios from "axios";

const SUPADATA_TRANSCRIPT_URL = "https://api.supadata.ai/v1/transcript";
const DEFAULT_TIMEOUT_MS = 8000;

export type SupadataTranscriptErrorCode =
  | "supadata_not_configured"
  | "supadata_timeout"
  | "supadata_unauthorized"
  | "supadata_forbidden"
  | "supadata_rate_limited"
  | "supadata_transcript_unavailable"
  | "supadata_upstream_error"
  | "supadata_invalid_response"
  | "supadata_empty_transcript"
  | "supadata_request_failed";

export class SupadataTranscriptError extends Error {
  constructor(public readonly code: SupadataTranscriptErrorCode) {
    super(code);
    this.name = "SupadataTranscriptError";
  }
}

export interface SupadataTranscriptResult {
  text: string;
  language?: string;
  billableRequests?: string;
}

type HttpGet = typeof axios.get;

export async function fetchSupadataNativeTranscript(options: {
  url: string;
  lang?: string;
  apiKey?: string;
  timeoutMs?: number;
  httpGet?: HttpGet;
}): Promise<SupadataTranscriptResult> {
  const apiKey = options.apiKey?.trim();
  if (!apiKey) {
    throw new SupadataTranscriptError("supadata_not_configured");
  }

  const httpGet = options.httpGet ?? axios.get;
  try {
    const response = await httpGet(SUPADATA_TRANSCRIPT_URL, {
      headers: { "x-api-key": apiKey },
      params: {
        url: options.url,
        ...(options.lang ? { lang: options.lang } : {}),
        text: true,
        mode: "native",
      },
      timeout: options.timeoutMs ?? DEFAULT_TIMEOUT_MS,
      validateStatus: (status) => status >= 200 && status < 300,
    });

    // Native mode is expected to return an immediate transcript. Never poll a
    // job here: async processing belongs to generated/AI transcription paths.
    if (response.status === 202 || response.data?.jobId) {
      throw new SupadataTranscriptError("supadata_invalid_response");
    }
    if (response.status === 206) {
      throw new SupadataTranscriptError("supadata_transcript_unavailable");
    }

    const content = response.data?.content;
    if (typeof content !== "string") {
      throw new SupadataTranscriptError("supadata_invalid_response");
    }

    const text = content.trim();
    if (text.length < 10) {
      throw new SupadataTranscriptError("supadata_empty_transcript");
    }

    return {
      text,
      language: typeof response.data?.lang === "string" ? response.data.lang : undefined,
      billableRequests:
        typeof response.headers?.["x-billable-requests"] === "string"
          ? response.headers["x-billable-requests"]
          : undefined,
    };
  } catch (error: any) {
    if (error instanceof SupadataTranscriptError) throw error;
    if (error?.code === "ECONNABORTED" || error?.code === "ETIMEDOUT") {
      throw new SupadataTranscriptError("supadata_timeout");
    }

    const status = error?.response?.status;
    if (status === 401) throw new SupadataTranscriptError("supadata_unauthorized");
    if (status === 403) throw new SupadataTranscriptError("supadata_forbidden");
    if (status === 429) throw new SupadataTranscriptError("supadata_rate_limited");
    if (typeof status === "number" && status >= 500) {
      throw new SupadataTranscriptError("supadata_upstream_error");
    }
    if (status === 404 || status === 206) {
      throw new SupadataTranscriptError("supadata_transcript_unavailable");
    }

    throw new SupadataTranscriptError("supadata_request_failed");
  }
}
