function getRandomGwenwiLine() {
    const randomIndex = Math.floor(Math.random() * dataGwenwiArray.length);
    const randomLine = dataGwenwiArray[randomIndex];
    return randomLine;
}

function updateGwenwiLine() {
    const gwenwiType = document.getElementById('gwenwiType').value;
    let randomLine = getRandomGwenwiLine();
    // Intransitive Weak Verb cannot have Direct Object(Accusative Pronoun)
    if (gwenwiType == "2") {
        let isWeak = randomLine[0][randomLine[0].length - 1] == "a";
        while ((isWeak && randomLine[3] == 0) || (!isWeak && randomLine[3] == 2))
            randomLine = getRandomGwenwiLine();
    }
    const randomPersonIndex = Math.floor(Math.random() * 9);
    const randomPatientIndex = Math.floor(Math.random() * 9);
    const randomPerson = personArray[randomPersonIndex];
    if (!gwenwiType) return;
    if (gwenwiType == "1") document.getElementById('Gwenwi').innerText = "Sí: 当前：" + randomLine[0] + "\nEnglish Meaning: " + randomLine[1].trim() + "\n汉语释义：" + randomLine[2].trim() + "\nTeitho 请写出：" + randomPerson + randomLine[2].trim() + "了";
    else if (gwenwiType == "2") document.getElementById('Gwenwi').innerText = "Sí: 当前：" + randomLine[0] + "\nEnglish Meaning: " + randomLine[1].trim() + "\n汉语释义：" + randomLine[2].trim() + "\nTeitho 请写出：" + randomPerson + randomLine[2].trim() + "了" + personArray[randomPatientIndex];
    let nowWord = randomLine[0];
    if (nowWord[nowWord.length - 1] == ")") { // deal the -TA word
        let leftPos = nowWord.lastIndexOf("(");
        nowWord = nowWord.substring(0, leftPos);
    }
    // special pattern:
    // for strong verb:0---none,1---u sundoma(now o),2---intransitive verb(will not have acc.)
    // for weak verb:0---intransitive verb,1---transitive verb
    let tmpAns = getPast(nowWord, randomPersonIndex, randomLine[3]);
    let isAncient = 0;
    if (tmpAns[0] == "(") {
        tmpAns = tmpAns.substr(3, tmpAns.length - 3);
        isAncient = 1;
    }
    if (gwenwiType == "2") tmpAns = getAccPron(tmpAns, patientArr[randomPatientIndex], isAncient);
    currentGwenwiAnswer = tmpAns;
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
        document.getElementById('gwenwiType').addEventListener('change', updateGwenwiLine);
    }
    catch (error){
        console.error("ú-'resta", error);
    }
}

let dataGwenwiArray;
let currentGwenwiAnswer = '';
showGwenwiQuestion();