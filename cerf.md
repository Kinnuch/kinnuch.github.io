---
layout: page
permalink: /cerf/index.html
title: Cerf
---



##### 可能用到的特殊符号：

á é í ó ú ý â ê î ô û ŷ ñ

## Abdrab | 课后练习

- Prestanneth 音变练习
  <style src="https://kinnuch.github.io/assets/css/cerf.css"></style>
  <body>
  <select id="questionType">
      <option value="">Cilo i brestanneth 请选择音变类型</option>
      <option value="2">Prestanneth vae nan i 带i的软音变</option>
      <option value="3">hoth-e-bedui 名词的复数</option>
      <option value="4">Prestanneth munneb nan in 带in的鼻音音变（名词需要先变为复数）</option>
      <option value="5">Prestanneth gang nan en 带en的混合音变（以-连接）</option>
      <option value="6">Prestanneth munneb nan an 带an的鼻音音变</option>
      <option value="7">Prestanneth gang nan anin 带anin的混合音变</option>
      <option value="8">Prestanneth hiriol nan egor 带egor的流音音变</option>
      <option value="9">Prestanneth dharnen nan od 带od的闭锁音变</option>
      <option value="10">Prestanneth 'hyarmen' nan ah 带ah的H音变</option>
      <option value="11">Prestanneth 'anto' na nedh 带nedh的DH音变</option>
  </select>

  <div id="Prestanneth"></div>

  <input type="text" id="userInput" placeholder="Teitho hí 在此处填入答案" />

  <button id="checkAnswer">Cêth i nangweth 检查答案</button>

  <button id="refreshButton">Laeda 切换题目</button>

  <div id="resultFeedback"></div>

  <script src="https://kinnuch.github.io/assets/js/prestanneth.js"></script>
  
  </body>
  
- Gwenwi-i-choer 动词过去时
  <body>
  <select id="gwenwiType">
      <option value="">Cilo i onnas 请选择类型</option>
      <option value="1">Gwenwi-i-choer na charon 带施事者的动词过去时</option>
      <option value="2">Gwenwi-i-choer na chavon a charon 带施事者和受事者的动词过去时</option>
  </select>

  <div id="Gwenwi"></div>

  <input type="text" id="GwenwiInput" placeholder="Teitho hí 在此处填入答案" />

  <button id="checkGwenwiAnswer">Cêth i nangweth 检查答案</button>

  <button id="refreshGwenwiButton">Laeda 切换题目</button>

  <div id="resultGwenwiFeedback"></div>

  <script src="https://kinnuch.github.io/assets/js/gwenwi.js"></script>

  </body>

- Pethas 句子翻译
  <body>
  <div>翻译以下句子</div>

  <div id="Pethas"></div>

  <input type="text" id="PethasInput" placeholder="Teitho hí 在此处填入答案" />

  <button id="checkPethasAnswer">Cêth i nangweth 检查答案</button>

  <button id="refreshPethasButton">Laeda 切换题目</button>

  <div id="resultPethasFeedback"></div>

  <script src="https://kinnuch.github.io/assets/js/pethas.js"></script>

  </body>