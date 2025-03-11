let wordData = { "words":[] };

class CrosswordGenerator {
    constructor(size = 15) {
        this.size = size;
        this.grid = Array(size).fill().map(() => Array(size).fill(''));
        this.clues = { across: [], down: [] };
        this.neededNumber = Math.floor(Math.random() * 5 + 15);
        this.currentNumber = 1;
        this.placedWords = [];
    }

    generate(words) {
        // 按单词长度排序（简单布局策略）
        const sortedWords = [...words].sort((a, b) => b.dict_form.length - a.dict_form.length);

        for (let now = 0; now < sortedWords.length; now++) {
            let wordObj = sortedWords[now];
            if (Math.random() < 0.06 * wordObj.dict_form.length) continue;
            let word = wordObj.dict_form.toUpperCase();
            if (word.includes('/')) continue;
            if (word.includes('-')) word.replace('-', '').trim();
            if (word.includes('(')) word = word.replace(/\([^)]*\)/g, '').trim();
            const placed = this.tryPlaceWord(word, wordObj);
            if (placed) this.currentNumber++;
            if (this.currentNumber > this.neededNumber) break;
        }

        this.addPreFilledLetters();
    }

    tryPlaceWord(word, meta) {
        // 简化的布局算法（实际需要更复杂的冲突检测）
        let balanceRandom = 0.5;
        for (let attempt = 0; attempt < 25; attempt++) {
            const direction = Math.random() < balanceRandom ? 'across' : 'down';
            const maxStart = this.size - word.length;
            const x = Math.floor(Math.random() * (direction === 'across' ? maxStart : this.size));
            const y = Math.floor(Math.random() * (direction === 'down' ? maxStart : this.size));

            if (this.canPlaceWord(word, x, y, direction)) {
                this.placeWord(word, x, y, direction, meta);
                balanceRandom = balanceRandom + direction === 'across'? -0.03 : 0.03;
                return true;
            }
        }
        return false;
    }

    canPlaceWord(word, x, y, direction) {
        let hasIntersection = false;
        let closeParam = 0;
        for (let i = 0; i < word.length; i++) {
            const xi = direction === 'across' ? x + i : x;
            const yi = direction === 'down' ? y + i : y;
            
            if (xi >= this.size || yi >= this.size) return false;
            const existing = this.grid[yi][xi];
                    
            if (existing) {
                if (existing.letter !== word[i]) return false;
                hasIntersection = true;
            }

            // 避免粘连
            if (direction === 'across') {
                if (y > 0 && this.grid[y - 1][xi]) closeParam++;
                if (y < this.size - 1 && this.grid[y + 1][xi]) closeParam++;
                // 头尾不能出现非交叉粘连
                if (i === 0 && xi > 0 && this.grid[y][xi - 1]) return false;
                if (i === word.length - 1 && xi < this.size - 1 && this.grid[y][xi + 1]) return false;
            }
            else {
                if (x > 0 && this.grid[yi][x - 1]) closeParam++;
                if (x < this.size - 1 && this.grid[yi][x + 1]) closeParam++;
                // 头尾不能出现非交叉粘连
                if (i === 0 && yi > 0 && this.grid[yi - 1][x]) return false;
                if (i === word.length - 1 && yi < this.size - 1 && this.grid[yi + 1][x]) return false;
            }
            if (closeParam > word.length * 3.0 / 5) return false;
        }
        if (this.currentNumber * 1.0 / this.neededNumber < 0.33) return hasIntersection || word.length > 1;
        else return hasIntersection && word.length > 1;
    }

    placeWord(word, x, y, direction, meta) {
        const number = this.currentNumber;
        const positions = [];
        for (let i = 0; i < word.length; i++) {
            const xi = direction === 'across' ? x + i : x;
            const yi = direction === 'down' ? y + i : y;
            
            const cell = this.grid[yi][xi] || { letter: word[i] };
            cell.letter = word[i];
            if (i === 0) {
                if (!cell.number) cell.number = number;
                else cell.number += `&${number}`;
            }
            
            this.grid[yi][xi] = cell;
            positions.push({x: xi, y: yi});
        }

        this.placedWords.push({
            word,
            positions,
            direction,
            meta
        });

        this.clues[direction].push({
            number,
            clue: meta.definition,
            word: meta.dict_form,
            partOfSpeech: meta.part
        });
    }

    addPreFilledLetters() {
        this.placedWords.forEach(word => {
            const count = Math.random() < 0.2 ? 2 : 1;
            const indexes = this.getRandomIndexes(word.word.length, count);
            
            indexes.forEach(i => {
                const pos = word.positions[i];
                this.grid[pos.y][pos.x].prefilled = true;
            });
        });
    }

    getRandomIndexes(length, count) {
        const indexes = new Set();
        while(indexes.size < Math.min(count, length)) {
            indexes.add(Math.floor(Math.random() * length));
        }
        return [...indexes];
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
                    input.addEventListener('input', (e) => { this.validateInput(e.target); });
                    
                    if (cell.prefilled) {
                        input.value = cell.letter;
                        input.disabled = true;
                    }

                    if (cell.number) {
                        const numberSpan = document.createElement('span');
                        numberSpan.className = 'number';
                        numberSpan.textContent = cell.number;
                        td.appendChild(numberSpan);
                    }
                    
                    td.appendChild(input);
                }
                else td.style.backgroundColor = 'white';
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
            input.value.toUpperCase() === answer ? '#e8f5e9' : '#ffebee';
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
    .then(data => {
        wordData.words = data;
        generateNewCrossword();
        //setInterval(generateNewCrossword, 60 * 60 * 1000);
    });