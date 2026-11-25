---
layout: page
permalink: /cerf/qonlang/en/docs/index.html
title: Qonlang · Docs
description: The Docs page in Qonlang — Markdown and safe HTML pages, project links and sentence backlinks, pages per language, and Markdown, HTML and PDF export.
---

# Docs

[← Guide index](/cerf/qonlang/en/) · [中文](/cerf/qonlang/docs/) · tenth item in the navigation bar

The Docs page holds **Markdown or HTML pages inside the project**: grammar notes, cultural background, translation notes, a coining log. Lexicanter's Docs and Inflections tables become Markdown pages here after import.

## 1. Layout

The left column lists pages in nested folders (the current language's pages plus pages for the whole project), and the middle is the editor, with three views: **Edit**, **Split** (editor on the left, preview on the right) and **Preview**. Doc pages open in Preview by default, and a new page opens straight in Edit. The top-bar search finds titles or content across folders and shows each result's directory. The inspector sets the title, language, folder and export.

Legacy pages and pages without a directory appear in **Default**. **New folder** creates a subfolder in the current directory. A folder's menu creates children, renames, moves or deletes it. Drag documents into a folder or choose their destination in the inspector; drag folders into another folder or use their Move command. A folder cannot move into itself or its descendants. The tree is shared by the project: language filtering changes which documents are shown, without changing their folder membership. Deleting a folder promotes its immediate documents and subfolders to its parent (top-level documents return to Default), preserving every document ID and body. Conflicting promoted folder names receive a number; **Undo** in the notification restores the original names and locations.

Project links, command-palette results and corpus backlinks reveal a document's actual folder and expand its ancestors. **Back** restores the previous folder, document and reading view.

The toolbar above the editor inserts common syntax at the cursor: bold, italic, heading, list, `[[ ]]` link, table and code block.

Set each page's **Body format** in the inspector. Markdown remains the default. **Settings → App → Default format for new documents** can select HTML for future pages created in Documents on this device; existing, imported and example documents are unaffected. Changing a page's format changes its interpretation without rewriting its source; changing back restores the original interpretation.

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

Markdown uses a minimal syntax and displays raw HTML as text. HTML format supports safe text structure such as headings, paragraphs, lists, tables, bold, italic and code. User-supplied CSS, scripts, media, forms, embedded pages and automatically loaded network resources are removed. The input is never executed as a web page; event handlers, styles and forged project navigation attributes are discarded. Ordinary HTTP(S) links open externally only when clicked. HTML text nodes can contain `[[project links]]`; attributes and code do not participate.

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

Sentence links prefer the document's language. When multiple identical sentences remain at the same level, no arbitrary target is chosen; set the document's language correctly. **Documents mentioning this sentence** in the corpus inspector links back to the document and scrolls to and highlights the mention in Preview. Multiple documents have separate titles and language labels. Plain text is listed as **Complete sentence** when a full paragraph, paired quotation marks or an HTML `<q>` element contains the exact original: at least eight characters, with word spacing, final sentence punctuation or a sufficiently long Han-script sentence. For example, `We use “ilenler kasoda jatdu.” here` and HTML `<p>We use <q>ilenler kasoda jatdu.</q> here</p>` both match the complete quoted sentence. Curly or straight quotation marks, Japanese corner quotation marks and `«…»` are supported. Short words, code, HTML attributes and merely similar substrings are excluded. Use `[[sentence:original text]]` for a reliable explicit link, including short sentences.

## 3. Export

- **Markdown**: the title as a level-one heading; Markdown content is kept as written and HTML content is converted by its basic structure.
- **HTML**: exports the safe preview with its built-in stylesheet and an escaped title, without user-supplied CSS, scripts or automatically loaded resources.
- **PDF**: A4; the desktop app writes the file directly, the web version goes through the print dialog.

**Settings → Export as folder** writes document source as `docs/<title>.md` or `.html`. `docs.json` preserves IDs, languages, formats and folder memberships; `project.json` preserves the folder tree. Logical folders are stored in this metadata while source files retain their existing naming under `docs/`. Older folders containing only `docs/*.md` are restored as project-wide documents in Default. Folder HTML files contain editable original source; safe filtering is applied when previewing or exporting HTML/PDF in the app.

## 4. Connections to other modules

- `[[…]]` jumps to the lexicon, morphemes, languages, sound changes, paradigms, scripts, the corpus, the phrasebook or another doc page.
- Sentence backlinks also work from the translation workbench; **Back** restores its draft. A document link to a sentence reveals that sentence instead of leaving a previous workbench or import panel in front of it.
- The command palette finds pages by title or content.
- The Theme's "corpus translation" font slot is also used for the body text of the preview.
