const { upload } = require('./mega');
const express = require('express');
let router = express.Router();
const pino = require("pino");
let { toBuffer } = require("qrcode");
const fs = require("fs-extra");
const { Boom } = require("@hapi/boom");

const MESSAGE = process.env.MESSAGE || `SESSION GENERATED SUCCESSFULLY ✅`;

if (fs.existsSync('./auth_info_baileys')) {
    fs.emptyDirSync(__dirname + '/auth_info_baileys');
}

router.get('/', async (req, res) => {
    const { 
        default: SuhailWASocket, 
        useMultiFileAuthState, 
        Browsers, 
        delay, 
        DisconnectReason, 
        makeInMemoryStore 
    } = require("@whiskeysockets/baileys");

    const store = makeInMemoryStore({ logger: pino().child({ level: 'silent' }) });

    async function SUHAIL() {
        const { state, saveCreds } = await useMultiFileAuthState(__dirname + '/auth_info_baileys');

        try {
            let Smd = SuhailWASocket({
                printQRInTerminal: false,
                logger: pino({ level: "silent" }),
                browser: Browsers.macOS("Desktop"),
                auth: state
            });

            Smd.ev.on("connection.update", async (s) => {
                const { connection, lastDisconnect, qr } = s;

                if (qr && !res.headersSent) {
                    try {
                        const qrBuffer = await toBuffer(qr);
                        res.setHeader('Content-Type', 'image/png');
                        res.end(qrBuffer);
                    } catch (err) {
                        console.error("QR buffer error:", err);
                        if (!res.headersSent) res.json({ error: "QR generation failed" });
                    }
                }

                if (connection === "open") {
                    await delay(3000);
                    let user = Smd.user.id;

                    function randomMegaId(length = 6, numberLength = 4) {
                        const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
                        let result = '';
                        for (let i = 0; i < length; i++) {
                            result += characters.charAt(Math.floor(Math.random() * characters.length));
                        }
                        const number = Math.floor(Math.random() * Math.pow(10, numberLength));
                        return `${result}${number}`;
                    }

                    const auth_path = './auth_info_baileys/';
                    const mega_url = await upload(fs.createReadStream(auth_path + 'creds.json'), `${randomMegaId()}.json`);
                    const Scan_Id = mega_url.replace('https://mega.nz/file/', '');

                    console.log(`✅ SESSION-ID: ${Scan_Id}`);

                    let msgsss = await Smd.sendMessage(user, { text: Scan_Id });
                    await Smd.sendMessage(user, { text: MESSAGE }, { quoted: msgsss });

                    await delay(1000);
                    fs.emptyDirSync(__dirname + '/auth_info_baileys');
                }

                Smd.ev.on('creds.update', saveCreds);

                if (connection === "close") {
                    let reason = new Boom(lastDisconnect?.error)?.output.statusCode;
                    console.log("Connection closed, reason:", reason);

                    if (reason === DisconnectReason.restartRequired) {
                        console.log("Restart required → Reinitializing...");
                        SUHAIL().catch(console.log);
                    }
                }
            });

        } catch (err) {
            console.log("Error in SUHAIL:", err);
            if (!res.headersSent) res.json({ error: "Try Again Later" });
            fs.emptyDirSync(__dirname + '/auth_info_baileys');
        }
    }

    await SUHAIL();
});

module.exports = router;
