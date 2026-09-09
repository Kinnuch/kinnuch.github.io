import fs from 'fs'; import os from 'os'; import path from 'path'; import { pathToFileURL } from 'url';

const APP = path.resolve(path.dirname(new URL(import.meta.url).pathname.slice(1)), '..');
const t = fs.mkdtempSync(path.join(os.tmpdir(), 'wb-'));
// dict.js fetches its data; stub fetch to read the local file instead
const src = fs.readFileSync(APP + '/js/dict.js', 'utf8');
fs.writeFileSync(path.join(t, 'dict.mjs'), src);
globalThis.fetch = async () => ({
  ok: true, headers: { get: () => null },
  json: async () => JSON.parse(fs.readFileSync(APP + '/data/dict.json', 'utf8')),
});
const D = await import(pathToFileURL(path.join(t, 'dict.mjs')).href);
await D.load();

const CASES = [
  ['give up', 1], ['in spite of', 1], ['look after', 1], ['as well as', 1],
  ['take care of', 1], ['put up with', 1], ['by accident', 1], ['in charge of', 1],
  ['carry out', 1], ['a lot of', 1], ['make up for', 1], ['be used to', 1],
  ['gave up', 1], ['giving up', 1], ['looked after', 1], ['takes care of', 1],
  ['to give up', 1], ['well-known', 1], ['living room', 1],
  ['abandon', 1], ['carrying', 1], ['wolves', 1],
  ['zzq wibble', 0], ['flurgle', 0],
  // a phrase made only of function words has no head to fall back to
  ['in the', 0], ['of the', 0],
  // a verb phrase plus trailing junk resolves to the verb phrase, labelled
  ['look at the', 1, 'look at'], ['look up new words', 1, 'look up'],
  // these resolve through the head-word fallback, and must be labelled as such
  ['adopt one\'s', 1, 'adopt'], ['belong to', 1], ['a little', 1],
  ['be used to', 1], ['on the other hand', 1],
  // grammar frames come from the hand-checked supplement, never from a stray word
  ['as ... as', 1], ['neither ... nor', 1], ['so/such ... that', 1],
  // the slash notation stands for two patterns
  ['not so/as ... as', 1],
  // used to be wrong: "due" means 到期的, "due to" means 由于
  ['due to', 1], ['according to', 1], ['the provincial capital', 1],
];

let bad = 0;
for (const [q, want, lemma] of CASES) {
  const hit = D.lookup(q);
  const got = hit ? 1 : 0;
  // a gloss borrowed from another form must say so, or the user memorises it as exact
  const ok = got === want && (!lemma || (hit && hit.lemma === lemma));
  if (!ok) bad++;
  console.log((ok ? '  PASS  ' : '  FAIL  ') + q.padEnd(15) +
    (hit ? (hit.phrase ? '[短语] ' : '[单词] ') + hit.trans.slice(0, 34) + (hit.lemma ? '   ←' + hit.lemma : '')
      : '(未收录)'));
}
console.log('\n' + (bad ? bad + ' 个不符合预期' : '全部符合预期'));
process.exit(bad ? 1 : 0);
