import { createHash, randomUUID } from "node:crypto";
import type { Firestore } from "firebase-admin/firestore";
import type { NextFunction, Request, Response } from "express";

/**
 * Technical abuse-protection limits only.
 *
 * IMPORTANT:
 * These values are NOT product quotas, plan entitlements,
 * trial allowances, pricing rules, or margin assumptions.
 *
 * They exist only to protect Astra infrastructure from
 * request bursts and abusive request frequency.
 */
export const RATE_LIMIT_POLICIES = {
  "ai-analysis": {
    limit: 3,
    windowMs: 5 * 60_000,
  },
  "ai-generation": {
    limit: 5,
    windowMs: 5 * 60_000,
  },
  "ai-chat": {
    limit: 10,
    windowMs: 60_000,
  },
  billing: {
    limit: 5,
    windowMs: 5 * 60_000,
  },
  "voice-connect": {
    limit: 3,
    windowMs: 5 * 60_000,
  },
} as const;

export type RateLimitPolicyName = keyof typeof RATE_LIMIT_POLICIES;

export interface RateLimitDecision {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
  resetAtMs: number;
}

interface RateLimitBucketData {
  schemaVersion?: number;
  eventsMs?: unknown;
  updatedAtMs?: number;
}

interface AuthenticatedRateLimitRequest extends Request {
  auth?: {
    uid: string;
    email?: string;
  };
}

export const VOICE_LEASE_TTL_MS = 180_000;

export interface VoiceLeaseDecision {
  acquired: boolean;
  leaseId?: string;
  expiresAtMs?: number;
  retryAfterSeconds: number;
}

interface VoiceLeaseOptions {
  nowMs?: number;
  ttlMs?: number;
  leaseId?: string;
}

interface VoiceLeaseData {
  schemaVersion?: number;
  leaseId?: string;
  acquiredAtMs?: number;
  expiresAtMs?: number;
  updatedAtMs?: number;
}

function hashUid(uid: string): string {
  return createHash("sha256").update(uid, "utf8").digest("hex");
}

function getRateLimitBucketRef(
  db: Firestore,
  uid: string,
  policy: RateLimitPolicyName
) {
  return db
    .collection("_rateLimits")
    .doc(hashUid(uid))
    .collection("buckets")
    .doc(policy);
}

function getVoiceLeaseRef(db: Firestore, uid: string) {
  return db.collection("_voiceLeases").doc(hashUid(uid));
}

function normalizeEvents(events: unknown): number[] {
  if (!Array.isArray(events)) {
    return [];
  }

  return events.filter(
    (value): value is number =>
      typeof value === "number" && Number.isFinite(value)
  );
}

function positiveDurationOrDefault(
  value: number | undefined,
  fallback: number
): number {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    value <= 0
  ) {
    return fallback;
  }

  return value;
}

/**
 * Distributed sliding-window rate limiter.
 *
 * One logical Astra request consumes one event.
 * Internal Gemini retries/fallbacks do NOT consume additional
 * rate-limit events. Provider-consumption accounting belongs
 * to the future cost-protection layer.
 */
export async function consumeUidRateLimit(
  db: Firestore,
  uid: string,
  policy: RateLimitPolicyName,
  nowMs: number = Date.now()
): Promise<RateLimitDecision> {
  if (!uid || typeof uid !== "string") {
    throw new Error("rate_limit_uid_required");
  }

  const config = RATE_LIMIT_POLICIES[policy];
  const bucketRef = getRateLimitBucketRef(db, uid, policy);
  const cutoffMs = nowMs - config.windowMs;

  return db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(bucketRef);
    const data = (snapshot.data() || {}) as RateLimitBucketData;

    const activeEvents = normalizeEvents(data.eventsMs)
      .filter((eventMs) => eventMs > cutoffMs)
      .sort((a, b) => a - b);

    if (activeEvents.length >= config.limit) {
      const oldestActiveEvent = activeEvents[0];
      const resetAtMs = oldestActiveEvent + config.windowMs;
      const retryAfterSeconds = Math.max(
        1,
        Math.ceil((resetAtMs - nowMs) / 1000)
      );

      return {
        allowed: false,
        remaining: 0,
        retryAfterSeconds,
        resetAtMs,
      };
    }

    const nextEvents = [...activeEvents, nowMs];
    const resetAtMs = nextEvents[0] + config.windowMs;

    transaction.set(
      bucketRef,
      {
        schemaVersion: 1,
        eventsMs: nextEvents,
        updatedAtMs: nowMs,
      },
      { merge: true }
    );

    return {
      allowed: true,
      remaining: Math.max(0, config.limit - nextEvents.length),
      retryAfterSeconds: 0,
      resetAtMs,
    };
  });
}

/**
 * Express middleware for authenticated routes.
 *
 * Must run AFTER requireAuth so req.auth.uid is already verified.
 *
 * Firestore failure is fail-closed for protected operations:
 * the request receives HTTP 503 and is not allowed to continue.
 */
export function createUidRateLimitMiddleware(
  policy: RateLimitPolicyName,
  getDb: () => Firestore
) {
  return async function uidRateLimitMiddleware(
    req: AuthenticatedRateLimitRequest,
    res: Response,
    next: NextFunction
  ) {
    const uid = req.auth?.uid;

    if (!uid) {
      return res.status(401).json({
        error: "unauthorized",
      });
    }

    try {
      const decision = await consumeUidRateLimit(
        getDb(),
        uid,
        policy
      );

      if (!decision.allowed) {
        res.setHeader(
          "Retry-After",
          String(decision.retryAfterSeconds)
        );

        return res.status(429).json({
          error: "rate_limited",
          code: "RATE_LIMITED",
          retryAfterSeconds: decision.retryAfterSeconds,
        });
      }

      return next();
    } catch (error: unknown) {
      const errorCode =
        typeof error === "object" &&
        error !== null &&
        "code" in error
          ? String((error as { code?: unknown }).code || "unknown")
          : "unknown";

      console.error("[RateLimit] Decision failed", {
        policy,
        code: errorCode,
      });

      return res.status(503).json({
        error: "rate_limit_service_unavailable",
      });
    }
  };
}

/**
 * Acquires a distributed Voice Tutor lease.
 *
 * A valid existing lease blocks another concurrent Voice session
 * for the same authenticated UID.
 */
export async function acquireVoiceLease(
  db: Firestore,
  uid: string,
  options: VoiceLeaseOptions = {}
): Promise<VoiceLeaseDecision> {
  if (!uid || typeof uid !== "string") {
    throw new Error("voice_lease_uid_required");
  }

  const nowMs = options.nowMs ?? Date.now();
  const ttlMs = positiveDurationOrDefault(
    options.ttlMs,
    VOICE_LEASE_TTL_MS
  );
  const requestedLeaseId = options.leaseId || randomUUID();

  const leaseRef = getVoiceLeaseRef(db, uid);

  return db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(leaseRef);
    const existing = (snapshot.data() || {}) as VoiceLeaseData;

    const existingLeaseId =
      typeof existing.leaseId === "string"
        ? existing.leaseId
        : "";

    const existingExpiresAtMs =
      typeof existing.expiresAtMs === "number" &&
      Number.isFinite(existing.expiresAtMs)
        ? existing.expiresAtMs
        : 0;

    if (
      existingLeaseId &&
      existingExpiresAtMs > nowMs
    ) {
      return {
        acquired: false,
        retryAfterSeconds: Math.max(
          1,
          Math.ceil((existingExpiresAtMs - nowMs) / 1000)
        ),
      };
    }

    const expiresAtMs = nowMs + ttlMs;

    transaction.set(leaseRef, {
      schemaVersion: 1,
      leaseId: requestedLeaseId,
      acquiredAtMs: nowMs,
      expiresAtMs,
      updatedAtMs: nowMs,
    });

    return {
      acquired: true,
      leaseId: requestedLeaseId,
      expiresAtMs,
      retryAfterSeconds: 0,
    };
  });
}

/**
 * Renews only the lease that belongs to the current session.
 * A stale or replaced lease cannot renew itself.
 */
export async function renewVoiceLease(
  db: Firestore,
  uid: string,
  leaseId: string,
  options: Omit<VoiceLeaseOptions, "leaseId"> = {}
): Promise<boolean> {
  if (!uid || !leaseId) {
    return false;
  }

  const nowMs = options.nowMs ?? Date.now();
  const ttlMs = positiveDurationOrDefault(
    options.ttlMs,
    VOICE_LEASE_TTL_MS
  );

  const leaseRef = getVoiceLeaseRef(db, uid);

  return db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(leaseRef);

    if (!snapshot.exists) {
      return false;
    }

    const existing = (snapshot.data() || {}) as VoiceLeaseData;

    if (existing.leaseId !== leaseId) {
      return false;
    }

    const existingExpiresAtMs =
      typeof existing.expiresAtMs === "number" &&
      Number.isFinite(existing.expiresAtMs)
        ? existing.expiresAtMs
        : 0;

    if (existingExpiresAtMs <= nowMs) {
      return false;
    }

    transaction.update(leaseRef, {
      expiresAtMs: nowMs + ttlMs,
      updatedAtMs: nowMs,
    });

    return true;
  });
}

/**
 * Releases a Voice Tutor lease only if leaseId still matches.
 *
 * This prevents an old WebSocket session from deleting the lease
 * of a newer session for the same UID.
 */
export async function releaseVoiceLease(
  db: Firestore,
  uid: string,
  leaseId: string
): Promise<boolean> {
  if (!uid || !leaseId) {
    return false;
  }

  const leaseRef = getVoiceLeaseRef(db, uid);

  return db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(leaseRef);

    if (!snapshot.exists) {
      return false;
    }

    const existing = (snapshot.data() || {}) as VoiceLeaseData;

    if (existing.leaseId !== leaseId) {
      return false;
    }

    transaction.delete(leaseRef);
    return true;
  });
}
