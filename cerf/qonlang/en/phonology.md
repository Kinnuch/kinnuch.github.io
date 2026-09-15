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

**Spelling per orthography**: how each phoneme is spelled in each orthography (θ as th). Once filled in, these spellings count as one sound in the primary orthography: when **Syllables & prosody** tests spelled input, and when paradigms count sounds (infix positions, patterns, reduplication), th is not split into t and h; an orthography without "Orthography → IPA" rules also uses them to turn spelling into phonemes.

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

- **Orthography → IPA**: produces the Pronunciation column in the lexicon, the corpus IPA and phrase pronunciations. When a piece of text contains several words (`A B`, a phrase), it is transcribed word by word, split at whitespace: the end of each word counts as a word end, so `_#` rules apply to every word, and commas or quotes at the edges of a word don't block word-final rules. Digraph symbols that are IPA already (the θ of `th|θ`, or a sound in the inventory) stay as they are in the resulting IPA instead of turning back into th.
- **IPA → orthography**: spells generated IPA back into the orthography when generating words; it can also convert words from another orthography.

The rule language is exactly the same as on the Sound changes page (see [Rule language](/cerf/qonlang/en/sound-changes/#rule-language)), with a **rule list** and a **source** view, and a try-out box in the inspector that shows results as you type words. Rules in the rule list can be **dragged** to another position or another stage (a gap opens where they will land). If you write `-* stage name` markers, the try-out results are shown per stage, just like the Sound changes test bench, with every cell centred. The rules can also contain a **stress rule** (`ˈ = …`, see [Stress rules](/cerf/qonlang/en/sound-changes/#stress-rules)): placed before the rules that turn accent marks into plain vowels, it makes the resulting IPA carry `ˈ`, shown in orange in the try-out, and Syllables & prosody follows that mark.

**Re-transcribe all entries** recomputes every entry of the current language from the primary orthography; pronunciations marked **irregular** in an entry are not overwritten.

## 4. Syllables & prosody

- **Syllabification**: two strategies. **Template** splits by the syllable template you write (e.g. `(C)(C)V(C)`, referring to class names); **Maximal onset** assigns as many consonants as possible to the onset of the following syllable. It can also be switched off (for isolating languages, or when a syllabary already carries the syllables).
- **Stress**: a fixed position (initial, second, final, penultimate, antepenultimate), weight-sensitive, marked per word, or a **Custom stress rule**: choosing it shows a form to edit the rule entry by entry — the word length (Any length / Exactly / At least), which syllable (Syllable no. / From the end, no. / First fitting from the start / First fitting from the end), what the nucleus must contain, the environment and an exception; when an entry doesn't fit, the next one is tried. Fill **Split at** with `·` to stress each part of a compound on its own, and choose whether **Main stress in** is the last part or the first. Below the form, the rule is shown as text — the same notation as the part after `=` in a [stress rule](/cerf/qonlang/en/sound-changes/#stress-rules) — and mistakes are listed underneath. **Notes / exceptions** is still a free-form note.
- **Tone**: a tone table (name, symbol, description). Tone letters are ignored during analysis, so they don't affect syllabification.

Type a few words into **Test** in the main area to see their syllables and stress. With **Input as** set to **Spelling** (the default), the input is first turned into IPA with the primary orthography and then syllabified — the th in `ce·theurian` is the single sound θ, so it comes out as `ˌke̞·ˈθɛʊ̯r.jän` rather than cet.heurian; with **IPA** the input is syllabified as written. Separators such as `·` and `-` split the word, each side is syllabified on its own, and they stay in the display; IPA that already carries `ˈ` (marked by orthography rules or typed by hand) keeps its marks, otherwise the stress setting above applies. Below that, the first dozen or so words of the lexicon are shown divided; their pronunciation is transcribed afresh with the primary orthography (irregular ones are used as they are), so changes to the orthography rules show up at once; entries with **Affects stress** ticked are stressed by their part of speech and special stress.

In the custom stress rule form, ticking **Use the entry's special stress first (@)** at the top is the rule's `@`, each entry's **Part of speech** is `<part of speech>`, and **Unstressed** among the syllable choices is `0` (see [stress rules](/cerf/qonlang/en/sound-changes/#stress-rules)).

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
| Spelling per orthography | Syllabifying spelled input, counting sounds in paradigms, spelling → phonemes when there are no transcription rules |
| Classes, digraphs | Sound-change rules, orthography rules, script mapping rules (all can refer to them directly) |
| Orthography → IPA | Lexicon pronunciation column, corpus, phrasebook |
| IPA → orthography | Spelling of generated words |
| Phonotactics | Word generation and checks |

## 7. Common questions

- **The phonotactic check flags everything**: phonotactics are written in IPA while lemmas are spellings; the check first converts lemmas to IPA with the primary orthography's rules. If you haven't written transcription rules yet, the check is comparing raw spellings.
- **Tone marks disturb syllabification**: add the tone letters to the tone table and they will be ignored during analysis.
- **A spelling like th is split into two sounds**: turn it into one sound in the orthography rules or as a digraph (`th > θ`, `th|θ`), or fill in th under the phoneme's **Spelling per orthography**; when testing, set **Input as** to Spelling.
- **A symbol should count as both consonant and vowel**: create a class just for it and refer to that class in the syllable template.
