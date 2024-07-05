
function getRandomLine(inDataArray) {
    const randomIndex = Math.floor(Math.random() * inDataArray.length);
    const randomLine = inDataArray[randomIndex];
    return randomLine;
}

function updateLine(inDataArray) {
    const randomLine = getRandomLine(inDataArray);
    document.getElementById('Prestanneth').innerHTML = randomLine;
}

async function main() {
    const FileURL = "https://kinnuch.github.io/file/prestanneth.csv";
    try {
        const response = await fetch(FileURL);
        const csvData = await response.text();
        const dataArray = csvData.trim().split('\n').map(line => line.split(','));
        updateLine(dataArray);
        document.getElementById('refreshButton').addEventListener('click', updateLine(dataArray));
    }
    catch (error){
        console.error("ú-'resta", error);
    }
}

main()