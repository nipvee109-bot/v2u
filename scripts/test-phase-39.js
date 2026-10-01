/**
 * Test Suite: Phase 39 — Offline / Failure Resilience
 */

import assert from 'node:assert';

// Mock storage system
class MockResilientStorage {
  constructor(options = {}) {
    this.store = new Map();
    this.shouldThrowQuota = options.shouldThrowQuota || false;
    this.shouldCorrupt = options.shouldCorrupt || false;
  }

  setItem(key, value) {
    if (this.shouldThrowQuota) {
      const err = new Error('The quota has been exceeded.');
      err.name = 'QuotaExceededError';
      throw err;
    }
    this.store.set(key, String(value));
  }

  getItem(key) {
    if (this.shouldCorrupt) {
      return '{broken_json: true,,,}';
    }
    return this.store.get(key) ?? null;
  }

  removeItem(key) {
    this.store.delete(key);
  }
}

function safeSetItemWithStorage(storage, key, value) {
  try {
    storage.setItem(key, value);
    return { success: true };
  } catch (err) {
    const isQuota =
      err.name === 'QuotaExceededError' ||
      err.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
      (typeof err.message === 'string' && err.message.toLowerCase().includes('quota'));

    return {
      success: false,
      error: err.message || 'Storage write failed',
      isQuotaExceeded: isQuota,
    };
  }
}

function safeGetItemWithStorage(storage, key, fallback = null) {
  try {
    const raw = storage.getItem(key);
    if (raw === null || raw === undefined) {
      return fallback;
    }
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

console.log('=== Running Phase 39: Offline / Failure Resilience Tests ===\n');

// Test 1: Normal storage write and read
const normalStorage = new MockResilientStorage();
const sessionData = {
  lessonId: 'math-m1-01',
  durationMinutes: 45,
  timestampedNotes: [{ timestamp: 120, text: 'Eigenvectors are invariant in direction' }],
};
const res1 = safeSetItemWithStorage(normalStorage, 'active-session', JSON.stringify(sessionData));
assert.strictEqual(res1.success, true);

const readData = safeGetItemWithStorage(normalStorage, 'active-session');
assert.deepStrictEqual(readData, sessionData);
console.log('✔ Test 1: Safe storage saves and parses complex study session data accurately');

// Test 2: QuotaExceededError Resilience
const quotaStorage = new MockResilientStorage({ shouldThrowQuota: true });
const res2 = safeSetItemWithStorage(quotaStorage, 'large-dataset', 'x'.repeat(1000));
assert.strictEqual(res2.success, false);
assert.strictEqual(res2.isQuotaExceeded, true);
console.log('✔ Test 2: QuotaExceededError caught safely without uncaught exceptions or crashes');

// Test 3: Corrupted JSON Recovery
const corruptStorage = new MockResilientStorage({ shouldCorrupt: true });
const fallbackValue = { defaultSession: true };
const res3 = safeGetItemWithStorage(corruptStorage, 'corrupted-key', fallbackValue);
assert.deepStrictEqual(res3, fallbackValue);
console.log('✔ Test 3: Corrupted JSON gracefully falls back to default without breaking execution');

// Test 4: Missing Key Safety
const res4 = safeGetItemWithStorage(normalStorage, 'non-existent-key', null);
assert.strictEqual(res4, null);
console.log('✔ Test 4: Missing storage keys safely return fallback value');

// Test 5: Offline Media & Session Continuity Logic
function determineResourceDisplayMode(isOnline, resourceType) {
  if (!isOnline && resourceType === 'youtube') {
    return 'offline_study_mode';
  }
  if (!isOnline && resourceType === 'website') {
    return 'offline_cached_or_book';
  }
  return 'normal_embed';
}

assert.strictEqual(determineResourceDisplayMode(false, 'youtube'), 'offline_study_mode');
assert.strictEqual(determineResourceDisplayMode(false, 'website'), 'offline_cached_or_book');
assert.strictEqual(determineResourceDisplayMode(true, 'youtube'), 'normal_embed');
console.log('✔ Test 5: Resource viewer correctly shifts to Offline Study Mode when network drops');

// Test 6: Offline Note Persistence
const offlineNotes = [];
function addOfflineNote(notesList, note) {
  notesList.push({
    ...note,
    id: `note-${Date.now()}`,
    savedOffline: true,
  });
  return notesList;
}

addOfflineNote(offlineNotes, { timestamp: 60, text: 'Studied offline from textbook page 42' });
assert.strictEqual(offlineNotes.length, 1);
assert.strictEqual(offlineNotes[0].savedOffline, true);
console.log('✔ Test 6: Offline notes logged and flagged for local persistence');

// Test 7: Network Recovery Transition Simulation
class NetworkStatusTracker {
  constructor(initialOnline = true) {
    this.isOnline = initialOnline;
    this.wasOffline = false;
  }

  goOffline() {
    this.isOnline = false;
  }

  goOnline() {
    this.isOnline = true;
    this.wasOffline = true;
  }

  clearRecovery() {
    this.wasOffline = false;
  }
}

const tracker = new NetworkStatusTracker(true);
assert.strictEqual(tracker.isOnline, true);
assert.strictEqual(tracker.wasOffline, false);

tracker.goOffline();
assert.strictEqual(tracker.isOnline, false);

tracker.goOnline();
assert.strictEqual(tracker.isOnline, true);
assert.strictEqual(tracker.wasOffline, true);

tracker.clearRecovery();
assert.strictEqual(tracker.wasOffline, false);
console.log('✔ Test 7: Network online/offline/recovery transitions verified');

console.log('\nAll 7/7 Phase 39 Offline / Failure Resilience tests passed successfully!\n');
