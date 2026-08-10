window.addEventListener('popstate', function(event) {
	if (event.state) {
		if (event.state.type === 'result' && event.state.html) {
			document.getElementById('page-container').innerHTML = event.state.html;
      initCountdown();
		} else if (event.state.type === 'uploader') {
			var wrapper = document.getElementById('page-container');
			try {
				if (savedUploaderHTML) {
					if (wrapper) {
						wrapper.innerHTML = savedUploaderHTML;
						document.getElementById("upload-button").disabled = true;
						setupDragDropListeners();
						setupFormSubmit();
					}
				}
			} catch {
				window.location.href = "/"
			}
		}
	}
});

window.onload = tsParticles.load("tsparticles", {
    particles: {
      number: {
        value: 10,
        density: {
          enable: true,
          area: 100
        }
      },
      color: {
        value: ["#FFFFFF"]
      },
      opacity: {
        value: 1,
        random: true,
        animation: {
          enable: true,
          speed: 0.1,
          minimumValue: 0.1,
          sync: false
        }
      },
      size: {
        value: 3,
        random: {
          "enable": true,
          "minimumValue": 1.5
        }
      },
      move: {
        enable: true,
        speed: 0.7,
        direction: "none",
        random: true,
        straight: true,
        outMode: "bounce",
        bounce: true,
      }
    },
    interactivity: {
      detectsOn: "window",
      events: {
        onHover: {
          enable: true,
          mode: "grab"
        }
      },
      modes: {
        grab: {
          distance: 150,
          lineLinked: {
            opacity: 1
          }
        }
      }
    },
    detectRetina: true
  });

window.onload = document.getElementById("tsparticles").children[0].style.opacity = 1