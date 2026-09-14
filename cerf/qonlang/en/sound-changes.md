---
layout: page
permalink: /cerf/qonlang/en/sound-changes/index.html
title: Qonlang · Sound changes
description: The Sound changes page in Qonlang — rule sets and their three views, stage snapshots bound to languages, the test bench with rule-by-rule traces, the complete rule language, importing Yinbianji / Lexicanter / SCA² rules, and evolving the whole lexicon.
---

# Sound changes

[← Guide index](/cerf/qonlang/en/) · [中文](/cerf/qonlang/sound-changes/) · fourth item in the navigation bar

The Sound changes page manages **rule sets**. A rule set is a piece of rule text — class declarations, digraphs, stage snapshots and rules — applied from top to bottom. The same rule language is also used for orthography transcription, script mapping and the morphophonemic rules in paradigms, so the syntax described on this page applies throughout the app.

## 1. Rule sets

The tab bar at the top lists every rule set in the project; click to switch, and press and drag to reorder. **New rule set** creates an empty one; **Import** reads Yinbianji's three files, Lexicanter pronunciation rules, Zompist SCA² or plain text (see section 6); **Export** saves the current rule set, or saves every rule set as its own `.txt` in a folder. Rename, write notes or delete (undoable) in the inspector.

The rule **text itself is the single source of truth**; the three views are just different editors:

- **Rule list** (default): one card per rule, numbered from 1 (only rule lines are counted; comments and declarations don't take a number). Click a card to expand its form: target, replacement, several environments, exceptions and a comment. Above the cards is a panel for classes and digraphs where you can add and remove them directly; press a chip and drag it onto another to move that declaration line to its position. Selecting a rule makes the test bench show intermediate results "up to this rule", and the card plays a small animation of a sample word changing. Rule cards can be **dragged** into another stage or in front of another rule; while dragging, a dashed gap opens where the rule will land, and releasing inserts it there.
- **Chain graph**: a mind-map of stages and rule chains; click a node to jump to it.
- **Source**: a text editor with line numbers and highlighting. Syntax errors are marked in red and warnings in yellow on each line, all diagnostics are listed at the bottom, and clicking a line number jumps there.

The status bar at the bottom shows the number of rules, stages, classes and diagnostics, plus **Export as text** and **Evolve lexicon**. The complete rule syntax is in section 4 of this page (the **User guide** button next to the title goes straight there).

## 2. Stage snapshots and language bindings

`-* name` records the word form **at the moment that line is reached** and gives it a name. The test bench shows one column per stage; **Languages for stages** in the inspector binds each stage to a language in the project. Bindings are used for:

- The paradigm step that runs sound changes after concatenation can specify which stage to derive from and to.
- Lexicon evolution uses the language of the first bound stage as the default source and the last as the default target.
- When the rules are parsed, the classes and digraphs of the first bound language are used as the base.

## 3. Test bench (inspector)

- **Words**: one per line (spaces also separate); saved with the rule set.
- **Results**: one row per word with a column per stage; cells that changed are highlighted. Click a row to see its **trace**: every rule that applied, the form before and after, and the stage it belongs to. Click a rule number to jump to that line in the editor.
- When a rule is selected in the list view, the results switch to the intermediate forms "up to rule n".

## 4. The rule language {#rule-language}

### 4.1 What a rule text can contain

```
; a semicolon starts a comment that runs to the end of the line; a # at the start of a line is also a comment (for old files)
V=aeiou                 ; single-letter class: members are split by character
{Vlong}=ā ē ī ō ū       ; long-named class: members separated by spaces or commas; with no separators, split by character
th|θ                    ; digraph: th is treated as one unit θ while matching, and turned back on output
-* Proto                ; stage snapshot: record the current form under a name
a > e / _i              ; a rule
-* Modern
```

Rules are applied from top to bottom; each rule matches repeatedly from left to right across the whole word. Class and digraph declarations can appear anywhere and apply to the whole text. Classes and digraphs defined on the Phonology page are available automatically; a declaration with the same name in the text overrides them.

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
| `\?`, `\.`, `\#`, `\C`… | A backslash followed by a symbol means that character itself — not a rule symbol and not a class (`\? > ⸮`); a lone `\` in the replacement is still metathesis |

Characters without special meaning in environments go straight into the regular expression, so things like `|` can be used directly; conversely, put a backslash in front of `+`, `*` and similar characters to match them literally (`\+`, `\*`).

A one-page summary of the rule syntax is always available inside the app: **Rule syntax** on the start page, or the open-book icon at the top right of the top bar (between the inspector toggle and Close project), opens it in the inspector; opened from the Sound changes, Paradigms, Script, Phonology or Morphemes page, it scrolls straight to the relevant section.

### 4.4 Example

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
-* Modern
```

### 4.5 Common patterns

| Goal | Rule |
|---|---|
| Drop word-final vowels | `V > / _#` |
| Voice voiceless stops between vowels | `[ptk] > [bdg] / V_V` (ad-hoc classes correspond by position) |
| Front / back vowel harmony | Define `Back=aou` and `Front=eöü` first, then write `A > a / Back?_` and `A > e / Front?_` (`A` is an archiphoneme placeholder) |
| Simplify double consonants | `C1C1 > C1` |
| Delete morpheme boundary marks | `¢ > / _` at the end of the rule set |
| Consonant alternation in a particular suffix | `@lar > @ler / Front?_` (the two morphemes' allomorphs correspond by position) |
| Only after a certain stage | Write the rule after the corresponding `-*` marker |

## 5. Diagnostics

An undefined class produces a **warning** and is treated as literal characters; a missing `>`, an environment without `_` and the like produce an **error**, and the line is skipped. Diagnostics are shown line by line in the source view and listed at the bottom; when there are errors, the status bar shows a red count.

## 6. Importing other formats

| Source | Conversion |
|---|---|
| Yinbianji `Category.txt / Replace.txt / Rule.txt` | The three files are concatenated; the semantics are identical (guarded by a regression test comparing the lexicon output of 236 rules word by word) |
| Lexicanter pronunciation rules | `{a,b}` unions → `[ab]`; `^` → `#`; `∅` → empty |
| Zompist SCA² | `target/replacement/environment/exception` → `target > replacement / environment - exception`; `*` → `?` |
| Plain text | Used as-is as a new rule set |

After picking the files, you first confirm the rule set name and file format in the import panel in the main area (you can change the format if it was guessed wrong), while the inspector shows the converted rule text. Changing the format re-converts immediately, and changed lines are highlighted and then fade. The rule set is only created when you click **Import**.

## 7. Evolving the lexicon

The **Evolve lexicon** button at the bottom opens a panel that runs **every entry of the source language** through the current rule set into the **target language**, creating etymology links automatically. Headwords containing spaces are evolved word by word (just like the test bench).

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
