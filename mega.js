const mega = require("megajs");

const auth = {
    email: "nixeb74822@fuasha.com",       
    password: "Viruna12", 
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/42.0.2311.135 Safari/537.36 Edge/12.246"
};

/**
 * Upload file to Mega
 * @param {Buffer|Stream} data - File buffer or readable stream
 * @param {String} name - File name on MEGA
 * @returns {Promise<String>} - Public file URL
 */
const upload = (data, name) => {
    return new Promise((resolve, reject) => {
        if (!auth.email || !auth.password) {
            return reject(new Error("Missing MEGA authentication fields"));
        }

        const storage = new mega.Storage(auth, (err) => {
            if (err) return reject(err);

            const uploader = storage.upload({
                name,
                allowUploadBuffering: true, // ✅ important for buffers/streams
            });

            if (Buffer.isBuffer(data)) {
                uploader.end(data);
            } else {
                data.pipe(uploader);
            }

            uploader.on("complete", (file) => {
                file.link((err, url) => {
                    storage.close();
                    if (err) return reject(err);
                    resolve(url);
                });
            });

            uploader.on("error", reject);
        });
    });
};

module.exports = { upload };
