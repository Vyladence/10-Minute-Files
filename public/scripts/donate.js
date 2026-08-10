function copyText(element, text) {
    icon = element.children[0]

    try {
        navigator.clipboard.writeText(text)
        .then(function() { icon.src = "/icons/checkmark.svg" })
        .catch(function(rej) { alert("Something went wrong. Please copy manually.") });
    } catch {
        alert("Something went wrong. Please copy manually.")
    }

    setTimeout(() => { icon.src = "/icons/copy.svg"; }, 2500)
}

function showQRCode(currency) {
    document.getElementById("qr-code").src = `/static/${currency}_qrcode.webp`

    document.getElementById("page-mask").classList.add("active");
    document.getElementById("page-mask").style.opacity="";
    document.getElementById("qr-modal").classList.add("active");
    document.getElementById("qr-modal").style.opacity="";
}

function hideQRCode() {
    document.getElementById("page-mask").classList.remove("active");
    document.getElementById("qr-modal").classList.remove("active");
}
