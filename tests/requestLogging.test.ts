import assert from "node:assert/strict";
import http from "node:http";
import { once } from "node:events";
import { test } from "node:test";

import express from "express";

import {
  createRequestLoggingMiddleware,
  getSafeErrorCode,
  type SafeLogRecord,
} from "../requestLogging.js";

async function withServer(
  configure: (
    app: express.Express,
    records: SafeLogRecord[]
  ) => void,
  run: (
    baseUrl: string,
    records: SafeLogRecord[]
  ) => Promise<void>,
  writerOverride?: (record: SafeLogRecord) => void
): Promise<void> {
  const records: SafeLogRecord[] = [];
  const app = express();

  app.use(
    createRequestLoggingMiddleware(
      writerOverride ?? ((record) => records.push(record))
    )
  );

  app.use(express.json());

  configure(app, records);

  const server = http.createServer(app);
  server.listen(0, "127.0.0.1");

  await once(server, "listening");

  const address = server.address();

  assert.ok(address);
  assert.notEqual(typeof address, "string");

  const baseUrl = `http://127.0.0.1:${address.port}`;

  try {
    await run(baseUrl, records);

    // Let response "finish" listeners complete before assertions end.
    await new Promise<void>((resolve) => setImmediate(resolve));
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve();
      });
    });
  }
}

test("generates and returns a request ID when none is provided", async () => {
  await withServer(
    (app) => {
      app.get("/api/test", (_req, res) => {
        res.status(200).json({ ok: true });
      });
    },
    async (baseUrl, records) => {
      const response = await fetch(`${baseUrl}/api/test`);
      const requestId = response.headers.get("x-request-id");

      assert.equal(response.status, 200);
      assert.ok(requestId);
      assert.match(
        requestId,
        /^[A-Za-z0-9._:-]{1,128}$/
      );

      await new Promise<void>((resolve) => setImmediate(resolve));

      assert.equal(records.length, 1);
      assert.equal(records[0].requestId, requestId);
    }
  );
});

test("preserves a valid incoming x-request-id", async () => {
  await withServer(
    (app) => {
      app.get("/api/test", (_req, res) => {
        res.status(200).json({ ok: true });
      });
    },
    async (baseUrl, records) => {
      const response = await fetch(`${baseUrl}/api/test`, {
        headers: {
          "x-request-id": "client-request-123",
        },
      });

      assert.equal(
        response.headers.get("x-request-id"),
        "client-request-123"
      );

      await new Promise<void>((resolve) => setImmediate(resolve));

      assert.equal(records[0].requestId, "client-request-123");
    }
  );
});

test("does not reuse an invalid incoming request ID", async () => {
  const invalidRequestId = "a".repeat(129);

  await withServer(
    (app) => {
      app.get("/api/test", (_req, res) => {
        res.status(200).json({ ok: true });
      });
    },
    async (baseUrl, records) => {
      const response = await fetch(`${baseUrl}/api/test`, {
        headers: {
          "x-request-id": invalidRequestId,
        },
      });

      const returnedRequestId =
        response.headers.get("x-request-id");

      assert.ok(returnedRequestId);
      assert.notEqual(returnedRequestId, invalidRequestId);

      await new Promise<void>((resolve) => setImmediate(resolve));

      assert.equal(records[0].requestId, returnedRequestId);
    }
  );
});

test("emits the safe structured HTTP completion schema", async () => {
  await withServer(
    (app) => {
      app.post("/api/study", (_req, res) => {
        res.status(200).json({ ok: true });
      });
    },
    async (baseUrl, records) => {
      const response = await fetch(
        `${baseUrl}/api/study?email=student@example.com`,
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
            authorization: "Bearer secret-token",
          },
          body: JSON.stringify({
            transcript: "document-secret-content",
          }),
        }
      );

      assert.equal(response.status, 200);

      await new Promise<void>((resolve) => setImmediate(resolve));

      assert.equal(records.length, 1);

      const record = records[0];

      assert.equal(record.event, "http_request_completed");
      assert.equal(record.severity, "INFO");
      assert.equal(record.method, "POST");
      assert.equal(record.route, "/api/study");
      assert.equal(record.status, 200);
      assert.equal(typeof record.durationMs, "number");
      assert.ok(record.requestId);

      const serialized = JSON.stringify(record);

      assert.equal(
        serialized.includes("Bearer secret-token"),
        false
      );

      assert.equal(
        serialized.includes("student@example.com"),
        false
      );

      assert.equal(
        serialized.includes("document-secret-content"),
        false
      );

      assert.deepEqual(
        Object.keys(record).sort(),
        [
          "durationMs",
          "event",
          "method",
          "requestId",
          "route",
          "severity",
          "status",
        ].sort()
      );
    }
  );
});

test("maps 4xx responses to WARNING severity", async () => {
  await withServer(
    (app) => {
      app.get("/api/client-error", (_req, res) => {
        res.status(400).json({ error: "bad_request" });
      });
    },
    async (baseUrl, records) => {
      const response = await fetch(
        `${baseUrl}/api/client-error`
      );

      assert.equal(response.status, 400);

      await new Promise<void>((resolve) => setImmediate(resolve));

      assert.equal(records[0].severity, "WARNING");
      assert.equal(records[0].status, 400);
    }
  );
});

test("maps 5xx responses to ERROR severity", async () => {
  await withServer(
    (app) => {
      app.get("/api/server-error", (_req, res) => {
        res.status(500).json({ error: "internal_error" });
      });
    },
    async (baseUrl, records) => {
      const response = await fetch(
        `${baseUrl}/api/server-error`
      );

      assert.equal(response.status, 500);

      await new Promise<void>((resolve) => setImmediate(resolve));

      assert.equal(records[0].severity, "ERROR");
      assert.equal(records[0].status, 500);
    }
  );
});

test("/api/health does not emit a duplicate application request log", async () => {
  await withServer(
    (app) => {
      app.get("/api/health", (_req, res) => {
        res.status(200).json({
          status: "ok",
          service: "astra-api",
        });
      });
    },
    async (baseUrl, records) => {
      const response = await fetch(`${baseUrl}/api/health`);

      assert.equal(response.status, 200);

      await new Promise<void>((resolve) => setImmediate(resolve));

      assert.equal(records.length, 0);
    }
  );
});

test("logging failures never change the HTTP response", async () => {
  await withServer(
    (app) => {
      app.get("/api/test", (_req, res) => {
        res.status(200).json({ ok: true });
      });
    },
    async (baseUrl) => {
      const response = await fetch(`${baseUrl}/api/test`);

      assert.equal(response.status, 200);
      assert.deepEqual(await response.json(), { ok: true });
    },
    () => {
      throw new Error("synthetic logging failure");
    }
  );
});

test("logs an aborted request exactly once when the response closes before finish", async () => {
  await withServer(
    (app) => {
      app.get("/api/abort", (_req, res) => {
        res.destroy();
      });
    },
    async (baseUrl, records) => {
      await assert.rejects(fetch(`${baseUrl}/api/abort`));

      await new Promise<void>((resolve) => setImmediate(resolve));

      assert.equal(records.length, 1);

      const record = records[0];

      assert.equal(record.event, "http_request_aborted");
      assert.equal(record.severity, "WARNING");
      assert.equal(record.method, "GET");
      assert.equal(record.route, "/api/abort");
      assert.equal(typeof record.durationMs, "number");
      assert.ok(record.requestId);
      assert.equal(record.status, undefined);
    }
  );
});

test("getSafeErrorCode preserves a safe error code", () => {
  assert.equal(
    getSafeErrorCode({ code: "PERMISSION_DENIED" }),
    "PERMISSION_DENIED"
  );
});

test("getSafeErrorCode rejects unsafe error codes", () => {
  assert.equal(
    getSafeErrorCode({
      code: "student@example.com secret value",
    }),
    "unknown"
  );
});

test("getSafeErrorCode never exposes an error message", () => {
  const error = new Error(
    "Bearer secret-token student@example.com"
  );

  assert.equal(getSafeErrorCode(error), "Error");
  assert.equal(
    getSafeErrorCode(error).includes("secret-token"),
    false
  );
});
