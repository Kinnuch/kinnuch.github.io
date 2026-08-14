---
layout: page
permalink: /laim/index.html
title: Laim
description: 托尔金精灵语、个人造语与自然语言的学习笔记与教程总览。
---

<iframe frameborder="no" border="0" marginwidth="0" marginheight="0" width=330 height=86 src="https://music.163.com/outchain/player?type=2&id=31108422&auto=0&height=66"></iframe>

{% comment %}
  Rendered from _data/languages.yml — add a language there, not here.
{% endcomment %}

{% assign groups = "elvish,conlang,natural" | split: "," %}
{% assign group_zh = "托尔金精灵语,个人造语,自然语言" | split: "," %}

<p class="laim-intro" markdown="1">
共 {{ site.data.languages | size }} 门语言。想横向对比几门造语的音系、书写系统与完成度，见
<a href="/laim/overview/">造语总览</a>。
</p>

{% for g in groups %}
{% assign gi = forloop.index0 %}

## {{ group_zh[gi] }}

<div class="lang-grid">
{% for lang in site.data.languages %}{% if lang.group == g %}
  <div class="lang-card lang-card--{{ lang.status }}">
    <h3 class="lang-card__name">
      {% if lang.url %}<a href="{{ lang.url }}">{{ lang.name }}</a>{% else %}{{ lang.name }}{% endif %}
      <span class="lang-card__zh">{{ lang.zh }}</span>
      <span class="lang-badge lang-badge--{{ lang.status }}">{% case lang.status %}{% when 'done' %}完成{% when 'wip' %}更新中{% when 'stub' %}起步{% else %}计划中{% endcase %}</span>
    </h3>
    <p class="lang-card__blurb">{{ lang.blurb }}</p>
    {% if lang.extra %}
    <ul class="lang-card__extra">
      {% for e in lang.extra %}<li><a href="{{ e.url }}">{{ e.title }}</a></li>{% endfor %}
    </ul>
    {% endif %}
  </div>
{% endif %}{% endfor %}
</div>

{% endfor %}

---

## 延伸阅读

- [造语总览](/laim/overview/) — 各门个人造语的横向对比与谱系树。
- [Realelvish Academy](https://academy.realelvish.net) — 英文原版精灵语课程。
