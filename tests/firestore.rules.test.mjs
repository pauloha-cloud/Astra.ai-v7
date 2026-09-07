import fs from 'node:fs';
import { after, before, beforeEach, test } from 'node:test';

import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from '@firebase/rules-unit-testing';

import {
  Timestamp,
  doc,
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
  ['subscriptionStatus', { subscriptionStatus: 'canceled' }],
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
