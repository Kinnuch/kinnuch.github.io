---
layout: page
permalink: /cerf/tengwar/index.html
title: Tengwar & Angerthas
description: 辛达语拉丁转写的音位切分与腾格瓦 / 色斯文转写器。
---

# Tengwar & Angerthas | 腾格瓦 / 色斯文转写器

<div class="tool-warn" markdown="1">
**当前状态：切分引擎已完成，字形表待补。**

本站的[辛达语教程第零课](/laim/sindarin/)里，Runic 与 Tengwar 只有**图片样例**（`RunicEg.png` / `TengwarEg.png`），没有可供程序读取的字母对应表。我不会去猜字形——把错的腾格瓦印在这个站上，比暂时没有它更糟。

所以这个页面现在做的是**可验证的那一半**：把拉丁转写正确切分成音位（二合字母、双元音、长音一个都不能错），然后按 [`_data/tengwar.yml`](https://github.com/{{ site.owner.github }}/kinnuch.github.io/blob/main/_data/tengwar.yml) 里的表输出字形。那张表的音位库已经按第零课填好了，**字形列是空的，等你填**。填一格就多渲染一格，下面有实时的覆盖率。
</div>

<div class="tengwar-tool" id="tengwar-tool">

  <label class="forger__label" for="tw-input">输入辛达语（拉丁转写）</label>
  <input id="tw-input" type="text" autocomplete="off"
         value="Mae govannen mellon nîn"
         placeholder="例：Mae govannen · Ennyn Durin Aran Moria">

  <div class="tw-row">
    <label><input type="radio" name="tw-script" value="tengwa" checked> Tengwar 腾格瓦</label>
    <label><input type="radio" name="tw-script" value="certh"> Angerthas 色斯文</label>
  </div>

  <div id="tw-segments" class="tw-segments"></div>
  <div id="tw-output" class="tw-output"></div>
  <div id="tw-coverage" class="tw-coverage"></div>

</div>

<script id="tengwar-data" type="application/json">
{
  "vowels": {{ site.data.tengwar.vowels | jsonify }},
  "diphthongs": {{ site.data.tengwar.diphthongs | jsonify }},
  "consonants": {{ site.data.tengwar.consonants | jsonify }}
}
</script>
<script src="/assets/js/tengwar.js"></script>

## 切分规则

引擎按**最长匹配优先**扫描，顺序如下——这个顺序本身就是辛达语正字法的核心，弄反了会把 `dh` 读成 `d`+`h`：

1. **二合辅音**：`ch dh lh mh ng ph rh th hw`
2. **双元音**：`ai ae au aw ei oe ui`
3. **长音与半长音**：`â ê î ô û ŷ`（长音）、`á é í ó ú ý`（半长音）
4. **单字母**

另外处理的规则：

- `i` 在同音节的其他元音前读 /j/，切分时标记为半元音而非独立音节核。
- `f` 在词尾读 /v/。
- `c` 恒读 /k/，不存在软音。

音位库与 IPA 全部取自[第零课](/laim/sindarin/)。

## 怎么把字形表补完

编辑 [`_data/tengwar.yml`](https://github.com/{{ site.owner.github }}/kinnuch.github.io/blob/main/_data/tengwar.yml)，给每个音位的 `tengwa:` / `certh:` 填一个值。三种填法任选：

| 填法 | 例 | 效果 |
|---|---|---|
| Unicode 码位 | `"U+16081"` | 需要读者装了支持 Unicode 16 腾格瓦区的字体 |
| 字体键位 | `"1"` | Tengwar Annatar / Telcontar / Parmaite 都用 Dan Smith 键位 |
| 字母名 | `"tinco"` | 只渲染名字，不需要任何字体 |

如果选字体键位，把你有权分发的字体文件放进 `assets/fonts/`，再在 `_data/tengwar.yml` 的 `meta:` 段填上文件名与 family 名，页面会自动 `@font-face` 引入。

---

- [辛达语教程 · 第零课](/laim/sindarin/) — 三种书写系统的样例与全部字母发音
- [发音练习器](/cerf/pronunciation/) — 把这些音位真正听出来
- [名字生成器](/cerf/name/) — 生成名字后再拿来这里转写
