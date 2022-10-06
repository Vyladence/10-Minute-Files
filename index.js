const express = require('express')
const fileUpload = require("express-fileupload");
const path = require('path')
const fs = require('fs');
const app = express()

app.listen(8080);

app.set('view engine', 'ejs');
app.set('trust proxy', 'loopback')

app.use(express.urlencoded({extended: true}))
app.use(express.json())
app.use(fileUpload({
	limits: { fileSize: 200 * 1024 * 1024 },
  }));

async function asyncFilePassoff (currentPath, newFileName) {
	const deleteFile = (file) => {
		if (fs.existsSync(file)) {
			fs.unlink(file, (err) => {
				if (err) throw err;
			})
		}
 	}
	 
	setTimeout( () => deleteFile(currentPath+newFileName), 600000);
}

fs.readdir('files', (err, files) => {
	if (err) throw err;
  
	for (const file of files) {
	  	fs.unlink(path.join('files', file), err => {
			if (err) throw err;
		});
	}
});

app.get(["/"], async (req, res) => {
	res.render("main")
});

app.post(["/"], async (req, res) => {
	
	function fileName(file, spoiler) {
		if (file.includes(".")) {
			extension = file.split(".")[file.split(".").length - 1]
		} else {
			extension = "txt"
		}
	
		var result           = '';
		var characters       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
		for ( var i = 0; i < 20; i++ ) {
			result += characters.charAt(Math.floor(Math.random() * characters.length));
		}
	
		newFileName = result + "." + extension
		
		if (spoiler) {
			newFileName = "SPOILER_" + newFileName
		}

		if (fs.existsSync(currentPath + newFileName)) {
			fileName(file)
		} else {
			return newFileName
		}
	}
	
	
	fullUrl = req.protocol + "://" + req.get('host');

	if (!req.files) {
		res.status(400).send("No file uploaded!")
		return
	}

	if (req.body.spoilerFile == "on") {
		spoiler = true
	} else {
		spoiler = false
	}

	file = req.files.mainFile
	currentPath = __dirname + "/files/"
	newFileName = fileName(file.name, spoiler)
	
	file.mv(currentPath + newFileName, (err) => {
		if (err) {
			return res.status(500).send(err)
		}
	})

	asyncFilePassoff (currentPath, newFileName)

	const data = fullUrl + "/file/" + newFileName

	res.render("viewURL", {
		data
	});
})

app.get(["/file/*"], async (req, res) => {
	directViewFileTypes = ["png", "jpg", "jpeg"]

	urlArray = req.originalUrl.split("/")
	urlArray.splice(0,2)
	
	fileName = decodeURI(urlArray.join("/"))
	fileExtension = fileName.split(".")[fileName.split(".").length-1].toLowerCase()
	
	var options = {
		root: path.join(__dirname)
	};

	if (fs.existsSync(`./files/${fileName}`)) {
		if (directViewFileTypes.indexOf(fileExtension) > -1) {
			res.sendFile(`./files/${fileName}`, options)
		} else {
			res.download(`./files/${fileName}`, options)
		}
	} else {
		res.status(404)
		res.sendFile("./resources/404.html", options)
	}
});

app.get(["/resources/*"], async (req, res) => {
	urlArray = req.originalUrl.split("/")
	urlArray.splice(0,2)
	
	fileName = urlArray.join("/")

	var options = {
		root: path.join(__dirname)
	};
    
	res.sendFile(`./resources/${fileName}`, options)
});
