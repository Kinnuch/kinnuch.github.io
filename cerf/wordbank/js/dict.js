/* Offline dictionary: 19,870 headwords merged from 14 exam word books
   (小学 → GMAT), each with phonetic, part-of-speech glosses and one example,
   plus 52,054 phrases with Chinese glosses.

   The phrase index is separate and matters more than its size suggests: the
   headword lists are single words almost throughout, so "give up", "in spite
   of" and "put up with" appear nowhere in them. Without it a pasted phrase
   list comes back with every gloss blank.

   The file is ~5.5 MB (2.5 MB over the wire, gzipped by the host) and is only
   fetched when the user actually needs a lookup — importing a bare word list,
   auto-filling a manual entry, or browsing a built-in book. The service worker
   keeps it cached afterwards, so it costs one download, ever. */

const URL_DICT = './data/dict.json';

let raw = null;          // { v, books:[…], entries:[[w,phon,trans,exEn,exCn]], phrases:[[text,gloss]] }
let byWord = null;       // lowercase headword -> index
let byPhrase = null;     // lowercase phrase   -> [text, gloss]
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
    // Indexed by the same normalisation queries go through, so the stored
    // "as ... as" is reachable from a query that has lost its ellipsis.
    byPhrase = new Map();
    for (const p of raw.phrases || []) {
      const k = normKey(p[0]);
      if (k && !byPhrase.has(k)) byPhrase.set(k, p);
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

/* A phrase inflects on one of its words — nearly always the verb at the front:
   "gave up", "gives up" and "giving up" all mean "give up". Try a base form for
   the first token, then the last, and try the other word separator. */
function phraseCandidates(p) {
  const out = [];
  const push = s => { if (s && s !== p && !out.includes(s)) out.push(s); };

  if (p.includes('-')) push(p.replace(/-/g, ' '));
  if (p.includes(' ')) push(p.replace(/ /g, '-'));

  const toks = p.split(' ');
  if (toks.length > 2 && (toks[0] === 'to' || toks[0] === 'be')) push(toks.slice(1).join(' '));
  if (toks.length > 1) {
    for (const i of [0, toks.length - 1]) {
      for (const base of candidates(toks[i])) {
        const copy = toks.slice();
        copy[i] = base;
        push(copy.join(' '));
      }
    }
  }
  return out;
}

/* Word-list shorthand the corpus never spells out. Stripping these turns
   "be busy with sth" into "busy with" and "help sb with sth" into "help with",
   both of which are listed. */
const PLACEHOLDER = new Set(['sth', 'sth.', 'sb', 'sb.', 'somebody', 'something', 'someone', 'oneself', "one's"]);
const LEAD = new Set(['the', 'a', 'an', 'be', 'to']);
const STOP = new Set([...PLACEHOLDER, ...LEAD, 'is', 'are', 'was', 'were', 'been', 'of', 'in', 'on',
  'at', 'by', 'for', 'with', 'from', 'into', 'and', 'or', 'nor', 'but', 'not', 'so', 'such',
  'that', 'as', 'than', 'do', 'doing', 'done', 'it', 'its', 'up', 'out', 'off', 'down']);

/* Ordered rewrites of a phrase query: drop the sth/sb placeholders, then peel
   leading articles and copulas one at a time, so "be the same as" reaches
   "the same as" and then "same as", which is the form the corpus has. */
function normVariants(q) {
  const out = [];
  const push = s => { if (s && s !== q && !out.includes(s)) out.push(s); };
  const toks = q.split(' ');
  const stripped = toks.filter(t => !PLACEHOLDER.has(t));
  const bases = [];
  if (stripped.length > 1 && stripped.length !== toks.length) bases.push(stripped);
  bases.push(toks);
  for (const b of bases) {
    let cur = b;
    push(cur.join(' '));
    while (cur.length > 2 && LEAD.has(cur[0])) { cur = cur.slice(1); push(cur.join(' ')); }
  }
  return out;
}

/* Nothing matched the phrase as a whole. Fall back to its head word — for
   "belong to" or "a little" the entry for "belong" / "little" is what a paper
   dictionary would send you to. `lemma` records it so the import preview and
   the word's note can say where the gloss came from. */
function headWord(q) {
  const toks = q.split(' ');
  if (toks.length > 4) return null;
  for (const t of toks) {
    if (STOP.has(t) || !/^[a-z']+$/.test(t)) continue;
    if (byWord.has(t)) return entry(byWord.get(t), t);
    for (const c of candidates(t)) if (byWord.has(c)) return entry(byWord.get(c), c);
  }
  return null;
}

/* Last resort: the corpus lists "be used to something" but not the bare
   "be used to". Accept a phrase that merely extends the query by one token —
   but only from three tokens up, or "in the" would happily match "in the end".
   The match is reported through `lemma` so the UI can say where it came from. */
function nearestPhrase(q) {
  const toks = q.split(' ');
  if (toks.length < 3) return null;
  let best = null;
  for (const [k, p] of byPhrase) {
    if (!k.startsWith(q + ' ')) continue;
    if (k.split(' ').length > toks.length + 1) continue;
    if (!best || k.length < best[0].length) best = p;
  }
  return best;
}

function phraseEntry(p, matched) {
  return { w: p[0], phon: '', trans: p[1], exEn: '', exCn: '', lemma: matched, phrase: true };
}

const normKey = s => String(s).toLowerCase().replace(/[^a-z' -]/g, ' ').replace(/\s+/g, ' ').trim();

/* Word lists compress alternatives with a slash: "not so/as ... as" stands for
   both "not so ... as" and "not as ... as". Expand into real candidates. */
function slashAlternatives(src) {
  if (!src.includes('/')) return [src];
  const toks = src.split(/\s+/);
  let outs = [[]];
  for (const t of toks) {
    const opts = t.includes('/') ? t.split('/').filter(Boolean) : [t];
    const next = [];
    for (const o of outs) for (const opt of opts) next.push(o.concat(opt));
    outs = next.slice(0, 6);
  }
  return outs.map(o => o.join(' '));
}

/** Look a word or phrase up, trying inflected forms. Returns null when unknown. */
export function lookup(word) {
  if (!raw) return null;
  const src = String(word).trim().toLowerCase();
  if (!src) return null;
  for (const alt of slashAlternatives(src)) {
    const hit = lookupOne(alt);
    if (hit) {
      if (!hit.lemma && alt !== src) hit.lemma = alt;
      return hit;
    }
  }
  return null;
}

function lookupOne(src) {
  const frame = /\.{3,}|…/.test(src);
  const q = normKey(src);
  if (!q) return null;

  if (q.includes(' ') || q.includes('-')) {

    for (const v of [q, ...normVariants(q)]) {
      if (byPhrase.has(v)) return phraseEntry(byPhrase.get(v), v === q ? null : v);
      // a few compounds are real headwords too ("living room", "first floor")
      if (byWord.has(v)) return entry(byWord.get(v), v === q ? null : v);
      for (const c of phraseCandidates(v)) {
        if (byPhrase.has(c)) return phraseEntry(byPhrase.get(c), c);
        if (byWord.has(c)) return entry(byWord.get(c), c);
      }
      const near = nearestPhrase(v);
      if (near) return phraseEntry(near, near[0]);
    }
    // "as ... as" must not quietly become the entry for "as"
    return frame ? null : headWord(q);
  }

  if (byWord.has(q)) return entry(byWord.get(q), null);
  for (const c of candidates(q)) if (byWord.has(c)) return entry(byWord.get(c), c);
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
