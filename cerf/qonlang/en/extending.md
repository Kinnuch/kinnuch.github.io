---
layout: page
permalink: /cerf/qonlang/en/extending/index.html
title: Qonlang · Plugins and MCP
description: The two ways Qonlang opens up — plugins (inspector panels, pages, commands, import/export, paradigm generators) and the built-in MCP server that lets Claude, Cursor and other LLM clients search your lexicon, run sound changes and, once you confirm, change the project.
---

# Plugins and MCP

[← Guide index](/cerf/qonlang/en/) · [中文](/cerf/qonlang/extending/) · Settings → Plugins / MCP

Qonlang opens up in two ways: **plugins** let other people add things to the app in JavaScript, and **MCP** lets an LLM client work with your project. Both are managed in Settings, and both are desktop-only (the web version has neither).

## 1. Plugins {#plugins}

### Installing one {#install}

Plugins live in one fixed folder, one folder each:

```
<plugins folder>/
  my-plugin/
    plugin.json     ← what the plugin is
    index.js        ← the entry point, an ES module
```

**Settings → Plugins → Open plugins folder** opens it in your file manager (on Windows usually `%APPDATA%\Qonlang\plugins`). Drop the folder in, come back and press **Reload**: the plugin shows up in the list with a tick box you can use to turn it off at any time (everything it registered — panels, commands, import/export, generators — goes away with it).

> **Plugins run with the same privileges as Qonlang.** A plugin can read and write your project and do anything the app itself can. Read the code before installing someone else's — the same care you'd take with a browser extension.

`plugin.json`:

| Field | Meaning |
|---|---|
| `id` | Unique id (lowercase letters, digits, hyphens); the folder name is used if it's missing |
| `name` | The name shown in Settings |
| `version` `description` `author` | Optional, all shown in Settings |
| `main` | Entry file, `index.js` by default |

`index.js` can be written either way: default-export an object with `activate(qonlang)`, or just use the global `window.qonlang`.

```js
export default {
  activate(qonlang) {
    qonlang.ui.toast('plugin loaded')
  },
  deactivate() {
    // called when the plugin is turned off; usually not needed
  }
}
```

### The five extension points {#extension-points}

**① Inspector panel**: adds a block to the inspector on the right. `sections` limits it to certain modules (leave it out for everywhere); `render` hands you a DOM element to draw into and re-runs when the context (project, current language, current module, selected entry) changes. Return a function to clean up.

```js
qonlang.ui.addView({
  id: 'stats',
  title: 'Word length',
  sections: ['lexicon'],
  render(el, ctx) {
    const words = ctx.project.lexemes.filter((l) => l.languageId === ctx.languageId)
    el.textContent = `${words.length} entries`
  }
})
```

**② Page**: with `where: 'page'` it becomes a page of its own in the left-hand nav; `icon` is the single character shown there.

**③ Command**: registered into the `Ctrl+K` palette, found by searching its title.

```js
qonlang.commands.register({ id: 'count', title: 'Count entries', run() { … } })
```

**④ Import / export format**: appears in the Import and Export menus on the Lexicon page. An import asks the user for a file (filtered by `extensions`) and hands you the text; an export takes the string you return to the save dialog.

```js
qonlang.io.registerExporter({ id: 'tsv', name: 'Export TSV', extension: '.tsv', run: (ctx) => '…' })
qonlang.io.registerImporter({ id: 'tsv', name: 'Import TSV', extensions: ['.tsv'], run(text, ctx) { … } })
```

**⑤ Paradigm generator**: the slot generators in [Paradigms](/cerf/qonlang/en/paradigms/) gain a **Plugin** option, and your function produces the form for that cell. You get the project, the entry, the cell's values and the stem.

```js
qonlang.rules.registerGenerator({ id: 'reverse', name: 'Backwards', run: (ctx) => [...ctx.stem].reverse().join('') })
```

### The API {#api}

| Call | What it does |
|---|---|
| `qonlang.apiVersion` | Version of this API; it goes up when things are added |
| `qonlang.project` | The open project (`null` when none is open) |
| `qonlang.languageId` | The current language from the top bar |
| `qonlang.edit(fn)` | Change the project inside the callback; the change lands on the undo stack and marks the project unsaved |
| `qonlang.save()` | Save the project |
| `qonlang.lexicon.search(query, {languageId, limit})` | Find entries with the [search syntax](/cerf/qonlang/en/#common-conventions) from the top bar |
| `qonlang.lexicon.get(id)` / `.add({lemma, definition})` | Read one / add one |
| `qonlang.lexicon.forms(lexeme)` | Every form this entry's paradigms produce (computed, not written back) |
| `qonlang.sounds.run(words, {ruleSetName, from, to})` | Run a [sound-change](/cerf/qonlang/en/sound-changes/) set and get the form at each stage |
| `qonlang.corpus.analyze(text)` / `.add(text, {translation})` | Analyse a sentence / add one to the corpus |
| `qonlang.ui.toast(msg)` `.error(msg)` `.go(section)` | Notify, report an error, switch module |
| `qonlang.util.newId()` | Make an id |

`docs/plugin-example/` in the repository is a complete example using all five extension points; copy it into the plugins folder and it runs.

## 2. MCP {#mcp}

MCP (Model Context Protocol) is the common protocol LLM clients use to reach outside tools. Qonlang has an MCP server built in: **turn it on and clients such as Claude or Cursor can search your lexicon, run your sound changes, read paradigm derivations, and — once you say yes — change the project**.

### Turning it on {#mcp-setup}

Settings → MCP → tick **Allow LLM access**. That will:

- start a server on **127.0.0.1** (reachable from this computer only), port 7421 by default (use 0 to let the system pick a free one);
- generate a **token** — without it every request is 401;
- show a client configuration snippet you can copy as is.

On the client side it looks like this (Claude Desktop, Claude Code and Cursor all take this HTTP form):

```json
{
  "mcpServers": {
    "qonlang": {
      "type": "http",
      "url": "http://127.0.0.1:7421/mcp",
      "headers": { "Authorization": "Bearer <your token>" }
    }
  }
}
```

The tools work on **whichever project is open** — switching projects needs no change to the configuration. **Recent calls** at the bottom of the settings card shows what the LLM has been doing.

### The nine tools {#mcp-tools}

| Tool | What it does | Main arguments |
|---|---|---|
| `project_info` | Overview: languages (entry counts, orthographies, scripts, dialects), parts of speech, grammatical dimensions, rule sets and paradigms | — |
| `search_lexicon` | Find entries with the [search syntax](/cerf/qonlang/en/#common-conventions) | `query`, `languageId`, `limit` |
| `get_entry` | Everything about one entry: senses, stems, inflected forms, pronunciation, etymology, relations, tags | `id` or `lemma` |
| `run_sound_changes` | Run a rule set and give the form at each stage | `words`, `ruleSetId` or `ruleSetName`, `fromStage`, `toStage` |
| `gloss_sentence` | Segment and gloss a sentence (nothing is added to the corpus) | `text`, `languageId` |
| `derive_forms` | Derive every slot of the entry's paradigms, with traces (nothing written back) | `lexemeId` or `lemma`, `paradigmId` |
| `add_entry` ✎ | Create an entry | `lemma`, `definition`, `languageId`, `pos`, `tags` |
| `update_entry` ✎ | Change an entry (only the fields you pass) | `id`, `lemma`, `definition`, `tags`, `notes` |
| `add_sentence` ✎ | Add a corpus sentence and analyse it | `text`, `translation`, `source` |

Tools marked ✎ change the project. Languages, rule sets and paradigms are accepted **by id, by name or by abbreviation**; when one isn't found the tool lists what the project has.

### Writes and safety {#mcp-safety}

- **Writes ask first by default**: a dialog names the tool and its arguments, and nothing happens until you confirm. Turn off **Ask before writes** in Settings if you'd rather not be asked.
- Every change goes through the normal editing path: it lands on the **undo stack** (`Ctrl+Z` takes it back) and the top bar shows the project as unsaved — when to save is still up to you.
- The server listens on this computer only and always requires the token; **New token** replaces it at any time (update the client afterwards).
- Turning the switch off stops the server, and with Qonlang closed there is nothing to connect to.
