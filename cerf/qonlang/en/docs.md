---
layout: page
permalink: /cerf/qonlang/en/docs/index.html
title: Qonlang · Docs
description: The Docs page in Qonlang — Markdown pages inside the project, the supported syntax, [[headword]] links, pages per language, and Markdown and PDF export.
---

# Docs

[← Guide index](/cerf/qonlang/en/) · [中文](/cerf/qonlang/docs/) · tenth item in the navigation bar

The Docs page holds **Markdown pages inside the project**: grammar notes, cultural background, translation notes, a coining log. Lexicanter's Docs and Inflections tables become pages here after import.

## 1. Layout

The left column lists pages (the current language's pages plus pages for the whole project), and the middle is the editor, with three views: **Edit**, **Split** (editor on the left, preview on the right) and **Preview**. Doc pages open in Preview by default, and a new page opens straight in Edit. The top-bar search filters pages by title or content. The inspector sets the title, the language it belongs to (or the whole project) and export.

The toolbar above the editor inserts common syntax at the cursor: bold, italic, heading, list, `[[ ]]` link, table and code block.

## 2. Supported syntax

| Syntax | How to write it |
|---|---|
| Headings | `#` to `#####` |
| Lists | `- item`, `1. item` |
| Quotes | `> text` |
| Code blocks | Surrounded by three backticks |
| Tables | `\| a \| b \|`, with `\| --- \| --- \|` on the second line |
| Bold / italic / strikethrough / inline code | `**x**`, `*x*`, `~~x~~`, `` `x` `` |
| Links | `[text](https://…)`, opened in the external browser |
| Horizontal rule | `---` |
| **Project links** | `[[name]]`, `[[prefix:name]]`, `[[prefix:name#sub]]`, each of which can end with `\|displayed text`. See below |

The renderer is a minimal in-house implementation: all text is escaped and raw HTML is not accepted.

### Project links {#links}

Without a prefix a name is looked up as a **lexeme** first, as before (so existing pages keep working), then as a morpheme, doc page, phrase, sentence, language, paradigm, rule set and script. With a prefix only that kind is searched:

| Written as | Links to |
|---|---|
| `[[kaso]]` | a lexicon entry |
| `[[morpheme:-lAr]]` | a morpheme (the affix hyphens are optional) |
| `[[language:Merun]]` | a language (name or abbreviation) |
| `[[soundchange:Proto → Aelith]]`, `[[soundchange:Proto → Aelith#Modern]]` | a rule set; after `#`, one of its stages |
| `[[paradigm:Noun]]`, `[[paradigm:Noun#singular.locative]]` | a paradigm; after `#`, one of its slots (the slot name, its gloss abbreviation, or the values in the other interface language) |
| `[[script:Aelith runes]]` | one writing system |
| `[[sentence:…]]`, `[[phrase:…]]` | a corpus sentence, a phrasebook entry |
| `[[doc:Grammar sketch]]` | another doc page |

Prefixes are accepted **in both languages** (`[[语素:-lAr]]` is the same as `[[morpheme:-lAr]]`), case, spaces and hyphens don't matter, and a full-width colon works too — so a page written in the Chinese interface still works in the English one.

Clicking jumps to that module and highlights the entry. A link that resolves to nothing is drawn with a dashed underline, and hovering it says which kind was not found (when the name matches but the part after `#` doesn't, it still links to the parent).

The **Insert link** button on the toolbar saves you remembering the syntax: pick a kind, search the name, press Enter. Rule sets list their stages and paradigms list their slots alongside.

## 3. Export

- **Markdown**: the title as a level-one heading, followed by the content as written.
- **PDF**: A4; the desktop app writes the file directly, the web version goes through the print dialog.

**Settings → Export as folder** exports every doc page as `docs/<title>.md`.

## 4. Connections to other modules

- `[[…]]` jumps to the lexicon, morphemes, languages, sound changes, paradigms, scripts, the corpus, the phrasebook or another doc page.
- The command palette finds pages by title or content.
- The Skin's "corpus translation" font slot is also used for the body text of the preview.
