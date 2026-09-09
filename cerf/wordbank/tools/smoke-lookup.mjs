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
  // the near-match fallback must not fire on short function-word fragments
  ['in the', 0], ['of the', 0], ['look at the', 0],
  ['be used to', 1], ['on the other hand', 1],
];

let bad = 0;
for (const [q, want] of CASES) {
  const hit = D.lookup(q);
  const got = hit ? 1 : 0;
  const ok = got === want;
  if (!ok) bad++;
  console.log((ok ? '  PASS  ' : '  FAIL  ') + q.padEnd(15) +
    (hit ? (hit.phrase ? '[短语] ' : '[单词] ') + hit.trans.slice(0, 34) + (hit.lemma ? '   ←' + hit.lemma : '')
      : '(未收录)'));
}
console.log('\n' + (bad ? bad + ' 个不符合预期' : '全部符合预期'));
process.exit(bad ? 1 : 0);
