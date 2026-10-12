// 生效中的能力：G.effects = [{ card, f, src, dst, until }]，每个势力每种卡最多一份（再次发动会覆盖）。
// 这里只有查询，供交战、控制度、外发、迷雾与 AI 使用。
//
// 克制：别的势力开着克制卡时，这张卡失效。
//   定向查询（effectOn / enemyEffectOn）：克制卡须作用在同一颗星上；
//   全局查询（effectAny / spiedBy）：克制卡在任何地方生效都算（暗幕与间谍网就是这样互相抵消的）。

import { ABILITIES } from './rules.js';

function counteredOn(G, e) {
  const ctr = ABILITIES[e.card].counter;
  return !!ctr && G.effects.some((x) => x.card === ctr && x.f !== e.f && x.dst === e.dst);
}

function counteredAnywhere(G, e) {
  const ctr = ABILITIES[e.card].counter;
  return !!ctr && G.effects.some((x) => x.card === ctr && x.f !== e.f);
}

/** f 自己开着的某张卡（不论是否被克制） */
export const ownEffect = (G, card, f) => G.effects.find((e) => e.card === card && e.f === f) || null;

/** f 对星 s 生效中的某张卡（未被同一颗星上的克制卡抵消） */
export function effectOn(G, card, f, s) {
  const e = G.effects.find((x) => x.card === card && x.f === f && x.dst === s);
  return e && !counteredOn(G, e) ? e : null;
}

/** 除 f 以外的势力对星 s 生效中的某张卡 */
export function enemyEffectOn(G, card, f, s) {
  for (const e of G.effects) if (e.card === card && e.f !== f && e.dst === s && !counteredOn(G, e)) return e;
  return null;
}

/** f 在任何地方生效中的某张卡（克制卡在任何地方开着都会抵消它） */
export function effectAny(G, card, f) {
  const e = G.effects.find((x) => x.card === card && x.f === f);
  return e && !counteredAnywhere(G, e) ? e : null;
}

/** f 正开着暗幕 */
export const stealthed = (G, f) => f >= 0 && !!effectAny(G, 'stealth', f);

/** 正用间谍网盯着 f 的势力（间谍网的目标星此刻归 f 所有） */
export function spiedBy(G, f) {
  const out = [];
  if (f < 0) return out;
  for (const e of G.effects) {
    if (e.card === 'spy' && e.f !== f && G.stars[e.dst].owner === f && !counteredAnywhere(G, e)) out.push(e.f);
  }
  return out;
}
