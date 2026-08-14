---
layout: page
permalink: /friends/index.html
title: Nethaid Mellyn
description: 友站链接。
---

# Nethaid Mellyn | 友站链接

{% for f in site.data.friends %}
### [{{ f.name }}]({{ f.url }})

{% if f.icon %}![{{ f.name }}]({{ f.icon }}){: .friend-icon }{% endif %}
{{ f.blurb }}

{% endfor %}

---

## 交换友链

想交换友链的话，直接在本页留言（右下角「留言」按钮，走 GitHub Discussions），或走 [Mínimraef](/mínimraef/) 上的联系方式。

本站信息：

| 字段 | 值 |
|---|---|
| 站名 | {{ site.title }} |
| 地址 | {{ site.url }} |
| 简介 | {{ site.description }} |
| 头像 | {{ site.url }}/images/{{ site.owner.avatar }} |
