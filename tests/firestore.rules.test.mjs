import fs from 'node:fs';
import { after, before, beforeEach, test } from 'node:test';

import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from '@firebase/rules-unit-testing';

import {
  Timestamp,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';

const PROJECT_ID = 'demo-astra-rules';

let testEnv;

function authenticatedDb(uid) {
  return testEnv
    .authenticatedContext(uid, {
      email: `${uid}@example.com`,
      email_verified: true,
    })
    .firestore();
}

function validCreatePayload(uid, extra = {}) {
  return {
    uid,
    email: `${uid}@example.com`,
    displayName: `User ${uid}`,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    plan: 'free',
    ...extra,
  };
}

async function seedUser(uid) {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();

    await setDoc(doc(db, 'users', uid), {
      uid,
      email: `${uid}@example.com`,
      displayName: `User ${uid}`,
      createdAt: Timestamp.fromMillis(1700000000000),
      updatedAt: Timestamp.fromMillis(1700000000000),
      plan: 'free',
      subscriptionStatus: 'active',
      stripeCustomerId: `cus_${uid}`,
      stripeSubscriptionId: `sub_${uid}`,
      stripePriceId: `price_${uid}`,
    });
  });
}

function validPreferencePayload(extra = {}) {
  return {
    defaultStudyFormat: 'summary',
    explanationLevel: 'intermediate',
    defaultQuizQuestionCount: 10,
    updatedAt: serverTimestamp(),
    ...extra,
  };
}

function validAnalysisPayload(uid, extra = {}) {
  return {
    userId: uid,
    video: {
      videoId: 'dQw4w9WgXcQ',
      url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      title: 'Test video',
      channel: 'Test channel',
      thumbnail: '',
    },
    mode: 'transcript',
    summary: 'Test summary',
    key_points: [],
    quiz: [],
    mind_map: null,
    flashcards: [],
    tutor_questions: [],
    limitations: [],
    transcript: 'Test transcript',
    createdAt: serverTimestamp(),
    lastAnalyzedAt: serverTimestamp(),
    ...extra,
  };
}

function validDocumentAnalysisPayload(uid, extra = {}) {
  return validAnalysisPayload(uid, {
    video: {
      videoId: 'doc-test-001',
      url: 'document://study-notes.pdf',
      title: 'study-notes.pdf',
      channel: 'Local Document',
      thumbnail: '',
    },
    tutorContext: 'Document context',
    generatedLanguage: 'pt',
    sourceMetadata: null,
    sourceType: 'document',
    documentType: 'pdf',
    fileName: 'study-notes.pdf',
    fileSize: 1024,
    ...extra,
  });
}

async function seedBilling(uid, billingId = 'current') {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();

    await setDoc(doc(db, 'users', uid, 'billing', billingId), {
      plan: 'free',
      status: 'active',
      updatedAt: Timestamp.fromMillis(1700000000000),
    });
  });
}

async function seedAnalysis(uid, analysisId = 'analysis-1') {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();

    await setDoc(doc(db, 'users', uid, 'analyses', analysisId), {
      userId: uid,
      video: {
        videoId: 'dQw4w9WgXcQ',
        url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        title: 'Seed video',
        channel: 'Seed channel',
        thumbnail: '',
      },
      mode: 'transcript',
      summary: 'Seed summary',
      key_points: [],
      quiz: [],
      mind_map: null,
      flashcards: [],
      tutor_questions: [],
      limitations: [],
      transcript: 'Seed transcript',
      createdAt: Timestamp.fromMillis(1700000000000),
      lastAnalyzedAt: Timestamp.fromMillis(1700000000000),
    });
  });
}

before(async () => {
  const rules = fs.readFileSync(
    new URL('../firestore.rules', import.meta.url),
    'utf8',
  );

  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      host: '127.0.0.1',
      port: 8080,
      rules,
    },
  });
});

beforeEach(async () => {
  await testEnv.clearFirestore();
});

after(async () => {
  if (testEnv) {
    await testEnv.cleanup();
  }
});

test('CREATE: owner can create a valid free profile', async () => {
  const db = authenticatedDb('alice');

  await assertSucceeds(
    setDoc(
      doc(db, 'users', 'alice'),
      validCreatePayload('alice'),
    ),
  );
});

test('CREATE: AuthContext profile payload is allowed', async () => {
  const db = authenticatedDb('alice');

  await assertSucceeds(
    setDoc(doc(db, 'users', 'alice'), {
      uid: 'alice',
      email: 'alice@example.com',
      displayName: 'Alice',
      photoURL: 'https://example.com/alice.png',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      plan: 'free',
    }),
  );
});

test('CREATE: authenticated user cannot create another user profile', async () => {
  const db = authenticatedDb('alice');

  await assertFails(
    setDoc(
      doc(db, 'users', 'bob'),
      validCreatePayload('bob'),
    ),
  );
});

const forbiddenCreateFields = [
  ['stripeCustomerId', { stripeCustomerId: 'cus_attacker' }],
  ['stripeSubscriptionId', { stripeSubscriptionId: 'sub_attacker' }],
  ['role', { role: 'admin' }],
  ['admin', { admin: true }],
  ['arbitrary field', { unexpectedField: 'unexpected' }],
];

for (const [label, extra] of forbiddenCreateFields) {
  test(`CREATE: rejects ${label}`, async () => {
    const db = authenticatedDb('alice');

    await assertFails(
      setDoc(
        doc(db, 'users', 'alice'),
        validCreatePayload('alice', extra),
      ),
    );
  });
}

test('UPDATE: AuthContext profile sync payload is allowed', async () => {
  await seedUser('alice');

  const db = authenticatedDb('alice');

  await assertSucceeds(
    updateDoc(doc(db, 'users', 'alice'), {
      uid: 'alice',
      email: 'alice.updated@example.com',
      displayName: 'Alice Updated',
      photoURL: 'https://example.com/alice-updated.png',
      updatedAt: serverTimestamp(),
    }),
  );
});

test('UPDATE: owner can update displayName', async () => {
  await seedUser('alice');

  const db = authenticatedDb('alice');

  await assertSucceeds(
    updateDoc(doc(db, 'users', 'alice'), {
      displayName: 'Alice Updated',
      updatedAt: serverTimestamp(),
    }),
  );
});

test('UPDATE: owner can update language and lang with updatedAt', async () => {
  await seedUser('alice');

  const db = authenticatedDb('alice');

  await assertSucceeds(
    updateDoc(doc(db, 'users', 'alice'), {
      language: 'pt',
      lang: 'pt',
      updatedAt: serverTimestamp(),
    }),
  );
});

const forbiddenUpdates = [
  ['plan', { plan: 'premium' }],
  ['planStatus', { planStatus: 'active' }],
  ['subscriptionStatus', { subscriptionStatus: 'canceled' }],
  [
    'limits',
    {
      limits: {
        monthlyVoiceTutorMinutes: 999999,
        monthlyAnalyses: 999999,
        maxVideoDurationMinutes: 999999,
      },
    },
  ],
  ['billingInterval', { billingInterval: 'year' }],
  [
    'currentPeriodEnd',
    {
      currentPeriodEnd: Timestamp.fromMillis(1900000000000),
    },
  ],
  ['cancelAtPeriodEnd', { cancelAtPeriodEnd: true }],
  ['stripeCustomerId', { stripeCustomerId: 'cus_attacker' }],
  ['stripeSubscriptionId', { stripeSubscriptionId: 'sub_attacker' }],
  ['stripePriceId', { stripePriceId: 'price_attacker' }],
  [
    'createdAt',
    { createdAt: Timestamp.fromMillis(1800000000000) },
  ],
  ['arbitrary field', { unexpectedField: 'unexpected' }],
];

for (const [label, changes] of forbiddenUpdates) {
  test(`UPDATE: rejects change to ${label}`, async () => {
    await seedUser('alice');

    const db = authenticatedDb('alice');

    await assertFails(
      updateDoc(doc(db, 'users', 'alice'), {
        ...changes,
        updatedAt: serverTimestamp(),
      }),
    );
  });
}

test('ISOLATION: user A cannot update user B', async () => {
  await seedUser('bob');

  const db = authenticatedDb('alice');

  await assertFails(
    updateDoc(doc(db, 'users', 'bob'), {
      displayName: 'Changed by Alice',
      updatedAt: serverTimestamp(),
    }),
  );
});

test('ISOLATION: unauthenticated client cannot update user', async () => {
  await seedUser('alice');

  const db = testEnv.unauthenticatedContext().firestore();

  await assertFails(
    updateDoc(doc(db, 'users', 'alice'), {
      displayName: 'Anonymous change',
      updatedAt: serverTimestamp(),
    }),
  );
});
// -----------------------------------------------------------------------------
// Connectivity
// -----------------------------------------------------------------------------

test('CONNECTIVITY: unauthenticated client cannot read /test/connection', async () => {
  const db = testEnv.unauthenticatedContext().firestore();

  await assertFails(
    getDoc(doc(db, 'test', 'connection')),
  );
});

test('CONNECTIVITY: authenticated client cannot read /test/connection', async () => {
  const db = authenticatedDb('alice');

  await assertFails(
    getDoc(doc(db, 'test', 'connection')),
  );
});

// -----------------------------------------------------------------------------
// Billing
// -----------------------------------------------------------------------------

test('BILLING: owner can read billing/current', async () => {
  await seedUser('alice');
  await seedBilling('alice');

  const db = authenticatedDb('alice');

  await assertSucceeds(
    getDoc(doc(db, 'users', 'alice', 'billing', 'current')),
  );
});

test('BILLING: owner cannot read another billing document', async () => {
  await seedUser('alice');
  await seedBilling('alice', 'history');

  const db = authenticatedDb('alice');

  await assertFails(
    getDoc(doc(db, 'users', 'alice', 'billing', 'history')),
  );
});

test('BILLING: owner cannot list billing collection', async () => {
  await seedUser('alice');
  await seedBilling('alice');

  const db = authenticatedDb('alice');

  await assertFails(
    getDocs(collection(db, 'users', 'alice', 'billing')),
  );
});

test('BILLING: frontend owner cannot write billing/current', async () => {
  await seedUser('alice');
  await seedBilling('alice');

  const db = authenticatedDb('alice');

  await assertFails(
    updateDoc(doc(db, 'users', 'alice', 'billing', 'current'), {
      plan: 'premium',
      updatedAt: serverTimestamp(),
    }),
  );
});

test('BILLING: user A cannot read user B billing/current', async () => {
  await seedUser('bob');
  await seedBilling('bob');

  const db = authenticatedDb('alice');

  await assertFails(
    getDoc(doc(db, 'users', 'bob', 'billing', 'current')),
  );
});

// -----------------------------------------------------------------------------
// Preferences
// -----------------------------------------------------------------------------

test('PREFERENCES: owner can create and read preferences/app', async () => {
  await seedUser('alice');

  const db = authenticatedDb('alice');
  const preferenceRef = doc(
    db,
    'users',
    'alice',
    'preferences',
    'app',
  );

  await assertSucceeds(
    setDoc(
      preferenceRef,
      validPreferencePayload(),
    ),
  );

  await assertSucceeds(
    getDoc(preferenceRef),
  );
});

test('PREFERENCES: owner can update preferences/app', async () => {
  await seedUser('alice');

  const db = authenticatedDb('alice');
  const preferenceRef = doc(
    db,
    'users',
    'alice',
    'preferences',
    'app',
  );

  await assertSucceeds(
    setDoc(
      preferenceRef,
      validPreferencePayload(),
    ),
  );

  await assertSucceeds(
    updateDoc(preferenceRef, {
      explanationLevel: 'advanced',
      updatedAt: serverTimestamp(),
    }),
  );
});

test('PREFERENCES: owner cannot create another preference document ID', async () => {
  await seedUser('alice');

  const db = authenticatedDb('alice');

  await assertFails(
    setDoc(
      doc(db, 'users', 'alice', 'preferences', 'other'),
      validPreferencePayload(),
    ),
  );
});

test('PREFERENCES: create rejects shadow field', async () => {
  await seedUser('alice');

  const db = authenticatedDb('alice');

  await assertFails(
    setDoc(
      doc(db, 'users', 'alice', 'preferences', 'app'),
      validPreferencePayload({
        unexpectedField: 'unexpected',
      }),
    ),
  );
});

test('PREFERENCES: owner cannot list preferences collection', async () => {
  await seedUser('alice');

  const db = authenticatedDb('alice');

  await assertSucceeds(
    setDoc(
      doc(db, 'users', 'alice', 'preferences', 'app'),
      validPreferencePayload(),
    ),
  );

  await assertFails(
    getDocs(collection(db, 'users', 'alice', 'preferences')),
  );
});

test('PREFERENCES: user A cannot read user B preferences/app', async () => {
  await seedUser('bob');

  const bobDb = authenticatedDb('bob');

  await assertSucceeds(
    setDoc(
      doc(bobDb, 'users', 'bob', 'preferences', 'app'),
      validPreferencePayload(),
    ),
  );

  const aliceDb = authenticatedDb('alice');

  await assertFails(
    getDoc(
      doc(aliceDb, 'users', 'bob', 'preferences', 'app'),
    ),
  );
});

// -----------------------------------------------------------------------------
// Analyses
// -----------------------------------------------------------------------------

test('ANALYSES: owner can create valid YouTube analysis', async () => {
  await seedUser('alice');

  const db = authenticatedDb('alice');

  await assertSucceeds(
    setDoc(
      doc(db, 'users', 'alice', 'analyses', 'youtube-analysis'),
      validAnalysisPayload('alice'),
    ),
  );
});

test('ANALYSES: owner can create valid document analysis', async () => {
  await seedUser('alice');

  const db = authenticatedDb('alice');

  await assertSucceeds(
    setDoc(
      doc(db, 'users', 'alice', 'analyses', 'doc-test-001'),
      validDocumentAnalysisPayload('alice'),
    ),
  );
});

test('ANALYSES: fallback analysis with null videoId is allowed', async () => {
  await seedUser('alice');

  const db = authenticatedDb('alice');

  await assertSucceeds(
    setDoc(
      doc(db, 'users', 'alice', 'analyses', 'fallback-analysis'),
      validAnalysisPayload('alice', {
        video: {
          videoId: null,
          url: 'https://www.youtube.com/watch?v=unknown',
          title: 'Fallback analysis',
          channel: '',
          thumbnail: '',
        },
      }),
    ),
  );
});

test('ANALYSES: create rejects non-server createdAt', async () => {
  await seedUser('alice');

  const db = authenticatedDb('alice');

  await assertFails(
    setDoc(
      doc(db, 'users', 'alice', 'analyses', 'invalid-created-at'),
      validAnalysisPayload('alice', {
        createdAt: Timestamp.fromMillis(1700000000000),
      }),
    ),
  );
});

test('ANALYSES: owner can get own analysis', async () => {
  await seedUser('alice');
  await seedAnalysis('alice');

  const db = authenticatedDb('alice');

  await assertSucceeds(
    getDoc(
      doc(db, 'users', 'alice', 'analyses', 'analysis-1'),
    ),
  );
});

test('ANALYSES: owner can list own analyses', async () => {
  await seedUser('alice');
  await seedAnalysis('alice');

  const db = authenticatedDb('alice');

  await assertSucceeds(
    getDocs(
      collection(db, 'users', 'alice', 'analyses'),
    ),
  );
});

test('ANALYSES: owner can delete own analysis', async () => {
  await seedUser('alice');
  await seedAnalysis('alice');

  const db = authenticatedDb('alice');

  await assertSucceeds(
    deleteDoc(
      doc(db, 'users', 'alice', 'analyses', 'analysis-1'),
    ),
  );
});

test('ANALYSES: reanalysis can update content while preserving createdAt', async () => {
  await seedUser('alice');
  await seedAnalysis('alice');

  const db = authenticatedDb('alice');

  await assertSucceeds(
    updateDoc(
      doc(db, 'users', 'alice', 'analyses', 'analysis-1'),
      {
        summary: 'Updated summary',
        lastAnalyzedAt: serverTimestamp(),
      },
    ),
  );
});

test('ANALYSES: update cannot change createdAt', async () => {
  await seedUser('alice');
  await seedAnalysis('alice');

  const db = authenticatedDb('alice');

  await assertFails(
    updateDoc(
      doc(db, 'users', 'alice', 'analyses', 'analysis-1'),
      {
        createdAt: Timestamp.fromMillis(1800000000000),
        lastAnalyzedAt: serverTimestamp(),
      },
    ),
  );
});

test('ANALYSES: update cannot change userId', async () => {
  await seedUser('alice');
  await seedAnalysis('alice');

  const db = authenticatedDb('alice');

  await assertFails(
    updateDoc(
      doc(db, 'users', 'alice', 'analyses', 'analysis-1'),
      {
        userId: 'bob',
        lastAnalyzedAt: serverTimestamp(),
      },
    ),
  );
});

test('ANALYSES: update rejects root shadow field', async () => {
  await seedUser('alice');
  await seedAnalysis('alice');

  const db = authenticatedDb('alice');

  await assertFails(
    updateDoc(
      doc(db, 'users', 'alice', 'analyses', 'analysis-1'),
      {
        unexpectedField: 'unexpected',
        lastAnalyzedAt: serverTimestamp(),
      },
    ),
  );
});

test('ANALYSES: create rejects nested video shadow field', async () => {
  await seedUser('alice');

  const db = authenticatedDb('alice');

  await assertFails(
    setDoc(
      doc(db, 'users', 'alice', 'analyses', 'invalid-video-schema'),
      validAnalysisPayload('alice', {
        video: {
          videoId: 'dQw4w9WgXcQ',
          url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
          title: 'Test video',
          channel: 'Test channel',
          thumbnail: '',
          unexpectedVideoField: true,
        },
      }),
    ),
  );
});

test('ANALYSES: user A cannot read user B analysis', async () => {
  await seedUser('bob');
  await seedAnalysis('bob');

  const db = authenticatedDb('alice');

  await assertFails(
    getDoc(
      doc(db, 'users', 'bob', 'analyses', 'analysis-1'),
    ),
  );
});

test('ANALYSES: user A cannot update or delete user B analysis', async () => {
  await seedUser('bob');
  await seedAnalysis('bob');

  const db = authenticatedDb('alice');
  const analysisRef = doc(
    db,
    'users',
    'bob',
    'analyses',
    'analysis-1',
  );

  await assertFails(
    updateDoc(analysisRef, {
      summary: 'Changed by Alice',
      lastAnalyzedAt: serverTimestamp(),
    }),
  );

  await assertFails(
    deleteDoc(analysisRef),
  );
});
