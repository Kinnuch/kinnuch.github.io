// === 预设配置 ===========================================================
// 这里直接内嵌 Theusrin / ArchipelagoShikrin 的 Category / Replace / Rule，
// 与同目录下 *.txt 文件保持一致。
const PRESETS = {
    theusrin: {
        name: '瑟乌丝林语 / Theusrin',
        category: `C=ptkbdgmnwlryszħðxþŋøfh
D=aeiou
V=aeiouœæāēīōūáéíóú
L=āēīōū
S=áéíóú
O=âêîôû
Q=ptk
Z=bdg
R=lr
A=mnlr
F=øþx`,
        replace: ``,
        rule: `-* PSkr
e > a / _h , h_
kw > p / ?p_
gw > b / ?b_
w > / [kg]_
c > s / _
ss > s / #_
j > z / _
> e / #|C_[nm]C
l > al / #|C_C
r > ur / #|C_C
h > a / #_ - #_V
Dh > L / _
Sh > L / _
[hx] > / L_
-* PTsr
bh > w / _
dh > ð / _
gh > ħ / _
wh > x / _
sh > rh / _
> h / Q_ - Q_h
Z > Q / _
[mn] > / _Z - #_Z
h­­ > / Q_s , sQ_ , ht_
h > / Q_Q(h)
bm > \\ / _
dn > \\ / _
[yw] > / #C(h)L_#
y > i / _#
w > u / _#
n > l / #_?m
l > r / _#
m > n / _#
h > s / _s - Q_s
ħ > h / _Q , _s
ħ > g / l_
L > D / _CC|QhC - _QhV|Qh#
h > x / _t - Q_t
h > / _ - Q_
km > \\ / _
ng > ŋ / _
[nŋ] > m / _[pb]
[mŋ] > n / _[tdð]
[mn] > ŋ / _[kgħ]
[ŋħ] > g / ŋ_
ŋ > n / _s
w > p / p_
w > ph / ph_
s > z / _Z
[eao] > / _#
i > e / _#
u > o / _#
ó > a / w_
[td] > s / _t
th > s / _t
d > z / _d
t > k / _k
Z > Q / _Q , Q(h)_ , _s
r > l / l_
y > i / V_C
w > u / V_C
-* ATsr
D > / Q(h)_RS, Z_RS
y > / t(h)_ , d_ , n_ , l_
n > l / l_
[ptks] > / V_# - #(C)(h)V_#
[mn] > s / _s
i > ī / V_# - #(C)(h)V_#
b > u / V_Z
g > i / V_Z
ħ > g / _A
[ħh] > / #_ - #_V(V)(C)(C)#
y > / #k(h)_ , #g_
m > n / _[yw]
w > m / m_#
m > b / #_R
Q > Z / _[mn]
m > w / Qh_
thn > tth / _
Dd > L / _#
Sd > L / _#
d > / V_#
h > / t_#
sy > þ / _
sw > x / _
sA > Ah / #_
L > D / _#
Dz > L / _d
Sz > L / _d
z > / V_d
e > a / s(t)_#
Q > F / #s_ - #s_h
> h / QQ_ , AQ_ , ŋQ_ - _h
Qh > F / _
s > þ / #V_V
ā > ō / _
au > ō / _
y > i / V_
œ > eu / _
æ > ī / _
ou > ū / _
oi > ui / _
ōi > oi / _
s > m / _m - #_m
s > n / _n - #_n
s > h / V_V , V_#
r > l / _l
y > / _(u)i
w > / _u , u_
b > m / _m
d > n / _n
-* OTsr
m > / #_b
n > / #_d
ŋ > / #_g
[mnŋ] > / C_#
s > / #_F
b > w / R|V_
d > ð / R|V_
g > ħ / R|V_
zb > ðw / _
zg > ðħ / _
z > ð / #_
z > r / _
[uw] > gw / #_
i > e / _C(C)a#
u > o / _C(C)a#
ø > f / _
y > i / C_V
e > i / _C(C)i#
o > u / _C(C)i#
a > e / _C(C)i#
ħ > i / V_A
x > i / V_þ
f > u / V_þ
[iy]u > ū / _
u > o / _ - _C(h)[uw]|[mnŋ]
o > u / V_
m > w / [nŋ]_
Dŋ > L / _[nw]
Sŋ > L / _[nw]
ŋ > / V_[nw]
ō > au / _
ē > ai / _
[eao] > / _#
Qhi > iQh / V_#
Ci > \\ / V_#
xw > ux / _#
x > h / #_
xR > Rh / #_
Q > Z / V_ - V_h|F|f
p > b / s_V
k > g / s_V
D > L / #(C)(h)_(C)(h)#
ħ > a / C_#
ħi > ī / C_#
ħ > i / [lrð]_V
ħ > / _
w > u / _i#
h > / V_
e > i / _n#
[iu] > / _# - uC|uQh_#
ī > i / _#
D¢ > / C_C
i > e / [ao]_
e > a / _i(C)#|iQh#
n > ð / _r
s > þ / l_
þ > s / [þð](C)(h)V(V)(C)(h)_
r > s / _s
f > p / m_#
þ > t / [nl]_#
x > k / ŋ_#
[mnŋ] > / _[fþxs]R
[mnŋ]¢ > / _[fþxsmnŋl]
ð¢ > / _[mnŋ]
¢ > / _
[wu] > b / [mnŋ]_
ð > d / [mnŋ]_
ħ > g / [mnŋ]_
f > m / m_
þ > n / n_
x > g / ŋ_
þ > l / l_
h > / [mn]_
h > / #_C
L > D / _CC|QhC - _QhV|Qh#
ī > i / _ - #(C)(h)_(C)(h)#
ū > u / _ - #(C)(h)_(C)(h)#
wa > u / a_
ð > l / l_
n > l / _l
b > m / m_
d > n / n_
C > / C_C - C_h
s > þ / V_R
w > / _o
n > m / _[mb]
l > / l_#
n > / n_#
s > / s_#
[gsþ] > / #ŋ_ , ŋ_#
ŋ > n / _[tdn]
ŋ > m / _[pbm]
m > w / V|R_ - _[mbp]
nn > n / _
mm > m / _
w > / u_#
o > a / _u
þþ > þ / _
xx > x / _
> e / C_A#
> e / #k_Q|F|f
g > e / #_Q|F|f
w > u / _(n)# , V_C
rr > r / _#
w[hx] > f / _
ð[hx] > þ / _
s > / _þ , þ_
þ > s / [þð](C)(h)V(V)(C)(h)_ , t_
s > t / [ðþ]?R_
s > þ / R_
u > i / Cu_
u > / Vu_
u > w / V_V
-* Tsr
k > c / _
ŋ > ñ / _
þ > th / _
ð > dh / _
x > ch / _
L > O / _
aa > â / _
ii > î / _
O > D / _CC , _V , V_
-* Orthography`
    },
    archipelago: {
        name: '群岛希克林语 / Archipelago Shikrin',
        category: `C=ptkbdgfsmnlr5jh123wxŋzþðħvũ
R=mnlr
T=ptkbdg
V=aeiouāēīōūáéíóúɤɯ89
D=aeiou
S=áéíóú
L=āēīōū
N=123
M=mn
G=iíīuúū
A=aáāoóō
Q=ptkf
P=iíīeéē
F=ptksþxf
Z=bdgzðħv`,
        replace: ``,
        rule: `-* PSkr
e > a / h2_ , _h2
é > á / h2_ , _h2
e > o / h3_ , _h3
é > ó / h3_ , _h3
> 8 / ē_
> 9 / ō_
c > k / _
j > g / _
y > j / _
> a / #R|CR_hNR , CR_[bdg] , C_RhNV
5 > u / C_C|# , #_C
j > i / C_C|# , #_C
m > n / _j
m > / _5
p > kw / _?kw
hN > a / #_RC , #R|CR_[ptk]
hN > / _V , V_CS , T_T - #(s)(M)T_T
hN > ī / CR_jV
hN > a / C_C
Dh > L / _NC|N#
D > S / #(s)(M)(C)(w)(R)_ - _?S
L > S4 / #(s)(M)(C)(w)(R)_ - _?S
hN > 4 / S_C|#
S > 2 / _4
N > / _
4 > / _
t[td] > ss / _
d[td] > ss / _
s > / Cs_ , Ls_ , SSs_
-* PArskr
5 > w / _
á > ó / [kg]w(R)_
a > o / [kg]w(R)_
> e / [kg]w(R)[óo]_n[tk]
í > ú / [kg]w(R)_
i > u / [kg]w(R)_
gw > b / _ - n_
b > / #m_
d > / #n_
ngw > w / #_V
ngw > u / #_
ng > j / #_
e > a / _Ra
é > á / _Ra
> i / #[lr]|C[lr]_T
> a / #|C_RC
h > / _
ē8 > īa / _
éé8 > ía / _
ē > ī / _
éé > íí / _
ō > ū / _(C)#
óó > úú / _(C)#
L > D / _RC
S > / _SRC
T > x / _T|s
p > b / _[lr]
p > w / _M
p > f / _ - s_
f > / #_
kw > p / #_
ō9 > ūa / _
óó9 > úa / _
ō > ā / _
óó > áá / _
e > o / _w
é > ó / _w
u > o / _wa
ú > ó / _wa
a > / áá_ , ā_
e > / éé_ , ē_
i > / íí_ , ī_
o > / óó_ , ō_
u > / úú_ , ū_
m > n / _[tdkg]
n > m / _[pb]
-* AArskr
> i / C_j
ij > / Vss_ - Sss_
w > v / M_
w > u / #(s)CV_#
w > / V_V
w > f / #_
> n / n¢_V
m > ũ / V_(R)V|#
b > v / V_(R)V|#
d > ð / V_(R)V|#
g > ħ / V_(R)V|#
n > z / V_(R)V|#
s > h / V_(R)V|#
h > j / i_
p > f / V_(R)V|#
t > þ / V_(R)V|#
k > x / V_(R)V|#
w > b / VC_V - V[ptkgfshþx]_V
sw > f / #_
S > 4 / S?S_
S4 > L / _
S > D / S?_ - S_
e > i / _sV
é > í / _[jhf][aou] - é_
V > / [þð]_[þð] , r_r
é > á / _g(w)P
e > a / _g(w)P
é > í / _(R)CG - _QG
e > i / _(R)CG - _QG
ó > ú / _(R)CG - _QG
o > u / _(R)CG - _QG
í > é / _(R)CA - _QA
i > e / _(R)CA - _QA
ú > ó / _(R)CA - _QA
u > o / _(R)CA - _QA
D > L / _[þðħx]R
S > 2 / _[þðħx]R
[þðħx] > / L|SS_R
w > / _
á > í / _M[bdg][iíī]
a > i / _M[bdg][iíī]
> u / [eiéí]_C(C)u(C)#|C(C)ū#
á > ú / _C(C)u(C)#|C(C)ū#
a > u / _C(C)u(C)#|C(C)ū#
S > 4 / _S
4S > 2 / _
4 > / _
> 4 / [lr]_s#
C > / _s#
C > / _s#
4 > / _
i > / _#
D[mndtkũzðþxsh] > / _#
L > / _#
L > D4 / _[mndtkũzðþxsh]#
4[mndtkũzðþxsh] > / _#
> ə / C_R#
z > nn / V_#
l > ll / V_#
ũ > / S_V(V)[mũ] , V_S(S)[mũ]
[fv] > / S_V(V)[fvbp] , V_S(S)[fvbp]
[þð] > / S_V(V)[þðdt] , V_S(S)[þðdt]
[xħ] > / S_V(V)[xħgk] , V_S(S)[xħgk]
h > / S_V(V)[hs] , V_S(S)[hs]
l > / S_V(V)l , V_S(S)l
ũ > v / _
z > r / V_gV|g# - S(C)_gV|g#
V > / S(C)CV(C)(C)CV(C)(C)C_
V > / S(C)C_ - S(C)C_CC#
ðð > dd / _
ð > d / _d , d_
d > t / _þ , þ_
[þð] > t / _t , t_
Z > F / _h , h_
h > / _
C > / C_C - _[lrjh]
S > 4 / S_
S4 > L / _
S > D / _
[ae]nt > ēd / _V
[ae]nk > ēg / _V
nt > dd / [iou]_V
nk > gg / [iou]_V
[ae]ns > ēs / _V
s > 4 / V_[mnl]V
[mnl]4 > 2 / _
4 > / _
rst > rt / V_V|#
st > ss / V_V|#
[sz] > d / V_[bdg]V|[bdg]#
> 4 / þ_r, v_[rl]
D[xħþð] > L / V_RV
4 > / _
j > / _
a > / áá_ , ā_
e > / éé_ , ē_
i > / íí_ , ī_
o > / óó_ , ō_
u > / úú_ , ū_
t > d / _# , _V(C)(C)#
þ > ð / _# , _V(C)(C)#
f > v / _# , _V(C)(C)#
x > ħ / P_# , P_V(C)(C)#
e > i / _[aou](C)(C)#
D > / V_C(C)V  - [iu]_C(C)V
e > ħ / [lr]_#
-* OArskr

-* Arskr

-* Orthography`
    }
};

// === SCA 核心实现（移植自 SCA.py） =====================================

function loadCategories(text) {
    const categories = {};
    for (const rawLine of text.split(/\r?\n/)) {
        const line = rawLine.trim();
        if (!line || line.startsWith('#')) continue;
        if (!line.includes('=')) continue;
        const eqIdx = line.indexOf('=');
        const key = line.slice(0, eqIdx).trim();
        const value = line.slice(eqIdx + 1).trim().replace(/ /g, '');
        if (key.length !== 1 || key !== key.toUpperCase() || !/^[A-Z]$/.test(key)) continue;
        // 去重保序
        const seen = new Set();
        let unique = '';
        for (const ch of value) {
            if (!seen.has(ch)) { seen.add(ch); unique += ch; }
        }
        categories[key] = unique;
    }
    return categories;
}

function loadReplacements(text) {
    const replacements = [];
    for (const rawLine of text.split(/\r?\n/)) {
        const line = rawLine.trim();
        if (!line || line.startsWith('#')) continue;
        if (!line.includes('|')) continue;
        const idx = line.indexOf('|');
        const original = line.slice(0, idx).trim();
        const replacement = line.slice(idx + 1).trim();
        replacements.push([original, replacement]);
    }
    replacements.sort((a, b) => b[0].length - a[0].length);
    return replacements;
}

function applyReplacements(text, replacements) {
    let t = text;
    for (const [original, replacement] of replacements) {
        t = t.split(original).join(replacement);
    }
    return t.split('.').join('');
}

function revertReplacements(text, replacements) {
    let t = text;
    for (let i = replacements.length - 1; i >= 0; i--) {
        const [original, replacement] = replacements[i];
        t = t.split(replacement).join(original);
    }
    return t;
}

function expandCategory(s, categories) {
    return s.replace(/[A-Z]/g, m => {
        const v = categories[m];
        return v === undefined ? m : '[' + v + ']';
    });
}

function contextToRegex(context, categories, direction) {
    const out = [];
    let i = 0;
    while (i < context.length) {
        const c = context[i];
        if (c === '#') {
            out.push(direction === 0 ? '^' : '$');
        } else if (c === '?') {
            out.push('.*');
        } else if (c === '(') {
            let j = i + 1;
            while (j < context.length && context[j] !== ')') j++;
            const inner = expandCategory(context.slice(i + 1, j), categories);
            out.push('(?:' + inner + ')?');
            i = j;
        } else {
            out.push(expandCategory(c, categories));
        }
        i++;
    }
    return out.join('');
}

function parseRule(ruleStr, categories, replacements) {
    if (ruleStr.includes('-*')) {
        const periodName = ruleStr.split('-*')[1].trim();
        return {
            target: '',
            replacement: '',
            leftContext: [''],
            rightContext: [''],
            leftException: '',
            rightException: '',
            isIntermediate: true,
            periodName
        };
    }

    let leftContext = [], rightContext = [];
    let rulePart, contextPart, exceptionPart;

    if (ruleStr.includes('/')) {
        const slashIdx = ruleStr.indexOf('/');
        rulePart = ruleStr.slice(0, slashIdx);
        contextPart = ruleStr.slice(slashIdx + 1);
        if (contextPart.includes('-')) {
            const dashIdx = contextPart.indexOf('-');
            exceptionPart = contextPart.slice(dashIdx + 1).trim();
            contextPart = contextPart.slice(0, dashIdx).trim();
        } else {
            exceptionPart = '';
            contextPart = contextPart.trim();
        }
        if (contextPart.includes(',')) {
            for (const eachContext of contextPart.split(',')) {
                const underIdx = eachContext.indexOf('_');
                leftContext.push(eachContext.slice(0, underIdx));
                rightContext.push(eachContext.slice(underIdx + 1));
            }
        } else {
            const underIdx = contextPart.indexOf('_');
            leftContext.push(contextPart.slice(0, underIdx));
            rightContext.push(contextPart.slice(underIdx + 1));
        }
    } else {
        rulePart = ruleStr;
        leftContext = [''];
        rightContext = [''];
        exceptionPart = '';
    }

    const gtIdx = rulePart.indexOf('>');
    let target = rulePart.slice(0, gtIdx).trim();
    let replacement = rulePart.slice(gtIdx + 1).trim();
    let leftE = '', rightE = '';
    if (exceptionPart) {
        const underIdx = exceptionPart.indexOf('_');
        leftE = exceptionPart.slice(0, underIdx);
        rightE = exceptionPart.slice(underIdx + 1);
    }

    target = applyReplacements(target, replacements);
    replacement = applyReplacements(replacement, replacements);
    leftE = applyReplacements(leftE, replacements);
    rightE = applyReplacements(rightE, replacements);
    leftContext = leftContext.map(c => applyReplacements(c, replacements));
    rightContext = rightContext.map(c => applyReplacements(c, replacements));

    target = expandCategory(target, categories);

    const leftPattern = leftContext.map(c => contextToRegex(c.trim(), categories, 0));
    const rightPattern = rightContext.map(c => contextToRegex(c.trim(), categories, 1));
    const leftEPattern = contextToRegex(leftE.trim(), categories, 0);
    const rightEPattern = contextToRegex(rightE.trim(), categories, 1);

    return {
        target,
        replacement,
        leftContext: leftPattern,
        rightContext: rightPattern,
        leftException: leftEPattern,
        rightException: rightEPattern,
        isIntermediate: false,
        periodName: ''
    };
}

function loadRules(text, categories, replacements) {
    const rules = [];
    for (const rawLine of text.split(/\r?\n/)) {
        const line = rawLine.trim();
        if (!line || line.startsWith('#')) continue;
        rules.push(parseRule(line, categories, replacements));
    }
    return rules;
}

function systematicalReplacement(waitingstr, pos) {
    if (pos < 0 || pos >= waitingstr.length) return '';
    return waitingstr[pos];
}

function applyReplacementCore(target, replacement, original, categories) {
    if (replacement === '\\') {
        return target.split('').reverse().join('');
    }
    if (replacement === '2') {
        return target + target;
    }
    if (replacement === '') {
        return '';
    }
    const lbrac = original.indexOf('[');
    const rbrac = original.indexOf(']');
    let pos = 9999;
    if (lbrac === -1 && rbrac === -1) {
        pos = original.indexOf(target);
    } else {
        const lpart = original.slice(0, lbrac);
        const mpart = original.slice(lbrac + 1, rbrac);
        const rpart = original.slice(rbrac + 1);
        for (let selIndex = 0; selIndex < mpart.length; selIndex++) {
            const realOriginal = lpart + mpart[selIndex] + rpart;
            if (realOriginal.indexOf(target) !== -1) {
                pos = selIndex;
                break;
            }
        }
    }
    return replacement.replace(/[A-Z]/g, m => {
        const v = categories[m];
        if (v === undefined) return m;
        return systematicalReplacement(v, pos);
    });
}

function compileRegex(left, target, right) {
    // 处理空左/右环境时不要塞空 lookbehind/lookahead，否则部分浏览器会异常
    const lb = left ? `(?<=${left})` : '';
    const la = right ? `(?=${right})` : '';
    return new RegExp(`${lb}(${target})${la}`, 'gu');
}

function runSCA(word, categories, replacements, rules) {
    const debugOutput = [];
    const intermediates = [];
    const columnNames = [];
    let current = applyReplacements(word, replacements);

    rules.forEach((rule, ruleIndex) => {
        let lstCurrent = current;
        for (let i = 0; i < rule.leftContext.length; i++) {
            let newCurrent;
            try {
                const pattern = compileRegex(rule.leftContext[i], rule.target, rule.rightContext[i]);
                if (rule.leftException || rule.rightException) {
                    const excludePattern = compileRegex(rule.leftException, rule.target, rule.rightException);
                    const excludeRanges = [];
                    let m;
                    excludePattern.lastIndex = 0;
                    while ((m = excludePattern.exec(lstCurrent)) !== null) {
                        excludeRanges.push([m.index, m.index + m[0].length]);
                        if (m[0].length === 0) excludePattern.lastIndex++;
                    }
                    newCurrent = lstCurrent.replace(pattern, (match, _g1, offset) => {
                        const start = offset;
                        const end = offset + match.length;
                        for (const [exStart, exEnd] of excludeRanges) {
                            if (start >= exStart && end <= exEnd) return match;
                        }
                        return applyReplacementCore(match, rule.replacement, rule.target, categories);
                    });
                } else {
                    newCurrent = lstCurrent.replace(pattern, (match) =>
                        applyReplacementCore(match, rule.replacement, rule.target, categories)
                    );
                }
            } catch (err) {
                throw new Error(`第 ${ruleIndex + 1} 条规则编译/应用失败：${err.message}`);
            }
            lstCurrent = newCurrent;
        }
        const newCurrent = lstCurrent;

        if (rule.isIntermediate) {
            intermediates.push(revertReplacements(newCurrent, replacements));
            if (!columnNames.includes(rule.periodName)) {
                columnNames.push(rule.periodName);
            }
        }
        if (newCurrent !== current) {
            debugOutput.push(
                `${current} → ${newCurrent} (${rule.target || '∅'} → ${rule.replacement || '∅'}) @ 第 ${ruleIndex + 1} 行`
            );
        }
        current = newCurrent;
    });

    const finalWord = revertReplacements(current, replacements);
    return { finalWord, intermediates, columnNames, debugOutput };
}

// === UI 绑定 ============================================================

function $(id) { return document.getElementById(id); }

function loadPreset(key) {
    if (!key || !PRESETS[key]) return;
    const p = PRESETS[key];
    $('categoryInput').value = p.category;
    $('replaceInput').value = p.replace;
    $('ruleInput').value = p.rule;
}

function renderResult(rows, columnNames) {
    const area = $('resultArea');
    if (!rows.length) {
        area.innerHTML = '<div class="empty-state">没有输入要处理的单词</div>';
        return;
    }
    const headers = ['原词', ...columnNames, '最终'];
    let html = '<table class="result-table"><thead><tr>';
    for (const h of headers) html += `<th>${escapeHtml(h)}</th>`;
    html += '</tr></thead><tbody>';
    for (const row of rows) {
        if (row.error) {
            html += `<tr class="error-row"><td colspan="${headers.length}">${escapeHtml(row.word)} — 错误：${escapeHtml(row.error)}</td></tr>`;
            continue;
        }
        const cells = [row.word, ...row.intermediates, row.finalWord];
        // 不足列数则补空
        while (cells.length < headers.length) cells.splice(cells.length - 1, 0, '');
        html += '<tr>';
        for (let i = 0; i < headers.length; i++) {
            const cls = i === 0 ? 'cell-source' : (i === headers.length - 1 ? 'cell-final' : 'cell-stage');
            html += `<td class="${cls}">${escapeHtml(cells[i] ?? '')}</td>`;
        }
        html += '</tr>';
    }
    html += '</tbody></table>';
    area.innerHTML = html;
}

function renderDebug(rows) {
    const area = $('debugArea');
    const allDebug = rows.filter(r => !r.error && r.debugOutput && r.debugOutput.length);
    if (!allDebug.length) {
        area.innerHTML = '<div class="empty-state">无调试信息</div>';
        return;
    }
    let html = '';
    for (const r of allDebug) {
        html += `<div class="debug-block"><div class="debug-word">${escapeHtml(r.word)}</div><ol class="debug-list">`;
        for (const step of r.debugOutput) {
            html += `<li>${escapeHtml(step)}</li>`;
        }
        html += '</ol></div>';
    }
    area.innerHTML = html;
}

function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
}

function run() {
    const categoryText = $('categoryInput').value;
    const replaceText = $('replaceInput').value;
    const ruleText = $('ruleInput').value;
    const wordsRaw = $('wordInput').value;

    const words = wordsRaw.split(/\r?\n/).map(w => w.trim()).filter(w => w && !w.startsWith('#'));

    let categories, replacements, rules;
    try {
        categories = loadCategories(categoryText);
        replacements = loadReplacements(replaceText);
        rules = loadRules(ruleText, categories, replacements);
    } catch (err) {
        $('resultArea').innerHTML = `<div class="error-state">配置解析失败：${escapeHtml(err.message)}</div>`;
        $('debugArea').innerHTML = '<div class="empty-state">—</div>';
        return;
    }

    const rows = [];
    let columnNames = [];
    for (const word of words) {
        try {
            const result = runSCA(word, categories, replacements, rules);
            rows.push({ word, ...result });
            if (result.columnNames.length > columnNames.length) {
                columnNames = result.columnNames;
            }
        } catch (err) {
            rows.push({ word, error: err.message });
        }
    }
    renderResult(rows, columnNames);
    renderDebug(rows);
}

function setInputError(msg) {
    const input = $('wordInput');
    const errBox = $('inputError');
    if (msg) {
        input.classList.add('input-error');
        errBox.textContent = msg;
        errBox.classList.add('show');
    } else {
        input.classList.remove('input-error');
        errBox.textContent = '';
        errBox.classList.remove('show');
    }
}

function expandTheusrinForms() {
    const input = $('wordInput');
    const lines = input.value.split(/\r?\n/).map(l => l.trim()).filter(l => l);

    if (lines.length < 2 || lines.length > 3) {
        setInputError(`需要输入 2 行（强形 A、弱形 B）或 3 行（A、B、中形 C），当前为 ${lines.length} 行。`);
        return;
    }
    setInputError('');

    const [A, B, C] = lines;
    const expanded = (C === undefined)
        ? [A, A + 's', A + 'm', B + 'wat', A + 'is', A + 'im']
        : [A, A + 's', A + 'm', B + 'wat', C + 'hr', A + 'is', A + 'im', C + 'ihr'];

    input.value = expanded.join('\n');
    run();
}

document.addEventListener('DOMContentLoaded', () => {
    // 默认加载第一个预设，便于上手
    $('presetSelect').value = 'theusrin';
    loadPreset('theusrin');

    $('loadPresetBtn').addEventListener('click', () => {
        const key = $('presetSelect').value;
        if (!key) return;
        loadPreset(key);
    });

    $('runBtn').addEventListener('click', run);
    $('expandThsrBtn').addEventListener('click', expandTheusrinForms);

    $('wordInput').addEventListener('input', () => {
        if ($('wordInput').classList.contains('input-error')) {
            setInputError('');
        }
    });

    $('wordInput').addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            run();
        }
    });

    // 下拉按钮（说明）
    const helpBtn = $('helpBtn');
    if (helpBtn) {
        helpBtn.addEventListener('click', () => {
            const c = $('helpContent');
            c.classList.toggle('show');
        });
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.dropdown')) {
                document.querySelectorAll('.dropdown-content.show').forEach(el => el.classList.remove('show'));
            }
        });
    }
});
