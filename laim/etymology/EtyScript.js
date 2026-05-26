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

    async function fetchMultiLangEtymology(word) {
        const url = `https://en.wiktionary.org/api/rest_v1/page/html/${encodeURIComponent(word)}`;
        const resp = await fetch(url);
        if (!resp.ok) return [];
        const html = await resp.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const results = [];
        const topSections = doc.querySelectorAll('section[data-mw-section-id]');
        for (const sec of topSections) {
            const h2 = sec.querySelector(':scope > h2');
            if (!h2) continue;
            const langName = h2.textContent.trim();
            if (['English','Contents','References','See also','Anagrams','Further reading'].includes(langName)) continue;
            const etySecs = sec.querySelectorAll('section');
            for (const etySec of etySecs) {
                const heading = etySec.querySelector('h3, h4');
                if (!heading || !/etymology/i.test(heading.textContent)) continue;
                let content = '';
                for (const child of etySec.children) {
                    if (child === heading) continue;
                    if (!isEtyContent(child)) continue;
                    const text = extractText(child);
                    if (text) content += text + '\n';
                }
                if (content.trim()) {
                    results.push({ lang: langName, ety: content.trim() });
                }
                break;
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
            const multiLang = await fetchMultiLangEtymology(mainWord);
            if (multiLang.length > 0) {
                renderMultiLang(mainWord, multiLang);
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

    function renderMultiLang(word, items) {
        const card = document.createElement('div');
        card.className = 'result-card';
        let html = `<h3 class="multi-lang">其他语言词源: ${word}</h3>`;
        for (const item of items) {
            html += `<div class="multi-lang-item"><span class="lang-name">${escapeHtml(item.lang)}</span>${escapeHtml(item.ety)}</div>`;
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
