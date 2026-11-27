---
layout: page
permalink: /cerf/qonlang/en/phrasebook/index.html
title: Qonlang · Phrasebook
description: The Phrasebook page in Qonlang — common phrases organised by category, translations, pronunciation derived from orthography rules, variants and tags, and how it differs from corpus sentences.
---

# Phrasebook

[← Guide index](/cerf/qonlang/en/) · [中文](/cerf/qonlang/phrasebook/) · ninth item in the navigation bar

The phrasebook collects **common expressions**: greetings, numbers, travel-guide style dialogues, fixed patterns from lessons. The division of labour with the Corpus page: sentences are for gloss analysis, phrases are for organising and presenting. A Lexicanter Phrasebook ends up here after import.

### Project-wide folders {#shared-folders}

**Project-wide folders**: Corpus, Phrasebook and Docs now share one nested folder tree. Creating, renaming or moving a folder on one page updates the same directory on the other two. Existing corpus and document folders retain their contents and hierarchy; unassigned records appear in `Default`. Conflicting legacy folder names receive a number rather than being merged. Moving a record does not change its language.

Click **Root directory** in the path to browse folders. The small triangle immediately to its left opens or closes the entire sidebar. The sidebar starts closed. Select a folder to see its contents. Open a sentence, phrase or document to go to its page. Switch between **Icons** and **Details**, and choose tags, creation date, file size and type in **Settings → Root directory**. Size estimates the UTF-8 record data, excluding separate attachments and disk allocation. Older records without a creation date show “—”.

**Root directory** and `Default` are distinct. The root view lists `Default` alongside top-level folders; open `Default` to see unassigned records. `Default` is not the parent of other top-level folders. Folder counts include sentences, phrases and documents in that folder and every descendant; the root count covers the whole project. Tree arrows expand or collapse a branch without changing its count. Breadcrumbs start at Root directory and let you return through the hierarchy.

`Default` cannot contain folders. Create, move or paste folders in Root directory, or drag them onto its root icon. Records can still be dropped into `Default`. Pasting records without folders at the root opens `Default` to show where they landed.

Right-click a folder or record to **Copy**, **Cut** or **Paste**. Selected records also use the page toolbar and `Ctrl/⌘+C`, `Ctrl/⌘+X` and `Ctrl/⌘+V`. Copying a folder includes its subtree and all three record types; pasted copies receive new IDs while retaining their analyses and existing lexeme/morpheme references. Cut moves the original objects only after a successful paste, so cancellation or failure leaves them intact. Whole-record clipboard operations stay within the current open project session. Copy again after reopening the project or restarting the app. Normal text editing is unaffected, and read-only projects cannot change folders or records.

## 1. Layout

Choose list, single-card gallery or masonry using the view switcher. Use the gallery arrows to move between phrases, or use masonry to fit cards of different heights into columns. Phrasebook and Corpus remember their views independently.

The sidebar lists phrases and category counts for the current language and selected folder. Select a category to narrow the list, or a phrase to open its card and inspector. Root directory gives an overview of all phrases in the current language. The search at the top covers text and translations, and only the current language is shown. Press a card and drag it onto another to move it there.

Words in the text that can be found in the lexicon (including inflected forms and stripped affixes) are underlined: hover to show the entry card, click to jump to the lexicon. Words are recognised exactly as in the [corpus](/cerf/qonlang/en/corpus/) — inflected forms, affixes, paradigm affixes worked backwards, and morphemes too.

**Fix** on the card is the same code as in the [corpus](/cerf/qonlang/en/corpus/): a phrase stores its own analysis, so whichever piece of the segmentation is selected is the piece **Fix** changes (two occurrences of the same entry in one word are told apart), and picking a sense or a segmentation works here too. Search for an entry or a morpheme and click it and **only what the word points at changes — the text itself is left untouched**; to rewrite the text as well, tick **Also rewrite the word in the text** (off by default, and only offered when the whole word is being changed), after which the pronunciation and script line are recomputed from the rules (anything you marked irregular is left alone). Either way the whole thing undoes in one step. A piece that isn't recognised says "Not found" on hover, and the same search box fills it in. Editing the text re-runs the analysis, keeping the words you have already confirmed.

## 2. Phrase fields

| Field | Description |
|---|---|
| Text | In the primary orthography |
| Translation | Only the current interface language by default; to write others, add them under [Settings](/cerf/qonlang/en/settings/) → Current project → Languages & fonts → **Languages to write definitions in** |
| Category | Free text, with suggestions from categories already in use; the left column groups by it. **Double-click** a category in the left column to rename it (every phrase in it changes together) |
| Pronunciation | One **Orthography-based IPA** row per orthography (written **Orthography-based IPA (orthography name)** when there are several), followed by a **!** checkbox meaning irregular. After you edit the text, pronunciations are derived automatically with the "orthography → IPA" rules. Editing a pronunciation by hand ticks **irregular** automatically, so derivation no longer overwrites it; a toast says how many were left alone, and **Recompute them too** on the toast recomputes them as well. Unticking **!** recomputes that orthography's pronunciation from the rules immediately |
| Variants | Any number of "form + note" pairs, for differences of register, occasion or dialect |
| Tags | |

Deletion can be undone.

**Translation workbench**: click **Workbench** next to the translation in the inspector to build the text backwards from the translation, the same way as the [corpus translation workbench](/cerf/qonlang/en/corpus/#workbench): write the translation, drag the floating words up into order, click a word to pick its form and add affixes and particles in the [attachment deck](/cerf/qonlang/en/corpus/#bench-attach), then click **Add to phrasebook**. If the selected phrase's text is still empty it is filled in; otherwise a new phrase is added to the current category. The words you picked are stored as the phrase's analysis, and the pronunciation is filled in by the rules. Existing punctuation and confirmed analyses load into the draft, preserving the source format by default. New phrases retain explicit translation punctuation without forcing capitals or a final period. Check the final text and open **Formatting settings** when needed. When several candidates match the same part of the translation, choosing one sends the alternatives to the bin at the upper right of the candidate area. Open the bin and drag a word back to use it again.

## 3. Connections to other modules

- **Phonology**: pronunciation rules.
- **Script**: a script line at the top of each card.
- **Theme**: text and translations use the corpus font slots.
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
