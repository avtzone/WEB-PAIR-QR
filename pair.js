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

    // Sanitize number: remove all non-digits
    num = num.replace(/[^0-9]/g, '');
    if (num.length < 10) return res.json({ error: "Invalid number" });

    async function SUHAIL() {
        try {
            const { state, saveCreds } = await useMultiFileAuthState('./auth_info_baileys');

            const Smd = makeWASocket({
                auth: {
                    creds: state.creds,
                    keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "silent" })),
                },
                printQRInTerminal: false,
                logger: pino({ level: "silent" }),
                browser: Browsers.macOS("Safari"),
            });

            // Request pairing code if not registered
            if (!Smd.authState.creds.registered) {
                await delay(1500);
                const code = await Smd.requestPairingCode(num); // NO '+' here
                if (!res.headersSent) return res.json({ code });
            }

            Smd.ev.on('creds.update', saveCreds);

            Smd.ev.on("connection.update", async (update) => {
                const { connection, lastDisconnect } = update;

                if (connection === "open") {
                    try {
                        console.log("Connection opened for", Smd.user?.id);

                        // Wait for creds.json to exist
                        const credsPath = './auth_info_baileys/creds.json';
                        let attempts = 0;
                        while (!fs.existsSync(credsPath) && attempts < 10) {
                            await delay(500);
                            attempts++;
                        }

                        if (fs.existsSync(credsPath)) {
                            // Upload creds.json to Mega
                            const url = await upload(fs.createReadStream(credsPath), `session-${Date.now()}.json`);
                            console.log("Mega URL:", url);

                            // Send Mega link to logged-in user
                            await Smd.sendMessage(Smd.user.id, { text: `Your session is uploaded: ${url}` });
                        }

                        // Cleanup local session
                        await fs.emptyDir('./auth_info_baileys');

                    } catch (err) {
                        console.error("Error during post-login:", err);
                    }
                }

                if (connection === "close") {
                    const reason = new Boom(lastDisconnect?.error)?.output.statusCode;
                    console.log("Connection closed:", reason);

                    if (reason === DisconnectReason.restartRequired) {
                        console.log("Restart required → Reinitializing...");
                        SUHAIL().catch(e => console.error("Error restarting SUHAIL:", e));
                    }
                }
            });

        } catch (err) {
            console.error("Error in SUHAIL:", err);
            if (!res.headersSent) res.json({ code: "Try After Few Minutes" });
        }
    }

    SUHAIL();
});

module.exports = router;
