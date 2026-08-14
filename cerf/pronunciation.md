---
layout: page
permalink: /cerf/pronunciation/index.html
title: Pronunciation Drill
description: 用辛达语教程里的真人录音做最小对立对听辨练习，覆盖全部单元音与双元音。
---

# Pronunciation Drill | 发音练习器

音频与 IPA 全部取自[辛达语教程 · 第零课](/laim/sindarin/)，没有新录，也没有合成。

<div class="drill" id="drill">

  <div class="drill__setup" id="drill-setup">
    <p class="drill__lead">选一组最小对立对，反复听到能一次听准为止。</p>
    <div class="drill__pairs" id="drill-pairs"></div>
    <p class="drill__note">这几组用的都是<strong>孤立音位</strong>的录音（男女声各读一遍），不含单词，所以听的确实是那个元音本身。</p>
  </div>

  <div class="drill__run is-hidden" id="drill-run">
    <div class="drill__score" id="drill-score"></div>
    <button class="drill__play" id="drill-play" type="button">▶ 播放</button>
    <p class="drill__ask">刚才听到的是哪一个？</p>
    <div class="drill__choices" id="drill-choices"></div>
    <div class="drill__feedback" id="drill-feedback"></div>
    <button class="drill__quit" id="drill-quit" type="button">换一组</button>
  </div>

</div>

<script src="/assets/js/pronunciation.js"></script>

## 全部音位对照

### 单元音

辛达语的单元音有三种**音长**：短音 `a`、半长音 `á`、长音 `â`。长音是短音的两倍长；半长音理论上是 1.5 倍，实际按短音读即可，但**书面必须标出**（它和部分元音弱化有关）。

| 字母 | IPA | 说明 | 孤立音 | 词例 |
|---|---|---|---|---|
| **a** | [ɑ] | 开前不圆唇元音，位置稍稍靠后 | <audio controls preload="none" src="/laim/sindarin.assets/Amanwoman.mp3"></audio> | <audio controls preload="none" src="/laim/sindarin.assets/Aman.mp3"></audio> |
| **e** | [ɛ] | 半开前不圆唇元音，如英语 let | <audio controls preload="none" src="/laim/sindarin.assets/Emanwoman.mp3"></audio> | <audio controls preload="none" src="/laim/sindarin.assets/Eman.mp3"></audio> |
| **i** | [i] | 闭前不圆唇元音，不要拖长 | <audio controls preload="none" src="/laim/sindarin.assets/Imanwoman.mp3"></audio> | <audio controls preload="none" src="/laim/sindarin.assets/Iman.mp3"></audio> |
| **o** | [ɔ] | 半开后圆唇元音，舌位通常更低 | <audio controls preload="none" src="/laim/sindarin.assets/Omanwoman.mp3"></audio> | <audio controls preload="none" src="/laim/sindarin.assets/Oman.mp3"></audio> |
| **u** | [u] | 闭后圆唇元音，不要拖长 | <audio controls preload="none" src="/laim/sindarin.assets/Umanwoman.mp3"></audio> | <audio controls preload="none" src="/laim/sindarin.assets/Uman.mp3"></audio> |
| **y** | [y] | 闭前圆唇元音，与 i 构成圆唇对立 | <audio controls preload="none" src="/laim/sindarin.assets/Ymanwoman.mp3"></audio> | <audio controls preload="none" src="/laim/sindarin.assets/Yman.mp3"></audio> |

### 半元音

| 字母 | IPA | 说明 | 词例 |
|---|---|---|---|
| **i**（元音前） | [j] | 同一音节中 i 出现在其他元音前时读 /j/：*iant* 桥、*Doriath* | <audio controls preload="none" src="/laim/sindarin.assets/Jman.mp3"></audio> |

### 双元音

| 字母 | IPA | 说明 | 孤立音 | 词例 |
|---|---|---|---|---|
| **ai** | [ɑj] | 降调，如汉语「爱」但开口略小 | — | <audio controls preload="none" src="/laim/sindarin.assets/AIman.mp3"></audio> |
| **ae** | [ɑɛ] | 与 ai 极相似，开口略小，收在 e 的口型 | <audio controls preload="none" src="/laim/sindarin.assets/AE.mp3"></audio> | <audio controls preload="none" src="/laim/sindarin.assets/AEman.mp3"></audio> |
| **au** | [ɑu] | 降调，如汉语「奥」 | — | <audio controls preload="none" src="/laim/sindarin.assets/AUman.mp3"></audio> |
| **aw** | [ɑu] | au 的词尾写法 | <audio controls preload="none" src="/laim/sindarin.assets/AW.mp3"></audio> | <audio controls preload="none" src="/laim/sindarin.assets/AWman.mp3"></audio> |
| **ei** | [ɛj] | | — | <audio controls preload="none" src="/laim/sindarin.assets/EIman.mp3"></audio> |
| **oe** | [ɔɛ] | | <audio controls preload="none" src="/laim/sindarin.assets/OE.mp3"></audio> | <audio controls preload="none" src="/laim/sindarin.assets/OEman.mp3"></audio> |
| **ui** | [uj] | | — | <audio controls preload="none" src="/laim/sindarin.assets/UIman.mp3"></audio> |

### 部分辅音

| 字母 | IPA | 说明 | 录音 |
|---|---|---|---|
| **c** | [k] | 恒读 /k/，不存在软音 | <audio controls preload="none" src="/laim/sindarin.assets/Cman.mp3"></audio> |
| **lh** | [ɬ] | 清边擦音 | <audio controls preload="none" src="/laim/sindarin.assets/Lhman.mp3"></audio> <audio controls preload="none" src="/laim/sindarin.assets/LhmanWord.mp3"></audio> |

<p class="page-note" markdown="1">
其余辅音（`ch dh mh ng ph rh th hw`）在第零课里有文字描述但暂无独立录音。补齐录音后，把文件放进 `laim/sindarin.assets/`，在 [`assets/js/pronunciation.js`](https://github.com/{{ site.owner.github }}/kinnuch.github.io/blob/main/assets/js/pronunciation.js) 顶部的 `PHONEMES` 表里加一行即可自动进入练习池。
</p>

---

- [辛达语教程 · 第零课](/laim/sindarin/) — 每个字母的完整讲解
- [课后练习](/laim/sindarin.assets/Exercises/Exercises.html) — 音变、动词过去时、句子翻译
- [Tengwar 转写器](/cerf/tengwar/) — 把听到的音写成字
