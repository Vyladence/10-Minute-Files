function changeText(file) {
	submitButton = document.getElementById("upload-button")
	prettyButton = document.getElementById("stylized-upload-button")

	fileNameBox = document.getElementById("file-selector-button-text")
	fileSizeBox = document.getElementById("file-selector-filesize")

	//				  GB  MB	 KB		B
	if(file[0].size > 2 * 1024 * 1024 * 1024){
		alert("File is too big!");
	} else {
		fileNameBox.style.setProperty("--name", `"${file[0].name}"`)
		fileSizeBox.innerHTML = byteNumberToName(file[0].size)
		fileSizeBox.style.display = ""

		submitButton.disabled = false
		prettyButton.classList.remove("disabled")
	}
}

function byteNumberToName(bytes) {
	if (bytes/(1024*1024*1024) > 1) {
		return (bytes/(1024*1024*1024)).toFixed(1) + "GB"
	} else if (bytes/(1024*1024) > 1) {
		return (bytes/(1024*1024)).toFixed(1) + "MB"
	} else if (bytes/(1024) > 1) {
		return (bytes/(1024)).toFixed(1) + "KB"
	} else {
		return bytes + "B"
	}
}

function executeScripts(container) {
	const scripts = container.querySelectorAll("script");
	  
	scripts.forEach(oldScript => {
	  const newScript = document.createElement("script");
  
	  // Copy attributes (src, type, etc.)
	  for (const attr of oldScript.attributes) {
		newScript.setAttribute(attr.name, attr.value);
	  }
  
	  // Copy inline script content
	  newScript.textContent = oldScript.textContent;
  
	  oldScript.replaceWith(newScript);
	});
  }

function setupFormSubmit() {
	var form = document.getElementById('main-form');
	var fileSelect = document.getElementById('file-input');
	if (!form || !fileSelect) return;
	
	form.onsubmit = function(event) {
		event.preventDefault();

		var files = fileSelect.files;
		var formData = new FormData();
		var file = files[0];

		if (file.size >= 2 * 1024 * 1024 * 1024) {
			alert("File is too big!");
			return;
		}

		formData.append('mainFile', file);
		formData.append('fileDuration', 10 * 60 * 1000)

		var xhr = new XMLHttpRequest();

		xhr.onloadend = function() {
			if (xhr.status == 200) {
				var responseHTML = xhr.response;
				
				var parser = new DOMParser();
				var doc = parser.parseFromString(responseHTML, 'text/html');
				var linkInput = doc.querySelector('.link-box');
				
				if (linkInput && linkInput.value) {
					var fileUrl = linkInput.value;
					var urlObj = new URL(fileUrl);
					// Extract the ID from the file URL
    				var id = urlObj.pathname.split('/').pop();
								
    				// Build the *page* URL you want to show
    				var pagePath = '/url/' + id;
								
    				history.pushState(
    				    { type: 'result', fileUrl: fileUrl, html: responseHTML },
    				    '',
    				    pagePath
    				);
				}
				
				removeDragDropListeners()
				contentDiv = document.getElementById('page-container')
				contentDiv.innerHTML = responseHTML;
				executeScripts(contentDiv);
				setTimeout(initCountdown(), 100)
			} else {
				console.log("error " + this.status);
			}
		};

		xhr.upload.onprogress = function(event) {
			var percentDecimal = event.loaded / event.total;
			var percentage = Math.floor(percentDecimal * 100);
			document.getElementById("upload-percentage").innerHTML = percentage + "%";
			
			document.getElementById("upload-progress").style.width = `calc( ${percentage}% - 10px)`;
		};

		xhr.open('POST', '/upload-file');
		document.getElementById("progress-wrapper").style.display = "flex";
		document.getElementById("progress-wrapper").style.transform = "translateY(40px)";
		xhr.send(formData);
	};
}

var savedUploaderHTML = null;

function saveUploaderContent() {
	var wrapper = document.getElementById('page-container');
	if (wrapper && wrapper.innerHTML) {
		savedUploaderHTML = wrapper.innerHTML;
	}
}

window.onload = () => {
	saveUploaderContent();
	history.replaceState({ type: `${location.pathname.split("/").pop() || "uploader"}` }, '', '/');
    document.getElementById("upload-button").disabled = true
	setupFormSubmit();
	setupDragDropListeners();
}

function setupDragDropListeners() {
	var fileSelector = document.getElementById("file-selector");
	var uploadDropBox = document.getElementById("upload-drop-box");
	var pageMask = document.getElementById("page-mask");
	var dragUploadModal = document.getElementById("drag-upload-modal")
	if (!fileSelector) return;

	//document.body.ondragenter = 
	document.body.ondragover = (evt) => {
		pageMask.classList.add("active");
		pageMask.style.opacity="";
		dragUploadModal.classList.add("active");
		dragUploadModal.style.opacity="";
		evt.preventDefault();
	}

	document.body.ondragleave = 
	document.body.ondrop = (evt) => {
		pageMask.classList.remove("active");
		dragUploadModal.classList.remove("active");
		evt.preventDefault();
	}

	//uploadDropBox.ondragover = 
	uploadDropBox.ondragenter = function(evt) {
		uploadDropBox.classList.add("active");
		evt.preventDefault();
	};

	uploadDropBox.ondragleave = function(evt) {
		uploadDropBox.classList.remove("active");
		evt.preventDefault();
	};
	  
	uploadDropBox.ondrop = function(evt) {
		uploadDropBox.classList.remove("active");
		var fileInput = document.getElementById('file-input');
		fileInput.files = evt.dataTransfer.files;
		changeText(evt.dataTransfer.files)
		evt.preventDefault();
	};
}

removeDragDropListeners = () => {
	document.body.ondragenter = document.body.ondragover = null
	document.body.ondragleave = document.body.ondrop = null
}
