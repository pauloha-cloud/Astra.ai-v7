import assert from "node:assert/strict";
import test from "node:test";
import { resolveYouTubeTranscript } from "../youtubeTranscriptResolver.js";

test("does not call fallback when primary transcript succeeds", async () => {
  let fallbackCalls = 0;

  const result = await resolveYouTubeTranscript({
    videoId: "video-primary-success",
    primary: async () => [
      { text: "This is a valid primary transcript." },
    ],
    fallback: async () => {
      fallbackCalls += 1;
      return { text: "Fallback transcript should not be used." };
    },
  });

  assert.equal(result.mode, "transcript");
  assert.equal(result.fallbackUsed, false);
  assert.equal(result.text, "This is a valid primary transcript.");
  assert.equal(fallbackCalls, 0);
});

test("calls fallback once when primary throws", async () => {
  let fallbackCalls = 0;

  const result = await resolveYouTubeTranscript({
    videoId: "video-primary-failure",
    primary: async () => {
      throw new Error("Transcript is disabled");
    },
    fallback: async () => {
      fallbackCalls += 1;
      return { text: "Valid fallback transcript." };
    },
  });

  assert.equal(result.mode, "transcript");
  assert.equal(result.fallbackUsed, true);
  assert.equal(result.text, "Valid fallback transcript.");
  assert.equal(fallbackCalls, 1);
  assert.match(
    (result.primaryError as Error).message,
    /Transcript is disabled/
  );
});

test("calls fallback when primary transcript is too short", async () => {
  let fallbackCalls = 0;

  const result = await resolveYouTubeTranscript({
    videoId: "video-short-primary",
    primary: async () => [{ text: "short" }],
    fallback: async () => {
      fallbackCalls += 1;
      return { text: "Valid fallback transcript." };
    },
  });

  assert.equal(result.mode, "transcript");
  assert.equal(result.fallbackUsed, true);
  assert.equal(fallbackCalls, 1);
  assert.equal(
    (result.primaryError as Error).message,
    "Transcript too short or empty"
  );
});

test("uses metadata fallback when both resolvers fail", async () => {
  let fallbackCalls = 0;

  const result = await resolveYouTubeTranscript({
    videoId: "video-both-fail",
    primary: async () => {
      throw new Error("Transcript is disabled");
    },
    fallback: async () => {
      fallbackCalls += 1;
      throw new Error("Supadata unavailable");
    },
  });

  assert.equal(result.mode, "metadata_fallback");
  assert.equal(result.fallbackUsed, true);
  assert.equal(result.text, "");
  assert.equal(fallbackCalls, 1);
  assert.match(
    (result.fallbackError as Error).message,
    /Supadata unavailable/
  );
});

test("calls fallback after primary timeout", async () => {
  let fallbackCalls = 0;

  const result = await resolveYouTubeTranscript({
    videoId: "video-timeout",
    primaryTimeoutMs: 5,
    primary: async () =>
      new Promise(() => {
        // Intentionally unresolved to exercise the timeout path.
      }),
    fallback: async () => {
      fallbackCalls += 1;
      return { text: "Valid fallback transcript after timeout." };
    },
  });

  assert.equal(result.mode, "transcript");
  assert.equal(result.fallbackUsed, true);
  assert.equal(fallbackCalls, 1);
  assert.equal((result.primaryError as Error).message, "Timeout");
});

test("uses metadata fallback when fallback transcript is empty", async () => {
  const result = await resolveYouTubeTranscript({
    videoId: "video-empty-fallback",
    primary: async () => {
      throw new Error("Transcript is disabled");
    },
    fallback: async () => ({ text: " " }),
  });

  assert.equal(result.mode, "metadata_fallback");
  assert.equal(result.fallbackUsed, true);
  assert.equal(result.text, "");
  assert.equal(
    (result.fallbackError as Error).message,
    "Fallback transcript too short or empty"
  );
});

test("preserves billable request accounting from successful fallback", async () => {
  const result = await resolveYouTubeTranscript({
    videoId: "video-accounting",
    primary: async () => {
      throw new Error("Transcript is disabled");
    },
    fallback: async () => ({
      text: "Valid fallback transcript with accounting.",
      billableRequests: "1",
    }),
  });

  assert.equal(result.mode, "transcript");
  assert.equal(result.fallbackUsed, true);
  assert.equal(result.billableRequests, "1");
});

test("preserves a valid partial transcript without discarding its content", async () => {
  const partialTranscript =
    "Partial source transcript containing enough valid educational content.";

  const result = await resolveYouTubeTranscript({
    videoId: "video-partial",
    primary: async () => {
      throw new Error("Transcript is disabled");
    },
    fallback: async () => ({ text: partialTranscript }),
  });

  assert.equal(result.mode, "transcript");
  assert.equal(result.fallbackUsed, true);
  assert.equal(result.text, partialTranscript);
});

test("preserves a long transcript without resolver truncation", async () => {
  const longTranscript = Array.from(
    { length: 5000 },
    (_, index) => `segment-${index}`
  ).join(" ");

  const result = await resolveYouTubeTranscript({
    videoId: "video-long",
    primary: async () => {
      throw new Error("Transcript is disabled");
    },
    fallback: async () => ({ text: longTranscript }),
  });

  assert.equal(result.mode, "transcript");
  assert.equal(result.fallbackUsed, true);
  assert.equal(result.text, longTranscript);
  assert.equal(result.text.length, longTranscript.length);
});
