const express = require('express');
const fs = require('fs-extra');
const pino = require("pino");
const { Boom } = require("@hapi/boom");
const { upload } = require('./mega');
const {
    default: makeWASocket,
    useMultiFileAuthState,
    delay,
    makeCacheableSignalKeyStore,
    Browsers,
    DisconnectReason
} = require("@whiskeysockets/baileys");

const router = express.Router();

// Cleanup once on startup
if (fs.existsSync('./auth_info_baileys')) {
    fs.emptyDirSync(__dirname + '/auth_info_baileys');
}

router.get('/', async (req, res) => {
    let num = req.query.number;
    if (!num) return res.json({ error: "Missing number" });

    async function SUHAIL() {
        try {
            const { state, saveCreds } = await useMultiFileAuthState(`./auth_info_baileys`);

            const Smd = makeWASocket({
                auth: {
                    creds: state.creds,
                    keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "silent" })),
                },
                printQRInTerminal: false,
                logger: pino({ level: "silent" }),
                browser: Browsers.macOS("Safari"),
            });

            if (!Smd.authState.creds.registered) {
                await delay(1500);
                num = num.replace(/[^0-9]/g, '');
                const code = await Smd.requestPairingCode(num);

                if (!res.headersSent) {
                    res.json({ code });
                    return; // important
                }
            }

            Smd.ev.on('creds.update', saveCreds);

            Smd.ev.on("connection.update", async (s) => {
                const { connection, lastDisconnect } = s;

                if (connection === "open") {
                    try {
                        // Handle session upload logic if needed...
                        console.log("Connection opened for", Smd.user?.id);

                        // Cleanup after successful login
                        await delay(2000);
                        if (fs.existsSync('./auth_info_baileys')) {
                            fs.emptyDirSync(__dirname + '/auth_info_baileys');
                        }
                    } catch (e) {
                        console.error("Error during post-login:", e);
                    }
                }

                if (connection === "close") {
                    const reason = new Boom(lastDisconnect?.error)?.output.statusCode;
                    console.log("Connection closed:", reason);
                }
            });

        } catch (err) {
            console.error("Error in SUHAIL:", err);
            if (!res.headersSent) {
                res.json({ code: "Try After Few Minutes" });
            }
        }
    }

    SUHAIL();
});

module.exports = router;
