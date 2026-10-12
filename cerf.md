---
layout: page
permalink: /cerf/index.html
title: Cerf
description: 小游戏、Qonlang 造语工作台、Qonsona 语言学习软件，以及音变器、词汇复习、名字生成与文字转写等工具。
---

{% comment %}
  Rendered from _data/tools.yml — add a tool there, not here.
{% endcomment %}

{% for sec in site.data.tools %}
## {{ sec.section }}

<div class="tool-grid">
{% for t in sec.items %}
  <div class="tool-card">
    <h3 class="tool-card__name">
      <a href="{{ t.url }}">{{ t.title }}</a>
      {% if t.new %}<span class="tool-badge">NEW</span>{% endif %}
    </h3>
    <p class="tool-card__zh">{{ t.zh }}</p>
    <p class="tool-card__blurb">{{ t.blurb | escape }}</p>
  </div>
{% endfor %}
</div>

{% endfor %}
