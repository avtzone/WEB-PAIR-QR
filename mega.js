const mega = require("megajs");

const auth = {
    email: "your-mega-email",       // 🔹 replace with valid mega email
    password: "your-mega-password", // 🔹 replace with valid mega password
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

            const uploader = storage.upload({ name });

            // Handle Buffer input
            if (Buffer.isBuffer(data)) {
                uploader.end(data);
            } else {
                // Assume it's a readable stream
                data.pipe(uploader);
            }

            uploader.on("complete", (file) => {
                file.link((err, url) => {
                    storage.close();
                    if (err) return reject(err);
                    resolve(url);
                });
            });
        });
    });
};

module.exports = { upload };
