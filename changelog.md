---
layout: page
permalink: /changelog/index.html
title: 更新日志
description: 站点全部提交历史，按月分组，可搜索、可跳转到对应的 GitHub 提交。
---

# 更新日志 | Changelog

站点的每一次改动都会由 GitHub Actions 自动写入 [`assets/data/commits.json`](/assets/data/commits.json)，本页直接读取它。首页侧边栏的辛达历日历用的是同一份数据。

<div class="changelog" id="changelog">
  <div class="changelog__bar">
    <input id="changelog-filter" type="search" autocomplete="off"
           placeholder="过滤提交信息…" aria-label="过滤提交">
    <label class="changelog__opt">
      <input type="checkbox" id="changelog-hide-chore" checked>
      隐藏自动提交（<code>chore: refresh commits.json</code>）
    </label>
  </div>
  <div id="changelog-stats" class="changelog__stats"></div>
  <div id="changelog-heatmap" class="changelog__heatmap"></div>
  <div id="changelog-list" class="changelog__list">
    <p class="changelog__loading">正在加载提交记录…</p>
  </div>
</div>

<script src="/assets/js/changelog.js"></script>
