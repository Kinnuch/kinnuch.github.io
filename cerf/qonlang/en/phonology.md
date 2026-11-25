---
layout: page
permalink: /cerf/qonlang/en/phonology/index.html
title: Qonlang · Phonology
description: The Phonology page in Qonlang — phoneme inventory and features, classes, spelling-to-IPA rules with case equivalence, syllabification, stress and tone, phonotactic checks, and a word generator that learns from the lexicon.
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

- **By members**: list the members directly. Without separators, the input is split by character; separate multi-character members with spaces or commas, as in `ts ng`.
- **By feature**: choose conditions such as "type = vowel" or "voicing = voiced and manner = plosive". Members are computed from the inventory; while editing, **Refresh members from conditions** recomputes them.

Click a class card or **Edit** to open its form; **Add class** opens a new form. The name, members and feature conditions stay in a draft until you click **Done**. **Cancel** or Esc discards the draft, and cancelling a new class leaves no empty class behind. **Delete** removes a class immediately; **Undo** in the notification restores its complete contents. Read-only projects cannot add, edit or delete classes.

**Create C / V** builds the two basic classes by type with one click.

**Digraphs**: declare two letters such as `th` or `ng` as one unit, so rules match them as a single character and they are turned back into letters on output. The same table can also be edited in the rule list view of the Sound changes page.

Classes and digraphs are made available automatically to sound-change rule sets, orthography rules and script mapping rules. A class of the same name declared inside a rule text overrides the one defined here.

Keyboard `g` and IPA `ɡ` are equivalent in rules, transcription, search, segmentation and common word-form comparisons, including manually defined classes. If both occur as sources in a class or mapping, the first entry wins; numbered captures preserve the actual input glyph. Lemmas, phonemes, rule source and IDs are not rewritten, and class names and syntax remain distinct.

## 3. Orthography

A language can have several orthographies (a Latin romanisation, a Cyrillic transcription, a scholarly transcription…), one of which is the **primary orthography** — lemmas in the lexicon are entered in it. There is one button per orthography at the top; press one and drag it onto another to change their order.

Enter a spelling for a phoneme in the inspector, then select the same orthography on the **Orthography** tab. **Phoneme spelling entries** shows the generated rows. For example, entering `sh` for `ʃ` gives you `sh → ʃ`. Forward transcription accepts every listed spelling.

You can edit or disable an individual row. **Reset to automatic** makes it follow the phoneme again. The base entries use the longest matching spelling in a single pass, followed by the advanced spelling-to-IPA rules below. In older projects, you can preview existing spellings and choose **Generate from phoneme spellings** to enable them.

The regular Orthography page shows **Orthography → IPA** only. **Same pronunciation for upper/lower case** is on by default for both new and older projects: with `f > ɸ`, `Aufidel` and `aufidel` both give `auɸidel`. Turn it off to define uppercase and lowercase separately. The switch applies only to spelling input in this orthography; it does not rewrite lemmas, phonemes, sound-change rules or rule output.

- **Orthography → IPA**: produces the Pronunciation column in the lexicon, the corpus IPA and phrase pronunciations. When a piece of text contains several words (`A B`, a phrase), it is transcribed word by word, split at whitespace: the end of each word counts as a word end, so `_#` rules apply to every word, and commas or quotes at the edges of a word don't block word-final rules. Digraph symbols that are IPA already (the θ of `th|θ`, or a sound in the inventory) stay as they are in the resulting IPA instead of turning back into th.
Existing reverse entries and rules are preserved. In Phonotactics & generator, expand **Legacy IPA → spelling rules** to select any orthography by name, edit and test it. Viewing a different orthography does not change the primary orthography used for generation. IPA generation still uses the original rules; a new project does not need a separate reverse rule set.

The rule language is exactly the same as on the Sound changes page (see [Rule language](/cerf/qonlang/en/sound-changes/#rule-language)), with a **rule list** and a **source** view, and a try-out box in the inspector that shows results as you type words. Rules in the rule list can be **dragged** to another position or another stage (a gap opens where they will land). If you write `-* stage name` markers, the try-out results are shown per stage, just like the Sound changes test bench, with every cell centred. The rules can also contain a **stress rule** (`ˈ = …`, see [Stress rules](/cerf/qonlang/en/sound-changes/#stress-rules)): placed before the rules that turn accent marks into plain vowels, it makes the resulting IPA carry `ˈ`, shown in orange in the try-out, and Syllables & prosody follows that mark.

The try-out follows the setting immediately. Existing automatic pronunciations are recomputed lazily for the displayed entry card, inspector or corpus hover card; opening a project does not scan the lexicon or rewrite stored data. Pronunciation search, filters and sorting still use stored fields; use the button below to refresh the whole lexicon when needed. **Re-transcribe all entries** recomputes every entry of the current language from the primary orthography; pronunciations marked **irregular** in an entry are not overwritten.

## 4. Syllables & prosody

- **Syllabification**: two strategies. **Template** limits onset and coda lengths according to the structural template you write (e.g. `(C)(C)V(C)`); **Maximal onset** assigns as many consonants as possible to the onset of the following syllable. It can also be switched off (for isolating languages, or when a syllabary already carries the syllables).
- **Stress**: a fixed position (initial, second, final, penultimate, antepenultimate), weight-sensitive, marked per word, or a **Custom stress rule**: choosing it shows a form to edit the rule entry by entry — the word length (Any length / Exactly / At least), which syllable (Syllable no. / From the end, no. / First fitting from the start / First fitting from the end), what the nucleus must contain, the environment and an exception; when an entry doesn't fit, the next one is tried. Fill **Split at** with `·` to stress each part of a compound on its own, and choose whether **Main stress in** is the last part or the first. Below the form, the rule is shown as text — the same notation as the part after `=` in a [stress rule](/cerf/qonlang/en/sound-changes/#stress-rules) — and mistakes are listed underneath. **Notes / exceptions** is still a free-form note.
- **Tone**: a tone table (name, symbol, description). Tone letters are ignored during analysis, so they don't affect syllabification.

Type a few words into **Test** in the main area to see their syllables and stress. With **Input as** set to **Spelling** (the default), the input is first turned into IPA with the primary orthography and then syllabified — the th in `ce·theurian` is the single sound θ, so it comes out as `ˌke̞·ˈθɛʊ̯r.jän` rather than cet.heurian; with **IPA** the input is syllabified as written. Separators such as `·` and `-` split the word, each side is syllabified on its own, and they stay in the display; IPA that already carries `ˈ` (marked by orthography rules or typed by hand) keeps its marks, otherwise the stress setting above applies. Below that, the first dozen or so words of the lexicon are shown divided; their pronunciation is transcribed afresh with the primary orthography (irregular ones are used as they are), so changes to the orthography rules show up at once; entries with **Affects stress** ticked are stressed by their part of speech and special stress.

**Template lengths and onset lists**: a template such as `CVC` limits the maximum onset and coda lengths; it does not require every syllable to end in a consonant. With one consonant between vowels, the default division is `mexa → me.xa`, not `mex.a`. The template strategy no longer silently applies a word-generation onset list.

To add that restriction, tick **Also restrict onsets to the IPA phonotactics list**. This uses **Phonotactics & generator → IPA → Allowed onsets**; the separately saved Spelling list is not substituted, and an empty IPA list adds no restriction. For example, an explicit list containing only m, f and v makes `mexa` divide as `mex.a` while `mafa` divides as `ma.fa`. Add the intended IPA onsets or turn off this extra restriction if it does not express your language. The **Maximal onset** strategy retains its previous use of the IPA onset list.

If the template and whitelist cannot accommodate all the consonants between two nuclei, Qonlang preserves every segment and uses the longest allowed onset rather than forcing an onset outside the list or over its length limit. The preceding coda may then exceed its maximum; widen the template or adjust the lists to describe a legal division. The Phonology test and sound-change `σ`/stress rules use the same settings, and preserve length marks, tie bars, diacritics and stress marks.

In the custom stress rule form, ticking **Use the entry's special stress first (@)** at the top is the rule's `@`, each entry's **Part of speech** is `<part of speech>`, and **Unstressed** among the syllable choices is `0` (see [stress rules](/cerf/qonlang/en/sound-changes/#stress-rules)).

IPA length marks `ː` (long) and `ˑ` (half-long) stay with the preceding segment. If the base vowel is a syllable nucleus, its long and half-long forms can also be nuclei: for example, `aːhalur` can be divided as `aː.ha.lur`. An explicit consonant classification for the complete unit takes precedence. This comparison does not rewrite phonemes or characters in a word.

Adjacent independent vowels have separate nuclei. With only `a` declared, `aa` divides as `a.a` and `aaaa` as `a.a.a.a`. A template such as `(C)(C)V(C)(C)` limits onset and coda lengths; it does not automatically turn adjacent vowels into a diphthong. Declare a true diphthong or multiletter long vowel such as `ai` or `aa` as a complete phoneme, V-class member or **Phonotactics → IPA → Nuclei** item. These explicit units use longest matching from left to right: declaring `ai` allows `aia → ai.a`. Existing `aː`, `aˑ` and combining marks stay with their segments. An overlong consonant cluster does not create additional vowelless syllables; all segments remain, so review the template and onset/coda constraints when needed. Spelling tests first convert to IPA and then use the same division.

## 5. Phonotactics & generator

The phonotactics table describes legal syllables: **onsets**, **nuclei** and **codas** are each a list of allowed sequences (spelling or IPA, according to the selected mode), **illegal sequences** lists segments that must not occur, **weights** make some sequences more likely, and there are minimum / maximum syllable counts.

Choose **Spelling** or **IPA** first. Each mode stores its own lists; switching preserves the other list. Older projects keep their original IPA lists. Spelling mode generates written forms and transcribes them with the primary orthography, without reverse rules. IPA mode generates phonemes and still uses existing reverse rules. Without a spelling, **Add to lexicon** asks for the headword first, so IPA is not silently used as spelling.

**Fill from inventory** fills onsets and codas with consonants and nuclei with vowels. In IPA mode it uses phoneme symbols; in Spelling mode it uses their spellings in the primary orthography. Empty lists are filled directly; a list that already has content that differs from the inventory triggers a dialog asking whether to refill it — refilling brings back restrictions you removed on purpose, and can be undone. A toast at the bottom right says how many items went into each list, and also tells you when the lists already match the inventory. Consonant or vowel is decided in this order: features you set by hand on the phoneme, membership in a class named `C` / `V` (or 辅音 / 元音), then the IPA charts. Multi-letter spellings that aren't in the charts (`ng`, `aa`) are judged by the letters inside them, and a `g` typed on an ordinary keyboard counts as IPA `ɡ`. Phonemes that still can't be classified are left out and listed in the toast; give them a **type** in the inventory.

- **Check lexicon**: checks every word against the phonotactics and lists the violations with their reasons.
- **Generate**: generates N words (you can set the range of syllable counts). With **Learn from lexicon** ticked (the default; it needs at least 8 words of this language in the lexicon), it first learns from the existing words — how common each onset is word-initially and word-medially, each coda word-medially and word-finally, how many syllables words tend to have, and which sounds go together — then scatters a large number of candidates according to those frequencies, ranks them by how much they sound like the language, picks a set that don't resemble each other too much, and avoids forms that differ from an existing word by just one sound where possible. The top results sound the most natural; hover a result to see "Similar to: …", the closest existing words. Unticked, it generates from the phonotactics and weights only.
  Either way, the phonotactics are hard rules: every result is syllabified again and checked, so onsets, nuclei, codas, illegal sequences and syllable counts all conform; headwords that already exist are skipped. Spelling mode also shows the forward-derived IPA. IPA mode retains spellings produced by existing reverse rules. Each result has an **Add to lexicon** button, and everything can be copied at once.

## 6. Connections to other modules

| Defined here | Used by |
|---|---|
| Phonemes and features | Feature queries in classes, syllabification |
| Spelling per orthography | Syllabifying spelled input, counting sounds in paradigms, spelling → phonemes when there are no transcription rules |
| Classes, digraphs | Sound-change rules, orthography rules, script mapping rules (all can refer to them directly) |
| Orthography → IPA | Lexicon pronunciation column, corpus, phrasebook |
| Legacy IPA → spelling rules | Existing IPA-generation spellings and compatibility try-out |
| Phonotactics | Word generation and checks |

## 7. Common questions

- **The phonotactic check flags everything**: check the selected mode first. IPA lists check pronunciation after conversion with the primary orthography; Spelling lists check the headword directly. If you haven't written transcription rules yet, the check is comparing raw spellings.
- **Tone marks disturb syllabification**: add the tone letters to the tone table and they will be ignored during analysis.
- **A spelling like th is split into two sounds**: turn it into one sound in the orthography rules or as a digraph (`th > θ`, `th|θ`), or fill in th under the phoneme's **Spelling per orthography**; when testing, set **Input as** to Spelling.
- **A symbol should count as both consonant and vowel**: create a class just for it and refer to that class in the syllable template.
