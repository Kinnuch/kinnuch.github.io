---
layout: page
permalink: /cerf/qonlang/en/phrasebook/index.html
title: Qonlang · Phrasebook
description: The Phrasebook page in Qonlang — common phrases organised by category, translations, pronunciation derived from orthography rules, variants and tags, and how it differs from corpus sentences.
---

# Phrasebook

[← Guide index](/cerf/qonlang/en/) · [中文](/cerf/qonlang/phrasebook/) · ninth item in the navigation bar

The phrasebook collects **common expressions**: greetings, numbers, travel-guide style dialogues, fixed patterns from lessons. The division of labour with the Corpus page: sentences are for gloss analysis, phrases are for organising and presenting. A Lexicanter Phrasebook ends up here after import.

## 1. Layout

The left column lists **categories** ("All" plus each category with its count), the middle shows phrase cards (script line, text, pronunciation, translations, variants), and the inspector edits the current phrase. The search at the top covers text and translations, and only the current language is shown. Press a card and drag it onto another to move it there.

Words in the text that can be found in the lexicon (including inflected forms and stripped affixes) are underlined: hover to show the entry card, click to jump to the lexicon.

## 2. Phrase fields

| Field | Description |
|---|---|
| Text | In the primary orthography |
| Translation | In each gloss language |
| Category | Free text, with suggestions from categories already in use; the left column groups by it. **Double-click** a category in the left column to rename it (every phrase in it changes together) |
| Pronunciation | One **Orthography-based IPA** row per orthography (written **Orthography-based IPA (orthography name)** when there are several), followed by a **!** checkbox meaning irregular. After you edit the text, pronunciations are derived automatically with the "orthography → IPA" rules. Editing a pronunciation by hand ticks **irregular** automatically, so derivation no longer overwrites it; a toast says how many were left alone, and **Recompute them too** on the toast recomputes them as well. Unticking **!** recomputes that orthography's pronunciation from the rules immediately |
| Variants | Any number of "form + note" pairs, for differences of register, occasion or dialect |
| Tags | |

Deletion can be undone.

## 3. Connections to other modules

- **Phonology**: pronunciation rules.
- **Script**: a script line at the top of each card.
- **Skin**: text and translations use the corpus font slots.
- **Command palette**: `Ctrl+K` finds a phrase by text or translation and jumps to it.

## 4. Tips

- **Import** and **Export** in the title bar: import from a table (CSV / TSV / one per line); text, translations per language, category, tags and variants are guessed from the headers, and phrases whose text already exists are skipped. You choose the columns in the import panel in the main area while the inspector shows a live import preview (updating as you change settings, with changes highlighted and fading). JSON can be imported (also with a preview first) and exported, and CSV can be exported (following the current category and search).
- Categories can use "/" for hierarchical names (like "Travel/Directions"); the left column sorts them alphabetically.

## 5. Table format {#table-format}

| Header (any of these) | Field |
|---|---|
| `text`, `原文`, `短语`, `phrase` | Text (required) |
| `translation:zh`, `译文`, `翻译`, `释义`, followed by a language | The translation in that language |
| `category`, `分类`, `类别` | Category; "/" makes levels (`Travel/Directions`) |
| `tags`, `标签` | Tags (comma-separated) |
| `variants`, `变体` | Variants (several expressions separated by semicolons, with a note in parentheses at the end: `hi (colloquial)`) |
| `发音`, `ipa`, or an orthography's name | The pronunciation in that orthography (use "发音" / `ipa` for the primary orthography and the orthography's name for the others) |

Exported CSV files have exactly these columns and can be imported back directly; phrases whose text already exists are skipped. **Format help** at the top right of the import panel opens this section.
