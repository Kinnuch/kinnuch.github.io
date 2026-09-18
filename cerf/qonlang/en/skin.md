---
layout: page
permalink: /cerf/qonlang/en/skin/index.html
title: Qonlang · Skin
description: The Skin page in Qonlang — ten colour presets and your own presets, a background image, individual colours, seven font slots, downloading free-for-commercial-use fonts and importing local fonts.
---

# Skin

[← Guide index](/cerf/qonlang/en/) · [中文](/cerf/qonlang/skin/) · the T-shirt icon at the bottom left of the navigation bar

The skin is an **application setting** (stored in the preferences in the data folder, not in the project file): colours, a background image, the fonts used in each place, and the font library. The inspector is a live preview: each of the fifteen colours and seven font slots **has a matching sample** in it (entry card, example sentence, gloss, script, buttons, badges, list, code, plus a row of swatches for every colour at the bottom). The sentence is the first analysed sentence in the current project's corpus (current language first); its text, segmentation, gloss, translation and script line all come from that sentence, and a built-in sample is used when there are none. Changing an item on the left flashes the matching spot on the right, and hovering an item on the left outlines it on the right.

## 1. Presets

Ten built-in presets in two rows, each named "name · colour":

- First row: **Yaye Garden · Cyan** (the default look, formerly **Default**), **Forest Fantasia · Green** (formerly **Bamboo grove**), **Qiyexita · Purple** (formerly **High fantasy**), **Nuolian Isle · Indigo** (an indigo leaning towards blue, colder than Qiyexita) and **Blueland Song · Blue** (formerly **Sea**).
- Second row: **Starry Night · Black** (formerly **Ink night**; a blue-black night sky with faint yellow and blue star dots over the whole window, and star yellow as the accent in the dark theme), **Shanhaijing · Brown** (formerly **Classical Chinese**; paper-coloured background, brown accents, a kaishu interface font), **Meizhusa · Red** (red and white), **Waqifu · Yellow** (dark navy with golden yellow accents and red for warnings; in the light theme, a cream background with navy text) and **Xuelizi · Orange** (soft orange on warm white).

Each has a light and a dark palette, switched automatically by **Settings → Theme**; a preset you chose before keeps working. Presets with very bright accents use dark text on primary buttons. Clicking a preset spreads the new palette like ink from where you clicked (it switches instantly when your system asks for reduced motion).

**Your own presets**: once you have adjusted colours and fonts, click **Save as my preset** and give it a name; an existing name is overwritten. Your own presets sit on a third row, their cards show thumbnails of their own palettes, and hovering one lets you rename or delete it (deletion can be undone).

Changing any colour or font puts the current preset into the **Custom** state; you can click a preset again at any time to switch everything at once.

## 2. Background image

**Choose image** (click the thumbnail or the button) picks an image and lays it over the whole window: translucent, and it never blocks clicks. In the light theme it is multiplied onto the page and in the dark theme it is screened, so text stays readable.

| Item | Description |
|---|---|
| Fit | Fill / Fit whole / Tile / Centre / Stretch |
| Align | Centre / Top / Bottom / Left / Right; shown for **Fit whole**, **Tile** and **Centre** |
| Opacity | 0–100%, 18% by default |
| Scale | 5–300%, for **Tile** and **Centre** |
| Blur | 0–30px |

**Change image** swaps it and **Remove background** takes it away. The image is shrunk to at most 2400 px on its long side and stored in your local preferences, not in the project file; switching presets and **Reset to default** leave the background image alone.

## 3. Colours

Fifteen colours, saved separately for the current theme (light / dark): page background, panel background, sunken background, hover background, border, strong border, text, secondary text, faint text, accent, accent hover, accent tint, accent text, danger and warning. Each has a colour picker; changed items are highlighted and get a reset button.

## 4. Font slots {#4-font-slots}

| Slot | Affects |
|---|---|
| Interface | Menus, buttons, descriptive text |
| Language data | Headwords, rules, IPA and other conlang data (default Gentium Plus, with a built-in Latin subset) |
| Monospace | Rule source code, and glosses by default |
| Corpus text | Sentence text and the segmentation line, phrase text |
| Corpus translation | Translations, the body of doc previews |
| Gloss line | |
| Custom script | The default font for scripts without an embedded font |

Each slot accepts several font names separated by commas, forming a fallback chain; leave it empty for the default. While typing you get suggestions from installed fonts and common system fonts.

### A font for each script

When a project is open, every custom script in the project is also listed below the font slots ("name (language)"), and each can be given its own font: after importing a font file or installing one from the font library, choose it here, and the glyph table, inspector, lexicon and corpus all switch to it for that script. This choice takes priority over the font set for the script on the Script page (including an embedded font), is stored in your local preferences and not in the project file; leave it empty to use the script's own font.

## 5. Entry card

The look of the read-only entry card in the lexicon's inspector is set here, and changes take effect immediately (stored in your local preferences, not in the project file):

- **Font size of each block**: every block in the list (headword & pronunciation, senses, tags, etymology, history, stems, inflected forms, relations, derived words, notes) has a slider on its right, directly in pixels (10–30, default 15; changed values are shown in the accent colour); all the text in that block scales in proportion. **Headword & pronunciation** is fixed at the top: only its size can be changed, not its position. Multipliers set in 0.8.0 are converted to font sizes automatically.
- **Block order**: the nine blocks senses, tags, etymology, history, stems, inflected forms, relations, derived words and notes can be reordered by pressing a row and dragging it up or down (dragging on the slider only changes the size and doesn't move the row); hovering outlines the row with a dashed border. **Reset** restores both order and sizes.
- **Preview**: the preview in the inspector on the right contains a real entry card (using the word in the project with the most complete senses, etymology, inflected forms, relations and so on; a built-in sample when the project has no entries yet), so changes to size and order are visible immediately. Hovering a row on the left draws a dashed outline around that block in the preview card (no outline if this word has nothing in that block), and the preview card scrolls into view when you start dragging or moving a slider.
- Your own **inspector modules** are not in this list — they follow the senses and etymology according to their own **position** setting (see [Lexicon](/cerf/qonlang/en/lexicon/)).

## 6. Font library

A built-in catalogue of 31 fonts that are **free for commercial use** (OFL / Apache), each downloadable to the data folder with one click (they remain after restarting):

- Chinese: LXGW WenKai (Simplified / Traditional), Source Han Serif, Source Han Sans, Ma Shan Zheng, Zhi Mang Xing, Long Cang
- **gilatod unicode**: the standard font of the 【荏苒之境】 encyclopedia, bundled with the app — just click **Install**, no internet needed
- Latin / IPA: Charis SIL, Gentium Plus, Andika, Cardo
- Interface sans-serif: Inter, Noto Sans, Fira Sans, IBM Plex Sans
- Body serif: Noto Serif, EB Garamond, Libre Baskerville, Lora, Source Serif 4, Merriweather
- High fantasy: Cinzel, Uncial Antiqua, MedievalSharp
- Scripts: Noto Sans Runic, Noto Sans Old Turkic, Noto Sans Symbols 2
- Monospace: JetBrains Mono, Fira Code, Noto Sans Mono

Downloads show their progress; on networks in mainland China you can enter a GitHub accelerator prefix (such as `https://ghfast.top/`). You can also **Add from local file** (TTF / OTF / WOFF / WOFF2); the font family name is read from the file and registered. Just type an installed font's name into a font slot to use it.

## 7. Connections to other modules

- **Script**: a font assigned to a script in the Skin is used for it; otherwise the font set on the Script page (a system font name or an embedded font) is used, and failing both, the **Custom script** slot.
- **Settings → Language data font** is a project setting (it travels with the project), while the Skin's **Language data** slot is an application setting; when both are set, the project setting wins.
- Dictionary exports use the language data font from the project settings.
