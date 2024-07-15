function getRandomGwenwiLine() {
    const randomIndex = Math.floor(Math.random() * dataGwenwiArray.length);
    const randomLine = dataGwenwiArray[randomIndex];
    return randomLine;
}

function updateGwenwiLine() {
    const randomLine = getRandomGwenwiLine();
    const randomPersonIndex = Math.floor(Math.random() * 9);
    const randomPerson = personArray[randomPersonIndex];
    document.getElementById('Gwenwi').innerText = "Sí: 当前：" + randomLine[0] + "\nEnglish Meaning: " + randomLine[1].trim() + "\n汉语释义：" + randomLine[2].trim() + "\nTeitho 请写出：" + randomPerson + randomLine[2].trim() + "了";
    let nowWord = randomLine[0];
    if (nowWord[nowWord.length - 1] == ")") { // deal the -TA word
        let leftPos = nowWord.lastIndexOf("(");
        nowWord = nowWord.substring(0, leftPos);
    }
    currentGwenwiAnswer = getPast(nowWord, randomPersonIndex, randomLine[3]);
    document.getElementById('resultGwenwiFeedback').innerText = '';
    document.getElementById('GwenwiInput').value = '';
}

function checkGwenwiAnswer() {
    const userAnswer = document.getElementById('GwenwiInput').value.trim();
    const output = document.getElementById('resultGwenwiFeedback');
    if (userAnswer == "") {
        output.innerText = "Teitho nad erui! 请先输入答案！";
        return;
    }
    if (userAnswer.toLowerCase() === currentGwenwiAnswer.toLowerCase()) {
        output.innerText = "Thand! 正确！";
    }
    else {
        output.innerText = "Althand~i nangweth thand: 错误~正确答案应该是：\n" + currentGwenwiAnswer;
    }
}

async function showGwenwiQuestion() {
    const FileURL = "https://kinnuch.github.io/file/gwenwi.csv";
    try {
        const response = await fetch(FileURL);
        const csvData = await response.text();
        dataGwenwiArray = csvData.trim().split('\n').map(line => line.split(','));
        updateGwenwiLine();
        document.getElementById('refreshGwenwiButton').addEventListener('click', updateGwenwiLine);
        document.getElementById('checkGwenwiAnswer').addEventListener('click', checkGwenwiAnswer);
    }
    catch (error){
        console.error("ú-'resta", error);
    }
}

let dataGwenwiArray;
let currentGwenwiAnswer = '';
showGwenwiQuestion();