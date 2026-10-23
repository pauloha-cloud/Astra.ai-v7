import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const phase = process.argv[2];
const firebaseKey = process.env.VITE_FIREBASE_API_KEY?.trim();

function fail(code) {
  console.error(`FIREBASE_BUILD_CHECK: ${code}`);
  process.exitCode = 1;
}

function* javascriptFiles(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const filename = join(directory, entry.name);
    if (entry.isDirectory()) {
      yield* javascriptFiles(filename);
    } else if (entry.isFile() && entry.name.endsWith('.js')) {
      yield filename;
    }
  }
}

if (phase !== 'pre' && phase !== 'post') {
  fail('INVALID_PHASE');
} else if (!firebaseKey || /[\r\n\0]/.test(firebaseKey)) {
  fail('MISSING_OR_INVALID_FIREBASE_WEB_CONFIG');
} else if (phase === 'pre') {
  console.log('FIREBASE_BUILD_CHECK: PRE_PASS');
} else {
  try {
    const files = [...javascriptFiles('dist')];
    if (!files.length || !files.some(file => readFileSync(file, 'utf8').includes(firebaseKey))) {
      fail('FIREBASE_KEY_NOT_IN_BUNDLE');
    } else {
      console.log('FIREBASE_BUILD_CHECK: POST_PASS');
    }
  } catch {
    fail('BUNDLE_UNAVAILABLE');
  }
}
