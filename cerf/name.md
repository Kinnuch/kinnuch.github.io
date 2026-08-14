---
layout: page
permalink: /cerf/name/index.html
title: Name Forger
description: 按辛达语真实构词法与软音变规则，从词典的 558 条真实词条生成对应的辛达语名字。
---

# Name Forger | 中文名 → 辛达语名

<div class="tool-warn" markdown="1">
**先说清楚**：这个工具做的是**语素翻译（意译）**——把你名字里的字词，对应到[汉语-辛达语词典](/laim/sindarin.assets/SindarinDatabase/SindarinDictionary.html)里**真实存在的词条**，再按辛达语记录在案的复合词构词法与软音变规则拼接。

它给出的是**机器草案**，不是权威译名。词典里没有的语义、多义词的取舍、以及最终读起来好不好听，都需要人来判断。要正式使用之前，建议在[留言区](#)贴出来讨论一下。
</div>

<div class="forger" id="forger">

  <div class="forger__modes" role="tablist">
    <button class="forger__mode is-active" data-mode="sense" role="tab">意译模式</button>
    <button class="forger__mode" data-mode="sound" role="tab">音译模式</button>
  </div>

  <!-- 意译 -->
  <section class="forger__panel" data-panel="sense">
    <label class="forger__label" for="forge-input">输入你的名字，或想表达的意思</label>
    <input id="forge-input" type="text" autocomplete="off"
           placeholder="例：星辰 / 白雪 / 远行的人 / star brave">
    <p class="forger__hint">中文按字与词切分，英文按空格切分。每个语素会在词典里查 <code>definition</code>（中文释义）与 <code>english</code> 两个字段。</p>
    <div id="forge-slots" class="forger__slots"></div>
    <div id="forge-result" class="forger__result"></div>
  </section>

  <!-- 音译 -->
  <section class="forger__panel is-hidden" data-panel="sound">
    <label class="forger__label" for="forge-sound-input">输入拼音或罗马字</label>
    <input id="forge-sound-input" type="text" autocomplete="off"
           placeholder="例：li hua / zhang san">
    <p class="forger__hint">把输入按辛达语的<strong>音位库与音位配列</strong>改写：剔除辛达语没有的音（<code>zh ch sh z c j q x f v</code> 等），修正不合法的音节结构，补上辛达语允许的韵尾。这是「听起来像辛达语」，不携带任何语义。</p>
    <div id="forge-sound-result" class="forger__result"></div>
  </section>

</div>

<script src="/assets/js/name-forger.js"></script>

## 它到底做了什么

### 意译模式

1. **切分**：中文先按二字词试匹配，失败再逐字匹配；英文按空格。
2. **查典**：在 558 条词条的 `definition`（中文）和 `english`（英文）字段里找包含该语素的条目，优先完全匹配，其次前缀匹配，最后包含匹配。名词与形容词优先于虚词。
3. **拼接**：辛达语复合词的常规语序是**限定成分在前、中心成分在后**（如 *Barad-dûr* 「塔-黑暗」= 黑塔）。工具默认把第一个语素当限定成分。
4. **软音变（lenition）**：复合词的第二个成分通常发生软音变。规则表见下。
5. **收尾**：给出候选的连写、连字符写法，以及可选的人名后缀。

### 用到的软音变规则

复合词第二成分的首辅音按下表变化——这是辛达语中记录得最扎实的一组形态音位规则：

| 原形 | 软音变后 | 例 |
|---|---|---|
| p- | b- | *pân* → *-ban* |
| t- | d- | *tâl* → *-dal* |
| c- | g- | *calad* → *-galad* |
| b- | v- | *bâr* → *-var* |
| d- | dh- | *dûr* → *-dhur* |
| g- | （脱落） | *gil* → *-il* |
| m- | v- | *mellon* → *-vellon* |
| s- | h- | *sereg* → *-hereg* |
| h- | ch- | *hîr* → *-chir* |
| lh- | thl- | |
| rh- | thr- | |
| 元音开头 | 不变 | |

注意：**并非所有复合词都触发软音变**。当第一成分以辅音收尾时，接触位置常发生别的音变（同化、简化），甚至完全不变。工具会同时给出「变音」与「不变音」两种写法，由你判断。

---

- 词条来源：[汉语-辛达语词典](/laim/sindarin.assets/SindarinDatabase/SindarinDictionary.html)
- 想看名字写成腾格瓦或卢恩文：[腾格瓦 / 色斯文转写器](/cerf/tengwar/)
- 想系统学构词法：[辛达语教程](/laim/sindarin/)
