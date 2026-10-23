import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const script = resolve('scripts/verify-firebase-web-build.mjs');
const fixtureKey = 'ci-fixture-firebase-web-key-not-for-deployment';

function run(phase, key, bundle) {
  const root = mkdtempSync(join(tmpdir(), 'astra-firebase-check-'));
  try {
    if (bundle !== undefined) {
      mkdirSync(join(root, 'dist', 'assets'), { recursive: true });
      writeFileSync(join(root, 'dist', 'assets', 'main.js'), bundle);
    }
    const env = { ...process.env };
    delete env.VITE_FIREBASE_API_KEY;
    if (key !== undefined) env.VITE_FIREBASE_API_KEY = key;
    return spawnSync(process.execPath, [script, phase], {
      cwd: root, env, encoding: 'utf8'
    });
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

test('pre: rejects absent key', () => {
  const result = run('pre');
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /MISSING_OR_INVALID_FIREBASE_WEB_CONFIG/);
});
test('pre: rejects empty key', () => assert.notEqual(run('pre', ' ').status, 0));
test('pre: accepts nonempty fixture', () => assert.equal(run('pre', fixtureKey).status, 0));
test('post: rejects absent dist', () => assert.notEqual(run('post', fixtureKey).status, 0));
test('post: rejects missing expected value', () => assert.notEqual(run('post', fixtureKey, 'const x="other"').status, 0));
test('post: accepts value in JS bundle', () => assert.equal(run('post', fixtureKey, `const x=${JSON.stringify(fixtureKey)}`).status, 0));
test('invalid mode rejected', () => assert.notEqual(run('unexpected', fixtureKey).status, 0));
