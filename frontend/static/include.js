function loadHTML() {
    //  Header
    fetch('../templates/header.html')
        .then(response => response.text())
        .then(data => {
            document.getElementById('header-placeholder').innerHTML = data;
        });

    // Footer
    fetch('../templates/footer.html')
        .then(response => response.text())
        .then(data => {
            document.getElementById('footer-placeholder').innerHTML = data;
        });
}


document.addEventListener('DOMContentLoaded', loadHTML);
