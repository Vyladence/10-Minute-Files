const fs = require('fs');
const path = require('path')

class FileManager {
    #currentFiles = new Map()
    #SNAPSHOT_PATH = path.join(__dirname, "data", "currentFiles.json")
    #TEMPFILES_PATH = path.join(__dirname, "data", "temp_files")
    #PERMFILES_PATH = path.join(__dirname, "data", "perm_files")

    // --- Logging helper ---
    #log(...args) {
        console.log(`[FileManager] ${args.join(" ")}`);
    }

    #saveSnapshot() {
        const obj = Object.fromEntries(this.#currentFiles);
        fs.writeFileSync(this.#SNAPSHOT_PATH, JSON.stringify(obj, null, 2));
        this.#log("Snapshot saved", JSON.stringify({ count: this.#currentFiles.size }));
    }

    #loadSnapshot() {
        if (!fs.existsSync(this.#SNAPSHOT_PATH)) {
            this.#log("No snapshot found, starting fresh");
            fs.writeFileSync(this.#SNAPSHOT_PATH, "{}")
            return;
        }

        const raw = fs.readFileSync(this.#SNAPSHOT_PATH, 'utf8');
        const obj = JSON.parse(raw);

        for (const [uid, data] of Object.entries(obj)) {
            this.#currentFiles.set(uid, data);
        }

        this.#log("Snapshot loaded", JSON.stringify({ count: this.#currentFiles.size }));
    }

    constructor() {
        fs.mkdirSync(this.#PERMFILES_PATH, { recursive: true }, (err) => {if (err) throw err})
        fs.mkdirSync(this.#TEMPFILES_PATH, { recursive: true }, (err) => {if (err) throw err})
        
        this.#currentFiles = new Map();
        this.#loadSnapshot();

        // Reset active downloads
        for (const [uid, file] of this.#currentFiles) {
            file.active_downloads = 0;
        }

        this.#saveSnapshot();
        this.#log("Startup complete — active_downloads reset");

        // Watchdog
        setInterval(async () => {
            const now = Date.now();
        
            for (const [uid, file] of this.#currentFiles) {
                const expiresAt = file.uploaded_at + file.valid_time;
        
                if (now >= expiresAt) {
                    this.removeFile(uid)
                }
            }
        }, 1000);
        
    }

    addFile(uid, file) {
        file.uploaded_at = Date.now(),
        file.active_downloads = 0
        file.fsPath = path.join(this.#TEMPFILES_PATH, uid);

        this.#log(`[${uid}] Moving temp file`);
    
        file.mv(file.fsPath, (err) => {
            if (err) {
                this.#log(`[${uid}] Failed to move file`, {
                    error: err.message
                });
            }
            this.#log(`[${uid}] Temp file moved`);
        })

        delete file.mv

        this.#currentFiles.set(uid, file);
        this.#saveSnapshot();
        this.#log(`[${uid}] File added`, JSON.stringify({ uid, name: file.original_name }));
    }

    removeFile(uid) {
        const file = this.#currentFiles.get(uid)
        if (file.active_downloads > 0) { return; }
         
        this.#log("Deleting expired file", JSON.stringify({ uid, path: file.path }));

        fs.unlink(file.fsPath, (err) => {
            if (err) {
                console.error(`Failed to delete file ${file.fsPath}:`, err);
                return
            }

            this.#log("File deleted from disk", JSON.stringify({
                path: file.fsPath,
                reclaimed_space: file.size
            }));
        });

        const existed_in_fm = this.#currentFiles.delete(uid);
        this.#saveSnapshot();
        this.#log("File removed", JSON.stringify({ uid, existed_in_fm }));
    }

    getFile(uid) {
        const file = this.#currentFiles.get(uid) || false
        if (!file) { return false }

        if (!fs.existsSync(file.fsPath)) {
            console.error(`ERROR - FileManager/Filesystem desync`, JSON.stringify({ diskPath: file.fsPath }));
            this.removeFile(uid);
            return false;
        }

        return file;
    }

    getPermanentFile(file) {
        const base = path.resolve(this.#PERMFILES_PATH);
        const requested = path.resolve(base, file);

        // Protect against directory traversal
        if (!requested.startsWith(base + path.sep)) {
            return false
        }

        // Return early if file doesn't exist
        if (!fs.existsSync(requested)) {
            return false
        }

        const stats = fs.statSync(requested)

        // Return if the requested path is a directory
        if (stats.isDirectory()) {
            return false
        }

        const fileSize = this.byteNumberToName(stats["size"])
        const fileName = requested.split(path.sep).pop()
        
        const fileJson = {
            size: fileSize,
            original_name: fileName,
            valid_time: 0,
            uploaded_at: 0,
            active_downloads: 0,
            fsPath: requested,
        }

        return fileJson;
    }

    byteNumberToName(bytes) {
        if (bytes/(1024*1024*1024) > 1) {
            return (bytes/(1024*1024*1024)).toFixed(2) + "GB"
        } else if (bytes/(1024*1024) > 1) {
            return (bytes/(1024*1024)).toFixed(2) + "MB"
        } else if (bytes/(1024) > 1) {
            return (bytes/(1024)).toFixed(2) + "KB"
        } else {
            return bytes + "B"
        }
    }
    
    generateFileUID () {
        var validChars = "ABCDFHJKLMNPTXYZ1346789"
        var newUID = ""

        // retry if the UID already exists
        do {
            newUID = ""
            // Generate 8 random characters from validChars
            for (var x = 0; x < 8; x++) {
                newUID += validChars[Math.floor(Math.random() * validChars.length)]
            }
        } while (this.getFile(newUID))

        return newUID
    }

}

module.exports = FileManager;
