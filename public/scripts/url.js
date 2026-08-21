function clickOnEnter(event) {
	event.preventDefault();
    if (event.keyCode === 13) {
        event.target.click()
    }
}

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

function showQRCode() {
	document.getElementById("page-mask").classList.add("active");
	document.getElementById("page-mask").style.opacity="";
	document.getElementById("qr-modal").classList.add("active");
	document.getElementById("qr-modal").style.opacity="";
  }
  
function hideQRCode() {
	document.getElementById("page-mask").classList.remove("active");
	document.getElementById("qr-modal").classList.remove("active");
}

function countdown(durationMs, element) {
	const end = Date.now() + Number(durationMs); // I hate javascript

	function tick() {
	  const now = Date.now();
	  const remainingMs = end - now;
	  const remainingSec = Math.max(0, Math.ceil(remainingMs / 1000));
  
	  element.innerHTML = formatAsTime(remainingSec);
  
	  if (remainingMs <= 0) {
		window.location.href = "/";
		return;
	  }
  
	  setTimeout(tick, 250);
	}
  
	tick();
  }

formatAsTime = (num) => {
	hr = Math.floor(num / 3600)
    min = Math.floor((num - hr * 3600) / 60)
    sec = num % 60

    if (hr) {
		return(`${hr}:${pad(min)}:${pad(sec)}`)
	}
	return(`${min}:${pad(sec)}`)
}

function pad(d) {
    return (d < 10) ? '0' + d.toString() : d.toString();
}  

function initCountdown() {
	const el = document.getElementById("file-countdown");
	if (!el) return;
  
	const uploadedAt = Number(el.dataset.uploadedAt);
	const validMs = Number(el.dataset.fileDuration);

	const serverTime = Number(el.dataset.serverTime)
	const now = Date.now();

	// Check if system date/time is over 10 seconds off the server date/time
	if (Math.abs(serverTime - now) > 10000) {
		alert("System date/time is incorrect. Fix this and restart your browser. Clock drift: " + Math.abs(uploadedAt - now) + "ms")
		return;
	}

	const remainingMs = (uploadedAt + validMs) - now;

	countdown(remainingMs, el);
  }

initCountdown();
