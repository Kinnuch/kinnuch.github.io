
function getRandomLine(inDataArray) {
    const randomIndex = Math.floor(Math.random() * inDataArray.length);
    const randomLine = inDataArray[randomIndex];
    return randomLine;
}

function updateLine(inDataArray) {
    const randomLine = getRandomLine(inDataArray);
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

async function main() {
    const FileURL = "https://kinnuch.github.io/file/prestanneth.csv";
    try {
        const response = await fetch(FileURL);
        const csvData = await response.text();
        const dataArray = csvData.trim().split('\n').map(line => line.split(','));
        updateLine(dataArray);
        document.getElementById('refreshButton').addEventListener('click', updateLine(dataArray));
        document.getElementById('checkAnswer').addEventListener('click', checkAnswer());
    }
    catch (error){
        console.error("ú-'resta", error);
    }
}

let currentAnswer = '';
main()