function getRandomLine() {
    const randomIndex = Math.floor(Math.random() * dataArray.length);
    const randomLine = dataArray[randomIndex];
    return randomLine;
}

function updateLine() {
    const randomLine = getRandomLine();
    const questionType = document.getElementById('questionType').value;
    if (!questionType) return;
    document.getElementById('Prestanneth').innerText = "Sí: 当前：" + randomLine[0] + "\nEnglish Meaning: " + randomLine[1].trim() + "\n汉语释义：" + randomLine[2].trim();
    currentAnswer = randomLine[questionType].trim();
    document.getElementById('resultFeedback').innerText = '';
    document.getElementById('userInput').value = '';
}

function checkAnswer() {
    const userAnswer = document.getElementById('userInput').value.trim();
    const output = document.getElementById('resultFeedback');
    if (userAnswer.toLowerCase() === currentAnswer.toLowerCase()) {
        output.innerText = "Thand! 正确！";
    }
    else {
        output.innerText = "Althand~i nangweth thand: 错误~正确答案应该是：\n" + currentAnswer;
    }
}

async function showQuestion() {
    const FileURL = "https://kinnuch.github.io/file/prestanneth.csv";
    try {
        const response = await fetch(FileURL);
        const csvData = await response.text();
        dataArray = csvData.trim().split('\n').map(line => line.split(','));
        updateLine();
        document.getElementById('refreshButton').addEventListener('click', updateLine);
        document.getElementById('checkAnswer').addEventListener('click', checkAnswer);
    }
    catch (error){
        console.error("ú-'resta", error);
    }
}

let dataArray;
let currentAnswer = '';
showQuestion();