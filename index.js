const mime = require('mime-types');
const fs = require('fs');

const express = require('express')
const fileUpload = require("express-fileupload");
const FileManager = require('./file_manager.js');

const fm = new FileManager();
const app = express()
app.set('view engine', 'ejs');
app.enable('trust proxy', true)
app.use(express.static('public'))

app.listen(process.env['PORT'] || 8080);

fs.mkdirSync('./temp_chunks', { recursive: true }, (err) => {if (err) throw err})

console.log([
    `_______________________________________________________`,
    ` _ ___    _____ _         _          _____ _ _         `,
    `| |   |  |     |_|___ _ _| |_ ___   |   __|_| |___ ___ `,
    `| | | |  | | | | |   | | |  _| -_|  |   __| | | -_|_ -|`,
    `|_|___|  |_|_|_|_|_|_|___|_| |___|  |__|  |_|_|___|___|`,
    `                                                       `,
    `Listening port: ${process.env['PORT'] || 8080}         `,
    `_______________________________________________________`,
].join("\n"));

// Clear orphaned files in temp directory 
fs.readdir('temp_chunks', (err, files) => {
    if (err) throw err;
  
    for (const file of files) {
        fileName = `${__dirname}/temp_chunks/${file}`
        
        fs.unlink(fileName, (err) => {
            if (err) throw err;
        })
    }
});


app.use((req, res, next) => {
    if (req.originalUrl.startsWith('http://') || req.originalUrl.startsWith('https://')) {
        return res.status(400).send('Bad Request');
    }
    next();
});

app.use( (req, res, next) => {
    req.fullURL = req.protocol + "://" + req.get('host')

    res.statusPageReply = function (status_code) {
        res.status(status_code)

        var { STATUS_CODES } = require('http');
        
        data = { status: status_code, statusText: STATUS_CODES[status_code] }

        switch (req.accepts(["html", "json"])) {
            case "html":
                res.render(`errorStatusPage`, data)
                break
            case "json":
                res.json(data).end()
                break
            default:
                res.type('txt').send(JSON.stringify(data))
        }
    }
    
    next()
})

app.get(["/:page(*)"], async (req, res, next) => {
    data = {}
    data.selectedPage = req.params.page ? req.params.page : "uploader"

    // if (req.originalUrl != "/") console.log(`[${req.method} ${req.originalUrl}] [${req.ip}]`)

    if (fs.existsSync(`./views/partials/${data.selectedPage}`)) {
        res.render("index", data)
    } else {
        next()
    }
});

app.get("/favicon.ico", async (req, res, next) => {
    return res.sendFile("./public/favicons/favicon.ico", {root: require('path').join(__dirname)})
});

app.head("/:file(*)", (req, res, next) => {
    const fileUID = req.params.file
    const file = fm.getFile(fileUID)
    if (!file) { return next() }

    res.setHeader("Content-Disposition", `inline; filename="${file.original_name}"`);

    const mimeType = mime.lookup(file.original_name) || "application/octet-stream";
    res.setHeader("Content-Type", mimeType);

    // No body sent - Express handles that automatically
    res.status(200).end();
});

app.get(["/:file(*)"], (req, res, next) => {
    const fileUID = req.params.file;
    const file = fm.getFile(fileUID) || fm.getPermanentFile(fileUID)

    if (!file) { return next(); }
    
    console.log(`[${req.method} ${req.originalUrl}] [${req.ip}] Incoming download request`);

    if (file.valid_time == file.uploaded_at) {
        console.log(`[${req.method} ${req.originalUrl}] [${req.ip}] Permanent file requested for download`)
    }
    
    // User-Agent logging
    const ua = req.headers["user-agent"] || "";
    console.log(`[${req.method} ${req.originalUrl}] [${req.ip}] User-Agent:`, ua);
    
    // wget override
    if (/wget/i.test(ua)) {
        console.log(`[${req.method} ${req.originalUrl}] [${req.ip}] wget detected — forcing attachment mode`);
        res.setHeader("Content-Disposition", `attachment; filename="${file.original_name}"`);
    } else {
        // Default Content-Disposition
        res.setHeader("Content-Disposition", `inline; filename="${file.original_name}"`);
    }
    
    console.log(`[${req.method} ${req.originalUrl}] [${req.ip}] Resolved original filename:`, file.original_name);

    // Determine extension
    const fileExtension = file.original_name.split(".").pop().toLowerCase();
    console.log(`[${req.method} ${req.originalUrl}] [${req.ip}] File extension:`, fileExtension);

    // Inline view for images
    if (["png", "jpg", "jpeg", "webp"].includes(fileExtension)) {
        const mimeType = mime.lookup(file.original_name) || "application/octet-stream";
        console.log(`[${req.method} ${req.originalUrl}] [${req.ip}] Direct-view image detected - setting Content-Type`, JSON.stringify({ mimeType }));
        res.setHeader("Content-Type", mimeType);
    }

    if (/https\:\/\/discordapp.com/i.test(ua) && ["mp4", "mov", "webm"].includes(fileExtension) && req.query.directdownload != "true") {
        console.log(`[${req.method} ${req.originalUrl}] [${req.ip}] Discord detected — Rendering share page`)
        data = {}
        data.fileLink = `${req.fullURL}/${req.params.file}`;
        res.render("./discord/embed.ejs")
        return
    }

    // Track active downloads
    file.active_downloads += 1;
    console.log(`[${req.method} ${req.originalUrl}] [${req.ip}] Download started`, JSON.stringify({ uid: fileUID, active_downloads: file.active_downloads }));

    let completed = false;

    res.on("finish", () => {
        completed = true;
        console.log(`[${req.method} ${req.originalUrl}] [${req.ip}] Download complete`);
    });

    res.on("close", () => {
        if (!completed) {
            console.log(`[${req.method} ${req.originalUrl}] [${req.ip}] Download aborted`);
        }
    });

    console.log(`[${req.method} ${req.originalUrl}] [${req.ip}] Sending file`, JSON.stringify({ diskPath: file.fsPath }));

    res.sendFile(file.fsPath, (err) => {
        file.active_downloads--;
        if (err && err.message != "Request Aborted") {
            console.error(`[${req.method} ${req.originalUrl}] [${req.ip}] Error sending file`, err.message);
        }
    });
});

app.get(["/url/:file"], (req, res, next) => {
    const fileUID = req.params.file
    const file = fm.getFile(fileUID)
    if (!file) { return next() }

    // Double check the file actually exists
    if (!fs.existsSync(file.fsPath)) {
        fm.removeFile(fileUID)
        return next()
    }

    fileLink = req.fullURL + "/" + fileUID

    data = {}
    data.fileLink = fileLink
    data.renderPath = "./partials/uploader/url.ejs"
    data.fileDuration = file.valid_time
    data.fileUploadedAt = file.uploaded_at
    data.fileUID = fileUID
    data.serverTime = Date.now()

    const ua = req.headers["user-agent"] || "";
    const isBrowser = /(mozilla|chrome|safari|firefox)/i.test(ua);      

    if (isBrowser) {
        res.render("index", data)
    } else {
      res.json({
        filename: originalFileName,
        download: fileLink
      })
    }
});

const fileUploadMiddleware = fileUpload({
    useTempFiles : true,
    tempFileDir : './temp_chunks/',
    limits: { fileSize: 2 * 1024 * 1024 * 1024},
})

// Early UID generation + early logging
app.post("/upload-file", (req, res, next) => {
    const uploadUID = fm.generateFileUID();
    req.uploadUID = uploadUID;
    
    console.log(`[${req.method} /upload-file] [${uploadUID}] [${req.ip}] Incoming upload request`); 

    next();
}, fileUploadMiddleware, (req, res) => {
    const uid = req.uploadUID;

    if (!req.files) {
        console.log(`[${req.method} /upload-file] [${uid}] No file uploaded`);
        return res.status(400).send("No file uploaded!");
    }

    const file = req.files.mainFile;

    console.log(`[${req.method} /upload-file] [${uid}] Upload received`, JSON.stringify({ fileName: file.name }));

    // Limit file duration
    if (req.body.fileDuration < 0 || req.body.fileDuration > 24 * 60 * 60 * 1000) {
        req.body.fileDuration = 10 * 60 * 1000;
    }

    // Build FM entry
    const fmJSON = {
        size: fm.byteNumberToName(file.size),
        original_name: file.name,
        valid_time: req.body.fileDuration || 10 * 60 * 1000,
        mv: file.mv,
    };

    console.log(`[${req.method} /upload-file] [${uid}] Adding file to FileManager`, JSON.stringify(fmJSON));
    
    fm.addFile(uid, fmJSON)

    console.log(`[${req.method} /upload-file] [${uid}] File metadata`, JSON.stringify({
        size: fm.byteNumberToName(file.size),
        encoding: file.encoding,
        mimetype: file.mimetype
    }));

    const fileLink = `${req.fullURL}/${uid}`;
    const ua = req.headers["user-agent"] || "";
    const isBrowser = /(mozilla|chrome|safari|firefox)/i.test(ua);

    console.log(`[${req.method} /upload-file] [${uid}] User-Agent`, ua);

    if (isBrowser) {
        console.log(`[${req.method} /upload-file] [${uid}] Browser detected - rendering URL page`);

        data = {}
        data.fileLink = fileLink
        data.fileDuration = req.body.fileDuration || 10 * 60 * 1000
        data.fileUploadedAt = Date.now()
        data.fileUID = uid
        data.serverTime = Date.now()

        console.log(`[${req.method} /upload-file] [${uid}] Rendering data`, JSON.stringify(data));

        res.render("partials/uploader/url.ejs", data);

        console.log(`[${req.method} /upload-file] [${uid}] Response sent (browser)`);
    } else {
        console.log(`[${req.method} /upload-file] [${uid}] Non-browser client - sending JSON`);

        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({
            status: "Success",
            filename: file.name,
            uid: uid,
            download: fileLink,
            valid_until: Date.now() + req.body.fileDuration || 10 * 60 * 1000,
            size: fm.byteNumberToName(file.size)
        }, null, 2) + "\n");

        console.log(`[${req.method} /upload-file] [${uid}] Response sent (JSON)`);
    }
});

app.get("*", async (req, res) => {
    res.statusPageReply(404)
});

app.use((err, req, res, next) => {
    if (err instanceof URIError) {
        console.warn(`[${req.method} ${req.originalUrl}] [${req.ip}] Bad URI`);
        return res.statusPageReply(400);
    } else {
        console.error(err);
        res.statusPageReply(err.status || 500)
    }
    next(err);
});
