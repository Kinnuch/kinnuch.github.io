---
layout: page
permalink: /laim/overview/index.html
title: 造语总览
description: 各门个人造语的横向对比——谱系、形态类型、书写系统、配套工具与完成度。
---

# 造语总览 | Conlang Overview

这一页把站内几门**个人造语**放在一起横向对比。托尔金的辛达语与昆雅语不在此列（它们不是我造的），入口见 [Laim 语言总览](/laim/)。

## 横向对比

| 造语 | 谱系定位 | 形态类型 | 书写系统 | 配套工具 | 完成度 |
|---|---|---|---|---|---|
| [**Elandis** 亚提斯语](/laim/elandis/) | 独立，无姊妹语 | 屈折，前缀 + 词尾并用 | 自创字母 | — | 有语法与长诗文本 |
| [**Dyalan** 嘉兰语](/laim/dyalan/) | Proto-Andoric → 古語 → 嘉兰语 | 屈折，有生性标记脱落（M-X-S → M-S） | 拉丁转写 | — | 谱系 + 音变链完整 |
| [**Proto-Shikṛin** 原始希克林语](/laim/Proto-Shikṛin/) | 希克林语系祖语 | — | 拉丁转写 | SCA 音变器 | **完整语法书** |
| [**Theusṛin** 瑟乌丝林语](/laim/Theusṛin/) | Proto-Shikṛin 子语 | — | 拉丁转写 | SCA 预设 + Rime 输入方案 | 语法 + 音变规则 |
| [**Archipelago Shikrin** 群岛希克林语](/laim/ArchipelagoShikrin/) | Proto-Shikṛin 子语 | — | 拉丁转写 | SCA 预设 | 起步 |
| **Vōhyssys** 厄希斯语 | 独立 | — | — | — | 尚未整理 |

## 谱系树

### 希克林语系 Shikṛin

```
Proto-Shikṛin 原始希克林语
├── Theusṛin 瑟乌丝林语
└── Archipelago Shikrin 群岛希克林语
```

三支之间的演化路径由 [**SCA 音变器**](/laim/shikrin.assets/SCA/SCA.html) 实际驱动——祖语词表输入，规则文件输出子语形式，不是手写出来的对应表。仓库里 `TheusrinRule.txt` 与 `ArchipelagoShikrinRule.txt` 就是那两套规则。

### 安多语系 Andoric

```
Proto-Andoric 原祖语（类 PIE 地位：三系软腭 + 元音交替）
├── Andoric 古語（宗教经典语言，保留有生性标记 M-X-S）
│   ├── Dyalan 嘉兰语（东斯拉夫式演化，有生性脱落为 M-S）
│   └── [其他方言 / 姊妹语]
└── 中央语（独立体系，仅词汇层面受古語影响）
```

## 各语言的设计要点

### Elandis 亚提斯语

我的第一门造语。有完整的辅音表、对比表与自创书写系统，最有代表性的文本是那首关于「海蚀」的长诗：

> 不知真月赠与了大海几多银带，
> **Uzetes í ù-natixad Phále mōrya patat lhèriain xelaimer,**

页面里有 [辅音表](/laim/elandis/)、对比表与书写系统图。

### Dyalan 嘉兰语

为朋友的小说创作，设计上最「印欧」的一门：

- **原祖语音系**：16 个辅音，含三系软腭 `*ḱ / *k / *kʷ`；短长各 6 个元音。
- **元音交替（ablaut）**：完整级用于独立/词典形，零级用于复合、派生与有生性触发。
- **音变链**：Satem 化 `*ḱ → ś [ɕ]` 等规则驱动 原祖语 → 古語 的演化。
- **有生性**：古語保留 M-X-S 三段结构，到嘉兰语脱落为 M-S。

### 希克林语系 Shikṛin

站内完成度最高的造语项目，也是唯一一个「祖语 + 子语 + 音变规则 + 词典 + 输入法 + 语内文献」六件套齐全的：

- [Proto-Shikṛin 语法书](/laim/Proto-Shikṛin/)（篇幅最长的一份造语文档）
- [Theusṛin 语法](/laim/Theusṛin/) 与 Rime 输入方案（`theusrin.schema.yaml`）
- [希克林语词典](/laim/shikrin.assets/ShikrinDatabase/ShikrinDictionary.html)
- 语内文献：[海蚀录·亚希林卷·初遇](/laim/shikrin-essay/1/) · [相识](/laim/shikrin-essay/2/)

---

## 相关

- [**SCA 音变器**](/laim/shikrin.assets/SCA/SCA.html) — 自定义 Category / Replace / Rule，跑任意语言的历史音变。
- [**造词灵感工具**](/laim/etymology/Etymology.html) — 抓 Wiktionary 词源，给新词找语义动机。
