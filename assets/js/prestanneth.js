
function main() {
    const FileURL = "https://kinnuch.github.io/file/prestanneth.csv";

    fetch(FileURL)
        .then(response => response.text())
        .then(csvData => {
            var csvHtml = csvData.trim().split('\n').map(line => line.split(','));
            var csvBody = document.getElementById('Prestanneth');
            csvBody.innerHTML = csvHtml;
        })
        .catch(error => {
            console.error("ú-'resta", error);
        });
}

main()