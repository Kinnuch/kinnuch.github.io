/* Offline dictionary: 19,870 headwords merged from 14 exam word books
   (小学 → GMAT), each with phonetic, part-of-speech glosses and one example.

   The file is ~3.3 MB (1.6 MB over the wire, gzipped by the host) and is only
   fetched when the user actually needs a lookup — importing a bare word list,
   auto-filling a manual entry, or browsing a built-in book. The service worker
   keeps it cached afterwards, so it costs one download, ever. */

const URL_DICT = './data/dict.json';

let raw = null;          // { v, books:[{key,name,words:[idx]}], entries:[[w,phon,trans,exEn,exCn]] }
let byWord = null;       // lowercase headword -> index
let loading = null;

export function isLoaded() { return !!raw; }

export function load(onProgress) {
  if (raw) return Promise.resolve(raw);
  if (loading) return loading;
  loading = (async () => {
    const res = await fetch(URL_DICT);
    if (!res.ok) throw new Error('词库加载失败 (' + res.status + ')');
    let json;
    // Stream so the import screen can show real progress on a slow phone connection.
    const total = Number(res.headers.get('content-length')) || 0;
    if (onProgress && res.body && total) {
      const reader = res.body.getReader();
      const chunks = []; let got = 0;
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value); got += value.length;
        onProgress(got / total);
      }
      json = JSON.parse(new TextDecoder().decode(concat(chunks, got)));
    } else {
      json = await res.json();
    }
    raw = json;
    byWord = new Map();
    for (let i = 0; i < raw.entries.length; i++) {
      const k = raw.entries[i][0].toLowerCase();
      if (!byWord.has(k)) byWord.set(k, i);
    }
    return raw;
  })();
  loading.catch(() => { loading = null; });
  return loading;
}

function concat(chunks, len) {
  const out = new Uint8Array(len);
  let o = 0;
  for (const c of chunks) { out.set(c, o); o += c.length; }
  return out;
}

function entry(i, matched) {
  const e = raw.entries[i];
  return { w: e[0], phon: e[1] || '', trans: e[2] || '', exEn: e[3] || '', exCn: e[4] || '', lemma: matched };
}

/* Inflection fallback: an imported article word list is full of forms the book
   never lists as headwords ("carrying", "studies", "bigger"). Try the obvious
   English suffix strips before giving up. */
/* Forms no suffix rule can reach. Kept deliberately small — these are the ones
   that actually turn up in a word list scraped out of prose. */
const IRREGULAR = {
  was: 'be', were: 'be', been: 'be', am: 'be', is: 'be', are: 'be',
  had: 'have', has: 'have', did: 'do', does: 'do', done: 'do', went: 'go', gone: 'go',
  said: 'say', made: 'make', took: 'take', taken: 'take', came: 'come', saw: 'see', seen: 'see',
  got: 'get', gotten: 'get', gave: 'give', given: 'give', found: 'find', thought: 'think',
  told: 'tell', became: 'become', left: 'leave', felt: 'feel', brought: 'bring',
  began: 'begin', begun: 'begin', kept: 'keep', held: 'hold', wrote: 'write', written: 'write',
  stood: 'stand', heard: 'hear', meant: 'mean', met: 'meet', ran: 'run', paid: 'pay', sat: 'sit',
  spoke: 'speak', spoken: 'speak', led: 'lead', grew: 'grow', grown: 'grow',
  lost: 'lose', fell: 'fall', fallen: 'fall', sent: 'send', built: 'build',
  understood: 'understand', drew: 'draw', drawn: 'draw', broke: 'break', broken: 'break',
  spent: 'spend', rose: 'rise', risen: 'rise', drove: 'drive', driven: 'drive',
  bought: 'buy', wore: 'wear', worn: 'wear', chose: 'choose', chosen: 'choose',
  ate: 'eat', eaten: 'eat', threw: 'throw', thrown: 'throw', caught: 'catch', taught: 'teach',
  sold: 'sell', flew: 'fly', flown: 'fly', knew: 'know', known: 'know', shown: 'show',
  slept: 'sleep', swam: 'swim', swum: 'swim', won: 'win', dealt: 'deal',
  bore: 'bear', borne: 'bear', bound: 'bind', bred: 'breed', dug: 'dig',
  drank: 'drink', drunk: 'drink', fed: 'feed', fought: 'fight',
  forgot: 'forget', forgotten: 'forget', froze: 'freeze', frozen: 'freeze',
  hid: 'hide', hidden: 'hide', hung: 'hang', laid: 'lay', lent: 'lend', lit: 'light',
  rode: 'ride', ridden: 'ride', rang: 'ring', rung: 'ring', sang: 'sing', sung: 'sing',
  sank: 'sink', shot: 'shoot', stole: 'steal', stolen: 'steal', struck: 'strike',
  sought: 'seek', swept: 'sweep', woke: 'wake', woken: 'wake', tore: 'tear', torn: 'tear',
  stuck: 'stick', lay: 'lie', arose: 'arise', arisen: 'arise',
  children: 'child', men: 'man', women: 'woman', teeth: 'tooth', feet: 'foot',
  geese: 'goose', mice: 'mouse', people: 'person', criteria: 'criterion',
  phenomena: 'phenomenon', data: 'datum', media: 'medium', analyses: 'analysis',
  crises: 'crisis', theses: 'thesis', bases: 'basis', indices: 'index',
  appendices: 'appendix', stimuli: 'stimulus', nuclei: 'nucleus',
  better: 'good', best: 'good', worse: 'bad', worst: 'bad',
  more: 'much', most: 'much', less: 'little', least: 'little', farther: 'far', furthest: 'far',
};

function candidates(w) {
  if (IRREGULAR[w]) return [IRREGULAR[w]];
  const out = [];
  const push = s => { if (s && s.length > 1 && !out.includes(s)) out.push(s); };
  const last = w[w.length - 1], prev = w[w.length - 2];

  if (w.endsWith('ves')) { push(w.slice(0, -3) + 'f'); push(w.slice(0, -3) + 'fe'); }
  if (w.endsWith('ies')) { push(w.slice(0, -3) + 'y'); push(w.slice(0, -2)); }
  if (w.endsWith('es')) { push(w.slice(0, -2)); push(w.slice(0, -1)); }
  if (w.endsWith('s') && !w.endsWith('ss')) push(w.slice(0, -1));
  if (w.endsWith('ied')) { push(w.slice(0, -3) + 'y'); }
  if (w.endsWith('ed')) { push(w.slice(0, -2)); push(w.slice(0, -1)); }
  if (w.endsWith('ing')) { push(w.slice(0, -3)); push(w.slice(0, -3) + 'e'); }
  if (w.endsWith('ly')) { push(w.slice(0, -2)); push(w.slice(0, -2) + 'e'); }
  if (w.endsWith('er') || w.endsWith('est')) {
    push(w.slice(0, w.endsWith('er') ? -2 : -3));
    push(w.slice(0, w.endsWith('er') ? -2 : -3) + 'e');
  }
  if (w.endsWith('iest') || w.endsWith('ier')) push(w.replace(/i(est|er)$/, 'y'));
  // doubled final consonant: stopped -> stop, running -> run
  const m = w.match(/^(.*?)([bcdfgklmnprstvz])\2(ed|ing|er|est|y)$/);
  if (m) push(m[1] + m[2]);
  return out;
}

/** Look a word up, trying inflected forms. Returns null when unknown. */
export function lookup(word) {
  if (!raw) return null;
  const w = String(word).trim().toLowerCase().replace(/[^a-z' -]/g, '');
  if (!w) return null;
  if (byWord.has(w)) return entry(byWord.get(w), null);
  for (const c of candidates(w)) {
    if (byWord.has(c)) return entry(byWord.get(c), c);
  }
  return null;
}

export function books() {
  return raw ? raw.books.map(b => ({ key: b.key, name: b.name, size: b.words.length })) : [];
}

/** Words of a built-in book, in the book's own order, as import-ready records. */
export function bookWords(key, from = 0, to = Infinity) {
  if (!raw) return [];
  const b = raw.books.find(x => x.key === key);
  if (!b) return [];
  return b.words.slice(from, to).map(i => Object.assign(entry(i, null), { tag: b.name }));
}

/** Which built-in books contain this word — shown on the word detail sheet. */
export function bookTagsFor(word) {
  if (!raw) return [];
  const i = byWord.get(String(word).toLowerCase());
  if (i === undefined) return [];
  return raw.books.filter(b => b.words.includes(i)).map(b => b.name);
}

/** N random glosses for multiple-choice distractors, excluding `exclude`. */
export function randomGlosses(n, exclude) {
  if (!raw) return [];
  const out = [], seen = new Set(exclude || []);
  let guard = 0;
  while (out.length < n && guard++ < n * 60) {
    const e = raw.entries[(Math.random() * raw.entries.length) | 0];
    if (!e[2] || seen.has(e[2])) continue;
    seen.add(e[2]);
    out.push(e[2]);
  }
  return out;
}
