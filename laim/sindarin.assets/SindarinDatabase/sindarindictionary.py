# -*- coding: utf-8 -*-
"""Sindarin Dictionary 管理工具

用法:
    python sindarindictionary.py          启动图形界面
    python sindarindictionary.py --check  用现有词条校验形态自动生成规则的准确率

形态自动生成说明:
    生成的所有形式都是「草稿」, 必须人工核对后才保存。
    黄色底 = 规则来自词典中已收录词条的归纳, 一般可靠;
    橙色底 = 该词首/元音组合在词典中还没有先例, 按标准新辛达语规则推测, 务必仔细检查。
"""

import json
import os
import re
import shutil
import sys
import tkinter as tk
from tkinter import ttk, messagebox

os.chdir(os.path.dirname(os.path.abspath(__file__)))

DATA_FILE = "dictionary.json"
BACKUP_FILE = "dictionary.backup.json"

PARTS = ["noun", "verb", "adjective", "adverb", "preposition",
         "conjunction", "pronoun", "affix", "other"]

MORPH_TYPES = {
    "noun": ["Soft", "Plural", "NasalⅠ", "NasalⅡ", "MixedⅠ", "MixedⅡ",
             "Liquid", "Stop", "H", "DH"],
    "verb": ["Present", "Past", "Future", "Imperative", "Gerund",
             "PastParticiple", "PresentParticiple", "PeferctParticle"],
    "adjective": ["Soft", "Plural", "Comparative", "Superlative"],
}

SPECIAL_CHARS = list("âêîôûŷáéíóúýë")

# ---------------------------------------------------------------------------
# 形态生成规则
# ---------------------------------------------------------------------------
# 每个词首对应一张变化表: 变化类型 -> (小词, 新词首)
# attested=True 表示规则由词典中已有词条归纳而来
# ---------------------------------------------------------------------------

VOWEL_CHARS = "aeiouyâêîôûŷáéíóúýë"


def _tbl(soft, nasal1, nasal2, mix1, mix2, liquid, stop, h, dh, attested):
    return {"Soft": soft, "Nasal1": nasal1, "NasalⅡ": nasal2,
            "MixedⅠ": mix1, "MixedⅡ": mix2, "Liquid": liquid,
            "Stop": stop, "H": h, "DH": dh, "attested": attested}


# 词首匹配顺序: 长的在前
MUTATION_TABLES = {
    # ---- 已收录词条中归纳出的规则 ----
    "(m)b": _tbl(("i", "m"), ("i", "mb"), ("am", "b"), ("e-", "mb"),
                 ("anin", "b"), ("egor", "b"), ("o", "mb"), ("ah", "b"),
                 ("nedh", "b"), True),
    "(n)d": _tbl(("i", "n"), ("i", "nd"), ("an", "d"), ("e-", "nd"),
                 ("anin", "d"), ("egor", "d"), ("o", "nd"), ("ah", "d"),
                 ("nedh", "d"), True),
    "br": _tbl(("i", "vr"), ("i", "mr"), ("am", "br"), ("e-", "br"),
               ("anin", "br"), ("egor", "vr"), ("o", "br"), ("ah", "br"),
               ("nedh", "br"), True),
    "cr": _tbl(("i", "gr"), ("i", "chr"), ("a", "chr"), ("e-", "gr"),
               ("anin", "gr"), ("egor", "chr"), ("o", "chr"), ("a", "chr"),
               ("ne", "chr"), True),
    "dr": _tbl(("i", "dhr"), ("in", "dr"), ("an", "dr"), ("en-", "dr"),
               ("anin", "dr"), ("egor", "dhr"), ("o", "dr"), ("ah", "dr"),
               ("nedh", "dr"), True),
    "fl": _tbl(("i", "fl"), ("i", "fl"), ("an", "fl"), ("en-", "fl"),
               ("anin", "fl"), ("egor", "fl"), ("oph", "fl"), ("ah", "fl"),
               ("nedh", "fl"), True),
    "b": _tbl(("i", "v"), ("i", "m"), ("am", "b"), ("e-", "b"),
              ("anin", "b"), ("egor", "v"), ("o", "b"), ("ah", "b"),
              ("nedh", "b"), True),
    "c": _tbl(("i", "g"), ("i", "ch"), ("a", "ch"), ("e-", "g"),
              ("anin", "g"), ("egor", "ch"), ("o", "ch"), ("a", "ch"),
              ("ne", "ch"), True),
    "d": _tbl(("i", "dh"), ("i", "n"), ("an", "d"), ("e-", "d"),
              ("anin", "d"), ("egor", "dh"), ("o", "d"), ("ah", "d"),
              ("nedh", "d"), True),
    "f": _tbl(("i", "f"), ("i", "f"), ("an", "f"), ("en-", "f"),
              ("anin", "f"), ("egor", "f"), ("oph", "f"), ("ah", "f"),
              ("nedh", "f"), True),
    "VOWEL": _tbl(("i", ""), ("in", ""), ("an", ""), ("en-", ""),
                  ("anin", ""), ("egor", ""), ("od", ""), ("ah", ""),
                  ("nedh", ""), True),
    # ---- 以下词首词典中尚无先例, 按标准新辛达语规则推测 (橙色提示) ----
    "(n)g": _tbl(("i", "ng"), ("i", "ng"), ("an", "g"), ("e-", "ng"),
                 ("anin", "g"), ("egor", "g"), ("o", "ng"), ("ah", "g"),
                 ("nedh", "g"), False),
    "th": _tbl(("i", "th"), ("i", "th"), ("a", "th"), ("e-", "th"),
               ("anin", "th"), ("egor", "th"), ("o", "th"), ("ah", "th"),
               ("nedh", "th"), False),
    "lh": _tbl(("i", "thl"), ("i", "lh"), ("a", "thl"), ("e-", "lh"),
               ("anin", "lh"), ("egor", "lh"), ("o", "thl"), ("ah", "lh"),
               ("nedh", "lh"), False),
    "rh": _tbl(("i", "thr"), ("i", "rh"), ("a", "thr"), ("e-", "rh"),
               ("anin", "rh"), ("egor", "rh"), ("o", "thr"), ("ah", "rh"),
               ("nedh", "rh"), False),
    "hw": _tbl(("i", "chw"), ("i", "hw"), ("a", "chw"), ("e-", "hw"),
               ("anin", "hw"), ("egor", "chw"), ("o", "chw"), ("ah", "hw"),
               ("nedh", "hw"), False),
    "gw": _tbl(("i", "'w"), ("in", "gw"), ("an", "gw"), ("e-", "gw"),
               ("anin", "gw"), ("egor", "'w"), ("o", "gw"), ("ah", "gw"),
               ("nedh", "gw"), False),
    "gl": _tbl(("i", "'l"), ("in", "gl"), ("an", "gl"), ("e-", "gl"),
               ("anin", "gl"), ("egor", "'l"), ("o", "gl"), ("ah", "gl"),
               ("nedh", "gl"), False),
    "gr": _tbl(("i", "'r"), ("in", "gr"), ("an", "gr"), ("e-", "gr"),
               ("anin", "gr"), ("egor", "'r"), ("o", "gr"), ("ah", "gr"),
               ("nedh", "gr"), False),
    "pr": _tbl(("i", "br"), ("i", "phr"), ("a", "phr"), ("e-", "br"),
               ("anin", "br"), ("egor", "phr"), ("o", "phr"), ("a", "phr"),
               ("ne", "phr"), False),
    "tr": _tbl(("i", "dr"), ("i", "thr"), ("a", "thr"), ("e-", "dr"),
               ("anin", "dr"), ("egor", "thr"), ("o", "thr"), ("a", "thr"),
               ("ne", "thr"), False),
    "p": _tbl(("i", "b"), ("i", "ph"), ("a", "ph"), ("e-", "b"),
              ("anin", "b"), ("egor", "ph"), ("o", "ph"), ("a", "ph"),
              ("ne", "ph"), False),
    "t": _tbl(("i", "d"), ("i", "th"), ("a", "th"), ("e-", "d"),
              ("anin", "d"), ("egor", "th"), ("o", "th"), ("a", "th"),
              ("ne", "th"), False),
    "g": _tbl(("i", "'"), ("i", "ng"), ("an", "g"), ("e-", "g"),
              ("anin", "g"), ("egor", "'"), ("o", "g"), ("ah", "g"),
              ("nedh", "g"), False),
    "h": _tbl(("i", "ch"), ("i", "ch"), ("a", "ch"), ("e-", "ch"),
              ("anin", "ch"), ("egor", "ch"), ("o", "ch"), ("a", "ch"),
              ("ne", "ch"), False),
    "l": _tbl(("i", "l"), ("i", "l"), ("an", "l"), ("en-", "l"),
              ("anin", "l"), ("egor", "l"), ("o", "l"), ("ah", "l"),
              ("nedh", "l"), False),
    "m": _tbl(("i", "v"), ("i", "m"), ("am", "m"), ("e-", "m"),
              ("anin", "m"), ("egor", "v"), ("o", "m"), ("ah", "m"),
              ("nedh", "m"), False),
    "n": _tbl(("i", "n"), ("i", "n"), ("an", "n"), ("en-", "n"),
              ("anin", "n"), ("egor", "n"), ("o", "n"), ("ah", "n"),
              ("nedh", "n"), False),
    "r": _tbl(("i", "r"), ("i", "r"), ("an", "r"), ("en-", "r"),
              ("anin", "r"), ("egor", "r"), ("o", "r"), ("ah", "r"),
              ("nedh", "r"), False),
    "s": _tbl(("i", "h"), ("i", "s"), ("as", "s"), ("e-", "h"),
              ("anin", "h"), ("egor", "s"), ("o", "s"), ("ah", "s"),
              ("nedh", "s"), False),
    "w": _tbl(("i", "w"), ("i", "w"), ("an", "w"), ("en-", "w"),
              ("anin", "w"), ("egor", "w"), ("o", "w"), ("ah", "w"),
              ("nedh", "w"), False),
}

_INITIALS = sorted((k for k in MUTATION_TABLES if k != "VOWEL"),
                   key=len, reverse=True)


def split_initial(word):
    """拆出词首辅音(簇)。返回 (词首key, 词首原文, 词干)。"""
    wl = word.lower()
    for init in _INITIALS:
        if wl.startswith(init):
            return init, word[:len(init)], word[len(init):]
    if wl and wl[0] in VOWEL_CHARS:
        return "VOWEL", "", word
    return None, "", word


def _match_case(model, text):
    """model 首字母大写则把 text 首字母也大写。"""
    if model and model[0].isupper() and text:
        return text[0].upper() + text[1:]
    return text


def apply_mutation(word, mut_type, base=None):
    """对 word 施加 mut_type 变化。base 用于 NasalⅠ(作用于复数形式)。
    返回 (结果, attested) 或 (None, False) 表示无法生成。"""
    target = base if base is not None else word
    init, raw, stem = split_initial(target)
    if init is None:
        return None, False
    table = MUTATION_TABLES[init]
    particle, newinit = table[mut_type]
    body = newinit + stem if init != "VOWEL" else target
    body = _match_case(raw if raw else target, body)
    if particle.endswith("-"):
        form = particle + body
    elif particle:
        form = particle + " " + body
    else:
        form = body
    return form, table["attested"]


# ---------------------------------------------------------------------------
# 元音 i-音变 (复数等)
# ---------------------------------------------------------------------------

_FINAL_DIGRAPHS = {"au": "oe", "aw": "oe", "ae": "ae", "ie": "i",
                   "ui": "ui", "oe": "oe", "io": "y", "iu": "y"}
_FINAL_SINGLE = {"â": "ai", "e": "i", "ê": "î", "é": "í", "i": "i",
                 "î": "î", "í": "í", "o": "y", "ó": "ý", "ô": "ŷ",
                 "u": "y", "û": "ui", "ú": "ui", "y": "y", "ŷ": "ŷ"}
_NONFINAL = {"a": "e", "â": "e", "e": "e", "ê": "e", "i": "i", "î": "i",
             "o": "e", "ô": "e", "u": "y", "û": "y", "y": "y",
             "á": "e", "é": "é", "í": "í", "ó": "ó", "ú": "ú"}
_NONFINAL_DI = {"au": "au", "aw": "aw", "ae": "ae", "ai": "ai",
                "ei": "ei", "ui": "ui", "oe": "oe"}


def _vowel_groups(word):
    """返回 [(start, end, group), ...] 连续元音段 (跟在元音后的 w 计入双元音)。"""
    groups, i = [], 0
    while i < len(word):
        if word[i].lower() in VOWEL_CHARS:
            j = i
            while j < len(word) and word[j].lower() in VOWEL_CHARS:
                j += 1
            if j < len(word) and word[j].lower() == "w" and \
                    word[j - 1].lower() in "ae":
                j += 1
            groups.append((i, j, word[i:j]))
            i = j
        else:
            i += 1
    return groups


def i_affect(word, all_nonfinal=False):
    """i-音变。复数用默认模式; 动词现在时词干用 all_nonfinal=True
    (末音节也按非末音节规则变: dag->deg, dadwen->dedwen)。
    返回 (结果, certain)。"""
    groups = _vowel_groups(word)
    if not groups:
        return word, False
    certain = True
    chars = list(word)
    for idx, (s, e, grp) in enumerate(groups):
        low = grp.lower()
        is_final = (idx == len(groups) - 1) and not all_nonfinal
        if is_final:
            word_final = e == len(word)          # 开音节词尾元音
            if low in ("ai", "ei"):
                # 词尾 ai/ei 通常不变 (cai, fain, edhelvein), 偶有例外需核对
                new, certain = grp, False
            elif low in _FINAL_DIGRAPHS:
                new = _FINAL_DIGRAPHS[low]
            elif word_final and low in ("u", "o"):
                new = grp                        # curu -> cyru, forvo -> fervo
            elif word_final and low == "a":
                new, certain = grp, False        # 罕见, 需人工确定
            elif low == "a":
                # 后接辅音簇或词尾 m -> e; 单辅音 -> ai
                tail = word[e:]
                cons = 0
                for ch in tail:
                    if ch.lower() in VOWEL_CHARS:
                        break
                    if ch not in "()-":
                        cons += 1
                # 'dh','th','ch','ph' 等双字母算一个辅音
                tl = tail.lower().replace("(", "").replace(")", "")
                for dig in ("dh", "th", "ch", "ph", "lh", "rh", "hw"):
                    if dig in tl:
                        cons -= tl.count(dig)
                if cons >= 2 or tl == "m":
                    new = "e"                    # balt -> belt, cam -> cem
                else:
                    new = "ai"                   # adan -> edain
            elif low in _FINAL_SINGLE:
                new = _FINAL_SINGLE[low]
            elif len(grp) > 1:
                # 非双元音的元音串 (dúath): 前段保留, 末元音按词尾规则变
                head, nucleus = grp[:-1], grp[-1].lower()
                if nucleus == "a":
                    new = head + "ai"            # dúath -> dúaith
                elif nucleus in _FINAL_SINGLE:
                    new = head + _FINAL_SINGLE[nucleus]
                else:
                    new, certain = grp, False
            else:
                new, certain = grp, False
        else:
            if low in _NONFINAL:
                new = _NONFINAL[low]
            elif low in _NONFINAL_DI:
                new = _NONFINAL_DI[low]
            else:
                new, certain = grp, False
        chars[s:e] = list(_match_case(grp, new))
    return "".join(chars), certain


# ---------------------------------------------------------------------------
# 各词性的草稿生成: 返回 {类型: (草稿, certain)}
# ---------------------------------------------------------------------------

def strip_nasal_prefix(word):
    """(m)band -> band; 其余原样。"""
    for p in ("(m)", "(n)"):
        if word.lower().startswith(p):
            return word[len(p):]
    return word


def gen_noun(dict_form, plural_override=""):
    out = {}
    plural, pl_ok = i_affect(strip_nasal_prefix(dict_form))
    if plural_override.strip():
        plural, pl_ok = plural_override.strip(), True
    out["Plural"] = (plural, pl_ok)
    for t, key in [("Soft", "Soft"), ("NasalⅡ", "NasalⅡ"),
                   ("MixedⅠ", "MixedⅠ"), ("MixedⅡ", "MixedⅡ"),
                   ("Liquid", "Liquid"), ("Stop", "Stop"),
                   ("H", "H"), ("DH", "DH")]:
        form, att = apply_mutation(dict_form, key)
        out[t] = (form or "", att)
    # NasalⅠ = in + 复数的鼻音变化
    # 复数没有 (m)/(n) 前缀, 但鼻音变化要还原原词的鼻化词首
    n1_base = plural
    init, _, _ = split_initial(dict_form)
    if init in ("(m)b", "(n)d", "(n)g"):
        n1_base = init + plural[1:] if plural else plural
    form, att = apply_mutation(dict_form, "Nasal1", base=n1_base)
    out["NasalⅠ"] = (form or "", att and pl_ok)
    return out


_CIRC2ACUTE = str.maketrans("âêîôûŷÂÊÎÔÛŶ", "áéíóúýÁÉÍÓÚÝ")
_ACUTE2PLAIN = str.maketrans("áéíóúýÁÉÍÓÚÝ", "aeiouyAEIOUY")


def _shorten_long(word, original):
    """加前缀后长元音降级: 单音节词 ^→´ (dîn->endín);
    多音节词 ´→无 (dínen->endinen)。"""
    if len(_vowel_groups(strip_nasal_prefix(original))) <= 1:
        return word.translate(_CIRC2ACUTE)
    return word.translate(_CIRC2ACUTE).translate(_ACUTE2PLAIN)


def _first_vowel(word):
    groups = _vowel_groups(strip_nasal_prefix(word))
    return groups[0][2].lower() if groups else ""


def gen_adjective(dict_form, plural_override=""):
    out = {}
    init, raw, stem = split_initial(dict_form)
    # Soft: 不带小词的柔音变化
    if init is None:
        out["Soft"] = ("", False)
    else:
        table = MUTATION_TABLES[init]
        _, newinit = table["Soft"]
        body = dict_form if init == "VOWEL" else _match_case(
            raw if raw else dict_form, newinit + stem)
        out["Soft"] = (body, table["attested"])
    # Plural: 形容词保留 (m)/(n) 前缀 (与已有词条一致)
    prefix = ""
    core = dict_form
    for p in ("(m)", "(n)"):
        if dict_form.lower().startswith(p):
            prefix, core = dict_form[:3], dict_form[3:]
            break
    if plural_override.strip():
        out["Plural"] = (plural_override.strip(), True)
    elif core.lower().endswith("ui"):
        # -ui 结尾的形容词复数不变 (annui, fanui, canthui)
        out["Plural"] = (dict_form, True)
    else:
        pl, ok = i_affect(core)
        groups = _vowel_groups(core)
        if groups and groups[-1][2].lower() == "ai":
            # 形容词末音节 ai 不变 (bain/fain), 但有例外, 需核对
            pl, ok = core, False
        out["Plural"] = (prefix + pl, ok)
    # Comparative: an + 鼻音强化连写; 词干首元音为 i 类时 an -> en
    comp, catt = apply_mutation(dict_form, "NasalⅡ")
    if comp:
        if _first_vowel(dict_form) in ("i", "í", "î"):
            comp = "e" + comp[1:]
        comp = comp.replace(" ", "").replace("(m)", "").replace("(n)", "")
        comp = _shorten_long(comp, dict_form)
        # 普通 b/br 词首有 amb-/amm- 两种写法
        if init in ("b", "br"):
            var2 = comp.replace("mb", "mm", 1)
            comp = f"{comp}/{var2}"
        out["Comparative"] = (comp, catt)
    else:
        out["Comparative"] = ("", False)
    # Superlative: ro- + 柔音
    soft = out["Soft"][0]
    if soft:
        sup = "ro-" + _shorten_long(strip_nasal_prefix(soft), dict_form)
        out["Superlative"] = (sup, out["Soft"][1])
    else:
        out["Superlative"] = ("", False)
    return out


_LENGTHEN = {"a": "â", "e": "ê", "i": "î", "o": "ô", "u": "û", "y": "ŷ"}
_PERFECT_LONG = {"a": "ó", "e": "í", "i": "í", "o": "ú", "u": "ú"}


def _last_vowel_group(word):
    groups = _vowel_groups(word)
    return groups[-1] if groups else None


def gen_verb(dict_form):
    """动词草稿。词典形以 '-' 结尾为基础动词, 以 'a-' 结尾为 a 类动词。"""
    out = {}
    stem = dict_form.rstrip("-")
    if not stem:
        return out
    if stem.lower().endswith("a"):  # ---- a 类动词 ----
        base = stem
        cut = stem[:-1]
        out["Present"] = (f"{base}/{base}(o)-", True)
        out["Past"] = (f"{base}nt/{base}nne-", True)
        out["Future"] = (f"{base}tha/{base}tha(o)-", True)
        out["Imperative"] = (cut + "o", True)
        out["Gerund"] = (cut + "ad", True)
        out["PastParticiple"] = (base + "nnen", True)
        out["PresentParticiple"] = (cut + "ol", True)
        # 完成分词: 词干中所有 a -> e, 其余元音保留, + iel
        perf = "".join("e" if c == "a" else ("E" if c == "A" else c)
                       for c in cut) + "iel"
        has_odd = any(c.lower() in "oôóuûú" for c in cut)
        out["PeferctParticle"] = (perf, not has_odd)
    else:  # ---- 基础动词 ----
        groups = _vowel_groups(stem)
        affected, aff_ok = i_affect(stem, all_nonfinal=True)
        # 现在时: 单音节长元音化
        if len(groups) == 1:
            s, e, grp = groups[0]
            low = grp.lower()
            if len(grp) == 1 and low in _LENGTHEN:
                pres3 = stem[:s] + _match_case(grp, _LENGTHEN[low]) + stem[e:]
                out["Present"] = (f"{pres3}/{affected}i-", aff_ok)
            else:
                out["Present"] = (f"{stem}/{affected}i-", False)
        else:
            out["Present"] = (f"{stem}/{affected}i-", aff_ok)
        # 过去时: 高度不规则, 仅给出鼻音中缀式的粗略猜测, 务必核对
        last = stem[-1].lower()
        guess_map = {"d": stem[:-1] + "nt", "b": stem[:-1] + "mp",
                     "g": stem[:-1] + "nc", "v": stem[:-1] + "mp",
                     "t": stem[:-1] + "nt"}
        past3 = guess_map.get(last, stem + "as")
        out["Past"] = (f"{past3}/{past3}e-", False)
        if last == "w" and len(stem) > 1 and stem[-2].lower() in "ae":
            fut = stem[:-1] + "u"       # caw- -> cautha
            out["Future"] = (f"{fut}tha/{fut}tha(o)-", True)
        else:
            out["Future"] = (f"{stem}atha/{stem}atha(o)-", True)
        out["Imperative"] = (stem + "o", True)
        out["Gerund"] = (stem + "ed", True)
        # 过去分词
        pp_map = {"d": stem[:-1] + "nnen", "b": stem[:-1] + "mmen",
                  "v": stem[:-1] + "mmen", "g": stem[:-1] + "ngen",
                  "l": stem + "len", "n": stem + "nen", "r": stem + "nen"}
        out["PastParticiple"] = (pp_map.get(last, stem + "en"),
                                 last in ("l", "n", "r", "d"))
        out["PresentParticiple"] = (stem + "el", True)
        # 完成分词: 末元音延长 (a->ó, e->í, o->ú) + iel
        lg = _last_vowel_group(stem)
        if lg and lg[2].lower() in _PERFECT_LONG:
            s, e, grp = lg
            perf = (stem[:s] + _match_case(grp, _PERFECT_LONG[grp.lower()])
                    + stem[e:] + "iel")
            out["PeferctParticle"] = (perf, True)
        else:
            out["PeferctParticle"] = (stem + "iel", False)
    return out


def _clean_dict_form(word):
    """处理词典形中的括号注记: 开头的 (m)/(n) 鼻化标记保留;
    其他单字母括号并入词形 (bas(t) -> bast), 多字母变体注记丢弃
    (alu(alw) -> alu)。"""
    prefix = ""
    if re.match(r"^\([mn]\)", word):
        prefix, word = word[:3], word[3:]
    word = re.sub(r"\((\w)\)", r"\1", word)      # 单字母: 保留
    word = re.sub(r"\(\w{2,}\)", "", word)        # 多字母: 丢弃
    return prefix + word


def generate_morphology(part, dict_form, plural_override=""):
    if not dict_form.strip():
        return {}
    dict_form = _clean_dict_form(dict_form.strip())
    if part == "noun":
        return gen_noun(dict_form, plural_override)
    if part == "adjective":
        return gen_adjective(dict_form, plural_override)
    if part == "verb":
        return gen_verb(dict_form)
    return {}


# ---------------------------------------------------------------------------
# --check: 用现有词条校验生成规则
# ---------------------------------------------------------------------------

def self_check():
    with open(DATA_FILE, encoding="utf-8") as f:
        entries = json.load(f)
    stats = {}
    mismatches = []
    for e in entries:
        part = e["part"]
        if part not in MORPH_TYPES or not e.get("morphology"):
            continue
        gen = generate_morphology(part, e["dict_form"])
        for m in e["morphology"]:
            t, real = m["type"], m["form"].strip()
            if not real or "无" in real or t not in gen:
                continue
            draft = gen[t][0].strip()
            key = (part, t)
            ok, total = stats.get(key, (0, 0))
            hit = draft in [r.strip() for r in real.split(",")] or draft == real
            stats[key] = (ok + (1 if hit else 0), total + 1)
            if not hit and len(mismatches) < 200:
                mismatches.append((e["dict_form"], t, real, draft))
    print(f"{'词性':<10}{'类型':<20}{'命中率':<12}")
    for (part, t), (ok, total) in sorted(stats.items()):
        print(f"{part:<10}{t:<20}{ok}/{total}")
    print("\n未命中样例 (词 | 类型 | 实际 | 草稿):")
    for w, t, real, draft in mismatches[:40]:
        print(f"  {w:<15} {t:<18} {real:<28} {draft}")


# ---------------------------------------------------------------------------
# 图形界面
# ---------------------------------------------------------------------------

BG_ATTESTED = "#fff9c4"   # 黄: 规则有词典先例
BG_GUESS = "#ffe0b2"      # 橙: 推测规则, 重点核对
BG_NORMAL = "white"


class DictionaryApp:
    def __init__(self, root):
        self.root = root
        root.title("Sindarin Dictionary")
        try:
            root.iconbitmap("Sindarin.ico")
        except tk.TclError:
            pass
        root.geometry("980x640")
        self.entries = []
        self.filtered = []
        self.backup_done = False
        self.load_data()
        self.build_ui()
        self.refresh_list()

    # ---------- 数据 ----------
    def load_data(self):
        if os.path.exists(DATA_FILE):
            with open(DATA_FILE, encoding="utf-8") as f:
                self.entries = json.load(f)
        self.sort_entries()

    def sort_entries(self):
        self.entries.sort(key=lambda x: strip_nasal_prefix(
            x["dict_form"]).lower())

    def save_data(self):
        if not self.backup_done and os.path.exists(DATA_FILE):
            shutil.copyfile(DATA_FILE, BACKUP_FILE)
            self.backup_done = True
        self.sort_entries()
        with open(DATA_FILE, "w", encoding="utf-8") as f:
            json.dump(self.entries, f, ensure_ascii=False, indent=2)
        self.status.set(f"已保存 · 共 {len(self.entries)} 个词条 "
                        f"(记得 git push 才会更新到网页)")

    # ---------- 界面 ----------
    def build_ui(self):
        top = ttk.Frame(self.root)
        top.pack(fill=tk.X, padx=10, pady=6)
        ttk.Label(top, text="搜索:").pack(side=tk.LEFT)
        self.search_var = tk.StringVar()
        se = ttk.Entry(top, textvariable=self.search_var)
        se.pack(side=tk.LEFT, fill=tk.X, expand=True, padx=6)
        se.bind("<KeyRelease>", lambda e: self.refresh_list())
        ttk.Label(top, foreground="#888",
                  text="支持 word=/gloss=/part= 前缀").pack(side=tk.LEFT)

        ttk.Button(top, text="添加 (Ctrl+N)",
                   command=self.add_word).pack(side=tk.LEFT, padx=(12, 2))
        ttk.Button(top, text="编辑 (双击)",
                   command=self.edit_word).pack(side=tk.LEFT, padx=2)
        ttk.Button(top, text="删除 (Del)",
                   command=self.delete_word).pack(side=tk.LEFT, padx=2)

        mid = ttk.PanedWindow(self.root, orient=tk.HORIZONTAL)
        mid.pack(fill=tk.BOTH, expand=True, padx=10, pady=4)

        cols = ("word", "part", "english", "definition")
        self.tree = ttk.Treeview(mid, columns=cols, show="headings",
                                 selectmode="browse")
        for c, txt, w in [("word", "辛达语", 150), ("part", "词性", 80),
                          ("english", "English", 220), ("definition", "释义", 220)]:
            self.tree.heading(c, text=txt)
            self.tree.column(c, width=w, anchor=tk.W)
        self.tree.bind("<<TreeviewSelect>>", self.show_details)
        self.tree.bind("<Double-1>", lambda e: self.edit_word())
        self.tree.bind("<Delete>", lambda e: self.delete_word())
        mid.add(self.tree, weight=3)

        right = ttk.Frame(mid)
        mid.add(right, weight=2)
        self.details = tk.Text(right, wrap=tk.WORD, state=tk.DISABLED,
                               font=("Segoe UI", 10), relief=tk.FLAT,
                               background="#fafafa")
        self.details.pack(fill=tk.BOTH, expand=True)

        self.status = tk.StringVar(
            value=f"共 {len(self.entries)} 个词条")
        ttk.Label(self.root, textvariable=self.status,
                  anchor=tk.W).pack(fill=tk.X, padx=10, pady=(0, 6))

        self.root.bind("<Control-n>", lambda e: self.add_word())

    # ---------- 列表/搜索 ----------
    def refresh_list(self):
        q = self.search_var.get().strip().lower()
        field = ""
        if "=" in q:
            field, q = q.split("=", 1)
        self.filtered = []
        for e in self.entries:
            if not q:
                ok = True
            elif field == "word":
                ok = q in e["dict_form"].lower()
            elif field == "gloss":
                ok = q in e["english"].lower()
            elif field == "part":
                ok = q in e["part"].lower()
            else:
                ok = any(q in str(e.get(k, "")).lower() for k in
                         ("dict_form", "english", "definition",
                          "sentence", "other", "part"))
            if ok:
                self.filtered.append(e)
        self.tree.delete(*self.tree.get_children())
        for i, e in enumerate(self.filtered):
            self.tree.insert("", tk.END, iid=str(i), values=(
                e["dict_form"], e["part"], e["english"], e["definition"]))
        n = len(self.filtered)
        total = len(self.entries)
        self.status.set(f"共 {total} 个词条" +
                        (f" · 筛选出 {n} 个" if q else ""))

    def selected_entry(self):
        sel = self.tree.selection()
        if not sel:
            return None
        idx = int(sel[0])
        if 0 <= idx < len(self.filtered):
            return self.filtered[idx]
        return None

    def show_details(self, event=None):
        e = self.selected_entry()
        if not e:
            return
        self.details.configure(state=tk.NORMAL)
        self.details.delete("1.0", tk.END)
        lines = [f"{e['dict_form']}  ·  {e['part']}", "",
                 f"英语: {e['english']}", f"释义: {e['definition']}"]
        if e.get("sentence", "").strip():
            lines += ["", "例句:", e["sentence"].strip()]
        if e.get("other", "").strip():
            lines += ["", f"备注: {e['other'].strip()}"]
        if e.get("morphology"):
            lines += ["", "形态变化:"]
            for m in e["morphology"]:
                if m["form"].strip():
                    lines.append(f"  {m['type']:<20} {m['form']}")
        self.details.insert(tk.END, "\n".join(lines))
        self.details.configure(state=tk.DISABLED)

    # ---------- 增删改 ----------
    def add_word(self):
        WordDialog(self, None)

    def edit_word(self):
        e = self.selected_entry()
        if not e:
            messagebox.showinfo("提示", "请先选择要编辑的词条")
            return
        WordDialog(self, e)

    def delete_word(self):
        e = self.selected_entry()
        if not e:
            messagebox.showinfo("提示", "请先选择要删除的词条")
            return
        if messagebox.askyesno("确认", f"确定删除「{e['dict_form']}」吗？"):
            self.entries.remove(e)
            self.save_data()
            self.refresh_list()


class WordDialog(tk.Toplevel):
    """添加/编辑词条对话框。"""

    def __init__(self, app, entry):
        super().__init__(app.root)
        self.app = app
        self.entry = entry
        self.title("编辑词条" if entry else "添加新词")
        try:
            self.iconbitmap("Sindarin.ico")
        except tk.TclError:
            pass
        self.geometry(f"+{app.root.winfo_x() + 60}+{app.root.winfo_y() + 40}")
        self.last_focus = None
        self.morph_widgets = {}   # type -> tk.Entry
        self.build()
        self.bind("<Escape>", lambda e: self.destroy())
        self.bind("<Control-s>", lambda e: self.save(close=True))
        if entry:
            self.fill(entry)
        else:
            self.dict_form.focus_set()

    # ---------- 布局 ----------
    def build(self):
        # 特殊字符工具条
        bar = ttk.Frame(self)
        bar.pack(fill=tk.X, padx=10, pady=(8, 0))
        ttk.Label(bar, text="特殊字符:").pack(side=tk.LEFT)
        for ch in SPECIAL_CHARS:
            b = ttk.Button(bar, text=ch, width=2, takefocus=0,
                           command=lambda c=ch: self.insert_char(c))
            b.pack(side=tk.LEFT, padx=1)

        body = ttk.Frame(self)
        body.pack(fill=tk.BOTH, expand=True, padx=10, pady=6)

        left = ttk.LabelFrame(body, text="基本信息")
        left.grid(row=0, column=0, sticky="nsew", padx=(0, 6))
        self.morph_frame = ttk.LabelFrame(body, text="形态变化 (草稿需人工核对)")
        self.morph_frame.grid(row=0, column=1, sticky="nsew")
        body.columnconfigure(1, weight=1)

        def row(parent, r, label):
            ttk.Label(parent, text=label).grid(
                row=r, column=0, sticky=tk.NW, padx=6, pady=4)

        row(left, 0, "辛达语 *")
        self.dict_form = ttk.Entry(left, width=32, font=("Segoe UI", 10))
        self.dict_form.grid(row=0, column=1, padx=6, pady=4)

        row(left, 1, "词性 *")
        self.part_var = tk.StringVar(value="noun")
        self.part_combo = ttk.Combobox(left, textvariable=self.part_var,
                                       values=PARTS, state="readonly",
                                       width=30)
        self.part_combo.grid(row=1, column=1, padx=6, pady=4)
        self.part_combo.bind("<<ComboboxSelected>>",
                             lambda e: self.rebuild_morph_rows())

        row(left, 2, "英语 *")
        self.english = ttk.Entry(left, width=32)
        self.english.grid(row=2, column=1, padx=6, pady=4)

        row(left, 3, "释义 *")
        self.definition = ttk.Entry(left, width=32)
        self.definition.grid(row=3, column=1, padx=6, pady=4)

        row(left, 4, "例句")
        self.sentence = tk.Text(left, height=6, width=32,
                                font=("Segoe UI", 10))
        self.sentence.grid(row=4, column=1, padx=6, pady=4)

        row(left, 5, "备注")
        self.other = tk.Text(left, height=3, width=32,
                             font=("Segoe UI", 10))
        self.other.grid(row=5, column=1, padx=6, pady=4)

        legend = ttk.Label(left, foreground="#888", justify=tk.LEFT, text=(
            "草稿底色说明:\n"
            "  黄色 = 规则来自已收录词条, 一般可靠\n"
            "  橙色 = 无先例的推测规则, 务必核对\n"
            "  修改过的格子会恢复白色"))
        legend.grid(row=6, column=0, columnspan=2, sticky=tk.W,
                    padx=6, pady=(8, 4))

        # 底部按钮
        btns = ttk.Frame(self)
        btns.pack(fill=tk.X, padx=10, pady=(0, 10))
        ttk.Button(btns, text="⚡ 生成形态草稿",
                   command=self.generate_drafts).pack(side=tk.LEFT)
        ttk.Label(btns, text="(名词可先修正 Plural 再点一次, "
                             "NasalⅠ 会按新复数重算)",
                  foreground="#888").pack(side=tk.LEFT, padx=6)
        ttk.Button(btns, text="保存并关闭 (Ctrl+S)",
                   command=lambda: self.save(close=True)).pack(
            side=tk.RIGHT, padx=2)
        if not self.entry:
            ttk.Button(btns, text="保存并继续添加",
                       command=lambda: self.save(close=False)).pack(
                side=tk.RIGHT, padx=2)
        ttk.Button(btns, text="取消",
                   command=self.destroy).pack(side=tk.RIGHT, padx=2)

        # 记录焦点, 供特殊字符插入
        for w in (self.dict_form, self.english, self.definition,
                  self.sentence, self.other):
            w.bind("<FocusIn>", self.remember_focus)

        self.rebuild_morph_rows()

    def rebuild_morph_rows(self):
        for w in self.morph_frame.winfo_children():
            w.destroy()
        self.morph_widgets = {}
        types = MORPH_TYPES.get(self.part_var.get(), [])
        if not types:
            ttk.Label(self.morph_frame,
                      text="该词性没有预定义形态").pack(padx=10, pady=10)
            return
        for i, t in enumerate(types):
            label = "Perfect" if t == "PeferctParticle" else t
            ttk.Label(self.morph_frame, text=label).grid(
                row=i, column=0, sticky=tk.W, padx=6, pady=3)
            en = tk.Entry(self.morph_frame, width=34,
                          font=("Segoe UI", 10), bg=BG_NORMAL,
                          relief=tk.SOLID, borderwidth=1)
            en.grid(row=i, column=1, padx=6, pady=3, sticky="ew")
            en.bind("<FocusIn>", self.remember_focus)
            en.bind("<Key>", lambda e, w=en: self.mark_edited(w))
            self.morph_widgets[t] = en
        self.morph_frame.columnconfigure(1, weight=1)
        # 预填已有数据
        if self.entry:
            forms = {m["type"]: m["form"] for m in
                     self.entry.get("morphology", [])}
            for t, w in self.morph_widgets.items():
                if forms.get(t, "").strip():
                    w.insert(0, forms[t].strip())

    # ---------- 交互 ----------
    def remember_focus(self, event):
        self.last_focus = event.widget

    def mark_edited(self, widget):
        widget.configure(bg=BG_NORMAL)

    def insert_char(self, ch):
        w = self.last_focus or self.dict_form
        w.insert(tk.INSERT if isinstance(w, tk.Text) else "insert", ch)
        w.focus_set()

    def generate_drafts(self):
        part = self.part_var.get()
        word = self.dict_form.get().strip()
        if not word:
            messagebox.showinfo("提示", "请先填写辛达语词形")
            return
        if part not in MORPH_TYPES:
            messagebox.showinfo("提示", f"{part} 没有预定义形态")
            return
        plural_now = ""
        if "Plural" in self.morph_widgets:
            plural_now = self.morph_widgets["Plural"].get()
        drafts = generate_morphology(part, word, plural_now)
        for t, (form, attested) in drafts.items():
            w = self.morph_widgets.get(t)
            if w is None:
                continue
            w.delete(0, tk.END)
            if form:
                w.insert(0, form)
                w.configure(bg=BG_ATTESTED if attested else BG_GUESS)
            else:
                w.configure(bg=BG_GUESS)

    def fill(self, e):
        self.dict_form.insert(0, e["dict_form"])
        self.part_var.set(e["part"])
        self.english.insert(0, e["english"])
        self.definition.insert(0, e["definition"])
        self.sentence.insert("1.0", e.get("sentence", "").strip())
        self.other.insert("1.0", e.get("other", "").strip())
        self.rebuild_morph_rows()

    def save(self, close=True):
        word = self.dict_form.get().strip()
        part = self.part_var.get()
        eng = self.english.get().strip()
        dfn = self.definition.get().strip()
        if not all([word, part, eng, dfn]):
            messagebox.showerror("错误", "辛达语、词性、英语、释义为必填项")
            return
        # 重复检查 (添加时, 或编辑时改了词形)
        dup = next((e for e in self.app.entries
                    if e["dict_form"] == word and e is not self.entry), None)
        if dup and not messagebox.askyesno(
                "重复", f"词典中已有「{word}」({dup['english']})，仍要保存吗？"):
            return
        morphology = []
        for t in MORPH_TYPES.get(part, []):
            w = self.morph_widgets.get(t)
            morphology.append({"type": t,
                               "form": w.get().strip() if w else ""})
        new = {
            "dict_form": word,
            "part": part,
            "english": eng,
            "definition": dfn,
            "sentence": self.sentence.get("1.0", tk.END).strip(),
            "other": self.other.get("1.0", tk.END).strip(),
            "morphology": morphology,
        }
        if self.entry:
            self.entry.update(new)
        else:
            self.app.entries.append(new)
        self.app.save_data()
        self.app.refresh_list()
        if close:
            self.destroy()
        else:
            # 连续添加: 清空表单继续
            self.entry = None
            self.dict_form.delete(0, tk.END)
            self.english.delete(0, tk.END)
            self.definition.delete(0, tk.END)
            self.sentence.delete("1.0", tk.END)
            self.other.delete("1.0", tk.END)
            for w in self.morph_widgets.values():
                w.delete(0, tk.END)
                w.configure(bg=BG_NORMAL)
            self.dict_form.focus_set()


def main():
    if "--check" in sys.argv:
        self_check()
        return
    root = tk.Tk()
    DictionaryApp(root)
    root.mainloop()


if __name__ == "__main__":
    main()
