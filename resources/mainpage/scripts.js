function changeText(file) {
	FileButton = document.getElementById("fileUploadButton")
	submitButton = document.getElementById("fuckinsenditbutton")

	if(file[0].size > 209715200){
		alert("File is too big!");
	 } else {
		FileButton.getElementsByTagName("a")[0].textContent=file[0].name
		submitButton.disabled = false
	 }
}

function uploadingAnimation (button, counter) {
	if (!button.disabled) {
		counter += 1
		if (counter == 10) {
			button.value = "I promise it's uploading. Just slowly."
			setTimeout(() => { uploadingAnimation(button) }, 5000)
		}
		button.value = "Uploading"
		setTimeout(() => { button.value = "Uploading." }, 500)
		setTimeout(() => { button.value = "Uploading.." }, 1000)
		setTimeout(() => { button.value = "Uploading..." }, 1500)
		setTimeout(() => { uploadingAnimation(button) }, 2000)
	}
}

window.onload = () => {
	submitButton = document.getElementById("fuckinsenditbutton")	
	submitButton.disabled = true
}