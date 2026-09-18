---
layout: page
permalink: /cerf/qonlang/en/corpus/index.html
title: Qonlang · Corpus
description: The Corpus page in Qonlang — entering example sentences, automatic gloss analysis, the interlinear editor, confirmation and preferred analyses, hover cards, four export formats and custom templates, statistics and the abbreviation list.
---

# Corpus

[← Guide index](/cerf/qonlang/en/) · [中文](/cerf/qonlang/corpus/) · eighth item in the navigation bar

The Corpus page collects example sentences and produces an **interlinear gloss** for every word automatically. It has three sub-pages: **Sentences**, **Statistics** and **Abbreviations**.

## 1. Sentence cards {#1-sentence-cards}

The list shows one card per sentence: the script line (if a script is defined; when the script transcribes from an inspector module, it is written word by word from the lexicon — see [Script](/cerf/qonlang/en/script/)), the original text (each word can be hovered / clicked), the gloss line (shown once everything is confirmed), translations, source and tags, and a badge counting confirmed words. Press a card and drag it onto another to move it there. Click a card to open the **interlinear editor** above it; the inspector edits the text, translations (in several languages), spellings in other orthographies, source, tags, extra lines (any label + text, included in exports), notes, and the export panel.

**Find duplicates**: the button next to the title finds sentences in the current language with identical or similar (≥80%) text. Pairs that differ only in their source are merged straight away, with the source written as "A & B"; similar but not identical pairs (or pairs with conflicting translations) are listed in a dialog where you tick the ones to merge. A merge keeps the upper sentence's text and analyses and fills in missing translations, tags and extra lines.

## 2. Automatic analysis {#2-automatic-analysis}

A sentence that hasn't been analysed yet is analysed when you select it; you can also click **Analyze** (fills in unconfirmed words only) or **Re-analyze all**.

For each word, **confirmed analyses** come first: an analysis of the same word already confirmed in another sentence of the project. Then the word is cut into pieces, and each piece is looked up in:

1. **Headwords**: lexemes in the lexicon.
2. **Inflected forms**: the forms stored in entries (the gloss carries the slot abbreviation, e.g. `house.PL`). For entries that were never **Derive**d, slots whose paradigm only adds affixes or reduplicates (no sound changes) are generated on the fly and looked up too.
3. **Stem slots**.
4. **Morphemes**: roots, prefixes, suffixes and clitics; particles, infixes and the like only count as whole words. A word that is just a clitic on its own is glossed as that clitic.

A word can be prefixes + stem + suffixes, with affixes stacked several layers deep (`kaso-lar-da`) and more than one stem (two words written together plus affixes: `yvpli-hemelia-xete-s`). The possible segmentations are ranked like this, and the first is selected by default:

- **Fewer pieces first**: a word found whole in the dictionary isn't cut up needlessly, and splitting off affixes beats splitting into several words.
- **Single-letter pieces cost extra.**
- **Allomorph environments**: for morphemes whose allomorphs have environments, the allomorph whose environment matches ranks higher and one that doesn't ranks lower (it isn't dropped, in case the environment is written loosely).
- **Learning from confirmed words**: which entry or morpheme the same stretch of text was confirmed as elsewhere, how a run of pieces was split (once `don` is confirmed as `do-n`, it's split that way next time), and which morpheme usually follows which — the more of the corpus you confirm, the more accurate it gets.
- **The translation**: among the segmentations, those whose entries' definitions match this sentence's translation rank higher.

Matching ignores case and differences in Unicode composition; morphemes not found in the current language are looked up in the morpheme lists along the ancestor chain (so a root list kept in the proto-language still works).

These are also tried:

- **Apostrophe contractions** (first add `'` in **Settings → Morpheme boundary symbols**; many languages use the apostrophe as a letter, so it doesn't split by default): `t'am` and `m'nem` are split at the apostrophe, the first half is looked up with one or two vowels added (`t'` → `ta`) and the second half as usual; the hover card uses the longest piece's entry.
- **Paradigms that apply to all words**: initial mutations and the like (see [Paradigms](/cerf/qonlang/en/paradigms/)) — the surface word (or the stem between affixes) is changed back to its base form and looked up again, with the mutation's abbreviation added after the gloss.
- **Dropping diacritics**: words written with stress or length marks are still found when the dictionary doesn't write them.

These results are **guesses** — until confirmed, the card stays yellow and they don't count as recognised in the coverage:

- matches found only after dropping diacritics;
- segmentations with two or more stems (compounds, words written together), unless those words were confirmed together elsewhere;
- segmentations using a single-letter morpheme that hasn't been confirmed anywhere in the corpus yet — once it is, the same morpheme in other words no longer counts as a guess.

**Inflected forms with spaces**: forms written as two words in the dictionary (a determiner + noun like `ar mae`) merge the corresponding consecutive words in the text into one word before analysis, and hover cards and glosses treat it as a single word; words already confirmed are never merged.

**Discontinuous words**: an entry whose headword is split into several parts by `…` (or `...`) — `ma…gò` — is written in a sentence with other words in between (`ma`, a word or two, then `gò`). The analysis looks for the parts **in order** within one sentence: once the first part matches, each later part is searched for up to 12 words further on; entries with more parts are tried first, each word is used by only one match, and words you have already confirmed are left alone. Only a complete set counts, and then every part gets the same entry and the same gloss. A part on its own (`ma` with no `gò` later in the sentence) is not attached. On the script line each part is written with only its own half — the entry's **Script form** is split on `…` in the same way.

Words with morpheme boundaries written in the text (the symbols defined in Settings; `-` and `=` by default) are split at the boundaries first, and each piece is then segmented as above (a piece may hold only affixes, with the stem in another piece); each piece keeps candidates from a few different entries, and the combinations become analyses in the candidate drop-down. A reversed initial mutation is re-applied forwards as a check, and results that don't match are dropped.

Every word gets some candidates, and the first is selected by default. Words that can't be found get the gloss `?` and the card is marked yellow. The gloss is the first short part of the definition, cut at the first semicolon, comma, full stop, colon or parenthesis (`house (building); home` gives `house`; a definition starting with a parenthetical note like `(of plants) grow` gives `grow`).

## 3. The interlinear editor

Each word gets a small card with, from top to bottom: the original word, its segmentation (`kaso-da`), the gloss (`house-LOC`), the candidate drop-down, confirm ✓, **Refresh candidates**, and, when nothing is found, **New lexeme** (creates an entry in the lexicon and confirms it).

- Both the segmentation and the gloss boxes can be edited; your edit becomes a custom analysis and moves to the top. The separator is shown as you wrote it, `-` or `=` (where you didn't write one it follows the morpheme type: clitics use `=`).
- Hovering the gloss box shows the full names of the abbreviations (from the abbreviation list).
- **Confirm all**: confirms every word that has a candidate at once. The editor fades and closes (the inspector stays on the sentence; click the card again to open it), and the list card grows its gloss line and flashes green.
- Confirmed words have a green border; confirmed analyses become the first choice for the same word in other sentences.

## 4. Hover cards {#4-hover-cards}

Any word in the editor or the list whose analysis points to an entry shows the lexicon's View-mode entry card on hover; click **Open in lexicon**, or click the word itself, to jump to the lexicon with it selected.

**When several candidates can't be told apart**: when a whole word matches several homographs (the same spelling meaning "star" and "support", say), the software first checks the sentence's own translation — if only one entry fits, that's it. Then it checks other sentences — which entry the same word was confirmed as elsewhere, and which entries are mentioned in the translations of sentences containing it — and uses a clear winner. If it still can't decide, the word gets a **wavy warning underline**, and hovering lists the candidates side by side (up to four, each with its part of speech and first few definitions). Click **This one** to write it into the analysis and confirm it; from then on the word is fixed to that entry, and this confirmation becomes evidence for the same word in other sentences.

**Words matched to the wrong entry**: next to **Open in lexicon** at the bottom of the card is **Fix**. Clicking it turns the card into the same search box, titled "Which word is …?", with the word already filled in (when the card is showing one piece of the segmentation, that piece is filled in and only that piece is changed); click a result to write it into the analysis and confirm it. When candidates are listed side by side, there is **None of these — search** at the top. Cards hovered in the start page's gallery have **Fix** too: it opens the project, jumps to the sentence in the corpus and opens the search box right on that word.

Below the search box is **Also rewrite the word in the sentence**, off by default (once ticked it stays on for the rest of the session): with it on, picking an entry also replaces **this one occurrence** in the sentence text with that entry's spelling (the inflected form, if that is what you picked, keeping the original capitalisation), while the same word elsewhere in the sentence is left alone.

**Picking a different sense**: when the entry is right and only the sense is wrong, there is no need for **Fix** — just **click that sense** on the card. When the card is showing one piece of the segmentation (click `delì` in `delì-hi`), clicking a sense changes only that piece, so a word made of several morphemes can have a sense chosen piece by piece. The candidate dropdown below lists one row per sense as well. The text and the analysis change together, and `Ctrl+Z` takes both back in one step. The tick box only appears when you are replacing a **whole word**: replacing one piece of a segmentation, or picking a morpheme or a split, never touches the text.

**Words that can't be identified**: when a whole word isn't found, or a piece of it isn't (its gloss is `?`, or it has a gloss but can't be attached to any entry or morpheme), hovering still shows a card that says "Nothing found". Pieces are first looked up by spelling, then by meaning: an entry counts if one of its definitions matches the piece's gloss and one of its forms (headword, stem, inflected form) occurs whole inside the piece — so stems with a prefix attached or written with different accents are still recognised (`wéñgaus` contains the weak focus form `eñgaus`). The search box below is pre-filled with the word itself and searches this language's entries and morphemes by spelling, definition or gloss; click one to assign it. When what you type can be split (several words, or a root with a string of affixes, written together), a few **Split** options come first — pick one to replace the word (or the missing piece) with those pieces. The pieces of the word are lined up at the top of the card, with the missing piece in a yellow dashed box — click it to switch to assigning that piece; recognised pieces can still be opened. Once every piece is recognised, the word counts as confirmed.

## 5. Export (inspector)

| Format | Description |
|---|---|
| Leipzig plain text | The script line (if any), segmentation line, gloss line (columns aligned, with CJK characters counted as double width), extra lines and translation |
| Markdown | A table |
| HTML | Classes such as `gloss__row` / `gloss__w` / `gloss__m` / `gloss__g` / `gloss__script`, so you can style it on your own web page |
| LaTeX | The `\gll` format of `gb4e` |
| Custom template | `{{text}} {{translation}} {{source}} {{morphs}} {{gloss}} {{script}}`, with a per-word block `{{#tokens}}{{sep}}{{surface}} {{morphs}} {{gloss}}{{/tokens}}`; templates can be saved in the project |

The copy button copies the current format directly. In the preview, the script line uses the script's own font while Latin text stays aligned in the monospaced font.

### Importing and batch export

**Import** and **Export** in the title bar:

- **Import from a table**: opens the import panel in the main area; choose a CSV / TSV file or paste text directly (one sentence per line also works). The inspector shows an import preview — the first few sentences' text, translations, source and tags after import, with skipped ones marked and the reason given (empty text, already present, duplicate of an earlier row); changing the separator, header or column fields updates it immediately, with changes highlighted and fading. **Separator** is automatic by default: if not every line contains the same separator, each line is treated as one sentence, so commas inside sentences don't split them; you can also pick comma, tab, semicolon or pipe manually. After import the new sentences are checked for duplicates, and those that differ only in their source are merged. With **First row is a header** ticked, each column is guessed from its header — text, a translation in some language, source, tags or notes — and can be changed column by column; rows with empty text, or text already present in this language, are skipped.
- **Import from JSON / Export JSON**: Qonlang's own format, carrying analyses along; importing also uses the panel above — pick a file, check the preview, then click **Import**. When moving between projects, analyses that refer to entries or morphemes that don't exist are dropped, and the sentence is re-analysed when selected.
- **Export CSV**, and batch-export the current list (following the current language and search) as Leipzig plain text, Markdown, HTML or LaTeX.

#### Table format {#table-format}

| Header (any of these) | Field |
|---|---|
| `text`, `原文`, `例句`, `句子`, `sentence` | Text (required) |
| `translation:zh`, `译文`, `翻译`, `释义`, followed by a language (`译文(英)`, `translation en`) | The translation in that language; a plain "translation" column goes to the next gloss language not yet taken |
| `source`, `出处`, `来源` | Source |
| `tags`, `标签` | Tags (comma-separated) |
| `notes`, `备注`, `注释` | Notes |
| An orthography's name (e.g. `转写`) | The spelling in that orthography (other than the primary one) |
| A script's name | The script form (overrides automatic transliteration) |
| `自由行`, `直译`, `literal` | Extra lines, using the column name as the label; several columns make several lines |

Exported CSV files also contain `morphemes` (segmentation) and `gloss` columns, which are for reading only and are ignored on import — to move analyses, use JSON. Without a header, the first column is the text and the second is the translation in the first gloss language; plain text with one sentence per line is text only. **Format help** at the top right of the import panel opens this section.

## 6. Statistics

Layout and interaction are described in [Common conventions](/cerf/qonlang/en/#common-conventions); pick a language in the top bar first. On this page:

- **Number cards**: sentences, tokens (average per sentence), distinct word forms (and how many occur only once), recognised / confirmed tokens, fully confirmed sentences, sentences with a translation / source / hand-entered script, lexicon and morpheme coverage, unrecognised words.
- **Distributions**: by source, tag, gloss abbreviation usage and sentence length.
- **Rankings**: word frequency (by surface form, with each inflected form counted separately) and the most used entries (by lexeme).
- Click a source, word form or unrecognised word to return to the sentence list searched by it; click an entry to jump to the lexicon.

## 7. Abbreviations

The abbreviations used in glosses (`PL`, `LOC`…) and their full names (in several languages). **Fill in Leipzig abbreviations** imports the common abbreviations of the Leipzig Glossing Rules in one go; add your own freely. The list is saved with the project, and hovering a gloss shows the full names.

## 8. Connections to other modules

- Any change in the **Lexicon / Morphemes / Paradigms** affects the next analysis; confirmed analyses are never rewritten automatically.
- Hovering a word in a sentence shows its entry card. When the analysis didn't recognise an entry, the software looks up headwords, stems and inflected forms first, then strips one layer using the **affixes written in paradigms** and looks again, so even heavily inflected words find their entry; when a morpheme is recognised, a morpheme card appears instead.
- The bottom of the card lists the word's **parts** (the words of a compound, the root morphemes); click one to switch to it. **Open in lexicon** on the card jumps to the lexicon, where the list scrolls to the word and highlights it briefly.
- Once a **Script** is defined, cards and exports gain a script line.
- **Skin** lets you set separate fonts for the text, translation and gloss lines.
- The **Current language** in the top bar decides which sentences are shown.

## 9. Tips

- Punctuation in sentences is stripped during tokenisation and doesn't affect matching.
- When the same word means different things in different sentences, just pick and confirm the right candidate in each; the first choice is only the default order. Filling in translations greatly reduces how often you have to pick.
- To tidy up in bulk, complete the lexicon first and then **Re-analyze all** — faster than fixing words one by one.
