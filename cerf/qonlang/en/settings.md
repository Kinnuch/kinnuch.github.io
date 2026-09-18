---
layout: page
permalink: /cerf/qonlang/en/settings/index.html
title: Qonlang · Settings
description: The Settings page in Qonlang — application settings grouped into cards (interface, saving & startup, updates, display) and project settings (basics, languages & fonts, word splitting & gloss, paradigms), exporting as a folder, one CSV or a read-only copy, and clearing data.
---

# Settings

[← Guide index](/cerf/qonlang/en/) · [中文](/cerf/qonlang/settings/) · at the very bottom of the navigation bar

From top to bottom, the Settings page has four parts — **Application (this computer)**, **Current project**, **Data** and **About** — each grouped into cards.

## 1. Application (stored in the data folder, per computer)

**Interface**

| Item | Description |
|---|---|
| Interface language | 中文 / English. With English, the **User guide** buttons open this English guide |
| Theme | Follow system / Light / Dark; the skin's palette switches according to this |
| Show the "?" usage hints next to panels | The small round question marks next to modules and inspector panels, each giving a one-line explanation on hover |
| Show the guided tour every time **User guide** is clicked | Off by default: each module's tour runs automatically only once, and after that **User guide** opens this site directly; turned on, the tour runs every time. The checkbox in the dialog at the end of a tour is the same switch |

**Saving & startup**

| Item | Description |
|---|---|
| Autosave interval | In seconds; 0 turns it off. The crash-recovery snapshot every 5 seconds is independent of this |
| Backups to keep | Before every save, the previous file is copied to `Backups/`; beyond this number, the oldest are deleted |
| Reopen last project on launch | |

**Updates**

| Item | Description |
|---|---|
| Check for new versions automatically | A few seconds after launch the app asks GitHub whether there is an update, then keeps asking every few minutes while it is open, and shows a notice at the bottom right as soon as a new version is out. After **Later**, the same version isn't shown again during this session; **Skip this version** never shows it again; the whole check can be turned off here. For downloading and installing, see **Updates** below; to check right away, use **Check for updates now** under **About** |
| Check for new versions every … minutes | 20 minutes by default (it used to be 5; unchanged settings are moved to 20 on upgrade), 1–1440 allowed; has no effect while automatic checks are off |

**Display**

| Item | Description |
|---|---|
| Register labels on entry cards | Default: a boxed short form — the first character in Chinese (`文`, `古`), abbreviations in English (`lit.`, `arch.`); choose **Boxed full name** to write them out in full |
| Pronunciation brackets | Phonemic `/…/` (default), Phonetic `[…]`, or none; both entry cards and the lexicon's pronunciation column follow it |
| Examples shown under an entry | 3 by default; an entry lists this many, and the rest are under **See all examples** |
| Highlight duplicate entries | Rows with identical headwords in the lexicon are shaded pale yellow; turned off, only the warning icon remains |
| Mark paradigm-derived forms with a gear ⚙ | Distinguishes derived values from hand-entered ones on the entry card; turn it off if you don't want the mark |

Window and panel sizes (inspector width, lexicon column widths, the chosen skin) are also kept in your local preferences and restored next time. By default the inspector width **follows the window**: the main area keeps enough width for pages such as Languages and Settings (960), and the rest goes to the inspector (between 360 and 900), so the two line up exactly unless the window is very wide. Once you drag the divider, your width is used; double-click the divider to follow the window again. Widths saved by older versions switch back to following the window once when upgrading. The side panel on the start page does not change. On a first start the window size follows the screen: 1853 × 920 on a 2K screen (2560 × 1440), and the same proportions of any other screen (on a high-DPI screen it is computed in logical pixels, so it takes up the same amount of the screen), never below 900 × 600, and the whole work area if the screen is smaller. Windows saved by older versions that are smaller than the default are enlarged once.

### Updates

Click **Download & install** in the notice:

1. The installer is downloaded inside the app; nothing happens until you click. Before the actual download starts (an incremental update first works out what to fetch), and while the downloaded file is being checked, the notice says **Verifying…**; the progress bar only appears once downloading really starts. **An installed Windows version only downloads the parts that differ from the previous version** (usually just a megabyte or two for small changes), and checks the reassembled file against the checksum on the Release. If it doesn't match, the Release lacks update information, or anything goes wrong along the way, it switches to downloading the full installer automatically — so what gets installed is always identical to the installer on the Release. This applies from the update after an installed 0.8.1 release onwards; older versions, the portable build and locally built packages still download the full installer. **macOS** downloads the full zip for your chip (the native build if you are running the Intel build on Apple silicon) and checks it against the sha256 that GitHub computes for the file. How each download went is recorded in `update.log` in the data folder;
2. Once downloaded, the current project is saved first (installing closes the app; your project files are never touched): a project that has been saved before is saved in place; a project that has never been saved asks for a location with **Save as**, and cancelling asks "This resets the update progress. Continue?" — continue to skip the install this time, or cancel to get the **Save as** dialog again;
3. The installed Windows version **installs silently and reopens automatically**, using your previous install folder and options; the portable build (unzipped and run directly) shows the installer wizard so you can choose a folder. **macOS** unpacks the zip, checks that it is a complete new version, and after quitting replaces Qonlang in its original location with the new one and **reopens automatically** (if the replacement fails, the old app is put back; this applies from the update after 0.8.3 is installed). If Qonlang sits somewhere it can't be replaced — opened directly from the dmg or from the Downloads folder (macOS moves such apps to a read-only temporary location), or in a folder without write permission — it downloads the dmg instead and opens it, and the notice tells you to drag Qonlang into Applications to replace the old one; after that it is the same as [Getting started · Installing and launching](/cerf/qonlang/en/getting-started/#1-installing-and-launching) (including the Gatekeeper workaround). On Linux, the folder containing the downloaded package is opened.

An update check first looks at where GitHub's "latest release" page redirects to, which doesn't count against GitHub's API limit (without signing in, the API allows only 60 requests per hour per network address, which several people sharing a proxy or campus network use up quickly). Only when that version is newer does it ask the API once for the installer checksums and release notes; if the API is rate-limited or unreachable, it finds this computer's installer directly by the release's file naming (the Windows installer is then verified against the sha512 in `latest.yml`, and the notice has no release notes), and waits until the reset time GitHub gives before asking the API again. If the notice appeared before your platform's installer had been uploaded to the Release (the Windows and macOS packages are uploaded one after the other), a later check replaces it with one you can download and install directly.

## 2. Project (stored in the project file)

**Current project** has four cards.

**Basics**

| Item | Description |
|---|---|
| Project name, author, description | |

**Languages & fonts**

| Item | Description |
|---|---|
| Default language | The current language when the project is opened |
| Definition languages | Comma-separated language codes such as `zh, en`. Multilingual text — senses, dimension names, morpheme meanings and so on — is shown and falls back in this order |
| Font for language data | A project-level font (headwords, IPA, etc.), also used by dictionary exports; empty means the default |
| Entry image size | Every image is cropped to this pixel size (default 320×240); after changing it, newly imported images use the new size and existing ones are unchanged |

**Word splitting & gloss**

| Item | Description |
|---|---|
| Morpheme boundary symbols | Space-separated, `-` and `=` by default; treated as explicit boundaries when the corpus is tokenised. Adding `'` makes the apostrophe a boundary too, restoring the vowel dropped in a contraction (`t'am` = `ta` + `am`) |
| Tokenization | How corpus text is split into words: **By whitespace** (default) / **By character** (for writing without spaces, as in Chinese or Japanese) / **Custom separator** (a JS regular expression; an invalid one falls back to whitespace) |
| Symbols that count as letters | Symbols listed here are never stripped from the edges of a word as punctuation (the `'` of Arabic transliteration, for instance). Apostrophes that start or end a word in the lexicon are picked up automatically, so you rarely need to fill this in |

**Paradigms**

| Setting | Description |
|---|---|
| Complex mode: slots with more dimensions stand on their own | Off by default (simple mode): a slot with more dimensions (`polarity.tense.person`) that has no setup continues from the one with fewer (`polarity.tense`). Ticked, each slot stands alone and an empty one produces no form. See [Paradigms · Simple and complex mode](/cerf/qonlang/en/paradigms/#simple-mode) |

## 3. Exporting as a folder or as one CSV

The **Data** part has two cards: **Export** (this section and the read-only copy in section 5) and **Clear data**.

**Export as folder** splits the project into a folder: `project.json` (metadata and settings), `languages.json`, `lexemes.json`, `morphemes.json`, `paradigms.json`, `sentences.json`, `phrasebook.json`… plus a `.txt` for each rule set and doc pages as `docs/*.md`. Good for keeping in git and reading diffs. A folder can also be imported back into a single file.

**Export as one CSV** puts the whole project into one spreadsheet file: the first line is a format marker, followed by one table after another (each starting with a `#table,table name,Chinese name` line, followed by a line of column names). Project information, languages and phonemes, orthographies, scripts and glyphs, rule sets, parts of speech and dimensions, morphemes, entries and senses, paradigms, sentences, phrases, abbreviations and docs are all in it. Nested content is split into sub-tables whose `@parent` column points back to the `id` of the level above; column-name suffixes indicate types (`:opt` may be absent, `?` may be empty, `:num` number, `:bool` true/false, `:json` complex content), and multilingual text such as names and definitions is split into columns like `name.zh` and `name.en`; columns starting with `~` (language names, part-of-speech names) are only there for readability. Content longer than 30,000 characters (embedded fonts, images) is split into chunks in a `chunks` table at the end, so Excel doesn't truncate it.

After editing it in a spreadsheet program (changing text and adding rows both work; leave `id` empty on new rows and it is filled in automatically), pick the `.csv` in **Open project** to read it back. What you get is an unsaved project, and saving asks where to save it.

## 4. Clear data

Clear one module in one go, ready for a fresh import or a fresh start: lexicon, morphemes, corpus, phrasebook, documents, sound-change rule sets, paradigms, parts of speech, grammatical dimensions, inspector modules, abbreviations, scripts (all languages) and entry images. The drop-down shows the current number of items; clicking the red **Clear** asks for confirmation first, and `Ctrl+Z` undoes it afterwards.

## 5. Read-only mode

**Export a read-only copy** saves an **encrypted** read-only copy of the project (the whole file is compressed and encrypted; opened in a text editor it is gibberish, and a modified file can't be opened). When someone opens that file in Qonlang, the top bar shows a **Read-only** badge, editing controls are hidden and changes are never saved. In addition:

- saving text files, exporting (lexicon / morpheme CSV, dictionaries, corpus and phrase tables, rule sets, docs, folder export, PDF) and copying results are refused, with a toast saying the content can only be viewed in the app;
- in release builds, developer tools can't be opened while a read-only project is open;
- **Save as** still works, and saves another encrypted read-only copy.

It is good for sharing your work without worrying that it gets messed up or taken wholesale. The original file is unaffected. Unencrypted read-only copies exported by older versions still open, and can't be exported either.

## 6. About

The full Qonlang logo at the top; below it a line with the current version, the latest version on the Release page (known once a background or manual check has asked; until then it says it hasn't been checked yet) and the licence (MIT); then the data folder path.

**Check for updates now** checks right away and shows the result next to the button: you have the latest version, a new version is available (the notice at the bottom right also appears, even for a skipped version), or why the check failed — GitHub can't be reached (check your network or proxy), or GitHub's request limit is used up for now (try again in a while).

## 7. Connection hints

Closing the blue connection hints at the top of each page is remembered in the application preferences; to show them all again, delete `dismissedHints` from `prefs.json` in the data folder (a button will come in a later version).
