---
layout: page
permalink: /cerf/qonlang/extending/index.html
title: Qonlang · 插件与 MCP
description: 千语集的两个对外接口：插件（检视器面板、导航页、命令、导入导出、构形生成器）与 MCP 服务（让 Claude、Cursor 这类 LLM 客户端查词、跑音变、在你确认后改项目）。
---

# 插件与 MCP

[← 指南目录](/cerf/qonlang/) · [English](/cerf/qonlang/en/extending/) · 设置 → 插件 / MCP

千语集对外开了两个口子：**插件**让别人用 JavaScript 给软件加东西，**MCP** 让 LLM 客户端接进来用你的项目。两者都在「设置」里管，都只在桌面版有（网页版没有）。

## 1. 插件 {#plugins}

### 装一个插件 {#install}

插件放在一个固定目录里，一个插件一个文件夹：

```
<插件目录>/
  my-plugin/
    plugin.json     ← 插件的身份证
    index.js        ← 入口，一个 ES 模块
```

「设置 → 插件 → 打开插件目录」会在文件管理器里打开它（Windows 上通常是 `%APPDATA%\Qonlang\plugins`）。放好之后回到设置点「**重新载入**」，列表里就会出现这个插件，每个插件前面有勾选框可以随时关掉（关掉后它注册的面板、命令、导入导出、生成器一并撤掉）。

> **插件跟千语集同权限跑。** 它能读写你的项目、调用浏览器里的一切。装别人的插件前先看一遍代码——这一点跟装浏览器扩展一样。

`plugin.json`：

| 字段 | 说明 |
|---|---|
| `id` | 唯一标识（小写字母、数字、连字符）；不写就用文件夹名 |
| `name` | 显示的名字 |
| `version` `description` `author` | 都是可选的，显示在设置里 |
| `main` | 入口文件，默认 `index.js` |

`index.js` 两种写法都行：默认导出一个带 `activate(qonlang)` 的对象，或者直接用全局 `window.qonlang`。

```js
export default {
  activate(qonlang) {
    qonlang.ui.toast('插件载入了')
  },
  deactivate() {
    // 关掉插件时调用；一般不用写
  }
}
```

### 五个扩展点 {#extension-points}

**① 检视器面板**：在右侧检视器里加一块。`sections` 限定只在某几个模块里出现（不写就处处都有）；`render` 拿到一个 DOM 节点自己画，上下文（项目、当前语言、当前模块、选中的词条）变了会重画一次，返回一个函数就是收尾。

```js
qonlang.ui.addView({
  id: 'stats',
  title: '词长统计',
  sections: ['lexicon'],
  render(el, ctx) {
    const words = ctx.project.lexemes.filter((l) => l.languageId === ctx.languageId)
    el.textContent = `${words.length} 个词`
  }
})
```

**② 导航页**：`where: 'page'` 时它变成左侧导航里的一页，`icon` 是导航上显示的那一个字。

**③ 命令**：注册到 `Ctrl+K` 命令面板，搜标题就能找到。

```js
qonlang.commands.register({ id: 'count', title: '数一数词条', run() { … } })
```

**④ 导入 / 导出格式**：出现在词库页的「导入」「导出」菜单里。导入会先让用户挑文件（按 `extensions` 过滤），把文本交给你；导出把你返回的字符串交给保存对话框。

```js
qonlang.io.registerExporter({ id: 'tsv', name: '导出 TSV', extension: '.tsv', run: (ctx) => '…' })
qonlang.io.registerImporter({ id: 'tsv', name: '导入 TSV', extensions: ['.tsv'], run(text, ctx) { … } })
```

**⑤ 构形生成器**：[构形](/cerf/qonlang/paradigms/)的槽位生成器里会多一种「插件」，由你的函数算出这一格的形式。拿到的是项目、词条、这一格的取值和词干。

```js
qonlang.rules.registerGenerator({ id: 'reverse', name: '倒过来写', run: (ctx) => [...ctx.stem].reverse().join('') })
```

### API 一览 {#api}

| 写法 | 做什么 |
|---|---|
| `qonlang.apiVersion` | 这套 API 的版本号，加了新东西会 +1 |
| `qonlang.project` | 当前项目（没打开时是 `null`） |
| `qonlang.languageId` | 顶栏的「当前语言」 |
| `qonlang.edit(fn)` | 改项目：在回调里改，改完自动记进撤销栈、标记未保存 |
| `qonlang.save()` | 保存项目 |
| `qonlang.lexicon.search(query, {languageId, limit})` | 按顶栏那套[搜索语法](/cerf/qonlang/#通用操作习惯)找词条 |
| `qonlang.lexicon.get(id)` / `.add({lemma, definition})` | 取一条 / 加一条 |
| `qonlang.lexicon.forms(lexeme)` | 这个词按构形推出来的全部形式（只算，不写回） |
| `qonlang.sounds.run(words, {ruleSetName, from, to})` | 跑一套[音变](/cerf/qonlang/sound-changes/)，返回每个阶段的形式 |
| `qonlang.corpus.analyze(text)` / `.add(text, {translation})` | 分析一句话 / 加一句进语料 |
| `qonlang.ui.toast(msg)` `.error(msg)` `.go(section)` | 提示、报错、跳模块 |
| `qonlang.util.newId()` | 生成一个 id |

仓库里的 `docs/plugin-example/` 是一个把五个扩展点各用一遍的完整示例，复制进插件目录就能跑。

## 2. MCP {#mcp}

MCP（Model Context Protocol）是 LLM 客户端接外部工具的通用协议。千语集内置了一个 MCP 服务：**打开之后，Claude、Cursor 这类客户端就能直接查你的词库、跑你的音变、看构形推导，并且在你点头之后改项目**。

### 打开与连接 {#mcp-setup}

设置 → MCP → 勾「允许 LLM 接入」。这时会：

- 在 **127.0.0.1**（只有本机连得上）起一个服务，默认端口 7421（填 0 就随便挑一个空闲端口）；
- 生成一个**令牌**，没有它一律 401；
- 页面上给出可以直接复制的客户端配置片段。

客户端那边填成这样（Claude Desktop、Claude Code、Cursor 都认这种 HTTP 形式）：

```json
{
  "mcpServers": {
    "qonlang": {
      "type": "http",
      "url": "http://127.0.0.1:7421/mcp",
      "headers": { "Authorization": "Bearer <你的令牌>" }
    }
  }
}
```

工具查的是**眼下打开的那个项目**——换项目不用改配置。设置页下方有「最近的调用」，LLM 做过什么一目了然。

### 九个工具 {#mcp-tools}

| 工具 | 做什么 | 主要参数 |
|---|---|---|
| `project_info` | 项目概况：语言（各自多少词条、正字法、文字、方言）、词类、语法维度、音变与构形 | — |
| `search_lexicon` | 按[搜索语法](/cerf/qonlang/#通用操作习惯)找词条 | `query`、`languageId`、`limit` |
| `get_entry` | 一条词条的全部：义项、词干、屈折形、发音、词源、关系、标签 | `id` 或 `lemma` |
| `run_sound_changes` | 跑一套音变，给出逐阶段的形式 | `words`、`ruleSetId` 或 `ruleSetName`、`fromStage`、`toStage` |
| `gloss_sentence` | 分词 + 逐词 gloss（不写进语料） | `text`、`languageId` |
| `derive_forms` | 按构形推出全部槽位（含推导轨迹，不写回词条） | `lexemeId` 或 `lemma`、`paradigmId` |
| `add_entry` ✎ | 新建词条 | `lemma`、`definition`、`languageId`、`pos`、`tags` |
| `update_entry` ✎ | 改词条（只改传了的字段） | `id`、`lemma`、`definition`、`tags`、`notes` |
| `add_sentence` ✎ | 加一句语料并自动分析 | `text`、`translation`、`source` |

带 ✎ 的会改项目。语言、音变、构形这些参数**填 id、名字、缩写都认**；找不到时工具会把项目里有哪些列出来。

### 写操作与安全 {#mcp-safety}

- **写操作默认先问一下**：弹一个框写明工具名和参数，你点确定才会动。嫌烦可以在设置里关掉「写操作先问一下」。
- 所有改动都走正常的编辑路径：**进撤销栈**（`Ctrl+Z` 能退回）、顶栏会标「未保存」，什么时候保存仍然由你决定。
- 服务只监听本机、必须带令牌；令牌随时可以「换一个」（换完客户端要跟着改）。
- 关掉开关服务就停了；千语集没开着的时候，客户端自然也连不上。
