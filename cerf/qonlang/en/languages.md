---
layout: page
permalink: /cerf/qonlang/en/languages/index.html
title: Qonlang · Languages
description: The Languages page in Qonlang — the family tree and dragging cards around, the tree diagram, family / branch / sub-branch groups with statistics and comparison, comparing two languages, language properties, historical stages and merging languages into stages, dialect and register labels, and what the current language does.
---

# Languages

[← Guide index](/cerf/qonlang/en/) · [中文](/cerf/qonlang/languages/) · first item in the navigation bar

The **Languages** page manages every language in the project and how they are related. A project can have a single language or a whole family.

## 1. Family tree

The main area is a tree: root languages at the top, daughter languages indented below them. Each node shows the name, abbreviation and colour, plus the number of lexemes, morphemes and sentences in that language; a language with [historical stages](#historical-stages) also shows their abbreviations, such as `CAe → Ae`.

- **Add language**: the button at the top. A new language has no parent (it is a parallel language).
- **Add group**: the button at the top, with **Family**, **Branch** and **Sub-branch** in its menu. With a group selected, the new group goes under it; with a language selected, it goes under that language's group.
- **Change the parent**: pick **Parent language** in the inspector. Choices that would create a cycle (A's parent is B while B's parent is A) are refused.
- **Delete a language**: at the bottom of the inspector. Deletion can be undone. The language's entries are not deleted automatically — they just lose their language — so deal with them in the lexicon first.
- **Search**: the top-bar search also matches group names and abbreviations; a matching group shows everything under it.
- **Drag to arrange**: cards in the list can be dragged — onto a group card to put the language in that group, onto a language card to make it that language's child, a group onto a group to nest it. Dropping on the **top or bottom edge** of a card inserts it between siblings instead; while you drag, a **Move to the top level** strip appears at the bottom of the tree. A drop that isn't allowed is outlined in red, and the card slides back from the pointer to where it was. Everything is undoable with `Ctrl+Z`.

### Tree diagram

The **List / Tree diagram** switch at the right of the page title chooses the view. The tree diagram is a top-down family tree: group nodes are dashed boxes, and a language's [historical stages](#historical-stages) hang off it as a small chain. Scroll to zoom, drag the background to pan; the top left has zoom in, zoom out and **Fit to window**. Clicking a node selects it (as in the list, the current language in the top bar follows); **right-click** a node to collapse or expand the branch under it, which hangs a small **+n** tag below the node saying how many nodes are not drawn. Dragging to arrange is only available in the list.

### Family / Branch / Sub-branch

In the list a group is drawn as a **dashed box around everything it contains**: the title row carries the level badge (Family, Branch, Sub-branch) and the name, and the group's proto-language, lower groups and other languages all sit inside the box. The proto-language is aligned with the title row (a group is only a classification, so its representative proto-language is not a level below it), while lower families, branches and other languages are indented one step. The arrow to the left of the title collapses or expands the group, and when collapsed the title says how many languages are inside (at all levels below); what's collapsed is remembered on this computer. The box's **+** is **Add a language here**. Clicking a group only selects it and doesn't change the current language. The group's inspector:

| Field | Description |
|---|---|
| Name, Abbreviation | |
| Level | Family / Branch / Sub-branch |
| Parent group | The group it sits under; **(no group)** is the top level |
| Proto-language | Optional: the proto-language representing this group. The proto-language stays an ordinary language, and comes first inside the box — between the family and the branches below it |
| Notes | Free text |

A line below counts the sub-groups and the languages (at all levels below). **Add a language here** creates a language under this group; **Delete** removes the group and moves its sub-groups and languages up a level, with Undo on the toast.

Where a language appears in the tree: if **Group** in its inspector names a group and its parent language is not in that group, it hangs under the group; otherwise it hangs under its parent language. A daughter language without a group of its own counts in its parent's group, and the drop-down shows **(same as parent language)**.

### Statistics and comparison

Selecting a group shows a **Statistics and comparison: "group name"** card in the main area with four tabs (the chosen tab is remembered):

- **Counts**: one row per language at every level under the group, with entries, morphemes, sentences and phrases, and a total row at the bottom. Click a language name to select it.
- **Phonemes**: the union of the languages' phoneme inventories, one phoneme per row, ticked in the column of each language that has it; the last row is each language's phoneme count.
- **Cognate rates**: a matrix whose cells give the share of the row language's entries that have a cognate in the column language; the higher the share, the darker the cell, and hovering shows the number of words. Cognates are found through etymology: two words trace back to the same source (an entry, a morpheme that isn't an affix, or a form written for a proto-language), or one is the other's source.
- **Correspondences**: tick the languages to compare (at least two). Each shared source gets a row, with the words that come from it in each language's column; when several layers of sources cover exactly the same words, only the nearest one is listed. Only the first 300 rows are shown; click a word to jump to it in the lexicon.

### Comparing two languages

To compare two languages directly, you don't need a group: with one selected, `Ctrl`-click (`Cmd` on macOS) a second language, or click **Compare** on its card.

- A bar appears above, naming the two languages and their **nearest common ancestor** ("none, the two lineages never meet" when they don't share one).
- The two lineages up to that ancestor are marked with flashing dashed nodes and edges, in the list and in the tree diagram alike.
- The statistics card below compares just those two: counts, phonemes (each row followed by "N shared · N only in A · N only in B"), cognate rates and correspondences — the same tabs as a group's statistics.
- **Clear comparison** puts everything back.

## 2. Language properties (inspector)

| Field | Description |
|---|---|
| Name | The name shown everywhere |
| Abbreviation | Used where space is tight, such as the doc page list and export file names |
| Colour | Badge colour, so languages are easy to tell apart in a multi-language project |
| Parent language | Position in the family tree |
| Group | The family / branch / sub-branch it belongs to (see above). A daughter language set to **(same as parent language)** follows its parent |
| Historical stages | Periods inside this language; see below |
| Characters ignored in fuzzy matching | When the relation graph looks for words across languages, or when searching etymology sources, these characters are removed before forms are compared. For example, to treat the laryngeals `H1` / `H2` / `H3` all as `H`, enter `1 2 3`; for syllable dots inside roots, enter `.` (spaces don't matter). Diacritics (macrons, syllabic marks…) and letter case are always ignored |
| Notes | Free text |

Phonology (phonemes, classes, orthographies, syllables, phonotactics) and scripts belong to a language, but each has its own page — see [Phonology](/cerf/qonlang/en/phonology/) and [Script](/cerf/qonlang/en/script/).

### Historical stages

Use these when a language has several periods (Old → Middle → Modern) that you don't want to split into separate languages. Click **Add stage** next to **Historical stages** in the inspector and give each stage a stage name and an abbreviation, oldest first; the arrows on the right move a stage up or down, and × deletes it. Phonology and the lexicon are still one set for the whole language — stages only mark periods:

- The tree shows the stage chain after the language, such as `CAe → Ae`.
- Sound-change stage markers can be bound to a stage of this language (see [Sound changes · Stage snapshots and language bindings](/cerf/qonlang/en/sound-changes/#2-stage-snapshots-and-language-bindings)).
- An entry can be assigned to a stage (**Historical stage** in the lexicon's Edit mode; empty means the latest stage), and the **History** row on entry cards is labelled with stage abbreviations (see [Lexicon · History](/cerf/qonlang/en/lexicon/#history)).

### Merge into stages

If you once set up Old, Middle and Modern as separate languages, each the parent of the next, and now want them as stages of one language: select the newest one (it needs a parent), pick the ancestor to start from in the drop-down **Merge into stages starting from…** under **Historical stages**, click **Merge into stages** and confirm. Merging does this:

- Every language in the chain becomes a stage of the newest one (a language that already has stages contributes those), and the newest language gets a stage for itself;
- Entries, morphemes, sentences, phrases and docs all move into the newest language, and entries and morphemes remember which stage they came from;
- Sound-change stage markers bound to the merged languages are rebound to "the newest language · the corresponding stage";
- Orthographies, scripts and dialects are matched by name; unmatched scripts and dialects are moved over, and pronunciations under an unmatched orthography are dropped — the toast says how many;
- Only the newest language's own phonology is kept;
- Other languages hanging under the merged ones are re-attached to the newest language.

Merging can be undone with Ctrl+Z.

## 3. Dialects / registers

Each language can define any number of **dialect** labels (they also work as registers, periods or styles). Entries and senses can be marked with the dialects they belong to, and phrase and sentence tags often use them too. When importing from Lexicanter, its lects become dialects here automatically.

## 4. The current language

The **Current language** drop-down in the top bar decides whose data most pages show:

- Phonology, Script, Lexicon, Morphemes, the paradigm test bench, Corpus, Phrasebook and Docs show only the current language (Docs also shows project-wide pages).
- With **All languages**, the lexicon and morpheme lists show entries of every language with an extra Language column, which the header funnel can filter.
- New entries, sentences, phrases and doc pages belong to the current language by default.

When you open the Languages page, the tree selects the current language automatically. Clicking a language in the tree (or in the lineage shown in the inspector) also switches the **Current language** in the top bar to it, and changing the current language in the top bar selects it in the tree.

## 5. Connections to other modules

- In **Sound changes**, each stage snapshot can be bound to a language (and, for a language with historical stages, to one of its stages); lexicon evolution uses these bindings as the default source and target languages, and the **History** row on entry cards is derived through them.
- Etymology sources in the **Lexicon** can point to an entry in another language (inheritance, loanwords).
- A **Docs** page can belong to one language or to the whole project.
- When the **Lexicon**'s relation graph or the **etymology** editor searches for a source in a language, forms are compared using that language's "characters ignored in fuzzy matching".
