const express = require('express');
const fs = require('fs-extra');
const { exec } = require("child_process");
let router = express.Router();
const pino = require("pino");
const { Boom } = require("@hapi/boom");

const MESSAGE = process.env.MESSAGE || `SESSION GENERATED SUCCESSFULLY ✅`;

const { upload } = require('./mega');
const {
    default: makeWASocket,
    useMultiFileAuthState,
    delay,
    makeCacheableSignalKeyStore,
    Browsers,
    DisconnectReason
} = require("@whiskeysockets/baileys");

// Clean old session dir
try {
    fs.emptyDirSync(__dirname + '/auth_info_baileys');
} catch (e) {
    console.log("Session cleanup skipped:", e);
}

router.get('/', async (req, res) => {
    let num = req.query.number;

    async function SUHAIL() {
        const { state, saveCreds } = await useMultiFileAuthState(`./auth_info_baileys`);
        try {
            let Smd = makeWASocket({
                auth: {
                    creds: state.creds,
                    keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "fatal" })),
                },
                printQRInTerminal: false,
                logger: pino({ level: "fatal" }),
                browser: Browsers.macOS("Safari"),
            });

            if (!Smd.authState.creds.registered) {
                await delay(1500);
                num = num.replace(/[^0-9]/g, '');
                const code = await Smd.requestPairingCode(num);
                if (!res.headersSent) {
                    return res.json({ code });
                }
            }

            Smd.ev.on('creds.update', saveCreds);

            Smd.ev.on("connection.update", async (s) => {
                const { connection, lastDisconnect } = s;

                if (connection === "open") {
                    try {
                        await delay(5000);
                        if (fs.existsSync('./auth_info_baileys/creds.json')) {
                            const auth_path = './auth_info_baileys/';
                            let user = Smd.user.id;

                            function randomMegaId(length = 6, numberLength = 4) {
                                const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
                                let result = '';
                                for (let i = 0; i < length; i++) {
                                    result += chars.charAt(Math.floor(Math.random() * chars.length));
                                }
                                const number = Math.floor(Math.random() * Math.pow(10, numberLength));
                                return `${result}${number}`;
                            }

                            const mega_url = await upload(fs.createReadStream(auth_path + 'creds.json'), `${randomMegaId()}.json`);
                            const Scan_Id = mega_url.replace('https://mega.nz/file/', '');

                            let msgsss = await Smd.sendMessage(user, { text: Scan_Id });
                            await Smd.sendMessage(user, { text: MESSAGE }, { quoted: msgsss });
                        }
                    } catch (e) {
                        console.log("Upload/send error:", e);
                    } finally {
                        fs.emptyDirSync(__dirname + '/auth_info_baileys');
                    }
                }

                if (connection === "close") {
                    let reason = new Boom(lastDisconnect?.error)?.output.statusCode;
                    console.log("Connection closed, reason:", reason);
                    if (reason === DisconnectReason.restartRequired) {
                        console.log("Restart required, reinitializing...");
                        SUHAIL().catch(err => console.log(err));
                    }
                }
            });

        } catch (err) {
            console.log("Error in SUHAIL:", err);
            if (!res.headersSent) {
                res.json({ code: "Try Again Later" });
            }
            fs.emptyDirSync(__dirname + '/auth_info_baileys');
        }
    }

    await SUHAIL();
});

module.exports = router;
