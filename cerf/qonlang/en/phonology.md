---
layout: page
permalink: /cerf/qonlang/en/phonology/index.html
title: Qonlang · Phonology
description: The Phonology page in Qonlang — phoneme inventory and features, classes, two-way orthography rules, syllabification, stress and tone, phonotactic checks, and a word generator that learns from the lexicon.
---

# Phonology

[← Guide index](/cerf/qonlang/en/) · [中文](/cerf/qonlang/phonology/) · second item in the navigation bar

The Phonology page has five sub-pages: **Phonemes**, **Classes**, **Orthography**, **Syllables & prosody** and **Phonotactics & generator**. Everything here belongs to the current language selected in the top bar.

## 1. Phonemes

The main area shows the IPA charts (pulmonic consonants, non-pulmonic sounds, the vowel chart, others). Click a symbol to add it to or remove it from the inventory; you can also type any symbol in the inspector (it doesn't have to be IPA — tone letters and your own symbols work too). The consonant chart has an **affricate** row (`t͡s`, `d͡z`, `t͡ʃ`, `t͡ɕ`…); a spelling with a tie bar and one like `ts` count as the same sound, and features are still inferred. The triangle to the right of the chart title collapses the whole chart. Phonemes already in the inventory are listed as small chips in rows for consonants / vowels / others; press one and drag it onto another in the same row to swap their positions (**Fill from inventory** fills in this order).

Each phoneme's **features** (type, voicing, place, manner, height, backness, rounding…) are inferred from the IPA symbol automatically; you can edit them or add your own dimensions. Features are used in two places:

- The **Classes** sub-page generates members from feature queries.
- **Syllables & prosody** tells consonants from vowels by type when syllabifying.

**Spelling per orthography**: the default spelling of each phoneme in each orthography, for reference when writing rules later.

## 2. Classes

Classes are the sets such as `V`, `C` and `{Vlong}` used in the rule language. There are two ways to build one:

- **By members**: list the members directly (members of a single-letter class are split by character; long-named classes are space-separated).
- **By feature**: write a feature query such as "type = vowel" or "voicing = voiced and manner = plosive"; the members are computed from the inventory and follow it when it changes.

**Create C / V** builds the two basic classes by type with one click.

**Digraphs**: declare two letters such as `th` or `ng` as one unit, so rules match them as a single character and they are turned back into letters on output. The same table can also be edited in the rule list view of the Sound changes page.

Classes and digraphs are made available automatically to sound-change rule sets, orthography rules and script mapping rules. A class of the same name declared inside a rule text overrides the one defined here.

## 3. Orthography

A language can have several orthographies (a Latin romanisation, a Cyrillic transcription, a scholarly transcription…), one of which is the **primary orthography** — lemmas in the lexicon are entered in it. There is one button per orthography at the top; press one and drag it onto another to change their order.

Each orthography has rules in both directions:

- **Orthography → IPA**: produces the Pronunciation column in the lexicon, the corpus IPA and phrase pronunciations. When a piece of text contains several words (`A B`, a phrase), it is transcribed word by word, split at whitespace: the end of each word counts as a word end, so `_#` rules apply to every word, and commas or quotes at the edges of a word don't block word-final rules.
- **IPA → orthography**: spells generated IPA back into the orthography when generating words; it can also convert words from another orthography.

The rule language is exactly the same as on the Sound changes page (see [Rule language](/cerf/qonlang/en/sound-changes/#rule-language)), with a **rule list** and a **source** view, and a try-out box in the inspector that shows results as you type words. Rules in the rule list can be **dragged** to another position or another stage (a gap opens where they will land). If you write `-* stage name` markers, the try-out results are shown per stage, just like the Sound changes test bench.

**Re-transcribe all entries** recomputes every entry of the current language from the primary orthography; pronunciations marked **irregular** in an entry are not overwritten.

## 4. Syllables & prosody

- **Syllabification**: two strategies. **Template** splits by the syllable template you write (e.g. `(C)(C)V(C)`, referring to class names); **Maximal onset** assigns as many consonants as possible to the onset of the following syllable. It can also be switched off (for isolating languages, or when a syllabary already carries the syllables).
- **Stress**: a fixed position (initial, second, final, penultimate, antepenultimate), weight-sensitive, or marked per word. You can also write rules as text.
- **Tone**: a tone table (name, symbol, description). Tone letters are ignored during analysis, so they don't affect syllabification.

The inspector has a try-out box, and the main area shows how the first dozen or so words of the lexicon are divided, which helps when adjusting the template.

## 5. Phonotactics & generator

The phonotactics table describes legal syllables: **onsets**, **nuclei** and **codas** are each a list of allowed sequences (written in IPA), **illegal sequences** lists segments that must not occur, **weights** make some sequences more likely, and there are minimum / maximum syllable counts.

**Fill from inventory** fills onsets and codas with the consonants in the inventory and nuclei with the vowels (those that can be syllable nuclei). Empty lists are filled directly; a list that already has content that differs from the inventory triggers a dialog asking whether to refill it — refilling brings back restrictions you removed on purpose, and can be undone. A toast at the bottom right says how many items went into each list, and also tells you when the lists already match the inventory. Consonant or vowel is decided in this order: features you set by hand on the phoneme, membership in a class named `C` / `V` (or 辅音 / 元音), then the IPA charts. Multi-letter spellings that aren't in the charts (`ng`, `aa`) are judged by the letters inside them, and a `g` typed on an ordinary keyboard counts as IPA `ɡ`. Phonemes that still can't be classified are left out and listed in the toast; give them a **type** in the inventory.

- **Check lexicon**: checks every word against the phonotactics and lists the violations with their reasons.
- **Generate**: generates N words (you can set the range of syllable counts). With **Learn from lexicon** ticked (the default; it needs at least 8 words of this language in the lexicon), it first learns from the existing words — how common each onset is word-initially and word-medially, each coda word-medially and word-finally, how many syllables words tend to have, and which sounds go together — then scatters a large number of candidates according to those frequencies, ranks them by how much they sound like the language, picks a set that don't resemble each other too much, and avoids forms that differ from an existing word by just one sound where possible. The top results sound the most natural; hover a result to see "Similar to: …", the closest existing words. Unticked, it generates from the phonotactics and weights only.
  Either way, the phonotactics are hard rules: every result is syllabified again and checked, so onsets, nuclei, codas, illegal sequences and syllable counts all conform; headwords that already exist are skipped. If the primary orthography has "IPA → orthography" rules, the spelling is shown as well. Each result has an **Add to lexicon** button, and everything can be copied at once.

## 6. Connections to other modules

| Defined here | Used by |
|---|---|
| Phonemes and features | Feature queries in classes, syllabification |
| Classes, digraphs | Sound-change rules, orthography rules, script mapping rules (all can refer to them directly) |
| Orthography → IPA | Lexicon pronunciation column, corpus, phrasebook |
| IPA → orthography | Spelling of generated words |
| Phonotactics | Word generation and checks |

## 7. Common questions

- **The phonotactic check flags everything**: phonotactics are written in IPA while lemmas are spellings; the check first converts lemmas to IPA with the primary orthography's rules. If you haven't written transcription rules yet, the check is comparing raw spellings.
- **Tone marks disturb syllabification**: add the tone letters to the tone table and they will be ignored during analysis.
- **A symbol should count as both consonant and vowel**: create a class just for it and refer to that class in the syllable template.
