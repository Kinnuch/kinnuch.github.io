function getRandomLine() {
    const randomIndex = Math.floor(Math.random() * dataArray.length);
    const randomLine = dataArray[randomIndex];
    return randomLine;
}

function updateLine() {
    const randomLine = getRandomLine();
    document.getElementById('Prestanneth').innerText = randomLine[0];
    currentAnswer = randomLine[1].trim();
    document.getElementById('resultFeedback').innerText = '';
}

function checkAnswer() {
    const userAnswer = document.getElementById('userInput').value.trim();
    const output = document.getElementById('resultFeedback');
    if (userAnswer.toLowerCase() === currentAnswer.toLowerCase()) {
        output.innerText = "Thand! 正确！";
    }
    else {
        output.innerText = "Althand~i nangweth thand: 错误~正确答案应该是：\n${currentAnswer}"
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