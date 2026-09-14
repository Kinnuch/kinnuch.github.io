---
layout: page
permalink: /cerf/qonlang/en/languages/index.html
title: Qonlang · Languages
description: The Languages page in Qonlang — the family tree, language properties, dialect and register labels, and what the current language does.
---

# Languages

[← Guide index](/cerf/qonlang/en/) · [中文](/cerf/qonlang/languages/) · first item in the navigation bar

The **Languages** page manages every language in the project and how they are related. A project can have a single language or a whole family.

## 1. Family tree

The main area is a tree: root languages at the top, daughter languages indented below them. Each node shows the name, abbreviation and colour, plus the number of lexemes, morphemes and sentences in that language.

- **Add language**: the button at the top. A new language has no parent (it is a parallel language).
- **Change the parent**: pick **Parent language** in the inspector. Choices that would create a cycle (A's parent is B while B's parent is A) are refused.
- **Delete a language**: at the bottom of the inspector. Deletion can be undone. The language's entries are not deleted automatically — they just lose their language — so deal with them in the lexicon first.

## 2. Language properties (inspector)

| Field | Description |
|---|---|
| Name | The name shown everywhere |
| Abbreviation | Used where space is tight, such as the doc page list and export file names |
| Colour | Badge colour, so languages are easy to tell apart in a multi-language project |
| Parent language | Position in the family tree |
| Characters ignored in fuzzy matching | When the relation graph looks for words across languages, or when searching etymology sources, these characters are removed before forms are compared. For example, to treat the laryngeals `H1` / `H2` / `H3` all as `H`, enter `1 2 3`; for syllable dots inside roots, enter `.` (spaces don't matter). Diacritics (macrons, syllabic marks…) and letter case are always ignored |
| Notes | Free text |

Phonology (phonemes, classes, orthographies, syllables, phonotactics) and scripts belong to a language, but each has its own page — see [Phonology](/cerf/qonlang/en/phonology/) and [Script](/cerf/qonlang/en/script/).

## 3. Dialects / registers

Each language can define any number of **dialect** labels (they also work as registers, periods or styles). Entries and senses can be marked with the dialects they belong to, and phrase and sentence tags often use them too. When importing from Lexicanter, its lects become dialects here automatically.

## 4. The current language

The **Current language** drop-down in the top bar decides whose data most pages show:

- Phonology, Script, Lexicon, Morphemes, the paradigm test bench, Corpus, Phrasebook and Docs show only the current language (Docs also shows project-wide pages).
- With **All languages**, the lexicon and morpheme lists show entries of every language with an extra Language column, which the header funnel can filter.
- New entries, sentences, phrases and doc pages belong to the current language by default.

When you open the Languages page, the tree selects the current language automatically. Clicking a language in the tree (or in the lineage shown in the inspector) also switches the **Current language** in the top bar to it, and changing the current language in the top bar selects it in the tree.

## 5. Connections to other modules

- In **Sound changes**, each stage snapshot can be bound to a language; lexicon evolution uses these bindings as the default source and target languages.
- Etymology sources in the **Lexicon** can point to an entry in another language (inheritance, loanwords).
- A **Docs** page can belong to one language or to the whole project.
- When the **Lexicon**'s relation graph or the **etymology** editor searches for a source in a language, forms are compared using that language's "characters ignored in fuzzy matching".
