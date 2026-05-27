(function() {
    const wordInput = document.getElementById('wordInput');
    const queryBtn = document.getElementById('queryBtn');
    const inputError = document.getElementById('inputError');
    const resultArea = document.getElementById('resultArea');

    queryBtn.addEventListener('click', handleQuery);
    wordInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') handleQuery();
    });
    wordInput.addEventListener('input', function() {
        wordInput.classList.remove('has-error');
        inputError.classList.remove('show');
    });

    function isChinese(text) {
        return /[一-鿿]/.test(text);
    }

    const STOP_WORDS = new Set([
        'a','an','the','of','in','on','at','to','for','is','are','was','were',
        'be','been','being','have','has','had','do','does','did','will','would',
        'shall','should','may','might','can','could','it','its','this','that',
        'these','those','and','or','but','not','no','with','by','from','as','up',
        'out','into','over','after','before','between','under','above','very','so'
    ]);

    function isCompoundWord(text) {
        return !text.includes(' ');
    }

    function extractContentWords(phrase) {
        return phrase.split(/\s+/).filter(w => w.length > 1 && !STOP_WORDS.has(w));
    }

    async function translateToEnglish(word) {
        const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(word)}&langpair=zh|en`;
        const resp = await fetch(url);
        const data = await resp.json();
        if (data.responseStatus !== 200) throw new Error('Translation failed');
        const allTranslations = [];
        const main = data.responseData.translatedText.toLowerCase().trim();
        if (main && main !== word.toLowerCase()) allTranslations.push(main);
        if (data.matches) {
            for (const m of data.matches) {
                const t = m.translation.toLowerCase().trim();
                if (t && t !== word.toLowerCase() && !allTranslations.includes(t)) {
                    allTranslations.push(t);
                    if (allTranslations.length >= 6) break;
                }
            }
        }
        const singleWords = allTranslations.filter(isCompoundWord);
        if (singleWords.length > 0) {
            return { words: singleWords.slice(0, 4), raw: allTranslations, fromPhrase: false };
        }
        const contentWords = [];
        for (const phrase of allTranslations) {
            for (const w of extractContentWords(phrase)) {
                if (!contentWords.includes(w)) contentWords.push(w);
            }
        }
        return { words: contentWords.slice(0, 4), raw: allTranslations, fromPhrase: true };
    }

    async function fetchEtymology(word) {
        const url = `https://en.wiktionary.org/api/rest_v1/page/html/${encodeURIComponent(word)}`;
        const resp = await fetch(url);
        if (!resp.ok) return null;
        const html = await resp.text();
        return parseEtymology(html, word);
    }

    function isEtyContent(el) {
        const tag = el.tagName;
        if (['STYLE','SCRIPT','LINK','META','TABLE'].includes(tag)) return false;
        if (tag === 'DIV' && el.classList.contains('sister-wikipedia')) return false;
        return true;
    }

    function extractText(el) {
        const tag = el.tagName;
        if (tag === 'P' || tag === 'UL' || tag === 'OL' || tag === 'DL') {
            return el.textContent.trim();
        }
        return '';
    }

    function parseEtymology(html, word) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const sections = [];
        const sectionEls = doc.querySelectorAll('section');
        for (const sec of sectionEls) {
            const heading = sec.querySelector('h2, h3, h4');
            if (!heading) continue;
            const headText = heading.textContent.trim();
            if (!/etymology/i.test(headText)) continue;
            const langHeading = sec.closest('section[data-mw-section-id]');
            const parentH2 = langHeading ? langHeading.querySelector('h2') : null;
            if (parentH2 && !/english/i.test(parentH2.textContent)) continue;
            let content = '';
            for (const child of sec.children) {
                if (child === heading) continue;
                if (!isEtyContent(child)) continue;
                const text = extractText(child);
                if (text) content += text + '\n';
            }
            if (content.trim()) sections.push(content.trim());
        }
        if (sections.length === 0) {
            const headings = doc.querySelectorAll('h3, h4');
            for (const h of headings) {
                if (!/etymology/i.test(h.textContent)) continue;
                let content = '';
                let el = h.nextElementSibling;
                while (el && !['H2','H3','H4'].includes(el.tagName)) {
                    if (isEtyContent(el)) {
                        const text = extractText(el);
                        if (text) content += text + '\n';
                    }
                    el = el.nextElementSibling;
                }
                if (content.trim()) sections.push(content.trim());
            }
        }
        return sections.length > 0 ? sections : null;
    }

    const TARGET_LANGS = [
        { code: 'ja', name: '日语 Japanese', pair: 'zh|ja' },
        { code: 'ko', name: '韩语 Korean', pair: 'zh|ko' },
        { code: 'ar', name: '阿拉伯语 Arabic', pair: 'en|ar' },
        { code: 'tr', name: '土耳其语 Turkish', pair: 'en|tr' },
        { code: 'fi', name: '芬兰语 Finnish', pair: 'en|fi' },
        { code: 'hu', name: '匈牙利语 Hungarian', pair: 'en|hu' },
        { code: 'sw', name: '斯瓦希里语 Swahili', pair: 'en|sw' },
        { code: 'ms', name: '马来语 Malay', pair: 'en|ms' },
        { code: 'ta', name: '泰米尔语 Tamil', pair: 'en|ta' },
        { code: 'he', name: '希伯来语 Hebrew', pair: 'en|he' },
        { code: 'mn', name: '蒙古语 Mongolian', pair: 'en|mn' },
        { code: 'ka', name: '格鲁吉亚语 Georgian', pair: 'en|ka' },
    ];

    async function translateToLang(word, langpair) {
        const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(word)}&langpair=${langpair}`;
        try {
            const resp = await fetch(url);
            const data = await resp.json();
            if (data.responseStatus !== 200) return null;
            const t = data.responseData.translatedText.trim();
            if (!t || t.toLowerCase() === word.toLowerCase()) return null;
            return t;
        } catch { return null; }
    }

    async function fetchWordEtymology(word) {
        const url = `https://en.wiktionary.org/api/rest_v1/page/html/${encodeURIComponent(word)}`;
        try {
            const resp = await fetch(url);
            if (!resp.ok) return null;
            const html = await resp.text();
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            const allSections = doc.querySelectorAll('section');
            for (const sec of allSections) {
                const heading = sec.querySelector('h2, h3, h4');
                if (!heading || !/etymology/i.test(heading.textContent)) continue;
                let content = '';
                for (const child of sec.children) {
                    if (child === heading) continue;
                    if (!isEtyContent(child)) continue;
                    const text = extractText(child);
                    if (text) content += text + '\n';
                }
                if (content.trim()) return content.trim();
            }
        } catch {}
        return null;
    }

    const LANG_WORDS = new Set([
        'english','french','latin','greek','german','spanish','italian','portuguese',
        'dutch','russian','polish','czech','swedish','norwegian','danish','finnish',
        'hungarian','turkish','arabic','persian','hebrew','sanskrit','hindi','urdu',
        'chinese','japanese','korean','malay','indonesian','thai','vietnamese',
        'swahili','georgian','armenian','albanian','romanian','bulgarian','serbian',
        'croatian','irish','welsh','scottish','basque','catalan','galician',
        'ancient','old','middle','proto','classical','medieval','late','early',
        'vulgar','modern','literary','dialectal','colloquial','borrowed','inherited',
        'derived','from','the','a','an','and','or','of','in','to','with','by',
        'germanic','slavic','romance','celtic','baltic','semitic','turkic',
        'indo-european','west','east','north','south','central','upper','lower',
    ]);

    function extractSourceInfo(etyText) {
        const results = [];
        const re = /(?:From|Borrowed from|Derived from|Inherited from|from)\s+((?:(?:Ancient|Old|Middle|Proto-?|Classical|Medieval|Late|Early|Vulgar|Modern)\s+)*[\w-]+)\s+([^\s(,;.]+)\s*(?:\(([^)]+)\))?/gi;
        let m;
        while ((m = re.exec(etyText)) !== null) {
            const lang = m[1].trim();
            const scriptWord = m[2].trim().replace(/[",;.]+$/, '');
            const paren = m[3] || '';
            const translit = paren.split(',')[0].trim().replace(/^["']+|["']+$/g, '');
            if (scriptWord.length > 1 && !LANG_WORDS.has(scriptWord.toLowerCase())) {
                results.push({ script: scriptWord, translit: translit, lang: lang });
            } else if (translit.length > 1 && !LANG_WORDS.has(translit.toLowerCase())) {
                results.push({ script: translit, translit: translit, lang: lang });
            }
        }
        if (results.length === 0) {
            const fallback = etyText.match(/(?:From|Borrowed from)\s+(?:[\w-]+\s+){1,3}(\*[\w-]+)/i);
            if (fallback) {
                results.push({ script: fallback[1], translit: fallback[1], lang: '' });
            }
        }
        return results.length > 0 ? results[0] : null;
    }

    function cleanForLookup(word) {
        let cleaned = word.replace(/^[؀-ۿݐ-ݿﭐ-﷿ﹰ-﻿\s]*/, '');
        if (cleaned.length < 2) cleaned = word;
        cleaned = cleaned.replace(/[ʔʕʾʿˀˁ]/g, '');
        cleaned = cleaned.replace(/[̀-ًͯ-ٰٟ]/g, '');
        cleaned = cleaned.replace(/^[-*]+/, '');
        cleaned = cleaned.replace(/[-]+$/, '');
        return cleaned.trim();
    }

    function generateLookupVariants(info) {
        const variants = [];
        if (info.script && info.script.length > 1) variants.push(info.script);
        if (info.translit && info.translit.length > 1 && info.translit !== info.script) {
            variants.push(info.translit);
        }
        const cleanedScript = cleanForLookup(info.script);
        if (cleanedScript.length > 1 && !variants.includes(cleanedScript)) {
            variants.push(cleanedScript);
        }
        if (info.translit) {
            const cleanedTranslit = cleanForLookup(info.translit);
            if (cleanedTranslit.length > 1 && !variants.includes(cleanedTranslit)) {
                variants.push(cleanedTranslit);
            }
            const ascii = info.translit.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[ʔʕʾʿˀˁ]/g, '');
            if (ascii.length > 1 && !variants.includes(ascii)) {
                variants.push(ascii);
            }
        }
        return variants;
    }

    async function tryFetchEtymology(variants) {
        for (const v of variants) {
            const ety = await fetchWordEtymology(v);
            if (ety) return { word: v, ety: ety };
        }
        return null;
    }

    async function traceEtymologyChain(word, maxDepth = 5) {
        const chain = [];
        const visited = new Set();
        let current = word;
        for (let i = 0; i < maxDepth; i++) {
            if (visited.has(current.toLowerCase())) break;
            visited.add(current.toLowerCase());
            const ety = await fetchWordEtymology(current);
            if (!ety) break;
            chain.push({ word: current, ety: ety });
            const sourceInfo = extractSourceInfo(ety);
            if (!sourceInfo) break;
            const variants = generateLookupVariants(sourceInfo);
            const validVariants = variants.filter(v => !visited.has(v.toLowerCase()));
            if (validVariants.length === 0) break;
            const found = await tryFetchEtymology(validVariants);
            if (!found) break;
            current = found.word;
        }
        return chain;
    }

    async function fetchMultiLangEtymology(sourceWord, chineseWord) {
        const results = [];
        const queryWord = chineseWord || sourceWord;
        const tasks = TARGET_LANGS.map(async (lang) => {
            const fromWord = lang.pair.startsWith('zh') ? queryWord : sourceWord;
            const translated = await translateToLang(fromWord, lang.pair);
            if (!translated) return null;
            const chain = await traceEtymologyChain(translated, 5);
            if (chain.length === 0) return null;
            return { lang: lang.name, word: translated, chain: chain };
        });
        const settled = await Promise.allSettled(tasks);
        for (const r of settled) {
            if (r.status === 'fulfilled' && r.value) {
                results.push(r.value);
            }
        }
        return results;
    }

    async function handleQuery() {
        const word = wordInput.value.trim();
        if (!word) {
            wordInput.classList.add('has-error');
            inputError.classList.add('show');
            return;
        }
        resultArea.innerHTML = '';
        queryBtn.disabled = true;
        queryBtn.innerHTML = '<span class="loading-spinner"></span>查询中...';

        try {
            let englishWords = [];
            if (isChinese(word)) {
                const translated = await translateToEnglish(word);
                if (translated.words.length === 0) {
                    resultArea.innerHTML = '<div class="result-card"><div class="error-state">未能翻译该词，请尝试直接输入英文。</div></div>';
                    return;
                }
                englishWords = translated.words;
                renderTranslation(word, translated);
            } else {
                englishWords = [word.toLowerCase()];
            }

            for (const ew of englishWords) {
                const ety = await fetchEtymology(ew);
                renderEtymology(ew, ety);
            }

            const mainWord = englishWords[0];
            const chineseWord = isChinese(word) ? word : null;
            const multiLang = await fetchMultiLangEtymology(mainWord, chineseWord);
            if (multiLang.length > 0) {
                renderMultiLang(multiLang);
            }
        } catch (err) {
            resultArea.innerHTML += `<div class="result-card"><div class="error-state">查询出错: ${err.message}</div></div>`;
        } finally {
            queryBtn.disabled = false;
            queryBtn.textContent = '查询灵感';
        }
    }

    function renderTranslation(zh, translated) {
        const card = document.createElement('div');
        card.className = 'result-card';
        let detail = '';
        if (translated.fromPhrase) {
            detail = `<p>翻译结果为词组: ${translated.raw.join(', ')}</p>
                <p>已提取实词分别查询: <strong>${translated.words.join(', ')}</strong></p>`;
        } else {
            detail = `<p>英文对应: <strong>${translated.words.join(', ')}</strong></p>`;
        }
        card.innerHTML = `<h3>翻译结果</h3>
            <div class="ety-section">
                <div class="ety-word">${zh}</div>
                ${detail}
            </div>`;
        resultArea.appendChild(card);
    }

    function renderEtymology(word, sections) {
        const card = document.createElement('div');
        card.className = 'result-card';
        if (!sections) {
            card.innerHTML = `<h3>词源: ${word}</h3>
                <div class="empty-state">未找到 "${word}" 的词源信息。</div>`;
        } else {
            let html = `<h3>词源: ${word}</h3>`;
            for (const s of sections) {
                html += `<div class="ety-section"><p>${escapeHtml(s)}</p></div>`;
            }
            html += `<div class="ety-section"><a href="https://en.wiktionary.org/wiki/${encodeURIComponent(word)}" target="_blank">在 Wiktionary 查看完整词条 →</a></div>`;
            card.innerHTML = html;
        }
        resultArea.appendChild(card);
    }

    function renderMultiLang(items) {
        const card = document.createElement('div');
        card.className = 'result-card';
        let html = `<h3 class="multi-lang">其他语言词源参考</h3>`;
        for (const item of items) {
            html += `<div class="multi-lang-item"><span class="lang-name">${escapeHtml(item.lang)}</span><strong>${escapeHtml(item.word)}</strong>`;
            html += `<div class="ety-chain">`;
            for (let i = 0; i < item.chain.length; i++) {
                const step = item.chain[i];
                if (i > 0) html += `<div class="chain-arrow">↓</div>`;
                html += `<div class="chain-step"><span class="chain-word">${escapeHtml(step.word)}</span><span class="chain-ety">${escapeHtml(step.ety)}</span></div>`;
            }
            html += `</div></div>`;
        }
        card.innerHTML = html;
        resultArea.appendChild(card);
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
})();
