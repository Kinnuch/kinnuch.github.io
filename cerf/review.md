---
layout: page
permalink: /cerf/review/index.html
title: Vocabulary Review
description: 辛达语词汇的间隔重复复习，进度与「巴别塔」爬塔游戏共享同一份存档。
---

# Vocabulary Review | 词汇复习

按 **SM-2 间隔重复算法**安排复习，词条来自 [汉语-辛达语词典](/laim/sindarin.assets/SindarinDatabase/SindarinDictionary.html) 的 558 条真实词条。

<p class="tool-note" markdown="1">
**进度与 [Barad Bith 巴别塔](/laim/sindarin.assets/BaradBith/BaradBith.html) 共享。**
两边读写同一个 `localStorage` 键（`baradBithMastery`），用同样的 `词形|词性` 作主键。在爬塔里答对解锁的词，这里会直接算作已掌握；在这里复习过的词，回到爬塔时也已经是解锁状态。本页只往每条记录里额外写入复习排期字段（`due` / `interval` / `ease` / `reps`），不会动游戏原有的 `attempts` / `correct` / `stars`。
</p>

<div class="srs" id="srs">
  <div class="srs__stats" id="srs-stats"></div>

  <div class="srs__setup" id="srs-setup">
    <label class="forger__label">复习方向</label>
    <div class="srs__opts">
      <label><input type="radio" name="srs-dir" value="s2c" checked> 辛达语 → 汉语</label>
      <label><input type="radio" name="srs-dir" value="c2s"> 汉语 → 辛达语</label>
    </div>
    <label class="forger__label" for="srs-size">本轮题量</label>
    <select id="srs-size">
      <option value="10">10 题</option>
      <option value="20" selected>20 题</option>
      <option value="40">40 题</option>
      <option value="0">全部到期词</option>
    </select>
    <button class="srs__start" id="srs-start" type="button">开始复习</button>
  </div>

  <div class="srs__card is-hidden" id="srs-card">
    <div class="srs__progress" id="srs-progress"></div>
    <div class="srs__prompt" id="srs-prompt"></div>
    <div class="srs__answer is-hidden" id="srs-answer"></div>
    <div class="srs__actions" id="srs-actions">
      <button class="srs__show" id="srs-show" type="button">显示答案</button>
    </div>
    <div class="srs__grades is-hidden" id="srs-grades">
      <button data-q="0" class="srs__grade srs__grade--again">完全忘了</button>
      <button data-q="3" class="srs__grade srs__grade--hard">想起来了，很吃力</button>
      <button data-q="4" class="srs__grade srs__grade--good">记得</button>
      <button data-q="5" class="srs__grade srs__grade--easy">秒答</button>
    </div>
  </div>

  <div class="srs__done is-hidden" id="srs-done"></div>

  <details class="srs__manage">
    <summary>存档管理</summary>
    <p>复习进度保存在浏览器本地，不上传任何服务器。换浏览器或清缓存会丢失，建议定期导出。</p>
    <button id="srs-export" type="button">导出存档（JSON）</button>
    <button id="srs-import" type="button">导入存档</button>
    <input id="srs-import-file" type="file" accept="application/json" hidden>
    <p id="srs-manage-msg" class="srs__msg"></p>
  </details>
</div>

<script src="/assets/js/review.js"></script>

## 算法说明

用的是 **SM-2**（SuperMemo 2），Anki 早期版本用的也是它的变体：

- 每条词有一个**熟练度因子 `ease`**（初始 2.5，下限 1.3）和一个**间隔 `interval`**（天）。
- 答对时：第 1 次隔 1 天，第 2 次隔 6 天，之后 `interval = interval × ease`。
- 答错时：`interval` 归零，当天重排，`ease` 下调。
- 每次评分后 `ease += 0.1 − (5 − q) × (0.08 + (5 − q) × 0.02)`，其中 `q` 是你点的那个按钮对应的 0–5 分。

**新词优先级**：没有任何记录的词排在到期词之后，每轮最多混入 1/3，避免一次性灌太多生词。
