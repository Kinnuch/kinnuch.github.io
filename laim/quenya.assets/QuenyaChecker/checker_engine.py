#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
QuenyaChecker 检查引擎 v2
基于 eldamo.org 和灰机wiki（昆雅语详细语法）语法规则
全面词形验证：动词变位、名词变格、形容词一致、句法检查
"""

import re
import sys
import os

# ============================================================
# PHONOLOGY CONSTANTS
# ============================================================

VOWELS = set("aeiouyáéíóú")
SHORT_VOWELS = set("aeiou")
LONG_VOWELS = set("áéíóú")
LONG_TO_SHORT = {"á": "a", "é": "e", "í": "i", "ó": "o", "ú": "u"}
SHORT_TO_LONG = {v: k for k, v in LONG_TO_SHORT.items()}
ALL_VOWELS = SHORT_VOWELS | LONG_VOWELS
CONSONANTS = set("bcdfghjklmnpqrstvwxyz")
VALID_FINAL_CONSONANTS = set("lnrst")

VALID_CLUSTERS = {
    "cc", "ht", "ld", "lm", "lp", "lt", "lv", "lw", "ly",
    "mb", "mm", "mn", "mp", "nc", "nd", "ng", "ngw", "nk", "nn",
    "nt", "nqu", "nw", "ny", "ps", "pt", "qu",
    "rc", "rd", "rm", "rn", "rp", "rq", "rqu", "rr", "rs", "rt", "rw", "ry",
    "sc", "sk", "sl", "sm", "sn", "sp", "sq", "ss", "st", "sw",
    "ts", "tt", "tw", "ty",
    "hw", "hy", "hl", "hr",
    "lc", "lf", "lh", "ll", "ls",
    "nq", "ns", "pp", "x",
}

QUENYA_CHARS = set("abcdefghijklmnopqrstuvwxyzáéíóúëñäö")

# ============================================================
# GRAMMAR CONSTANTS
# ============================================================

CASE_SUFFIXES_ORDERED = [
    ("ssen", "locative.pl", "方位格复数"),
    ("ssë", "locative", "方位格"),
    ("nnar", "allative.pl", "向格复数"),
    ("nna", "allative", "向格"),
    ("llon", "ablative.pl", "离格复数"),
    ("llor", "ablative.pl", "离格复数"),
    ("llo", "ablative", "离格"),
    ("inen", "instrumental.pl", "工具格复数"),
    ("nen", "instrumental", "工具格"),
    ("iva", "possessive.pl", "所有格复数"),
    ("va", "possessive", "所有格"),
    ("wa", "possessive", "所有格"),
    ("ion", "genitive.pl", "属格复数"),
    ("on", "genitive.pl", "属格复数"),
    ("ëo", "genitive", "属格"),
    ("o", "genitive", "属格"),
    ("in", "dative.pl", "与格复数"),
    ("n", "dative", "与格"),
]

SUBJECT_SUFFIXES_ORDERED = [
    ("nyë", "1sg"), ("lmë", "1pl.excl"), ("lvë", "1pl.incl"),
    ("mmë", "1du.excl"), ("nquë", "1du.incl"),
    ("lyë", "2sg.pol"), ("tyë", "2sg.fam"), ("ldë", "2pl"),
    ("ssë", "3sg"), ("ntë", "3pl"), ("ltë", "3pl"),
    ("n", "1sg"), ("s", "3sg"),
]

INDEPENDENT_PRONOUNS = {
    "ni", "me", "ve", "met", "tye", "lye", "le",
    "se", "sa", "te", "tai", "tu",
}

EMPHATIC_PRONOUNS = {"inyë", "elyë", "inque", "emmë", "elwë"}

ARTICLES = {"i"}
PARTICLES = {"á", "áva", "lá", "ma", "ai", "aiya", "ela", "yé", "ná", "ui", "mecin"}
CONJUNCTIONS = {"ar", "hya", "mal", "an", "sa", "yá"}
PREPOSITIONS = {
    "mi", "nu", "or", "an", "ó", "pa", "ve", "et", "ter",
    "ara", "epë", "nó", "pá", "apa", "amba", "undu",
}
DEMONSTRATIVES = {"sina", "tana", "enta"}
INTERROGATIVES = {"man", "mana", "manen", "massë", "manna", "mallo"}

FUNCTION_WORDS = (
    ARTICLES | PARTICLES | CONJUNCTIONS | PREPOSITIONS |
    DEMONSTRATIVES | INTERROGATIVES | INDEPENDENT_PRONOUNS | EMPHATIC_PRONOUNS
)

# ============================================================
# VOCABULARY
# ============================================================

def _load_vocab():
    try:
        if getattr(sys, 'frozen', False):
            base = sys._MEIPASS
        else:
            base = os.path.dirname(os.path.abspath(__file__))
        vpath = os.path.join(base, "vocab_data.py")
        if os.path.exists(vpath):
            ns = {}
            with open(vpath, encoding="utf-8") as f:
                exec(f.read(), ns)
            return ns.get("VOCAB", {})
    except Exception:
        pass
    return {}

_RAW_VOCAB = _load_vocab()

def _classify_noun(word, pos="n"):
    if "n/u" in pos:
        return "U"
    w = word.lower().rstrip("-")
    if not w:
        return "V"
    if w.endswith("ë"):
        return "E"
    if w[-1] in CONSONANTS:
        return "C"
    return "V"

def _classify_verb(word):
    w = word.lower().rstrip("-")
    if w in ("ná", "na", "ëa", "ea"):
        return "I"
    if w.endswith("ya"):
        return "Y"
    if w.endswith("u"):
        return "U"
    if w[-1] in ALL_VOWELS and w[-1] != "ë":
        if any(w.endswith(s) for s in ("ta", "na", "pa", "sa", "la", "ra", "ma")):
            return "D"
        return "A"
    return "B"

def _get_stem_vowel(stem):
    for ch in reversed(stem):
        if ch in SHORT_VOWELS:
            return ch
        if ch in LONG_VOWELS:
            return LONG_TO_SHORT.get(ch, ch)
    return ""

class VocabEntry:
    __slots__ = ("word", "pos", "english", "noun_class", "verb_class")
    def __init__(self, word, pos, english):
        self.word = word
        self.pos = pos
        self.english = english
        self.noun_class = _classify_noun(word, pos) if "n" in pos else None
        self.verb_class = _classify_verb(word) if "v" in pos else None

VOCAB = {}
for _w, (_p, _e) in _RAW_VOCAB.items():
    VOCAB[_w.lower()] = VocabEntry(_w, _p, _e)

for _w in FUNCTION_WORDS:
    if _w not in VOCAB:
        VOCAB[_w] = VocabEntry(_w, "func", "")

# ============================================================
# VALID FORM GENERATION
# ============================================================

def _generate_noun_forms(word, entry):
    forms = set()
    w = word.lower().rstrip("-")
    nc = entry.noun_class
    forms.add(w)

    if nc == "V":
        pl = w + "r"
    elif nc == "E":
        pl = w[:-1] + "i" if w.endswith("ë") else w + "i"
    elif nc == "U":
        if w.endswith("co"):
            pl = w[:-2] + "qui"
        elif w.endswith("go"):
            pl = w[:-2] + "gwi"
        elif w.endswith("to"):
            pl = w[:-2] + "tui"
        elif w.endswith("do"):
            pl = w[:-2] + "dui"
        elif w.endswith("o"):
            pl = w[:-1] + "ui"
        else:
            pl = w + "i"
    else:
        pl = w + "i"
    forms.add(pl)

    if w.endswith("ië") or w.endswith("lë"):
        forms.add(w + "r")

    if nc in ("V", "E", "U"):
        du = w + "t"
    else:
        du = w + "u"
    forms.add(du)

    pp = w + "li"
    forms.add(pp)

    if nc == "V":
        if w.endswith("a"):
            forms.add(w[:-1] + "o")
        else:
            forms.add(w + "o")
        forms.add(w + "n")
        forms.add(w + "va")
        forms.add(w + "wa")
        forms.add(w + "nna")
        forms.add(w + "llo")
        forms.add(w + "ssë")
        forms.add(w + "nen")
    elif nc == "U":
        forms.add(w + "o")
        forms.add(w + "n")
        forms.add(w + "va")
        forms.add(w + "wa")
        forms.add(w + "nna")
        forms.add(w + "llo")
        forms.add(w + "ssë")
        forms.add(w + "nen")
    elif nc == "E":
        forms.add(w + "o")
        forms.add(w + "n")
        forms.add(w + "va")
        forms.add(w + "nna")
        forms.add(w + "llo")
        forms.add(w + "ssë")
        forms.add(w + "nen")
    else:
        forms.add(w + "o")
        forms.add(w + "en")
        forms.add(w + "n")
        forms.add(w + "eva")
        forms.add(w + "va")
        forms.add(w + "enna")
        forms.add(w + "nna")
        forms.add(w + "ello")
        forms.add(w + "llo")
        forms.add(w + "essë")
        forms.add(w + "ssë")
        forms.add(w + "anen")
        forms.add(w + "nen")

    if pl.endswith("i"):
        forms.add(pl[:-1] + "ion")
    forms.add(pl + "on")
    forms.add(pl + "n")
    forms.add(pl + "va")
    forms.add(pl + "nna")
    forms.add(pl + "nnar")
    forms.add(pl + "llo")
    forms.add(pl + "llon")
    forms.add(pl + "llor")
    forms.add(pl + "ssë")
    forms.add(pl + "ssen")
    forms.add(pl + "nen")
    forms.add(pl + "inen")

    return forms


def _generate_verb_forms(word, entry):
    forms = set()
    w = word.lower().rstrip("-")
    vc = entry.verb_class

    if vc == "I":
        if w in ("ná", "na"):
            forms.update({"ná", "na", "nánë", "né", "anáië", "nauva"})
        elif w in ("ëa", "ea"):
            forms.update({"ëa", "ea", "engë", "engië", "ëauva"})
        return forms

    if vc == "B":
        stem = w[:-1] if w.endswith("ë") else w
    elif vc in ("D", "A", "Y"):
        stem = w[:-1] if w.endswith("a") else w
    elif vc == "U":
        stem = w
    else:
        stem = w

    stem_vowel = _get_stem_vowel(stem)
    stem_final = ""
    for ch in reversed(stem):
        if ch in CONSONANTS:
            stem_final = ch
            break

    if vc == "B":
        aor = stem + "ë"
        forms.add(aor)
        forms.add(stem + "ir")  # plural agreement: matë → matir
        for suf, _ in SUBJECT_SUFFIXES_ORDERED:
            forms.add(stem + "i" + suf)
    elif vc in ("D", "A", "Y", "U"):
        forms.add(w)
        forms.add(w + "r")  # plural agreement
        for suf, _ in SUBJECT_SUFFIXES_ORDERED:
            forms.add(w + suf)

    if vc == "B":
        if stem_final in ("r", "l", "n", "m"):
            pres = stem + stem_final + "a"
        else:
            long_v = SHORT_TO_LONG.get(stem_vowel, stem_vowel)
            pres = stem.replace(stem_vowel, long_v, 1) + "a" if stem_vowel else stem + "a"
        forms.add(pres)
        forms.add(pres + "r")  # plural agreement
        for suf, _ in SUBJECT_SUFFIXES_ORDERED:
            forms.add(pres + suf)
    elif vc == "D":
        long_v = SHORT_TO_LONG.get(stem_vowel, stem_vowel)
        pres_stem = stem.replace(stem_vowel, long_v, 1) if stem_vowel else stem
        for ending in ("ëa", "ea"):
            pres = pres_stem + ending
            forms.add(pres)
            forms.add(pres + "r")  # plural agreement
            for suf, _ in SUBJECT_SUFFIXES_ORDERED:
                forms.add(pres + suf)
    elif vc == "A":
        long_v = SHORT_TO_LONG.get(stem_vowel, stem_vowel)
        pres = stem.replace(stem_vowel, long_v, 1) + "a" if stem_vowel else stem + "a"
        forms.add(pres)
        forms.add(pres + "r")  # plural agreement
        for suf, _ in SUBJECT_SUFFIXES_ORDERED:
            forms.add(pres + suf)
    elif vc == "U":
        long_v = SHORT_TO_LONG.get(stem_vowel, stem_vowel)
        pres_stem = stem.replace(stem_vowel, long_v, 1) if stem_vowel else stem
        for ending in ("a", "ua"):
            pres = pres_stem + ending
            forms.add(pres)
            forms.add(pres + "r")  # plural agreement
            for suf, _ in SUBJECT_SUFFIXES_ORDERED:
                forms.add(pres + suf)

    if vc == "B":
        if stem_final in ("p", "t", "k", "c"):
            nasal_map = {"p": "m", "t": "n", "k": "n", "c": "n"}
            nasal = nasal_map[stem_final]
            idx = stem.rfind(stem_final)
            past = stem[:idx] + nasal + stem_final + "ë"
        elif stem_final == "r":
            past = stem + "në"
        elif stem_final == "l":
            past = stem + "lë"
        elif stem_final == "n":
            past = stem + "në"
        elif stem_final == "m":
            past = stem + "në"
        else:
            past = stem + "në"
        forms.add(past)
        forms.add(past + "r") if past.endswith("ë") else None  # plural: mantër
        if past.endswith("ë"):
            forms.add(past[:-1] + "ir")  # plural alt: mantir
        for suf, _ in SUBJECT_SUFFIXES_ORDERED:
            forms.add(past + suf)
            if past.endswith("ë"):
                forms.add(past[:-1] + "i" + suf)
    elif vc in ("D", "A", "Y", "U"):
        past = w + "në"
        forms.add(past)
        forms.add(past + "r")  # plural agreement
        for suf, _ in SUBJECT_SUFFIXES_ORDERED:
            forms.add(past + suf)

    aug_map = {"a": "a", "e": "a", "i": "i", "o": "u", "u": "u"}
    if vc == "B":
        aug = aug_map.get(stem_vowel, "a")
        long_v = SHORT_TO_LONG.get(stem_vowel, stem_vowel)
        perf_stem = stem.replace(stem_vowel, long_v, 1) if stem_vowel else stem
        perf = aug + perf_stem + "ië"
        forms.add(perf)
        for suf, _ in SUBJECT_SUFFIXES_ORDERED:
            forms.add(perf + suf)
    elif vc in ("D", "A", "Y"):
        aug = aug_map.get(stem_vowel, "a")
        perf = aug + stem + "ië"
        forms.add(perf)
        for suf, _ in SUBJECT_SUFFIXES_ORDERED:
            forms.add(perf + suf)

    if vc == "B":
        fut = stem + "uva"
    else:
        fut = w + "uva"
    forms.add(fut)
    forms.add(fut + "r")  # plural agreement: matuvar
    for suf, _ in SUBJECT_SUFFIXES_ORDERED:
        forms.add(fut + suf)

    if vc == "B":
        forms.add(stem + "ila")
    else:
        forms.add(w + "la")
        if w.endswith("a"):
            forms.add(w[:-1] + "ala")

    if vc == "B":
        forms.add(stem + "ina")
    elif w.endswith("a"):
        forms.add(w[:-1] + "ina")
    else:
        forms.add(w + "ina")

    if vc == "B":
        forms.add(stem + "ië")
    elif w.endswith("a"):
        forms.add(w[:-1] + "ië")
    else:
        forms.add(w + "ië")

    return forms


def _generate_adj_forms(word, entry):
    forms = set()
    w = word.lower()
    forms.add(w)

    if w.endswith("ëa"):
        forms.add(w[:-2] + "ië")
    elif w.endswith("a"):
        forms.add(w[:-1] + "ë")
    elif w.endswith("ë"):
        forms.add(w[:-1] + "i")

    if w.endswith("a"):
        forms.add(w + "vë")

    return forms


VALID_FORMS = {}

def _build_valid_forms():
    for w, entry in VOCAB.items():
        if entry.pos == "func":
            VALID_FORMS.setdefault(w, []).append((entry, "func"))
            continue

        if "n" in entry.pos:
            for form in _generate_noun_forms(w, entry):
                VALID_FORMS.setdefault(form, []).append((entry, "noun"))

        if "v" in entry.pos:
            for form in _generate_verb_forms(w, entry):
                VALID_FORMS.setdefault(form, []).append((entry, "verb"))

        if "adj" in entry.pos:
            for form in _generate_adj_forms(w, entry):
                VALID_FORMS.setdefault(form, []).append((entry, "adj"))

        VALID_FORMS.setdefault(w, []).append((entry, "base"))

_build_valid_forms()

# ============================================================
# CHECKER ENGINE
# ============================================================

class Issue:
    ERROR = "error"
    WARNING = "warning"
    INFO = "info"

    def __init__(self, level, word_idx, word, message, suggestion=""):
        self.level = level
        self.word_idx = word_idx
        self.word = word
        self.message = message
        self.suggestion = suggestion

    def __str__(self):
        tag = {"error": "❌ 错误", "warning": "⚠ 警告", "info": "ℹ 提示"}[self.level]
        s = f"{tag} [{self.word_idx+1}] \"{self.word}\": {self.message}"
        if self.suggestion:
            s += f" → 建议: {self.suggestion}"
        return s


def normalize(text):
    text = text.strip().lower()
    text = text.replace("ē", "ë").replace("ē", "ë")
    return text


def tokenize(text):
    text = normalize(text)
    text = re.sub(r"[.!?;:,\"'()（）。！？；：，“”‘’「」]", " ", text)
    return [w for w in text.split() if w]


def strip_case_suffix(word):
    for suffix, case_name, case_cn in CASE_SUFFIXES_ORDERED:
        if word.endswith(suffix) and len(word) > len(suffix):
            stem = word[:-len(suffix)]
            return stem, suffix, case_name, case_cn
    return word, "", "", ""


def strip_subject_suffix(word):
    for suffix, person in SUBJECT_SUFFIXES_ORDERED:
        if word.endswith(suffix) and len(word) > len(suffix) + 1:
            stem = word[:-len(suffix)]
            return stem, suffix, person
    return word, "", ""


def find_vocab_entry(word):
    w = word.lower()
    if w in VOCAB:
        return VOCAB[w]
    return None


def _is_bare_verb_stem(word, entry):
    if not entry or "v" not in entry.pos:
        return False
    vc = entry.verb_class
    w = word.lower()
    base = entry.word.lower().rstrip("-")
    if vc == "B":
        stem = base[:-1] if base.endswith("ë") else base
        if w == stem:
            return True
    return False


def _get_verb_aorist(entry):
    w = entry.word.lower().rstrip("-")
    vc = entry.verb_class
    if vc == "B":
        stem = w[:-1] if w.endswith("ë") else w
        return stem + "ë"
    return w


# ============================================================
# PHONOLOGY CHECK
# ============================================================

def check_phonology(word, idx):
    issues = []
    w = word.lower()

    for ch in w:
        if ch not in QUENYA_CHARS:
            issues.append(Issue(Issue.WARNING, idx, word,
                f"包含非昆雅语字符 '{ch}'",
                "昆雅语仅使用拉丁字母 + á é í ó ú ë ñ"))
            break

    if w[-1] in CONSONANTS and w[-1] not in VALID_FINAL_CONSONANTS:
        issues.append(Issue(Issue.ERROR, idx, word,
            f"昆雅语词不能以 '{w[-1]}' 结尾",
            "合法的辅音结尾: l, n, r, s, t"))

    cons_run = []
    for i, ch in enumerate(w):
        if ch in CONSONANTS:
            cons_run.append(ch)
        else:
            if len(cons_run) >= 2:
                cluster = "".join(cons_run)
                if cluster not in VALID_CLUSTERS and len(cluster) <= 3:
                    issues.append(Issue(Issue.WARNING, idx, word,
                        f"辅音丛 '{cluster}' 可能不合法",
                        "请检查拼写"))
            cons_run = []
    if len(cons_run) >= 2:
        cluster = "".join(cons_run)
        if cluster not in VALID_CLUSTERS:
            issues.append(Issue(Issue.WARNING, idx, word,
                f"词尾辅音丛 '{cluster}' 可能不合法"))

    return issues


# ============================================================
# WORD FORM VALIDATION
# ============================================================

def check_word_form(word, idx, words):
    issues = []
    w = word.lower()

    if w in FUNCTION_WORDS or len(w) <= 1:
        return issues

    if w in VALID_FORMS:
        entries = VALID_FORMS[w]

        # Check if this is a bare verb stem being used as a verb
        for entry, cat in entries:
            if _is_bare_verb_stem(w, entry):
                has_noun_reading = any("n" in e.pos and c == "noun" for e, c in entries)
                if has_noun_reading:
                    if _word_likely_verb_in_context(w, idx, words):
                        aor = _get_verb_aorist(entry)
                        issues.append(Issue(Issue.WARNING, idx, word,
                            f"此词同时是名词和动词词干；若用作动词，裸词干不合法",
                            f"动词不定过去时: {aor}"))
                else:
                    aor = _get_verb_aorist(entry)
                    issues.append(Issue(Issue.ERROR, idx, word,
                        f"基础动词裸词干不能直接使用，需要变位",
                        f"不定过去时: {aor}"))
                break
        return issues

    # Word not in VALID_FORMS - check for common error patterns
    issues.extend(_check_common_errors(w, idx, word))

    if not issues:
        issues.append(Issue(Issue.INFO, idx, word,
            "未在词汇表中找到此词（可能是合法的变形或未收录词汇）"))

    return issues


def _word_likely_verb_in_context(word, idx, words):
    if idx > 0:
        prev = words[idx - 1]
        if prev == "i":
            if idx >= 2:
                return False
        prev_entry = find_vocab_entry(prev)
        if prev_entry and "n" in prev_entry.pos:
            return True
        if prev in VALID_FORMS:
            for e, cat in VALID_FORMS[prev]:
                if "n" in e.pos:
                    return True
    if idx + 1 < len(words):
        next_w = words[idx + 1]
        next_entry = find_vocab_entry(next_w)
        if next_entry and "n" in next_entry.pos:
            return True
        if next_w in VALID_FORMS:
            for e, cat in VALID_FORMS[next_w]:
                if "n" in e.pos:
                    return True
    return False


def _check_common_errors(word, idx, original):
    issues = []
    w = word.lower()

    # V-class noun plural error: *ciryai instead of ciryar
    if w.endswith("i") and not w.endswith("li"):
        base_stem = w[:-1]
        for candidate in (base_stem, base_stem + "a"):
            if candidate in VOCAB:
                entry = VOCAB[candidate]
                if "n" in entry.pos and entry.noun_class == "V":
                    issues.append(Issue(Issue.ERROR, idx, original,
                        "V类名词复数应加 -r，而非变为 -i",
                        candidate + "r"))
                    return issues

    # E-class noun plural error: *lassër instead of lassi
    if w.endswith("ër"):
        base_e = w[:-1]
        if base_e in VOCAB:
            entry = VOCAB[base_e]
            if "n" in entry.pos and entry.noun_class == "E":
                issues.append(Issue(Issue.ERROR, idx, original,
                    "E类名词复数应将 -ë 变为 -i，而非加 -r",
                    base_e[:-1] + "i"))
                return issues

    # V-class genitive error: *ciryao instead of ciryo
    if w.endswith("ao"):
        base_a = w[:-1]
        if base_a in VOCAB:
            entry = VOCAB[base_a]
            if "n" in entry.pos and entry.noun_class == "V":
                issues.append(Issue(Issue.ERROR, idx, original,
                    "V类名词(-a结尾)的属格应替换 -a 为 -o",
                    base_a[:-1] + "o"))
                return issues

    # Verb aorist suffix error: *matën instead of matin
    for suf, person in SUBJECT_SUFFIXES_ORDERED:
        if w.endswith("ë" + suf):
            stem = w[:-(len(suf) + 1)]
            check_entry = VOCAB.get(stem + "ë") or VOCAB.get(stem)
            if check_entry and "v" in check_entry.pos and check_entry.verb_class == "B":
                issues.append(Issue(Issue.ERROR, idx, original,
                    "基础动词加主格后缀时，-ë 应变为 -i",
                    stem + "i" + suf))
                return issues

    # Present tense error for r/l/n/m stems: *cára instead of carra
    for entry_w, entry in VOCAB.items():
        if "v" not in entry.pos or entry.verb_class != "B":
            continue
        stem = entry_w[:-1] if entry_w.endswith("ë") else entry_w
        stem_vowel = _get_stem_vowel(stem)
        stem_final = ""
        for ch in reversed(stem):
            if ch in CONSONANTS:
                stem_final = ch
                break
        if stem_final in ("r", "l", "n", "m") and stem_vowel:
            long_v = SHORT_TO_LONG.get(stem_vowel, stem_vowel)
            wrong_pres = stem.replace(stem_vowel, long_v, 1) + "a"
            correct_pres = stem + stem_final + "a"
            if w == wrong_pres and wrong_pres != correct_pres:
                issues.append(Issue(Issue.ERROR, idx, original,
                    f"词干末为 {stem_final} 的基础动词现在时应双写辅音，而非延长元音",
                    correct_pres))
                return issues

    # C-class noun case suffix without epenthetic vowel
    for suf, case_name, case_cn in CASE_SUFFIXES_ORDERED:
        if not w.endswith(suf):
            continue
        potential_stem = w[:-len(suf)]
        if potential_stem in VOCAB:
            entry = VOCAB[potential_stem]
            if "n" in entry.pos and entry.noun_class == "C":
                if suf == "ssë":
                    issues.append(Issue(Issue.ERROR, idx, original,
                        "C类名词方位格需要介音 -e-",
                        potential_stem + "essë"))
                    return issues
                if suf == "nen":
                    issues.append(Issue(Issue.ERROR, idx, original,
                        "C类名词工具格需要介音 -a-",
                        potential_stem + "anen"))
                    return issues
        break

    return issues


# ============================================================
# ADJECTIVE AGREEMENT CHECK
# ============================================================

def check_adj_agreement(words, idx):
    issues = []
    w = words[idx]

    if w not in VALID_FORMS:
        return issues

    adj_entries = [(e, c) for e, c in VALID_FORMS[w] if "adj" in e.pos]
    if not adj_entries:
        return issues

    adj_entry = adj_entries[0][0]
    adj_base = adj_entry.word.lower()

    noun_idx = -1
    noun_word = ""
    if idx + 1 < len(words):
        noun_idx = idx + 1
        noun_word = words[idx + 1]
    elif idx - 1 >= 0:
        noun_idx = idx - 1
        noun_word = words[idx - 1]

    if noun_idx < 0:
        return issues

    is_noun_plural = False
    if noun_word in VALID_FORMS:
        for e, cat in VALID_FORMS[noun_word]:
            if "n" in e.pos and cat == "noun":
                base = e.word.lower()
                nc = e.noun_class
                if nc == "V" and noun_word.endswith("r") and not base.endswith("r"):
                    is_noun_plural = True
                elif nc == "E" and noun_word.endswith("i") and base.endswith("ë"):
                    is_noun_plural = True
                elif nc == "C" and noun_word.endswith("i") and not base.endswith("i"):
                    is_noun_plural = True
                break

    if not is_noun_plural:
        return issues

    if adj_base.endswith("ëa"):
        expected_pl = adj_base[:-2] + "ië"
        if w != expected_pl:
            issues.append(Issue(Issue.ERROR, idx, w,
                "形容词修饰复数名词时需变为复数: -ëa → -ië",
                expected_pl))
    elif adj_base.endswith("a"):
        expected_pl = adj_base[:-1] + "ë"
        if w != expected_pl:
            issues.append(Issue(Issue.ERROR, idx, w,
                "形容词修饰复数名词时需变为复数: -a → -ë",
                expected_pl))
    elif adj_base.endswith("ë"):
        expected_pl = adj_base[:-1] + "i"
        if w != expected_pl:
            issues.append(Issue(Issue.ERROR, idx, w,
                "形容词修饰复数名词时需变为复数: -ë → -i",
                expected_pl))

    return issues


# ============================================================
# SYNTAX CHECK
# ============================================================

def check_syntax(words):
    issues = []

    for i, w in enumerate(words):
        if w in INDEPENDENT_PRONOUNS and w not in EMPHATIC_PRONOUNS:
            if i + 1 < len(words):
                next_w = words[i + 1]
                if next_w in VALID_FORMS:
                    for e, cat in VALID_FORMS[next_w]:
                        if "v" in e.pos:
                            if w == "ni":
                                issues.append(Issue(Issue.ERROR, i, w,
                                    "独立代词不能作主语，应使用主格代词后缀",
                                    f"将 'ni {next_w}' 改为动词+后缀 -n"))
                            elif w == "se":
                                issues.append(Issue(Issue.ERROR, i, w,
                                    "独立代词不能作主语，应使用主格代词后缀 -s",
                                    f"将 'se {next_w}' 改为动词+后缀 -s"))
                            elif w in ("me", "ve", "te", "le"):
                                issues.append(Issue(Issue.WARNING, i, w,
                                    "独立代词通常不作主语，建议使用主格代词后缀"))
                            break

    for i, w in enumerate(words):
        if w in ("ëa", "ea"):
            if i + 1 < len(words):
                next_w = words[i + 1]
                if next_w in VALID_FORMS:
                    for e, cat in VALID_FORMS[next_w]:
                        if "adj" in e.pos:
                            issues.append(Issue(Issue.ERROR, i, w,
                                "ëa（存在动词）不接表语形容词",
                                "如需表述'X是Y'，请使用系词 ná"))
                            break

    for i, w in enumerate(words):
        if w == "i" and i + 1 < len(words):
            next_w = words[i + 1]
            if next_w.endswith("li"):
                base = next_w[:-2]
                if base in VOCAB and "n" in VOCAB[base].pos:
                    issues.append(Issue(Issue.WARNING, i, "i " + next_w,
                        "定冠词 i 通常不与部分复数 -li 连用",
                        "用 i + 普通复数，或去掉 i"))

    return issues


# ============================================================
# MAIN CHECK FUNCTION
# ============================================================

def check_sentence(text):
    if not text.strip():
        return [Issue(Issue.INFO, 0, "", "请输入昆雅语句子")]

    words = tokenize(text)
    if not words:
        return [Issue(Issue.INFO, 0, "", "未检测到有效词汇")]

    all_issues = []

    for i, w in enumerate(words):
        if w in FUNCTION_WORDS or len(w) <= 1:
            continue

        all_issues.extend(check_phonology(w, i))
        all_issues.extend(check_word_form(w, i, words))
        all_issues.extend(check_adj_agreement(words, i))

    all_issues.extend(check_syntax(words))

    seen = set()
    unique = []
    for issue in all_issues:
        key = (issue.level, issue.word_idx, issue.word, issue.message)
        if key not in seen:
            seen.add(key)
            unique.append(issue)

    unique.sort(key=lambda x: ({"error": 0, "warning": 1, "info": 2}[x.level], x.word_idx))

    if not unique:
        unique.append(Issue(Issue.INFO, 0, "",
            "✅ 未发现明显语法错误（注意：检查器仅覆盖基础规则，复杂语法请人工复核）"))

    return unique
