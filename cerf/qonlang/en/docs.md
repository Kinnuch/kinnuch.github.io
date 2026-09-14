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
| **Lexicon links** | `[[headword]]` or `[[headword\|displayed text]]`: rendered as a clickable link when the lexicon has that headword (clicking jumps to the lexicon with it selected); shown with a dashed underline when it doesn't |

The renderer is a minimal in-house implementation: all text is escaped and raw HTML is not accepted.

## 3. Export

- **Markdown**: the title as a level-one heading, followed by the content as written.
- **PDF**: A4; the desktop app writes the file directly, the web version goes through the print dialog.

**Settings → Export as folder** exports every doc page as `docs/<title>.md`.

## 4. Connections to other modules

- `[[headword]]` jumps to the lexicon.
- The command palette finds pages by title or content.
- The Skin's "corpus translation" font slot is also used for the body text of the preview.
