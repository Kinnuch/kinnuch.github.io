---
layout: page
permalink: /cerf/qonlang/en/script/index.html
title: Qonlang · Script
description: The Script page in Qonlang — glyph tables for custom writing systems, importing from font files, embedded fonts, the drawing pad and font export, transliteration-to-script mapping rules, and how scripts show up in the lexicon, corpus and exports.
---

# Script

[← Guide index](/cerf/qonlang/en/) · [中文](/cerf/qonlang/script/) · third item in the navigation bar, between Phonology and Sound changes

The **Script** page manages a language's **custom writing systems**: alphabets, syllabaries or abugidas of your own design, or ready-made Unicode blocks you borrow (runes, Tengwar in the Private Use Area, Devanagari…). Once a script is defined, the lexicon gets a Script column, corpus sentences and phrases get a script line, and dictionary exports include it — all generated automatically from rules.

A language can have several scripts (say, a formal hand and a cursive). Next to the page title is the switch between the three sub-pages **Glyphs / Mapping rules / Preview**; further right, each script of the language has its own bookmark tab. Click a tab to switch; press and drag it onto another tab to change their order.

## 1. Creating a script and its basic properties

Use **New script** at the far right of the title bar, then set in the inspector:

| Field | Description |
|---|---|
| Name | e.g. "Aelith runes" |
| Type | Alphabet / Abjad / Abugida / Syllabary / Logographic / Featural / Mixed / Other. The type doesn't affect the engine; it only decides which hints the Mapping rules page gives you |
| Direction | Left to right / right to left / top to bottom. RTL makes displays use `dir="rtl"`; top to bottom is vertical by itself |
| Vertical layout | Off by default. When on, everywhere this script is displayed (corpus, phrasebook, lexicon, entry cards, character panel, the preview on this page) it is laid out vertically (`writing-mode`) with upright glyphs; columns run right-to-left, or left-to-right if the direction is set to left to right |
| Parentheses | How parentheses in the source text (half- or full-width) are written in the script: **Keep them, transliterate inside and outside separately** (default, e.g. "kala（mira kala）") / **Drop them, merge the content into the word** (optional letters such as "tal(a)n" are merged into the word; a parenthesised phrase becomes a space) / **Drop them together with their content** |
| Font | A system font name, or an imported font file embedded in the project |
| Notes | Free text |

## 2. Fonts

- **System font name**: for fonts installed on the computer, just type the name.
- **Import font file**: TTF / OTF / TTC / WOFF / WOFF2. The file is stored in the project file as a data URL, so it displays on any computer. TTF / OTF / TTC can also provide the glyph list (see below).
- With a font, the glyph cards, the inspector title and the **Character** input use the script's font; Private Use Area glyphs show as boxes without one.
- **Changing the font in Theme**: below [Theme → Font slots](/cerf/qonlang/en/skin/#4-font-slots), every script of the current project is listed and can be given its own font (installed from the font library or imported locally), which takes priority over the setting here; it only changes the display on this computer and doesn't touch the project file.
- Without a font, script text falls back to the Theme's "custom script" font slot, and then to the language data font.
- **Export font** <a id="export-font"></a>: the **Export font** menu above the **Glyphs** tab. **Export TTF** and **Export WOFF** rebuild a font from the embedded font's glyphs plus every drawn or edited glyph (drawn ones replace the originals) and save it; **Update embedded font** replaces this script's embedded font with the rebuilt TTF, so the project carries the edited font, with Undo on the toast.
  - When the embedded font is **TrueType**, the original file is operated on rather than rewritten: only the glyphs you drew or edited are swapped in, glyph ids stay exactly as they were and new glyphs are appended at the end, so the original font's **kerning, ligatures and the hinting of every other glyph are kept as they are**.
  - What can't be kept: the **hinting of the glyphs you edited** no longer matches their new outlines, so it is dropped; a **composite glyph** that references a glyph you edited changes with it (edit `A` and `Á` `À` `Ä` … change too); the **digital signature** is always dropped.
  - When the embedded font is an **OTF (CFF outlines), a WOFF / WOFF2, a TTC, or there is no embedded font at all**, the font has to be written from scratch: only glyphs mapped to characters are included, everything is rescaled to 1000 units per em, and kerning, ligatures and hinting cannot be kept. An embedded WOFF2 font can't even be read, so only the glyphs you drew or edited come out.

## 3. Glyphs

Four sources, which can be mixed:

1. **Read glyphs from font**: parses the font's cmap (character-to-glyph map) and post table (glyph names). With fonts exported from tools like FontCreator, the names you gave the glyphs appear under **Name**. For basic Latin letters and digits, the transliteration is filled in with the character itself (many home-made fonts map their glyphs onto a–z, so they work immediately); other characters are left empty for you to fill in. After choosing a font you confirm above the glyph table: the inspector shows an import preview (glyph cards in that font; characters already present are faded and will be skipped), and **Import glyphs** embeds the font into the script as well.
2. **Paste glyph list**: one line per glyph — "character transliteration name", separated by tabs or spaces, e.g. `ᚠ f fehu`. The import preview in the inspector updates as you paste, and the card for the line you changed flashes; characters already present are faded and skipped.
3. **Add glyph**: add them one by one by hand.
4. **Draw a glyph**: **Draw a glyph** above the glyph table (or **Draw this glyph** / **Edit drawing** in a glyph's inspector) opens the **drawing pad** for drawing a character by hand or editing a character from the font; see [Drawing pad](#glyph-pad) below. After **Save**, Qonlang turns the hand-drawn characters of this script into a font placed first in the script's font stack — the glyph table, the inspector, the lexicon's script column, entry cards, the corpus and transliteration results all show them, and other characters keep using the original font. An empty character gets a Private Use Area code point automatically (skipping ones used by any script in the project or present in the embedded font); if the character is an existing one (such as `a`), `a` in this script is shown in your handwriting. **Edit drawing** redraws it and **Remove drawing** turns it back into an ordinary glyph.

Each glyph has:

| Field | Description |
|---|---|
| Character | The glyph itself (combining marks allowed; Private Use Area code points too) |
| Transliteration | What stands for the glyph in the **Transcribe from** field (the headword's spelling by default; a logographic script can use codes such as `aa01`); **the mapping rules are generated from it**. Leave it empty to exclude the glyph from automatic mapping |
| Name | Glyph name |
| Category | Letter / Vowel sign / Consonant / Syllable / Mark / Number / Punctuation / PUA glyph / Space / Other, or a custom one. **Auto-categorize** looks at the transliteration first: it is read as sounds using the primary orthography (if **Transcribe from** is set to a pronunciation, the value is taken as sounds directly) — all vowels make a vowel sign, all consonants a consonant, both a syllable; transliterations that are punctuation or digits count as such. Only glyphs without a transliteration are classified by the character itself (letter, mark, PUA glyph…). Categories you named yourself are left alone, and a toast reports how many went into each category. New glyphs read from a font or pasted in are categorised the same way |
| Notes | |

Glyph cards can be filtered by category; click a card to edit it in the inspector.

### Drawing pad {#glyph-pad}

The pad shows the ascender, cap height, x-height, baseline (green) and descender; the grey area is the body box, the two vertical lines are the glyph's origin and advance width, and the dot under the right line can be dragged to change the advance (or type it into **Advance**). A glyph is made of **strokes** (lines drawn with the pen) and **outlines** (filled closed shapes: loaded from the font or dragged out with Shapes), layered together.

**Loading from the font**: when a glyph has no drawing yet and the script's embedded font has this character, the pad loads its outline as soon as it opens, ready to edit. **Load from font** next to the title reloads it at any time, replacing what is on the pad (undoable). WOFF2 fonts can't be read.

| Tool | How it works |
|---|---|
| **Pen** | Draw freehand; **Weight** sets the line width. **Stabilizer** runs 0–10, default 5, remembered on this computer: the tip hangs on a string behind the pointer, and while drawing you see the string and a ring at the pointer — higher is steadier but lags more. Each stroke is smoothed when you lift. Dragging no longer turns the cursor into a "forbidden" sign or breaks the stroke (a browser drag used to start), and drawing carries on when the pointer leaves the canvas |
| **Shapes** | Drag out a rectangle, ellipse or regular polygon (adjust **Sides**) — these three are filled outlines — or a straight line, which is a stroke using **Weight**. Hold Shift for a square, circle or 45° line |
| **Select** | Click or drag a box to select strokes and outlines (Shift adds); drag to move, drag the square at the top-right corner to scale (Shift keeps proportions); arrow keys nudge by 10, Shift by 50; Ctrl+A selects everything, Delete removes |
| **Nodes** | Click an outline or stroke to show its nodes: squares are on-curve points and small circles are control points; drag them to reshape, and Delete removes the selected node |
| **Eraser** | Click a stroke or outline to delete it |

The actions row under the tools applies to the selection, or to the whole glyph when nothing is selected (its left end says **n selected** or **Whole glyph**):

- **W** / **H** resize by the bounding box, keeping the bottom-left corner; stroke weights stay the same. The chain between them is **Lock aspect ratio**.
- **Flip horizontally**, **Flip vertically**.
- **Reverse**: reverses outline direction — use it when a hole is filled or a shape has turned into a hole; for strokes it reverses the point order.
- **Outline**: turns filled outlines into strokes along their edges (a hollow glyph), using **Weight**.
- **Bold**: one-click bold, thickening each side by the number of font units typed next to it (strokes get heavier, outlines grow outward and holes shrink).
- **Duplicate (offset down-right)** and **Delete** need a selection.

Ctrl+Z undoes and Ctrl+Y or Ctrl+Shift+Z redoes, for the pad's own steps only; the bin button **Clear all** starts over. Scroll to zoom, drag with the middle button to pan, and click the percentage button to reset the view. Nothing is written back until **Save**; clicking outside the pad (or pressing Esc with nothing selected) closes it without saving.

## 4. Mapping rules

The rule language is the same as on the Sound changes page (see [Rule language](/cerf/qonlang/en/sound-changes/#rule-language)), with a list view and a source view.

The special part is the line `@glyphs`: it expands into **the mapping generated from the glyph table** — one `transliteration > character` rule per glyph with a transliteration, sorted by transliteration length, longest first (`th` before `t`, so the short one doesn't eat the long one). You can inspect the expansion under **Automatic mapping** at the bottom of the page (the glyphs on the right are shown in the script's font). Transliterations containing symbols that mean something in rules (`?` `.` `#` `*`), or capital letters that share a name with a class, get a backslash in front when expanded (`\? > ⸮`) so they are matched literally — giving a glyph to a question mark no longer turns entire words into that glyph.

Rules written **before** `@glyphs` run first; rules **after** it run last. That is how the different script types are handled:

| Type | Typical approach |
|---|---|
| Alphabet | Usually just `@glyphs`; for digraphs, give the dedicated glyph a longer transliteration |
| Abjad | Delete unwritten vowels before `@glyphs`: `[aiu] > / C_` |
| Abugida | First delete the inherent vowel after consonants, `a > / C_`, then map the other vowels to vowel signs; add a vowel killer to consonants without a vowel at the end of a word, e.g. `C > C◌्` (`◌` is only a placeholder — write the actual character) |
| Syllabary | One glyph per syllable with its transliteration (ka, ki…); longest match is handled automatically. For complex packing patterns use **Syllable packing** below |
| Logographic | Fill in each word by hand in the lexicon's **Script form**; rules only handle the regular part |
| Featural | Map classes to components first, then assemble them with rules |
| Mixed | Write each part as a separate block of rules and use `-*` stage snapshots to inspect intermediate results |

Rules can refer to the classes and digraphs from the Phonology page. In the inspector's **Try it** box, type a transliteration (words separated by spaces) and the script appears immediately.

The inspector also has **Transcribe from**: by default a script transcribes the entry's **headword**, but you can switch it to a **stem**, the **pronunciation** in one orthography, or an **inspector module** (for instance a field that holds another transcription); when that field is empty it falls back to the headword. The lexicon's script column, entry cards and this script's line in the corpus all follow it.

When it is an **inspector module** (a logographic script: glyphs are transliterated with codes, and each entry lists its glyph codes in a field), the script lines in the corpus, the phrasebook, the script page preview and exports are no longer transcribed from the sentence itself. Instead **each word is looked up in the lexicon** — by the entry its analysis picked in the corpus, otherwise by headword and inflected forms — and written from that entry's field; words that aren't found keep their spelling. Codes typed into a hand-entered script form, for an entry or a sentence, turn into glyphs too.

**When a word is made of several morphemes** (a word written with a hyphen, such as `naegō-moh`, or a word you split with **Fix** in the corpus), **each piece of the script line is written on its own**: first the entry that piece is attached to, then the word's own entry if it recognises that spelling, then the spellings of the piece's morpheme, then the piece's own spelling looked up in the lexicon — and the piece is written from whichever entry is found. A piece that isn't found simply falls back to transliterating its own spelling and doesn't affect the others; only when no piece can be written does the word fall back as a whole.

**Syllable packing** and **Automatic mapping** are two titled sections below the rule list; the triangle to the right of each title collapses it. When **Add rule** makes the rule list taller, they simply move down.

### Syllable packing

**Syllable packing**, below the rules tab, is an alternative route for **CV / VC syllabaries**: when enabled, the rule chain is skipped and the transliteration is packed into syllables using the glyph readings.

**The packing grid is derived from the glyph table itself**: every glyph whose reading splits into exactly "one consonant + one vowel" (or the reverse) is a grid cell, and readings longer than that (whole words, root blocks) are preferred as whole chunks. So once the glyph readings are right, packing works.

The remaining settings are things the software can't infer and you need to tell it:

| Setting | Description |
|---|---|
| Killer (vowel-cancelling) reading | The reading of the glyph that removes a vowel or marks a voiceless sound, e.g. `∅` |
| Borrowed vowel | Which vowel to borrow when a consonant has no vowel to pack with; the killer then cancels it |
| Letters needing a mark | Space-separated. These consonants read as voiced when they appear alone, so they are either repeated across two cells or paired with the killer |
| Vowels | Space-separated; tells the software which units are vowels |
| Transcription units | Space-separated, digraphs included, e.g. `th dh ch á â a e …` |
| Spelling → glyph letter | One per line, e.g. `dh=th`, `b=p`, `ch=h`, folding voiced sounds and digraphs into the letters used in the glyph table |
| How many copies a vowel gets | e.g. `á é = 2`, `â ê = 3`: half-long and long vowels are written once more in the middle |
| Base vowel of a long vowel | e.g. `á=a`, telling the software which plain vowel a vowel with a diacritic is based on |

The packing logic: a short vowel between two grid cells is written twice; a voiceless sound appears across two cells while a voiced one appears only once; word-initial voiceless sounds and consonants with no vowel to pack with get the killer; in the headword part before a middle dot, the killer and long-vowel marks may be omitted. **Without a killer reading**, a word-final consonant with no vowel to pack with is simply written as the consonant itself, without borrowing a vowel — so the preview doesn't grow an extra vowel out of nowhere.

The Kessar script of Theusrin (瑟乌丝林语) is configured this way following the "Writing rules" chapter of its grammar. Checked against the spellings of 414 words in that grammar, about 60% match exactly; most of the rest are cases where the grammar writes a whole root with its inherent-sound glyph — that is lexical information, and can be filled in by hand in the entry's **Script form** to override.

## 5. Preview

The **Preview** sub-page shows the first 40 lexicon entries and the first 10 corpus sentences converted to the script, to help check the rules.

## 6. Connections

| Where | What you see |
|---|---|
| Lexicon list | Tick "Script: name" under **Columns** to add a column shown in the script's font |
| Lexicon Edit mode | The **Script form** field overrides the automatic result by hand (for logographic scripts and irregular spellings) |
| Entry card / hover card | A script line below the headword |
| Corpus | A script line at the top of the editor and of list cards; all exports (Leipzig, Markdown, HTML, LaTeX) include the script line; custom templates use `{{script}}` |
| Phrasebook | A script line at the top of each card |
| Dictionary export | The script follows the headword (can be turned off) |
| Character panel | The **project characters** tab lists every glyph of the current language; click to insert |
| Theme | Each script can be given its own font (taking priority over the script's own font); the "custom script" font slot is the default when there is no font |

## 7. Tips

- Want the script to apply **only to some words**? Set the **Script form** of the words you don't want converted to the same text as the headword.
- No system font can display Private Use Area (PUA) glyphs, so embed the font. A font assigned to a script in Theme only applies on your computer; projects you send to others rely on the embedded font.
- A large font file (several MB) makes the project file larger too. That is a deliberate trade-off: the project carries everything it needs.
- Hand-drawn glyphs are stored as strokes (tens to hundreds of points) and outlines inside the project file, so they show up on another computer without any extra font. To use them in other software, [export the font](#export-font).
