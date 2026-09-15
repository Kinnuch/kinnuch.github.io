---
layout: page
permalink: /cerf/qonlang/en/getting-started/index.html
title: Qonlang · Getting started
description: Installing Qonlang, the start page, starter templates, the project file, and how saving and backups work.
---

# Getting started

[← Guide index](/cerf/qonlang/en/) · [中文](/cerf/qonlang/getting-started/)

## 1. Installing and launching {#1-installing-and-launching}

- **Windows, portable**: unzip and double-click `Qonlang.exe`. The data folder is `%APPDATA%\Qonlang` (preferences, recent projects, automatic backups and downloaded fonts all live there).
- **Windows installer**: `Qonlang-<version>-setup.exe`. You can choose the install folder; the desktop shortcut is called 千语集 (Qonlang).
- **macOS**: download `Qonlang-<version>-mac-arm64.dmg` (Apple Silicon) or `-x64.dmg` (Intel) from [GitHub Releases](https://github.com/Kinnuch/Qonlang/releases) and drag the app into Applications. The app is not signed or notarised, so Gatekeeper blocks the first launch: **right-click the app → Open**, or run `xattr -cr /Applications/Qonlang.app` in Terminal. The data folder is `~/Library/Application Support/Qonlang`.
- **From source**: after `git clone`, on Windows double-click `dev.cmd` in the repository (it bypasses PowerShell, so execution policies don't get in the way); on macOS / Linux run `sh dev.sh`. The first run installs dependencies with `npm install` automatically.

For every release, GitHub Actions builds the Windows installer and the macOS dmg together when the version tag is pushed, and attaches them to the same Release.

If Windows says "running scripts is disabled", that is PowerShell's execution policy blocking `npm.ps1`; use `dev.cmd`, or just run the exe.

## 2. The start page

The start page has four parts:

1. **Banner**: a link to the Gilatod Wiki.
2. **Gallery**: a strip below the banner that shows example sentences, phrases and words with images from your recently opened projects (up to 3), one card at a time. Sentences and phrases get a gradient background; a word with an image uses that image, blurred, as its background. Arrows appear at both sides when you hover; click one to move to the next card. The order is shuffled by the date, so the first card stays the same all day. Words in sentences and phrases can be hovered to show their word card — words are recognised exactly as on the Corpus page (analyses that don't point to an entry are resolved from forms, paradigm affixes and segmentation, and each segment can be clicked); **Open in lexicon** on the card opens that project first and then jumps to the word. If a word in a sentence was matched to the wrong entry, click **Fix**: it likewise opens the project, jumps to that sentence in the corpus and lets you pick the right word (see [Corpus · Hover cards](/cerf/qonlang/en/corpus/#4-hover-cards)). The gallery is hidden when none of the recent projects has anything to show (or you haven't opened a project yet).
3. **Starter templates**:
   - **Blank, single language**: one language from scratch — the usual choice for an a priori language.
   - **Language family**: a proto-language plus any number of daughter languages (one name per line); later you derive words from the proto-language with sound changes.
   - **Import from Lexicanter**: reads a `.lexc` file and brings in the lexicon, senses, dialects, pronunciation rules, alphabet, etymologies, phrasebook and docs in one go.
   - **Import from CSV**: creates a blank project and opens the CSV column-mapping wizard.
4. **Recent**: files that no longer exist are removed from the list automatically.

The left column has four buttons: New project, Open project, **Example projects** and User guide. **Example projects** contains two fictional projects that, between them, show every module — the quickest way to see what a feature looks like and how its data should be filled in:

- **Aelith** (an agglutinative a priori language): a proto-language → modern language family with a sister language, Merun (compare cognates in the relation graph), vowel harmony, multi-slot suffixes, all eight kinds of pipeline steps, variants and inheritance, disabled slots and hand-filled tables, sandhi voicing that applies to all words, compound parts of speech, inspector modules, etymology chains and the relation graph, images and dialects, a glossed and confirmed corpus, a runic script, features and stress rules, a custom stress rule, and entries with Affects stress.
- **Tsahun** (an isolating tone language): five tones, romanised and Cyrillic orthographies (syllables and sound counts follow the spelling), syllabary packing and **vertical text**, reduplication paradigms and inflected forms containing spaces, homograph candidates, a variant-character module, classifiers and a whole borrowed numeral system.

Edit them freely: they have no file behind them, so saving asks where to save, and the examples themselves are never overwritten.

The six buttons at the bottom are Buy me a coffee, Changelog (the repository's `CHANGELOG.md`), Developer, Friends, Credits and Rule syntax; to their left is **User guide**, which is this site.

## 3. The project file

- One project = one `*.laim.json` file, containing all languages, rule sets, parts of speech and dimensions, morphemes, entries, paradigms, sentences, phrases, abbreviations, doc pages and project settings. Fonts embedded in scripts are stored inside it too (as data URLs), so the project still displays correctly on another computer.
- **Settings → Export as folder**: one JSON per collection, rule sets additionally as plain text, and doc pages as `.md` — convenient for keeping in git and reading diffs.
- **Autosave**: the interval set in Settings (in seconds; 0 turns it off). Independently, a snapshot is written to the data folder every 5 seconds, so after a crash the app offers to restore it on the next start.
- **Backups**: before every save, the previous file is copied to `Backups/` in the data folder; the last 20 are kept by default.
- **Close protection**: if there are unsaved changes when you close the window or click 千 in the navigation bar to go back to the start page, a prompt lets you save or discard.

## 4. A suggested order for building a language

1. **Languages**: check the language name, abbreviation and colour; for a family project, get the tree right first.
2. **Phonology**: build the phoneme inventory from the IPA chart, generate the C / V classes with one click, and write the "orthography → IPA" rules.
3. **Lexicon**: enter a first batch of words (or import from CSV / Lexicanter); parts of speech and dimensions are defined on the **Parts of speech & dimensions** sub-page.
4. **Morphemes**: roots and affixes.
5. **Paradigms**: combine dimensions into slots, write generators, bind parts of speech and write the derived forms.
6. **Sound changes** (family projects): rule sets, stages bound to languages, evolving the lexicon.
7. **Script**: if the language has its own writing system.
8. **Corpus**: gloss example sentences automatically; confirmed analyses become the first choice in other sentences.
9. **Docs / Phrasebook**: grammar notes and common phrases.
10. **Lexicon → Export**: dictionary as HTML / Markdown / PDF.

None of this order is enforced — you can go back to any page at any time, and everything that depends on it updates automatically.

## 5. The top bar

- The **project name** and a **Saved / Unsaved** badge, followed by the **search box** (its placeholder follows the current module, and it clears when you switch pages).
- **Current language** drop-down: most pages only show data for the current language; choose **All languages** to see the whole project. New content in the Corpus, Phrasebook, Docs and similar pages belongs to the current language by default.
- Buttons for saving, showing the inspector and closing the project.

## 6. The web version

The same code can be built into a static site with `npm run build:web`. In the browser it reads and writes local project files through the File System Access API and keeps snapshots and fonts in IndexedDB. Everything works the same, except that PDF export goes through the browser's print dialog.
