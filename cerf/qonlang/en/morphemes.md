---
layout: page
permalink: /cerf/qonlang/en/morphemes/index.html
title: Qonlang · Morphemes
description: The Morphemes page in Qonlang — one table for roots, affixes, clitics and particles, allomorphs and their environments, and how morphemes are used by paradigm generators and corpus segmentation.
---

# Morphemes

[← Guide index](/cerf/qonlang/en/) · [中文](/cerf/qonlang/morphemes/) · fifth item in the navigation bar

The Morphemes page is **one table for roots, affixes, clitics and particles**. The division of labour with the lexicon: the lexicon stores **lexemes** (finished words with a part of speech, senses and inflected forms), while the Morphemes page stores the **parts**. A proto-language's list of roots usually lives here.

The list works like the lexicon (see [Common conventions](/cerf/qonlang/en/#common-conventions)); filterable columns are initial letter, type and tags (plus language when **All languages** is selected). Next to the title there is also a **Statistics** sub-page (click a distribution item to filter the list, or a ranking item to jump to it). It shows the number of morphemes; the share with a gloss / meaning / allomorphs / etymology; how many are used in corpus analyses, etymologies and paradigms; a list of unused morphemes; and duplicates with the same form and type. Distributions are by type, tag and initial letter.

Next to the title are two modes, **View / Edit**: View shows a read-only card (form, type, gloss, meaning, allomorphs, etymology, the entries that use it); Edit is the field-by-field form, just like in the lexicon. Double-click a row in the table to open it in the inspector directly in Edit mode.

## 1. Fields

| Field | Description |
|---|---|
| Form | The morpheme itself. Mark an affix's position with hyphens: `-lar` (suffix), `ka-` (prefix), `-in-` (infix); clitics use `=` |
| Second part / position | The second half of a circumfix, an infix's insertion point, or a `C₁aC₂aC₃`-style pattern |
| Type | root / prefix / suffix / infix / circumfix / clitic / pattern / particle — just a label; pick whatever fits |
| Gloss | The abbreviation shown in interlinear glosses, e.g. `PL`, `LOC`, `1SG` |
| Meaning | Definitions in several languages (in the project's gloss-language order) |
| Allomorphs | Any number of "form + environment" pairs, with environments written in the rule language's environment notation (e.g. `_#`, `V_`, `Back?_`); paradigm generators referring to the morpheme pick one by environment |
| Features | Custom key–value pairs |
| Tags, Notes | |

The list only shows morphemes of the current language (with an extra Language column for **All languages**). By default it is sorted by the language's custom alphabet.

## 2. Writing allomorphs

The environment is exactly the environment part of the [rule syntax](/cerf/qonlang/en/sound-changes/#rule-language), where `_` is the morpheme itself: a suffix looks at the end of the stem before it (`V_` after a vowel), a prefix at the start of the stem after it (`_d` before d, `_Vr` before "vowel + r"). `_CC` is **any two** consonants, while `_C1C1` is **the same consonant doubled** (the same number means the same sound). It doesn't matter if the class is written in IPA (`k` in `C`) while the stem is spelled (`c`): the environment is compared against both the spelling and the pronunciation derived from the primary orthography. The **?** next to Allomorphs and **Syntax help** next to the title are always there to look up the notation.

When a suffix has different forms in different environments (vowel harmony, consonant assimilation), don't create several morphemes — write allomorphs under one morpheme:

```
Form: -lar
Allomorphs:
  -ler   / Front?_      ; when the preceding vowel is a front vowel
  -lar   / _            ; default
```

The first environment from the top that matches wins; write the default as `_` and put it last.

## 3. A morpheme's etymology

Morphemes have the same **etymology chain** as entries: type (root / compound / derivation / sound change / loanword / unknown or a custom type), sources, stages and notes. Once filled in, the morpheme is joined into the same relation graph as the entries that use it, so you can follow a word all the way back to earlier morpheme sources. For how the relation graph works (including splitting concatenated sources into nodes and jumping across languages), see [Lexicon · Relation graph](/cerf/qonlang/en/lexicon/#graph).

## 4. Referring to morphemes in paradigms

Generators on the Paradigms page can write `@morpheme name` (or `@` followed by the morpheme's form); the software picks an allomorph with the environment rules above and attaches it to the stem. That is better than hard-coding a literal suffix in the generator: change the morpheme and every paradigm follows, and the gloss abbreviations stay consistent.

## 5. Role in the corpus

When the Corpus page analyses sentences automatically, it not only looks words up in the lexicon but also **strips affixes** listed here, up to two layers deep: `kasolarda` → `kaso-lar-da`, each piece taking the morpheme's gloss. Clitics are joined with `=`.

## 6. Referring to morphemes in sound-change rules

Sound-change, orthography and script mapping rules can all write `@name`, where the name is the morpheme's gloss or its form without hyphens (`@lar`, `@PL`). It acts like a class whose members are all of the morpheme's allomorphs, so alternations such as `@lar > @ler / Front?_` can be written directly as rules; `@name` in the replacement corresponds by position to the class in the target.

## 7. Connections to the lexicon

- An entry's **etymology source** can point to a morpheme (root derivation); the entry card then shows `← root ‘meaning’`.
- **Import → Import from CSV** in the title bar opens the column-mapping wizard with **Morphemes** already selected as the target, and the inspector shows a live import preview (form, type, gloss, meaning, tags); switching the target to Morphemes in the Lexicon page's CSV wizard does the same.
- The **Input field** of lexicon evolution can use the source language's morpheme list, deriving a proto-language's roots into a daughter language's lexicon in one go.

## 8. Tips

- Two morphemes with the same form but different meanings (homonyms) can coexist in one language, as long as their glosses differ.
- **Export** in the title bar exports a morpheme CSV (for the current language); the Lexicon page's export menu has it too.
