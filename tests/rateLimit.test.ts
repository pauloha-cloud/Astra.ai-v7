import assert from "node:assert/strict";
import {
  after,
  before,
  beforeEach,
  test,
} from "node:test";

import {
  deleteApp,
  initializeApp,
  type App,
} from "firebase-admin/app";
import {
  getFirestore,
  type Firestore,
} from "firebase-admin/firestore";

import {
  acquireVoiceLease,
  consumeUidRateLimit,
  createUidRateLimitMiddleware,
  releaseVoiceLease,
  renewVoiceLease,
} from "../rateLimit.js";

const PROJECT_ID = "demo-astra-rate-limit";
const APP_NAME = `astra-rate-limit-test-${process.pid}`;

let app: App;
let db: Firestore;

function requireFirestoreEmulator(): void {
  const emulatorHost = process.env.FIRESTORE_EMULATOR_HOST;

  assert.ok(
    emulatorHost,
    "FIRESTORE_EMULATOR_HOST is required. Refusing to run against a real Firestore database."
  );

  assert.match(
    emulatorHost,
    /^(127\.0\.0\.1|localhost):\d+$/,
    `Unexpected FIRESTORE_EMULATOR_HOST: ${emulatorHost}`
  );

  assert.ok(
    PROJECT_ID.startsWith("demo-"),
    "Test project ID must use the demo- prefix."
  );
}

async function clearInternalCollections(): Promise<void> {
  await Promise.all([
    db.recursiveDelete(db.collection("_rateLimits")),
    db.recursiveDelete(db.collection("_voiceLeases")),
  ]);
}

before(async () => {
  requireFirestoreEmulator();

  app = initializeApp(
    {
      projectId: PROJECT_ID,
    },
    APP_NAME
  );

  db = getFirestore(app);
});

beforeEach(async () => {
  await clearInternalCollections();
});

after(async () => {
  if (app) {
    await deleteApp(app);
  }
});

test(
  "rate limit: requests through configured limit are allowed and N+1 is rejected",
  async () => {
    const baseMs = 1_800_000_000_000;

    const first = await consumeUidRateLimit(
      db,
      "alice",
      "ai-analysis",
      baseMs
    );

    const second = await consumeUidRateLimit(
      db,
      "alice",
      "ai-analysis",
      baseMs + 1
    );

    const third = await consumeUidRateLimit(
      db,
      "alice",
      "ai-analysis",
      baseMs + 2
    );

    const fourth = await consumeUidRateLimit(
      db,
      "alice",
      "ai-analysis",
      baseMs + 3
    );

    assert.equal(first.allowed, true);
    assert.equal(first.remaining, 2);

    assert.equal(second.allowed, true);
    assert.equal(second.remaining, 1);

    assert.equal(third.allowed, true);
    assert.equal(third.remaining, 0);

    assert.equal(fourth.allowed, false);
    assert.equal(fourth.remaining, 0);
    assert.ok(fourth.retryAfterSeconds > 0);
  }
);

test(
  "rate limit: sliding window frees capacity after the oldest event expires",
  async () => {
    const baseMs = 1_800_100_000_000;
    const windowMs = 5 * 60_000;

    await consumeUidRateLimit(
      db,
      "window-user",
      "ai-analysis",
      baseMs
    );

    await consumeUidRateLimit(
      db,
      "window-user",
      "ai-analysis",
      baseMs + 1
    );

    await consumeUidRateLimit(
      db,
      "window-user",
      "ai-analysis",
      baseMs + 2
    );

    const blocked = await consumeUidRateLimit(
      db,
      "window-user",
      "ai-analysis",
      baseMs + 3
    );

    assert.equal(blocked.allowed, false);

    const allowedAgain = await consumeUidRateLimit(
      db,
      "window-user",
      "ai-analysis",
      baseMs + windowMs
    );

    assert.equal(allowedAgain.allowed, true);
  }
);

test(
  "rate limit: different UIDs have independent buckets",
  async () => {
    const baseMs = 1_800_200_000_000;

    for (let index = 0; index < 3; index += 1) {
      const decision = await consumeUidRateLimit(
        db,
        "alice",
        "ai-analysis",
        baseMs + index
      );

      assert.equal(decision.allowed, true);
    }

    const aliceBlocked = await consumeUidRateLimit(
      db,
      "alice",
      "ai-analysis",
      baseMs + 10
    );

    const bobAllowed = await consumeUidRateLimit(
      db,
      "bob",
      "ai-analysis",
      baseMs + 10
    );

    assert.equal(aliceBlocked.allowed, false);
    assert.equal(bobAllowed.allowed, true);
  }
);

test(
  "rate limit: different policies have independent buckets",
  async () => {
    const baseMs = 1_800_300_000_000;

    for (let index = 0; index < 3; index += 1) {
      await consumeUidRateLimit(
        db,
        "policy-user",
        "ai-analysis",
        baseMs + index
      );
    }

    const analysisBlocked = await consumeUidRateLimit(
      db,
      "policy-user",
      "ai-analysis",
      baseMs + 10
    );

    const generationAllowed = await consumeUidRateLimit(
      db,
      "policy-user",
      "ai-generation",
      baseMs + 10
    );

    assert.equal(analysisBlocked.allowed, false);
    assert.equal(generationAllowed.allowed, true);
  }
);

test(
  "rate limit: concurrent transactions allow exactly the configured capacity",
  async () => {
    const baseMs = 1_800_400_000_000;

    const decisions = await Promise.all(
      Array.from(
        { length: 10 },
        (_, index) =>
          consumeUidRateLimit(
            db,
            "concurrent-user",
            "ai-analysis",
            baseMs + index
          )
      )
    );

    const allowedCount = decisions.filter(
      (decision) => decision.allowed
    ).length;

    const deniedCount = decisions.filter(
      (decision) => !decision.allowed
    ).length;

    assert.equal(allowedCount, 3);
    assert.equal(deniedCount, 7);
  }
);

test(
  "middleware: exceeded rate limit returns 429 and Retry-After",
  async () => {
    const baseMs = Date.now();

    for (let index = 0; index < 3; index += 1) {
      await consumeUidRateLimit(
        db,
        "middleware-user",
        "ai-analysis",
        baseMs + index
      );
    }

    const middleware = createUidRateLimitMiddleware(
      "ai-analysis",
      () => db
    );

    let statusCode = 200;
    let responseBody: unknown;
    let nextCalled = false;

    const headers = new Map<string, string>();

    const req = {
      auth: {
        uid: "middleware-user",
      },
    };

    const res = {
      setHeader(name: string, value: string) {
        headers.set(name.toLowerCase(), value);
        return this;
      },

      status(code: number) {
        statusCode = code;
        return this;
      },

      json(body: unknown) {
        responseBody = body;
        return this;
      },
    };

    await middleware(
      req as never,
      res as never,
      () => {
        nextCalled = true;
      }
    );

    assert.equal(statusCode, 429);
    assert.equal(nextCalled, false);
    assert.ok(headers.has("retry-after"));

    assert.deepEqual(
      responseBody,
      {
        error: "rate_limited",
        code: "RATE_LIMITED",
        retryAfterSeconds:
          (responseBody as {
            retryAfterSeconds: number;
          }).retryAfterSeconds,
      }
    );

    assert.ok(
      (
        responseBody as {
          retryAfterSeconds: number;
        }
      ).retryAfterSeconds > 0
    );
  }
);

test(
  "middleware: Firestore failure is fail-closed with HTTP 503",
  async () => {
    const middleware = createUidRateLimitMiddleware(
      "ai-analysis",
      () => {
        throw Object.assign(
          new Error("simulated Firestore failure"),
          {
            code: "UNAVAILABLE",
          }
        );
      }
    );

    let statusCode = 200;
    let responseBody: unknown;
    let nextCalled = false;

    const req = {
      auth: {
        uid: "failure-user",
      },
    };

    const res = {
      setHeader() {
        return this;
      },

      status(code: number) {
        statusCode = code;
        return this;
      },

      json(body: unknown) {
        responseBody = body;
        return this;
      },
    };

    const originalConsoleError = console.error;
    console.error = () => {};

    try {
      await middleware(
        req as never,
        res as never,
        () => {
          nextCalled = true;
        }
      );
    } finally {
      console.error = originalConsoleError;
    }

    assert.equal(statusCode, 503);
    assert.equal(nextCalled, false);

    assert.deepEqual(responseBody, {
      error: "rate_limit_service_unavailable",
    });
  }
);

test(
  "voice lease: first session acquires and second active session is denied",
  async () => {
    const baseMs = 1_800_500_000_000;

    const first = await acquireVoiceLease(
      db,
      "voice-user",
      {
        nowMs: baseMs,
        ttlMs: 180_000,
        leaseId: "lease-1",
      }
    );

    const second = await acquireVoiceLease(
      db,
      "voice-user",
      {
        nowMs: baseMs + 1,
        ttlMs: 180_000,
        leaseId: "lease-2",
      }
    );

    assert.equal(first.acquired, true);
    assert.equal(first.leaseId, "lease-1");

    assert.equal(second.acquired, false);
    assert.ok(second.retryAfterSeconds > 0);
  }
);

test(
  "voice lease: expired lease can be replaced",
  async () => {
    const baseMs = 1_800_600_000_000;

    const first = await acquireVoiceLease(
      db,
      "expired-user",
      {
        nowMs: baseMs,
        ttlMs: 1_000,
        leaseId: "old-lease",
      }
    );

    assert.equal(first.acquired, true);

    const replacement = await acquireVoiceLease(
      db,
      "expired-user",
      {
        nowMs: baseMs + 1_001,
        ttlMs: 1_000,
        leaseId: "new-lease",
      }
    );

    assert.equal(replacement.acquired, true);
    assert.equal(replacement.leaseId, "new-lease");
  }
);

test(
  "voice lease: old lease cannot release a newer lease",
  async () => {
    const baseMs = 1_800_700_000_000;

    await acquireVoiceLease(
      db,
      "replace-user",
      {
        nowMs: baseMs,
        ttlMs: 1_000,
        leaseId: "old-lease",
      }
    );

    const replacement = await acquireVoiceLease(
      db,
      "replace-user",
      {
        nowMs: baseMs + 1_001,
        ttlMs: 10_000,
        leaseId: "new-lease",
      }
    );

    assert.equal(replacement.acquired, true);

    const staleRelease = await releaseVoiceLease(
      db,
      "replace-user",
      "old-lease"
    );

    assert.equal(staleRelease, false);

    const stillBlocked = await acquireVoiceLease(
      db,
      "replace-user",
      {
        nowMs: baseMs + 1_002,
        ttlMs: 10_000,
        leaseId: "third-lease",
      }
    );

    assert.equal(stillBlocked.acquired, false);
  }
);

test(
  "voice lease: matching lease renews and keeps session active",
  async () => {
    const baseMs = 1_800_800_000_000;

    const acquired = await acquireVoiceLease(
      db,
      "renew-user",
      {
        nowMs: baseMs,
        ttlMs: 1_000,
        leaseId: "renew-lease",
      }
    );

    assert.equal(acquired.acquired, true);

    const renewed = await renewVoiceLease(
      db,
      "renew-user",
      "renew-lease",
      {
        nowMs: baseMs + 500,
        ttlMs: 2_000,
      }
    );

    assert.equal(renewed, true);

    const blockedAfterOriginalExpiry =
      await acquireVoiceLease(
        db,
        "renew-user",
        {
          nowMs: baseMs + 1_200,
          ttlMs: 1_000,
          leaseId: "competitor-lease",
        }
      );

    assert.equal(
      blockedAfterOriginalExpiry.acquired,
      false
    );

    const wrongLeaseRenewal = await renewVoiceLease(
      db,
      "renew-user",
      "wrong-lease",
      {
        nowMs: baseMs + 1_300,
        ttlMs: 2_000,
      }
    );

    assert.equal(wrongLeaseRenewal, false);
  }
);

test(
  "voice lease: matching release frees the session immediately",
  async () => {
    const baseMs = 1_800_900_000_000;

    const acquired = await acquireVoiceLease(
      db,
      "release-user",
      {
        nowMs: baseMs,
        ttlMs: 180_000,
        leaseId: "release-lease",
      }
    );

    assert.equal(acquired.acquired, true);

    const released = await releaseVoiceLease(
      db,
      "release-user",
      "release-lease"
    );

    assert.equal(released, true);

    const nextSession = await acquireVoiceLease(
      db,
      "release-user",
      {
        nowMs: baseMs + 1,
        ttlMs: 180_000,
        leaseId: "next-lease",
      }
    );

    assert.equal(nextSession.acquired, true);
    assert.equal(nextSession.leaseId, "next-lease");
  }
);
