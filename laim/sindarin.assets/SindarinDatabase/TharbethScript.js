// 示例JSON数据结构
const wordData = {
    "words": [
        {
            "word": "apple",
            "definition": "A popular fruit",
            "partOfSpeech": "noun",
            "clue": "红红的圆水果"
        },
        {
            "word": "python",
            "definition": "A programming language",
            "partOfSpeech": "noun",
            "clue": "一种流行的编程语言"
        },
        // 添加更多单词...
    ]
};

class CrosswordGenerator {
    constructor(size = 15) {
        this.size = size;
        this.grid = Array(size).fill().map(() => Array(size).fill(''));
        this.clues = { across: [], down: [] };
        this.currentNumber = 1;
    }

    generate(words) {
        // 按单词长度排序（简单布局策略）
        const sortedWords = [...words].sort((a, b) => b.word.length - a.word.length);
        
        sortedWords.forEach(wordObj => {
            const word = wordObj.dict_form.toUpperCase();
            const placed = this.tryPlaceWord(word, wordObj);
            if (placed) this.currentNumber++;
        });
    }

    tryPlaceWord(word, meta) {
        // 简化的布局算法（实际需要更复杂的冲突检测）
        for (let attempt = 0; attempt < 100; attempt++) {
            const direction = Math.random() < 0.5 ? 'across' : 'down';
            const maxStart = this.size - word.length;
            const x = Math.floor(Math.random() * (direction === 'across' ? maxStart : this.size));
            const y = Math.floor(Math.random() * (direction === 'down' ? maxStart : this.size));

            if (this.canPlaceWord(word, x, y, direction)) {
                this.placeWord(word, x, y, direction, meta);
                return true;
            }
        }
        return false;
    }

    canPlaceWord(word, x, y, direction) {
        for (let i = 0; i < word.length; i++) {
            const xi = direction === 'across' ? x + i : x;
            const yi = direction === 'down' ? y + i : y;
            
            if (xi >= this.size || yi >= this.size) return false;
            if (this.grid[yi][xi] !== '' && this.grid[yi][xi] !== word[i]) return false;
        }
        return true;
    }

    placeWord(word, x, y, direction, meta) {
        const number = this.currentNumber;
        for (let i = 0; i < word.length; i++) {
            const xi = direction === 'across' ? x + i : x;
            const yi = direction === 'down' ? y + i : y;
            
            if (i === 0) {
                this.grid[yi][xi] = {
                    letter: word[i],
                    number,
                    [direction]: number
                };
            } else {
                this.grid[yi][xi] = { ...this.grid[yi][xi], letter: word[i] };
            }
        }

        this.clues[direction].push({
            number,
            clue: meta.other,
            word: meta.dict_form,
            definition: meta.definition,
            partOfSpeech: meta.part
        });
    }

    render(container) {
        const table = document.createElement('table');
        table.className = 'crossword';
        
        this.grid.forEach((row, y) => {
            const tr = document.createElement('tr');
            row.forEach((cell, x) => {
                const td = document.createElement('td');
                if (cell) {
                    const input = document.createElement('input');
                    input.maxLength = 1;
                    input.dataset.answer = cell.letter;
                    input.addEventListener('input', (e) => this.validateInput(e.target));
                    
                    if (cell.number) {
                        const numberSpan = document.createElement('span');
                        numberSpan.className = 'number';
                        numberSpan.textContent = cell.number;
                        td.appendChild(numberSpan);
                    }
                    
                    td.appendChild(input);
                }
                tr.appendChild(td);
            });
            table.appendChild(tr);
        });
        
        container.innerHTML = '';
        container.appendChild(table);
        this.renderHints();
    }

    renderHints() {
        const container = document.getElementById('hints-container');
        let html = '<h3>横向提示:</h3>';
        
        this.clues.across.forEach(clue => {
            html += `<div class="hint-item">
                <b>${clue.number}.</b> ${clue.clue} (${clue.partOfSpeech})
            </div>`;
        });

        html += '<h3>纵向提示:</h3>';
        this.clues.down.forEach(clue => {
            html += `<div class="hint-item">
                <b>${clue.number}.</b> ${clue.clue} (${clue.partOfSpeech})
            </div>`;
        });

        container.innerHTML = html;
    }

    validateInput(input) {
        const answer = input.dataset.answer;
        input.style.backgroundColor = 
            input.value.toUpperCase() === answer ? '#cfc' : '#fcc';
    }
}

// 初始化并生成填字游戏
function generateNewCrossword() {
    const generator = new CrosswordGenerator();
    generator.generate(wordData.words);
    generator.render(document.getElementById('crossword-container'));
}

// 定期更新（每小时）
const data = "https://kinnuch.github.io/laim/sindarin.assets/SindarinDatabase/dictionary.json";
fetch(data)
    .then(response => response.json())
    .then(data => wordData.words = data);
generateNewCrossword();
setInterval(generateNewCrossword, 60 * 60 * 1000);