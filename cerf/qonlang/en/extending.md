---
layout: page
permalink: /cerf/qonlang/en/extending/index.html
title: Qonlang · Plugins and MCP
description: The ways Qonlang opens up — plugins (inspector panels, pages, commands, import/export, paradigm generators), the built-in Interface translation plugin, and the MCP server that lets Claude, Cursor and other LLM clients search your lexicon, run sound changes and, once you confirm, change the project.
---

# Plugins and MCP

[← Guide index](/cerf/qonlang/en/) · [中文](/cerf/qonlang/extending/) · Settings → Plugins / MCP

Qonlang opens up in a few ways: **plugins** let other people add things to the app in JavaScript, the built-in **Interface translation** plugin lets you translate the whole interface into your own language, and **MCP** lets an LLM client work with your project. All are managed in Settings; plugins and MCP are desktop-only (the web version has neither).

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

## 2. Interface translation (built in) {#ui-translate}

Qonlang ships with one plugin of its own: **Interface translation**. It lists every string in the interface so you can translate it into your own language — the result becomes an interface language of its own, alongside the nine that come with the app.

**Off by default**: go to Settings → Plugins and tick the card marked **Built in** at the top; an **Interface translation** page then appears in the navigation bar. Untick it and it disappears again.

### Starting a translation {#ui-new}

Click **New translation** and fill in:

| Item | Description |
|---|---|
| Language name | The name shown in the language menu |
| Base language | Untranslated strings show in this language (a key name is never shown), and it is the default source text while you translate |
| Written in | **Latin letters** use the app's own font; **my own script** needs a font installed in the [font library](/cerf/qonlang/en/skin/#6-font-library), and the whole interface is then shown in it |
| Written right to left | Like Arabic: only the text runs right to left, the navigation and inspector stay where they are |
| App name wordmark | What replaces the "Qonlang / 千语集" lettering at the top left of the start page and in Settings → About: some text (shown in this translation's font), or click **Use an image…** for a picture (under 300 KB). The QL icon on the left stays; leave it empty for the built-in wordmark |

All of these can be changed later from the row above the list (name, font, direction and wordmark).

### Translating {#ui-edit}

Categories are on the left (by module — Lexicon, Paradigms, Script… with how many of them are done), and the strings on the right, one per row: the key in grey, the source text below it, and your translation in the box beside it.

- **Source text in**: pick the language you would rather translate from.
- **Only untranslated**: hide what you have already done.
- The search box covers **keys, source text and translations** at once.
- Placeholders such as `{n}` and `{name}` **must stay in the translation** — a yellow note appears when one goes missing, because the app replaces them with real numbers and names.
- Translations save as you type; if you are using this language at the moment, the interface changes straight away.
- **Source changed**: every translation remembers the source text it was made from. When an update changes a source text, its row is marked **Source changed**, and hovering the mark shows the old source; tick **Only changed source text** to see just these. Editing the translation clears the mark; if the translation still holds, click **Still fine** next to the mark. Strings translated before 0.12.3 have no remembered source and are never marked.

### Using it and sharing it {#ui-use}

- **Use it**: switch to it right away (switch back from the language menu if you would rather).
- **Export**: writes a `.qonlang-ui.json` you can send to somebody else, who imports it with **Import**.
- Translations live in your **local preferences**, not in a project file — export a copy before reinstalling.

## 3. MCP {#mcp}

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
