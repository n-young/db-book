// Fun
$(document).ready(function () {
    const vw = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0)
    if (vw < 768) { return }

    $('.fun').each(function () {
        var letters = $(this).text();
        var nHTML = '';
        for (var letter of letters) {
            if (letter == ' ') {
                nHTML += "<span class='fun-letter'>&nbsp;</span>";
            } else {
                nHTML += "<span class='fun-letter'>" + letter + "</span>";
            }
        }
        $(this).html(nHTML);
    })
})

// Navbar
function openNav() {
    document.getElementById("navholder-mobile").style.height = "100%";
}

function closeNav() {
    document.getElementById("navholder-mobile").style.height = "0%";
}
