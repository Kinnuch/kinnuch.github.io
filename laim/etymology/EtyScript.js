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

    async function translateToEnglish(word) {
        const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(word)}&langpair=zh|en`;
        const resp = await fetch(url);
        const data = await resp.json();
        if (data.responseStatus !== 200) throw new Error('Translation failed');
        const results = [];
        const main = data.responseData.translatedText.toLowerCase().trim();
        if (main && main !== word.toLowerCase()) results.push(main);
        if (data.matches) {
            for (const m of data.matches) {
                const t = m.translation.toLowerCase().trim();
                if (t && t !== word.toLowerCase() && !results.includes(t)) {
                    results.push(t);
                    if (results.length >= 4) break;
                }
            }
        }
        return results;
    }

    async function fetchEtymology(word) {
        const url = `https://en.wiktionary.org/api/rest_v1/page/html/${encodeURIComponent(word)}`;
        const resp = await fetch(url);
        if (!resp.ok) return null;
        const html = await resp.text();
        return parseEtymology(html, word);
    }

    function parseEtymology(html, word) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const sections = [];
        const headings = doc.querySelectorAll('h3, h4');
        for (const h of headings) {
            const id = h.getAttribute('id') || '';
            if (/etymology/i.test(id) || /etymology/i.test(h.textContent)) {
                let content = '';
                let el = h.nextElementSibling;
                while (el && !['H2','H3','H4'].includes(el.tagName)) {
                    content += el.textContent.trim() + '\n';
                    el = el.nextElementSibling;
                }
                if (content.trim()) {
                    sections.push(content.trim());
                }
            }
        }
        if (sections.length === 0) {
            const body = doc.body.textContent || '';
            const match = body.match(/From\s+[\s\S]{10,200}/);
            if (match) sections.push(match[0]);
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
        const h2s = doc.querySelectorAll('h2');
        for (const h2 of h2s) {
            const langName = h2.textContent.trim();
            if (['English','Contents','References','See also','Anagrams'].includes(langName)) continue;
            let el = h2.nextElementSibling;
            while (el && el.tagName !== 'H2') {
                const id = el.getAttribute('id') || '';
                if (/etymology/i.test(id) || /etymology/i.test(el.textContent)) {
                    let content = '';
                    let next = el.nextElementSibling;
                    while (next && !['H2','H3','H4'].includes(next.tagName)) {
                        content += next.textContent.trim() + '\n';
                        next = next.nextElementSibling;
                    }
                    if (content.trim()) {
                        results.push({ lang: langName, ety: content.trim() });
                    }
                    break;
                }
                el = el.nextElementSibling;
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
                if (translated.length === 0) {
                    resultArea.innerHTML = '<div class="result-card"><div class="error-state">未能翻译该词，请尝试直接输入英文。</div></div>';
                    return;
                }
                englishWords = translated;
                renderTranslation(word, englishWords);
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

    function renderTranslation(zh, enWords) {
        const card = document.createElement('div');
        card.className = 'result-card';
        card.innerHTML = `<h3>翻译结果</h3>
            <div class="ety-section">
                <div class="ety-word">${zh}</div>
                <p>英文对应: ${enWords.join(', ')}</p>
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
