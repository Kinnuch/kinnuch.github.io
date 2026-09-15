---
layout: page
permalink: /cerf/qonlang/en/index.html
title: Qonlang · User guide
description: Qonlang is a desktop workbench for every conlanger — lexicon, morphemes, sound changes, phonology, scripts, paradigms, glossed corpus, phrasebook, docs and dictionary export. This is the complete guide, module by module.
---

# Qonlang · User guide

[中文版](/cerf/qonlang/)

Qonlang (千语集) is a desktop application **for every conlanger** (a portable Windows build and an installer, plus macOS; the same code also runs in a browser). It ships with no terminology from any particular language: parts of speech, cases, dimensions, abbreviations, dialects and scripts are all defined by you, inside the project. The software only ties them together — entering words and roots, writing sound-change rules, deriving pronunciations from your phonology, glossing example sentences automatically, building custom scripts and exporting dictionaries.

- Source code and downloads: [github.com/Kinnuch/Qonlang](https://github.com/Kinnuch/Qonlang) (MIT)
- Interface languages: 中文 / English (Chinese by default); light and dark themes
- Project file: a single `*.laim.json`, which can also be exported as a folder split by collection (handy for git)

Every page in the app has a **User guide** button next to its title. It first runs an **illustrated tour** on the interface itself — highlighting the key parts with arrows and captions, step by step (1/N) — and at the end asks whether you want to open the matching chapter on this site. Each module's tour runs automatically only once; after that the button opens this site directly. If you want the tour every time, tick the option in that final dialog, or turn it on in [Settings](/cerf/qonlang/en/settings/). The **User guide** button in the left column of the start page leads here. When the interface is in English, these buttons open this English guide.

## Module guides

In the order of the navigation bar, top to bottom:

| Module | What it does | Guide |
|---|---|---|
| Start page | New / open project, example-sentence gallery, starter templates, recent projects | [Getting started](/cerf/qonlang/en/getting-started/) |
| Languages | Family tree, basic information about each language, dialects | [Languages](/cerf/qonlang/en/languages/) |
| Phonology | Phoneme inventory, classes, orthography transcription, syllables and prosody, phonotactics and word generation | [Phonology](/cerf/qonlang/en/phonology/) |
| Script | Custom writing systems: glyph table, fonts, transcription → script mapping, bracket handling, vertical text | [Script](/cerf/qonlang/en/script/) |
| Sound changes | Rule sets, stage snapshots, test bench, evolving the whole lexicon | [Sound changes](/cerf/qonlang/en/sound-changes/) |
| Morphemes | Roots, affixes, clitics, allomorphs, statistics | [Morphemes](/cerf/qonlang/en/morphemes/) |
| Lexicon | Entries, senses, etymology, relation graph, statistics, CSV / Lexicanter import, dictionary export | [Lexicon](/cerf/qonlang/en/lexicon/) |
| Paradigms | Grammatical dimensions, slots, pipeline generators, derivation reconciliation, project consistency | [Paradigms](/cerf/qonlang/en/paradigms/) |
| Corpus | Example sentences, automatic glossing, interlinear editor, duplicate merging, statistics, export | [Corpus](/cerf/qonlang/en/corpus/) |
| Phrasebook | Categorised phrases, variants, pronunciation | [Phrasebook](/cerf/qonlang/en/phrasebook/) |
| Docs | Markdown pages inside the project | [Docs](/cerf/qonlang/en/docs/) |
| Skin | Colour presets, font slots, font library | [Skin](/cerf/qonlang/en/skin/) |
| Characters | IPA character panel and diacritic composition | [Character panel](/cerf/qonlang/en/chars/) |
| Settings | Interface language, theme, autosave, project settings, folder export | [Settings](/cerf/qonlang/en/settings/) |

## How the modules feed each other

```
Phonology (phonemes / classes / digraphs) ─→ usable in sound-change rules, orthography rules and script mapping rules
Orthography rules (spelling → IPA) ────────→ Lexicon "pronunciation" column, corpus IPA, phrase pronunciations
Script mapping rules (transcription → glyphs) → Lexicon "script" column, entry cards, script lines in corpus and phrasebook, dictionary export
Morphemes (roots / affixes) ───────────────→ @morpheme in paradigm generators, automatic corpus segmentation, etymology sources
Paradigms (dimensions × slots × generators) → slot panel in the lexicon's Edit mode, inflected forms on entry cards, morphological labels in corpus glosses
Sound-change rule sets (stages bound to languages) → the "run sound changes" pipeline step, lexicon evolution
Lexicon (headwords / senses / inflected forms) → automatic glossing, hover cards, [[headword]] links in docs, dictionary export
```

Every page has a dismissible blue hint at the top saying which other pages use its data. Once closed it stays closed; you can bring the hints back in Settings.

## Keyboard shortcuts

| Shortcut | Action |
|---|---|
| `Ctrl+Z` / `Ctrl+Y` | Undo / redo the last change to the project (inside a text box, the box's own undo runs first); the top bar has buttons too |
| `F5` | Reload the current page (the button to the right of Redo): press it when something hasn't caught up after an import or an addition. The page is rebuilt; filters and selection stay, and project data is not touched |
| `Alt+←` | Back (the Back button in the top bar): steps back through where you have been — the page, the current language at the time, the selected item, the open sub-page or window (statistics, relation graph, Edit mode…), the scroll position and the text in the search box. Filters, sorting, sub-pages, selections and test inputs are also remembered when you leave a page, so they are still there when you come back through the navigation bar |
| `Ctrl+S` / `Ctrl+Shift+S` | Save / Save as |
| `Ctrl+O` | Open project |
| `Ctrl+K` | Command palette: search entries, morphemes, sentences, phrases, docs, rule sets, paradigms and languages across pages; type a page name to jump there |
| `Ctrl+I` | Character panel (IPA and your own glyphs, inserted at the cursor) |
| `Ctrl+\` | Collapse / expand the inspector on the right |
| `Esc` | Close the command palette, input dialogs and the character panel |

## Common conventions {#common-conventions}

- **Three columns**: navigation on the left, the main area in the middle, the **Inspector** on the right. By default the inspector width follows the window (the main area keeps enough width for its content, the rest goes to the inspector); drag the divider to set your own width, and double-click it to go back. Clicking the current module again in the navigation bar keeps you where you are; clicking Skin or Settings again returns to the previous page.
- **Everything can be undone**: `Ctrl+Z` undoes the last change to the project (editing a field, deleting an entry, writing derived forms, evolving the lexicon… each counts as one step), `Ctrl+Y` redoes it, up to 60 steps back. Deletions also show an **Undo** toast for 8 seconds. There are no "are you sure?" dialogs.
- **Right-click menu**: anywhere in the app — cut / copy / paste, undo / redo / back, command palette, character panel, save, save as and user guide.
- **A page error doesn't take the page down**: when something goes wrong on a page, a red bar at the bottom says which page and what the error was, and stays until you close it; the project is reverted to before the last change and the page is redrawn so you can keep working. If the page fails again right after that (so it isn't caused by the change), it stays on the error card, where you can retry, go to the Languages page or save.
- **Rows of chips longer than five lines scroll inside their own box**: long lists such as the classes and morphemes you can insert in a rule form, the class panel, or a morpheme's "Used by" no longer stretch the form.
- **Drop-down menus** open on click and close when you click elsewhere or press Esc.
- **Horizontal scrolling**: areas that only overflow sideways (tables, chain graphs) scroll horizontally with the ordinary mouse wheel — no need to hold Shift.
- **Automation only drafts**: automatic pronunciation, inflection and glossing can all be overridden cell by cell with irregular values. Overridden cells are marked, and re-running the automation does not overwrite them.
- **Everything is project data**: parts of speech, dimensions, abbreviations, dialects and export templates are all stored in the project file, so they travel with it to another computer. The skin and the interface language are application settings and are not stored in the project.
- **Every text box can call up the character panel**: press `Ctrl+I` inside any input and click a symbol to insert it at the cursor.
- **The search box** lives in the top bar, to the right of the project name and save status, and every module has one. Its placeholder and what it filters follow the current module (languages, phonemes and classes, glyphs, rule lines, morphemes, entries, slots, sentences, phrases, docs, fonts, settings), and it clears when you switch pages. Advanced syntax: `field=text` searches a single field (e.g. `gloss=PL`, `word=kam`; Chinese field names such as `释义=` work too; in the lexicon and morphemes a grammatical dimension's name also works as a field, e.g. `gender=fem`), `field==text` requires an exact match, and `/regex/` searches with a regular expression. Separate several conditions with spaces (all must match) and put quotes around text that contains spaces. The **?** next to the search box lists the fields available on the current page.
- **One rule syntax everywhere**: sound changes, orthographies, script mappings, paradigm adjustments and morpheme allomorph environments all use the same rule notation. **Rule syntax** on the start page, or the open-book icon at the top right (between the inspector toggle and Close project), opens the full reference in the inspector; opened from the Sound changes, Paradigms, Script, Phonology or Morphemes page, it scrolls straight to the relevant section.
- **Bookmark tabs**: the sets you create yourself in Script, Sound changes and Paradigms (each script, each rule set, each paradigm) appear as bookmark tabs to the right of the page title; the selected tab merges with the page below, and the **New** button is always at the far right. Hovering a tab shows a **pencil** on its right — click it to focus the **Name** field in the inspector and rename it directly; paradigm variants work the same way, renamed in place. Press and drag a tab sideways and drop it on another tab to move it there.
- **Drag to reorder**: ordered rows of small chips — paradigm dimensions and pipeline steps, the components of a part of speech and the parts of speech a dimension applies to, the languages an inspector module applies to, phonemes in the inventory, orthographies, classes and digraphs in sound-change rules, tags everywhere, and phrase and sentence cards — can be pressed and dragged onto another item to take its place. While dragging, the dragged item fades and the drop target gets a dashed outline; pressing inside an input or drop-down within a chip still lets you type and select as usual.
- **Collapsible sections**: long sections (parts of speech & dimensions, the phoneme and vowel tables, syllable packing and auto-mapping in Script, the entry card and font library in Skin…) have a triangle next to their title that appears on hover; click it to collapse the whole section, and it stays collapsed next time. In Parts of speech & dimensions, each part of speech, dimension and inspector module can also be collapsed to a single line.
- **Long lists render in batches**: the lexicon, morphemes, corpus, paradigm slots and glyph table draw one screenful first and draw the next batch as you near the bottom, so switching pages and changing filters stays fast.
- **The first time you open the app**, the start page runs a tour (new / open, starter templates, recent projects, the row at the bottom) and ends by pointing out **Rule syntax** at the top right; to see a tour again later, click **User guide** next to a page title.
- **Table headers** (Lexicon, Morphemes): clicking a column name cycles ▼ descending → ▲ ascending → off; the funnel to the right of a column name opens a filter panel (select all / none / one value; the first column filters by initial letter). If a filter leaves nothing, the header stays so you can clear it. The small button at the **far left** of the header switches to a custom order, which adds move up / down buttons in that column. Double-click a row to open it in the inspector's Edit mode.
- **Import previews**: every import (lexicon and morpheme CSV, corpus and phrasebook tables and JSON, glyphs, Lexicanter, sound-change rule files) first shows what the result will look like in the inspector. Changing a setting updates the preview immediately, with the changed parts highlighted and slowly fading; click **Import** once it looks right.
- **Statistics panels** (one each in Lexicon, Morphemes and Corpus) share one layout — number cards, distribution bars and rankings. Clicking an item in a distribution returns to the list filtered or searched by it. Panels side by side are aligned to the shorter one, the longer one scrolls inside, and the panel under the mouse gets a slightly brighter border.

## Example projects

The **Example projects** button on the start page opens two fictional language projects directly (your edits never overwrite the example files). They are two completely different language types that, together, show every module:

- **Aelith**: an agglutinative language — a proto-language → modern language family with a sister language, Merun (open the relation graph of kaso or teli and click **Compare** to see how the cognates' sound changes and meanings differ), vowel harmony, multi-slot suffixes and every kind of pipeline step, variants (the base set renamed to 书面, "written") and inheritance, sandhi voicing that applies to all words, compound parts of speech and per-sense parts of speech, inspector modules (a cultural note, and runic variants shown in the runic font), etymology chains and the relation graph, features, stress rules and the syllable boundary σ (the 书面语 → 口语 rule set, "written → spoken", where every column of the test bench carries ˈ), Affects stress (pronouns and particles pass their part of speech and stay unstressed; telikaso has special stress and reads teliˈkaso), a custom stress rule for the sister language Merun (where hara has special stress), the entry vesa deliberately left without a definition (reachable from the lexicon's status bar), a runic script with a hand-drawn glyph (the "notch full stop"), a paradigm inside a paradigm (the Gerund paradigm adds -mAk and then runs the Noun cases: sörmek, sörmekde — sör- uses it as an extra paradigm next to its conjugation), the entry sörmek created from that gerund with its etymology and relation filled in automatically, and glossed, confirmed example sentences (the personal name Mira is deliberately missing from the lexicon, so its hover card says "not found").
- **Tsahun**: an isolating tone language — tones, two orthographies (phonemes have their romanised spellings filled in, so ts and ng count as one sound: the intensive reduplication of tsing55 is tsitsing55), syllabary packing and vertical text, bracket settings in the script, `@entry` references producing inflected forms with spaces (`ngo21 tui55`), candidates for the homograph hok33, and a "variant characters" module shown in the syllabary font.

Both project files are also in the repository's `examples/` folder.

## Feedback

Please report problems and suggestions on [GitHub Issues](https://github.com/Kinnuch/Qonlang/issues), or contact the author through the Friends links on this site.
