// 本机档案：等级、头衔、能力点、选卡规则、每局经验。
// 这里只有纯函数；存取（localStorage）由界面负责。规则数值在 rules.js 的 GROWTH。

import { GROWTH, TITLES, ABILITIES } from './rules.js';

export const MAX_EXP = (GROWTH.maxLevel - 1) * GROWTH.expPerLevel;

/**
 * 档案字段：
 *   name     名字（结算表与日后联机显示；空 = 无名氏）
 *   exp      经验
 *   games    计入成长的对局数；won / lost 胜负场
 *   stars    各难度累计的「最多星数」（指挥官、上将、皇帝三档，与原作的排行依据一致）
 *   ranked   true = 成长模式，false = 自由模式
 *   tutorial '' 还没做 · 'done' 做完 · 'skipped' 不想做
 */
export function newProfile() {
  return { v: 1, name: '', exp: 0, games: 0, won: 0, lost: 0, stars: { normal: 0, hard: 0, nightmare: 0 }, ranked: true, tutorial: '' };
}

/** 读进来的档案：补齐缺的字段、纠正坏值（可能来自旧版本或被手改过） */
export function normalizeProfile(p) {
  if (!p || typeof p !== 'object') return newProfile();
  const int = (v) => (Number.isFinite(v) && v > 0 ? Math.floor(v) : 0);
  const st = p.stars && typeof p.stars === 'object' ? p.stars : {};
  return {
    v: 1,
    name: typeof p.name === 'string' ? p.name.trim().slice(0, 16) : '',
    exp: Math.min(MAX_EXP, int(p.exp)),
    games: int(p.games), won: int(p.won), lost: int(p.lost),
    stars: { normal: int(st.normal), hard: int(st.hard), nightmare: int(st.nightmare) },
    ranked: p.ranked !== false,
    tutorial: p.tutorial === 'done' || p.tutorial === 'skipped' ? p.tutorial : '',
  };
}

/** 等级（从 1 起，满级 70） */
export const levelOf = (exp) => 1 + Math.floor(Math.min(MAX_EXP, Math.max(0, exp)) / GROWTH.expPerLevel);

/** 本级进度 0–1（满级恒为 1） */
export function levelProgress(exp) {
  const lv = levelOf(exp);
  if (lv >= GROWTH.maxLevel) return 1;
  return (Math.max(0, exp) - (lv - 1) * GROWTH.expPerLevel) / GROWTH.expPerLevel;
}

/** 头衔：每 5 级一个 */
export const titleOf = (level) => TITLES[Math.min(TITLES.length - 1, Math.max(0, Math.floor((level - 1) / 5)))];

/** 成长模式下某个等级的能力点 */
export const pointsAtLevel = (level) => Math.min(GROWTH.pointsMax, GROWTH.pointsBase + Math.floor((level - 1) / GROWTH.pointsEvery));

/** 档案此刻的能力点 */
export const abilityPoints = (p) => (p.ranked ? pointsAtLevel(levelOf(p.exp)) : GROWTH.freePoints);

/** 这张卡此刻能不能选（不看卡组里还剩几点） */
export function cardAllowed(card, p) {
  const c = ABILITIES[card] ? ABILITIES[card].cost : Infinity;
  if (!p.ranked) return c <= GROWTH.freeMaxCost;
  return c <= 2 || c < abilityPoints(p);
}

/** 成长模式下这张卡在几级解锁（能力点要比卡的点数多） */
export function unlockLevel(card) {
  const c = ABILITIES[card].cost;
  if (c <= 2) return 1;
  const lv = (c + 1 - GROWTH.pointsBase) * GROWTH.pointsEvery + 1;
  return lv <= GROWTH.maxLevel ? lv : Infinity;
}

/** 前期加成倍数：1 级 ×10，21 级起 ×1，中间按 lerp(t, t², 0.5) 过渡 */
export function xpMultiplier(level) {
  const t = Math.max(0, Math.min(1, (level - 1) / GROWTH.bonusLevels));
  const f = t + (t * t - t) * 0.5;
  return GROWTH.bonusMax + (1 - GROWTH.bonusMax) * f;
}

/** 档案的概况（界面显示用） */
export function profileSummary(p) {
  const level = levelOf(p.exp);
  return { level, title: titleOf(level), points: abilityPoints(p), progress: levelProgress(p.exp), exp: p.exp };
}

/**
 * 单人对局结束（或中途离开，按认输算）后结算档案。不改传入的档案，返回新档案与明细。
 *
 * r = { score, time, winner, finished, challenge, maxStars }
 *   winner   玩家是不是胜者（中途离开时：是不是领先者）
 *   finished 对局正常收尾（征服或时间到）
 *
 * 规则同原作：自由模式、不足 90 秒不结算；得分为正时，不是胜者记一负，是胜者且正常收尾记一胜，
 * 并把本局最多星数记到对应难度下；经验 = 得分 × 前期加成（按结算前的等级）。
 */
export function settleGame(p, r) {
  const before = profileSummary(p);
  const base = { counted: false, reason: '', xp: 0, mult: 1, won: false, lost: false, before, after: before, profile: p };
  if (!p.ranked) return { ...base, reason: 'free' };
  if (!(r.time > GROWTH.minGameSec)) return { ...base, reason: 'short' };
  const q = normalizeProfile(p);
  q.games++;
  const sc = Math.max(0, Math.round(r.score || 0));
  let won = false, lost = false;
  if (sc > 0) {
    if (!r.winner) { q.lost++; lost = true; } else if (r.finished) { q.won++; won = true; }
    if (q.stars[r.challenge] !== undefined) q.stars[r.challenge] += Math.max(0, r.maxStars | 0);
  }
  const mult = xpMultiplier(before.level);
  q.exp = Math.min(MAX_EXP, q.exp + Math.round(sc * mult));
  return { counted: true, reason: sc > 0 ? '' : 'zero', xp: q.exp - p.exp, mult, won, lost, before, after: profileSummary(q), profile: q };
}
