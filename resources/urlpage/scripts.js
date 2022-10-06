function copyText (text) {
	return new Promise((resolve, reject) => {
		navigator.clipboard.writeText(text).then(
			resolve, reject
		)
    })
}

function copyLink(div) {
	fileLink = div.dataset.link

	alert = document.getElementById("copiedAlertDiv")

	copyText(fileLink).then(function() {
		alert.textContent = "Copied!"
	  })
	  .catch(function(rej) {
		alert.textContent = "There was an error copying the text"
	  });
	  
	alert.style.transform="translateY(0px)" 
	setTimeout(() => { alert.style.transform="translateY(-140%)"; }, 2000)
}

