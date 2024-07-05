
function main() {
    const FileURL = "https://kinnuch.github.io/file/prestanneth.csv";
    fetch(FileURL)
        .then(response => response.text())
        .then(csvData => console.log(csvData))
        .catch(error => {
            console.error("ú-'resta", error);
        });
}

main()