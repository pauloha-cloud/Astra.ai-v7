import assert from "node:assert/strict";
import test from "node:test";
import {
  SupadataTranscriptError,
  fetchSupadataNativeTranscript,
} from "../supadataTranscript.js";

function fakeGet(response: any, inspect?: (config: any) => void): any {
  return async (_url: string, config: any) => {
    inspect?.(config);
    return response;
  };
}

test("forces native mode and returns plain transcript", async () => {
  const result = await fetchSupadataNativeTranscript({
    url: "https://www.youtube.com/watch?v=test",
    lang: "pt",
    apiKey: "test-key",
    httpGet: fakeGet(
      {
        status: 200,
        data: { content: "Uma transcrição nativa válida.", lang: "pt" },
        headers: { "x-billable-requests": "1" },
      },
      (config) => {
        assert.equal(config.params.mode, "native");
        assert.equal(config.params.text, true);
        assert.equal(config.params.lang, "pt");
        assert.equal(config.headers["x-api-key"], "test-key");
      }
    ),
  });

  assert.equal(result.text, "Uma transcrição nativa válida.");
  assert.equal(result.language, "pt");
  assert.equal(result.billableRequests, "1");
});

test("fails closed to caller when API key is missing", async () => {
  await assert.rejects(
    () => fetchSupadataNativeTranscript({ url: "https://youtu.be/test" }),
    (error: any) =>
      error instanceof SupadataTranscriptError &&
      error.code === "supadata_not_configured"
  );
});

test("classifies transcript unavailable without generated fallback", async () => {
  await assert.rejects(
    () =>
      fetchSupadataNativeTranscript({
        url: "https://youtu.be/test",
        apiKey: "test-key",
        httpGet: fakeGet({ status: 206, data: {}, headers: {} }),
      }),
    (error: any) =>
      error instanceof SupadataTranscriptError &&
      error.code === "supadata_transcript_unavailable"
  );
});

test("rejects async job responses so AI generation is never polled", async () => {
  await assert.rejects(
    () =>
      fetchSupadataNativeTranscript({
        url: "https://youtu.be/test",
        apiKey: "test-key",
        httpGet: fakeGet({ status: 202, data: { jobId: "job-1" }, headers: {} }),
      }),
    (error: any) =>
      error instanceof SupadataTranscriptError &&
      error.code === "supadata_invalid_response"
  );
});

test("classifies empty transcript", async () => {
  await assert.rejects(
    () =>
      fetchSupadataNativeTranscript({
        url: "https://youtu.be/test",
        apiKey: "test-key",
        httpGet: fakeGet({ status: 200, data: { content: "  " }, headers: {} }),
      }),
    (error: any) =>
      error instanceof SupadataTranscriptError &&
      error.code === "supadata_empty_transcript"
  );
});

test("classifies timeout", async () => {
  const timeoutGet: any = async () => {
    const error: any = new Error("timeout");
    error.code = "ECONNABORTED";
    throw error;
  };

  await assert.rejects(
    () =>
      fetchSupadataNativeTranscript({
        url: "https://youtu.be/test",
        apiKey: "test-key",
        httpGet: timeoutGet,
      }),
    (error: any) =>
      error instanceof SupadataTranscriptError &&
      error.code === "supadata_timeout"
  );
});
