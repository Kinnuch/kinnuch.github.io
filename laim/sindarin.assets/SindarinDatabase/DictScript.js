const data = "https://kinnuch.github.io/laim/sindarin.assets/SindarinDatabase/dictionary.json";
let page = 0;
const pageSize = 10;
let allEntries = [];
let filteredEntries = [];

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    fetch(data)
        .then(response => response.json())
        .then(data => {
            allEntries = data
            .filter(entry => entry.dict_form !== "test")
            .sort((a, b) => {return a.dict_form.localeCompare(b.dict_form)});
            filteredEntries = [...allEntries];
            loadMore();
            setupSearch();
            setupInfiniteScroll();
        })
        .catch(error => console.error('Loading Error', error));
});

function fillMorphology(entry) {
    let ret = '';
    if (entry.part === "noun" || entry.part === "adjective") {
        ret = 
            `
            <div class="morphology">
            ${entry.morphology.map(m => `
                <div class="morph-item">
                    <div>${m.type}</div>
                    <div>${m.form}</div>
                </div>
            `).join('')}
            </div>
            `
    }
    else if (entry.part === "verb") {
        ret = 
            `
            <div class="morphology">
                ${entry.morphology.map(m => `
                    <div class="morph-item">
                        <div>${m.type}</div>
                        <div>${m.form}</div>
                    </div>
                `).join('')}
            </div>
            `
    }
    return ret;
}

function createEntryHTML(entry) {
    let sentenceHTML = '';
    const hasValidSentence = entry.sentence && 
                            entry.sentence.trim() !== '' && 
                            entry.sentence !== 'null' && 
                            entry.sentence !== 'undefined';
    if (hasValidSentence) {
        const formatted = entry.sentence.replace(
            /(\[.+\])/g,
            '<span class="sentence-bracket">$1</span>'
        ).replace(
            /([\u4e00-\u9fa5].*)/g, 
            '<span class="sentence-chinese">$1</span>'
        ).replace(
            /([áéíóúýÁÉÍÓÚÝñÑâêîôûŷÂÊÎÔÛŶëËa-zA-Z].*?)(?=\s*[.]\s*|$)/g, 
            '<span class="sentence-latin">$1</span>'
        );
        sentenceHTML = `<div class="sentence">${formatted}</div>`;
    }
    let otherHTML = '';
    const hasValidOther = entry.other && 
                            entry.other.trim() !== '' && 
                            entry.other !== 'null' && 
                            entry.other !== 'undefined';
    if (hasValidOther) {
        const formatted = entry.other.replace(
            /([\u4e00-\u9fa5，；]+)/g,
            '<span lang="zh-Hans">$1</span>'
        );
        otherHTML = `<div class="other">${formatted}</div>`;
    }
    return `
        <div class="entry" onclick="toggleMorphology(this)">
            <div class="dict-form">${entry.dict_form}</div>
            <div class="part">${entry.part}</div>
            <div class="english">${entry.english}</div>
            <div class="definition">${entry.definition}</div>
            ${sentenceHTML}
            ${otherHTML}
            ${fillMorphology(entry)}
        </div>
        `;
}

function toggleMorphology(element) {
    const morphology = element.querySelector('.morphology');
    if (morphology) {
        morphology.classList.toggle('active');
    }
}

function loadMore() {
    const start = page * pageSize;
    const end = start + pageSize;
    const entries = filteredEntries.slice(start, end);
    
    if(entries.length === 0) {
        document.getElementById('loading').style.display = 'none';
        return;
    }

    const entriesHTML = entries.map(createEntryHTML).join('');
    document.getElementById('entriesContainer').innerHTML += entriesHTML;
    page++;
}

function setupSearch() {
    const searchInput = document.getElementById('searchInput');
    searchInput.addEventListener('input', (e) => {
        const queryTotal = e.target.value.toLowerCase();
        let classifier = '';
        let query = queryTotal;
        if (queryTotal.includes('=')) {
            [classifier, query] = queryTotal.split('=');
        }
        filteredEntries = allEntries.filter(entry => 
            ((classifier === '' || classifier === 'word') && entry.dict_form.toLowerCase().includes(query)) ||
            ((classifier === '' || classifier === 'gloss') && entry.english.toLowerCase().includes(query)) ||
            entry.definition.toLowerCase().includes(query) ||
            entry.sentence.toLowerCase().includes(query) ||
            (classifier === 'part' && entry.part.toLowerCase().includes(query)) ||
            entry.other.toLowerCase().includes(query)
        );
        page = 0;
        document.getElementById('entriesContainer').innerHTML = '';
        loadMore();
    });
}

function setupInfiniteScroll() {
    const observer = new IntersectionObserver((entries) => {
        if(entries[0].isIntersecting) {
            loadMore();
        }
    }, { threshold: 1.0 });

    observer.observe(document.getElementById('loading'));
}

function toggleDropdownInfo() {
    document.getElementById("dropdownContentInfo").classList.toggle("show");
}

function toggleDropdownGuide() {
    document.getElementById("dropdownContentGuide").classList.toggle("show");
}

function toggleDropdownSearch() {
    document.getElementById("dropdownContentSearch").classList.toggle("show");
}

// 点击外部关闭下拉
window.onclick = function(e) {
    if (!e.target.matches('.utility-btn')) {
        const dropdownsinfo = document.getElementsByClassName("dropdown-content");
        for (let i = 0; i < dropdownsinfo.length; i++) {
            dropdownsinfo[i].classList.remove('show');
        }
    }
}