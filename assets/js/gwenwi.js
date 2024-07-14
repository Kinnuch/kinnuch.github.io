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
    currentGwenwiAnswer = randomLine[3 + randomPersonIndex].trim();
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

let personArray = new Array();
personArray[0] = "我"; personArray[1] = "你和我"; personArray[2] = "（亲密）你"; personArray[3] = "（正式）你/您"
personArray[4] = "他/她/它"; personArray[5] = "（不含听话者）我们"; personArray[6] = "（包含听话者）我们";
personArray[7] = "你们"; personArray[8] = "他们/她们/它们";
let dataGwenwiArray;
let currentGwenwiAnswer = '';
showGwenwiQuestion();