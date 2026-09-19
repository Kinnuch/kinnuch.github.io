---
layout: page
permalink: /cerf/qonlang/en/paradigms/index.html
title: Qonlang · Paradigms
description: The Paradigms page in Qonlang — combining grammatical dimensions into slots, locking and filtering dimensions, simple and complex mode, pipeline steps, letters that change by condition, adjustments and infix positions, variants, @morpheme allomorphs, paradigm inheritance, several paradigms per part of speech, slots based on other slots and slots that affect pronunciation, the test bench, writing derived forms and reconciliation.
---

# Paradigms

[← Guide index](/cerf/qonlang/en/) · [中文](/cerf/qonlang/paradigms/) · seventh item in the navigation bar

A paradigm combines **grammatical dimensions** into **slots** and gives each slot a **generator**, so every inflected form can be derived from the stem automatically. Inflection, agglutination, templatic alternation and reduplication can all be expressed; a language without inflection can ignore this page entirely.

## 1. Structure {#1-structure}

- **Dimensions** are the categories a word changes for — number, case, tense — and are defined on the lexicon's **Parts of speech & dimensions** sub-page.
- A paradigm picks some dimensions and combines their values into slots: `sg.nom`, `sg.acc`, `pl.nom`… A slot label is its value names joined with `.`, and is also the key in an entry's `forms`. The order of the dimension chips decides which comes first in slot names (and which forms the rows or columns of the table); move a chip with its arrows, or press and drag it onto another chip. A slot is identified by its **combination of values**, not by the order of dimensions: reordering dimensions, removing a dimension and adding it back, or inheriting between paradigms whose dimensions are in different orders keeps every slot's generator, variants and disabled state; inflected forms stored under slot names in the lexicon move to the new names. Projects from older versions are converted automatically when opened.
- The number of slots is the product of the number of values in each dimension, so it grows quickly: when it would exceed 500, a dialog warns you before the dimension is added (you can still add it), and the slot summary turns to a warning colour. With too many slots, the Paradigms page, derivation and entry editing all slow down.
- Slots you don't need can be **disabled**.
- A paradigm can **inherit** from another: the child only defines the slots that differ and takes the rest from the parent.
- Once a part of speech is bound to a paradigm, its entries get a slot panel in the lexicon's Edit mode; a single entry can also name a different paradigm.
- **A part of speech can be bound to several paradigms** (say, a verb's first and second conjugations): tick them under **Bound parts of speech** in the inspector. The first one bound is the default, used by entries that haven't chosen a paradigm; the other paradigms' rows offer **Make default**, and unticked parts of speech show in small print which paradigms they are already bound to. An entry chooses its paradigm in the Edit mode drop-down (where "paradigms of this part of speech" form their own group); the test bench first lists the words currently using this paradigm, then those whose part of speech is bound to it but haven't switched to it.
- Each paradigm is a tab at the top, and tabs can be **grouped** just like the tab groups in [Sound changes · Rule sets](/cerf/qonlang/en/sound-changes/#1-rule-sets) (click a group label to collapse or expand it; right-click a tab or a group label to move, rename or recolour). Until you change anything, they are grouped by part of speech: every part of speech bound to a paradigm gets a group named after it (a paradigm bound to several goes into the first); paradigms bound to nothing (such as ones that apply to all words) stay ungrouped.

### Dimensions editable / locked {#lock-dims}

The button to the right of the **Dimensions** title switches between two states:

- **Dimensions editable** (default): clicking a dimension really adds it to this paradigm, clicking it again removes it, and the slots are recomputed.
- **Dimensions locked**: the current slots are fixed (shaded), and clicking dimensions no longer changes which slots the paradigm has. Clicking a dimension now only **filters** which slots you see — those that use that dimension. The dimensions the paradigm itself uses can be clicked too: once locked they are shaded darker and carry a small padlock, so they stand apart from the unused ones, and clicking one filters by it just the same (the up / down arrows on the chip still reorder them). Once you have filtered, **Clear filter**, **Enable the filtered slots** and **Disable the filtered slots** appear after the chips and switch a whole batch at once. The line under the dimensions says how many slots are shown and how many are fixed in total.

### A slot with a setup stays a slot {#kept-slots}

A slot is identified by **which values it takes**, so a slot you wrote something in doesn't disappear when you change the dimensions: reorder them, or remove a dimension and add it back, and everything written in those cells is still there and still counts in derivation, the test bench and entries. Slots with one dimension **more** than the current grid live alongside it too — `tense.aspect.person` and `tense.aspect` both stay, listed after the slots the grid produces; the table and tree views only lay out the current grid, so use the visual view to reach them.

Slots with one dimension **fewer** than the current grid (the old cells left behind after you add a dimension) are the other way round: in simple mode they are **no longer listed on their own**. The list is exactly the full grid of the new dimensions, and the old setup lives on as an [inherited](#simple-mode) source — every cell that follows it is marked **Inherited from …**, and **Make it this cell's own** next to it copies that setup into the cell. In complex mode they keep a row of their own.

### Simple and complex mode {#simple-mode}

**Complex mode: slots with more dimensions stand on their own** in **Settings → Current project → Paradigms** is off by default, which is **simple mode**:

- In simple mode, a slot with more dimensions (`polarity.tense.person`) that has no setup of its own continues from the slot with fewer (`polarity.tense`) — dimensions are dropped one by one from the end, in the paradigm's dimension order, and the first slot found with a setup is used; letters that change by condition and allomorphs still follow **this slot's own** values.
- With complex mode ticked, each slot stands alone: a slot with more dimensions and no setup produces no form.

The point is to write the shared part once: only fill in the cells that really differ and leave the rest empty. The verb of the example project Aelith is written this way — the third person has no person suffix, so those cells are simply left empty and continue from the `polarity.tense` slots.

## 2. Main area: the slot table

To the right of the **Slots** title you can switch between three views:

- **Visual** (default): one row per slot — enabled checkbox, slot name, gloss abbreviation, generator and pipeline — edited right in the row. The triangle at the start of each row collapses it to one line (slot name, gloss, and small print on how the cell is built — click the small print to expand it); **Collapse all / Expand all** to the right of the **Slots** title does every slot at once. What's collapsed is remembered on this computer, and a cell clicked in the table or tree view is expanded when you land on it. Under the generator drop-down are two small buttons, **Copy this slot's setup** and **Paste into this slot (replaces its setup)**: when several slots are built much the same way, copy one over and adjust it (see [section 3](#3-variants) for the clipboard). When the generator is **Pipeline + affects pronunciation**, a second, pronunciation pipeline sits under the spelling one (see [Affects pronunciation](#slot-pron)).
  - **Double-click a slot name** — or use the small arrow (**Move to another slot**) that appears next to the name when the mouse is over the row — when a setup ended up in the wrong slot: a **Move the setup of "…" to…** dialog opens, with a search box for slot names or abbreviations and a list of the other slots, where slots that already have one are marked **has a setup**. Click one to move this slot's setup (in the variant you are viewing) there, and this slot goes back to **None**. If the target already has a setup you are asked whether to replace it; Ctrl+Z undoes the move. A slot with no setup only shows a hint.
- **Table**: the first dimension forms the rows and the second the columns; from a third dimension on, each of its values (each combination, with more dimensions) gets its own table, labelled above it. With a single dimension it is one column.
- **Tree**: branches level by level in dimension order, with slots at the last level; click a branch point to collapse or expand it (with more than 200 slots, branches start collapsed and only the ones you open are drawn).

Each cell of the table and tree shows what the **test bench** word becomes (change the word in the inspector's test bench; with no word there, the cell only shows how it is built), with small print explaining how the cell is built — the affix of each step, which rule set runs, the first line of an adjustment, and "⟨stem name⟩" when the stem isn't the headword. A form that doesn't match the one typed in the entry is shown in red, disabled cells say **Off**, and cells filtered out by the top-bar search are faded. Click any cell to return to the visual view, which scrolls to that cell and flashes it.

## 3. Variants

When a slot has two parallel forms (colloquial / literary, form A / form B), you don't need a whole new paradigm:

1. Create a variant in the **Variants** bar above the slot table and name it. A new variant starts as a copy of **the set you are looking at** (inherited slots stay inherited), so you only change what differs.
2. With that variant selected, edit slots — **only the slots you change belong to the variant**; the rest follow the base set.
3. An entry can choose which variant to use; switching recomputes the derived forms and leaves hand-typed ones alone.
4. Hovering a variant button shows a **pencil** on its right: click it to rename in place. With no variant selected you rename the base set (called **Base** by default — you might rename it "written"); entries' variant drop-downs show the new name, and clearing the name brings back **Base**.
5. **Copy set** in the **Variants** bar copies the setup each slot actually uses in the set you are viewing (a variant's unchanged slots take the base set's); **Paste into set** pastes into the set you are viewing: slots with the same name are replaced, slots that don't exist here (different dimensions) are skipped, and a toast says how many were pasted.

Copying a slot or a whole set also puts it on the system clipboard, so you can paste it into a paradigm in another window or another project. Copying is refused in read-only projects.

## 4. The pipeline: start from the stem and add step by step

Each slot's generator is a **pipeline**: it starts with the stem (or [another slot](#slot-base)), and you add whatever steps you need; each step acts on the result of the previous one. Change the order with the left / right arrows on a step, or press a step (not on an input) and drag it onto another step. The **Add step** menu closes a moment after the mouse leaves it, or when you press Esc.

```
stem[strong] → prefix @DEF → suffix -s → sound change (Proto-Shikrin → Theusrin) → tweak -at
```

Available steps:

| Step | Description |
|---|---|
| **prefix / suffix** | Write the form literally, or write `@morpheme` to refer to the morpheme list (an allomorph is picked automatically by environment) |
| **infix** | A form + an insertion position (see below for the notation) |
| **circumfix** | Both halves added together, e.g. `a-` … `-ot` |
| **pattern** | Root–pattern alternation such as `C1aC2aC3` or `maCCuC` |
| **reduplication** | Whole stem / initial part / final part, with a number of segments (counted in the spelling: a phoneme spelled th or eu in the primary orthography is one sound; infix positions and patterns count the same way) |
| **sound change** | Choose a rule set and start / end stages and run the current form through it |
| **tweak** | One small operation per line (notation below) |
| **paradigm** | A paradigm inside a paradigm: treat the form so far as a stem and run it through one slot of another paradigm (optionally a variant; the first entry in the variant drop-down is that paradigm's set with no variant chosen, under its own name — **Base** unless it was renamed). For example, add `-mAk` for a gerund, then run the result through the genitive of the Noun paradigm. Stem slots written in the nested paradigm all fall back to this form, and conditional letters still follow this entry's own features; nesting stops after 4 levels, including when a paradigm leads back to itself |

The same kind of step can appear several times: add a prefix, run sound changes, add a suffix, then tweak — any order you like. The generator drop-down has four entries: **None** (not derived), **Table (manual)** (typed per word), **Pipeline** (this pipeline) and **Pipeline + affects pronunciation** (this pipeline plus a second one that changes the pronunciation, see [Affects pronunciation](#slot-pron)).

> The four older generator kinds — affixation, affixation + sound changes, pattern and reduplication — are converted to equivalent pipelines automatically when an old project is opened; derived results don't change.

### Start point: the stem or another slot {#slot-base}

The first box of the pipeline is a drop-down: choose **Stem** to type the stem next to it as before, or choose **Based on** a slot — another slot of this paradigm (the **This paradigm** group) or a slot of another paradigm (grouped by paradigm name). The pipeline then starts from the form that slot produces for the same entry, and the steps you add carry on from there; when that slot's setup changes, this one follows.

- For example, `sbjv.prs.3sg` differs from `sbjv.prs.1sg` only by one suffix: choose **Based on sbjv.prs.1sg** as the start and add one suffix step.
- If that slot was changed by hand on the entry (overridden), the hand-typed form is used; if that slot is a table or has no generator, the form stored on the entry is used; with neither, it falls back to the stem.
- The small print on how the slot is built says **based on "sbjv.prs.1sg"**.
- Slots based on slots stop after 4 levels.

### Affects pronunciation {#slot-pron}

Choosing the generator **Pipeline + affects pronunciation** (it used to be a separate checkbox) adds a second pipeline under the spelling pipeline, and this one changes the pronunciation (the orthography-based IPA):

- It starts with a **Pron.** drop-down: **This form → IPA** is this slot's derived spelling converted by the primary orthography's to-IPA rules; **Entry pronunciation** is the entry's own pronunciation.
- Add steps as usual — every kind except **paradigm** (for example a tweak `d > ð / V_V`).
- When deriving, the result is stored as the form's pronunciation and shown after the form on the entry card (see [Lexicon · Inflected forms and paradigms](/cerf/qonlang/en/lexicon/#5-inflected-forms-and-paradigms)).
- Switching back to **Pipeline** hides it and stops deriving the pronunciation; the steps you wrote are kept and come back if you switch again.

## 5. Notation quick reference

### 5.1 Prefixes and suffixes

| Notation | Meaning |
|---|---|
| `-lar` | A literal suffix; `-` and `=` at the edges are removed |
| `@PL` | Refers to a morpheme (matched by form or gloss) and picks an allomorph by its environment |
| `@DEF·` / `@DEF ` | A middle dot or space written after the reference is attached as-is (`@DEF·` + derg → `sa·derg`); the same goes for one written before the @ |
| `@mo ` | If no morpheme has this name, an entry with that headword is used; failing both, it is attached literally; a trailing space or middle dot is still kept |
| `ė ` / `an·` | **Spaces and middle dots are kept as-is**: the prefix `ė ` gives `ė derg`, `an·` gives `an·derg` |
| empty | The step adds nothing (a cell containing only whitespace counts as empty) |

**Letters that change by condition**: in prefixes, suffixes, infixes, circumfixes and tweaks, write `{condition:form|condition:form|default}`; during derivation one branch is chosen for this entry and this cell, and everything else stays the same. A condition is a dimension value's name or abbreviation; both the entry's own grammatical features (gender, noun class and other things that aren't paradigm dimensions) and this cell's dimension values count, with the cell taking precedence for the same dimension:

| Notation | Meaning |
|---|---|
| `-{F:g\|k}A` | g when the entry is feminine, otherwise k (the dative in the Aelith example: sila → silaga, kaso → kasoka) |
| `{gender=F:a\|o}` | Name the dimension when two dimensions have a value with the same name |
| `{M,N:o\|a}` | Comma: matching any one is enough |
| `{F+PL:ae\|F:a\|o}` | Plus: all must match; the first branch from the left that matches wins |
| `-{M:s}` | With no default branch and nothing matching, this part is empty |

Steps that use such affixes list every possible choice in small print beside them, and the derivation trace says which branch this word took; when the corpus segments words, every choice is tried as an affix to strip.

### 5.2 Infix positions

The second box of an infix step is the insertion position; empty means `V1`:

| Notation | Meaning |
|---|---|
| `V1` | After the first vowel |
| `C1` | After the first consonant |
| `C2` / `V2` | After the second consonant / vowel |
| `C-1` | After the **last** consonant (negative numbers count from the end) |
| `<C-1` | **Before** the last consonant (a leading `<` inserts before it) |
| `<V-1` | Before the last vowel |
| `2` | After the 2nd segment (a plain number is an absolute position) |
| `-1` | Before the last segment |

Segments are split using the language's phoneme inventory and digraphs, so `th`, `ng` and the like count as one segment.

### 5.3 Tweaks

A tweak step holds one operation per line, applied in order:

| Notation | Meaning |
|---|---|
| `-at` | Remove `at` from the end |
| `+u` | Append `u` |
| `^-e` | Remove `e` from the start |
| `^+a` | Prepend `a` |
| A line containing `>` | Interpreted as a rule, e.g. `a > e / _#`, `w > / i_#` |

A tweak takes effect wherever it sits in the pipeline — to tidy up a word ending before sound changes run, put the tweak before the sound-change step.

## 6. Stem slots

The **stem** at the start of a pipeline comes from the entry's **stem slots**. Stem slots are defined per part of speech in [Lexicon → Parts of speech & dimensions](/cerf/qonlang/en/lexicon/#1-sub-pages-and-modes) (a name + a description, such as a noun's strong / middle / weak forms) and filled in per entry in Edit mode; the **stem** drop-down lists the stem slots of the bound parts of speech, and the hint next to it explains where stems come from. `lemma`, an empty value, or a slot the word hasn't filled all mean the headword.

### Paradigms that apply to all words

A paradigm with **Applies to all words** ticked in the inspector (initial mutations, sandhi and the like) doesn't need a part of speech and doesn't write inflected forms to entries; its reconciliation only runs the project consistency check. It is used by the corpus: while segmenting, the software feeds a batch of lexicon words through the paradigm, compares before and after, and builds tables such as "initial X becomes Y" and "final X becomes Y"; when a word in a sentence doesn't match anything, its start or end is changed back and it is looked up again, with the slot's abbreviation added after the gloss. For example, if the "soft mutation (LEN)" slot of an "initial mutation" dimension has one tweak `m > w / #_`, then `na-wener` in the corpus is recognised as `mener` "sky.LEN". The test bench lists every word of the current language. Once ticked, you can also choose **Language it applies to**, so one language's mutations aren't used to analyse another language.

## 7. Inspector: the test bench

The switch to the right of the test bench title has two modes:

- **Compare**: the search box matches the whole lexicon loosely (headword or definition); words bound to this paradigm come first. Click one to try it; the test bench runs whichever variant you are editing. Each slot shows the derived result and whether it matches the form stored in the lexicon; hover to see the step-by-step trace.
  - **Derive this word and store**: writes the results into this word's inflected forms (cells overridden by hand are left alone); the table flashes green afterwards.
  - **Derive all**: writes derived forms for every entry that uses this paradigm (including entries that added it as an extra paradigm).
- **Free**: type any form and see what this paradigm (the current variant) makes of it, using the current language. The arrow button next to a result (**Use this form as the input**) puts it back into the input box — switch to another paradigm tab to run it through that one.

In both modes, the input box shows a × on the right when it isn't empty; click it to clear the box. Each result has a **Create entry** button (**Create a new entry from this form**): it turns that form into a new entry, with the etymology and relation already filled in from the paradigm (see [Lexicon · Inflected forms and paradigms](/cerf/qonlang/en/lexicon/)). In Free mode, if the form you typed is exactly a headword in the lexicon, the etymology points to that word.

## 8. Reconciliation report

The **Reconciliation report** button next to the title compares derived results with the **hand-entered** inflected forms in entries (imported from CSV or typed in Edit mode), giving a match rate and a list of differences per slot. With many entries a progress bar is shown, as it is for bulk derivation. Use it to check whether your rules cover your data: a slot with a low match rate usually means a sound change or tweak is missing.

### Project consistency

Below it, the same report includes a check-up of the whole project (it runs even if no entry is bound to the paradigm), grouped by severity; click an item to jump to it. It checks entries, morphemes and sentences of the current language, or of all languages when **All languages** is selected; parts of speech, dimensions and paradigms are project-wide anyway:

| Check | Examples |
|---|---|
| Broken references | Etymologies, relations, examples or dimension values pointing at deleted things |
| Missing fields | No definition, no part of speech, no gloss, no translation |
| Duplicates | Entries with the same headword and part of speech, morphemes with the same form and type (see [Lexicon · The list](/cerf/qonlang/en/lexicon/#2-the-list) for the highlight and **Merge duplicates**) |
| Unconnected configuration | A part of speech bound to a missing paradigm, a dimension without values or unused, a paradigm without a part of speech, a slot without a generator, a glyph without a transliteration |
| Abbreviations | Glosses using abbreviations that aren't in the abbreviation list |
| Alphabet | Headwords containing characters outside the alphabet (letters with diacritics such as `é` are not reported as long as the plain `e` is in the alphabet) |

## 9. Connections to other modules

- **Morphemes**: `@morpheme` references, with allomorphs picked by environment.
- **Sound changes**: the sound-change step refers to a rule set and its stages.
- **Lexicon**: bound parts of speech, per-entry paradigm and variant, the slot panel, inflected forms.
- **Corpus**: automatic glossing looks words up through their inflected forms; affixes written in paradigms are also used to work out heavily inflected words, so hover cards can find the matching entry.

## 10. Examples

The noun paradigm of Aelith (an example project): dimensions number × case, and every slot is two steps, "suffix → sound change". The suffixes are written with archiphonemes, `¢lAr` and `¢dA`; in the rule set, `A` is realised as `a / e` depending on whether the preceding vowel is back or front, `Ŭ` is a linking vowel dropped after stems ending in a vowel, and `¢` is deleted at the end.

An agglutinative **verb head** can be handed over to paradigms entirely too: pick the dimensions mood-particle × mood × aspect × tense, and give each slot a pipeline — `tweak -·` removes the middle dot at the end of the head, then `suffix @some-particle`, `suffix @some-mood`… in turn (`@` refers to indivisible morphemes in the morpheme list, with allomorphs picked by environment); where another slot follows, a tweak removes the previous slot's marker vowel, and finally `tweak +·` puts the middle dot back. The morpheme list then only holds atomic morphemes, every compound head is derived by the paradigm, and hovering in the corpus breaks it down piece by piece.
