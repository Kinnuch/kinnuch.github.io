# I vínimraef nîn ben lam Sindarin

# 我的辛达语个人网站

基于 Jekyll 搭建的个人网站，部署于 [kinnuch.github.io](https://kinnuch.github.io)，主要围绕辛达语 (Sindarin) 的学习与创作，同时收录其他自然语言和造语的相关内容。

## 本地开发

```bash
bundle install          # 首次
bundle exec jekyll serve --config _config.yml,_config.dev.yml
# http://127.0.0.1:4000
```

`--config` 那段不能省：[_config.yml](_config.yml) 把 `url` 固定为线上域名，而模板用 `{{ site.url }}` 拼资源路径，不覆盖的话本地页面会从线上站加载 CSS/JS。[_config.dev.yml](_config.dev.yml) 就是干这个的。

依赖见 [Gemfile](Gemfile)——用的是 `jekyll 3.10.0`（GitHub Pages 线上同版本），**不是** `github-pages` 那个大包：本站刻意不使用任何插件（sitemap / feed / 搜索索引都是手写 Liquid），而 `github-pages` 会拖进 nokogiri，在 32 位 Windows 上没有预编译包、需要现场编译 libiconv，很容易失败。

提交前自检：

```bash
python script/linkcheck.py    # 站内链接、大小写、Unicode 归一化
```

## 部署

站点由 [deploy.yml](.github/workflows/deploy.yml) 构建并部署，**不是** GitHub Pages 从分支直接构建。仓库 Settings → Pages → Source 必须设为 **GitHub Actions**。

推送到 `main` 后依次跑三个 job：`verify`（链接检查 / JS 语法 / YAML+JSON）→ `build`（生成 `commits.json`、`jekyll build`、断言产物可解析）→ `deploy`。Pull request 只跑前两个，不部署。

这样做的原因：早先的方案让 Pages 从分支构建，`commits.json` 只能由 workflow 生成后**提交回仓库**，于是每推送一次就多一个 `chore: refresh commits.json` 的 bot 提交。现在它在 runner 里生成、直接进 `_site`，仓库不再被写入。

`--livereload` 在 32 位 Ruby 3.2 上用不了（eventmachine 的 x86-mingw32 预编译包只到 Ruby 2.x）。`serve` 默认已带 `--watch`，改文件会自动重建，手动刷新浏览器即可。

## 站点结构

站点导航对应六个主要板块（见 [_config.yml](_config.yml)）：

- **Barphalt 主页** — [index.md](index.md)：欢迎页，包含图片轮播、网易云音乐嵌入、语言学习入口、TEAE 归档与博客小记时间线。
- **Laim 语言** — [laim.md](laim.md) + [laim/](laim/)：各语言的学习笔记与教程。
  - 自然语言：苏格兰盖尔语、古诺斯语 & 古冰岛语、韩语、赫梯语（含楔形文字）、日语。
  - 托尔金精灵语：辛达语（[laim/sindarin.md](laim/sindarin.md) 是站点最完整的教程，含语音、文字、语法、词汇）、昆雅语。
  - 个人造语：Elandis 亚提斯语、Dyalan 嘉兰语、Vōhyssys 厄希斯语、Shikṛin 希克林语系（含 Proto-Shikṛin、Theusṛin、Archipelago Shikṛin 等分支）。
- **Haudhas 仓库** — [haudhas.md](haudhas.md)：翻译作品，主要为《刚多林的陷落》选段的英语 / 昆雅语 / 辛达语 / 汉语四语对照。
- **Cerf 工具** — [cerf.md](cerf.md)：网页交互工具与小游戏。
  - 希克林语系**音变器**（SCA，[laim/shikrin.assets/SCA/](laim/shikrin.assets/SCA/)），内置 Theusṛin 和 Archipelago Shikṛin 预设。
  - 辛达语**课后练习**（[laim/sindarin.assets/Exercises/](laim/sindarin.assets/Exercises/)），含音变、动词过去时、句子翻译。
  - **Barad Bith 巴别塔**（[laim/sindarin.assets/BaradBith/](laim/sindarin.assets/BaradBith/)）：辛达语 roguelike 卡牌爬塔游戏，卡牌、敌人、圣物取自辛达语词典真实词条，通过词义 / 音变小测验解锁卡牌效果，学习进度跨局保存。
  - **Enya Panta-Tyalië 中土自走棋**（[gell/EPT/](gell/EPT/)）：中洲主题自走棋对战游戏，含种族 / 职业羁绊、三合一升星、装备锻造与六边形棋盘布阵；支持单人模式（多个 AI 对手 + 本地段位排行榜）和基于 PeerJS 点对点直连的 2~8 人在线联机。
  - **造词灵感**工具（[laim/etymology/](laim/etymology/)），抓取 Wiktionary 词源信息辅助造语。
- **Mínimraef 博客** — [mínimraef.md](mínimraef.md)：联系方式与杂谈。
- **Gobeth 词典** — [gobeth.md](gobeth.md)：词典与考试资料。
  - 汉语-辛达语词典与辛达语填字游戏（[laim/sindarin.assets/SindarinDatabase/](laim/sindarin.assets/SindarinDatabase/)）。
  - 希克林语词典。
  - **TEAE**（Testaith Edhellen an Edain，人类的辛达语能力测试）与 **ESLD**（辛达语作为二外）相关文件。

## 技术与资源目录

- [_layouts/](_layouts/)、[_includes/](_includes/)：Jekyll 页面模板与公共片段（导航、页脚、giscus 评论、脚本等）。
- [assets/](assets/)：站点静态资源。
  - CSS：[dark-mode.css](assets/css/dark-mode.css) 暗色模式、[homepage.css](assets/css/homepage.css) 主页轮播样式、[cursors.css](assets/css/cursors.css) 自定义光标等，另含 LESS 源文件与字体。
  - JS：主题切换、首页画廊、[calendar.js](assets/js/calendar.js) 主页日历（读取提交记录生成更新时间线）、[weather-sound.js](assets/js/weather-sound.js) 用 Web Audio 实时合成的环境天气音效（无外部音频文件）等。
  - [assets/data/commits.json](assets/data/commits.json)：站点提交历史，供主页日历与[更新日志](changelog.md)使用。**线上版本由 [deploy.yml](.github/workflows/deploy.yml) 在构建期从 `git log` 重新生成**，不经过仓库；仓库里这一份只是给本地开发用的快照，会逐渐过时。想在本地刷新它：

    ```bash
    git log --no-merges --date=iso-strict \
      --pretty=format:'%H%x09%h%x09%cI%x09%an%x09%s' \
      | jq -R -s 'split("\n") | map(select(length > 0)) | map(split("\t"))
                  | map({hash:.[0], short:.[1], date:.[2], author:.[3], msg:(.[4:]|join("\t"))})' \
      > assets/data/commits.json
    ```
- [gell/](gell/)：小游戏目录，目前包含中土自走棋 [gell/EPT/](gell/EPT/)。
- [laim/stars.assets/](laim/stars.assets/)：3D 夜空星图，可拖动旋转天球、缩放并点击恒星查看详情的交互式恒星观测页面。
- [images/](images/)：主页画廊与图标素材。
- [file/](file/)：PDF 资料（如 [TEAE1.pdf](file/TEAE1.pdf)）、造语笔记、亚夜世界观资料、小说章节等附加内容。
- 评论系统通过 giscus（GitHub Discussions）接入，配置见 [_config.yml](_config.yml)。
