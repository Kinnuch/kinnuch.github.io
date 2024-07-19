function getRandomPethasLine() {
    const randomIndex = Math.floor(Math.random() * dataPethasArray.length);
    const randomLine = dataPethasArray[randomIndex];
    return randomLine;
}

function updatePethasLine() {
    const randomLine = getRandomPethasLine();
    let referenceGloss = "";
    let pethasArrLen = randomLine.length;
    for (var i = 3; i < pethasArrLen; i++) {
        if (i != pethasArrLen - 1) referenceGloss = referenceGloss + randomLine[i] + " ";
        else referenceGloss = referenceGloss + randomLine[i];
    }
    document.getElementById('Pethas').innerText = "Sí: 当前：\nEnglish Meaning: " + randomLine[0].trim() + "\n汉语释义：" + randomLine[1].trim() + "\nTeitho 请写出对应的辛达语：\n可能用到的单词：" + referenceGloss;
    currentPethasAnswer = randomline[2];
    document.getElementById('resultPethasFeedback').innerText = '';
    document.getElementById('PethasInput').value = '';
}

function checkPethasAnswer() {
    const userAnswer = document.getElementById('PethasInput').value.trim();
    const output = document.getElementById('resultPethasFeedback');
    if (userAnswer == "") {
        output.innerText = "Teitho nad erui! 请先输入答案！";
        return;
    }
    if (userAnswer.toLowerCase() === currentPethasAnswer.toLowerCase()) {
        output.innerText = "Thand! 正确！";
    }
    else {
        output.innerText = "Althand~i nangweth thand: 错误~正确答案应该是：\n" + currentPethasAnswer;
    }
}

async function showPethasQuestion() {
    const FileURL = "https://kinnuch.github.io/file/pethas.csv";
    try {
        const response = await fetch(FileURL);
        const csvData = await response.text();
        dataPethasArray = csvData.trim().split('\n').map(line => line.split(','));
        updatePethasLine();
        document.getElementById('refreshPethasButton').addEventListener('click', updatePethasLine);
        document.getElementById('checkPethasAnswer').addEventListener('click', checkPethasAnswer);
    }
    catch (error){
        console.error("ú-'resta", error);
    }
}

let dataPethasArray;
let currentPethasAnswer = "";
showPethasQuestion();