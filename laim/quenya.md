---
layout: page
permalink: /laim/quenya/index.html
title: Quenya
description: 昆雅语（高等精灵语）资料总览：语法参考、词汇表、昆雅-拉丁同源词对照与语法检查工具。
---

# Quenya | 昆雅语

昆雅语是托尔金创造的**高等精灵语**，与辛达语拥有共同的祖先原始精灵语（Common Eldarin）。在中土第三纪元，昆雅作为口头语已经式微，主要用于律法、命名与文献，因此常被称为「**精灵拉丁语**」（Elvish-Latin）。

托尔金本人是比较语言学教授，他有意识地赋予昆雅一种古典语言的质感——芬兰语的形态、拉丁语的气质、希腊语的音韵。本板块的资料均基于**晚期昆雅语（Late Quenya, 1950–1972）**，来源为 [eldamo.org](https://eldamo.org) 与灰机 wiki。

> 想学**口语中最有生命力**的那门精灵语？请前往 [Sindarin 辛达语教程](/laim/sindarin/)，那是本站完成度最高的课程。

---

## 语法

- [**昆雅语语法参考手册**](/laim/quenya/grammar/) — 音系与转写、重音规则、名词四类变格、动词时态体系、代词后缀、句法语序。系统性最强的一份。
- [**昆雅语语法检查清单**](/laim/quenya/checklist/) — 逐条可勾选的验证规则，每条都附正误示例（`ciryar` ✓ / `*ciryai` ✗）。写句子时对照着走一遍。

## 词汇

- [**昆雅语词汇表**](/laim/quenya/vocabulary/) — 按语义场（自然与地理、亲属、身体、动作……）分类整理，已排除全部人名与地名。
- [**昆雅语-拉丁语形音义对照表**](/laim/quenya/cognates/) — 昆雅与拉丁在词形和词义上同时相似的词汇，按可信度分 ★ / ★★ / ★★★ 三级，并说明这是托尔金有意为之的「拉丁风味」而非借用。

### 原始数据

以下是可直接下载、导入 Anki 或自己写脚本处理的机读词表：

| 文件 | 条数 | 字段 |
|---|---|---|
| [`quenya-vocabulary.tsv`](/laim/quenya.assets/quenya-vocabulary.tsv) | 846 | `quenya` / `pos` / `english` |
| [`eldamo-quenya-words.tsv`](/laim/quenya.assets/eldamo-quenya-words.tsv) | 2678 | `word` / `pos` / `meaning` / `stem` / `status` |

## Cerf | 工具

- **QuenyaChecker** — 本地昆雅语语法检查器（[Windows 可执行文件](/laim/quenya.assets/QuenyaChecker/QuenyaChecker.exe) + Python 源码），把上面那份检查清单做成了程序。
  - 源码：[`quenya_checker.py`](/laim/quenya.assets/QuenyaChecker/quenya_checker.py) · [`checker_engine.py`](/laim/quenya.assets/QuenyaChecker/checker_engine.py) · [`vocab_data.py`](/laim/quenya.assets/QuenyaChecker/vocab_data.py)
  - 另有 Kivy 版本 [`quenya_checker_kivy.py`](/laim/quenya.assets/QuenyaChecker/quenya_checker_kivy.py) 与安卓打包脚本，可编译为手机 App。
- [Tengwar 转写器](/cerf/tengwar/) — 昆雅模式（Classical Mode）的腾格瓦转写，与辛达语模式共用一个页面。

## Haudhas | 昆雅语译文

- [《刚多林的陷落》四语对照](/haudhas/) — 英语 / 昆雅语 / 辛达语 / 汉语逐行对照。
