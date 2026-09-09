/* IndexedDB layer. One database, three stores: words, meta (settings), days (daily log). */

const DB_NAME = 'wordbank';
const DB_VERSION = 1;

let dbp = null;

export function open() {
  if (dbp) return dbp;
  dbp = new Promise((res, rej) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = ev => {
      const db = req.result;
      if (!db.objectStoreNames.contains('words')) {
        const s = db.createObjectStore('words', { keyPath: 'key' });
        s.createIndex('due', 'due');
        s.createIndex('state', 'state');
        s.createIndex('added', 'added');
        s.createIndex('tags', 'tags', { multiEntry: true });
        s.createIndex('starred', 'starred');
      }
      if (!db.objectStoreNames.contains('meta')) db.createObjectStore('meta', { keyPath: 'k' });
      if (!db.objectStoreNames.contains('days')) db.createObjectStore('days', { keyPath: 'date' });
      void ev;
    };
    req.onsuccess = () => res(req.result);
    req.onerror = () => rej(req.error);
  });
  return dbp;
}

function tx(store, mode) {
  return open().then(db => db.transaction(store, mode).objectStore(store));
}
function done(request) {
  return new Promise((res, rej) => {
    request.onsuccess = () => res(request.result);
    request.onerror = () => rej(request.error);
  });
}

export const get = (store, key) => tx(store, 'readonly').then(s => done(s.get(key)));
export const all = store => tx(store, 'readonly').then(s => done(s.getAll()));
export const count = store => tx(store, 'readonly').then(s => done(s.count()));
export const put = (store, val) => tx(store, 'readwrite').then(s => done(s.put(val)));
export const del = (store, key) => tx(store, 'readwrite').then(s => done(s.delete(key)));

export function clear(store) {
  return tx(store, 'readwrite').then(s => done(s.clear()));
}

/* Bulk write in a single transaction — importing 3000 words one put() at a time
   opens 3000 transactions and takes seconds on a phone. */
export function putMany(store, vals) {
  return open().then(db => new Promise((res, rej) => {
    const t = db.transaction(store, 'readwrite');
    const s = t.objectStore(store);
    for (const v of vals) s.put(v);
    t.oncomplete = () => res(vals.length);
    t.onerror = () => rej(t.error);
    t.onabort = () => rej(t.error);
  }));
}

export function delMany(store, keys) {
  return open().then(db => new Promise((res, rej) => {
    const t = db.transaction(store, 'readwrite');
    const s = t.objectStore(store);
    for (const k of keys) s.delete(k);
    t.oncomplete = () => res(keys.length);
    t.onerror = () => rej(t.error);
  }));
}

/* Walk an index with a cursor, keeping at most `limit` records. Used for the due
   queue so we never deserialise the whole library to find 20 cards. */
export function range(store, index, keyRange, limit, dir = 'next') {
  return open().then(db => new Promise((res, rej) => {
    const s = db.transaction(store, 'readonly').objectStore(store);
    const src = index ? s.index(index) : s;
    const out = [];
    const req = src.openCursor(keyRange, dir);
    req.onsuccess = () => {
      const c = req.result;
      if (!c || (limit && out.length >= limit)) return res(out);
      out.push(c.value);
      c.continue();
    };
    req.onerror = () => rej(req.error);
  }));
}

export function countRange(store, index, keyRange) {
  return open().then(db => new Promise((res, rej) => {
    const s = db.transaction(store, 'readonly').objectStore(store);
    const src = index ? s.index(index) : s;
    const req = src.count(keyRange);
    req.onsuccess = () => res(req.result);
    req.onerror = () => rej(req.error);
  }));
}

/* ---- settings ---------------------------------------------------------- */

export const DEFAULTS = {
  newPerDay: 20,
  reviewCap: 200,
  /* Relative weights, not on/off: 0 never asks, and the rest are a ratio.
     A type is still skipped when the word lacks the data it needs (no example
     sentence, no gloss), so the realised mix drifts from the nominal one. */
  types: { recall: 2, en2cn: 3, cn2en: 2, spell: 2, cloze: 2, listen: 0 },
  order: 'seq',           // 'seq' = 词库顺序, 'random' = 每轮打乱
  spotRecall: false,      // 抽查只用自评卡（不给选项）
  autoSpeak: true,
  accent: 'en-US',
  theme: 'auto',
  masterDays: 60,     // interval at which a word is considered 掌握
  relearnInSession: true,
};

let settings = null;

export async function loadSettings() {
  const row = await get('meta', 'settings');
  settings = Object.assign({}, DEFAULTS, row ? row.v : {});
  const stored = (row && row.v && row.v.types) || {};
  settings.types = Object.assign({}, DEFAULTS.types);
  for (const k in stored) {
    if (!(k in settings.types)) continue;
    const v = stored[k];
    // types used to be booleans; keep an old profile's intent when upgrading
    settings.types[k] = typeof v === 'boolean' ? (v ? 2 : 0) : Math.max(0, Math.min(5, Number(v) || 0));
  }
  return settings;
}
export function getSettings() { return settings || DEFAULTS; }
export async function saveSettings(patch) {
  settings = Object.assign({}, getSettings(), patch);
  await put('meta', { k: 'settings', v: settings });
  return settings;
}
