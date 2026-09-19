---
layout: page
permalink: /cerf/qonlang/en/sound-changes/index.html
title: Qonlang · Sound changes
description: The Sound changes page in Qonlang — rule sets and their three views, stage snapshots bound to languages, the test bench with rule-by-rule traces, the complete rule language (syllable boundaries σ, stress rules, features), importing Yinbianji / Lexicanter / SCA² rules, and evolving the whole lexicon.
---

# Sound changes

[← Guide index](/cerf/qonlang/en/) · [中文](/cerf/qonlang/sound-changes/) · fourth item in the navigation bar

The Sound changes page manages **rule sets**. A rule set is a piece of rule text — class declarations, digraphs, stage snapshots and rules — applied from top to bottom. The same rule language is also used for orthography transcription, script mapping and the morphophonemic rules in paradigms, so the syntax described on this page applies throughout the app.

## 1. Rule sets

The tab bar at the top lists every rule set in the project; click to switch, and press and drag to reorder. **New rule set** creates an empty one; **Import** reads Yinbianji's three files, Lexicanter pronunciation rules, Zompist SCA² or plain text (see section 6); **Export** saves the current rule set, or saves every rule set as its own `.txt` in a folder. Rename, write notes or delete (undoable) in the inspector.

**Tab groups**: like tab groups in a browser, a group's tabs have a coloured group label in front of them; click the label to collapse or expand the group (a collapsed group still shows the tab you are on, and the label shows how many tabs it holds).

- Right-click a tab: **Move to group** (lists the existing groups), **New group…**, **Remove from group**. Dragging a tab onto a tab of another group also moves it into that group.
- Right-click a group label: **Rename**, a colour (Blue, Green, Purple, Orange, Red, Teal, Pink, Yellow, Grey), **Move group left** / **Move group right**, **New group…**, **Ungroup** (its tabs become ungrouped).
- Until you change anything, the app sorts rule sets into two groups by the languages their stages are bound to: **Synchronic** — every stage bound to one language (vowel harmony, written → spoken and the like), plus rule sets run by paradigm pipelines; **Diachronic** — stages bound to two or more languages (proto-language → daughter). The rest stay ungrouped. A rule set whose stages are all bound to different historical stages of one language (after [Merge into stages](/cerf/qonlang/en/languages/#merge-into-stages), say) counts as synchronic here; right-click to move it if you want it under diachronic.
- Groups are saved in the project; which groups are collapsed is remembered on this computer.

The rule **text itself is the single source of truth**; the three views are just different editors:

- **Rule list** (default): one card per rule, numbered from 1 (only rule lines are counted; comments and declarations don't take a number). Click a card to expand its form: target, replacement, several environments, exceptions and a comment. Above the cards is a panel for classes and digraphs where you can add and remove them directly; press a chip and drag it onto another to move that declaration line to its position. Selecting a rule makes the test bench show intermediate results "up to this rule", and the card plays a small animation of a sample word changing. Rule cards can be **dragged** into another stage or in front of another rule; while dragging, a dashed gap opens where the rule will land, and releasing inserts it there. Besides **Add rule** and **Add stage**, the end of each stage has **Add stress rule** and **Add feature** (sections 4.5 and 4.6): these two kinds of line are shaded cards, a stress rule reads as a sentence ("syllable 2 from the end (env _CC) else syllable 3 from the end"), and double-clicking opens a form to edit it entry by entry. Next to the classes and `@morphemes`, the form's **Click to insert a class** row also offers `σ`, `ˈ` and the features defined so far; when a project has many morphemes and the row grows past five lines, it scrolls inside its own box. Each stage (the `-*` line) has a fold triangle; a folded stage shows how many lines it has, and clicking it expands it again. With two or more stages, **Collapse all stages** / **Expand all stages** appears above. What's folded is remembered on this computer for each rule set.
- **Chain graph**: a mind-map of stages and rule chains; click a node to jump to it.
- **Source**: a text editor with line numbers and highlighting. Syntax errors are marked in red and warnings in yellow on each line, all diagnostics are listed at the bottom, and clicking a line number jumps there.

The status bar at the bottom shows the number of rules, stages, classes and diagnostics, plus **Export as text** and **Evolve lexicon**. The complete rule syntax is in section 4 of this page (the **User guide** button next to the title goes straight there).

## 2. Stage snapshots and language bindings

`-* name` records the word form **at the moment that line is reached** and gives it a name. The test bench shows one column per stage; **Languages for stages** in the inspector binds each stage to a language in the project. When the bound language has [historical stages](/cerf/qonlang/en/languages/#historical-stages), a second drop-down appears next to it for picking which stage of that language (**(any stage)** is allowed). Bindings are used for:

- The paradigm step that runs sound changes after concatenation can specify which stage to derive from and to.
- Lexicon evolution uses the language of the first bound stage as the default source and the last as the default target.
- When the rules are parsed, the classes and digraphs of the first bound language are used as the base.
- The **History** row on lexicon entry cards: when every stage marker from the language (or stage) of an entry's etymology source to the entry's own language (or stage) is bound, the card lists the forms all the way down (see [Lexicon · History](/cerf/qonlang/en/lexicon/#history)).

### Using a stretch of another set {#include}

When two sets share a stretch of history (two sister languages coming down the same proto stage), there is no need to copy the rules. Write one line:

```
-@ Proto → Aelith : Proto .. Modern
```

When the run reaches that line, the rules of that set between **Proto** and **Modern** run right there. The colon and the stages are optional (`-@ Proto → Aelith`), which runs the whole set.

- **The shared stretch is maintained in one place**: change it there and everything that uses it follows.
- Stages that come in this way count here too — the test bench gives them their own columns and **Language for each stage** in the inspector lists them; a stage with the same name as one of your own counts as the same stage.
- The set being used is parsed with **its own** bound language: classes and digraphs are its own and do not affect each other.
- In the rule list the line stands on its own, with **Open** on the right to jump to that set. A set may use another in turn (up to four levels); using each other in a circle, or a misspelt set name or stage, is reported on that line.

## 3. Test bench (inspector)

- **Words**: one per line (spaces also separate); saved with the rule set.
- **Results**: one row per word with a column per stage; cells that changed are highlighted. Click a row to see its **trace**: every rule that applied, the form before and after, and the stage it belongs to. Click a rule number to jump to that line in the editor.
- When the rule set has a stress rule, every column from that line on carries the stress marks, with `ˈ` shown in orange (secondary `ˌ` a little lighter); in the trace, the stress step is written `ˈ = …`.
- When a typed word matches an entry or morpheme with **Affects stress** ticked in the language of the rule set's first stage that is bound to a language (the current language when no stage is bound; hyphens at either end are ignored), stress rules use its part of speech and special stress (see [4.5](#stress-rules)).
- When a rule is selected in the list view, the results switch to the intermediate forms "up to rule n".

## 4. The rule language {#rule-language}

### 4.1 What a rule text can contain

```
; a semicolon starts a comment that runs to the end of the line; a # at the start of a line is also a comment (for old files)
V=aeiou                 ; single-letter class: members are split by character
{Vlong}=ā ē ī ō ū       ; long-named class: members separated by spaces or commas; with no separators, split by character
th|θ                    ; digraph: th is treated as one unit θ while matching, and turned back on output
[+asp] = ph th kh       ; feature: from this line on, rules can write [+asp] and [-asp]
ˈ = -2 / _CC , -3       ; stress rule: words reaching this line get stress marks
-* Proto                ; stage snapshot: record the current form under a name
a > e / _i              ; a rule
-* Modern
```

Rules are applied from top to bottom; each rule matches repeatedly from left to right across the whole word. Class and digraph declarations can appear anywhere and apply to the whole text; features and stress rules take effect from the line they are on. Classes and digraphs defined on the Phonology page are available automatically; a declaration with the same name in the text overrides them.

### 4.2 A rule

```
target > replacement / left0_right0 , left1_right1 , … - leftExc_rightExc , leftExc_rightExc …
```

| Part | Description |
|---|---|
| Target | May contain classes, ad-hoc classes `[abc]` and optional parts `()`. Empty means insertion |
| Replacement | May contain classes (including ad-hoc ones such as `[bdg]`); the first class in the target and the classes in the replacement correspond by position (`V > {Vlong}` turns the nth vowel into the nth long vowel). A numbered class such as `C1` outputs the sound matched by the same number. Empty means deletion. `\` is metathesis (more than two characters are reversed as a whole). `2` is gemination |
| Environment | `_` marks where the target is; left and right may be empty but `_` can't be left out. No `/` means any environment. Separate several environments with `,`; they are applied **one after another** (the second environment sees the word as already changed by the first) |
| Exception | Introduced by `-`; positions that match an exception are left unchanged. Separate several exceptions with `,`; a position matching any of them is left unchanged |

**Inside / outside the environment**: write one `?` in the target or replacement and the rule splits into two branches — what comes before `?` applies where the environment matches, what comes after it applies everywhere else.

| Notation | Meaning |
|---|---|
| `x > a?b / environment` | x becomes a where the environment matches, and b everywhere else (`p > b?f / V_V`: b between vowels, f elsewhere) |
| `x1?x2 > a?b / environment` | x1 becomes a where the environment matches; everywhere else, every x2 becomes b (`t?d > s?z / _i`) |
| `x1?x2 > a / environment` | x1 becomes a where it matches, x2 becomes a where it doesn't |

a and b can be any kind of replacement: class correspondence (`[ptk] > [bdg]?[fθx] / V_V`), `\` metathesis, `2` gemination, or empty for deletion; metathesis inside and gemination outside is written `\?2`. "Inside" means matching any one of the environments and not falling in an exception; every other position counts as outside. Both branches look at the word as it was before this rule and are applied in one go; where both branches match the same spot, the inside branch wins. Target and replacement can each contain only one `?`; a `?` inside an environment still means "anywhere in between". To write a literal question mark, use `\?`.

### 4.3 Symbols in environments

| Symbol | Meaning |
|---|---|
| `#` | Word start (on the left) or word end (on the right). The test bench, automatic pronunciation, lexicon evolution and script transliteration run word by word, split at whitespace, when the input contains spaces, so each word has its own start and end; when sound changes run inside a paradigm pipeline, the whole form counts as one word |
| `¢` | Word-internal compound boundary (just an ordinary symbol; delete it afterwards with `¢ > / _`) |
| `(x)` | Optional |
| `x\|y` | One of several, e.g. `#\|C_` |
| `?` | Anywhere in between: `_?m` means there is an m somewhere after (only in environments; a `?` in the target or replacement separates the inside / outside branches) |
| `[xyz]` | Ad-hoc class |
| `V`, `{Name}` | Class reference: any member of the class, each occurrence independent (`_CC` is any two consonants) |
| `C1`, `C2`, `V1`… | Numbered classes: **the same number within one rule means the same sound** (`_C1C1` is the same consonant doubled; `C1C2` are two consonants that may or may not be the same) |
| `@name` | Morpheme reference (by gloss, or by form without hyphens); its members are all of its allomorphs. `@name` can also be used in the replacement |
| `t.h` | A dot between two letters stops them being read as a digraph |
| `σ` | Syllable boundary: between two syllables, and also at the word edges and around separators such as `·` and `-` (4.4) |
| `ˈ`, `ˌ` | The start of the stressed / secondary-stressed syllable; a stress rule has to mark it first (4.5) |
| `[+asp]`, `[+voice -nasal]` | Feature: any sound with / without it; several in one bracket intersect (4.6) |
| `\?`, `\.`, `\#`, `\C`, `\σ`… | A backslash followed by a symbol means that character itself — not a rule symbol and not a class (`\? > ⸮`; the Greek letter itself is `\σ`); a lone `\` in the replacement is still metathesis |

Characters without special meaning in environments go straight into the regular expression, so things like `|` can be used directly; conversely, put a backslash in front of `+`, `*` and similar characters to match them literally (`\+`, `\*`).

A one-page summary of the rule syntax is always available inside the app: **Rule syntax** on the start page, or the open-book icon at the top right of the top bar (between the inspector toggle and Close project), opens it in the inspector; opened from the Sound changes, Paradigms, Script, Phonology or Morphemes page, it scrolls straight to the relevant section.

### 4.4 Syllable boundaries σ {#syllables}

`σ` in a rule means "a syllable boundary is here". The word is split into syllables before matching, and σ matches between two syllables; the start and end of the word and both sides of separators such as `·` `-` `‿` `=` count too. Parts of the rule without σ match as usual, regardless of syllables.

Syllables follow the language's settings on the Phonology page (Syllables & prosody, Phonotactics): nuclei are vowel phonemes, a class named `V` or the phonotactic nuclei (a `V` defined in the rule text counts too), and consonants go to the onset of the next syllable as far as the legal-onset list and the syllable template allow. Digraphs and multi-letter phonemes (`ts`, `aɪ̯`) count as one sound; letters the inventory doesn't know are judged vowel or not by the IPA chart, so syllables work even halfway through orthography rules while a word is still spelled.

| Notation | Meaning |
|---|---|
| `d > t / _σ` | devoice a syllable-final d (the word end is syllable-final too): ad.ma → at.ma |
| `k > g / σ_` | voice a syllable-initial k |
| `V > Vː / _σ` | lengthen vowels in open syllables |
| `> ə / Cσ_C` | insert ə between consonants of two syllables: ak.ta → akəta |
| `a > e / σC_Cσ` | a in a closed CVC syllable |

Syllables follow the word as it is at that rule: when earlier rules change the word, later σ rules split it again. For the Greek letter σ itself, write `\σ`.

### 4.5 Stress rules {#stress-rules}

A line `ˈ = entry , entry , …` is a stress rule: when a word reaches it, one syllable is picked by the entries and marked with `ˈ` in front. The mark travels with the word — later rules match as usual, even with a `ˈ` between two sounds, and a `ˈ` inside a replaced stretch is put back where it was — until the next stress rule marks the word again. `'` works if you can't type `ˈ`; `ˌ = …` marks secondary stress; `ˈ =` with nothing after it removes stress.

Entries are tried from left to right; the first that fits wins. An entry is `<part of speech> (syllables) position nucleus / environment - exclusion`, where everything but the position may be left out:

| Part | Notation | Meaning |
|---|---|---|
| Part of speech | `<noun>`, `<noun\|adjective>`, `<!verb>` | only for words of these parts of speech; a leading `!` means "not these". Only entries and morphemes with **Affects stress → Pass part of speech** ticked carry a part of speech — words without one skip the entry |
| Syllables | `(2)`, `(3+)` | only for words of exactly 2 / at least 3 syllables |
| Position | `1`, `2`, `-1`, `-2`, `-3` | which syllable; negative counts from the end |
| | `*`, `-*` | the first syllable from the start / from the end that fits the conditions |
| | `0` | unstressed |
| Nucleus | `{long}`, `[áé]` | the syllable's nucleus contains it |
| Environment | `/ _CC` | `_` is the nucleus: followed by two consonants (across the syllable boundary too) |
| Exclusion | `- #_` | not when the exclusion matches |

An entry without conditions falls back to the nearest end in short words (the "third-to-last syllable" of a monosyllable is that syllable); an entry with conditions is skipped when the word has no such position. End the rule with `| separators part` to split the word at those separators and stress each part on its own, with the primary stress on the given part (`1` the first, `-1` the last) and secondary stress on the others.

A lone `@` entry (usually written first) is **the entry's own special stress**: for words whose entry or morpheme has **Affects stress → Pass special stress** ticked, the whole word is stressed on the syllable chosen there (or left unmarked with **Unstressed**), and the other entries are skipped; other words go on to the next entry. The part of speech and special stress travel along in automatic pronunciation, lexicon evolution, the sound-change step of paradigms, the Phonology page's samples and the test bench. When a paradigm adds an affix, the special stress stays on the same syllable; a morpheme with its own special stress moves the stress onto that affix, and a morpheme with **Counts as** set makes the whole word count as that part of speech.

| Stress wanted | Rule |
|---|---|
| the penult | `ˈ = -2` |
| Latin-style: the penult if it is heavy, otherwise the antepenult | `ˈ = -2 {long} , -2 / _CC , -3` |
| the leftmost long vowel, otherwise the first syllable | `ˈ = * {long} , 1` |
| each word of a compound on its own, main stress on the last word | `ˈ = -2 , -1 \| · -1` |
| secondary stress on the first syllable of long words | a separate line `ˌ = (4+) 1` |
| verbs stressed on the last syllable, everything else on the penult | `ˈ = <verb> -1 , -2` |
| pronouns and particles unstressed | `ˈ = <pronoun\|particle> 0 , 1` |
| a few words with irregular stress | tick **Affects stress → Pass special stress** on the entry and pick the syllable, then write `ˈ = @ , -2` |

Using stress in rules: `ˈ` matches the start of the stressed syllable. `a > aː / ˈ(C)(C)_` lengthens a in the stressed syllable, and `V > ə / σ(C)(C)_ - ˈ(C)(C)_` reduces vowels of unstressed syllables.

When the stress position on the Phonology page's Syllables & prosody is set to **Custom stress rule**, what you write there is the part after `=` (see [Phonology](/cerf/qonlang/en/phonology/)).

### 4.6 Features {#features}

A line `[+name] = member member …` defines a feature; members are separated by spaces (`ph` is one member). From that line on, `[+name]` in a rule means "any sound with this feature" and `[-name]` any sound without it.

| Notation | Meaning |
|---|---|
| `[+asp] = ph th kh` | define "aspirated" |
| `[-asp] = p t k` | you may also list the sounds without it; if you don't, `[-asp]` means any sound other than the aspirates |
| `a > e / [+asp]_#` | a final a after an aspirate becomes e |
| `[+asp] > [-asp] / _C` | an aspirate before a consonant becomes the matching plain stop (both sides listed, mapped by position) |
| `i > / [+voice -nasal]_#` | several features in one bracket intersect |

Features differ from classes in scope: a class holds for the whole rule text, while a feature **takes effect from its line** and can be redefined further down — say a change turns ph into f; add a line `[+asp] = th kh` after it. A bracket is a feature only when it holds `+name` / `-name`; `[ptk]`, `[^aeiou]` and `[a-z]` are still ad-hoc classes.

### 4.7 Example

```
V=aeiou
{Vlong}=ā ē ī ō ū
C=ptkbdgmnlrsh
-* Proto
e > a / _h , h_          ; e becomes a next to h
V > {Vlong} / _#          ; word-final vowels lengthen
h > / V_V                 ; h is lost between vowels
> e / #_[nm]C             ; e is inserted before a word-initial nasal + consonant
bm > \ / _                ; bm metathesises to mb
p > pp / V_V - _#         ; p doubles between vowels, but not word-finally
[+voice] = b d g
[-voice] = p t k
ˈ = -2 {Vlong} , -2 / _CC , -3   ; Latin-style stress; later forms carry ˈ
[+voice] > [-voice] / _σ   ; syllable-final voiced stops devoice
V > ə / σ(C)(C)_ - ˈ(C)(C)_   ; unstressed vowels reduce
-* Modern
```

### 4.8 Common patterns

| Goal | Rule |
|---|---|
| Drop word-final vowels | `V > / _#` |
| Voice voiceless stops between vowels | `[ptk] > [bdg] / V_V` (ad-hoc classes correspond by position) |
| Front / back vowel harmony | Define `Back=aou` and `Front=eöü` first, then write `A > a / Back?_` and `A > e / Front?_` (`A` is an archiphoneme placeholder) |
| Simplify double consonants | `C1C1 > C1` |
| Delete morpheme boundary marks | `¢ > / _` at the end of the rule set |
| Consonant alternation in a particular suffix | `@lar > @ler / Front?_` (the two morphemes' allomorphs correspond by position) |
| Only after a certain stage | Write the rule after the corresponding `-*` marker |
| Syllable-final devoicing | `[bdg] > [ptk] / _σ` |
| Lengthen vowels in open syllables | `V > Vː / _σ` |
| Reduce unstressed vowels | Write a stress rule first (e.g. `ˈ = -2`), then `V > ə / σ(C)(C)_ - ˈ(C)(C)_` |
| a after an aspirate becomes e | First `[+asp] = ph th kh`, then `a > e / [+asp]_` |

## 5. Diagnostics

An undefined class produces a **warning** and is treated as literal characters; referring to a feature that isn't defined yet also warns, and that spot matches nothing; a missing `>`, an environment without `_`, a stress-rule entry that doesn't start with a position and the like produce an **error**, and the line is skipped. Diagnostics are shown line by line in the source view and listed at the bottom; when there are errors, the status bar shows a red count.

## 6. Importing other formats

| Source | Conversion |
|---|---|
| Yinbianji `Category.txt / Replace.txt / Rule.txt` | The three files are concatenated; the semantics are identical (guarded by a regression test comparing the lexicon output of 236 rules word by word) |
| Lexicanter pronunciation rules | `{a,b}` unions → `[ab]`; `^` → `#`; `∅` → empty |
| Zompist SCA² | `target/replacement/environment/exception` → `target > replacement / environment - exception`; `*` → `?` |
| Plain text | Used as-is as a new rule set |

After picking the files, you first confirm the rule set name and file format in the import panel in the main area (you can change the format if it was guessed wrong), while the inspector shows the converted rule text. Changing the format re-converts immediately, and changed lines are highlighted and then fade. The rule set is only created when you click **Import**.

## 7. Evolving the lexicon

The **Evolve lexicon** button at the bottom opens a panel that runs **every entry of the source language** through the current rule set into the **target language**, creating etymology links automatically. Headwords containing spaces are evolved word by word (just like the test bench); the `ˈ` marks added by stress rules in the rule set are not carried into the new headwords.

| Option | Description |
|---|---|
| Source language / Target language | Default to the first and last stages that are bound to a language |
| Start stage / Stop stage | If the input is already in the form of the start stage, the rules before it are skipped; derivation stops at the stop stage |
| Input field | The headword, a stem slot, or **the source language's morpheme list** (use this when the root list lives on the Morphemes page) |
| Part of speech | Only process one part of speech |
| Copy senses and tags | New words take the source word's definitions |
| Update lemmas of derived words | When re-running after changing rules, only update the headwords instead of creating duplicates |
| Create even when the lemma collides | Words in the target language with the same spelling but no etymology link are skipped by default |

The workflow is **Preview** (a table listing input, output, the existing word in the target language, and the action: create / update / unchanged / skip) → **Write to target**. New words get the etymology type "inherited (sound change)", with their source pointing to the source entry or morpheme; the input form is recorded, and the notes carry the rule set's name. The whole inheritance chain then shows up in the lexicon's relation graph.

## 8. Connections to other modules

- Classes and digraphs can come from the Phonology page; `@morpheme` references come from the Morphemes page.
- Once stages are bound to languages, both the paradigm step that runs sound changes and lexicon evolution use them.
- Orthography rules and script mapping rules use the same syntax but are stored separately.
