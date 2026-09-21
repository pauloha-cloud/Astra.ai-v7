import { randomUUID } from "node:crypto";
import type {
  NextFunction,
  Request,
  RequestHandler,
  Response,
} from "express";

export type SafeLogSeverity = "INFO" | "WARNING" | "ERROR";

export interface SafeLogRecord {
  severity: SafeLogSeverity;
  event: string;
  requestId?: string;
  method?: string;
  route?: string;
  status?: number;
  durationMs?: number;
  errorCode?: string;
  stripeEventType?: string;
}

export type StructuredLogWriter = (record: SafeLogRecord) => void;

const REQUEST_ID_PATTERN = /^[A-Za-z0-9._:-]{1,128}$/;

export function getSafeErrorCode(error: unknown): string {
  if (typeof error !== "object" || error === null) {
    return "unknown";
  }

  const candidate =
    "code" in error
      ? String((error as { code?: unknown }).code ?? "")
      : "name" in error
        ? String((error as { name?: unknown }).name ?? "")
        : "";

  if (!/^[A-Za-z0-9._:/-]{1,80}$/.test(candidate)) {
    return "unknown";
  }

  return candidate || "unknown";
}

export function writeStructuredLog(record: SafeLogRecord): void {
  const payload = {
    message: record.event,
    ...record,
  };

  console.log(JSON.stringify(payload));
}

function resolveRequestId(req: Request): string {
  const incoming = req.get("x-request-id");

  if (incoming && REQUEST_ID_PATTERN.test(incoming)) {
    return incoming;
  }

  return randomUUID();
}

function requestSeverity(status: number): SafeLogSeverity {
  if (status >= 500) return "ERROR";
  if (status >= 400) return "WARNING";
  return "INFO";
}

function shouldLogRequest(req: Request): boolean {
  if (!req.path.startsWith("/api/")) {
    return false;
  }

  // Cloud Run already emits native request logs for uptime probes.
  // Avoid duplicating the high-frequency health-check traffic.
  return req.path !== "/api/health";
}

function resolveRoute(req: Request): string {
  const routePath = req.route?.path;

  if (typeof routePath !== "string") {
    return "<unmatched-api>";
  }

  if (routePath === "*") {
    return "<spa-fallback>";
  }

  return routePath;
}

export function createRequestLoggingMiddleware(
  writer: StructuredLogWriter = writeStructuredLog
): RequestHandler {
  return (
    req: Request,
    res: Response,
    next: NextFunction
  ): void => {
    const requestId = resolveRequestId(req);
    const startedAt = process.hrtime.bigint();

    res.locals.requestId = requestId;
    res.setHeader("x-request-id", requestId);

    res.once("finish", () => {
      if (!shouldLogRequest(req)) {
        return;
      }

      try {
        const elapsedNs = process.hrtime.bigint() - startedAt;
        const durationMs =
          Math.round((Number(elapsedNs) / 1_000_000) * 100) / 100;

        writer({
          severity: requestSeverity(res.statusCode),
          event: "http_request_completed",
          requestId,
          method: req.method,
          route: resolveRoute(req),
          status: res.statusCode,
          durationMs,
        });
      } catch {
        // Observability must never affect the HTTP response lifecycle.
      }
    });

    next();
  };
}
