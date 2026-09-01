#!/usr/bin/env python3
"""Regenerate laim/Theusṛin.md from the Gilatod wiki.

The wiki page is the live source of truth for this grammar; the script does the
mechanical wikitext → kramdown pass (templates, tables, interlinear glosses,
<ref> footnotes) so a wiki edit can be pulled down without hand-porting it.

One section is NOT taken from the wiki: `## 演化`. The sound-change chain only
exists locally, so it is lifted out of the current page and spliced back in.

科飒尔文 lives in the private use area (U+F300–F380). The glyphs travel inside
the wikitext as-is; assets/fonts/kessar.woff2 is a subset of the wiki's Gilatod
font covering exactly that block, so the page renders without the reader
installing anything.

Usage:
    python script/sync_theusrin.py                  # fetch and rewrite the page
    python script/sync_theusrin.py --dry-run        # print stats, touch nothing
    python script/sync_theusrin.py --from cache.txt # use a saved wikitext dump
"""
import argparse
import html
import io
import os
import re
import sys
import urllib.request

WIKI_URL = ('https://wiki.gilatod.art/index.php'
            '?title=%E7%91%9F%E4%B9%8C%E4%B8%9D%E6%9E%97%E8%AF%AD&action=raw')
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
# NB: the repo spells ṛ as r + U+0323 (NFD). Precomposed U+1E5B is a different
# URL and 404s on GitHub Pages — see script/linkcheck.py.
PAGE = os.path.join(ROOT, 'laim', 'Theus\u0072\u0323in.md')

FOOTNOTES = []

HEADER = """---
layout: page
permalink: /laim/Theus\u0072\u0323in/index.html
title: Theus\u0072\u0323in
description: 瑟乌丝林语语法：音系、科飒尔文、名词的四格系统与限定，附音变链与行间标注例句。
---

# Theusrin | 瑟乌丝林语

<aside class="ts-infobox">
<p class="ts-infobox__name">É·Theusrin</p>
<dl>
<dt>发音</dt><dd>/θeusrin/</dd>
<dt>本名</dt><dd>Theusrin</dd>
<dt>代码</dt><dd>ae-thsr</dd>
<dt>区域</dt><dd>亚夜梦境 › 索恩界 › 亚夜花园 › 北边境森林</dd>
<dt>文字</dt><dd><a href="#script">科飒尔文</a></dd>
<dt>语系</dt><dd><a href="/laim/shik\u0072\u0323in/">希克林语系</a> › 北希克林语支 › 瑟乌丝林语</dd>
<dt>早期形式</dt><dd><a href="/laim/Proto-Shik\u0072\u0323in/">原始希克林语</a> › 原始瑟乌丝林语 › 上古瑟乌丝林语 › 古瑟乌丝林语 › 瑟乌丝林语</dd>
</dl>
</aside>

<p class="page-note">本页与 <a href="https://wiki.gilatod.art/index.php?title=%E7%91%9F%E4%B9%8C%E4%B8%9D%E6%9E%97%E8%AF%AD">Gilatod Wiki 的瑟乌丝林语条目</a>同源，语法主体以 wiki 为准；<a href="#evolution">演化</a>一节的音变链只在本站列出。科飒尔文以私用区码位（U+F300–F380）呈现，页面自带 <code>Kessar</code> 字体，无需另装。配套资源：<a href="/laim/shikrin.assets/SCA/SCA.html">SCA 音变器</a>、<a href="/laim/shikrin.assets/ShikrinDatabase/ShikrinDictionary.html">希克林语词典</a>、<a href="#ime">科飒尔文输入法</a>。</p>

"""

# ---------------------------------------------------------------- source prep
# Orthography brackets like <ñ> <c> <dh> are literal text, not html.
KNOWN_TAGS = ('br', 'sup', 'sub', 'ref', 'ruby', 'rt', 'span', 'abbr',
              'div', 'p', 'b', 'i', 's', 'translate', 'languages')


def protect_angles(t):
    def f(m):
        if m.group(1).lower().strip('/') in KNOWN_TAGS:
            return m.group(0)
        return '&lt;%s&gt;' % m.group(1)
    t = re.sub(r'<(/?[A-Za-zñ]{1,4})>', f, t)
    return re.sub(r'&lt;([A-Za-zñ]{1,4})>', r'&lt;\1&gt;', t)


# ---------------------------------------------------------------- utilities
def is_kessar(ch):
    return 0xF300 <= ord(ch) <= 0xF380


def ks(text):
    return '<span class="kessar">%s</span>' % text


def esc_lt(t):
    t = t.replace('<', '&lt;').replace('>', '&gt;')
    # superscripts inside a gloss are meaningful (6&lt;sup&gt;3 = 216)
    return re.sub(r'&lt;(/?su[pb])&gt;', r'<\1>', t)


def split_params(body):
    """Split a template body on top-level | (respecting nested {{ }} and [[ ]])."""
    parts, buf, d1, d2 = [], [], 0, 0
    i = 0
    while i < len(body):
        c2 = body[i:i + 2]
        if c2 == '{{': d1 += 1; buf.append(c2); i += 2; continue
        if c2 == '}}': d1 -= 1; buf.append(c2); i += 2; continue
        if c2 == '[[': d2 += 1; buf.append(c2); i += 2; continue
        if c2 == ']]': d2 -= 1; buf.append(c2); i += 2; continue
        if body[i] == '|' and d1 == 0 and d2 == 0:
            parts.append(''.join(buf)); buf = []; i += 1; continue
        buf.append(body[i]); i += 1
    parts.append(''.join(buf))
    return parts


def find_templates(text):
    """Yield (start, end, name, body) for every top-level {{...}}."""
    i = 0
    while i < len(text):
        j = text.find('{{', i)
        if j < 0:
            return
        d, k = 0, j
        while k < len(text):
            if text[k:k + 2] == '{{':
                d += 1; k += 2
            elif text[k:k + 2] == '}}':
                d -= 1; k += 2
                if d == 0:
                    break
            else:
                k += 1
        else:
            return
        yield j, k, split_params(text[j + 2:k - 2])[0].strip(), text[j + 2:k - 2]
        i = k


# ---------------------------------------------------------------- links
PAGES = {
    '原始希克林语': '/laim/Proto-Shik\u0072\u0323in/',
    '希克林语系':   '/laim/shik\u0072\u0323in/',
    '群岛希克林语': '/laim/ArchipelagoShikrin/',
}
# anchors only for sections that actually exist on this page
ANCHORS = {
    '瑟乌丝林语#词干重整':     '#stem-reorg',
    '瑟乌丝林语#及物格':       '#case-tr',
    '瑟乌丝林语#斜格':         '#case-obl',
    '瑟乌丝林语#欠格':         '#case-abe',
    '瑟乌丝林语#名词的数与格': '#number-case',
    '瑟乌丝林语#名词的限定':   '#determination',
    '瑟乌丝林语#语流前缀':     '#flow',
    '瑟乌丝林语#人称中缀':     '#person',
    '瑟乌丝林语#时定式':       '#tense-fixing',
    '瑟乌丝林语#否定':         '#negation',
    '瑟乌丝林语#演化':         '#evolution',
    '科飒尔文':                '#script',
}


def conv_link(m):
    inner = m.group(1)
    if inner.startswith(('分类:', 'Category:', '文件:')):
        return ''
    target, _, label = inner.partition('|')
    if target in ANCHORS:
        return '[%s](%s)' % (label or target.split('#')[-1], ANCHORS[target])
    if target in PAGES:
        return '[%s](%s)' % (label or target, PAGES[target])
    return label or target.split('#')[-1]   # lore terms stay plain text


# ---------------------------------------------------------------- templates
def render_template(name, body):
    named, pos = {}, []
    for a in split_params(body)[1:]:
        m = re.match(r'^\s*([\u4e00-\u9fffA-Za-z ]+?)\s*=\s*(.*)$', a, re.S)
        if m:
            named[m.group(1)] = m.group(2)
        else:
            pos.append(a)

    if name == 'Tip':
        term = convert(pos[0]) if pos else ''
        if not term.strip():
            return ''
        if len(pos) < 2 or not pos[1].strip():
            return term
        defi = html.escape(re.sub(r'<[^>]+>', '', pos[1]), quote=True)
        return '<abbr class="ts-tip" title="%s">%s</abbr>' % (defi, term)

    if name == 'Ruby':
        base = pos[0] if pos else ''
        rt = pos[1] if len(pos) > 1 else ''
        if base and all(is_kessar(c) for c in base):
            # glyph tables annotate as 意义+读音, e.g. 天anc
            m = re.match(r'^([\u4e00-\u9fff·]+)(.*)$', rt)
            sense, read = (m.group(1), m.group(2)) if m else ('', rt)
            sense_html = '<span class="ks-cell__sense">%s</span>' % sense if sense else ''
            return ('<span class="ks-cell">%s%s<span class="ks-cell__read">%s</span></span>'
                    % (ks(base), sense_html, read))
        return '<ruby>%s<rt>%s</rt></ruby>' % (convert(base), convert(rt))

    if name == 'IPA':
        return '<span class="ipa">%s</span>' % convert(pos[0] if pos else '')

    if name in ('gloss', 'Gloss ae-thsr'):
        return render_gloss(name, pos, named)

    if name == '提示':
        cls = {'警告': 'tool-warn',
               '错误': 'page-note'}.get(named.get('类型', '').strip(), 'tool-note')
        return '\n\n<div class="%s" markdown="span">%s</div>\n\n' % (
            cls, convert(pos[0]) if pos else '')

    if name == '引用':
        return ('\n\n<blockquote class="ts-quote" markdown="span">%s</blockquote>\n\n'
                % (convert(pos[0]) if pos else ''))

    if name in ('更多信息', '主条目'):
        lead = '延伸阅读' if name == '更多信息' else '主条目'
        link = re.sub(r'\[\[([^\]]+)\]\]', conv_link, '[[' + pos[0] + ']]')
        return '\n\n<p class="ts-seealso" markdown="span">%s：%s</p>\n\n' % (lead, link)

    if name == '可隐藏/标准块':
        # markdown="1" or kramdown leaves the tables inside as literal text
        return ('\n\n<details class="ts-fold" markdown="1">\n<summary>%s</summary>\n'
                % named.get('标题', '展开').strip())

    if name == '结束可隐藏':
        return '\n</details>\n\n'

    return ''          # 编辑中 / 语言信息框 are rebuilt by HEADER


# ---------------------------------------------------------------- gloss
def render_gloss(name, pos, named):
    """{{Gloss}} carries four aligned rows: glyphs, latin, per-glyph readings
    and the morphological gloss. 分块注释 holds the last two, ;-separated,
    spelling half first."""
    if name == 'gloss':
        first = pos[0] if pos else ''
        trans = pos[1] if len(pos) > 1 else ''
        parts = re.split(r'<br\s*/?>', first)
        kessar_line = parts[0].strip()
        latin_line = parts[1].strip() if len(parts) > 1 else ''
    else:
        kessar_line = pos[0].strip() if pos else ''
        latin_line = pos[1].strip() if len(pos) > 1 else ''
        trans = pos[2].strip() if len(pos) > 2 else ''

    items = named.get('分块注释', '').split(';')
    while items and not items[-1].strip():
        items.pop()
    sep = next((i for i, it in enumerate(items) if not it.strip()), None)
    if sep is not None:
        spell, morph = items[:sep], items[sep + 1:]
    else:
        h = len(items) // 2
        spell, morph = items[:h], items[h:]

    kwords = [w for w in kessar_line.split(' ') if w.strip()]
    lwords = [w for w in latin_line.split(' ') if w.strip()]
    n = max(len(kwords), len(lwords), len(spell), len(morph))
    at = lambda l, i: l[i].strip() if i < len(l) else ''

    cells = []
    for i in range(n):
        rows = []
        for cls, val, esc in (('gl__ks', at(kwords, i), False),
                              ('gl__lat', at(lwords, i), True),
                              ('gl__spell', at(spell, i), True),
                              ('gl__morph', at(morph, i), True)):
            if val:
                rows.append('<span class="%s">%s</span>'
                            % (cls, esc_lt(val) if esc else val))
        cells.append('<span class="gl__w">%s</span>' % ''.join(rows))

    # a <ref> in the translation cannot become a footnote here: the block is
    # markdown="0", so kramdown never sees the [^n] marker. Inline it.
    tr = convert(trans).strip()
    note = []
    tr = re.sub(r'\[\^(\d+)\]',
                lambda m: note.append(FOOTNOTES[int(m.group(1)) - 1]) or '', tr)
    if note:
        tr += '<span class="gl__src">%s</span>' % convert(note[0]).strip()

    return ('\n\n<div class="gloss" markdown="0">\n<div class="gloss__row">%s</div>\n'
            '<div class="gloss__tr">%s</div>\n</div>\n\n' % (''.join(cells), tr))


# ---------------------------------------------------------------- tables
def conv_table(block):
    caption, rows, cur = None, [], None
    for ln in block.split('\n'):
        s = ln.strip()
        if s.startswith('{|') or s.startswith('|}') or not s:
            continue
        if s.startswith('|+'):
            caption = s[2:].strip(); continue
        if s.startswith('|-'):
            if cur is not None:
                rows.append(cur)
            cur = None; continue
        if s.startswith('!'):
            # a header line may separate cells with !! or ||
            cells = [c.strip() for c in re.split(r'\s*(?:!!|\|\|)\s*', s[1:])]
            if cur is None:
                cur = [True, []]
            cur[0] = True; cur[1].extend(cells); continue
        if s.startswith('|'):
            cells = [c.strip() for c in re.split(r'\s*\|\|\s*', s[1:])]
            if cur is None:
                cur = [False, []]
            cur[1].extend(cells); continue
    if cur is not None:
        rows.append(cur)
    rows = [r for r in rows if any(c for c in r[1])]
    if not rows:
        return ''

    width = max(len(r[1]) for r in rows)
    for r in rows:
        r[1] += [''] * (width - len(r[1]))

    def cell(c, strong=False):
        t = convert(c).replace('\n', ' ').replace('|', '\\|').strip()
        if strong and t and not t.startswith('**'):
            t = '**%s**' % t
        return t

    out = []
    if caption:
        out.append('<p class="table-caption">%s</p>\n' % convert(caption))
    if rows[0][0]:
        head, body = rows[0][1], rows[1:]
    else:
        head, body = [''] * width, rows
    out.append('| ' + ' | '.join(cell(c) for c in head) + ' |')
    out.append('|' + '|'.join([' :--: '] * width) + '|')
    for is_head, cs in body:
        # a second "!" row inside one table is a sub-header; bold it
        out.append('| ' + ' | '.join(cell(c, is_head) for c in cs) + ' |')
    # kramdown needs a blank line before a table, even after a heading
    return '\n\n' + '\n'.join(out) + '\n\n'


# ---------------------------------------------------------------- main pass
def convert(text):
    if text is None:
        return ''

    def ref(m):
        FOOTNOTES.append(m.group(1))
        return '[^%d]' % len(FOOTNOTES)
    text = re.sub(r'<ref>(.*?)</ref>', ref, text, flags=re.S)

    out, last = [], 0
    for st, en, name, body in find_templates(text):
        out.append(text[last:st])
        out.append(render_template(name, body))
        last = en
    out.append(text[last:])
    text = ''.join(out)

    text = re.sub(r'\[\[([^\]]+)\]\]', conv_link, text)
    text = re.sub(r'\[(https?://\S+?) ([^\]]+)\]', r'[\2](\1)', text)
    text = re.sub(r"'''(.+?)'''", r'**\1**', text, flags=re.S)
    text = re.sub(r"''(.+?)''", r'*\1*', text, flags=re.S)
    text = re.sub(r'[\uF300-\uF380]+', lambda m: ks(m.group(0)), text)
    return text


def cleanup(t):
    prev = None
    while prev != t:      # collapse nested identical kessar wrappers
        prev = t
        t = re.sub(r'<span class="kessar">(<span class="kessar">.*?</span>)</span>',
                   r'\1', t)
    # the wiki writes '''辅音（Lether '''<glyph>''')''' — a bold run ending in a
    # space is not emphasis in kramdown, so fold the glyph into one bold span
    t = re.sub(r'\*\*([^*\n]*?) \*\*(<span class="kessar">[^<]*</span>)\*\*([^*\n]*?)\*\*',
               r'**\1 \2\3**', t)
    t = re.sub(r'\*\*([^*\n]*?)(<span class="kessar">[^<]*</span>)\*\*'
               r'(<span class="kessar">[^<]*</span>)\*\*([^*\n]*?)\*\*',
               r'**\1\2\3\4**', t)
    t = re.sub(r'\n{4,}', '\n\n\n', t)
    return re.sub(r'^----+$', '', t, flags=re.M)


# ---------------------------------------------------------------- headings
HEAD_IDS = {
    '音系': 'phonology', '辅音': 'consonants', '元音': 'vowels',
    '单元音': 'monophthongs', '双元音': 'diphthongs',
    '音节结构': 'syllable', '重音规则': 'stress',
    '文字': 'script', '文字概述': 'script-overview', '文字构成': 'script-inventory',
    '本征音': 'intrinsic', '特征音': 'characteristic', '二分音': 'bipartite',
    '数字符号': 'numerals', '标点符号': 'punctuation',
    '书写规则': 'writing-rules', '转写示例': 'sample-text', '输入法': 'ime',
    '缩写': 'abbreviations', '形态': 'morphology', '名词形态': 'nouns',
    '名词概述': 'noun-overview', '词干重整': 'stem-reorg', '元音交替': 'ablaut',
    '模式一：极静式': 'acrostatic', '模式二：前动式': 'proterokinetic',
    '模式三：后动式': 'hysterokinetic', '模式四：侧动式': 'amphikinetic',
    '名词的数与格': 'number-case', '字典形': 'case-lex', '及物格': 'case-tr',
    '不及物格': 'case-noms', '斜格': 'case-obl', '欠格': 'case-abe',
    '格系统小结': 'case-summary', '变格法': 'declensions',
    '名词的限定': 'determination', '一般限定': 'det-general',
    '全指限定': 'det-universal', '领属限定': 'det-possessive',
    '指示限定': 'det-demonstrative', '零指限定': 'det-zero',
    '其他限定': 'det-other',
    '形容词形态': 'adjectives',
    '动词形态': 'verbs', '动词概述': 'verb-overview',
    '动词的基本形式': 'verb-forms', '动词结构': 'verb-structure',
    '动词头': 'verb-head', '插槽与标记元音': 'slots', '感音': 'emotive',
    '式': 'mood', '体与时': 'aspect-tense', '否定': 'negation',
    '固定组合': 'idiomatic-heads', '动词头的回指': 'head-anaphora',
    '动词干': 'verb-stem', '语流前缀': 'flow', '人称中缀': 'person',
    '言据后缀': 'evidentials', '时定式': 'tense-fixing',
    '句法': 'syntax', '构词': 'word-formation', '演化': 'evolution', '备注': 'notes',
}
# kramdown's auto_ids strips CJK to nothing, so every heading gets an explicit
# ASCII id — otherwise the in-page anchors all collapse to "section-N".
STUBS = {'变格法': 5, '领属限定': 5, '指示限定': 5, '零指限定': 5, '其他限定': 5,
         '形容词形态': 3, '句法': 2, '构词': 2}


def head(level, title):
    hid = HEAD_IDS.get(title)
    return '%s %s%s' % ('#' * level, title, ' {#%s}' % hid if hid else '')


def local_evolution():
    """Lift the 演化 section out of the current page; it has no wiki counterpart."""
    if not os.path.exists(PAGE):
        return '\n'
    s = io.open(PAGE, encoding='utf-8').read()
    m = re.search(r'^' + re.escape(head(2, '演化')) + r'\s*$(.*?)^## ', s,
                  re.S | re.M)
    if not m:
        m = re.search(r'^## 演化\s*$(.*?)^(?:## |\[\^1\]:)', s, re.S | re.M)
    if not m:
        print('  ! no 演化 section found in the current page; leaving it empty',
              file=sys.stderr)
        return '\n'
    return m.group(1).rstrip() + '\n\n'


def build(wikitext):
    text = protect_angles(wikitext)
    text = text.replace('<languages/>', '')
    text = re.sub(r'</?translate>', '', text)
    text = re.sub(r'<!--T:\d+-->', '', text)

    # tables come out first so convert() never mangles their pipes
    chunks, i = [], 0
    while True:
        j = text.find('{|', i)
        if j < 0:
            chunks.append(('text', text[i:])); break
        k = text.find('\n|}', j)
        k = len(text) if k < 0 else k + 3
        chunks.append(('text', text[i:j]))
        chunks.append(('table', text[j:k]))
        i = k

    parts = []
    for kind, body in chunks:
        if kind == 'table':
            parts.append(conv_table(body)); continue
        b = convert(body)
        b = re.sub(r'^#\s+', '1. ', b, flags=re.M)            # wiki ordered list
        for lv in (5, 4, 3, 2):
            b = re.sub(r'^' + '=' * lv + r'\s*(.+?)\s*' + '=' * lv + r'\s*$',
                       lambda m, lv=lv: head(lv, m.group(1)), b, flags=re.M)
        # "1. " paragraphs are prose enumerations, not markdown lists: the
        # blocks between them would restart the numbering
        b = re.sub(r'^(\d+)\.\s*(?=\S)', r'**\1.** ', b, flags=re.M)
        parts.append(b)

    body = cleanup(''.join(parts))

    # images the wiki carries as [[文件:…]], which conv_link drops
    body = body.replace(
        '由于晶岸环境恶劣，并没有生长类似云草',
        '<figure class="ts-fig">\n<img src="/laim/shikrin.assets/Theusrin/sael.jpeg" '
        'alt="凝锋" loading="lazy">\n<figcaption>一支精心雕琢的凝锋。</figcaption>\n</figure>\n\n'
        '由于晶岸环境恶劣，并没有生长类似云草')
    body = body.replace(
        '<summary>格系统小结</summary>\n',
        '<summary>格系统小结</summary>\n\n'
        '<figure class="ts-fig">\n<img src="/laim/shikrin.assets/Theusrin/case-system.svg" '
        'alt="瑟乌丝林语名词格系统小结" loading="lazy">\n'
        '<figcaption>名词格系统小结：各种论元应当使用的格由不同颜色标记，'
        '其数字对应左侧的四种格。</figcaption>\n</figure>\n')

    # empty upstream sections get a marker so the TOC doubles as a roadmap
    for title, lv in STUBS.items():
        body = body.replace(head(lv, title) + '\n',
                            head(lv, title) + '\n<p class="page-note">本节尚未撰写。</p>\n')

    body = body.replace(head(2, '演化') + '\n',
                        head(2, '演化') + '\n' + local_evolution())

    fn = '\n\n'.join('[^%d]: %s' % (i + 1, convert(f).strip())
                     for i, f in enumerate(FOOTNOTES))
    return HEADER + body.strip() + '\n\n' + fn + '\n'


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--from', dest='cache', help='read wikitext from a file')
    ap.add_argument('--dry-run', action='store_true')
    args = ap.parse_args()

    if args.cache:
        wikitext = io.open(args.cache, encoding='utf-8').read()
    else:
        req = urllib.request.Request(WIKI_URL, headers={'User-Agent': 'kinnuch-site-sync'})
        wikitext = urllib.request.urlopen(req).read().decode('utf-8')
    print('wikitext: %d chars' % len(wikitext))

    page = build(wikitext)
    glyphs = len(re.findall(r'[\uF300-\uF380]', page))
    print('page: %d chars | %d footnotes | %d 科飒尔文 glyphs | %d glosses'
          % (len(page), len(FOOTNOTES), glyphs, page.count('class="gloss"')))

    if args.dry_run:
        return
    # LF endings: the rest of the repo uses them, and Python text mode on
    # Windows would silently rewrite the whole file as CRLF
    with io.open(PAGE, 'w', encoding='utf-8', newline='') as f:
        f.write(page)
    print('wrote', os.path.relpath(PAGE, ROOT))


if __name__ == '__main__':
    main()
