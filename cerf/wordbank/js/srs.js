/* Spaced repetition scheduler.

   SM-2 at the core, with two departures that follow how 扇贝 actually feels to use:

   1. Fixed early intervals. Raw SM-2 jumps 1 → 6 days after two correct answers,
      which is too coarse for a word you met yesterday. The first five successful
      reviews use the ladder below; only after that does the ease factor drive the
      interval. This is the 1/2/4/7/15 curve most Chinese vocabulary apps show.
   2. Three buttons, not six. Grading a word 0–5 is guesswork; 不认识 / 模糊 / 认识
      maps onto q = 0 / 3 / 5, and objective question types (spelling, multiple
      choice) grade themselves.
   3. 模糊 never lengthens an interval. It sends the word back to a 1–2 day step,
      however long the interval had grown; 不认识 resets it outright. */

export const LADDER = [1, 2, 4, 7, 15];   // days, for reps 1..5
export const DAY = 86400000;

export const STATE = { NEW: 0, LEARNING: 1, REVIEW: 2, MASTERED: 3 };

export function newCard(fields) {
  return Object.assign({
    state: STATE.NEW,
    due: 0,
    ivl: 0,
    ease: 2.5,
    reps: 0,
    lapses: 0,
    last: 0,
    seen: 0,
    starred: 0,
    hist: [],
  }, fields);
}

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

/* Interval fuzz keeps a 500-word import from all coming due on the same day.
   Deterministic per word so the same card does not drift on repeated calls. */
function fuzz(key, days) {
  if (days < 4) return days;
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) | 0;
  const spread = Math.max(1, Math.round(days * 0.12));
  return days + ((Math.abs(h) % (spread * 2 + 1)) - spread);
}

/**
 * Apply one grade to a card. Mutates and returns the card.
 * @param {object} c  word record
 * @param {number} q  0 = 不认识, 3 = 模糊, 5 = 认识
 * @param {number} now epoch ms
 * @param {number} masterDays interval past which a word counts as 掌握
 */
export function grade(c, q, now = Date.now(), masterDays = 60) {
  c.seen = (c.seen || 0) + 1;
  c.last = now;
  (c.hist = c.hist || []).push([Math.round(now / 60000), q]);
  if (c.hist.length > 40) c.hist = c.hist.slice(-40);

  if (q < 3) {
    c.lapses = (c.lapses || 0) + 1;
    c.reps = 0;
    c.ease = clamp((c.ease || 2.5) - 0.2, 1.3, 2.8);
    c.ivl = 0;
    c.state = STATE.LEARNING;
    c.due = now;                       // re-queued inside this session
    return c;
  }

  // SM-2 ease update, restricted to the grades this app can actually produce
  c.ease = clamp((c.ease || 2.5) + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)), 1.3, 2.8);

  let days;
  if (q === 3) {
    // 有印象 / 模糊: only vaguely remembered, so whatever the interval was, it was
    // too long. Drop back to the foot of the ladder instead of growing from it.
    // The old rule multiplied the interval by 1.25, which sent a word marked
    // 已认识 (60 days) out another 83 days on a hesitant answer — the opposite of
    // what hesitating means.
    c.reps = Math.min(c.reps || 0, 1) + 1;
    days = LADDER[c.reps - 1];
  } else {
    c.reps = (c.reps || 0) + 1;
    days = c.reps <= LADDER.length
      ? LADDER[c.reps - 1]
      : Math.max(1, Math.round((c.ivl || 1) * c.ease));
  }
  days = Math.max(1, fuzz(c.key || c.w || '', days));

  c.ivl = days;
  c.due = now + days * DAY;
  c.state = days >= masterDays ? STATE.MASTERED : STATE.REVIEW;
  return c;
}

/* What the buttons would do, for the hints under them. */
export function preview(c, masterDays = 60) {
  const snap = q => {
    const copy = JSON.parse(JSON.stringify(c));
    grade(copy, q, Date.now(), masterDays);
    return copy.ivl;
  };
  return { 0: 0, 3: snap(3), 5: snap(5) };
}

export function ivlLabel(days) {
  if (!days) return '稍后重来';
  if (days < 30) return days + ' 天';
  if (days < 365) return (days / 30).toFixed(days < 60 ? 1 : 0).replace('.0', '') + ' 个月';
  return (days / 365).toFixed(1).replace('.0', '') + ' 年';
}

/* ---- day helpers ------------------------------------------------------- */

export function dayKey(ts = Date.now()) {
  const d = new Date(ts);
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}
export function endOfDay(ts = Date.now()) {
  const d = new Date(ts);
  d.setHours(23, 59, 59, 999);
  return d.getTime();
}
