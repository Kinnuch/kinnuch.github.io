---
layout: page
permalink: /cerf/qonlang/en/lexicon/index.html
title: Qonlang · Lexicon
description: The Lexicon page in Qonlang — View and Edit modes, custom columns and widths, entry fields, senses and etymology chains, merging duplicates, multi-select, example sentences, the relation graph and compare view, CSV and Lexicanter import, dictionary export.
---

# Lexicon

[← Guide index](/cerf/qonlang/en/) · [中文](/cerf/qonlang/lexicon/) · sixth item in the navigation bar

The lexicon is the heart of a project: each record is a **lexeme** — the word, part of speech, senses, etymology, stems and inflected forms, pronunciations, script forms, relations and tags.

## 1. Sub-pages and modes {#1-sub-pages-and-modes}

- **Entries**: the list plus the inspector.
- **Statistics** (pick a language in the top bar first): layout and interaction are described in [Common conventions](/cerf/qonlang/en/#common-conventions). It shows the total number of entries; the number and share with a definition / pronunciation / etymology / inflected forms / images / relations; entries that do and don't occur in the corpus; the number of senses; average word length; identical headwords; recent additions. Distributions are by part of speech, tag, initial letter, word length, etymology type, dialect and each dimension (part of speech, tag, initial letter and dimensions are clickable and filter the list); the ranking shows the entries used most in the corpus, and clicking one jumps to it.
- **Parts of speech & dimensions**: define parts of speech (name, abbreviation, bound paradigms, stem slots, the components of a compound part of speech) and grammatical dimensions (such as "number: singular / plural" or "case: nominative / accusative / locative", each value with a name and abbreviation). All of this is project data; the software presets no terminology.
  - **Renames follow through**: an entry's stems are stored under the stem slot's name, and its inflected forms under the slot name (value names joined with `.`). When you rename a stem slot or a dimension value and leave the input, content stored under the old name in every entry that uses it moves to the new name, and the lexicon's columns, scripts' **Transcribe from** and stem names written in paradigm pipelines change too; a toast says how many entries were moved. Anything already stored under the new name is left alone. Part-of-speech names and abbreviations and dimension names are stored by internal ID anyway, so renaming them shows up in the lexicon immediately.
  - **Stem slots**: which stems entries of this part of speech have, for example a noun's strong / middle / weak forms or a verb's stem vowel. Give each slot a name and a description (where it comes from, how it's used) and add slots with **+ Stem slot**. In Edit mode, entries of this part of speech list one stem input per slot, and the **stem** drop-down in paradigm pipelines offers these slots.
  - **Compound parts of speech**: add a few parts of speech under **Made of** below a part-of-speech card to make it a compound, for example "noun/verb" for a word that is both (if you haven't changed its name and abbreviation, they are built automatically from the components, like `noun/verb` and `n./v.`). The chips under **Made of** can be dragged to change their order, and an unchanged name and abbreviation are rebuilt to match. If a compound part of speech has no paradigm or stem slots of its own, those of its components are used (the first component with a paradigm); filtering by part of speech, `pos=` searches and the part-of-speech filter of lexicon evolution all take the components into account.
  - **Dimensions for some parts of speech only**: add parts of speech under **used for** on a dimension card, and entry editing only lists the dimensions that fit (dimensions that already have a value are still shown); with none selected, the dimension applies to all parts of speech.
  - **Inspector modules**: click **Add module** at the bottom of the page to add a kind of content the lexicon doesn't have by itself — variant characters of a logographic script, cultural notes, geographical distribution — without waiting for the software to add fields for your language. Give each module a title (per gloss language), choose whether its content is "a piece of text" or "a list of items (separated by 、)", and choose where it goes on the entry card: above the senses / between senses and etymology (default) / below the etymology / at the very bottom. **Used for** can restrict it to certain languages, **Font** can display it in a script's font (useful for variant characters), and **Column names also recognised on import** lists column headers that may appear in spreadsheets.
    In Edit mode the input appears at the same position; on the entry card it shows as a section (a list shows one box per item). The top-bar search accepts `title=text`, and **Columns** in the lexicon can add the module as a column. Deleting a module deletes what every entry filled in for it; this can be undone.
  - **Collapse one by one**: each part of speech, dimension and inspector module has a small triangle in front of it that folds it into a single line — name, abbreviation, followed in small print by its bound paradigms, stem slots, values and the parts of speech it applies to. **Collapse all / Expand all** next to each section title folds or unfolds the whole section. Collapsed states are remembered on this computer.

The **Entries** sub-page has two modes:

- **View mode**: the inspector shows a read-only entry card with a clean layout, good for looking things up — headword, script, pronunciation, part of speech, dimension values, senses, tags, etymology, inflected forms, relations, derived words and your own inspector modules. The card's font sizes and block order are set in [Skin](/cerf/qonlang/en/skin/) → Entry card; the symbols around pronunciations (`/…/`, `[…]`, none) are chosen in Settings → Application. A sense's registers show as boxed labels (one character in Chinese, such as `文`; abbreviations in English, such as `lit.`); **Settings → Register labels on entry cards** can switch to full names. When a sense has its own part of speech that differs from the entry's (common for entries with a compound part of speech), its abbreviation (e.g. `n.`) is shown faintly before the definition. Example sentences are listed below the card, separated by a rule. Every word on the card can be clicked to jump to it.
- **Edit mode**: the inspector becomes a form for editing field by field.

At the top there is also a **Relation graph** button <a id="graph"></a>: a graph centred on the current word showing derivation, composition, cognates, near-synonyms and other relations; click a node to switch to it. Concatenated forms in custom sources and stages (`gēs-sal`, `a + b`, `x·y`) are split into several nodes, and each piece is looked up in the source language as an entry or morpheme of the same form; pieces that are found can be clicked — that is how you jump across languages. Forms are compared ignoring diacritics and case, as well as the source language's "characters ignored in fuzzy matching" (see [Languages](/cerf/qonlang/en/languages/)). After clicking a word in another language, **Back** returns you to the entry in the original language.

- **Pan and zoom**: press and drag empty space to move the canvas; Ctrl + scroll wheel zooms around the pointer; the three buttons at the top left zoom in, zoom out and go back to the centre.
- **Expand and collapse**: right-click a node. **Expand around this node** draws another ring with that node's own sources, derived words, cognates, relations and so on — words already on the graph aren't drawn again, they just get a connecting line. **Collapse around this node** folds that ring back in (anything expanded further out from it is hidden too, and comes back as it was when you expand again). The centre word can be collapsed and expanded as well. Expanding a morpheme node shows the entries that use it (those that picked the morpheme directly as a source, and those whose custom sources mention it); expanding a source piece that doesn't match an entry (a dashed box) shows the words whose sources mention it. Right-clicking an entry node also offers **Center on this**. Right-clicking empty space offers **Back to center** and **Collapse all**.
- **Compare** <a id="compare"></a>: when two or more words come from the same root as the centre word, a **Compare** button with the number of groups appears at the top right of the canvas. Roots are found by following etymologies all the way up (entries, morphemes, and each piece of a custom source split at morpheme boundaries); prefixes, suffixes, infixes, circumfixes, clitics and similar morphemes don't count as roots, and the centre word itself is also the root of the words derived from it. In the compare view:
  - the row at the top lists the root groups (cross-language groups first, then those closer to the centre word and with fewer words), and below it you tick the words to compare, up to 6;
  - the table has one column per word: pronunciation; meaning (pieces of meaning shared by all the words are shaded); origin (each step from the root to the word, with its etymology type); parts (other pieces added along the way — prefixes, suffixes, the other half of a compound — highlighted when only some words have them); sound changes (a sound-change rule set with a stage bound to the source language followed by a stage bound to the word's language is found, the source form is run through it again, and the forms at each stage and the rules applied are listed; a yellow warning appears when the result differs from the lexicon's spelling); part of speech, registers, tags and dialects (differences are marked). Click the word at the top of a column to centre the graph on it;
  - **Sound-change differences**: when several of the words were derived with the same rule set, each rule is listed on its own row with every word's form before and after it; by default only the rules that some but not all of the words went through are shown (tick **Show all** to see everything) — for example, the same root with and without a prefix going through different changes;
  - **Sound correspondences**: when two or more words in different languages come straight from the root (without extra pieces), it lists what each sound of the root became in each word — changed ones only; `∅` means lost.
  - In the example project Aelith, open the relation graph of kaso or teli and click **Compare** to see how they differ from their cognates in the sister language Merun (hasu, tel) in sound changes, correspondences and meaning.

## 2. The list {#2-the-list}

- Search headwords, definitions, inflected forms and pronunciations; or search a single field: `word=` (headword), `gloss=` (definition), `form=` (inflected form), `stem=` (stem), `ipa=` (pronunciation), `pos=` (part of speech), `tag=` (tag), `register=` (register), `etym=` (etymology), `note=` (notes), `script=` (script), or `/regex/` — see [Common conventions](/cerf/qonlang/en/#common-conventions). Header sorting and funnel filters are also described in [Common conventions](/cerf/qonlang/en/#common-conventions); the filterable columns here are initial letter, part of speech, tags and each dimension, plus language for **All languages**. To sort by last modification, tick **Updated** under **Columns** first and then click its column name.
- **Columns** chooses which columns are shown: part of speech, each gloss language, tags, etymology, pronunciation, each dimension, each stem slot, each inflected form, each script, and the update time. The choice is saved in the project settings. If columns from different sources end up with the same name, a notice above the list suggests renaming them at their source.
- The right edge of each column can be **dragged to resize**; widths are stored in your local preferences, and **Reset column widths** is at the bottom of the column menu.
- For entries with several senses, the definition column shows "1、… 2、…".
- The default order is alphabetical (the current language's custom alphabet, or Unicode order without one); the button at the far left of the header switches to a **custom order**, which is stored in the project.
- Duplicate headwords get the whole row shaded pale yellow with a warning icon. To keep only the icon, turn off **Settings → Highlight duplicate entries**. The inspector also offers **Merge duplicates**: identical entries in the same language are merged into one, with their senses joined in order. If their parts of speech differ, each sense keeps its original part of speech and the merged entry gets the compound part of speech made of them (such as `n./adj.`). Merging can be undone.
- `Ctrl`-click to select entries one by one, `Shift`-click to select a range; with several selected you can add tags or delete in bulk.
- **Double-click** a row to select it and open the inspector directly in Edit mode.

## 3. Entry fields (Edit mode)

| Field | Description |
|---|---|
| Word | Entered in the primary orthography (formerly called "headword") |
| Part of speech | Chosen from Parts of speech & dimensions |
| Dimension values | The word's inherent grammatical features (noun class, gender, etc.) |
| Dialects | Dialect labels defined on the Languages page |
| Senses | Any number, each with definitions in the gloss languages, registers, dialects and examples. A sense can have several registers (press Enter to add); common ones such as everyday / formal / colloquial / literary / religious / divine are offered, or type your own. Next to a sense's number you can pick a part of speech for that sense alone (default: same as the entry; for compound parts of speech, its components are listed first) |
| Etymology | A chain read as "source > stage… > the word itself"; see below |
| Stems | If the part of speech defines stem slots, one input per slot is listed (the grey placeholder is the slot's description; empty means the headword is used). You can also give a single word custom stems (name → form): after typing the name, Tab jumps straight to the form box, and renaming to an existing name warns about the duplicate and keeps the old name. Paradigm pipelines refer to these stems |
| Inflected forms | Derived by paradigms or typed by hand; see below |
| Pronunciation | One IPA per orthography; tick **!** to mark it irregular so re-transcription won't overwrite it |
| Script form | One per script; empty means generated from the mapping rules |
| Images | Any number of images with captions. The standard size is set in **Settings → Entry image size** (default 320×240): images of that size are kept as they are, images with the same aspect ratio are scaled, and anything else opens a crop dialog (drag the selection, zoom with the wheel or slider). PNG / GIF are stored losslessly, JPEG / WebP are re-encoded at high quality in their own format. In View mode the first image appears to the right of the headword and the rest as thumbnails |
| Relations | A kind (synonym / antonym / see also / root / compound / derivation / sound change / borrowing / custom…) + a target word. Picking an entry as an etymology source adds a relation of the same name automatically |
| Tags, Notes | Tags can be dragged onto another tag to change their order |

**Circumfixes** among morpheme sources are written "first half…second half" (e.g. `e…ce`) in chains, entry cards, the Source column and the relation graph.

## 4. Etymology chains

Etymology is no longer a single "proto-form" box but a chain:

```
[source]  >  [stage A]  >  …  >  the word itself
```

1. First pick the **type**: root, compound, derivation, sound change, borrowing, inherited, unknown, or type your own.
2. The type decides where sources are picked from: a root is looked up among **morphemes** (shown with a leading `*`), a compound takes A + B from the **lexicon**, and a borrowing uses a custom source (language + form + meaning).
3. To record historical intermediate forms, add **stages** — as many as you like, in chronological order.
4. Picking an entry as a source puts the word into the relation graph automatically; **morphemes** have the same etymology editor, so morphemes and entries form one connected graph.

## 5. Inflected forms and paradigms

When a part of speech is bound to a paradigm, Edit mode shows a **slot panel**: one cell per slot (such as "plural.accusative"). Click **Derive** to let the generator fill it in, or type a form by hand. Hand-typed cells are marked as overridden, and later bulk derivation won't touch them.

Above the panel you can also **name a specific paradigm** for this word (instead of following its part of speech) and **choose a variant**; switching recomputes the derived forms and leaves hand-typed ones alone. When a part of speech is bound to several paradigms (for example a verb's first and second conjugation, see [Paradigms · Structure](/cerf/qonlang/en/paradigms/#1-structure)), the drop-down lists "paradigms of this part of speech" as a separate group, and its first item, "by part of speech", says which one is the default. **Reconciliation report** next to the Paradigms page title compares derived results with hand-typed values.

Slot labels are the value names joined with `.` (such as `plural.accusative`); in a CSV import, columns with the same name go straight into inflected forms.

## 6. Example sentences

Below an entry, the **example sentences that use the word** are listed — from the corpus, the phrasebook and docs — 3 by default (change it in **Settings → Examples shown below entries**). **See all examples** opens a page with every occurrence, loading more as you scroll, so it stays fast even for common words.

## 7. Importing

- **Import preview**: while importing, the inspector shows an **import preview** — what the first few entries will look like with the current settings (word, part of speech, sense parts of speech and registers, tags, pronunciation, etymology and so on). Change the column mapping, options or marker handling and the preview updates immediately, with changed parts highlighted and fading. Words that already exist in the project are marked as such.
- **CSV**: in the wizard, choose a file or paste a table (TSV) directly, then assign a meaning to each column. The drop-down only lists fields that can be filled for the chosen **Import as**: for entries — word, language, part of speech, definition (per language), register, sense tag, tags, dialect, grammatical feature, pronunciation (per orthography), script form (per script), etymology type, etymology source (source language), etymology stage (with a description), etymology notes, relation (kind), stem, inflected form, paradigm, paradigm variant, notes (with a prefix) and inspector module (title); for morphemes — form, language, type, second form, gloss, meaning, allomorphs, grammatical feature, tags, the etymology fields and notes. Column mappings can be saved as presets. The target can be entries or morphemes. **Format help** at the top right of the wizard opens the [CSV format](#csv-format) section below.
  - With **Split definitions into senses on semicolons** ticked (the default), `A；B；C` becomes three senses, shown in the list as "1、A 2、B 3、C"; existing `1、` numbering in the source is removed.
  - **Codes at the start of definitions** (when importing entries): this table only appears when digits written right before the text of a definition are detected ("1leave；2go to" — numbering like "1、" and long numbers like "2020" don't count). Choose for each: **Set as sense tag** (type the tag on the right, e.g. `1` → monovalent; typing one sets it as a tag automatically), **Only remove the code**, or **Keep as is** (default). Codes can be written together (`01` = `0` + `1`). The choices are saved with the column-mapping preset, and older presets written as "code=tag" are converted automatically.
  - **Bracket markers** (when importing entries): when markers such as `【专】`, `【神】`, `〔古〕` or `[arch.]` appear in words, definitions or notes, the options list each kind of marker with its count, the columns it appears in and an example, and you choose how to handle each: **Set as register** (the default; type the register name on the right, e.g. "古" → "archaic", or pick a common register), **Set as sense tag**, **Only remove the marker**, or **Keep as is**.
    - The first bracket right after a sense number (`1、`, `2.`, `3)`) counts as a marker too, parentheses included: "1、（古）宅第；2、（方）玉米" is treated like "【古】宅第；【方】玉米", and the numbering is removed as usual.
    - Whether parentheses count as markers is controlled by the option **Parentheses can be register markers too** (ticked by default): unticked, parentheses in this rule and the next always stay in the definition as written and don't go into the marker table; only brackets like `【】`, `〔〕` and `[]` count. The option is saved with the column-mapping preset.
    - The first parenthesis right after a part-of-speech abbreviation (`n.`, `adj.`) counts too, and it can contain several words: `n. (archaic) she-cat`, `adj. (slang, vulgar) …`; set as a register, comma-separated items become several registers. Parentheses that read like a phrase (`(placed before the noun)`, `(+ abs.)`) are kept as text by default — change them in the table if you want a register or tag. Parentheses at the start of the following senses governed by the same abbreviation (`n. (a) …; (b) …`) count too.
    - A marker in a definition covers the text up to the next marker or semicolon, and the parts before and after become separate senses: "房屋；【古】宅第" is two senses, the second with the register "archaic"; "经常的【引】流动的" is also split into two.
    - A passage in the notes that starts with a marker (`【人】某某`) becomes a new sense, and the rest stays as notes; a marker before the word applies to every sense of the entry.
    - Brackets touching letters (`colo[u]r`), brackets not followed by text (a phonetic transcription at the end of a line), purely numeric footnotes, and parentheses with neither a sense number nor a part-of-speech abbreviation in front don't count as markers. The choices are saved with the column-mapping preset.
  - **Part-of-speech labels** (when importing entries): forms like `n.`, `v.`, `adj.` or `v因.` at the start of a definition — "Latin letters + a few characters + a dot" (also after numbering or bracket markers; `n./v.` counts as two) — are listed in a **Part-of-speech labels** table, and again you choose for each: **Set as part of speech** (type the name on the right; common abbreviations are pre-matched, such as `n.` noun, `v.` verb, `adj.` adjective), **Set as sense tag**, **Only remove the label**, or **Keep as is**. Typing the name or abbreviation of an existing part of speech uses it (marked "existing"); a slash-joined name like `noun/verb` is a compound part of speech; names not in the project are marked "new" and created on import. Unrecognised long strings (`house.`, `e.g.`) are kept as text by default.
    - A part-of-speech label covers the senses up to the next label in the same cell: in "n.石头；卵石；v.跑", the first two senses are nouns and the third is a verb.
    - A label may be followed directly by bracket markers (`n.[中古][文学]金石`) without producing a sense that contains only `n.`.
    - If all senses of an entry have the same part of speech, that becomes the entry's part of speech; if they belong to several, the entry gets the compound part of speech made of them and each sense keeps its own. When the table has a part-of-speech column, the entry's part of speech comes from that column, and `n.` or `n./v.` written there are also recognised through this table. The choices are saved with the column-mapping preset.
  - **Links to existing things in the project**: when an etymology source has a source language that exists in the project, headwords or morphemes of the same form are linked directly (`kal ‘stone’ + ri` becomes two sources; the quoted text is the meaning), and anything not found is recorded as an external source. Relations find their targets by headword (the same language first; other rows of the same import count too), and targets not found are listed in the report. Dialects are matched by name or abbreviation and created if missing; paradigms and paradigm variants are matched by name (the base variant's name is recognised too).
  - **Inspector modules**: a column whose name matches an inspector module's title or one of its "column names also recognised on import" is matched automatically; you can also pick **Inspector module** manually and type a title, and a module that doesn't exist yet is created on import (and listed in the report). The **?** next to the **Column mapping** title explains this.
- **Lexicanter**: after choosing a `.lexc` file, the main area first lists how many languages, entries, phrases, rule sets and docs will be created, and lets you choose which gloss language the sense text goes into; the inspector shows the import preview. Nothing is merged into the project until you click **Import**. The lexicon, senses, dialects, pronunciation rules, alphabet, etymologies, phrasebook and docs all come in at once.

## 8. Exporting

The export menu:

- **Entries CSV / Morphemes CSV**: tables with every field.
- **Export dictionary / template…** opens a panel:
  - **HTML**: a two-column print layout grouped by initial letter, with headword, script, pronunciation, part of speech, senses, stems and inflected forms, etymology and notes (each optional; the sense languages are selectable). When a sense's part of speech differs from the entry's, it is written before the definition.
  - **Markdown**: suitable for a wiki.
  - **PDF**: the desktop app writes the file directly; the web version goes through the print dialog.
  - **Per-entry template**: `{{lemma}} {{ipa}} {{pos}} {{script}} {{definition}} {{etymology}} {{notes}} {{tags}} {{language}}`, with blocks `{{#senses}}{{n}} {{pos}} {{text}} {{lang}}{{/senses}}` (`{{pos}}` is the sense's own part of speech, empty when it equals the entry's) and `{{#forms}}{{label}} {{text}}{{/forms}}`. A live preview of the first few entries appears on the right; templates can be saved in the project, exported as text or copied.

### CSV format {#csv-format}

Column names on import aren't fixed — you assign each column in the wizard — but headers with the names below are recognised automatically. Exported CSV files use exactly these names, so they can be edited and imported back. Files are UTF-8 (exports include a BOM so Excel shows them correctly); comma, semicolon, tab and pipe separators are detected automatically, and cells containing commas or line breaks are wrapped in double quotes.

**Entries**

| Header (any of these) | Field | Notes |
|---|---|---|
| `lemma`, `word`, `词头`, `单词`, `字典形` | Word | Required; rows with an empty word are skipped by default |
| `pos`, `词类`, `词性` | Part of speech | Name or abbreviation; abbreviations like `n.` or `n./v.` are recognised through the wizard's **Part-of-speech labels** table, and slash-joined names like `noun/verb` are compound parts of speech; parts of speech not in the project are created |
| `definition_zh`, `释义`, `中文`; `definition_en`, `english` | Definition (in that language) | For other languages write a language code such as `definition_ja`. Semicolons (`;` `；`) separate senses; markers such as `【古语】` before a sense can be set as registers, and abbreviations like `n.` give that sense's part of speech |
| `tags`, `标签` | Tags | Separated by commas or 、 |
| `proto`, `原始形`, `source` | Etymology source | The original form |
| `notes`, `备注` | Notes | |
| `ipa`, `发音` | Pronunciation | Written to the primary orthography and marked as hand-entered |
| `语言`, `方言`, `词源类别`, `中间态`, `同义词`, `反义词`, `关系`, `构形`, `文字` (in English: `language`, `dialects`, `etymology type`, `stages`, `synonyms`, `antonyms`, `relations`, `paradigm`, `script`) | The corresponding field | Several dialects or relation targets are separated by commas or 、; relations are matched by headword; the etymology type recognises `inherited`, `borrowing` and abbreviations like `bor.` and `inh.`, and unrecognised values are kept as custom types |
| An inspector module's title or one of its "column names also recognised on import" | Inspector module | For list modules, separate items with 、; if the module doesn't exist yet, pick **Inspector module** manually and type the title — it is created on import |
| Other columns | Stems, inflected forms, grammatical features, registers, sense tags, paradigm variants… | Choose the field in the wizard and fill in the stem name, slot name or dimension name; separate several registers in a register column with commas or 、 |

```csv
lemma,pos,definition_zh,tags,proto,notes
kala,名词,【古语】宅第；房屋,基础,*kal-a,
tavi,动词,看见,,,
seru,名词/动词,n. 光；v. 照亮,,,
```

On export, each sense's registers are written before the sense as `【register】`, one after another for several (`【古语】【文学】宅第`; avoid spaces in register names); when importing again, choose **Set as register** under **Markers in words, definitions and notes** to bring them back. When a sense's part of speech differs from the entry's, it is written first as `n. ` (`n. 【古语】宅第`), and the entry's part-of-speech column is written as a compound such as `noun/verb`; set them as parts of speech in the **Part-of-speech labels** table when importing again and everything comes back. Each inspector module gets its own column named after its title and is matched automatically on re-import. Sense tags, stems, inflected forms, images and relations between words are not in this CSV; to move everything, use the project file or **Export as folder**.

**Morphemes**

| Header (any of these) | Field | Notes |
|---|---|---|
| `form`, `词根`, `lemma` | Form | Required; prefixes and suffixes carry hyphens (`sa-`, `-lar`) |
| `type`, `类型` | Type | `root` `prefix` `suffix` `infix` `circumfix` `clitic` `pattern` `particle`; the Chinese names 词根, 前缀, 后缀 and so on are recognised too; unrecognised values become tags |
| `gloss`, `缩写` | Gloss | |
| `meaning_zh`, `释义` | Meaning (in that language) | Other languages likewise use a language code |
| `allomorphs`, `异体形` | Allomorphs | Separate several with semicolons, and form from environment with a slash: `lar / _V；ler / Front_` |
| `form2`, `第二形式` | Second form | The second half of a circumfix, an infix's position, etc. |
| `tags`, `标签` | Tags | |
| `notes`, `备注` | Notes | |

When importing, switch **Import as** to **Morphemes** in the wizard. Allomorphs are not in the exported CSV; add them afterwards in the Morphemes page's inspector. For the corpus and phrasebook table formats, see [Corpus](/cerf/qonlang/en/corpus/#table-format) and [Phrasebook](/cerf/qonlang/en/phrasebook/#table-format).

## 9. Connections

| Source | Effect |
|---|---|
| Phonology → orthography rules | **Pronunciation** is generated automatically |
| Script → mapping rules | The Script column and the script line on entry cards |
| Paradigms | Slot panel, inflected forms, the inflection table on entry cards |
| Morphemes | Etymology sources |
| Corpus | Hovering a word in a sentence shows this page's entry card; clicking jumps back here, and the list scrolls to the word and highlights it briefly |
| Docs | `[[headword]]` links jump here |
| Command palette | `Ctrl+K` finds a headword or definition directly |

## 10. Tips

- Deleting an entry can be undone; relations and etymologies that referred to it show `?` instead of raising errors.
- To review proto-language and daughter-language correspondences in bulk in a multi-language project, use **All languages** and tick **Etymology** under **Columns**.
- To put the lexicon on your own website, prefer the per-entry template — the output format is entirely up to you.
