---
layout: page
permalink: /cerf/index.html
title: Cerf
description: 网页交互工具与小游戏：音变器、发音练习、词汇复习、名字生成、腾格瓦转写、辛达语爬塔与中土自走棋。
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
    <p class="tool-card__blurb">{{ t.blurb }}</p>
  </div>
{% endfor %}
</div>

{% endfor %}
