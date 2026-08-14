#!/usr/bin/env python3
"""Check that every site-relative link in the source resolves to something.

Runs against the SOURCE tree, not a built _site, so it needs no Ruby. It
resolves a link if any of these matches:

  * a file that exists in the repo            (/images/fav.png)
  * a `permalink:` declared in front matter   (/laim/sindarin/)
  * a directory containing index.html         (/gell/EPT/)

Two classes of bug this catches and a browser will not, until it is live:

  * case mismatches — GitHub Pages serves from a case-sensitive filesystem,
    Windows does not, so `LHman.mp3` vs `Lhman.mp3` only breaks in production
  * Unicode normalisation — `Shikṛin` written with U+1E5B is a different URL
    from the repo's `r` + U+0323, and only one of them exists

Usage:  python script/linkcheck.py          (exit 1 if anything is unresolved)
"""
import glob
import io
import os
import re
import sys
import unicodedata
import urllib.parse

try:
    import yaml
except ImportError:
    sys.exit("需要 PyYAML：python -m pip install pyyaml")

try:
    sys.stdout.reconfigure(encoding='utf-8')
except Exception:
    pass

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), os.pardir))

# Matched against individual path COMPONENTS, never as substrings: the repo
# directory is itself named "kinnuch.github.io", which contains ".git".
SKIP_DIRS = {'.git', '_site', 'node_modules', '__pycache__', '.jekyll-cache'}

LINK_RE = re.compile(r'\]\((/[^)\s]*)\)')
HREF_RE = re.compile(r'(?:href|src)="(/[^"]*)"')
ABS_RE = re.compile(r'https://kinnuch\.github\.io(/[^)"\s]*)')
YML_RE = re.compile(r'url:\s*(/\S+)')


def norm(p):
    """Canonical path, byte-exact apart from URL decoding and trailing slash.

    Deliberately does NOT apply Unicode normalisation. A web server compares
    percent-decoded bytes: `shikṛin` written as U+1E5B is a different path
    from the repo's `r` + U+0323, and only one of them exists on disk.
    Normalising here would fold the two together and hide exactly the bug
    this script exists to find.
    """
    p = urllib.parse.unquote(p)
    p = p.split('#')[0].split('?')[0]
    if p.endswith('index.html'):
        p = p[:-len('index.html')]
    if len(p) > 1 and p.endswith('/'):
        p = p[:-1]
    return p or '/'


def nfc(p):
    return unicodedata.normalize('NFC', p)


def collect_targets():
    targets = {'/'}
    md_files = []
    for dirpath, dirnames, filenames in os.walk(ROOT):
        dirnames[:] = [d for d in dirnames if d not in SKIP_DIRS]
        rel_dir = os.path.relpath(dirpath, ROOT)
        if 'index.html' in filenames:
            targets.add(norm('/' + ('' if rel_dir == '.' else rel_dir.replace(os.sep, '/'))))
        for fn in filenames:
            rel = os.path.relpath(os.path.join(dirpath, fn), ROOT)
            targets.add(norm('/' + rel.replace(os.sep, '/')))
            if fn.endswith('.md'):
                md_files.append(os.path.join(dirpath, fn))

    for path in md_files:
        text = io.open(path, encoding='utf-8').read()
        if not text.startswith('---'):
            continue
        end = text.find('\n---', 3)
        try:
            front = yaml.safe_load(text[3:end]) or {}
        except Exception:
            continue
        if isinstance(front, dict) and front.get('permalink'):
            targets.add(norm(str(front['permalink'])))
    return targets


def main():
    os.chdir(ROOT)
    targets = collect_targets()

    sources = sorted(set(
        glob.glob('*.md') + glob.glob('cerf/*.md') + glob.glob('laim/*.md') +
        glob.glob('_data/*.yml') + glob.glob('_includes/*.html') +
        glob.glob('_layouts/*.html')
    ))

    # Second index, folded to NFC, used only to explain a miss.
    by_nfc = {}
    for t in targets:
        by_nfc.setdefault(nfc(t), t)

    missing, mismatched, checked = [], [], 0
    for path in sources:
        text = io.open(path, encoding='utf-8').read()
        links = set(LINK_RE.findall(text)) | set(HREF_RE.findall(text)) | set(ABS_RE.findall(text))
        if path.endswith('.yml'):
            links |= set(YML_RE.findall(text))
        for link in links:
            if link.startswith('//') or '{{' in link or '{%' in link:
                continue
            checked += 1
            target = norm(link)
            if target in targets:
                continue
            actual = by_nfc.get(nfc(target))
            if actual is not None:
                mismatched.append((path, link, actual))
            else:
                missing.append((path, link))

    print('checked %d internal links across %d files' % (checked, len(sources)))

    if mismatched:
        print('\n%d UNICODE NORMALISATION MISMATCH '
              '(the target exists, but under different bytes — 404 in production):' % len(mismatched))
        for path, link, actual in sorted(mismatched):
            print('  %s' % path)
            print('      link writes : %s' % codepoints(link))
            print('      disk has    : %s' % codepoints(actual))

    if missing:
        print('\n%d UNRESOLVED:' % len(missing))
        for path, link in sorted(missing):
            print('  %-36s %s' % (path, link))

    if mismatched or missing:
        return 1
    print('all resolve')
    return 0


def codepoints(s):
    """Render the non-ASCII part of a path as codepoints, so an NFC/NFD
    difference is visible instead of looking like the same string twice."""
    out = []
    for ch in s:
        out.append(ch if ord(ch) < 128 else '<U+%04X>' % ord(ch))
    return ''.join(out)


if __name__ == '__main__':
    sys.exit(main())
